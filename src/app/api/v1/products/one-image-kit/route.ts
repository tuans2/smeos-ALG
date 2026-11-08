import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { oneImageKitProgress, startOneImageKit } from "@/modules/journey/use-cases/one-image-kit"
import { oneImageKitBody, oneImageKitQuery } from "@/app/api/v1/_contracts/requests-products"

/**
 * POST /api/v1/products/one-image-kit — luồng "Từ 1 ảnh" (checklist ALG 7.2), chặng 01–02: gửi ảnh đi
 * nhận diện (job `vision.analyze`, H1). `Idempotency-Key` bắt buộc.
 */
export const POST = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  const idempotencyKey = readIdempotencyKey(request)
  if (!idempotencyKey) throw validationFailed({ "idempotency-key": "Bắt buộc trên mọi endpoint tạo job (YC-U7)" })
  const parsed = oneImageKitBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await startOneImageKit(ctx, { assetId: parsed.data.asset_id, idempotencyKey }) }, { status: 202 })
})

/** GET /api/v1/products/one-image-kit?job_id=&asset_id= — chặng 08: tiến độ nhận diện và tóm tắt kết quả để kiểm tra (H1). */
export const GET = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  const url = new URL(request.url)
  const parsed = oneImageKitQuery.safeParse({ job_id: url.searchParams.get("job_id"), asset_id: url.searchParams.get("asset_id") })
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await oneImageKitProgress(ctx, { jobId: parsed.data.job_id, assetId: parsed.data.asset_id }) })
})

export const dynamic = "force-dynamic"
