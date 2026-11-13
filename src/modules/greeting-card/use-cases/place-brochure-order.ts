import { queueOrderNotification } from "./notify-customer"
import { assertProductDateOpen } from "./assert-product-date-open"
import { queueStaffNotification } from "./notify-staff"
import { AppError, validationFailed } from "@/core/http/errors"
import { MAX_ORDERS_PER_PHONE_PER_HOUR, TOO_MANY_ORDERS_MESSAGE } from "../domain/order-guard"
import { generateBrochureOrderCode, normalizePhone } from "../domain/greeting-card-rules"
import { paymentInstructionsFor } from "./payment-instructions"
import type {
  BrochurePaymentInstructions,
  CustomerOrderSubmitInput,
  GreetingCatalogProduct,
  ProductSnapshot,
} from "../domain/greeting-card-types"
import type { BrochureQuote } from "../domain/brochure-pricing"
import { BrochureCheckoutRepository, getBrochureCheckoutRepository } from "../infra/brochure-checkout-repository"
import { quoteForProduct } from "./brochure-quote"
import { resolveAppliedPolicies } from "../domain/store-policy"
import { assertAcceptingPublicOrders } from "@/modules/subscription/use-cases/public-order-guard"
import { applyDiscountVisibility, readPriceVisibility } from "../domain/price-visibility"
import type { PolicyGovernanceUpper } from "@/modules/organization/domain/governance-decisions"
import { promotionNote, resolveOrderPolicies } from "../domain/order-policies"
import { snapshotOf } from "./brochure-product-mapper"
import { deliveryNoteFields } from "../domain/delivery-note"
import { slotGuardFor } from "./slot-availability"
import { assertBookingDatesAvailable, bindOrderBooking } from "@/modules/availability/use-cases/bind-order-booking"

export const DEFAULT_TIME_SLOT = "Trong ngày"

export interface BrochureOrderResult {
  /** Mã phiên để khách báo chuyển khoản (`/payment-notify`). */
  sendCode: string
  orderId: string
  orderCode: string
  totalVnd: number
  quote: BrochureQuote | null
  productSnapshot: ProductSnapshot
  /** `null` khi tiệm chưa cấu hình tài khoản nhận tiền — cửa hàng sẽ liên hệ khách. */
  vietQr: BrochurePaymentInstructions | null
}

/** Trần đơn theo SĐT mỗi giờ — giới hạn theo IP không chặn được một người đổi mạng liên tục. */
export async function assertPhoneQuota(organizationId: string, phone: string, checkout = getBrochureCheckoutRepository()) {
  const recent = await checkout.countRecentOrdersByPhone(organizationId, phone, new Date(Date.now() - 3_600_000))
  if (recent >= MAX_ORDERS_PER_PHONE_PER_HOUR) throw new AppError("RATE_LIMITED", TOO_MANY_ORDERS_MESSAGE)
}

/**
 * Báo giá lại ở server rồi tạo đơn (dùng chung cho link chào và link bộ sưu
 * tập công khai). Lựa chọn sai (size, khu vực, mã giảm giá) → 400 kèm lỗi
 * từng trường, không tạo đơn.
 */
export async function placeBrochureOrder(
  params: {
    organizationId: string
    session: { id: string; send_code: string; sale_id?: string | null | undefined }
    product: GreetingCatalogProduct
    input: CustomerOrderSubmitInput
    notePrefix: string
    shopSettings: unknown
    /** `filters` của bộ sưu tập — nguồn ưu đãi/thỏa thuận đang áp dụng. */
    catalogFilters: unknown
    /** Bộ sưu tập — phạm vi áp dụng của mã thanh toán. */
    catalogId?: string | null | undefined
    /** Khoá tầng trên của ma trận Ưu đãi / Cam kết / Chính sách. */
    governanceUpper?: PolicyGovernanceUpper | undefined
  },
  checkout = getBrochureCheckoutRepository()
): Promise<BrochureOrderResult> {
  const { organizationId, session, product, input } = params
  // Gói dịch vụ của tiệm quá hạn thanh toán → không nhận đơn qua link công khai (PO 05/11/2026)
  await assertAcceptingPublicOrders(organizationId)
  const customerPhone = normalizePhone(input.customerPhone)
  await assertPhoneQuota(organizationId, customerPhone, checkout)
  // Ngày cửa hàng đã khoá cho mẫu này → không nhận đơn (checklist ALG 2.8)
  await assertProductDateOpen(organizationId, product.id, input.deliveryDate)
  // Homestay / lưu trú: khoảng ngày đã có người giữ thì không tạo đơn (rà soát 21/10/2026, H8)
  if (input.checkOutDate && input.deliveryDate) {
    await assertBookingDatesAvailable({ organizationId, productId: product.id, checkInDate: input.deliveryDate, checkOutDate: input.checkOutDate })
  }
  // Tiệm tắt thông tin giảm giá (ALG 5.5): khách không thấy ưu đãi nên đơn không áp, không bắt chọn
  const applied = applyDiscountVisibility(resolveAppliedPolicies(params.catalogFilters, params.shopSettings, undefined, params.governanceUpper), readPriceVisibility(params.shopSettings))
  const policies = resolveOrderPolicies(applied, input)
  if (!policies.ok) throw validationFailed({ [policies.field]: policies.message })
  const promotion = policies.snapshot.promotion
  const priced = await quoteForProduct(
    organizationId,
    product,
    { ...input, customerPhone },
    params.shopSettings,
    checkout,
    promotion ? { kind: promotion.kind, percent: promotion.percent } : null,
    params.catalogFilters,
    params.catalogId ?? null,
  )
  if (Object.keys(priced.errors).length > 0) throw validationFailed(priced.errors)

  const snapshot = snapshotOf(product)
  const customerId = await checkout.findOrCreateCustomer({
    organizationId,
    customerPhone,
    customerName: input.customerName.trim(),
    deliveryAddress: input.deliveryAddress.trim(),
    email: input.customerEmail?.trim() || undefined,
  })

  const note = [params.notePrefix, priced.quote.awaitingQuote ? "[Chờ báo giá]" : "", promotionNote(policies.snapshot), input.senderNote?.trim() ?? ""]
    .filter(Boolean)
    .join(" ")
  const order = await checkout.createBrochureOrder(
    {
      organizationId,
      sessionId: session.id,
      code: generateBrochureOrderCode(),
      customerName: input.customerName.trim(),
      customerPhone,
      customerEmail: input.customerEmail?.trim() || null,
      recipientName: input.recipientName.trim(),
      recipientPhone: normalizePhone(input.recipientPhone),
      deliveryAddress: input.deliveryAddress.trim(),
      addressParts: input.addressParts ?? null,
      deliveryDate: input.deliveryDate.trim(),
      checkOutDate: input.checkOutDate?.trim() || null,
      deliveryTimeSlot: input.deliveryTimeSlot?.trim() || DEFAULT_TIME_SLOT,
      cardMessage: input.cardMessage?.trim() || null,
      delivery: deliveryNoteFields(input),
      note,
      snapshot,
      variant: priced.variant ? { id: priced.variant.id, name: priced.variant.name, stemCount: priced.variant.stemCount ?? null } : null,
      quote: priced.quote,
      voucherId: priced.voucher?.id ?? null,
      policies: policies.snapshot,
      slotGuard: slotGuardFor(params.shopSettings, input.deliveryTimeSlot),
      paymentCodeGuard: priced.paymentCodeRule ? { code: priced.paymentCodeRule.code, maxUses: priced.paymentCodeRule.maxUses } : null,
    },
    customerId
  )

  // Tự động tạo booking khóa ngày nếu là đơn Homestay / Lưu trú
  if (input.checkOutDate && input.deliveryDate && input.checkOutDate > input.deliveryDate) {
    await bindOrderBooking({
      organizationId,
      productId: product.id,
      orderId: order.id,
      checkInDate: input.deliveryDate,
      checkOutDate: input.checkOutDate,
      note: `Đặt từ Bộ sưu tập riêng / Mã đơn ${order.code}`,
    }).catch(() => null)
  }

  // Tin "Đã nhận đơn" kèm link theo dõi — chạy nền, lỗi gửi tin không ảnh hưởng đơn
  queueOrderNotification(organizationId, order.id, "ORDER_RECEIVED")
  queueStaffNotification(organizationId, "ORDER_RECEIVED", {
    orderId: order.id,
    orderCode: order.code,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    productName: product.name,
    amountVnd: priced.quote.totalVnd,
    assignedSaleId: session.sale_id ?? null,
  })

  return {
    sendCode: session.send_code,
    orderId: order.id,
    orderCode: order.code,
    totalVnd: priced.quote.totalVnd,
    quote: priced.quote,
    productSnapshot: snapshot,
    vietQr: paymentInstructionsFor(
      params.shopSettings,
      { totalVnd: priced.quote.totalVnd, paidVnd: 0, createdAt: new Date(), pricingRuleRef: { paymentPlan: priced.quote.paymentPlan } },
      order.code,
    ),
  }
}
