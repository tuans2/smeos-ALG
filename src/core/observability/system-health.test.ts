import { describe, expect, it } from "vitest"

import { checkSystemHealth, isReady, type HealthProbes } from "./system-health"

const NOW = new Date("2026-10-22T08:00:00.000Z")

function probes(over: Partial<HealthProbes> = {}): HealthProbes {
  return {
    databaseLatencyMs: async () => 12,
    redis: async () => "ok",
    jobBacklog: async () => ({ pendingTooLong: 0, processingTooLong: 0 }),
    ...over,
  }
}

describe("checkSystemHealth", () => {
  it("mọi thứ ổn → ok, không có issue", async () => {
    const h = await checkSystemHealth(probes(), { production: true, now: NOW })
    expect(h).toMatchObject({ status: "ok", issues: [], database: { up: true, latencyMs: 12 }, redis: "ok" })
    expect(h.timestamp).toBe(NOW.toISOString())
  })

  it("CSDL không trả lời → down, không đọc job", async () => {
    let jobsRead = false
    const h = await checkSystemHealth(
      probes({ databaseLatencyMs: async () => null, jobBacklog: async () => ((jobsRead = true), { pendingTooLong: 0, processingTooLong: 0 }) }),
      { production: true, now: NOW }
    )
    expect(h).toMatchObject({ status: "down", issues: ["database_unreachable"], jobs: null })
    expect(jobsRead).toBe(false)
  })

  it("CSDL chậm, Redis sập, job tồn đọng → degraded, liệt kê đủ", async () => {
    const h = await checkSystemHealth(
      probes({
        databaseLatencyMs: async () => 1500,
        redis: async () => "down",
        jobBacklog: async () => ({ pendingTooLong: 3, processingTooLong: 1 }),
      }),
      { production: true, now: NOW }
    )
    expect(h.status).toBe("degraded")
    expect(h.issues).toEqual(["database_slow", "redis_down", "jobs_pending_too_long", "jobs_processing_too_long"])
  })

  it("thiếu Redis chỉ là lỗi ở production", async () => {
    const redis = async () => "not_configured" as const
    expect((await checkSystemHealth(probes({ redis }), { production: false, now: NOW })).status).toBe("ok")
    expect((await checkSystemHealth(probes({ redis }), { production: true, now: NOW })).issues).toEqual(["redis_not_configured"])
  })

  it("đếm job lỗi → degraded, không ném ra ngoài", async () => {
    const h = await checkSystemHealth(probes({ jobBacklog: async () => Promise.reject(new Error("boom")) }), { production: true, now: NOW })
    expect(h).toMatchObject({ status: "degraded", issues: ["jobs_unreadable"], jobs: null })
  })

  it("production thiếu worker → degraded, nêu tên worker", async () => {
    const h = await checkSystemHealth(probes({ workers: async () => ({ vision: 1, media: 2 }) }), { production: true, now: NOW })
    expect(h).toMatchObject({ status: "degraded", issues: ["worker_offline:video"], workers: { vision: 1, media: 2 } })
  })

  it("ngoài production không có worker vẫn ok", async () => {
    const h = await checkSystemHealth(probes({ workers: async () => ({}) }), { production: false, now: NOW })
    expect(h).toMatchObject({ status: "ok", issues: [], workers: {} })
  })

  it("đếm worker lỗi → workers_unreadable", async () => {
    const h = await checkSystemHealth(probes({ workers: async () => Promise.reject(new Error("x")) }), { production: true, now: NOW })
    expect(h.issues).toEqual(["workers_unreadable"])
  })
})

describe("isReady", () => {
  it("CSDL sập → chưa sẵn sàng", () => {
    expect(isReady(false, "ok", false)).toBe(false)
  })

  it("production cần Redis ok; ngoài production thì không", () => {
    expect(isReady(true, "ok", true)).toBe(true)
    expect(isReady(true, "down", true)).toBe(false)
    expect(isReady(true, "not_configured", true)).toBe(false)
    expect(isReady(true, "not_configured", false)).toBe(true)
  })
})
