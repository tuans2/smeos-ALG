import { notFound, validationFailed } from "@/core/http/errors"
import { assertWithinPriceBounds } from "@/modules/costing/use-cases/price-floor-guard"
import { productLinesCeilingBase } from "../domain/quotation-price-bounds"
import { assertQuotationDiscount } from "./quotation-discount-guard"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import {
  calculateQuotationTotals,
  type Quotation,
  validateQuotationItems,
} from "../domain/quotation"
import type { IQuotationRepository } from "../domain/repositories/quotation-repository.interface"
import { getQuotationRepository } from "../infra/quotation-repository"

export interface CreateQuotationItemInput {
  productId?: string | null | undefined
  name: string
  /** Phiên bản kích cỡ khách chọn (checklist ALG 3.8) */
  variantLabel?: string | null | undefined
  qty: number
  unitPrice: number
  note?: string | null | undefined
}

export interface CreateQuotationInput {
  leadId?: string | null | undefined
  customerId?: string | null | undefined
  assetUsageId?: string | null | undefined
  validUntil?: Date | string | null | undefined
  discountAmount?: number | undefined
  /** Phí vận chuyển (checklist ALG 3.8) */
  shippingFee?: number | undefined
  terms?: string | null | undefined
  notes?: string | null | undefined
  items: CreateQuotationItemInput[]
}

export async function createQuotationUseCase(
  ctx: TenantContext,
  input: CreateQuotationInput,
  repo: IQuotationRepository = getQuotationRepository(),
  discountGuard: typeof assertQuotationDiscount = assertQuotationDiscount,
): Promise<Quotation> {
  const itemErr = validateQuotationItems(input.items)
  if (itemErr) {
    throw validationFailed({ items: itemErr })
  }

  // ID tham chiếu đến từ body: không thuộc tổ chức → 404, không tiết lộ bản ghi tồn tại ở nơi khác.
  const foreign = await repo.findForeignReferences(ctx, {
    leadId: input.leadId,
    customerId: input.customerId,
    assetUsageId: input.assetUsageId,
    productIds: input.items.map((it) => it.productId),
  })
  if (foreign.length > 0) {
    throw notFound()
  }

  const { subtotal, discountAmount, shippingFee, totalAmount } = calculateQuotationTotals(
    input.items,
    input.discountAmount ?? 0,
    input.shippingFee ?? 0,
  )
  // Trần chiết khấu: 50% nền tảng, mức Sale tự quyết của tiệm (PO 12/11/2026, BL-28)
  await discountGuard(ctx, subtotal, discountAmount)
  // Dưới sàn cần C10 (checklist ALG 3.4), vượt trần cần C9 (PO 07/11/2026, Q3)
  await assertWithinPriceBounds(
    ctx,
    input.items.map((it) => ({ productId: it.productId, quantity: Math.max(1, Math.floor(it.qty)) })),
    totalAmount - shippingFee,
    productLinesCeilingBase(input.items, totalAmount - shippingFee),
  )

  const code = await repo.generateNextCode(ctx)

  const items = input.items.map((it) => ({
    productId: it.productId ?? null,
    name: it.name.trim(),
    variantLabel: it.variantLabel?.trim() || null,
    qty: Math.max(1, Math.floor(it.qty)),
    unitPrice: Math.max(0, Math.round(it.unitPrice)),
    totalPrice: Math.max(1, Math.floor(it.qty)) * Math.max(0, Math.round(it.unitPrice)),
    note: it.note?.trim() ?? null,
  }))

  const validUntilDate = input.validUntil ? new Date(input.validUntil) : null

  return repo.create(ctx, {
    code,
    leadId: input.leadId ?? null,
    customerId: input.customerId ?? null,
    assetUsageId: input.assetUsageId ?? null,
    status: "DRAFT",
    validUntil: validUntilDate,
    subtotal,
    discountAmount,
    shippingFee,
    totalAmount,
    terms: input.terms?.trim() ?? null,
    notes: input.notes?.trim() ?? null,
    createdBy: ctx.userId ?? "system",
    items,
  })
}

