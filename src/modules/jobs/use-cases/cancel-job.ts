import { conflict, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { canCancel, JOB_STATUS_LABELS, type JobStatus } from "@/modules/jobs/domain/job-rules"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"

/** `POST /jobs/:id/cancel` (`G6`) — chỉ job còn `PENDING` (`YC-J4`). */
export async function cancelJob(ctx: TenantContext, id: string) {
  const repo = getGenerationJobRepository()
  const current = await repo.findById(ctx, id)
  if (!current) throw notFound()
  if (!canCancel(current.status)) {
    throw conflict(`Tác vụ đang ở trạng thái "${JOB_STATUS_LABELS[current.status as JobStatus]}" — chỉ huỷ được tác vụ còn đang chờ chạy.`)
  }

  const cancelled = await repo.cancelIfPending(ctx, id)
  // Trượt điều kiện đua: job vừa đổi trạng thái giữa lúc kiểm và lúc ghi.
  if (!cancelled) throw conflict("Tác vụ vừa bắt đầu chạy nên không huỷ được nữa.")
  return cancelled
}
