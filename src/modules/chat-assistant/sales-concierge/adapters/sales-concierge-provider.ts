/**
 * Sales Concierge AI Provider Adapter.
 * Trợ lý AI Bán hoa cho Khách hàng cửa hàng.
 * TUYỆT ĐỐI KHÔNG chứa tri thức vận hành SaaS nội bộ (Zero-Leakage Guarantee).
 *
 * Câu trả lời AI chỉ đi qua cổng AI (`ChatAnswerFn` → `callCapability`), không gọi thẳng nhà cung cấp.
 * Không gửi thông tin cá nhân của khách (tên, số điện thoại, hạng) cho mô hình — chỉ câu hỏi và mẫu gợi ý.
 */

import {
  extractBudgetFromQuery,
  extractOccasionFromQuery,
  matchProductsFromMasterIndex,
  formatQuotePriceForChat,
} from "../../domain/flower-consultant-rules"
import type { SuggestedProductCard } from "../../domain/chat-types"
import type {
  SalesConsultantInput,
  SalesConsultantOutput,
} from "../domain/sales-concierge-types"
import type { ChatAnswerFn } from "../../adapters/chat-answer-gateway"

const SALES_SYSTEM_PROMPT = `Bạn là Chuyên viên Tư vấn Hoa Tươi duyên dáng, nhiệt tình của cửa hàng.
Nhiệm vụ:
- Giao tiếp lễ phép, ấm áp, tinh tế bằng tiếng Việt với khách mua hoa.
- Tư vấn sản phẩm phù hợp theo ngân sách, tone màu và dịp tặng hoa (sinh nhật, khai trương, kỷ niệm, chia buồn...).
- Nếu có sản phẩm phù hợp, gợi ý khách xem và nhấn nút chốt đơn sản phẩm yêu thích.
- Nếu chưa có sản phẩm hoàn toàn trùng khớp, giải thích nhẹ nhàng và gợi ý tư vấn chế tác theo yêu cầu riêng.
- Tuyệt đối KHÔNG nhắc đến các thuật ngữ kỹ thuật phần mềm hoặc mã hệ thống nội bộ.
- Trả lời ngắn gọn, sinh động trong 2-3 câu.`

export class SalesConciergeProvider {
  /** Không truyền `answer` → chỉ dùng bộ trả lời theo luật của tiệm (không gọi AI). */
  constructor(private readonly answer?: ChatAnswerFn | undefined) {}

  async send(input: SalesConsultantInput): Promise<SalesConsultantOutput> {
    const budget = extractBudgetFromQuery(input.query)
    const occasion = extractOccasionFromQuery(input.query)
    const suggestedProducts = matchProductsFromMasterIndex(input.masterProducts, budget, occasion)

    if (this.answer) {
      const catalogSummary =
        suggestedProducts.length > 0
          ? suggestedProducts
              .slice(0, 5)
              .map((p) => `- ${p.productName} (Giá: ${formatQuotePriceForChat(p.priceVnd)}, Phong cách: ${p.wrapStyle || "Hiện đại"})`)
              .join("\n")
          : "Hiện các sản phẩm thiết kế đang được cập nhật thêm."
      const reply = await this.answer({
        system: `${SALES_SYSTEM_PROMPT}\n\nSản phẩm gợi ý:\n${catalogSummary}`,
        prompt: input.query,
        maxTokens: 350,
      })
      if (reply) {
        return {
          replyText: reply,
          suggestedProducts,
          suggestedFlowers: suggestedProducts,
          detectedBudget: budget ?? undefined,
          detectedOccasion: occasion ?? undefined,
        }
      }
    }

    return this.generateLocalFlowerSalesReply(input, budget, occasion, suggestedProducts)
  }

  private generateLocalFlowerSalesReply(
    input: SalesConsultantInput,
    budget: number | null,
    occasion: string | null,
    suggestedProducts: SuggestedProductCard[]
  ): SalesConsultantOutput {
    const customerName = input.customer?.name ? ` ${input.customer.name}` : ""
    const greeting = `Dạ em chào anh/chị${customerName}! Em là tư vấn viên sản phẩm của tiệm ạ.`

    if (suggestedProducts.length === 0) {
      return {
        replyText: `${greeting} Hiện tại tiệm đang có các sản phẩm thiết kế theo yêu cầu riêng rất đẹp. Anh/chị có thể chia sẻ thêm về nhu cầu hoặc mức ngân sách mong muốn để bên em gợi ý mẫu phù hợp nhất nhé ạ!`,
        suggestedProducts: [],
        suggestedFlowers: [],
        detectedBudget: budget ?? undefined,
        detectedOccasion: occasion ?? undefined,
      }
    }

    let body = ""
    if (occasion && budget) {
      body = `Dịp **${occasion}** với mức ngân sách khoảng **${budget.toLocaleString("vi-VN")} đ**, em xin gửi anh/chị những thiết kế sản phẩm được yêu thích nhất dưới đây ạ.`
    } else if (occasion) {
      body = `Dành riêng cho dịp **${occasion}**, tiệm có những sản phẩm với tone màu rất trang nhã và ý nghĩa gửi anh/chị tham khảo ạ.`
    } else if (budget) {
      body = `Với tầm ngân sách khoảng **${budget.toLocaleString("vi-VN")} đ**, em xin gợi ý các sản phẩm bán chạy nhất tại tiệm dưới đây ạ.`
    } else {
      body = `Dạ tiệm có sẵn các mẫu các thiết kế và bộ sưu tập thiết kế rất tinh tế. Em xin gửi anh/chị một số sản phẩm nổi bật của tiệm hôm nay ạ!`
    }

    const cta = "\n\nAnh/chị ưng mẫu nào có thể bấm nút **⚡ Chọn mẫu này** để bên em chuẩn bị chu đáo nhé ạ!"

    return {
      replyText: `${greeting}\n\n${body}${cta}`,
      suggestedProducts,
      suggestedFlowers: suggestedProducts,
      detectedBudget: budget ?? undefined,
      detectedOccasion: occasion ?? undefined,
    }
  }
}
