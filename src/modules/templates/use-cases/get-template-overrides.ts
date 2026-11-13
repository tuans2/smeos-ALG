import type { TenantContext } from "@/core/tenancy"
import type { ITemplateOverrideRepository } from "../domain/repositories/template-override-repository.interface"
import { getTemplateOverrideRepository } from "../infra/template-override-repository"

/** `GET /template-overrides?template_key=...` (nợ #99). */
export function getTemplateOverrides(
  ctx: TenantContext,
  templateKey: string,
  repo: ITemplateOverrideRepository = getTemplateOverrideRepository()
) {
  return repo.listForTemplate(ctx, templateKey)
}

