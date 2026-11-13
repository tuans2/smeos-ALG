/**
 * area-match.ts
 *
 * Sàng lọc chi nhánh theo khu vực hành chính khi không có toạ độ (PO 22/10/2026) — không cần dịch vụ
 * bản đồ ngoài. Từ 01/07/2025 Việt Nam bỏ cấp quận/huyện: địa chỉ mới là phường/xã + tỉnh/thành,
 * nên khớp chủ yếu theo phường + tỉnh; quận chỉ dùng khi cả hai bên còn ghi theo địa chỉ cũ.
 * Pure TypeScript.
 */

export interface AdministrativeArea {
  ward?: string | null | undefined
  district?: string | null | undefined
  province?: string | null | undefined
}

export interface BranchArea extends AdministrativeArea {
  /** Phường/xã lân cận chi nhánh nhận giao thêm */
  serviceWards?: readonly string[] | null | undefined
}

/** WARD > DISTRICT > PROVINCE; OTHER_PROVINCE = khác tỉnh (loại); UNKNOWN = thiếu dữ liệu để so */
export type AreaMatchLevel = "WARD" | "DISTRICT" | "PROVINCE" | "OTHER_PROVINCE" | "UNKNOWN"

/** Tiền tố đầy đủ — phải có khoảng trắng theo sau ("quan 1", không cắt "quang ngai") */
const WORD_PREFIX = /^(?:thanh pho|tinh|quan|huyen|thi xa|phuong|xa|thi tran|dac khu)\s+/
/**
 * Viết tắt: "tp/tx/tt" theo sau bởi dấu chấm, khoảng trắng hoặc số ("tp hcm", "tp. hcm"); "p/q" một chữ
 * chỉ khi theo sau là dấu chấm hoặc số ("p.5", "q1") — không cắt "phu nhuan", "quang ngai".
 */
const ABBR_PREFIX = /^(?:(?:tp|tx|tt)(?:\.\s*|\s+|(?=\d))|[pq](?:\.\s*|(?=\d)))/

/** Cách viết tắt hay gặp của tỉnh/thành (sau khi đã bỏ dấu và tiền tố) */
const PROVINCE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  hcm: "ho chi minh",
  tphcm: "ho chi minh",
  "sai gon": "ho chi minh",
  hn: "ha noi",
})

/**
 * Chuẩn hoá tên đơn vị hành chính để so: bỏ dấu, chữ thường, bỏ tiền tố ("Phường", "P.", "TP.", "Quận"…),
 * bỏ số 0 đầu ("Phường 05" = "P5"). "TP. Hồ Chí Minh" = "Hồ Chí Minh" = "ho chi minh".
 */
export function normalizeAreaName(value: string | null | undefined): string {
  if (!value) return ""
  let s = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  // Bỏ tối đa hai tiền tố ("thanh pho thu duc" → "thu duc"), giữ tên trơn
  for (let i = 0; i < 2; i++) s = s.replace(WORD_PREFIX, "").replace(ABBR_PREFIX, "").trim()
  s = s.replace(/\b0+(\d)/g, "$1")
  return PROVINCE_ALIASES[s] ?? s
}

export function matchArea(order: AdministrativeArea | null | undefined, branch: BranchArea | null | undefined): AreaMatchLevel {
  if (!order || !branch) return "UNKNOWN"
  const oProvince = normalizeAreaName(order.province)
  const bProvince = normalizeAreaName(branch.province)
  if (oProvince && bProvince && oProvince !== bProvince) return "OTHER_PROVINCE"
  // Không biết tỉnh của một bên thì chỉ tin được khi khớp phường (tên phường có thể trùng giữa các tỉnh)
  const sameProvince = Boolean(oProvince && bProvince)

  const oWard = normalizeAreaName(order.ward)
  if (oWard) {
    const wards = [branch.ward, ...(branch.serviceWards ?? [])].map(normalizeAreaName).filter(Boolean)
    if (wards.includes(oWard) && (sameProvince || !oProvince || !bProvince)) return "WARD"
  }

  const oDistrict = normalizeAreaName(order.district)
  const bDistrict = normalizeAreaName(branch.district)
  if (sameProvince && oDistrict && bDistrict && oDistrict === bDistrict) return "DISTRICT"
  return sameProvince ? "PROVINCE" : "UNKNOWN"
}

/** Điểm "gần" 0–100 thay cho điểm khoảng cách khi không có toạ độ */
export const AREA_MATCH_SCORE: Readonly<Record<AreaMatchLevel, number>> = Object.freeze({
  WARD: 100,
  DISTRICT: 75,
  PROVINCE: 40,
  UNKNOWN: 25,
  OTHER_PROVINCE: 0,
})
