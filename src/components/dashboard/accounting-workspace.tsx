"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Route } from "next"

import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { Gauge } from "@/components/ui/icon-set/gauge"
import { Receipt } from "@/components/ui/icon-set/receipt"
import { Wallet } from "@/components/ui/icon-set/wallet"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { InlineError } from "@/components/ui/inline-error"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { UserMenu } from "@/components/layout/user-menu"
import { ExportOrdersButton } from "@/components/orders/export-orders-button"
import { formatCurrency, formatDateTime } from "@/lib/i18n/formatters"
import { useSession } from "@/lib/session"

import { NotSignedIn, getJson } from "./role-work-api"
import { filterOpenHrefs } from "@/lib/feature-lock"

interface BankEvent {
  id: string
  amount_vnd: number
  content: string
  transaction_at: string | null
  created_at: string
}

const LINKS = [
  { href: "/don-hang", label: "Đơn hàng và sổ thu", icon: Receipt },
  { href: "/so-lieu", label: "Số liệu kinh doanh", icon: BarChart3 },
  { href: "/muc-dung", label: "Mức dùng và hạn mức", icon: Gauge },
] as const

async function fetchEvents(): Promise<BankEvent[]> {
  return (await getJson<{ data: BankEvent[] }>("/api/v1/greeting-card/payment-events?status=UNMATCHED&limit=20"))?.data ?? []
}

/**
 * Trang chủ Kế toán (checklist ALG 1.12, PO Q7): xem đơn và sổ thu, đối soát giao dịch ngân hàng chưa
 * khớp, xuất Excel, xem số liệu. Chỉ xem — xác nhận tiền thuộc Điều hành.
 */
export function AccountingWorkspace() {
  const router = useRouter()
  const { orgName, userInitials, roleUx } = useSession()
  const [events, setEvents] = useState<BankEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fail = useCallback((e: unknown) => {
    if (e instanceof NotSignedIn) return router.push("/dang-nhap" as Route)
    setError(e instanceof Error ? e.message : "Không tải được giao dịch ngân hàng")
  }, [router])

  const load = useCallback(async () => {
    try {
      setEvents(await fetchEvents())
      setError(null)
    } catch (e) {
      fail(e)
    }
  }, [fail])

  useEffect(() => {
    fetchEvents().then((d) => setEvents(d)).catch(fail)
  }, [fail])

  const total = (events ?? []).reduce((sum, e) => sum + e.amount_vnd, 0)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        breadcrumbs={roleUx?.label ?? "Kế toán"}
        title={orgName}
        actions=<UserMenu initials={userInitials} />
      />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <FeatureGuidanceCard
          id="accounting_workspace_guidance"
          badgeLabel="BÀN LÀM VIỆC KẾ TOÁN"
          title="Đối soát thu chi và lập báo cáo"
          description="Theo dõi giao dịch ngân hàng chưa khớp đơn, xem sổ thu từng đơn và xuất dữ liệu cho sổ sách. Xác nhận tiền do Điều hành thực hiện."
          tips={["Giao dịch chưa khớp cần báo Điều hành xử lý", "Xuất Excel theo khoảng ngày để đối chiếu sổ", "Số liệu kinh doanh cập nhật theo đơn đã ghi nhận"]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {filterOpenHrefs(LINKS, (l) => l.href).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href as Route} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-text hover:bg-surface-alt">
              <Icon size={16} />{label}
            </Link>
          ))}
          <ExportOrdersButton label="Xuất đơn hàng ra Excel" />
        </div>
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-title-sm font-bold text-text"><Wallet size={18} />Giao dịch ngân hàng chưa khớp đơn</p>
            {events && events.length > 0 && <span className="text-body-sm text-text-muted">{events.length} giao dịch · {formatCurrency(total)}</span>}
          </div>
          {error && <InlineError message={error} onRetry={() => void load()} />}
          {events === null && !error && <SkeletonBlock lines={3} label="Đang tải giao dịch" />}
          {events?.length === 0 && <EmptyState title="Mọi giao dịch đã khớp đơn" reason="Giao dịch ngân hàng không khớp được đơn nào sẽ hiện ở đây." />}
          {events?.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 border-t border-border pt-2 text-body-sm">
              <div>
                <p className="text-text">{e.content || "Không có nội dung chuyển khoản"}</p>
                <p className="text-caption text-text-muted">{formatDateTime(e.transaction_at ?? e.created_at)}</p>
              </div>
              <span className="font-semibold text-text">{formatCurrency(e.amount_vnd)}</span>
            </div>
          ))}
        </Card>
      </main>
    </div>
  )
}
