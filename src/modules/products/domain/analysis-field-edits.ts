/**
 * Sửa Thẻ sản phẩm (kết quả quét ảnh) trước khi duyệt — thêm/sửa/xoá dòng thành phần, đổi trường nhận dạng, ghi chú,
 * checklist. Tách nguyên văn từ /tai-anh để /tai-anh và hành trình Tạo nội dung trên /cong-cu dùng chung một luật
 * (không đổi hành vi). Thuần — không React, không hạ tầng.
 */

export type AnalysisData = Record<string, unknown>
type BomRow = Record<string, unknown>

/** Một dòng danh sách đang sửa — cùng hình dạng `ResultFieldItem` của thẻ kết quả. */
export interface AnalysisFieldItem {
  id: string
  value?: string
  name?: string | null | undefined
  unit?: string | null | undefined
  quantity?: number | string | null | undefined
}

export function applyItemChange(prev: AnalysisData, key: string, itemId: string, item: AnalysisFieldItem): AnalysisData {
  const bom = { ...((prev.bom as Record<string, unknown>) ?? {}) }

  if (key === "flowers") {
    const flowers = Array.isArray(bom.flowers) ? [...bom.flowers] : []
    const idx = flowers.findIndex((f: BomRow, i: number) => (f.id ? f.id === itemId : `flower-${i}` === itemId))
    if (idx >= 0) {
      flowers[idx] = {
        ...flowers[idx],
        name: item.name,
        dvt_dem: item.unit,
        quantity: item.quantity,
        count: item.quantity,
      }
    }
    bom.flowers = flowers
    const newTotal = flowers.reduce((sum: number, f: BomRow) => sum + (Number(f.quantity ?? f.count) || 0), 0)
    return {
      ...prev,
      bom,
      flower_count: newTotal,
      total_stems: newTotal,
    }
  }

  if (key === "foliage") {
    const foliage = Array.isArray(bom.foliage) ? [...bom.foliage] : []
    const idx = foliage.findIndex((f: BomRow, i: number) => (f.id ? f.id === itemId : `foliage-${i}` === itemId))
    if (idx >= 0) {
      foliage[idx] = {
        ...foliage[idx],
        name: item.name,
        dvt_dem: item.unit,
        quantity: item.quantity,
        count: item.quantity,
      }
    }
    bom.foliage = foliage
    return { ...prev, bom }
  }

  if (key === "accessories") {
    const accessories = Array.isArray(bom.accessories) ? [...bom.accessories] : []
    const idx = accessories.findIndex((a: BomRow, i: number) => (a.id ? a.id === itemId : `accessory-${i}` === itemId))
    if (idx >= 0) {
      accessories[idx] = {
        ...accessories[idx],
        name: item.name,
        quantity: item.quantity,
      }
    }
    bom.accessories = accessories
    return { ...prev, bom }
  }

  return prev
}

export function applyFieldChange(prev: AnalysisData, key: string, value: string | number | string[]): AnalysisData {
  const identity = { ...((prev.identity as Record<string, unknown>) ?? {}) }
  const bom = { ...((prev.bom as Record<string, unknown>) ?? {}) }

  if (["category", "shape", "facing", "container", "phong_cach", "dip_su_dung"].includes(key)) {
    identity[key] = value
    return { ...prev, identity }
  }
  if (key === "materials_note") {
    bom.materials_note = value
    return { ...prev, bom }
  }
  if (key.startsWith("checklist.")) {
    const checklist = { ...((prev.checklist as Record<string, unknown>) ?? {}) }
    checklist[key.slice("checklist.".length)] = value
    return { ...prev, checklist }
  }
  if (key === "so_tang_lop") {
    const san_xuat = { ...((prev.san_xuat as Record<string, unknown>) ?? {}) }
    san_xuat.so_tang_lop = typeof value === "number" ? value : Number(value) || null
    return { ...prev, san_xuat }
  }
  return { ...prev, [key]: value }
}

export function applyFieldAdd(prev: AnalysisData, key: string, item: AnalysisFieldItem): AnalysisData {
  const bom = { ...((prev.bom as Record<string, unknown>) ?? {}) }

  if (key === "flowers") {
    const flowers = Array.isArray(bom.flowers) ? [...bom.flowers] : []
    flowers.push({
      id: item.id,
      name: item.name || "Hoa mới",
      dvt_dem: item.unit || "bông",
      quantity: item.quantity ?? 1,
      count: item.quantity ?? 1,
      role: "hoa phụ",
    })
    bom.flowers = flowers
    const newTotal = flowers.reduce((sum: number, f: BomRow) => sum + (Number(f.quantity ?? f.count) || 0), 0)
    return { ...prev, bom, flower_count: newTotal, total_stems: newTotal }
  }

  if (key === "foliage") {
    const foliage = Array.isArray(bom.foliage) ? [...bom.foliage] : []
    foliage.push({
      id: item.id,
      name: item.name || "Lá mới",
      dvt_dem: item.unit || "cành",
      quantity: item.quantity ?? 1,
      count: item.quantity ?? 1,
      role: "lá phụ",
    })
    bom.foliage = foliage
    return { ...prev, bom }
  }

  if (key === "accessories") {
    const accessories = Array.isArray(bom.accessories) ? [...bom.accessories] : []
    accessories.push({
      id: item.id,
      name: item.name || "Phụ kiện mới",
      quantity: item.quantity ?? 1,
    })
    bom.accessories = accessories
    return { ...prev, bom }
  }

  if (key === "wrapping") {
    const wrapping = Array.isArray(bom.wrapping) ? [...bom.wrapping] : []
    wrapping.push({
      layer: `Lớp ${wrapping.length + 1}`,
      material: item.value || "Giấy gói",
    })
    bom.wrapping = wrapping
    return { ...prev, bom }
  }

  return prev
}

export function applyFieldRemove(prev: AnalysisData, key: string, itemId: string): AnalysisData {
  const bom = { ...((prev.bom as Record<string, unknown>) ?? {}) }

  if (key === "flowers") {
    const flowers = (Array.isArray(bom.flowers) ? bom.flowers : []).filter(
      (f: BomRow, i: number) => (f.id ? f.id !== itemId : `flower-${i}` !== itemId)
    )
    bom.flowers = flowers
    const newTotal = flowers.reduce((sum: number, f: BomRow) => sum + (Number(f.quantity ?? f.count) || 0), 0)
    return { ...prev, bom, flower_count: newTotal, total_stems: newTotal }
  }

  if (key === "foliage") {
    const foliage = (Array.isArray(bom.foliage) ? bom.foliage : []).filter(
      (f: BomRow, i: number) => (f.id ? f.id !== itemId : `foliage-${i}` !== itemId)
    )
    bom.foliage = foliage
    return { ...prev, bom }
  }

  if (key === "accessories") {
    const accessories = (Array.isArray(bom.accessories) ? bom.accessories : []).filter(
      (a: BomRow, i: number) => (a.id ? a.id !== itemId : `accessory-${i}` !== itemId)
    )
    bom.accessories = accessories
    return { ...prev, bom }
  }

  if (key === "wrapping") {
    const wrapping = (Array.isArray(bom.wrapping) ? bom.wrapping : []).filter(
      (_: unknown, i: number) => `wrapping-${i}` !== itemId
    )
    bom.wrapping = wrapping
    return { ...prev, bom }
  }

  return prev
}
