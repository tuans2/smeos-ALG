"use client"

import React from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { useI18n } from "@/lib/i18n"

export function ContentGuidanceCard() {
  const { ti } = useI18n()
  const makerAction = ti("makerAction") || "chế tác"

  return (
    <FeatureGuidanceCard
      tag="HƯỚNG DẪN MÁY NỘI DUNG M07"
      icon={Sparkles}
      title="Sinh bài viết bán hàng đa kênh & đa góc độ"
      description="Tự động tạo nội dung tiếp thị thích ứng theo văn phong của từng mạng xã hội: Facebook cảm xúc, TikTok bắt trend, Instagram hình ảnh và Zalo ngắn gọn."
      tips={[
        `✍️ Chọn 1 trong 3 góc tiếp cận: Cảm xúc chạm tim, Kỹ thuật ${makerAction} hoặc Ưu đãi giới hạn`,
        "🎯 Tự động chèn hashtag thông minh và icon sinh động theo từng dịp",
        "📋 Copy 1-chạm hoặc chuyển thẳng sang hàng đợi đăng bài tự động",
      ]}
    />
  )
}
