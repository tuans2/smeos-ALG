/**
 * admin-confirm-brochure-order.ts
 *
 * Gate 1b — Điều hành xác nhận đơn hàng (dành cho mô hình 1 Cửa hàng).
 *
 * Thứ tự bắt buộc:
 *   ① adminConfirmBrochurePayment (Gate 1) — xác nhận đã nhận tiền cọc/đủ
 *   ② adminConfirmBrochureOrder   (Gate 1b) — xác nhận cửa hàng thực hiện được đơn
 *
 * Với mô hình Chuỗi (requireCoordinatorAcceptance = true):
 *   Gate 1b tương đương được thực hiện bởi Điều phối qua coordinatorAcceptBrochureOrder.
 *
 * Sau khi xác nhận đơn:
 *   - productionStatus: WAITING → ASSIGNED
 *   - ⏱️ SLA bắt đầu chạy
 *   - Thông báo khách: "Đơn đã được tiếp nhận — đang chuẩn bị sản phẩm 🌸"
 *
 * Khi từ chối đơn:
 *   - Tạo đề xuất huỷ + hoàn tiền toàn phần (chờ duyệt)
 *   - Khách nhận tin huỷ khi đề xuất được duyệt
 */

import type { TenantContext } from "@/core/tenancy"
import { conflict, notFound } from "@/core/http/errors"
import { BrochureOrderRepository } from "../infra/brochure-order-repository"
import { GreetingCardRepository } from "../infra/greeting-card-repository"
import { CancellationRepository } from "../infra/cancellation-repository"
import { parseBrochureWorkflowPolicy } from "../domain/brochure-workflow-policy"
import { queueOrderNotification } from "./notify-customer"
import { queueStaffNotification } from "./notify-staff"

// ─── Confirm ────────────────────────────────────────────────────────────────

/**
 * Điều hành xác nhận đơn có thể thực thi (Gate 1b).
 *
 * Điều kiện:
 *  - Mô hình 1 Cửa hàng (requireCoordinatorAcceptance = false)
 *  - Đơn đã CONFIRMED (tiền đã được xác nhận ở Gate 1)
 *  - productionStatus đang là WAITING
 *  - Đơn chưa bị huỷ / chưa giao xong
 */
export async function adminConfirmBrochureOrder(
  ctx: TenantContext,
  orderId: string,
  input: { note?: string | undefined } = {},
  orders = new BrochureOrderRepository(),
  shops = new GreetingCardRepository(),
  cancellations = new CancellationRepository()
) {
  const [order, shop] = await Promise.all([
    orders.findBrochureOrder(ctx, orderId),
    shops.getShopProfile(ctx.organizationId),
  ])
  if (!order) throw notFound()

  const workflow = parseBrochureWorkflowPolicy(shop.settings, shop.type)
  if (workflow.requireCoordinatorAcceptance) {
    throw conflict(
      "Mô hình Chuỗi: Điều phối xác nhận nhận đơn (không phải Điều hành). Dùng nút Nhận đơn ở màn Điều phối."
    )
  }

  if (order.status === "CANCELLED") throw conflict("Đơn hàng đã huỷ")
  if (order.status === "COMPLETED" || order.delivery_status === "DELIVERED") {
    throw conflict("Đơn hàng đã giao xong")
  }
  if (order.status === "DRAFT") {
    throw conflict("Điều hành chưa xác nhận tiền — hãy xác nhận tiền trước khi xác nhận đơn")
  }
  if (
    order.production_status === "ASSIGNED" ||
    order.production_status === "ARRANGING" ||
    order.production_status === "READY"
  ) {
    throw conflict("Đơn đã được xác nhận và đang trong sản xuất")
  }
  if (order.production_status !== "WAITING") {
    throw conflict("Đơn chưa ở trạng thái chờ xác nhận")
  }
  // Đơn đang có đề xuất huỷ chờ duyệt: xử lý đề xuất trước — không vừa nhận vừa huỷ (rà soát cụm G)
  if (await hasPendingCancellation(ctx, orderId, cancellations)) {
    throw conflict("Đơn đang có đề xuất huỷ chờ duyệt. Duyệt hoặc từ chối đề xuất trước khi xác nhận đơn.")
  }

  const noteText = input.note?.trim() || "Điều hành xác nhận đơn — cửa hàng tiếp nhận và bắt đầu sản xuất"

  await orders.applyProgress(ctx, order, {
    eventType: "ADMIN_CONFIRMED_ORDER",
    productionStatus: "ASSIGNED",
    noteAppend: `[Điều hành xác nhận đơn] ${noteText}`,
  })

  // Thông báo khách: "Đơn đã được tiếp nhận — đang chuẩn bị sản phẩm 🌸"
  queueOrderNotification(ctx.organizationId, orderId, "ORDER_ACCEPTED")
  queueStaffNotification(ctx.organizationId, "ORDER_ACCEPTED", {
    orderId,
    orderCode: order.code,
    amountVnd: Number(order.total_vnd),
    assignedSaleId: order.greeting_sessions?.[0]?.sale_id ?? null,
  })

  return {
    success: true,
    orderId,
    orderCode: order.code,
    productionStatus: "ASSIGNED" as const,
    message: "Đơn đã được xác nhận — đang chuẩn bị sản phẩm",
  }
}

// ─── Reject ────────────────────────────────────────────────────────────────

/**
 * Điều hành từ chối đơn (Gate 1b — không thể thực thi).
 *
 * Hệ quả:
 *  - Tạo đề xuất huỷ + hoàn tiền toàn phần (nếu có cọc), chờ duyệt
 *  - Báo nhân viên liên quan; khách nhận tin khi đề xuất được duyệt
 *
 * Điều kiện giống adminConfirmBrochureOrder nhưng cho phép CONFIRMED hoặc DRAFT
 * khi đã có tiền (trường hợp hiếm: xác nhận tiền và từ chối đơn ngay).
 */
export async function adminRejectBrochureOrder(
  ctx: TenantContext,
  orderId: string,
  input: { reason: string },
  orders = new BrochureOrderRepository(),
  shops = new GreetingCardRepository(),
  cancellations = new CancellationRepository()
) {
  const [order, shop] = await Promise.all([
    orders.findBrochureOrder(ctx, orderId),
    shops.getShopProfile(ctx.organizationId),
  ])
  if (!order) throw notFound()

  const workflow = parseBrochureWorkflowPolicy(shop.settings, shop.type)
  if (workflow.requireCoordinatorAcceptance) {
    throw conflict(
      "Mô hình Chuỗi: Điều phối mới có quyền từ chối nhận đơn. Dùng nút Từ chối ở màn Điều phối."
    )
  }

  if (order.status === "CANCELLED") throw conflict("Đơn hàng đã huỷ trước đó")
  if (order.status === "COMPLETED" || order.delivery_status === "DELIVERED") {
    throw conflict("Đơn hàng đã giao xong, không thể từ chối")
  }
  if (
    order.production_status === "ARRANGING" ||
    order.production_status === "READY"
  ) {
    throw conflict("Đơn đã vào sản xuất — không thể từ chối ở giai đoạn này")
  }
  if (await hasPendingCancellation(ctx, orderId, cancellations)) {
    throw conflict("Đơn này đã có đề xuất huỷ đang chờ xử lý")
  }

  const reasonText = input.reason.trim()
  const paid = Number(order.paid_vnd)

  const result = await cancellations.createProposal(ctx, {
    orderId,
    senderRole: "ADMIN",
    proposal: {
      type: paid > 0 ? "FULL_REFUND" : "CANCEL_ONLY",
      reason: `[Điều hành từ chối đơn] ${reasonText}`,
      refundAmountVnd: paid,
      note: "Điều hành xác định cửa hàng không thể thực hiện đơn hàng theo yêu cầu.",
    },
  })

  // Khách chỉ nhận tin "đã huỷ" khi đề xuất được duyệt (cancellation-requests/[id]/decision) — trước
  // 22/10/2026 gửi ngay lúc tạo đề xuất, đơn chưa huỷ và khách nhận tin hai lần (rà soát cụm G)
  queueStaffNotification(ctx.organizationId, "CANCELLATION_REQUESTED", {
    orderId,
    orderCode: order.code,
    amountVnd: Number(order.total_vnd),
    reason: `[Điều hành từ chối đơn] ${reasonText}`,
    assignedSaleId: order.greeting_sessions?.[0]?.sale_id ?? null,
  })

  return {
    success: true,
    message: paid > 0
      ? "Đã tạo đề xuất huỷ đơn và hoàn tiền. Duyệt đề xuất trong mục Yêu cầu huỷ để huỷ đơn và báo khách."
      : "Đã tạo đề xuất huỷ đơn. Duyệt đề xuất trong mục Yêu cầu huỷ để huỷ đơn và báo khách.",
    proposalId: result.id,
  }
}

async function hasPendingCancellation(ctx: TenantContext, orderId: string, cancellations: Pick<CancellationRepository, "listPending">) {
  return (await cancellations.listPending(ctx)).some((r) => r.order_id === orderId)
}
