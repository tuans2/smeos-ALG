import type { HumanVerificationInput, HumanVerifier } from "@/core/ports/human-verification"
import { log } from "@/core/observability/log"

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
const TIMEOUT_MS = 5_000

/** Chưa bật nhà cung cấp: ô bẫy + giới hạn tần suất ở route đã chặn máy, ở đây luôn cho qua. */
export const honeypotOnlyVerifier: HumanVerifier = {
  name: "honeypot",
  async verify() {
    return true
  },
}

/**
 * Cloudflare Turnstile (gói miễn phí). Thiếu mã từ trình duyệt hoặc Cloudflare trả
 * `success: false` → từ chối. Lỗi mạng/hết giờ → cho qua và ghi log: không để sự cố
 * bên ngoài làm mất khách, ô bẫy và giới hạn tần suất vẫn chặn phía trước.
 */
export function createTurnstileVerifier(secret: string, fetchImpl: typeof fetch = fetch): HumanVerifier {
  return {
    name: "turnstile",
    async verify({ token, remoteIp }: HumanVerificationInput) {
      if (!token) return false
      const body = new URLSearchParams({ secret, response: token })
      if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp)
      try {
        const res = await fetchImpl(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (!res.ok) {
          log.warn("turnstile.unavailable", { status: res.status })
          return true
        }
        const data = (await res.json()) as { success?: unknown }
        return data.success === true
      } catch (error) {
        log.warn("turnstile.unavailable", { error: error instanceof Error ? error.name : "unknown" })
        return true
      }
    },
  }
}

/** Chọn theo cấu hình: có `TURNSTILE_SECRET_KEY` thì dùng Turnstile, không thì chỉ ô bẫy. */
export function getHumanVerifier(env: Record<string, string | undefined> = process.env): HumanVerifier {
  const secret = env.TURNSTILE_SECRET_KEY?.trim()
  return secret ? createTurnstileVerifier(secret) : honeypotOnlyVerifier
}
