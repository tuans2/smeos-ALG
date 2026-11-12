"use client"

import { ImageOff } from "@/components/ui/icon-set/image-off"
import { DriveThumbImage } from "@/components/greeting-card/drive-thumb-image"

type Props = {
  name: string
  masterImageUrl?: string | undefined
  driveLink?: string | undefined
  size: "card" | "row"
  /** Ảnh trong khung nhìn đầu tiên: tải ngay, ưu tiên cao (LCP). */
  priority?: boolean | undefined
}

/** Ảnh sản phẩm: ảnh lưu trữ → thumbnail Google Drive → ô "Chưa có ảnh". */
export function ProductThumb({ name, masterImageUrl, driveLink, size, priority = false }: Props) {
  const imgClass = size === "card"
    ? "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    : "h-full w-full object-cover"
  if (masterImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={masterImageUrl}
        alt={name}
        className={imgClass}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    )
  }
  if (driveLink) return <DriveThumbImage driveLink={driveLink} alt={name} className="h-full w-full" fallback={size === "card" ? "full" : "icon"} />
  return size === "card" ? (
    // Ô thay ảnh chỉ trang trí: nằm trong nút đã có nhãn, chữ ở đây không được làm lệch tên nút (WCAG 2.5.3)
    <div aria-hidden="true" className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-text-muted">
      <ImageOff size={28} strokeWidth={1.5} />
      <span className="text-caption">Chưa có ảnh</span>
    </div>
  ) : (
    <div className="flex h-full w-full items-center justify-center text-text-muted">
      <ImageOff size={16} strokeWidth={1.5} />
    </div>
  )
}
