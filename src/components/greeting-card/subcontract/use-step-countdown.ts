"use client"

import { useEffect, useState } from "react"
import {
  calculateCountdownState,
  type CountdownState,
} from "@/modules/greeting-card/domain/subcontract-countdown"

/**
 * Hook đếm ngược thời gian thực (realtime tick mỗi giây) cho một mốc đích (targetMs).
 */
export function useStepCountdown(targetMs: number | null | undefined): CountdownState | null {
  // Chỉ giữ "bây giờ" trong state; trạng thái đếm ngược tính ngay khi render nên đổi mốc
  // đích là thấy ngay, không cần setState đồng bộ trong effect.
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!targetMs) return
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [targetMs])

  return calculateCountdownState(targetMs, nowMs)
}
