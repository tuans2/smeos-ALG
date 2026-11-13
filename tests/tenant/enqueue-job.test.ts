import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { AppError } from "@/core/http/errors"
import { TRIAL_CREDIT_BALANCE } from "@/modules/organization/domain/experience"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { UsageRepository } from "@/modules/usage/infra/usage-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * `enqueueJob` — bốn việc trong một giao dịch (đặc tả 05 mục 6, `YC-U3`
 * `YC-U7`).
 *
 * Hai điều không thấy được nếu chỉ đọc lược đồ, chỉ lộ ra khi chạy trên
 * Postgres thật:
 *
 *  - Workspace mặc định `sign-up` tạo LUÔN có `kind: "EXPERIENCE"` (tổ chức
 *    mới là tổ chức trải nghiệm — `sign-up.ts`), nên `a.ctx` dùng thẳng luôn
 *    đi đường hạn mức TRIAL (`trial_count`/`trial_limit`), không bao giờ
 *    đụng `credit_balance` — bất kể `credit_balance` được đặt bao nhiêu.
 *    Muốn kiểm đường CREDIT phải tự dựng thêm một workspace `PRODUCTION`
 *    (`withProductionWorkspace` dưới đây), đối xứng với cách kiểm đường
 *    TRIAL tự dựng thêm một workspace `EXPERIENCE` riêng.
 *  - `sign-up.ts` cấp sẵn `TRIAL_CREDIT_BALANCE` (20) credit chào mừng cho
 *    tổ chức mới — không phải `0` như mặc định của lược đồ — nên bộ thử
 *    đường CREDIT luôn tự đặt lại `credit_balance` bằng
 *    `prisma.organizations.update` trước khi kiểm, thay vì dựa vào giá trị
 *    mặc định. Đi thẳng vào Postgres là hợp lệ trong `tests/`, luật "không
 *    import client ngoài infra/" chỉ quét `src/`.
 */
describe("enqueueJob", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  /**
   * Workspace `PRODUCTION` riêng — để kiểm đường hạn mức CREDIT, vì workspace
   * mặc định của `sign-up` luôn là `EXPERIENCE` (xem chú thích đầu tệp).
   */
  async function withProductionWorkspace(tenant: Tenant) {
    const workspace = await prisma.workspaces.create({
      data: {
        organization_id: tenant.organizationId,
        name: "Sản xuất",
        kind: "PRODUCTION",
      },
    })
    return { ...tenant.ctx, workspaceId: workspace.id }
  }

  it("hạn mức chặn TRƯỚC khi job vào bảng — tổ chức hết credit (YC-U3)", async () => {
    const ctx = await withProductionWorkspace(a)
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { credit_balance: 0 },
    })

    await expect(
      enqueueJob(ctx, {
        feature: "vision.analyze",
        payload: { asset_ids: [] },
        idempotencyKey: "no-credit-1",
      })
    ).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" })

    const jobs = await new GenerationJobRepository().list(ctx, { limit: 10 })
    expect(jobs).toEqual([])
  })

  it("đủ credit — tạo job, ghi usage ENQUEUED, trừ đúng credit_balance", async () => {
    const ctx = await withProductionWorkspace(a)
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { credit_balance: 10 },
    })

    const result = await enqueueJob(ctx, {
      feature: "vision.analyze",
      payload: { asset_ids: ["x"] },
      idempotencyKey: "co-credit-1",
    })

    expect(result.deduped).toBe(false)
    expect(result.job.status).toBe("PENDING")
    expect(result.job.feature).toBe("vision.analyze")
    expect(result.usage.costCredit).toBe(1)
    expect(result.usage.balanceAfter).toBe(9)

    const organization = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
    expect(organization?.credit_balance).toBe(9)

    const usageRows = await new UsageRepository().list(ctx, { limit: 10 })
    expect(usageRows).toHaveLength(1)
    expect(usageRows[0]?.status).toBe("ENQUEUED")
    expect(usageRows[0]?.job_id).toBe(result.job.id)
  })

  it("cùng Idempotency-Key trong 24 giờ trả lại job cũ, không trừ credit lần hai (YC-U7)", async () => {
    const ctx = await withProductionWorkspace(a)
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { credit_balance: 10 },
    })

    const first = await enqueueJob(ctx, {
      feature: "vision.analyze",
      payload: { asset_ids: ["x"] },
      idempotencyKey: "dup-key-1",
    })
    const second = await enqueueJob(ctx, {
      feature: "vision.analyze",
      payload: { asset_ids: ["x"] },
      idempotencyKey: "dup-key-1",
    })

    expect(second.deduped).toBe(true)
    expect(second.job.id).toBe(first.job.id)

    // Cùng khoá, payload khác → 422 (audit API-11, PO 09/11/2026; trước đây vẫn trả job cũ) — không trừ credit, không ghi usage
    await expect(
      enqueueJob(ctx, { feature: "vision.analyze", payload: { asset_ids: ["x", "y"] }, idempotencyKey: "dup-key-1" })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" })

    const organization = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
    expect(organization?.credit_balance).toBe(9) // trừ đúng một lần

    const usageRows = await new UsageRepository().list(ctx, { limit: 10 })
    expect(usageRows).toHaveLength(1)
  })

  it("thiếu Idempotency-Key bị từ chối trước khi chạm hạn mức", async () => {
    await expect(
      enqueueJob(a.ctx, { feature: "vision.analyze", payload: {}, idempotencyKey: "" })
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("workspace EXPERIENCE dùng hạn mức trial, không đụng credit_balance", async () => {
    const experienceWorkspace = await prisma.workspaces.create({
      data: {
        organization_id: a.organizationId,
        name: "Trải nghiệm",
        kind: "EXPERIENCE",
        trial_limit: 1,
        trial_status: "ACTIVE",
      },
    })
    const experienceCtx = { ...a.ctx, workspaceId: experienceWorkspace.id }

    const result = await enqueueJob(experienceCtx, {
      feature: "vision.analyze",
      payload: {},
      idempotencyKey: "trial-1",
    })
    expect(result.usage.costCredit).toBe(0)
    expect(result.usage.balanceAfter).toBeNull()

    const organization = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
    // "Không đụng" nghĩa là vẫn giữ nguyên TRIAL_CREDIT_BALANCE chào mừng mà
    // `sign-up` đã cấp — không phải 0 — vì đường TRIAL không chạm
    // credit_balance theo bất kỳ hướng nào.
    expect(organization?.credit_balance).toBe(TRIAL_CREDIT_BALANCE)

    await expect(
      enqueueJob(experienceCtx, { feature: "vision.analyze", payload: {}, idempotencyKey: "trial-2" })
    ).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" })
  })

  it("ném AppError thật, không phải lỗi chung — route dịch được sang 422", async () => {
    const ctx = await withProductionWorkspace(a)
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { credit_balance: 0 },
    })

    try {
      await enqueueJob(ctx, {
        feature: "vision.analyze",
        payload: {},
        idempotencyKey: "no-credit-appcheck",
      })
      throw new Error("Đáng lẽ phải ném QUOTA_EXCEEDED")
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).status).toBe(422)
    }
  })
})
