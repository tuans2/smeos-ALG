import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { SocialChannel } from "@/core/ports/publisher-provider"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { CHANNEL_RULES, validatePost } from "../domain/channel-rules"
import { planTimes, type ScheduleMode } from "../domain/schedule"
import { channelStatuses, type ChannelStatusRow } from "../infra/channel-connections"
import { productImageAssetIds } from "../infra/post-media"
import { getSocialPostRepository, type SocialPostRepository } from "../infra/social-post-repository"
import { toPostView, type SocialPostView } from "./post-view"

export interface SchedulePostsInput {
  readonly generationId: string
  readonly channels: readonly SocialChannel[]
  readonly mode: ScheduleMode
  readonly idempotencyKey: string
}

export interface ScheduleDeps {
  readonly now: () => Date
  readonly statuses: (ctx: TenantContext) => Promise<ChannelStatusRow[]>
  readonly media: (organizationId: string, productId: string, max: number) => Promise<string[]>
  readonly repo: SocialPostRepository
}

export const defaultScheduleDeps = (): ScheduleDeps => ({
  now: () => new Date(),
  statuses: channelStatuses,
  media: productImageAssetIds,
  repo: getSocialPostRepository(),
})

type ApprovedPost = { channel: string; text: string; hashtags: string[] }

function approvedPostsOf(v: unknown): ApprovedPost[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>
    if (typeof r.channel !== "string" || typeof r.text !== "string") return []
    return [{ channel: r.channel, text: r.text, hashtags: Array.isArray(r.hashtags) ? r.hashtags.filter((h): h is string => typeof h === "string") : [] }]
  })
}

/**
 * Lên lịch đăng các bài ĐÃ DUYỆT ở Bước 3 lên các kênh đã chọn (J5): kiểm kênh đã kết nối, luật từng nền tảng và
 * an toàn nội dung TRƯỚC khi vào hàng đợi; chọn giờ theo chế độ (đăng ngay / tự lên lịch / giờ hẹn). Mỗi kênh một bài,
 * khoá chống trùng `<khoá>:<kênh>` — gửi lại cùng khoá không tạo bài thứ hai.
 */
export async function schedulePosts(ctx: TenantContext, input: SchedulePostsInput, deps: ScheduleDeps = defaultScheduleDeps()): Promise<SocialPostView[]> {
  requireCapability(ctx, "J5")
  const channels = [...new Set(input.channels)]
  if (channels.length === 0) throw validationFailed({ channels: "Chọn ít nhất một kênh" })

  const generation = await prisma.content_generations.findFirst({
    where: scopedWhere(ctx, { id: input.generationId, trashed_at: null }),
    select: { id: true, status: true, product_id: true, approved_posts: true },
  })
  if (!generation) throw notFound()
  if (generation.status !== "APPROVED" && generation.status !== "SCHEDULED") throw conflict("Duyệt bài ở Bước 3 trước khi đăng")

  const approved = approvedPostsOf(generation.approved_posts)
  const missingPost = channels.filter((c) => !approved.some((p) => p.channel === c))
  if (missingPost.length) throw validationFailed({ channels: `Chưa có bài đã duyệt cho: ${missingPost.map((c) => CHANNEL_RULES[c].label).join(", ")}` })

  const statuses = await deps.statuses(ctx)
  const notConnected = channels.filter((c) => !statuses.find((s) => s.channel === c)?.connected)
  if (notConnected.length) throw conflict(`Chưa kết nối: ${notConnected.map((c) => CHANNEL_RULES[c].label).join(", ")} — kết nối kênh trước khi đăng`)

  const media = generation.product_id ? await deps.media(ctx.organizationId, generation.product_id, 35) : []
  const drafts = channels.map((channel) => {
    const post = approved.find((p) => p.channel === channel)!
    const images = media.slice(0, CHANNEL_RULES[channel].maxImages)
    return { channel, text: post.text, hashtags: post.hashtags, images }
  })
  const issues = drafts.flatMap((d) => validatePost({ channel: d.channel, text: d.text, hashtags: d.hashtags, imageCount: d.images.length }))
  if (issues.length) throw validationFailed({ posts: issues.join(" · ") })

  const plan = planTimes(input.mode, drafts.length, deps.now())
  if ("error" in plan) throw validationFailed({ scheduled_at: plan.error })

  const rows = await deps.repo.createMany(ctx, drafts.map((d, i) => ({
    contentGenerationId: generation.id,
    productId: generation.product_id,
    channel: d.channel,
    text: d.text,
    hashtags: d.hashtags,
    mediaAssetIds: d.images,
    scheduledAt: plan.times[i]!,
    idempotencyKey: `${input.idempotencyKey}:${d.channel}`,
  })))

  await prisma.content_generations.updateMany({
    where: scopedWhere(ctx, { id: generation.id }),
    data: { status: "SCHEDULED", social_post_ids: rows.map((r) => r.id) },
  })
  await recordAuditLog(ctx, {
    action: "social_post.schedule",
    entityType: "content_generations",
    entityId: generation.id,
    before: { status: generation.status },
    after: { status: "SCHEDULED", channels, mode: input.mode.kind, post_ids: rows.map((r) => r.id) },
  })
  return rows.map(toPostView)
}
