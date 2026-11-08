/**
 * "Viết lại bằng AI" (`POST /api/v1/content-engine/rewrite`) bị chặn vì hết credit hoặc thiếu quyền (PO 07/11/2026,
 * nợ #170): nơi gọi phải báo người dùng lý do, không bịa gợi ý thay thế và không im lặng.
 */
export const REWRITE_NO_CREDIT = "Tiệm đã hết credit nên chưa viết lại được. Xem số dư ở mục Sổ quỹ & Thu chi."
export const REWRITE_NO_PERMISSION = "Tài khoản của bạn chưa được dùng Viết lại bằng AI."

/** Câu báo cho phản hồi bị chặn; `null` khi là lỗi khác (nơi gọi giữ cách xử lý cũ). */
export async function rewriteBlockedMessage(res: Response): Promise<string | null> {
  if (res.status === 403) return REWRITE_NO_PERMISSION
  if (res.status !== 422) return null
  const body = (await res.clone().json().catch(() => null)) as { error?: { code?: string } } | null
  return body?.error?.code === "QUOTA_EXCEEDED" ? REWRITE_NO_CREDIT : null
}

/** Cho nơi gọi chỉ cần danh sách gợi ý: bị chặn → ném lỗi kèm câu báo; lỗi khác → danh sách rỗng như trước. */
export async function emptyUnlessRewriteBlocked(res: Response): Promise<string[]> {
  const blocked = await rewriteBlockedMessage(res)
  if (blocked) throw new Error(blocked)
  return []
}
