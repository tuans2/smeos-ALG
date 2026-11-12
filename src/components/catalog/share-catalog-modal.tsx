"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Copy,
  Check,
  Sparkles,
  MessageCircle,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { isHrefInPhase } from "@/lib/delivery/delivery-phase"

interface ShareCatalogModalProps {
  slug: string
  name: string
  description?: string | null
  onClose: () => void
}

export function ShareCatalogModal({ slug, name, description, onClose }: ShareCatalogModalProps) {
  const router = useRouter()
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)

  const catalogUrl = typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : `/c/${slug}`

  const sampleCaption = `🌸 Tiệm hoa vừa ra mắt Bộ sưu tập mới: ${name}!
${description ? `\n"${description}"\n` : ""}
✨ Sản phẩm tuyển chọn mỗi ngày, tặng kèm thiệp thiết kế & banner in màu.
👉 Xem trọn bộ sản phẩm và đặt trực tuyến tại:
${catalogUrl}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(catalogUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(sampleCaption)
    setCopiedCaption(true)
    setTimeout(() => setCopiedCaption(false), 2000)
  }

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(catalogUrl)}`
    window.open(fbUrl, "_blank", "width=600,height=500")
  }

  const handleShareZalo = () => {
    const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(catalogUrl)}`
    window.open(zaloUrl, "_blank", "width=600,height=500")
  }

  const handleOpenM07 = () => {
    onClose()
    router.push(`/noi-dung?catalog_slug=${slug}&catalog_name=${encodeURIComponent(name)}` as never)
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Chia sẻ Catalog Đa Nền Tảng"
      description={name}
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Input
            readOnly
            value={catalogUrl}
            className="flex-1 px-3 py-2 rounded-xl bg-surface border text-caption text-text-muted focus:outline-none"
          />
          <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-9 gap-1 text-caption shrink-0">
            {copiedLink ? (
              <>
                <Check size={14} className="text-success" />
                <span className="text-success">Đã chép</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy link</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 1. Quick Share 1-Click Buttons */}
        <div>
          <label className="block text-caption font-bold text-text mb-2">1. Chia sẻ nhanh 1-chạm lên Mạng xã hội</label>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline"
              onClick={handleShareFacebook}
              type="button"
              className="h-auto p-3 rounded-2xl border border-info/20 bg-info/5 hover:bg-info/10 text-info text-caption font-bold flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
              <svg className="w-4 h-4 text-info fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Đăng lên Facebook</span>
            </Button>
            <Button variant="outline"
              onClick={handleShareZalo}
              type="button"
              className="h-auto p-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-caption font-bold flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
              <MessageCircle size={16} className="text-primary" />
              <span>Chia sẻ lên Zalo</span>
            </Button>
          </div>
        </div>

        {/* 2. Sample Caption Box */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-caption font-bold text-text">2. Mẫu bài viết bán hàng (Caption gợi ý)</label>
            <Button variant="ghost"
              onClick={handleCopyCaption}
              type="button"
              className="h-auto px-0 py-0 text-caption font-bold text-primary hover:underline flex items-center gap-1"
            >
              {copiedCaption ? (
                <>
                  <Check size={13} className="text-success" />
                  <span className="text-success">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Chép mẫu</span>
                </>
              )}
            </Button>
          </div>
          <div className="p-3 rounded-2xl bg-surface border border-border text-caption text-text leading-relaxed whitespace-pre-wrap font-sans max-h-28 overflow-y-auto">
            {sampleCaption}
          </div>
        </div>

        {/* 3. Deep Integration with Content Engine */}
        {isHrefInPhase("/noi-dung") && <div className="p-4 rounded-2xl bg-surface-alt border border-primary/20 space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary shrink-0" />
            <span className="text-caption font-bold text-text">Quảng bá tự động với AI Content Engine</span>
          </div>
          <p className="text-caption text-text-muted leading-relaxed">
            Chuyển Catalog này sang xưởng nội dung để AI tự động viết bài đa kênh (Fanpage, Instagram, TikTok, Zalo OA) và chuẩn bị lịch xuất bản tự động.
          </p>
          <Button
            onClick={handleOpenM07}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-caption h-9 gap-1.5 shadow-xs"
          >
            <Sparkles size={14} />
            <span>Soạn bài chiến dịch cho Catalog này</span>
          </Button>
        </div>}
      </div>
    </Dialog>
  )
}

