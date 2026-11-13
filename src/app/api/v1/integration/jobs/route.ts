import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { withoutSunsetFields } from "@/modules/integration/domain/integration-field-sunset"
import {
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { createJobBody } from "@/modules/integration/contracts/http-requests"
import { integrationKeyReuseMode } from "@/modules/integration/domain/integration-key-reuse"
import { defineRoute } from "@/core/http/define-route"

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
export const POST = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ request, ic }) => {
    const ctx = await toTenantContext(ic)

    const parsed = createJobBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await enqueueJob(ctx, {
      feature: parsed.data.feature,
      payload: parsed.data.payload,
      productId: parsed.data.product_id ?? null,
      idempotencyKey: parsed.data.idempotency_key,
      // Bên thứ ba: cùng khoá khác thân → 422 từ 09/02/2027 (báo trước 90 ngày, PO 11/11/2026); trước đó trả job cũ.
      keyReuse: integrationKeyReuseMode(new Date()),
    })

    // Trường nội bộ tự bỏ từ 09/02/2027 (ARC-024, `integration-field-sunset.ts`)
    const job = withoutSunsetFields("job", result.job, new Date())
    return jsonResponse({ ...result, job }, { status: result.deduped ? 200 : 201 })
  },
})
