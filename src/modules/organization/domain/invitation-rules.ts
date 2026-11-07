/**
 * Lời mời vào tổ chức (thành viên `INVITED`) — audit hành trình M1, gói UJ-14. Trước đây không có bước nhận lời
 * mời nên thành viên `INVITED` không bao giờ vào được. Lời mời có hạn để lời mời cũ quên lãng không mở cửa mãi.
 */
export const INVITATION_TTL_DAYS = 14
const DAY_MS = 86_400_000

export function isInvitationExpired(invitedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - invitedAt.getTime() > INVITATION_TTL_DAYS * DAY_MS
}

export const INVITATION_EXPIRED_MESSAGE = "Lời mời đã hết hạn — nhờ cửa hàng gửi lời mời mới."
