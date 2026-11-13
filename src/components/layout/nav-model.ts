/**
 * Mô hình điều hướng một nguồn (Single Source of Truth) — đặc tả 03-UX §3, 03b §5.
 * Tái cấu trúc theo SRP và chuẩn hóa 4 tầng kiến trúc (ALG_4_TIER_ARCHITECTURE_AND_NAVIGATION_SSOT.md).
 *
 * Luật thuần — không import React, không import icon. Icon gắn ở tầng hiển thị qua `iconKey`.
 */

export * from "./nav/nav-types"
export * from "./nav/nav-mother"
export * from "./nav/nav-industry"
export * from "./nav/nav-chain"
export * from "./nav/nav-store"
export * from "./nav/index"

import { STORE_NAV_ENTRIES, NAV_GROUP_CONFIG } from "./nav/nav-store"

/**
 * Danh sách NAV_ENTRIES mặc định dùng chung cho kiểm tra ma trận (nav-matrix)
 * và tương thích ngược với các thành phần cũ.
 */
export const NAV_ENTRIES = STORE_NAV_ENTRIES
export { NAV_GROUP_CONFIG }
