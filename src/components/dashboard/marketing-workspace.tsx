"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { PenTool } from "@/components/ui/icon-set/pen-tool"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Flame } from "@/components/ui/icon-set/flame"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Video } from "@/components/ui/icon-set/video"
import { useSession } from "@/lib/session"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/layout/user-menu"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { isRouteLocked } from "@/lib/feature-lock"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { PageHeader } from "@/components/ui/page-header"

class ChuaDangNhap extends Error {}

interface SocialPost {
  id: number | string
  title?: string | null
  content?: string | null
  platform?: string | null
  status?: string | null
  scheduled_time?: string | null
  error_message?: string | null
}

interface OpportunityItem {
  id: string
  title: string
  trendScore?: number
  dominantTopic?: string
  suggestedAngle?: string
}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 401) throw new ChuaDangNhap()
  if (res.status === 403) return null
  if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`)
  return (await res.json()) as T
}

export function MarketingWorkspace() {
  const router = useRouter()
  const { orgName, userInitials, roleUx, can } = useSession()

  const [posts, setPosts] = useState<SocialPost[] | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunityItem[] | null>(null)
  const [daTai, setDaTai] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  const napLai = useCallback(async () => {
    setLoi(null)
    try {
      // Nguồn đang khoá trên production (P0-06) thì không gọi — tránh báo lỗi cả khối vì một nguồn chưa vận hành.
      const [postRes, oppRes] = await Promise.all([
        isRouteLocked("/lich-dang")
          ? Promise.resolve(null)
          : layJson<{ data?: SocialPost[]; posts?: SocialPost[] }>("/api/v1/proxy/api/m07/posts?client=SOCIALFLOW"),
        isRouteLocked("/market-intelligence")
          ? Promise.resolve(null)
          : layJson<{ items?: OpportunityItem[]; data?: OpportunityItem[] }>("/api/v1/market-intelligence/opportunities?limit=6"),
      ])

      const listPosts = postRes?.data ?? postRes?.posts ?? []
      const listOpps = oppRes?.items ?? oppRes?.data ?? []

      setPosts(listPosts)
      setOpportunities(listOpps)
    } catch (e) {
      if (e instanceof ChuaDangNhap) {
        router.push("/dang-nhap" as Route)
        return
      }
      setLoi(e instanceof Error ? e.message : "Không tải được dữ liệu tiếp thị")
    } finally {
      setDaTai(true)
    }
  }, [router])

  useEffect(() => {
    napLai()
  }, [napLai])

  // Phân tích bài đăng lỗi và bài đã lên lịch
  const { failedPosts, scheduledPosts, publishedCount } = useMemo(() => {
    if (!posts || posts.length === 0) {
      return { failedPosts: [], scheduledPosts: [], publishedCount: 0 }
    }
    const failed = posts.filter((p) => p.status === "FAILED")
    const scheduled = posts.filter((p) => p.status === "SCHEDULED" || p.status === "DRAFT")
    const published = posts.filter((p) => p.status === "PUBLISHED").length

    return { failedPosts: failed, scheduledPosts: scheduled, publishedCount: published }
  }, [posts])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        breadcrumbs={roleUx?.label ?? "Marketing"}
        title={orgName}
        actions=<UserMenu initials={userInitials} />
      />

      {/* Main Body */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* K1: 1 Feature Guidance Card */}
        <FeatureGuidanceCard
          id="marketing_workspace_guidance"
          badgeLabel="HƯỚNG DẪN BÀN LÀM VIỆC TIẾP THỊ"
          title="Nội dung Cần xử lý & Cơ hội Tiếp thị"
          description="Nghiên cứu xu hướng, sáng tạo nội dung đa kênh và xử lý các bài đăng lỗi hoặc đang chờ xuất bản trên mạng xã hội."
          tips={[
            "Ưu tiên rà soát các bài đăng lỗi phát hành để kịp thời khắc phục kết nối",
            "Chọn cơ hội nội dung hot từ Market Intelligence để tạo chiến dịch tiếp cận khách hàng",
            "Kiểm tra lịch đăng đa kênh để đảm bảo tần suất phát hành đều đặn",
          ]}
        />

        {/* K2: Thanh tác vụ (Tối đa 1 primary + 2 outline) */}
        <div className="flex flex-wrap items-center gap-2">
          {can("I1") && (
            <Button size="sm" variant="primary" onClick={() => router.push("/creative-studio" as Route)}>
              <Sparkles size={16} aria-hidden="true" />
              Sáng tạo nội dung
            </Button>
          )}
          {can("I1") && (
            <Button size="sm" variant="outline" onClick={() => router.push("/noi-dung" as Route)}>
              <PenTool size={16} aria-hidden="true" />
              Soạn bài viết
            </Button>
          )}
          {can("J5") && (
            <Button size="sm" variant="outline" onClick={() => router.push("/lich-dang" as Route)}>
              <Calendar size={16} aria-hidden="true" />
              Lịch đăng đa kênh
            </Button>
          )}
        </div>

        {loi && <InlineError message={loi} onRetry={napLai} />}

        {/* Khối P1: Thống kê nhanh tiếp thị */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Đã lên lịch</span>
            <span className="text-title font-extrabold text-text">
              {!daTai ? "—" : scheduledPosts.length}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Cần xử lý / Lỗi</span>
            <span className="text-title font-extrabold text-danger">
              {!daTai ? "—" : failedPosts.length}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Đã phát hành</span>
            <span className="text-title font-extrabold text-success">
              {!daTai ? "—" : publishedCount}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Cơ hội xu hướng</span>
            <span className="text-title font-extrabold text-primary">
              {!daTai ? "—" : opportunities?.length ?? 0}
            </span>
          </Card>
        </div>

        {/* Khối P0: 2 cột việc khẩn trên desktop (1280px) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Cột 1: Bài đăng lỗi hoặc đang chờ phát hành */}
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-danger" aria-hidden="true" />
                <h2 className="text-title-sm font-bold">
                  {failedPosts.length > 0 ? `Bài đăng lỗi (${failedPosts.length})` : "Nội dung chờ phát hành"}
                </h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/lich-dang" as Route)}
                className="text-caption"
              >
                Mở lịch đăng
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>

            {!daTai ? (
              <SkeletonBlock lines={3} />
            ) : failedPosts.length === 0 && scheduledPosts.length === 0 ? (
              <EmptyState
                title="Không có bài viết nào cần xử lý"
                reason="Tất cả bài viết đã được phát hành thành công hoặc chưa có bài viết mới."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {(failedPosts.length > 0 ? failedPosts : scheduledPosts).slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => router.push("/lich-dang" as Route)}
                      className="text-[length:inherit] font-[inherit] flex cursor-pointer min-h-12 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body font-semibold text-text">
                          {p.title || p.content?.slice(0, 45) || "Bài viết chưa đặt tiêu đề"}
                        </div>
                        <div className="text-caption text-text-muted">
                          {p.platform || "Đa kênh"} {p.error_message ? `· Lỗi: ${p.error_message}` : ""}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-caption font-bold ${
                          p.status === "FAILED"
                            ? "bg-danger-bg text-danger"
                            : "bg-surface-alt text-text-muted"
                        }`}
                      >
                        {p.status === "FAILED" ? "Thất bại" : "Chờ đăng"}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Cột 2: Cơ hội nội dung thị trường mới nhất */}
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-accent" aria-hidden="true" />
                <h2 className="text-title-sm font-bold">Cơ hội nội dung nóng</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/market-intelligence" as Route)}
                className="text-caption"
              >
                Khám phá thêm
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>

            {!daTai ? (
              <SkeletonBlock lines={3} />
            ) : !opportunities || opportunities.length === 0 ? (
              <EmptyState
                title="Chưa có cơ hội nội dung mới"
                reason="Kích hoạt phân tích xu hướng để nhận các góc tiếp cận nội dung thị trường mới nhất."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {opportunities.slice(0, 5).map((opp) => (
                  <li key={opp.id}>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => router.push("/creative-studio" as Route)}
                      className="text-[length:inherit] font-[inherit] flex cursor-pointer min-h-12 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body font-semibold text-text">
                          {opp.title}
                        </div>
                        <div className="text-caption text-text-muted">
                          {opp.dominantTopic || "Sản phẩm & Quà tặng"} {opp.suggestedAngle ? `· ${opp.suggestedAngle}` : ""}
                        </div>
                      </div>
                      {typeof opp.trendScore === "number" && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-caption font-bold text-accent-text">
                          {opp.trendScore} điểm
                        </span>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Khối P2: Lối tắt bộ công cụ tiếp thị */}
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-title-sm font-bold">Bộ công cụ sáng tạo tiếp thị</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline"
              type="button"
              onClick={() => router.push("/creative-studio" as Route)}
              className="text-[length:inherit] h-auto justify-start font-[inherit] flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary hover:bg-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-body font-bold text-text">Creative Studio</div>
                <div className="text-caption text-text-muted">14 chặng sáng tạo khép kín</div>
              </div>
            </Button>

            <Button variant="outline"
              type="button"
              onClick={() => router.push("/noi-dung" as Route)}
              className="text-[length:inherit] h-auto justify-start font-[inherit] flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary hover:bg-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <PenTool size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-body font-bold text-text">Content Engine</div>
                <div className="text-caption text-text-muted">Soạn bài viết đa kênh tự động</div>
              </div>
            </Button>

            <Button variant="outline"
              type="button"
              onClick={() => router.push("/video" as Route)}
              className="text-[length:inherit] h-auto justify-start font-[inherit] flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary hover:bg-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-bg text-warning">
                <Video size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-body font-bold text-text">Video Studio</div>
                <div className="text-caption text-text-muted">Dựng video ngắn & kịch bản</div>
              </div>
            </Button>

            <Button variant="outline"
              type="button"
              onClick={() => router.push("/lich-dang" as Route)}
              className="text-[length:inherit] h-auto justify-start font-[inherit] flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary hover:bg-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-bg text-success">
                <Share2 size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-body font-bold text-text">Lịch đăng & Tự động</div>
                <div className="text-caption text-text-muted">Lên lịch mạng xã hội đa kênh</div>
              </div>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
