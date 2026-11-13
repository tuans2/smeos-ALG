import type { InputJsonValue, field_config_overrides } from "./entities"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { scopedWhere } from "@/core/tenancy/tenant-context"

export interface SetFieldOverrideInput {
  organizationId: string
  fieldKey: string
  label?: string | null
  visibility?: Record<string, boolean | undefined> | null
  requirement?: "OPTIONAL" | "RECOMMENDED" | "REQUIRED" | null
  isEnabled?: boolean | null
  actorUserId: string
}

export interface SetCatalogValueOverrideInput {
  organizationId: string
  catalogKey: string
  code: string
  label?: string | null
  isEnabled?: boolean | null
  actorUserId: string
}

/**
 * `field_config_overrides` là bảng TENANT (có `organization_id`) nhưng chỉ
 * QUẢN TRỊ NỀN TẢNG (N12) ghi vào — người viết cầm `PlatformContext`, không
 * phải `TenantContext`, nên các hàm GHI dưới đây nhận thẳng `organizationId`
 * (tổ chức ĐANG được cấu hình, do quản trị nền tảng chọn), không dùng
 * `scopedData`. Hàm ĐỌC dùng ở tenant (3.8, `get-effective-field-config`)
 * mới nhận `TenantContext` thật và dùng `scopedWhere` — nơi duy nhất route
 * tenant được phép chạm bảng này, chỉ đọc.
 */
export class FieldConfigOverrideRepository {
  listForOrganization(ctx: TenantContext): Promise<field_config_overrides[]> {
    return prisma.field_config_overrides.findMany({
      where: scopedWhere(ctx, {}),
    })
  }

  listForOrganizationId(organizationId: string): Promise<field_config_overrides[]> {
    return prisma.field_config_overrides.findMany({ where: { organization_id: organizationId } })
  }

  async setFieldOverride(input: SetFieldOverrideInput): Promise<field_config_overrides> {
    return prisma.field_config_overrides.upsert({
      where: {
        organization_id_target_override_key: {
          organization_id: input.organizationId,
          target: "FIELD",
          override_key: input.fieldKey,
        },
      },
      create: {
        organization_id: input.organizationId,
        target: "FIELD",
        override_key: input.fieldKey,
        label: input.label ?? null,
        visibility: (input.visibility ?? null) as InputJsonValue,
        requirement: input.requirement ?? null,
        is_enabled: input.isEnabled ?? null,
        created_by: input.actorUserId,
        updated_by: input.actorUserId,
      },
      update: {
        label: input.label ?? null,
        visibility: (input.visibility ?? null) as InputJsonValue,
        requirement: input.requirement ?? null,
        is_enabled: input.isEnabled ?? null,
        updated_by: input.actorUserId,
      },
    })
  }

  async setCatalogValueOverride(input: SetCatalogValueOverrideInput): Promise<field_config_overrides> {
    const overrideKey = `${input.catalogKey}:${input.code}`
    return prisma.field_config_overrides.upsert({
      where: {
        organization_id_target_override_key: {
          organization_id: input.organizationId,
          target: "CATALOG_VALUE",
          override_key: overrideKey,
        },
      },
      create: {
        organization_id: input.organizationId,
        target: "CATALOG_VALUE",
        override_key: overrideKey,
        label: input.label ?? null,
        is_enabled: input.isEnabled ?? null,
        created_by: input.actorUserId,
        updated_by: input.actorUserId,
      },
      update: {
        label: input.label ?? null,
        is_enabled: input.isEnabled ?? null,
        updated_by: input.actorUserId,
      },
    })
  }
}

let _fieldConfigOverrideRepo: FieldConfigOverrideRepository | null = null
export function getFieldConfigOverrideRepository(): FieldConfigOverrideRepository {
  if (!_fieldConfigOverrideRepo) _fieldConfigOverrideRepo = new FieldConfigOverrideRepository()
  return _fieldConfigOverrideRepo
}
