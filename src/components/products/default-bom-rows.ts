import type { BomItem } from "./create-product-types"

/**
 * Dòng công thức ban đầu của form Thêm sản phẩm: dòng TRỐNG theo vai của ngành (chữ gợi ý nằm ở ô nhập; dòng
 * không tên bị bỏ khi lưu). Không điền sẵn nguyên liệu mẫu — lưu nhầm thành công thức thật (GD1 Bước 6, B-01;
 * PO 11/11/2026).
 */
export function defaultBomRows(
  industryKey: string,
  roles: readonly { label: string }[],
  units: readonly string[],
  defaultQuantity: number
): BomItem[] {
  const count = industryKey === "FLORAL" ? 3 : Math.min(2, Math.max(1, roles.length))
  return Array.from({ length: count }, (_, i) => ({
    id: `init-${i + 1}`,
    name: "",
    quantity: i === 0 ? defaultQuantity : 1,
    unit: units[0] ?? "cái",
    color: "",
    role: roles[Math.min(i, Math.max(0, roles.length - 1))]?.label ?? "Chủ đạo",
  }))
}
