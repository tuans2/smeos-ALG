import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { signEcho } from "../../adapters/connectors/test-echo-connector"
import { getIntegrationHub } from "../get-integration-hub"
import { connectWithSecret, disconnectConnection, rotateCredential } from "../manage-connection"
import { handleInboundWebhook } from "../handle-inbound-webhook"
import { processDueEvents } from "../process-due-events"
import { replayEvent } from "../connection-events"
import { ctxOf, makeFakeDeps, NOW } from "./fake-hub-deps"

const SECRET = "echo-secret-0123456789abcd"
let previous: string | undefined
beforeEach(() => {
  previous = process.env["INTEGRATION_TOKEN_SECRET"]
  process.env["INTEGRATION_TOKEN_SECRET"] = "unit-test-integration-secret-xyz"
})
afterEach(() => {
  if (previous === undefined) delete process.env["INTEGRATION_TOKEN_SECRET"]
  else process.env["INTEGRATION_TOKEN_SECRET"] = previous
})

const orgA = ctxOf("org-a")
const orgB = ctxOf("org-b")

function signedHeaders(body: string, secret = SECRET) {
  return new Headers({ "x-echo-signature": signEcho(body, secret, Math.floor(NOW.getTime() / 1000)) })
}

describe("Kết nối bằng khoá", () => {
  it("lưu khoá đã mã hoá, trả về chỉ 4 ký tự cuối và ghi audit", async () => {
    const { deps, connections } = makeFakeDeps()
    const view = await connectWithSecret(orgA, { connectorKey: "test_echo", secret: SECRET }, deps)
    expect(JSON.stringify(view)).not.toContain(SECRET)
    expect(view.credentialHint).toBe("abcd")
    expect(connections[0]!.credentialEncrypted).not.toContain(SECRET)
    expect(deps.audit).toHaveBeenCalledOnce()
  })

  it("thiếu quyền W2 → CAPABILITY_DENIED", async () => {
    const { deps } = makeFakeDeps()
    await expect(connectWithSecret(ctxOf("org-a", ["W1"]), { connectorKey: "test_echo", secret: SECRET }, deps)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })

  it("đầu nối chưa ra mắt hoặc thiếu gói không kết nối được", async () => {
    const { deps } = makeFakeDeps()
    await expect(connectWithSecret(orgA, { connectorKey: "shopee", secret: SECRET }, deps)).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })
    await expect(connectWithSecret(orgA, { connectorKey: "khong-co", secret: SECRET }, deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("tổ chức khác không thấy, không ngắt, không xoay khoá được (404)", async () => {
    const { deps } = makeFakeDeps()
    const view = await connectWithSecret(orgA, { connectorKey: "test_echo", secret: SECRET }, deps)
    expect((await getIntegrationHub(orgB, deps)).connections).toHaveLength(0)
    await expect(disconnectConnection(orgB, view.id, deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(rotateCredential(orgB, { id: view.id, secret: SECRET }, deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("ngắt kết nối xoá khoá đã lưu", async () => {
    const { deps, connections } = makeFakeDeps()
    const view = await connectWithSecret(orgA, { connectorKey: "test_echo", secret: SECRET }, deps)
    await disconnectConnection(orgA, view.id, deps)
    expect(connections[0]).toMatchObject({ status: "DISCONNECTED", credentialEncrypted: null })
  })
})

describe("Danh mục theo gói và tầng", () => {
  it("cửa hàng gói thường thấy kênh bán hàng ở trạng thái cần nâng gói", async () => {
    const { deps } = makeFakeDeps()
    const hub = await getIntegrationHub(orgA, deps)
    expect(hub.catalog.find((c) => c.key === "shopee")?.availability).toBe("NEEDS_UPGRADE")
    expect(hub.catalog.find((c) => c.key === "test_echo")?.canConnect).toBe(true)
  })
})

describe("Tích hợp chạy bằng phân hệ sẵn có", () => {
  it("SePay đã bật hiện Đã kết nối, được tính vào tổng quan và mở bằng panel", async () => {
    const { deps } = makeFakeDeps([], ["sepay"])
    const hub = await getIntegrationHub(orgA, deps)
    const sepay = hub.catalog.find((c) => c.key === "sepay")!
    expect(sepay).toMatchObject({ availability: "CONNECTED", panel: "bank_sync", canConnect: false })
    expect(hub.managedConnected).toEqual(["sepay"])
    expect(hub.overview.active).toBe(1)
  })

  it("tính năng gốc đang bị khoá trên production thì Hub cũng hiện Sắp ra mắt, không mở panel", async () => {
    const { deps } = makeFakeDeps([], ["facebook_messenger"], ["/hoi-thoai"])
    const hub = await getIntegrationHub(orgA, deps)
    expect(hub.catalog.find((c) => c.key === "facebook_messenger")).toMatchObject({ availability: "COMING_SOON", panel: null })
    expect(hub.managedConnected).toEqual([])
  })

  it("API cần gói PRO: gói thường không thấy là đã kết nối", async () => {
    const { deps } = makeFakeDeps([], ["api_tokens"])
    const hub = await getIntegrationHub(orgA, deps)
    expect(hub.catalog.find((c) => c.key === "api_tokens")?.availability).toBe("NEEDS_UPGRADE")
    expect(hub.managedConnected).toEqual([])
  })
})

describe("Cổng webhook", () => {
  it("nhận sự kiện có chữ ký đúng, bỏ qua sự kiện gửi lại", async () => {
    const { deps, connections, events } = makeFakeDeps()
    await connectWithSecret(orgA, { connectorKey: "test_echo", secret: SECRET }, deps)
    const body = JSON.stringify({ id: "evt-1", type: "echo", phone: "0901234567" })
    const input = { connectorKey: "test_echo", connectionRef: connections[0]!.connectionRef, rawBody: body, headers: signedHeaders(body) }
    expect(await handleInboundWebhook(input, deps)).toEqual({ accepted: 1, duplicates: 0 })
    expect(await handleInboundWebhook(input, deps)).toEqual({ accepted: 0, duplicates: 1 })
    expect(JSON.stringify(events[0]!.payload)).not.toContain("0901234567")
  })

  it("chữ ký sai, mã kết nối sai hoặc kết nối đã ngắt → cùng một lỗi chung", async () => {
    const { deps, connections } = makeFakeDeps()
    const view = await connectWithSecret(orgA, { connectorKey: "test_echo", secret: SECRET }, deps)
    const body = JSON.stringify({ id: "evt-2" })
    const ref = connections[0]!.connectionRef
    await expect(handleInboundWebhook({ connectorKey: "test_echo", connectionRef: ref, rawBody: body, headers: signedHeaders(body, "sai-khoa-0000000000") }, deps)).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
    await expect(handleInboundWebhook({ connectorKey: "test_echo", connectionRef: "khong-co", rawBody: body, headers: signedHeaders(body) }, deps)).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
    await disconnectConnection(orgA, view.id, deps)
    await expect(handleInboundWebhook({ connectorKey: "test_echo", connectionRef: ref, rawBody: body, headers: signedHeaders(body) }, deps)).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
  })
})

describe("Xử lý sự kiện có giới hạn", () => {
  it("sự kiện lỗi thử lại tới hết lượt rồi DEAD và thông báo; Thử lại đưa về hàng chờ", async () => {
    const { deps, connections, events } = makeFakeDeps()
    await connectWithSecret(orgA, { connectorKey: "test_echo", secret: SECRET }, deps)
    const body = JSON.stringify({ id: "evt-3", type: "echo.fail" })
    await handleInboundWebhook({ connectorKey: "test_echo", connectionRef: connections[0]!.connectionRef, rawBody: body, headers: signedHeaders(body) }, deps)
    for (let i = 0; i < 6; i++) await processDueEvents(deps)
    expect(events[0]).toMatchObject({ status: "DEAD", attempts: 6 })
    expect(deps.notify).toHaveBeenCalledWith({ organizationId: "org-a", eventKey: "INTEGRATION_EVENT_DEAD" })
    await expect(replayEvent(orgB, events[0]!.id, deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await replayEvent(orgA, events[0]!.id, deps)
    expect(events[0]).toMatchObject({ status: "PENDING", attempts: 0 })
  })
})
