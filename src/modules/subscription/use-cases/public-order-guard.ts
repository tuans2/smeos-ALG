import { AppError } from "@/core/http/errors"
import { lifecycleAccess } from "@/modules/organization/domain/organization-lifecycle"
import { lifecycleStatusOf } from "@/modules/organization/infra/organization-lifecycle-repository"
import { checkSubscription } from "./subscription-guard"

/** Câu khách thấy — không nhắc tới thuê bao, hoá đơn hay trạng thái tài khoản của cửa hàng. */
export const PUBLIC_ORDERS_PAUSED_MESSAGE = "Cửa hàng đang tạm ngưng nhận đơn trực tuyến. Vui lòng liên hệ trực tiếp cửa hàng để đặt hàng."

/**
 * Đơn đặt qua link công khai (Thẻ Chào, catalog, landing):
 * - tổ chức tạm ngưng / đang rời nền tảng / đã đóng → không tạo đơn (audit User Journey UJ-26, PO 12/11/2026 UQ13 —
 *   trước đây khách vẫn đặt và chuyển tiền trong khi tiệm không đăng nhập được để thấy đơn);
 * - gói dịch vụ quá hạn thanh toán → không tạo đơn (PO 05/11/2026), cùng quy tắc chỉ xem của phiên nhân viên.
 */
export async function assertAcceptingPublicOrders(
  organizationId: string,
  check: typeof checkSubscription = checkSubscription,
  lifecycle: typeof lifecycleStatusOf = lifecycleStatusOf,
): Promise<void> {
  const status = await lifecycle(organizationId)
  if (status && lifecycleAccess(status) !== "full") throw new AppError("ORGANIZATION_INACTIVE", PUBLIC_ORDERS_PAUSED_MESSAGE)
  const { readOnly } = await check(organizationId)
  if (readOnly) throw new AppError("SUBSCRIPTION_OVERDUE", PUBLIC_ORDERS_PAUSED_MESSAGE)
}
