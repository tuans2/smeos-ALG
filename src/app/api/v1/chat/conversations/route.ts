/**
 * GET|POST /api/v1/chat/conversations
 * T1: Xem danh sách hội thoại
 * T2: Tạo hội thoại mới
 */

import { MAX_PAGE_LIMIT, parseIntParam } from "@/core/http/pagination"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { listConversations } from "@/modules/chat-assistant/use-cases/list-conversations"
import { createConversation } from "@/modules/chat-assistant/use-cases/create-conversation"
import type { ChatChannel } from "@/modules/chat-assistant/domain/chat-types"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "T1")

  const url = new URL(request.url)
  const status = url.searchParams.get("status") || "ACTIVE"
  const limit = parseIntParam(url.searchParams.get("limit"), { field: "limit", fallback: 50, min: 1, max: MAX_PAGE_LIMIT })

  const items = await listConversations(ctx, status, limit)
  return jsonResponse({ items, count: items.length })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "T2")

  const body = await request.json()
  const conversation = await createConversation(
    ctx,
    body.title || "Hội thoại tư vấn hoa",
    (body.channel as ChatChannel) || "WEB_WIDGET",
    body.customerId || undefined
  )

  return jsonResponse({ conversation }, { status: 201 })
})
