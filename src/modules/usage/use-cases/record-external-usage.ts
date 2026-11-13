import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getUsageRepository } from "@/modules/usage/infra/usage-repository"
import type { IUsageRepository } from "@/modules/usage/domain/repositories/usage-repository.interface"
import type { usage } from "@/modules/usage/infra/entities"

const RECORDABLE_STATUS = ["COMPLETED", "REFUNDED"] as const
type RecordableStatus = (typeof RECORDABLE_STATUS)[number]

export type RecordExternalUsageInput = {
  feature: string
  quantity?: number | undefined
  costUsd?: number | null | undefined
  status: string
  jobId?: string | null | undefined
}

/**
 * `POST /integration/usage` (đặc tả 06 mục 11): "Ghi mức dùng phát sinh ở
 * engine ngoài" — dùng khi `LocalBudd`/`SocialFlow` hoàn tất một việc do
 * chính engine đó xử lý (không đi qua `enqueueJob`/`generation_jobs` của
 * core) và cần vào cùng một sổ `usage` duy nhất (`YC-U1` `YC-U2`).
 *
 * `costCredit` LUÔN LÀ 0: bảng `usage` là sổ chi phí chung, không phải một
 * đường trừ credit thứ hai — credit của tổ chức chỉ bị trừ tại điểm
 * `enqueueJob` (`YC-U3`). Ghi từ ngoài vào chỉ để đối soát `cost_usd` thật,
 * không tính phí khách lần nữa.
 *
 * Chỉ nhận `COMPLETED`/`REFUNDED` — `ENQUEUED` là trạng thái nội bộ của
 * chính lúc tạo job (`enqueue-job.ts`), engine ngoài không tạo job qua
 * đường này thì không được tự ghi nó.
 */
export async function recordExternalUsage(
  ctx: TenantContext,
  input: RecordExternalUsageInput,
  repo: IUsageRepository = getUsageRepository()
): Promise<usage> {
  if (!input.feature) throw validationFailed({ feature: "Bắt buộc" })
  if (!RECORDABLE_STATUS.includes(input.status as RecordableStatus)) {
    throw validationFailed({ status: `Phải là một trong: ${RECORDABLE_STATUS.join(", ")}` })
  }

  return repo.record(ctx, {
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    jobId: input.jobId ?? null,
    feature: input.feature,
    quantity: input.quantity ?? 1,
    costCredit: 0,
    costUsd: input.costUsd ?? null,
    status: input.status as RecordableStatus,
    metadata: { reported_by: ctx.userId },
  })
}
