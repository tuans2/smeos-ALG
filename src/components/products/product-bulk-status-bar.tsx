"use client"

import React, { useState } from "react"
import { X } from "@/components/ui/icon-set/x"
import { Button } from "@/components/ui/button"
import { readApiError } from "@/components/greeting-card/api-error"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"

type BulkStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"

export interface ProductBulkStatusBarProps {
  selectedIds: string[]
  canArchive: boolean
  onClear: () => void
  onDone: () => void
}

const ACTIONS: Array<{ status: BulkStatus; label: string }> = [
  { status: "ACTIVE", label: "Mở bán" },
  { status: "DRAFT", label: "Chuyển về nháp" },
  { status: "PAUSED", label: "Tạm ngưng" },
  { status: "ARCHIVED", label: "Ngừng bán" },
]

/** Thanh thao tác khi chọn nhiều sản phẩm ở dạng bảng — máy chủ kiểm quyền từng dòng. */
export function ProductBulkStatusBar({ selectedIds, canArchive, onClear, onDone }: ProductBulkStatusBarProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [confirm, confirmDialog] = useConfirmDialog()
  if (selectedIds.length === 0 && !message) return null

  const apply = async (status: BulkStatus, label: string) => {
    if (
      status === "ARCHIVED" &&
      !(await confirm({
        title: `Ngừng bán ${selectedIds.length} sản phẩm đã chọn?`,
        consequence: "Khách sẽ không thấy các sản phẩm này nữa. Bạn có thể mở bán lại bất cứ lúc nào.",
        confirmLabel: "Ngừng bán",
        tone: "danger",
      }))
    )
      return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/v1/products/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status }),
      })
      if (!res.ok) throw new Error(await readApiError(res, "Không đổi được trạng thái"))
      const body = (await res.json()) as { updated: string[]; failed: Array<{ id: string; reason: string }>; warnings?: Array<{ code: string; missing: string[] }> }
      const base = body.failed.length === 0
        ? `Đã ${label.toLowerCase()} ${body.updated.length} sản phẩm.`
        : `Đã ${label.toLowerCase()} ${body.updated.length} sản phẩm; ${body.failed.length} sản phẩm chưa đổi được (${body.failed[0]?.reason ?? ""}).`
      const w = body.warnings ?? []
      setMessage(w.length > 0 ? `${base} ${w.length} mẫu chưa đủ điều kiện bán (vd. ${w[0]!.code}: ${w[0]!.missing.join("; ").toLowerCase()}).` : base)
      onDone()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không đổi được trạng thái")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div role="region" aria-label="Thao tác hàng loạt" className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-surface-alt px-3 py-2 text-body-sm">
      {selectedIds.length > 0 && (
        <>
          <span className="font-semibold text-text">Đã chọn {selectedIds.length}</span>
          {ACTIONS.filter((a) => canArchive || a.status !== "ARCHIVED").map((a) => (
            <Button
              key={a.status}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void apply(a.status, a.label)}
              className="h-8 font-semibold text-text"
            >
              {a.label}
            </Button>
          ))}
        </>
      )}
      {message && <span className="text-caption text-text-muted" aria-live="polite">{message}</span>}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => { setMessage(null); onClear() }}
        aria-label="Bỏ chọn"
        className="ml-auto h-8 w-8 text-text-muted hover:bg-surface"
      >
        <X size={14} />
      </Button>
      {confirmDialog}
    </div>
  )
}
