import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { signEcho } from "../../adapters/connectors/test-echo-connector"
import { getChainGovernance, getPlatformGovernance, setChainGovernance, setPlatformGovernance } from "../integration-governance"
import type { GovernanceDeps } from "../governance-deps"
import { connectWithSecret } from "../manage-connection"
import { getIntegrationHub } from "../get-integration-hub"
import { handleInboundWebhook } from "../handle-inbound-webhook"
import { ctxOf, makeFakeDeps, makeFakeGovernance, NOW } from "./fake-hub-deps"

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

function govDeps(gov: ReturnType<typeof makeFakeGovernance>, tier: "CHAIN" | "STORE"): GovernanceDeps {
  return {
    governance: gov.repo,
    loadProfile: async () => ({ tier, planFeatures: new Set() }),
    audit: vi.fn(async () => ({}) as never),
    platformAudit: vi.fn(async () => ({}) as never),
    notify: vi.fn(async () => 1),
  }
}

const chain = ctxOf("chain-1", ["W4"])
const pctx = { userId: "op", capabilities: new Set(["N16"]) }

describe("Chuỗi khoá tích hợp cho cửa hàng thành viên", () => {
  it("chuỗi cấm → cửa hàng thành viên thấy Cấp trên đã khoá, không kết nối được; chuỗi được báo cho cửa hàng", async () => {
    const gov = makeFakeGovernance()
    gov.scopes.set("store-1", { industryKey: "FLORAL", parentChainOrgId: "chain-1" })
    gov.partners.set("chain-1", ["store-1"])
    const deps = govDeps(gov, "CHAIN")
    await setChainGovernance(chain, { connectorKey: "test_echo", mode: "FORBID" }, deps)
    expect(deps.notify).toHaveBeenCalledWith({ organizationId: "store-1", eventKey: "INTEGRATION_CONNECTION_DEGRADED" })
    expect(deps.audit).toHaveBeenCalledOnce()

    const { deps: hubDeps } = makeFakeDeps([], [], [], gov)
    const store = ctxOf("store-1")
    expect((await getIntegrationHub(store, hubDeps)).catalog.find((c) => c.key === "test_echo")?.availability).toBe("LOCKED_BY_UPPER")
    await expect(connectWithSecret(store, { connectorKey: "test_echo", secret: SECRET }, hubDeps)).rejects.toMatchObject({ details: { violation: "LOCKED_BY_UPPER" } })
    // Cửa hàng của chuỗi khác không bị ảnh hưởng
    expect((await getIntegrationHub(ctxOf("store-2"), hubDeps)).catalog.find((c) => c.key === "test_echo")?.availability).toBe("AVAILABLE")
  })

  it("bắt dùng của chuỗi → cửa hàng thấy tên kết nối của chuỗi, không có khoá", async () => {
    const gov = makeFakeGovernance()
    gov.scopes.set("store-1", { industryKey: null, parentChainOrgId: "chain-1" })
    gov.rows.push({ connectorKey: "test_echo", tier: "CHAIN", scopeId: "chain-1", mode: "INHERIT_ONLY" })
    gov.chainConnections.set("chain-1|test_echo", { id: "cc", displayName: "Kết nối chung của chuỗi" })
    const { deps } = makeFakeDeps([], [], [], gov)
    const hub = await getIntegrationHub(ctxOf("store-1"), deps)
    expect(hub.inherited).toEqual([{ connectorKey: "test_echo", displayName: "Kết nối chung của chuỗi" }])
  })

  it("kết nối riêng có từ trước ngừng nhận webhook khi chuỗi cấm", async () => {
    const gov = makeFakeGovernance()
    const { deps, connections } = makeFakeDeps([], [], [], gov)
    const store = ctxOf("store-1")
    await connectWithSecret(store, { connectorKey: "test_echo", secret: SECRET }, deps)
    gov.scopes.set("store-1", { industryKey: null, parentChainOrgId: "chain-1" })
    gov.rows.push({ connectorKey: "test_echo", tier: "CHAIN", scopeId: "chain-1", mode: "FORBID" })
    const body = JSON.stringify({ id: "evt-1" })
    const headers = new Headers({ "x-echo-signature": signEcho(body, SECRET, Math.floor(NOW.getTime() / 1000)) })
    await expect(handleInboundWebhook({ connectorKey: "test_echo", connectionRef: connections[0]!.connectionRef, rawBody: body, headers }, deps)).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
  })

  it("tầng trên đã khoá → chuỗi không đổi được (422); cửa hàng không khoá được; không phải chuỗi thì 404", async () => {
    const gov = makeFakeGovernance()
    gov.scopes.set("chain-1", { industryKey: "FLORAL", parentChainOrgId: null })
    gov.rows.push({ connectorKey: "test_echo", tier: "INDUSTRY", scopeId: "industry:FLORAL", mode: "FORBID" })
    await expect(setChainGovernance(chain, { connectorKey: "test_echo", mode: "ALLOW_OWN" }, govDeps(gov, "CHAIN"))).rejects.toMatchObject({ details: { violation: "LOCKED_BY_UPPER" } })
    const items = await getChainGovernance(chain, govDeps(gov, "CHAIN"))
    expect(items.find((i) => i.connectorKey === "test_echo")).toBeUndefined() // đầu nối thử không có trong bảng quản trị
    expect(items.find((i) => i.connectorKey === "shopee")).toMatchObject({ mode: "ALLOW_OWN", lockedByUpper: null })
    await expect(setChainGovernance(ctxOf("store-1", ["W4"]), { connectorKey: "shopee", mode: "FORBID" }, govDeps(gov, "STORE"))).rejects.toMatchObject({ details: { violation: "STORE_CANNOT_LOCK" } })
    await expect(getChainGovernance(ctxOf("store-1", ["W4"]), govDeps(gov, "STORE"))).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(getChainGovernance(ctxOf("chain-1", ["W1"]), govDeps(gov, "CHAIN"))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })
})

describe("Nền tảng và ngành khoá tích hợp", () => {
  it("cần N16; Mẹ cấm thì ngành không đổi được; phạm vi sai bị từ chối; ghi nhật ký nền tảng", async () => {
    const gov = makeFakeGovernance()
    const deps = govDeps(gov, "CHAIN")
    await expect(getPlatformGovernance({ userId: "op", capabilities: new Set() }, "GLOBAL", deps)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await setPlatformGovernance(pctx, { scopeId: "GLOBAL", connectorKey: "shopee", mode: "FORBID" }, deps)
    expect(deps.platformAudit).toHaveBeenCalledOnce()
    await expect(setPlatformGovernance(pctx, { scopeId: "industry:FLORAL", connectorKey: "shopee", mode: "ALLOW_OWN" }, deps)).rejects.toMatchObject({ details: { violation: "LOCKED_BY_UPPER" } })
    expect((await getPlatformGovernance(pctx, "industry:FLORAL", deps)).find((i) => i.connectorKey === "shopee")).toMatchObject({ lockedByUpper: "MOTHER" })
    expect((await getPlatformGovernance(pctx, "GLOBAL", deps)).find((i) => i.connectorKey === "shopee")).toMatchObject({ mode: "FORBID", lockedByUpper: null })
    await expect(getPlatformGovernance(pctx, "industry:../x", deps)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })
})
