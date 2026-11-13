import type { TenantContext } from "@/core/tenancy"
import type { TemplateFamily } from "../template-override-rules"

export interface TemplateOverrideRecord {
  id: string
  organization_id: string
  template_family: string
  template_key: string
  field_key: string
  value: string
  updated_by: string
  created_at: Date
  updated_at: Date
}

export interface ITemplateOverrideRepository {
  findByKey(ctx: TenantContext, templateKey: string, fieldKey: string): Promise<TemplateOverrideRecord | null>
  listForTemplate(ctx: TenantContext, templateKey: string): Promise<TemplateOverrideRecord[]>
  upsert(
    ctx: TenantContext,
    input: { templateFamily: TemplateFamily; templateKey: string; fieldKey: string; value: string }
  ): Promise<TemplateOverrideRecord>
  remove(ctx: TenantContext, templateKey: string, fieldKey: string): Promise<boolean>
}
