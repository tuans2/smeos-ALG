import type { DbClient } from "@/modules/organization/infra/db-client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { TemplateFamily } from "@/modules/templates/domain/template-override-rules"
import type {
  ITemplateOverrideRepository,
  TemplateOverrideRecord,
} from "@/modules/templates/domain/repositories/template-override-repository.interface"

export class TemplateOverrideRepository implements ITemplateOverrideRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async findByKey(ctx: TenantContext, templateKey: string, fieldKey: string) {
    return this.db.template_overrides.findFirst({
      where: scopedWhere(ctx, { template_key: templateKey, field_key: fieldKey }),
    })
  }

  /** Toàn bộ ghi đè của một template — dùng để nạp vào TenantSalesDefaults. */
  async listForTemplate(ctx: TenantContext, templateKey: string) {
    return this.db.template_overrides.findMany({
      where: scopedWhere(ctx, { template_key: templateKey }),
      orderBy: { field_key: "asc" },
    })
  }

  /**
   * Tạo mới hoặc cập nhật, theo đúng khoá duy nhất
   * `@@unique([organization_id, template_key, field_key])` — cùng khuôn
   * `AiPolicyRepository.upsert()`.
   */
  async upsert(
    ctx: TenantContext,
    input: { templateFamily: TemplateFamily; templateKey: string; fieldKey: string; value: string }
  ) {
    const fields = {
      template_family: input.templateFamily,
      value: input.value,
      updated_by: ctx.userId,
    }
    return this.db.template_overrides.upsert({
      where: {
        organization_id_template_key_field_key: {
          organization_id: ctx.organizationId,
          template_key: input.templateKey,
          field_key: input.fieldKey,
        },
      },
      create: scopedData(ctx, {
        template_key: input.templateKey,
        field_key: input.fieldKey,
        ...fields,
      }),
      update: fields,
    })
  }

  /**
   * Xoá ghi đè — trở về mặc định hệ thống. `deleteMany` với điều kiện tổ
   * chức (không `delete` theo id thẳng) — cùng lý do `OccasionRepository.update`
   * dùng `updateMany`: tránh sửa/xoá nhầm bản ghi của tổ chức khác.
   */
  async remove(ctx: TenantContext, templateKey: string, fieldKey: string): Promise<boolean> {
    const result = await this.db.template_overrides.deleteMany({
      where: scopedWhere(ctx, { template_key: templateKey, field_key: fieldKey }),
    })
    return result.count > 0
  }
}

let templateOverrideRepoInstance: ITemplateOverrideRepository | null = null

export function getTemplateOverrideRepository(db?: DbClient): ITemplateOverrideRepository {
  if (db) return new TemplateOverrideRepository(db)
  if (!templateOverrideRepoInstance) {
    templateOverrideRepoInstance = new TemplateOverrideRepository()
  }
  return templateOverrideRepoInstance
}

