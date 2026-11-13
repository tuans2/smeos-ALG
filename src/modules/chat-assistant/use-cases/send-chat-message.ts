/**
 * Use-case: Send Chat Message.
 * Tách biệt triệt để 2 kiến trúc:
 * 1. OPS_COPILOT: Trợ lý Vận hành SaaS nội bộ (Chỉ hướng dẫn nghiệp vụ phần mềm, quy trình, deep link).
 * 2. SALES_CONCIERGE: Trợ lý Bán hoa & Tư vấn chốt đơn (Dành cho khách hàng / nhân viên tư vấn bán hoa).
 */

import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { listProductMasterIndex } from "@/modules/products/use-cases/get-product-master-index"
import { getCustomerMasterIndex } from "@/modules/crm/use-cases/get-customer-master-index"
import type { ChatMessage } from "../domain/chat-types"
import { ChatRepository, getChatRepository } from "../infra/chat-repository"
import { OpsCopilotEngine } from "../ops-copilot/domain/ops-copilot-engine"
import { askOpsCopilot } from "../ops-copilot/use-cases/ask-ops-copilot"
import { OpsCopilotOrchestrator, ToneSynthesizerAgent } from "../ops-copilot/pipeline"
import { SalesConciergeProvider } from "../sales-concierge/adapters/sales-concierge-provider"
import { chatAnswerViaGateway } from "../adapters/chat-answer-gateway"

export async function sendChatMessage(
  ctx: TenantContext,
  conversationId: string,
  query: string,
  assistantType?: "OPS_COPILOT" | "SALES_CONCIERGE",
  repo: ChatRepository = getChatRepository(),
  salesProvider: SalesConciergeProvider = new SalesConciergeProvider(chatAnswerViaGateway(ctx, conversationId))
): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  if (!query.trim()) {
    throw validationFailed({ query: "Nội dung tin nhắn không được để trống" })
  }

  const conversation = await repo.getConversation(ctx, conversationId)
  if (!conversation) {
    throw notFound()
  }

  // 1. Phân luồng Ops Copilot (Trợ lý Vận hành SaaS nội bộ)
  const isOpsCopilot =
    assistantType === "OPS_COPILOT" ||
    (conversation.channel === "INTERNAL_DASHBOARD" &&
      conversation.title.toLowerCase().includes("copilot"))

  if (isOpsCopilot) {
    return askOpsCopilot(
      ctx,
      {
        conversationId,
        query,
      },
      {
        repo,
        engine: new OpsCopilotEngine(
          new OpsCopilotOrchestrator({ toneAgent: new ToneSynthesizerAgent(chatAnswerViaGateway(ctx, conversationId)) })
        ),
      }
    )
  }

  // 2. Phân luồng Sales Concierge (Trợ lý Tư vấn Bán hoa & Chốt đơn)
  const userMessage = await repo.addMessage(ctx, conversationId, "USER", query)

  const masterProducts = await listProductMasterIndex(ctx, 30).catch(() => [])
  let customer = null
  if (conversation.customerId) {
    try {
      customer = await getCustomerMasterIndex(ctx, conversation.customerId)
    } catch {
      // Khách vãng lai hoặc không tìm thấy
    }
  }

  const salesOutput = await salesProvider.send({
    query,
    conversationId,
    customer,
    masterProducts,
  })

  const assistantMessage = await repo.addMessage(
    ctx,
    conversationId,
    "ASSISTANT",
    salesOutput.replyText,
    {
      suggestedFlowers: salesOutput.suggestedFlowers,
      userIntent: "FLOWER_SALES",
    }
  )

  return { userMessage, assistantMessage }
}
