import type { InputJsonValue, field_catalog_values, field_catalogs } from "./entities"
import { prisma } from "@/core/tenancy/infra/prisma"

export interface CatalogSeedInput {
  key: string
  label: string
  governance: "OPEN" | "BEHAVIOR" | "CLOSED"
  behaviorKind?: string | null
}

export interface CatalogValueSeedInput {
  catalogKey: string
  code: string
  label: string
  description?: string | null
  sortOrder: number
  behavior?: string | null
  params?: Record<string, unknown> | null
}

export class FieldCatalogRepository {
  listCatalogs(): Promise<field_catalogs[]> {
    return prisma.field_catalogs.findMany({ orderBy: { key: "asc" } })
  }

  listValues(catalogKey: string): Promise<field_catalog_values[]> {
    return prisma.field_catalog_values.findMany({
      where: { catalog_key: catalogKey },
      orderBy: { sort_order: "asc" },
    })
  }

  /** Idempotent — dùng ở `scripts/nap-danh-muc-truong.ts` (3.6). */
  async upsertCatalog(input: CatalogSeedInput): Promise<void> {
    await prisma.field_catalogs.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        label: input.label,
        governance: input.governance,
        behavior_kind: input.behaviorKind ?? null,
      },
      // Nhãn danh mục có thể đã được quản trị nền tảng sửa — reseed không đụng.
      update: { governance: input.governance, behavior_kind: input.behaviorKind ?? null },
    })
  }

  /** Idempotent — KHÔNG đổi `label`/`is_active` nếu dòng đã tồn tại (đã có thể bị sửa). */
  async upsertCatalogValue(input: CatalogValueSeedInput): Promise<void> {
    await prisma.field_catalog_values.upsert({
      where: { catalog_key_code: { catalog_key: input.catalogKey, code: input.code } },
      create: {
        catalog_key: input.catalogKey,
        code: input.code,
        label: input.label,
        description: input.description ?? null,
        sort_order: input.sortOrder,
        is_active: true,
        behavior: input.behavior ?? null,
        params: (input.params ?? null) as InputJsonValue,
      },
      update: {
        // Mã hành vi là lớp mã — reseed được phép đồng bộ nếu code đổi.
        behavior: input.behavior ?? null,
      },
    })
  }

  async setCatalogValueOverride(
    catalogKey: string,
    code: string,
    patch: { label?: string; isActive?: boolean; params?: Record<string, unknown> }
  ): Promise<field_catalog_values> {
    return prisma.field_catalog_values.update({
      where: { catalog_key_code: { catalog_key: catalogKey, code } },
      data: {
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        ...(patch.params !== undefined ? { params: patch.params as InputJsonValue } : {}),
      },
    })
  }

  async createCatalogValue(input: CatalogValueSeedInput): Promise<field_catalog_values> {
    return prisma.field_catalog_values.create({
      data: {
        catalog_key: input.catalogKey,
        code: input.code,
        label: input.label,
        description: input.description ?? null,
        sort_order: input.sortOrder,
        is_active: true,
        behavior: input.behavior ?? null,
        params: (input.params ?? null) as InputJsonValue,
      },
    })
  }
}

let _fieldCatalogRepo: FieldCatalogRepository | null = null
export function getFieldCatalogRepository(): FieldCatalogRepository {
  if (!_fieldCatalogRepo) _fieldCatalogRepo = new FieldCatalogRepository()
  return _fieldCatalogRepo
}
