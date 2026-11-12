"use client"

import React, { useState } from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Eye } from "@/components/ui/icon-set/eye"
import { Heart } from "@/components/ui/icon-set/heart"
import { MessageCircle } from "@/components/ui/icon-set/message-circle"
import { Share2 } from "@/components/ui/icon-set/share2"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Send } from "@/components/ui/icon-set/send"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { errorText } from "@/lib/error-text"

export interface PostStatusReportProps {
  post: {
    id: string | number
    title: string
    channel: string
    channelLabel?: string | null | undefined
    status: "scheduled" | "published" | "failed" | "draft" | string
    scheduledTime?: string | null | undefined
    dateStr?: string | null | undefined
    created_at?: string | null | undefined
    media_url?: string | null | undefined
    errorMessage?: string | null | undefined
    postUrl?: string | null | undefined
    is_mock_media?: boolean | undefined
    is_mock_post?: boolean | undefined
  } | null
  onRetry?: (id: string | number) => void
  onPublishNow?: (
    id: string | number
  ) => Promise<{ success: boolean; url?: string; error?: string } | void> | void
  onReschedule?: (id: string | number) => void
}

/**
 * Link bài thật do nền tảng trả về, hoặc `null`. Không dựng link trang chung của nền tảng giả làm
 * link bài — trước đây người dùng tưởng đã đăng thành công khi chưa có bài nào (P0-06).
 */
function realPostUrl(postUrl?: string | null): string | null {
  if (!postUrl || !postUrl.startsWith("http")) return null
  const isFake =
    postUrl.includes("facebook_post_") || postUrl.includes("post_") || Boolean(postUrl.match(/\/posts\/\d+$/))
  return isFake ? null : postUrl
}

/**
 * Tạo chỉ số tương tác mẫu ổn định dựa theo ID bài viết
 */
function getPostMetrics(id: string | number) {
  const numId = typeof id === "number" ? id : parseInt(id, 10) || 42
  const seed = (numId * 137) % 1000
  const reach = 850 + seed * 3
  const likes = Math.round(reach * 0.12)
  const comments = Math.round(likes * 0.22)
  const shares = Math.round(likes * 0.08)
  const engagementRate = (((likes + comments + shares) / reach) * 100).toFixed(1)

  return { reach, likes, comments, shares, engagementRate }
}

/**
 * PostStatusReportCard - Thẻ Báo Cáo Trạng Thái & Hiệu Suất Từng Bài Đăng (M07)
 */
export function PostStatusReportCard({
  post,
  onRetry,
  onPublishNow,
  onReschedule,
}: PostStatusReportProps) {
  const [publishing, setPublishing] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info"
    message: string
    url?: string | null
  } | null>(null)

  if (!post) {
    return (
      <Card className="border border-border bg-surface p-6 text-center text-text-muted text-caption">
        Chọn một bài viết từ danh sách lịch để xem báo cáo trạng thái và hiệu suất chi tiết.
      </Card>
    )
  }

  const isPublished = post.status === "published" || post.status === "posted"
  const isScheduled = post.status === "scheduled"
  const isFailed = post.status === "failed" || post.status === "error"
  const isDraft = post.status === "draft"

  const metrics = getPostMetrics(post.id)

  async function handlePublishClick() {
    if (!post || publishing) return
    setPublishing(true)
    setFeedback({
      type: "info",
      message: `Đang kết nối API và điều phối phát sóng bài viết lên ${post.channelLabel || post.channel}...`,
    })

    try {
      if (onPublishNow) {
        const res = await onPublishNow(post.id)
        if (res && res.error) {
          setFeedback({
            type: "error",
            message: res.error,
          })
        } else {
          // Chỉ link bài thật do nền tảng trả về — không dựng link trang chung giả làm link bài (P0-06).
          const finalUrl = realPostUrl(res ? res.url : null) ?? realPostUrl(post.postUrl)
          setFeedback({
            type: "success",
            message: `Đã phát sóng bài viết thành công lên ${post.channelLabel || post.channel}!`,
            url: finalUrl,
          })
        }
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: errorText(err) || "Có lỗi xảy ra khi thực hiện phát sóng.",
      })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card className="border border-border bg-surface p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3.5">
        <div>
          <div className="text-caption font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Sparkles size={12} className="text-primary" />
            Báo Cáo Trạng Thái & Hiệu Suất Bài Đăng
          </div>
          <div className="text-title-sm font-extrabold text-text mt-0.5 flex items-center gap-2">
            <span>{post.title}</span>
            <Badge tone="neutral" className="text-caption font-mono px-1.5 py-0">
              ID #{post.id}
            </Badge>
          </div>
        </div>

        {/* Badge trạng thái tổng thể */}
        <div className="flex items-center gap-2">
          {isPublished && (
            <Badge tone="success" className="text-caption px-2.5 py-1 gap-1">
              <CheckCircle2 size={13} />
              Đã xuất bản thành công
            </Badge>
          )}
          {isScheduled && (
            <Badge tone="neutral" className="text-caption px-2.5 py-1 gap-1 border-primary/30 text-primary">
              <Clock size={13} />
              Đang chờ phát sóng
            </Badge>
          )}
          {isFailed && (
            <Badge tone="danger" className="text-caption px-2.5 py-1 gap-1">
              <AlertCircle size={13} />
              Lỗi xuất bản
            </Badge>
          )}
          {isDraft && (
            <Badge tone="neutral" className="text-caption px-2.5 py-1 gap-1">
              Bản nháp
            </Badge>
          )}
        </div>
      </div>

      {/* Thông báo kết quả trực tiếp tại chỗ */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-caption flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
            feedback.type === "success"
              ? "bg-success-bg border-success/30 text-success"
              : feedback.type === "error"
              ? "bg-danger-bg border-danger/30 text-danger"
              : "bg-surface-alt border-primary/30 text-text"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" && <CheckCircle2 size={16} className="text-success flex-shrink-0" />}
            {feedback.type === "error" && <AlertCircle size={16} className="text-danger flex-shrink-0" />}
            {feedback.type === "info" && <RefreshCw size={16} className="animate-spin motion-reduce:animate-none text-primary flex-shrink-0" />}
            <span className="font-semibold">{feedback.message}</span>
          </div>

          {feedback.url && (
            <a
              href={feedback.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-caption font-bold bg-primary text-white hover:bg-primary/90 shadow-xs flex-shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <ExternalLink size={12} /> Xem bài viết thực tế
            </a>
          )}
        </div>
      )}

      {/* Thanh tiến trình phần trăm & Trạng thái chi tiết (Progression Bar) */}
      <div className="rounded-xl border border-border bg-surface-alt/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-caption font-bold text-text">Tiến Trình Thực Thi:</span>
            <span className="text-caption font-extrabold text-primary">
              {isPublished
                ? "100% · Đã xuất bản thành công"
                : publishing
                ? "90% · Đang mở bot & đăng bài..."
                : isScheduled
                ? "75% · Sẵn sàng trong hàng đợi phát sóng"
                : isFailed
                ? "50% · Tạm dừng do sự cố kết nối"
                : "25% · Bản nháp"}
            </span>
          </div>
          {isScheduled && !isPublished && (
            <div className="text-caption font-semibold text-text-muted flex items-center gap-1.5 bg-surface-alt px-2.5 py-1 rounded-full border border-border">
              <Clock size={12} className="text-primary animate-pulse motion-reduce:animate-none" />
              <span>Khung giờ hẹn: <strong>{post.scheduledTime || "Trong ngày"}</strong></span>
            </div>
          )}
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-border/60 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${
              isPublished
                ? "bg-success w-full"
                : publishing
                ? "bg-primary w-[90%] animate-pulse motion-reduce:animate-none"
                : isScheduled
                ? "bg-primary w-[75%]"
                : isFailed
                ? "bg-danger w-[50%]"
                : "bg-text-muted w-[25%]"
            }`}
          />
        </div>

        {/* Thông tin điều phối thời gian */}
        {isScheduled && !isPublished && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-caption text-text-muted">
            <div className="flex items-center gap-1.5 text-text">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping motion-reduce:animate-none" />
              <span>
                Hệ thống tự động quét và kích hoạt theo lịch hẹn. Nếu không muốn chờ, bạn có thể bấm <strong>Phát ngay</strong> bên dưới.
              </span>
            </div>
            {onPublishNow && (
              <Button
                size="sm"
                onClick={handlePublishClick}
                disabled={publishing}
                className="text-caption font-bold gap-1 bg-primary text-white flex-shrink-0"
              >
                {publishing ? <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" /> : <Send size={12} />}
                {publishing ? "Đang phát..." : "⚡ Phát ngay lập tức"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tiến trình vòng đời phát hành (Lifecycle Stepper) */}
      <div className="grid grid-cols-4 gap-2 bg-surface-alt/50 p-3 rounded-xl border border-border">
        <div className="flex flex-col items-center text-center">
          <div className="w-6 h-6 rounded-full bg-success-bg text-success border border-success/30 flex items-center justify-center text-caption font-bold mb-1">
            ✓
          </div>
          <div className="text-caption font-bold text-text">1. Soạn thảo</div>
          <div className="text-caption text-text-muted">Hoàn tất</div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold mb-1 border ${
              isScheduled || isPublished || isFailed
                ? "bg-success-bg text-success border-success/30"
                : "bg-surface text-text-muted border-border"
            }`}
          >
            {isScheduled || isPublished || isFailed ? "✓" : "2"}
          </div>
          <div className="text-caption font-bold text-text">2. Lên lịch</div>
          <div className="text-caption text-text-muted">
            {post.scheduledTime ? `${post.scheduledTime}` : "Đăng ngay"}
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold mb-1 border ${
              isScheduled || isPublished
                ? "bg-success-bg text-success border-success/30"
                : isFailed
                ? "bg-danger-bg text-danger border-danger/30"
                : "bg-surface text-text-muted border-border"
            }`}
          >
            {isScheduled || isPublished ? "✓" : isFailed ? "!" : "3"}
          </div>
          <div className="text-caption font-bold text-text">3. Phê duyệt</div>
          <div className="text-caption text-text-muted">
            {isFailed ? "Cần kiểm tra" : "Đã thông qua"}
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold mb-1 border ${
              isPublished
                ? "bg-success-bg text-success border-success/30"
                : isFailed
                ? "bg-danger-bg text-danger border-danger/30"
                : isScheduled
                ? "bg-primary/10 text-primary border-primary/30 animate-pulse motion-reduce:animate-none"
                : "bg-surface text-text-muted border-border"
            }`}
          >
            {isPublished ? "✓" : isFailed ? "✕" : "4"}
          </div>
          <div className="text-caption font-bold text-text">4. Xuất bản</div>
          <div className="text-caption text-text-muted">
            {isPublished ? "Thành công" : isFailed ? "Gặp sự cố" : isScheduled ? "Đang chờ giờ" : "Chưa gửi"}
          </div>
        </div>
      </div>

      {/* Thông tin kỹ thuật & Kênh xuất bản */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-caption">
        <div className="p-3 rounded-xl border border-border bg-surface-alt/40 flex flex-col gap-1.5">
          <div className="text-caption font-semibold text-text-muted uppercase">Thông số kỹ thuật</div>
          <div className="flex justify-between">
            <span className="text-text-muted">Kênh xuất bản:</span>
            <span className="font-bold text-primary capitalize">{post.channelLabel || post.channel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Khung giờ hẹn:</span>
            <span className="font-medium text-text">
              {post.scheduledTime || "Chưa đặt"} ({post.dateStr || "Hôm nay"})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Mã định danh mạng xã hội:</span>
            <span className="font-mono text-text-muted">soc_post_{post.id}_flora</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border bg-surface-alt/40 flex flex-col gap-1.5">
          <div className="text-caption font-semibold text-text-muted uppercase">Nhật ký xử lý (Audit Log)</div>
          <div className="flex justify-between">
            <span className="text-text-muted">Trạng thái API:</span>
            <span className={isPublished ? "text-success font-semibold" : isFailed ? "text-danger font-semibold" : "text-text-muted"}>
              {isPublished ? "200 OK · Đã xuất bản" : isFailed ? "Lỗi xuất bản mạng xã hội" : "Sẵn sàng phát sóng"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Cơ chế phát sóng:</span>
            <span className="font-medium text-text">SocialFlow Đăng mạng xã hội Scheduler</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-muted">Ảnh đính kèm:</span>
            <span className="text-text font-medium flex items-center gap-1.5">
              <span>{post.media_url ? "Đã sẵn sàng" : "Chưa có"}</span>
              {post.is_mock_media && (
                <span className="text-caption font-bold px-1.5 py-0.2 rounded bg-warning-bg text-warning-text border border-warning/30">
                  Ảnh mẫu (Mock)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Báo cáo tương tác */}
      {isPublished && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-meta font-bold text-text flex items-center gap-2">
              <TrendingUp size={14} className="text-success" />
              <span>Báo cáo tương tác mạng xã hội</span>
              <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-warning-bg text-warning-text border border-warning/30">
                ⚠️ DỮ LIỆU MÔ PHỎNG (MOCK DATA)
              </span>
            </div>
            <div className="text-caption text-success font-bold bg-success-bg px-2 py-0.5 rounded-full border border-success/20">
              Tỷ lệ tương tác: {metrics.engagementRate}% (Ước tính)
            </div>
          </div>

          <div className="text-caption text-text-muted italic bg-surface-alt/50 px-3 py-1.5 rounded-lg border border-border/60">
            * Lưu ý: Các chỉ số Lượt xem, Yêu thích, Bình luận dưới đây hiện đang dùng thuật toán mô phỏng (Mock Data) để kiểm thử giao diện phân tích, chưa đồng bộ trực tiếp với API thống kê thật của nền tảng.
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-surface-alt/70 border border-border text-center">
              <div className="text-text-muted flex items-center justify-center gap-1 text-caption mb-0.5">
                <Eye size={12} /> Lượt xem (Reach)
              </div>
              <div className="text-title font-black text-text">{metrics.reach.toLocaleString()}</div>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt/70 border border-border text-center">
              <div className="text-primary flex items-center justify-center gap-1 text-caption mb-0.5">
                <Heart size={12} /> Yêu thích
              </div>
              <div className="text-title font-black text-primary">{metrics.likes.toLocaleString()}</div>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt/70 border border-border text-center">
              <div className="text-secondary-text flex items-center justify-center gap-1 text-caption mb-0.5">
                <MessageCircle size={12} /> Bình luận
              </div>
              <div className="text-title font-black text-secondary-text">{metrics.comments.toLocaleString()}</div>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt/70 border border-border text-center">
              <div className="text-secondary-text flex items-center justify-center gap-1 text-caption mb-0.5">
                <Share2 size={12} /> Chia sẻ
              </div>
              <div className="text-title font-black text-secondary-text">{metrics.shares.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Lỗi và nút thử lại */}
      {isFailed && (
        <div className="p-3.5 rounded-xl bg-danger-bg border border-danger/30 flex items-center justify-between gap-3">
          <div className="text-caption text-danger flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <div>
              <div className="font-bold">Gặp sự cố khi xuất bản bài viết</div>
              <div className="text-caption opacity-90">
                {post.errorMessage || "Phiên đăng nhập hết hạn hoặc chưa kết nối tài khoản trên SocialFlow."}
              </div>
            </div>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry(post.id)}
              className="text-caption font-bold gap-1 flex-shrink-0"
            >
              <RefreshCw size={12} /> Thử lại ngay
            </Button>
          )}
        </div>
      )}

      {/* Tác vụ cho bài chưa xuất bản */}
      {!isPublished && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-border gap-2">
          <div className="text-caption text-text-muted flex items-center gap-1.5">
            <Clock size={13} className="text-primary" />
            {isScheduled ? (
              <span>Lịch phát tự động: <strong>{post.scheduledTime} ({post.dateStr || "Hôm nay"})</strong></span>
            ) : (
              <span>Bài viết đang ở trạng thái bản nháp, có thể phát sóng ngay.</span>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onReschedule && (
              <Button size="sm" variant="outline" onClick={() => onReschedule(post.id)} className="text-caption">
                Đổi giờ đăng
              </Button>
            )}
            {onPublishNow && (
              <Button
                size="sm"
                onClick={handlePublishClick}
                disabled={publishing}
                className="text-caption font-bold gap-1.5"
              >
                {publishing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" /> Đang đăng...
                  </>
                ) : (
                  <>
                    <Send size={12} /> Đăng ngay
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Tác vụ khi bài ĐÃ XUẤT BẢN THÀNH CÔNG */}
      {isPublished && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-border gap-2">
          <div className="text-caption text-text-muted flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-success" />
            <span>Đã xuất bản thành công trên <strong>{post.channelLabel || post.channel}</strong></span>
          </div>
          {realPostUrl(post.postUrl) && (
          <a
            href={realPostUrl(post.postUrl) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-bold bg-primary text-white hover:bg-primary/90 shadow-xs self-end sm:self-auto"
          >
            <ExternalLink size={12} /> Xem bài viết trên {post.channelLabel || post.channel}
          </a>
          )}
        </div>
      )}
    </Card>
  )
}
