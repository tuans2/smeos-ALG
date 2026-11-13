import * as XLSX from "xlsx"

export interface ParsedBranchRow {
  rawRowNumber: number
  branchId: string
  branchName: string
  address?: string | undefined
  ward?: string | undefined
  district?: string | undefined
  city?: string | undefined
  /** Phường/xã lân cận nhận giao thêm */
  serviceWards?: string[] | undefined
  /** Không có toạ độ → bỏ trống; xếp hạng điều phối bỏ qua khoảng cách thay vì lấy tâm Hà Nội. */
  latitude?: number | undefined
  longitude?: number | undefined
  maxDeliveryRadiusKm: number
  qualityScore: number
  onTimeRate: number
  activeJobsCount: number
  maxConcurrentJobs: number
  isActive: boolean
  channels: {
    phone?: string | undefined
    telegramChatId?: string | undefined
    zaloPhone?: string | undefined
  }
  status: "VALID" | "ERROR"
  errorMessage?: string | undefined
}

/** Tên các cột chấp nhận trong file Excel chi nhánh */
const COLUMNS = {
  code: ["Mã chi nhánh *", "Mã chi nhánh", "Mã shop", "Mã cửa hàng", "code"],
  name: ["Tên chi nhánh *", "Tên chi nhánh", "Tên shop", "Tên cửa hàng", "name"],
  address: ["Địa chỉ chi tiết *", "Địa chỉ chi tiết", "Địa chỉ", "address"],
  ward: ["Phường / Xã", "Phường", "Xã", "ward"],
  district: ["Quận / Huyện", "Quận", "Huyện", "district"],
  serviceWards: ["Phường/xã phục vụ thêm", "Phường phục vụ", "serviceWards"],
  city: ["Tỉnh / Thành phố", "Tỉnh", "Thành phố", "city"],
  lat: ["Vĩ độ (Latitude)", "Vĩ độ", "Latitude", "lat"],
  lng: ["Kinh độ (Longitude)", "Kinh độ", "Longitude", "lng"],
  radius: ["Bán kính phục vụ (km)", "Bán kính (km)", "Bán kính", "radius"],
  phone: ["Số điện thoại quản lý", "Số điện thoại", "SĐT", "phone"],
  telegram: ["Telegram ID riêng / Nhóm", "Telegram Chat ID", "Telegram ID", "telegram"],
  zalo: ["Zalo Phone / ID", "Zalo Phone", "Zalo", "zalo"],
  quality: ["Điểm chất lượng KPI (0-100)", "Điểm KPI", "Chất lượng", "quality"],
  maxJobs: ["Giới hạn đơn cùng lúc", "Số đơn tối đa", "maxJobs"],
  isActive: ["Trạng thái hoạt động", "Trạng thái", "Hoạt động", "status"],
} as const

type RawRecord = Record<string, unknown>

function pick(d: RawRecord, names: readonly string[], fallback = ""): string {
  for (const n of names) {
    const v = d[n]
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim()
    }
  }
  return fallback
}

/**
 * Đọc workbook Excel nạp danh sách chi nhánh chuỗi
 */
export function parseBranchWorkbook(data: ArrayBuffer): ParsedBranchRow[] {
  const wb = XLSX.read(data, { type: "array" })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error("File Excel không có sheet dữ liệu")

  const ws = wb.Sheets[sheetName]!
  const rawRows = XLSX.utils.sheet_to_json<RawRecord>(ws, { defval: "" })
  if (rawRows.length === 0) throw new Error("Sheet dữ liệu trống")

  const results: ParsedBranchRow[] = []
  const seenCodes = new Set<string>()

  rawRows.forEach((rawRow, idx) => {
    const rowNum = idx + 2 // Dòng 1 là tiêu đề
    const code = pick(rawRow, COLUMNS.code)
    const name = pick(rawRow, COLUMNS.name)
    const address = pick(rawRow, COLUMNS.address)
    const ward = pick(rawRow, COLUMNS.ward)
    const district = pick(rawRow, COLUMNS.district)
    const serviceWardsStr = pick(rawRow, COLUMNS.serviceWards)
    const city = pick(rawRow, COLUMNS.city)
    const latStr = pick(rawRow, COLUMNS.lat)
    const lngStr = pick(rawRow, COLUMNS.lng)
    const radiusStr = pick(rawRow, COLUMNS.radius, "15")
    const phone = pick(rawRow, COLUMNS.phone)
    const telegram = pick(rawRow, COLUMNS.telegram)
    const zalo = pick(rawRow, COLUMNS.zalo)
    const qualityStr = pick(rawRow, COLUMNS.quality, "95")
    const maxJobsStr = pick(rawRow, COLUMNS.maxJobs, "5")
    const activeStr = pick(rawRow, COLUMNS.isActive, "Đang hoạt động")

    // Validate bắt buộc
    const errors: string[] = []
    if (!code) errors.push("Thiếu mã chi nhánh")
    if (!name) errors.push("Thiếu tên chi nhánh")
    if (!address) errors.push("Thiếu địa chỉ")

    const lat = latStr ? Number(latStr.replace(",", ".")) : undefined
    const lng = lngStr ? Number(lngStr.replace(",", ".")) : undefined
    if (lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90)) errors.push("Vĩ độ không hợp lệ")
    if (lng !== undefined && (!Number.isFinite(lng) || lng < -180 || lng > 180)) errors.push("Kinh độ không hợp lệ")
    if ((lat === undefined) !== (lng === undefined)) errors.push("Cần đủ cả vĩ độ và kinh độ")
    if (code && seenCodes.has(code)) errors.push("Mã chi nhánh bị trùng trong tệp")
    if (code) seenCodes.add(code)
    const maxDeliveryRadiusKm = parseFloat(radiusStr) || 15
    const qualityScore = Math.min(100, Math.max(0, parseInt(qualityStr, 10) || 95))
    const maxConcurrentJobs = parseInt(maxJobsStr, 10) || 5
    const isActive = !activeStr.toLowerCase().includes("nghỉ") && !activeStr.toLowerCase().includes("tạm")

    const parsed: ParsedBranchRow = {
      rawRowNumber: rowNum,
      branchId: code || `BRANCH-${rowNum}`,
      branchName: name || `Chi nhánh ${rowNum}`,
      latitude: lat,
      longitude: lng,
      maxDeliveryRadiusKm,
      qualityScore,
      onTimeRate: 98,
      activeJobsCount: 0,
      maxConcurrentJobs,
      isActive,
      channels: {
        ...(phone ? { phone } : {}),
        ...(telegram ? { telegramChatId: telegram } : {}),
        ...(zalo ? { zaloPhone: zalo } : {}),
      },
      status: errors.length > 0 ? "ERROR" : "VALID",
    }
    if (address) parsed.address = address
    if (ward) parsed.ward = ward
    if (district) parsed.district = district
    if (serviceWardsStr) {
      parsed.serviceWards = serviceWardsStr.split(/[;,\n]/).map((w) => w.trim()).filter(Boolean).slice(0, 50)
    }
    if (city) parsed.city = city
    if (errors.length > 0) parsed.errorMessage = errors.join("; ")
    results.push(parsed)
  })

  return results
}

/**
 * Tạo file Excel mẫu chuẩn (.xlsx) với 3 chi nhánh mẫu
 */
export function generateBranchTemplateBuffer(): Uint8Array {
  const headers = [
    "Mã chi nhánh *",
    "Tên chi nhánh *",
    "Địa chỉ chi tiết *",
    "Phường / Xã",
    "Quận / Huyện",
    "Tỉnh / Thành phố",
    "Phường/xã phục vụ thêm",
    "Vĩ độ (Latitude)",
    "Kinh độ (Longitude)",
    "Bán kính phục vụ (km)",
    "Số điện thoại quản lý",
    "Telegram ID riêng / Nhóm",
    "Zalo Phone / ID",
    "Điểm chất lượng KPI (0-100)",
    "Giới hạn đơn cùng lúc",
    "Trạng thái hoạt động",
  ]

  const sampleData = [
    [
      "CN-BADINH",
      "Chi nhánh Ba Đình (Xưởng Trung Tâm)",
      "22 Lê Lợi, Phường Cống Vị, Quận Ba Đình, Hà Nội",
      "Phường Cống Vị",
      "Ba Đình",
      "Hà Nội",
      "Phường Ngọc Hà, Phường Giảng Võ",
      21.0354,
      105.8142,
      15,
      "0988123456",
      "", // Telegram: để trống, điền sau khi chi nhánh đã gửi mã liên kết cho bot
      "0988123456",
      98,
      5,
      "Đang hoạt động",
    ],
    [
      "CN-HOANKIEM",
      "Chi nhánh Hoàn Kiếm (Cửa Hàng Phố Cổ)",
      "45 Hàng Trống, Phường Hàng Trống, Quận Hoàn Kiếm, Hà Nội",
      "Phường Hàng Trống",
      "Hoàn Kiếm",
      "Hà Nội",
      "",
      21.0285,
      105.8542,
      12,
      "0977234567",
      "",
      "0977234567",
      95,
      4,
      "Đang hoạt động",
    ],
    [
      "CN-CAUGIAY",
      "Chi nhánh Cầu Giấy (Xưởng Vệ Tinh)",
      "102 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội",
      "Phường Quan Hoa",
      "Cầu Giấy",
      "Hà Nội",
      "",
      21.0315,
      105.7975,
      18,
      "0966345678",
      "",
      "0966345678",
      92,
      6,
      "Đang hoạt động",
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])

  // Định dạng độ rộng cột
  ws["!cols"] = [
    { wch: 16 }, // Mã
    { wch: 35 }, // Tên
    { wch: 45 }, // Địa chỉ
    { wch: 15 }, // Quận
    { wch: 15 }, // Tỉnh
    { wch: 16 }, // Lat
    { wch: 16 }, // Lng
    { wch: 22 }, // Bán kính
    { wch: 22 }, // SĐT
    { wch: 26 }, // Telegram
    { wch: 18 }, // Zalo
    { wch: 26 }, // KPI
    { wch: 22 }, // Max jobs
    { wch: 20 }, // Trạng thái
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "DanhSachCuaHang")

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[]
  return new Uint8Array(buf)
}
