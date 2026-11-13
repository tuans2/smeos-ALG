/**
 * Kiểm chữ quảng cáo cho Landing (08) / Catalog (09): cụm sáo rỗng và lời hứa chưa khai báo.
 * Danh sách riêng — KHÔNG gộp vào `flower-banned-dictionary` (từ điển đó còn dùng để xoá chữ
 * trong chỉ đạo của chủ tiệm, thêm cụm sáo vào sẽ xoá nhầm chữ người dùng).
 * Thuần — không Prisma, không mạng.
 */

/** Cụm sáo rỗng làm trang tiệm nào cũng giống tiệm nào. So khớp không phân biệt hoa thường. */
export const LANDING_CLICHE_PHRASES: readonly string[] = [
  "ngàn lời yêu",
  "ngàn lời tri ân",
  "thay ngàn lời",
  "gửi trọn yêu thương",
  "gửi trọn tình yêu",
  "chạm đến trái tim",
  "chạm đến cảm xúc",
  "tuyệt tác",
  "món quà hoàn hảo",
  "trao gửi trân quý",
  "tôn vinh phái đẹp",
  "đánh thức mọi giác quan",
  "trải nghiệm tuyệt vời nhất",
  "đẳng cấp thượng lưu",
  "không thể bỏ lỡ",
  "số 1 thị trường",
  "hàng đầu việt nam",
]

/** Lời hứa cụ thể chỉ được nói khi Hồ sơ tiệm đã khai (giờ giao, độ tươi, miễn phí, hoàn tiền…). */
const PROMISE_PATTERNS: readonly RegExp[] = [
  /giao\s+(hỏa tốc|nhanh)?\s*(trong|chỉ)\s*\d+\s*(giờ|phút|h\b)/i,
  /tươi\s*(lâu|tới|đến)?\s*\d+\s*(-|–|đến)?\s*\d*\s*ngày/i,
  /(miễn phí|free)\s*(giao|ship|vận chuyển)/i,
  /freeship/i,
  /hoàn\s*(tiền|lại tiền)\s*100\s*%/i,
  /giống\s*(mẫu)?\s*\d{2,3}\s*%/i,
]

export function findCliches(text: string): string[] {
  const lower = text.toLowerCase()
  return LANDING_CLICHE_PHRASES.filter((p) => lower.includes(p))
}

/**
 * Lời hứa trong văn bản mà tiệm chưa khai. `declared` là các cam kết/điểm mạnh tiệm đã nhập —
 * câu hứa nằm nguyên văn trong đó thì được phép.
 */
export function findUndeclaredPromises(text: string, declared: readonly string[] = []): string[] {
  const allowed = declared.join(" \n ").toLowerCase()
  const found: string[] = []
  for (const re of PROMISE_PATTERNS) {
    const m = text.match(re)
    if (m && !allowed.includes(m[0].toLowerCase())) found.push(m[0])
  }
  return found
}
