"use client"

import { createContext, useContext } from "react"
import type { ShopContact } from "@/modules/greeting-card/domain/shop-contact"
import type { CustomerJourneyEvent } from "@/modules/greeting-card/domain/customer-journey-events"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"

/**
 * Ngữ cảnh hành trình khách trên link riêng `/b/<mã>`: liên hệ tiệm, ghi sự kiện, báo mẫu đang
 * xem (để nút Gọi/Zalo kèm đúng mẫu). Không có ngữ cảnh (khung xem trước của nhân viên, link
 * bộ sưu tập chung) → các nút liên hệ và ghi sự kiện tự ẩn/bỏ qua.
 */
export interface CustomerJourney {
  shop: ShopContact
  track: (event: CustomerJourneyEvent, productId?: string) => void
  onCurrentProductChange: (product: GreetingCatalogProduct | null) => void
  /** Nhắn Zalo cho tiệm với tin nhắn soạn sẵn (đã chép vào bộ nhớ tạm để khách dán) */
  contactZalo: (message: string, productId?: string) => void
}

export const CustomerJourneyContext = createContext<CustomerJourney | null>(null)

export function useCustomerJourney(): CustomerJourney | null {
  return useContext(CustomerJourneyContext)
}

/**
 * Link Zalo cá nhân (`zalo.me/<sđt>`) không nhận nội dung soạn sẵn qua URL, nên chép tin nhắn
 * vào bộ nhớ tạm trước rồi mở Zalo — khách chỉ cần dán. Trả `true` khi chép được.
 */
export async function copyThenOpen(url: string, message: string): Promise<boolean> {
  let copied = false
  try {
    await navigator.clipboard.writeText(message)
    copied = true
  } catch {
    // trình duyệt chặn bộ nhớ tạm — vẫn mở Zalo
  }
  window.open(url, "_blank", "noopener,noreferrer")
  return copied
}
