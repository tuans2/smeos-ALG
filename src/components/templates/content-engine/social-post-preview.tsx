"use client"

import React from "react"
import { Heart } from "@/components/ui/icon-set/heart"
import { MessageCircle } from "@/components/ui/icon-set/message-circle"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Bookmark } from "@/components/ui/icon-set/bookmark"
import { Send } from "@/components/ui/icon-set/send"
import { MoreHorizontal } from "@/components/ui/icon-set/more-horizontal"
import { ThumbsUp } from "@/components/ui/icon-set/thumbs-up"
import { Globe } from "@/components/ui/icon-set/globe"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Music } from "@/components/ui/icon-set/music"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import type { MultichannelPostItem } from "./multichannel-post-card"
import { LinkedInPreview } from "./linkedin-post-preview"
import { useI18n } from "@/lib/i18n"

export interface SocialPostPreviewProps {
  post: MultichannelPostItem
  productName?: string | undefined
  productImageUrl?: string | undefined
  shopName?: string | undefined
}

/**
 * SocialPostPreview - Giả lập giao diện hiển thị thực tế của bài đăng trên các nền tảng MXH
 */
export function SocialPostPreview({
  post,
  productName,
  productImageUrl,
  shopName,
}: SocialPostPreviewProps) {
  const { ti } = useI18n()
  const displayProductName = productName || ti("sampleProduct") || "Sản phẩm chính"
  const displayShopName = shopName || "Cửa hàng trực tuyến"

  if (post.channel === "facebook") {
    return (
      <FacebookPreview
        post={post}
        productName={displayProductName}
        productImageUrl={productImageUrl}
        shopName={displayShopName}
      />
    )
  }

  if (post.channel === "instagram") {
    return (
      <InstagramPreview
        post={post}
        productName={productName}
        productImageUrl={productImageUrl}
        shopName={shopName}
      />
    )
  }

  if (post.channel === "tiktok") {
    return (
      <TikTokPreview
        post={post}
        productName={productName}
        productImageUrl={productImageUrl}
        shopName={shopName}
      />
    )
  }

  if (post.channel === "linkedin") {
    return (
      <LinkedInPreview
        post={post}
        productName={productName}
        productImageUrl={productImageUrl}
        shopName={shopName}
      />
    )
  }

  return (
    <ZaloOAPreview
      post={post}
      productName={productName}
      productImageUrl={productImageUrl}
      shopName={shopName}
    />
  )
}

// ================= 1. FACEBOOK POST PREVIEW =================
function FacebookPreview({
  post,
  productName,
  productImageUrl,
  shopName,
}: SocialPostPreviewProps) {
  return (
    <div className="max-w-md mx-auto rounded-xl border border-border bg-white shadow-md overflow-hidden text-text font-sans">
      {/* Header */}
      <div className="p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary flex items-center justify-center text-white font-bold shadow-xs">
            🌸
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-body-sm font-bold leading-none">{shopName}</span>
            </div>
            <div className="flex items-center gap-1 text-caption text-text-muted mt-0.5">
              <span>Vừa xong</span>
              <span>•</span>
              <Globe size={11} />
            </div>
          </div>
        </div>
        <span className="text-text-muted hover:text-text-muted p-1" aria-hidden="true">
          <MoreHorizontal size={18} />
        </span>
      </div>

      {/* Post Content */}
      <div className="px-3.5 pb-3 text-caption leading-relaxed space-y-2">
        <div className="font-bold text-body-sm text-text">
          {post.headline}
        </div>
        <div className="whitespace-pre-line text-text">
          {post.bodyText}
        </div>
        {post.cta && (
          <div className="font-semibold text-info-text italic">
            👉 {post.cta}
          </div>
        )}
        {post.hashtags.length > 0 && (
          <div className="text-info-text font-medium flex flex-wrap gap-1">
            {post.hashtags.map((h, i) => (
              <span key={i}>{h.startsWith("#") ? h : `#${h}`}</span>
            ))}
          </div>
        )}
      </div>

      {/* Media Mockup */}
      <div className="w-full bg-gradient-to-br from-primary-muted via-primary-muted to-warning-bg aspect-[4/3] flex flex-col items-center justify-center relative p-6 text-center border-y border-border">
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
          <div className="flex flex-col items-center gap-2">
            <span className="text-5xl">💐</span>
            <div className="font-extrabold text-body-sm text-primary">{productName}</div>
            <span className="text-caption font-semibold text-primary bg-white/80 px-3 py-1 rounded-full backdrop-blur-xs border border-primary-muted/50">
              {shopName || "Cửa hàng chính hãng"}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-1 py-1 grid grid-cols-3 text-text-muted font-semibold text-caption text-center">
        <span className="flex items-center justify-center gap-1.5 py-2 rounded-md hover:bg-surface-alt transition" aria-hidden="true">
          <ThumbsUp size={15} />
          <span>Thích</span>
        </span>
        <span className="flex items-center justify-center gap-1.5 py-2 rounded-md hover:bg-surface-alt transition" aria-hidden="true">
          <MessageCircle size={15} />
          <span>Bình luận</span>
        </span>
        <span className="flex items-center justify-center gap-1.5 py-2 rounded-md hover:bg-surface-alt transition" aria-hidden="true">
          <Share2 size={15} />
          <span>Chia sẻ</span>
        </span>
      </div>
    </div>
  )
}

// ================= 2. INSTAGRAM POST PREVIEW =================
function InstagramPreview({
  post,
  productName,
  productImageUrl,
  shopName,
}: SocialPostPreviewProps) {
  return (
    <div className="max-w-md mx-auto rounded-xl border border-border bg-white shadow-md overflow-hidden text-text font-sans">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-warning via-primary to-accent">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-caption">
              🌸
            </div>
          </div>
          <div>
            <div className="text-caption font-bold leading-none">cuahang.alg</div>
            <div className="text-caption text-text-muted mt-0.5">{shopName}</div>
          </div>
        </div>
        <span className="text-text-muted p-1" aria-hidden="true">
          <MoreHorizontal size={16} />
        </span>
      </div>

      {/* 1:1 Aspect Media */}
      <div className="w-full aspect-square bg-gradient-to-tr from-accent-bg via-primary-muted to-primary-muted flex flex-col items-center justify-center relative p-6 text-center">
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
          <div className="flex flex-col items-center gap-2">
            <span className="text-6xl">🌷</span>
            <div className="font-extrabold text-body-sm text-text">{productName}</div>
            <div className="text-caption text-text-muted">Instagram Aesthetic Grid</div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="p-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Heart size={20} className="hover:text-primary cursor-pointer" />
            <MessageCircle size={20} className="cursor-pointer" />
            <Send size={20} className="cursor-pointer" />
          </div>
          <Bookmark size={20} className="cursor-pointer" />
        </div>

        <div className="text-caption font-bold mb-1.5">284 lượt thích</div>

        {/* Caption */}
        <div className="text-caption leading-relaxed space-y-1">
          <span className="font-bold mr-1.5">cuahang.alg</span>
          <span className="font-semibold">{post.headline}</span>
          <div className="text-text whitespace-pre-line mt-1">
            {post.bodyText}
          </div>
          {post.cta && (
            <div className="text-text-muted italic pt-1">
              ✨ {post.cta}
            </div>
          )}
          {post.hashtags.length > 0 && (
            <div className="text-info text-caption pt-1">
              {post.hashtags.map((h, i) => (
                <span key={i} className="mr-1">{h.startsWith("#") ? h : `#${h}`}</span>
              ))}
            </div>
          )}
        </div>

        <div className="text-caption uppercase text-text-muted tracking-wider mt-2 mb-1">
          25 PHÚT TRƯỚC
        </div>
      </div>
    </div>
  )
}

// ================= 3. TIKTOK VIDEO PREVIEW =================
function TikTokPreview({
  post,
  productName,
  productImageUrl,
  shopName,
}: SocialPostPreviewProps) {
  return (
    <div className="max-w-[320px] mx-auto rounded-2xl bg-black text-white shadow-2xl overflow-hidden aspect-[9/16] relative flex flex-col justify-between border-4 border-text font-sans">
      {/* Top Header */}
      <div className="pt-3 px-4 flex items-center justify-center gap-4 text-caption font-bold z-10 text-text-muted">
        <span>Đang theo dõi</span>
        <span className="text-white border-b-2 border-white pb-0.5">Dành cho bạn</span>
      </div>

      {/* Background Visual Mockup */}
      <div className="absolute inset-0 bg-gradient-to-b from-text via-text to-black flex items-center justify-center p-6 text-center">
        {productImageUrl ? (
          <img
            src={productImageUrl}
            alt={productName}
            onError={(e) => {
              e.currentTarget.src = "/images/sample-flower.jpg"
            }}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-80">
            <span className="text-7xl">🌺</span>
            <div className="text-body-sm font-extrabold">{productName}</div>
            {post.script?.hook && (
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-caption text-primary font-bold border border-primary/30">
                Hook: &quot;{post.script.hook}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Action Column */}
      <div className="absolute right-2.5 bottom-16 flex flex-col items-center gap-4 z-10 text-caption">
        {/* Avatar with + */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-white bg-primary flex items-center justify-center text-body-sm font-bold">
            🌸
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-caption font-black">
            +
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-black/40 backdrop-blur-xs">
            <Heart size={22} className="fill-primary text-primary" />
          </div>
          <span className="text-caption font-bold mt-0.5">18.4K</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-black/40 backdrop-blur-xs">
            <MessageCircle size={22} />
          </div>
          <span className="text-caption font-bold mt-0.5">342</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-black/40 backdrop-blur-xs">
            <Bookmark size={22} />
          </div>
          <span className="text-caption font-bold mt-0.5">1.2K</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-black/40 backdrop-blur-xs">
            <Share2 size={22} />
          </div>
          <span className="text-caption font-bold mt-0.5">486</span>
        </div>

        {/* Spinning Vinyl */}
        <div className="w-8 h-8 rounded-full bg-text border-2 border-text animate-spin motion-reduce:animate-none flex items-center justify-center">
          <Music size={14} className="text-white" />
        </div>
      </div>

      {/* Bottom Info Overlay */}
      <div className="p-3.5 z-10 bg-gradient-to-t from-black via-black/80 to-transparent pr-14 text-left">
        <div className="text-body-sm font-extrabold flex items-center gap-1.5">
          <span>@cuahang_smeos</span>
          <CheckCircle2 size={13} className="text-info fill-info text-black" />
        </div>

        <div className="text-caption font-bold text-white mt-1 line-clamp-1">
          {post.headline}
        </div>

        <div className="text-caption text-text-muted line-clamp-2 mt-0.5 leading-snug">
          {post.bodyText}
        </div>

        {post.hashtags.length > 0 && (
          <div className="text-caption font-bold text-white/90 line-clamp-1 mt-1">
            {post.hashtags.map((h, i) => (
              <span key={i} className="mr-1">{h.startsWith("#") ? h : `#${h}`}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-caption text-text-muted mt-2">
          <Music size={12} className="animate-pulse motion-reduce:animate-none" />
          <span className="truncate">
            {post.script?.audio_suggestion || "Nhạc nền thịnh hành - Trending Sound"}
          </span>
        </div>
      </div>
    </div>
  )
}

// ================= 4. ZALO OA PREVIEW =================
function ZaloOAPreview({
  post,
  productName,
  productImageUrl,
  shopName,
}: SocialPostPreviewProps) {
  return (
    <div className="max-w-md mx-auto rounded-xl border border-border bg-[var(--color-zalo-bg)] shadow-md overflow-hidden font-sans">
      {/* Zalo Top Bar */}
      <div className="bg-[var(--color-zalo)] text-white p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white text-[var(--color-zalo)] font-bold flex items-center justify-center text-caption">
            🌸
          </div>
          <div>
            <div className="text-caption font-bold flex items-center gap-1">
              <span>{shopName}</span>
              <span className="text-caption bg-warning text-warning-text font-black px-1.5 py-0.2 rounded-full uppercase">
                OA
              </span>
            </div>
            <div className="text-caption text-info-bg">Đã xác thực doanh nghiệp</div>
          </div>
        </div>
        <div className="text-caption font-semibold bg-white/20 px-2.5 py-1 rounded-full">
          Zalo OA
        </div>
      </div>

      {/* Message Area */}
      <div className="p-3.5 space-y-3">
        <div className="text-center">
          <span className="text-caption text-text-muted bg-surface-alt/80 px-2.5 py-0.5 rounded-full">
            Hôm nay 09:30
          </span>
        </div>

        {/* Message Bubble */}
        <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-xs border border-border/60 space-y-2 text-text">
          <div className="text-body-sm font-extrabold text-[var(--color-zalo)]">
            {post.headline}
          </div>

          <div className="text-caption text-text leading-relaxed whitespace-pre-line">
            {post.bodyText}
          </div>

          {/* Media in Chat */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-tr from-info-bg to-primary-muted aspect-[16/9] flex items-center justify-center border border-border/40 text-center p-3">
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
              <div className="flex flex-col items-center gap-1">
                <span className="text-display-lg">💐</span>
                <span className="text-caption font-bold text-text">{productName}</span>
                <span className="text-caption text-text-muted">Mẫu sản phẩm mới nhất</span>
              </div>
            )}
          </div>

          {post.cta && (
            <div className="text-caption font-bold text-warning-text bg-warning-bg p-2.5 rounded-lg border border-warning-border/60">
              💬 {post.cta}
            </div>
          )}

          {/* Interactive OA Quick Action Buttons */}
          <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
            <span className="py-2 px-3 rounded-lg bg-[var(--color-zalo)] text-white text-caption font-bold hover:bg-info-text transition flex items-center justify-center gap-1" aria-hidden="true">
              <span>Nhắn tin tư vấn</span>
            </span>
            <span className="py-2 px-3 rounded-lg bg-surface-alt text-text text-caption font-bold hover:bg-border transition flex items-center justify-center gap-1" aria-hidden="true">
              <span>Xem album mẫu</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
