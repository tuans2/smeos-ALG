import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { orderPhotoApproval } from "../domain/photo-approval"
import { parsePaymentPolicy } from "../domain/brochure-payment-policy"
import { getBrochureOrderRepository } from "../infra/brochure-order-repository"
import { getPhotoApprovalRepository } from "../infra/photo-approval-repository"
import { isBrochureOwner } from "./brochure-owner"
import { queueStaffNotification } from "./notify-staff"

/**
 * Khách góp ý ảnh thành phẩm thay vì đồng ý (checklist ALG 5.13). Chỉ chủ phiên của đúng link đã đặt đơn,
 * khác → 404. Chỉ trong lúc đang chờ duyệt (`PENDING`): đã đồng ý, đã quá giờ tự duyệt, đã góp ý chờ ảnh mới
 * hay đơn huỷ → 409. Góp ý dừng đồng hồ tự duyệt và chặn giao tới khi cửa hàng gửi lại ảnh.
 */
export async function sendBrochurePhotoFeedback(request: Request, code: string, sendCode: string | null, message: string) {
  if (!sendCode || !isBrochureOwner(request, sendCode)) throw notFound()
  const text = message.trim()
  if (text.length < 3) throw validationFailed({ message: "Nhập góp ý (ít nhất 3 ký tự)" })

  const order = await getBrochureOrderRepository().getTrackingOrderByCode(code)
  if (!order || !order.greeting_sessions.some((s) => s.send_code === sendCode)) throw notFound()
  if (order.status === "CANCELLED") throw conflict("Đơn hàng đã bị hủy")

  const settings = order.organization?.settings
  const approval = orderPhotoApproval(order, settings, parsePaymentPolicy(settings).productPhotoReviewMinutes, new Date())
  if (approval.status === "FEEDBACK") throw conflict("Bạn đã gửi góp ý — cửa hàng sẽ gửi lại ảnh sau khi chỉnh")
  if (approval.status !== "PENDING") throw conflict("Ảnh thành phẩm không còn chờ bạn duyệt")

  await getPhotoApprovalRepository().recordFeedback(order, text)
  queueStaffNotification(order.organization_id, "PHOTO_FEEDBACK", {
    orderId: order.id,
    orderCode: order.code,
    customerName: (order.delivery_address as { recipientName?: string } | null)?.recipientName || "Khách hàng",
    customerPhone: order.customer?.phone ?? null,
    reason: text,
    assignedSaleId: order.greeting_sessions[0]?.sale_id ?? null,
  })
  return { status: "FEEDBACK" as const }
}
