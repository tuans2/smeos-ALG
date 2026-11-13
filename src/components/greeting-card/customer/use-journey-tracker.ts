"use client"

import { useCallback, useRef } from "react"
import type { CustomerJourneyEvent } from "@/modules/greeting-card/domain/customer-journey-events"

/** Sự kiện chỉ cần ghi một lần mỗi lần mở trang (cùng mẫu). */
const ONCE: ReadonlySet<CustomerJourneyEvent> = new Set(["collection_opened", "product_viewed", "checkout_started", "checkout_abandoned"])

/**
 * Ghi sự kiện hành trình kiểu "bắn rồi quên": lỗi mạng/máy chủ không bao giờ chặn khách.
 * `keepalive` để sự kiện lúc đóng tab (bỏ dở đặt hàng) vẫn tới máy chủ.
 */
export function useJourneyTracker(sendCode: string, enabled: boolean) {
  const sent = useRef(new Set<string>())
  return useCallback(
    (event: CustomerJourneyEvent, productId?: string) => {
      if (!enabled) return
      const key = `${event}:${productId ?? ""}`
      if (ONCE.has(event) && sent.current.has(key)) return
      sent.current.add(key)
      try {
        void fetch(`/api/v1/public/brochure/${encodeURIComponent(sendCode)}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, ...(productId ? { productId } : {}) }),
          keepalive: true,
        }).catch(() => undefined)
      } catch {
        // bỏ qua — thống kê không được ảnh hưởng khách
      }
    },
    [sendCode, enabled],
  )
}
