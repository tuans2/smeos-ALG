import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"

const findById = vi.fn()
vi.mock("@/modules/jobs/infra/generation-job-repository", () => {
  const mocked = {
    GenerationJobRepository: vi.fn().mockImplementation(function () { return { findById } }),
  }
  return { ...mocked, getGenerationJobRepository: vi.fn(() => new mocked.GenerationJobRepository()) }
})

import { readStoryContext } from "@/modules/content-engine/infra/read-story-context"
import { buildRuleScenePlan, SCENE_PLAN_FEATURE, type ScenePlanInput } from "@/modules/creative-production/domain/scene-plan-rules"

const ctx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["I1"]),
}

const brief: ScenePlanInput = {
  mode: "AUTHENTIC",
  productName: "Bó hoa",
  colors: [],
  components: [],
  occasions: [],
  topic: { id: "t-1", title: "Bó hoa sinh nhật tone vàng" },
}
const plan = buildRuleScenePlan(brief)

describe("readStoryContext", () => {
  it("không truyền scenePlanId: null", async () => {
    expect(await readStoryContext(ctx, null)).toBeNull()
  })

  it("không tìm thấy job: null", async () => {
    findById.mockResolvedValue(null)
    expect(await readStoryContext(ctx, "scene-1")).toBeNull()
  })

  it("job khác feature creative.scene_plan: null", async () => {
    findById.mockResolvedValue({ feature: "khac", status: "COMPLETED", output: plan })
    expect(await readStoryContext(ctx, "scene-1")).toBeNull()
  })

  it("job chưa xong (PENDING): null", async () => {
    findById.mockResolvedValue({ feature: SCENE_PLAN_FEATURE, status: "PENDING", output: null })
    expect(await readStoryContext(ctx, "scene-1")).toBeNull()
  })

  it("job xong: lắp đúng logline/hook/cta/sceneLines từ kịch bản", async () => {
    findById.mockResolvedValue({ feature: SCENE_PLAN_FEATURE, status: "COMPLETED", output: plan })
    const story = await readStoryContext(ctx, "scene-1")
    expect(story?.scenePlanId).toBe("scene-1")
    expect(story?.mode).toBe("AUTHENTIC")
    // buildRuleScenePlan không nhận raw.story và topic không có hook/cta riêng nên
    // logline luôn rỗng ("") và hook/cta rơi về mặc định rỗng/CTA chung — reader coi
    // rỗng là "không có", trả null thay vì bịa chuỗi rỗng (quy ước Brief).
    expect(plan.story.logline).toBe("")
    expect(story?.logline).toBeNull()
    expect(plan.story.hook).toBe("")
    expect(story?.hook).toBeNull()
    expect(story?.cta).toBe(plan.story.cta || null)
    expect(story?.sceneLines?.length).toBe(plan.scenes.length)
  })
})
