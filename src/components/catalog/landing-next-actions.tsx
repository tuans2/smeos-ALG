"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import {
  ExternalLink,
  Copy,
  Check,
  Download,
  Share2,
  PlusCircle,
  Sparkles,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

interface LandingNextActionsProps {
  publishedUrl: string
  campaignSlug: string
  occasionName: string
  onDownloadQR: () => Promise<void>
  downloadingQR?: boolean
  onCreateNewCampaign: () => void
}

export function LandingNextActions({
  publishedUrl,
  campaignSlug,
  occasionName,
  onDownloadQR,
  downloadingQR = false,
  onCreateNewCampaign,
}: LandingNextActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareZalo = () => {
    const text = encodeURIComponent(`Mời bạn xem bộ sưu tập hoa ${occasionName} tại tiệm: ${publishedUrl}`)
    window.open(`https://zalo.me/share?url=${encodeURIComponent(publishedUrl)}&title=${text}`, "_blank")
  }

  return (
    <div className="rounded-2xl border border-success-border bg-surface p-6 shadow-xs space-y-6">
      {/* Banner thành công */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-success-bg flex items-center justify-center text-success shrink-0 mt-0.5">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-bg text-success text-caption font-bold uppercase tracking-wider mb-1">
              Xuất bản thành công
            </div>
            <h3 className="text-title font-bold text-text">
              Trang Landing Page chiến dịch đã sẵn sàng hoạt động!
            </h3>
            <p className="text-body-sm text-text-muted mt-0.5">
              Đường dẫn công khai đã được kích hoạt và mã QR tiếp thị đã được tạo.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onCreateNewCampaign}
          className="shrink-0 flex items-center gap-1.5 border-border hover:bg-surface-alt text-caption font-semibold"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Tạo chiến dịch mới</span>
        </Button>
      </div>

      {/* Thông tin đường link & QR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Link công khai */}
        <div className="rounded-xl border border-border bg-surface-alt/60 p-4 space-y-2.5">
          <div className="text-caption font-bold text-text-muted uppercase tracking-wider">
            Đường dẫn công khai
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              aria-label="Đường dẫn công khai của trang"
              value={publishedUrl}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-body-sm text-text font-mono truncate select-all"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1.5 text-caption font-semibold"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Đã chép" : "Sao chép"}</span>
            </Button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline font-semibold"
            >
              <span>Xem trang thực tế trên web</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Mã QR */}
        <div className="rounded-xl border border-border bg-surface-alt/60 p-4 space-y-2.5 flex items-center justify-between">
          <div>
            <div className="text-caption font-bold text-text-muted uppercase tracking-wider">
              Mã QR Tiếp thị Độ nét cao
            </div>
            <p className="text-caption text-text-muted mt-1 max-w-[220px]">
              Tải ảnh QR để in thiệp chúc mừng, standee hoặc đặt tại quầy thu ngân.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onDownloadQR}
            disabled={downloadingQR}
            className="shrink-0 flex items-center gap-1.5 border-primary text-primary hover:bg-primary-muted/20 text-caption font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{downloadingQR ? "Đang tải..." : "Tải ảnh QR (PNG)"}</span>
          </Button>
        </div>
      </div>

      {/* Khối Next Best Actions (J3) */}
      <div className="pt-2 border-t border-border space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-body-sm uppercase tracking-wider">
          <Sparkles className="h-4 w-4" />
          <span>Việc nên làm tiếp</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline"
            type="button"
            onClick={handleShareZalo}
            className="h-auto text-[length:inherit] justify-start font-[inherit] gap-0 flex flex-col items-start p-3.5 rounded-xl border border-border bg-surface hover:bg-primary-muted/10 hover:border-primary-border text-left transition-colors cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-lg bg-info-bg text-info flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Share2 className="h-4 w-4" />
            </div>
            <span className="text-body-sm font-bold text-text">Gửi link qua Zalo chào khách</span>
            <span className="text-caption text-text-muted mt-1">
              Gửi trực tiếp cho khách quen qua tin nhắn Zalo kèm lời mời xem hoa.
            </span>
          </Button>

          <Button variant="outline"
            type="button"
            onClick={onDownloadQR}
            className="h-auto text-[length:inherit] justify-start font-[inherit] gap-0 flex flex-col items-start p-3.5 rounded-xl border border-border bg-surface hover:bg-primary-muted/10 hover:border-primary-border text-left transition-colors cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-lg bg-success-bg text-success flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Download className="h-4 w-4" />
            </div>
            <span className="text-body-sm font-bold text-text">In QR dán lên thiệp tặng</span>
            <span className="text-caption text-text-muted mt-1">
              In mã QR dán thiệp để người nhận hoa quét xem thông điệp và câu chuyện hoa.
            </span>
          </Button>

        </div>
      </div>
    </div>
  )
}
