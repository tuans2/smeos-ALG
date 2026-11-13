"use client"

import { createContext, useContext } from "react"

/**
 * Shell hiện tại có gắn ngăn UI Studio hay không (ADR-011 D-UI-01).
 * `AppShell` đặt giá trị; nút mở UI Studio trong menu người dùng đọc nó để không
 * hiện nút khi shell không có ngăn để mở.
 */
const UiStudioAvailability = createContext(false)

export const UiStudioAvailabilityProvider = UiStudioAvailability.Provider

export function useUiStudioAvailable(): boolean {
  return useContext(UiStudioAvailability)
}
