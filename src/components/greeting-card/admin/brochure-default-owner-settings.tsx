"use client"

import { NativeSelect } from "@/components/ui/select"
import React, { useState } from "react"
import { UserCheck } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { DEFAULT_OWNER_SETTINGS_KEY, parseDefaultOwnerId } from "@/modules/greeting-card/domain/link-ownership"

/**
 * Người phụ trách đơn đến từ link cũ (đã gửi/đăng trước khi có nút "Sao chép link mang tên bạn").
 * Bỏ trống = chủ tiệm. Link sao chép mới luôn thuộc người đã bấm sao chép.
 */
export function BrochureDefaultOwnerSettings() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const me = useApi<{ user: { id: string; name: string | null; email: string } }>("/api/v1/auth/me")
  const recipients = useApi<{ data: { members: Array<{ userId: string; name: string }> } }>("/api/v1/greeting-card/messages/recipients")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const current = org.data ? parseDefaultOwnerId(org.data.settings) ?? "" : ""
  const options = [
    ...(me.data ? [{ userId: me.data.user.id, name: `${me.data.user.name || me.data.user.email} (bạn)` }] : []),
    ...(recipients.data?.data.members ?? []),
  ]

  async function save(userId: string) {
    setSaving(true)
    setMessage(null)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [DEFAULT_OWNER_SETTINGS_KEY]: userId ? { user_id: userId } : null } }, "Không lưu được người phụ trách")
      await org.mutate()
      setMessage({ ok: true, text: "Đã lưu người phụ trách link cũ." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được người phụ trách" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <UserCheck size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Người phụ trách link cũ</h3>
      </div>
      <p className="text-caption text-text-muted">
        Link sao chép trong ALG luôn thuộc người đã bấm sao chép. Đơn đến từ link đã gửi hoặc đã đăng trước đây giao cho người này.
      </p>
      <label className="flex flex-col gap-1 text-body-sm">
        <span className="sr-only">Người phụ trách link cũ</span>
        <NativeSelect value={current} disabled={saving || !org.data} onChange={(e) => void save(e.target.value)}
          className="h-11 rounded-xl border border-border bg-surface px-3 text-body-sm text-text">
          <option value="">Chủ tiệm (mặc định)</option>
          {options.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
        </NativeSelect>
      </label>
      {message && <p role="status" className={`text-caption font-medium ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>}
    </section>
  )
}
