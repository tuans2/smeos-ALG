import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * `YC-J7` — worker lấy việc bằng `SELECT … FOR UPDATE SKIP LOCKED` (đặc tả
 * 07 mục 6). Đây là bằng chứng cơ chế đúng ở tầng TS: hai lời gọi `claimNext`
 * đồng thời trên cùng `feature` không bao giờ nhận cùng một job. Worker
 * Python thật chạy đúng câu SQL này qua `psycopg` — không gọi lại hàm TS
 * (`YC-J8`, không HTTP giữa TS và Python).
 */
describe("claimNext — SKIP LOCKED không bao giờ phát trùng job", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("hai worker gọi đồng thời nhận hai job khác nhau, cả hai chuyển PROCESSING", async () => {
    const repository = new GenerationJobRepository()
    const jobs = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        repository.create(a.ctx, {
          workspaceId: a.ctx.workspaceId,
          branchId: null,
          userId: a.userId,
          productId: null,
          feature: "vision.analyze",
          payload: { i },
          idempotencyKey: `skip-locked-${i}`,
        })
      )
    )
    expect(jobs).toHaveLength(4)

    const [claimed1, claimed2] = await Promise.all([
      repository.claimNext("vision.analyze"),
      repository.claimNext("vision.analyze"),
    ])

    expect(claimed1).not.toBeNull()
    expect(claimed2).not.toBeNull()
    expect(claimed1?.id).not.toBe(claimed2?.id)
    expect(claimed1?.status).toBe("PROCESSING")
    expect(claimed2?.status).toBe("PROCESSING")
    expect(claimed1?.started_at).not.toBeNull()

    const remainingPending = await repository.list(a.ctx, { limit: 10 })
    expect(remainingPending.filter((job) => job.status === "PENDING")).toHaveLength(2)
  })

  it("không còn job PENDING của feature đó thì trả null", async () => {
    const repository = new GenerationJobRepository()
    expect(await repository.claimNext("media.optimize")).toBeNull()
  })
})
