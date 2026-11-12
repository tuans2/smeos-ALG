"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { ThumbsUp } from "@/components/ui/icon-set/thumbs-up"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { Repeat } from "@/components/ui/icon-set/repeat"
import { Send } from "@/components/ui/icon-set/send"
import { MoreHorizontal } from "@/components/ui/icon-set/more-horizontal"
import { Globe } from "@/components/ui/icon-set/globe"
import { Building2 } from "@/components/ui/icon-set/building2"
import type { SocialPostPreviewProps } from "./social-post-preview"

/**
 * LinkedInPreview - Mô phỏng giao diện bài viết chuyên nghiệp B2B trên LinkedIn Feed
 */
export function LinkedInPreview({
  post,
  productName = "Sản phẩm quà tặng cao cấp",
  productImageUrl,
  shopName = "smeOS Business Solutions",
}: SocialPostPreviewProps) {
  return (
    <div className="max-w-md mx-auto rounded-xl border border-border bg-white shadow-md overflow-hidden text-text font-sans">
      {/* Header bài đăng LinkedIn */}
      <div className="p-3.5 flex items-start justify-between">
        <div className="flex items-start gap-2.5">
          <div className="w-11 h-11 rounded-full bg-[var(--color-linkedin)]/10 border border-[var(--color-linkedin)]/20 text-[var(--color-linkedin)] flex items-center justify-center font-black text-body-sm shadow-xs flex-shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-body-sm font-bold text-text leading-tight">
                {shopName}
              </span>
              <span className="text-caption text-text-muted font-normal">• 1st</span>
            </div>
            <div className="text-caption text-text-muted leading-tight mt-0.5 line-clamp-1">
              Giải Pháp Hoa Tươi & Quà Tặng Doanh Nghiệp Cao Cấp
            </div>
            <div className="flex items-center gap-1 text-caption text-text-muted mt-1">
              <span>Vừa xong</span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Globe size={10} /> Đã chỉnh sửa
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost"
            type="button"
            aria-label="Thêm tùy chọn"
            className="text-[length:inherit] h-auto font-[inherit] gap-0 text-text-muted hover:text-text-muted p-1 transition-colors cursor-pointer"
            onClick={() => undefined}
          >
            <MoreHorizontal size={18} />
          </Button>
        </div>
      </div>

      {/* Nội dung bài viết */}
      <div className="px-3.5 pb-3 text-caption leading-relaxed space-y-2">
        {post.headline && (
          <div className="font-extrabold text-body text-text leading-snug">
            {post.headline}
          </div>
        )}
        <div className="whitespace-pre-line text-text text-meta leading-relaxed">
          {post.bodyText}
        </div>

        {post.cta && (
          <div className="font-semibold text-[var(--color-linkedin)] bg-info-bg/70 p-2.5 rounded-lg border border-info-border text-caption">
            💼 {post.cta}
          </div>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="text-[var(--color-linkedin)] font-semibold flex flex-wrap gap-1.5 pt-1 text-caption">
            {post.hashtags.map((h, i) => (
              <span key={i} className="hover:underline cursor-pointer">
                {h.startsWith("#") ? h : `#${h}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ảnh đính kèm */}
      <div className="w-full bg-gradient-to-br from-surface-alt via-info-bg to-info-bg aspect-[16/10] flex flex-col items-center justify-center relative overflow-hidden border-y border-border">
        {productImageUrl ? (
          <img
            src={productImageUrl}
            alt={productName}
            onError={(e) => {
              e.currentTarget.src = "/images/sample-flower.jpg"
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-display border border-border">
              💐
            </div>
            <div className="font-extrabold text-body-sm text-text">
              {productName}
            </div>
            <span className="text-caption font-semibold text-[var(--color-linkedin)] bg-info-bg px-3 py-1 rounded-full border border-info-border/50">
              B2B Premium Floral Styling · smeOS
            </span>
          </div>
        )}
      </div>

      {/* Thống kê tương tác LinkedIn */}
      <div className="px-3.5 py-2 flex items-center justify-between text-caption text-text-muted border-b border-border">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--color-linkedin)] text-white text-caption shadow-xs">
              👍
            </span>
            <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-warning text-text text-caption shadow-xs">
              💡
            </span>
            <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-primary text-white text-caption shadow-xs">
              ❤️
            </span>
          </div>
          <span className="font-medium hover:text-[var(--color-linkedin)] hover:underline cursor-pointer">
            Nguyễn Tuấn và 64 người khác
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hover:text-[var(--color-linkedin)] hover:underline cursor-pointer">18 bình luận</span>
          <span>•</span>
          <span className="hover:text-[var(--color-linkedin)] hover:underline cursor-pointer">6 lượt đăng lại</span>
        </div>
      </div>

      {/* Thanh hành động LinkedIn (Like, Comment, Repost, Send) */}
      <div className="px-2 py-1.5 grid grid-cols-4 gap-1 text-caption font-semibold text-text-muted">
        <Button variant="ghost"
          type="button"
          className="px-0 text-[length:inherit] h-auto font-[inherit] flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
          onClick={() => undefined}
        >
          <ThumbsUp size={15} />
          <span>Thích</span>
        </Button>
        <Button variant="ghost"
          type="button"
          className="px-0 text-[length:inherit] h-auto font-[inherit] flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
          onClick={() => undefined}
        >
          <MessageSquare size={15} />
          <span>Bình luận</span>
        </Button>
        <Button variant="ghost"
          type="button"
          className="px-0 text-[length:inherit] h-auto font-[inherit] flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
          onClick={() => undefined}
        >
          <Repeat size={15} />
          <span>Đăng lại</span>
        </Button>
        <Button variant="ghost"
          type="button"
          className="px-0 text-[length:inherit] h-auto font-[inherit] flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
          onClick={() => undefined}
        >
          <Send size={15} />
          <span>Gửi</span>
        </Button>
      </div>
    </div>
  )
}
