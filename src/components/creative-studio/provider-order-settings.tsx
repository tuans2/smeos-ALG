"use client"

import { useEffect, useState } from "react"
import { ArrowDown } from "@/components/ui/icon-set/arrow-down"
import { ArrowUp } from "@/components/ui/icon-set/arrow-up"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Loader2 } from "@/components/ui/icon-set/loader2"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { loadProviderCatalog, type ProviderKind, type ProviderKindView } from "./provider-select"

/**
 * Thứ tự ưu tiên nhà cung cấp của TIỆM cho Creative Studio (PO 25/09/2026 —
 * nhà cung cấp trước, nhiều lựa chọn, cả hai cấp). Mỗi loại (nội dung, ảnh,
 * video, giọng, nhạc) một danh sách kéo lên/xuống; bên đầu tiên được thử
 * trước, lỗi thì sang bên kế tiếp, mọi bên lỗi mới lùi cục bộ. Mỗi lượt tạo
 * vẫn đổi được bên ở ngay màn hình tạo. Đọc/ghi qua
 * `GET·PUT /api/v1/creative-production/providers` (ghi cần `U2`).
 */
export function ProviderOrderSettings({ canEdit }: { canEdit: boolean }) {
  const [kinds, setKinds] = useState<Record<ProviderKind, ProviderKindView> | null>(null)
  const [draft, setDraft] = useState<Partial<Record<ProviderKind, string[]>>>({})
  const [saving, setSaving] = useState<ProviderKind | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let alive = true
    void loadProviderCatalog(true).then((k) => {
      if (!alive) return
      if (!k) setLoadFailed(true)
      setKinds(k)
    })
    return () => {
      alive = false
    }
  }, [])

  const orderOf = (kind: ProviderKind) => draft[kind] ?? kinds?.[kind]?.order ?? []

  const move = (kind: ProviderKind, index: number, delta: number) => {
    const list = [...orderOf(kind)]
    const target = index + delta
    if (target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target]!, list[index]!]
    setDraft((d) => ({ ...d, [kind]: list }))
  }

  const save = async (kind: ProviderKind) => {
    setSaving(kind)
    setMessage(null)
    try {
      const res = await fetch("/api/v1/creative-production/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, order: orderOf(kind) }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message ?? `Lưu thất bại (HTTP ${res.status})`)
      }
      const next = await loadProviderCatalog(true)
      setKinds(next)
      setDraft((d) => {
        const rest = { ...d }
        delete rest[kind]
        return rest
      })
      setMessage({ ok: true, text: `Đã lưu thứ tự: ${kinds?.[kind]?.label ?? kind}` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Lưu thất bại" })
    } finally {
      setSaving(null)
    }
  }

  if (loadFailed) {
    return <p className="text-caption text-text-muted">Không tải được danh mục nhà cung cấp (cần quyền tạo nội dung `I1`).</p>
  }
  if (!kinds) {
    return (
      <p className="flex items-center gap-2 text-caption text-text-muted">
        <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Đang tải danh mục nhà cung cấp...
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3 text-caption ${message.ok ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger-text"}`}
        >
          {message.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(Object.keys(kinds) as ProviderKind[]).map((kind) => {
          const view = kinds[kind]
          const order = orderOf(kind)
          const dirty = Boolean(draft[kind])
          return (
            <div key={kind} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-body-sm font-bold text-text">{view.label}</h3>
                {canEdit && (
                  <Button size="sm" variant={dirty ? "primary" : "outline"} disabled={!dirty || saving !== null} onClick={() => void save(kind)} className="text-caption">
                    {saving === kind ? "Đang lưu..." : "Lưu thứ tự"}
                  </Button>
                )}
              </div>
              <ol className="flex flex-col gap-1.5">
                {order.map((key, i) => {
                  const p = view.providers.find((x) => x.key === key)
                  return (
                    <li key={key} className="flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-2.5 py-1.5">
                      <span className="w-4 text-caption font-bold text-text-muted">{i + 1}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-caption font-semibold text-text">
                          {p?.display_name ?? key}
                        </span>
                        <span className="block truncate text-caption text-text-muted">{p?.note}</span>
                      </span>
                      {p && !p.configured && (
                        <Badge tone="warning" className="shrink-0 text-caption">
                          chưa kết nối
                        </Badge>
                      )}
                      {canEdit && (
                        <span className="flex shrink-0 gap-0.5">
                          <Button type="button" variant="ghost" size="xs" aria-label="Lên" disabled={i === 0} onClick={() => move(kind, i, -1)} className="h-8 w-8 p-0 text-text-muted">
                            <ArrowUp size={13} />
                          </Button>
                          <Button type="button" variant="ghost" size="xs" aria-label="Xuống" disabled={i === order.length - 1} onClick={() => move(kind, i, 1)} className="h-8 w-8 p-0 text-text-muted">
                            <ArrowDown size={13} />
                          </Button>
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>
              <p className="text-caption text-text-muted">
                {view.local_fallback
                  ? `Mọi bên lỗi → dự phòng: ${view.local_fallback.label} (ghi rõ lý do, hoàn phần chênh credit).`
                  : "Mọi bên lỗi → lượt tạo báo lỗi và hoàn credit."}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
