import { normalizeOrderAddress } from "../domain/delivery-address"
import { defaultOwnerOf } from "./share-links"
import { orderScheduleError } from "../domain/holiday-policy"
import { assertHolidayCapacity } from "./holiday-capacity"
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { SOLD_OUT_MESSAGE } from "../domain/product-availability"
import { brochureEntryActions } from "../domain/brochure-entry-actions"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { validateCustomerOrderInput, normalizePhone } from "../domain/greeting-card-rules"
import type { CustomerOrderSubmitInput, GreetingCatalogProduct } from "../domain/greeting-card-types"
import { collectImageAssetIds, snapshotOf, toCatalogProduct } from "./brochure-product-mapper"
import { applyPriceVisibility, readPriceVisibility } from "../domain/price-visibility"
import { assertPhoneQuota, placeBrochureOrder, type BrochureOrderResult } from "./place-brochure-order"
import { paymentInstructionsFor } from "./payment-instructions"
import { BrochureCheckoutRepository, getBrochureCheckoutRepository } from "../infra/brochure-checkout-repository"
import { DUPLICATE_ORDER_WINDOW_MS, isSameOrder } from "../domain/order-guard"
import type { ProductSnapshot } from "../domain/greeting-card-types"
import { promotionForQuote, quoteForProduct, type QuoteRequest, type QuoteResult } from "./brochure-quote"
import { assertSlotOpen, fullSlotsOn } from "./slot-availability"
import { loadPolicyGovernance } from "@/modules/organization/use-cases/governance-matrix"

export interface PublicCatalogOrderInput extends CustomerOrderSubmitInput {
  productId: string
}

type PublicCatalog = NonNullable<Awaited<ReturnType<GreetingCardRepository["getPublicCatalogById"]>>>

/** Mẫu thuộc catalog công khai (mẫu chưa niêm yết giá vẫn đặt được, cửa hàng báo giá sau). */
async function orderableFromCatalog(
  catalogId: string,
  productId: string,
  repo: GreetingCardRepository
): Promise<{ catalog: PublicCatalog; product: GreetingCatalogProduct }> {
  const catalog = await repo.getPublicCatalogById(catalogId)
  if (!catalog) throw notFound()
  // Chủ cửa hàng tắt "Đặt hàng" cho Bộ sưu tập riêng → không báo giá / nhận đơn
  if (!brochureEntryActions(catalog.organization.settings).order) throw notFound()
  const item = catalog.items.find((i) => i.product.id === productId)
  if (!item) throw notFound()
  const urls = await repo.getAssetsStorageMap(catalog.organization_id, collectImageAssetIds([item]))
  const product = applyPriceVisibility(toCatalogProduct(item, urls), readPriceVisibility(catalog.organization.settings))
  if (product.available === false) throw conflict(SOLD_OUT_MESSAGE)
  return { catalog, product }
}

/**
 * Link chung không có phiên trước khi đặt nên không chống trùng theo phiên được: cùng SĐT, cùng mẫu,
 * cùng người nhận, cùng ngày giao trong 10 phút → trả lại đơn vừa tạo (khách bấm lại / mạng chập chờn).
 */
async function recentDuplicate(
  organizationId: string, catalogId: string, product: GreetingCatalogProduct, input: CustomerOrderSubmitInput,
  shopSettings: unknown, checkout: BrochureCheckoutRepository,
): Promise<BrochureOrderResult | null> {
  const rows = await checkout.findRecentPublicOrders({
    organizationId, catalogId, customerPhone: normalizePhone(input.customerPhone), productId: product.id,
    since: new Date(Date.now() - DUPLICATE_ORDER_WINDOW_MS),
  })
  const incoming = { recipientPhone: normalizePhone(input.recipientPhone), deliveryDate: input.deliveryDate.trim() }
  for (const r of rows) {
    const o = r.order
    if (!o || o.status === "CANCELLED") continue
    const addr = (o.delivery_address ?? {}) as { phone?: string }
    const win = (o.delivery_window ?? {}) as { date?: string }
    if (!isSameOrder({ recipientPhone: addr.phone ?? null, deliveryDate: win.date ?? null }, incoming)) continue
    const total = Number(o.total_vnd)
    return {
      sendCode: r.send_code, orderId: o.id, orderCode: o.code, totalVnd: total, quote: null,
      productSnapshot: r.product_snapshot as unknown as ProductSnapshot,
      vietQr: paymentInstructionsFor(shopSettings, { totalVnd: total, paidVnd: Number(o.paid_vnd), createdAt: o.created_at, pricingRuleRef: o.pricing_rule_ref }, o.code),
    }
  }
  return null
}

/** Đặt hoa trực tiếp từ link bộ sưu tập công khai `/g/...` (không qua link chào riêng). */
export async function submitPublicCatalogOrder(
  catalogId: string,
  rawInput: PublicCatalogOrderInput,
  repo = getGreetingCardRepository(),
  checkout = getBrochureCheckoutRepository()
): Promise<BrochureOrderResult> {
  const address = normalizeOrderAddress(rawInput)
  const input = address.input
  const validation = validateCustomerOrderInput(input)
  const errors = { ...validation.errors, ...address.errors }
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  const { catalog, product } = await orderableFromCatalog(catalogId, input.productId, repo)
  const shop = await repo.getShopProfile(catalog.organization_id)

  // Đọc ngành từ settings để bỏ qua kiểm tra khung giờ giao cho HOMESTAY/FNB/SERVICES
  const industryKey = typeof (shop.settings as Record<string, unknown> | null)?.industry === "string"
    ? (shop.settings as Record<string, unknown>).industry as string
    : null

  // Giờ chốt đơn / thời gian chuẩn bị của tiệm — chặn cả khi khách gửi thẳng API
  const scheduleError = orderScheduleError(input.deliveryDate, input.deliveryTimeSlot, shop.settings, new Date(), industryKey)
  if (scheduleError) throw validationFailed({ deliveryDate: scheduleError })

  // Kiểm lựa chọn TRƯỚC khi tạo phiên — tránh phiên mồ côi khi khách chọn sai khu vực/mã giảm giá
  const precheck = await quoteForProduct(
    catalog.organization_id,
    product,
    { ...input, customerPhone: normalizePhone(input.customerPhone) },
    shop.settings,
    undefined,
    null,
    catalog.filters,
    catalog.id,
  )
  if (Object.keys(precheck.errors).length > 0) throw validationFailed(precheck.errors)

  const duplicate = await recentDuplicate(catalog.organization_id, catalog.id, product, input, shop.settings, checkout)
  if (duplicate) return duplicate
  // Ngày lễ đủ số đơn tối đa → không nhận thêm (sau bước chống trùng: khách bấm lại vẫn nhận lại đơn cũ)
  await assertHolidayCapacity(catalog.organization_id, input.deliveryDate, shop.settings)
  // Kiểm trần đơn (theo SĐT, theo khung giờ) TRƯỚC khi tạo phiên — tránh phiên mồ côi
  await assertPhoneQuota(catalog.organization_id, normalizePhone(input.customerPhone), checkout)
  await assertSlotOpen(catalog.organization_id, input, shop.settings, checkout)

  const session = await repo.createPublicSession({
    saleId: await defaultOwnerOf(catalog.organization_id),
    organizationId: catalog.organization_id,
    catalogId: catalog.id,
    customerName: input.customerName.trim(),
    customerPhone: normalizePhone(input.customerPhone),
    productId: product.id,
    snapshot: snapshotOf(product),
  })

  return placeBrochureOrder({
    organizationId: catalog.organization_id,
    session,
    product,
    input,
    notePrefix: `[Đặt từ Link công khai /g/${catalog.code}]`,
    shopSettings: shop.settings,
    catalogFilters: catalog.filters,
    catalogId: catalog.id,
    governanceUpper: await loadPolicyGovernance(catalog.organization_id),
  })
}

/** Báo giá trên form đặt hoa của link bộ sưu tập công khai. */
export async function quotePublicCatalog(
  catalogId: string,
  productId: string,
  req: QuoteRequest,
  repo = getGreetingCardRepository()
): Promise<QuoteResult> {
  const { catalog, product } = await orderableFromCatalog(catalogId, productId, repo)
  const shop = await repo.getShopProfile(catalog.organization_id)
  const promo = promotionForQuote(catalog.filters, shop.settings, req.selectedPromotionId, await loadPolicyGovernance(catalog.organization_id))
  const result = await quoteForProduct(catalog.organization_id, product, req, shop.settings, undefined, promo.promotion, catalog.filters, catalog.id)
  const fullSlots = await fullSlotsOn(catalog.organization_id, req.deliveryDate, shop.settings)
  return { ...result, fullSlots, ...(promo.error ? { errors: { ...result.errors, selectedPromotionId: promo.error } } : {}) }
}
