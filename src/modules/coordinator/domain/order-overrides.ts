/**
 * Override có vết so với snapshot Master Index (Hợp đồng MI §6, bản tối
 * thiểu — ĐP-2.8, 26/09/2026).
 *
 * Khi Sales chọn mẫu từ Product Master Index rồi sửa BOM/màu trước khi tạo
 * đơn, đơn phải NHỚ đã đổi gì so với công thức gốc — không âm thầm ghi đè.
 * Bản đầy đủ (sửa qua T04, nhiều điểm chỉnh sau khi đơn đã tạo) làm ở ĐP-4a;
 * hàm này chỉ so một lần lúc tạo đơn.
 *
 * Hàm thuần — không import Prisma, không gọi mạng.
 */

import type { CoordinatorProductSnapshot } from "@/modules/products/domain/product-master-index"

export interface OrderFieldOverride {
  path: string
  masterValue: unknown
  orderValue: unknown
  by: string
  at: string
  reason?: string | undefined
}

export interface OrderFlowerInput {
  flowerName: string
  quantity: number
  unit: string
  color: string
  role: string
}

/**
 * So công thức hoa Sales gửi lên với `bom.flowers` của snapshot. Khớp theo
 * `flowerName` (không phân biệt hoa/thường, cắt khoảng trắng) — snapshot
 * chưa có id ổn định cho từng dòng BOM nên đây là khoá khớp thực tế duy nhất.
 *
 * - Có trong snapshot, đổi `quantity`/`unit`/`color` → 1 override mỗi trường đổi.
 * - Có trong đơn nhưng KHÔNG có trong snapshot → override `bom.flowers[+]` (thêm loài mới).
 * - Có trong snapshot nhưng bị Sales xoá khỏi đơn → override `bom.flowers[-]` (bớt loài).
 */
export function diffAgainstSnapshot(
  snapshot: CoordinatorProductSnapshot,
  orderFlowers: OrderFlowerInput[],
  by: string,
  now: Date = new Date()
): OrderFieldOverride[] {
  const at = now.toISOString()
  const norm = (n: string) => n.trim().toLowerCase()
  const overrides: OrderFieldOverride[] = []

  const masterByName = new Map(snapshot.bom.flowers.map((f) => [norm(f.flowerName), f]))
  const orderByName = new Map(orderFlowers.map((f) => [norm(f.flowerName), f]))

  for (const [key, masterFlower] of masterByName) {
    const orderFlower = orderByName.get(key)
    if (!orderFlower) {
      overrides.push({
        path: `bom.flowers[-]`,
        masterValue: masterFlower.flowerName,
        orderValue: null,
        by,
        at,
      })
      continue
    }
    for (const field of ["quantity", "unit", "color"] as const) {
      if (masterFlower[field] !== orderFlower[field]) {
        overrides.push({
          path: `bom.flowers[${masterFlower.flowerName}].${field}`,
          masterValue: masterFlower[field],
          orderValue: orderFlower[field],
          by,
          at,
        })
      }
    }
  }

  for (const [key, orderFlower] of orderByName) {
    if (!masterByName.has(key)) {
      overrides.push({
        path: `bom.flowers[+]`,
        masterValue: null,
        orderValue: orderFlower.flowerName,
        by,
        at,
      })
    }
  }

  return overrides
}
