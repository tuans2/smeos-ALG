/**
 * ĐP-3 §6.2 mục 3.4 — Luật thuần của nền quản trị trường: tổng hợp LỚP MÃ
 * (`core-field-registry.ts`) với LỚP CẤU HÌNH (`field_config_overrides`,
 * đọc qua kiểu `FieldOverrideRow`/`CatalogValueOverrideRow` dưới đây — tệp
 * này không import Prisma, infra tự ánh xạ dòng DB sang hai kiểu này) theo
 * đúng "Mức sàn, không cấu hình được" của Đặc tả trường §16.2:
 *
 *   1. Trường `floorInternalOnly` chỉ hiện `INTERNAL`, bất kể cấu hình.
 *   2. Trường bắt buộc theo luật nghiệp vụ (`requirement = REQUIRED` ở lớp
 *      mã) không hạ xuống được, cấu hình chỉ được NÂNG mức yêu cầu.
 *   3. Giá trị danh mục không xoá cứng — cấu hình chỉ có `isActive`.
 *   4. Mã giá trị (`code`) không đổi được — không có hàm nào ở đây nhận
 *      "đổi code", chỉ nhận đổi nhãn/mô tả/thứ tự/trạng thái.
 *   5. Ghi vào `platform_audit_logs` là việc của use-case (3.7), không phải
 *      của lớp luật thuần này.
 *
 * Không import Prisma — test được không cần cơ sở dữ liệu.
 */
import {
  ALL_AUDIENCES,
  type CoreFieldDefinition,
  type FieldAudience,
  type FieldRequirementLevel,
  type FieldVisibility,
} from "./core-field-registry"

const REQUIREMENT_RANK: Record<FieldRequirementLevel, number> = {
  OPTIONAL: 0,
  RECOMMENDED: 1,
  REQUIRED: 2,
}

export interface FieldOverrideRow {
  readonly fieldKey: string
  readonly label?: string | null
  readonly visibility?: Partial<FieldVisibility> | null
  readonly requirement?: FieldRequirementLevel | null
  readonly isEnabled?: boolean | null
}

export interface CatalogValueOverrideRow {
  readonly catalogKey: string
  readonly code: string
  readonly label?: string | null
  readonly isEnabled?: boolean | null
}

export interface EffectiveFieldConfig {
  readonly key: string
  readonly entity: CoreFieldDefinition["entity"]
  readonly dataType: CoreFieldDefinition["dataType"]
  readonly label: string
  readonly requirement: FieldRequirementLevel
  readonly requiredAtStage?: string | undefined
  readonly visibility: FieldVisibility
  readonly isEnabled: boolean
  readonly sensitivity: CoreFieldDefinition["sensitivity"]
  readonly catalogKey?: string | undefined
}

/**
 * Nâng mức yêu cầu — không bao giờ hạ xuống dưới mức lớp mã (mức sàn #2).
 * Trường KHÔNG có `requiredAtStage` ở lớp mã (OPTIONAL/RECOMMENDED) vẫn
 * nâng được lên REQUIRED — đó là quyền hợp lệ của quản trị nền tảng.
 */
function resolveRequirement(
  floor: FieldRequirementLevel,
  override: FieldRequirementLevel | null | undefined
): FieldRequirementLevel {
  if (!override) return floor
  return REQUIREMENT_RANK[override] > REQUIREMENT_RANK[floor] ? override : floor
}

/**
 * Cộng ghi đè hiển thị lên lớp mã. Mức sàn #1 và độ nhạy: `floorInternalOnly`
 * hoặc `sensitivity !== "NORMAL"` thì PARTNER/SHIPPER/CUSTOMER luôn `false`
 * dù cấu hình nói gì — cấu hình chỉ được SIẾT chặt thêm (tắt bớt), không
 * được NỚI những đối tượng xem này.
 */
function resolveVisibility(def: CoreFieldDefinition, override: Partial<FieldVisibility> | null | undefined): FieldVisibility {
  const floorLocked = Boolean(def.floorInternalOnly) || def.sensitivity !== "NORMAL"
  const result = { ...def.visibility }
  for (const audience of ALL_AUDIENCES) {
    const requested = override?.[audience]
    if (requested === undefined || requested === null) continue
    if (floorLocked && audience !== "INTERNAL" && requested === true) {
      // Bị chặn — bỏ qua yêu cầu mở, giữ nguyên lớp mã (thường là false).
      continue
    }
    result[audience] = requested
  }
  return result
}

export function computeEffectiveFieldConfig(
  def: CoreFieldDefinition,
  override: FieldOverrideRow | null | undefined
): EffectiveFieldConfig {
  return {
    key: def.key,
    entity: def.entity,
    dataType: def.dataType,
    label: override?.label ?? def.label,
    requirement: resolveRequirement(def.requirement, override?.requirement),
    requiredAtStage: def.requiredAtStage,
    visibility: resolveVisibility(def, override?.visibility),
    // Trường lõi bắt buộc (REQUIRED ở lớp mã) không tắt được — chỉ trường
    // OPTIONAL/RECOMMENDED mới nhận `isEnabled = false` từ cấu hình.
    isEnabled: def.requirement === "REQUIRED" ? true : (override?.isEnabled ?? true),
    sensitivity: def.sensitivity,
    catalogKey: def.catalogKey,
  }
}

export interface EffectiveCatalogValue {
  readonly code: string
  readonly label: string
  readonly isActive: boolean
  readonly behavior: string | null
  readonly params: Record<string, unknown> | null
  readonly sortOrder: number
}

export interface CoreCatalogValueRow {
  readonly code: string
  readonly label: string
  readonly description?: string | null
  readonly sortOrder: number
  readonly isActive: boolean
  readonly behavior: string | null
  readonly params: Record<string, unknown> | null
}

/** Cộng ghi đè theo tổ chức lên MỘT giá trị danh mục — nhãn và bật/tắt. */
export function computeEffectiveCatalogValue(
  row: CoreCatalogValueRow,
  override: CatalogValueOverrideRow | null | undefined
): EffectiveCatalogValue {
  return {
    code: row.code,
    label: override?.label ?? row.label,
    // Mức sàn #3: không xoá cứng — `isActive` chỉ chuyển false/true, dòng vẫn còn.
    isActive: override?.isEnabled ?? row.isActive,
    behavior: row.behavior,
    params: row.params,
    sortOrder: row.sortOrder,
  }
}

// ── Giới hạn an toàn cho trường tự tạo (Đặc tả trường §16.3 / kế hoạch §6.4) ──

export const MAX_CUSTOM_FIELDS_PER_ENTITY = 50
export const MAX_CUSTOM_FIELD_VALUE_BYTES = 4 * 1024

export function assertCustomFieldCountWithinLimit(existingCountForEntity: number): void {
  if (existingCountForEntity >= MAX_CUSTOM_FIELDS_PER_ENTITY) {
    throw new Error(
      `Đã đạt tối đa ${MAX_CUSTOM_FIELDS_PER_ENTITY} trường tự tạo cho thực thể này (§16.3).`
    )
  }
}

/** Không đổi kiểu dữ liệu khi trường đã có giá trị (§16.3). */
export function assertDataTypeChangeAllowed(hasExistingValues: boolean): void {
  if (hasExistingValues) {
    throw new Error("Không đổi được kiểu dữ liệu của trường đã có giá trị — tạo trường mới thay vào đó.")
  }
}

/** Sinh khoá `cf_<chữ-thường>` từ nhãn — máy sinh, không đổi được sau khi tạo (§16.3). */
export function slugifyCustomFieldKey(label: string): string {
  const ascii = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return `cf_${slug || "truong"}`
}

export function assertCustomFieldKeyNotReserved(
  key: string,
  coreKeys: ReadonlySet<string>
): void {
  // Kiểm TRÙNG khoá lõi trước tiền tố cf_ (nợ phát hiện 26/09/2026 qua
  // `field-rules.test.ts`): một khoá vừa trùng khoá lõi vừa sai tiền tố nên
  // báo lý do CỤ THỂ hơn ("trùng khoá lõi") thay vì lý do chung ("sai tiền
  // tố") — dễ hành động hơn cho người đọc lỗi.
  if (coreKeys.has(key)) {
    throw new Error(`Khoá ${key} trùng với một khoá trường lõi — chọn nhãn khác.`)
  }
  if (!key.startsWith("cf_")) {
    throw new Error("Khoá trường tự tạo phải bắt đầu bằng cf_ — máy tự sinh, không gõ tay.")
  }
}

export function isAudienceAllowed(
  effective: Pick<EffectiveFieldConfig, "visibility">,
  audience: FieldAudience
): boolean {
  return effective.visibility[audience]
}
