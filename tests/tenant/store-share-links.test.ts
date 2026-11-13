import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import {
  createStoreShareLink,
  getStoreShareLink,
  revokeStoreShareLink,
} from "@/modules/profiles/use-cases/store-share-link"
import { getPublicStoreProfile, recordStoreProfileView } from "@/modules/profiles/use-cases/get-public-store-profile"

async function fillEssentials(t: Tenant, name: string) {
  await prisma.business_profiles.upsert({
    where: { organization_id: t.organizationId },
    create: { organization_id: t.organizationId, display_name: name, phone: "0901234567", address: "12 Lê Lợi" },
    update: { display_name: name, phone: "0901234567", address: "12 Lê Lợi" },
  })
  await prisma.brand_profiles.upsert({
    where: { organization_id: t.organizationId },
    create: { organization_id: t.organizationId, logo_asset_id: "https://cdn.vi-du.test/logo.png" },
    update: { logo_asset_id: "https://cdn.vi-du.test/logo.png" },
  })
}

describe("store-share-links: cách ly tenant", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    // Chủ cửa hàng (dieu_hanh) có F1/F2 theo mặc định; fixture không nạp sẵn
    const withProfileCaps = (t: Tenant): Tenant => ({
      ...t,
      ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "F1", "F2"]) },
    })
    a = withProfileCaps(a)
    b = withProfileCaps(b)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("không xuất bản khi hồ sơ thiếu mục thiết yếu", async () => {
    await expect(createStoreShareLink(a.ctx)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(await getStoreShareLink(a.ctx)).toBeNull()
  })

  it("mỗi tenant chỉ thấy link của mình; trang công khai hiện đúng cửa hàng", async () => {
    await fillEssentials(a, "Cửa hàng Alpha")
    await fillEssentials(b, "Cửa hàng Beta")
    const linkA = await createStoreShareLink(a.ctx)
    const linkB = await createStoreShareLink(b.ctx)

    expect(linkA.slug).not.toBe(linkB.slug)
    expect((await getStoreShareLink(a.ctx))?.slug).toBe(linkA.slug)
    expect((await getStoreShareLink(b.ctx))?.slug).toBe(linkB.slug)

    const pub = await getPublicStoreProfile(linkA.slug)
    expect(pub.status).toBe("ACTIVE")
    if (pub.status === "ACTIVE") expect(pub.profile.name).toBe("Cửa hàng Alpha")
  })

  it("tạo lại khi đã có link trả về đúng link cũ (không sinh link thứ hai)", async () => {
    await fillEssentials(a, "Cửa hàng Alpha")
    const first = await createStoreShareLink(a.ctx)
    const second = await createStoreShareLink(a.ctx)
    expect(second.slug).toBe(first.slug)
    expect(await prisma.store_share_links.count({ where: { organization_id: a.organizationId } })).toBe(1)
  })

  it("tenant B thu hồi không đụng link của A (404 vì B không có link)", async () => {
    await fillEssentials(a, "Cửa hàng Alpha")
    const linkA = await createStoreShareLink(a.ctx)
    await expect(revokeStoreShareLink(b.ctx)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await getPublicStoreProfile(linkA.slug)).status).toBe("ACTIVE")
  })

  it("thu hồi: link cũ báo đã ngừng, không đếm thêm lượt xem; tạo lại ra slug mới", async () => {
    await fillEssentials(a, "Cửa hàng Alpha")
    const old = await createStoreShareLink(a.ctx)
    await recordStoreProfileView(old.slug)
    await revokeStoreShareLink(a.ctx)

    expect((await getPublicStoreProfile(old.slug)).status).toBe("REVOKED")
    await recordStoreProfileView(old.slug)
    const row = await prisma.store_share_links.findUnique({ where: { slug: old.slug } })
    expect(row?.view_count).toBe(1)

    const fresh = await createStoreShareLink(a.ctx)
    expect(fresh.slug).not.toBe(old.slug)
  })

  it("logo là tài sản của tổ chức khác thì không hiện", async () => {
    await fillEssentials(a, "Cửa hàng Alpha")
    const foreign = await prisma.assets.create({
      data: {
        organization_id: b.organizationId, kind: "ORIGINAL", storage_key: `org/${b.organizationId}/x.png`,
        mime_type: "image/png", created_by: b.userId,
      },
    })
    await prisma.brand_profiles.update({ where: { organization_id: a.organizationId }, data: { logo_asset_id: foreign.id } })
    const link = await prisma.store_share_links.create({
      data: { organization_id: a.organizationId, slug: "alpha-test-logo", created_by: a.userId },
    })
    const pub = await getPublicStoreProfile(link.slug)
    expect(pub.status === "ACTIVE" && pub.profile.logoUrl).toBeNull()
  })

  it("slug sai hình dạng hoặc không tồn tại → không tìm thấy", async () => {
    expect((await getPublicStoreProfile("../x")).status).toBe("NOT_FOUND")
    expect((await getPublicStoreProfile("khong-ton-tai")).status).toBe("NOT_FOUND")
  })
})
