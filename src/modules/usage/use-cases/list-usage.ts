import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getUsageRepository } from "@/modules/usage/infra/usage-repository"
import type { IUsageRepository } from "@/modules/usage/domain/repositories/usage-repository.interface"


const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/** `GET /usage` (`G8`, đặc tả 06 mục 10). */
export async function listUsage(
  ctx: TenantContext,
  options: { limit?: number | undefined; cursor?: string | null | undefined },
  repo: IUsageRepository = getUsageRepository()
) {
  const limit = options.limit ?? DEFAULT_LIMIT
  if (limit < 1 || limit > MAX_LIMIT) {
    throw validationFailed({ limit: `Phải trong khoảng 1..${MAX_LIMIT}` })
  }

  const rows = await repo.list(ctx, { limit: limit + 1, cursor: options.cursor ?? null })
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  return { data: page, next_cursor: nextCursor }
}
