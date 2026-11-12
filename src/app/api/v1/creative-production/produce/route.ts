import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { produceCreative } from "@/modules/creative-production/use-cases/produce-creative"
import { produceAuthentic } from "@/modules/creative-production/use-cases/produce-authentic"
import { produceBody } from "@/app/api/v1/_contracts/requests-creative"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /api/v1/creative-production/produce` — Sản xuất nội dung Creative Production.
 *
 * Chấp nhận TopicProductionBrief, gọi produceCreative() hoặc produceAuthentic()
 * tùy theo mode. Trả về kết quả đã được đóng gói sẵn cho từng topic.
 *
 * Năng lực: `I1` (sáng tạo nội dung đa phương tiện).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const parsed = produceBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    // `organizationId` CHỈ từ phiên máy chủ (AGENTS.md, Arch §2.5) — không nhận
    // từ body (23/09/2026; trước đó nhận rồi so khớp).
    const brief = { ...parsed.data.brief, organizationId: ctx.organizationId }

    const result = brief.mode === "CREATIVE"
      ? produceCreative({ brief })
      : produceAuthentic({ brief })

    return jsonResponse(result, { status: 201 })
  },
})