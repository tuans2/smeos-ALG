import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { PublicQuotationView, Quotation, QuotationItem, QuotationStatus } from "../quotation"

export interface CreateQuotationDTO {
  code: string
  leadId?: string | null | undefined
  customerId?: string | null | undefined
  assetUsageId?: string | null | undefined
  status?: QuotationStatus | undefined
  validUntil?: Date | null | undefined
  subtotal: number
  discountAmount: number
  shippingFee: number
  totalAmount: number
  terms?: string | null | undefined
  notes?: string | null | undefined
  createdBy: string
  items: Array<{
    productId?: string | null | undefined
    name: string
    variantLabel?: string | null | undefined
    qty: number
    unitPrice: number
    totalPrice: number
    note?: string | null | undefined
  }>
}

export interface UpdateQuotationDTO {
  status?: QuotationStatus | undefined
  validUntil?: Date | null | undefined
  subtotal?: number | undefined
  discountAmount?: number | undefined
  shippingFee?: number | undefined
  totalAmount?: number | undefined
  terms?: string | null | undefined
  notes?: string | null | undefined
  convertedOrderId?: string | null | undefined
  items?: Array<{
    productId?: string | null | undefined
    name: string
    variantLabel?: string | null | undefined
    qty: number
    unitPrice: number
    totalPrice: number
    note?: string | null | undefined
  }> | undefined
}

export interface QuotationFilter {
  status?: QuotationStatus | QuotationStatus[] | undefined
  leadId?: string | undefined
  customerId?: string | undefined
  search?: string | undefined
  limit?: number | undefined
  cursor?: string | undefined
}

/** ID tham chiếu nhận từ người dùng — phải thuộc đúng tổ chức đang thao tác. */
export interface QuotationReferences {
  leadId?: string | null | undefined
  customerId?: string | null | undefined
  assetUsageId?: string | null | undefined
  productIds?: Array<string | null | undefined> | undefined
}

export interface IQuotationRepository {
  create(ctx: TenantContext, dto: CreateQuotationDTO): Promise<Quotation>
  findById(ctx: TenantContext, id: string): Promise<Quotation | null>
  findByCode(ctx: TenantContext, code: string): Promise<Quotation | null>
  /** Tra cứu cho link công khai. Không trả báo giá ở trạng thái nháp. */
  findPublicByToken(token: string): Promise<PublicQuotationView | null>
  /** Trả về tên các trường có ID không thuộc tổ chức `ctx` (rỗng = hợp lệ). */
  findForeignReferences(ctx: TenantContext, refs: QuotationReferences): Promise<string[]>
  /**
   * Chiếm quyền chuyển báo giá thành đơn: đổi trạng thái `fromStatus` → `CONVERTED`
   * bằng một câu lệnh có điều kiện. Trả `false` nếu yêu cầu khác đã chiếm trước.
   */
  claimConversion(ctx: TenantContext, id: string, fromStatus: QuotationStatus): Promise<boolean>
  /** Hoàn tác `claimConversion` khi tạo đơn thất bại. */
  releaseConversion(ctx: TenantContext, id: string, toStatus: QuotationStatus): Promise<void>
  list(
    ctx: TenantContext,
    filter?: QuotationFilter,
  ): Promise<{ items: Quotation[]; total: number; nextCursor?: string | undefined }>
  update(ctx: TenantContext, id: string, dto: UpdateQuotationDTO): Promise<Quotation>
  countByStatus(ctx: TenantContext): Promise<Record<QuotationStatus, number>>
  generateNextCode(ctx: TenantContext): Promise<string>
}
