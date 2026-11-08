"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Globe } from "@/components/ui/icon-set/globe"
import { ExternalLink } from "@/components/ui/icon-set/external-link"

interface BrandKitSummary { landing: { published_path: string | null } }

/**
 * Nối công cụ Landing page với trang chính thức tạo ở mục Thương hiệu (bước 3): đã có thì mở / đổi giao diện
 * ở mục Thương hiệu; chưa có thì dẫn sang đó. Trang chiến dịch theo dịp vẫn tạo ở đây như cũ.
 */
export function OfficialLandingBanner() {
  const [path, setPath] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    fetch("/api/v1/brand-kit")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: BrandKitSummary } | null) => { if (alive) setPath(j?.data?.landing.published_path ?? null) })
      .catch(() => { if (alive) setPath(null) })
    return () => { alive = false }
  }, [])

  if (path === undefined) return null
  return (
    <section className="rounded-2xl bg-surface shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-labelledby="official-landing-title">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary"><Globe size={20} aria-hidden /></div>
        <div className="min-w-0">
          <h2 id="official-landing-title" className="text-body font-bold text-text">Trang chính thức của cửa hàng</h2>
          <p className="text-caption text-text-muted">
            {path ? "Đã xuất bản — đổi giao diện ở mục Thương hiệu." : "Chưa có — tạo ở mục Thương hiệu, đồng bộ với hồ sơ và bộ nhận diện."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {path && (
          <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border border-border text-body-sm font-semibold text-text hover:bg-surface-alt">
            Mở trang <ExternalLink size={14} aria-hidden />
          </a>
        )}
        <Link href="/ho-so" className="inline-flex items-center min-h-11 px-4 rounded-lg text-body-sm font-semibold text-primary hover:bg-primary/10">
          {path ? "Quản lý ở Thương hiệu" : "Tạo ở Thương hiệu"}
        </Link>
      </div>
    </section>
  )
}
