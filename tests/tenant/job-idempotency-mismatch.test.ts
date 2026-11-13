import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { POST as createJob } from "@/app/api/v1/integration/jobs/route"
import { POST as issueToken } from "@/app/api/v1/integration-tokens/route"
import { log } from "@/core/observability/log"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withBearer, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Audit API-11: cùng `Idempotency-Key` mà khác thân → 422 `IDEMPOTENCY_KEY_REUSED` trên mọi đường tạo job nội bộ (PO
 * 09/11/2026; trước đó chỉ ghi cảnh báo và trả job cũ), không tạo job thứ hai. `/integration/jobs` (bên thứ ba) giữ hành
 * vi cũ trong thời gian báo trước thay đổi phá vỡ (đặc tả 06: ≥ 90 ngày). Feature trong `KEY_REUSE_ALLOWED` (mở lại kết
 * quả theo khoá cố định) vẫn trả job cũ. Postgres `jsonb` đổi thứ tự khoá — gửi lại đúng thân với khoá xáo trộn KHÔNG
 * được tính là lệch.
 */
const BASE = "http://localhost/api/v1"

describe("enqueueJob — cùng khoá, khác thân", () => {
  let a: Tenant
  let token: string
  const send = (body: unknown) => createJob(withBearer(`${BASE}/integration/jobs`, token, { method: "POST", body: JSON.stringify(body) }))

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("khoa-trung")
    token = (await readJson(await issueToken(withSession(`${BASE}/integration-tokens`, a.token, { method: "POST", body: JSON.stringify({ client: "LOCALBUDD", ttl_days: 365 }) })))).token as string
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    await disconnectDatabase()
  })

  it("Integration API: thân giống hệt (khoá xáo trộn) → job cũ, không cảnh báo; thân khác → vẫn job cũ (báo trước), có cảnh báo", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z"))
    const warn = vi.spyOn(log, "warn")
    const first = await send({ feature: "landing.create", payload: { page: "trang-chu", theme: { a: 1, b: 2 } }, idempotency_key: "khoa-1" })
    expect(first.status).toBe(201)
    const jobId = ((await readJson(first)).job as { id: string }).id

    const same = await send({ idempotency_key: "khoa-1", payload: { theme: { b: 2, a: 1 }, page: "trang-chu" }, feature: "landing.create" })
    expect(same.status).toBe(200)
    expect(warn.mock.calls.filter(([event]) => event === "jobs.idempotency_payload_mismatch")).toEqual([])

    const different = await send({ feature: "landing.create", payload: { page: "gioi-thieu" }, idempotency_key: "khoa-1" })
    expect(different.status).toBe(200)
    const body = await readJson(different)
    expect(body.deduped).toBe(true)
    expect((body.job as { id: string }).id).toBe(jobId)
    expect(warn).toHaveBeenCalledWith("jobs.idempotency_payload_mismatch", { feature: "landing.create", job_id: jobId })
    // Cảnh báo không mang nội dung payload (không đưa dữ liệu khách vào log)
    expect(JSON.stringify(warn.mock.calls)).not.toContain("gioi-thieu")

    expect(await prisma.generation_jobs.count({ where: { organization_id: a.organizationId } })).toBe(1)
    vi.useRealTimers()
  })

  it("Integration API từ ngày hiệu lực (09/02/2027, báo trước 90 ngày): cùng khoá khác thân → 422, không tạo job", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    try {
      vi.setSystemTime(new Date("2027-02-09T00:00:00Z"))
      const first = await send({ feature: "landing.create", payload: { page: "a" }, idempotency_key: "khoa-hieu-luc" })
      expect(first.status).toBe(201)
      const jobId = ((await readJson(first)).job as { id: string }).id
      expect((await send({ feature: "landing.create", payload: { page: "a" }, idempotency_key: "khoa-hieu-luc" })).status).toBe(200)
      const reused = await send({ feature: "landing.create", payload: { page: "b" }, idempotency_key: "khoa-hieu-luc" })
      expect(reused.status).toBe(422)
      expect((await readJson(reused)).error).toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", details: { job_id: jobId } })
      expect(await prisma.generation_jobs.count({ where: { organization_id: a.organizationId, idempotency_key: "khoa-hieu-luc" } })).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it("đường nội bộ: cùng khoá khác thân → 422 IDEMPOTENCY_KEY_REUSED, không tạo job thứ hai", async () => {
    const ctx = { ...a.ctx, capabilities: new Set(["I1"]) }
    const first = await enqueueJob(ctx, { feature: "landing.create", payload: { page: "a" }, idempotencyKey: "noi-bo-1" })
    expect(await enqueueJob(ctx, { feature: "landing.create", payload: { page: "a" }, idempotencyKey: "noi-bo-1" })).toMatchObject({ deduped: true, job: { id: first.job.id } })
    await expect(enqueueJob(ctx, { feature: "landing.create", payload: { page: "b" }, idempotencyKey: "noi-bo-1" })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", details: { job_id: first.job.id } })
    expect(await prisma.generation_jobs.count({ where: { organization_id: a.organizationId, idempotency_key: "noi-bo-1" } })).toBe(1)
  })

  it("feature được miễn (mở lại kịch bản theo khoá cố định) → cùng khoá khác thân vẫn trả job cũ", async () => {
    const ctx = { ...a.ctx, capabilities: new Set(["I1"]) }
    const first = await enqueueJob(ctx, { feature: "creative.scene_plan", payload: { topic_id: "t1", platforms: ["facebook"] }, idempotencyKey: "kich-ban-1" })
    const reopened = await enqueueJob(ctx, { feature: "creative.scene_plan", payload: { topic_id: "t1", platforms: ["zalo"] }, idempotencyKey: "kich-ban-1" })
    expect(reopened).toMatchObject({ deduped: true, job: { id: first.job.id } })
  })
})

