import { AppError, conflict, notFound } from "@/core/http/errors"
import { LEGAL_HOLD_MESSAGE } from "@/modules/assets/use-cases/delete-asset"
import { assetInUseMessage, type AssetUsage } from "@/modules/assets/domain/asset-lifecycle"
import { findAssetUsages } from "@/modules/assets/infra/asset-usage-guard"
import type { TenantContext } from "@/core/tenancy"
import type { ITrashRepository } from "../domain/repositories/trash-repository.interface"
import type { ILibraryTrashRepository } from "../domain/repositories/library-trash-repository.interface"
import { getTrashRepository } from "../infra/trash-repository"
import { getLibraryTrashRepository } from "../infra/library-trash-repository"
import { isLibraryTrashType, LIBRARY_TRASH_SUBJECT, type LibraryTrashType, type TrashItem, type TrashItemType } from "../domain/trash-types"

const LIBRARY_LEGAL_HOLD_MESSAGE = "Dữ liệu của cửa hàng đang được giữ lại theo yêu cầu pháp lý nên chưa xoá được"

export function requireExecutiveRole(ctx: TenantContext) {
  // G3 (asset.delete) và L4 (product.archive) đều có trần cứng bắt buộc duy nhất là dieu_hanh
  const isExecutive =
    ctx.capabilities.has("G3") ||
    ctx.capabilities.has("L4") ||
    ctx.capabilities.has("A3") ||
    ctx.capabilities.has("B6")

  if (!isExecutive) {
    throw new AppError("CAPABILITY_DENIED", "Chỉ tài khoản có vai trò Điều hành mới có quyền quản lý xóa/khôi phục thùng rác")
  }
}

/**
 * Sản phẩm trong thùng rác đòi đúng `L4` (ngừng kinh doanh, trần cứng
 * `dieu_hanh`). `B6` không có trần cứng nên không đủ để xoá sản phẩm.
 */
function requireProductArchive(ctx: TenantContext, type: TrashItemType) {
  if (type === "PRODUCT" && !ctx.capabilities.has("L4")) {
    throw new AppError("CAPABILITY_DENIED", "Chỉ Điều hành mới được xoá hoặc khôi phục sản phẩm")
  }
}

export async function getTrashList(
  ctx: TenantContext,
  repo: ITrashRepository = getTrashRepository(),
  library: ILibraryTrashRepository = getLibraryTrashRepository()
): Promise<TrashItem[]> {
  requireExecutiveRole(ctx)
  const [items, libraryItems] = await Promise.all([repo.listTrash(ctx), library.list(ctx, new Date())])
  return [...items, ...libraryItems].sort((a, b) => b.trashedAt.localeCompare(a.trashedAt))
}

/** L-4: video/nội dung/catalog/thẻ chào/landing đang được dùng (chiến dịch, kênh) thì không vào thùng rác/không xoá. */
async function assertLibraryNotInUse(ctx: TenantContext, type: LibraryTrashType, id: string, library: ILibraryTrashRepository) {
  const found = await library.findUsages(ctx, type, id)
  if (found.length > 0) throw conflict(assetInUseMessage(found, LIBRARY_TRASH_SUBJECT[type]))
}

type UsageLookup = (ctx: TenantContext, assetId: string) => Promise<AssetUsage[]>

/** SDAGF-012: ảnh đang được dùng (chứng từ, ảnh sản phẩm, logo…) không vào thùng rác/không xoá. */
async function assertNotInUse(ctx: TenantContext, input: { id: string; type: TrashItemType }, repo: ITrashRepository, usages: UsageLookup) {
  const assetId = await repo.findTargetAssetId(ctx, input)
  if (!assetId) return
  const found = await usages(ctx, assetId)
  if (found.length > 0) throw conflict(assetInUseMessage(found))
}

export async function moveToTrash(
  ctx: TenantContext,
  input: { id: string; type: TrashItemType },
  repo: ITrashRepository = getTrashRepository(),
  usages: UsageLookup = findAssetUsages,
  library: ILibraryTrashRepository = getLibraryTrashRepository()
): Promise<void> {
  requireExecutiveRole(ctx)
  if (isLibraryTrashType(input.type)) {
    await assertLibraryNotInUse(ctx, input.type, input.id, library)
    if (!(await library.move(ctx, input.type, input.id))) throw notFound()
    return
  }
  requireProductArchive(ctx, input.type)
  await assertNotInUse(ctx, input, repo, usages)
  const ok = await repo.moveToTrash(ctx, { ...input, userId: ctx.userId })
  if (!ok) throw notFound()
}

export async function restoreFromTrash(
  ctx: TenantContext,
  input: { id: string; type: TrashItemType },
  repo: ITrashRepository = getTrashRepository(),
  library: ILibraryTrashRepository = getLibraryTrashRepository()
): Promise<void> {
  requireExecutiveRole(ctx)
  if (isLibraryTrashType(input.type)) {
    if (!(await library.restore(ctx, input.type, input.id))) throw notFound()
    return
  }
  requireProductArchive(ctx, input.type)
  const ok = await repo.restoreFromTrash(ctx, input)
  if (!ok) throw notFound()
}

export async function permanentDelete(
  ctx: TenantContext,
  input: { id: string; type: TrashItemType },
  repo: ITrashRepository = getTrashRepository(),
  usages: UsageLookup = findAssetUsages,
  library: ILibraryTrashRepository = getLibraryTrashRepository()
): Promise<void> {
  requireExecutiveRole(ctx)
  if (isLibraryTrashType(input.type)) {
    await assertLibraryNotInUse(ctx, input.type, input.id, library)
    const result = await library.permanentDelete(ctx, input.type, input.id, "trash.permanent_delete")
    if (result === "legal_hold") throw conflict(LIBRARY_LEGAL_HOLD_MESSAGE)
    if (result !== "deleted") throw notFound()
    return
  }
  requireProductArchive(ctx, input.type)
  await assertNotInUse(ctx, input, repo, usages)
  const result = await repo.permanentDelete(ctx, input)
  if (result === "legal_hold") throw conflict(LEGAL_HOLD_MESSAGE)
  if (result === "in_use") throw conflict("Mẫu này đã có đơn hàng — chỉ được lưu trữ, không xoá vĩnh viễn.")
  if (result === "not_found") throw notFound()
}

