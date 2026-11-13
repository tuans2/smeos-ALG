/**
 * ĐP-3 §6.2 mục 3.3 — Danh mục hành vi: các cách máy hiểu một giá trị danh
 * mục "CÓ HÀNH VI" (Đặc tả trường §2.15, §16.2). Quản trị nền tảng tạo giá
 * trị danh mục mới được, nhưng phải CHỌN một hành vi có sẵn Ở ĐÂY — không
 * tự gõ tên hành vi tự do. Đây là LỚP MÃ (không đổi lúc chạy); lớp cấu hình
 * (bảng `field_catalog_values.behavior`/`params`) chỉ được trỏ vào các mã
 * hành vi liệt kê dưới đây (`isKnownBehavior`, dùng bởi `field-rules.ts` khi
 * ghi và bởi `scripts/check-field-registry.ts` khi kiểm tra tĩnh).
 *
 * Tệp thuần — không import Prisma, test được không cần cơ sở dữ liệu.
 */

// ── SLA (serviceLevel, Đặc tả trường §2.15.2) ───────────────────────────────

export type SlaBehaviorKind = "OFFSET" | "EXACT" | "WINDOW" | "END_OF_DAY"

export interface SlaBehaviorDefinition {
  readonly kind: SlaBehaviorKind
  readonly label: string
  /** Tham số mặc định — quản trị nền tảng sửa được qua `field_catalog_values.params`. */
  readonly defaultParams: Record<string, number>
}

export const SLA_BEHAVIORS: Record<SlaBehaviorKind, SlaBehaviorDefinition> = {
  OFFSET: {
    kind: "OFFSET",
    label: "Cộng N phút từ lúc chốt đơn (giao nhanh)",
    defaultParams: { offsetMinutes: 120 },
  },
  EXACT: {
    kind: "EXACT",
    label: "Đúng giờ hẹn ± dung sai (hẹn đúng giờ)",
    defaultParams: { toleranceMinutes: 30 },
  },
  WINDOW: {
    kind: "WINDOW",
    label: "Trong khung giờ đã chọn (theo khung giờ)",
    defaultParams: {},
  },
  END_OF_DAY: {
    kind: "END_OF_DAY",
    label: "Trước giờ đóng cửa của ngày giao (trong ngày)",
    defaultParams: { closingHour: 21 },
  },
}

// ── Bậc ưu tiên (priority, §2.15.1) ─────────────────────────────────────────

export type PriorityTierBehaviorKind = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4"

export interface PriorityTierDefinition {
  readonly kind: PriorityTierBehaviorKind
  readonly tier: 1 | 2 | 3 | 4
  readonly label: string
}

export const PRIORITY_TIER_BEHAVIORS: Record<PriorityTierBehaviorKind, PriorityTierDefinition> = {
  TIER_1: { kind: "TIER_1", tier: 1, label: "Thường — mặc định" },
  TIER_2: { kind: "TIER_2", tier: 2, label: "Cao — khách VIP/GOLD, đơn giá trị lớn, ngày cao điểm" },
  TIER_3: { kind: "TIER_3", tier: 3, label: "Gấp — serviceLevel EXPRESS hoặc còn ít thời gian" },
  TIER_4: { kind: "TIER_4", tier: 4, label: "Khẩn cấp — giờ cố định không lùi được, hoặc đang leo thang" },
}

// ── Nhóm trường có điều kiện (§12) — orderType và deliveryLocationType ──────

export type ConditionalFieldGroup =
  | "SYMPATHY" // Tang lễ
  | "GRAND_OPENING" // Khai trương
  | "WEDDING_EVENT" // Cưới / sự kiện
  | "CORPORATE" // Doanh nghiệp
  | "SUBSCRIPTION" // Định kỳ
  | "OFFICE_BUILDING" // Văn phòng / công ty
  | "HOSPITAL" // Bệnh viện
  | "HOTEL" // Khách sạn
  | "VENUE" // Nhà hàng / hội trường / nhà tang lễ

export interface OrderTypeBehaviorDefinition {
  readonly kind: string
  readonly label: string
  readonly conditionalGroups: readonly ConditionalFieldGroup[]
}

/**
 * Hành vi cho từng giá trị `orderType` (§2.15.4). Khoá TRÙNG với mã giá
 * trị danh mục thật (`GIFT`, `SYMPATHY`…) — quan hệ 1-1, không cần lớp bí
 * danh, khác với `SLA`/`PRIORITY_TIER`/`PAYMENT_METHOD` (nhiều mã cùng một
 * hành vi) ở trên.
 */
export const ORDER_TYPE_BEHAVIORS: Record<string, OrderTypeBehaviorDefinition> = {
  GIFT: { kind: "GIFT", label: "Quà tặng", conditionalGroups: [] },
  SYMPATHY: { kind: "SYMPATHY", label: "Chia buồn / tang lễ", conditionalGroups: ["SYMPATHY"] },
  GRAND_OPENING: {
    kind: "GRAND_OPENING",
    label: "Khai trương / chúc mừng",
    conditionalGroups: ["GRAND_OPENING"],
  },
  WEDDING_EVENT: {
    kind: "WEDDING_EVENT",
    label: "Cưới / sự kiện / hội nghị",
    conditionalGroups: ["WEDDING_EVENT"],
  },
  CORPORATE: { kind: "CORPORATE", label: "Doanh nghiệp", conditionalGroups: ["CORPORATE"] },
  SUBSCRIPTION: { kind: "SUBSCRIPTION", label: "Định kỳ", conditionalGroups: ["SUBSCRIPTION"] },
}

/** Hành vi cho từng giá trị `deliveryLocationType` (§2.15.5) — khoá trùng mã giá trị. */
export const DELIVERY_LOCATION_BEHAVIORS: Record<string, OrderTypeBehaviorDefinition> = {
  HOME: { kind: "HOME", label: "Nhà riêng", conditionalGroups: [] },
  OFFICE: { kind: "OFFICE", label: "Văn phòng / công ty", conditionalGroups: ["OFFICE_BUILDING"] },
  HOSPITAL: { kind: "HOSPITAL", label: "Bệnh viện", conditionalGroups: ["HOSPITAL"] },
  HOTEL: { kind: "HOTEL", label: "Khách sạn", conditionalGroups: ["HOTEL"] },
  VENUE: { kind: "VENUE", label: "Nhà hàng / hội trường / nhà tang lễ", conditionalGroups: ["VENUE"] },
  OTHER: { kind: "OTHER", label: "Khác", conditionalGroups: [] },
}

// ── deliveryType: cần địa chỉ giao? cần lắp đặt? (§2.15.5) ──────────────────

export interface DeliveryTypeBehaviorDefinition {
  readonly kind: string
  readonly label: string
  readonly requiresAddress: boolean
  readonly requiresInstallation: boolean
}

export const DELIVERY_TYPE_BEHAVIORS: Record<string, DeliveryTypeBehaviorDefinition> = {
  DELIVERY: {
    kind: "DELIVERY",
    label: "Giao tận nơi cho người nhận",
    requiresAddress: true,
    requiresInstallation: false,
  },
  STORE_PICKUP: {
    kind: "STORE_PICKUP",
    label: "Khách nhận tại tiệm",
    requiresAddress: false,
    requiresInstallation: false,
  },
  ONSITE_SETUP: {
    kind: "ONSITE_SETUP",
    label: "Giao và lắp đặt tại địa điểm",
    requiresAddress: true,
    requiresInstallation: true,
  },
}

// ── Thanh toán: cần bằng chứng? có phải thu hộ? (§2.15.7) ───────────────────

export interface PaymentMethodBehaviorDefinition {
  readonly kind: string
  readonly label: string
  readonly requiresEvidence: boolean
}

export const PAYMENT_METHOD_BEHAVIORS: Record<string, PaymentMethodBehaviorDefinition> = {
  PAYMENT_NO_EVIDENCE: { kind: "PAYMENT_NO_EVIDENCE", label: "Không cần ảnh bằng chứng", requiresEvidence: false },
  PAYMENT_REQUIRES_EVIDENCE: {
    kind: "PAYMENT_REQUIRES_EVIDENCE",
    label: "Cần ảnh bằng chứng (chuyển khoản, ví điện tử)",
    requiresEvidence: true,
  },
}

export interface CollectionMethodBehaviorDefinition {
  readonly kind: string
  readonly label: string
  readonly isCollectOnDelivery: boolean
}

export const COLLECTION_METHOD_BEHAVIORS: Record<string, CollectionMethodBehaviorDefinition> = {
  COLLECTION_ON_DELIVERY: {
    kind: "COLLECTION_ON_DELIVERY",
    label: "Thu hộ khi giao (shipper thu)",
    isCollectOnDelivery: true,
  },
  COLLECTION_NOT_ON_DELIVERY: {
    kind: "COLLECTION_NOT_ON_DELIVERY",
    label: "Không phải thu hộ (đã thu trước/tại tiệm/xuất hoá đơn)",
    isCollectOnDelivery: false,
  },
}

/** Một "loại hành vi" — ứng với `field_catalogs.behavior_kind`. */
export type BehaviorKind =
  | "SLA"
  | "PRIORITY_TIER"
  | "ORDER_TYPE"
  | "DELIVERY_LOCATION"
  | "DELIVERY_TYPE"
  | "PAYMENT_METHOD"
  | "COLLECTION_METHOD"

const BEHAVIOR_REGISTRIES: Record<BehaviorKind, Record<string, unknown>> = {
  SLA: SLA_BEHAVIORS,
  PRIORITY_TIER: PRIORITY_TIER_BEHAVIORS,
  ORDER_TYPE: ORDER_TYPE_BEHAVIORS,
  DELIVERY_LOCATION: DELIVERY_LOCATION_BEHAVIORS,
  DELIVERY_TYPE: DELIVERY_TYPE_BEHAVIORS,
  PAYMENT_METHOD: PAYMENT_METHOD_BEHAVIORS,
  COLLECTION_METHOD: COLLECTION_METHOD_BEHAVIORS,
}

export const ALL_BEHAVIOR_KINDS: readonly BehaviorKind[] = Object.keys(BEHAVIOR_REGISTRIES) as BehaviorKind[]

export function isKnownBehaviorKind(value: string): value is BehaviorKind {
  return value in BEHAVIOR_REGISTRIES
}

/** Mã hành vi (`behavior`) có thật trong code cho một `behavior_kind` cho trước không? */
export function isKnownBehaviorCode(kind: string, code: string): boolean {
  if (!isKnownBehaviorKind(kind)) return false
  return code in BEHAVIOR_REGISTRIES[kind]
}

export function listBehaviorCodes(kind: BehaviorKind): string[] {
  return Object.keys(BEHAVIOR_REGISTRIES[kind])
}
