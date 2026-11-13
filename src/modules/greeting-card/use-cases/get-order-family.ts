import { notFound } from "@/core/http/errors"
import { validateSendCode, linkAvailability } from "../domain/greeting-card-rules"
import type { FamilyMember } from "../domain/order-family"
import { OrderFamilyRepository, getOrderFamilyRepository } from "../infra/order-family-repository"
import { SessionOwnerRepository, getSessionOwnerRepository } from "../infra/session-owner-repository"

/**
 * Nhóm đơn của khách trên link `sendCode` (phiên gốc + các lần "Đặt thêm đơn") — cho trang khách tự về
 * đúng đơn đang làm dở và hiện "Lịch sử đơn hàng". Chỉ trả thông tin khách tự nhập/được xem trên trang
 * đơn (mã đơn, mẫu, ngày giao, trạng thái, số tiền) — không SĐT, không địa chỉ. Route gác chủ phiên.
 */
export async function getOrderFamily(
  sendCode: string,
  sessions = getSessionOwnerRepository(),
  families = getOrderFamilyRepository(),
): Promise<{ rootSendCode: string; members: FamilyMember[] }> {
  if (!validateSendCode(sendCode)) throw notFound()
  const session = await sessions.findSession(sendCode)
  if (!session) throw notFound()
  const { rootSendCode, rows } = await families.familyOf(session.organization_id, session)
  const now = new Date()
  return {
    rootSendCode,
    members: rows.map((r) => {
      const snapshot = r.product_snapshot as { name?: unknown } | null
      const window = r.order?.delivery_window as { date?: unknown } | null | undefined
      return {
        sendCode: r.send_code,
        createdAt: r.created_at.toISOString(),
        available: linkAvailability({ expiresAt: r.expires_at, revokedAt: r.revoked_at, hasOrder: r.order !== null }, now) === "ACTIVE",
        productName: typeof snapshot?.name === "string" ? snapshot.name : null,
        order: r.order
          ? {
              code: r.order.code,
              status: r.order.status,
              deliveryStatus: r.order.delivery_status,
              totalVnd: Number(r.order.total_vnd),
              paidVnd: Number(r.order.paid_vnd),
              deliveryDate: typeof window?.date === "string" ? window.date : null,
            }
          : null,
      }
    }),
  }
}
