import { notFound, validationFailed } from "@/core/http/errors"
import { assertQuotationDiscount } from "./quotation-discount-guard"
import { updateLead } from "@/modules/acquisition/use-cases/manage-leads"
import { assertWithinPriceBounds } from "@/modules/costing/use-cases/price-floor-guard"
import { productLinesCeilingBase } from "../domain/quotation-price-bounds"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import {
  calculateQuotationTotals,
  type Quotation,
  type QuotationStatus,
  validateQuotationItems,
} from "../domain/quotation"
import type {
  IQuotationRepository,
  UpdateQuotationDTO,
} from "../domain/repositories/quotation-repository.interface"
import { getQuotationRepository } from "../infra/quotation-repository"
import { QuotationRevisionRepository } from "../infra/quotation-revision-repository"
import { quotationSnapshot } from "../domain/quotation-revision"
import type { CreateQuotationItemInput } from "./create-quotation.use-case"

export interface UpdateQuotationInput {
  status?: QuotationStatus | undefined
  validUntil?: Date | string | null | undefined
  discountAmount?: number | undefined
  /** Phí vận chuyển (checklist ALG 3.8) */
  shippingFee?: number | undefined
  terms?: string | null | undefined
  notes?: string | null | undefined
  items?: CreateQuotationItemInput[] | undefined
}

export async function updateQuotationUseCase(
  ctx: TenantContext,
  id: string,
  input: UpdateQuotationInput,
  repo: IQuotationRepository = getQuotationRepository(),
  revisions: Pick<QuotationRevisionRepository, "add"> = new QuotationRevisionRepository(),
  updateLeadFn: (ctx: TenantContext, leadId: string, status: string) => Promise<unknown> = followUpLead,
  discountGuard: typeof assertQuotationDiscount = assertQuotationDiscount,
): Promise<Quotation> {
  const existing = await repo.findById(ctx, id)
  if (!existing) {
    throw notFound()
  }

  if (existing.status === "CONVERTED") {
    throw validationFailed({
      status: "Không thể chỉnh sửa báo giá đã chuyển đổi thành đơn hàng.",
    })
  }

  if (input.items !== undefined) {
    const foreign = await repo.findForeignReferences(ctx, {
      productIds: input.items.map((it) => it.productId),
    })
    if (foreign.length > 0) {
      throw notFound()
    }
  }

  const dto: UpdateQuotationDTO = {}

  if (input.status !== undefined) {
    dto.status = input.status
  }
  if (input.validUntil !== undefined) {
    dto.validUntil = input.validUntil ? new Date(input.validUntil) : null
  }
  if (input.terms !== undefined) {
    dto.terms = input.terms?.trim() ?? null
  }
  if (input.notes !== undefined) {
    dto.notes = input.notes?.trim() ?? null
  }

  if (input.items !== undefined || input.discountAmount !== undefined || input.shippingFee !== undefined) {
    const rawItems = input.items ?? existing.items
    const itemErr = validateQuotationItems(rawItems)
    if (itemErr) {
      throw validationFailed({ items: itemErr })
    }

    const effectiveDiscount = input.discountAmount ?? existing.discountAmount
    const { subtotal, discountAmount, shippingFee, totalAmount } = calculateQuotationTotals(
      rawItems,
      effectiveDiscount,
      input.shippingFee ?? existing.shippingFee,
    )
    // Trần chiết khấu: 50% nền tảng, mức Sale tự quyết của tiệm (PO 12/11/2026, BL-28)
    await discountGuard(ctx, subtotal, discountAmount)
    // Dưới sàn cần C10 (checklist ALG 3.4), vượt trần cần C9 (PO 07/11/2026, Q3)
    await assertWithinPriceBounds(
      ctx,
      rawItems.map((it) => ({ productId: it.productId, quantity: Math.max(1, Math.floor(it.qty)) })),
      totalAmount - shippingFee,
      productLinesCeilingBase(rawItems, totalAmount - shippingFee),
    )

    dto.subtotal = subtotal
    dto.discountAmount = discountAmount
    dto.shippingFee = shippingFee
    dto.totalAmount = totalAmount

    if (input.items !== undefined) {
      dto.items = input.items.map((it) => ({
        productId: it.productId ?? null,
        name: it.name.trim(),
        variantLabel: it.variantLabel?.trim() || null,
        qty: Math.max(1, Math.floor(it.qty)),
        unitPrice: Math.max(0, Math.round(it.unitPrice)),
        totalPrice: Math.max(1, Math.floor(it.qty)) * Math.max(0, Math.round(it.unitPrice)),
        note: it.note?.trim() ?? null,
      }))
    }
  }

  // Sửa nội dung (không phải chỉ đổi trạng thái) → lưu ảnh chụp bản trước khi sửa (checklist ALG 3.10)
  const contentChanged = Object.keys(dto).some((k) => k !== "status")
  if (contentChanged) await revisions.add(ctx, id, quotationSnapshot(existing))
  const updated = await repo.update(ctx, id, dto)
  // Khách từ chối báo giá → lead về "Theo dõi" (trước đây lead đứng ở "Đã báo giá" mãi — audit hành trình L2, UJ-13)
  if (dto.status === "REJECTED" && existing.status !== "REJECTED" && existing.leadId) {
    await updateLeadFn(ctx, existing.leadId, "FOLLOW_UP")
  }
  return updated
}

/** Lead đã ở trạng thái không chuyển được (vd. đã chốt bằng đơn khác) thì bỏ qua — không chặn việc lưu báo giá. */
async function followUpLead(ctx: TenantContext, leadId: string, status: string): Promise<void> {
  try {
    await updateLead(ctx, leadId, { status })
  } catch {
    // giữ nguyên lead
  }
}

