/**
 * GET|POST /api/v1/short-links — link/QR động có thống kê (công cụ 12, 13, 25).
 * J1: Tạo catalog (cùng nhóm kênh bán với link catalog).
 */

import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { createShortLinkBody } from "@/app/api/v1/_contracts/requests-profile"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createShortLink, listShortLinks } from "@/modules/acquisition/use-cases/manage-short-links"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "J1")
  const url = new URL(request.url)
  const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 20
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw validationFailed({ limit: "Phải là số nguyên từ 1 đến 100" })
  }
  return jsonResponse(await listShortLinks(ctx, {
    kind: url.searchParams.get("kind") ?? undefined,
    limit,
    cursor: url.searchParams.get("cursor") ?? undefined,
  }))
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "J1")
  const parsed = createShortLinkBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ body: "Dữ liệu không hợp lệ" })
  const { kind, ...input } = parsed.data
  return jsonResponse(await createShortLink(ctx, kind, input), { status: 201 })
})
