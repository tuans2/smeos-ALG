import { createHmac, randomUUID } from "node:crypto"
import { withDb } from "./a11y-journeys.helpers"

/**
 * Đơn gia công đang mở lời mời cho một chi nhánh, để kiểm trang công khai `/subcontract/[orderCode]`
 * ở trạng thái có dữ liệu. Tạo thẳng trong database test (như `approveAndLogin`): luồng thật cần
 * chuỗi tổ chức, chi nhánh và điều phối nhiều bước.
 *
 * Token chi nhánh ký đúng thuật toán của `src/modules/greeting-card/infra/subcontract-link-token.ts`
 * với `SESSION_SECRET` của server đang chạy (CI đặt biến này cho cả job e2e-ux).
 */
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000

function branchToken(secret: string, organizationId: string, orderCode: string, branchId: string): string {
  const expiresAtMs = Date.now() + TOKEN_TTL_MS
  const sig = createHmac("sha256", secret)
    .update(`subcontract-branch:${organizationId}:${orderCode.toUpperCase()}:${branchId}:${expiresAtMs}`)
    .digest("hex")
  return `${organizationId}.${expiresAtMs.toString(36)}.${sig}`
}

/** Đường dẫn trang chi nhánh nhận lời mời; `null` khi không có `SESSION_SECRET` để ký token. */
export async function seedSubcontractInvite(organizationId: string, userId: string): Promise<string | null> {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  const orderId = randomUUID()
  const orderCode = `DH-A11Y-${Date.now().toString(36).toUpperCase()}`
  const branchId = `a11y-branch-${randomUUID().slice(0, 8)}`
  const now = new Date()
  const dispatch = {
    orderId,
    orderCode,
    dispatchStatus: "OPEN",
    currentRound: 1,
    claimedBranchId: null,
    claimedAt: null,
    graceExpiresAt: null,
    declinedBranchIds: [],
    invitedBranchIds: [branchId],
    roundExpiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
  }
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO orders (id, organization_id, code, total_vnd, balance_vnd, created_by, updated_at, delivery_address, delivery_window, card_message)
       VALUES ($1, $2, $3, 450000, 450000, $4, now(), $5, $6, $7)`,
      [
        orderId,
        organizationId,
        orderCode,
        userId,
        JSON.stringify({ street: "12 Lê Lợi", ward: "Bến Nghé", district: "Quận 1", province: "TP. Hồ Chí Minh" }),
        JSON.stringify({ date: "2026-11-20", timeSlot: "09:00 - 11:00" }),
        "Chúc mừng khai trương",
      ],
    )
    await db.query(
      `INSERT INTO order_coordinations (id, organization_id, order_id, updated_at, metadata) VALUES ($1, $2, $3, now(), $4)`,
      [randomUUID(), organizationId, orderId, JSON.stringify({ subcontract_dispatch: dispatch })],
    )
    // Quyền xem đơn của chi nhánh được mời (ADR-014 P-4) — luồng thật cấp trong `updateSubcontractState`
    await db.query(
      `INSERT INTO shared_order_access (id, organization_id, order_id, branch_key, level, updated_at) VALUES ($1, $2, $3, $4, 'INVITED', now())`,
      [randomUUID(), organizationId, orderId, branchId],
    )
  })
  const params = new URLSearchParams({ branch: branchId, t: branchToken(secret, organizationId, orderCode, branchId) })
  return `/subcontract/${encodeURIComponent(orderCode)}?${params.toString()}`
}
