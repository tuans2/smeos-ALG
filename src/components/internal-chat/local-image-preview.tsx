"use client"

import React, { useEffect, useRef } from "react"

/**
 * Ảnh xem trước của tệp người dùng vừa chọn (chưa gửi), vẽ lên `<canvas>` bằng `createImageBitmap`.
 * Không dựng object URL rồi gán vào `<img src>` — CodeQL `js/xss-through-dom` chặn đúng mẫu đó
 * (tiền lệ: commit 2ff6852c bỏ hẳn ảnh xem trước; ở đây giữ được ảnh mà không có URL nào đi vào DOM).
 */
export function LocalImagePreview({ file, label, className }: { file: File; label: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let bitmap: ImageBitmap | null = null
    void createImageBitmap(file)
      .then((bmp) => {
        bitmap = bmp
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (cancelled || !canvas || !ctx) return
        // Cắt giữa ảnh thành ô vuông (như object-cover) ở độ phân giải gấp đôi khung hiển thị
        const size = canvas.width
        const side = Math.min(bmp.width, bmp.height)
        ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size)
      })
      .catch(() => {
        // Trình duyệt không giải mã được ảnh — để ô trống, lỗi định dạng do máy chủ báo khi gửi
      })
    return () => {
      cancelled = true
      bitmap?.close()
    }
  }, [file])

  return <canvas ref={canvasRef} width={128} height={128} role="img" aria-label={label} className={className} />
}
