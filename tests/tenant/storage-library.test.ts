import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { saveLandingPage } from "@/modules/landing-page/use-cases/save-landing-page"
import { getLibrarySummary, listLibrary } from "@/modules/storage/use-cases/list-library"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Kho dữ liệu v2 — thư viện tập trung: cách ly tổ chức và phạm vi chi nhánh. */
describe("cách ly tenant — Kho dữ liệu v2 (thư viện)", () => {
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

  const all = (ctx: TenantContext, type: string, scope: Parameters<typeof listLibrary>[1]["scope"] = "all") =>
    listLibrary({ ...ctx, capabilities: new Set([...ctx.capabilities, "J1", "L1"]) }, { type, scope, q: null, from: null, cursor: null })

  async function seedCatalog(ctx: TenantContext, name: string, createdBy: string) {
    return prisma.catalog_links.create({
      data: { organization_id: ctx.organizationId, slug: `${name}-${crypto.randomUUID()}`, name, created_by: createdBy },
    })
  }

  it("không thấy dữ liệu của tổ chức khác; chi nhánh của tổ chức khác → 404", async () => {
    await seedCatalog(a.ctx, "Catalog A", a.ctx.userId)
    expect((await all(b.ctx, "catalog")).items).toEqual([])
    expect((await all(a.ctx, "catalog")).items.map((i) => i.title)).toEqual(["Catalog A"])

    const branchA = await prisma.branches.create({ data: { organization_id: a.organizationId, name: "CN A", code: "A1" } })
    await expect(all(b.ctx, "catalog", { branchId: branchA.id })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("landing page đã lưu (`landing_pages`) hiện trong thư viện, chỉ của tổ chức mình", async () => {
    const id = await saveLandingPage(a.ctx, {
      title: "Mừng khai trương", pageType: null, occasionLabel: "Khai trương", input: { occasionId: "khai-truong" }, content: { hero: {} },
    })
    expect(id).toEqual(expect.any(String))
    expect((await all(a.ctx, "landing")).items.map((i) => [i.id, i.title, i.open_href])).toEqual([[id, "Mừng khai trương", "/landing-page"]])
    expect((await all(b.ctx, "landing")).items).toEqual([])
  })

  it("thẻ chào có ảnh bìa = ảnh MAIN của sản phẩm đầu tiên", async () => {
    const product = await prisma.products.create({ data: { organization_id: a.organizationId, code: "SP-1", name: "Bó hồng" } })
    const asset = await prisma.assets.create({
      data: {
        organization_id: a.organizationId, kind: "MASTER", state: "READY", mime_type: "image/jpeg",
        storage_key: `org/${a.organizationId}/${product.id}/main.jpg`, created_by: a.ctx.userId,
      },
    })
    await prisma.product_images.create({ data: { organization_id: a.organizationId, product_id: product.id, asset_id: asset.id, role: "MAIN" } })
    const catalog = await prisma.greeting_catalogs.create({
      data: { organization_id: a.organizationId, code: "8-3", name: "Mừng 8/3", created_by: a.ctx.userId },
    })
    await prisma.greeting_catalog_products.create({ data: { organization_id: a.organizationId, catalog_id: catalog.id, product_id: product.id } })

    const [item] = (await all(a.ctx, "greeting_catalog")).items
    expect(item?.thumbnail_url).toContain(`org/${a.organizationId}/${product.id}/main.jpg`)
  })

  it("phân loại theo chi nhánh của người tạo; nhân viên chi nhánh chỉ thấy chi nhánh mình + trụ sở", async () => {
    const [q1, q3] = await Promise.all([
      prisma.branches.create({ data: { organization_id: a.organizationId, name: "Quận 1", code: "Q1" } }),
      prisma.branches.create({ data: { organization_id: a.organizationId, name: "Quận 3", code: "Q3" } }),
    ])
    const owner = await prisma.memberships.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    const staff = async (branchId: string, email: string) => {
      const user = await prisma.users.create({ data: { email } })
      await prisma.memberships.create({
        data: { organization_id: a.organizationId, user_id: user.id, role_id: owner.role_id, branch_id: branchId },
      })
      return user.id
    }
    const s1 = await staff(q1.id, `q1-${crypto.randomUUID()}@test.vn`)
    const s3 = await staff(q3.id, `q3-${crypto.randomUUID()}@test.vn`)
    await seedCatalog(a.ctx, "Trụ sở", a.ctx.userId)
    await seedCatalog(a.ctx, "Của Q1", s1)
    await seedCatalog(a.ctx, "Của Q3", s3)

    const titles = (r: Awaited<ReturnType<typeof all>>) => r.items.map((i) => i.title).sort()
    const whole = await all(a.ctx, "catalog")
    expect(titles(whole)).toEqual(["Của Q1", "Của Q3", "Trụ sở"])
    expect(whole.items.find((i) => i.title === "Của Q1")?.branch).toEqual({ id: q1.id, name: "Quận 1" })
    expect(titles(await all(a.ctx, "catalog", "hq"))).toEqual(["Trụ sở"])
    expect(titles(await all(a.ctx, "catalog", { branchId: q3.id }))).toEqual(["Của Q3"])

    const q1Staff: TenantContext = { ...a.ctx, userId: s1, branchId: q1.id }
    expect(titles(await all(q1Staff, "catalog", { branchId: q3.id }))).toEqual(["Của Q1", "Trụ sở"])

    // Video có người tạo (từ 29/10/2026) được xếp đúng chi nhánh; video cũ (null) tính là trụ sở
    const video = (title: string, createdBy: string | null) =>
      prisma.video_jobs.create({
        data: { organization_id: a.organizationId, title, format: "REEL_15S", duration_seconds: 15, created_by: createdBy },
      })
    await video("Video Q1", s1)
    await video("Video cũ", null)
    const withCaps = { ...a.ctx, capabilities: new Set([...a.ctx.capabilities, "I1", "J1"]) }
    expect(titles(await listLibrary(withCaps, { type: "video", scope: { branchId: q1.id }, q: null, from: null, cursor: null }))).toEqual(["Video Q1"])
    expect(titles(await listLibrary(withCaps, { type: "video", scope: "hq", q: null, from: null, cursor: null }))).toEqual(["Video cũ"])

    const summary = await getLibrarySummary(withCaps, { branchId: q1.id })
    expect(summary.counts).toMatchObject({ catalog: 1, video: 1 })
    expect((await getLibrarySummary(withCaps, "all")).counts).toMatchObject({ catalog: 3, video: 2 })
  })
})
