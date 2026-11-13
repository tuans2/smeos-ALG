/**
 * Print Presets & Preflight Engine SSOT (Ấn phẩm & In ấn chất lượng cao).
 * Quy cách in: Bleed 3mm, Safe Zone 3mm, DPI >= 300, QR tối thiểu 20mm.
 * Thuần túy logic nghiệp vụ, zero ORM.
 */

export type PrintPresetCode =
  | "A4"
  | "A5"
  | "A6"
  | "CARD_90X54"
  | "STANDEE_60X160"
  | "TABLE_TENT_100X150"
  | "HANG_TAG_50X90"
  | "STICKER_50X50"

export interface PrintPreset {
  code: PrintPresetCode
  name: string
  description: string
  widthMm: number
  heightMm: number
  bleedMm: number
  safeMarginMm: number
  minDpi: number
  minQrSizeMm: number
}

export const PRINT_PRESETS: Record<PrintPresetCode, PrintPreset> = {
  A4: {
    code: "A4",
    name: "Khổ A4",
    description: "210 × 297 mm — Thích hợp cho Báo giá chi tiết, Hồ sơ năng lực, Menu nhiều trang",
    widthMm: 210,
    heightMm: 297,
    bleedMm: 3,
    safeMarginMm: 3,
    minDpi: 300,
    minQrSizeMm: 25,
  },
  A5: {
    code: "A5",
    name: "Khổ A5",
    description: "148 × 210 mm — Thích hợp cho Tờ rơi quảng bá, Menu để bàn, Thư ngỏ",
    widthMm: 148,
    heightMm: 210,
    bleedMm: 3,
    safeMarginMm: 3,
    minDpi: 300,
    minQrSizeMm: 20,
  },
  A6: {
    code: "A6",
    name: "Khổ A6",
    description: "105 × 148 mm — Thích hợp cho Thiệp chúc mừng, Thẻ cảm ơn, Voucher quà tặng",
    widthMm: 105,
    heightMm: 148,
    bleedMm: 3,
    safeMarginMm: 3,
    minDpi: 300,
    minQrSizeMm: 20,
  },
  CARD_90X54: {
    code: "CARD_90X54",
    name: "Danh thiếp 90×54",
    description: "90 × 54 mm — Danh thiếp cửa hàng, thẻ tích điểm, thẻ bảo hành nhỏ",
    widthMm: 90,
    heightMm: 54,
    bleedMm: 3,
    safeMarginMm: 3,
    minDpi: 300,
    minQrSizeMm: 20,
  },
  STANDEE_60X160: {
    code: "STANDEE_60X160",
    name: "Standee 60×160",
    description: "600 × 1600 mm — Standee dựng trước cửa hàng, sự kiện khai trương, chương trình lớn",
    widthMm: 600,
    heightMm: 1600,
    bleedMm: 5,
    safeMarginMm: 10,
    minDpi: 150, // Khổ lớn quan sát từ xa chấp nhận 150 DPI
    minQrSizeMm: 60,
  },
  TABLE_TENT_100X150: {
    code: "TABLE_TENT_100X150",
    name: "Bảng để bàn 100×150",
    description: "100 × 150 mm — Bảng mica để bàn, mã QR thanh toán / Thẻ chào",
    widthMm: 100,
    heightMm: 150,
    bleedMm: 3,
    safeMarginMm: 3,
    minDpi: 300,
    minQrSizeMm: 25,
  },
  HANG_TAG_50X90: {
    code: "HANG_TAG_50X90",
    name: "Thẻ treo 50×90",
    description: "50 × 90 mm — Thẻ tag gắn sản phẩm, hướng dẫn bảo quản nhanh, tem mác",
    widthMm: 50,
    heightMm: 90,
    bleedMm: 3,
    safeMarginMm: 3,
    minDpi: 300,
    minQrSizeMm: 20,
  },
  STICKER_50X50: {
    code: "STICKER_50X50",
    name: "Tem nhãn vuông 50×50",
    description: "50 × 50 mm — Tem dán hộp sản phẩm, sticker niêm phong, logo thương hiệu",
    widthMm: 50,
    heightMm: 50,
    bleedMm: 2,
    safeMarginMm: 2,
    minDpi: 300,
    minQrSizeMm: 20,
  },
}

export function getPrintPreset(code: PrintPresetCode): PrintPreset {
  return PRINT_PRESETS[code] ?? PRINT_PRESETS.A6
}

export interface PreflightInput {
  imageWidthPx?: number | undefined
  imageHeightPx?: number | undefined
  colorMode?: "RGB" | "CMYK" | undefined
  hasQrCode?: boolean | undefined
  qrSizeMm?: number | undefined
  hasContentOutsideSafeZone?: boolean | undefined
}

export interface PreflightReport {
  passed: boolean
  errors: string[]
  warnings: string[]
  details: {
    presetCode: PrintPresetCode
    widthMm: number
    heightMm: number
    bleedMm: number
    safeMarginMm: number
    cutWidthMm: number
    cutHeightMm: number
    effectiveDpi: number | null
    minRecommendedDpi: number
    targetWidthPx: number
    targetHeightPx: number
  }
}

/**
 * Động cơ kiểm tra quy cách in ấn trước xuất bản (Preflight Engine).
 * Rà soát độ phân giải, tràn lề (bleed), vùng an toàn, kích cỡ QR và hệ màu.
 */
export function runPreflightCheck(input: PreflightInput, preset: PrintPreset): PreflightReport {
  const errors: string[] = []
  const warnings: string[] = []

  const totalWidthMm = preset.widthMm + 2 * preset.bleedMm
  const totalHeightMm = preset.heightMm + 2 * preset.bleedMm

  const targetWidthPx = Math.round((totalWidthMm / 25.4) * preset.minDpi)
  const targetHeightPx = Math.round((totalHeightMm / 25.4) * preset.minDpi)

  let effectiveDpi: number | null = null

  // 1. Kiểm tra độ phân giải hình ảnh
  if (input.imageWidthPx && input.imageHeightPx) {
    const dpiX = (input.imageWidthPx / (preset.widthMm / 25.4))
    const dpiY = (input.imageHeightPx / (preset.heightMm / 25.4))
    effectiveDpi = Math.round(Math.min(dpiX, dpiY))

    if (effectiveDpi < 150) {
      errors.push(
        `Độ phân giải quá thấp (${effectiveDpi} DPI). Bản in thực tế sẽ bị mờ nhoè hoặc vỡ hạt (yêu cầu tối thiểu ${preset.minDpi} DPI).`
      )
    } else if (effectiveDpi < preset.minDpi) {
      warnings.push(
        `Độ phân giải hiện tại đạt ${effectiveDpi} DPI (khuyến nghị ${preset.minDpi} DPI để ấn phẩm sắc nét nhất).`
      )
    }
  }

  // 2. Kiểm tra kích thước mã QR khi in
  if (input.hasQrCode) {
    if (input.qrSizeMm !== undefined && input.qrSizeMm < preset.minQrSizeMm) {
      errors.push(
        `Kích thước mã QR (${input.qrSizeMm} mm) nhỏ hơn mức tối thiểu ${preset.minQrSizeMm} mm. Khách hàng sẽ rất khó quét mã sau khi in ra.`
      )
    }
  }

  // 3. Kiểm tra vùng an toàn (Safe Zone)
  if (input.hasContentOutsideSafeZone) {
    warnings.push(
      `Có chữ hoặc chi tiết quan trọng nằm sát mép cắt (dưới ${preset.safeMarginMm} mm). Dao cắt thành phẩm có thể chém mất một phần nội dung.`
    )
  }

  // 4. Kiểm tra hệ màu
  if (input.colorMode === "RGB") {
    warnings.push(
      "File đang sử dụng hệ màu RGB của màn hình. Máy in công nghiệp sử dụng hệ màu CMYK nên màu in ra có thể hơi trầm hơn một chút."
    )
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      presetCode: preset.code,
      widthMm: preset.widthMm,
      heightMm: preset.heightMm,
      bleedMm: preset.bleedMm,
      safeMarginMm: preset.safeMarginMm,
      cutWidthMm: totalWidthMm,
      cutHeightMm: totalHeightMm,
      effectiveDpi,
      minRecommendedDpi: preset.minDpi,
      targetWidthPx,
      targetHeightPx,
    },
  }
}

