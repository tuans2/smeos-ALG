import type { IndustryBomAdapterKey, IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import { normalizeProductBom } from "@/modules/products/domain/bom"
import type { Material } from "./costing-types"

/** Một dòng công thức nháp đọc từ BOM do AI bóc tách — chưa chắc đã ghép được với nguyên liệu. */
export interface DraftRecipeLine {
  name: string
  quantity: number
  unit: string
  categoryKey: string
  /** Nguyên liệu đã ghép theo tên; `null` = cần người dùng chọn hoặc tạo mới. */
  materialId: string | null
}

type Adapter = (rawBom: unknown, spec: IndustryCostingSpec) => Omit<DraftRecipeLine, "materialId">[]

const FLORAL_ROLE_TO_CATEGORY: Record<string, string> = {
  PRIMARY: "MAIN_FLOWER",
  "CHỦ ĐẠO": "MAIN_FLOWER",
  SECONDARY: "SECONDARY_FLOWER",
  "PHỤ": "SECONDARY_FLOWER",
  "ĐIỂM XUYẾN": "SECONDARY_FLOWER",
  "LẤP ĐẦY": "SECONDARY_FLOWER",
  FOLIAGE: "FOLIAGE",
  PACKAGING: "WRAPPING",
}

const firstCategory = (spec: IndustryCostingSpec) => spec.materialCategories[0]?.key ?? "OTHER"

/** Ngành hoa: BOM Vision có `flowers` (vai trò hoa), `foliage`, `wrapping` — xem `products/domain/bom.ts`. */
const floralVision: Adapter = (rawBom, spec) => {
  const bom = normalizeProductBom(rawBom)
  const known = new Set(spec.materialCategories.map((c) => c.key))
  const pick = (role: string | undefined) => {
    const key = FLORAL_ROLE_TO_CATEGORY[(role ?? "").toUpperCase()] ?? "MAIN_FLOWER"
    return known.has(key) ? key : firstCategory(spec)
  }
  return [...bom.components, ...(bom.packaging ?? [])].map((i) => ({
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    categoryKey: pick(i.role),
  }))
}

/** Ngành chưa có bộ đọc riêng: lấy thành phần chung, xếp vào nhóm đầu tiên của ngành. */
const generic: Adapter = (rawBom, spec) => {
  const bom = normalizeProductBom(rawBom)
  return [...bom.components, ...(bom.packaging ?? [])].map((i) => ({
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    categoryKey: firstCategory(spec),
  }))
}

const ADAPTERS: Record<IndustryBomAdapterKey, Adapter> = {
  FLORAL_VISION: floralVision,
  GENERIC: generic,
}

/** So khớp tên không phân biệt hoa/thường, dấu tiếng Việt và khoảng trắng thừa. */
export function normalizeMaterialName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * BOM do AI bóc tách → dòng công thức nháp (#31), ghép sẵn với nguyên liệu cùng tên. Không tự
 * tạo nguyên liệu: dòng chưa ghép được giữ `materialId: null` để người dùng quyết định.
 */
export function draftRecipeFromBom(rawBom: unknown, spec: IndustryCostingSpec, materials: readonly Material[]): DraftRecipeLine[] {
  const index = new Map(materials.filter((m) => m.active).map((m) => [normalizeMaterialName(m.name), m.id]))
  const merged = new Map<string, DraftRecipeLine>()
  for (const line of ADAPTERS[spec.bomAdapter](rawBom, spec)) {
    const key = normalizeMaterialName(line.name)
    if (!key) continue
    const existing = merged.get(key)
    if (existing) existing.quantity += line.quantity
    else merged.set(key, { ...line, materialId: index.get(key) ?? null })
  }
  return [...merged.values()]
}
