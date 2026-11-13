import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { FieldDefinitionRepository, getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { FieldConfigOverrideRepository, getFieldConfigOverrideRepository } from "../infra/field-config-override-repository"
import { mapDefinitionRowToFloorShape, mapOverrideRowToFieldOverride } from "../infra/row-mappers"
import { computeEffectiveFieldConfig, type EffectiveFieldConfig } from "../domain/field-rules"
import type { FieldEntity } from "../domain/core-field-registry"

/**
 * Xem trước (3.15 "tổ chức X sẽ thấy form T01 như thế nào") — dùng CHUNG
 * phép tính với `get-effective-field-config.ts` (tenant), chỉ khác ở
 * ngữ cảnh gọi (`PlatformContext` + chọn tổ chức bất kỳ, thay vì tổ chức
 * của chính người gọi).
 */
export async function previewEffectiveConfig(
  pctx: PlatformContext,
  organizationId: string,
  entity?: FieldEntity
): Promise<EffectiveFieldConfig[]> {
  requirePlatformCapability(pctx, "N12")

  const definitions = await getFieldDefinitionRepository().listVisibleTo(organizationId, entity)
  const overrideRows = await getFieldConfigOverrideRepository().listForOrganizationId(organizationId)
  const overridesByKey = new Map(
    overrideRows.filter((r) => r.target === "FIELD").map((r) => [r.override_key, mapOverrideRowToFieldOverride(r)])
  )

  return definitions
    .filter((d) => d.status === "ACTIVE")
    .map((d) => computeEffectiveFieldConfig(mapDefinitionRowToFloorShape(d), overridesByKey.get(d.key) ?? null))
}
