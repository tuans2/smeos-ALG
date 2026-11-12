/**
 * Domain: Validate Transition — Cổng kiểm tra chặng chuyển tiếp.
 *
 * Đảm bảo tất cả dữ liệu carry-forward từ Chặng 1-4 đã sẵn sàng
 * trước khi vào Creative Studio (Chặng 5+).
 *
 * `assetId` là BẮT BUỘC (chốt 22/09/2026): ảnh còn ở dạng Data URL/blob tạm
 * của trình duyệt (chưa `PUT` lên kho qua `/api/v1/assets/upload-url`) không
 * được đi tiếp — lý do: base64 lọt vào query string của `router.push` từng
 * làm chết cứng nút "Bắt đầu sáng tạo" (query > ~16KB → 431 Request Header
 * Fields Too Large), và base64 lọt vào Postgres từng làm phình
 * `product_analysis_runs.report` không cần thiết trong khi ảnh đã có bản
 * lưu trữ thật. Từ nay Creative Studio luôn tự resolve ảnh hiển thị qua
 * `GET /api/v1/assets/:id/view-url`, không tin `sourceImageUrl` truyền qua URL.
 *
 * IO Spec: `docs/dac-ta/ALG_CREATIVE_STUDIO_IO_SPEC.md` mục 2.1.
 *
 * Thuần TypeScript — Zero external dependencies.
 */

import type { ProductionMode } from "./production-types"

// ============================================================
// VALIDATION RESULT
// ============================================================

export interface TransitionField {
  /** Tên field */
  readonly field: string
  /** Nhãn hiển thị UI */
  readonly label: string
  /** Nguồn gốc (Chặng nào) */
  readonly source: string
  /** Bắt buộc / Tùy chọn */
  readonly required: boolean
  /** Đã có giá trị chưa? */
  readonly present: boolean
  /** Giá trị (tóm tắt, không hiển thị data lớn) */
  readonly summary: string
}

export interface TransitionValidationResult {
  /** Có đủ điều kiện để vào Creative Studio không? */
  readonly valid: boolean
  /** Danh sách field đã kiểm tra */
  readonly fields: readonly TransitionField[]
  /** Danh sách lỗi (field bắt buộc nhưng thiếu) */
  readonly errors: readonly string[]
  /** Danh sách cảnh báo (field tùy chọn nhưng nên có) */
  readonly warnings: readonly string[]
  /** Tỉ lệ hoàn thiện (0-100) */
  readonly completionPercent: number
}

// ============================================================
// INPUT — Dữ liệu carry-forward từ Chặng 1-4
// ============================================================

export interface TransitionInput {
  /** Topic đã chọn ở Chặng 04 */
  readonly topicId?: string | undefined
  /** Loại hình sản xuất (user chọn) */
  readonly mode?: ProductionMode | undefined
  /** Ảnh sản phẩm (Data URL hoặc URL) */
  readonly sourceImageUrl?: string | undefined
  /** Video gốc (nếu user upload) */
  readonly sourceVideoUrl?: string | undefined
  /** Tên sản phẩm */
  readonly productName?: string | undefined
  /** Product ID */
  readonly productId?: string | undefined
  /** Asset ID */
  readonly assetId?: string | undefined
  /** Passport thương mại (từ Chặng 02) */
  readonly commercialPassport?: {
    readonly category?: string | undefined
    readonly style?: string | undefined
    readonly components?: readonly string[] | undefined
    readonly colors?: readonly string[] | undefined
    readonly priceRange?: string | undefined
    readonly targetAudience?: string | undefined
    readonly suggestedOccasions?: readonly string[] | undefined
  } | undefined
  /** Có report từ Product Intelligence không? */
  readonly hasReport?: boolean | undefined
  /** Có topics từ Chặng 04 không? */
  readonly hasTopics?: boolean | undefined
  /** Voice ID (Audio Studio) */
  readonly voiceId?: string | undefined
  /** Mood nhạc nền */
  readonly musicMood?: string | undefined
}

// ============================================================
// VALIDATION LOGIC
// ============================================================

/**
 * Validate tất cả required fields trước khi vào Creative Studio.
 *
 * Trả về danh sách fields đã kiểm tra, lỗi nếu thiếu field bắt buộc,
 * cảnh báo nếu thiếu field tùy chọn nhưng nên có.
 */
export function validateTransition(
  input: TransitionInput,
): TransitionValidationResult {
  const fields: TransitionField[] = []
  const errors: string[] = []
  const warnings: string[] = []

  // ── Required fields ──

  fields.push(checkField({
    field: "topicId",
    label: "Topic đã chọn (Chặng 04)",
    source: "Chặng 04 IDEATE",
    required: true,
    value: input.topicId,
  }))

  fields.push(checkField({
    field: "mode",
    label: "Loại hình sản xuất",
    source: "Chặng 05 CHOOSE",
    required: true,
    value: input.mode,
  }))

  fields.push(checkField({
    field: "sourceImageUrl",
    label: "Ảnh sản phẩm gốc",
    source: "Chặng 01 BRING",
    required: true,
    value: input.sourceImageUrl,
  }))

  fields.push(checkField({
    field: "productName",
    label: "Tên sản phẩm",
    source: "Chặng 02 UNDERSTAND",
    required: true,
    value: input.productName,
  }))

  // `assetId` là bắt buộc kể từ 22/09/2026: ảnh chưa lưu vào kho (còn ở dạng
  // Data URL/blob tạm của trình duyệt) không được đi tiếp vào Creative Studio —
  // xem ghi chú nợ #113/#118 ở `analyze-product-intelligence.ts`. Trước ngày
  // này field này nằm ở nhóm tùy chọn.
  fields.push(checkField({
    field: "assetId",
    label: "Ảnh đã lưu vào kho (Asset ID)",
    source: "Chặng 01 BRING",
    required: true,
    value: input.assetId,
  }))

  // ── Passport fields (required for quality) ──

  const passport = input.commercialPassport

  fields.push(checkField({
    field: "commercialPassport.category",
    label: "Danh mục sản phẩm",
    source: "Chặng 02 UNDERSTAND",
    required: true,
    value: passport?.category,
  }))

  fields.push(checkField({
    field: "commercialPassport.style",
    label: "Phong cách sản phẩm",
    source: "Chặng 02 UNDERSTAND",
    required: true,
    value: passport?.style,
  }))

  fields.push(checkField({
    field: "commercialPassport.components",
    label: "Thành phần hoa",
    source: "Chặng 02 UNDERSTAND",
    required: true,
    value: passport?.components?.length ? passport.components.join(", ") : undefined,
  }))

  fields.push(checkField({
    field: "commercialPassport.colors",
    label: "Màu sắc",
    source: "Chặng 02 UNDERSTAND",
    required: true,
    value: passport?.colors?.length ? passport.colors.join(", ") : undefined,
  }))

  // ── Optional but recommended ──

  fields.push(checkField({
    field: "sourceVideoUrl",
    label: "Video sản phẩm",
    source: "Chặng 01 BRING",
    required: false,
    value: input.sourceVideoUrl,
  }))

  fields.push(checkField({
    field: "commercialPassport.priceRange",
    label: "Phân khúc giá",
    source: "Chặng 02 UNDERSTAND",
    required: false,
    value: passport?.priceRange,
  }))

  fields.push(checkField({
    field: "commercialPassport.targetAudience",
    label: "Đối tượng khách hàng",
    source: "Chặng 02 UNDERSTAND",
    required: false,
    value: passport?.targetAudience,
  }))

  fields.push(checkField({
    field: "commercialPassport.suggestedOccasions",
    label: "Dịp gợi ý",
    source: "Chặng 02 UNDERSTAND",
    required: false,
    value: passport?.suggestedOccasions?.length
      ? passport.suggestedOccasions.join(", ")
      : undefined,
  }))

  fields.push(checkField({
    field: "productId",
    label: "Product ID",
    source: "Chặng 02 UNDERSTAND",
    required: false,
    value: input.productId,
  }))

  fields.push(checkField({
    field: "hasReport",
    label: "Report Product Intelligence",
    source: "Chặng 02-04",
    required: false,
    value: input.hasReport ? "Có" : undefined,
  }))

  fields.push(checkField({
    field: "hasTopics",
    label: "Topics từ Chặng 04",
    source: "Chặng 04 IDEATE",
    required: false,
    value: input.hasTopics ? "Có" : undefined,
  }))

  fields.push(checkField({
    field: "voiceId",
    label: "Voice ID (giọng đọc)",
    source: "Chặng 05 CHOOSE",
    required: false,
    value: input.voiceId,
  }))

  fields.push(checkField({
    field: "musicMood",
    label: "Mood nhạc nền",
    source: "Chặng 05 CHOOSE",
    required: false,
    value: input.musicMood,
  }))

  // ── Collect errors / warnings ──
  for (const f of fields) {
    if (f.required && !f.present) {
      errors.push(`Thiếu ${f.label} (nguồn: ${f.source})`)
    }
    if (!f.required && !f.present) {
      warnings.push(`Nên có ${f.label} để tạo nội dung chất lượng cao hơn`)
    }
  }

  // ── Completion percent ──
  const totalRequired = fields.filter((f) => f.required).length
  const presentRequired = fields.filter((f) => f.required && f.present).length
  const totalOptional = fields.filter((f) => !f.required).length
  const presentOptional = fields.filter((f) => !f.required && f.present).length

  // Required = 80% weight, Optional = 20% weight
  const requiredScore = totalRequired > 0 ? (presentRequired / totalRequired) * 80 : 80
  const optionalScore = totalOptional > 0 ? (presentOptional / totalOptional) * 20 : 20
  const completionPercent = Math.round(requiredScore + optionalScore)

  return {
    valid: errors.length === 0,
    fields,
    errors,
    warnings,
    completionPercent,
  }
}

// ============================================================
// HELPERS
// ============================================================

function checkField(opts: {
  field: string
  label: string
  source: string
  required: boolean
  value: string | undefined
}): TransitionField {
  const present = opts.value !== undefined && opts.value !== ""
  return {
    field: opts.field,
    label: opts.label,
    source: opts.source,
    required: opts.required,
    present,
    summary: present ? truncate(opts.value!, 60) : "—",
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + "…"
}
