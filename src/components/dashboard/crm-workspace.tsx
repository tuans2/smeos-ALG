"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { CalendarHeart } from "@/components/ui/icon-set/calendar-heart"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { UserPlus } from "@/components/ui/icon-set/user-plus"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { useSession } from "@/lib/session"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/layout/user-menu"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { CrmToolkitGrid } from "./crm-toolkit-grid"
import {
  deriveCustomerLifecycleStage,
  type CustomerLifecycleStage,
} from "@/modules/crm/domain/crm-rules"
import type { CustomerMasterIndex } from "@/modules/crm/domain/customer-master-index"
import { formatCurrency } from "@/lib/i18n/formatters"
import { PageHeader } from "@/components/ui/page-header"

class ChuaDangNhap extends Error {}

interface UpcomingReminder {
  customerId: string
  customerName: string
  occasionName: string
  targetDate: string
  daysLeft: number
  recipientName: string
  isZaloAllowed: boolean
}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 401) throw new ChuaDangNhap()
  if (res.status === 403) return null
  if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`)
  return (await res.json()) as T
}

function nhanNgayConLai(daysLeft: number): string {
  if (daysLeft === 0) return "Hôm nay"
  if (daysLeft === 1) return "Ngày mai"
  return `Còn ${daysLeft} ngày`
}

function nhanVongDoi(stage: CustomerLifecycleStage): { label: string; cls: string } {
  switch (stage) {
    case "RETAIN":
      return { label: "Trung thành", cls: "bg-success-bg text-success" }
    case "GROW":
      return { label: "Tiềm năng", cls: "bg-primary/10 text-primary" }
    case "AT_RISK":
      return { label: "Nguy cơ rời bỏ", cls: "bg-warning-bg text-warning-text" }
    case "DORMANT":
      return { label: "Ngủ đông", cls: "bg-danger-bg text-danger" }
    case "ACQUIRE":
    default:
      return { label: "Khách mới", cls: "bg-surface-alt text-text-muted" }
  }
}

export function CrmWorkspace() {
  const router = useRouter()
  const { orgName, userInitials, roleUx, can } = useSession()

  const [reminders, setReminders] = useState<UpcomingReminder[] | null>(null)
  const [customers, setCustomers] = useState<CustomerMasterIndex[] | null>(null)
  const [totalCustomers, setTotalCustomers] = useState<number>(0)
  const [daTai, setDaTai] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  const napLai = useCallback(async () => {
    setLoi(null)
    try {
      const [remRes, custRes] = await Promise.all([
        layJson<{ items: UpcomingReminder[] }>("/api/v1/crm/reminders/upcoming?days=14"),
        layJson<{ items: CustomerMasterIndex[]; total: number }>("/api/v1/crm/customers?limit=100"),
      ])

      setReminders(remRes?.items ?? [])
      setCustomers(custRes?.items ?? [])
      setTotalCustomers(custRes?.total ?? custRes?.items?.length ?? 0)
    } catch (e) {
      if (e instanceof ChuaDangNhap) {
        router.push("/dang-nhap" as Route)
        return
      }
      setLoi(e instanceof Error ? e.message : "Không tải được dữ liệu CRM")
    } finally {
      setDaTai(true)
    }
  }, [router])

  useEffect(() => {
    napLai()
  }, [napLai])

  // Phân loại khách hàng theo vòng đời
  const { atRiskCustomers, dormantCustomers } = useMemo(() => {
    if (!customers || customers.length === 0) {
      return { atRiskCustomers: [], dormantCustomers: [] }
    }

    const atRisk: Array<{ customer: CustomerMasterIndex; stage: CustomerLifecycleStage }> = []
    const dormant: Array<{ customer: CustomerMasterIndex; stage: CustomerLifecycleStage }> = []

    for (const c of customers) {
      const stage = deriveCustomerLifecycleStage(c.metrics)
      if (stage === "AT_RISK") atRisk.push({ customer: c, stage })
      else if (stage === "DORMANT") dormant.push({ customer: c, stage })
    }

    return { atRiskCustomers: atRisk, dormantCustomers: dormant }
  }, [customers])

  // Danh sách kết hợp cần can thiệp: ưu tiên AT_RISK trước, rồi đến DORMANT
  const retentionList = useMemo(() => {
    return [...atRiskCustomers, ...dormantCustomers]
  }, [atRiskCustomers, dormantCustomers])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        breadcrumbs={roleUx?.label ?? "Chăm sóc khách hàng (CRM)"}
        title={orgName}
        actions=<UserMenu initials={userInitials} />
      />

      {/* Main Body */}
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* K1: Tối đa 1 Feature Guidance Card */}
        <FeatureGuidanceCard
          id="crm_workspace_guidance"
          badgeLabel="HƯỚNG DẪN BÀN LÀM VIỆC CRM"
          title="Chăm Sóc Vòng Đời & Giữ Chân Khách Hàng"
          description="Nắm bắt các dịp kỷ niệm sắp tới để chủ động liên hệ, đồng thời theo dõi khách hàng có nguy cơ rời bỏ hoặc cần kích hoạt lại."
          tips={[
            "Ưu tiên liên hệ các khách hàng có dịp kỷ niệm trong 3-7 ngày tới",
            "Gửi ưu đãi hoặc tin nhắn hỏi thăm nhóm khách hàng có nguy cơ rời bỏ",
            "Đảm bảo khách hàng đã cấp quyền nhận tin trước khi gửi thông báo",
          ]}
        />

        {/* K2: Thanh tác vụ (Tối đa 1 primary + 2 outline) */}
        <div className="flex flex-wrap items-center gap-2">
          {can("Q2") && (
            <Button size="sm" variant="primary" onClick={() => router.push("/khach-hang" as Route)}>
              <UserPlus size={16} aria-hidden="true" />
              Thêm khách hàng
            </Button>
          )}
          {can("Q7") && (
            <Button size="sm" variant="outline" onClick={() => router.push("/khach-hang" as Route)}>
              <CalendarHeart size={16} aria-hidden="true" />
              Chăm sóc theo dịp
            </Button>
          )}
          {can("T1") && (
            <Button size="sm" variant="outline" onClick={() => router.push("/hoi-thoai" as Route)}>
              <MessageSquare size={16} aria-hidden="true" />
              Hội thoại tư vấn
            </Button>
          )}
        </div>

        {loi && <InlineError message={loi} onRetry={napLai} />}

        {/* Khối P1: Thống kê nhanh vòng đời CRM */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Tổng khách hàng</span>
            <span className="text-title font-extrabold text-text">
              {!daTai ? "—" : totalCustomers}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Dịp sắp tới (14 ngày)</span>
            <span className="text-title font-extrabold text-primary">
              {!daTai ? "—" : reminders?.length ?? 0}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Nguy cơ rời bỏ</span>
            <span className="text-title font-extrabold text-warning-text">
              {!daTai ? "—" : atRiskCustomers.length}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Cần kích hoạt lại</span>
            <span className="text-title font-extrabold text-danger">
              {!daTai ? "—" : dormantCustomers.length}
            </span>
          </Card>
        </div>

        {/* Khối P0: 2 cột việc trọng tâm */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Cột 1: Dịp kỷ niệm sắp tới */}
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarHeart size={18} className="text-primary" aria-hidden="true" />
                <h2 className="text-title-sm font-bold">
                  Dịp kỷ niệm sắp tới ({reminders?.length ?? 0})
                </h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/khach-hang" as Route)}
                className="text-caption"
              >
                Xem tất cả
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>

            {!daTai ? (
              <SkeletonBlock lines={3} />
            ) : !reminders || reminders.length === 0 ? (
              <EmptyState
                title="Không có dịp kỷ niệm sắp tới"
                reason="Không có khách hàng nào có dịp đặc biệt trong 14 ngày tới."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {reminders.slice(0, 6).map((r) => (
                  <li key={`${r.customerId}-${r.occasionName}-${r.targetDate}`}>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => router.push("/khach-hang" as Route)}
                      className="text-[length:inherit] font-[inherit] flex cursor-pointer min-h-12 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body font-semibold text-text">
                          {r.customerName}
                        </div>
                        <div className="text-caption text-text-muted">
                          {r.occasionName}
                          {r.recipientName && r.recipientName !== r.customerName
                            ? ` · tặng ${r.recipientName}`
                            : ""}
                          {r.isZaloAllowed ? " · có thể nhắn Zalo" : ""}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-caption font-bold ${
                          r.daysLeft <= 2
                            ? "bg-danger-bg text-danger"
                            : "bg-surface-alt text-primary"
                        }`}
                      >
                        {nhanNgayConLai(r.daysLeft)}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Cột 2: Khách hàng cần giữ chân & kích hoạt */}
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-warning-text" aria-hidden="true" />
                <h2 className="text-title-sm font-bold">
                  Khách cần giữ chân & kích hoạt ({retentionList.length})
                </h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/khach-hang" as Route)}
                className="text-caption"
              >
                Mở danh sách
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>

            {!daTai ? (
              <SkeletonBlock lines={3} />
            ) : retentionList.length === 0 ? (
              <EmptyState
                title="Tình trạng khách hàng ổn định"
                reason="Chưa ghi nhận khách hàng nào có nguy cơ rời bỏ hoặc cần kích hoạt lại."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {retentionList.slice(0, 6).map(({ customer, stage }) => {
                  const badge = nhanVongDoi(stage)
                  return (
                    <li key={customer.id}>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => router.push("/khach-hang" as Route)}
                        className="text-[length:inherit] font-[inherit] flex cursor-pointer min-h-12 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-body font-semibold text-text">
                              {customer.name}
                            </span>
                            <span className="rounded bg-surface-alt px-1.5 py-0.5 text-caption font-bold text-text-muted">
                              {customer.metrics.tier}
                            </span>
                          </div>
                          <div className="text-caption text-text-muted">
                            SĐT: {customer.phone} · Đã mua: {customer.metrics.orderCount} đơn · Chi tiêu: {formatCurrency(customer.metrics.totalSpentVnd)}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-caption font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Khối P2: Lối tắt bộ công cụ CRM */}
        <CrmToolkitGrid />
      </main>
    </div>
  )
}
