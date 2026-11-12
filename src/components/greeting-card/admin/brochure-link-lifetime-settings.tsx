"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Hourglass } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  LINK_LIFETIME_SETTINGS_KEY, MAX_LINK_LIFETIME_HOURS, MIN_LINK_LIFETIME_HOURS,
  formatLinkLifetime, isValidLinkLifetimeHours, parseLinkLifetimeHours,
} from "@/modules/greeting-card/domain/link-lifetime"

/**
 * Thời gian dùng được của link gửi khách, áp dụng cho cả tiệm (mặc định 24 giờ). Hết hạn mà khách
 * chưa đặt thì link tự đóng và khách thấy lời nhắn liên hệ cửa hàng để nhận link mới.
 */
export function BrochureLinkLifetimeSettings() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [edited, setEdited] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const saved = org.data ? parseLinkLifetimeHours(org.data.settings) : null
  const draft = edited ?? (saved !== null ? String(saved) : "")
  const hours = Number(draft)

  async function save() {
    if (!isValidLinkLifetimeHours(hours)) {
      setMessage({ ok: false, text: `Nhập số giờ nguyên từ ${MIN_LINK_LIFETIME_HOURS} đến ${MAX_LINK_LIFETIME_HOURS} (30 ngày).` })
      return
    }
    setSaving(true)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [LINK_LIFETIME_SETTINGS_KEY]: hours } }, "Không lưu được thời hạn link")
      await org.mutate()
      setEdited(null)
      setMessage({ ok: true, text: `Đã lưu: link mới dùng được trong ${formatLinkLifetime(hours)}.` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được thời hạn link" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Hourglass size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Thời hạn link gửi khách</h3>
      </div>
      <p className="text-caption text-text-muted">
        Link riêng tính từ lúc tạo, link chia sẻ tính từ lúc khách mở. Hết hạn mà khách chưa đặt, khách thấy lời nhắn liên hệ cửa hàng để
        nhận link mới. Chỉ áp dụng cho link tạo sau khi lưu; link đã có đơn luôn mở được.
      </p>
      {saved === null ? (
        <div className="h-10 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
      ) : (
        <label className="flex items-center gap-2 text-body-sm text-text">
          <span>Link dùng được trong</span>
          <Input
            type="number"
            min={MIN_LINK_LIFETIME_HOURS}
            max={MAX_LINK_LIFETIME_HOURS}
            step={1}
            value={draft}
            onChange={(e) => {
              setEdited(e.target.value)
              setMessage(null)
            }}
            className="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-right text-body-sm text-text"
          />
          <span>giờ</span>
          {isValidLinkLifetimeHours(hours) && <span className="text-caption text-text-muted">({formatLinkLifetime(hours)})</span>}
        </label>
      )}
      <div className="flex items-center justify-between gap-2">
        {message ? (
          <p role="status" className={`text-caption font-medium ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
        ) : <span />}
        <Button variant="primary"
          type="button"
          onClick={() => void save()}
          disabled={saved === null || saving}
          className="py-0 gap-0 h-9 rounded-lg bg-primary px-4 text-body-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </section>
  )
}
