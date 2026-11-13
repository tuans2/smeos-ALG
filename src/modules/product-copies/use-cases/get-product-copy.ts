import { AppError } from "@/core/http/errors";
import { requireCapability } from "@/core/rbac/capabilities";
import type { IProductCopyRepository } from "../domain/repositories/product-copy-repository.interface";
import { getProductCopyRepository } from "../infra/product-copy-repository";
import type { TenantContext } from "@/core/tenancy";

/**
 * Đọc một dữ liệu bán hàng — H5. RS-8 18/09: trước đợt soát, hai điểm đọc
 * (đơn + danh sách) không gác quyền nào; dùng lại H5 vì dải H không có mã
 * đọc riêng và mọi vai trò giữ H6 (duyệt) đều đã có H5 theo mặc định.
 */
export async function getProductCopy(
  ctx: TenantContext,
  id: string,
  repo: IProductCopyRepository = getProductCopyRepository()
) {
  requireCapability(ctx, "H5");
  const copy = await repo.findById(ctx, id);
  if (!copy) throw new AppError("NOT_FOUND", "Không tìm thấy dữ liệu bán hàng");
  return copy;
}

export async function listProductCopies(
  ctx: TenantContext,
  productId?: string,
  repo: IProductCopyRepository = getProductCopyRepository()
) {
  requireCapability(ctx, "H5");
  if (productId) {
    return repo.listByProduct(ctx, productId);
  }
  return repo.listPendingApproval(ctx);
}