"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PlatformFeedPost } from "./platform-feed-preview"

export interface SmartRepostTabProps {
  posts: PlatformFeedPost[]
  formatTime: (isoStr?: string | null) => string
  onSelectForRepost: (item: PlatformFeedPost) => void
}

/**
 * SmartRepostTab - Gợi ý các bài viết đã xuất bản thành công có hiệu quả cao
 */
export function SmartRepostTab({
  posts,
  formatTime,
  onSelectForRepost,
}: SmartRepostTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-title font-extrabold text-text flex items-center gap-2">
          <span>Đăng lại thông minh</span>
          <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-warning-bg text-warning-text border border-warning/30">
            ⚠️ GỢI Ý MÔ PHỎNG (MOCK ALGORITHM)
          </span>
        </div>
        <div className="text-meta text-text-muted mt-0.5">
          Gợi ý các bài viết đã xuất bản để tối ưu tần suất đăng (chỉ số tương tác hiện đang mô phỏng).
        </div>
      </div>

      {posts.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <div className="text-body-sm font-semibold text-text-muted">
            Chưa có bài viết nào ở trạng thái đã xuất bản thành công.
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {posts.map((item) => (
            <Card key={item.id} className="flex items-center justify-between p-3.5 border border-border">
              <div className="flex-1 min-w-0">
                <div className="text-body font-bold text-text truncate">{item.title}</div>
                <div className="text-caption text-text-muted mt-0.5">
                  {item.channel_label} · {formatTime(item.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning-text border border-warning/30">
                  Hiệu quả cao (Ước tính)
                </span>
                <Button
                  size="sm"
                  onClick={() => onSelectForRepost(item)}
                  className="text-caption font-bold"
                >
                  Đăng lại
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
