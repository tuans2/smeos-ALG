import { normalizeOrderAddress } from "../domain/delivery-address"
import { orderScheduleError } from "../domain/holiday-policy"
import { assertHolidayCapacity } from "./holiday-capacity"
import { notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { brochureEntryActions } from "../domain/brochure-entry-actions"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { BrochureOrderRepository, getBrochureOrderRepository } from "../infra/brochure-order-repository"
import { validateCustomerOrderInput } from "../domain/greeting-card-rules"
import { paymentInstructionsFor } from "./payment-instructions"
import type { CustomerOrderSubmitInput, ProductSnapshot } from "../domain/greeting-card-types"
import { loadPublicSession, resolveOrderableProduct, type PublicSession } from "./brochure-session-access"
import { placeBrochureOrder, type BrochureOrderResult } from "./place-brochure-order"
import { promotionForQuote, quoteForProduct, type QuoteRequest, type QuoteResult } from "./brochure-quote"
import { fullSlotsOn } from "./slot-availability"
import { loadPolicyGovernance } from "@/modules/organization/use-cases/governance-matrix"

export { DEFAULT_TIME_SLOT, type BrochureOrderResult } from "./place-brochure-order"

/** Khách gửi đơn từ link chào `/b/[sendCode]` (đã chọn mẫu trước đó). */
export async function submitBrochureOrder(
  sendCode: string,
  rawInput: CustomerOrderSubmitInput,
  repo = getGreetingCardRepository(),
  orders = getBrochureOrderRepository()
): Promise<BrochureOrderResult> {
  const address = normalizeOrderAddress(rawInput)
  const input = address.input
  const validation = validateCustomerOrderInput(input)
  const errors = { ...validation.errors, ...address.errors }
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  const session = await loadPublicSession(sendCode, repo)
  const shop = await repo.getShopProfile(session.organization_id)

  // Idempotent: phiên đã có đơn → trả lại đúng đơn đó (khách bấm hai lần, mạng chập chờn).
  const existing = await existingOrderResult(session, shop.settings, orders)
  if (existing) return existing
  if (!brochureEntryActions(shop.settings).order) throw notFound()

  // Đọc ngành từ settings để bỏ qua kiểm tra khung giờ giao cho HOMESTAY/FNB/SERVICES
  const industryKey = typeof (shop.settings as Record<string, unknown> | null)?.industry === "string"
    ? (shop.settings as Record<string, unknown>).industry as string
    : null

  // Giờ chốt đơn / thời gian chuẩn bị của tiệm — chặn cả khi khách gửi thẳng API
  const scheduleError = orderScheduleError(input.deliveryDate, input.deliveryTimeSlot, shop.settings, new Date(), industryKey)
  if (scheduleError) throw validationFailed({ deliveryDate: scheduleError })

  await assertHolidayCapacity(session.organization_id, input.deliveryDate, shop.settings)

  // Không còn "tự lấy mẫu đầu tiên" như bản cũ: khách phải chọn mẫu.
  if (!session.selected_product_id) {
    throw unprocessable("Vui lòng chọn sản phẩm trước khi hoàn tất đặt hàng")
  }
  // Tính lại giá từ Product Master lúc đặt — không tin ảnh chụp đã lưu.
  const product = await resolveOrderableProduct(session, session.selected_product_id, repo)

  try {
    return await placeBrochureOrder({
      organizationId: session.organization_id,
      session,
      product,
      input,
      notePrefix: `[Thẻ chào ${session.send_code}]`,
      shopSettings: shop.settings,
      catalogFilters: session.catalog.filters,
      catalogId: session.catalog_id,
      governanceUpper: await loadPolicyGovernance(session.organization_id),
    })
  } catch (error) {
    // Hai tab/hai lần bấm gửi cùng lúc: giao dịch chỉ cho một đơn gắn vào phiên, lần kia bị
    // huỷ toàn bộ. Trả lại chính đơn đã thắng thay vì báo lỗi cho khách.
    const raced = await loadPublicSession(sendCode, repo).catch(() => null)
    const won = raced ? await existingOrderResult(raced, shop.settings, orders) : null
    if (won) return won
    throw error
  }
}

async function existingOrderResult(
  session: PublicSession,
  shopSettings: unknown,
  orders: BrochureOrderRepository,
): Promise<BrochureOrderResult | null> {
  if (!session.order_id) return null
  const existing = await orders.findOrderById(session.organization_id, session.order_id)
  const snapshot = session.product_snapshot as unknown as ProductSnapshot | null
  if (!existing || !snapshot) return null
  const total = Number(existing.total_vnd)
  return {
    sendCode: session.send_code,
    orderId: existing.id,
    orderCode: existing.code,
    totalVnd: total,
    quote: null,
    productSnapshot: snapshot,
    vietQr: paymentInstructionsFor(shopSettings, { totalVnd: total, paidVnd: Number(existing.paid_vnd), createdAt: existing.created_at, pricingRuleRef: existing.pricing_rule_ref }, existing.code),
  }
}

/** Báo giá trực tiếp trên form đặt hoa của link chào (mẫu đã chọn). */
export async function quoteBrochureSession(
  sendCode: string,
  req: QuoteRequest,
  repo = getGreetingCardRepository()
): Promise<QuoteResult> {
  const session = await loadPublicSession(sendCode, repo)
  const shop = await repo.getShopProfile(session.organization_id)
  if (!brochureEntryActions(shop.settings).order) throw notFound()
  if (!session.selected_product_id) throw unprocessable("Vui lòng chọn sản phẩm trước")
  const product = await resolveOrderableProduct(session, session.selected_product_id, repo)
  const promo = promotionForQuote(session.catalog.filters, shop.settings, req.selectedPromotionId, await loadPolicyGovernance(session.organization_id))
  const result = await quoteForProduct(session.organization_id, product, req, shop.settings, undefined, promo.promotion, session.catalog.filters, session.catalog_id)
  const fullSlots = await fullSlotsOn(session.organization_id, req.deliveryDate, shop.settings)
  return { ...result, fullSlots, ...(promo.error ? { errors: { ...result.errors, selectedPromotionId: promo.error } } : {}) }
}
