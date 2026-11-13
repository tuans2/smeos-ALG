"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

type ChangeRequest = {
  id: string
  fields: Array<{ key: string; label: string }>
  changes: Record<string, unknown>
  createdAt: string
  expiresAt: string
}

const DAY_MS = 86_400_000

function preview(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(trống)"
  if (typeof value === "string") return value
  if (typeof value === "object") {
    const v = value as Record<string, unknown>
    const parts = [v.price ? `Giá ${Number(v.price).toLocaleString("vi-VN")} ₫` : null, typeof v.description === "string" ? v.description.slice(0, 80) : null]
    return parts.filter(Boolean).join(" · ") || "Cập nhật chi tiết"
  }
  return String(value)
}

/**
 * Đề xuất sửa đang chờ của một mẫu — Điều hành chọn thay đổi nào áp dụng, hoặc
 * từ chối kèm lý do. Chỉ hiển thị với `H3` (nơi gọi kiểm); máy chủ kiểm lại.
 */
export function ProductChangeRequestsCard({ productId, current, onChanged }: { productId: string; current: Record<string, unknown>; onChanged: () => void }) {
  const [items, setItems] = useState<ChangeRequest[]>([])
  const [chon, setChon] = useState<Record<string, string[]>>({})
  const [lyDo, setLyDo] = useState<Record<string, string>>({})
  const [dangGui, setDangGui] = useState<string | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const tai = useCallback(async () => {
    const res = await fetch(`/api/v1/products/${productId}/change-requests`)
    if (!res.ok) return
    const body = (await res.json()) as { data: ChangeRequest[] }
    setItems(body.data)
    setChon(Object.fromEntries(body.data.map((r) => [r.id, r.fields.map((f) => f.key)])))
  }, [productId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải đề xuất khi mở trang; setState nằm trong hàm tải
    void tai()
  }, [tai])

  if (items.length === 0) return null

  const gui = async (id: string, kind: "approve" | "reject") => {
    setDangGui(`${id}:${kind}`)
    setLoi(null)
    try {
      const body = kind === "approve" ? { fields: chon[id] ?? [] } : { reason: lyDo[id] ?? "" }
      const res = await fetch(`/api/v1/product-change-requests/${id}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error?.message || "Không lưu được quyết định, vui lòng thử lại")
      await tai()
      onChanged()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được quyết định, vui lòng thử lại")
    } finally {
      setDangGui(null)
    }
  }

  const doi = (id: string, key: string, on: boolean) =>
    setChon((prev) => ({ ...prev, [id]: on ? [...(prev[id] ?? []), key] : (prev[id] ?? []).filter((k) => k !== key) }))

  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="text-body font-bold text-text">Đề xuất sửa chờ duyệt ({items.length})</h2>
      {loi && <p className="text-body-sm text-danger">{loi}</p>}
      {items.map((r) => {
        const conLai = Math.max(0, Math.ceil((new Date(r.expiresAt).getTime() - now) / DAY_MS))
        return (
          <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border p-3">
            <p className="text-caption text-text-muted">Gửi lúc {new Date(r.createdAt).toLocaleString("vi-VN")} · còn {conLai} ngày</p>
            <ul className="flex flex-col gap-2">
              {r.fields.map((f) => (
                <li key={f.key} className="flex items-start gap-2 text-body-sm">
                  <Checkbox
                    id={`cr-${r.id}-${f.key}`}
                    checked={(chon[r.id] ?? []).includes(f.key)}
                    onCheckedChange={(checked) => doi(r.id, f.key, !!checked)}
                    className="mt-1"
                  />
                  <label htmlFor={`cr-${r.id}-${f.key}`} className="min-w-0 flex-1">
                    <span className="font-semibold text-text">{f.label}</span>
                    <span className="block text-text-muted">Hiện tại: {preview(current[f.key])}</span>
                    <span className="block text-primary">Đề xuất: {preview(r.changes[f.key])}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={`cr-ly-do-${r.id}`} className="sr-only">Lý do từ chối</label>
              <Input
                id={`cr-ly-do-${r.id}`}
                value={lyDo[r.id] ?? ""}
                onChange={(e) => setLyDo((prev) => ({ ...prev, [r.id]: e.target.value }))}
                maxLength={500}
                placeholder="Lý do nếu từ chối"
                className="h-9 min-w-0 flex-1 text-body-sm"
              />
              <Button size="sm" variant="outline" disabled={dangGui !== null || !(lyDo[r.id] ?? "").trim()} onClick={() => gui(r.id, "reject")}>
                {dangGui === `${r.id}:reject` && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />}
                <span>Từ chối</span>
              </Button>
              <Button size="sm" className="font-bold" disabled={dangGui !== null || (chon[r.id] ?? []).length === 0} onClick={() => gui(r.id, "approve")}>
                {dangGui === `${r.id}:approve` && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />}
                <span>Duyệt thay đổi đã chọn</span>
              </Button>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
