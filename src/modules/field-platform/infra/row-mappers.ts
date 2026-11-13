import type {
  field_config_overrides,
  field_definitions,
  field_catalog_values,
  field_catalogs,
  field_status,
  field_origin,
  field_sensitivity as FieldSensitivityEnum,
  field_catalog_governance,
} from "./entities"
import {
  ALL_AUDIENCES,
  INTERNAL_ONLY_VISIBILITY,
  type CoreFieldDefinition,
  type FieldDataType,
  type FieldEntity,
  type FieldRequirementLevel,
  type FieldSensitivity,
  type FieldVisibility,
} from "../domain/core-field-registry"
import type { FieldOverrideRow } from "../domain/field-rules"

function parseVisibility(value: unknown): FieldVisibility {
  if (!value || typeof value !== "object") return INTERNAL_ONLY_VISIBILITY
  const v = value as Record<string, unknown>
  const result = { ...INTERNAL_ONLY_VISIBILITY }
  for (const audience of ALL_AUDIENCES) {
    if (typeof v[audience] === "boolean") result[audience] = v[audience] as boolean
  }
  return result
}

/**
 * Ánh xạ dòng `field_definitions` (trạng thái hiện tại trên DB — nhãn/mức
 * yêu cầu/hiển thị đã qua tay quản trị nền tảng nếu có) sang hình dạng
 * `CoreFieldDefinition` để tái dùng `field-rules.ts` khi cộng thêm ghi đè
 * theo tổ chức. Đây KHÔNG phải sổ đăng ký bằng code — chỉ mượn kiểu.
 */
export function mapDefinitionRowToFloorShape(row: field_definitions): CoreFieldDefinition {
  return {
    key: row.key,
    entity: row.entity as FieldEntity,
    dataType: row.data_type as FieldDataType,
    label: row.label,
    description: row.description ?? undefined,
    placeholder: row.placeholder ?? undefined,
    requirement: row.requirement as FieldRequirementLevel,
    requiredAtStage: row.required_at_stage ?? undefined,
    visibility: parseVisibility(row.visibility),
    catalogKey: row.catalog_key ?? undefined,
    sensitivity: row.sensitivity as FieldSensitivity,
    floorInternalOnly: row.floor_internal_only,
  }
}

export function mapOverrideRowToFieldOverride(row: field_config_overrides): FieldOverrideRow {
  return {
    fieldKey: row.override_key,
    label: row.label,
    visibility: (row.visibility as Partial<FieldVisibility> | null) ?? null,
    requirement: row.requirement as FieldRequirementLevel | null,
    isEnabled: row.is_enabled,
  }
}

// ---------------------------------------------------------------------------
// API views (camelCase) — mọi tuyến `/platform/fields*`, `/platform/catalogs*`,
// `/platform/organizations/:id/field-overrides` trả các kiểu dưới đây, KHÔNG
// trả thẳng dòng Prisma (snake_case), theo đúng quy ước camelCase của tầng
// trình bày trong toàn repo (xem `contracts/order-view.ts`). Thêm 26/09/2026
// khi thi công Console UI (3.15) — sửa nợ so với bản đầu ĐP-3 trả thẳng dòng
// Prisma.
// ---------------------------------------------------------------------------


export interface FieldDefinitionApiView {
  readonly id: string
  readonly key: string
  readonly entity: string
  readonly origin: field_origin
  readonly dataType: string
  readonly label: string
  readonly description: string | null
  readonly placeholder: string | null
  readonly requirement: FieldRequirementLevel
  readonly requiredAtStage: string | null
  readonly visibility: FieldVisibility
  readonly catalogKey: string | null
  readonly sensitivity: FieldSensitivityEnum
  readonly floorInternalOnly: boolean
  readonly status: field_status
  readonly defaultEnabled: boolean
  readonly createdBy: string | null
  readonly updatedBy: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export function mapFieldDefinitionToApiView(row: field_definitions): FieldDefinitionApiView {
  return {
    id: row.id,
    key: row.key,
    entity: row.entity,
    origin: row.origin,
    dataType: row.data_type,
    label: row.label,
    description: row.description,
    placeholder: row.placeholder,
    requirement: row.requirement as FieldRequirementLevel,
    requiredAtStage: row.required_at_stage,
    visibility: parseVisibility(row.visibility),
    catalogKey: row.catalog_key,
    sensitivity: row.sensitivity,
    floorInternalOnly: row.floor_internal_only,
    status: row.status,
    defaultEnabled: row.default_enabled,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export interface CatalogValueApiView {
  readonly id: string
  readonly catalogKey: string
  readonly code: string
  readonly label: string
  readonly description: string | null
  readonly sortOrder: number
  readonly isActive: boolean
  readonly behavior: string | null
  readonly params: unknown
}

export function mapCatalogValueToApiView(row: field_catalog_values): CatalogValueApiView {
  return {
    id: row.id,
    catalogKey: row.catalog_key,
    code: row.code,
    label: row.label,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    behavior: row.behavior,
    params: row.params,
  }
}

export interface CatalogApiView {
  readonly key: string
  readonly label: string
  readonly governance: field_catalog_governance
  readonly behaviorKind: string | null
  readonly values: CatalogValueApiView[]
}

export function mapCatalogToApiView(
  row: field_catalogs,
  values: field_catalog_values[]
): CatalogApiView {
  return {
    key: row.key,
    label: row.label,
    governance: row.governance,
    behaviorKind: row.behavior_kind,
    values: values.map(mapCatalogValueToApiView),
  }
}

export interface FieldConfigOverrideApiView {
  readonly id: string
  readonly organizationId: string
  readonly target: field_config_overrides["target"]
  readonly overrideKey: string
  readonly label: string | null
  readonly visibility: Partial<FieldVisibility> | null
  readonly requirement: FieldRequirementLevel | null
  readonly isEnabled: boolean | null
  readonly updatedAt: string
}

export function mapOverrideToApiView(row: field_config_overrides): FieldConfigOverrideApiView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    target: row.target,
    overrideKey: row.override_key,
    label: row.label,
    visibility: (row.visibility as Partial<FieldVisibility> | null) ?? null,
    requirement: row.requirement as FieldRequirementLevel | null,
    isEnabled: row.is_enabled,
    updatedAt: row.updated_at.toISOString(),
  }
}
