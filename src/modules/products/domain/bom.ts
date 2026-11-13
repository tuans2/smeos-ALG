/**
 * bom.ts — Định nghĩa và chuẩn hóa BOM (Bill of Materials / Thành phần cấu tạo sản phẩm)
 *
 * Áp dụng nguyên tắc tách biệt dữ liệu nguyên tử (Atomic Disaggregated Fields):
 * - Tên thành phần (name)
 * - Số lượng / định mức (quantity)
 * - Đơn vị tính (unit)
 * - Vai trò thành phần (role: PRIMARY, SECONDARY, ACCESSORY, PACKAGING...)
 * - Chi phí đơn vị ước tính nếu có (costVnd)
 *
 * Hàm thuần — Không import Prisma, tương thích 100% với cấu trúc cũ (flowers, wrapping).
 */

export interface ProductBomItem {
  id?: string | undefined
  name: string
  quantity: number
  unit: string
  role?: string | undefined
  costVnd?: number | undefined
  note?: string | undefined
}

export interface GenericProductBom {
  components: ProductBomItem[]
  packaging?: ProductBomItem[] | undefined
  notes?: string | undefined
}

/**
 * Chuẩn hóa dữ liệu BOM từ bất kỳ nguồn nào (Legacy Floral BOM hoặc Generic BOM)
 */
export function normalizeProductBom(rawBom: unknown): GenericProductBom {
  if (!rawBom || typeof rawBom !== "object") {
    return { components: [], packaging: [] }
  }

  const bomObj = rawBom as Record<string, unknown>

  // Trường hợp 1: Đã là định dạng GenericProductBom
  if (Array.isArray(bomObj.components)) {
    const components = (bomObj.components as Array<Record<string, unknown>>)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : undefined,
        name: String(item.name || "").trim(),
        quantity: typeof item.quantity === "number" ? item.quantity : Number(item.quantity) || 1,
        unit: String(item.unit || "cái").trim(),
        role: typeof item.role === "string" ? item.role : undefined,
        costVnd: typeof item.costVnd === "number" ? item.costVnd : undefined,
        note: typeof item.note === "string" ? item.note : undefined,
      }))
      .filter((item) => item.name.length > 0)

    const packaging = Array.isArray(bomObj.packaging)
      ? (bomObj.packaging as Array<Record<string, unknown>>).map((item) => ({
          name: String(item.name || "").trim(),
          quantity: typeof item.quantity === "number" ? item.quantity : Number(item.quantity) || 1,
          unit: String(item.unit || "cái").trim(),
          role: "PACKAGING",
        }))
      : []

    return { components, packaging, notes: typeof bomObj.notes === "string" ? bomObj.notes : undefined }
  }

  // Trường hợp 2: Legacy Floral BOM (chứa flowers, foliage, wrapping)
  const components: ProductBomItem[] = []
  const packaging: ProductBomItem[] = []

  if (Array.isArray(bomObj.flowers)) {
    for (const f of bomObj.flowers as Array<Record<string, unknown>>) {
      const name = String(f.name || f.nhom_hoa || "").trim()
      if (!name) continue
      const quantity = typeof f.quantity === "number" ? f.quantity : Number(f.so_luong || f.quantity) || 1
      const unit = String(f.unit || f.don_vi || "cành").trim()
      const role = String(f.role || f.vai_tro || "PRIMARY").toUpperCase()
      components.push({ name, quantity, unit, role })
    }
  }

  if (Array.isArray(bomObj.foliage)) {
    for (const f of bomObj.foliage as Array<Record<string, unknown>>) {
      const name = String(f.name || f.loai_la || "").trim()
      if (!name) continue
      const quantity = typeof f.quantity === "number" ? f.quantity : Number(f.so_luong || f.quantity) || 1
      const unit = String(f.unit || f.don_vi || "nhánh").trim()
      components.push({ name, quantity, unit, role: "FOLIAGE" })
    }
  }

  if (Array.isArray(bomObj.wrapping)) {
    for (const w of bomObj.wrapping as Array<Record<string, unknown>>) {
      const material = String(w.material || w.chat_lieu || "").trim()
      const color = String(w.color || w.mau_sac || "").trim()
      const name = [material, color].filter(Boolean).join(" ") || "Giấy gói"
      packaging.push({ name, quantity: 1, unit: "lớp", role: "PACKAGING" })
    }
  }

  return { components, packaging }
}

/**
 * Trích xuất danh sách tên tất cả thành phần để hiển thị tóm tắt
 */
export function extractComponentNames(rawBom: unknown): string[] {
  const normalized = normalizeProductBom(rawBom)
  const names = normalized.components.map((c) => c.name)
  return Array.from(new Set(names))
}

/**
 * Chi phí nguyên liệu của MỘT sản phẩm theo định mức: Σ (đơn giá × định mức) của các thành phần có
 * đơn giá. `null` khi chưa thành phần nào có đơn giá — nơi gọi tự chọn cách tính khác.
 */
export function bomMaterialCostVnd(rawBom: unknown): number | null {
  const bom = normalizeProductBom(rawBom)
  const priced = [...bom.components, ...(bom.packaging ?? [])].filter((i) => typeof i.costVnd === "number" && i.costVnd > 0)
  if (priced.length === 0) return null
  return Math.round(priced.reduce((sum, i) => sum + (i.costVnd ?? 0) * i.quantity, 0))
}
