/**
 * brochure-language-policy.ts
 *
 * Domain Model & Evaluation Rules cho Đa Ngôn Ngữ Thẻ Chào (Greeting Card i18n).
 * - Lớp 1 (Admin SaaS Unlock): Quyết định tenant được phép sử dụng ngôn ngữ nào (unlockedLocales).
 * - Lớp 2 (Cửa hàng Store Setting): Quyết định ngôn ngữ kích hoạt hiển thị (activeLocales) và ngôn ngữ mặc định (defaultLocale).
 * Pure TypeScript — Tuyệt đối không import Prisma hoặc external infrastructure.
 */

import type { SupportedLocale } from "@/lib/i18n/types"

export const BROCHURE_LANGUAGE_POLICY_KEY = "brochure_language_policy"
export const SAAS_UNLOCKED_LOCALES_KEY = "unlocked_locales"
export const SAAS_PENDING_LANGUAGE_UNLOCK_KEY = "pending_language_unlock"

export interface PendingLanguageUnlockRequest {
  requested_locales: SupportedLocale[]
  requested_at: string
  requested_by: string
  note: string | null
}

export interface BrochureLanguagePolicy {
  /** Ngôn ngữ mặc định khi khách mở link (phải nằm trong activeLocales) */
  defaultLocale: SupportedLocale
  /** Danh sách các ngôn ngữ cửa hàng bật hiển thị trên thiệp */
  activeLocales: SupportedLocale[]
  /** Cho phép khách bấm nút chuyển đổi ngôn ngữ trên giao diện thiệp */
  enableLanguageSwitcher: boolean
  /** Cho phép khách quốc tế nhập số điện thoại định dạng quốc tế (E.164, vd +1, +84) */
  allowInternationalPhone: boolean
  /** Hướng dẫn / Thông tin tài khoản dành riêng cho khách thanh toán quốc tế (Wise, PayPal, Swift...) */
  internationalPaymentGuide: string | null
  /** Yêu cầu mở khóa ngôn ngữ đang chờ Admin SaaS phê duyệt */
  pendingRequest?: PendingLanguageUnlockRequest | null
}

export const DEFAULT_BROCHURE_LANGUAGE_POLICY: Readonly<BrochureLanguagePolicy> = Object.freeze({
  defaultLocale: "vi",
  activeLocales: ["vi"] as SupportedLocale[],
  enableLanguageSwitcher: false,
  allowInternationalPhone: true,
  internationalPaymentGuide: null,
})

/** Đọc yêu cầu mở khóa ngôn ngữ đang chờ duyệt từ settings */
export function getPendingLanguageUnlockRequest(settings: unknown): PendingLanguageUnlockRequest | null {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = root[SAAS_PENDING_LANGUAGE_UNLOCK_KEY] as Record<string, unknown> | undefined
  if (!raw || typeof raw !== "object") return null

  return {
    requested_locales: Array.isArray(raw.requested_locales)
      ? (raw.requested_locales as SupportedLocale[])
      : ["en"],
    requested_at: typeof raw.requested_at === "string" ? raw.requested_at : new Date().toISOString(),
    requested_by: typeof raw.requested_by === "string" ? raw.requested_by : "",
    note: typeof raw.note === "string" ? raw.note : null,
  }
}

/**
 * Đọc danh sách ngôn ngữ Admin SaaS đã unlock cho tổ chức này.
 * Mặc định luôn có 'vi' (Tiếng Việt). Muốn có 'en' thì Admin SaaS phải unlock.
 */
export function getUnlockedLocales(settings: unknown): SupportedLocale[] {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const rawUnlocked = root[SAAS_UNLOCKED_LOCALES_KEY]

  const locales: SupportedLocale[] = ["vi"]
  if (Array.isArray(rawUnlocked)) {
    for (const item of rawUnlocked) {
      if (item === "en" && !locales.includes("en")) {
        locales.push("en")
      }
    }
  }

  return locales
}

/**
 * Phân tích và chuẩn hóa chính sách ngôn ngữ thẻ chào của cửa hàng.
 * Đảm bảo chỉ được kích hoạt các ngôn ngữ đã được Admin SaaS unlock.
 */
export function parseBrochureLanguagePolicy(
  settings: unknown,
  unlockedLocales: SupportedLocale[] = ["vi"]
): BrochureLanguagePolicy {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = root[BROCHURE_LANGUAGE_POLICY_KEY] as Record<string, unknown> | undefined

  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_BROCHURE_LANGUAGE_POLICY }
  }

  // Lọc activeLocales: chỉ giữ lại các locale nằm trong unlockedLocales
  let activeLocales: SupportedLocale[] = ["vi"]
  if (Array.isArray(raw.active_locales)) {
    const valid = raw.active_locales.filter(
      (l): l is SupportedLocale => (l === "vi" || l === "en") && unlockedLocales.includes(l)
    )
    if (valid.length > 0) {
      activeLocales = Array.from(new Set(valid))
    }
  }

  // defaultLocale phải nằm trong activeLocales, nếu không thì fallback về activeLocales[0]
  let defaultLocale: SupportedLocale =
    raw.default_locale === "en" || raw.default_locale === "vi" ? raw.default_locale : "vi"
  if (!activeLocales.includes(defaultLocale)) {
    defaultLocale = activeLocales[0] ?? "vi"
  }

  return {
    defaultLocale,
    activeLocales,
    enableLanguageSwitcher: raw.enable_language_switcher === true && activeLocales.length > 1,
    allowInternationalPhone: raw.allow_international_phone !== false,
    internationalPaymentGuide:
      typeof raw.international_payment_guide === "string" && raw.international_payment_guide.trim().length > 0
        ? raw.international_payment_guide.trim().slice(0, 1000)
        : null,
    pendingRequest: getPendingLanguageUnlockRequest(settings),
  }
}

/** Chuyển đổi chính sách thành payload lưu vào settings của organization */
export function serializeBrochureLanguagePolicy(policy: BrochureLanguagePolicy): Record<string, unknown> {
  return {
    default_locale: policy.defaultLocale,
    active_locales: policy.activeLocales,
    enable_language_switcher: policy.enableLanguageSwitcher,
    allow_international_phone: policy.allowInternationalPhone,
    international_payment_guide: policy.internationalPaymentGuide,
  }
}
