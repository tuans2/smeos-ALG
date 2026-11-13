import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { AppError } from "@/core/http/errors"
import { FieldDefinitionRepository, getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { mapFieldDefinitionToApiView, type FieldDefinitionApiView } from "../infra/row-mappers"

/**
 * `POST /api/v1/platform/fields/:key/deactivate` (`N12`, 3.7/3.13). Chỉ
 * TẮT — không xoá cứng (§16.3 "Chỉ tắt, giá trị cũ giữ nguyên"). Trường
 * lõi có `requirement = REQUIRED` không tắt được (mức sàn #2 áp cả ở đây,
 * vì tắt một trường bắt buộc coi như hạ mức yêu cầu xuống 0).
 */
export async function deactivateField(pctx: PlatformContext, key: string): Promise<FieldDefinitionApiView> {
  requirePlatformCapability(pctx, "N12")

  const repo = getFieldDefinitionRepository()
  const current = await repo.findByKey(key)
  if (!current) throw new AppError("NOT_FOUND", `Không tìm thấy trường ${key}`, { key })
  if (current.origin === "CORE" && current.requirement === "REQUIRED") {
    throw new AppError("VALIDATION_FAILED", `Không tắt được trường bắt buộc ${key}`, { key })
  }

  const updated = await repo.deactivate(key, pctx.userId)

  await recordPlatformAuditLog(pctx, {
    action: "platform.field.deactivate",
    entityType: "field_definitions",
    entityId: key,
    before: current,
    after: updated,
  })

  return mapFieldDefinitionToApiView(updated)
}
