import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { FieldDefinitionRepository, getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { ALL_CORE_FIELD_DEFINITIONS } from "../domain/all-core-fields"
import { findByKey, type FieldAudience } from "../domain/core-field-registry"
import { AppError } from "@/core/http/errors"
import { mapFieldDefinitionToApiView, type FieldDefinitionApiView } from "../infra/row-mappers"

export interface UpdateFieldConfigInput {
  key: string
  label?: string | undefined
  description?: string | null | undefined
  placeholder?: string | null | undefined
  requirement?: "OPTIONAL" | "RECOMMENDED" | "REQUIRED" | undefined
  visibility?: Partial<Record<FieldAudience, boolean | undefined>> | undefined
  catalogKey?: string | null | undefined
  defaultEnabled?: boolean | undefined
}

const REQUIREMENT_RANK: Record<"OPTIONAL" | "RECOMMENDED" | "REQUIRED", number> = { OPTIONAL: 0, RECOMMENDED: 1, REQUIRED: 2 }

/**
 * `PATCH /api/v1/platform/fields` (`N12`, 3.7). Sửa cấu hình PLATFORM-WIDE
 * của một trường đã xây (Đặc tả trường §16.2 "Lớp cấu hình"). Ghi đè THEO
 * TỔ CHỨC là một API khác (`set-org-override.ts`) — hàm này đổi giá trị
 * mặc định chung cho mọi tổ chức.
 *
 * Mức sàn #2 (không hạ mức yêu cầu dưới lớp mã) chặn Ở ĐÂY cho trường LÕI,
 * tra theo Sổ đăng ký bằng code — trường TỰ TẠO không có sàn từ code nên
 * bỏ qua kiểm tra này.
 */
export async function updateFieldConfig(
  pctx: PlatformContext,
  input: UpdateFieldConfigInput
): Promise<FieldDefinitionApiView> {
  requirePlatformCapability(pctx, "N12")

  const repo = getFieldDefinitionRepository()
  const current = await repo.findByKey(input.key)
  if (!current) throw new AppError("NOT_FOUND", `Không tìm thấy trường ${input.key}`, { key: input.key })

  if (current.origin === "CORE" && input.requirement) {
    const floor = findByKey(ALL_CORE_FIELD_DEFINITIONS, input.key)
    if (floor && REQUIREMENT_RANK[input.requirement] < REQUIREMENT_RANK[floor.requirement]) {
      throw new AppError(
        "VALIDATION_FAILED",
        `Không hạ được mức yêu cầu của ${input.key} xuống dưới mức sàn ${floor.requirement}`,
        { key: input.key, floor: floor.requirement, requested: input.requirement }
      )
    }
  }

  const before = current
  const updated = await repo.patchField(
    input.key,
    {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.placeholder !== undefined ? { placeholder: input.placeholder } : {}),
      ...(input.requirement !== undefined ? { requirement: input.requirement } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.catalogKey !== undefined ? { catalogKey: input.catalogKey } : {}),
      ...(input.defaultEnabled !== undefined ? { defaultEnabled: input.defaultEnabled } : {}),
    },
    pctx.userId
  )

  await recordPlatformAuditLog(pctx, {
    action: "platform.field.update",
    entityType: "field_definitions",
    entityId: input.key,
    before,
    after: updated,
  })

  return mapFieldDefinitionToApiView(updated)
}
