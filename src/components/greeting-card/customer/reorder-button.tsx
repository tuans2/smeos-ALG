"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "@/components/ui/icons"
import { readApiError } from "@/components/greeting-card/api-error"
import { familyHref } from "./use-order-family"

/** "Đặt thêm một đơn khác": mở link mới (mã đơn mới), đơn hiện tại giữ nguyên. */
export function ReorderButton({ sendCode, label = "Đặt thêm một đơn khác", primary = false }: {
  sendCode: string
  label?: string
  /** Nút chính (đơn trước không hoàn thành → kêu gọi đặt lại). */
  primary?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/public/brochure/${encodeURIComponent(sendCode)}/reorder`, { method: "POST" })
      if (!res.ok) throw new Error(await readApiError(res, "Chưa mở được đơn mới, vui lòng thử lại"))
      const data = (await res.json()) as { sendCode: string }
      // Khách chủ động mở đơn mới → trang đích ghi đây là chỗ đứng, không tự chuyển về đơn cũ
      router.push(familyHref(data.sendCode) as Parameters<typeof router.push>[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa mở được đơn mới, vui lòng thử lại")
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 flex w-full flex-col items-center gap-1">
      <Button variant="ghost"
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className={`py-0 inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-body-sm font-semibold disabled:opacity-60 ${
          primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border text-primary hover:bg-surface-alt"
        }`}
      >
        <Plus size={16} aria-hidden="true" />
        {busy ? "Đang mở đơn mới..." : label}
      </Button>
      {error && <p role="alert" className="text-caption text-danger">{error}</p>}
    </div>
  )
}
