"use client"

// Nút "Lưu" dùng chung cho mọi thao tác ghi trong Console "Trường dữ
// liệu" — bấm sẽ hiện bảng khác biệt (cũ → mới) trước khi thật sự gọi API,
// theo đúng yêu cầu "xác nhận-có-diff cho mọi thao tác ghi" (ĐP-3 3.15).

import { useState } from "react"
import { Button } from "@/components/ui/button"

export interface DiffRow {
  label: string
  from: string
  to: string
}

export function buildDiffRows<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  labels: Partial<Record<keyof T, string>>,
  format: (value: unknown) => string = (v) => (v === null || v === undefined || v === "" ? "—" : String(v))
): DiffRow[] {
  const rows: DiffRow[] = []
  for (const key of Object.keys(after) as (keyof T)[]) {
    const fromVal = format(before[key])
    const toVal = format(after[key])
    if (fromVal !== toVal) {
      rows.push({ label: String(labels[key] ?? key), from: fromVal, to: toVal })
    }
  }
  return rows
}

export function DiffConfirmButton({
  label,
  confirmLabel = "Xác nhận lưu",
  buildDiff,
  onConfirm,
  disabled,
}: {
  label: string
  confirmLabel?: string
  buildDiff: () => DiffRow[]
  onConfirm: () => Promise<{ ok: boolean; error?: string }>
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [diff, setDiff] = useState<DiffRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setDiff(buildDiff())
          setError(null)
          setOpen(true)
        }}
      >
        {label}
      </Button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface-alt p-3">
      <p className="mb-2 text-caption font-semibold text-text-muted">Xác nhận thay đổi</p>
      {diff.length === 0 ? (
        <p className="mb-2 text-body-sm text-text-muted">Không có gì thay đổi so với hiện tại.</p>
      ) : (
        <ul className="mb-2 space-y-1 text-body-sm">
          {diff.map((d, i) => (
            <li key={`${d.label}-${i}`}>
              <span className="font-medium">{d.label}:</span>{" "}
              <span className="text-text-muted line-through">{d.from}</span>{" → "}
              <span className="font-medium text-primary">{d.to}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mb-2 text-body-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || diff.length === 0}
          onClick={async () => {
            setBusy(true)
            setError(null)
            const res = await onConfirm()
            setBusy(false)
            if (res.ok) setOpen(false)
            else setError(res.error ?? "Có lỗi, thử lại.")
          }}
        >
          {busy ? "Đang lưu…" : confirmLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setOpen(false)}>
          Huỷ
        </Button>
      </div>
    </div>
  )
}
