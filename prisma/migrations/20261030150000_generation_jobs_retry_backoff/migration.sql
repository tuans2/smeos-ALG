-- ROADMAP E5.1: tự thử lại job lỗi tạm thời có backoff.
ALTER TABLE "generation_jobs" ADD COLUMN "run_after" TIMESTAMP(3);
ALTER TABLE "generation_jobs" ADD COLUMN "failure_kind" TEXT;
CREATE INDEX "generation_jobs_status_run_after_idx" ON "generation_jobs"("status", "run_after");
