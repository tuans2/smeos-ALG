"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PlatformErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Platform ErrorBoundary]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center max-w-md mx-auto">
      <h2 className="text-title font-bold text-text mb-2">Chưa tải được trang Console này</h2>
      <p className="text-body-sm text-text-muted mb-6 leading-relaxed">
        Dữ liệu thao tác chưa bị mất. Thử tải lại, nếu vẫn lỗi hãy kiểm tra nhật ký vận hành nền tảng.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => reset()}>
          Tải lại trang
        </Button>
        <Link href="/van-hanh" className="inline-flex items-center justify-center h-12 px-5 text-title-sm font-semibold rounded-xl border border-border bg-transparent text-text hover:bg-surface-alt transition-colors">
          Về Console
        </Link>
      </div>
    </div>
  )
}
