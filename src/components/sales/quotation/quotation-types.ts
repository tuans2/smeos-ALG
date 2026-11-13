export interface ProductItem {
  id: string
  title: string
  price: number
  category?: string
  image_url?: string
  description?: string
  composition?: string[]
  /** Phiên bản kích cỡ đang bán (giá theo phiên bản) — chọn cho từng dòng báo giá (checklist ALG 3.8) */
  options?: { id: string; name: string; priceVnd: number }[]
}

export interface QuotationDraftItem {
  productId?: string | null
  name: string
  variantLabel?: string | null
  qty: number
  unitPrice: number
  note?: string | null
}

export interface QuotationRecordItem {
  id?: string
  productId?: string | null
  name: string
  qty: number
  unitPrice: number
  totalPrice: number
  note?: string | null
}

export interface QuotationRecord {
  id: string
  /** Token của link công khai `/bg/<publicToken>` — dùng để chia sẻ, không dùng mã BG-xxxx. */
  publicToken: string
  organizationId: string
  code: string
  leadId?: string | null
  customerId?: string | null
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED"
  validUntil?: string | null
  subtotal: number
  discountAmount: number
  shippingFee?: number
  totalAmount: number
  terms?: string | null
  notes?: string | null
  convertedOrderId?: string | null
  createdAt: string
  updatedAt: string
  items: QuotationRecordItem[]
  lead?: { id: string; name: string; phone: string } | null
  customer?: { id: string; name: string; phone: string } | null
}

