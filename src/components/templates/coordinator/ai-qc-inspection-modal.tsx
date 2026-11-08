"use client"

import React, { useState } from "react"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Ban } from "@/components/ui/icon-set/ban"
import { Info } from "@/components/ui/icon-set/info"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage, type CoordinationOrder } from "@/components/coordinator/coordinator-api"

/**
 * P5 — Kiểm định chất lượng (Template T14, F10).
 *
 * Người kiểm so ảnh thành phẩm với ảnh mẫu và kết luận. Bản trước hiện "AI
 * Similarity 94%" từ một hằng số — không có lượt Vision nào chạy. Chấm AI
 * thật là nợ #140; tới khi có, `qc.aiScore` luôn null và giao diện nói rõ.
 */
export interface AiQcInspectionModalProps {
  isOpen: boolean
  order: CoordinationOrder | null
  onClose: () => void
  onSubmit: (decision: "PASSED" | "REWORK_REQUESTED" | "REJECTED", notes: string, checklist: Record<string, boolean>) => Promise<void>
}

const CHECKS: Array<{ key: string; label: string }> = [
  { key: "flowerMatch", label: "Đúng nguyên phụ liệu và số lượng theo công thức chế tác" },
  { key: "colorTone", label: "Đúng tông màu & thiết kế" },
  { key: "wrapping", label: "Đúng đóng gói / bao bì / phụ kiện" },
  { key: "cardMessage", label: "Đúng ấn phẩm / thiệp / nội dung đi kèm" },
]

export function AiQcInspectionModal({ isOpen, order, onClose, onSubmit }: AiQcInspectionModalProps) {
  const [notes, setNotes] = useState("")
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !order) return null

  const finished = order.finishedImageUrls[0] ?? null
  const allChecked = CHECKS.every((c) => checklist[c.key])

  const decide = async (decision: "PASSED" | "REWORK_REQUESTED" | "REJECTED") => {
    if (decision !== "PASSED" && !notes.trim()) {
      setError("QC không đạt phải ghi rõ lý do để xưởng sửa.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(decision, notes.trim(), checklist)
      setNotes("")
      setChecklist({})
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const imageBox = (title: string, url: string | null, empty: string) => (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-surface-alt">
      <span className="font-bold text-text text-caption">{title}</span>
      <div className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface flex items-center justify-center">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-text-muted text-caption p-4 text-center">{empty}</span>
        )}
      </div>
    </div>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="lg"
      className="max-w-3xl"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-success-bg text-success-text flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface-alt text-text text-caption font-black uppercase border border-border">
                BƯỚC 5 • KIỂM ĐỊNH QC
              </span>
              <h3 className="text-body font-extrabold text-text">Kiểm Định Chất Lượng (T14)</h3>
            </div>
          </div>
        </div>
      }
      description={`Đơn #${order.orderCode} • Đối chiếu ảnh thành phẩm với ảnh mẫu chuẩn đầu vào`}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="outline" size="sm" disabled={busy || !finished} onClick={() => decide("REJECTED")} className="gap-1.5 text-danger-text border-danger-border">
            <Ban size={14} /> Loại — mở sự cố
          </Button>
          <Button variant="outline" size="sm" disabled={busy || !finished} onClick={() => decide("REWORK_REQUESTED")} className="gap-1.5">
            <RotateCcw size={14} /> Yêu cầu làm lại
          </Button>
          <Button
            size="sm"
            disabled={busy || !finished || !allChecked}
            onClick={() => decide("PASSED")}
            title={allChecked ? undefined : "Tích đủ danh mục kiểm trước khi duyệt đạt"}
            className="bg-success hover:bg-success-text text-white font-bold gap-1.5"
          >
            <CheckCircle2 size={14} /> Đạt — chuyển giao hàng
          </Button>
        </div>
      }
    >
      <div className="p-1 flex flex-col gap-4 text-caption">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {imageBox("📸 Ảnh mẫu chuẩn đầu vào", order.sampleImageUrl, "Đơn chưa có ảnh mẫu")}
          {imageBox("🌸 Ảnh thành phẩm thợ gửi", finished, "Chưa có ảnh thành phẩm — không kiểm được")}
        </div>

        <div className="p-3 rounded-xl border border-info-border bg-info-bg/60 text-info-text flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            Chấm điểm AI tự động chưa bật cho điều phối — kết luận dưới đây là của người kiểm và được ghi vào hồ sơ QC
            kèm tên người kiểm.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-bold text-text">Danh mục kiểm:</span>
          {CHECKS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={Boolean(checklist[c.key])}
                onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, [c.key]: Boolean(checked) }))}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="font-bold text-text block mb-1">Ghi chú QC (bắt buộc khi không đạt):</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ví dụ: nơ lệch màu, thiếu 2 cành hồng chủ đạo…"
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl border border-danger-border bg-danger-bg text-danger-text font-semibold">
            {error}
          </div>
        )}
      </div>
    </Dialog>
  )
}
