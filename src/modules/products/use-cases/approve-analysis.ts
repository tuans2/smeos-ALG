import { randomUUID } from "node:crypto"

import { AppError, conflict, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { runInTransaction } from "@/modules/jobs/infra/transaction"
import {
  canApproveAnalysis,
  draftProductName,
  extractProductFieldsFromAnalysis,
  resolveEffectiveAnalysis,
} from "@/modules/products/domain/product-analysis-rules"
import { ProductAnalysisRepository, getProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { draftProductCode } from "@/modules/products/domain/product-code"
import { ProductRepository, getProductRepository } from "@/modules/products/infra/product-repository"

import { getAnalysis, type AnalysisDetail } from "./get-analysis"

/**
 * `POST /vision/analyses/:id/approve` (`H3`, đặc tả 06 mục 8). Ba việc
 * trong MỘT giao dịch — cùng khuôn `enqueueJob` (đặc tả 05 mục 6):
 *
 *   ghi Product Master → chuyển approval_state sang APPROVED → audit_logs
 *
 * Đây là endpoint duyệt ĐẦU TIÊN của toàn hệ thống gọi `recordAuditLog`
 * (`AGENTS.md` bản đồ, `AuditLogRepository`: "endpoint duyệt đầu tiên gọi
 * record() là POST /vision/analyses/:id/approve, H3, P5") — đóng nợ đã ghi ở
 * `Checklist_Thuc_Thi.md` P3, mục `audit_logs`.
 *
 * `product_id` null lúc tạo lượt phân tích (đặc tả 06 mục 8 cho phép) nghĩa
 * là chưa gắn sản phẩm nào — hàm này TẠO MỚI `products` trong trường hợp đó
 * thay vì đòi người dùng tạo sản phẩm trước. Đây là một quyết định sản phẩm
 * chưa có căn cứ tường minh trong đặc tả, ghi ở `TECHNICAL_DEBT.md` để chủ
 * sản phẩm xác nhận.
 */
export type ApproveAnalysisOptions = {
  createProduct?: boolean | undefined
}

export async function approveAnalysis(
  ctx: TenantContext,
  id: string,
  options: ApproveAnalysisOptions = {}
): Promise<AnalysisDetail> {
  const { createProduct = true } = options
  const analysisRepo = getProductAnalysisRepository()
  const current = await analysisRepo.findById(ctx, id)
  if (!current) throw notFound()
  if (!canApproveAnalysis(current.approval_state)) {
    throw conflict("Đã duyệt, không duyệt lại được")
  }

  const effective = resolveEffectiveAnalysis(
    current.raw as Record<string, unknown>,
    current.edited as Record<string, unknown> | null
  )
  const fields = extractProductFieldsFromAnalysis(effective)

  await runInTransaction(async (tx) => {
    const productRepo = getProductRepository(tx)
    const analysisRepoTx = getProductAnalysisRepository(tx)

    let productId = current.product_id
    if (createProduct) {
      if (productId) {
        const updated = await productRepo.updateIdentity(ctx, productId, fields)
        if (!updated) throw new AppError("INTERNAL", "Sản phẩm liên kết không còn tồn tại")
        if (current.asset_id && productRepo.linkMainImage) {
          await productRepo.linkMainImage(ctx, productId, current.asset_id)
        }
      } else {
        const created = await productRepo.create(ctx, {
          code: draftProductCode(randomUUID()),
          name: draftProductName(fields),
          category: fields.category,
          shape: fields.shape,
          facing: fields.facing,
          container: fields.container,
          attributes: fields.attributes,
          imageAssetId: current.asset_id ?? undefined,
        })
        productId = created.id
      }
    }

    const approved = await analysisRepoTx.approve(ctx, id, productId, {
      approvedBy: ctx.userId,
      approvedAt: new Date(),
    })
    if (!approved) throw conflict("Bản ghi vừa đổi trạng thái, thử lại")

    await recordAuditLog(
      ctx,
      {
        action: "product.approve",
        entityType: "product_analyses",
        entityId: id,
        before: { approval_state: current.approval_state, product_id: current.product_id },
        after: { approval_state: "APPROVED", product_id: productId },
      },
      tx
    )
  })

  return getAnalysis(ctx, id)
}
