"use client"

import React, { useEffect, useRef } from "react"

/**
 * Ảnh xem trước của tệp người dùng vừa chọn (chưa tải lên), vẽ lên `<canvas>` bằng `createImageBitmap`:
 * `fit="cover"` cắt giữa theo tỉ lệ khung như `object-cover`, `fit="contain"` thu vừa khung như `object-contain`.
 *
 * Không dựng object URL rồi gán vào `<img src>`: CodeQL `js/xss-through-dom` chặn đúng mẫu đó (tiền lệ
 * commit 2ff6852c bỏ hẳn ảnh xem trước). Ở đây giữ được ảnh mà không có URL nào đi vào DOM.
 * `width`/`height` là độ phân giải vẽ (px); kích thước hiển thị do `className` quyết định.
 */
export function LocalImagePreview({
  file,
  label,
  className,
  width = 128,
  height = 128,
  fit = "cover",
}: {
  file: File
  label: string
  className?: string
  width?: number
  height?: number
  fit?: "cover" | "contain"
}) {
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
        const { width: cw, height: ch } = canvas
        ctx.clearRect(0, 0, cw, ch)
        if (fit === "contain") {
          const scale = Math.min(cw / bmp.width, ch / bmp.height)
          const dw = bmp.width * scale
          const dh = bmp.height * scale
          ctx.drawImage(bmp, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
        } else {
          const target = cw / ch
          const sw = Math.min(bmp.width, bmp.height * target)
          const sh = sw / target
          ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, cw, ch)
        }
      })
      .catch(() => {
        // Trình duyệt không giải mã được ảnh: để ô trống, lỗi định dạng do máy chủ báo khi tải lên
      })
    return () => {
      cancelled = true
      bitmap?.close()
    }
  }, [file, fit])

  return <canvas ref={canvasRef} width={width} height={height} role="img" aria-label={label} className={className} />
}
