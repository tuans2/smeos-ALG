import { AppError } from "@/core/http/errors";
import { requireCapability } from "@/core/rbac/capabilities";
import type { IProductCopyRepository } from "../domain/repositories/product-copy-repository.interface";
import { getProductCopyRepository } from "../infra/product-copy-repository";
import { validateProductCopyEdited, type ProductCopyEdited } from "../domain/product-copy-rules";
import { assertFlowerContentAllowed } from "@/core/ai/domain/flower-content-guard";
import type { TenantContext } from "@/core/tenancy";

/**
 * Cập nhật edited (người sửa trước khi duyệt) — H5
 * Chỉ cho phép khi approval_state = PENDING
 */
export async function updateProductCopy(
  ctx: TenantContext,
  id: string,
  edited: unknown,
  repo: IProductCopyRepository = getProductCopyRepository()
): Promise<void> {
  requireCapability(ctx, "H5");

  if (!validateProductCopyEdited(edited)) {
    throw new AppError("VALIDATION_FAILED", "Dữ liệu sửa không hợp lệ");
  }

  const d = edited as ProductCopyEdited;
  if (d.suggested_name) {
    assertFlowerContentAllowed(d.suggested_name, "Tên sản phẩm");
  }
  if (d.suggested_description) {
    assertFlowerContentAllowed(d.suggested_description, "Mô tả sản phẩm");
  }

  await repo.updateEdited(ctx, id, edited as object);
}