import { randomInt } from "node:crypto"

import { conflict, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { shopPromotionPolicy, type ShopPromotionPolicy } from "@/modules/greeting-card/use-cases/active-shop-promotions"

import {
  CODE_ALPHABET,
  generateCodes,
  normalizeCode,
  validateVoucherBatch,
  voucherBatchStatus,
  type VoucherBatchInput,
  type VoucherBatchStatus,
} from "../domain/voucher-batch"
import type {
  IVoucherBatchRepository,
  VoucherBatchSummary,
  VoucherCodeRow,
} from "../domain/repositories/voucher-batch-repository.interface"
import { getVoucherBatchRepository } from "../infra/voucher-batch-repository"

export type VoucherBatchView = VoucherBatchSummary & { status: VoucherBatchStatus; promotionTitle: string | null }

type PolicyLoader = (organizationId: string) => Promise<ShopPromotionPolicy>

const cryptoRandom = () => randomInt(CODE_ALPHABET.length) / CODE_ALPHABET.length
export const MAX_CODES_SHOWN = 1000

function view(b: VoucherBatchSummary, policy: ShopPromotionPolicy, now: Date): VoucherBatchView {
  return {
    ...b,
    status: voucherBatchStatus(b, now),
    promotionTitle: b.promotionId ? policy.promotions.find((p) => p.id === b.promotionId)?.title ?? null : null,
  }
}

/**
 * Tạo một đợt mã giảm giá (`Q8`). Kiểm ở máy chủ: trần % theo ma trận ưu đãi, ưu đãi gắn kèm
 * phải đang bật, mã chung không trùng mã đã có; mã riêng sinh bằng `crypto` và tránh trùng.
 */
export async function issueVoucherBatch(
  ctx: TenantContext,
  input: VoucherBatchInput,
  repo: IVoucherBatchRepository = getVoucherBatchRepository(),
  loadPolicy: PolicyLoader = shopPromotionPolicy,
  random: () => number = cryptoRandom,
): Promise<VoucherBatchView> {
  const policy = await loadPolicy(ctx.organizationId)
  const errors = validateVoucherBatch(input, {
    maxDiscountPercent: policy.maxDiscountPercent,
    activePromotionIds: new Set(policy.promotions.map((p) => p.id)),
  })
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  let codes: string[]
  if (input.mode === "SHARED") {
    const code = normalizeCode(input.sharedCode ?? "")
    if ((await repo.existingCodes(ctx, [code])).size > 0) throw validationFailed({ sharedCode: `Mã ${code} đã có, vui lòng chọn mã khác` })
    codes = [code]
  } else {
    const prefix = input.codePrefix ? normalizeCode(input.codePrefix) : null
    codes = generateCodes(prefix, input.quantity, new Set(), random)
    // Mã ngẫu nhiên trùng mã cũ: sinh lại phần trùng, tối đa 3 lượt
    for (let round = 0; round < 3; round++) {
      const taken = await repo.existingCodes(ctx, codes)
      if (taken.size === 0) break
      const kept = codes.filter((c) => !taken.has(c))
      codes = [...kept, ...generateCodes(prefix, codes.length - kept.length, new Set([...kept, ...taken]), random)]
    }
    if (codes.length !== input.quantity || (await repo.existingCodes(ctx, codes)).size > 0) {
      throw conflict("Chưa sinh đủ mã không trùng, vui lòng thử lại")
    }
  }

  const created = await repo.createBatch(ctx, { ...input, codePrefix: input.codePrefix ? normalizeCode(input.codePrefix) : null }, codes)
  return view(created, policy, new Date())
}

export async function listVoucherBatches(
  ctx: TenantContext,
  repo: IVoucherBatchRepository = getVoucherBatchRepository(),
  loadPolicy: PolicyLoader = shopPromotionPolicy,
): Promise<{ batches: VoucherBatchView[]; promotions: ShopPromotionPolicy["promotions"]; maxDiscountPercent: number | null }> {
  const [batches, policy] = await Promise.all([repo.listBatches(ctx), loadPolicy(ctx.organizationId)])
  const now = new Date()
  return { batches: batches.map((b) => view(b, policy, now)), promotions: policy.promotions, maxDiscountPercent: policy.maxDiscountPercent }
}

/** Đợt + danh sách mã (tối đa `MAX_CODES_SHOWN`). Đợt của tổ chức khác → 404. */
export async function getVoucherBatch(
  ctx: TenantContext,
  id: string,
  repo: IVoucherBatchRepository = getVoucherBatchRepository(),
  loadPolicy: PolicyLoader = shopPromotionPolicy,
): Promise<{ batch: VoucherBatchView; codes: VoucherCodeRow[] }> {
  const batch = await repo.findBatch(ctx, id)
  if (!batch) throw notFound()
  const [codes, policy] = await Promise.all([repo.listCodes(ctx, id, MAX_CODES_SHOWN), loadPolicy(ctx.organizationId)])
  return { batch: view(batch, policy, new Date()), codes }
}

export async function setVoucherBatchActive(
  ctx: TenantContext,
  id: string,
  active: boolean,
  repo: IVoucherBatchRepository = getVoucherBatchRepository(),
): Promise<void> {
  if (!(await repo.setBatchActive(ctx, id, active))) throw notFound()
}
