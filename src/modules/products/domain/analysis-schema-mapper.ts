/**
 * analysis-schema-mapper.ts
 *
 * Ánh xạ chuẩn 100% dữ liệu từ Hợp đồng AI Vision (Schema.json) ra ResultField cho UI.
 * OSOT: workers/vision/contracts/Schema.json làm chuẩn mẫu.
 * Quy tắc: Mọi trường trong schema đều phải có mặt trên UI, nếu không có hoặc chưa có dữ liệu thì hiển thị "N/A".
 */

import schemaContract from "../../../../workers/vision/contracts/Schema.json"
import type { ResultField, ResultFieldItem } from "@/components/result/result-card"

/** Một dòng thô trong BOM của kết quả phân tích (JSON do mô hình trả, chưa kiểm dạng). */
type RawRow = Record<string, unknown>

export interface SchemaMetadata {
  name: string
  strict: boolean
  properties: Record<string, unknown>
}

export const VISION_SCHEMA = schemaContract

/**
 * Nhãn tiếng Việt thân thiện cho từng trường trong Schema.json
 */
export const FIELD_LABELS: Record<string, string> = {
  // BOM lists
  flowers: "Danh sách nguyên liệu",
  foliage: "Lá, cành phụ",
  accessories: "Phụ kiện & Nơ",
  wrapping: "Vật liệu gói & Bao bì",
  card_printed_text: "Nội dung chữ trên thiệp (OCR)",
  materials_note: "Ghi chú vật liệu",
  // Identity
  category: "Phân loại sản phẩm",
  shape: "Hình dáng thiết kế",
  facing: "Hướng nhìn / Mặt hoa",
  container: "Vật chứa",
  phong_cach: "Phong cách thiết kế",
  dip_su_dung: "Dịp sử dụng đề xuất",
  // San xuat
  so_tang_lop: "Cấu trúc sản xuất (Số tầng lớp cắm)",
  // Palette & Checklist
  palette_accounting: "Bảng màu & Cụm màu (Palette Accounting)",
  checklist: "Checklist 10 cấu phần tiêu chuẩn",
  // Confidence & Totals
  confidence: "Độ tin cậy tổng thể",
  totals: "Tổng số cành / hoa",
  "totals-bud": "Tổng số nụ",
  "totals-damaged": "Tổng số cành hỏng",
}

export const CHECKLIST_LABELS: Record<string, string> = {
  hoa_chu_dao: "Hoa chủ đạo",
  hoa_phu: "Hoa phụ",
  hoa_lap_day: "Hoa lấp đầy",
  la_nen: "Lá nền",
  la_diem_nhan: "Lá điểm nhấn",
  vat_lieu_goi: "Vật liệu gói",
  day_buoc: "Dây buộc",
  ruy_bang: "Ruy băng",
  thiep_bien_chu: "Thiệp / Biển chữ",
  phu_kien_trang_tri: "Phụ kiện trang trí",
  // Homestay checklist
  giuong_ga_goi_sach: "Giường, ga & gối sạch sẽ",
  anh_sang_tu_nhien: "Ánh sáng tự nhiên / Cửa sổ",
  phong_ngu_sach_gon: "Phòng ngủ gọn gàng, ngăn nắp",
  noi_that_dong_bo: "Nội thất đồng bộ & Hài hòa",
  dieu_hoa_hoat_dong: "Điều hòa / Quạt thông gió",
  view_dep_ben_ngoai: "Tầm nhìn / View thoáng đẹp",
  thiet_bi_ve_sinh_du: "Khu vệ sinh sạch & Đầy đủ tiện ích",
  dieu_kien_an_toan: "Đảm bảo an toàn & Tiêu chuẩn đón khách",
}

/**
 * Bản đồ nhãn tuỳ biến theo từng ngành công nghiệp (SSOT)
 */
const INDUSTRY_FIELD_OVERRIDES: Record<string, Partial<Record<string, string>>> = {
  HOMESTAY: {
    flowers: "Tiện nghi phòng nhìn thấy",
    foliage: "Vật liệu bề mặt & Cấu trúc",
    accessories: "Đồ trang trí & Điểm nhấn",
    wrapping: "Chăn ga gối & Đồ vải",
    card_printed_text: "Bảng biển / Nội quy / Thẻ phòng (OCR)",
    materials_note: "Ghi chú tiện ích & Hiện trạng phòng",
    category: "Hạng phòng / Loại hình lưu trú",
    shape: "Bố cục & Không gian phòng",
    facing: "Hướng nhìn (View phòng)",
    container: "Loại giường / Sức chứa",
    phong_cach: "Phong cách thiết kế nội thất",
    dip_su_dung: "Mục đích lưu trú phù hợp",
    so_tang_lop: "Đẳng cấp & Tiêu chuẩn phòng",
    palette_accounting: "Bảng màu không gian phòng",
    checklist: "Checklist 8 tiêu chuẩn kiểm phòng",
    totals: "Tổng tiện nghi phòng",
    "totals-bud": "Tiện nghi đạt chuẩn",
    "totals-damaged": "Điểm cần xử lý / Khắc phục",
  },
}

export function resolveFieldLabels(industryKey?: string): Record<string, string> {
  const normalizedKey = (industryKey ?? "").toUpperCase()
  const overrides = INDUSTRY_FIELD_OVERRIDES[normalizedKey] ?? {}
  return Object.assign({}, FIELD_LABELS, overrides) as Record<string, string>
}

/**
 * Ánh xạ toàn bộ dữ liệu phân tích sang mảng ResultField dựa trên Schema.json.
 * Đảm bảo 100% các trường trong Schema.json đều được hiển thị.
 * Bất kỳ trường nào rỗng / null / chưa có đều nhận giá trị "N/A".
 */
export function mapAnalysisFromSchema(
  raw: Record<string, unknown> | null | undefined,
  industryKey?: string
): ResultField[] {
  const activeLabels = resolveFieldLabels(industryKey)
  const data = raw ?? {}
  const bom = (data.bom as Record<string, unknown> | undefined) ?? {}
  const identity = (data.identity as Record<string, unknown> | undefined) ?? {}
  const checklist = (data.checklist as Record<string, unknown> | undefined) ?? {}
  const sanXuat = (data.san_xuat as Record<string, unknown> | undefined) ?? {}

  // 1. Flowers (bom.flowers)
  const flowersList = Array.isArray(bom.flowers) ? bom.flowers : []
  const flowers: ResultFieldItem[] = flowersList.map((f: {
    id?: string
    name?: string | null
    nhom_hoa?: string | null
    quantity?: number | null
    count?: number | null
    dvt_dem?: string | null
    role?: string | null
    mau?: string | null
    color?: string | null
    shade?: string | null
    mo_ta_mau?: string | null
    so_nu?: number | null
    so_hong?: number | null
    confidence?: number | null
    // MI-12 (ĐP-2b, 26/09/2026)
    bien_the?: string | null
    chieu_dai_cm?: number | null
    duoc_thay_the?: boolean | null
    thu_tu_uu_tien_thay_the?: number | null
  }, i: number) => {
    const name = f.name ?? f.nhom_hoa ?? "N/A"
    const qty = f.quantity ?? f.count ?? null
    const unit = f.dvt_dem ?? "cành"
    const qtyStr = qty != null ? `${qty} ${unit.toLowerCase()}` : "N/A"
    const roleStr = f.role ? `(${f.role})` : null
    const colorDesc = [f.mau, f.mo_ta_mau || f.color].filter(Boolean).join(" - ")
    const colorStr = colorDesc ? `• ${colorDesc}` : null
    const nuStr = f.so_nu && f.so_nu > 0 ? `• ${f.so_nu} nụ` : null
    const hongStr = f.so_hong && f.so_hong > 0 ? `• ${f.so_hong} cành hỏng` : null
    // MI-12 (ĐP-2b, 26/09/2026) — chỉ hiện khi AI/người nhập có xác định, không suy đoán.
    const varietyStr = f.bien_the ? `• Giống: ${f.bien_the}` : null
    const stemLengthStr = f.chieu_dai_cm ? `• Dài ${f.chieu_dai_cm}cm` : null
    const substitutionStr = f.duoc_thay_the != null
      ? `• ${f.duoc_thay_the ? "Được thay thế" : "Không thay thế"}${f.thu_tu_uu_tien_thay_the != null ? ` (ưu tiên ${f.thu_tu_uu_tien_thay_the})` : ""}`
      : null

    const parts = [name, `— ${qtyStr}`, roleStr, colorStr, nuStr, hongStr, varietyStr, stemLengthStr, substitutionStr].filter(Boolean).join(" ")
    return {
      id: f.id ?? `flower-${i}`,
      name: f.name ?? f.nhom_hoa ?? "",
      unit,
      quantity: qty,
      role: f.role ?? undefined,
      color: colorDesc || undefined,
      extra: [nuStr, hongStr, varietyStr, stemLengthStr, substitutionStr].filter(Boolean).join(" • ") || undefined,
      value: parts || "N/A",
    }
  })

  // 2. Foliage (bom.foliage)
  const foliageList = Array.isArray(bom.foliage) ? bom.foliage : []
  const foliage: ResultFieldItem[] = foliageList.map((f: {
    id?: string
    name?: string | null
    quantity?: number | null
    count?: number | null
    dvt_dem?: string | null
    role?: string | null
    color?: string | null
    mau?: string | null
    mo_ta_mau?: string | null
    duoc_thay_the?: boolean | null // MI-12 (ĐP-2b, 26/09/2026)
  }, i: number) => {
    const name = f.name ?? "N/A"
    const qty = f.quantity ?? f.count ?? null
    const unit = f.dvt_dem ?? "cành"
    const qtyStr = qty != null ? `${qty} ${unit.toLowerCase()}` : "N/A"
    const roleStr = f.role ? `(${f.role})` : null
    const colorDesc = [f.mau, f.mo_ta_mau || f.color].filter(Boolean).join(" - ")
    const colorStr = colorDesc ? `• ${colorDesc}` : null

    const substitutionStr = f.duoc_thay_the != null ? `• ${f.duoc_thay_the ? "Được thay thế" : "Không thay thế"}` : null
    const parts = [`🌿 ${name}`, `— ${qtyStr}`, roleStr, colorStr, substitutionStr].filter(Boolean).join(" ")
    return {
      id: f.id ?? `foliage-${i}`,
      name: f.name ?? "",
      unit,
      quantity: qty,
      role: f.role ?? undefined,
      color: colorDesc || undefined,
      extra: substitutionStr || undefined,
      value: parts || "N/A",
    }
  })

  // 3. Accessories (bom.accessories)
  const accessoriesList = Array.isArray(bom.accessories) ? bom.accessories : []
  const accessories: ResultFieldItem[] = accessoriesList.map((a: {
    id?: string
    name?: string | null
    material?: string | null
    color?: string | null
    quantity?: number | null
    printed_text?: string | null
    don_vi?: string | null // MI-12 (ĐP-2b, 26/09/2026)
    duoc_thay_the?: boolean | null
  }, i: number) => {
    const rawName = a.name ?? "N/A"
    const isCard = rawName.toLowerCase().includes("thiệp") || rawName.toLowerCase().includes("biển") || Boolean(a.printed_text)
    const icon = isCard ? "💌 " : "🎀 "
    const name = `${icon}${rawName}`
    const qty = a.quantity ?? 1
    const unit = a.don_vi ?? "cái"
    const matStr = a.material ? `(${a.material})` : null
    const colorStr = a.color ? `• Màu ${a.color}` : null
    const textStr = a.printed_text ? `• In: "${a.printed_text}"` : null
    const substitutionStr = a.duoc_thay_the != null ? `• ${a.duoc_thay_the ? "Được thay thế" : "Không thay thế"}` : null

    const parts = [name, `— ${qty} ${unit}`, matStr, colorStr, textStr, substitutionStr].filter(Boolean).join(" ")
    return {
      id: a.id ?? `accessory-${i}`,
      name: a.name ?? "",
      unit,
      quantity: qty,
      role: a.material ? `Chất liệu: ${a.material}` : undefined,
      color: a.color ?? undefined,
      extra: [a.printed_text ? `In: "${a.printed_text}"` : null, substitutionStr].filter(Boolean).join(" • ") || undefined,
      value: parts || "N/A",
    }
  })

  // 4. Wrapping (bom.wrapping)
  const wrappingList = Array.isArray(bom.wrapping) ? bom.wrapping : []
  const wrapping: ResultFieldItem[] = wrappingList.map((w: {
    id?: string
    layer?: string | null
    material?: string | null
    color?: string | null
    texture?: string | null
    name?: string | null
    hoa_van?: string | null // MI-12 (ĐP-2b, 26/09/2026)
    so_luong?: number | null
    duoc_thay_the?: boolean | null
  }, i: number) => {
    const layer = w.layer ?? `Lớp ${i + 1}`
    const mat = w.material ?? w.name ?? "Giấy gói"
    const colorStr = w.color ? `• Màu ${w.color}` : null
    const texStr = w.texture ? `(${w.texture})` : null
    const patternStr = w.hoa_van ? `• Hoạ tiết: ${w.hoa_van}` : null
    const qtyStr = w.so_luong ? `• SL: ${w.so_luong}` : null
    const substitutionStr = w.duoc_thay_the != null ? `• ${w.duoc_thay_the ? "Được thay thế" : "Không thay thế"}` : null

    const parts = [`${layer}: ${mat}`, colorStr, texStr, patternStr, qtyStr, substitutionStr].filter(Boolean).join(" ")
    return {
      id: w.id ?? `wrapping-${i}`,
      value: parts || "N/A",
    }
  })

  // 5. Palette & Colors (palette_accounting)
  const paletteList = Array.isArray(data.palette_accounting) ? data.palette_accounting : []
  const paletteItems: ResultFieldItem[] = []
  const seenPalette = new Set<string>()

  paletteList.forEach((p: { cluster_index?: number; thuoc_ve?: string | null; nhom?: string | null; confidence?: number | null }, idx: number) => {
    const thuocVe = p.thuoc_ve ?? "N/A"
    const nhom = p.nhom ? `(${p.nhom})` : null
    const conf = p.confidence != null ? `[${p.confidence}%]` : null
    const label = [`Cụm #${p.cluster_index ?? idx}:`, thuocVe, nhom, conf].filter(Boolean).join(" ")
    if (label && !seenPalette.has(label)) {
      seenPalette.add(label)
      paletteItems.push({ id: `palette-${idx}`, value: label })
    }
  })

  // Bổ sung các màu từ hoa nếu chưa có
  if (Array.isArray(bom.flowers)) {
    bom.flowers.forEach((f: { mau?: string | null; color?: string | null; mo_ta_mau?: string | null; name?: string | null }, idx: number) => {
      const colorName = f.mau ?? f.color
      if (colorName && !seenPalette.has(colorName)) {
        seenPalette.add(colorName)
        const desc = f.mo_ta_mau ? ` — ${f.mo_ta_mau}` : f.name ? ` (${f.name})` : ""
        paletteItems.push({ id: `color-flower-${idx}`, value: `${colorName}${desc}` })
      }
    })
  }

  // 6. Checklist (10 criteria from Schema.json checklist object)
  const checklistSchemaProps = (schemaContract.schema.properties.checklist as { properties?: Record<string, unknown> })?.properties ?? {}
  const checklistKeys = Object.keys(checklistSchemaProps).length > 0
    ? Object.keys(checklistSchemaProps)
    : Object.keys(CHECKLIST_LABELS)

  const checklistItems: ResultFieldItem[] = checklistKeys.map((key, i) => {
    const label = CHECKLIST_LABELS[key] ?? key
    const rawVal = checklist[key]
    const status = rawVal != null ? String(rawVal) : "N/A"
    const isCo = status === "Có"
    const isKhong = status === "Không có"
    const icon = isCo ? "✓" : isKhong ? "✗" : "—"
    return {
      id: `chk-${i}`,
      value: `${icon} ${label}: ${status}`,
    }
  })

  // 7. Confidence & Counts
  const confidence = typeof data.confidence === "number"
    ? data.confidence
    : typeof data.confidence === "object" && data.confidence != null
      ? (data.confidence as Record<string, unknown>).overall ?? null
      : null
  const confidenceNum = typeof confidence === "number" ? confidence : null

  const flowerCount = typeof data.flower_count === "number"
    ? data.flower_count
    : typeof data.total_stems === "number"
      ? data.total_stems
      : Array.isArray(bom.flowers) && bom.flowers.length > 0
        ? bom.flowers.reduce((sum: number, f: RawRow) => sum + (Number(f.quantity ?? f.count) || 0), 0)
        : null

  const budCount = typeof data.bud_count === "number"
    ? data.bud_count
    : typeof data.total_buds === "number"
      ? data.total_buds
      : Array.isArray(bom.flowers) && bom.flowers.length > 0
        ? bom.flowers.reduce((sum: number, f: RawRow) => sum + (Number(f.so_nu) || 0), 0)
        : null

  const damagedCount = typeof data.damaged_count === "number"
    ? data.damaged_count
    : typeof data.total_damaged === "number"
      ? data.total_damaged
      : Array.isArray(bom.flowers) && bom.flowers.length > 0
        ? bom.flowers.reduce((sum: number, f: RawRow) => sum + (Number(f.so_hong) || 0), 0)
        : null

  const soTangLop = typeof sanXuat.so_tang_lop === "number" ? sanXuat.so_tang_lop : null

  const accPrintedText = (accessoriesList as RawRow[]).find((a) => a?.printed_text)?.printed_text
  const packagingPrintedText = (data.packaging as { card?: { printedText?: unknown } } | null | undefined)?.card?.printedText
  const cardPrintedText: unknown = accPrintedText
    ?? (typeof data.card_printed_text === "string" ? data.card_printed_text : null)
    ?? (typeof packagingPrintedText === "string" ? packagingPrintedText : null)

  // Identity helper
  const idVal = (k: string) => {
    const v = identity[k]
    return v != null && String(v).trim() !== "" ? String(v) : "N/A"
  }

  // Trả về 100% danh mục trường theo Schema.json + thống kê pipeline
  return [
    {
      key: "flowers",
      label: activeLabels.flowers ?? "Danh sách nguyên liệu",
      type: "list",
      editable: true,
      value: flowers,
      confidence: confidenceNum,
      placeholder: "Thêm nguyên liệu...",
    },
    {
      key: "foliage",
      label: activeLabels.foliage ?? "Lá, cành phụ",
      type: "list",
      editable: true,
      value: foliage,
      confidence: confidenceNum,
      placeholder: "Thêm lá/cành phụ...",
    },
    {
      key: "accessories",
      label: activeLabels.accessories ?? "Phụ kiện & Nơ",
      type: "list",
      editable: true,
      value: accessories,
      confidence: confidenceNum,
      placeholder: "Thêm phụ kiện...",
    },
    {
      key: "wrapping",
      label: activeLabels.wrapping ?? "Vật liệu gói & Bao bì",
      type: "list",
      editable: true,
      value: wrapping,
      confidence: confidenceNum,
      placeholder: "Thêm giấy gói/bao bì...",
    },
    {
      key: "card_printed_text",
      label: activeLabels.card_printed_text ?? "Nội dung chữ trên thiệp (OCR)",
      type: "text",
      editable: true,
      value: cardPrintedText != null && String(cardPrintedText).trim() !== "" ? String(cardPrintedText) : "N/A",
      confidence: null,
      placeholder: "Nhập nội dung chữ trên thiệp chúc mừng...",
    },
    {
      key: "palette_accounting",
      label: activeLabels.palette_accounting ?? "Bảng màu & Cụm màu",
      type: "list",
      editable: true,
      value: paletteItems,
      confidence: confidenceNum,
      placeholder: "Thêm tone màu...",
    },
    {
      key: "category",
      label: activeLabels.category ?? "Phân loại sản phẩm",
      type: "text",
      editable: true,
      value: idVal("category"),
      confidence: null,
      placeholder: "N/A",
    },
    {
      key: "shape",
      label: activeLabels.shape ?? "Hình dáng thiết kế",
      type: "text",
      editable: true,
      value: idVal("shape"),
      confidence: null,
      placeholder: "N/A",
    },
    {
      key: "facing",
      label: activeLabels.facing ?? "Hướng nhìn / Mặt hoa",
      type: "text",
      editable: true,
      value: idVal("facing"),
      confidence: null,
      placeholder: "N/A",
    },
    {
      key: "container",
      label: activeLabels.container ?? "Vật chứa",
      type: "text",
      editable: true,
      value: idVal("container"),
      confidence: null,
      placeholder: "N/A",
    },
    {
      key: "phong_cach",
      label: activeLabels.phong_cach ?? "Phong cách thiết kế",
      type: "text",
      editable: true,
      value: idVal("phong_cach"),
      confidence: null,
      placeholder: "N/A",
    },
    {
      key: "dip_su_dung",
      label: activeLabels.dip_su_dung ?? "Dịp sử dụng đề xuất",
      type: "text",
      editable: true,
      value: idVal("dip_su_dung"),
      confidence: null,
      placeholder: "N/A",
    },
    {
      // Sửa được: máy đọc số tầng lớp từ ảnh, và một bó chụp nghiêng thì nó
      // đếm hụt. Người soát nhìn sản phẩm thật nên họ mới là nguồn đúng.
      key: "so_tang_lop",
      label: activeLabels.so_tang_lop ?? "Cấu trúc sản xuất",
      type: "number",
      editable: true,
      value: soTangLop ?? 0,
      confidence: null,
    },
    {
      key: "materials_note",
      label: activeLabels.materials_note ?? "Ghi chú vật liệu",
      type: "text",
      editable: true,
      value: bom.materials_note != null && String(bom.materials_note).trim() !== "" ? String(bom.materials_note) : "N/A",
      confidence: null,
      placeholder: "N/A",
    },
    {
      key: "checklist",
      label: activeLabels.checklist ?? "Checklist 10 cấu phần tiêu chuẩn",
      type: "list",
      editable: false,
      value: checklistItems,
      confidence: confidenceNum,
    },
    // Mười cấu phần tiêu chuẩn, mỗi cấu phần một ô sửa được. Bảng gộp ở trên
    // giữ nguyên để nhìn nhanh; mười ô dưới đây là đường sửa. Trước đây
    // `checklist` chỉ xem được trên giao diện dù `PATCH /vision/analyses/:id`
    // vẫn nhận — nghĩa là sửa được nhưng phải gọi API bằng tay.
    ...checklistKeys.map((key) => ({
      key: `checklist.${key}`,
      label: CHECKLIST_LABELS[key] ?? key,
      type: "text" as const,
      editable: true,
      value: checklist[key] != null && String(checklist[key]).trim() !== "" ? String(checklist[key]) : "N/A",
      confidence: null,
      placeholder: "Có / Không có / mô tả ngắn",
    })),
    {
      key: "totals",
      label: activeLabels.totals ?? "Tổng số cành / hoa",
      type: "readonly",
      editable: false,
      value: flowerCount != null ? `${flowerCount} cành` : "N/A",
    },
    {
      key: "totals-bud",
      label: activeLabels["totals-bud"] ?? "Tổng số nụ",
      type: "readonly",
      editable: false,
      value: budCount != null ? `${budCount} nụ` : "N/A",
    },
    {
      key: "totals-damaged",
      label: activeLabels["totals-damaged"] ?? "Tổng số cành hỏng",
      type: "readonly",
      editable: false,
      value: damagedCount != null ? `${damagedCount} cành` : "N/A",
    },
    {
      key: "confidence",
      label: activeLabels.confidence ?? "Độ tin cậy tổng thể",
      type: "readonly",
      editable: false,
      value: confidenceNum != null ? `${confidenceNum}%` : "N/A",
    },
  ]
}
