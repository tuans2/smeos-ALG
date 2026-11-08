import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import {
  requireIntegrationContext,
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { createJobBody } from "@/modules/integration/contracts/http-requests"

/**
 * `POST /integration/jobs` (đặc tả 06 mục 11): "Tạo job thay mặt tổ chức".
 * Tái dùng thẳng `enqueueJob` (P3) — cùng một đường kiểm hạn mức → ghi usage
 * → tạo `generation_jobs` → NOTIFY cho mọi nguồn tạo job, nội bộ lẫn bên
 * ngoài, không có đường tắt nào bỏ qua hạn mức cho engine ngoài (`YC-U3`).
 *
 * Cho phép mọi giá trị `feature` — core chưa có danh sách trắng theo
 * `client` (nợ #31, `TECHNICAL_DEBT.md`); hạn mức/credit vẫn chặn đúng dù
 * `feature` là gì.
 */
export const POST = handle(async (request) => {
  const ic = await requireIntegrationContext(request)
  const ctx = await toTenantContext(ic)

  const parsed = createJobBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await enqueueJob(ctx, {
    feature: parsed.data.feature,
    payload: parsed.data.payload,
    productId: parsed.data.product_id ?? null,
    idempotencyKey: parsed.data.idempotency_key,
  })

  return jsonResponse(result, { status: result.deduped ? 200 : 201 })
})
