import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { AppError } from "@/core/http/errors"
import { FieldDefinitionRepository, getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { ALL_CORE_FIELD_DEFINITIONS } from "../domain/all-core-fields"
import {
  assertCustomFieldCountWithinLimit,
  assertCustomFieldKeyNotReserved,
  slugifyCustomFieldKey,
} from "../domain/field-rules"
import { CUSTOM_FIELD_DATA_TYPES, type CustomFieldDataType } from "../domain/custom-field-schema"
import type { FieldAudience, FieldEntity, FieldRequirementLevel, FieldSensitivity } from "../domain/core-field-registry"
import { mapFieldDefinitionToApiView, type FieldDefinitionApiView } from "../infra/row-mappers"

export interface CreateCustomFieldInput {
  entity: FieldEntity
  label: string
  description?: string | undefined
  placeholder?: string | undefined
  dataType: CustomFieldDataType
  requirement?: FieldRequirementLevel | undefined
  requiredAtStage?: string | undefined
  visibility?: Partial<Record<FieldAudience, boolean | undefined>> | undefined
  catalogKey?: string | undefined
  sensitivity?: FieldSensitivity | undefined
  defaultEnabled?: boolean | undefined
}

/**
 * `POST /api/v1/platform/fields` (`N12`, ĐP-3 3.7/3.13) — quản trị nền
 * tảng tạo trường HOÀN TOÀN MỚI (D13, Đặc tả trường §16.3). Mọi giới hạn an
 * toàn (§16.3) là lớp mã, kiểm Ở ĐÂY, quản trị nền tảng không vượt được.
 */
export async function createCustomField(
  pctx: PlatformContext,
  input: CreateCustomFieldInput
): Promise<FieldDefinitionApiView> {
  requirePlatformCapability(pctx, "N12")

  if (!CUSTOM_FIELD_DATA_TYPES.includes(input.dataType)) {
    throw new AppError("VALIDATION_FAILED", `Kiểu dữ liệu không hợp lệ cho trường tự tạo: ${input.dataType}`, {
      dataType: input.dataType,
    })
  }

  const repo = getFieldDefinitionRepository()
  const existingForEntity = await repo.list(input.entity)
  assertCustomFieldCountWithinLimit(existingForEntity.filter((f) => f.origin === "CUSTOM").length)

  const coreKeys = new Set(ALL_CORE_FIELD_DEFINITIONS.map((d) => d.key))
  const existingKeys = new Set(existingForEntity.map((f) => f.key))
  let key = slugifyCustomFieldKey(input.label)
  // Nhãn trùng nhau sinh cùng khoá — thêm hậu tố cho tới khi không trùng.
  let suffix = 2
  // Khoá duy nhất toàn bảng — gồm cả trường riêng của cửa hàng (không nằm trong `list`)
  while (existingKeys.has(key) || coreKeys.has(key) || (await repo.keyExists(key))) {
    key = `${slugifyCustomFieldKey(input.label)}_${suffix}`
    suffix += 1
  }
  assertCustomFieldKeyNotReserved(key, coreKeys)

  const created = await repo.createCustomField({
    key,
    entity: input.entity,
    dataType: input.dataType,
    label: input.label,
    description: input.description ?? null,
    placeholder: input.placeholder ?? null,
    requirement: input.requirement ?? "OPTIONAL",
    requiredAtStage: input.requiredAtStage ?? null,
    visibility: input.visibility ?? null,
    catalogKey: input.catalogKey ?? null,
    sensitivity: input.sensitivity ?? "NORMAL",
    defaultEnabled: input.defaultEnabled ?? true,
    createdBy: pctx.userId,
  })

  await recordPlatformAuditLog(pctx, {
    action: "platform.field.create_custom",
    entityType: "field_definitions",
    entityId: created.key,
    before: null,
    after: created,
  })

  return mapFieldDefinitionToApiView(created)
}
