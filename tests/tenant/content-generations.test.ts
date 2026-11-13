import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"
import { POST as approveRoute } from "@/app/api/v1/content-engine/generations/[id]/approve/route"
import { ContentGenerationRepository } from "@/modules/content-engine/infra/content-generation-repository"

// Content Engine (P27, 25/09/2026) — bảng TENANT mới `content_generations`.

const CHANNELS = ["facebook", "zalo"]
const BRIEF = { briefVersion: 1, product: { name: "Bó hoa hồng đỏ" } }
const PROMPT_VERSIONS = { strategist: "v1", writer: "v1", critic: "v1", rewriter: "v1" }
const POSTS = [{ channel: "facebook", text: "Bài Facebook", hashtags: ["#hoa"], factIds: ["F1"] }]

describe("cách ly tenant — content_generations (kết quả Content Engine)", () => {
  let a: Tenant
  let b: Tenant
  let repo: ContentGenerationRepository

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    repo = new ContentGenerationRepository()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const seed = (t: Tenant, overrides: Partial<Parameters<ContentGenerationRepository["create"]>[1]> = {}) =>
    repo.create(t.ctx, {
      origin: "content_engine_ui",
      assetId: "asset-1",
      topicId: "topic-1",
      mode: "AUTHENTIC",
      channels: CHANNELS,
      brief: BRIEF,
      briefVersion: 1,
      promptVersions: PROMPT_VERSIONS,
      rubricVersion: "v1",
      posts: POSTS,
      createdBy: t.ctx.userId,
      ...overrides,
    })

  it("tạo bản ghi và gán đúng organization_id từ TenantContext", async () => {
    const created = await seed(a)
    expect(created.organization_id).toBe(a.ctx.organizationId)
    expect(created.status).toBe("DRAFT")
    expect(await prisma.content_generations.count({ where: { organization_id: a.ctx.organizationId } })).toBe(1)
  })

  it("tổ chức khác không đọc được bằng findById", async () => {
    const created = await seed(a)
    expect(await repo.findById(b.ctx, created.id)).toBeNull()
    expect(await repo.findById(a.ctx, created.id)).not.toBeNull()
  })

  it("findLatest chỉ thấy bản ghi của tổ chức mình, lấy bản mới nhất theo (asset, topic, mode)", async () => {
    await seed(a)
    await new Promise((r) => setTimeout(r, 5))
    const newer = await seed(a)
    await seed(b)

    const latestA = await repo.findLatest(a.ctx, { assetId: "asset-1", topicId: "topic-1", mode: "AUTHENTIC" })
    expect(latestA?.id).toBe(newer.id)

    const latestB = await repo.findLatest(b.ctx, { assetId: "asset-1", topicId: "topic-1", mode: "AUTHENTIC" })
    expect(latestB?.organization_id).toBe(b.ctx.organizationId)
    expect(latestB?.id).not.toBe(newer.id)
  })

  it("approve không sửa được bản ghi của tổ chức khác", async () => {
    const created = await seed(a)
    const result = await repo.approve(b.ctx, created.id, { approvedBy: b.ctx.userId, approvedPosts: POSTS })
    expect(result).toBeNull()

    const stillDraft = await repo.findById(a.ctx, created.id)
    expect(stillDraft?.status).toBe("DRAFT")
  })

  it("approve rồi markScheduled cập nhật đúng trạng thái cho tổ chức của mình", async () => {
    const created = await seed(a)
    const approved = await repo.approve(a.ctx, created.id, { approvedBy: a.ctx.userId, approvedPosts: POSTS })
    expect(approved?.status).toBe("APPROVED")
    expect(approved?.approved_by).toBe(a.ctx.userId)

    const scheduled = await repo.markScheduled(a.ctx, created.id, { facebook: "sf-post-1" })
    expect(scheduled?.status).toBe("SCHEDULED")
    expect(scheduled?.social_post_ids).toEqual({ facebook: "sf-post-1" })
  })

  describe("POST /api/v1/content-engine/generations/:id/approve (J5)", () => {
    const BASE = "http://localhost/api/v1/content-engine/generations"
    const approve = (t: Tenant, id: string, body: unknown = {}) =>
      approveRoute(withSession(`${BASE}/${id}/approve`, t.token, { method: "POST", body: JSON.stringify(body) }), {
        params: Promise.resolve({ id }),
      })

    it("duyệt kèm bản sửa: APPROVED, approved_posts đúng, ghi audit_logs cùng giao dịch", async () => {
      const created = await seed(a)
      const res = await approve(a, created.id, { posts: [{ channel: "facebook", text: "Bài Facebook đã sửa" }] })
      expect(res.status).toBe(200)
      const data = (await readJson(res)) as { status: string; approved_posts: Array<{ channel: string; text: string; edited: boolean }> }
      expect(data.status).toBe("APPROVED")
      expect(data.approved_posts).toEqual([{ channel: "facebook", text: "Bài Facebook đã sửa", hashtags: ["#hoa"], edited: true }])

      const inDb = await repo.findById(a.ctx, created.id)
      expect(inDb?.approved_by).toBe(a.userId)
      const log = await prisma.audit_logs.findFirst({
        where: { organization_id: a.organizationId, action: "content_generation.approve", entity_id: created.id },
      })
      expect(log).not.toBeNull()
    })

    it("tổ chức khác duyệt bản ghi của A trả 404, bản ghi vẫn DRAFT", async () => {
      const created = await seed(a)
      const res = await approve(b, created.id)
      expect(res.status).toBe(404)
      expect((await repo.findById(a.ctx, created.id))?.status).toBe("DRAFT")
    })

    it("kênh không có trong lượt sinh trả 400; đã SCHEDULED trả 409", async () => {
      const created = await seed(a)
      expect((await approve(a, created.id, { posts: [{ channel: "tiktok" }] })).status).toBe(400)

      await repo.markScheduled(a.ctx, created.id, { facebook: "sf-1" })
      expect((await approve(a, created.id)).status).toBe(409)
    })
  })
})
