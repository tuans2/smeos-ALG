import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { STUCK_JOB_TIMEOUT_MS } from "@/modules/jobs/domain/job-rules"
import { failOrphanedRenders } from "@/modules/video-studio/use-cases/fail-orphaned-renders"
import { refundDueJobs } from "@/modules/usage/use-cases/refund-due-jobs"
import { log } from "@/core/observability/log"

/**
 * `YC-J10` — job `PROCESSING` quá 15 phút bị đánh dấu `FAILED`. Không có
 * người dùng nào chờ đáp ứng của hàm này; nó chạy định kỳ ngoài request HTTP
 * (`scripts/scan-stuck-jobs.ts` và cron `POST /internal/chain-dispatch-sweep`).
 *
 * Rồi hoàn credit cho job khách không nhận được kết quả (`refundDueJobs`, audit BL-32).
 * Sau đó đồng bộ video không còn job nào chạy (audit hành trình V1, gói UJ-03) — trước đây `video_jobs` kẹt
 * `RENDERING` mãi khi job của nó bị quét thành `FAILED`.
 */
export async function scanStuckJobs(now: Date = new Date(), refund: typeof refundDueJobs = refundDueJobs): Promise<number> {
  const failed = await getGenerationJobRepository().markStuckAsFailed(now, STUCK_JOB_TIMEOUT_MS)
  await failOrphanedRenders(now, STUCK_JOB_TIMEOUT_MS)
  // Hoàn credit cho job lỗi / huỷ / bị từ chối ngay trong lượt quét — kể cả job vừa bị đánh lỗi ở trên (audit BL-32).
  // Lỗi hoàn không làm hỏng lượt quét job treo.
  const refunds = await refund().catch((error: unknown) => {
    log.error("jobs.refund_due_sweep_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  })
  if (refunds && (refunds.refunded > 0 || refunds.failed > 0)) log.info("jobs.refund_due_swept", refunds)
  return failed
}
