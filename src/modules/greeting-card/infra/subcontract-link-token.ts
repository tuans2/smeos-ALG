import { createHmac, timingSafeEqual } from "node:crypto"
import { env } from "@/lib/env"

/**
 * Token của link Thẻ Gia Công gửi riêng cho từng chi nhánh:
 * `<organizationId>.<hạn base36>.<HMAC(SESSION_SECRET, tổ chức + mã đơn + chi nhánh + hạn)>`.
 * Không lưu gì trong DB — cùng kỹ thuật với `session-owner-token.ts`.
 *
 * Trước đây link chỉ mang `?branch=<id>` và API công khai tra đơn theo mã trên MỌI tổ chức:
 * ai đoán được mã đơn (mã đơn thường tuần tự) là đọc/sửa được đơn của mọi tenant (rà soát
 * 21/10/2026, C2). Mã đơn chỉ duy nhất trong một tổ chức, nên token mang luôn tổ chức để
 * máy chủ tra đúng `(organization_id, code)`.
 */
/**
 * Hạn của chữ ký — chỉ là trần an toàn. Từ P-4 (ADR-014 D-P6) quyền xem do `shared_order_access` quyết: thu hồi khi
 * chi nhánh khác nhận / hết vòng, hết 7 ngày sau khi đơn đóng. Trước đây 14 ngày cố định làm link của đơn đặt trước
 * xa hết hạn trước ngày giao.
 */
export const SUBCONTRACT_TOKEN_TTL_MS = 120 * 24 * 60 * 60 * 1000
export const SUBCONTRACT_TOKEN_HEADER = "x-subcontract-token"

function signature(organizationId: string, orderCode: string, branchId: string, expiresAtMs: number): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(`subcontract-branch:${organizationId}:${orderCode.toUpperCase()}:${branchId}:${expiresAtMs}`)
    .digest("hex")
}

export function signSubcontractBranchToken(
  organizationId: string,
  orderCode: string,
  branchId: string,
  nowMs = Date.now()
): string {
  const expiresAtMs = nowMs + SUBCONTRACT_TOKEN_TTL_MS
  return `${organizationId}.${expiresAtMs.toString(36)}.${signature(organizationId, orderCode, branchId, expiresAtMs)}`
}

/** Tổ chức mà token cấp quyền cho `(orderCode, branchId)`, hoặc `null` nếu token sai/hết hạn. */
export function verifySubcontractBranchToken(
  orderCode: string,
  branchId: string | null | undefined,
  token: string | null | undefined,
  nowMs = Date.now()
): string | null {
  if (!token || !branchId) return null
  const [organizationId, expPart, sig, ...rest] = token.split(".")
  if (!organizationId || !expPart || !sig || rest.length > 0) return null
  const expiresAtMs = parseInt(expPart, 36)
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null
  const expected = Buffer.from(signature(organizationId, orderCode, branchId, expiresAtMs))
  const actual = Buffer.from(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  return organizationId
}

/** Link Thẻ Gia Công cho một chi nhánh, đã kèm token. `action` mở thẳng một bước (vd. upload_qc). */
export function subcontractBranchUrl(input: {
  baseUrl: string
  organizationId: string
  orderCode: string
  branchId: string
  action?: string | undefined
}): string {
  const params = new URLSearchParams({
    branch: input.branchId,
    t: signSubcontractBranchToken(input.organizationId, input.orderCode, input.branchId),
  })
  if (input.action) params.set("action", input.action)
  return `${input.baseUrl}/subcontract/${encodeURIComponent(input.orderCode)}?${params.toString()}`
}
