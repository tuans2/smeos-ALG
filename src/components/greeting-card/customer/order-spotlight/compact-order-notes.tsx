"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import React, { useState } from "react"
import { Plus, X } from "@/components/ui/icons"
import { OrderNoteField, orderNoteLabel } from "../order-notes-fields"
import { availableNoteKinds, initialOpenNoteKinds, type OrderNoteKind } from "./order-note-kinds"

/**
 * Khối Ghi chú dạng gọn: chỉ mở sẵn ô mặc định của ngành (+ ô đã có nội dung);
 * các loại khác khách tự thêm qua menu "Thêm ghi chú". Bỏ một ô → xoá luôn nội dung để không gửi ngầm.
 */
export function CompactOrderNotes({
  idPrefix,
  inputClassName,
  industryKey,
  values,
  onChange,
}: {
  idPrefix: string
  inputClassName: string
  industryKey?: string | null | undefined
  values: Partial<Record<OrderNoteKind, string>>
  onChange: (kind: OrderNoteKind, value: string) => void
}) {
  const [open, setOpen] = useState<OrderNoteKind[]>(() => initialOpenNoteKinds(industryKey, values))
  const available = availableNoteKinds(industryKey)
  const addable = available.filter((k) => !open.includes(k))
  const selectId = `${idPrefix}-addNote`

  const add = (kind: OrderNoteKind) => setOpen((prev) => available.filter((k) => prev.includes(k) || k === kind))
  const remove = (kind: OrderNoteKind) => {
    setOpen((prev) => prev.filter((k) => k !== kind))
    onChange(kind, "")
  }

  return (
    <>
      {open.map((kind) => (
        <div key={kind} className="relative rounded-xl border border-border bg-bg p-3">
          <Button variant="ghost"
            type="button"
            onClick={() => remove(kind)}
            aria-label={`Bỏ ô ${orderNoteLabel(kind, industryKey).toLowerCase()}`}
            className="text-[length:inherit] h-auto font-[inherit] gap-0 absolute right-2 top-2 rounded-md p-1 text-text-muted transition hover:bg-surface-alt hover:text-text"
          >
            <X size={16} aria-hidden="true" />
          </Button>
          <OrderNoteField
            kind={kind}
            idPrefix={idPrefix}
            value={values[kind] ?? ""}
            inputClassName={inputClassName}
            industryKey={industryKey}
            onChange={(v) => onChange(kind, v)}
          />
        </div>
      ))}

      {addable.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-2 pl-3">
          <Plus size={16} className="shrink-0 text-primary" aria-hidden="true" />
          <label htmlFor={selectId} className="sr-only">
            Thêm ghi chú
          </label>
          <NativeSelect
            id={selectId}
            value=""
            onChange={(e) => {
              if (e.target.value) add(e.target.value as OrderNoteKind)
            }}
            className="min-w-0 flex-1 bg-transparent text-body-sm font-bold text-primary focus:outline-none"
          >
            <option value="">Thêm ghi chú…</option>
            {addable.map((kind) => (
              <option key={kind} value={kind}>
                {orderNoteLabel(kind, industryKey)}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
    </>
  )
}
