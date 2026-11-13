import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getReviewQueue, POST as postReview } from "@/app/api/v1/ai-requests/review/route"
import { AiRequestRepository } from "@/core/ai/infra/ai-request-repository"
import { AuditLogRepository } from "@/modules/audit/infra/audit-log-repository"
import { seedAiCapabilities, seedVisionModels } from "@/core/ai/infra/seed-ai-registry"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

describe("review hàng chờ — AI-2 A3", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    await seedAiCapabilities()
    await seedVisionModels()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chỉ trả NEEDS_REVIEW và ESCALATED, không trả ACCEPTED hay FAILED", async () => {
    const repo = new AiRequestRepository()
    await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "openai_structured",
      outcome: "NEEDS_REVIEW",
      source: "CORE",
      quality_score: 0.6,
    })
    await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "openai_structured",
      outcome: "ESCALATED",
      source: "CORE",
    })
    await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "gpt-4o",
      outcome: "ACCEPTED",
      source: "CORE",
      quality_score: 0.9,
    })
    await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "gpt-4o",
      outcome: "FAILED",
      source: "CORE",
    })

    const response = await getReviewQueue(
      withSession(`${BASE}/ai-requests/review`, a.token)
    )
    const body = (await readJson(response)) as { data: Array<{ outcome: string; model_key: string }> }

    expect(response.status).toBe(200)
    expect(body.data).toHaveLength(2)
    const outcomes = body.data.map((d) => d.outcome)
    expect(outcomes).toContain("NEEDS_REVIEW")
    expect(outcomes).toContain("ESCALATED")
    expect(outcomes).not.toContain("ACCEPTED")
    expect(outcomes).not.toContain("FAILED")
  })

  it("không trả dữ liệu của tổ chức khác", async () => {
    const repo = new AiRequestRepository()
    await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "openai_structured",
      outcome: "NEEDS_REVIEW",
      source: "CORE",
    })
    await repo.record(b.ctx, {
      capability_code: "AIC-23",
      model_key: "local_cv",
      outcome: "NEEDS_REVIEW",
      source: "CORE",
    })

    const responseA = await getReviewQueue(
      withSession(`${BASE}/ai-requests/review`, a.token)
    )
    const responseB = await getReviewQueue(
      withSession(`${BASE}/ai-requests/review`, b.token)
    )

    const dataA = (await readJson(responseA)) as { data: Array<{ model_key: string }> }
    const dataB = (await readJson(responseB)) as { data: Array<{ model_key: string }> }

    expect(dataA.data).toHaveLength(1)
    expect(dataA.data[0]?.model_key).toBe("openai_structured")
    expect(dataB.data).toHaveLength(1)
    expect(dataB.data[0]?.model_key).toBe("local_cv")
  })

  it("duyệt chấp nhận — NEEDS_REVIEW → ACCEPTED", async () => {
    const repo = new AiRequestRepository()
    const row = await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "openai_structured",
      outcome: "NEEDS_REVIEW",
      source: "CORE",
      quality_score: 0.6,
    })

    const response = await postReview(
      withSession(`${BASE}/ai-requests/review`, a.token, {
        method: "POST",
        body: JSON.stringify({ id: row.id, action: "approve" }),
      })
    )
    expect(response.status).toBe(200)

    const decision = (await readJson(response)) as {
      outcome: string
      previous_outcome: string
      action: string
    }
    expect(decision.outcome).toBe("ACCEPTED")
    expect(decision.previous_outcome).toBe("NEEDS_REVIEW")
    expect(decision.action).toBe("approve")

    const queue = await getReviewQueue(
      withSession(`${BASE}/ai-requests/review`, a.token)
    )
    const queueBody = (await readJson(queue)) as { data: Array<{ id: string; outcome: string }> }
    expect(queueBody.data).toHaveLength(0)
  })

  it("duyệt từ chối — NEEDS_REVIEW → FAILED", async () => {
    const repo = new AiRequestRepository()
    const row = await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "openai_structured",
      outcome: "NEEDS_REVIEW",
      source: "CORE",
    })

    const response = await postReview(
      withSession(`${BASE}/ai-requests/review`, a.token, {
        method: "POST",
        body: JSON.stringify({ id: row.id, action: "reject" }),
      })
    )
    expect(response.status).toBe(200)

    const decision = (await readJson(response)) as { outcome: string }
    expect(decision.outcome).toBe("FAILED")
  })

  it("sửa đổi — NEEDS_REVIEW giữ nguyên NEEDS_REVIEW", async () => {
    const repo = new AiRequestRepository()
    const row = await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "openai_structured",
      outcome: "NEEDS_REVIEW",
      source: "CORE",
    })

    const response = await postReview(
      withSession(`${BASE}/ai-requests/review`, a.token, {
        method: "POST",
        body: JSON.stringify({ id: row.id, action: "modify", note: "cần sửa giọng thương hiệu" }),
      })
    )
    expect(response.status).toBe(200)

    const decision = (await readJson(response)) as { outcome: string; note: string | null }
    expect(decision.outcome).toBe("NEEDS_REVIEW")
    expect(decision.note).toBe("cần sửa giọng thương hiệu")
  })

  it("không tìm thấy bản ghi → 404", async () => {
    const response = await postReview(
      withSession(`${BASE}/ai-requests/review`, a.token, {
        method: "POST",
        body: JSON.stringify({ id: "không-tồn-tại", action: "approve" }),
      })
    )
    expect(response.status).toBe(404)
  })

  it("thân yêu cầu không hợp lệ → 400", async () => {
    const response = await postReview(
      withSession(`${BASE}/ai-requests/review`, a.token, {
        method: "POST",
        body: JSON.stringify({ id: "abc", action: "invalid_action" }),
      })
    )
    expect(response.status).toBe(400)
  })

  it("ghi nhật ký kiểm toán khi duyệt", async () => {
    const repo = new AiRequestRepository()
    const row = await repo.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "openai_structured",
      outcome: "NEEDS_REVIEW",
      source: "CORE",
    })

    await postReview(
      withSession(`${BASE}/ai-requests/review`, a.token, {
        method: "POST",
        body: JSON.stringify({ id: row.id, action: "approve", note: "đúng yêu cầu" }),
      })
    )

    const auditRepo = new AuditLogRepository()
    const logs = await auditRepo.list(a.ctx, { limit: 10 })
    const relevant = logs.filter((l) => l.entity_id === row.id && l.entity_type === "ai_requests")
    expect(relevant.length).toBeGreaterThan(0)
    const entry = relevant[0]!
    expect(entry.action).toBe("ai_request.approve")
    expect((entry.after as { outcome: string })?.outcome).toBe("ACCEPTED")
  })
})
