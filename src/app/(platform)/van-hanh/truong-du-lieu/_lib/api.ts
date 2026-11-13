// Kiểu và hàm gọi API dùng chung cho Console "Trường dữ liệu" (ĐP-3 3.15).
// Khớp CHÍNH XÁC với các API view camelCase ở
// `src/modules/field-platform/infra/row-mappers.ts` — sửa một bên thì sửa
// bên kia theo.

import { snakeKeys } from "@/lib/case-keys"

export type FieldAudience = "INTERNAL" | "PARTNER" | "SHIPPER" | "CUSTOMER"
export const ALL_AUDIENCES: FieldAudience[] = ["INTERNAL", "PARTNER", "SHIPPER", "CUSTOMER"]
export type FieldVisibilityMap = Partial<Record<FieldAudience, boolean>>
export type FieldRequirementLevel = "OPTIONAL" | "RECOMMENDED" | "REQUIRED"
export const REQUIREMENT_LEVELS: FieldRequirementLevel[] = ["OPTIONAL", "RECOMMENDED", "REQUIRED"]
export type FieldEntityKind = "ORDER" | "PARTNER"
export type FieldSensitivity = "NORMAL" | "PII" | "SENSITIVE"
export const SENSITIVITY_LEVELS: FieldSensitivity[] = ["NORMAL", "PII", "SENSITIVE"]

export const CUSTOM_FIELD_DATA_TYPES = [
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
] as const

export interface FieldDefinitionApiView {
  id: string
  key: string
  entity: string
  origin: "CORE" | "CUSTOM"
  dataType: string
  label: string
  description: string | null
  placeholder: string | null
  requirement: FieldRequirementLevel
  requiredAtStage: string | null
  visibility: FieldVisibilityMap
  catalogKey: string | null
  sensitivity: FieldSensitivity
  floorInternalOnly: boolean
  status: "ACTIVE" | "INACTIVE"
  defaultEnabled: boolean
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CatalogValueApiView {
  id: string
  catalogKey: string
  code: string
  label: string
  description: string | null
  sortOrder: number
  isActive: boolean
  behavior: string | null
  params: unknown
}

export interface CatalogApiView {
  key: string
  label: string
  governance: "OPEN" | "BEHAVIOR" | "CLOSED"
  behaviorKind: string | null
  values: CatalogValueApiView[]
}

export interface FieldConfigOverrideApiView {
  id: string
  organizationId: string
  target: "FIELD" | "CATALOG_VALUE"
  overrideKey: string
  label: string | null
  visibility: FieldVisibilityMap | null
  requirement: FieldRequirementLevel | null
  isEnabled: boolean | null
  updatedAt: string
}

export interface EffectiveFieldConfigView {
  key: string
  entity: string
  dataType: string
  label: string
  requirement: FieldRequirementLevel
  requiredAtStage?: string
  visibility: FieldVisibilityMap
  isEnabled: boolean
  sensitivity: FieldSensitivity
  catalogKey?: string
}

export interface PlatformOrganizationSummary {
  id: string
  name: string
  slug: string
  type: string
  creditBalance: number
  createdAt: string
  memberCount: number
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    })
  } catch {
    return { ok: false, error: "Không gọi được máy chủ." }
  }
  if (!res.ok) {
    let message = `Lỗi ${res.status}`
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } }
      if (body?.error?.message) message = body.error.message
      else if (body?.error?.code) message = body.error.code
    } catch {
      // giữ message mặc định
    }
    return { ok: false, error: message }
  }
  const body = (await res.json()) as { data: T }
  return { ok: true, data: body.data }
}

export const fieldPlatformApi = {
  listFields: (entity?: FieldEntityKind) =>
    call<FieldDefinitionApiView[]>(`/api/v1/platform/fields${entity ? `?entity=${entity}` : ""}`),
  updateFieldConfig: (body: Record<string, unknown>) =>
    call<FieldDefinitionApiView>("/api/v1/platform/fields", { method: "PATCH", body: JSON.stringify(snakeKeys(body)) }),
  createCustomField: (body: Record<string, unknown>) =>
    call<FieldDefinitionApiView>("/api/v1/platform/fields", { method: "POST", body: JSON.stringify(snakeKeys(body)) }),
  deactivateField: (key: string) =>
    call<FieldDefinitionApiView>(`/api/v1/platform/fields/${encodeURIComponent(key)}/deactivate`, { method: "POST" }),
  listCatalogs: () => call<CatalogApiView[]>("/api/v1/platform/catalogs"),
  addCatalogValue: (catalogKey: string, body: Record<string, unknown>) =>
    call<CatalogValueApiView>(`/api/v1/platform/catalogs/${encodeURIComponent(catalogKey)}/values`, {
      method: "POST",
      body: JSON.stringify(snakeKeys(body)),
    }),
  listBehaviorCodes: (kind: string) =>
    call<{ kind: string; codes: string[] }>(`/api/v1/platform/behaviors?kind=${encodeURIComponent(kind)}`),
  setFieldOverride: (organizationId: string, body: Record<string, unknown>) =>
    call<FieldConfigOverrideApiView>(`/api/v1/platform/organizations/${organizationId}/field-overrides`, {
      method: "PUT",
      body: JSON.stringify(snakeKeys({ target: "field", ...body })),
    }),
  setCatalogValueOverride: (organizationId: string, body: Record<string, unknown>) =>
    call<FieldConfigOverrideApiView>(`/api/v1/platform/organizations/${organizationId}/field-overrides`, {
      method: "PUT",
      body: JSON.stringify(snakeKeys({ target: "catalogValue", ...body })),
    }),
  listOrganizations: () => call<PlatformOrganizationSummary[]>("/api/v1/platform/organizations"),
  previewOrgConfig: (organizationId: string, entity?: FieldEntityKind) =>
    call<EffectiveFieldConfigView[]>(
      `/api/v1/platform/organizations/${organizationId}/field-preview${entity ? `?entity=${entity}` : ""}`
    ),
}
