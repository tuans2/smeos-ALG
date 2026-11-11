"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { Clock } from "@/components/ui/icon-set/clock"
import { User } from "@/components/ui/icon-set/user"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { PhoneCall } from "@/components/ui/icon-set/phone-call"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CalendarHeart } from "@/components/ui/icon-set/calendar-heart"
import { useSession } from "@/lib/session"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/layout/user-menu"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { PageHeader } from "@/components/ui/page-header"

class ChuaDangNhap extends Error {}

interface Conversation {
  id: string
  channel: string
  status: string
  customer_name: string | null
  last_message_at: string | null
  unread_count?: number
  last_message_preview?: string | null
}

interface UpcomingReminder {
  customerId: string
  customerName: string
  occasionName: string
  targetDate: string
  daysLeft: number
  isZaloAllowed: boolean
}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 401) throw new ChuaDangNhap()
  if (res.status === 403) return null
  if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`)
  return (await res.json()) as T
}

function nhanKenh(channel: string): string {
  switch (channel) {
    case "ZALO": return "Zalo"
    case "FACEBOOK": return "Facebook"
    case "INSTAGRAM": return "Instagram"
    case "WEBSITE": return "Website"
    default: return channel
  }
}

function nhanThoiGian(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Vừa xong"
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} giờ trước`
  return `${Math.floor(diffH / 24)} ngày trước`
}

// ≤ 350 lines — SRP: hiển thị workspace CSKH, không chứa logic nghiệp vụ phức tạp
export function CustomerServiceWorkspace() {
  const router = useRouter()
  const { orgName, userInitials, roleUx } = useSession()

  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [reminders, setReminders] = useState<UpcomingReminder[] | null>(null)
  const [daTai, setDaTai] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  const napLai = useCallback(async () => {
    setLoi(null)
    try {
      const [convRes, remRes] = await Promise.all([
        layJson<{ items: Conversation[] }>("/api/v1/chat/conversations?status=ACTIVE&limit=50"),
        layJson<{ items: UpcomingReminder[] }>("/api/v1/crm/reminders/upcoming?days=7"),
      ])
      setConversations(convRes?.items ?? [])
      setReminders(remRes?.items ?? [])
    } catch (e) {
      if (e instanceof ChuaDangNhap) {
        router.push("/dang-nhap" as Route)
        return
      }
      setLoi(e instanceof Error ? e.message : "Không tải được dữ liệu")
    } finally {
      setDaTai(true)
    }
  }, [router])

  useEffect(() => {
    napLai()
  }, [napLai])

  const activeConvs = conversations?.filter((c) => c.status === "ACTIVE") ?? []
  const todayReminders = reminders?.filter((r) => r.daysLeft <= 1) ?? []
  const upcomingReminders = reminders?.filter((r) => r.daysLeft > 1 && r.daysLeft <= 7) ?? []

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        breadcrumbs={roleUx?.label ?? "Chăm sóc khách hàng (CSKH)"}
        title={orgName}
        actions=<UserMenu initials={userInitials} />
      />

      {/* Main Body */}
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <FeatureGuidanceCard
          id="customer_service_workspace_guidance"
          badgeLabel="HƯỚNG DẪN BÀN LÀM VIỆC CSKH"
          title="Tư Vấn & Giải Quyết Nhanh Cho Khách Hàng"
          description="Trả lời hội thoại đang chờ, nắm ngữ cảnh đơn hàng của khách và chủ động liên hệ khách có dịp kỷ niệm hôm nay."
          tips={[
            "Ưu tiên hội thoại ACTIVE chưa trả lời gần nhất",
            "Tra cứu lịch sử đơn hàng trước khi phản hồi để tư vấn chính xác",
            "Nhắn Zalo/Facebook cho khách có dịp kỷ niệm hôm nay hoặc ngày mai",
          ]}
        />

        {/* Lỗi */}
        {loi && (
          <InlineError
            message={loi}
            onRetry={napLai}
          />
        )}

        {/* KPI nhanh */}
        {!loi && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="flex flex-col items-center gap-1 p-3">
              <MessageSquare size={18} className="text-primary" />
              <div className="text-title font-extrabold text-text">
                {!daTai ? "—" : activeConvs.length}
              </div>
              <div className="text-caption text-text-muted text-center">Hội thoại đang chờ</div>
            </Card>
            <Card className="flex flex-col items-center gap-1 p-3">
              <Clock size={18} className="text-warning-text" />
              <div className="text-title font-extrabold text-text">
                {!daTai ? "—" : todayReminders.length}
              </div>
              <div className="text-caption text-text-muted text-center">Dịp hôm nay</div>
            </Card>
            <Card className="flex flex-col items-center gap-1 p-3">
              <CalendarHeart size={18} className="text-info" />
              <div className="text-title font-extrabold text-text">
                {!daTai ? "—" : upcomingReminders.length}
              </div>
              <div className="text-caption text-text-muted text-center">Dịp 7 ngày tới</div>
            </Card>
          </div>
        )}

        {/* Hội thoại đang chờ */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-body font-semibold text-text">
              Hội thoại đang chờ
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/hoi-thoai" as Route)}
              className="flex items-center gap-1 text-body-sm text-primary"
            >
              Xem tất cả <ChevronRight size={14} />
            </Button>
          </div>

          {!daTai && (
            <div className="flex flex-col gap-2">
              <SkeletonBlock lines={2} />
              <SkeletonBlock lines={2} />
            </div>
          )}

          {daTai && !loi && activeConvs.length === 0 && (
            <EmptyState
              icon={CheckCircle2}
              title="Không còn hội thoại chờ"
              reason="Mọi hội thoại đã được xử lý. Kiểm tra lại sau."
            />
          )}

          {daTai && !loi && activeConvs.length > 0 && (
            <div className="flex flex-col gap-2">
              {activeConvs.slice(0, 5).map((conv) => (
                <Button variant="ghost"
                  type="button"
                  key={conv.id}
                  aria-label={`Mở hội thoại với ${conv.customer_name ?? "khách"}`}
                  onClick={() => router.push(`/hoi-thoai?id=${conv.id}` as Route)}
                  className="text-[length:inherit] h-auto p-0 justify-start font-[inherit] gap-0 w-full text-left"
                >
                  <Card className="flex items-center gap-3 p-3 hover:border-primary/40 transition-colors cursor-pointer">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body-sm font-semibold text-text truncate">
                          {conv.customer_name ?? "Khách vãng lai"}
                        </span>
                        <span className="text-caption text-text-muted flex-shrink-0">
                          {nhanThoiGian(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-caption text-text-muted">{nhanKenh(conv.channel)}</span>
                        {conv.last_message_preview && (
                          <span className="text-caption text-text-muted truncate">
                            · {conv.last_message_preview}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="flex-shrink-0 text-text-muted" />
                  </Card>
                </Button>
              ))}
            </div>
          )}
        </section>

        {/* Dịp cần liên hệ hôm nay */}
        {daTai && !loi && todayReminders.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-warning-text" />
              <h2 className="text-body font-semibold text-text">Cần liên hệ hôm nay</h2>
            </div>
            <div className="flex flex-col gap-2">
              {todayReminders.slice(0, 3).map((r) => (
                <Card key={r.customerId + r.targetDate} className="flex items-center gap-3 p-3 border-warning/30 bg-warning-bg/30">
                  <PhoneCall size={16} className="flex-shrink-0 text-warning-text" />
                  <div className="min-w-0 flex-1">
                    <div className="text-body-sm font-semibold text-text">{r.customerName}</div>
                    <div className="text-caption text-text-muted">{r.occasionName} · {r.daysLeft === 0 ? "Hôm nay" : "Ngày mai"}</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/khach-hang?id=${r.customerId}` as Route)}
                  >
                    Xem hồ sơ
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Phím tắt tác vụ */}
        <section>
          <h2 className="mb-2 text-body font-semibold text-text">Tác vụ nhanh</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/hoi-thoai" as Route)}
              className="flex items-center justify-center gap-2 h-12"
            >
              <MessageSquare size={16} />
              Hội thoại
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/khach-hang" as Route)}
              className="flex items-center justify-center gap-2 h-12"
            >
              <User size={16} />
              Khách hàng
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

