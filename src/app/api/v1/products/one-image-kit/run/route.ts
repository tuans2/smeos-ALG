import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { runOneImageKit } from "@/modules/journey/use-cases/one-image-kit"
import { oneImageKitRunBody } from "@/app/api/v1/_contracts/requests-products"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/products/one-image-kit/run — luồng "Từ 1 ảnh" (checklist ALG 7.2), chặng 09–10 sau khi
 * người dùng đã kiểm tra kết quả nhận diện: duyệt (H3) → thẻ sản phẩm nháp → nội dung bán hàng (H5) →
 * giá vốn đề xuất → bài đăng Facebook/Zalo (I1) → thẻ A6 (M5). Bước hỏng: trả 200 với `status = FAILED`,
 * `failedStep`, các đầu ra đã có; credit của bước hỏng đã hoàn. `Idempotency-Key` bắt buộc.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: runOneImageKit" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) throw validationFailed({ "idempotency-key": "Bắt buộc trên mọi endpoint tạo job (YC-U7)" })
    const parsed = oneImageKitRunBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await runOneImageKit(ctx, { analysisId: parsed.data.analysis_id, idempotencyKey }) })
  },
})

export const dynamic = "force-dynamic"
