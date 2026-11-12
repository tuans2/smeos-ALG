"use client"

/** Gọi API Thu hút khách — kiểu dữ liệu khớp `modules/acquisition` (JSON). */

export interface ShortLinkItem {
  id: string
  code: string
  kind: "QR" | "SALES_LINK"
  name: string
  target_path: string
  placement_label: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  expires_at: string | null
  is_active: boolean
  scan_count: number
  created_at: string
  _count: { leads: number }
}

export interface ShortLinkStats {
  totalScans: number
  uniqueVisitors: number
  leads: number
  byDevice: Record<string, number>
  byDay: Record<string, number>
  days: number
}

import type { LeadStatus } from "@/modules/acquisition/domain/lead-rules"
import { snakeKeys } from "@/lib/case-keys"
export type { LeadStatus }

export interface LeadItem {
  id: string
  name: string
  phone: string
  message: string | null
  source: string
  source_ref: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  status: LeadStatus
  customer_id: string | null
  created_at: string
  short_link: { name: string; placement_label: string | null } | null
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } })
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; details?: Record<string, unknown> } }
  if (!res.ok) {
    const detail = data.error?.details ? Object.values(data.error.details).find((v) => typeof v === "string") : undefined
    throw new Error((detail as string | undefined) || data.error?.message || "Không tải được dữ liệu, vui lòng thử lại")
  }
  return data as T
}

export const acquisitionApi = {
  listLinks: (cursor?: string) => call<Page<ShortLinkItem>>(`/api/v1/short-links?limit=50${cursor ? `&cursor=${cursor}` : ""}`),
  createLink: (body: Record<string, unknown>) => call<ShortLinkItem>("/api/v1/short-links", { method: "POST", body: JSON.stringify(body) }),
  updateLink: (id: string, body: Record<string, unknown>) => call<ShortLinkItem>(`/api/v1/short-links/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  linkStats: (id: string, days: number) => call<ShortLinkStats>(`/api/v1/short-links/${id}/stats?days=${days}`),
  listLeads: (status?: string, cursor?: string) =>
    call<Page<LeadItem> & { counts: Record<string, number> }>(`/api/v1/leads?limit=50${status ? `&status=${status}` : ""}${cursor ? `&cursor=${cursor}` : ""}`),
  updateLead: (id: string, body: { status?: LeadStatus | string; assigneeUserId?: string | null }) => call<LeadItem>(`/api/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify(snakeKeys(body)) }),
  brandProfile: () => call<{ primary_color: string | null; logo_url: string | null }>("/api/v1/brand-profile"),
}

/** Link công khai đầy đủ để in/chia sẻ. */
export function publicShortUrl(code: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  return `${origin}/r/${code}`
}
