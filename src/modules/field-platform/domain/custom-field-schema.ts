/**
 * ĐP-3 §6.2 mục 3.5 — Trình kiểm tra ĐỘNG: sinh zod từ định nghĩa trường
 * TỰ TẠO (origin = CUSTOM) đang `status = ACTIVE`. Không import Prisma —
 * nhận vào một mảng dữ liệu thuần đã đọc sẵn từ `field_definitions`.
 *
 * Nguyên tắc (§16.3): trường tự tạo INACTIVE không bị xoá giá trị cũ, nên
 * schema sinh ra CHỈ kiểm những khoá đang ACTIVE và cho phép các khoá khác
 * (`cf_*` cũ đã tắt) đi qua nguyên vẹn — `applyCustomFields` (3.9) là nơi
 * quyết định giữ lại giá trị cũ, tệp này chỉ lo việc kiểm tra.
 */
import { z } from "zod"

export type CustomFieldDataType =
  | "TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "MONEY_VND"
  | "DATE"
  | "DATETIME"
  | "BOOLEAN"
  | "SELECT"
  | "MULTI_SELECT"
  | "PHONE"
  | "EMAIL"
  | "URL"
  | "IMAGE"
  | "FILE"

export const CUSTOM_FIELD_DATA_TYPES: readonly CustomFieldDataType[] = [
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "MONEY_VND",
  "DATE",
  "DATETIME",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
  "PHONE",
  "EMAIL",
  "URL",
  "IMAGE",
  "FILE",
]

export interface CustomFieldValidationRule {
  readonly minLength?: number
  readonly maxLength?: number
  readonly min?: number
  readonly max?: number
  readonly pattern?: string
}

export interface CustomFieldDefinitionInput {
  readonly key: string // cf_...
  readonly dataType: CustomFieldDataType
  readonly requirement: "OPTIONAL" | "RECOMMENDED" | "REQUIRED"
  readonly status: "ACTIVE" | "INACTIVE"
  readonly validation?: CustomFieldValidationRule | null
  /** Bắt buộc khi dataType = SELECT/MULTI_SELECT — mã giá trị hợp lệ từ danh mục. */
  readonly options?: readonly string[] | null
  /**
   * Có giá trị thì trường này chỉ thật sự bắt buộc lúc RỜI bước này (cổng
   * `field-platform/domain/stage-transitions.ts`, 3.16) — KHÔNG bắt buộc
   * ngay lúc ghi (tạo đơn/sửa giá trị trước khi tới bước đó vẫn hợp lệ dù
   * `requirement = REQUIRED`). Không có giá trị thì `requirement = REQUIRED`
   * bắt buộc NGAY ở đây, như trước giờ.
   */
  readonly requiredAtStage?: string | null
}

const MAX_VALUE_BYTES = 4 * 1024

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function baseSchemaFor(def: CustomFieldDefinitionInput): z.ZodTypeAny {
  const v = def.validation ?? undefined
  switch (def.dataType) {
    case "TEXT":
    case "LONG_TEXT": {
      let s = z.string()
      if (v?.minLength !== undefined) s = s.min(v.minLength)
      if (v?.maxLength !== undefined) s = s.max(v.maxLength)
      if (v?.pattern) s = s.regex(new RegExp(v.pattern))
      return s.refine((val) => byteLength(val) <= MAX_VALUE_BYTES, {
        message: `Giá trị vượt quá ${MAX_VALUE_BYTES} byte (§16.3)`,
      })
    }
    case "NUMBER":
    case "MONEY_VND": {
      let n = z.number()
      if (v?.min !== undefined) n = n.min(v.min)
      if (v?.max !== undefined) n = n.max(v.max)
      return n
    }
    case "BOOLEAN":
      return z.boolean()
    case "DATE":
    case "DATETIME":
      return z.string().datetime({ offset: true }).or(z.string().date())
    case "PHONE":
      return z.string().min(8).max(20)
    case "EMAIL":
      return z.string().email()
    case "URL":
      return z.string().url()
    case "IMAGE":
    case "FILE":
      // Id trong bảng `assets` — kiểm tra cùng tổ chức là việc của use-case
      // ghi (3.9), không phải của trình sinh schema thuần này.
      return z.string().uuid()
    case "SELECT": {
      const options = def.options ?? []
      return options.length > 0 ? z.enum(options as [string, ...string[]]) : z.string()
    }
    case "MULTI_SELECT": {
      const options = def.options ?? []
      const item = options.length > 0 ? z.enum(options as [string, ...string[]]) : z.string()
      return z.array(item)
    }
    default:
      return z.unknown()
  }
}

function schemaForField(def: CustomFieldDefinitionInput): z.ZodTypeAny {
  const base = baseSchemaFor(def)
  const immediatelyRequired = def.requirement === "REQUIRED" && !def.requiredAtStage
  return immediatelyRequired ? base : base.optional().nullable()
}

/**
 * Sinh schema cho toàn bộ `custom_fields` của một thực thể. `.passthrough()`
 * để giá trị của trường đã bị tắt (không còn trong `activeDefs`) không bị
 * `zod` xoá khi kiểm tra bản ghi cũ.
 */
export function buildCustomFieldsSchema(activeDefs: readonly CustomFieldDefinitionInput[]): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const def of activeDefs) {
    if (def.status !== "ACTIVE") continue
    shape[def.key] = schemaForField(def)
  }
  return z.object(shape).passthrough()
}

export function validateCustomFieldsInput(
  activeDefs: readonly CustomFieldDefinitionInput[],
  input: unknown
): Record<string, unknown> {
  const schema = buildCustomFieldsSchema(activeDefs)
  return schema.parse(input ?? {}) as Record<string, unknown>
}
