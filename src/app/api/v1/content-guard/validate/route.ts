import { handle, jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { BrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"
import {
  checkFlowerContent,
  sanitizeFlowerContent,
} from "@/core/ai/domain/flower-content-guard"
import { validateContentBody } from "@/app/api/v1/_contracts/requests-admin"

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)

  const parsed = validateContentBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  // Tải brand_profile của tổ chức để lấy forbidden_styles
  const brandRepo = new BrandProfileRepository()
  const brandProfile = await brandRepo.current(ctx)
  let forbiddenStyles: string | null = null
  if (brandProfile?.forbidden_styles) {
    if (typeof brandProfile.forbidden_styles === "string") {
      forbiddenStyles = brandProfile.forbidden_styles
    } else if (Array.isArray(brandProfile.forbidden_styles)) {
      forbiddenStyles = brandProfile.forbidden_styles.join(", ")
    } else {
      forbiddenStyles = JSON.stringify(brandProfile.forbidden_styles)
    }
  }

  const check = checkFlowerContent(parsed.data.text, {
    brandForbiddenStyles: forbiddenStyles,
  })

  let sanitized: string | undefined
  if (parsed.data.autoSanitize) {
    const sanitizeRes = sanitizeFlowerContent(parsed.data.text, {
      brandForbiddenStyles: forbiddenStyles,
    })
    sanitized = sanitizeRes.sanitizedText
  }

  return jsonResponse({
    valid: check.isValid,
    hasWarnings: check.hasWarnings,
    hardBlocks: check.hardBlocks,
    warnings: check.warnings,
    sanitizedText: sanitized,
    forbiddenStylesApplied: forbiddenStyles,
  })
})
