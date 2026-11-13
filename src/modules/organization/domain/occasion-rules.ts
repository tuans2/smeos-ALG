/**
 * occasion-rules.ts
 *
 * Luật thuần cho danh mục "Dịp lễ" của một tổ chức (`occasions`, nợ #104 —
 * "giọng theo dịp", chốt xây đầy đủ qua AskUserQuestion 17/09). Không import
 * Prisma/infra — chỉ chuẩn hoá và kiểm dữ liệu đầu vào từ tầng use-case/route.
 */

/**
 * Ba tông giọng đóng, KHÔNG tự suy đoán từ tên dịp — luôn do tenant tự chọn
 * qua UI quản lý dịp. Việc đoán "trang trọng" bằng từ khoá trong tên dịp là
 * đúng cái bẫy "không bịa" mà AGENTS.md đã cấm cho `tone_of_voice` trước đây.
 */
export const OCCASION_REGISTERS = ["FESTIVE", "NEUTRAL", "SOLEMN"] as const

export type OccasionRegisterValue = (typeof OCCASION_REGISTERS)[number]

export function isOccasionRegister(value: unknown): value is OccasionRegisterValue {
  return typeof value === "string" && (OCCASION_REGISTERS as readonly string[]).includes(value)
}

/** Nhãn tiếng Việt cho UI — chỉ dùng để hiển thị, không dùng để so khớp logic. */
export const OCCASION_REGISTER_LABELS: Record<OccasionRegisterValue, string> = {
  FESTIVE: "Rộn ràng, chúc mừng",
  NEUTRAL: "Trung tính",
  SOLEMN: "Trang trọng, chia buồn",
}

export interface NormalizedOccasionCode {
  code: string
}

/**
 * Chuẩn hoá mã dịp: cắt khoảng trắng đầu/cuối, hạ chữ thường, đổi khoảng
 * trắng giữa thành `_`. Rỗng sau khi cắt -> `null` (bắt lỗi ở use-case, không
 * ném ở đây — hàm thuần không biết ngữ cảnh HTTP).
 */
export function normalizeOccasionCode(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "_")
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeOccasionName(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export interface CreateOccasionInput {
  code: string
  name: string
  register?: OccasionRegisterValue
  sortOrder?: number
}

export interface ValidatedCreateOccasion {
  code: string
  name: string
  register: OccasionRegisterValue
  sortOrder: number
}

export interface OccasionValidationError {
  field: "code" | "name" | "register"
  message: string
}

/**
 * Kiểm + chuẩn hoá đầu vào tạo một dịp mới. Trả về lỗi đầu tiên gặp phải
 * (không gộp nhiều lỗi) — đủ dùng cho một form/route đơn giản như branches.
 * `register` không truyền -> mặc định `FESTIVE`, khớp mặc định cột Prisma.
 */
export function validateCreateOccasionInput(
  input: CreateOccasionInput
): ValidatedCreateOccasion | OccasionValidationError {
  const code = normalizeOccasionCode(input.code)
  if (!code) return { field: "code", message: "Mã dịp không được để trống" }

  const name = normalizeOccasionName(input.name)
  if (!name) return { field: "name", message: "Tên dịp không được để trống" }

  const register = input.register ?? "FESTIVE"
  if (!isOccasionRegister(register)) {
    return { field: "register", message: "Tông giọng không hợp lệ" }
  }

  return { code, name, register, sortOrder: input.sortOrder ?? 0 }
}

export interface UpdateOccasionInput {
  name?: string | undefined
  register?: OccasionRegisterValue | undefined
  sortOrder?: number | undefined
  isActive?: boolean | undefined
}

export interface ValidatedUpdateOccasion {
  name?: string
  register?: OccasionRegisterValue
  sort_order?: number
  is_active?: boolean
}

/**
 * Không cho sửa `code` — mã dịp là khoá tra cứu ổn định trong chính bảng
 * `occasions` (`@@unique([organization_id, code])`). LƯU Ý (phát hiện khi
 * viết hàm này, 18/09): chú thích cũ trên model `occasions` trong
 * `schema.prisma` ghi "`dip_su_dung` của product_copies gán theo mã trong
 * bảng này" — đọc thẳng mã thật (`sales-pitch-template.ts`,
 * `product-master-index-repository.ts`, `mergeOccasions()`) cho thấy điều
 * này SAI: `identity.dip_su_dung`/`pitch.occasions` luôn là CHUỖI TỰ DO do AI
 * đoán hoặc Sales gõ tay, không có cột nào tham chiếu `occasions.code`. Ghi
 * chú cũ có thể là định hướng ban đầu chưa từng cài. Giữ nguyên đổi mã bị
 * chặn vì đây vẫn là khoá của chính bảng, không phải vì có nơi khác tham
 * chiếu tới nó.
 */
export function validateUpdateOccasionInput(
  input: UpdateOccasionInput
): ValidatedUpdateOccasion | OccasionValidationError {
  const result: ValidatedUpdateOccasion = {}

  if (input.name !== undefined) {
    const name = normalizeOccasionName(input.name)
    if (!name) return { field: "name", message: "Tên dịp không được để trống" }
    result.name = name
  }

  if (input.register !== undefined) {
    if (!isOccasionRegister(input.register)) {
      return { field: "register", message: "Tông giọng không hợp lệ" }
    }
    result.register = input.register
  }

  if (input.sortOrder !== undefined) result.sort_order = input.sortOrder
  if (input.isActive !== undefined) result.is_active = input.isActive

  return result
}
