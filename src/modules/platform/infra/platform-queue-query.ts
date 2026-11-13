import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * Hàng đợi theo loại việc cho màn Sức khoẻ hệ thống (`N5`, ROADMAP E1.6). Đọc xuyên tổ chức,
 * chỉ trả con số và mốc thời gian — không trả payload hay dòng job.
 */
export type QueueByFeature = {
  feature: string
  pending: number
  oldestPendingAt: Date | null
  failedLast24h: number
}

const MOT_NGAY_MS = 24 * 60 * 60 * 1000

export async function readQueueByFeature(now: Date): Promise<QueueByFeature[]> {
  const [pending, failed] = await Promise.all([
    prisma.generation_jobs.groupBy({
      by: ["feature"],
      where: { status: "PENDING" },
      _count: { _all: true },
      _min: { created_at: true },
    }),
    prisma.generation_jobs.groupBy({
      by: ["feature"],
      // Worker Python không ghi `completed_at` khi lỗi — đếm theo lúc tạo job.
      where: { status: "FAILED", created_at: { gte: new Date(now.getTime() - MOT_NGAY_MS) } },
      _count: { _all: true },
    }),
  ])

  const byFeature = new Map<string, QueueByFeature>()
  const row = (feature: string) =>
    byFeature.get(feature) ??
    byFeature.set(feature, { feature, pending: 0, oldestPendingAt: null, failedLast24h: 0 }).get(feature)!
  for (const p of pending) Object.assign(row(p.feature), { pending: p._count._all, oldestPendingAt: p._min.created_at })
  for (const f of failed) row(f.feature).failedLast24h = f._count._all

  return [...byFeature.values()].sort((x, y) => y.pending - x.pending || y.failedLast24h - x.failedLast24h)
}
