/**
 * Dify Chat Provider Adapter (Headless AI Engine).
 * Hỗ trợ Dual-Intent:
 * 1. Tư vấn bán hàng Tư vấn bán hoa & Chốt đơn M10 Chốt đơn M10 từ Product Master Index.
 * 2. Trợ lý SaaS In-App Copilot hướng dẫn toàn diện cách sử dụng nền tảng ALG.
 */

import { env } from "@/lib/env"
import type { ProductMasterIndex } from "@/modules/products/domain/product-master-index"
import type { CustomerMasterIndex } from "@/modules/crm/domain/customer-master-index"
import {
  extractBudgetFromQuery,
  extractOccasionFromQuery,
  matchProductsFromMasterIndex,
  formatQuotePriceForChat,
} from "../domain/flower-consultant-rules"
import {
  detectUserIntent,
  querySaasKnowledge,
} from "../domain/saas-knowledge-base"
import type { SuggestedProductCard } from "../domain/chat-types"

export interface ChatConsultantInput {
  query: string
  conversationId: string
  userRole?: string | undefined
  customer?: CustomerMasterIndex | null | undefined
  masterProducts: ProductMasterIndex[]
}

export interface ChatConsultantOutput {
  replyText: string
  suggestedProducts: SuggestedProductCard[]
  userIntent: "SAAS_HELP" | "PRODUCT_SALES"
  targetRoute?: string | undefined
  actionLabel?: string | undefined
  actionSteps?: string[] | undefined
  detectedBudget?: number | undefined
  detectedOccasion?: string | undefined
}

export class DifyChatProvider {
  private apiKey: string | undefined
  private apiUrl: string
  private openaiApiKey: string | undefined
  private ollamaUrl: string

  constructor() {
    this.apiKey = process.env.DIFY_API_KEY
    this.apiUrl = process.env.DIFY_API_URL || "https://api.dify.ai/v1"
    this.openaiApiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
    this.ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434"
  }

  async send(input: ChatConsultantInput): Promise<ChatConsultantOutput> {
    const intent = detectUserIntent(input.query)

    // ─────────────────────────────────────────────────────────────────────────
    // NHÁNH 1: HƯỚNG DẪN VẬN HÀNH SAAS ALG (SaaS Help Copilot)
    // ─────────────────────────────────────────────────────────────────────────
    if (intent === "SAAS_HELP") {
      const kbMatch = querySaasKnowledge(input.query)
      if (kbMatch) {
        const stepsText = kbMatch.steps.map((st, idx) => `${idx + 1}. ${st}`).join("\n")
        const replyText = `Dạ, về tính năng **"${kbMatch.title}"**:\n\n${kbMatch.summary}\n\n**Các bước thực hiện:**\n${stepsText}\n\nAnh/chị có thể bấm vào nút điều hướng bên dưới để mở ngay màn hình tính năng này nhé ạ!`

        return {
          replyText,
          suggestedProducts: [],
          userIntent: "SAAS_HELP",
          targetRoute: kbMatch.routePath,
          actionLabel: kbMatch.actionLabel,
          actionSteps: kbMatch.steps,
        }
      }

      // Trả lời hướng dẫn chung nếu chưa khớp chính xác 1 mục
      return {
        replyText: `Dạ em là ALG AI Copilot! Em có thể hướng dẫn anh/chị thao tác toàn bộ tính năng trên hệ thống:\n\n- **M01**: Phân tích ảnh sản phẩm Phân tích ảnh hoa & bóc tách BOM thành phần bóc tách BOM thành phần\n- **M02**: Cấu hình bảng giá niêm yết\n- **M04c**: Dựng video marketing 9:16 cho TikTok/Reels\n- **M06**: Xuất mã QR & quản lý Catalog trực tuyến\n- **M09**: Quản lý khách hàng, phân tầng RFM & nhắc ngày kỷ niệm\n- **M10**: Tạo đơn hàng, in phiếu chế tác xưởng (ẩn giá) & phiếu giao A6\n\nAnh/chị đang cần hỗ trợ thao tác chức năng nào ạ?`,
        suggestedProducts: [],
        userIntent: "SAAS_HELP",
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NHÁNH 2: TƯ VẤN SẢN PHẨM TƯ VẤN HOA TƯƠI & BÁN HÀNG BÁN HÀNG (Sales Consultant)
    // ─────────────────────────────────────────────────────────────────────────
    const budget = extractBudgetFromQuery(input.query)
    const occasion = extractOccasionFromQuery(input.query)
    const suggestedProducts = matchProductsFromMasterIndex(input.masterProducts, budget, occasion)

    // 1. Ưu tiên Dify nếu có DIFY_API_KEY
    if (this.apiKey) {
      try {
        const res = await fetch(`${this.apiUrl}/chat-messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {
              customer_name: input.customer?.name || "Quý khách",
              customer_tier: input.customer?.metrics.tier || "Khách mới",
              fav_products: input.customer?.preferences.preferredFlowers.join(", ") || "",
              budget: budget ? `${budget.toLocaleString("vi-VN")} đ` : "Chưa rõ",
              occasion: occasion || "Tự do",
            },
            query: input.query,
            response_mode: "blocking",
            conversation_id: input.conversationId.length === 36 ? input.conversationId : undefined,
            user: input.customer?.phone || "anonymous_shopper",
          }),
        })

        if (res.ok) {
          const data = await res.json()
          return {
            replyText: data.answer || "Dạ, em xin phép tư vấn sản phẩm phù hợp nhất cho anh/chị ạ.",
            suggestedProducts,
            userIntent: "PRODUCT_SALES",
            detectedBudget: budget ?? undefined,
            detectedOccasion: occasion ?? undefined,
          }
        }
      } catch (err) {
        console.warn("[DifyChatProvider] Lỗi kết nối Dify API, chuyển sang OpenAI/Qwen/Local:", err)
      }
    }

    // 2. Gọi trực tiếp OpenAI API (gpt-4o-mini) nếu có OPENAI_API_KEY
    if (this.openaiApiKey) {
      const openaiReply = await this.callOpenAI(input, budget, occasion, suggestedProducts)
      if (openaiReply) {
        return openaiReply
      }
    }

    // 3. Gọi Local Qwen 2.5:7b (Ollama) miễn phí 0đ
    const qwenReply = await this.callOllamaQwen(input, budget, occasion, suggestedProducts)
    if (qwenReply) {
      return qwenReply
    }

    // 4. Fallback chốt chặn an toàn: Local Rule Engine
    return this.generateLocalConsultantReply(input, budget, occasion, suggestedProducts)
  }

  private async callOpenAI(
    input: ChatConsultantInput,
    budget: number | null,
    occasion: string | null,
    suggestedProducts: SuggestedProductCard[]
  ): Promise<ChatConsultantOutput | null> {
    try {
      const catalogSummary =
        input.masterProducts.length > 0
          ? input.masterProducts
              .slice(0, 8)
              .map(
                (p) =>
                  `- ${p.name} (Giá: ${formatQuotePriceForChat(p.pricing.quotePriceVnd)}, Dịp: ${p.occasions.join(", ") || "Mọi dịp"})`
              )
              .join("\n")
          : "Hiện tiệm đang cập nhật danh mục sản phẩm mới."

      const customerContext = input.customer
        ? `Khách hàng: ${input.customer.name} (Hạng: ${input.customer.metrics.tier || "Mới"})`
        : "Khách hàng"

      const systemPrompt = `Bạn là Trợ lý Sản Phẩm AI chuyên nghiệp và tận tâm của cửa hàng ALG.
Nhiệm vụ của bạn:
- Giao tiếp duyên dáng, tinh tế, lịch thiệp, ấm áp bằng tiếng Việt.
- Tư vấn nhiệt tình theo ngân sách, màu sắc phong thủy, loài hoa hoặc dịp lễ (sinh nhật, khai trương, kỷ niệm, tình yêu...).
- Nếu tiệm chưa có sản phẩm mẫu nào trong danh mục, hãy giải thích nhẹ nhàng và gợi ý vào mục "Phân tích sản phẩm (M01)" để tải ảnh sản phẩm lên.
- Nếu có sản phẩm phù hợp, hãy nhắc khách có thể bấm nút "⚡ Chốt đơn mẫu này" ở bên dưới để xưởng thợ chế tác chuẩn bị ngay.
- Trả lời súc tích, tự nhiên, sinh động, không rập khuôn, tối đa 3-4 câu.

Thông tin khách: ${customerContext}
Danh mục sản phẩm hiện có tại tiệm:
${catalogSummary}`

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.query },
          ],
          max_tokens: 450,
          temperature: 0.7,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.warn("[OpenAIChat] OpenAI API error:", res.status, errText)
        return null
      }

      const data = await res.json()
      const answer = data.choices?.[0]?.message?.content?.trim()
      if (!answer) return null

      return {
        replyText: answer,
        suggestedProducts,
        userIntent: "PRODUCT_SALES",
        detectedBudget: budget ?? undefined,
        detectedOccasion: occasion ?? undefined,
        targetRoute: suggestedProducts.length === 0 ? "/tai-anh" : undefined,
        actionLabel: suggestedProducts.length === 0 ? "Tải Ảnh & Phân Tích Sản Phẩm M01" : undefined,
      }
    } catch (err) {
      console.warn("[OpenAIChat] Lỗi kết nối OpenAI API, chuyển fallback:", err)
      return null
    }
  }

  private async callOllamaQwen(
    input: ChatConsultantInput,
    budget: number | null,
    occasion: string | null,
    suggestedProducts: SuggestedProductCard[]
  ): Promise<ChatConsultantOutput | null> {
    try {
      const catalogSummary =
        input.masterProducts.length > 0
          ? input.masterProducts
              .slice(0, 8)
              .map(
                (p) =>
                  `- ${p.name} (Giá: ${formatQuotePriceForChat(p.pricing.quotePriceVnd)}, Dịp: ${p.occasions.join(", ") || "Mọi dịp"})`
              )
              .join("\n")
          : "Hiện tiệm đang cập nhật danh mục sản phẩm mới."

      const customerContext = input.customer
        ? `Khách hàng: ${input.customer.name} (Hạng: ${input.customer.metrics.tier || "Mới"})`
        : "Khách hàng"

      const systemPrompt = `Bạn là Trợ lý Sản Phẩm AI chuyên nghiệp của cửa hàng ALG (sử dụng mô hình Qwen Local).
Nhiệm vụ:
- Giao tiếp duyên dáng, thân thiện, lịch thiệp bằng tiếng Việt.
- Tư vấn sản phẩm phù hợp theo ngân sách, loài hoa hoặc dịp lễ (sinh nhật, khai trương, kỷ niệm...).
- Nếu tiệm chưa có sản phẩm, giải thích nhẹ nhàng và gợi ý vào "Phân tích sản phẩm (M01)" để tải ảnh sản phẩm lên.
- Nếu có sản phẩm phù hợp, nhắc khách có thể bấm nút "⚡ Chốt đơn mẫu này" ở bên dưới.
- Trả lời ngắn gọn, súc tích trong 2-3 câu.

Thông tin khách: ${customerContext}
Danh mục sản phẩm hiện có tại tiệm:
${catalogSummary}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const res = await fetch(`${this.ollamaUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "qwen2.5:7b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.query },
          ],
          max_tokens: 350,
          temperature: 0.7,
        }),
      })

      clearTimeout(timeoutId)

      if (!res.ok) return null

      const data = await res.json()
      const answer = data.choices?.[0]?.message?.content?.trim()
      if (!answer) return null

      return {
        replyText: answer,
        suggestedProducts,
        userIntent: "PRODUCT_SALES",
        detectedBudget: budget ?? undefined,
        detectedOccasion: occasion ?? undefined,
        targetRoute: suggestedProducts.length === 0 ? "/tai-anh" : undefined,
        actionLabel: suggestedProducts.length === 0 ? "Tải Ảnh & Phân Tích Sản Phẩm M01" : undefined,
      }
    } catch {
      // Ollama service offline or timeout
      return null
    }
  }

  private generateLocalConsultantReply(
    input: ChatConsultantInput,
    budget: number | null,
    occasion: string | null,
    suggestedProducts: SuggestedProductCard[]
  ): ChatConsultantOutput {
    const customerName = input.customer?.name ? ` ${input.customer.name}` : ""
    const tier = input.customer?.metrics.tier

    let greeting = `Dạ em chào anh/chị${customerName}! Em là trợ lý sản phẩm của tiệm.`
    if (tier === "VIP" || tier === "GOLD") {
      greeting = `Dạ em kính chào quý khách thân thiết${customerName}! Rất vui được gặp lại anh/chị ạ.`
    }

    // Trường hợp cửa hàng chưa có sản phẩm trong Product Master Index
    if (suggestedProducts.length === 0) {
      return {
        replyText: `${greeting} Hiện tại cửa hàng chưa có sản phẩm nào được duyệt trong Danh mục Master Index (M01/M03), nên em chưa có dữ liệu sản phẩm để gửi thẻ sản phẩm cho anh/chị xem.\n\n**Để thêm sản phẩm vào hệ thống và chốt đơn tự động:**\n1. Anh/chị vào mục **'Phân tích sản phẩm (M01)'** tải ảnh chụp sản phẩm lên\n2. AI tự động đếm cành và lập công thức hoa\n3. Bấm **'Chốt duyệt'** để đưa vào danh mục bán hàng của tiệm\n\nAnh/chị bấm nút bên dưới để vào trang tải ảnh hoa ngay nhé ạ!`,
        suggestedProducts: [],
        userIntent: "PRODUCT_SALES",
        targetRoute: "/tai-anh",
        actionLabel: "Tải Ảnh & Phân Tích Sản Phẩm M01",
        detectedBudget: budget ?? undefined,
        detectedOccasion: occasion ?? undefined,
      }
    }

    let body = ""
    if (occasion && budget) {
      body = `Em đã chọn lọc các sản phẩm tươi thiết kế tinh tế dành riêng cho dịp **${occasion}** trong phân khúc ngân sách **${budget.toLocaleString("vi-VN")} đ** dưới đây để anh/chị tham khảo ạ.`
    } else if (occasion) {
      body = `Dịp **${occasion}** này bên em đang có những thiết kế hoa tone màu rất sang trọng và ý nghĩa dưới đây. Anh/chị xem qua mẫu nhé!`
    } else if (budget) {
      body = `Với tầm ngân sách khoảng **${budget.toLocaleString("vi-VN")} đ**, em xin gợi ý các sản phẩm bán chạy nhất tại tiệm dưới đây ạ.`
    } else {
      body = `Dạ tiệm có đầy đủ các mẫu sản phẩm, giỏ hoa và bình sản phẩm thiết kế cho sinh nhật, khai trương hay kỷ niệm. Em xin gửi anh/chị một số mẫu nổi bật nhất của tiệm hôm nay ạ!`
    }

    const cta = "\n\nAnh/chị ưng mẫu nào có thể bấm nút **⚡ Chốt đơn mẫu này** để bên em lên đơn gửi thợ chế tác ngay nhé ạ!"

    return {
      replyText: `${greeting} ${body}${cta}`,
      suggestedProducts,
      userIntent: "PRODUCT_SALES",
      detectedBudget: budget ?? undefined,
      detectedOccasion: occasion ?? undefined,
    }
  }
}
