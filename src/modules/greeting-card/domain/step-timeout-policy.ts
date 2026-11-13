/**
 * Chính sách thời gian tự động huỷ theo từng bước quy trình Thẻ chào (Step Timeout Policy).
 * Hỗ trợ kế thừa 2 tầng:
 *   1. Mặc định toàn tiệm: organizations.settings.step_timeout_policy
 *   2. Ghi đè theo Thẻ chào / Bộ sưu tập: greeting_catalogs.filters.stepTimeoutOverride
 * Pure TypeScript — No Prisma, No external I/O.
 */

export const STEP_TIMEOUT_SETTINGS_KEY = "step_timeout_policy"
export const CATALOG_TIMEOUT_OVERRIDE_KEY = "stepTimeoutOverride"

export interface StepTimeoutPolicy {
  /** 1. Quá hạn mở link: Khách không mở link sau X giờ -> tự động vô hiệu link & huỷ phiên (1–720h). */
  unopenedExpiryHours: number
  autoCancelUnopened: boolean

  /** 2. Đang lướt chọn mẫu: Khách đã mở nhưng không chọn hoa/đặt đơn sau Y giờ -> tự động huỷ phiên (1–168h). */
  browsingExpiryHours: number
  autoCancelBrowsing: boolean

  /** 3. Chờ thanh toán / cọc: Quá Z phút mà chưa nhận tiền -> tự động huỷ đơn (5–1440m). */
  unpaidExpiryMinutes: number
  autoCancelUnpaid: boolean

  /** 4. Chờ khách duyệt ảnh hoa: Quá T phút khách không phản hồi -> tự động duyệt ảnh (5–120m). */
  photoReviewTimeoutMinutes: number
  autoApprovePhotoOnTimeout: boolean
}

export const DEFAULT_STEP_TIMEOUT_POLICY: StepTimeoutPolicy = {
  unopenedExpiryHours: 24, // 24 giờ
  autoCancelUnopened: true,
  browsingExpiryHours: 12, // 12 giờ
  autoCancelBrowsing: true,
  unpaidExpiryMinutes: 30, // 30 phút
  autoCancelUnpaid: true,
  photoReviewTimeoutMinutes: 15, // 15 phút
  autoApprovePhotoOnTimeout: true,
}

export interface CatalogTimeoutOverride {
  enabled: boolean
  policy?: Partial<StepTimeoutPolicy> | undefined
}

export type EffectiveStepTimeoutPolicy = StepTimeoutPolicy & {
  source: "STORE" | "CATALOG_OVERRIDE"
}

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val === "number" && Number.isInteger(val) && val >= min && val <= max) {
    return val
  }
  return fallback
}

export function parseStepTimeoutPolicy(settings: unknown): StepTimeoutPolicy {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = root[STEP_TIMEOUT_SETTINGS_KEY]
  if (!raw || typeof raw !== "object") return DEFAULT_STEP_TIMEOUT_POLICY
  const r = raw as Record<string, unknown>

  return {
    unopenedExpiryHours: clampInt(r.unopened_expiry_hours, 1, 720, DEFAULT_STEP_TIMEOUT_POLICY.unopenedExpiryHours),
    autoCancelUnopened: r.auto_cancel_unopened !== false,
    browsingExpiryHours: clampInt(r.browsing_expiry_hours, 1, 168, DEFAULT_STEP_TIMEOUT_POLICY.browsingExpiryHours),
    autoCancelBrowsing: r.auto_cancel_browsing !== false,
    unpaidExpiryMinutes: clampInt(r.unpaid_expiry_minutes, 5, 1440, DEFAULT_STEP_TIMEOUT_POLICY.unpaidExpiryMinutes),
    autoCancelUnpaid: r.auto_cancel_unpaid !== false,
    photoReviewTimeoutMinutes: clampInt(r.photo_review_timeout_minutes, 5, 120, DEFAULT_STEP_TIMEOUT_POLICY.photoReviewTimeoutMinutes),
    autoApprovePhotoOnTimeout: r.auto_approve_photo_on_timeout !== false,
  }
}

export function serializeStepTimeoutPolicy(policy: StepTimeoutPolicy): Record<string, unknown> {
  return {
    unopened_expiry_hours: policy.unopenedExpiryHours,
    auto_cancel_unopened: policy.autoCancelUnopened,
    browsing_expiry_hours: policy.browsingExpiryHours,
    auto_cancel_browsing: policy.autoCancelBrowsing,
    unpaid_expiry_minutes: policy.unpaidExpiryMinutes,
    auto_cancel_unpaid: policy.autoCancelUnpaid,
    photo_review_timeout_minutes: policy.photoReviewTimeoutMinutes,
    auto_approve_photo_on_timeout: policy.autoApprovePhotoOnTimeout,
  }
}

export function parseCatalogTimeoutOverride(filters: unknown): CatalogTimeoutOverride | null {
  if (!filters || typeof filters !== "object") return null
  const raw = (filters as Record<string, unknown>)[CATALOG_TIMEOUT_OVERRIDE_KEY]
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (r.enabled !== true) return null

  const p = (r.policy && typeof r.policy === "object" ? r.policy : {}) as Record<string, unknown>
  return {
    enabled: true,
    policy: {
      ...(typeof p.unopenedExpiryHours === "number" ? { unopenedExpiryHours: clampInt(p.unopenedExpiryHours, 1, 720, DEFAULT_STEP_TIMEOUT_POLICY.unopenedExpiryHours) } : {}),
      ...(typeof p.autoCancelUnopened === "boolean" ? { autoCancelUnopened: p.autoCancelUnopened } : {}),
      ...(typeof p.browsingExpiryHours === "number" ? { browsingExpiryHours: clampInt(p.browsingExpiryHours, 1, 168, DEFAULT_STEP_TIMEOUT_POLICY.browsingExpiryHours) } : {}),
      ...(typeof p.autoCancelBrowsing === "boolean" ? { autoCancelBrowsing: p.autoCancelBrowsing } : {}),
      ...(typeof p.unpaidExpiryMinutes === "number" ? { unpaidExpiryMinutes: clampInt(p.unpaidExpiryMinutes, 5, 1440, DEFAULT_STEP_TIMEOUT_POLICY.unpaidExpiryMinutes) } : {}),
      ...(typeof p.autoCancelUnpaid === "boolean" ? { autoCancelUnpaid: p.autoCancelUnpaid } : {}),
      ...(typeof p.photoReviewTimeoutMinutes === "number" ? { photoReviewTimeoutMinutes: clampInt(p.photoReviewTimeoutMinutes, 5, 120, DEFAULT_STEP_TIMEOUT_POLICY.photoReviewTimeoutMinutes) } : {}),
      ...(typeof p.autoApprovePhotoOnTimeout === "boolean" ? { autoApprovePhotoOnTimeout: p.autoApprovePhotoOnTimeout } : {}),
    },
  }
}

/**
 * Giải chính sách hiệu lực: Thẻ Chào ghi đè > Cài đặt Hồ sơ tiệm > Mặc định hệ thống.
 */
export function resolveEffectiveStepTimeoutPolicy(
  storeSettings: unknown,
  catalogFilters?: unknown
): EffectiveStepTimeoutPolicy {
  const storePolicy = parseStepTimeoutPolicy(storeSettings)
  const catalogOverride = parseCatalogTimeoutOverride(catalogFilters)

  if (catalogOverride && catalogOverride.enabled && catalogOverride.policy) {
    return {
      ...storePolicy,
      ...catalogOverride.policy,
      source: "CATALOG_OVERRIDE",
    }
  }

  return {
    ...storePolicy,
    source: "STORE",
  }
}

/** Kiểm tra phiên chưa mở có bị quá hạn không */
export function isSessionUnopenedExpired(
  session: { createdAt: Date; openedAt: Date | null },
  policy: StepTimeoutPolicy,
  now: Date = new Date()
): boolean {
  if (!policy.autoCancelUnopened || session.openedAt !== null) return false
  const deadline = session.createdAt.getTime() + policy.unopenedExpiryHours * 3_600_000
  return now.getTime() >= deadline
}

/** Kiểm tra phiên đã mở nhưng không hoàn tất chọn mẫu có bị quá hạn không */
export function isSessionBrowsingExpired(
  session: { openedAt: Date | null; selectedAt?: Date | null; status: string; lastActiveAt: Date },
  policy: StepTimeoutPolicy,
  now: Date = new Date()
): boolean {
  if (!policy.autoCancelBrowsing || session.openedAt === null) return false
  if (session.status === "ORDER_SUBMITTED" || session.status === "PAYMENT_REPORTED" || session.status === "COMPLETED") {
    return false
  }
  const started = session.lastActiveAt.getTime()
  const deadline = started + policy.browsingExpiryHours * 3_600_000
  return now.getTime() >= deadline
}

/** Định dạng thời lượng thân thiện cho người dùng */
export function formatTimeoutDuration(value: number, unit: "hours" | "minutes"): string {
  if (unit === "minutes") {
    if (value < 60) return `${value} phút`
    const h = Math.floor(value / 60)
    const m = value % 60
    return m ? `${h} giờ ${m} phút` : `${h} giờ`
  }
  if (value < 24) return `${value} giờ`
  const days = Math.floor(value / 24)
  const rest = value % 24
  return rest ? `${days} ngày ${rest} giờ` : `${days} ngày`
}
