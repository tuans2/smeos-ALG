/**
 * Use-case: Create Order (Tạo đơn hàng mới — M10, R2).
 */

import { AppError, validationFailed } from "@/core/http/errors"
import { branchScopeOf } from "@/core/tenancy"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { calculateOrderTotal, calculateOrderTotalWithAdjustments, generateOrderCode } from "../domain/order-rules"
import { newOrderDeliveryErrors } from "../domain/order-input-rules"
import type { CreateOrderInput, OrderRecord } from "../domain/order-types"
import type { IOrderRepository } from "../domain/repositories/order-repository.interface"
import { getOrderRepository } from "../infra/order-repository"
import { findForeignOrderReferences } from "../infra/order-reference-guard"
import { assertWithinPriceBounds } from "@/modules/costing/use-cases/price-floor-guard"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"

export async function createOrder(
  ctx: TenantContext,
  input: CreateOrderInput,
  repo: IOrderRepository = getOrderRepository(),
  notify: typeof notifyOrganization = notifyOrganization,
  findForeign: typeof findForeignOrderReferences = findForeignOrderReferences,
  floorGuard: typeof assertWithinPriceBounds = assertWithinPriceBounds,
  audit: typeof recordAuditLog = recordAuditLog
): Promise<OrderRecord> {
  if (!input.items || input.items.length === 0) {
    throw new AppError("VALIDATION_FAILED", "Đơn hàng phải có ít nhất một sản phẩm hoặc sản phẩm.")
  }

  // Đơn sàn: sàn thường che một phần SĐT người nhận → không kiểm định dạng (audit BL-34, PO 12/11/2026)
  const recipientPhone = input.source === "CHANNEL" ? undefined : input.deliveryAddress?.phone
  const deliveryErrors = newOrderDeliveryErrors({ deliveryDate: input.deliveryWindow?.date, recipientPhone })
  if (Object.keys(deliveryErrors).length > 0) {
    throw validationFailed({
      ...(deliveryErrors.deliveryDate ? { "deliveryWindow.date": deliveryErrors.deliveryDate } : {}),
      ...(deliveryErrors.recipientPhone ? { "deliveryAddress.phone": deliveryErrors.recipientPhone } : {}),
    })
  }

  // Ưu đãi + phí giao cấp đơn (đơn chuyển từ báo giá) — trước đây bị bỏ, tổng đơn lệch báo giá (UJ-08)
  const totalVnd = calculateOrderTotalWithAdjustments(input.items, input.adjustments)
  if (totalVnd < 0) {
    throw new AppError("VALIDATION_FAILED", "Tổng tiền đơn hàng không thể là số âm.")
  }

  // Nhân viên chi nhánh tạo đơn → đơn thuộc chi nhánh đó, không chọn chi nhánh khác (checklist ALG 9.13)
  const scope = branchScopeOf(ctx)
  const scopedInput = scope ? { ...input, branchId: scope } : input
  // Khách / chi nhánh / sản phẩm của tổ chức khác → như không tồn tại (404, không 403)
  const foreign = await findForeign(ctx, {
    customerId: scopedInput.customerId,
    // Chi nhánh lấy từ phiên (nhân viên chi nhánh) là tin được; chỉ kiểm chi nhánh client gửi lên
    branchId: scope ? undefined : input.branchId,
    productIds: scopedInput.items.map((it) => it.productId),
    variantIds: scopedInput.items.map((it) => it.variantId),
  })
  if (foreign.length > 0) throw new AppError("NOT_FOUND", "Không tìm thấy khách hàng, chi nhánh hoặc sản phẩm đã chọn.")
  // Giá nhân viên tự gõ cũng phải qua sàn như báo giá (audit BL-07) — trước đây báo giá bị chặn mà tạo đơn cùng giá thì lọt
  if (input.source === "MANUAL") {
    const productLines = input.items.filter((it) => it.productId)
    const productTotal = calculateOrderTotal(productLines)
    // Giá 0 = nháp chờ báo giá; bước báo giá (`quote-order.ts`) kiểm sàn
    // Sàn (C10) và trần (C9, PO 07/11/2026 Q3) so với tiền của chính các dòng có sản phẩm
    if (productTotal > 0) await floorGuard(ctx, productLines.map((it) => ({ productId: it.productId, quantity: Math.max(1, Math.floor(it.quantity)) })), productTotal, productTotal)
  }
  const countToday = await repo.countTodayOrders(ctx.organizationId)
  const order = await createWithFreshCode(ctx, repo, countToday, scopedInput, totalVnd)
  await audit(ctx, {
    action: "order.create",
    entityType: "orders",
    entityId: order.id,
    after: { code: order.code, totalVnd, source: input.source ?? "MANUAL" },
  })
  // Không chờ: thông báo chậm/lỗi không được làm chậm hay hỏng việc tạo đơn
  void notify({
    organizationId: ctx.organizationId,
    eventKey: "ORDER_RECEIVED",
    ownerUserId: ctx.userId,
    message: `Đơn ${order.code} vừa được tạo.`,
    deepLink: "/don-hang",
  })
  return order
}

/** Số lần thử sinh mã khi trùng — vòng lặp có giới hạn. */
export const ORDER_CODE_ATTEMPTS = 3

/**
 * Hai đơn tạo cùng lúc đọc cùng `countToday` → cùng mã → trùng khoá `(organization_id, code)`. Trước đây trả 500;
 * nay thử số kế tiếp, tối đa `ORDER_CODE_ATTEMPTS` lần (audit BL-10, cùng cách với tạo đơn Điều phối).
 */
async function createWithFreshCode(
  ctx: TenantContext,
  repo: IOrderRepository,
  countToday: number,
  input: CreateOrderInput,
  totalVnd: number
): Promise<OrderRecord> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await repo.create(ctx.organizationId, generateOrderCode(countToday + 1 + attempt), input, totalVnd, ctx.userId)
    } catch (error: unknown) {
      if (!isUniqueViolation(error) || attempt + 1 >= ORDER_CODE_ATTEMPTS) {
        if (isUniqueViolation(error)) throw new AppError("CONFLICT", "Đang có nhiều đơn tạo cùng lúc — vui lòng thử lại.")
        throw error
      }
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
}
