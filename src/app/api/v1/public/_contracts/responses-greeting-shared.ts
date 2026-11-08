import { z } from "zod"

/**
 * Khối dùng chung cho phản hồi Thẻ chào công khai (audit API đợt 6). Sinh từ kiểu TS của use-case
 * `src/modules/greeting-card/**` (không sửa module đó — B5) rồi kiểm bằng phản hồi thật ở
 * `tests/tenant/public-contract-greeting-*.test.ts`. Khoá camelCase là hợp đồng cũ của trang khách.
 */
export const timestamp = z.iso.datetime()

export const productSnapshot = z.strictObject({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  price: z.number(),
  imageUrl: z.string().nullable(),
  driveLink: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  flowersSummary: z.string().nullable().optional(),
  selectedAt: z.string(),
})

/** Hướng dẫn chuyển khoản VietQR (cọc / trả đủ / phần còn lại). */
export const vietQrInstructions = z.strictObject({
  purpose: z.enum(["FULL", "DEPOSIT", "BALANCE"]),
  orderTotalVnd: z.number(),
  qrUrl: z.string(),
  bankName: z.string(),
  accountNo: z.string(),
  accountName: z.string(),
  amount: z.number(),
  transferMemo: z.string(),
  holdUntil: z.string().nullable().optional(),
  cancelOnExpiry: z.boolean().optional(),
})

export const paymentPlanSource = z.enum(["SHOP_DEFAULT", "CAMPAIGN", "PAYMENT_CODE"])

/** Báo giá đã tính phía máy chủ (giá mẫu, ưu đãi, phí giao, phụ thu, kế hoạch thanh toán). */
export const quote = z.strictObject({
  unitPriceVnd: z.number(),
  quantity: z.number(),
  subtotalVnd: z.number(),
  discountVnd: z.number(),
  shippingFeeVnd: z.number(),
  totalVnd: z.number(),
  shippingZone: z.strictObject({ id: z.string(), name: z.string() }).nullable(),
  voucherCode: z.string().nullable(),
  promotionDiscountVnd: z.number().optional(),
  /** Mẫu chưa niêm yết giá — tiệm sẽ báo giá. */
  awaitingQuote: z.boolean().optional(),
  craftFee: z.strictObject({ style: z.string(), label: z.string(), feeVnd: z.number(), multiplier: z.number(), holidayExtraVnd: z.number() }).optional(),
  tierDiscountVnd: z.number().optional(),
  tierLabel: z.string().optional(),
  peakHourSurchargeVnd: z.number().optional(),
  peakHourLabel: z.string().optional(),
  holidaySurchargeVnd: z.number().optional(),
  holidayName: z.string().optional(),
  paymentPlan: z
    .strictObject({
      policy: z.string(),
      depositPercent: z.number(),
      source: paymentPlanSource,
      paymentCode: z.string().nullable(),
      campaignName: z.string().nullable(),
      dueNowVnd: z.number(),
      dueLaterVnd: z.number(),
    })
    .optional(),
})

/** Kết quả gửi đơn (trang link riêng hoặc catalog Thẻ chào). */
export const submittedOrder = z.strictObject({
  sendCode: z.string(),
  orderId: z.string(),
  orderCode: z.string(),
  totalVnd: z.number(),
  quote: quote.nullable(),
  productSnapshot,
  vietQr: vietQrInstructions.nullable(),
})

/** Phản hồi `POST …/quote`: `errors` theo trường (lựa chọn sai), `fullSlots` là khung giờ đã đủ đơn. */
export const quoteResponse = z.strictObject({
  quote,
  errors: z.record(z.string(), z.string()),
  fullSlots: z.array(z.string()),
})

export const availabilityResponse = z.strictObject({
  /** `null` khi chưa đủ dữ kiện để kết luận (vd. chưa chọn ngày). */
  available: z.boolean().nullable(),
  mode: z.enum(["STOCK_QUANTITY", "DAILY_CAPACITY", "BOOKING_CALENDAR", "SCHEDULE_SLOTS"]),
  unavailableDates: z.array(z.string()).optional(),
  nextAvailableDate: z.string().nullable().optional(),
  fullSlots: z.array(z.string()).optional(),
  remainingQuantity: z.number().nullable().optional(),
  message: z.string().optional(),
  errors: z.record(z.string(), z.string()).optional(),
})

export const inquiryResponse = z.strictObject({ conversationId: z.string() })

export const shippingSettings = z.strictObject({
  zones: z.array(z.strictObject({ id: z.string(), name: z.string(), feeVnd: z.number() })),
  freeShippingOverVnd: z.number().nullable(),
  sameDayCutoffHour: z.number().nullable().optional(),
  prepHours: z.number().optional(),
  slotIds: z.array(z.string()).optional(),
  allowCustomTime: z.boolean().optional(),
  freeShippingAll: z.boolean().optional(),
  vouchersEnabled: z.boolean().optional(),
  slotCapacity: z.strictObject({ defaultMax: z.number(), perSlot: z.record(z.string(), z.number()) }).optional(),
  paymentCodesEnabled: z.boolean().optional(),
})

const locale = z.enum(["vi", "en"])
export const shopInfo = z.strictObject({
  name: z.string(),
  phone: z.string().nullable(),
  zaloUrl: z.string().nullable(),
  zaloQrUrl: z.string().nullable().optional(),
  address: z.string().nullable(),
  logoUrl: z.string().nullable(),
  email: z.string().nullable().optional(),
  websites: z.array(z.string()).optional(),
  socialLinks: z.array(z.strictObject({ label: z.string(), url: z.string() })).optional(),
  commitments: z.array(z.strictObject({ id: z.string(), title: z.string(), customerText: z.string() })).optional(),
  industry: z.string().nullable().optional(),
  languagePolicy: z
    .strictObject({
      defaultLocale: locale,
      activeLocales: z.array(locale),
      enableLanguageSwitcher: z.boolean(),
      allowInternationalPhone: z.boolean(),
      internationalPaymentGuide: z.string().nullable(),
      pendingRequest: z
        .strictObject({ requested_locales: z.array(locale), requested_at: z.string(), requested_by: z.string(), note: z.string().nullable() })
        .nullable()
        .optional(),
    })
    .optional(),
})

export const changeEntry = z.strictObject({
  field: z.enum(["recipientName", "schedule", "recipientPhone", "deliveryAddress", "shippingZone", "cardMessage", "deliveryNote", "mapUrl"]),
  label: z.string(),
  before: z.string(),
  after: z.string(),
})

export const substituteProposal = z.strictObject({
  id: z.string(),
  status: z.enum(["PENDING", "ANSWERED"]),
  reason: z.string(),
  originalName: z.string(),
  options: z.array(z.strictObject({ name: z.string(), productId: z.string(), imageUrl: z.string().nullable(), driveLink: z.string().nullable(), priceVnd: z.number() })),
  proposedAt: z.string(),
  choice: z.enum(["OPTION", "SHOP_DECIDES", "CANCEL"]).nullable(),
  choiceLabel: z.string().nullable(),
  chosenName: z.string().nullable(),
  answeredAt: z.string().nullable(),
})

export const flowerSubstituteProposal = z.strictObject({
  id: z.string(),
  status: z.enum(["PENDING", "ANSWERED"]),
  reason: z.string(),
  productName: z.string(),
  originalFlower: z.string(),
  replacementFlower: z.string(),
  replacementColor: z.string().nullable(),
  photoUrl: z.string().nullable(),
  proposedAt: z.string(),
  choice: z.enum(["ACCEPT", "DECLINE"]).nullable(),
  choiceLabel: z.string().nullable(),
  answeredAt: z.string().nullable(),
})
