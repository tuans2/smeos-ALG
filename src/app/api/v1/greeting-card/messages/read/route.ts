import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { markMessagesRead } from "@/modules/greeting-card/use-cases/internal-messages"
import { messagesReadBody } from "@/app/api/v1/_contracts/requests-greeting"

/** POST /api/v1/greeting-card/messages/read — đánh dấu đã đọc (đồng bộ mọi thiết bị). */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderRead)
  const parsed = messagesReadBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await markMessagesRead(ctx, parsed.data.messageIds) })
})
