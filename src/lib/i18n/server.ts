/**
 * server.ts — Trợ lý i18n cho React Server Components & Backend functions
 */

import { viDictionary } from "./locales/vi"
import { enDictionary } from "./locales/en"
import type { SupportedLocale, I18nDictionary, TranslationKey, InterpolationParams } from "./types"

const DICTIONARIES: Record<SupportedLocale, I18nDictionary> = {
  vi: viDictionary,
  en: enDictionary,
}

/**
 * Lấy toàn bộ từ điển theo ngôn ngữ (mặc định 'vi')
 */
export function getDictionary(locale: SupportedLocale = "vi"): I18nDictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.vi
}

/**
 * Thay thế các biến nội suy trong chuỗi văn bản:
 * "Chào {name}" + { name: "An" } -> "Chào An"
 */
export function interpolate(text: string, params?: InterpolationParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`
  })
}

function lookup(dict: I18nDictionary, segments: string[]): string | undefined {
  let current: unknown = dict
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return typeof current === "string" && current !== "" ? current : undefined
}

/**
 * Nhãn thay thế khi thiếu khóa ở production — không lộ mã `module.feature.key`.
 * "orders.list.emptyState" -> "Empty state"
 */
export function missingKeyLabel(key: string): string {
  const last = key.split(".").pop() ?? ""
  const words = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ""
}

/**
 * Tra cứu khóa dạng dot-notation trong từ điển và áp dụng nội suy.
 * Thứ tự: locale hiện tại → tiếng Việt gốc → (production) nhãn thân thiện / (dev, test) trả nguyên key.
 */
export function translate(
  locale: SupportedLocale = "vi",
  key: TranslationKey,
  params?: InterpolationParams
): string {
  const segments = key.split(".")
  const text = lookup(getDictionary(locale), segments) ?? lookup(DICTIONARIES.vi, segments)
  if (text !== undefined) return interpolate(text, params)

  if (process.env.NODE_ENV === "production") return missingKeyLabel(key)
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing translation key: "${key}" for locale "${locale}"`)
  }
  return key
}
