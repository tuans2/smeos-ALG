import type { TenantContext } from "@/core/tenancy"
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { coordinatorActionBlocker, type CoordinatorAction } from "../domain/brochure-commerce-rules"
import { paymentGateBlocker, parsePaymentPolicy } from "../domain/brochure-payment-policy"
import { canBypassDeliveryPhoto, canBypassFinishedPhoto, parseBrochureWorkflowPolicy } from "../domain/brochure-workflow-policy"
import { mediaSelectionError } from "../domain/media-limits"
import { orderPhotoApproval, photoApprovalDispatchBlocker } from "../domain/photo-approval"
import type { BrochureOrderRepository } from "../infra/brochure-order-repository"
import { GreetingCardRepository } from "../infra/greeting-card-repository"

/**
 * Chốt chung cho tác vụ xưởng đơn Thẻ chào (đúng bước, cổng tiền, chờ khách duyệt ảnh, bỏ qua ảnh,
 * ảnh thuộc tổ chức). Tách khỏi `update-brochure-order-status.ts` để tệp đó dưới ngưỡng 350 dòng.
 */

/** Đơn của tổ chức + kiểm đúng thứ tự tác vụ xưởng (409 nếu sai bước). */
export async function loadForAction(
  ctx: TenantContext,
  orderId: string,
  action: CoordinatorAction,
  repo: BrochureOrderRepository
) {
  const order = await repo.findBrochureOrder(ctx, orderId)
  if (!order) throw notFound()
  // Chính sách thu tiền và kiểm định ảnh của tiệm
  const shop = await new GreetingCardRepository().getShopProfile(ctx.organizationId)
  const policy = parsePaymentPolicy(shop.settings)
  const blocker = coordinatorActionBlocker(
    action,
    {
      status: order.status,
      productionStatus: order.production_status,
      deliveryStatus: order.delivery_status,
    },
    { skipPhoto: policy.requireProductPhotoQC === false }
  )
  if (blocker) throw conflict(blocker)
  const moneyBlocker = paymentGateBlocker(action, policy, {
    totalVnd: Number(order.total_vnd),
    paidVnd: Number(order.paid_vnd),
  })
  if (moneyBlocker) throw conflict(moneyBlocker)
  if (action === "dispatch-shipping") {
    const approval = orderPhotoApproval(order, shop.settings, policy.productPhotoReviewMinutes, new Date())
    const waiting = photoApprovalDispatchBlocker(approval)
    if (waiting) throw conflict(waiting)
  }
  return order
}

/** Gói Nghiêm ngặt bắt buộc ảnh — gọi thẳng API bỏ qua ảnh cũng bị chặn (PO 15/10/2026). */
export async function assertSkipAllowed(ctx: TenantContext, kind: "product" | "recipient") {
  const workflow = parseBrochureWorkflowPolicy((await new GreetingCardRepository().getShopProfile(ctx.organizationId)).settings)
  const allowed = kind === "product" ? canBypassFinishedPhoto(workflow) : canBypassDeliveryPhoto(workflow)
  if (!allowed) throw conflict(kind === "product" ? "Tiệm bắt buộc ảnh thành phẩm — không bỏ qua được" : "Tiệm bắt buộc ảnh bàn giao — không bỏ qua được")
}

/** Đầu vào ảnh: `assetIds` (1–5 ảnh + 0–2 video) hoặc `assetId` (client cũ, một ảnh), hoặc bỏ qua nếu giao gấp. */
export type PhotoInput = {
  assetId?: string | undefined
  assetIds?: string[] | undefined
  skipPhoto?: boolean | undefined
  skipReason?: string | undefined
}

/**
 * Mọi asset phải thuộc đúng tổ chức (khác → 404) và bộ tệp đúng giới hạn ảnh/video.
 * Thời lượng video do trình duyệt kiểm; máy chủ kiểm loại, số lượng, dung lượng.
 */
export async function ownedMediaIds(ctx: TenantContext, input: PhotoInput, repo: BrochureOrderRepository): Promise<string[]> {
  const ids = [...new Set(input.assetIds ?? (input.assetId ? [input.assetId] : []))]
  if (ids.length === 0) throw validationFailed({ assetIds: "Cần ít nhất 1 ảnh" })
  const meta = await repo.ownedAssetsMeta(ctx, ids)
  if (meta.length !== ids.length) throw notFound()
  const error = mediaSelectionError(meta.map((m) => ({ mimeType: m.mime_type, sizeBytes: m.file_size })))
  if (error) throw validationFailed({ assetIds: error })
  return ids
}
