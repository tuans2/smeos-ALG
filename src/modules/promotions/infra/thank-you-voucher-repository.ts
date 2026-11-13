import { prisma } from "@/core/tenancy/infra/prisma"
import type { VoucherBatchInput } from "../domain/voucher-batch"

export interface IssuedThankYouVoucher {
  code: string
  percent: number
  expiresAt: Date | null
  used: boolean
}

/**
 * Tìm hoặc phát mã cảm ơn của một đơn (ALG 5.15) trong một giao dịch có khoá theo đơn: hai lần mở
 * trang theo dõi cùng lúc vẫn chỉ ra đúng một mã. `organizationId` lấy từ bản ghi đơn ở máy chủ.
 */
export async function findOrIssueThankYouVoucher(input: {
  organizationId: string
  customerId: string
  createdBy: string
  batch: VoucherBatchInput
  /** Sinh mã ứng viên, tránh các mã trong `taken` */
  makeCode: (taken: ReadonlySet<string>) => string | null
}): Promise<IssuedThankYouVoucher | null> {
  const { organizationId, customerId, batch } = input
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`thank-you:${organizationId}:${batch.name}`}))`
    const existing = await tx.vouchers.findFirst({
      where: { organization_id: organizationId, customer_id: customerId, batch: { name: batch.name } },
      select: { code: true, discount_value: true, expires_at: true, used_count: true },
    })
    if (existing) {
      return { code: existing.code, percent: Number(existing.discount_value), expiresAt: existing.expires_at, used: existing.used_count > 0 }
    }

    const taken = new Set<string>()
    let code: string | null = null
    for (let round = 0; round < 3 && !code; round++) {
      const candidate = input.makeCode(taken)
      if (!candidate) break
      const clash = await tx.vouchers.findFirst({ where: { organization_id: organizationId, code: { equals: candidate, mode: "insensitive" } }, select: { id: true } })
      if (clash) taken.add(candidate)
      else code = candidate
    }
    if (!code) return null

    const created = await tx.voucher_batches.create({
      data: {
        organization_id: organizationId, name: batch.name, promotion_id: null, code_prefix: batch.codePrefix, quantity: 1,
        discount_type: batch.discountType, discount_value: batch.discountValue, min_order_vnd: batch.minOrderVnd,
        max_discount_vnd: batch.maxDiscountVnd, starts_at: batch.startsAt, expires_at: batch.expiresAt,
        usage_limit: batch.usageLimit, per_customer_limit: batch.perCustomerLimit, created_by: input.createdBy,
      },
    })
    await tx.vouchers.create({
      data: {
        organization_id: organizationId, customer_id: customerId, code, batch_id: created.id, promotion_id: null,
        discount_type: batch.discountType, discount_value: batch.discountValue, min_order_vnd: batch.minOrderVnd,
        max_discount_vnd: batch.maxDiscountVnd, starts_at: batch.startsAt, expires_at: batch.expiresAt,
        usage_limit: batch.usageLimit, per_customer_limit: batch.perCustomerLimit,
      },
    })
    return { code, percent: batch.discountValue, expiresAt: batch.expiresAt, used: false }
  })
}
