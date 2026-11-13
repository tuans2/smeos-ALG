"use client"

import React from "react"
import { Drawer } from "@/components/ui/drawer"

interface SheetProps {
  title: React.ReactNode
  /** Giữ để tương thích nơi gọi; `Drawer` tự gắn tiêu đề cho hộp thoại. */
  labelId: string
  onClose: () => void
  /** Nút bên trái tiêu đề (vd. "Quay lại"). */
  leading?: React.ReactNode
  /** Vùng cố định dưới cùng (vd. ô soạn tin). */
  footer?: React.ReactNode
  children: React.ReactNode
}

/**
 * Bảng trượt của hộp việc: toàn màn hình trên điện thoại, bảng bên phải trên màn rộng.
 * Dựng trên `Drawer` (ADR-011 D-UI-07): Esc / nút đóng / chạm nền, khoá cuộn, bẫy và trả focus.
 * Nội dung và chân sát mép (danh sách tin, ô soạn tin tự có lề) nên bù phần đệm của `Drawer`.
 */
export function Sheet({ title, onClose, leading, footer, children }: SheetProps) {
  return (
    <Drawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      size="md"
      className="bg-bg"
      title={leading ? <span className="flex items-center gap-1">{leading}<span className="min-w-0 truncate">{title}</span></span> : title}
      footer={footer && <div className="-mx-5 -mt-3.5 -mb-4">{footer}</div>}
    >
      <div className="-m-5 overscroll-contain">{children}</div>
    </Drawer>
  )
}
