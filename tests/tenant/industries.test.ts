import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { resolveTierChain } from "@/modules/organization/infra/tier-chain-repository"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { AvailabilityCheckRepository } from "@/modules/greeting-card/infra/availability-check-repository"
import { ShopContactRepository } from "@/modules/greeting-card/infra/shop-contact-repository"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { PublicOrderRepository } from "@/modules/orders/infra/public-order-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-012 D-T6: bảng `industries` + `organizations.industry_key`. Từ T-6c-2 cột là nguồn DUY NHẤT: không còn trigger
 * đồng bộ từ `settings.industry`, không còn dự phòng đọc JSON (seed ngành: `tests/helpers/industries-seed.ts`).
 */
describe("industries — ngành của tổ chức thành cột có khoá ngoại", () => {
  let t: Tenant

  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("tiem-hoa")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const keyOf = async () => (await prisma.organizations.findUniqueOrThrow({ where: { id: t.organizationId } })).industry_key

  it("có đủ ngành của plugin; Điện hoa đang dùng", async () => {
    const keys = (await prisma.industries.findMany({ orderBy: { key: "asc" } })).map((i) => i.key)
    expect(keys).toEqual(expect.arrayContaining(["FLORAL", "FASHION", "FNB", "CRAFT_GIFT", "RETAIL_GENERAL", "SERVICES", "HOMESTAY"]))
    expect((await prisma.industries.findUniqueOrThrow({ where: { key: "FLORAL" } })).status).toBe("ACTIVE")
  })

  it("T-6c-2: khoá settings.industry sót trong JSON không có tác dụng — cột là nguồn duy nhất", async () => {
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { industry_key: "FNB" } })
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { settings: { industry: "homestay", note: "x" } } })
    expect(await keyOf()).toBe("FNB") // không còn trigger chép JSON sang cột
    expect((await resolveTierChain(t.organizationId))?.industryKey).toBe("FNB")
    expect((await new OrganizationRepository().current(t.ctx))?.settings?.industry).toBe("FNB")

    await prisma.organizations.update({ where: { id: t.organizationId }, data: { industry_key: null } })
    expect((await resolveTierChain(t.organizationId))?.industryKey).toBeNull()
    const settings = (await new OrganizationRepository().current(t.ctx))?.settings as Record<string, unknown> | undefined
    expect(settings?.industry).toBeUndefined()
    expect(settings?.note).toBe("x")
  })

  it("industry_key là khoá ngoại: không ghi được mã ngoài bảng industries", async () => {
    await expect(
      prisma.organizations.update({ where: { id: t.organizationId }, data: { industry_key: "KHONG_CO" } }),
    ).rejects.toThrow()
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { industry_key: "FNB" } })
    expect((await resolveTierChain(t.organizationId))?.industryKey).toBe("FNB")
  })

  it("T-6b: dòng tổ chức đọc qua repository lấy settings.industry theo cột (cột là nguồn chuẩn)", async () => {
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { industry_key: "HOMESTAY" } })
    expect((await new OrganizationRepository().current(t.ctx))?.settings?.industry).toBe("HOMESTAY")
    expect(((await new GreetingCardRepository().getShopProfile(t.organizationId)).settings as Record<string, unknown>).industry).toBe("HOMESTAY")
  })

  // ── T-6c-1: ghi thẳng cột, đọc lồng theo cột ─────────────────────────────
  const rawSettings = async () =>
    (await prisma.organizations.findUniqueOrThrow({ where: { id: t.organizationId } })).settings as Record<string, unknown>

  it("T-6c-1: ghi settings qua repository → ngành vào cột, JSON không còn khoá industry; đọc rồi ghi lại không chép ngược", async () => {
    const repo = new OrganizationRepository()
    await repo.update(t.ctx, { settings: { industry: "fnb", note: "x" } })
    expect(await keyOf()).toBe("FNB")
    expect(await rawSettings()).toEqual({ note: "x" })

    const org = await repo.findById(t.organizationId)
    expect(org?.settings?.industry).toBe("FNB")
    await repo.updateTypeAndSettings(t.organizationId, org!.type, { ...org!.settings, other: 1 })
    expect(await keyOf()).toBe("FNB")
    expect(await rawSettings()).toEqual({ note: "x", other: 1 })

    await repo.updateSettings(t.ctx, { note: "y" }) // không có khoá industry → cột giữ nguyên
    expect(await keyOf()).toBe("FNB")
  })

  it("T-6c-1: các đường đọc lồng lấy ngành từ cột khi settings không còn industry", async () => {
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { settings: { note: "x" }, industry_key: "HOMESTAY" } })
    const industryIn = (settings: unknown) => (settings as Record<string, unknown> | null)?.industry
    expect((await new ShopContactRepository().findByOrganizationId(t.organizationId))?.industry).toBe("HOMESTAY")
    expect(industryIn(await new AvailabilityCheckRepository().findOrganizationSettings(t.organizationId))).toBe("HOMESTAY")
    expect(industryIn((await new SubcontractOrderRepository().findOrganizationSettings(t.organizationId))?.settings)).toBe("HOMESTAY")
    expect(industryIn(await new PublicOrderRepository().orgSettings(t.organizationId))).toBe("HOMESTAY")
  })
})
