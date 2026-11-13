import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
// Không phải một trang thật (không có con trỏ) — quét tối đa ngần này job
// COMPLETED gần nhất rồi lọc trong bộ nhớ. Đủ cho quy mô hàng chờ hiện tại;
// xem ghi chú bên dưới vì sao không JOIN thẳng được trong một truy vấn.
const MAX_SCAN = 200

export type PendingOptimization = {
  job_id: string
  result: string | null
  completed_at: string | null
  requires_warning: boolean
}

/**
 * `GET /media/optimizations` (`I2`, nợ #48 — TECHNICAL_DEBT.md). M04a không
 * có bảng riêng — một lượt tối ưu CHÍNH LÀ một `generation_jobs`
 * (`feature = "media.optimize"`, đặc tả 07 mục 9). "Chờ duyệt" nghĩa là:
 * COMPLETED, không REJECTED (`REJECTED` không vào luồng duyệt — `YC-R5`), VÀ
 * Master Image liên kết CHƯA `approval_state = APPROVED`.
 *
 * `assets` không có quan hệ Prisma ngược về `generation_jobs` (đặc tả 07
 * không khai) nên không JOIN được trong một truy vấn — tra từng job một
 * bằng `findMasterByJobId` đã có sẵn. Chấp nhận N+1 ở quy mô hiện tại thay
 * vì thêm một quan hệ mới vào schema chỉ để phục vụ một màn đọc.
 */
export async function listPendingOptimizations(
  ctx: TenantContext,
  options: { limit?: number | undefined }
): Promise<{ data: PendingOptimization[] }> {
  const limit = options.limit ?? DEFAULT_LIMIT
  if (limit < 1 || limit > MAX_LIMIT) {
    throw validationFailed({ limit: `Phải trong khoảng 1..${MAX_LIMIT}` })
  }

  const jobRepo = getGenerationJobRepository()
  const assetRepo = getAssetRepository()

  const candidates = await jobRepo.listCompletedNotRejected(ctx, {
    feature: "media.optimize",
    limit: MAX_SCAN,
  })

  const pending: PendingOptimization[] = []
  for (const job of candidates) {
    const master = await assetRepo.findMasterByJobId(ctx, job.id)
    if (master?.approval_state === "APPROVED") continue

    pending.push({
      job_id: job.id,
      result: job.result,
      completed_at: job.completed_at?.toISOString() ?? null,
      requires_warning: job.result === "WARNING",
    })
    if (pending.length >= limit) break
  }

  return { data: pending }
}
