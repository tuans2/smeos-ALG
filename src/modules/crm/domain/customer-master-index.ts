/**
 * Customer Master Index & Field Projections (Chuẩn Hóa Ngành Hoa SSOT).
 *
 * Lưu trữ hồ sơ toàn diện của một khách hàng mua hoa:
 * Thông tin định danh, phân tầng RFM, sở thích loài hoa, dịp kỷ niệm,
 * quyền tiếp thị (Consent), và ưu đãi tích lũy.
 */

export type CustomerTier = "NEW" | "BRONZE" | "SILVER" | "GOLD" | "VIP"
export type { CustomerLifecycleStage } from "./crm-rules"

export interface CustomerOccasionItem {
  id: string
  name: string // Sinh nhật vợ, Kỷ niệm ngày cưới, Sinh nhật sếp...
  date: string // MM-DD hoặc YYYY-MM-DD
  isRecurring: boolean
  reminderDaysBefore: number
  recipientName?: string | undefined
  notes?: string | undefined
}

export interface CustomerConsentItem {
  channel: "ZALO_ZNS" | "SMS" | "PHONE_CALL" | "PROMOTION"
  granted: boolean
  grantedAt: string
  /** MI-1 (ĐP-1.5, 26/09/2026): mốc thu hồi — có giá trị thì quyền đã bị rút, dù `granted` vẫn `true` từ lần cấp trước. */
  revokedAt?: string | undefined
}

export interface CustomerVoucherItem {
  code: string
  discountType: "PERCENTAGE" | "FIXED_AMOUNT"
  discountValue: number
  expiresAt?: string | undefined
  /** MI-2 (ĐP-1.6, 26/09/2026): đơn tối thiểu để áp voucher. */
  minOrderVnd: number
  /** MI-2: trần số tiền giảm — có ý nghĩa với voucher %; voucher FIXED_AMOUNT thường không đặt. */
  maxDiscountVnd?: number | undefined
}

/** Cấu trúc Customer Master Index hoàn chỉnh */
export interface CustomerMasterIndex {
  id: string
  organizationId: string
  code: string // KH-0001
  name: string
  phone: string
  email?: string | undefined
  address?: string | undefined
  notes?: string | undefined
  tags: string[]

  // Phân tầng RFM & Giá trị mua hàng
  metrics: {
    tier: CustomerTier
    totalSpentVnd: number
    orderCount: number
    lastOrderAt?: string | undefined
    aovVnd: number // Average Order Value (Giá trị trung bình mỗi đơn)
  }

  // Sở thích thẩm mỹ & loài hoa (thu hoạch từ M01 Vision)
  preferences: {
    preferredFlowers: string[]
    preferredColors: string[]
  }

  // Dịp kỷ niệm & Người nhận
  occasions: CustomerOccasionItem[]

  // Quyền riêng tư & Tiếp thị
  consents: CustomerConsentItem[]

  // Voucher ưu đãi tích lũy
  availableVouchers: CustomerVoucherItem[]

  /** MI-3 (ĐP-2.1, 26/09/2026): `customers.updated_at` — làm phiên bản cho snapshot (Hợp đồng MI §5). */
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD PROJECTIONS (Lát cắt trích xuất trường dữ liệu theo chức năng)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. PROJECTION CHO MÀN HÌNH BÁN HÀNG & TƯ VẤN (Sales Card)
 * Hiển thị tóm tắt: Tên, SĐT, Phân hạng khách, loài hoa yêu thích, voucher sẵn có.
 */
export function projectCustomerSalesCard(customer: CustomerMasterIndex) {
  return {
    customerId: customer.id,
    customerCode: customer.code,
    name: customer.name,
    phone: customer.phone,
    tier: customer.metrics.tier,
    totalSpentVnd: customer.metrics.totalSpentVnd,
    orderCount: customer.metrics.orderCount,
    favFlowersSummary: customer.preferences.preferredFlowers.join(", ") || "Chưa ghi nhận",
    favColorsSummary: customer.preferences.preferredColors.join(", ") || "Chưa ghi nhận",
    vouchersCount: customer.availableVouchers.length,
  }
}

/**
 * 2. PROJECTION CHO NHẮC VIỆC DỊP KỶ NIỆM (Occasion Reminder)
 * Lấy danh sách dịp kỷ niệm sắp diễn ra kèm gợi ý sản phẩm phù hợp gu của khách.
 */
export function projectOccasionReminder(
  customer: CustomerMasterIndex,
  occasion: CustomerOccasionItem,
  daysLeft: number
) {
  // MI-1 (ĐP-1.5, 26/09/2026): trước bản này chỉ xét `granted`, bỏ qua
  // `revokedAt` — khách đã RÚT quyền Zalo ZNS vẫn nhận nhắc lịch. Đủ điều kiện
  // gửi là: đã cấp VÀ chưa (hoặc không còn) bị thu hồi.
  const zaloConsent = customer.consents.find((c) => c.channel === "ZALO_ZNS")
  const isZaloAllowed = Boolean(zaloConsent?.granted) && !zaloConsent?.revokedAt

  return {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    occasionName: occasion.name,
    targetDate: occasion.date,
    daysLeft,
    recipientName: occasion.recipientName || customer.name,
    // T6.12b (nợ #164b): không bịa "Hoa hồng thiết kế" / "Pastel dịu ngọt" khi khách chưa khai
    suggestedFlower: customer.preferences.preferredFlowers[0] ?? null,
    suggestedTone: customer.preferences.preferredColors[0] ?? null,
    isZaloAllowed,
  }
}

export type OccasionReminder = ReturnType<typeof projectOccasionReminder>

/**
 * 3. PROJECTION CHO CHIẾN DỊCH QUẢNG BÁ / TIẾP THỊ (Marketing Audience)
 * Chỉ trích xuất khách hàng ĐÃ ĐỒNG Ý nhận tin (Consent = true).
 */
export function projectMarketingAudience(
  customer: CustomerMasterIndex,
  channel: "ZALO_ZNS" | "SMS" | "PROMOTION"
) {
  // MI-1 (ĐP-1.5, 26/09/2026): cùng lỗi như `projectOccasionReminder` — thu
  // hồi quyền phải chặn được việc đưa khách vào danh sách tiếp thị.
  const consent = customer.consents.find((c) => c.channel === channel)
  const hasConsent = Boolean(consent?.granted) && !consent?.revokedAt
  if (!hasConsent) return null

  return {
    customerId: customer.id,
    name: customer.name,
    phone: customer.phone,
    tier: customer.metrics.tier,
    voucherCode: customer.availableVouchers[0]?.code,
  }
}

/**
 * 4. PROJECTION CHO ĐIỀU PHỐI ĐƠN HÀNG (Coordination Brief) — MI-6, ĐP-2.4, 26/09/2026
 * Trước bản này, Điều phối tự trích (`master-index-adapter.ts#extractCustomerCoordinationBrief`)
 * thay vì đọc qua CMI — sai nguyên tắc "chỉ trích lát cắt qua projection của Master Index"
 * (Hợp đồng MI §3/§7). Hàm đó đã bị XOÁ khỏi Điều phối; đây là nơi thay thế duy nhất.
 *
 * Nhận `CustomerMasterIndex` CÓ THẬT — trường hợp khách vãng lai (chưa có hồ sơ CMI) do
 * NƠI GỌI (Điều phối) tự quyết định hiển thị gì, không phải việc của projection này.
 */
export interface CustomerCoordinationBrief {
  tier: CustomerTier
  isVip: boolean
  preferredFlowers: string[]
  notes: string
}

export function projectCustomerCoordinationBrief(customer: CustomerMasterIndex): CustomerCoordinationBrief {
  return {
    tier: customer.metrics.tier,
    isVip: customer.metrics.tier === "VIP" || customer.metrics.tier === "GOLD",
    preferredFlowers: customer.preferences.preferredFlowers,
    // Không suy đoán quan hệ với khách khi CRM chưa ghi `notes` — để rỗng (cùng nguyên tắc ĐP-1.4).
    notes: customer.notes || "",
  }
}
