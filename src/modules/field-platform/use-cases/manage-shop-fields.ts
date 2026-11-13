import type { TenantContext } from "@/core/tenancy/tenant-context"
import { requireCapability } from "@/core/rbac/capabilities"
import { AppError, notFound, validationFailed } from "@/core/http/errors"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { getFieldConfigOverrideRepository } from "../infra/field-config-override-repository"
import { mapDefinitionRowToFloorShape, mapOverrideRowToFieldOverride } from "../infra/row-mappers"
import { ALL_CORE_FIELD_DEFINITIONS } from "../domain/all-core-fields"
import {
  assertCustomFieldCountWithinLimit, assertCustomFieldKeyNotReserved, computeEffectiveFieldConfig, slugifyCustomFieldKey,
} from "../domain/field-rules"
import { SHOP_FIELD_DATA_TYPES, shopOverrideProblem } from "../domain/shop-field-floor"
import type { CustomFieldDataType } from "../domain/custom-field-schema"
import type { FieldAudience, FieldEntity, FieldRequirementLevel } from "../domain/core-field-registry"

/**
 * Cài đặt → Trường dữ liệu (checklist ALG 1.9, năng lực `D18`, chỉ Điều hành). Cửa hàng tự tạo trường riêng
 * (`field_definitions.owner_organization_id` = tổ chức) và ẩn/đổi nhãn/nâng mức trường tuỳ chọn của nền tảng
 * qua `field_config_overrides` — không hạ được mức sàn (`shop-field-floor.ts`). Tổ chức lấy từ phiên;
 * trường riêng của tổ chức khác → 404.
 */

type Visibility = Partial<Record<FieldAudience, boolean | undefined>>

export interface ShopFieldSetting {
  key: string
  entity: string
  dataType: string
  label: string
  platformLabel: string | null
  owner: "PLATFORM" | "SHOP"
  requirement: FieldRequirementLevel
  floorRequirement: FieldRequirementLevel | null
  isEnabled: boolean
  canHide: boolean
  visibility: Record<FieldAudience, boolean>
}

export async function listShopFieldSettings(ctx: TenantContext, entity?: FieldEntity): Promise<ShopFieldSetting[]> {
  requireCapability(ctx, "D18")
  const defs = await getFieldDefinitionRepository().listVisibleTo(ctx.organizationId, entity)
  const overrides = new Map(
    (await getFieldConfigOverrideRepository().listForOrganization(ctx))
      .filter((r) => r.target === "FIELD")
      .map((r) => [r.override_key, mapOverrideRowToFieldOverride(r)]),
  )
  return defs
    .filter((d) => d.owner_organization_id !== null || d.status === "ACTIVE")
    .map((d) => {
      const own = d.owner_organization_id !== null
      const eff = computeEffectiveFieldConfig(mapDefinitionRowToFloorShape(d), own ? null : overrides.get(d.key) ?? null)
      return {
        key: d.key, entity: d.entity, dataType: d.data_type, label: eff.label,
        platformLabel: own ? null : d.label,
        owner: own ? "SHOP" : "PLATFORM",
        requirement: eff.requirement,
        floorRequirement: own ? null : (d.requirement as FieldRequirementLevel),
        isEnabled: own ? d.status === "ACTIVE" : eff.isEnabled,
        canHide: own || d.requirement !== "REQUIRED",
        visibility: eff.visibility as Record<FieldAudience, boolean>,
      }
    })
}

export interface CreateShopFieldInput {
  entity: FieldEntity
  label: string
  dataType: CustomFieldDataType
  requirement?: FieldRequirementLevel | undefined
  visibility?: Visibility | undefined
  placeholder?: string | undefined
}

export async function createShopField(ctx: TenantContext, input: CreateShopFieldInput) {
  requireCapability(ctx, "D18")
  if (!SHOP_FIELD_DATA_TYPES.includes(input.dataType)) {
    throw validationFailed({ dataType: "Kiểu dữ liệu này cửa hàng chưa tự tạo được" })
  }
  const repo = getFieldDefinitionRepository()
  try {
    assertCustomFieldCountWithinLimit(await repo.countOwned(ctx.organizationId, input.entity))
  } catch (e) {
    throw validationFailed({ label: e instanceof Error ? e.message : "Đã đạt số trường tối đa" })
  }

  const coreKeys = new Set(ALL_CORE_FIELD_DEFINITIONS.map((d) => d.key))
  const base = slugifyCustomFieldKey(input.label)
  let key = base
  // Khoá duy nhất toàn bảng; vòng lặp có giới hạn
  for (let n = 2; n < 1000 && (coreKeys.has(key) || (await repo.keyExists(key))); n += 1) key = `${base}_${n}`
  if (await repo.keyExists(key)) throw new AppError("CONFLICT", "Không sinh được khoá trường, hãy đổi nhãn")
  assertCustomFieldKeyNotReserved(key, coreKeys)

  const created = await repo.createCustomField({
    key, entity: input.entity, dataType: input.dataType, label: input.label.trim(),
    placeholder: input.placeholder?.trim() || null,
    requirement: input.requirement ?? "OPTIONAL",
    visibility: { INTERNAL: true, PARTNER: false, SHIPPER: false, CUSTOMER: false, ...input.visibility },
    sensitivity: "NORMAL", defaultEnabled: true,
    createdBy: ctx.userId, ownerOrganizationId: ctx.organizationId,
  })
  await recordAuditLog(ctx, { action: "field.shop.create", entityType: "field_definitions", entityId: key, before: null, after: { key, label: created.label, dataType: created.data_type } })
  return { key: created.key, label: created.label }
}

export interface UpdateShopFieldInput {
  key: string
  label?: string | undefined
  isEnabled?: boolean | undefined
  requirement?: FieldRequirementLevel | undefined
  visibility?: Visibility | undefined
}

export async function updateShopField(ctx: TenantContext, input: UpdateShopFieldInput) {
  requireCapability(ctx, "D18")
  const repo = getFieldDefinitionRepository()
  const def = await repo.findVisibleByKey(ctx.organizationId, input.key)
  if (!def) throw notFound()

  if (def.owner_organization_id !== null) {
    const updated = await repo.patchOwned(ctx.organizationId, input.key, {
      ...(input.label ? { label: input.label.trim() } : {}),
      ...(input.requirement ? { requirement: input.requirement } : {}),
      ...(input.visibility ? { visibility: { ...(def.visibility as object | null), ...input.visibility, INTERNAL: true } } : {}),
      ...(input.isEnabled !== undefined ? { status: input.isEnabled ? "ACTIVE" : "INACTIVE" } : {}),
    }, ctx.userId)
    if (!updated) throw notFound()
    await recordAuditLog(ctx, { action: "field.shop.update", entityType: "field_definitions", entityId: input.key, before: { label: def.label, status: def.status }, after: { label: updated.label, status: updated.status } })
    return { key: input.key }
  }

  if (def.status !== "ACTIVE") throw notFound()
  const problem = shopOverrideProblem(
    { requirement: def.requirement as FieldRequirementLevel, floorInternalOnly: def.floor_internal_only },
    input,
  )
  if (problem) throw validationFailed({ key: problem })

  const overrides = getFieldConfigOverrideRepository()
  const prev = (await overrides.listForOrganization(ctx)).find((r) => r.target === "FIELD" && r.override_key === input.key)
  const prevVisibility = (prev?.visibility ?? null) as Record<string, boolean | undefined> | null
  const merged = {
    label: input.label?.trim() || prev?.label || null,
    visibility: input.visibility ? { ...prevVisibility, ...input.visibility } : prevVisibility,
    requirement: input.requirement ?? prev?.requirement ?? null,
    isEnabled: input.isEnabled ?? prev?.is_enabled ?? null,
  }
  await overrides.setFieldOverride({ organizationId: ctx.organizationId, fieldKey: input.key, ...merged, actorUserId: ctx.userId })
  await recordAuditLog(ctx, { action: "field.shop.override", entityType: "field_config_overrides", entityId: input.key, before: prev ? { label: prev.label, isEnabled: prev.is_enabled, requirement: prev.requirement } : null, after: merged })
  return { key: input.key }
}
