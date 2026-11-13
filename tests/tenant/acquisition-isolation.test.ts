import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"
import { createCatalogLink } from "@/modules/catalog-links/use-cases/create-catalog-link"
import { captureCatalogLead } from "@/modules/acquisition/use-cases/capture-lead"
import { listLeads, updateLead } from "@/modules/acquisition/use-cases/manage-leads"
import { createShortLink, getShortLinkStats, listShortLinks, updateShortLink } from "@/modules/acquisition/use-cases/manage-short-links"
import { resolveShortLink } from "@/modules/acquisition/use-cases/resolve-short-link"
import { PATCH as patchLeadRoute } from "@/app/api/v1/leads/[id]/route"

const lead = { name: "Lan", phone: "0901234567", consent: true }

describe("Bước 4 — cách ly tenant cho lead và link/QR động", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const caps = (t: Tenant) => ({ ...t, ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "J1", "Q1", "Q3"]) } })
    a = caps(a)
    b = caps(b)
    await createCatalogLink(a.ctx, { slug: "catalog-a", name: "A", description: null, filters: null })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("lead công khai ghi vào tổ chức của catalog, vào CRM và có đồng ý liên hệ", async () => {
    await captureCatalogLead("catalog-a", lead, undefined)
    const rows = await prisma.leads.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.organization_id).toBe(a.organizationId)
    const customer = await prisma.customers.findFirst({ where: { id: rows[0]!.customer_id! } })
    expect(customer?.organization_id).toBe(a.organizationId)
    const consent = await prisma.customer_consents.findFirst({ where: { customer_id: customer!.id, channel: "PHONE_CALL" } })
    expect(consent?.granted).toBe(true)

    expect((await listLeads(a.ctx, { limit: 20 })).items).toHaveLength(1)
    expect((await listLeads(b.ctx, { limit: 20 })).items).toHaveLength(0)
  })

  it("hai khách gửi đồng thời không mất lead nào", async () => {
    await Promise.all([
      captureCatalogLead("catalog-a", { ...lead, phone: "0901234561" }, undefined),
      captureCatalogLead("catalog-a", { ...lead, phone: "0901234562" }, undefined),
      captureCatalogLead("catalog-a", { ...lead, phone: "0901234563" }, undefined),
    ])
    expect(await prisma.leads.count()).toBe(3)
  })

  it("tổ chức B sửa lead của A → 404 (cả use-case và route)", async () => {
    const { leadId } = await captureCatalogLead("catalog-a", lead, undefined)
    await expect(updateLead(b.ctx, leadId, { status: "WON" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    const res = await patchLeadRoute(
      withSession(`http://localhost/api/v1/leads/${leadId}`, b.token, { method: "PATCH", body: JSON.stringify({ status: "WON" }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ id: leadId }) },
    )
    expect(res.status).toBe(404)
    expect((await prisma.leads.findUnique({ where: { id: leadId } }))?.status).toBe("NEW")
  })

  it("giao lead cho người ngoài tổ chức → từ chối", async () => {
    const { leadId } = await captureCatalogLead("catalog-a", lead, undefined)
    await expect(updateLead(a.ctx, leadId, { assigneeUserId: b.userId })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    const updated = await updateLead(a.ctx, leadId, { status: "CONTACTED", assigneeUserId: a.userId })
    expect(updated?.status).toBe("CONTACTED")
  })

  it("link/QR: B không thấy, không sửa, không xem thống kê của A", async () => {
    const link = await createShortLink(a.ctx, "QR", { name: "Quầy", targetPath: "/c/catalog-a", placementLabel: "Quầy thu ngân" })
    expect(link.utm_medium).toBe("qr")
    expect((await listShortLinks(b.ctx, { limit: 20 })).items).toHaveLength(0)
    await expect(updateShortLink(b.ctx, link.id, { isActive: false })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(getShortLinkStats(b.ctx, link.id, 30)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("quét mã → ghi lượt + lead từ QR được gán nguồn; mã của A không gán được cho catalog của B", async () => {
    const link = await createShortLink(a.ctx, "QR", { name: "Tờ rơi", targetPath: "/c/catalog-a" })
    const target = await resolveShortLink(link.code, { ip: "1.2.3.4", userAgent: "iPhone Mobile", referrer: null })
    expect(target).toContain(`ref=${link.code}`)
    await captureCatalogLead("catalog-a", { ...lead, ref: link.code }, undefined)
    const stats = await getShortLinkStats(a.ctx, link.id, 30)
    expect(stats.totalScans).toBe(1)
    expect(stats.leads).toBe(1)
    expect(stats.byDevice.MOBILE).toBe(1)

    await createCatalogLink(b.ctx, { slug: "catalog-b", name: "B", description: null, filters: null })
    await captureCatalogLead("catalog-b", { ...lead, ref: link.code }, undefined)
    const bLead = await prisma.leads.findFirst({ where: { organization_id: b.organizationId } })
    expect(bLead?.short_link_id).toBeNull()
  })

  it("link đã tắt → không chuyển hướng, không ghi lượt", async () => {
    const link = await createShortLink(a.ctx, "SALES_LINK", { name: "Zalo", targetPath: "/c/catalog-a" })
    await updateShortLink(a.ctx, link.id, { isActive: false })
    expect(await resolveShortLink(link.code, { ip: "1.2.3.4", userAgent: null, referrer: null })).toBeNull()
    expect(await prisma.link_events.count()).toBe(0)
  })

  it("trang đích ngoài cửa hàng bị từ chối", async () => {
    await expect(createShortLink(a.ctx, "QR", { name: "x", targetPath: "https://evil.example" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    void readJson
  })
})
