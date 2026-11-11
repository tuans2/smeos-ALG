"use client"

// Lưới an toàn cuối cùng cho lỗi ở chính layout gốc: Next.js thay TOÀN BỘ layout
// gốc bằng tệp này, nên phải tự dựng <html>/<body> và nạp lại CSS toàn cục.
// (Chuyển từ nhánh fix/app-shell-states; các màn 404/lỗi/đang tải đã có trên main.)

import "./globals.css"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      {/* Layout gốc bị thay hoàn toàn nên metadata không áp dụng: tự khai tiêu đề (WCAG 2.4.2) */}
      <head>
        <title>smeOS tạm thời không tải được</title>
      </head>
      <body className="min-h-dvh bg-bg text-text antialiased">
        <main role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-caption font-semibold uppercase tracking-wider text-danger-text">Lỗi hệ thống</p>
          <h1 className="text-title font-bold">smeOS tạm thời không tải được</h1>
          <p className="text-body-sm text-text-muted">Vui lòng thử lại sau ít phút. Dữ liệu của tiệm không bị ảnh hưởng.</p>
          <Button
            type="button"
            onClick={() => reset()}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-body-sm font-semibold text-surface hover:bg-primary-dark"
          >
            Thử lại
          </Button>
          {error.digest && <p className="text-caption text-text-muted">Mã lỗi: {error.digest}</p>}
        </main>
      </body>
    </html>
  )
}
