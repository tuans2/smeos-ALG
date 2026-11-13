/**
 * Đơn vị hành chính Việt Nam cho ô địa chỉ giao hoa — hai hệ để khách chọn:
 * - "old": trước 01/07/2025 — 63 tỉnh → 696 quận/huyện → 10.051 phường/xã
 * - "new": theo NQ 202/2025/QH15 — 34 tỉnh → 3.321 phường/xã (bỏ cấp quận/huyện)
 * Dữ liệu tĩnh ở `public/data/vn-address/{old,new}.json` (nguồn: gói MIT `vietnam-divisions-js` 3.0.0),
 * tải khi khách mở form để không làm nặng trang. Pure TypeScript.
 */

export type AddressSystem = "old" | "new"

export const DEFAULT_ADDRESS_SYSTEM: AddressSystem = "old"

export const ADDRESS_SYSTEM_LABEL: Record<AddressSystem, string> = {
  old: "Địa chỉ cũ (có Quận/Huyện)",
  new: "Địa chỉ mới (từ 01/07/2025)",
}

/** [tên quận/huyện, phường/xã[]] */
export type OldDistrict = [string, string[]]
/** Hệ cũ: [tên tỉnh, quận/huyện[]] */
export type OldProvince = [string, OldDistrict[]]
/** Hệ mới: [tên tỉnh, phường/xã[]] */
export type NewProvince = [string, string[]]

export type AddressUnitsData =
  | { system: "old"; provinces: OldProvince[] }
  | { system: "new"; provinces: NewProvince[] }

export function addressDataUrl(system: AddressSystem): string {
  return `/data/vn-address/${system}.json`
}

export function provinceNames(data: AddressUnitsData): string[] {
  return data.provinces.map((p) => p[0])
}

/** Quận/huyện của một tỉnh (chỉ hệ cũ); hệ mới → []. */
export function districtNames(data: AddressUnitsData, province: string): string[] {
  if (data.system !== "old") return []
  return data.provinces.find((p) => p[0] === province)?.[1].map((d) => d[0]) ?? []
}

/** Phường/xã để chọn: hệ cũ theo tỉnh + quận/huyện, hệ mới theo tỉnh. */
export function wardNames(data: AddressUnitsData, province: string, district?: string): string[] {
  if (data.system === "new") return data.provinces.find((p) => p[0] === province)?.[1] ?? []
  const p = data.provinces.find((x) => x[0] === province)
  return p?.[1].find((d) => d[0] === district)?.[1] ?? []
}

/**
 * Đoán hệ địa chỉ của giá trị có sẵn (sửa đơn): có quận/huyện → cũ; tên tỉnh dạng mới
 * (không có tiền tố "Tỉnh"/"Thành phố", vd. "Cao Bằng") → mới; còn lại → mặc định (cũ).
 */
export function guessAddressSystem(parts: { province?: string | undefined; district?: string | undefined }): AddressSystem {
  if (parts.district?.trim()) return "old"
  const province = parts.province?.trim() ?? ""
  if (province && !/^(Tỉnh|Thành phố|TP\.)\s/.test(province)) return "new"
  return DEFAULT_ADDRESS_SYSTEM
}
