import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { retryJob } from "@/modules/jobs/use-cases/retry-job"
import { scanStuckJobs } from "@/modules/jobs/use-cases/scan-stuck-jobs"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { MEDIA_VARIANT_CLOUD_FEATURE } from "@/modules/media/domain/variant-rules"
import { refundDueJobs } from "@/modules/usage/use-cases/refund-due-jobs"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Audit BL-32 (11/11/2026): credit của job lỗi / huỷ chỉ được hoàn khi có người mở lại màn job hoặc chạy tay
 * `npm run hoan-credit` (không lịch nào gọi); và danh sách job cần hoàn luôn là 200 job cũ nhất, kể cả job đã hoàn.
 */
describe("bộ quét hoàn credit", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("refund-sweep-a")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function production(credit: number) {
    const workspace = await prisma.workspaces.create({ data: { organization_id: a.organizationId, name: "Sản xuất", kind: "PRODUCTION" } })
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { credit_balance: credit } })
    return { ...a.ctx, workspaceId: workspace.id }
  }
  const balance = async () => (await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance
  const enqueue = (ctx: typeof a.ctx) =>
    enqueueJob(ctx, { feature: MEDIA_VARIANT_CLOUD_FEATURE, payload: { master_asset_id: null, preset: "studio_white", ratio: "4:5" }, idempotencyKey: randomUUID() })
  const fail = (id: string) => prisma.generation_jobs.update({ where: { id }, data: { status: "FAILED", error: "hết giờ", completed_at: new Date() } })
  const refundable = async () => (await new GenerationJobRepository().listRefundable(200)).map((j) => j.id)

  it("chỉ liệt kê job còn credit chưa hoàn; hoàn xong thì rời danh sách; chạy lại rồi lỗi thì vào lại", async () => {
    const ctx = await production(20)
    const failed = (await enqueue(ctx)).job.id
    await fail(failed)
    const trial = (await enqueue(a.ctx)).job.id // workspace dùng thử: 0 credit, không có gì để hoàn
    await fail(trial)
    const running = (await enqueue(ctx)).job.id // còn chạy: chưa thuộc diện hoàn
    expect(await refundable()).toEqual([failed])

    const before = await balance()
    const r = await refundDueJobs()
    expect(r).toMatchObject({ refunded: 1, failed: 0 })
    expect(await balance()).toBe(before + r.credit)
    expect(await refundable()).toEqual([])

    await retryJob(ctx, failed) // đã hoàn → chạy lại trừ lại
    await fail(failed)
    expect(await refundable()).toEqual([failed])
    expect(running).toBeTruthy()
  })

  it("job treo bị quét thành lỗi → hoàn ngay trong cùng lượt quét", async () => {
    const ctx = await production(20)
    const id = (await enqueue(ctx)).job.id
    const charged = await balance()
    await prisma.generation_jobs.update({ where: { id }, data: { status: "PROCESSING", started_at: new Date(Date.now() - 20 * 60_000) } })

    expect(await scanStuckJobs(new Date())).toBe(1)
    expect((await prisma.generation_jobs.findUniqueOrThrow({ where: { id } })).status).toBe("FAILED")
    expect(await balance()).toBeGreaterThan(charged)
    expect(await prisma.usage.count({ where: { job_id: id, status: "REFUNDED" } })).toBe(1)
  })
})
