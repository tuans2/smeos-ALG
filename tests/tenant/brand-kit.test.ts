import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { generateLandingPageContent } from "@/modules/content-engine/domain/landing-content-generator"
import { getBrandKit } from "@/modules/brand-kit/use-cases/get-brand-kit"
import { defaultIdentityDeps, generateIdentityOptions, selectIdentityOption, type IdentityDeps } from "@/modules/brand-kit/use-cases/identity-options"
import { defaultLandingDeps, generateLandingOptions, selectLandingOption, type LandingDeps } from "@/modules/brand-kit/use-cases/landing-options"
import { getPublicCatalog } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { putBrandProfile } from "@/modules/profiles/use-cases/put-brand-profile"
import { putBusinessProfile } from "@/modules/profiles/use-cases/put-business-profile"
import { getBrandProfile } from "@/modules/profiles/use-cases/get-brand-profile"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Mục Thương hiệu 3 bước (PO 08/11/2026): khoá bước ở máy chủ, chọn phương án ghi vào hồ sơ thương hiệu,
 * xuất bản trang chính thức giữ nguyên link, "Tạo thêm" trừ credit (AI hỏng → hoàn), phương án của tổ chức
 * khác → 404. Bảng `brand_style_options`. AI và kho tệp giả lập — không gọi mạng.
 */
describe("mục Thương hiệu", () => {
  let a: Tenant
  let b: Tenant
  const ALL = ["F1", "F2", "J1", "J7"]
  const can = (t: Tenant, codes = ALL, workspaceId?: string): TenantContext => ({ ...t.ctx, ...(workspaceId ? { workspaceId } : {}), capabilities: new Set(codes) })

  let aiUp = true
  const identityDeps = (): IdentityDeps => ({
    ...defaultIdentityDeps(),
    writeSlogans: async (_ctx, input) => (aiUp ? input.styles.map((s) => ({ style_key: s.key, slogan: `Khẩu hiệu ${s.key} ${s.variant}`, rationale: "Hợp khách văn phòng" })) : null),
    storeLogo: async () => `logo-${randomUUID()}`,
  })
  const landingDeps = (): LandingDeps => ({
    ...defaultLandingDeps(),
    writeLanding: async (_ctx, input) => ({ pkg: generateLandingPageContent(input), aiRan: true }),
  })

  async function completeProfile(t: Tenant) {
    const ctx = can(t)
    const product = await prisma.products.create({ data: { organization_id: t.organizationId, code: "SP-1", name: "Bó hồng đỏ", status: "ACTIVE" } })
    await putBusinessProfile(ctx, {
      display_name: "Tiệm hoa Mộc Lan", phone: "0901234567", address: "12 Lê Lợi, Quận 1",
      description: "Hoa tươi cắm theo yêu cầu cho văn phòng.", target_customers: ["Văn phòng tặng sếp"],
    })
    await putBrandProfile(ctx, { brand_assets: { storefront_photos: ["org/x/cua-hang.jpg"], intro_video: "org/x/gioi-thieu.mp4", featured_product_ids: [product.id] } })
    return product.id
  }

  beforeEach(async () => {
    await resetDatabase()
    aiUp = true
    a = await createTenant("bk-a")
    b = await createTenant("bk-b")
  })
  afterAll(async () => disconnectDatabase())

  it("hồ sơ chưa đủ → máy chủ khoá bước 2 và 3; thiếu quyền → bị chặn", async () => {
    await expect(generateIdentityOptions(can(a), { mode: "initial", idempotencyKey: null }, identityDeps())).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(generateLandingOptions(can(a), { mode: "initial", idempotencyKey: null }, landingDeps())).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(generateIdentityOptions(can(a, ["F1"]), { mode: "initial", idempotencyKey: null }, identityDeps())).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    const view = await getBrandKit(can(a), identityDeps(), async () => ({ brandExtraOptionCredit: 1 }) as never)
    expect(view.steps.map((s) => s.status)).toEqual(["INPUT_REQUIRED", "LOCKED", "LOCKED"])
  })

  it("đủ hồ sơ → 3 phương án; chọn → ghi màu, khẩu hiệu, logo vào hồ sơ thương hiệu; bước 3 mở", async () => {
    await completeProfile(a)
    const gen = await generateIdentityOptions(can(a), { mode: "initial", idempotencyKey: null }, identityDeps())
    expect(gen.created.map((o) => o.content.style_key)).toEqual(["LUXURY", "YOUTHFUL", "RUSTIC"])
    expect(gen.usage).toBeNull()
    await expect(generateIdentityOptions(can(a), { mode: "initial", idempotencyKey: null }, identityDeps())).rejects.toMatchObject({ code: "CONFLICT" })

    const chosen = gen.created[2]!
    await selectIdentityOption(can(a), chosen.id, identityDeps())
    const brand = await getBrandProfile(can(a))
    expect(brand).toMatchObject({ primary_color: chosen.content.palette.primary, font_heading: "Lora", slogan: "Khẩu hiệu RUSTIC 0" })
    expect(brand?.logo_asset_id).toMatch(/^logo-/)
    // Form Cài đặt không gửi khẩu hiệu → giữ nguyên (đồng bộ hai chiều không mất dữ liệu)
    await putBrandProfile(can(a), { primary_color: "#112233", brand_assets: brand?.brand_assets })
    expect((await getBrandProfile(can(a)))?.slogan).toBe("Khẩu hiệu RUSTIC 0")

    const view = await getBrandKit(can(a), identityDeps(), async () => ({ brandExtraOptionCredit: 1 }) as never)
    expect(view.steps.map((s) => s.status)).toEqual(["COMPLETED", "COMPLETED", "AVAILABLE"])
  })

  it("Landing page: chọn = xuất bản trang /c có thông tin cửa hàng sống; đổi phương án giữ nguyên link", async () => {
    const productId = await completeProfile(a)
    const id = await generateIdentityOptions(can(a), { mode: "initial", idempotencyKey: null }, identityDeps())
    await selectIdentityOption(can(a), id.created[0]!.id, identityDeps())
    const land = await generateLandingOptions(can(a), { mode: "initial", idempotencyKey: null }, landingDeps())
    expect(land.created).toHaveLength(3)
    expect(land.created[0]!.content.headline).toBe("Khẩu hiệu LUXURY 0")

    const first = await selectLandingOption(can(a), land.created[0]!.id, landingDeps())
    const pub = await getPublicCatalog(first.slug)
    expect(pub.status).toBe("ACTIVE")
    if (pub.status !== "ACTIVE") return
    expect(pub.products.map((p) => p.id)).toEqual([productId])
    expect(pub.storeInfo).toMatchObject({ address: "12 Lê Lợi, Quận 1", slogan: "Khẩu hiệu LUXURY 0" })

    const second = await selectLandingOption(can(a), land.created[1]!.id, landingDeps())
    expect(second.slug).toBe(first.slug)
    const view = await getBrandKit(can(a), identityDeps(), async () => ({ brandExtraOptionCredit: 1 }) as never)
    expect(view.landing.published_path).toBe(`/c/${first.slug}`)
    expect(view.steps.every((s) => s.status === "COMPLETED")).toBe(true)
  })

  it("phương án của tổ chức khác → 404, không lộ trong danh sách", async () => {
    await completeProfile(a)
    await completeProfile(b)
    const gen = await generateIdentityOptions(can(a), { mode: "initial", idempotencyKey: null }, identityDeps())
    await expect(selectIdentityOption(can(b), gen.created[0]!.id, identityDeps())).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(selectLandingOption(can(b), gen.created[0]!.id, landingDeps())).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    const viewB = await getBrandKit(can(b), identityDeps(), async () => ({ brandExtraOptionCredit: 1 }) as never)
    expect(viewB.identity.options).toEqual([])
  })

  it("Tạo thêm: trừ credit một lần theo Idempotency-Key; AI hỏng → vẫn có phương án mẫu và hoàn credit", async () => {
    await completeProfile(a)
    const ws = await prisma.workspaces.create({ data: { organization_id: a.organizationId, name: "Sản xuất", kind: "PRODUCTION" } })
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { credit_balance: 5 } })
    const ctx = can(a, ALL, ws.id)
    const balance = async () => (await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance

    await generateIdentityOptions(ctx, { mode: "initial", idempotencyKey: null }, identityDeps())
    expect(await balance()).toBe(5)
    await expect(generateIdentityOptions(ctx, { mode: "extra", idempotencyKey: null }, identityDeps())).rejects.toMatchObject({ code: "VALIDATION_FAILED" })

    const key = randomUUID()
    const extra = await generateIdentityOptions(ctx, { mode: "extra", idempotencyKey: key }, identityDeps())
    expect(extra.created).toHaveLength(1)
    expect(extra.usage).toMatchObject({ costCredit: 1, refunded: false })
    expect(await balance()).toBe(4)
    const again = await generateIdentityOptions(ctx, { mode: "extra", idempotencyKey: key }, identityDeps())
    expect(again.created[0]!.id).toBe(extra.created[0]!.id)
    expect(await balance()).toBe(4)

    aiUp = false
    const fallback = await generateIdentityOptions(ctx, { mode: "extra", idempotencyKey: randomUUID() }, identityDeps())
    expect(fallback.created[0]!.content.slogan_source).toBe("template")
    expect(fallback.usage?.refunded).toBe(true)
    expect(await balance()).toBe(4)
  })
})
