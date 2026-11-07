import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as linkExisting } from "@/app/api/v1/coordinator/partners/link-existing/route"
import { PATCH as patchStatus } from "@/app/api/v1/coordinator/partners/[id]/status/route"
import { GET as listLinks } from "@/app/api/v1/chain/links/route"
import { POST as accept } from "@/app/api/v1/chain/links/[id]/accept/route"
import { POST as decline } from "@/app/api/v1/chain/links/[id]/decline/route"
import { POST as leave } from "@/app/api/v1/chain/links/[id]/leave/route"
import { isActivePartnerTarget } from "@/modules/chain-partnership/infra/partner-link-guard"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>

/**
 * UJ-10 (audit hành trình 06/11/2026, C1/C2 — UQ2): Chuỗi mời → `PENDING`, không mở khoá gì cho tới khi CỬA HÀNG
 * đồng ý trong 7 ngày; cửa hàng từ chối / tự rời được; Chuỗi đổi trạng thái theo ma trận, bắt buộc lý do.
 */
describe("liên kết Chuỗi ↔ cửa hàng cần cửa hàng đồng ý", () => {
  let chain: Tenant
  let store: Tenant
  let outsider: Tenant
  let storeSlug: string

  const post = (h: Handler, t: Tenant, id: string, body?: unknown) =>
    h(withSession(`http://localhost/api/v1/chain/links/${id}`, t.token, { method: "POST", ...(body ? { body: JSON.stringify(body) } : {}) }), {
      params: Promise.resolve({ id }),
    })
  const setStatus = (id: string, status: string, reason?: string) =>
    patchStatus(withSession(`http://localhost/api/v1/coordinator/partners/${id}/status`, chain.token, { method: "PATCH", body: JSON.stringify({ status, reason }) }), {
      params: Promise.resolve({ id }),
    })

  async function invite(): Promise<string> {
    const res = await linkExisting(
      withSession("http://localhost/api/v1/coordinator/partners/link-existing", chain.token, {
        method: "POST",
        body: JSON.stringify({ identifier: storeSlug, partnerCode: "DT-01" }),
      })
    )
    expect(res.status).toBe(201)
    return ((await readJson(res)).data as { id: string }).id
  }

  const linkRow = (id: string) => prisma.organization_links.findUniqueOrThrow({ where: { id } })
  const storeView = async (t: Tenant) =>
    (await readJson(await listLinks(withSession("http://localhost/api/v1/chain/links", t.token)))).data as {
      invitations: Array<{ id: string; chain_name: string }>
      memberships: Array<{ id: string; status: string }>
    }

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chuoi")
    store = await createTenant("cua-hang")
    outsider = await createTenant("ben-ngoai")
    await makeChainOrganization(chain)
    storeSlug = (await prisma.organizations.findUniqueOrThrow({ where: { id: store.organizationId } })).slug
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("lời mời ở PENDING không mở khoá gì; cửa hàng đồng ý → ACTIVE, là cạnh chính", async () => {
    const id = await invite()
    expect((await linkRow(id)).status).toBe("PENDING")
    expect(await isActivePartnerTarget(chain.organizationId, store.organizationId)).toBe(false)

    const view = await storeView(store)
    expect(view.invitations.map((i) => i.id)).toEqual([id])
    expect(view.invitations[0]?.chain_name).toBe("Tiệm hoa chuoi")

    expect((await post(accept as Handler, store, id)).status).toBe(200)
    expect(await linkRow(id)).toMatchObject({ status: "ACTIVE", is_primary: true })
    expect(await isActivePartnerTarget(chain.organizationId, store.organizationId)).toBe(true)
  })

  it("Chuỗi không tự kích hoạt lời mời; tổ chức khác không đồng ý hộ", async () => {
    const id = await invite()
    expect((await setStatus(id, "ACTIVE", "Kích hoạt luôn")).status).toBe(409)
    expect((await post(accept as Handler, outsider, id)).status).toBe(404)
    expect((await linkRow(id)).status).toBe("PENDING")
  })

  it("từ chối → TERMINATED; Chuỗi không mở lại được, phải mời mới", async () => {
    const id = await invite()
    expect((await post(decline as Handler, store, id)).status).toBe(200)
    expect((await linkRow(id)).status).toBe("TERMINATED")
    expect((await setStatus(id, "ACTIVE", "Mở lại")).status).toBe(409)
    expect(await invite()).toBe(id)
    expect((await linkRow(id)).status).toBe("PENDING")
  })

  it("lời mời quá 7 ngày không hiện, đồng ý bị từ chối; mời lại làm mới hạn", async () => {
    const id = await invite()
    await prisma.organization_links.update({ where: { id }, data: { valid_from: new Date(Date.now() - 8 * 86_400_000) } })
    expect((await storeView(store)).invitations).toEqual([])
    expect((await post(accept as Handler, store, id)).status).toBe(409)
    await invite()
    expect((await storeView(store)).invitations.map((i) => i.id)).toEqual([id])
  })

  it("đổi trạng thái bắt buộc lý do, ghi nhật ký; cửa hàng tự rời chuỗi được (có lý do)", async () => {
    const id = await invite()
    await post(accept as Handler, store, id)

    expect((await setStatus(id, "SUSPENDED")).status).toBe(400)
    expect((await setStatus(id, "SUSPENDED", "Tạm dừng nhận đơn mùa Tết")).status).toBe(200)
    expect((await linkRow(id)).status).toBe("SUSPENDED")
    expect(await prisma.audit_logs.count({ where: { entity_id: id, action: "chain_link.chain_status" } })).toBe(1)

    expect((await post(leave as Handler, store, id, {})).status).toBe(400)
    expect((await post(leave as Handler, store, id, { reason: "Không hợp tác nữa" })).status).toBe(200)
    expect((await linkRow(id)).status).toBe("TERMINATED")
    expect((await storeView(store)).memberships).toEqual([])
  })
})
