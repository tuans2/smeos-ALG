import { conflict } from "@/core/http/errors"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { loadPublicSession } from "./brochure-session-access"
import { linkExpiryFrom, parseLinkLifetimeHours } from "../domain/link-lifetime"
import { resolveEffectiveStepTimeoutPolicy } from "../domain/step-timeout-policy"
import { grantBrochureOwner, type OwnerCookie } from "./brochure-owner"

/**
 * Khách muốn đặt thêm đơn trên cùng link (tặng nhiều người, đặt lại dịp khác).
 * Chuẩn: MỖI ĐƠN MỘT PHIÊN — tạo phiên mới (mã link mới → mã đơn mới) nối với
 * phiên cũ qua sự kiện REORDER, giữ nguyên sale phụ trách và khách. Đơn cũ,
 * QR và trang theo dõi của đơn cũ không bị ảnh hưởng. Bấm đúp vẫn an toàn vì
 * từng phiên chỉ nhận một đơn (chống trùng đã có sẵn).
 */
export async function startAnotherOrder(
  sendCode: string,
  repo = getGreetingCardRepository(),
): Promise<{ sendCode: string; ownerCookie: OwnerCookie }> {
  const session = await loadPublicSession(sendCode, repo)
  if (!session.order_id) throw conflict("Link này chưa có đơn — hãy đặt đơn trên chính link này")

  // Phiên mới có thời hạn mới theo cài đặt của tiệm / bộ sưu tập — không kế thừa hạn (có thể đã qua) của link cũ
  const shop = await repo.getShopProfile(session.organization_id)
  const effectivePolicy = resolveEffectiveStepTimeoutPolicy(shop.settings, session.catalog.filters)
  const expiryHours = effectivePolicy.autoCancelUnopened
    ? effectivePolicy.unopenedExpiryHours
    : parseLinkLifetimeHours(shop.settings)
  const next = await repo.createFollowUpSession({ ...session, expires_at: linkExpiryFrom(expiryHours) })
  await repo.recordJourneyEvent(session.organization_id, next.id, "REORDER", { fromSendCode: session.send_code })
  // Phiên mới thuộc luôn trình duyệt đang là chủ phiên cũ (route đã kiểm)
  const ownerCookie = await grantBrochureOwner({ id: next.id, organization_id: session.organization_id, send_code: next.send_code }, "reorder")
  return { sendCode: next.send_code, ownerCookie }
}
