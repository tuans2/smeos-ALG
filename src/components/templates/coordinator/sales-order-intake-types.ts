import type { AccessoryBomItem, FlowerBomItem, FoliageBomItem, WrappingLayer } from "@/modules/products/domain/product-master-index"
import type { CreateOrderRequest } from "@/components/coordinator/coordinator-api"

/** Một mục Product Master Index dùng để điền nhanh form (`GET /products/master-index`). */
export interface MasterPreset {
  id: string
  code?: string
  name: string
  masterImageUrl?: string
  pricing?: { quotePriceVnd?: number }
  bom?: {
    flowers?: FlowerBomItem[]
    foliage?: FoliageBomItem[]
    wrapping?: WrappingLayer[]
    accessories?: AccessoryBomItem[]
  }
}

/** Một khách hàng khớp tìm kiếm từ Customer Master Index (`GET /crm/customers?search=`). */
export interface CustomerMatch {
  id: string
  name: string
  phone: string
  metrics?: { tier?: string }
}

export interface SalesOrderIntakeModalProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Gửi lên máy chủ; lỗi (400/422) ném ra để modal hiện, không đóng form.
   * `depositVnd` (ĐP-4a.3/4a.4, sổ thu §2.14) — Sales ghi DEPOSIT ngay lúc
   * nhận đơn nếu khách trả trước; 0 nghĩa là không ghi cọc lúc này.
   */
  onSubmit: (body: CreateOrderRequest, depositVnd: number) => Promise<void>
}
