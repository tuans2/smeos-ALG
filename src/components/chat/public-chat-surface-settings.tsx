"use client"

import React, { useState } from "react"
import { PublicChatLimitRequest } from "./public-chat-limit-request"
import { MessageCircle } from "@/components/ui/icon-set/message-circle"
import { Switch } from "@/components/ui/switch"
import type { ChannelStatusItem } from "@/modules/chat-assistant/use-cases/list-chat-channels"
import {
  isSurfaceAllowed,
  surfaceChannel,
  toggleSurface,
  type PublicChatSurface,
} from "@/modules/chat-assistant/domain/public-chat-policy"

/** Loại trang đang có trang công khai thật — chỉ những trang này mới hiện công tắc. */
const SURFACE_OPTIONS: { surface: PublicChatSurface; label: string; hint: string }[] = [
  { surface: "catalog", label: "Catalog sản phẩm", hint: "Trang bộ sưu tập sản phẩm gửi cho khách" },
  { surface: "landing_page", label: "Landing page", hint: "Trang chiến dịch theo dịp lễ" },
  { surface: "store_profile", label: "Hồ sơ cửa hàng", hint: "Trang giới thiệu tiệm, gắn trên danh thiếp" },
  { surface: "sales_link", label: "Link bán hàng riêng", hint: "Link bộ sưu tập gửi riêng từng khách" },
  { surface: "greeting_catalog", label: "Bộ sưu tập công khai", hint: "Bộ sưu tập mở theo đường dẫn của tiệm" },
]

interface PublicChatSurfaceSettingsProps {
  channels: ChannelStatusItem[]
  onChanged: () => void
}

/** Chủ tiệm bật/tắt khung chat AI trên từng loại trang công khai do công cụ tạo ra. */
export function PublicChatSurfaceSettings({ channels, onChanged }: PublicChatSurfaceSettingsProps) {
  const [busy, setBusy] = useState<PublicChatSurface | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle(surface: PublicChatSurface, enabled: boolean) {
    const item = channels.find((c) => c.channel === surfaceChannel(surface))
    if (!item) return
    setBusy(surface)
    setError(null)
    try {
      const res = await fetch("/api/v1/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: item.channel,
          is_enabled: item.isEnabled,
          config: { ...item.config, publicSurfaces: toggleSurface(item.config, surface, enabled) },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error?.message || "Chưa lưu được thay đổi, vui lòng thử lại")
      } else {
        onChanged()
      }
    } catch {
      setError("Lỗi kết nối máy chủ")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-3 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-caption font-bold text-text">Khung chat AI trên trang của tiệm</h3>
          <p className="text-caption text-text-muted">
            Chọn những trang khách xem được trò chuyện với trợ lý. Tắt ở đây thì khung chat ẩn khỏi trang đó.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {SURFACE_OPTIONS.map(({ surface, label, hint }) => {
          const item = channels.find((c) => c.channel === surfaceChannel(surface))
          const channelOn = Boolean(item?.isEnabled && item.isSubscriptionActive)
          const checked = channelOn && isSurfaceAllowed(item?.config, surface)
          const id = `public-chat-${surface}`
          return (
            <li key={surface} className="flex items-center justify-between gap-3 py-2.5">
              <label htmlFor={id} className="min-w-0">
                <span className="block text-caption font-semibold text-text">{label}</span>
                <span className="block text-caption text-text-muted">
                  {channelOn ? hint : "Bật kênh tương ứng ở trên để dùng khung chat trên trang này"}
                </span>
              </label>
              <Switch
                id={id}
                checked={checked}
                disabled={!channelOn || busy !== null}
                onCheckedChange={(val) => handleToggle(surface, val)}
                aria-label={`Bật khung chat trên ${label}`}
              />
            </li>
          )
        })}
      </ul>
      {error && <p className="text-caption text-danger">{error}</p>}
      <PublicChatLimitRequest />
    </div>
  )
}
