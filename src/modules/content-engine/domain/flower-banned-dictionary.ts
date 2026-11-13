/**
 * Flower Banned Words Dictionary & Compliance Rules.
 * Clone & chuẩn hóa từ SocialFlow M07 (flower_prompts.py).
 * Pure Domain - Không phụ thuộc Prisma, DB hay mạng.
 */

/**
 * Danh sách cụm từ cấm kỵ trong tiếp thị hoa tươi:
 * 1. Cam kết sai lệch về đặc tính hoa tự nhiên
 * 2. Văn mẫu sáo rỗng AI
 * 3. Ngôn từ giật gân, chợ búa
 * 4. Tuyên bố sai sự thật / vi phạm chính sách
 */
export const FLOWER_BANNED_PHRASES: readonly string[] = [
  // Cam kết sai lệch về hoa
  "hoa vĩnh cửu",
  "không bao giờ tàn",
  "hoa tự nhiên 100%",
  "giống hệt 100% hình mẫu",
  "hoa nở mãi mãi",
  "cam kết nở đúng từng phút",

  // Từ sáo rỗng AI
  "tóm lại",
  "kết luận là",
  "chúng tôi vô cùng hào hứng",
  "vui mừng chia sẻ",
  "bước ngoặt mang tính cách mạng",
  "là một mô hình ai",
  "đắm chìm vào",
  "tận dụng tối đa",
  "phát huy tiềm năng",
  "vô song",
  "đỉnh chóp vũ trụ",

  // Giật gân chợ búa
  "xả kho lỗ vốn",
  "cứu chủ shop",
  "rẻ như cho",
  "rẻ tụt quần",
  "hoa ế thanh lý",
  "hàng dạt",

  // Vi phạm chính sách
  "chữa lành tâm linh hoàn toàn",
  "click ngay kẻo lỡ",
]

/**
 * Kiểm tra xem một đoạn văn có chứa từ cấm ngành hoa hay không
 */
export function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const phrase of FLOWER_BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      found.push(phrase)
    }
  }
  return found
}

/**
 * Làm sạch văn bản, loại bỏ các cụm từ sáo rỗng hoặc cấm
 */
export function sanitizeFlowerText(text: string): string {
  let cleaned = text
  for (const phrase of FLOWER_BANNED_PHRASES) {
    const regex = new RegExp(phrase, "gi")
    cleaned = cleaned.replace(regex, "")
  }
  return cleaned.replace(/\s{2,}/g, " ").trim()
}
