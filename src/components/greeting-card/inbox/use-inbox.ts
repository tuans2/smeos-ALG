"use client"

import { useApi } from "@/components/greeting-card/greeting-api"
import type { InboxAction } from "@/modules/greeting-card/domain/inbox"
import type { InboxThread } from "@/modules/greeting-card/use-cases/get-inbox"

export interface InboxData {
  role: "ADMIN" | "SALE" | "COORDINATOR"
  canSwitchRole?: boolean
  actions: InboxAction[]
  threads: InboxThread[]
  updates: Array<{ id: string; orderId: string | null; sessionId: string | null; customerName: string; title: string; code: string; at: string }>
  counts: { actions: number; unreadMessages: number; total: number }
}

/** Hộp việc của tôi — tự làm mới mỗi 20 giây khi tab trình duyệt đang mở. */
export function useInbox(roleOverride?: "ADMIN" | "SALE" | "COORDINATOR") {
  const url = roleOverride ? `/api/v1/greeting-card/inbox?role=${roleOverride}` : "/api/v1/greeting-card/inbox"
  return useApi<{ data: InboxData }>(url, { refreshInterval: 20_000 })
}

export function timeAgo(iso: string, now: number): string {
  const min = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000))
  if (min < 1) return "vừa xong"
  if (min < 60) return `${min} phút trước`
  const h = Math.floor(min / 60)
  return h < 24 ? `${h} giờ trước` : `${Math.floor(h / 24)} ngày trước`
}
