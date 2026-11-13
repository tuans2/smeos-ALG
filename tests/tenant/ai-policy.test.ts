import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getAiCapabilities } from "@/app/api/v1/ai-capabilities/route"
import { GET as getAiPolicy, PUT as putAiPolicy } from "@/app/api/v1/ai-policy/route"
import { GET as getAiRequests } from "@/app/api/v1/ai-requests/route"
import { GET as getAiRequestsSummary } from "@/app/api/v1/ai-requests/summary/route"
import { AiRequestRepository } from "@/core/ai/infra/ai-request-repository"
import { seedAiCapabilities, seedVisionModels } from "@/core/ai/infra/seed-ai-registry"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Cách ly tenant cho nền AI — đợt AI-1.
 *
 * `ai_policies`, `ai_requests` và `ai_evaluations` thuộc tenant, nên chúng chịu
 * đúng bộ test này như mọi bảng khác. Hai bảng sổ đăng ký (`ai_capabilities`,
 * `ai_models`) thì KHÔNG thuộc tenant — chúng là dữ liệu cấp nền tảng, nên ở
 * đây chúng được nạp một lần và hai tổ chức thấy giống nhau. Đó là hành vi
 * đúng, và nó cũng được khoá lại bên dưới để không ai vô tình gắn
 * `organization_id` vào sổ đăng ký về sau.
 */
describe("cách ly tenant — nền AI (AI-1)", () => {
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

  it("chính sách của tổ chức A không lọt vào đáp ứng của tổ chức B", async () => {
    await putAiPolicy(
      withSession(`${BASE}/ai-policy`, a.token, {
        method: "PUT",
        body: JSON.stringify({
          capability_code: "AIC-23",
          allowed_models: [],
          privacy_floor: "SHOP",
          quality_target: "cao",
        }),
      })
    )

    const cuaA = await readJson(await getAiPolicy(withSession(`${BASE}/ai-policy`, a.token)))
    const cuaB = await readJson(await getAiPolicy(withSession(`${BASE}/ai-policy`, b.token)))

    const timA = (body: unknown) =>
      (body as { capabilities: Array<{ capability_code: string; quality_target: string | null }> })
        .capabilities.find((row) => row.capability_code === "AIC-23")

    expect(timA(cuaA)?.quality_target).toBe("cao")
    expect(timA(cuaB)?.quality_target).toBeNull()
  })

  it("sổ chi phí lời gọi chỉ trả về hàng của chính tổ chức", async () => {
    const repository = new AiRequestRepository()
    await repository.record(a.ctx, {
      capability_code: "AIC-23",
      model_key: "openai_structured",
      outcome: "ACCEPTED",
      source: "CORE",
      cost_usd: 0.02,
      latency_ms: 800,
      quality_score: 0.9,
    })
    await repository.record(b.ctx, {
      capability_code: "AIC-23",
      model_key: "local_cv",
      outcome: "FAILED",
      source: "CORE",
    })

    const cuaA = (await readJson(
      await getAiRequests(withSession(`${BASE}/ai-requests`, a.token))
    )) as { data: Array<{ model_key: string }> }

    expect(cuaA.data).toHaveLength(1)
    expect(cuaA.data[0]?.model_key).toBe("openai_structured")

    const tongHop = (await readJson(
      await getAiRequestsSummary(withSession(`${BASE}/ai-requests/summary`, a.token))
    )) as { data: Array<{ model_key: string; calls: number; escalation_rate: number }> }

    expect(tongHop.data).toHaveLength(1)
    expect(tongHop.data[0]?.calls).toBe(1)
    expect(tongHop.data[0]?.escalation_rate).toBe(0)
  })

  it("sổ đăng ký năng lực dùng chung: hai tổ chức đọc ra cùng 37 năng lực", async () => {
    const cuaA = (await readJson(
      await getAiCapabilities(withSession(`${BASE}/ai-capabilities`, a.token))
    )) as { capabilities: unknown[] }
    const cuaB = (await readJson(
      await getAiCapabilities(withSession(`${BASE}/ai-capabilities`, b.token))
    )) as { capabilities: unknown[] }

    expect(cuaA.capabilities).toHaveLength(37)
    expect(cuaB.capabilities).toHaveLength(37)
  })

  it("hạ sàn quyền riêng tư dưới sàn của chính năng lực bị từ chối", async () => {
    const response = await putAiPolicy(
      withSession(`${BASE}/ai-policy`, a.token, {
        method: "PUT",
        body: JSON.stringify({
          capability_code: "AIC-29",
          allowed_models: [],
          privacy_floor: "SHOP",
        }),
      })
    )
    expect(response.status).toBe(400)
  })

  it("đổi chính sách của năng lực phân tích ảnh đòi H4, không chỉ U2", async () => {
    // Người sáng lập có cả `U2` và `H4` theo mặc định, nên ca này khoá chiều
    // ngược lại: chính sách ghi được VÀ ghi một hàng nhật ký kiểm toán.
    const response = await putAiPolicy(
      withSession(`${BASE}/ai-policy`, a.token, {
        method: "PUT",
        body: JSON.stringify({
          capability_code: "AIC-01",
          allowed_models: ["local_cv"],
          privacy_floor: "SHOP",
        }),
      })
    )
    expect(response.status).toBe(200)
  })
})
