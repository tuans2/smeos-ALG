"use client"

import { useApi } from "@/components/greeting-card/greeting-api"

export interface CraftFeeSuggestionView {
  feeLabel: string
  suggestedVnd: number
  lines: Array<{ label: string; amountVnd: number }>
  adjustPercent: number
}

/** Phí gia công gợi ý của đơn (máy chủ tính theo phương án tiệm cài); `null` khi chưa tải xong. */
export function useCraftFeeSuggestion(orderId: string | null | undefined): CraftFeeSuggestionView | null {
  const { data } = useApi<{ data: CraftFeeSuggestionView }>(orderId ? `/api/v1/greeting-card/orders/${orderId}/craft-fee` : null)
  return data?.data ?? null
}
