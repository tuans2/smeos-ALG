import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { FieldDefinitionRepository, getFieldDefinitionRepository } from "../infra/field-definition-repository"
import { mapFieldDefinitionToApiView, type FieldDefinitionApiView } from "../infra/row-mappers"

/** `GET /api/v1/platform/fields` (`N12`, ĐP-3 3.13). */
export async function listFields(pctx: PlatformContext, entity?: string): Promise<FieldDefinitionApiView[]> {
  requirePlatformCapability(pctx, "N12")
  const rows = await getFieldDefinitionRepository().list(entity)
  return rows.map(mapFieldDefinitionToApiView)
}
