import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { JobEventRepository } from "@/modules/jobs/infra/job-event-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Hoàn thiện CSDL đợt 1a (rà soát 05/11/2026): dòng con mang `organization_id`
 * riêng và khoá ghép `(cha_id, organization_id)` về bảng cha. Postgres — không
 * phải tầng ứng dụng — từ chối dòng con khác tổ chức với cha.
 */
describe("toàn vẹn tenant ở tầng CSDL", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function jobOf(tenant: Tenant) {
    const workspace = await prisma.workspaces.findFirstOrThrow({ where: { organization_id: tenant.organizationId } })
    return prisma.generation_jobs.create({
      data: {
        organization_id: tenant.organizationId,
        workspace_id: workspace.id,
        user_id: tenant.userId,
        feature: "vision.analyze",
        payload: {},
      },
    })
  }

  it("job_events: chép organization_id từ job cha", async () => {
    const job = await jobOf(a)
    const event = await new JobEventRepository().append(job.id, "stage", { stage: "x" })
    expect(event.organization_id).toBe(a.organizationId)
  })

  it("job_events: từ chối dòng mang tổ chức khác job cha", async () => {
    const job = await jobOf(a)
    await expect(
      prisma.job_events.create({
        data: { job_id: job.id, organization_id: b.organizationId, seq: 1, event: "stage", payload: {} },
      })
    ).rejects.toThrow()
  })

  it("video_scenes: từ chối cảnh mang tổ chức khác video cha", async () => {
    const video = await prisma.video_jobs.create({
      data: { organization_id: a.organizationId, title: "t", format: "REEL_15S" },
    })
    await expect(
      prisma.video_scenes.create({
        data: { video_job_id: video.id, organization_id: b.organizationId, scene_index: 1 },
      })
    ).rejects.toThrow()
  })

  it("internal_chat_messages: từ chối tin mang tổ chức khác hội thoại", async () => {
    const conversation = await prisma.internal_chat_conversations.create({
      data: { organization_id: a.organizationId, conversation_type: "PLATFORM_TENANT", created_by: a.userId },
    })
    await expect(
      prisma.internal_chat_messages.create({
        data: {
          conversation_id: conversation.id,
          organization_id: b.organizationId,
          sender_user_id: b.userId,
          sender_role: "MEMBER",
        },
      })
    ).rejects.toThrow()
  })

  it("brand_library_versions: từ chối phiên bản mang tổ chức khác mục cha", async () => {
    const item = await prisma.brand_library_items.create({
      data: { organization_id: a.organizationId, title: "Logo", category: "LOGO", created_by: a.userId },
    })
    await expect(
      prisma.brand_library_versions.create({
        data: { item_id: item.id, organization_id: b.organizationId, version: 1, created_by: b.userId },
      })
    ).rejects.toThrow()
  })

  it("sessions, roles, brand_library_versions có khoá ngoại về organizations (nợ #8)", async () => {
    const rows = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
       WHERE contype = 'f' AND conname IN (
         'sessions_organization_id_fkey', 'roles_organization_id_fkey',
         'brand_library_versions_organization_id_fkey')`
    expect(rows.map((r) => r.conname).sort()).toEqual([
      "brand_library_versions_organization_id_fkey",
      "roles_organization_id_fkey",
      "sessions_organization_id_fkey",
    ])
  })

  it("roles: không nhận organization_id trỏ tới tổ chức không tồn tại", async () => {
    await expect(
      prisma.roles.create({ data: { organization_id: "khong-ton-tai", key: "x", name: "X" } })
    ).rejects.toThrow()
  })
})
