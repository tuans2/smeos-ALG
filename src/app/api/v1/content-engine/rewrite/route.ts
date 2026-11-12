import { validationFailed } from "@/core/http/errors"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { jsonResponse } from "@/core/http/response"
import { rewriteBody } from "@/app/api/v1/_contracts/requests-content"
import { callCapability, type AdapterOutcome } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import type { AiModelCandidate } from "@/core/ai/domain/routing"
import { getBrandProfile } from "@/modules/profiles/use-cases/get-brand-profile"
import { getBusinessProfile } from "@/modules/profiles/use-cases/get-business-profile"
import { holdRewriteCredit, requireRewriteCapability } from "@/modules/content-engine/use-cases/rewrite-credit"
import { defineRoute } from "@/core/http/define-route"

const STYLE_PROMPTS: Record<string, string> = {
  luxurious: "Sang trọng, đẳng cấp, tinh tế chuẩn boutique cao cấp.",
  sweet: "Ngọt ngào, ấm áp, truyền cảm hứng và chạm đến cảm xúc người nhận.",
  concise: "Ngắn gọn, súc tích, trực diện, kích thích hành động nhanh.",
  creative: "Sáng tạo, độc đáo, mang đậm dấu ấn nghệ nhân thủ công sáng tạo.",
}

const FIELD_GUIDES: Record<string, string> = {
  gift: "Đây là một ĐẶC QUYỀN / QUÀ TẶNG KÈM khi mua sản phẩm (ví dụ: thiệp tay cao cấp, hộp quà vintage, voucher...). Hãy diễn đạt hấp dẫn, làm nổi bật giá trị tặng thêm.",
  guarantee: "Đây là một CAM KẾT CHẤT LƯỢNG / DỊCH VỤ / BẢO HÀNH SẢN PHẨM (ví dụ: cam kết chuẩn mô tả, gửi ảnh duyệt trước, giao hỏa tốc...). Hãy diễn đạt tạo niềm tin vững chắc, an tâm tuyệt đối.",
  cta: "Đây là một CÂU KÊU GỌI HÀNH ĐỘNG (CTA) cho khách mua hàng. Hãy kích thích khách nhắn tin/đặt ngay.",
  description: "Đây là câu GIỚI THIỆU / MÔ TẢ thương hiệu hoặc cửa hàng. Hãy diễn đạt chuyên nghiệp và cuốn hút.",
  general: "Hãy trau chuốt câu từ thương mại để nghe chuyên nghiệp, hấp dẫn và tinh tế hơn.",
}

export interface RewriteResultOutput {
  suggestions: string[]
  /** Gợi ý dựng sẵn (AI trả về không đọc được) — không tính credit. */
  fallback?: boolean
}

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: requireRewriteCapability" },
  handler: async ({ request, ctx }) => {
    // PO 07/11/2026 (audit API-02, nợ #170): một trong F2/L2/L3; 1 lượt AI trả gợi ý = giá `content.rewrite`.
    // Trần tần suất vẫn giữ — kiểm trước khi đọc thân/gọi AI.
    requireRewriteCapability(ctx)
    await enforceRateLimit(request, { scope: "content-rewrite-user", limit: 30, windowMs: 10 * 60_000, subject: ctx.userId })
    await enforceRateLimit(request, { scope: "content-rewrite-org", limit: 200, windowMs: 60 * 60_000, subject: ctx.organizationId })

    const body = await request.json().catch(() => null)
    const parsed = rewriteBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const { text, field_type, style } = parsed.data

    // Lấy ngữ cảnh thương hiệu
    const [bizProfile, brandProfile] = await Promise.all([
      getBusinessProfile(ctx).catch(() => null),
      getBrandProfile(ctx).catch(() => null),
    ])

    const shopName = bizProfile?.display_name || "Cửa hàng"
    const shopTone = brandProfile?.tone_of_voice || "romantic"

    const prompt = `Bạn là cố vấn thương hiệu và chuyên gia viết nội dung cao cấp cho thương hiệu bán lẻ Việt Nam ("${shopName}").
  Nhiệm vụ: Viết lại và nâng cấp câu văn của chủ cửa hàng sau đây để trở nên chuyên nghiệp, giàu sức hút thương mại hơn.

  Văn bản gốc của chủ tiệm:
  "${text}"

  Loại nội dung: ${FIELD_GUIDES[field_type]}
  Phong cách mong muốn: ${STYLE_PROMPTS[style]}
  Tông giọng chủ đạo của tiệm: ${shopTone}

  Yêu cầu đầu ra:
  - Trả về đúng 3 phương án gợi ý viết lại khác nhau (từ ngắn gọn đến đầy đủ cảm xúc).
  - Mỗi gợi ý là 1 câu văn tiếng Việt hoàn chỉnh, chuẩn ngữ pháp, không lỗi chính tả, không dùng từ cấm hay phá giá.
  - Định dạng JSON theo cấu trúc:
  {
    "suggestions": [
      "Phương án 1...",
      "Phương án 2...",
      "Phương án 3..."
    ]
  }
  Chỉ trả về JSON thuần túy, không kèm giải thích ngoài lề.`

    const llm = createContentLLM()
    const deps = aiGatewayDeps(ctx)

    const adapter = async (model: AiModelCandidate): Promise<AdapterOutcome<RewriteResultOutput>> => {
      try {
        const response = await llm.complete({
          organizationId: ctx.organizationId,
          prompt,
          model: model.key,
          maxTokens: 500,
        })

        const cleaned = response.text.replace(/```(?:json)?\s*([\s\S]*?)```/, "$1").trim()
        const parsedJson = JSON.parse(cleaned)
        const suggestions = Array.isArray(parsedJson?.suggestions)
          ? parsedJson.suggestions.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
          : []

        return {
          ok: true,
          output: { suggestions: suggestions.length > 0 ? suggestions : [text] },
          scores: { factual: 1, brand: 1 },
        }
      } catch {
        // Fallback nhẹ nhàng nếu parse JSON gặp trục trặc
        return {
          ok: true,
          output: {
            suggestions: [
              `${text} (Được tuyển chọn & thực hiện thủ công)`,
              `Tặng kèm ${text.toLowerCase()} thiết kế độc quyền`,
              `${text} — Cam kết chất lượng dịch vụ uy tín`,
            ],
            fallback: true,
          },
          scores: { factual: 0.8, brand: 0.8 },
        }
      }
    }

    // Giữ credit trước khi gọi AI; không có gợi ý từ AI (lỗi, rơi về gợi ý dựng sẵn) → hoàn lại
    const credit = await holdRewriteCredit(ctx)
    let result: Awaited<ReturnType<typeof callCapability<RewriteResultOutput>>>
    try {
      result = await callCapability<RewriteResultOutput>(
        {
          capability: "content_generation",
          privacy: "SHOP",
          source: "CORE",
          jobId: null,
        },
        adapter,
        deps
      )
    } catch (error) {
      await credit.release()
      throw error
    }

    if (result.kind === "xong" && !result.output.fallback) {
      return jsonResponse({
        success: true,
        suggestions: result.output.suggestions,
      })
    }
    await credit.release()
    if (result.kind === "xong") {
      return jsonResponse({ success: true, suggestions: result.output.suggestions, fallback: true })
    }

    // Nếu AI Gateway tạm thời không chạy được (ví dụ offline mock hoặc hết quota)
    // Cung cấp 3 gợi ý template chuyên gia dự phòng tự động
    const fallbackSuggestions = [
      `${text} (Được thiết kế thủ công tỉ mỉ)`,
      `Tặng kèm ${text.toLowerCase()} độc quyền từ nghệ nhân`,
      `${text} — Cam kết chuẩn chất lượng uy tín`,
    ]

    return jsonResponse({
      success: true,
      suggestions: fallbackSuggestions,
      fallback: true,
    })
  },
})
