import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getHealth } from "@/app/api/v1/platform/health/route"
import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { prisma } from "@/core/tenancy/infra/prisma"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

type HealthBody = {
  data: {
    queue: Array<{ feature: string; pending: number; oldestPendingAt: string | null; failedLast24h: number }>
    workers: Array<{ name: string; connections: number }>
  }
}

async function taoJob(t: Tenant, feature: string, status: "PENDING" | "FAILED", createdAt: Date) {
  await prisma.generation_jobs.create({
    data: {
      organization_id: t.organizationId, workspace_id: t.ctx.workspaceId, user_id: t.ctx.userId,
      feature, status, payload: {}, created_at: createdAt,
    },
  })
}

/** Màn Sức khoẻ hệ thống — hàng đợi theo loại việc và bộ xử lý nền (ROADMAP E1.6). */
describe("sức khoẻ hệ thống — hàng đợi theo loại việc", () => {
  let a: Tenant
  let b: Tenant
  let nguoiVanHanh: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("queue-a")
    b = await createTenant("queue-b")
    nguoiVanHanh = await createTenant("queue-van-hanh")
    await new PlatformOperatorRepository().grant(nguoiVanHanh.userId, [...ALL_PLATFORM_CAPABILITY_CODES], null)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("gộp xuyên tổ chức: số đang chờ, job chờ lâu nhất, lỗi trong 24 giờ; bỏ lỗi cũ hơn", async () => {
    const now = Date.now()
    const cuNhat = new Date(now - 30 * 60 * 1000)
    await taoJob(a, "vision.analyze", "PENDING", cuNhat)
    await taoJob(b, "vision.analyze", "PENDING", new Date(now - 60 * 1000))
    await taoJob(b, "vision.analyze", "FAILED", new Date(now - 60 * 60 * 1000))
    await taoJob(a, "media.optimize", "FAILED", new Date(now - 2 * 24 * 60 * 60 * 1000))

    const res = await getHealth(withSession(`${BASE}/platform/health`, nguoiVanHanh.token))
    expect(res.status).toBe(200)
    const { data } = (await readJson(res)) as HealthBody

    expect(data.queue).toEqual([
      { feature: "vision.analyze", pending: 2, oldestPendingAt: cuNhat.toISOString(), failedLast24h: 1 },
    ])
    expect(data.workers.map((w) => w.name)).toEqual(["vision", "media", "video"])
  })
})
