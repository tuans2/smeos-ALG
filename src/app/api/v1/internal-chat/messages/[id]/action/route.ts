import { z } from "zod"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { INTERNAL_CHAT_CAPABILITY } from "@/modules/internal-chat/domain/chat-capabilities"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { CARD_REJECT_REASON_MAX_LENGTH } from "@/modules/internal-chat/domain/chat-limits"
import { HandleCardActionUseCase } from "@/modules/internal-chat/use-cases/handle-card-action"

const actionSchema = z.object({
  action: z.enum(["ACCEPT_ORDER", "REJECT_ORDER"]),
  rejectedReason: z.string().max(CARD_REJECT_REASON_MAX_LENGTH, `Lý do tối đa ${CARD_REJECT_REASON_MAX_LENGTH} ký tự`).optional(),
})

export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { resolved, ctx } = await requireTenantContext(request)
  requireCapability(ctx, INTERNAL_CHAT_CAPABILITY.use)
  requireCapability(ctx, INTERNAL_CHAT_CAPABILITY.fulfilOrder)
  const { id: messageId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(body)

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
    throw validationFailed({ reason: errorDetails })
  }

  const useCase = new HandleCardActionUseCase(getInternalChatRepository(), getChatLinkPolicy())

  const updatedMessage = await useCase.execute({
    messageId,
    userId: ctx.userId,
    userOrgId: ctx.organizationId,
    userBranchId: ctx.branchId,
    userRole: resolved.membership?.role_id ?? "member",
    action: parsed.data.action,
    rejectedReason: parsed.data.rejectedReason ?? undefined,
  })

  return jsonResponse({
    success: true,
    data: updatedMessage,
  })
})
