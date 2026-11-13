"use client"

import { useState } from "react"

import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Ngày mẫu không nhận đơn (hết nguyên liệu, đóng cửa, bảo trì) — áp cho mọi chế độ khả dụng
 * (checklist ALG 2.8): ngày đã chặn thì link khách báo hết và không đặt được cho ngày đó.
 */
export function BlockedDatesEditor({ dates, onChange, canEdit, saving, label = "Ngày không nhận đơn" }: {
  dates: string[]
  onChange: (dates: string[]) => void
  canEdit: boolean
  saving: boolean
  label?: string
}) {
  const [next, setNext] = useState("")
  const add = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || dates.includes(next)) return
    onChange([...dates, next].sort())
    setNext("")
  }
  return (
    <div className="pt-2 border-t border-primary/20 flex flex-col gap-2">
      <span className="text-caption font-bold text-text">{label}</span>
      <div className="flex gap-2">
        <Input type="date" disabled={!canEdit || saving} value={next} onChange={(e) => setNext(e.target.value)} className="h-9 flex-1 text-caption" aria-label={label} />
        <Button type="button" variant="outline" size="sm" disabled={!canEdit || !next} onClick={add} className="h-9 text-caption flex items-center gap-1">
          <Plus size={14} /> Chặn ngày
        </Button>
      </div>
      {dates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {dates.map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-bold bg-danger/10 text-danger border border-danger/20">
              <span>{d}</span>
              {canEdit && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(dates.filter((x) => x !== d))} aria-label={`Bỏ chặn ngày ${d}`}>
                  <Trash2 size={12} />
                </Button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
