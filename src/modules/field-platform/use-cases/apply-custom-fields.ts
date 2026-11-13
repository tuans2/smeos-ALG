import type { TenantContext } from "@/core/tenancy/tenant-context"
import { AppError } from "@/core/http/errors"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { FieldDefinitionRepository, getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { validateCustomFieldsInput, type CustomFieldDefinitionInput } from "../domain/custom-field-schema"
import type { FieldEntity } from "../domain/core-field-registry"
import type { field_definitions } from "../infra/entities"

/**
 * ĐP-3 §6.2 mục 3.9 — Ghi/đọc giá trị trường TỰ TẠO trên một thực thể
 * (đơn điều phối, đối tác…). Đây là hàm DÙNG CHUNG mà use-case tạo/sửa của
 * từng module gọi TRƯỚC KHI ghi cột `custom_fields` — không module nào tự
 * kiểm tra lấy, để logic §16.3 nằm đúng một chỗ.
 *
 * ĐỢT ĐẦU (ĐP-3, 26/09/2026): hàm đã có đủ và test được, nhưng CHƯA được
 * nối vào `create-coordinator-order.ts`/các use-case đơn/đối tác — việc
 * nối dây vào 17 template/form (3.16) và route ghi thật để dòng
 * `custom_fields` có nội dung là phần còn lại của ĐP-3, chưa làm ở đợt
 * này (xem TRANG_THAI.md).
 */
export async function applyCustomFields(
  ctx: TenantContext,
  entity: FieldEntity,
  input: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown>> {
  const definitions = await getFieldDefinitionRepository().listVisibleTo(ctx.organizationId, entity)
  const activeCustom = definitions.filter((d) => d.origin === "CUSTOM" && d.status === "ACTIVE")

  const activeDefs: CustomFieldDefinitionInput[] = activeCustom.map((d) => ({
    key: d.key,
    dataType: d.data_type as CustomFieldDefinitionInput["dataType"],
    requirement: d.requirement,
    status: d.status,
    validation: (d.validation as CustomFieldDefinitionInput["validation"]) ?? null,
    // 3.16: REQUIRED + có requiredAtStage thì KHÔNG bắt buộc ngay ở đây —
    // cổng thật là `stage-transitions.ts` lúc rời đúng bước đó.
    requiredAtStage: d.required_at_stage,
  }))

  const validated = validateCustomFieldsInput(activeDefs, input)

  // Ảnh/tệp (`IMAGE`/`FILE`) phải là `assets` CÙNG tổ chức (§16.3, "kiểm
  // assets cùng tổ chức với kiểu tệp/ảnh").
  const assetFields = activeCustom.filter((d) => d.data_type === "IMAGE" || d.data_type === "FILE")
  if (assetFields.length > 0) {
    const assetRepo = getAssetRepository()
    for (const def of assetFields) {
      const value = validated[def.key]
      if (typeof value !== "string") continue
      const asset = await assetRepo.findById(ctx, value)
      if (!asset) {
        throw new AppError("UNPROCESSABLE_ENTITY", `Tệp/ảnh của trường ${def.key} không thuộc tổ chức này`, {
          field: def.key,
          assetId: value,
        })
      }
    }
  }

  return validated
}

/**
 * Trộn giá trị mới vào `custom_fields` hiện có — KHÔNG thay nguyên khối,
 * để giá trị của trường đã bị TẮT (không còn trong `activeCustom`) không
 * bị xoá mất (§16.3 "giá trị cũ giữ nguyên, vẫn xem được trong lịch sử").
 */
export function mergeCustomFields(
  existing: Record<string, unknown> | null | undefined,
  validated: Record<string, unknown>
): Record<string, unknown> {
  return { ...(existing ?? {}), ...validated }
}

export function listActiveCustomFieldDefinitions(
  definitions: readonly field_definitions[]
): field_definitions[] {
  return definitions.filter((d) => d.origin === "CUSTOM" && d.status === "ACTIVE")
}
