"use client"

import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"

export type SubmitMode = "save" | "saveAs" | "propose"

interface AiProductModalFooterProps {
  /** Điều hành, hoặc người đề xuất trên mẫu đề xuất của chính mình — ghi đè được. */
  canOverwrite: boolean
  submitting: false | SubmitMode
  onCancel: () => void
  onSubmit: (mode: SubmitMode) => void
}

/**
 * Chân hộp sửa mẫu: Lưu (ghi đè) · Lưu thành mẫu mới · Gửi đề xuất sửa (người
 * không được ghi đè mẫu chính thức — bản đang bán giữ nguyên tới khi Điều hành duyệt).
 */
export function AiProductModalFooter({ canOverwrite, submitting, onCancel, onSubmit }: AiProductModalFooterProps) {
  const spin = (mode: SubmitMode) => submitting === mode && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
  const primary: SubmitMode = canOverwrite ? "save" : "propose"
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-3.5 bg-surface-alt/50">
      {!canOverwrite && (
        <span className="mr-auto text-caption text-text-muted">
          Mẫu chính thức chỉ Điều hành sửa trực tiếp. Bạn có thể gửi đề xuất sửa hoặc lưu thành mẫu mới.
        </span>
      )}
      <Button variant="outline" size="sm" onClick={onCancel} disabled={!!submitting}>
        Hủy
      </Button>
      <Button variant="outline" size="sm" onClick={() => onSubmit("saveAs")} disabled={!!submitting} className="font-bold">
        {spin("saveAs")}
        <span>Lưu thành mẫu mới</span>
      </Button>
      <Button size="sm" onClick={() => onSubmit(primary)} disabled={!!submitting} className="font-bold">
        {spin(primary)}
        <span>{primary === "propose" ? "Gửi đề xuất sửa" : submitting === "save" ? "Đang lưu..." : "Lưu"}</span>
      </Button>
    </div>
  )
}
