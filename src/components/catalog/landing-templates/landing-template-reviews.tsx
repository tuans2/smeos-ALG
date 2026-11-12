"use client"

import React from "react"
import { Star, MessageSquareQuote, CheckCircle2 } from "@/components/ui/icons"

export interface ReviewItem {
  id: string
  author: string
  occasion: string
  rating: number
  comment: string
  /** Chỉ đánh dấu "Đã mua hàng" khi hệ thống đối chiếu được đơn thật — đánh giá chủ tiệm nhập thì không */
  verified?: boolean | undefined
}

interface LandingTemplateReviewsProps {
  archetypeId?: string | undefined
  reviews?: readonly ReviewItem[] | undefined
}

/**
 * Chỉ hiển thị đánh giá THẬT do cửa hàng cung cấp. Trước đây mục này luôn hiện 3 đánh giá 5 sao viết cứng
 * gắn nhãn "đã xác minh" trên mọi trang công khai — đánh giá giả (audit sâu MEUX 29/10/2026).
 */

export function LandingTemplateReviews({
  archetypeId = "minimal-luxury",
  reviews = [],
}: LandingTemplateReviewsProps) {
  if (reviews.length === 0) return null
  const isLuxury = archetypeId === "minimal-luxury"
  const isRomantic = archetypeId === "pastel-romantic"
  const isFestive = archetypeId === "festive-sale"
  // Điểm & số lượng tính từ đánh giá thật — không hiển thị con số cố định
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-caption font-bold text-text uppercase tracking-wider">
          <MessageSquareQuote size={14} className={isLuxury || isRomantic ? "text-primary" : isFestive ? "text-primary" : "text-warning-text"} />
          <span className={isLuxury ? "font-display" : ""}>
            {"Khách hàng nói gì"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-caption text-text-muted">
          <div className="flex text-warning-text">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={11} fill={i < Math.round(avgRating) ? "currentColor" : "none"} aria-hidden="true" />
            ))}
          </div>
          <span className={`font-bold ${isLuxury ? "font-display text-primary" : "text-text"}`}>{avgRating.toFixed(1)}/5</span>
          <span className={isLuxury ? "font-display" : ""}>({reviews.length} đánh giá)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between space-y-3 transition-all ${
              isLuxury
                ? "bg-surface-alt/60 border-primary/20 hover:border-primary/50"
                : isFestive
                ? "bg-surface border-primary/20 hover:border-primary"
                : "bg-surface border-border hover:border-primary/50"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex text-warning-text">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} size={11} fill="currentColor" />
                  ))}
                </div>
                {rev.verified && (
                  <span className="text-caption font-medium text-success flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    <span>Đã mua hàng</span>
                  </span>
                )}
              </div>
              <p className={`text-caption leading-relaxed italic ${isLuxury ? "font-display text-text text-body-sm" : "text-text-muted"}`}>
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>

            <div className={`pt-2 border-t flex items-center justify-between text-caption ${
              isLuxury ? "border-primary/15 font-display" : "border-border"
            }`}>
              <span className={`font-bold ${isLuxury ? "text-primary" : "text-text"}`}>{rev.author}</span>
              <span className={isLuxury ? "text-text-muted italic" : "text-text-muted"}>{rev.occasion}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
