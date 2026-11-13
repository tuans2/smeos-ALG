import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const latency = vi.fn<() => Promise<number | null>>()
const redis = vi.fn<() => Promise<"ok" | "down" | "not_configured">>()
const backlog = vi.fn<() => Promise<{ pendingTooLong: number; processingTooLong: number }>>()
vi.mock("@/core/tenancy/infra/database-ping", () => ({ measureDatabaseLatency: () => latency() }))
vi.mock("@/core/cache/redis-client", () => ({ pingRedis: () => redis() }))
vi.mock("@/modules/jobs/infra/job-health-query", () => ({ countJobBacklog: () => backlog(), countLiveWorkers: async () => ({ vision: 1, media: 1, video: 1 }) }))

import { GET } from "@/app/api/v1/internal/health/route"

const URL = "http://localhost/api/v1/internal/health"

/** Sức khoẻ chi tiết chỉ cho cron/vận hành (rà soát 21/10/2026, giai đoạn 3). */
describe("GET /api/v1/internal/health", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret-for-test")
    latency.mockResolvedValue(8)
    redis.mockResolvedValue("ok")
    backlog.mockResolvedValue({ pendingTooLong: 0, processingTooLong: 0 })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("thiếu hoặc sai x-cron-secret → 401, không đo gì", async () => {
    expect((await GET(new Request(URL))).status).toBe(401)
    const res = await GET(new Request(URL, { headers: { "x-cron-secret": "nope" } }))
    expect(res.status).toBe(401)
    // Envelope lỗi chung, không còn thân cũ `{ error: "Unauthorized" }` (audit API §32)
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED")
    expect(latency).not.toHaveBeenCalled()
  })

  it("ổn → 200 kèm số đo", async () => {
    const res = await GET(new Request(URL, { headers: { "x-cron-secret": "s3cret-for-test" } }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: "ok", database: { up: true, latencyMs: 8 }, redis: "ok", workers: { vision: 1, media: 1, video: 1 } })
  })

  it("job treo → 503 để curl -f của cron thất bại", async () => {
    backlog.mockResolvedValue({ pendingTooLong: 0, processingTooLong: 2 })
    const res = await GET(new Request(URL, { headers: { "x-cron-secret": "s3cret-for-test" } }))
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ status: "degraded", issues: ["jobs_processing_too_long"] })
  })
})
