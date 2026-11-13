/**
 * Khu "Vận hành cửa hàng" (PO QĐ1 — không thuộc 6 module tăng trưởng).
 *
 * SSOT: `02_DANH_MUC_ASSET.md` phần C.
 * Gồm 5 nhóm với 25 công cụ vận hành:
 * - Tính giá và lợi nhuận (#31, #32, #33, #34, #35)
 * - Đơn hàng và giao hàng (#17, #19, #36, #37, #38, #39, #40, #41, #59, #60)
 * - Thanh toán (#20, #62)
 * - Chuỗi cửa hàng (#42, #43, #44, #46, #47, #48)
 * - Số liệu và tối ưu (#50, #63)
 */

import { getAllTools, type ToolDefinition } from "./toolkit-catalog"

export interface StoreOperationGroupSpec {
  readonly key: string
  readonly name: string
  readonly purpose: string
  readonly icon: string
  readonly toolIds: readonly number[]
}

export const STORE_OPERATION_GROUP_SPECS: readonly StoreOperationGroupSpec[] = [
  {
    key: "pricing",
    name: "Tính giá và lợi nhuận",
    purpose: "Công thức tính giá vốn, giá bán lẻ và tỷ suất lợi nhuận",
    icon: "Calculator",
    toolIds: [31, 32, 33, 34, 35],
  },
  {
    key: "order_fulfillment",
    name: "Đơn hàng và giao hàng",
    purpose: "Tiếp nhận đơn, phân loại, in phiếu và theo dõi tiến độ giao",
    icon: "PackageCheck",
    toolIds: [17, 19, 36, 37, 38, 39, 40, 41, 59, 60],
  },
  {
    key: "payment",
    name: "Thanh toán & đặt cọc",
    purpose: "Quy định đặt cọc, tài khoản nhận tiền và xác nhận thanh toán",
    icon: "Wallet",
    toolIds: [20, 62],
  },
  {
    key: "chain",
    name: "Chuỗi cửa hàng",
    purpose: "Điều phối đơn giữa các chi nhánh, kho tổng và đối tác nhượng quyền",
    icon: "Building2",
    toolIds: [42, 43, 44, 46, 47, 48],
  },
  {
    key: "analytics",
    name: "Số liệu và tối ưu",
    purpose: "Báo cáo doanh thu, hiệu quả bán hàng và đề xuất cải tiến",
    icon: "BarChart3",
    toolIds: [50, 63],
  },
]

export const STORE_OPERATIONS_TOOL_IDS: readonly number[] = STORE_OPERATION_GROUP_SPECS.flatMap((g) => g.toolIds)

export interface StoreOperationGroup {
  readonly key: string
  readonly name: string
  readonly purpose: string
  readonly icon: string
  readonly tools: readonly ToolDefinition[]
}

export interface StoreOperationsSection {
  readonly key: "store_operations"
  readonly name: string
  readonly purpose: string
  readonly icon: string
  readonly groups: readonly StoreOperationGroup[]
}

export function getStoreOperationsSection(isDev: boolean): StoreOperationsSection {
  const toolMap = new Map<number, ToolDefinition>(getAllTools().map((t) => [t.id, t]))

  const groups: StoreOperationGroup[] = STORE_OPERATION_GROUP_SPECS.map((spec) => {
    const tools = spec.toolIds
      .map((id) => toolMap.get(id))
      .filter((t): t is ToolDefinition => Boolean(t))
      .filter((t) => (isDev ? true : t.status === "DONE"))

    return {
      key: spec.key,
      name: spec.name,
      purpose: spec.purpose,
      icon: spec.icon,
      tools,
    }
  }).filter((g) => (isDev ? true : g.tools.length > 0))

  return {
    key: "store_operations",
    name: "Vận hành cửa hàng",
    purpose: "Công cụ tính giá, xử lý đơn hàng, thanh toán và quản lý vận hành tiệm",
    icon: "Settings",
    groups,
  }
}
