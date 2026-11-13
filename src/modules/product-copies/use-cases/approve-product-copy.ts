import { AppError } from "@/core/http/errors";
import { requireCapability } from "@/core/rbac/capabilities";
import type { IProductCopyRepository } from "../domain/repositories/product-copy-repository.interface";
import { getProductCopyRepository } from "../infra/product-copy-repository";
import { getOccasionRepository } from "@/modules/organization/infra/occasion-repository";
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log";
import { runInTransaction } from "@/modules/jobs/infra/transaction";
import { scopedWhere } from "@/core/tenancy";
import type { TenantContext } from "@/core/tenancy";
import type { DbClient } from "@/modules/products/infra/db-client";
import type { approval_state } from "../infra/entities";

/**
 * Duyệt product_copy — H6
 * Ghi Product Master + audit_logs trong một giao dịch
 */
export async function approveProductCopy(
  ctx: TenantContext,
  id: string,
  repo: IProductCopyRepository = getProductCopyRepository()
): Promise<{ productId: string; copyId: string }> {
  requireCapability(ctx, "H6");

  return runInTransaction(async (tx: DbClient) => {
    const copy = await tx.product_copies.findFirst({
      where: scopedWhere(ctx, { id }),
    });

    if (!copy) throw new AppError("NOT_FOUND", "Không tìm thấy dữ liệu bán hàng");
    if (copy.approval_state !== "PENDING") {
      throw new AppError("CONFLICT", "Chỉ duyệt được bản ghi đang chờ duyệt");
    }

    const analysis = await tx.product_analyses.findFirst({
      where: scopedWhere(ctx, { id: copy.analysis_id }),
    });
    if (!analysis || analysis.approval_state !== "APPROVED") {
      throw new AppError("CONFLICT", "Phân tích gốc đã không còn trạng thái duyệt");
    }

    // Danh mục dịch của chính tổ chức — dùng để đổi TÊN dịp mà mô hình viết
    // ra thành MÃ dịp mà bộ lọc tra cứu đọc.
    const danhMucDip = await getOccasionRepository(tx).list(ctx);
    const result = await repo.approve(ctx, id, ctx.userId, tx, danhMucDip);

    await recordAuditLog(ctx, {
      action: "product_copy.approve",
      entityType: "product_copy",
      entityId: id,
      before: { approval_state: "PENDING" as approval_state },
      after: {
        approval_state: "APPROVED" as approval_state,
        product_id: result.product.id,
        product_name: result.product.name,
        // Khoá của bước trước (bom, confidence, checklist, san_xuat) còn lại
        // sau khi ghi phần bán hàng — bằng chứng bước này hợp nhất chứ không
        // ghi đè `products.attributes`.
        preserved_attribute_keys: result.preservedAttributeKeys,
      },
    }, tx);

    return { productId: result.product.id, copyId: id };
  });
}

/**
 * Từ chối product_copy — H6
 */
export async function rejectProductCopy(
  ctx: TenantContext,
  id: string,
  reason?: string,
  repo: IProductCopyRepository = getProductCopyRepository()
): Promise<void> {
  requireCapability(ctx, "H6");

  await runInTransaction(async (tx: DbClient) => {
    await repo.reject(ctx, id, tx, reason);

    await recordAuditLog(ctx, {
      action: "product_copy.reject",
      entityType: "product_copy",
      entityId: id,
      before: { approval_state: "PENDING" as approval_state },
      after: { approval_state: "REJECTED" as approval_state, reject_reason: reason ?? null },
    }, tx);
  });
}