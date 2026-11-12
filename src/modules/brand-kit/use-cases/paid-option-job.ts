/**
 * Một lần bấm "Tạo thêm phương án" = một job tại chỗ trừ credit (credit chỉ bị trừ ở `enqueueJob`, YC-U3).
 * Giá đọc từ Console (`credit_pricing.brandExtraOptionCredit`). AI không chạy được → vẫn giao phương án theo
 * mẫu nhưng job FAILED + hoàn credit (thu theo đường thật đã chạy). Trùng `Idempotency-Key` → trả lại đúng
 * phương án của lượt trước, không trừ lần hai.
 */
import { AppError, conflict } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { readCreditPricing } from "@/modules/usage/infra/credit-pricing-store"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { aiFailureMessage } from "@/modules/usage/domain/ai-failure-message"
import { EXTRA_OPTION_FEATURE, type BrandOptionKind } from "../domain/option-rules"

export interface PaidOptionUsage {
  readonly costCredit: number
  readonly balanceAfter: number | null
  /** true = AI không chạy được, đã hoàn credit */
  readonly refunded: boolean
}

export interface PaidOptionResult<T> {
  readonly value: T
  readonly usage: PaidOptionUsage
  readonly deduped: boolean
}

export async function runPaidOption<T>(
  ctx: TenantContext,
  input: { kind: BrandOptionKind; idempotencyKey: string; payload: Record<string, unknown> },
  run: (jobId: string) => Promise<{ value: T; aiRan: boolean }>,
  findExisting: (jobId: string) => Promise<T | null>
): Promise<PaidOptionResult<T>> {
  const pricing = await readCreditPricing()
  const enq = await enqueueJob(ctx, {
    feature: EXTRA_OPTION_FEATURE[input.kind],
    costCredit: pricing.brandExtraOptionCredit,
    payload: input.payload,
    idempotencyKey: input.idempotencyKey,
  })
  if (enq.deduped) {
    const existing = await findExisting(enq.job.id)
    if (!existing) throw conflict("Lượt tạo trước chưa xong — đợi giây lát rồi tải lại trang")
    return { value: existing, usage: { costCredit: 0, balanceAfter: null, refunded: false }, deduped: true }
  }

  const jobs = getGenerationJobRepository()
  await jobs.startInline(ctx, enq.job.id, new Date())
  try {
    const { value, aiRan } = await run(enq.job.id)
    if (aiRan) {
      await jobs.finishInline(ctx, enq.job.id, { ok: true, now: new Date(), output: { delivered: true } })
      return { value, usage: { ...enq.usage, refunded: false }, deduped: false }
    }
    await jobs.finishInline(ctx, enq.job.id, { ok: false, error: "ai_unavailable_template_used", now: new Date() })
    const refund = await refundJob(ctx, enq.job.id).catch(() => null)
    const back = refund?.refunded ? refund.creditHoanLai : 0
    return {
      value,
      usage: { costCredit: enq.usage.costCredit - back, balanceAfter: enq.usage.balanceAfter === null ? null : enq.usage.balanceAfter + back, refunded: back > 0 },
      deduped: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định"
    await jobs.finishInline(ctx, enq.job.id, { ok: false, error: message, now: new Date() })
    const refunded = (await refundJob(ctx, enq.job.id).catch(() => null))?.refunded === true
    if (error instanceof AppError) throw error
    throw new AppError("INTERNAL", aiFailureMessage("Chưa tạo được phương án mới", refunded))
  }
}
