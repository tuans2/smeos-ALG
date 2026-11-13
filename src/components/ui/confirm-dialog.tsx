"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export interface ConfirmOptions {
  /** Câu hỏi là chính hành động: "Xóa 3 sản phẩm?" */
  title: string
  /** Hậu quả cụ thể: phạm vi, có hoàn tác được không, ai bị ảnh hưởng. */
  consequence: React.ReactNode
  /** Động từ của hành động, không dùng "OK": "Xóa sản phẩm". */
  confirmLabel: string
  cancelLabel?: string
  /** `danger` cho xóa/thu hồi/không hoàn tác. */
  tone?: "danger" | "default"
  /** Hành động không hoàn tác trên diện rộng: bắt gõ đúng chuỗi này mới cho xác nhận. */
  requireText?: string
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có thể trả Promise — nút bị khóa đến khi xong để không chạy hai lần. */
  onConfirm: () => void | Promise<void>
}

/** Hộp xác nhận cho hành động rủi ro cao R3 (03c UX-015, UX-P07). Thay cho `window.confirm`. */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  consequence,
  confirmLabel,
  cancelLabel = "Không, quay lại",
  tone = "default",
  requireText,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const busyRef = React.useRef(false)
  const inputId = React.useId()

  const textOk = !requireText || typed.trim() === requireText

  function close() {
    setTyped("")
    onOpenChange(false)
  }

  async function handleConfirm() {
    if (busyRef.current || !textOk) return
    busyRef.current = true
    setBusy(true)
    try {
      await onConfirm()
      close()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !busy && (next ? onOpenChange(true) : close())}
      title={title}
      size="sm"
      showCloseButton={false}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close} disabled={busy} autoFocus>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => void handleConfirm()}
            disabled={busy || !textOk}
            aria-busy={busy || undefined}
          >
            {busy ? "Đang thực hiện…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-body text-text">
        <div>{consequence}</div>
        {requireText && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-body-sm text-text-muted">
              Gõ <span className="font-semibold text-text">{requireText}</span> để xác nhận
            </label>
            <Input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}
      </div>
    </Dialog>
  )
}

/**
 * Thay thế trực tiếp `if (!window.confirm(...)) return`:
 *
 *   const [confirm, confirmDialog] = useConfirmDialog()
 *   if (!(await confirm({ title, consequence, confirmLabel, tone: "danger" }))) return
 *   …
 *   return <>{…}{confirmDialog}</>
 */
export function useConfirmDialog(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null)
  const resolverRef = React.useRef<((ok: boolean) => void) | null>(null)

  const confirm = React.useCallback((next: ConfirmOptions) => {
    resolverRef.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = React.useCallback((ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const element = options ? (
    <ConfirmDialog
      {...options}
      open
      onOpenChange={(open) => !open && settle(false)}
      onConfirm={() => settle(true)}
    />
  ) : null

  return [confirm, element]
}
