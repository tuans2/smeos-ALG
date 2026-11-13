/**
 * Nút "Đặt hàng" / "Liên hệ" trên trang khách Landing (08) / Catalog (09) theo cài đặt Điều hành
 * (Đơn hàng đa nguồn §3.2, `modules/orders/domain/entry-actions.ts`). Máy chủ đã giải sẵn
 * `entryActions`; thiếu (bản xem trước chưa tải được cài đặt) thì dùng đúng mặc định hệ thống.
 */

import type { PublicCatalogResult } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { resolveEntryActions, type EntryActions } from "@/modules/orders/domain/entry-actions"

export type PublicEntry = EntryActions

export function entryOf(data: PublicCatalogResult): PublicEntry {
  if (data.status === "ACTIVE" && data.entryActions) return data.entryActions
  const isLanding = data.status === "ACTIVE" && !!data.campaignConfig
  return resolveEntryActions({}, isLanding ? "LANDING" : "CATALOG")
}
