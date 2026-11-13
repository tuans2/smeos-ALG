import type { TenantContext } from "@/core/tenancy/tenant-context"
import { requireCapability } from "@/core/rbac/capabilities"
import { FieldDefinitionRepository, getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { FieldConfigOverrideRepository, getFieldConfigOverrideRepository } from "../infra/field-config-override-repository"
import { mapDefinitionRowToFloorShape, mapOverrideRowToFieldOverride } from "../infra/row-mappers"
import { computeEffectiveFieldConfig, type EffectiveFieldConfig } from "../domain/field-rules"
import type { FieldEntity } from "../domain/core-field-registry"

/**
 * `GET /api/v1/field-config?entity=…` (`R1`, tenant — 3.8/3.14). Gồm trường nền tảng và trường riêng
 * của chính tổ chức (`listVisibleTo`). Ghi phía cửa hàng chỉ qua `manage-shop-fields.ts` (`D18`, trong
 * phạm vi sàn — checklist ALG 1.9).
 *
 * Bộ nhớ đệm theo `version` (3.8) CHƯA làm ở đợt ĐP-3 này — mỗi lần gọi
 * đọc thẳng DB. Ghi nợ, ít rủi ro vì đây là bảng nhỏ, đọc theo tổ chức.
 */
/**
 * Phần tính thuần, KHÔNG kiểm quyền — dùng nội bộ bởi các use-case khác của
 * cùng tổ chức (vd. cổng chặn rời bước ở `coordinator/use-cases/shared.ts`)
 * mà không bị ép phải có capability R1 (đọc trường) trong khi đã có capability
 * ghi (R3) cho chính thao tác đang thực hiện. Route/use-case NGOÀI cần đọc
 * cấu hình trường phải gọi `getEffectiveFieldConfig` (có kiểm R1) bên dưới.
 */
export async function loadEffectiveFieldConfigs(
  ctx: TenantContext,
  entity?: FieldEntity
): Promise<EffectiveFieldConfig[]> {
  const definitions = await getFieldDefinitionRepository().listVisibleTo(ctx.organizationId, entity)
  const overrideRows = await getFieldConfigOverrideRepository().listForOrganization(ctx)
  const overridesByKey = new Map(
    overrideRows.filter((r) => r.target === "FIELD").map((r) => [r.override_key, mapOverrideRowToFieldOverride(r)])
  )

  return definitions
    .filter((d) => d.status === "ACTIVE")
    .map((d) => computeEffectiveFieldConfig(mapDefinitionRowToFloorShape(d), overridesByKey.get(d.key) ?? null))
}

export async function getEffectiveFieldConfig(
  ctx: TenantContext,
  entity?: FieldEntity
): Promise<EffectiveFieldConfig[]> {
  requireCapability(ctx, "R1")
  return loadEffectiveFieldConfigs(ctx, entity)
}
