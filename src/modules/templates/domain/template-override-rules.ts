/**
 * template-override-rules.ts
 *
 * Luật thuần cho bảng `template_overrides` (nợ #99, Giai đoạn 3 kiến trúc gốc
 * — cơ chế ghi đè template theo tenant, bắt đầu với họ ST). Không import
 * Prisma/infra — chỉ chuẩn hoá và kiểm dữ liệu đầu vào từ tầng use-case/route.
 *
 * CỐ TÌNH khoá cứng danh sách (template_family, template_key, field_key)
 * được PHÉP ghi đè, thay vì nhận bất kỳ chuỗi tự do nào: mỗi field ghi đè
 * phải có nơi đọc thật khớp với nó (`generateZaloPitchScript()` hiện chỉ
 * biết đọc đúng MỘT field, `greeting_line`). Nhận tự do một field chưa có
 * nơi đọc sẽ tạo dữ liệu "mồ côi" — đúng tình trạng `src/core/templates/*`
 * đã gặp ở nợ #99 (engine dựng sẵn nhưng không nơi nào gọi tới).
 */

export const TEMPLATE_FAMILIES = ["GT", "IT", "CT", "ST", "OT"] as const
export type TemplateFamily = (typeof TEMPLATE_FAMILIES)[number]

export function isTemplateFamily(value: unknown): value is TemplateFamily {
  return typeof value === "string" && (TEMPLATE_FAMILIES as readonly string[]).includes(value)
}

/**
 * Danh sách trắng field được phép ghi đè. Mở rộng danh sách này CÙNG LÚC với
 * việc thêm nơi đọc thật trong template tương ứng — không thêm trước, không
 * đoán trước nhu cầu.
 */
const ALLOWED_OVERRIDES: ReadonlyArray<{
  family: TemplateFamily
  templateKey: string
  fieldKey: string
  maxLength: number
}> = [
  // Câu chào mở đầu kịch bản Zalo — field đầu tiên, xem sales-pitch-template.ts.
  { family: "ST", templateKey: "sales_pitch_zalo", fieldKey: "greeting_line", maxLength: 200 },
  // Thiệp mừng / Lời chúc sinh nhật — họ GT, xem scoping-gaps-18-09.test.ts
  { family: "GT", templateKey: "loi-chuc-sinh-nhat", fieldKey: "tieu_de", maxLength: 200 },
]

export interface SetTemplateOverrideInput {
  templateFamily: string
  templateKey: string
  fieldKey: string
  value: string
}

export interface ValidatedTemplateOverride {
  templateFamily: TemplateFamily
  templateKey: string
  fieldKey: string
  value: string
}

export interface TemplateOverrideValidationError {
  field: "templateFamily" | "templateKey" | "fieldKey" | "value"
  message: string
}

/**
 * Kiểm + chuẩn hoá đầu vào ghi đè một field template. Trả về lỗi đầu tiên
 * gặp phải (không gộp nhiều lỗi) — đủ dùng cho route đơn giản, cùng khuôn
 * `validateCreateOccasionInput`.
 */
export function validateSetTemplateOverrideInput(
  input: SetTemplateOverrideInput
): ValidatedTemplateOverride | TemplateOverrideValidationError {
  if (!isTemplateFamily(input.templateFamily)) {
    return { field: "templateFamily", message: "Họ template không hợp lệ" }
  }

  const allowed = ALLOWED_OVERRIDES.find(
    (a) =>
      a.family === input.templateFamily &&
      a.templateKey === input.templateKey &&
      a.fieldKey === input.fieldKey
  )
  if (!allowed) {
    return {
      field: "fieldKey",
      message: `Chưa hỗ trợ ghi đè "${input.templateKey}.${input.fieldKey}" — chỉ hỗ trợ các field đã có nơi đọc thật trong mã`,
    }
  }

  const value = input.value.trim()
  if (value.length === 0) {
    return { field: "value", message: "Giá trị ghi đè không được để trống" }
  }
  if (value.length > allowed.maxLength) {
    return { field: "value", message: `Giá trị ghi đè không được vượt quá ${allowed.maxLength} ký tự` }
  }

  return {
    templateFamily: input.templateFamily,
    templateKey: input.templateKey,
    fieldKey: input.fieldKey,
    value,
  }
}
