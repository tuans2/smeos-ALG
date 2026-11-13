/** Gọi API cho mục Đơn hàng theo vai (P4). Lỗi máy chủ → `Error` mang câu tiếng Việt để hiện ngay. */

import type { LeadQueueItem } from "@/modules/orders/domain/lead-queue"

export type WorkbenchStage = "NEEDS_QUOTE" | "AWAITING_PAYMENT" | "AWAITING_APPROVAL" | "IN_COORDINATION" | "DELIVERED_UNPAID"

export interface WorkbenchItem {
  id: string
  code: string
  sourceLabel: string
  status: string
  totalVnd: number
  paidVnd: number
  balanceVnd: number
  recipientName: string | null
  phone: string | null
  createdAt: string
  stage: WorkbenchStage
  request: { id: string; status: string; basis: string | null; collectDueAt: string | null } | null
  collectOverdue: boolean
}

export interface ApprovalItem {
  id: string
  status: string
  reason: string
  requestedAt: string
  collectDueAt: string | null
  order: { id: string; code: string; totalVnd: number; paidVnd: number; balanceVnd: number }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } })
  const body = (await res.json().catch(() => null)) as ({ error?: { message?: string; details?: Record<string, string> } } & T) | null
  if (!res.ok) {
    const detail = body?.error?.details ? Object.values(body.error.details)[0] : undefined
    throw new Error(detail ?? body?.error?.message ?? "Không thực hiện được, vui lòng thử lại")
  }
  return body as T
}

export const ordersWorkspaceApi = {
  leadQueue: () => call<{ items: LeadQueueItem[]; counts: { total: number; hot: number; dueFollowUp: number } }>("/api/v1/orders/lead-queue"),
  workbench: () => call<{ items: WorkbenchItem[] }>("/api/v1/orders/workbench"),
  approvals: () => call<{ items: ApprovalItem[] }>("/api/v1/orders/approval-requests?status=PENDING"),
  quote: (orderId: string, totalVnd: number) => call(`/api/v1/orders/${orderId}/quote`, { method: "POST", body: JSON.stringify({ totalVnd }) }),
  deliverBeforePay: (orderId: string, reason: string) =>
    call<{ message: string }>(`/api/v1/orders/${orderId}/deliver-before-pay`, { method: "POST", body: JSON.stringify({ reason }) }),
  decide: (requestId: string, approve: boolean, note: string) =>
    call(`/api/v1/orders/approval-requests/${requestId}/decision`, { method: "POST", body: JSON.stringify({ approve, note: note || undefined }) }),
  confirmPayment: (orderId: string, amountVnd: number, method: string) =>
    call(`/api/v1/orders/${orderId}/payments`, { method: "POST", body: JSON.stringify({ amountVnd, method }) }),
}
