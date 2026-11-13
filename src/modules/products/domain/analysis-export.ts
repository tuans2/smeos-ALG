/**
 * Dàn kết quả phân tích thành bảng phẳng để xuất ra tệp mở được bằng Excel.
 *
 * Một dòng cho MỘT CẤU PHẦN, không phải một dòng cho một ảnh: đó là mức mà
 * người vận hành đối chiếu thật — "ảnh này máy khai mấy cành hồng, người sửa
 * thành mấy". Gộp cả `bom` vào một ô JSON thì tệp mở được nhưng không lọc,
 * không cộng, không dựng bảng tổng hợp được, tức là không dùng được.
 *
 * Cột `nguon` phân biệt số của máy với số của người. Cặp `raw`/`edited` giữ
 * tách biệt trong cơ sở dữ liệu chính vì phân biệt đó (`YC-R3`), nên bản
 * xuất phải mang nó ra chứ không được làm phẳng mất.
 *
 * Tệp thuần: không import hạ tầng.
 */
export const COT_XUAT = [
  "ma_phan_tich",
  "ma_anh",
  "ma_luot_chay",
  "ma_san_pham",
  "trang_thai_duyet",
  "nguoi_quyet",
  "luc_quyet",
  "tao_luc",
  "nha_cung_cap",
  "mo_hinh",
  "phien_ban_hop_dong",
  "nguon",
  "dang_san_pham",
  "so_hoa",
  "so_nu",
  "so_hong",
  "do_tin_cay_tong",
  "nhom_cau_phan",
  "ten_cau_phan",
  "ma_cau_phan",
  "mau",
  "so_luong",
  "don_vi_dem",
  "do_tin_cay_dong",
] as const

export type DongXuat = Record<(typeof COT_XUAT)[number], string>

export type AnalysisDeXuat = {
  id: string
  asset_id: string
  job_id: string
  product_id: string | null
  approval_state: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  provider: string
  model: string
  contract_version: string
  raw: Record<string, unknown>
  edited: Record<string, unknown> | null
}

const NHOM = [
  ["flowers", "Hoa"],
  ["foliage", "Lá"],
  ["accessories", "Phụ kiện"],
  ["wrapping", "Vật liệu gói"],
] as const

function chuoi(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function banGhi(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function mang(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(banGhi) : []
}

function tenDong(nhom: string, row: Record<string, unknown>): string {
  if (nhom === "wrapping") {
    const lop = chuoi(row.layer)
    const chatLieu = chuoi(row.material)
    return [lop, chatLieu].filter(Boolean).join(" · ")
  }
  return chuoi(row.name) || chuoi(row.nhom_hoa)
}

/**
 * `nguon` nhận `"máy"` khi bản ghi chưa ai sửa, và `"người"` khi có `edited`.
 * Không xuất hai dòng cho cùng một cấu phần: bản xuất nói kết quả HIỆN LÀ
 * gì, cột `nguon` nói kết quả đó đến từ đâu. Lịch sử từng lần sửa nằm ở
 * `audit_logs`, không phải ở đây.
 */
export function dongXuatCuaPhanTich(analysis: AnalysisDeXuat): DongXuat[] {
  const hieuLuc = analysis.edited ?? analysis.raw
  const nguon = analysis.edited ? "người" : "máy"
  const identity = banGhi(hieuLuc.identity)
  const bom = banGhi(hieuLuc.bom)

  const chung = {
    ma_phan_tich: analysis.id,
    ma_anh: analysis.asset_id,
    ma_luot_chay: analysis.job_id,
    ma_san_pham: chuoi(analysis.product_id),
    trang_thai_duyet: analysis.approval_state,
    nguoi_quyet: chuoi(analysis.approved_by),
    luc_quyet: chuoi(analysis.approved_at),
    tao_luc: analysis.created_at,
    nha_cung_cap: analysis.provider,
    mo_hinh: analysis.model,
    phien_ban_hop_dong: analysis.contract_version,
    nguon,
    dang_san_pham: chuoi(identity.category),
    so_hoa: chuoi(hieuLuc.flower_count),
    so_nu: chuoi(hieuLuc.bud_count),
    so_hong: chuoi(hieuLuc.damaged_count),
    do_tin_cay_tong: chuoi(hieuLuc.confidence),
  }

  const dong: DongXuat[] = []
  for (const [khoa, nhan] of NHOM) {
    for (const row of mang(bom[khoa])) {
      dong.push({
        ...chung,
        nhom_cau_phan: nhan,
        ten_cau_phan: tenDong(khoa, row),
        ma_cau_phan: chuoi(row.ma),
        mau: chuoi(row.mau) || chuoi(row.color),
        so_luong: chuoi(row.quantity),
        don_vi_dem: chuoi(row.dvt_dem),
        do_tin_cay_dong: chuoi(row.confidence),
      })
    }
  }

  // Một lượt phân tích không nhận ra cấu phần nào vẫn phải có mặt trong bản
  // xuất — đó chính là ca người vận hành cần nhìn thấy nhất.
  if (dong.length === 0) {
    dong.push({
      ...chung,
      nhom_cau_phan: "",
      ten_cau_phan: "",
      ma_cau_phan: "",
      mau: "",
      so_luong: "",
      don_vi_dem: "",
      do_tin_cay_dong: "",
    })
  }
  return dong
}

function oCsv(value: string): string {
  // Dấu phẩy, nháy kép, xuống dòng — và cả dấu cách đầu dòng, thứ Excel cắt
  // mất nếu ô không được bọc.
  if (/[",\n\r]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * CSV mã hoá UTF-8 kèm BOM. BOM là thứ quyết định Excel trên Windows đọc
 * đúng tiếng Việt hay hiện ra một dãy ký tự hỏng — không có nó thì Excel
 * đoán bảng mã theo vùng máy và đoán sai.
 */
export function dungCsv(dong: DongXuat[]): string {
  const dauDong = COT_XUAT.join(",")
  const than = dong.map((d) => COT_XUAT.map((cot) => oCsv(d[cot])).join(","))
  return "﻿" + [dauDong, ...than].join("\r\n") + "\r\n"
}
