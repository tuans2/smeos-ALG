import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** E5.1 — job hẹn thử lại chưa tới giờ thì worker không nhận; chạy lại thủ công là một lượt mới. */
describe("thử lại job có backoff", () => {
  let a: Tenant
  const repository = new GenerationJobRepository()

  async function taoJob(key: string) {
    return repository.create(a.ctx, {
      workspaceId: a.ctx.workspaceId,
      branchId: null,
      userId: a.userId,
      productId: null,
      feature: "vision.analyze",
      payload: {},
      idempotencyKey: key,
    })
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("retry-a")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("claimNext bỏ qua job có run_after ở tương lai, nhận job đã tới giờ", async () => {
    const cho = await taoJob("cho")
    const toiGio = await taoJob("toi-gio")
    await prisma.generation_jobs.update({ where: { id: cho.id }, data: { run_after: new Date(Date.now() + 60_000) } })
    await prisma.generation_jobs.update({ where: { id: toiGio.id }, data: { run_after: new Date(Date.now() - 1_000) } })

    expect((await repository.claimNext("vision.analyze"))?.id).toBe(toiGio.id)
    expect(await repository.claimNext("vision.analyze")).toBeNull()
  })

  it("chạy lại thủ công job FAILED: về PENDING, attempts = 0, xoá run_after và failure_kind", async () => {
    const job = await taoJob("loi")
    await prisma.generation_jobs.update({
      where: { id: job.id },
      data: { status: "FAILED", attempts: 3, failure_kind: "RETRYABLE", error: "hết giờ", completed_at: new Date() },
    })

    const lai = await repository.retryIfFailed(a.ctx, job.id)

    expect(lai).toMatchObject({ status: "PENDING", attempts: 0, run_after: null, failure_kind: null, error: null })
  })
})
