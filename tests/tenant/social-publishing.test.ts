import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as channelsGet } from "@/app/api/v1/social-publishing/channels/route"
import { POST as cancelRoute } from "@/app/api/v1/social-publishing/posts/[id]/cancel/route"
import { GET as postsGet, POST as postsPost } from "@/app/api/v1/social-publishing/posts/route"
import type { TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { PublishRequest, PublishResult } from "@/core/ports/publisher-provider"
import { sealCredential } from "@/modules/integration-hub/infra/credential-vault"
import { findActiveConnection, SOCIAL_CONNECTOR_KEYS } from "@/modules/social-publishing/infra/channel-connections"
import { cancelPost, retryPost } from "@/modules/social-publishing/use-cases/manage-posts"
import { defaultPublishDeps, publishDuePosts, type PublishDeps } from "@/modules/social-publishing/use-cases/publish-due-posts"
import { defaultScheduleDeps, schedulePosts } from "@/modules/social-publishing/use-cases/schedule-posts"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Bước 4 "Đăng tự động" (PO 08/11/2026, module social-publishing): lên lịch bài đã duyệt ở Bước 3 lên kênh ĐÃ KẾT NỐI
 * của chính tổ chức, chống đăng trùng, lượt cron đăng bằng khoá của tổ chức sở hữu bài, thử lại có giới hạn, lỗi cần
 * người xử lý dừng ngay. Tổ chức khác → 404. Nền tảng giả lập — không gọi mạng.
 */
describe("đăng bài tự động", () => {
  let a: Tenant
  let b: Tenant
  const can = (t: Tenant, codes = ["J5"]): TenantContext => ({ ...t.ctx, capabilities: new Set(codes) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("sp-a")
    b = await createTenant("sp-b")
  })
  afterAll(async () => disconnectDatabase())

  async function approvedGeneration(t: Tenant, channels = ["facebook", "zalo"]) {
    const product = await prisma.products.create({ data: { organization_id: t.organizationId, code: `SP-${randomUUID().slice(0, 6)}`, name: "Bó hồng", status: "ACTIVE" } })
    const asset = await prisma.assets.create({ data: { organization_id: t.organizationId, product_id: product.id, kind: "ORIGINAL", storage_key: `org/${t.organizationId}/${product.id}/a.jpg`, mime_type: "image/jpeg", created_by: t.userId } })
    const posts = channels.map((c) => ({ channel: c, text: `Bài ${c} — Bó hồng tươi`, hashtags: ["#bohong"] }))
    const g = await prisma.content_generations.create({
      data: {
        organization_id: t.organizationId, product_id: product.id, origin: "content_engine_ui", channels, brief: {}, brief_version: 1, prompt_versions: {},
        rubric_version: "v1", posts, approved_posts: posts, status: "APPROVED", created_by: t.userId,
      },
    })
    return { generationId: g.id, productId: product.id, assetId: asset.id }
  }

  async function connect(t: Tenant, channel: "facebook" | "zalo", token = `tok-${channel}-${t.organizationId.slice(0, 4)}`) {
    const key = SOCIAL_CONNECTOR_KEYS[channel]
    const sealed = sealCredential(key, JSON.stringify({ access_token: token }))
    await prisma.integration_connections.create({
      data: {
        organization_id: t.organizationId, connector_key: key, scope_tier: "STORE", external_account_id: `acc-${channel}`, display_name: `Trang ${channel}`,
        status: "ACTIVE", credential_encrypted: sealed.encrypted, credential_hint: sealed.hint, connection_ref: randomUUID(), created_by: t.userId,
      },
    })
  }

  const fixedNow = (d: Date) => ({ ...defaultScheduleDeps(), now: () => d })

  it("kênh chưa kết nối → 409 nêu rõ kênh; kết nối rồi → mỗi kênh một bài, gửi lại cùng khoá không tạo bài thứ hai", async () => {
    const { generationId } = await approvedGeneration(a)
    await connect(a, "facebook")
    await expect(schedulePosts(can(a), { generationId, channels: ["facebook", "zalo"], mode: { kind: "NOW" }, idempotencyKey: "k1" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Zalo") })

    await connect(a, "zalo")
    const first = await schedulePosts(can(a), { generationId, channels: ["facebook", "zalo"], mode: { kind: "NOW" }, idempotencyKey: "k1" })
    const again = await schedulePosts(can(a), { generationId, channels: ["facebook", "zalo"], mode: { kind: "NOW" }, idempotencyKey: "k1" })
    expect(first.map((p) => p.channel).sort()).toEqual(["facebook", "zalo"])
    expect(again.map((p) => p.id).sort()).toEqual(first.map((p) => p.id).sort())
    expect(first.every((p) => p.image_count === 1 && p.status === "QUEUED")).toBe(true)
    expect((await prisma.content_generations.findUniqueOrThrow({ where: { id: generationId } })).status).toBe("SCHEDULED")
    expect(await prisma.social_posts.count({ where: { organization_id: a.organizationId } })).toBe(2)
  })

  it("tự lên lịch: khung giờ vàng, các bài cách nhau 10 phút; giờ hẹn đã qua → 400", async () => {
    const { generationId } = await approvedGeneration(a)
    await connect(a, "facebook"); await connect(a, "zalo")
    const now = new Date("2026-11-08T03:00:00Z")
    const posts = await schedulePosts(can(a), { generationId, channels: ["facebook", "zalo"], mode: { kind: "AUTO" }, idempotencyKey: "auto" }, fixedNow(now))
    expect(posts.map((p) => p.scheduled_at)).toEqual(["2026-11-08T04:30:00.000Z", "2026-11-08T04:40:00.000Z"])
    await expect(schedulePosts(can(a), { generationId, channels: ["facebook"], mode: { kind: "AT", at: new Date("2026-11-07T00:00:00Z") }, idempotencyKey: "past" }, fixedNow(now)))
      .rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("lượt bài / bài đăng của tổ chức khác → 404; danh sách và trạng thái kênh chỉ của mình; thiếu J5 → bị chặn", async () => {
    const theirs = await approvedGeneration(b)
    await connect(b, "facebook")
    const theirPosts = await schedulePosts(can(b), { generationId: theirs.generationId, channels: ["facebook"], mode: { kind: "NOW" }, idempotencyKey: "b1" })

    const res = await postsPost(withSession("http://localhost/api/v1/social-publishing/posts", a.token, {
      method: "POST", headers: { "Idempotency-Key": "x" }, body: JSON.stringify({ content_generation_id: theirs.generationId, channels: ["facebook"], mode: "NOW" }),
    }))
    expect(res.status).toBe(404)
    const cancel = await cancelRoute(withSession(`http://localhost/api/v1/social-publishing/posts/${theirPosts[0]!.id}/cancel`, a.token, { method: "POST" }), { params: Promise.resolve({ id: theirPosts[0]!.id }) })
    expect(cancel.status).toBe(404)
    expect((await prisma.social_posts.findUniqueOrThrow({ where: { id: theirPosts[0]!.id } })).status).toBe("QUEUED")

    const list = (await readJson(await postsGet(withSession("http://localhost/api/v1/social-publishing/posts", a.token)))) as { data: unknown[] }
    expect(list.data).toEqual([])
    const ch = (await readJson(await channelsGet(withSession("http://localhost/api/v1/social-publishing/channels", a.token)))) as { data: Array<{ channel: string; connected: boolean }> }
    expect(ch.data.find((c) => c.channel === "facebook")?.connected).toBe(false)
    await expect(schedulePosts(can(a, ["I1"]), { generationId: theirs.generationId, channels: ["facebook"], mode: { kind: "NOW" }, idempotencyKey: "z" })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })

  it("lượt cron: đăng bằng khoá của CHÍNH tổ chức sở hữu bài, ghi nhật ký; lỗi tạm → thử lại; hết hạn kết nối → dừng + đánh dấu kết nối", async () => {
    const ga = await approvedGeneration(a, ["facebook"])
    const gb = await approvedGeneration(b, ["facebook"])
    await connect(a, "facebook", "tok-A"); await connect(b, "facebook", "tok-B")
    await schedulePosts(can(a), { generationId: ga.generationId, channels: ["facebook"], mode: { kind: "NOW" }, idempotencyKey: "a" })
    await schedulePosts(can(b), { generationId: gb.generationId, channels: ["facebook"], mode: { kind: "NOW" }, idempotencyKey: "b" })

    const seen: Array<{ token: string; req: PublishRequest }> = []
    const results: Record<string, PublishResult> = {
      "tok-A": { ok: true, externalId: "fb_1", url: "https://www.facebook.com/fb_1" },
      "tok-B": { ok: false, kind: "RETRYABLE", code: "RATE_LIMIT", message: "tạm giới hạn" },
    }
    const deps: PublishDeps = {
      ...defaultPublishDeps(),
      now: () => new Date(Date.now() + 1000),
      media: async (_org, ids) => ids.map((id) => `https://kho.example/${id}.jpg?sig=1`),
      publisher: (channel) => ({ channel, publish: async (req, cred) => { seen.push({ token: cred.accessToken, req }); return results[cred.accessToken]! } }),
    }
    const tally = await publishDuePosts(deps)
    expect(tally).toMatchObject({ published: 1, retrying: 1, failed: 0 })
    expect(seen.map((s) => s.token).sort()).toEqual(["tok-A", "tok-B"])
    expect(seen[0]!.req.caption).toContain("#bohong")

    const pa = await prisma.social_posts.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    expect(pa).toMatchObject({ status: "PUBLISHED", external_post_id: "fb_1", attempt_count: 1 })
    const pb = await prisma.social_posts.findFirstOrThrow({ where: { organization_id: b.organizationId } })
    expect(pb.status).toBe("QUEUED")
    expect(pb.next_attempt_at!.getTime()).toBeGreaterThan(Date.now())
    expect(await prisma.social_post_attempts.count()).toBe(2)

    // Lượt sau: B hết hạn kết nối → dừng, kết nối thành EXPIRED, không thử lại nữa
    results["tok-B"] = { ok: false, kind: "NEEDS_ACTION", code: "TOKEN_EXPIRED", message: "hết hạn" }
    await publishDuePosts({ ...deps, now: () => new Date(Date.now() + 2 * 3_600_000) })
    expect((await prisma.social_posts.findUniqueOrThrow({ where: { id: pb.id } })).status).toBe("FAILED")
    expect(await findActiveConnection(b.organizationId, "facebook")).toBeNull()

    // Thử lại tay: cấp lại đủ lượt; huỷ bài đã đăng → 409
    const retried = await retryPost(can(b), pb.id)
    expect(retried).toMatchObject({ status: "QUEUED", attempt_count: 0 })
    await expect(cancelPost(can(a), pa.id)).rejects.toMatchObject({ code: "CONFLICT" })
  })
})
