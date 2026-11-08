import { beforeEach, describe, expect, it, vi } from "vitest"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set(["H1"]) }
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: async () => ({ ctx }) }))
const enqueueJob = vi.fn(async () => ({ job: { id: "job-1", status: "QUEUED" }, usage: { costCredit: 2, balanceAfter: 98 } }))
vi.mock("@/modules/jobs/use-cases/enqueue-job", () => ({ enqueueJob: (...args: unknown[]) => enqueueJob(...(args as [])) }))

import { POST } from "@/app/api/v1/jobs/batch/route"
import { getJobFeatureForModule } from "@/lib/feature-catalog"

const valid = { productId: "p-1", feature: getJobFeatureForModule("M01"), capabilities: ["AIC-01"], module: "M01" }

function post(body: unknown, key: string | null = "khoa-1"): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (key !== null) headers["idempotency-key"] = key
  return new Request("http://localhost/api/v1/jobs/batch", { method: "POST", headers, body: JSON.stringify(body) })
}

/** Audit API-05 (06/11/2026): thân chỉ ép kiểu, thiếu `Idempotency-Key` thì máy chủ tự sinh UUID. */
describe("POST /api/v1/jobs/batch", () => {
  beforeEach(() => enqueueJob.mockClear())

  it("tạo job với khoá client gửi, giữ hình dạng phản hồi cũ", async () => {
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ job_id: "job-1", status: "QUEUED", usage: { cost_credit: 2, balance_after: 98 } })
    expect(enqueueJob).toHaveBeenCalledWith(ctx, expect.objectContaining({ idempotencyKey: "khoa-1", productId: "p-1" }))
  })

  it("thiếu Idempotency-Key → 400, không tự sinh khoá, không tạo job", async () => {
    const res = await POST(post(valid, null))
    expect(res.status).toBe(400)
    expect((await res.json()).error.details).toHaveProperty("idempotency-key")
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it.each([
    ["thiếu productId", { ...valid, productId: undefined }],
    ["capabilities rỗng", { ...valid, capabilities: [] }],
    ["capabilities quá 50 mục", { ...valid, capabilities: Array.from({ length: 51 }, (_, i) => `AIC-${i}`) }],
    ["capabilities không phải mảng chuỗi", { ...valid, capabilities: [1, 2] }],
  ])("%s → 400", async (_name, body) => {
    const res = await POST(post(body))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe("VALIDATION_FAILED")
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("vẫn chặn module không có mã quyền run (RS-8)", async () => {
    const res = await POST(post({ ...valid, module: "M03", feature: getJobFeatureForModule("M03") }))
    expect(res.status).toBe(403)
    expect(enqueueJob).not.toHaveBeenCalled()
  })
})
