/**
 * Nội dung JWT phiên liên-app (Unified Shell, B1) — CHỈ xác định danh tính,
 * không mang quyền. Cố tình KHÔNG có mã năng lực/role: `LocalBudd` và
 * `SocialFlow` có mô hình quyền riêng của chính nó (đúng nguyên tắc
 * RBAC-for-UI-only đã áp dụng cho `floraos-core` — mỗi app tự kiểm quyền ở
 * endpoint của mình, `UNIFIED_SHELL.md` §3), và mã năng lực của
 * `floraos-core` không có ý nghĩa gì để hai app kia tự diễn giải. Token này
 * chỉ trả lời đúng một câu: ai đang đăng nhập, đang ở tổ chức nào.
 */
export type SsoClaims = {
  /** `users.id` — chủ thể của token. */
  readonly sub: string
  /** Tổ chức đang hoạt động của phiên; null khi phiên chưa chọn tổ chức nào. */
  readonly org: string | null
  /** Tiện hiển thị (avatar/tên) ở app khác mà không cần tra lại — không phải bí mật. */
  readonly email: string | null
  /** Đơn vị giây, kiểu `exp`/`iat` chuẩn JWT (không phải mili-giây). */
  readonly iat: number
  readonly exp: number
}

/**
 * Ngắn hạn có chủ đích (quyết định của anh Tony, AskUserQuestion 2026-09-10):
 * JWT bị lộ tự hết hạn nhanh, đổi lại cần endpoint làm mới
 * (`POST /api/v1/sso/refresh`) để LocalBudd/SocialFlow xin token mới khi cái
 * cũ hết hạn, miễn là cookie phiên gốc (`floraos_session`, thu hồi được qua
 * `revoked_at`) vẫn còn hiệu lực. Khác 30 ngày của `SESSION_TTL_SECONDS` —
 * đó là phiên gốc do chính `floraos-core` tra CSDL mỗi lần, thu hồi được
 * ngay lập tức; token này thì không (bản chất JWT là stateless).
 */
export const SSO_TOKEN_TTL_SECONDS = 15 * 60

export function ssoClaimsFor(input: {
  userId: string
  organizationId: string | null
  email: string | null
  now: Date
}): SsoClaims {
  const iat = Math.floor(input.now.getTime() / 1000)
  return {
    sub: input.userId,
    org: input.organizationId,
    email: input.email,
    iat,
    exp: iat + SSO_TOKEN_TTL_SECONDS,
  }
}

export function isSsoClaimsExpired(claims: Pick<SsoClaims, "exp">, now: Date): boolean {
  return claims.exp <= Math.floor(now.getTime() / 1000)
}
