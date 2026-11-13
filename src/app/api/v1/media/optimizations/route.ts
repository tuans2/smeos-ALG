import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { isOptimizeEnhancerProvider, OPTIMIZE_ENHANCER_PROVIDERS } from "@/modules/media/domain/optimization-rules"
import { listPendingOptimizations } from "@/modules/media/use-cases/list-pending-optimizations"
import { requestOptimization } from "@/modules/media/use-cases/request-optimization"
import { optimizationBody } from "@/app/api/v1/_contracts/requests-media"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /media/optimizations` (`I1`, đặc tả 06 mục 8). MỌI bộ máy — cục bộ
 * lẫn nhà cung cấp (`config.engine = "cloud_provider"`, `enhancer_provider`
 * Photoroom/fal/OpenAI) — đi qua `enqueueJob`: trừ credit thật, tôn trọng
 * `Idempotency-Key`, Identity Guard do worker ĐO.
 *
 * Trước 25/09/2026 nhánh cloud gọi nhà cung cấp trả phí đồng bộ trong request
 * (`executeCloudCreative`): không trừ credit (trả số giả `balance_after: 99`),
 * bỏ qua khoá idempotency, guard gõ tay 0,98 luôn SAFE — nợ #120.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) {
      throw validationFailed({ "idempotency-key": "Bắt buộc trên mọi endpoint tạo job (YC-U7)" })
    }

    const parsed = optimizationBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const provider = parsed.data.config?.enhancer_provider
    if (provider !== undefined && !isOptimizeEnhancerProvider(provider)) {
      throw validationFailed({
        "config.enhancer_provider": `Không hỗ trợ — chọn một trong: ${OPTIMIZE_ENHANCER_PROVIDERS.join(", ")}`,
      })
    }

    const result = await requestOptimization(ctx, {
      assetId: parsed.data.asset_id,
      config: parsed.data.config,
      idempotencyKey,
    })

    return jsonResponse(
      {
        job_id: result.job.id,
        status: result.job.status,
        // Máy chủ quyết định (PO 25/09/2026: nhà cung cấp trước, cục bộ chỉ khi chọn đích danh).
        engine: (result.job.payload as { config?: { engine?: string } } | null)?.config?.engine ?? "local_studio",
        usage: { cost_credit: result.usage.costCredit, balance_after: result.usage.balanceAfter },
      },
      { status: 201 }
    )
  },
})

/**
 * `GET /media/optimizations` (`I2`, nợ #48 — TECHNICAL_DEBT.md). Chỉ liệt
 * kê hàng chờ duyệt — xem `list-pending-optimizations.ts` vì sao đây không
 * phải một trang phân trang con trỏ thật.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I2" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw validationFailed({ limit: "Phải là số nguyên" })
    }

    const result = await listPendingOptimizations(ctx, { limit })
    return jsonResponse(result)
  },
})
