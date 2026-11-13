import { createHash, timingSafeEqual } from "node:crypto"

type Env = Record<string, string | undefined>

/** Secret dùng cho endpoint cron. Production thiếu `CRON_SECRET` → `null` (đóng hẳn). */
export function cronSecretFor(env: Env): string | null {
  const configured = env.CRON_SECRET?.trim()
  if (configured) return configured
  return env.NODE_ENV === "production" ? null : "dev"
}

/**
 * Header `x-cron-secret` có khớp secret không. So sánh theo thời gian hằng; thiếu secret
 * trên production thì luôn từ chối — trước đây mặc định "dev" mở endpoint cho mọi người
 * (rà soát 21/10/2026, H3).
 */
export function isAuthorizedCronRequest(request: Request, env: Env = process.env): boolean {
  const secret = cronSecretFor(env)
  const provided = request.headers.get("x-cron-secret")
  if (!secret || !provided) return false
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(provided), digest(secret))
}

/** `forceStep` bỏ qua lịch nhắc — chỉ để thử tay, không bao giờ trên production. */
export function forceStepAllowed(env: Env = process.env): boolean {
  return env.NODE_ENV !== "production"
}
