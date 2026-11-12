import { z } from "zod"
import { jsonResponse } from "@/core/http/response"
import { validationFailed, notFound } from "@/core/http/errors"
import { getCatalogLinkBySlug } from "@/modules/catalog-links/use-cases/get-catalog-link"
import { updateCatalogLink } from "@/modules/catalog-links/use-cases/update-catalog-link"
import type { CatalogLinkFilters } from "@/modules/catalog-links/domain/catalog-link-rules"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /catalog-links/:slug` — CÔNG KHAI có chủ đích (khách quét QR, không
 * đăng nhập). Soát 18/09 (RS-8) xác nhận đây không phải lỗ hổng.
 *
 * `PATCH /catalog-links/:slug` — soát 18/09 (nhân lúc làm RS-3) phát hiện
 * handler này trước đây nằm NHẦM ở `[slug]/revoke/route.ts`, nên thật ra
 * chạy ở `PATCH /catalog-links/:slug/revoke` — sai đường dẫn, không ai gọi
 * tới. Dời về đúng chỗ; `POST /catalog-links/:slug/revoke` (thu hồi) không
 * đổi.
 */
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const GET = defineRoute({
  auth: { kind: "public" },
  // Trang công khai không phiên — chặn quét slug theo IP như catalog công khai (PO 12/11/2026)
  rateLimit: { scope: "catalog-link-view", limit: 60, windowMs: 60_000, per: "ip" },
  handler: async ({ params }) => {
      const { slug } = params as { slug: string }
      const link = await getCatalogLinkBySlug(slug)
      if (!link) throw notFound()
      return jsonResponse(link)
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ request, ctx, params }) => {
      const { slug } = params as { slug: string }
      const parsed = patchSchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

      const updateInput: { name?: string; description?: string | null; filters?: CatalogLinkFilters | null } = {}
      if (parsed.data.name !== undefined) updateInput.name = parsed.data.name
      if (parsed.data.description !== undefined) updateInput.description = parsed.data.description
      if (parsed.data.filters !== undefined) updateInput.filters = parsed.data.filters

      const link = await updateCatalogLink(ctx, slug, updateInput)
      return jsonResponse(link)
  },
})
