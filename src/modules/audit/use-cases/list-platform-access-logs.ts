import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"

import { platformAccessLabel } from "../domain/platform-access"
import { getPlatformAccessLogRepository, type PlatformAccessLogRepository } from "../infra/platform-access-log-repository"

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/** `GET /audit-logs/platform-access` (G9, D-60): nhân viên nền tảng đã truy cập dữ liệu của tổ chức mình khi nào, để làm gì. */
export async function listPlatformAccessLogs(
  ctx: TenantContext,
  options: { limit?: number | undefined; cursor?: string | null | undefined },
  repo: Pick<PlatformAccessLogRepository, "list"> = getPlatformAccessLogRepository(),
) {
  const limit = options.limit ?? DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw validationFailed({ limit: `Phải trong khoảng 1..${MAX_LIMIT}` })
  const rows = await repo.list(ctx, { limit: limit + 1, cursor: options.cursor ?? null })
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  return {
    data: page.map((r) => ({
      id: r.id,
      created_at: r.createdAt.toISOString(),
      operator_name: r.operatorName,
      purpose: r.purpose,
      purpose_label: platformAccessLabel(r.purpose),
    })),
    next_cursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  }
}
