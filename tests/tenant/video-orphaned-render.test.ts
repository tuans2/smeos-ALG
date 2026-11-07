import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { scanStuckJobs } from "@/modules/jobs/use-cases/scan-stuck-jobs"
import { canStartRender } from "@/modules/video-studio/domain/video-approval-rules"
import { CreateVideoJobUseCase } from "@/modules/video-studio/use-cases/create-video-job"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * UJ-03 (audit hành trình 06/11/2026, V1): worker chết giữa chừng → bộ quét job treo đánh `generation_jobs = FAILED`
 * nhưng `video_jobs` giữ `RENDERING` mãi, nút dựng lại bị chặn. Nay lượt quét đánh lỗi video không còn job chạy.
 */
describe("lượt quét job treo giải phóng video kẹt RENDERING", () => {
  let a: Tenant
  const now = new Date()
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000)

  async function renderingVideo(updatedAt: Date): Promise<string> {
    const job = await new CreateVideoJobUseCase().execute(
      { ...a.ctx, capabilities: new Set(["I1", "I2"]) },
      { title: "Video thử", format: "REEL_15S" }
    )
    await prisma.$executeRaw`UPDATE "video_jobs" SET "stage" = 'RENDERING', "updated_at" = ${updatedAt} WHERE "id" = ${job.id}`
    return job.id
  }

  async function renderJob(videoJobId: string, status: "PENDING" | "PROCESSING", startedAt: Date | null) {
    await prisma.generation_jobs.create({
      data: {
        id: randomUUID(),
        organization_id: a.organizationId,
        workspace_id: a.ctx.workspaceId,
        user_id: a.userId,
        feature: "video.render",
        status,
        started_at: startedAt,
        payload: { videoJobId },
      },
    })
  }

  const stageOf = async (id: string) => (await prisma.video_jobs.findUniqueOrThrow({ where: { id } })).stage

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("video")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("job dựng treo quá 15 phút → job FAILED và video FAILED, dựng lại được", async () => {
    const id = await renderingVideo(minutesAgo(20))
    await renderJob(id, "PROCESSING", minutesAgo(20))

    await scanStuckJobs(now)

    expect(await stageOf(id)).toBe("FAILED")
    const video = await prisma.video_jobs.findUniqueOrThrow({ where: { id } })
    expect(canStartRender({ stage: "FAILED", scriptApproval: "APPROVED" }).allowed).toBe(true)
    expect(video.error_message).toBeTruthy()
  })

  it("video RENDERING không có job nào (đưa hàng đợi lỗi) quá 15 phút → FAILED", async () => {
    const id = await renderingVideo(minutesAgo(30))
    await scanStuckJobs(now)
    expect(await stageOf(id)).toBe("FAILED")
  })

  it("không đụng video còn job đang chờ/đang chạy hoặc vừa bắt đầu dựng", async () => {
    const waiting = await renderingVideo(minutesAgo(40))
    await renderJob(waiting, "PENDING", null)
    const running = await renderingVideo(minutesAgo(5))
    await renderJob(running, "PROCESSING", minutesAgo(5))
    const fresh = await renderingVideo(minutesAgo(2))

    await scanStuckJobs(now)

    expect(await stageOf(waiting)).toBe("RENDERING")
    expect(await stageOf(running)).toBe("RENDERING")
    expect(await stageOf(fresh)).toBe("RENDERING")
  })
})
