import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { POST as createJob } from "@/app/api/v1/integration/jobs/route"
import { POST as issueToken } from "@/app/api/v1/integration-tokens/route"
import { log } from "@/core/observability/log"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withBearer, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Audit API-11 (PO 07/11/2026): cùng `Idempotency-Key` mà khác thân → vẫn trả job cũ như trước (không
 * đổi hành vi), nhưng ghi `jobs.idempotency_payload_mismatch` để đo tần suất trước khi quyết chặn 422.
 * Postgres `jsonb` đổi thứ tự khoá — gửi lại đúng thân với khoá xáo trộn KHÔNG được tính là lệch.
 */
const BASE = "http://localhost/api/v1"

describe("enqueueJob — cùng khoá, khác thân", () => {
  let a: Tenant
  let token: string
  const send = (body: unknown) => createJob(withBearer(`${BASE}/integration/jobs`, token, { method: "POST", body: JSON.stringify(body) }))

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("khoa-trung")
    token = (await readJson(await issueToken(withSession(`${BASE}/integration-tokens`, a.token, { method: "POST", body: JSON.stringify({ client: "LOCALBUDD" }) })))).token as string
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    await disconnectDatabase()
  })

  it("thân giống hệt (khoá xáo trộn) → trả job cũ, không cảnh báo; thân khác → vẫn trả job cũ, có cảnh báo", async () => {
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
  })
})
