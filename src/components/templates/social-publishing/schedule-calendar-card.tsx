"use client"

import React, { useState } from "react"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Clock } from "@/components/ui/icon-set/clock"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Filter } from "@/components/ui/icon-set/filter"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Send } from "@/components/ui/icon-set/send"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface ScheduledPostItem {
  id: string
  scheduledTime: string
  channel: string
  channelLabel?: string
  title: string
  status: "scheduled" | "published" | "failed" | "draft"
  media_url?: string | null
  dateStr?: string
  is_mock_media?: boolean | undefined
  is_mock_post?: boolean | undefined
}

export interface ScheduleCalendarCardProps {
  posts: ScheduledPostItem[]
  dateLabel?: string
  selectedId?: string | null
  onSelectPost?: (item: ScheduledPostItem) => void
  onNewSchedule?: () => void
  onPublishNow?: (
    id: string
  ) => Promise<{ success: boolean; url?: string; error?: string } | void> | void
}

/**
 * ScheduleCalendarCard - Bảng Lịch Đăng Tổng Hợp M07 (Xem bài đăng và khung giờ xuất bản)
 */
export function ScheduleCalendarCard({
  posts,
  dateLabel = "Tuần này",
  selectedId,
  onSelectPost,
  onNewSchedule,
  onPublishNow,
}: ScheduleCalendarCardProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>("all")
  const [publishingId, setPublishingId] = useState<string | null>(null)

  // Lọc theo kênh
  const filtered = posts.filter((p) => {
    if (selectedChannel === "all") return true
    return p.channel.toLowerCase().includes(selectedChannel.toLowerCase())
  })

  // Thống kê nhanh
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length
  const publishedCount = posts.filter((p) => p.status === "published").length

  return (
    <Card className="border border-border bg-surface p-5 shadow-xs flex flex-col gap-4">
      {/* Header & Thống kê */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="text-caption font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Sparkles size={12} className="text-primary" />
            Đăng mạng xã hội Social Publishing · Bảng Lịch Đăng Tổng Hợp
          </div>
          <div className="text-title font-extrabold text-text mt-0.5">
            Kế Hoạch & Khung Giờ Phát Bài Đa Kênh
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="neutral" className="text-caption px-2.5 py-1">
            <Clock size={12} className="text-primary" />
            <strong>{scheduledCount}</strong> chờ phát
          </Badge>
          <Badge tone="success" className="text-caption px-2.5 py-1">
            <CheckCircle2 size={12} />
            <strong>{publishedCount}</strong> đã đăng
          </Badge>
          {onNewSchedule && (
            <Button size="sm" onClick={onNewSchedule} className="text-caption font-bold gap-1 ml-1">
              Lên lịch mới <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </div>

      {/* Bộ lọc kênh phát */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <div className="text-caption font-semibold text-text-muted flex items-center gap-1 mr-1">
          <Filter size={11} /> Kênh:
        </div>
        {[
          { key: "all", label: "Tất cả kênh" },
          { key: "facebook", label: "Facebook Fanpage" },
          { key: "instagram", label: "Instagram" },
          { key: "tiktok", label: "TikTok" },
          { key: "zalo", label: "Zalo OA" },
          { key: "linkedin", label: "LinkedIn" },
        ].map((c) => (
          <Button variant="ghost"
            type="button"
            key={c.key}
            onClick={() => setSelectedChannel(c.key)}
            className={`h-auto gap-0 px-2.5 py-1 rounded-lg text-caption font-semibold transition-all cursor-pointer ${
              selectedChannel === c.key
                ? "bg-primary text-white shadow-2xs hover:bg-primary"
                : "bg-surface-alt hover:bg-surface text-text-muted hover:text-text border border-border"
            }`}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {/* Danh sách bài theo dòng thời gian khung giờ */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center border-dashed border border-border rounded-xl bg-surface-alt/50">
          <Calendar size={28} className="text-text-muted mb-2 opacity-50" />
          <div className="text-body font-bold text-text">Chưa có bài viết nào trong lịch xuất bản này</div>
          <div className="text-caption text-text-muted mt-1 max-w-sm">
            Các bài viết sau khi được chọn thời điểm xuất bản sẽ hiển thị chi tiết theo từng khung giờ phát tại đây.
          </div>
          {onNewSchedule && (
            <Button size="sm" variant="outline" onClick={onNewSchedule} className="mt-3 text-caption font-bold">
              Đến Hàng Đợi Lên Lịch
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => {
            const isCurrent = selectedId === item.id
            return (
              <div
              role="button"
              tabIndex={0}
                key={item.id}
                onClick={() => onSelectPost?.(item)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? "border-primary ring-1 ring-primary/20 bg-primary/5 shadow-xs"
                    : "border-border hover:border-primary/40 bg-surface"
                }`}
              >
                {/* Thời gian & Thumbnail & Nội dung */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Cột khung giờ phát */}
                  <div className="flex flex-col items-center justify-center min-w-[72px] px-2 py-1.5 rounded-lg bg-surface-alt border border-border flex-shrink-0 text-center">
                    <div className="text-meta font-black text-primary flex items-center gap-1">
                      <Clock size={12} />
                      {item.scheduledTime}
                    </div>
                    <div className="text-caption font-medium text-text-muted truncate max-w-[68px]">
                      {item.dateStr || "Hôm nay"}
                    </div>
                  </div>

                  {/* Thumbnail ảnh */}
                  {item.media_url && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                      <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                      {item.is_mock_media && (
                        <span className="absolute bottom-0 inset-x-0 bg-warning/90 text-caption font-black text-white text-center leading-none py-0.5">
                          MOCK
                        </span>
                      )}
                    </div>
                  )}

                  {/* Chi tiết bài đăng */}
                  <div className="flex-1 min-w-0">
                    <div className="text-body-sm font-bold text-text truncate">{item.title}</div>
                    <div className="text-caption text-text-muted flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-primary capitalize">
                        {item.channelLabel || item.channel}
                      </span>
                      <span>·</span>
                      <span>ID #{item.id}</span>
                      {item.is_mock_media && (
                        <span className="text-caption font-bold px-1.5 py-0.2 rounded bg-warning-bg text-warning-text border border-warning/30">
                          Ảnh mẫu (Mock)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badge trạng thái & Nút phát ngay */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {item.status === "scheduled" && onPublishNow && (
                    <Button
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation()
                        setPublishingId(item.id)
                        try {
                          await onPublishNow(item.id)
                        } finally {
                          setPublishingId(null)
                        }
                      }}
                      disabled={publishingId === item.id}
                      className="text-caption font-bold h-7 px-2.5 bg-primary text-white gap-1 hover:bg-primary/90 shadow-2xs"
                      title="Phát sóng ngay bài viết này"
                    >
                      {publishingId === item.id ? (
                        <RefreshCw size={11} className="animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Send size={11} />
                      )}
                      Phát ngay
                    </Button>
                  )}

                  <Badge
                    tone={
                      item.status === "published"
                        ? "success"
                        : item.status === "scheduled"
                        ? "neutral"
                        : "danger"
                    }
                    className="text-caption gap-1 px-2 py-0.5"
                  >
                    {item.status === "published" ? (
                      <>
                        <CheckCircle2 size={12} className="text-success" />
                        Đã đăng
                      </>
                    ) : item.status === "scheduled" ? (
                      <>
                        <Clock size={12} className="text-primary" />
                        Chờ phát
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} />
                        Thất bại
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

