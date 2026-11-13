/**
 * Chuẩn hóa chuỗi văn bản để so sánh mờ (fuzzy label matching):
 *  - Bỏ dấu tiếng Việt (NFD decompose + loại combining marks)
 *  - Chuyển về chữ thường
 *  - Gộp khoảng trắng thừa, trim
 *
 * Ví dụ: "Bó Hoa", "bo hoa", "BÓ HOA", "bo  hoa" → đều ra "bo hoa"
 *
 * Hàm này THUẦN TÚY (pure) — không phụ thuộc browser/Node API ngoài
 * String.normalize (có sẵn trong mọi JS runtime hiện đại).
 */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return ""
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ combining diacritical marks
    .replace(/đ/gi, "d")             // đ/Đ không qua NFD → xử lý riêng
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Tra cứu trong một bảng ánh xạ theo key đã chuẩn hóa.
 * Cho phép user nhập "bo hoa", "Bó Hoa", "BÓ HOA"… đều tìm ra "BOUQUET".
 *
 * @param map   - Bảng ánh xạ { "Sản phẩm": "BOUQUET", ... }
 * @param label - Nhãn do người dùng chọn (bất kỳ biến thể nào)
 * @returns     giá trị tương ứng, hoặc undefined nếu không tìm thấy
 */
export function lookupNormalized<V>(
  map: Record<string, V>,
  label: string | null | undefined
): V | undefined {
  if (!label) return undefined
  const needle = normalizeText(label)
  for (const [key, value] of Object.entries(map)) {
    if (normalizeText(key) === needle) return value
  }
  return undefined
}
