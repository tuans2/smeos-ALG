import { z } from "zod"

/**
 * Lược đồ yêu cầu nhóm cuối: `/api/v1/catalog-links/*`, `/api/v1/product-intelligence/*`, `/api/v1/internal/*` — OpenAPI
 * nội bộ, PO 07/11/2026. `catalog-links` nằm trong vùng Catalog đóng băng (PO 01/11/2026): route giữ lược đồ của nó,
 * đây là BẢN SAO kèm test đối chiếu `tests/unit/catalog-links/catalog-links-contract.test.ts` (cùng mẫu → cùng kết luận).
 */

// Bản sao catalog-links/route.ts
export const catalogLinksQuery = z.object({
  include_revoked: z.coerce.boolean().optional(),
})
export const createCatalogLinkBody = z.object({
  slug: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})

// Bản sao catalog-links/[slug]/route.ts
export const updateCatalogLinkBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})
