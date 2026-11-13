import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { PrismaChainPartnershipRepository } from "@/modules/chain-partnership/infra/prisma-partnership-repository"

import { createTenant, linkPartner, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import {
  addBrandLibraryVersion,
  createBrandLibraryItem,
  getBrandLibraryItem,
  listBrandLibrary,
  listChainBrandLibrary,
  updateBrandLibraryItem,
} from "@/modules/profiles/use-cases/brand-library"

const withCaps = (t: Tenant): Tenant => ({ ...t, ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "F1", "F2"]) } })

async function image(t: Tenant, mime = "image/png") {
  return prisma.assets.create({
    data: { organization_id: t.organizationId, kind: "ORIGINAL", storage_key: `org/${t.organizationId}/unfiled/x.png`, mime_type: mime, created_by: t.userId },
  })
}

describe("brand-library: cách ly tenant và chia sẻ chuỗi", () => {
  let chain: Tenant
  let member: Tenant
  let outsider: Tenant
  let linkId: string

  beforeEach(async () => {
    await resetDatabase()
    chain = withCaps(await createTenant("chuoi"))
    member = withCaps(await createTenant("thanh-vien"))
    outsider = withCaps(await createTenant("ngoai"))
    linkId = await linkPartner(chain, member, { code: "TV01" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tổ chức khác không thấy, không đọc, không sửa được mục của mình (404)", async () => {
    const item = await createBrandLibraryItem(chain.ctx, { title: "Màu chuẩn", category: "COLOR", textValue: "#2f6f4e" })
    expect(await listBrandLibrary(outsider.ctx, { includeArchived: true })).toEqual([])
    await expect(getBrandLibraryItem(outsider.ctx, item.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(updateBrandLibraryItem(outsider.ctx, item.id, { title: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(addBrandLibraryVersion(outsider.ctx, item.id, { textValue: "#000000" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("không dùng được ảnh của tổ chức khác hoặc tệp không phải ảnh", async () => {
    const foreign = await image(outsider)
    await expect(createBrandLibraryItem(chain.ctx, { title: "Logo", category: "LOGO", assetId: foreign.id })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    const video = await image(chain, "video/mp4")
    await expect(createBrandLibraryItem(chain.ctx, { title: "Logo", category: "LOGO", assetId: video.id })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    const own = await image(chain)
    const ok = await createBrandLibraryItem(chain.ctx, { title: "Logo", category: "LOGO", assetId: own.id })
    expect(ok.current_version).toBe(1)
  })

  it("phiên bản mới tăng số, giữ bản cũ; mục đã lưu trữ không nhận phiên bản", async () => {
    const item = await createBrandLibraryItem(chain.ctx, { title: "Khẩu hiệu", category: "COPY", textValue: "Bản 1" })
    const v2 = await addBrandLibraryVersion(chain.ctx, item.id, { textValue: "Bản 2", note: "đổi câu" })
    expect(v2.current_version).toBe(2)
    expect(v2.versions.map((v) => v.text_value)).toEqual(["Bản 2", "Bản 1"])
    // Mọi dòng mới đều mang đúng organization_id của tổ chức tạo ra
    expect(await prisma.brand_library_items.count({ where: { organization_id: { not: chain.organizationId } } })).toBe(0)
    expect(await prisma.brand_library_versions.count({ where: { organization_id: chain.organizationId, item_id: item.id } })).toBe(2)
    await updateBrandLibraryItem(chain.ctx, item.id, { status: "ARCHIVED" })
    await expect(addBrandLibraryVersion(chain.ctx, item.id, { textValue: "Bản 3" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(await listBrandLibrary(chain.ctx, { includeArchived: false })).toEqual([])
  })

  it("thành viên chỉ thấy mục chuỗi đã chia sẻ và đang dùng; tổ chức ngoài chuỗi nhận null", async () => {
    const shared = await createBrandLibraryItem(chain.ctx, { title: "Phông chính", category: "FONT", textValue: "Be Vietnam Pro" })
    await createBrandLibraryItem(chain.ctx, { title: "Nháp nội bộ", category: "COPY", textValue: "chưa chia sẻ" })
    await updateBrandLibraryItem(chain.ctx, shared.id, { share_with_members: true })

    const seen = await listChainBrandLibrary(member.ctx)
    expect(seen?.items.map((i) => i.title)).toEqual(["Phông chính"])
    expect(await listChainBrandLibrary(outsider.ctx)).toBeNull()

    await updateBrandLibraryItem(chain.ctx, shared.id, { status: "ARCHIVED" })
    expect((await listChainBrandLibrary(member.ctx))?.items).toEqual([])
  })

  it("thành viên bị tạm ngưng không còn thấy tài nguyên chuỗi; không sửa được mục chuỗi", async () => {
    const shared = await createBrandLibraryItem(chain.ctx, { title: "Màu", category: "COLOR", textValue: "#123456" })
    await updateBrandLibraryItem(chain.ctx, shared.id, { share_with_members: true })
    await expect(updateBrandLibraryItem(member.ctx, shared.id, { title: "đổi" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await new PrismaChainPartnershipRepository().updateStatus(linkId, "SUSPENDED")
    expect(await listChainBrandLibrary(member.ctx)).toBeNull()
  })

  it("ghi nhật ký kiểm toán khi tạo, thêm phiên bản và chia sẻ", async () => {
    const item = await createBrandLibraryItem(chain.ctx, { title: "Màu", category: "COLOR", textValue: "#123456" })
    await addBrandLibraryVersion(chain.ctx, item.id, { textValue: "#654321" })
    await updateBrandLibraryItem(chain.ctx, item.id, { share_with_members: true })
    const actions = await prisma.audit_logs.findMany({ where: { organization_id: chain.organizationId, entity_id: item.id }, select: { action: true } })
    expect(actions.map((a) => a.action).sort()).toEqual(["brand_library.create", "brand_library.update", "brand_library.version"])
  })
})
