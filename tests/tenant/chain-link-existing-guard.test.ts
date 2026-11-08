import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as linkExisting } from "@/app/api/v1/coordinator/partners/link-existing/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * UJ-01 (audit hành trình 06/11/2026, C1): liên kết "cửa hàng có sẵn" từng mở cho MỌI tổ chức có `F2`,
 * tìm tổ chức đích theo tên trên toàn hệ thống, trả về SĐT/email chủ tiệm kia và kéo chủ tiệm vào phòng
 * chat — tất cả không cần bên kia đồng ý. Liên kết lại một cửa hàng đã chấm dứt vẫn dùng lại dòng cũ
 * (ADR-012 T-3b, khoá ở `organization-links.test.ts`); phần cần cửa hàng chấp nhận làm ở UJ-10.
 */
describe("POST coordinator/partners/link-existing — chặn liên kết một chiều", () => {
  let chain: Tenant
  let store: Tenant
  let target: Tenant
  let targetSlug: string

  const call = (tenant: Tenant, body: Record<string, unknown>) =>
    linkExisting(
      withSession("http://localhost/api/v1/coordinator/partners/link-existing", tenant.token, {
        method: "POST",
        body: JSON.stringify({ partnerCode: "DT-01", ...body }),
      })
    )

  const linkCount = () => prisma.organization_links.count({ where: { child_org_id: target.organizationId } })

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chuoi")
    store = await createTenant("tiem-thuong")
    target = await createTenant("tiem-dich")
    await makeChainOrganization(chain)
    targetSlug = (await prisma.organizations.findUniqueOrThrow({ where: { id: target.organizationId } })).slug
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tổ chức không phải Chuỗi → 409, không tạo liên kết", async () => {
    const res = await call(store, { identifier: targetSlug })
    expect(res.status).toBe(409)
    expect(await linkCount()).toBe(0)
  })

  it("tìm theo tên tổ chức (không phải slug/email) → 404", async () => {
    const res = await call(chain, { identifier: "Tiệm hoa tiem-dich" })
    expect(res.status).toBe(404)
    expect(await linkCount()).toBe(0)
  })

  it("không tồn tại và tự liên kết chính mình trả cùng một câu 404", async () => {
    const missing = await call(chain, { identifier: "khong-co-tiem-nay" })
    const ownSlug = (await prisma.organizations.findUniqueOrThrow({ where: { id: chain.organizationId } })).slug
    const self = await call(chain, { identifier: ownSlug })
    expect(missing.status).toBe(404)
    expect(self.status).toBe(404)
    expect(JSON.stringify(await readJson(self))).toBe(JSON.stringify(await readJson(missing)))
  })

  it("Chuỗi liên kết theo slug: không lộ SĐT/email chủ tiệm, không tạo phòng chat", async () => {
    const res = await call(chain, { identifier: targetSlug })
    expect(res.status).toBe(201)
    const body = JSON.stringify(await readJson(res))
    expect(body).not.toContain("tiem-dich@vi-du.test")
    const link = await prisma.organization_links.findFirstOrThrow({ where: { child_org_id: target.organizationId } })
    expect(link.contact_email).toBeNull()
    expect(link.contact_phone).toBeNull()
    expect(await prisma.internal_chat_conversations.count()).toBe(0)
  })

  it("Chuỗi liên kết theo email chủ tiệm (khớp chính xác) vẫn được", async () => {
    const res = await call(chain, { identifier: "tiem-dich@vi-du.test" })
    expect(res.status).toBe(201)
    expect(await linkCount()).toBe(1)
  })

  it("mã đối tác đã dùng cho cửa hàng khác của chuỗi → 409, không ghi đè", async () => {
    const other = await createTenant("tiem-khac")
    await linkPartner(chain, other, { code: "DT-01" })
    const res = await call(chain, { identifier: targetSlug })
    expect(res.status).toBe(409)
    expect(await linkCount()).toBe(0)
  })
})
