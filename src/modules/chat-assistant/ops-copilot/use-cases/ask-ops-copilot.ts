/**
 * Use-case: Ask Ops Copilot.
 * Xử lý yêu cầu hướng dẫn và trợ giúp vận hành SaaS cho nhân viên cửa hàng.
 * Đảm bảo: Chỉ tiếp nhận qua TenantContext đã xác thực, không bị rò rỉ hay lẫn với bán hoa.
 */

import { validationFailed, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ChatMessage } from "../../domain/chat-types"
import { ChatRepository } from "../../infra/chat-repository"
import { OpsCopilotEngine } from "../domain/ops-copilot-engine"

import type { OpsResponseStyle } from "../knowledge-base"

export interface AskOpsCopilotInput {
  conversationId: string
  query: string
  userRole?: string | undefined
  requestedStyle?: OpsResponseStyle | undefined
}

export interface AskOpsCopilotResult {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}

export async function askOpsCopilot(
  ctx: TenantContext,
  input: AskOpsCopilotInput,
  deps = {
    repo: new ChatRepository(),
    engine: new OpsCopilotEngine(),
  }
): Promise<AskOpsCopilotResult> {
  const query = input.query.trim()
  if (!query) {
    throw validationFailed({ query: "Nội dung câu hỏi không được để trống" })
  }

  const conversation = await deps.repo.getConversation(ctx, input.conversationId)
  if (!conversation) {
    throw notFound()
  }

  // 1. Trích xuất ngữ cảnh hội thoại đa lượt trước khi lưu tin nhắn mới
  const priorMessages = await deps.repo.getMessages(ctx, input.conversationId, 5)
  const lastAssistant = priorMessages.slice().reverse().find((m) => m.senderType === "ASSISTANT")
  const context = {
    lastRoute: lastAssistant?.metadata?.targetRoute,
    lastActionSteps: lastAssistant?.metadata?.actionSteps,
    lastTopicNodeId: (lastAssistant?.metadata as Record<string, unknown> | undefined)?.matchedKnowledgeId as string | undefined,
    recentMessages: priorMessages.map((m) => ({
      sender: m.senderType === "USER" ? "USER" as const : "ASSISTANT" as const,
      content: m.content,
      targetRoute: m.metadata?.targetRoute,
      matchedKnowledgeId: (m.metadata as Record<string, unknown> | undefined)?.matchedKnowledgeId as string | undefined,
    })),
  }

  // 2. Lưu tin nhắn người dùng
  const userMessage = await deps.repo.addMessage(
    ctx,
    input.conversationId,
    "USER",
    query
  )

  // 3. Xử lý tri thức vận hành qua Ops Copilot Engine (Multi-Agent Pipeline + LLM Synthesis)
  const copilotResult = await deps.engine.processQuery({
    query,
    userRole: input.userRole,
    requestedStyle: input.requestedStyle,
    context,
  })

  // 4. Lưu tin nhắn phản hồi của Ops Copilot kèm metadata
  const assistantMessage = await deps.repo.addMessage(
    ctx,
    input.conversationId,
    "ASSISTANT",
    copilotResult.replyText,
    {
      userIntent: "SAAS_HELP",
      targetRoute: copilotResult.targetRoute,
      actionLabel: copilotResult.actionLabel,
      actionSteps: copilotResult.actionSteps,
      matchedKnowledgeId: copilotResult.matchedKnowledgeId,
      confidenceScore: copilotResult.confidenceScore,
      isUnresolvedQuery: copilotResult.isUnresolvedQuery,
    }
  )

  return {
    userMessage,
    assistantMessage,
  }
}
