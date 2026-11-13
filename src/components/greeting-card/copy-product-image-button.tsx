"use client"

import { useState } from "react"
import { Check, ImageIcon, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { TaskUiState } from "@/lib/ui-system/task-state"
import { driveThumbProxySrc } from "@/modules/greeting-card/domain/drive-thumb"


/** Ảnh bất kỳ (JPG/WEBP…) → PNG: clipboard trình duyệt chỉ nhận chắc chắn ảnh PNG. */
async function toPngBlob(src: string): Promise<Blob> {
  const res = await fetch(src)
  if (!res.ok) throw new Error("Không tải được ảnh")
  const bitmap = await createImageBitmap(await res.blob())
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không đổi được ảnh"))), "image/png"))
}

/** "Copy ảnh sản phẩm": chép ảnh gốc của mẫu để Sale dán gửi Điều phối (Zalo). Trình duyệt chặn → mở ảnh ở tab mới. */
export function CopyProductImageButton({ imageUrl, driveLink }: { imageUrl?: string | null | undefined; driveLink?: string | null | undefined }) {
  const [state, setState] = useState<Extract<TaskUiState, "idle" | "running" | "succeeded" | "failed">>("idle")
  const src = imageUrl || driveThumbProxySrc(driveLink)

  const handleCopy = async () => {
    if (!src) return
    setState("running")
    try {
      // ClipboardItem tạo ngay trong cú bấm (Safari yêu cầu), ảnh tải sau qua Promise
      await navigator.clipboard.write([new ClipboardItem({ "image/png": toPngBlob(src) })])
      setState("succeeded")
      setTimeout(() => setState("idle"), 2500)
    } catch {
      setState("failed")
      window.open(src, "_blank", "noopener")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleCopy()}
      disabled={!src || state === "running"}
      title={src ? (state === "failed" ? "Trình duyệt không cho chép ảnh — đã mở ảnh ở tab mới để bạn lưu/chép" : "Chép ảnh gốc của mẫu để dán gửi Điều phối") : "Mẫu này chưa có ảnh"}
      className="h-8 shrink-0 gap-1.5 whitespace-nowrap text-caption font-semibold text-text"
    >
      {state === "running" ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : state === "succeeded" ? <Check size={13} className="text-primary" /> : <ImageIcon size={13} />}
      <span>{state === "succeeded" ? "Đã chép ảnh" : "Copy ảnh sản phẩm"}</span>
    </Button>
  )
}
