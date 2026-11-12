"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Bell, Loader2, Save, ShieldCheck } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  STAFF_NOTIFY_CHANNELS,
  STAFF_NOTIFY_CHANNEL_LABELS,
  STAFF_NOTIFY_EVENTS,
  STAFF_NOTIFY_EVENT_LABELS,
  type StaffNotifyChannel,
  type StaffNotifyEvent,
} from "@/modules/greeting-card/domain/staff-notification-types"

interface StaffNotifyResponse {
  data: {
    enabled: boolean
    channels: StaffNotifyChannel[]
    events: Record<string, boolean>
    saasAllowedChannels: StaffNotifyChannel[]
    hasCredentials: boolean
  }
}

export function StaffNotifySettings() {
  const status = useApi<StaffNotifyResponse>("/api/v1/greeting-card/integrations/staff-notifications")
  const saved = status.data?.data

  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<StaffNotifyChannel[] | null>(null)
  const [events, setEvents] = useState<Record<string, boolean> | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const isEnabled = enabled ?? saved?.enabled ?? false
  const activeChannels = selectedChannels ?? saved?.channels ?? ["APP_INBOX"]
  const activeEvents = events ?? saved?.events ?? {}
  const saasAllowed = new Set(saved?.saasAllowedChannels ?? ["APP_INBOX", "TELEGRAM", "ZALO", "SMS", "WHATSAPP", "MESSENGER"])

  function toggleChannel(ch: StaffNotifyChannel) {
    if (ch === "APP_INBOX") return // Luôn bật
    const current = new Set(activeChannels)
    if (current.has(ch)) {
      current.delete(ch)
    } else {
      current.add(ch)
    }
    setSelectedChannels([...current])
  }

  function toggleEvent(evt: StaffNotifyEvent) {
    const current = { ...activeEvents }
    current[evt] = current[evt] === false ? true : false
    setEvents(current)
  }

  async function handleSave() {
    setBusy(true)
    setMessage(null)
    try {
      const payload: Record<string, unknown> = {
        enabled: isEnabled,
        channels: activeChannels,
        events: activeEvents,
      }
      if (Object.keys(credentials).length > 0) {
        payload.credentials = credentials
      }

      await apiSend("/api/v1/greeting-card/integrations/staff-notifications", "PUT", payload)
      await status.mutate()
      setMessage({ ok: true, text: "Đã lưu cài đặt thông báo nhân viên thành công!" })
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Không thể lưu cài đặt",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="text-title-sm font-bold text-text">Thông báo đa kênh cho nhân viên</h3>
            <p className="text-body-sm text-text-muted">
              Đẩy thông báo tức thì ra Telegram, Zalo OA, SMS, WhatsApp khi có đơn mới, huỷ đơn hoặc đổi thông tin
            </p>
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <Checkbox
            checked={isEnabled}
            onCheckedChange={(checked) => setEnabled((checked === true))}
            aria-label="Bật thông báo tức thì cho nhân viên"
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-surface-alt peer-checked:bg-primary peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
        </label>
      </div>

      {isEnabled && (
        <div className="mt-6 flex flex-col gap-6 border-t border-border pt-5">
          {/* 1. Chọn kênh thông báo */}
          <div>
            <h4 className="text-body-sm font-bold text-text">Kênh thông báo kích hoạt</h4>
            <p className="text-caption text-text-muted">
              Kênh có dấu kiểm được phép sử dụng theo chính sách gói của SaaS. Hộp việc luôn được đồng bộ.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STAFF_NOTIFY_CHANNELS.map((ch) => {
                const isAllowed = saasAllowed.has(ch) || ch === "APP_INBOX"
                const isChecked = activeChannels.includes(ch)
                return (
                  <Button variant="outline"
                    key={ch}
                    type="button"
                    disabled={!isAllowed || ch === "APP_INBOX"}
                    onClick={() => toggleChannel(ch)}
                    className={`text-[length:inherit] h-auto font-[inherit] gap-0 flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      isChecked
                        ? "border-primary bg-primary/5 text-text hover:bg-primary/5"
                        : "border-border bg-bg text-text-muted hover:bg-bg"
                    } ${!isAllowed ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                  >
                    <div>
                      <div className="text-body-sm font-semibold">{STAFF_NOTIFY_CHANNEL_LABELS[ch]}</div>
                      {!isAllowed && <div className="text-caption text-danger">Chưa cấp phép SaaS</div>}
                    </div>
                    {isChecked && <ShieldCheck size={16} className="text-primary" />}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* 2. Cấu hình Telegram nếu chọn */}
          {activeChannels.includes("TELEGRAM") && (
            <div className="rounded-xl border border-border bg-bg p-4">
              <h5 className="text-body-sm font-bold text-text">Cấu hình Telegram Bot</h5>
              <p className="text-caption text-text-muted">Nhập Bot Token từ @BotFather và Chat ID nhóm hoặc cá nhân</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  type="password"
                  placeholder="Telegram Bot Token (để trống giữ nguyên)"
                  value={credentials.telegramBotToken ?? ""}
                  onChange={(e) => setCredentials({ ...credentials, telegramBotToken: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-body-sm text-text"
                />
                <Input
                  type="text"
                  placeholder="Default Chat ID (vd: -100123456789)"
                  value={credentials.telegramChatId ?? ""}
                  onChange={(e) => setCredentials({ ...credentials, telegramChatId: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-body-sm text-text"
                />
              </div>
            </div>
          )}

          {/* 3. Tùy chọn sự kiện nhận tin */}
          <div>
            <h4 className="text-body-sm font-bold text-text">Sự kiện kích hoạt gửi ngoài</h4>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STAFF_NOTIFY_EVENTS.map((evt) => {
                const checked = activeEvents[evt] !== false
                return (
                  <label key={evt} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-bg p-2.5">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleEvent(evt)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-body-sm text-text">{STAFF_NOTIFY_EVENT_LABELS[evt]}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Nút lưu */}
          {message && (
            <div
              className={`rounded-lg p-3 text-body-sm ${
                message.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={busy} className="flex items-center gap-2">
              {busy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <Save size={16} />}
              Lưu cấu hình thông báo
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
