import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { AppError } from "@/core/http/errors"
import { FieldDefinitionRepository, getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { FieldConfigOverrideRepository, getFieldConfigOverrideRepository } from "../infra/field-config-override-repository"
import { mapOverrideToApiView, type FieldConfigOverrideApiView } from "../infra/row-mappers"
import type { FieldAudience } from "../domain/core-field-registry"

export interface SetFieldOverrideForOrgInput {
  organizationId: string
  fieldKey: string
  label?: string | undefined
  visibility?: Partial<Record<FieldAudience, boolean | undefined>> | undefined
  requirement?: "OPTIONAL" | "RECOMMENDED" | "REQUIRED" | undefined
  isEnabled?: boolean | undefined
}

const REQUIREMENT_RANK: Record<"OPTIONAL" | "RECOMMENDED" | "REQUIRED", number> = { OPTIONAL: 0, RECOMMENDED: 1, REQUIRED: 2 }

/**
 * `PUT /api/v1/platform/organizations/:id/field-overrides` (`N12`, 3.7/
 * 3.13). Ghi đè CHỈ áp cho MỘT tổ chức — không đổi cấu hình platform-wide
 * (đó là `update-field-config.ts`). Mức sàn #1/#2 cắt lại lần nữa ở
 * `field-rules.ts` lúc ĐỌC (`get-effective-field-config.ts`), nên dù ghi
 * sai ở đây cũng không lộ ra ngoài — nhưng vẫn chặn sớm ở đây để báo lỗi
 * rõ ràng ngay lúc ghi thay vì im lặng bỏ qua lúc đọc.
 */
export async function setFieldOverrideForOrganization(
  pctx: PlatformContext,
  input: SetFieldOverrideForOrgInput
): Promise<FieldConfigOverrideApiView> {
  requirePlatformCapability(pctx, "N12")

  const definition = await getFieldDefinitionRepository().findByKey(input.fieldKey)
  if (!definition) throw new AppError("NOT_FOUND", `Không tìm thấy trường ${input.fieldKey}`, { key: input.fieldKey })

  if (
    input.requirement &&
    definition.origin === "CORE" &&
    REQUIREMENT_RANK[input.requirement] < REQUIREMENT_RANK[definition.requirement]
  ) {
    throw new AppError(
      "VALIDATION_FAILED",
      `Không hạ được mức yêu cầu của ${input.fieldKey} cho một tổ chức xuống dưới mức sàn hiện tại`,
      { key: input.fieldKey, floor: definition.requirement, requested: input.requirement }
    )
  }
  if (definition.floor_internal_only && input.visibility) {
    for (const audience of ["PARTNER", "SHIPPER", "CUSTOMER"] as const) {
      if (input.visibility[audience] === true) {
        throw new AppError(
          "VALIDATION_FAILED",
          `${input.fieldKey} ở mức sàn chỉ hiện INTERNAL — không mở được cho ${audience} dù chỉ một tổ chức`,
          { key: input.fieldKey, audience }
        )
      }
    }
  }

  const repo = getFieldConfigOverrideRepository()
  const updated = await repo.setFieldOverride({
    organizationId: input.organizationId,
    fieldKey: input.fieldKey,
    label: input.label ?? null,
    visibility: input.visibility ?? null,
    requirement: input.requirement ?? null,
    isEnabled: input.isEnabled ?? null,
    actorUserId: pctx.userId,
  })

  await recordPlatformAuditLog(pctx, {
    action: "platform.field_override.set",
    entityType: "field_config_overrides",
    entityId: `${input.organizationId}:FIELD:${input.fieldKey}`,
    before: null,
    after: updated,
  })

  return mapOverrideToApiView(updated)
}

export interface SetCatalogValueOverrideForOrgInput {
  organizationId: string
  catalogKey: string
  code: string
  label?: string | undefined
  isEnabled?: boolean | undefined
}

export async function setCatalogValueOverrideForOrganization(
  pctx: PlatformContext,
  input: SetCatalogValueOverrideForOrgInput
): Promise<FieldConfigOverrideApiView> {
  requirePlatformCapability(pctx, "N12")

  const repo = getFieldConfigOverrideRepository()
  const updated = await repo.setCatalogValueOverride({
    organizationId: input.organizationId,
    catalogKey: input.catalogKey,
    code: input.code,
    label: input.label ?? null,
    isEnabled: input.isEnabled ?? null,
    actorUserId: pctx.userId,
  })

  await recordPlatformAuditLog(pctx, {
    action: "platform.catalog_value_override.set",
    entityType: "field_config_overrides",
    entityId: `${input.organizationId}:CATALOG_VALUE:${input.catalogKey}:${input.code}`,
    before: null,
    after: updated,
  })

  return mapOverrideToApiView(updated)
}
