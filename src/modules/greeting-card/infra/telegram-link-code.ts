import { createHmac } from "node:crypto"
import { env } from "@/lib/env"

/**
 * Mã liên kết nhóm Telegram của MỘT tổ chức: HMAC(SESSION_SECRET, tổ chức), không lưu DB.
 *
 * Bot điều phối là bot chung của nền tảng — mọi tenant thêm cùng một bot vào nhóm của mình.
 * Chỉ nhóm nào đã nhắn mã này mới được coi là nhóm của tổ chức (rà soát 21/10/2026, H1).
 */
function linkDigest(organizationId: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(`telegram-link:${organizationId}`).digest("hex").slice(0, 10).toUpperCase()
}

export function telegramLinkCode(organizationId: string): string {
  return `ALG-${linkDigest(organizationId)}`
}

/**
 * Mã cũ trước khi đổi tên sang ALG (12/11/2026). Vẫn nhận để nhóm đã nhắn mã cũ nhưng chưa được quét
 * không phải nhắn lại; nhóm đã liên kết được nhớ trong DB nên không phụ thuộc mã.
 */
export function telegramLegacyLinkCode(organizationId: string): string {
  return `SMEOS-${linkDigest(organizationId)}`
}
