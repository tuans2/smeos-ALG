import type { InputJsonValue, field_definitions } from "./entities"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { CoreFieldDefinition } from "../domain/core-field-registry"

export interface UpsertCustomFieldInput {
  key: string
  entity: string
  dataType: string
  label: string
  description?: string | null
  placeholder?: string | null
  placements?: unknown
  requirement: "OPTIONAL" | "RECOMMENDED" | "REQUIRED"
  requiredAtStage?: string | null
  visibility?: unknown
  validation?: unknown
  catalogKey?: string | null
  sensitivity: "NORMAL" | "PII" | "SENSITIVE"
  defaultEnabled: boolean
  createdBy: string
  /** Checklist ALG 1.9 — trường cửa hàng tự tạo; bỏ trống = trường nền tảng. */
  ownerOrganizationId?: string | null
}

export class FieldDefinitionRepository {
  /** Trường của nền tảng (lõi và quản trị nền tảng tạo) — không gồm trường riêng của cửa hàng. */
  list(entity?: string): Promise<field_definitions[]> {
    return prisma.field_definitions.findMany({
      where: { owner_organization_id: null, ...(entity ? { entity } : {}) },
      orderBy: [{ entity: "asc" }, { key: "asc" }],
    })
  }

  /** Trường nền tảng cộng trường riêng của đúng một tổ chức (checklist ALG 1.9). */
  listVisibleTo(organizationId: string, entity?: string): Promise<field_definitions[]> {
    return prisma.field_definitions.findMany({
      where: {
        OR: [{ owner_organization_id: null }, { owner_organization_id: organizationId }],
        ...(entity ? { entity } : {}),
      },
      orderBy: [{ entity: "asc" }, { key: "asc" }],
    })
  }

  findByKey(key: string): Promise<field_definitions | null> {
    return prisma.field_definitions.findUnique({ where: { key } })
  }

  async keyExists(key: string): Promise<boolean> {
    return (await prisma.field_definitions.count({ where: { key } })) > 0
  }

  /** Số trường riêng của một tổ chức trên một thực thể — hạn mức tính riêng từng cửa hàng. */
  countOwned(organizationId: string, entity: string): Promise<number> {
    return prisma.field_definitions.count({ where: { owner_organization_id: organizationId, entity } })
  }

  /** Trường riêng của tổ chức hoặc trường nền tảng; trường riêng của tổ chức khác → null. */
  findVisibleByKey(organizationId: string, key: string): Promise<field_definitions | null> {
    return prisma.field_definitions.findFirst({
      where: { key, OR: [{ owner_organization_id: null }, { owner_organization_id: organizationId }] },
    })
  }

  /** Sửa trường riêng — điều kiện chủ sở hữu nằm trong câu lệnh ghi, không ghi được trường của tổ chức khác. */
  async patchOwned(
    organizationId: string,
    key: string,
    patch: { label?: string; requirement?: "OPTIONAL" | "RECOMMENDED" | "REQUIRED"; visibility?: unknown; status?: "ACTIVE" | "INACTIVE" },
    actorUserId: string,
  ): Promise<field_definitions | null> {
    const res = await prisma.field_definitions.updateMany({
      where: { key, owner_organization_id: organizationId },
      data: {
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.requirement !== undefined ? { requirement: patch.requirement } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility as InputJsonValue } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        updated_by: actorUserId,
      },
    })
    return res.count === 0 ? null : prisma.field_definitions.findFirst({ where: { key, owner_organization_id: organizationId } })
  }

  /**
   * Nạp một trường LÕI từ Sổ đăng ký bằng code (3.6). Idempotent, giống
   * `seedAiCapabilities`: `create` khởi tạo đủ; `update` CHỈ đồng bộ lại
   * các thuộc tính KHÔNG thuộc quyền quản trị nền tảng (khoá, thực thể,
   * kiểu dữ liệu, độ nhạy, mức sàn tiền, danh mục gắn theo) — nhãn, mô tả,
   * hiển thị, mức yêu cầu là lớp cấu hình, seed không có quyền ghi đè
   * chỉnh sửa mà quản trị nền tảng đã làm sau lần nạp đầu.
   */
  async upsertCoreDefinition(def: CoreFieldDefinition, actorUserId: string): Promise<void> {
    await prisma.field_definitions.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        entity: def.entity,
        origin: "CORE",
        data_type: def.dataType,
        label: def.label,
        description: def.description ?? null,
        placeholder: def.placeholder ?? null,
        placements: (def.placements ?? null) as unknown as InputJsonValue,
        requirement: def.requirement,
        required_at_stage: def.requiredAtStage ?? null,
        visibility: def.visibility as unknown as InputJsonValue,
        catalog_key: def.catalogKey ?? null,
        sensitivity: def.sensitivity,
        floor_internal_only: def.floorInternalOnly ?? false,
        status: "ACTIVE",
        default_enabled: true,
        created_by: actorUserId,
        updated_by: actorUserId,
      },
      update: {
        entity: def.entity,
        origin: "CORE",
        data_type: def.dataType,
        sensitivity: def.sensitivity,
        floor_internal_only: def.floorInternalOnly ?? false,
        catalog_key: def.catalogKey ?? null,
      },
    })
  }

  async createCustomField(input: UpsertCustomFieldInput): Promise<field_definitions> {
    return prisma.field_definitions.create({
      data: {
        key: input.key,
        entity: input.entity,
        origin: "CUSTOM",
        data_type: input.dataType,
        label: input.label,
        description: input.description ?? null,
        placeholder: input.placeholder ?? null,
        placements: (input.placements ?? null) as InputJsonValue,
        requirement: input.requirement,
        required_at_stage: input.requiredAtStage ?? null,
        visibility: (input.visibility ?? null) as InputJsonValue,
        validation: (input.validation ?? null) as InputJsonValue,
        catalog_key: input.catalogKey ?? null,
        sensitivity: input.sensitivity,
        status: "ACTIVE",
        default_enabled: input.defaultEnabled,
        owner_organization_id: input.ownerOrganizationId ?? null,
        created_by: input.createdBy,
        updated_by: input.createdBy,
      },
    })
  }

  async patchField(
    key: string,
    patch: {
      label?: string
      description?: string | null
      placeholder?: string | null
      requirement?: "OPTIONAL" | "RECOMMENDED" | "REQUIRED"
      visibility?: unknown
      catalogKey?: string | null
      defaultEnabled?: boolean
    },
    actorUserId: string
  ): Promise<field_definitions> {
    return prisma.field_definitions.update({
      where: { key },
      data: {
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.placeholder !== undefined ? { placeholder: patch.placeholder } : {}),
        ...(patch.requirement !== undefined ? { requirement: patch.requirement } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility as InputJsonValue } : {}),
        ...(patch.catalogKey !== undefined ? { catalog_key: patch.catalogKey } : {}),
        ...(patch.defaultEnabled !== undefined ? { default_enabled: patch.defaultEnabled } : {}),
        updated_by: actorUserId,
      },
    })
  }

  async deactivate(key: string, actorUserId: string): Promise<field_definitions> {
    return prisma.field_definitions.update({
      where: { key },
      data: { status: "INACTIVE", updated_by: actorUserId },
    })
  }
}

let _fieldDefinitionRepo: FieldDefinitionRepository | null = null
export function getFieldDefinitionRepository(): FieldDefinitionRepository {
  if (!_fieldDefinitionRepo) _fieldDefinitionRepo = new FieldDefinitionRepository()
  return _fieldDefinitionRepo
}
