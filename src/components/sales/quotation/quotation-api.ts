import type { QuotationDraftItem, QuotationRecord } from "./quotation-types"
import { snakeKeys } from "@/lib/case-keys"

export interface CreateQuotationPayload {
  leadId?: string | null
  customerId?: string | null
  validUntil?: string | null
  discountAmount?: number
  terms?: string | null
  notes?: string | null
  items: QuotationDraftItem[]
  shippingFee?: number
}

export const quotationApi = {
  async list(status?: string): Promise<{ data: QuotationRecord[]; total: number; counts: Record<string, number> }> {
    const query = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : ""
    const res = await fetch(`/api/v1/quotations${query}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },

  async create(payload: CreateQuotationPayload): Promise<QuotationRecord> {
    const res = await fetch("/api/v1/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snakeKeys(payload)),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Lỗi tạo báo giá (HTTP ${res.status})`)
    }
    const body = await res.json()
    return body.data
  },

  async send(id: string): Promise<QuotationRecord> {
    const res = await fetch(`/api/v1/quotations/${id}/send`, {
      method: "POST",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Lỗi gửi báo giá (HTTP ${res.status})`)
    }
    const body = await res.json()
    return body.data
  },

  async convertToOrder(id: string): Promise<{ quotation: QuotationRecord; order: { id: string; code: string } }> {
    const res = await fetch(`/api/v1/quotations/${id}/convert`, {
      method: "POST",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Lỗi tạo đơn hàng (HTTP ${res.status})`)
    }
    const body = await res.json()
    return body.data
  },
}

