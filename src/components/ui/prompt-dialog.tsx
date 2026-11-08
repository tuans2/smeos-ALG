"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export interface PromptOptions {
  /** Câu hỏi là chính hành động: "Từ chối bản nội dung này?" */
  title: string
  /** Nhãn ô nhập: "Lý do từ chối". */
  label: string
  /** Giải thích thêm: ai đọc nội dung này, dùng vào đâu. */
  description?: React.ReactNode
  /** Động từ của hành động, không dùng "OK": "Từ chối". */
  confirmLabel: string
  cancelLabel?: string
  placeholder?: string
  /** Bắt buộc nhập mới cho xác nhận (mặc định: có). */
  required?: boolean
  tone?: "danger" | "default"
}

export interface PromptDialogProps extends PromptOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nhận nội dung đã cắt khoảng trắng hai đầu. */
  onSubmit: (value: string) => void
}

/** Hộp nhập một đoạn chữ ngắn (03c UX-015). Thay cho `window.prompt`. */
export function PromptDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  label,
  description,
  confirmLabel,
  cancelLabel = "Không, quay lại",
  placeholder,
  required = true,
  tone = "default",
}: PromptDialogProps) {
  const [value, setValue] = React.useState("")
  const inputId = React.useId()
  const canSubmit = !required || value.trim().length > 0

  function close() {
    setValue("")
    onOpenChange(false)
  }

  function submit() {
    if (!canSubmit) return
    const text = value.trim()
    setValue("")
    onSubmit(text)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={title}
      description={description}
      size="sm"
      showCloseButton={false}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={submit} disabled={!canSubmit}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-body-sm font-medium text-text">
          {label}
        </label>
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={3}
          autoFocus
          aria-required={required || undefined}
        />
      </div>
    </Dialog>
  )
}

/**
 * Thay thế trực tiếp `const reason = window.prompt(...)`:
 *
 *   const [ask, promptDialog] = usePromptDialog()
 *   const reason = await ask({ title, label, confirmLabel })
 *   if (reason === null) return // người dùng huỷ
 *   …
 *   return <>{…}{promptDialog}</>
 */
export function usePromptDialog(): [(options: PromptOptions) => Promise<string | null>, React.ReactNode] {
  const [options, setOptions] = React.useState<PromptOptions | null>(null)
  const resolverRef = React.useRef<((value: string | null) => void) | null>(null)

  const ask = React.useCallback((next: PromptOptions) => {
    resolverRef.current?.(null)
    setOptions(next)
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = React.useCallback((value: string | null) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const element = options ? (
    <PromptDialog {...options} open onOpenChange={(open) => !open && settle(null)} onSubmit={(v) => settle(v)} />
  ) : null

  return [ask, element]
}
