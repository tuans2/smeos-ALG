/**
 * Use-case: Get Conversation Messages.
 */

import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ChatMessage } from "../domain/chat-types"
import { ChatRepository, getChatRepository } from "../infra/chat-repository"

export async function getConversationMessages(
  ctx: TenantContext,
  conversationId: string,
  limit = 100,
  repo: ChatRepository = getChatRepository()
): Promise<ChatMessage[]> {
  const conversation = await repo.getConversation(ctx, conversationId)
  if (!conversation) {
    throw notFound()
  }

  return repo.getMessages(ctx, conversationId, limit)
}
