/**
 * Lời gọi HTTP chung của các adapter đăng bài: timeout + cầu dao ngắt theo nền tảng (`withCircuitBreaker`), đọc JSON
 * an toàn, KHÔNG ghi log khoá hay thân request. Lỗi mạng / hết giờ / cầu dao mở → lỗi tạm thời (thử lại được).
 */
import { CircuitOpenError, withCircuitBreaker } from "@/core/http/circuit-breaker"
import type { PublishResult } from "@/core/ports/publisher-provider"

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface JsonResponse {
  readonly status: number
  readonly body: Record<string, unknown>
}

/** Đăng có thể kèm ảnh nặng — 30 giây mỗi lời gọi. */
export const PUBLISH_TIMEOUT_MS = 30_000

export async function callJson(fetchImpl: FetchLike, breaker: string, url: string, init: RequestInit): Promise<JsonResponse> {
  return withCircuitBreaker(
    breaker,
    async (signal) => {
      const res = await fetchImpl(url, { ...init, signal })
      const body = (await res.json().catch(() => ({}))) as unknown
      const json = { status: res.status, body: body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {} }
      // Nền tảng sập (5xx) tính là lỗi của cầu dao; lỗi 4xx là lỗi nội dung / quyền, không làm ngắt cả nền tảng
      if (res.status >= 500) throw Object.assign(new Error(`HTTP ${res.status}`), { json })
      return json
    },
    { timeoutMs: PUBLISH_TIMEOUT_MS, failureThreshold: 5, cooldownMs: 120_000 },
  )
}

/** Lỗi ném ra từ `callJson` → kết quả đăng thất bại tạm thời. */
export function transientFailure(error: unknown, label: string): PublishResult {
  if (error instanceof CircuitOpenError) {
    return { ok: false, kind: "RETRYABLE", code: "CIRCUIT_OPEN", message: `${label} đang lỗi liên tiếp — hệ thống sẽ thử lại sau` }
  }
  const status = (error as { json?: JsonResponse } | null)?.json?.status
  if (typeof status === "number") return { ok: false, kind: "RETRYABLE", code: `HTTP_${status}`, message: `${label} tạm thời không phản hồi — hệ thống sẽ thử lại` }
  return { ok: false, kind: "RETRYABLE", code: "NETWORK", message: `Không kết nối được ${label} — hệ thống sẽ thử lại` }
}

export const str = (v: unknown): string | null => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null)
export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
