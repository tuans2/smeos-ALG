import { prisma } from "@/core/tenancy/infra/prisma"

import type { DbClient } from "./db-client"
import type {
  ClaimVoucherInput,
  IVoucherRedemptionRepository,
} from "../domain/repositories/voucher-batch-repository.interface"

/**
 * Lượt dùng mã giảm giá. Trừ lượt bằng MỘT câu `UPDATE … WHERE used_count < usage_limit`
 * để hai khách đặt cùng lúc không vượt tổng lượt (không đọc-rồi-ghi). `is_used` giữ nghĩa
 * "đã hết lượt" để các chỗ đọc cũ (CRM: mã khả dụng của khách) vẫn đúng.
 *
 * Giới hạn lượt MỖI KHÁCH: khoá tư vấn theo (mã, khách) rồi mới đếm — hai đơn của cùng một
 * khách gửi đồng thời phải xếp hàng. Phải gọi trong giao dịch (khoá nhả khi giao dịch kết thúc).
 */
export class VoucherRedemptionRepository implements IVoucherRedemptionRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async claim(input: ClaimVoucherInput): Promise<boolean> {
    const voucher = await this.db.vouchers.findFirst({
      where: { id: input.voucherId, organization_id: input.organizationId },
      select: { per_customer_limit: true },
    })
    if (!voucher) return false
    if (input.customerId && voucher.per_customer_limit !== null) {
      await this.db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`voucher:${input.voucherId}:${input.customerId}`}))`
      const used = await this.countCustomerUses(input.organizationId, input.voucherId, input.customerId)
      if (used >= voucher.per_customer_limit) return false
    }
    const updated = await this.db.$executeRaw`
      UPDATE "vouchers"
      SET "used_count" = "used_count" + 1,
          "is_used" = ("usage_limit" IS NOT NULL AND "used_count" + 1 >= "usage_limit"),
          "used_at" = NOW(),
          "order_id" = ${input.orderId}
      WHERE "id" = ${input.voucherId}
        AND "organization_id" = ${input.organizationId}
        AND "is_active" = true
        AND ("usage_limit" IS NULL OR "used_count" < "usage_limit")`
    if (updated === 0) return false
    await this.db.voucher_redemptions.create({
      data: {
        organization_id: input.organizationId,
        voucher_id: input.voucherId,
        order_id: input.orderId,
        customer_id: input.customerId,
      },
    })
    return true
  }

  async releaseForOrder(organizationId: string, orderId: string): Promise<void> {
    const open = await this.db.voucher_redemptions.findMany({
      where: { organization_id: organizationId, order_id: orderId, released_at: null },
      select: { id: true, voucher_id: true },
    })
    for (const r of open) {
      await this.db.$executeRaw`
        UPDATE "vouchers"
        SET "used_count" = GREATEST("used_count" - 1, 0),
            "is_used" = false,
            "used_at" = CASE WHEN "order_id" = ${orderId} THEN NULL ELSE "used_at" END,
            "order_id" = CASE WHEN "order_id" = ${orderId} THEN NULL ELSE "order_id" END
        WHERE "id" = ${r.voucher_id} AND "organization_id" = ${organizationId}`
    }
    if (open.length > 0) {
      await this.db.voucher_redemptions.updateMany({
        where: { organization_id: organizationId, id: { in: open.map((r) => r.id) } },
        data: { released_at: new Date() },
      })
    }
    // Mã dùng trước khi có bảng lượt dùng (một lượt, chỉ ghi `order_id`) — trả như cách cũ
    await this.db.vouchers.updateMany({
      where: { organization_id: organizationId, order_id: orderId, redemptions: { none: { order_id: orderId } } },
      data: { is_used: false, used_at: null, order_id: null, used_count: 0 },
    })
  }

  countCustomerUses(organizationId: string, voucherId: string, customerId: string): Promise<number> {
    return this.db.voucher_redemptions.count({
      where: { organization_id: organizationId, voucher_id: voucherId, customer_id: customerId, released_at: null },
    })
  }
}

let defaultRepo: IVoucherRedemptionRepository | null = null

/** Truyền client giao dịch (`tx`) khi gọi từ giữa giao dịch đặt/huỷ đơn. */
export function getVoucherRedemptionRepository(db?: DbClient): IVoucherRedemptionRepository {
  if (db) return new VoucherRedemptionRepository(db)
  if (!defaultRepo) defaultRepo = new VoucherRedemptionRepository()
  return defaultRepo
}
