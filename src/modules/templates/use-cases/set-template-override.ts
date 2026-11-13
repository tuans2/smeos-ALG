import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { ITemplateOverrideRepository } from "../domain/repositories/template-override-repository.interface"
import { getTemplateOverrideRepository } from "../infra/template-override-repository"
import {
  validateSetTemplateOverrideInput,
  type SetTemplateOverrideInput,
} from "@/modules/templates/domain/template-override-rules"

/** `PUT /template-overrides` (nợ #99 — tạo mới hoặc cập nhật một field ghi đè). */
export async function setTemplateOverride(
  ctx: TenantContext,
  input: SetTemplateOverrideInput,
  repo: ITemplateOverrideRepository = getTemplateOverrideRepository()
) {
  const validated = validateSetTemplateOverrideInput(input)
  if ("field" in validated) {
    throw validationFailed({ [validated.field]: validated.message })
  }
  return repo.upsert(ctx, validated)
}

