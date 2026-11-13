import { validationFailed } from "@/core/http/errors"
import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/**
 * `GET /jobs` (đặc tả 06 mục 7). `G4` chỉ thấy job của mình; có thêm `G5`
 * thì thấy toàn tổ chức. Route đã `requireCapability(ctx, "G4")` trước khi
 * gọi hàm này — ở đây chỉ còn quyết định có lọc theo `user_id` hay không.
 */
export async function listJobs(
  ctx: TenantContext,
  options: { limit?: number | undefined; cursor?: string | null | undefined }
) {
  const limit = options.limit ?? DEFAULT_LIMIT
  if (limit < 1 || limit > MAX_LIMIT) {
    throw validationFailed({ limit: `Phải trong khoảng 1..${MAX_LIMIT}` })
  }

  const onlyUserId = hasCapability(ctx, "G5") ? undefined : ctx.userId
  const rows = await getGenerationJobRepository().list(ctx, {
    onlyUserId,
    limit: limit + 1,
    cursor: options.cursor ?? null,
  })
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  return { data: page, next_cursor: nextCursor }
}
