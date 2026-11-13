/**
 * IVoucherBatchRepository — Port Interface cho đợt phát hành mã giảm giá (Zero ORM).
 */

import type { TenantContext } from "@/core/tenancy"
import type { VoucherBatchInput, VoucherDiscountType } from "../voucher-batch"

export interface VoucherBatchSummary {
  id: string
  name: string
  promotionId: string | null
  codePrefix: string | null
  discountType: VoucherDiscountType
  discountValue: number
  minOrderVnd: number
  maxDiscountVnd: number | null
  startsAt: Date | null
  expiresAt: Date | null
  usageLimit: number | null
  perCustomerLimit: number | null
  isActive: boolean
  createdAt: Date
  codeCount: number
  /** Mã đã hết lượt */
  exhaustedCount: number
  /** Tổng lượt đã dùng của cả đợt */
  usedTotal: number
  /** Mã chung của đợt SHARED (đợt chỉ có một mã) */
  sampleCode: string | null
}

export interface VoucherCodeRow {
  code: string
  usedCount: number
  usageLimit: number | null
  isActive: boolean
  lastUsedAt: Date | null
}

export interface IVoucherBatchRepository {
  /** Các mã trong danh sách đã có ở tổ chức (so không phân biệt hoa thường) */
  existingCodes(ctx: TenantContext, codes: readonly string[]): Promise<Set<string>>
  /** Tạo đợt + toàn bộ mã + nhật ký kiểm tra trong một giao dịch */
  createBatch(ctx: TenantContext, input: VoucherBatchInput, codes: readonly string[]): Promise<VoucherBatchSummary>
  listBatches(ctx: TenantContext): Promise<VoucherBatchSummary[]>
  findBatch(ctx: TenantContext, id: string): Promise<VoucherBatchSummary | null>
  listCodes(ctx: TenantContext, batchId: string, limit: number): Promise<VoucherCodeRow[]>
  /** Bật/tạm dừng cả đợt; false = không thấy đợt trong tổ chức */
  setBatchActive(ctx: TenantContext, id: string, active: boolean): Promise<boolean>
}

export interface ClaimVoucherInput {
  organizationId: string
  voucherId: string
  orderId: string
  customerId: string | null
}

/**
 * Ghi/trả lượt dùng mã — chạy TRONG giao dịch đặt đơn/huỷ đơn của module gọi
 * (nhận client giao dịch qua factory), để lượt dùng và đơn hàng không lệch nhau.
 */
export interface IVoucherRedemptionRepository {
  /** false = mã vừa hết lượt / bị tạm dừng / khách đã dùng đủ lượt */
  claim(input: ClaimVoucherInput): Promise<boolean>
  /** Trả lại mọi lượt mã của một đơn (huỷ / từ chối đơn) */
  releaseForOrder(organizationId: string, orderId: string): Promise<void>
  /** Số lượt khách này đã dùng mã (chưa bị trả) */
  countCustomerUses(organizationId: string, voucherId: string, customerId: string): Promise<number>
}
