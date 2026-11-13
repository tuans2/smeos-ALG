"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { costingFetch, formatVnd } from "./use-costing-api"
import { categoryLabel, useCostingProfile } from "./costing-profile-context"
import { parseNumberInput, type MaterialRow } from "./costing-ui-types"

type HistoryPoint = { unitCostVnd: number; effectiveAt: string }

/** Một nguyên liệu: đơn giá sửa tại chỗ; lịch sử giá chỉ tải khi người dùng mở (L2). */
export function MaterialItem({
  material,
  onChanged,
  confirmArchive,
}: {
  material: MaterialRow
  onChanged: () => void
  confirmArchive: (m: MaterialRow) => Promise<boolean>
}) {
  const { spec } = useCostingProfile()
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(material.unitCostVnd === null ? "" : String(material.unitCostVnd))
  const [history, setHistory] = useState<HistoryPoint[] | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await costingFetch(`/api/v1/costing/materials/${material.id}`, { method: "PATCH", body: JSON.stringify(body) })
      setEditing(false)
      setHistory(null)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa lưu được.")
    } finally {
      setBusy(false)
    }
  }

  const savePrice = () => {
    const v = parseNumberInput(price, true)
    if (Number.isNaN(v) || (v !== null && v < 0)) return setError("Đơn giá phải là số không âm.")
    void patch({ unit_cost_vnd: v })
  }

  const toggleHistory = async () => {
    const next = !showHistory
    setShowHistory(next)
    if (next && history === null) {
      try {
        setHistory(await costingFetch<HistoryPoint[]>(`/api/v1/costing/materials/${material.id}/history`))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chưa tải được lịch sử giá.")
      }
    }
  }

  const archive = async () => {
    if (await confirmArchive(material)) void patch({ active: false })
  }

  const change = material.priceChange
  return (
    <li className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-text">{material.name}</span>
        <Badge tone="neutral">{categoryLabel(spec, material.categoryKey)}</Badge>
        {material.unitCostVnd === null && <Badge tone="warning">Chưa có giá</Badge>}
        {change?.alert && (
          <Badge tone="danger">
            Giá {change.changePercent > 0 ? "tăng" : "giảm"} {Math.abs(change.changePercent)}% so với lần trước
          </Badge>
        )}
        <span className="ml-auto text-body text-text">
          {formatVnd(material.unitCostVnd)} / {material.unit}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-muted">
        {material.supplierName && <span>Nhà cung cấp: {material.supplierName}</span>}
        {material.onHandQty !== null && (
          <span>
            Còn trong kho: {material.onHandQty.toLocaleString("vi-VN")} {material.unit}
          </span>
        )}
        {!material.active && <span>Đã ngừng dùng</span>}
      </div>
      {editing ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-body-sm text-text">
            Đơn giá mới (đồng / {material.unit})
            <Input inputSize="sm" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" autoFocus />
          </label>
          <Button size="sm" onClick={savePrice} disabled={busy}>
            Lưu giá
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
            Hủy
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="xs" variant="outline" onClick={() => setEditing(true)}>
            Cập nhật giá
          </Button>
          <Button size="xs" variant="ghost" onClick={toggleHistory} aria-expanded={showHistory}>
            {showHistory ? "Ẩn lịch sử giá" : "Xem lịch sử giá"}
          </Button>
          {material.active ? (
            <Button size="xs" variant="ghost" onClick={archive} disabled={busy}>
              Ngừng dùng
            </Button>
          ) : (
            <Button size="xs" variant="ghost" onClick={() => void patch({ active: true })} disabled={busy}>
              Dùng lại
            </Button>
          )}
        </div>
      )}
      {showHistory && (
        <ol className="flex flex-col gap-1 rounded-xl bg-surface-alt px-3 py-2 text-body-sm text-text" aria-label={`Lịch sử giá ${material.name}`}>
          {history === null && <li><SkeletonBlock lines={2} label="Đang tải lịch sử giá" /></li>}
          {history?.length === 0 && <li>Chưa có mốc giá nào.</li>}
          {history?.map((h, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{new Date(h.effectiveAt).toLocaleDateString("vi-VN")}</span>
              <span>{formatVnd(h.unitCostVnd)}</span>
            </li>
          ))}
        </ol>
      )}
      {error && <InlineError message={error} />}
    </li>
  )
}
