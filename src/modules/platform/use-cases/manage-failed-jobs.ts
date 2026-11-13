import { notFound } from "@/core/http/errors"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import type { PlatformContext } from "@/core/platform/platform-context"
import {
  dismissFailedJob,
  listFailedJobs,
  requeueFailedJob,
  type FailedJobRow,
} from "@/modules/platform/infra/platform-dead-letter-repository"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"

export type FailedJobDeps = {
  list: typeof listFailedJobs
  requeue: typeof requeueFailedJob
  dismiss: typeof dismissFailedJob
  audit: typeof recordPlatformAuditLog
}

const defaultDeps: FailedJobDeps = {
  list: listFailedJobs,
  requeue: requeueFailedJob,
  dismiss: dismissFailedJob,
  audit: recordPlatformAuditLog,
}

/** Hàng đợi lỗi (ROADMAP E5.2) — xem cần `N5` (chỉ đọc, như Sức khoẻ hệ thống). */
export async function listFailedJobsForOps(pctx: PlatformContext, deps: FailedJobDeps = defaultDeps): Promise<FailedJobRow[]> {
  requirePlatformCapability(pctx, "N5")
  return deps.list()
}

/**
 * Chạy lại hoặc gác lại một job lỗi — cần `N15`, luôn ghi nhật ký nền tảng.
 * Người vận hành chạy lại thì nền tảng chịu chi phí: không trừ credit của tiệm lần nữa.
 */
export async function actOnFailedJob(
  pctx: PlatformContext,
  input: { jobId: string; action: "RETRY" | "DISMISS" },
  deps: FailedJobDeps = defaultDeps
): Promise<{ status: "PENDING" | "CANCELLED" }> {
  requirePlatformCapability(pctx, "N15")
  const done = input.action === "RETRY" ? await deps.requeue(input.jobId) : await deps.dismiss(input.jobId)
  if (!done) throw notFound()
  const status = input.action === "RETRY" ? "PENDING" : "CANCELLED"
  await deps.audit(pctx, {
    action: input.action === "RETRY" ? "platform.job.retry" : "platform.job.dismiss",
    entityType: "generation_job",
    entityId: input.jobId,
    before: { status: "FAILED" },
    after: { status, organization_id: done.organizationId, feature: done.feature },
  })
  return { status }
}
