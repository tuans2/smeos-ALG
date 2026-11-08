"use client"

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
import type {
  UiSystemConfig,
  UiPresetId,
  UiDensity,
  UiSystemContextValue,
} from "./types"
import { DEFAULT_UI_CONFIG, getUiPreset, UI_PRESETS } from "./presets"

/**
 * Chỉ lưu density người dùng TỰ CHỌN. Khoá cũ `smeos_ui_density` bị ghi tự động mỗi lần gắn
 * (gần như luôn là "comfortable"), nên đọc lại nó sẽ đè density máy chủ chọn theo tầng.
 */
export const UI_DENSITY_STORAGE_KEY = "smeos_ui_density_choice"

const UiSystemContext = createContext<UiSystemContextValue | null>(null)

/** Density người dùng đã chọn và lưu ở localStorage; `null` khi chưa chọn hoặc không đọc được. */
export function readStoredDensity(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): UiDensity | null {
  try {
    const value = storage?.getItem(UI_DENSITY_STORAGE_KEY)
    return value === "compact" || value === "comfortable" ? value : null
  } catch {
    return null
  }
}

/** Ghi (hoặc xoá khi `null`) density người dùng tự chọn; bỏ qua khi localStorage bị chặn. */
export function writeStoredDensity(
  density: UiDensity | null,
  storage: Pick<Storage, "setItem" | "removeItem"> | undefined = globalThis.localStorage,
): void {
  try {
    if (density) storage?.setItem(UI_DENSITY_STORAGE_KEY, density)
    else storage?.removeItem(UI_DENSITY_STORAGE_KEY)
  } catch {
    // localStorage bị chặn (chế độ riêng tư) — bỏ qua
  }
}

/**
 * Giữ nguyên object config khi density đọc từ localStorage trùng giá trị đang dùng. Một object mới
 * làm context đổi ngay sau hydrate: React bỏ HTML máy chủ của segment trang còn chờ chunk JS và
 * dựng lại phía client, phần tử LCP bị vẽ lại muộn (trang chủ di động 1,7 s → 3,8 s).
 */
export function withStoredDensity(prev: UiSystemConfig, density: UiDensity): UiSystemConfig {
  return prev.density === density ? prev : { ...prev, density }
}

export function UiSystemProvider({
  children,
  initialConfig,
}: {
  children: React.ReactNode
  initialConfig?: Partial<UiSystemConfig>
}) {
  // Cấu hình gốc = theme máy chủ phân giải theo tầng (AppShell truyền vào); UI Studio đè lên trên.
  const [baseConfig] = useState<UiSystemConfig>(() => ({
    ...DEFAULT_UI_CONFIG,
    ...initialConfig,
  }))
  const [config, setConfig] = useState<UiSystemConfig>(baseConfig)

  // Density cá nhân (ADR-011 D-UI-03): chỉ có khi người dùng đã tự chọn (setDensity ghi), nên đè được
  // density của tầng; chưa chọn thì giữ nguyên theme máy chủ.
  useEffect(() => {
    const storedDensity = readStoredDensity()
    if (!storedDensity) return
    void Promise.resolve().then(() => {
      setConfig((prev) => withStoredDensity(prev, storedDensity))
      document.documentElement.setAttribute("data-density", storedDensity)
    })
  }, [])

  // Gắn preset/density lên <html> để portal (Dialog, Drawer…) render ngoài AppShell cũng nhận đúng token.
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute("data-theme", config.preset)
    root.setAttribute("data-density", config.density)
  }, [config.preset, config.density])

  // Rời AppShell (vd sang trang công khai) → trả <html> về mặc định như HTML máy chủ của root layout.
  useEffect(() => {
    return () => {
      const root = document.documentElement
      root.setAttribute("data-theme", DEFAULT_UI_CONFIG.preset)
      root.setAttribute("data-density", DEFAULT_UI_CONFIG.density)
    }
  }, [])

  // Listen to external DOM changes on document.documentElement (e.g. editing data-theme / data-density in Chrome DevTools)
  // Chỉ phục vụ chỉnh tay thuộc tính trong DevTools — không theo dõi DOM ở production.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const root = document.documentElement
    const handleMutation = () => {
      const domTheme = root.getAttribute("data-theme")
      const domDensity = root.getAttribute("data-density")

      const normalizedTheme: UiPresetId | null =
        domTheme === "clean-blue"
          ? "modern-slate"
          : domTheme && domTheme in UI_PRESETS
            ? (domTheme as UiPresetId)
            : null

      if (normalizedTheme) {
        setConfig((prev) => (prev.preset === normalizedTheme ? prev : { ...prev, preset: normalizedTheme }))
      }
      if (domDensity === "compact" || domDensity === "comfortable") {
        setConfig((prev) => (prev.density === domDensity ? prev : { ...prev, density: domDensity }))
      }
    }

    const observer = new MutationObserver(handleMutation)
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-density"] })
    return () => observer.disconnect()
  }, [])

  const setPreset = useCallback((preset: UiPresetId) => {
    if (preset in UI_PRESETS) {
      setConfig((prev) => ({ ...prev, preset }))
    }
  }, [])

  const setDensity = useCallback((density: UiDensity) => {
    setConfig((prev) => ({ ...prev, density }))
    writeStoredDensity(density)
  }, [])

  const resetToDefault = useCallback(() => {
    setConfig(baseConfig)
    writeStoredDensity(null)
  }, [baseConfig])

  const currentPreset = useMemo(() => getUiPreset(config.preset), [config.preset])
  const availablePresets = useMemo(() => Object.values(UI_PRESETS), [])

  const value = useMemo<UiSystemContextValue>(
    () => ({
      config,
      currentPreset,
      availablePresets,
      setPreset,
      setDensity,
      resetToDefault,
    }),
    [config, currentPreset, availablePresets, setPreset, setDensity, resetToDefault]
  )

  return <UiSystemContext.Provider value={value}>{children}</UiSystemContext.Provider>
}

export function useUiSystem() {
  const context = useContext(UiSystemContext)
  if (!context) {
    const defaultPreset = getUiPreset(DEFAULT_UI_CONFIG.preset)
    return {
      config: DEFAULT_UI_CONFIG,
      currentPreset: defaultPreset,
      availablePresets: [defaultPreset],
      setPreset: () => {},
      setDensity: () => {},
      resetToDefault: () => {},
    }
  }
  return context
}
