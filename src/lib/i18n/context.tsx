"use client"

import "@/lib/brand-storage-migration"

/**
 * context.tsx — React Context & Hook đa ngôn ngữ cho Client Components
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"
import { getDictionary, translate, interpolate } from "./server"
import type { SupportedLocale, I18nContextValue, TranslationKey, InterpolationParams } from "./types"
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./types"
import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatTime as baseFormatTime,
  formatDateTime as baseFormatDateTime,
  formatNumber as baseFormatNumber,
} from "./formatters"

import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { getTierTerminology } from "@/core/terminology"

const STORAGE_KEY = "alg_locale"
const LEGACY_STORAGE_KEY = "floraos_locale"

const I18nContext = createContext<I18nContextValue | null>(null)

export interface I18nProviderProps {
  children: React.ReactNode
  initialLocale?: SupportedLocale | undefined
  industryKey?: string | undefined
}

export function I18nProvider({ children, initialLocale = DEFAULT_LOCALE, industryKey }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale)

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)) as SupportedLocale | null
      if (saved && SUPPORTED_LOCALES.includes(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc ngôn ngữ đã lưu sau hydrate để tránh lệch SSR, chủ đích
        setLocaleState(saved)
      }
    } catch {
      // Bỏ qua lỗi nếu môi trường không có localStorage
    }
  }, [])

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale)
    try {
      localStorage.setItem(STORAGE_KEY, nextLocale)
    } catch {
      // Bỏ qua lỗi
    }
  }, [])

  const dict = useMemo(() => getDictionary(locale), [locale])

  const t = useCallback(
    (key: TranslationKey, params?: InterpolationParams): string => {
      return translate(locale, key, params)
    },
    [locale]
  )

  const industryPlugin = useMemo(() => getIndustryPlugin(industryKey), [industryKey])

  const ti = useCallback(
    (termKey: "makerTitle" | "makerAction" | "productRecipe" | "sampleProduct" | "rawMaterialItem" | "completedProductPhoto" | "printablesTitle" | "catalogTitle" | "createButtonLabel" | "scanButtonLabel"): string => {
      return industryPlugin.terminology[termKey] || ""
    },
    [industryPlugin]
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      dict,
      industryKey,
      industry: industryPlugin,
      ti,
      tierTerm: getTierTerminology,
      formatCurrency: (amount, currency) => baseFormatCurrency(amount, locale, currency),
      formatDate: (date, options) => baseFormatDate(date, locale, options),
      formatTime: (date, options) => baseFormatTime(date, locale, options),
      formatDateTime: (date) => baseFormatDateTime(date, locale),
      formatNumber: (value, options) => baseFormatNumber(value, locale, options),
    }),
    [locale, setLocale, t, dict, industryKey, industryPlugin, ti]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Hook đa ngôn ngữ dùng trong mọi React component:
 * const { t, ti, industry } = useI18n()
 * <h1>{ti('makerTitle')}</h1>
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    const fallbackPlugin = getIndustryPlugin()
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: TranslationKey, params?: InterpolationParams) => translate(DEFAULT_LOCALE, key, params),
      dict: getDictionary(DEFAULT_LOCALE),
      industryKey: "FLORAL",
      industry: fallbackPlugin,
      ti: (termKey) => fallbackPlugin.terminology[termKey] || "",
      tierTerm: getTierTerminology,
      formatCurrency: (amount, currency) => baseFormatCurrency(amount, DEFAULT_LOCALE, currency),
      formatDate: (date, options) => baseFormatDate(date, DEFAULT_LOCALE, options),
      formatTime: (date, options) => baseFormatTime(date, DEFAULT_LOCALE, options),
      formatDateTime: (date) => baseFormatDateTime(date, DEFAULT_LOCALE),
      formatNumber: (value, options) => baseFormatNumber(value, DEFAULT_LOCALE, options),
    }
  }
  return context
}

export { interpolate }
