/**
 * Xoá hồ sơ cửa hàng khỏi chợ đối tác (PO 03/11/2026) — CHỈ superadmin nền tảng, mã `N18`
 * (tách khỏi `N17` để người đồng bộ/nhập dữ liệu không xoá được). Luôn ghi nhật ký nền tảng.
 *
 * Ảnh đã tải vào kho (`platform/partner-stores/<id>/…`) KHÔNG bị xoá ở đây: hàng đợi xoá
 * tệp (`storage_outbox`) chỉ nhận tệp thuộc một tổ chức, và quy tắc kho cấm gọi xoá tệp
 * trực tiếp. Số ảnh còn lại được ghi vào nhật ký; đối soát kho liệt kê chúng là tệp mồ côi.
 */
import { conflict, notFound, unprocessable } from "@/core/http/errors"
import { MAX_BULK_DELETE_IDS } from "../domain/partner-marketplace-limits"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import type { PlatformContext } from "@/core/platform/platform-context"
import { recordPlatformAuditLog } from "../infra/platform-audit-repository"
import { getPartnerMarketplaceRepository } from "../infra/partner-marketplace-repository"
import type {
  IPartnerMarketplaceRepository,
  MarketplaceDeleteTarget,
} from "../domain/repositories/partner-marketplace-repository.interface"

export const MARKETPLACE_DELETE_CAPABILITY = "N18"

export type DeleteStoreDeps = {
  repo: Pick<IPartnerMarketplaceRepository, "deleteById">
  audit: typeof recordPlatformAuditLog
}

export type BulkDeleteDeps = {
  repo: Pick<IPartnerMarketplaceRepository, "deleteMany">
  audit: typeof recordPlatformAuditLog
}

export async function deleteMarketplaceStore(
  pctx: PlatformContext,
  storeId: string,
  deps: DeleteStoreDeps = { repo: getPartnerMarketplaceRepository(), audit: recordPlatformAuditLog }
): Promise<{ id: string; shopName: string }> {
  requirePlatformCapability(pctx, MARKETPLACE_DELETE_CAPABILITY)
  const removed = await deps.repo.deleteById(storeId)
  if (!removed) throw notFound()
  await deps.audit(pctx, {
    action: "platform.marketplace.store_delete",
    entityType: "partner_marketplace_stores",
    entityId: storeId,
    before: { shopName: removed.shopName, source: removed.source, photoCount: removed.photoKeys.length },
    after: null,
  })
  return { id: storeId, shopName: removed.shopName }
}

export { MAX_BULK_DELETE_IDS }

export type BulkDeleteTarget = MarketplaceDeleteTarget

/**
 * Xoá hàng loạt (PO 03/11/2026): các hồ sơ đã chọn, hoặc toàn bộ chợ đối tác. Xoá toàn bộ
 * phải gửi đúng số hồ sơ đang có — người xem danh sách cũ (vừa có người nhập thêm) bị chặn 409.
 * Cùng quy tắc với xoá một hồ sơ: chỉ `N18`, ảnh trong kho giữ lại, ghi một dòng nhật ký.
 */
export async function deleteMarketplaceStores(
  pctx: PlatformContext,
  target: BulkDeleteTarget,
  deps: BulkDeleteDeps = { repo: getPartnerMarketplaceRepository(), audit: recordPlatformAuditLog }
): Promise<{ deleted: number }> {
  requirePlatformCapability(pctx, MARKETPLACE_DELETE_CAPABILITY)
  if ("ids" in target && (target.ids.length === 0 || target.ids.length > MAX_BULK_DELETE_IDS)) {
    throw unprocessable(`Chọn từ 1 đến ${MAX_BULK_DELETE_IDS} hồ sơ mỗi lần xoá`)
  }
  const result = await deps.repo.deleteMany("ids" in target ? { ids: [...new Set(target.ids)] } : target)
  if (!result) throw conflict("Số hồ sơ đã thay đổi so với lúc xác nhận. Tải lại trang rồi thử lại.")
  await deps.audit(pctx, {
    action: "all" in target ? "platform.marketplace.store_delete_all" : "platform.marketplace.store_bulk_delete",
    entityType: "partner_marketplace_stores",
    entityId: "*",
    before: { count: result.count, photoCount: result.photoCount, shopNames: result.shopNames },
    after: null,
  })
  return { deleted: result.count }
}
