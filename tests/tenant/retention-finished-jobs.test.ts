import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { runRetentionSweep } from "@/modules/organization/use-cases/run-retention-sweep"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-015 D-O6, bước O-10: job sinh ảnh / nội dung đã xong, lỗi hoặc huỷ quá 30 ngày bị xoá cùng nhật ký job; job đang
 * chạy, job mới, `usage` và tổ chức đang legal hold giữ nguyên.
 */
const DAY = 24 * 60 * 60 * 1000
const NOW = new Date()
const ago = (days: number) => new Date(NOW.getTime() - days * DAY)

async function job(t: Tenant, status: "COMPLETED" | "FAILED" | "PROCESSING", days: number) {
  const workspace = await prisma.workspaces.findFirstOrThrow({ where: { organization_id: t.organizationId } })
  const j = await prisma.generation_jobs.create({
    data: { organization_id: t.organizationId, workspace_id: workspace.id, user_id: t.userId, feature: "vision.analyze", payload: {}, status, completed_at: status === "PROCESSING" ? null : ago(days) },
  })
  await prisma.job_events.create({ data: { organization_id: t.organizationId, job_id: j.id, seq: 1, event: "done", payload: {} } })
  await prisma.$executeRaw`UPDATE "generation_jobs" SET updated_at = ${ago(days)} WHERE id = ${j.id}`
  await prisma.usage.create({ data: { organization_id: t.organizationId, workspace_id: workspace.id, user_id: t.userId, job_id: j.id, feature: "vision.analyze", status: "COMPLETED" } })
  return j.id
}

describe("dọn job đã xong lâu ngày", () => {
  let a: Tenant
  let held: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("don-job-a")
    held = await createTenant("don-job-giu")
    await prisma.organizations.update({ where: { id: held.organizationId }, data: { legal_hold_until: new Date(NOW.getTime() + 30 * DAY) } })
    await prisma.retention_policies.deleteMany({})
    await prisma.retention_policies.create({ data: { category: "finished_jobs", retention_months: 1, action: "DELETE", enforce: true } })
  })

  afterAll(async () => {
    await prisma.retention_policies.updateMany({ data: { enforce: false } })
    await disconnectDatabase()
  })

  it("xoá job xong / lỗi quá hạn cùng nhật ký; giữ job đang chạy, job mới, usage, tổ chức legal hold", async () => {
    const oldDone = await job(a, "COMPLETED", 60)
    const oldFailed = await job(a, "FAILED", 45)
    const recent = await job(a, "COMPLETED", 5)
    const running = await job(a, "PROCESSING", 60)
    const heldJob = await job(held, "COMPLETED", 60)

    const [row] = await runRetentionSweep(NOW)
    expect(row).toMatchObject({ category: "finished_jobs", enforced: true, rows: 2 })

    for (const id of [oldDone, oldFailed]) {
      expect(await prisma.generation_jobs.findUnique({ where: { id } })).toBeNull()
      expect(await prisma.job_events.count({ where: { job_id: id } })).toBe(0)
      expect(await prisma.usage.count({ where: { job_id: id } })).toBe(1)
    }
    for (const id of [recent, running, heldJob]) expect(await prisma.generation_jobs.findUnique({ where: { id } })).not.toBeNull()
  })
})
