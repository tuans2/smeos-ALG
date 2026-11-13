"use client"

import { createContext, useContext } from "react"

/**
 * true khi mẫu được dựng thu nhỏ bên trong khung xem trước (trang quản lý):
 * dùng chiều cao của khung thay vì cả màn hình và không bắt phím toàn cục.
 */
export const EmbeddedPreviewContext = createContext(false)

export function useEmbeddedPreview(): boolean {
  return useContext(EmbeddedPreviewContext)
}

/** Lớp chiều cao gốc: cả màn hình khi khách xem, theo khung khi xem trước. */
export function rootHeight(embedded: boolean, mode: "min" | "fixed" = "min"): string {
  if (embedded) return mode === "fixed" ? "h-full" : "h-full overflow-y-auto"
  return mode === "fixed" ? "h-dvh" : "min-h-dvh"
}
