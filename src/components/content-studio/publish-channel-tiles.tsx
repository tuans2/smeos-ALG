"use client"

import { Tile, TilePill, type TilePillTone } from "@/components/brand-kit/tiles/tile"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import type { ChannelStatusView } from "./publish-api"
import { channelLabel } from "./use-channel-posts"

const ORDER = ["facebook", "instagram", "zalo", "tiktok"] as const

function stateOf(c: ChannelStatusView | undefined, hasPost: boolean): { tone: TilePillTone; pill: string; hint: string; action: "connect" | "reconnect" | null } {
  // Đã kết nối thì đăng được ngay (khoá đã có), kể cả khi khoá ứng dụng đang tạm thiếu
  if (c?.connected) {
    return hasPost
      ? { tone: "ok", pill: "Sẵn sàng", hint: c.display_name ?? "Đã kết nối", action: null }
      : { tone: "muted", pill: "Chưa có bài", hint: `${c.display_name ?? "Đã kết nối"} — chưa có bài duyệt cho kênh này ở Bước 3.`, action: null }
  }
  if (!c?.app_configured) return { tone: "muted", pill: "Chưa mở", hint: "Hệ thống chưa mở kênh này — liên hệ quản trị để đăng ký ứng dụng.", action: null }
  if (c.status === "EXPIRED" || c.status === "ERROR") return { tone: "need", pill: "Hết hạn kết nối", hint: "Kết nối lại để tiếp tục đăng.", action: "reconnect" }
  return { tone: "need", pill: "Chưa kết nối", hint: "Kết nối một lần, sau đó hệ thống tự đăng.", action: "connect" }
}

/**
 * Bước 4 — 4 ô kênh: trạng thái kết nối + chọn kênh để đăng. Kênh chưa kết nối / hết hạn có nút kết nối ngay trong ô
 * (W2 — người không có quyền thấy lời nhắc nhờ quản lý). Chỉ chọn được kênh đã kết nối VÀ có bài đã duyệt.
 */
export function PublishChannelTiles({
  channels, approvedChannels, selected, onToggle, onConnect, busy,
}: {
  channels: readonly ChannelStatusView[]
  approvedChannels: readonly string[]
  selected: readonly string[]
  onToggle: (ch: string) => void
  onConnect: (ch: string) => void
  busy: boolean
}) {
  const canConnect = useSession().can("W2")
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ORDER.map((ch) => {
        const c = channels.find((x) => x.channel === ch)
        const st = stateOf(c, approvedChannels.includes(ch))
        const ready = Boolean(c?.connected) && approvedChannels.includes(ch)
        const on = selected.includes(ch)
        return (
          <Tile
            key={ch}
            title={channelLabel(ch)}
            className="min-h-0"
            tone={on ? "selected" : st.action ? "need" : "default"}
            pill={<TilePill tone={on ? "primary" : st.tone}>{on ? "Sẽ đăng" : st.pill}</TilePill>}
            preview={st.hint}
            {...(ready ? { onOpen: () => onToggle(ch) } : {})}
            footer={ready ? (on ? "Bấm để bỏ chọn" : "Bấm để chọn") : undefined}
            footerAction={st.action && canConnect ? (
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onConnect(ch)}>
                {st.action === "reconnect" ? "Kết nối lại" : "Kết nối"}
              </Button>
            ) : st.action ? <span className="text-caption text-text-muted">Nhờ quản lý kết nối</span> : undefined}
          />
        )
      })}
    </div>
  )
}
