import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { getMarketingKpisUseCase } from "@/modules/marketing-center/use-cases/get-marketing-kpis.use-case"
import { createPrintRenditionUseCase } from "@/modules/print/use-cases/create-print-rendition.use-case"

describe("Marketing & Sales Center — Cách ly tenant cho KPI & Quy thuộc (PR-7)", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const caps = (t: Tenant) => ({
      ...t,
      ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "M1", "M5", "Q1"]) },
    })
    a = caps(a)
    b = caps(b)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chỉ số KPI của tổ chức A chỉ phản ánh dữ liệu A, B không bị ảnh hưởng", async () => {
    // 1. Tạo dữ liệu in ấn cho A
    await createPrintRenditionUseCase(a.ctx, {
      sourceType: "DIRECT_PRINT",
      presetCode: "A4",
      imageWidthPx: 2480,
      imageHeightPx: 3508,
      hasQrCode: true,
      qrSizeMm: 30,
    })

    // 2. Tạo link & lead cho A
    const linkA = await prisma.short_links.create({
      data: {
        organization_id: a.organizationId,
        code: "promo-kpi-a",
        kind: "QR",
        name: "QR Bàn A",
        target_path: "/shop/a",
        scan_count: 50,
        created_by: a.ctx.userId,
      },
    })

    await prisma.leads.create({
      data: {
        organization_id: a.organizationId,
        name: "Khách VIP A",
        phone: "0901234567",
        source: "SHORT_LINK",
        short_link_id: linkA.id,
        consent_at: new Date(),
        consent_version: "v1.0",
        status: "NEW",
      },
    })

    // 3. Truy vấn KPI của A
    const kpisA = await getMarketingKpisUseCase(a.ctx, { timeWindow: "30D" })
    expect(kpisA.print.hasData).toBe(true)
    expect(kpisA.print.items[0]?.value).toBe(1)

    expect(kpisA.promotion.hasData).toBe(true)
    const clicksA = kpisA.promotion.items.find((i) => i.key === "promo_total_clicks")
    expect(clicksA?.value).toBe(50)
    const leadsA = kpisA.promotion.items.find((i) => i.key === "promo_leads_count")
    expect(leadsA?.value).toBe(1)

    // 4. Truy vấn KPI của B -> hoàn toàn trống, không rò rỉ dữ liệu của A
    const kpisB = await getMarketingKpisUseCase(b.ctx, { timeWindow: "30D" })
    expect(kpisB.print.hasData).toBe(false)
    expect(kpisB.print.items).toHaveLength(0)

    expect(kpisB.promotion.hasData).toBe(false)
    expect(kpisB.promotion.items).toHaveLength(0)
  })
})
