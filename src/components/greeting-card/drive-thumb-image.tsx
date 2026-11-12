"use client"

import { useState } from "react"
import { Flower2 } from "@/components/ui/icons"
import { driveThumbProxySrc } from "@/modules/greeting-card/domain/drive-thumb"

export { driveThumbProxySrc }

interface DriveThumbImageProps {
  driveLink: string
  alt: string
  className?: string
  /** `full` = biểu tượng + chữ (ô lớn); `icon` = chỉ biểu tượng (ô nhỏ). */
  fallback?: "full" | "icon"
}

/**
 * Hiển thị thumbnail của thư mục Google Drive qua proxy nội bộ
 * `/api/v1/public/drive-thumb-proxy?folder_id=...`.
 *
 * Server tự fetch lh3.googleusercontent.com nên browser không cần auth Google.
 * Không cần state async — URL proxy được tính toán đồng bộ từ driveLink.
 */
export function DriveThumbImage({
  driveLink,
  alt,
  className = "",
  fallback = "icon",
}: DriveThumbImageProps) {
  const [broken, setBroken] = useState(false)

  const proxySrc = driveThumbProxySrc(driveLink)

  if (!proxySrc || broken) {
    return (
      <span className={`relative block overflow-hidden ${className}`}>
        <span
          role="img"
          aria-label={`${alt} — chưa có ảnh`}
          className="absolute inset-0 flex flex-col items-center justify-center bg-surface-alt text-text-muted"
        >
          <Flower2 size={fallback === "full" ? 40 : 18} className="text-primary/40" />
          {fallback === "full" && (
            <span className="text-caption mt-1.5">Hình ảnh đang cập nhật</span>
          )}
        </span>
      </span>
    )
  }

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxySrc}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    </span>
  )
}
