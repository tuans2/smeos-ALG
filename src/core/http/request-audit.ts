import { log } from "@/core/observability/log"
import { currentRequestMeta } from "@/core/observability/request-context"
import { writeRequestAudit } from "@/core/observability/infra/request-audit-writer"

import { AppError } from "./errors"

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])
const USER_AGENT_MAX = 300

/** Lần bị chặn cùng người + cùng đường dẫn chỉ ghi một dòng mỗi phút — chống tràn bảng nhật ký. */
const DENIED_WINDOW_MS = 60_000
const DENIED_MAX_KEYS = 10_000
const deniedSeen = new Map<string, number>()

export function userAgentOf(request: Request): string | undefined {
  return request.headers.get("user-agent")?.slice(0, USER_AGENT_MAX) || undefined
}

function pathOf(request: Request): string {
  return new URL(request.url).pathname
}

async function write(action: string, request: Request, after: Record<string, unknown>): Promise<void> {
  const meta = currentRequestMeta()
  if (!meta?.organizationId || !meta.userId) return
  try {
    await writeRequestAudit({
      organizationId: meta.organizationId,
      userId: meta.userId,
      action,
      entityType: "http_request",
      entityId: pathOf(request),
      after: { method: request.method, ...after },
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    })
  } catch (error) {
    // Nhật ký là việc phụ: không làm hỏng phản hồi của thao tác chính
    log.error("audit.request_write_failed", { action, error: error instanceof Error ? error.message : String(error) })
  }
}

/** Checklist ALG 1.17 — mọi thao tác ghi thành công của người đã xác thực đều có một dòng nhật ký. */
export async function auditMutation(request: Request, response: Response): Promise<void> {
  if (!MUTATING.has(request.method) || response.status >= 400) return
  await write("api.mutation", request, { status: response.status })
}

/** Checklist ALG 1.15 — lần cố thao tác ngoài quyền được ghi lại (người, đường dẫn, mã quyền, IP). */
export async function auditDenied(request: Request, error: unknown): Promise<void> {
  if (!(error instanceof AppError) || error.code !== "CAPABILITY_DENIED") return
  const meta = currentRequestMeta()
  const key = `${meta?.userId ?? "?"}|${request.method}|${pathOf(request)}`
  const now = Date.now()
  const last = deniedSeen.get(key)
  if (last !== undefined && now - last < DENIED_WINDOW_MS) return
  if (deniedSeen.size >= DENIED_MAX_KEYS) deniedSeen.clear()
  deniedSeen.set(key, now)
  log.warn("security.access_denied", { path: pathOf(request), method: request.method, userId: meta?.userId, capability: error.details?.capability })
  await write("security.access_denied", request, { capability: error.details?.capability ?? null, reason: error.message })
}

/** Chỉ dùng trong test: xoá bộ nhớ chống lặp của lần bị chặn. */
export function resetDeniedAuditWindow(): void {
  deniedSeen.clear()
}
