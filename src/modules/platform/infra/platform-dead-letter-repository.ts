import { prisma } from "@/core/tenancy/infra/prisma"
import { legacyNotifyChannelFor, notifyChannelFor } from "@/modules/jobs/adapters/postgres-queue-provider"

/**
 * Hàng đợi lỗi (dead-letter, ROADMAP E5.2): job dừng hẳn ở `FAILED` sau khi hết lượt tự thử lại
 * (E5.1) hoặc gặp lỗi cần người xử lý. Đọc/ghi xuyên tổ chức — chỉ gọi từ use case đã kiểm mã N.
 * Không trả `payload`/`output`: người vận hành cần lý do lỗi, không cần dữ liệu của tiệm.
 */
export type FailedJobRow = {
  id: string
  organizationId: string
  organizationName: string
  feature: string
  failureKind: string | null
  error: string | null
  attempts: number
  createdAt: Date
  completedAt: Date | null
}

const DO_DAI_LOI = 300

export async function listFailedJobs(limit = 100): Promise<FailedJobRow[]> {
  const rows = await prisma.generation_jobs.findMany({
    where: { status: "FAILED" },
    orderBy: [{ completed_at: { sort: "desc", nulls: "last" } }, { created_at: "desc" }],
    take: limit,
    select: {
      id: true, organization_id: true, feature: true, failure_kind: true, error: true,
      attempts: true, created_at: true, completed_at: true,
      organization: { select: { name: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    organizationName: r.organization.name,
    feature: r.feature,
    failureKind: r.failure_kind,
    error: r.error ? r.error.slice(0, DO_DAI_LOI) : null,
    attempts: r.attempts,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  }))
}

/** FAILED → PENDING như một lượt mới (cùng quy tắc `retryIfFailed`). Trả `null` nếu job không còn FAILED. */
export async function requeueFailedJob(id: string): Promise<{ organizationId: string; feature: string } | null> {
  const job = await prisma.generation_jobs.findFirst({ where: { id, status: "FAILED" }, select: { organization_id: true, feature: true } })
  if (!job) return null
  const { count } = await prisma.generation_jobs.updateMany({
    where: { id, status: "FAILED" },
    data: {
      status: "PENDING", stage: null, result: null, error: null, attempts: 0,
      run_after: null, failure_kind: null, started_at: null, completed_at: null,
    },
  })
  if (count === 0) return null
  // Đánh thức worker như lúc enqueue (kênh theo feature).
  await prisma.$executeRaw`SELECT pg_notify(${notifyChannelFor(job.feature)}, ${id})`
  await prisma.$executeRaw`SELECT pg_notify(${legacyNotifyChannelFor(job.feature)}, ${id})`
  return { organizationId: job.organization_id, feature: job.feature }
}

/** Gác lại: FAILED → CANCELLED, rời hàng đợi lỗi. Credit vẫn theo quy tắc hoàn như job huỷ. */
export async function dismissFailedJob(id: string): Promise<{ organizationId: string; feature: string } | null> {
  const job = await prisma.generation_jobs.findFirst({ where: { id, status: "FAILED" }, select: { organization_id: true, feature: true } })
  if (!job) return null
  const { count } = await prisma.generation_jobs.updateMany({
    where: { id, status: "FAILED" },
    data: { status: "CANCELLED", cancelled_at: new Date() },
  })
  return count === 0 ? null : { organizationId: job.organization_id, feature: job.feature }
}
