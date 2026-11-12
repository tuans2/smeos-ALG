import { jsonResponse } from "@/core/http/response"
import { internalCardActionBody } from "@/app/api/v1/_contracts/requests-chat"
import { requireCapability } from "@/core/rbac/capabilities"
import { INTERNAL_CHAT_CAPABILITY } from "@/modules/internal-chat/domain/chat-capabilities"
import { validationFailed } from "@/core/http/errors"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { HandleCardActionUseCase } from "@/modules/internal-chat/use-cases/handle-card-action"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: INTERNAL_CHAT_CAPABILITY.use },
  handler: async ({ request, ctx, resolved, params }) => {
    requireCapability(ctx, INTERNAL_CHAT_CAPABILITY.fulfilOrder)
    const { id: messageId } = params as { id: string }
    const body = await request.json().catch(() => null)
    const parsed = internalCardActionBody.safeParse(body)

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
  },
})
