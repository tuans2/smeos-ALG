import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listFailed } from "@/app/api/v1/platform/jobs/failed/route"
import { POST as actOnJob } from "@/app/api/v1/platform/jobs/[id]/action/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/platform/jobs"

async function taoJobLoi(t: Tenant, feature: string) {
  return prisma.generation_jobs.create({
    data: {
      organization_id: t.organizationId, workspace_id: t.ctx.workspaceId, user_id: t.ctx.userId,
      feature, status: "FAILED", payload: { bi_mat: "không được lộ" }, error: "nhà cung cấp hết giờ",
      failure_kind: "RETRYABLE", attempts: 3, completed_at: new Date(),
    },
  })
}

function hanhDong(id: string, token: string, action: string) {
  const req = withSession(`${BASE}/${id}/action`, token, { method: "POST", body: JSON.stringify({ action }) })
  return actOnJob(req, { params: Promise.resolve({ id }) })
}

/** Hàng đợi lỗi (ROADMAP E5.2): xem cần N5, hành động cần N15 và ghi nhật ký nền tảng. */
describe("hàng đợi lỗi — job FAILED xuyên tổ chức", () => {
  let a: Tenant
  let b: Tenant
  let op: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("dl-a")
    b = await createTenant("dl-b")
    op = await createTenant("dl-op")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("N5 thấy job lỗi của cả hai tổ chức, không kèm payload; không có N15 thì không chạy lại được", async () => {
    await new PlatformOperatorRepository().grant(op.userId, ["N5"], null)
    const jobA = await taoJobLoi(a, "vision.analyze")
    await taoJobLoi(b, "media.optimize")

    const res = await listFailed(withSession(`${BASE}/failed`, op.token))
    expect(res.status).toBe(200)
    const { data } = (await readJson(res)) as { data: Array<Record<string, unknown>> }
    expect(data.map((j) => j.organizationId).sort()).toEqual([a.organizationId, b.organizationId].sort())
    expect(JSON.stringify(data)).not.toContain("bi_mat")

    expect((await hanhDong(jobA.id, op.token, "RETRY")).status).toBe(403)
    expect((await prisma.generation_jobs.findUniqueOrThrow({ where: { id: jobA.id } })).status).toBe("FAILED")
  })

  it("N15 chạy lại → PENDING lượt mới; gác lại → CANCELLED; mỗi lần một dòng nhật ký; lần hai → 404", async () => {
    await new PlatformOperatorRepository().grant(op.userId, ["N5", "N15"], null)
    const chayLai = await taoJobLoi(a, "vision.analyze")
    const gacLai = await taoJobLoi(b, "media.optimize")

    expect((await hanhDong(chayLai.id, op.token, "RETRY")).status).toBe(200)
    expect(await prisma.generation_jobs.findUniqueOrThrow({ where: { id: chayLai.id } })).toMatchObject({
      status: "PENDING", attempts: 0, failure_kind: null, run_after: null, error: null,
    })

    expect((await hanhDong(gacLai.id, op.token, "DISMISS")).status).toBe(200)
    const gac = await prisma.generation_jobs.findUniqueOrThrow({ where: { id: gacLai.id } })
    expect(gac.status).toBe("CANCELLED")
    expect(gac.cancelled_at).not.toBeNull()

    const nhatKy = await prisma.platform_audit_logs.findMany({ where: { user_id: op.userId }, orderBy: { created_at: "asc" } })
    expect(nhatKy.map((n) => [n.action, n.entity_id])).toEqual([
      ["platform.job.retry", chayLai.id],
      ["platform.job.dismiss", gacLai.id],
    ])

    expect((await hanhDong(chayLai.id, op.token, "RETRY")).status).toBe(404)
  })
})
