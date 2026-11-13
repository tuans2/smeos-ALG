import type { TenantContext } from "@/core/tenancy"
import { notFound, validationFailed } from "@/core/http/errors"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import {
  type UiBrandSettings,
  uiBrandSettingsSchema,
  validateBrandContrast,
} from "@/modules/organization/domain/brand-config"

/**
 * Cập nhật cấu hình nhận diện thương hiệu tổ chức (`ui_brand`) — ADR-011 F1-04.
 * Kiểm tra tỷ lệ tương phản WCAG 2.2 AA (>= 4.5:1). Nếu không đạt, ném validationFailed (422).
 */
export async function updateOrganizationBrand(
  ctx: TenantContext,
  input: unknown,
  repository = new OrganizationRepository()
): Promise<UiBrandSettings> {
  const parsed = uiBrandSettingsSchema.safeParse(input)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const brandData = parsed.data

  // Kiểm tra tương phản màu chính với nền trắng tiêu chuẩn
  const contrastCheck = validateBrandContrast(brandData.primary)
  if (!contrastCheck.valid) {
    throw validationFailed({
      primary: contrastCheck.error ?? "Màu chính không đạt tỷ lệ tương phản tối thiểu 4.5:1",
    })
  }

  const current = await repository.current(ctx)
  if (!current) throw notFound()

  const currentSettings = (current.settings as Record<string, unknown> | null) ?? {}
  const mergedSettings = {
    ...currentSettings,
    ui_brand: brandData,
  }

  const updated = await repository.update(ctx, {
    settings: mergedSettings,
  })
  if (!updated) throw notFound()

  return brandData
}

