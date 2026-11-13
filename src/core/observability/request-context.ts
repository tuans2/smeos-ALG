import { AsyncLocalStorage } from "node:async_hooks"

import { REQUEST_ID_HEADER } from "./request-id"

/**
 * Ngữ cảnh theo request: `handle()` chạy handler trong đây để `log`,
 * `generation_jobs.request_id` và `audit_logs` tự nhận mã yêu cầu, IP, thiết bị và người thao tác
 * mà không phải truyền qua từng use-case (checklist ALG 1.15, 1.17).
 */
export type RequestMeta = {
  requestId?: string | undefined
  ip?: string | undefined
  userAgent?: string | undefined
  /** Gắn bởi `requireTenantContext` sau khi xác thực phiên — nguồn phía máy chủ, không từ client. */
  organizationId?: string | undefined
  userId?: string | undefined
  /** Giới hạn tần suất chặt nhất đã đếm trong request — `handle()` gắn thành header `RateLimit-*`. */
  rateLimit?: RateLimitState | undefined
}

export type RateLimitState = {
  readonly limit: number
  readonly remaining: number
  /** Thời điểm (ms epoch) cửa sổ hiện tại kết thúc. */
  readonly resetAt: number
}

const store = new AsyncLocalStorage<RequestMeta>()

export function runWithRequestId<T>(requestId: string | null | undefined, fn: () => T): T {
  if (!requestId) return fn()
  return store.run({ requestId }, fn)
}

/** Chạy `fn` với ngữ cảnh yêu cầu đầy đủ (mã yêu cầu, IP, thiết bị). */
export function runWithRequestMeta<T>(meta: RequestMeta, fn: () => T): T {
  return store.run({ ...meta }, fn)
}

export function currentRequestId(): string | undefined {
  return store.getStore()?.requestId
}

export function currentRequestMeta(): Readonly<RequestMeta> | undefined {
  return store.getStore()
}

/** Ghi người thao tác đã xác thực vào ngữ cảnh hiện tại (không làm gì ngoài một request). */
export function bindRequestActor(actor: { organizationId: string; userId: string }): void {
  const meta = store.getStore()
  if (!meta) return
  meta.organizationId = actor.organizationId
  meta.userId = actor.userId
}

/**
 * Ghi lượt đếm của một luật giới hạn tần suất; nhiều luật trong một request thì giữ luật còn ít lượt
 * nhất (hoà thì luật mở lại muộn hơn) — đúng luật sẽ chặn trước (không làm gì ngoài một request).
 */
export function recordRateLimit(state: RateLimitState): void {
  const meta = store.getStore()
  if (!meta) return
  const prev = meta.rateLimit
  if (!prev || state.remaining < prev.remaining || (state.remaining === prev.remaining && state.resetAt > prev.resetAt)) {
    meta.rateLimit = state
  }
}

export function requestIdOf(request: Request): string | null {
  return request.headers.get(REQUEST_ID_HEADER)
}
