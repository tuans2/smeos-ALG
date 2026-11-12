import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as integrationsSweep } from "@/app/api/v1/internal/integrations-sweep/route"
import { cronSecretFor } from "@/core/http/cron-auth"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { MEDIA_VARIANT_CLOUD_FEATURE } from "@/modules/media/domain/variant-rules"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Cron 5 phút hoàn đủ credit cho tác vụ AI lỗi (checklist ALG 10.2, GD1 Bước 6 J-08, PO 11/11/2026). */
describe("cron hoàn credit tác vụ lỗi", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("refund-sweep")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const sweep = () => integrationsSweep(new Request("http://localhost/api/v1/internal/integrations-sweep", { method: "POST", headers: { "x-cron-secret": cronSecretFor(process.env) ?? "" } }))
  const balance = async () => (await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance

  it("tác vụ lỗi được hoàn đủ ở lượt quét kế tiếp; quét lại không hoàn trùng", async () => {
    const workspace = await prisma.workspaces.create({ data: { organization_id: a.organizationId, name: "Sản xuất", kind: "PRODUCTION" } })
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { credit_balance: 10 } })
    const enq = await enqueueJob({ ...a.ctx, workspaceId: workspace.id }, {
      feature: MEDIA_VARIANT_CLOUD_FEATURE,
      payload: { master_asset_id: null, preset: "studio_white", ratio: "4:5" },
      idempotencyKey: randomUUID(),
    })
    const charged = 10 - (await balance())
    expect(charged).toBeGreaterThan(0)
    await prisma.generation_jobs.update({ where: { id: enq.job.id }, data: { status: "FAILED", error: "thiếu khoá nhà cung cấp", completed_at: new Date() } })

    const first = await (await sweep()).json() as { credits: { refundedJobs: number; refundedCredit: number } }
    expect(first.credits).toEqual({ refundedJobs: 1, refundedCredit: charged })
    expect(await balance()).toBe(10)

    const second = await (await sweep()).json() as { credits: { refundedJobs: number } }
    expect(second.credits.refundedJobs).toBe(0)
    expect(await balance()).toBe(10)
  })
})
