"use client"

import React, { useState } from "react"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { MessageSquareText } from "@/components/ui/icon-set/message-square-text"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface ZaloScriptBoxProps {
  script: string
  onScriptChange?: (newScript: string) => void
  onResetDefault?: () => void
  onCopySuccess?: () => void
  className?: string
}

/**
 * Template Kịch bản tư vấn Zalo (Chức năng Phân tích ảnh sản phẩm & Bán hàng)
 * Hộp văn bản emoji chuẩn hóa kịch bản Sales Rep, hỗ trợ copy 1-chạm.
 */
export function ZaloScriptBox({
  script,
  onScriptChange,
  onResetDefault,
  onCopySuccess,
  className,
}: ZaloScriptBoxProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
      onCopySuccess?.()
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
    }
  }

  return (
    <div className={`flex flex-col gap-4 max-w-2xl mx-auto w-full ${className ?? ""}`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-caption font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquareText size={14} className="text-primary" />
          Kịch bản tư vấn Zalo (Định dạng Emoji chuẩn Sales)
        </span>
        <div className="flex items-center gap-2">
          {onResetDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetDefault}
              className="text-caption text-text-muted hover:text-text h-7 px-2 gap-1"
            >
              <RefreshCw size={12} />
              Mặc định
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleCopy}
            className={`text-caption font-bold transition-all h-8 gap-1.5 ${
              copied
                ? "bg-secondary-text hover:bg-secondary-text/90 text-white shadow-xs"
                : "bg-primary hover:bg-primary/90 text-white shadow-xs"
            }`}
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                Đã sao chép kịch bản!
              </>
            ) : (
              <>
                <Copy size={14} />
                Sao chép 1-chạm gửi Zalo
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-surface-alt/60 px-4 py-2.5 text-caption text-text-muted">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles size={13} className="text-primary" />
            Tự động điền thông số sản phẩm, giá ưu đãi & quà tặng
          </span>
          <span className="text-caption font-mono text-text-muted/80">
            {script.length} ký tự
          </span>
        </div>

        <div className="p-4">
          <Textarea
            value={script}
            onChange={(e) => onScriptChange?.(e.target.value)}
            rows={18}
            className="w-full rounded-xl border border-border bg-surface-alt/30 p-3.5 font-sans text-body-sm leading-relaxed text-text outline-none focus:border-primary focus:bg-surface transition-colors"
            placeholder="Nội dung kịch bản tư vấn Zalo..."
          />
        </div>

        <div className="flex items-center justify-between border-t border-border bg-surface-alt/30 px-4 py-2 text-caption text-text-muted">
          <span>💡 Mẹo: Nhân viên có thể sửa trực tiếp văn bản ở trên trước khi bấm Sao chép.</span>
          <span>Hỗ trợ Zalo, Messenger, SMS</span>
        </div>
      </Card>
    </div>
  )
}
