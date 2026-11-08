import { z } from "zod"

import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getBrandProfile } from "@/modules/profiles/use-cases/get-brand-profile"
import { putBrandProfile } from "@/modules/profiles/use-cases/put-brand-profile"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  return jsonResponse(await getBrandProfile(ctx))
})

const jsonField = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown()), z.string()])
  .nullable()
  .optional()
const color = z.string().nullable().optional()

const putSchema = z.object({
  primary_color: color,
  secondary_color: color,
  accent_color: color,
  background_color: color,
  text_color: color,
  font_heading: z.string().nullable().optional(),
  font_body: z.string().nullable().optional(),
  logo_asset_id: z.string().nullable().optional(),
  tone_of_voice: z.string().nullable().optional(),
  hashtags: jsonField,
  cta_templates: jsonField,
  default_offers: jsonField,
  forbidden_styles: jsonField,
  brand_assets: jsonField,
  /** Câu khẩu hiệu — bỏ trống (không gửi) thì giữ giá trị đang lưu */
  slogan: z.string().trim().max(120).nullable().optional(),
})

export const PUT = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")

  const parsed = putSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  return jsonResponse(await putBrandProfile(ctx, parsed.data))
})
