import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { STUCK_JOB_TIMEOUT_MS } from "@/modules/jobs/domain/job-rules"
import { failOrphanedRenders } from "@/modules/video-studio/use-cases/fail-orphaned-renders"

/**
 * `YC-J10` — job `PROCESSING` quá 15 phút bị đánh dấu `FAILED`. Không có
 * người dùng nào chờ đáp ứng của hàm này; nó chạy định kỳ ngoài request HTTP
 * (`scripts/scan-stuck-jobs.ts` và cron `POST /internal/chain-dispatch-sweep`).
 *
 * Sau đó đồng bộ video không còn job nào chạy (audit hành trình V1, gói UJ-03) — trước đây `video_jobs` kẹt
 * `RENDERING` mãi khi job của nó bị quét thành `FAILED`.
 */
export async function scanStuckJobs(now: Date = new Date()): Promise<number> {
  const failed = await getGenerationJobRepository().markStuckAsFailed(now, STUCK_JOB_TIMEOUT_MS)
  await failOrphanedRenders(now, STUCK_JOB_TIMEOUT_MS)
  return failed
}
