import { handle, jsonResponse } from "@/core/http/response"
import { internalCardActionBody } from "@/app/api/v1/_contracts/requests-chat"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { HandleCardActionUseCase } from "@/modules/internal-chat/use-cases/handle-card-action"

export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  const { id: messageId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = internalCardActionBody.safeParse(body)

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
    throw validationFailed({ reason: errorDetails })
  }

  const chatRepo = getInternalChatRepository()
  const useCase = new HandleCardActionUseCase(chatRepo)

  const updatedMessage = await useCase.execute({
    messageId,
    userId: ctx.userId,
    userOrgId: ctx.organizationId,
    action: parsed.data.action,
    rejectedReason: parsed.data.rejectedReason ?? undefined,
  })

  return jsonResponse({
    success: true,
    data: updatedMessage,
  })
})
