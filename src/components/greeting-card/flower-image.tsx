"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Flower2 } from "@/components/ui/icons"
import { driveThumbProxySrc } from "./drive-thumb-image"

interface FlowerImageProps {
  src: string | null | undefined
  alt: string
  /** Link Google Drive (attributes.drive_link) — hiện ảnh Drive khi chưa có storage image. */
  driveLink?: string | null | undefined
  /** Lớp cho khung bọc (kích thước, bo góc, viền) — ảnh luôn phủ kín khung. */
  className?: string | undefined
  /** Gợi ý độ rộng hiển thị cho trình duyệt chọn tải (vd. "(max-width: 640px) 100vw, 400px"). */
  sizes?: string | undefined
  /** Ảnh nằm ngay màn đầu (thẻ đang xem) — tải sớm, không lazy. */
  priority?: boolean | undefined
  fit?: "cover" | "contain" | undefined
  /** `full` = biểu tượng + chữ (thẻ lớn); `icon` = chỉ biểu tượng (ô nhỏ). */
  fallback?: "full" | "icon" | undefined
  draggable?: boolean | undefined
  /** `absolute` khi ảnh phủ nền một khung đã định vị (thẻ lướt). */
  position?: "relative" | "absolute" | undefined
}


/**
 * Ảnh sản phẩm dùng chung — hỗ trợ 3 nguồn theo thứ tự ưu tiên:
 * 1. `src` (storage URL đã ký)
 * 2. `driveLink` → proxy `/api/v1/public/drive-thumb-proxy?folder_id=...`
 * 3. Placeholder icon
 *
 * `unoptimized` vì storage URL có chữ ký hết hạn theo phiên.
 */
export function FlowerImage({
  src,
  alt,
  driveLink,
  className = "",
  sizes = "100vw",
  priority = false,
  fit = "cover",
  fallback = "full",
  draggable,
  position = "relative",
}: FlowerImageProps) {
  const [storageFailed, setStorageFailed] = useState(false)
  const [driveFailed, setDriveFailed] = useState(false)

  // Xác định nguồn ảnh
  const hasStorage = !!(src && !storageFailed)
  const driveProxySrc = !hasStorage && !driveFailed ? driveThumbProxySrc(driveLink) : null
  const hasDrive = !!driveProxySrc

  const showPlaceholder = !hasStorage && !hasDrive

  const objectFitClass = fit === "cover" ? "object-cover" : "object-contain"

  return (
    <span className={`${position} block overflow-hidden ${className}`}>
      {showPlaceholder ? (
        <span
          role="img"
          aria-label={`${alt} — chưa có ảnh`}
          className="absolute inset-0 flex flex-col items-center justify-center bg-surface-alt text-text-muted"
        >
          <Flower2 size={fallback === "full" ? 40 : 18} className="text-primary/40" />
          {fallback === "full" && <span className="text-caption mt-1.5">Hình ảnh đang cập nhật</span>}
        </span>
      ) : hasStorage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized
          draggable={draggable}
          onError={() => setStorageFailed(true)}
          className={objectFitClass}
        />
      ) : (
        /* Drive proxy — dùng <img> vì URL không cần next/image optimization */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={driveProxySrc!}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          draggable={draggable}
          onError={() => setDriveFailed(true)}
          className={`absolute inset-0 h-full w-full ${objectFitClass}`}
        />
      )}
    </span>
  )
}
