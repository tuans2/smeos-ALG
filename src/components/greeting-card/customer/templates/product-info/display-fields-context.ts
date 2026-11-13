"use client"

import { createContext, useContext } from "react"
import { DEFAULT_ENABLED_FIELDS, type OptionalDisplayField } from "@/modules/greeting-card/domain/display-fields"

/** Trường đang bật cho mẫu hiện tại (cửa hàng cấu hình); renderer cung cấp, ProductInfo đọc. */
export const DisplayFieldsContext = createContext<readonly OptionalDisplayField[]>(DEFAULT_ENABLED_FIELDS)

export function useDisplayFields(): readonly OptionalDisplayField[] {
  return useContext(DisplayFieldsContext)
}
