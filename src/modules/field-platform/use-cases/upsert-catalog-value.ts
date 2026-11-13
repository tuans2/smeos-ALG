import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { AppError } from "@/core/http/errors"
import { FieldCatalogRepository, getFieldCatalogRepository } from "../infra/field-catalog-repository"
import { isKnownBehaviorCode } from "../domain/behaviors"
import { mapCatalogValueToApiView, type CatalogValueApiView } from "../infra/row-mappers"

export interface UpsertCatalogValueInput {
  catalogKey: string
  code: string
  label: string
  description?: string | undefined
  sortOrder?: number | undefined
  behavior?: string | undefined
  params?: Record<string, unknown> | undefined
}

/**
 * `POST/PATCH /api/v1/platform/catalogs/:key/values` (`N12`, 3.7/3.13).
 * Danh mục loại **CÓ HÀNH VI** bắt buộc `behavior` phải là mã có thật
 * trong `behaviors.ts` (Đặc tả trường §16.2 "CÓ HÀNH VI" — mã sinh, không
 * gõ tay); danh mục **MỞ** không có `behavior_kind` thì bỏ qua kiểm tra
 * này; danh mục **ĐÓNG** không cho thêm giá trị mới (chỉ sửa nhãn qua
 * `setCatalogValueOverride`, không đi qua hàm tạo mới này).
 */
export async function upsertCatalogValue(
  pctx: PlatformContext,
  input: UpsertCatalogValueInput
): Promise<CatalogValueApiView> {
  requirePlatformCapability(pctx, "N12")

  const repo = getFieldCatalogRepository()
  const catalogs = await repo.listCatalogs()
  const catalog = catalogs.find((c) => c.key === input.catalogKey)
  if (!catalog) throw new AppError("NOT_FOUND", `Không tìm thấy danh mục ${input.catalogKey}`, { key: input.catalogKey })

  if (catalog.governance === "CLOSED") {
    throw new AppError("VALIDATION_FAILED", `Danh mục ${input.catalogKey} là loại ĐÓNG — không thêm giá trị mới`, {
      key: input.catalogKey,
    })
  }
  if (catalog.governance === "BEHAVIOR") {
    if (!input.behavior || !catalog.behavior_kind || !isKnownBehaviorCode(catalog.behavior_kind, input.behavior)) {
      throw new AppError(
        "VALIDATION_FAILED",
        `Danh mục ${input.catalogKey} là loại CÓ HÀNH VI — phải chọn một hành vi có thật trong code`,
        { key: input.catalogKey, behaviorKind: catalog.behavior_kind, behavior: input.behavior }
      )
    }
  }

  const existingValues = await repo.listValues(input.catalogKey)
  const existing = existingValues.find((v) => v.code === input.code)
  if (existing) {
    throw new AppError("CONFLICT", `Mã giá trị ${input.code} đã tồn tại — mã không đổi được, chỉ sửa nhãn`, {
      code: input.code,
    })
  }

  const created = await repo.createCatalogValue({
    catalogKey: input.catalogKey,
    code: input.code,
    label: input.label,
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? existingValues.length,
    behavior: catalog.governance === "BEHAVIOR" ? (input.behavior ?? null) : null,
    params: input.params ?? null,
  })

  await recordPlatformAuditLog(pctx, {
    action: "platform.catalog_value.create",
    entityType: "field_catalog_values",
    entityId: `${input.catalogKey}:${input.code}`,
    before: null,
    after: created,
  })

  return mapCatalogValueToApiView(created)
}
