const SUPERSEDED = "SESSION_SUPERSEDED"

/** Phản hồi của `GET /auth/session-status` cho biết phiên trong cookie bị thay bởi lần đăng nhập ở thiết bị khác. */
export function isSupersededResponse(status: number, body: unknown): boolean {
  if (status !== 401 || !body || typeof body !== "object") return false
  const error = (body as { error?: { details?: { reason?: unknown } } }).error
  return error?.details?.reason === SUPERSEDED
}
