"use client"

import React, { useEffect } from "react"
import { Loader2 } from "@/components/ui/icons"

/** Chuyển khách sang trang Thẻ chào (chạy trong trình duyệt, máy quét xem trước link không chạy). */
export function ShareLinkRedirect({ href, name }: { href: string; name: string }) {
  useEffect(() => {
    window.location.replace(href)
  }, [href])
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
      <Loader2 size={28} className="animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" />
      <p className="text-body font-bold text-text">Đang mở {name}…</p>
      <a href={href} className="text-body-sm font-semibold text-primary underline">Bấm vào đây nếu trang chưa tự mở</a>
    </main>
  )
}
