/**
 * Sales Concierge Domain Types.
 * Trợ lý Tư vấn Bán hoa & Hỗ trợ Chốt đơn cho Khách hàng Mua Hoa.
 * DÀNH RIÊNG CHO: Khách hàng mua hoa (E-Catalog, Zalo OA, Messenger, Storefront Widget, v.v.).
 * TUYỆT ĐỐI KHÔNG: Chứa bất kỳ mã nghiệp vụ hay quy trình quản trị nội bộ nào của SaaS.
 */

import type { ProductMasterIndex } from "@/modules/products/domain/product-master-index"
import type { CustomerMasterIndex } from "@/modules/crm/domain/customer-master-index"
import type { SuggestedProductCard } from "../../domain/chat-types"

export interface SalesConsultantInput {
  query: string
  conversationId: string
  customer?: CustomerMasterIndex | null | undefined
  masterProducts: ProductMasterIndex[]
}

export interface SalesConsultantOutput {
  replyText: string
  suggestedProducts: SuggestedProductCard[]
  /** @deprecated Dùng `suggestedProducts` để tương thích đa ngành */
  suggestedFlowers: SuggestedProductCard[]
  detectedBudget?: number | undefined
  detectedOccasion?: string | undefined
}
