import { conflict, notFound } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { canCancel, canRetry } from "../domain/post-lifecycle"
import { channelStatuses, type ChannelStatusRow } from "../infra/channel-connections"
import { getSocialPostRepository, type SocialPostRepository } from "../infra/social-post-repository"
import { toPostView, type SocialPostView } from "./post-view"

/** Danh sách bài đăng của tổ chức (J5), mới trước; lọc theo trạng thái / lượt bài nguồn. */
export async function listPosts(
  ctx: TenantContext,
  opts: { limit: number; cursor?: string | undefined; status?: string | undefined; contentGenerationId?: string | undefined },
  repo: SocialPostRepository = getSocialPostRepository(),
): Promise<{ data: SocialPostView[]; next_cursor: string | null }> {
  requireCapability(ctx, "J5")
  const rows = await repo.list(ctx, opts)
  const more = rows.length > opts.limit
  const page = more ? rows.slice(0, opts.limit) : rows
  return { data: page.map(toPostView), next_cursor: more ? (page[page.length - 1]?.id ?? null) : null }
}

/** Huỷ bài đang chờ (J5). Bài tổ chức khác → 404; đã bắt đầu đăng → 409. */
export async function cancelPost(ctx: TenantContext, id: string, repo: SocialPostRepository = getSocialPostRepository()): Promise<SocialPostView> {
  requireCapability(ctx, "J5")
  const post = await repo.findById(ctx, id)
  if (!post) throw notFound()
  if (!canCancel(post.status) || !(await repo.cancel(ctx, id))) throw conflict("Bài đã bắt đầu đăng hoặc đã xong — không huỷ được")
  await recordAuditLog(ctx, { action: "social_post.cancel", entityType: "social_posts", entityId: id, before: { status: post.status }, after: { status: "CANCELED" } })
  return toPostView({ ...post, status: "CANCELED", next_attempt_at: null })
}

/** Thử lại bài đã dừng vì lỗi (J5) — đăng ngay ở lượt kế tiếp, đủ lượt thử mới. */
export async function retryPost(ctx: TenantContext, id: string, repo: SocialPostRepository = getSocialPostRepository(), now: Date = new Date()): Promise<SocialPostView> {
  requireCapability(ctx, "J5")
  const post = await repo.findById(ctx, id)
  if (!post) throw notFound()
  if (!canRetry(post.status) || !(await repo.retry(ctx, id, now))) throw conflict("Chỉ thử lại được bài đã dừng vì lỗi")
  await recordAuditLog(ctx, { action: "social_post.retry", entityType: "social_posts", entityId: id, before: { status: post.status }, after: { status: "QUEUED" } })
  return toPostView({ ...post, status: "QUEUED", attempt_count: 0, next_attempt_at: now, last_error_code: null, last_error_message: null })
}

export interface ChannelStatusView {
  readonly channel: string
  readonly connected: boolean
  readonly status: string | null
  readonly display_name: string | null
  readonly expires_at: string | null
}

/** Trạng thái kết nối 4 kênh (J5 — người đăng bài cần biết kênh nào sẵn sàng; không trả khoá). */
export async function listChannelStatuses(ctx: TenantContext, read: (c: TenantContext) => Promise<ChannelStatusRow[]> = channelStatuses): Promise<ChannelStatusView[]> {
  requireCapability(ctx, "J5")
  return (await read(ctx)).map((r) => ({ channel: r.channel, connected: r.connected, status: r.status, display_name: r.displayName, expires_at: r.expiresAt }))
}
