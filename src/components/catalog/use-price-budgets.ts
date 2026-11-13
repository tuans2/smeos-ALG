"use client"

import { useMemo } from "react"
import { useApi } from "@/components/greeting-card/greeting-api"
import { readPriceBudgets, type PriceBudget } from "@/lib/price-budgets"

/** Khoảng giá lọc nhanh của cửa hàng hiện tại (bộ mặc định khi chưa tải xong / chưa cấu hình). */
export function usePriceBudgets(): PriceBudget[] {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const settings = org.data?.settings
  return useMemo(() => readPriceBudgets(settings), [settings])
}
