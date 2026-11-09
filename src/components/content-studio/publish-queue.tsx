"use client"

import { TilePill, type TilePillTone } from "@/components/brand-kit/tiles/tile"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { formatDateTime } from "@/lib/i18n/formatters"
import type { SocialPostView } from "./publish-api"
import { channelLabel } from "./use-channel-posts"

const STATUS: Readonly<Record<string, { tone: TilePillTone; text: string }>> = {
  QUEUED: { tone: "primary", text: "Chờ đăng" },
  PUBLISHING: { tone: "primary", text: "Đang đăng" },
  PUBLISHED: { tone: "ok", text: "Đã đăng" },
  FAILED: { tone: "need", text: "Chưa đăng được" },
  CANCELED: { tone: "muted", text: "Đã huỷ" },
}

/** Hàng đợi bài của lượt bài đang chọn: trạng thái, giờ, lý do lỗi bằng lời dễ hiểu, huỷ / thử lại / xem bài. */
export function PublishQueue({
  posts, busy, canManage, onCancel, onRetry, onReload,
}: {
  posts: readonly SocialPostView[]
  busy: boolean
  canManage: boolean
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onReload: () => void
}) {
  if (posts.length === 0) return null
  return (
    <section aria-label="Bài đã gửi đăng" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body font-semibold text-text">Bài đã gửi đăng</p>
        <Button type="button" variant="ghost" size="sm" onClick={onReload}><RefreshCw size={14} aria-hidden /> Tải lại</Button>
      </div>
      <ul className="divide-y divide-border/60 rounded-2xl bg-surface shadow-sm ring-1 ring-border/70">
        {posts.map((p) => {
          const st = STATUS[p.status] ?? { tone: "muted" as const, text: p.status }
          const when = p.status === "PUBLISHED" && p.published_at ? `Đã đăng ${formatDateTime(p.published_at)}`
            : p.status === "QUEUED" ? `Hẹn ${formatDateTime(p.next_attempt_at ?? p.scheduled_at)}${p.attempt_count > 0 ? ` · thử lại lần ${p.attempt_count + 1}` : ""}`
              : formatDateTime(p.scheduled_at)
          return (
            <li key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-sm font-bold text-text">{channelLabel(p.channel)}</span>
                  <TilePill tone={st.tone}>{st.text}</TilePill>
                  <span className="text-caption text-text-muted">{when}</span>
                </div>
                <p className="line-clamp-1 text-caption text-text-muted">{p.text}</p>
                {p.error_message && p.status !== "PUBLISHED" && <p className="text-caption text-warning-text">{p.error_message}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                {p.external_url && (
                  <a href={p.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline">
                    Xem bài <ExternalLink size={12} aria-hidden />
                  </a>
                )}
                {canManage && p.status === "QUEUED" && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onCancel(p.id)}>Huỷ</Button>}
                {canManage && p.status === "FAILED" && <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onRetry(p.id)}>Thử lại</Button>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
