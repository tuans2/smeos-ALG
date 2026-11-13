import { validationFailed } from "@/core/http/errors"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { listApprovedAnalyses } from "@/modules/products/use-cases/list-approved-analyses"
import { listPendingAnalyses } from "@/modules/products/use-cases/list-pending-analyses"
import { requestAnalysis } from "@/modules/products/use-cases/request-analysis"
import { visionAnalysisBody } from "@/app/api/v1/_contracts/requests-ai-studio"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /vision/analyses` (`H1`, đặc tả 06 mục 8). `Idempotency-Key` bắt
 * buộc trên mọi endpoint tạo job (`YC-U7`) — đóng nợ đã ghi ở
 * `Checklist_Thuc_Thi.md` P3: "chưa có endpoint tạo job cụ thể theo feature
 * để nối header thật vào".
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H1" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) {
      throw validationFailed({ "idempotency-key": "Bắt buộc trên mọi endpoint tạo job (YC-U7)" })
    }

    const parsed = visionAnalysisBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await requestAnalysis(ctx, {
      assetIds: parsed.data.asset_ids,
      productId: parsed.data.product_id ?? null,
      idempotencyKey,
    })

    return jsonResponse(
      {
        job_id: result.jobId,
        status: result.status,
        engine: result.engine,
        usage: { cost_credit: result.usage.costCredit, balance_after: result.usage.balanceAfter },
      },
      { status: 201 }
    )
  },
})

/**
 * `GET /vision/analyses`
 * - Mặc định (`approval_state = PENDING`, gác bằng `H3`): chỉ liệt kê hàng chờ duyệt.
 * - `approval_state = APPROVED` (gác bằng `H5` hoặc `H3`): liệt kê phân tích đã duyệt phục vụ M01b.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: H5, H3, L1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const approvalState = url.searchParams.get("approval_state")

    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw validationFailed({ limit: "Phải là số nguyên" })
    }

    const isApproved =
      approvalState === "APPROVED" ||
      approvalState === "approved" ||
      url.searchParams.get("approved") === "true"

    if (isApproved) {
      if (!hasCapability(ctx, "H5") && !hasCapability(ctx, "H3") && !hasCapability(ctx, "L1")) {
        requireCapability(ctx, "H5")
      }
      const result = await listApprovedAnalyses(ctx, { limit, cursor: url.searchParams.get("cursor") })
      return jsonResponse(result)
    }

    requireCapability(ctx, "H3")
    const result = await listPendingAnalyses(ctx, { limit, cursor: url.searchParams.get("cursor") })
    return jsonResponse(result)
  },
})
