/**
 * Mẫu còn bán được không, theo tồn kho `product_inventory`. Cùng quy tắc với Product Master Index
 * (`product-master-index-repository.ts`): chỉ xét dòng tồn kho của ĐÚNG chi nhánh sản phẩm đang gắn;
 * sản phẩm chưa gắn chi nhánh hoặc chưa khai tồn kho → coi là còn bán (không suy diễn gộp nhiều
 * chi nhánh). `PRE_ORDER_ONLY` vẫn đặt được. Pure TypeScript.
 */

export interface InventoryRow {
  branch_id: string
  status: string
  quantity_available: number | null
}

/** Mẫu cửa hàng chủ động ngừng bán (Tạm ngưng, Lưu trữ) không hiện cho khách — khác mẫu tạm hết hàng vẫn hiện để khách xem (checklist ALG 2.3). */
export function isHiddenFromCustomer(product: { status?: string | null | undefined }): boolean {
  return product.status === "PAUSED" || product.status === "ARCHIVED"
}

export function isProductAvailable(product: { status?: string | undefined; branch_id?: string | null | undefined; inventory?: readonly InventoryRow[] | null | undefined }): boolean {
  // Mẫu tạm ngưng hoặc đã lưu trữ không bán trên link khách (checklist ALG 2.3)
  if (isHiddenFromCustomer(product)) return false
  if (!product.branch_id) return true
  const row = product.inventory?.find((r) => r.branch_id === product.branch_id)
  if (!row) return true
  if (row.status === "OUT_OF_STOCK") return false
  return row.quantity_available === null || row.quantity_available > 0 || row.status === "PRE_ORDER_ONLY"
}

export const SOLD_OUT_MESSAGE = "Mẫu này vừa tạm hết hàng — vui lòng chọn mẫu khác hoặc liên hệ cửa hàng"
