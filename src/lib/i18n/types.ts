/**
 * types.ts — Định nghĩa kiểu dữ liệu cho động cơ Đa ngôn ngữ (i18n Engine)
 */

import type { viDictionary } from "./locales/vi"

export type SupportedLocale = "vi" | "en"

export const DEFAULT_LOCALE: SupportedLocale = "vi"

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ["vi", "en"] as const

export type DeepString<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string
}

export type I18nDictionary = DeepString<typeof viDictionary>

export type InterpolationParams = Record<string, string | number>

/**
 * Đệ quy trích xuất tất cả các đường dẫn khóa dạng dot-notation từ I18nDictionary
 * Ví dụ: "common.terms.shop" | "home.header.title"
 */
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract"
import type { AlgTier, getTierTerminology } from "@/core/terminology"

export type TranslationKey = NestedKeyOf<I18nDictionary>

export interface I18nContextValue {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
  t: (key: TranslationKey, params?: InterpolationParams) => string
  dict: I18nDictionary
  industryKey?: string | undefined
  industry: IndustryPluginContract
  ti: (termKey: "makerTitle" | "makerAction" | "productRecipe" | "sampleProduct" | "rawMaterialItem" | "completedProductPhoto" | "printablesTitle" | "catalogTitle" | "createButtonLabel" | "scanButtonLabel") => string
  tierTerm: typeof getTierTerminology
  formatCurrency: (amount: number | null | undefined, currency?: string) => string
  formatDate: (date: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions) => string
  formatTime: (date: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (date: Date | string | number | null | undefined) => string
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string
}

