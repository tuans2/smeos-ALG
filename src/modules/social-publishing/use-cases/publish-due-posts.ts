import { log } from "@/core/observability/log"
import type { ChannelCredential, PublishResult, PublisherProvider, SocialChannel } from "@/core/ports/publisher-provider"
import { publisherFor } from "../adapters"
import { CHANNEL_RULES, composeCaption, titleFrom } from "../domain/channel-rules"
import { isSocialChannel, outcomeAfterFailure } from "../domain/post-lifecycle"
import { findActiveConnection, markConnectionExpired, type ActiveConnection, type CredentialBundle } from "../infra/channel-connections"
import { signedMediaUrls } from "../infra/post-media"
import { getSocialPostRepository, type SocialPostRepository, type SocialPostRow } from "../infra/social-post-repository"

/** Mỗi lượt cron (5 phút, chung lượt Trung tâm Tích hợp) đăng tối đa 20 bài — lượt có trần thời gian 60 giây. */
export const MAX_POSTS_PER_SWEEP = 20
/** Coi token sắp hết hạn trong 5 phút là đã hết — làm mới trước khi đăng. */
const EXPIRY_SKEW_MS = 5 * 60_000

export interface PublishDeps {
  readonly now: () => Date
  readonly repo: SocialPostRepository
  readonly connection: (organizationId: string, channel: SocialChannel) => Promise<ActiveConnection | null>
  readonly markExpired: (connectionId: string, code: string) => Promise<void>
  readonly media: (organizationId: string, assetIds: readonly string[]) => Promise<string[]>
  readonly publisher: (channel: SocialChannel) => PublisherProvider
  /** Làm mới access token (Zalo / TikTok); `null` = không làm mới được → coi như hết hạn. Gắn ở đợt kết nối OAuth. */
  readonly refresh: (conn: ActiveConnection) => Promise<CredentialBundle | null>
}

export const defaultPublishDeps = (): PublishDeps => ({
  now: () => new Date(),
  repo: getSocialPostRepository(),
  connection: findActiveConnection,
  markExpired: markConnectionExpired,
  media: signedMediaUrls,
  publisher: (channel) => publisherFor(channel),
  refresh: async () => null,
})

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])

async function credentialFor(conn: ActiveConnection, deps: PublishDeps, now: Date): Promise<ChannelCredential | null> {
  const exp = conn.bundle.access_expires_at ? Date.parse(conn.bundle.access_expires_at) : Number.NaN
  if (Number.isNaN(exp) || exp - now.getTime() > EXPIRY_SKEW_MS) return { accessToken: conn.bundle.access_token, accountId: conn.accountId }
  const fresh = await deps.refresh(conn)
  return fresh ? { accessToken: fresh.access_token, accountId: conn.accountId } : null
}

async function publishOne(post: SocialPostRow, deps: PublishDeps, now: Date): Promise<PublishResult> {
  if (!isSocialChannel(post.channel)) return { ok: false, kind: "NEEDS_ACTION", code: "UNKNOWN_CHANNEL", message: "Kênh không còn được hỗ trợ" }
  const label = CHANNEL_RULES[post.channel].label
  const conn = await deps.connection(post.organization_id, post.channel)
  if (!conn) return { ok: false, kind: "NEEDS_ACTION", code: "NOT_CONNECTED", message: `Chưa kết nối ${label} — kết nối kênh rồi bấm thử lại` }
  const cred = await credentialFor(conn, deps, now)
  if (!cred) {
    await deps.markExpired(conn.id, "TOKEN_EXPIRED")
    return { ok: false, kind: "NEEDS_ACTION", code: "TOKEN_EXPIRED", message: `Kết nối ${label} đã hết hạn — kết nối lại để tiếp tục đăng` }
  }
  const imageUrls = await deps.media(post.organization_id, strings(post.media_asset_ids))
  const result = await deps.publisher(post.channel).publish(
    { caption: composeCaption(post.text, strings(post.hashtags)), title: titleFrom(post.text, post.channel), imageUrls },
    cred,
  )
  if (!result.ok && result.code === "TOKEN_EXPIRED") await deps.markExpired(conn.id, result.code)
  return result
}

/**
 * Lượt cron đăng các bài đến hạn (xuyên tổ chức, ngữ cảnh hệ thống — route `/api/v1/internal/*`): trả bài treo về hàng
 * đợi, nhận việc từng bài (khoá theo số lần thử nên hai tiến trình không đăng trùng), đăng qua API chính thức bằng kết
 * nối của CHÍNH tổ chức sở hữu bài, ghi nhật ký từng lần thử. Lỗi tạm thời → thử lại có giới hạn; lỗi cần người xử lý
 * → dừng, hiện lý do. Không bao giờ ghi khoá ra log.
 */
export async function publishDuePosts(deps: PublishDeps = defaultPublishDeps()): Promise<{ published: number; retrying: number; failed: number; recovered: number }> {
  const now = deps.now()
  const tally = { published: 0, retrying: 0, failed: 0, recovered: await deps.repo.recoverStuck(now) }
  const due = await deps.repo.listDue(now, MAX_POSTS_PER_SWEEP)

  for (const post of due) {
    if (!(await deps.repo.claim(post.id, post.attempt_count))) continue
    const attemptNo = post.attempt_count + 1
    const started = Date.now()
    let result: PublishResult
    try {
      result = await publishOne(post, deps, now)
    } catch (e) {
      log.warn("social_publish.unexpected", { feature: "social-publishing", postId: post.id, error: e instanceof Error ? e.name : "unknown" })
      result = { ok: false, kind: "RETRYABLE", code: "INTERNAL", message: "Lỗi hệ thống khi đăng — sẽ thử lại" }
    }
    const duration = Date.now() - started

    if (result.ok) {
      await deps.repo.finish(post, attemptNo, { kind: "PUBLISHED", externalId: result.externalId, url: result.url, at: deps.now() }, duration)
      tally.published++
      continue
    }
    const next = outcomeAfterFailure(result.kind, attemptNo, now)
    if (next.status === "QUEUED") {
      await deps.repo.finish(post, attemptNo, { kind: "RETRY", code: result.code, message: result.message, nextAttemptAt: next.nextAttemptAt }, duration)
      tally.retrying++
    } else {
      await deps.repo.finish(post, attemptNo, { kind: "FAILED", code: result.code, message: result.message }, duration)
      tally.failed++
    }
  }
  if (due.length) log.info("social_publish.sweep", { feature: "social-publishing", ...tally })
  return tally
}
