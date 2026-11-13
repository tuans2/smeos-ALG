import { conflict, notFound } from "@/core/http/errors"
import { BrochureOrderRepository, getBrochureOrderRepository } from "../infra/brochure-order-repository"
import { PhotoApprovalRepository, getPhotoApprovalRepository } from "../infra/photo-approval-repository"
import { isBrochureOwner } from "./brochure-owner"

/**
 * Khách xác nhận ảnh thành phẩm (Spec #3). Chỉ chủ phiên của đúng link đã đặt đơn này được
 * xác nhận — sai mã, sai link hay không phải chủ phiên đều trả 404 (không lộ đơn tồn tại).
 */
export async function approveBrochurePhoto(request: Request, code: string, sendCode: string | null) {
  if (!sendCode || !isBrochureOwner(request, sendCode)) throw notFound()

  const order = await getBrochureOrderRepository().getTrackingOrderByCode(code)
  if (!order || !order.greeting_sessions.some((s) => s.send_code === sendCode)) throw notFound()
  if (order.status === "CANCELLED") throw conflict("Đơn hàng đã bị hủy")
  if (!order.qc_records.some((qc) => qc.notes === "PRODUCT_PHOTO_UPLOADED")) {
    throw conflict("Cửa hàng chưa gửi ảnh sản phẩm để xác nhận")
  }

  return getPhotoApprovalRepository().recordApproval(order)
}
