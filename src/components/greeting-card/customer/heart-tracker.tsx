"use client"

import { createContext, useContext } from "react"

/**
 * Báo thả/bỏ tim trên link bộ sưu tập CÔNG KHAI (`/g`, `/bst`). Link gửi riêng đã ghi tim qua
 * hành trình khách (`product_liked` / `product_unliked`) nên không cần context này.
 */
export type HeartTracker = (productId: string, liked: boolean) => void

export const HeartTrackerContext = createContext<HeartTracker | null>(null)

export function useHeartTracker(): HeartTracker | null {
  return useContext(HeartTrackerContext)
}
