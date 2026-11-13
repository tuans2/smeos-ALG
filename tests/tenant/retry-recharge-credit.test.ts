import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { retryJob } from "@/modules/jobs/use-cases/retry-job"
import { MEDIA_VARIANT_CLOUD_FEATURE } from "@/modules/media/domain/variant-rules"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Nợ #200 (PO 30/10/2026): tiệm chạy lại job lỗi ĐÃ được hoàn credit thì trừ credit lại; hoàn theo
 * lượt — mỗi lượt trừ tiền được hoàn tối đa một lần, không bao giờ hoàn quá số đã trừ.
 */
describe("chạy lại job đã hoàn credit", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("recharge-a")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function production(credit: number) {
    const workspace = await prisma.workspaces.create({
      data: { organization_id: a.organizationId, name: "Sản xuất", kind: "PRODUCTION" },
    })
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { credit_balance: credit } })
    return { ...a.ctx, workspaceId: workspace.id }
  }

  const balance = async () => (await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance
  const fail = (id: string) =>
    prisma.generation_jobs.update({ where: { id }, data: { status: "FAILED", error: "hết giờ", completed_at: new Date() } })

  async function taoJobLoi(ctx: Awaited<ReturnType<typeof production>>) {
    const enq = await enqueueJob(ctx, {
      feature: MEDIA_VARIANT_CLOUD_FEATURE,
      payload: { master_asset_id: null, preset: "studio_white", ratio: "4:5" },
      idempotencyKey: randomUUID(),
    })
    await fail(enq.job.id)
    return enq.job.id
  }

  it("lỗi → hoàn → chạy lại trừ lại → lỗi lần nữa → hoàn lần nữa; số dư cuối bằng lúc đầu", async () => {
    const ctx = await production(10)
    const jobId = await taoJobLoi(ctx)
    const gia = 10 - (await balance())
    expect(gia).toBeGreaterThan(0)

    expect((await refundJob(ctx, jobId)).refunded).toBe(true)
    expect(await balance()).toBe(10)
    expect((await refundJob(ctx, jobId)).refunded).toBe(false) // không hoàn hai lần cho một lượt

    await retryJob(ctx, jobId)
    expect(await balance()).toBe(10 - gia)
    const so = await prisma.usage.findMany({ where: { job_id: jobId }, orderBy: { created_at: "asc" } })
    expect(so.map((d) => d.status)).toEqual(["ENQUEUED", "REFUNDED", "ENQUEUED"])

    await fail(jobId)
    expect(await refundJob(ctx, jobId)).toMatchObject({ refunded: true, creditHoanLai: gia })
    expect(await balance()).toBe(10)
  })

  it("chưa hoàn mà chạy lại: không trừ thêm (credit lượt đầu vẫn đang giữ)", async () => {
    const ctx = await production(10)
    const jobId = await taoJobLoi(ctx)
    const sau = await balance()
    await retryJob(ctx, jobId)
    expect(await balance()).toBe(sau)
    expect(await prisma.usage.count({ where: { job_id: jobId } })).toBe(1)
  })

  it("đã hoàn nhưng không đủ credit để chạy lại → 422 QUOTA_EXCEEDED, job vẫn FAILED, không trừ gì", async () => {
    const ctx = await production(10)
    const jobId = await taoJobLoi(ctx)
    await refundJob(ctx, jobId)
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { credit_balance: 0 } })

    await expect(retryJob(ctx, jobId)).rejects.toMatchObject({ code: "QUOTA_EXCEEDED", status: 422 })
    expect((await prisma.generation_jobs.findUniqueOrThrow({ where: { id: jobId } })).status).toBe("FAILED")
    expect(await balance()).toBe(0)
  })

  // Audit BL-17 (06/11/2026): hoàn credit từng luôn trừ vào hạn mức kỳ HIỆN TẠI — job trừ tháng trước, hoàn
  // tháng này thì tháng này bị nới sai, tháng trước vẫn đầy.
  it("hoàn job trừ từ tháng trước → trả lại hạn mức của tháng trước, tháng này không đổi", async () => {
    const ctx = await production(10)
    const jobId = await taoJobLoi(ctx)
    const gia = 10 - (await balance())
    const now = new Date()
    const lastMonth = new Date(now.getTime() - 35 * 86_400_000)
    const [thisPeriod, lastPeriod] = [creditPeriod(now), creditPeriod(lastMonth)]
    // Dời lượt trừ về tháng trước: dòng sổ `usage` và phần đã tính vào hạn mức.
    await prisma.usage.updateMany({ where: { job_id: jobId, status: "ENQUEUED" }, data: { created_at: lastMonth } })
    await prisma.usage_limits.updateMany({ where: { organization_id: a.organizationId, service: "CREDIT", period: thisPeriod }, data: { period: lastPeriod } })
    await prisma.usage_limits.create({ data: { organization_id: a.organizationId, service: "CREDIT", period: thisPeriod, used: 3 } })

    expect((await refundJob(ctx, jobId)).refunded).toBe(true)
    const used = async (period: string) =>
      (await prisma.usage_limits.findFirstOrThrow({ where: { organization_id: a.organizationId, service: "CREDIT", period } })).used
    expect(await used(lastPeriod)).toBe(0)
    expect(await used(thisPeriod)).toBe(3)
    expect(gia).toBeGreaterThan(0)
  })
})
