/**
 * Thông tin để Điều hành đối chiếu khoản tiền với giá bán trước khi xác nhận thanh toán:
 * mẫu, giá công bố, giá chốt và từng lý do làm giá chốt khác giá công bố. Pure TypeScript.
 */

export interface PaymentCheck {
  productName: string
  productCode: string | null
  imageUrl: string | null
  variantName: string | null
  /** Giá công bố của mẫu lúc khách chọn; `null` = mẫu chưa niêm yết giá. */
  listedPriceVnd: number | null
  /** Giá chốt = tổng khách phải trả. */
  agreedTotalVnd: number
  /** Các khoản làm giá chốt khác giá công bố, theo thứ tự tính. */
  reasons: string[]
  /** Ưu đãi khách đã chọn lúc đặt (cả loại tặng kèm, không đổi tiền) — để Điều hành/xưởng thấy. */
  promotion: string | null
}

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" ? (v as Loose) : {})
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

export function paymentCheckOf(order: {
  total_vnd: number
  pricing_rule_ref?: unknown
  items?: Array<{ metadata?: unknown; quantity?: number; unit_price_vnd?: number }>
  greeting_sessions?: Array<{ product_snapshot?: unknown }>
  /** Thông tin mẫu dựng sẵn ở server (SSOT `orderProductView`) — có thì dùng thay cho tự đọc ảnh chụp mẫu. */
  product?: { name: string; code: string | null; imageUrl: string | null }
}): PaymentCheck {
  const snap = obj(order.greeting_sessions?.[0]?.product_snapshot)
  const item = order.items?.[0]
  const meta = obj(item?.metadata)
  const quote = obj(order.pricing_rule_ref)
  const listed = num(snap.price) ?? num(meta.price)
  const variantName = str(obj(meta.variant).name)
  const unit = num(quote.unitPriceVnd) ?? item?.unit_price_vnd ?? null
  const qty = num(quote.quantity) ?? item?.quantity ?? 1

  const reasons: string[] = []
  if (quote.awaitingQuote === true || num(quote.quotedTotalVnd) !== null) {
    const r = str(quote.quoteReason)
    reasons.push(`Cửa hàng báo giá sau${num(quote.quotedTotalVnd) !== null ? `: ${vnd(num(quote.quotedTotalVnd)!)}` : " (chưa báo)"}${r ? ` — ${r}` : ""}`)
  }
  if (variantName && unit !== null && listed !== null && unit !== listed) reasons.push(`Kích cỡ "${variantName}": ${vnd(unit)}`)
  if (qty > 1) reasons.push(`Số lượng ×${qty}`)
  const discount = num(quote.discountVnd) ?? 0
  if (discount > 0) reasons.push(`Mã giảm giá ${str(quote.voucherCode) ?? ""}: −${vnd(discount)}`.replace("  ", " "))
  const manual = obj(quote.manualDiscount)
  if (num(manual.vnd)) {
    const why = [str(manual.reason), str(manual.note)].filter(Boolean).join(" · ")
    reasons.push(`Giảm giá được duyệt${num(manual.percent) ? ` ${num(manual.percent)}%` : ""}: −${vnd(num(manual.vnd)!)}${why ? ` — ${why}` : ""}`)
  }
  const holiday = num(quote.holidaySurchargeVnd) ?? 0
  if (holiday > 0) reasons.push(`Phụ phí ngày lễ${str(quote.holidayName) ? ` (${str(quote.holidayName)})` : ""}: +${vnd(holiday)}`)
  const redeliver = num(quote.redeliveryFeesVnd) ?? 0
  if (redeliver > 0) reasons.push(`Phí giao lại: +${vnd(redeliver)}`)
  const ship = num(quote.shippingFeeVnd) ?? 0
  const zone = str(obj(quote.shippingZone).name)
  if (ship > 0) reasons.push(`Phí giao${zone ? ` ${zone}` : ""}: +${vnd(ship)}`)
  const promo = obj(obj(quote.policies).promotion)
  const promoTitle = str(promo.title)
  const promoVnd = num(quote.promotionDiscountVnd) ?? 0
  if (promoVnd > 0) reasons.push(`Ưu đãi ${promoTitle ?? ""}: −${vnd(promoVnd)}`.replace("  ", " "))
  const pendingPercent = quote.awaitingQuote === true && promo.kind === "PERCENT_OFF" ? num(promo.percent) : null
  const promotion = !promoTitle
    ? null
    : pendingPercent
      ? `${promoTitle} — máy tự trừ ${pendingPercent}% trên giá bạn báo`
      : promo.kind === "PERCENT_OFF" || promo.kind === "FREE_SHIPPING"
        ? promoTitle
        : `${promoTitle} (tặng kèm, không đổi tiền)`

  return {
    productName: order.product?.name ?? str(snap.name) ?? str(meta.name) ?? "Sản phẩm",
    productCode: order.product ? order.product.code : str(snap.code) ?? str(meta.code),
    imageUrl: order.product ? order.product.imageUrl : str(snap.imageUrl) ?? str(meta.imageUrl),
    variantName,
    listedPriceVnd: listed && listed > 0 ? listed : null,
    agreedTotalVnd: order.total_vnd,
    reasons,
    promotion,
  }
}
