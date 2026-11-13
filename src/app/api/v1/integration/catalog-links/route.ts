import { z } from "zod"

import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { jsonResponse } from "@/core/http/response"
import { withoutSunsetFields } from "@/modules/integration/domain/integration-field-sunset"
import {
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { listCatalogLinks } from "@/modules/catalog-links/use-cases/list-catalog-links"
import { createCatalogLink } from "@/modules/catalog-links/use-cases/create-catalog-link"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET`/`POST /integration/catalog-links` (RS-3 18/09) — Core làm chủ DUY
 * NHẤT bảng `catalog_links`; `LocalBudd` không còn bảng riêng, gọi sang đây
 * thay vì ghi thẳng CSDL của nó (`QUYET_DINH_RS_18_09.md` RS-3, quyết định
 * của anh Tony).
 *
 * Cùng khuôn `/integration/jobs`: nhánh SSO mang năng lực THẬT của người
 * đang thao tác trên `LocalBudd`, nên vẫn gác `J1` như route phiên
 * (`/api/v1/catalog-links`) — Core không nới quyền chỉ vì lời gọi đến từ một
 * app khác. Nhánh token (nền, không người dùng) có `capabilities` rỗng nên
 * `requireCapability` tự chặn — CHƯA hỗ trợ quản lý catalog từ tác vụ nền.
 */
const querySchema = z.object({
  // `z.coerce.boolean()` đọc chuỗi "false" thành true (PO 07/11/2026 cho sửa) — stringbool nhận true/false/1/0/yes/no
  include_revoked: z.stringbool().optional(),
})

const createSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const GET = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ request, ic }) => {
    const ctx = await toTenantContext(ic)
    requireCapability(ctx, "J1")

    const url = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const links = await listCatalogLinks(ctx, { includeRevoked: parsed.data.include_revoked ?? false })
    // Trường nội bộ tự bỏ từ 09/02/2027 (ARC-024, `integration-field-sunset.ts`)
    const now = new Date()
    return jsonResponse({ data: links.map((link) => withoutSunsetFields("catalogLink", link, now)) })
  },
})

export const POST = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ request, ic }) => {
    const ctx = await toTenantContext(ic)
    requireCapability(ctx, "J1")

    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const link = await createCatalogLink(ctx, {
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      filters: parsed.data.filters ?? null,
    })

    return jsonResponse(withoutSunsetFields("catalogLink", link, new Date()), { status: 201 })
  },
})
