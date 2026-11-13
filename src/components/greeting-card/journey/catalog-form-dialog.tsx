"use client"

import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { InlineError } from "@/components/ui/inline-error"
import { normalizeLinkCode } from "./use-journey-catalogs"

interface CatalogFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "clone"
  orgSlug: string
  /** Số sản phẩm sẽ được chép sang (chỉ dùng khi nhân bản). */
  cloneItemCount?: number
  initialName?: string
  initialCode?: string
  onSubmit: (input: { name: string; code: string }) => Promise<void>
}

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-body text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

/** Mỗi lần mở nên gắn `key` mới để form khởi tạo lại từ giá trị ban đầu. */
export function CatalogFormDialog(props: CatalogFormDialogProps) {
  const { open, onOpenChange, mode, orgSlug, cloneItemCount = 0, initialName = "", initialCode = "", onSubmit } = props
  const [name, setName] = useState(initialName)
  const [code, setCode] = useState(initialCode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalized = normalizeLinkCode(code)
  const codeRequired = mode === "clone"
  const canSubmit = name.trim().length > 0 && (!codeRequired || normalized.length >= 2) && !saving

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), code: normalized })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  const title = mode === "create" ? "Tạo bộ sưu tập mới" : "Tạo thêm link cho kênh khác"
  const description =
    mode === "create"
      ? "Đặt tên dễ nhớ theo dịp, ví dụ “Hoa 20/10” hoặc “Sinh nhật tháng 11”."
      : `${cloneItemCount} sản phẩm sẽ được chép sang link mới để bạn theo dõi riêng từng kênh (Fanpage, Zalo, quảng cáo…).`

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="catalog-form" size="sm" disabled={!canSubmit}>
            {saving && <Loader2 size={16} className="mr-1.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {mode === "create" ? "Tạo và chọn" : "Tạo link"}
          </Button>
        </div>
      }
    >
      <form id="catalog-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="catalog-name" className="text-body-sm font-bold text-text">
            Tên bộ sưu tập
          </label>
          <Input
            id="catalog-name"
            autoFocus
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Hoa chúc mừng 20/10"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="catalog-code" className="text-body-sm font-bold text-text">
            Đuôi link {codeRequired ? "" : <span className="font-normal text-text-muted">(không bắt buộc)</span>}
          </label>
          <Input
            id="catalog-code"
            required={codeRequired}
            maxLength={60}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="hoa-20-10"
            aria-describedby="catalog-code-hint"
            className={`${inputClass} font-mono`}
          />
          <p id="catalog-code-hint" className="text-caption text-text-muted">
            Link khách nhận:{" "}
            <span className="break-all font-mono font-semibold text-text">
              /bst/{orgSlug || "cua-hang"}/{normalized || (codeRequired ? "…" : "tự tạo")}
            </span>
          </p>
        </div>
        {error && <InlineError message={error} />}
      </form>
    </Dialog>
  )
}
