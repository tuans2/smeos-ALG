/**
 * Use-case: Create Conversation.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ChatChannel, ChatConversation } from "../domain/chat-types"
import { ChatRepository, getChatRepository } from "../infra/chat-repository"

export async function createConversation(
  ctx: TenantContext,
  title = "Hội thoại tư vấn hoa",
  channel: ChatChannel = "WEB_WIDGET",
  customerId?: string | undefined,
  repo: ChatRepository = getChatRepository()
): Promise<ChatConversation> {
  return repo.createConversation(ctx, title, channel, customerId)
}
