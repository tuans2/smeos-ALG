/**
 * Phạm vi cửa hàng được chỉnh trường dữ liệu (checklist ALG 1.9) — luật thuần.
 *
 * Cửa hàng chỉ được NÂNG, không được hạ mức của nền tảng: không hạ mức yêu cầu, không ẩn trường nền tảng
 * bắt buộc, không mở trường "chỉ nội bộ" ra ngoài. Trường cửa hàng tự tạo thì cửa hàng toàn quyền
 * (trừ kiểu cần danh mục do nền tảng quản lý).
 */

import type { CustomFieldDataType } from "./custom-field-schema"
import { CUSTOM_FIELD_DATA_TYPES } from "./custom-field-schema"
import type { FieldAudience, FieldRequirementLevel } from "./core-field-registry"

const RANK: Record<FieldRequirementLevel, number> = { OPTIONAL: 0, RECOMMENDED: 1, REQUIRED: 2 }

/** Kiểu chọn từ danh mục cần danh mục của nền tảng — cửa hàng không tự tạo được. */
export const SHOP_FIELD_DATA_TYPES: readonly CustomFieldDataType[] = CUSTOM_FIELD_DATA_TYPES.filter(
  (t) => t !== "SELECT" && t !== "MULTI_SELECT",
)

export interface PlatformFieldFloor {
  readonly requirement: FieldRequirementLevel
  readonly floorInternalOnly: boolean
}

export interface ShopFieldChange {
  readonly requirement?: FieldRequirementLevel | undefined
  readonly isEnabled?: boolean | undefined
  readonly visibility?: Partial<Record<FieldAudience, boolean | undefined>> | undefined
}

/** Lý do không cho cửa hàng chỉnh một trường của nền tảng; `null` = hợp lệ. */
export function shopOverrideProblem(floor: PlatformFieldFloor, change: ShopFieldChange): string | null {
  if (change.requirement && RANK[change.requirement] < RANK[floor.requirement]) {
    return "Không hạ được mức yêu cầu của trường nền tảng"
  }
  if (change.isEnabled === false && floor.requirement === "REQUIRED") {
    return "Trường bắt buộc của nền tảng không ẩn được"
  }
  if (floor.floorInternalOnly && change.visibility) {
    for (const audience of ["PARTNER", "SHIPPER", "CUSTOMER"] as const) {
      if (change.visibility[audience] === true) return "Trường này chỉ dùng nội bộ, không mở cho bên ngoài được"
    }
  }
  return null
}
