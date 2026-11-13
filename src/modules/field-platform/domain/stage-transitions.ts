/**
 * ĐP-3 §6.2 mục 3.10 — Cổng chặn chuyển bước theo trường bắt buộc. Trường
 * (lõi hoặc tự tạo) có `requiredAtStage = X` còn trống thì không cho RỜI
 * bước X. Hàm thuần — không đọc DB, không biết `order_coordinations` là gì;
 * caller (use-case) truyền vào cấu hình hiệu lực đã tính (3.4) và một hàm
 * đọc giá trị hiện tại của đơn theo khoá trường.
 */
import type { EffectiveFieldConfig } from "./field-rules"

export interface MissingRequiredField {
  readonly key: string
  readonly label: string
}

export type FieldValueLookup = (fieldKey: string) => unknown

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * Trả danh sách trường còn thiếu để RỜI `stage`. Chỉ xét trường đang
 * `isEnabled` (trường lõi REQUIRED luôn `isEnabled = true`, xem
 * `computeEffectiveFieldConfig`) và có `requiredAtStage` khớp đúng `stage`.
 */
export function findMissingRequiredFields(
  configs: readonly EffectiveFieldConfig[],
  stage: string,
  getValue: FieldValueLookup
): readonly MissingRequiredField[] {
  const missing: MissingRequiredField[] = []
  for (const config of configs) {
    if (!config.isEnabled) continue
    if (config.requirement !== "REQUIRED") continue
    if (config.requiredAtStage !== stage) continue
    if (isEmpty(getValue(config.key))) {
      missing.push({ key: config.key, label: config.label })
    }
  }
  return missing
}

export function canLeaveStage(
  configs: readonly EffectiveFieldConfig[],
  stage: string,
  getValue: FieldValueLookup
): boolean {
  return findMissingRequiredFields(configs, stage, getValue).length === 0
}
