/**
 * Công cụ 45 — thư viện nhận diện thương hiệu.
 * Xem: F1 · thêm/sửa/phiên bản mới/chia sẻ/lưu trữ: F2 (ghi nhật ký kiểm toán).
 * Cửa hàng thành viên đọc mục chuỗi đã chia sẻ qua liên kết chuỗi ACTIVE (organization_links) —
 * tổ chức chuỗi suy ra ở máy chủ từ tổ chức đang đăng nhập, không nhận từ client.
 */
import { notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { ASSET_VIEW_URL_TTL_SECONDS } from "@/modules/assets/use-cases/get-asset-view-url"
import {
  BRAND_LIBRARY_IMAGE_MIMES, isFileCategory, validateItemMeta, validateVersionContent,
  type BrandLibraryCategory, type BrandLibraryItemView, type BrandLibraryStatus, type BrandLibraryVersionView,
  type VersionContentInput,
} from "@/modules/profiles/domain/brand-library"
import type { BrandLibraryItemRow, BrandLibraryVersionRow, IBrandLibraryRepository } from "@/modules/profiles/domain/repositories/brand-library-repository.interface"
import { getBrandLibraryRepository } from "@/modules/profiles/infra/brand-library-repository"

async function versionView(v: BrandLibraryVersionRow): Promise<BrandLibraryVersionView> {
  let file_url: string | null = null
  if (v.storage_key) {
    try {
      file_url = await getStorageProvider().signedUrl(v.storage_key, ASSET_VIEW_URL_TTL_SECONDS, "GET")
    } catch {
      file_url = null
    }
  }
  return { version: v.version, text_value: v.text_value, file_url, note: v.note, created_at: v.created_at.toISOString() }
}

async function itemView(r: BrandLibraryItemRow): Promise<BrandLibraryItemView> {
  const latest = r.versions[0]
  return {
    id: r.id, title: r.title, category: r.category, description: r.description,
    share_with_members: r.share_with_members, status: r.status, current_version: r.current_version,
    updated_at: r.updated_at.toISOString(), latest: latest ? await versionView(latest) : null,
  }
}

async function checkContent(ctx: TenantContext, repo: IBrandLibraryRepository, category: BrandLibraryCategory, input: VersionContentInput) {
  const errors = validateVersionContent(category, input)
  if (Object.keys(errors).length) throw validationFailed(errors)
  if (isFileCategory(category) && input.assetId) {
    const mime = await repo.assetMime(ctx, input.assetId)
    if (!mime) throw validationFailed({ asset_id: "Không tìm thấy tệp" })
    if (!(BRAND_LIBRARY_IMAGE_MIMES as readonly string[]).includes(mime)) {
      throw validationFailed({ asset_id: "Chỉ nhận ảnh JPG, PNG hoặc WebP" })
    }
  }
  return {
    assetId: isFileCategory(category) ? input.assetId ?? null : null,
    textValue: isFileCategory(category) ? null : input.textValue?.trim() ?? null,
    note: input.note?.trim() || null,
  }
}

export async function listBrandLibrary(ctx: TenantContext, opts: { includeArchived: boolean }, repo = getBrandLibraryRepository()) {
  requireCapability(ctx, "F1")
  return Promise.all((await repo.list(ctx, opts.includeArchived)).map(itemView))
}

export async function getBrandLibraryItem(ctx: TenantContext, id: string, repo = getBrandLibraryRepository()) {
  requireCapability(ctx, "F1")
  const row = await repo.findById(ctx, id)
  if (!row) throw notFound()
  return { ...(await itemView(row)), versions: await Promise.all(row.versions.map(versionView)) }
}

export async function createBrandLibraryItem(
  ctx: TenantContext,
  input: { title: string; category: BrandLibraryCategory; description?: string | null } & VersionContentInput,
  repo = getBrandLibraryRepository()
) {
  requireCapability(ctx, "F2")
  const metaErrors = validateItemMeta(input)
  if (Object.keys(metaErrors).length) throw validationFailed(metaErrors)
  const content = await checkContent(ctx, repo, input.category, input)
  const id = await repo.create(ctx, { title: input.title.trim(), category: input.category, description: input.description?.trim() || null }, content)
  await recordAuditLog(ctx, { action: "brand_library.create", entityType: "brand_library_item", entityId: id, after: { title: input.title, category: input.category } })
  return getBrandLibraryItem(ctx, id, repo)
}

export async function addBrandLibraryVersion(ctx: TenantContext, id: string, input: VersionContentInput, repo = getBrandLibraryRepository()) {
  requireCapability(ctx, "F2")
  const row = await repo.findById(ctx, id)
  if (!row) throw notFound()
  if (row.status === "ARCHIVED") throw validationFailed({ status: "Tài nguyên đã lưu trữ, hãy khôi phục trước" })
  const content = await checkContent(ctx, repo, row.category, input)
  const version = await repo.addVersion(ctx, id, content)
  if (version === null) throw notFound()
  await recordAuditLog(ctx, { action: "brand_library.version", entityType: "brand_library_item", entityId: id, before: { version: row.current_version }, after: { version } })
  return getBrandLibraryItem(ctx, id, repo)
}

export async function updateBrandLibraryItem(
  ctx: TenantContext,
  id: string,
  patch: { title?: string; description?: string | null; share_with_members?: boolean; status?: BrandLibraryStatus },
  repo = getBrandLibraryRepository()
) {
  requireCapability(ctx, "F2")
  const errors = validateItemMeta(patch)
  if (Object.keys(errors).length) throw validationFailed(errors)
  const before = await repo.findById(ctx, id)
  if (!before) throw notFound()
  const clean = {
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.description !== undefined ? { description: patch.description?.trim() || null } : {}),
    ...(patch.share_with_members !== undefined ? { share_with_members: patch.share_with_members } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
  }
  if (!(await repo.update(ctx, id, clean))) throw notFound()
  await recordAuditLog(ctx, {
    action: "brand_library.update", entityType: "brand_library_item", entityId: id,
    before: { title: before.title, share_with_members: before.share_with_members, status: before.status }, after: clean,
  })
  return getBrandLibraryItem(ctx, id, repo)
}

/** Cửa hàng thành viên: tài nguyên chuỗi đã chia sẻ (chỉ đọc). Không thuộc chuỗi → null. */
export async function listChainBrandLibrary(ctx: TenantContext, repo = getBrandLibraryRepository()) {
  requireCapability(ctx, "F1")
  const chain = await repo.chainOf(ctx.organizationId)
  if (!chain) return null
  return { chain_name: chain.chainName, items: await Promise.all((await repo.listSharedBy(chain.chainOrgId)).map(itemView)) }
}
