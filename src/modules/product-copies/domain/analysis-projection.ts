/**
 * Hình chiếu của hợp đồng Vision (`PhanTichSanPhamHoa`) sang đúng những gì
 * bước sinh câu chữ bán hàng cần đọc.
 *
 * Hợp đồng là hình dạng DUY NHẤT (`YC-N3`, D5-c) và nó dùng khoá tiếng
 * Việt: `identity.phong_cach`, `identity.dip_su_dung`. Đọc thẳng hợp đồng
 * bằng những cái tên tự nghĩ ra — `identity.style`, `identity.color_tone` —
 * không ném lỗi, không làm đỏ ca thử nào, chỉ lặng lẽ đưa `undefined` vào
 * lời nhắc; mô hình khi đó viết quảng cáo cho một sản phẩm không phong cách,
 * không tông màu. Tệp này là chỗ duy nhất được biết tên trường của hợp
 * đồng, và nó đọc phòng thủ vì đầu ra AI có thể thiếu trường bất kỳ.
 *
 * Tệp thuần: không import hạ tầng.
 */

export type ThanhPhan = {
  readonly name: string
  readonly quantity: number | null
  readonly confidence?: number | null
}

export type HinhChieuPhanTich = {
  readonly identity: {
    readonly category: string | null
    readonly shape: string | null
    readonly container: string | null
    readonly phong_cach: string | null
    readonly dip_su_dung: string | null
  }
  /** Tối đa ba tone chủ đạo, theo đúng thứ tự xuất hiện. */
  readonly tone_mau: string[]
  readonly bom: {
    readonly flowers: ThanhPhan[]
    readonly foliage: ThanhPhan[]
    readonly accessories: ThanhPhan[]
    readonly wrapping: Array<{ layer: string | null; material: string | null; color: string | null }>
  }
  readonly flower_count: number | null
  readonly bud_count: number | null
  readonly damaged_count: number | null
  /** Số nguyên 0–100, đúng thang của hợp đồng. */
  readonly confidence: number | null
}

export const SO_TONE_TOI_DA = 3

function rec(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function arr(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(rec) : []
}

function chuoi(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function so(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/**
 * `confidence` của hợp đồng là số nguyên 0–100 (bộ cục bộ trần 55). Nhân
 * thêm 100 ở tầng trên sẽ ra "9000%" trong lời nhắc; kẹp lại ở đây để mọi
 * nơi đọc được cùng một thang.
 */
export function chuanHoaDoTinCay(value: unknown): number | null {
  const n = so(value)
  if (n === null) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

function thanhPhan(row: Record<string, unknown>): ThanhPhan {
  return {
    name: chuoi(row.name) ?? chuoi(row.nhom_hoa) ?? "không rõ",
    quantity: so(row.quantity),
    confidence: so(row.confidence),
  }
}

/**
 * Tone chủ đạo gom từ hai nguồn của hợp đồng, theo thứ tự tin cậy giảm dần:
 * nhóm màu đã đo ở `palette_accounting`, rồi màu khai trên từng dòng hoa.
 * Trùng nhau thì giữ lần xuất hiện đầu.
 */
export function toneChuDao(analysis: Record<string, unknown>): string[] {
  const ra: string[] = []
  const them = (v: unknown) => {
    const s = chuoi(v)
    if (s && !ra.some((x) => x.toLowerCase() === s.toLowerCase())) ra.push(s)
  }

  for (const cum of arr(analysis.palette_accounting)) them(cum.nhom)
  for (const hoa of arr(rec(analysis.bom).flowers)) {
    them(hoa.mau)
    them(hoa.mo_ta_mau ?? hoa.color)
  }

  return ra.slice(0, SO_TONE_TOI_DA)
}

export function projectAnalysisForCopy(effective: unknown): HinhChieuPhanTich {
  const data = rec(effective)
  const identity = rec(data.identity)
  const bom = rec(data.bom)

  return {
    identity: {
      category: chuoi(identity.category),
      shape: chuoi(identity.shape),
      container: chuoi(identity.container),
      phong_cach: chuoi(identity.phong_cach),
      dip_su_dung: chuoi(identity.dip_su_dung),
    },
    tone_mau: toneChuDao(data),
    bom: {
      flowers: arr(bom.flowers).map(thanhPhan),
      foliage: arr(bom.foliage).map(thanhPhan),
      accessories: arr(bom.accessories).map(thanhPhan),
      wrapping: arr(bom.wrapping).map((w) => ({
        layer: chuoi(w.layer),
        material: chuoi(w.material),
        color: chuoi(w.color),
      })),
    },
    // Ba tổng đếm do `dem_tong` cộng từ `bom` sau khi nhận đáp ứng, nằm ở
    // mức trên cùng chứ không trong `identity`.
    flower_count: so(data.flower_count),
    bud_count: so(data.bud_count),
    damaged_count: so(data.damaged_count),
    confidence: chuanHoaDoTinCay(data.confidence),
  }
}

/** Phân tích có đủ dữ liệu để viết câu chữ bán hàng hay không. */
export function duDeSinhCauChu(hc: HinhChieuPhanTich): boolean {
  return hc.identity.category !== null || hc.bom.flowers.length > 0
}
