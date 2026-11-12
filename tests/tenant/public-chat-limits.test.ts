import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getLimits, POST as requestLimits } from "@/app/api/v1/chat/public-limits/route"
import { POST as configureChannel } from "@/app/api/v1/chat/channels/route"
import { decidePublicChatLimits } from "@/modules/platform/use-cases/decide-public-chat-limits"
import { getChatChannelRepository } from "@/modules/chat-assistant/infra/chat-channel-repository"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/chat/public-limits"
const pctx = { userId: "platform-admin", capabilities: new Set(["N2"]) }

type LimitView = { current: { perVisitor: number; perIp: number }; pending: { per_visitor: number } | null }

describe("cách ly tenant — nâng hạn mức chat AI trên trang công khai", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const request = (t: Tenant, body: unknown) =>
    requestLimits(withSession(BASE, t.token, { method: "POST", body: JSON.stringify(body) }))
  const view = async (t: Tenant) => (await readJson(await getLimits(withSession(BASE, t.token)))) as LimitView

  it("yêu cầu của A chỉ nằm ở A; B vẫn mức mặc định, không thấy yêu cầu của A", async () => {
    expect((await request(a, { per_visitor: 100, per_ip: 300 })).status).toBe(201)

    expect((await view(a)).pending?.per_visitor).toBe(100)
    const vb = await view(b)
    expect(vb.pending).toBeNull()
    expect(vb.current).toMatchObject({ perVisitor: 20, perIp: 60 })
  })

  it("gửi lại khi đang chờ duyệt → 409; mức ngoài danh sách → 400", async () => {
    expect((await request(a, { per_visitor: 999, per_ip: 999 })).status).toBe(400)
    expect((await request(a, { per_visitor: 50, per_ip: 150 })).status).toBe(201)
    expect((await request(a, { per_visitor: 200, per_ip: 600 })).status).toBe(409)
  })

  it("nền tảng duyệt cho A → chỉ kênh của A đổi hạn mức, B giữ mặc định", async () => {
    await request(a, { per_visitor: 100, per_ip: 300 })
    await decidePublicChatLimits(pctx, { organizationId: a.organizationId, approve: true })

    const va = await view(a)
    expect(va.current).toMatchObject({ perVisitor: 100, perIp: 300 })
    expect(va.pending).toBeNull()

    const repo = getChatChannelRepository()
    const landingA = await repo.getChannelConfigForOrg(a.organizationId, "LANDING_PAGE")
    expect(landingA?.config.publicChatLimits).toMatchObject({ perVisitor: 100, perIp: 300 })
    expect(await repo.getChannelConfigForOrg(b.organizationId, "STOREFRONT_CATALOG")).toBeNull()
    expect((await view(b)).current).toMatchObject({ perVisitor: 20, perIp: 60 })
  })

  it("chủ tiệm không tự ghi được hạn mức qua API cấu hình kênh; lưu cấu hình không xoá mức đã duyệt", async () => {
    const res = await configureChannel(
      withSession("http://localhost/api/v1/chat/channels", a.token, {
        method: "POST",
        body: JSON.stringify({
          channel: "STOREFRONT_CATALOG",
          is_enabled: true,
          config: { publicChatLimits: { perVisitor: 200, perIp: 600, approvedAt: "2026-10-31" } },
        }),
      }),
    )
    // Không có quyền T4 hoặc trường bị bỏ qua — cả hai trường hợp đều không được nâng mức
    expect([200, 403]).toContain(res.status)
    expect((await view(a)).current).toMatchObject({ perVisitor: 20, perIp: 60 })

    await request(a, { per_visitor: 50, per_ip: 150 })
    await decidePublicChatLimits(pctx, { organizationId: a.organizationId, approve: true })
    await configureChannel(
      withSession("http://localhost/api/v1/chat/channels", a.token, {
        method: "POST",
        body: JSON.stringify({ channel: "STOREFRONT_CATALOG", is_enabled: true, config: { botName: "Bot A" } }),
      }),
    )
    expect((await view(a)).current).toMatchObject({ perVisitor: 50, perIp: 150 })
  })
})
