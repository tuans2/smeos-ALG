/**
 * Đơn gia công chuỗi chờ khách duyệt ảnh thành phẩm trước bước giao, theo đúng chế độ tiệm chọn
 * (bỏ qua / tự duyệt sau N phút / bắt buộc khách) — cùng luật với đơn 1 cửa hàng (PO 22/10/2026).
 * Trước đó đơn gia công chỉ đặt mốc thời gian (lấy nhầm số phút nhắc QC), khách không thấy ảnh,
 * và chi nhánh nhập shipper ngay.
 */

import { parsePaymentPolicy } from "../domain/brochure-payment-policy"
import { orderPhotoApproval, photoApprovalDispatchBlocker } from "../domain/photo-approval"
import { SubcontractOrderRepository } from "../infra/subcontract-order-repository"

/** Lý do chặn bước giao (nhập shipper) vì còn chờ khách duyệt ảnh, hoặc `null`. */
export async function subcontractPhotoApprovalBlocker(
  organizationId: string,
  orderId: string,
  repo: Pick<SubcontractOrderRepository, "loadPhotoApprovalFacts"> = new SubcontractOrderRepository(),
  now = new Date()
): Promise<string | null> {
  const order = await repo.loadPhotoApprovalFacts(organizationId, orderId)
  if (!order) return null
  const settings = order.organization.settings
  const approval = orderPhotoApproval(order, settings, parsePaymentPolicy(settings).productPhotoReviewMinutes, now)
  return photoApprovalDispatchBlocker(approval)
}
