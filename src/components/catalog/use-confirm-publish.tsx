"use client"

import type { ReactNode } from "react"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"

/**
 * Xuất bản trang công khai là hành động R3 (03c UX-015): luôn hỏi trước, nói rõ ai xem được và cách gỡ.
 * Trả về hàm xuất bản đã có bước xác nhận + phần tử hộp thoại để render.
 */
export function useConfirmPublish(onPublish: () => Promise<void>, what = "landing page"): [() => Promise<void>, ReactNode] {
  const [confirm, dialog] = useConfirmDialog()
  const guarded = async () => {
    const ok = await confirm({
      title: `Xuất bản ${what}?`,
      consequence: `Trang sẽ có link công khai — bất kỳ ai có link hoặc mã QR đều xem được tên tiệm, sản phẩm và giá đang chọn. Bạn có thể sửa nội dung hoặc tạm ẩn trang sau khi xuất bản.`,
      confirmLabel: "Xuất bản",
    })
    if (ok) await onPublish()
  }
  return [guarded, dialog]
}
