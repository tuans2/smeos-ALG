import "@/lib/brand-storage-migration"
import { type TaskUiState, taskStateFromBackend } from "@/lib/ui-system/task-state"

/** Hỏi lại mỗi 2 giây, tối đa 5 phút — vòng lặp luôn có giới hạn (CLAUDE.md #5). */
export const POLL_INTERVAL_MS = 2000
export const MAX_POLLS = 150

export interface CreatedGenerationJob {
  jobId: string
  costCredit: number | null
  balanceAfter: number | null
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function unwrap(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null
  const root = body as Record<string, unknown>
  return (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>
}

/**
 * Các route tạo job ảnh (`POST /api/v1/product-photo`, `/product-image-set`, …) trả
 * `{ job_id, status, usage: { cost_credit, balance_after } }` — không bọc trong `data`.
 * Chấp nhận cả dạng bọc để không vỡ nếu API chuyển sang chuẩn `{ data }`.
 */
export function parseCreatedJob(body: unknown): CreatedGenerationJob | null {
  const src = unwrap(body)
  if (!src) return null
  const jobId = src.job_id ?? src.jobId
  if (typeof jobId !== "string" || !jobId) return null
  const usage = (src.usage && typeof src.usage === "object" ? src.usage : {}) as Record<string, unknown>
  return { jobId, costCredit: num(usage.cost_credit), balanceAfter: num(usage.balance_after) }
}

export interface PolledGenerationJob<R> {
  state: TaskUiState | null
  result: R | null
  error: string | null
}

/** `GET …/:id` trả thẳng kết quả có `status` + `error` (không bọc `data`). */
export function parsePolledJob<R>(body: unknown): PolledGenerationJob<R> {
  const src = unwrap(body)
  if (!src) return { state: null, result: null, error: null }
  const state = taskStateFromBackend(typeof src.status === "string" ? src.status : null)
  const error = typeof src.error === "string" && src.error ? src.error : null
  return { state, result: state === "succeeded" ? (src as unknown as R) : null, error }
}

/** Khoá nhớ tác vụ đang chạy để mở lại trang vẫn thấy kết quả — gắn tổ chức (03c UX-022). */
export function jobStorageKey(tool: string, organizationId: string | null | undefined): string | null {
  return organizationId ? `alg.${tool}.lastJobId__${organizationId}` : null
}

export function newIdempotencyKey(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  return `${prefix}-${rand}`
}
