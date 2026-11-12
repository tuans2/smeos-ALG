"use client"

import { NativeSelect } from "@/components/ui/select"
import React, { useState } from "react"
import { Eye } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import type { SaleVisibilityView } from "@/modules/greeting-card/use-cases/sale-visibility"
import type { VisibilityMode } from "@/modules/greeting-card/domain/order-visibility"

const MODE_LABEL: Record<VisibilityMode, string> = { ALL: "Tất cả khách", OWN: "Chỉ khách của mình" }

/**
 * Điều hành chọn mỗi sale thấy khách/đơn của mọi người hay chỉ của chính mình.
 * Điều phối, giao hàng, kế toán, điều hành luôn thấy tất cả nên không có trong danh sách.
 */
export function BrochureVisibilitySettings() {
  const view = useApi<{ data: SaleVisibilityView }>("/api/v1/greeting-card/sale-visibility")
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const data = view.data?.data

  async function save(key: string, body: { userId?: string; mode: VisibilityMode | null }) {
    setSaving(key)
    setMessage(null)
    try {
      await apiSend("/api/v1/greeting-card/sale-visibility", "PUT", body, "Không lưu được quyền xem")
      await view.mutate()
      setMessage({ ok: true, text: "Đã lưu quyền xem." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được quyền xem" })
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Eye size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Sale được xem khách nào</h3>
      </div>
      {view.error ? (
        <p role="alert" className="text-body-sm text-danger">{view.error.message}</p>
      ) : !data ? (
        <div className="h-16 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
      ) : (
        <>
          <label className="flex flex-wrap items-center gap-2 text-body-sm">
            <span className="font-semibold text-text">Mặc định cho sale mới:</span>
            <NativeSelect
              value={data.defaultMode}
              disabled={saving !== null}
              onChange={(e) => void save("default", { mode: e.target.value as VisibilityMode })}
              className="h-9 rounded-lg border border-border bg-surface px-2 text-body-sm"
            >
              <option value="ALL">{MODE_LABEL.ALL}</option>
              <option value="OWN">{MODE_LABEL.OWN}</option>
            </NativeSelect>
          </label>
          {data.members.length === 0 ? (
            <p className="text-body-sm text-text-muted">Chưa có nhân viên bán hàng nào trong cửa hàng.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {data.members.map((m) => (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-text truncate">{m.name}</p>
                    <p className="text-caption text-text-muted">{m.roleName}</p>
                  </div>
                  <NativeSelect
                    aria-label={`Quyền xem của ${m.name}`}
                    value={m.mode ?? ""}
                    disabled={saving !== null}
                    onChange={(e) => void save(m.userId, { userId: m.userId, mode: (e.target.value || null) as VisibilityMode | null })}
                    className="h-9 rounded-lg border border-border bg-surface px-2 text-body-sm"
                  >
                    <option value="">Theo mặc định ({MODE_LABEL[data.defaultMode]})</option>
                    <option value="ALL">{MODE_LABEL.ALL}</option>
                    <option value="OWN">{MODE_LABEL.OWN}</option>
                  </NativeSelect>
                </li>
              ))}
            </ul>
          )}
          <p className="text-caption text-text-muted">Điều hành, điều phối, giao hàng và kế toán luôn thấy tất cả.</p>
        </>
      )}
      {message && (
        <p role="status" className={`text-caption font-medium ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
      )}
    </section>
  )
}
