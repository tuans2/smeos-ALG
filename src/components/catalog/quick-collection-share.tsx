"use client"

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Check, Copy, ExternalLink, Share2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

/** Kết quả "Tạo nhanh bộ sưu tập": chép link, chép tin nhắn mẫu, gửi qua Zalo. */
export function QuickCollectionShare({
  publishedUrl,
  customerMessage,
  customerPhone,
}: {
  publishedUrl: string | null
  customerMessage: string
  customerPhone: string
}) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const finalMessage = publishedUrl ? customerMessage.replace("{URL}", publishedUrl) : ""

  const handleCopyLinkOnly = async () => {
    if (!publishedUrl) return
    await navigator.clipboard.writeText(publishedUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyCustomerMessage = async () => {
    if (!publishedUrl) return
    await navigator.clipboard.writeText(finalMessage)
    setCopiedMessage(true)
    setTimeout(() => setCopiedMessage(false), 2000)
  }

  const handleOpenZaloWeb = () => {
    if (!publishedUrl) return
    const phone = customerPhone.replace(/[^0-9]/g, "")
    const url = phone
      ? `https://zalo.me/${phone}?text=${encodeURIComponent(finalMessage)}`
      : `https://zalo.me/?text=${encodeURIComponent(finalMessage)}`
    window.open(url, "_blank")
  }

  return (
    <div className="space-y-4 py-2">
      <div className="p-4 rounded-2xl bg-success-bg border border-success/30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-success text-white flex items-center justify-center shrink-0">
          <Check size={20} />
        </div>
        <div>
          <div className="text-body-sm font-extrabold text-success">
            Đã tạo xong link bộ sưu tập!
          </div>
          <div className="text-caption text-text-muted">
            Sẵn sàng gửi cho khách hàng.
          </div>
        </div>
      </div>

      {/* Ô Copy Link */}
      <div className="space-y-1.5">
        <label className="block text-caption font-bold text-text">
          1. Link xem bộ sưu tập
        </label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            aria-label="Link xem bộ sưu tập"
            value={publishedUrl || ""}
            className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-body-sm text-text focus:outline-none select-all font-mono"
          />
          <Button
            variant={copiedLink ? "outline" : "primary"}
            onClick={handleCopyLinkOnly}
            className={`gap-1.5 text-caption font-bold px-3.5 h-9 shrink-0 shadow-xs transition-all ${
              copiedLink
                ? "border-success text-success bg-success-bg"
                : "ring-2 ring-primary/25 hover:ring-primary/40"
            }`}
          >
            {copiedLink ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            {copiedLink ? "Đã chép link!" : "Sao chép link"}
          </Button>
          {publishedUrl && (
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl border border-border hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
              title="Mở xem thử"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>

      {/* Soạn sẵn tin nhắn mẫu gửi khách */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-caption font-bold text-text">
            2. Tin nhắn mẫu gửi khách
          </label>
          <Button variant="outline"
            type="button"
            onClick={handleCopyCustomerMessage}
            className={`h-auto text-caption font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              copiedMessage
                ? "border-success text-success bg-success-bg hover:bg-success-bg"
                : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 shadow-2xs"
            }`}
          >
            {copiedMessage ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            {copiedMessage ? "Đã chép tin!" : "Sao chép tin nhắn"}
          </Button>
        </div>
        <Textarea
          readOnly
          aria-label="Tin nhắn mẫu gửi khách"
          rows={3}
          value={finalMessage}
          className="w-full p-2.5 rounded-xl bg-surface border border-border text-body-sm text-text focus:outline-none leading-relaxed"
        />
      </div>

      {/* Nút gửi trực tiếp qua Zalo */}
      <div className="pt-2">
        <Button variant="primary"
          type="button"
          onClick={handleOpenZaloWeb}
          className="h-auto w-full py-2.5 px-4 rounded-xl bg-primary text-surface font-bold text-body-sm flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
        >
          <Share2 size={16} />
          <span>Gửi qua Zalo</span>
        </Button>
      </div>
    </div>
  )
}
