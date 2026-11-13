"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CalendarHeart } from "@/components/ui/icon-set/calendar-heart"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Tag } from "@/components/ui/icon-set/tag"
import { UserPlus } from "@/components/ui/icon-set/user-plus"
import { useSession } from "@/lib/session"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/layout/user-menu"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { formatCurrency } from "@/lib/i18n/formatters"
import { PageHeader } from "@/components/ui/page-header"

type Reminder = {
  customerId: string
  customerName: string
  occasionName: string
  targetDate: string
  daysLeft: number
  recipientName: string
  isZaloAllowed: boolean
}

type DraftOrder = {
  id: string
  code: string
  totalVnd: number
  createdAt: string
}

class ChuaDangNhap extends Error {}

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

export function SalesWorkspace() {
  const router = useRouter()
  const { orgName, userInitials, roleUx, can } = useSession()

  const [nhacViec, setNhacViec] = useState<Reminder[] | null>(null)
  const [donNhap, setDonNhap] = useState<{ orders: DraftOrder[]; total: number } | null>(null)
  const [daTai, setDaTai] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  const napLai = useCallback(async () => {
    setLoi(null)
    try {
      const [reminders, drafts] = await Promise.all([
        layJson<{ items: Reminder[] }>("/api/v1/crm/reminders/upcoming?days=14"),
        layJson<{ data: DraftOrder[]; meta: { total: number } }>("/api/v1/orders?status=DRAFT&limit=5"),
      ])
      setNhacViec(reminders?.items ?? null)
      setDonNhap(drafts ? { orders: drafts.data, total: drafts.meta.total } : null)
    } catch (e) {
      if (e instanceof ChuaDangNhap) {
        router.push("/dang-nhap" as never)
        return
      }
      setLoi(e instanceof Error ? e.message : "Không tải được dữ liệu")
    } finally {
      setDaTai(true)
    }
  }, [router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu khi mount
    napLai()
  }, [napLai])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        breadcrumbs={roleUx?.label ?? "Bán hàng"}
        title={orgName}
        actions=<UserMenu initials={userInitials} />
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Nhóm hành động chính — một nút chính, hai nút phụ (03a UX-010/011). */}
        <div className="flex flex-wrap items-center gap-2">
          {can("R2") && (
            <Button size="sm" onClick={() => router.push("/don-hang" as never)}>
              <ShoppingBag size={16} aria-hidden="true" />
              Tạo đơn
            </Button>
          )}
          {can("Q2") && (
            <Button size="sm" variant="outline" onClick={() => router.push("/khach-hang" as never)}>
              <UserPlus size={16} aria-hidden="true" />
              Thêm khách
            </Button>
          )}
          {can("L1") && (
            <Button size="sm" variant="outline" onClick={() => router.push("/san-pham" as never)}>
              <Tag size={16} aria-hidden="true" />
              Tra giá
            </Button>
          )}
        </div>

        {loi && <InlineError message={loi} onRetry={napLai} />}

        {/* Khối P0 — Grid 2 cột trên 1280px (lg) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* P0 — Khách cần liên hệ */}
          {(!daTai || nhacViec !== null) && (
            <Card className="flex flex-col gap-2 p-4">
              <h2 className="text-title-sm font-bold">Khách cần liên hệ</h2>
              {!daTai || nhacViec === null ? (
                <SkeletonBlock lines={2} />
              ) : nhacViec.length === 0 ? (
                <EmptyState
                  title="Không có khách cần liên hệ"
                  reason="Không có khách nào sắp tới dịp kỷ niệm trong 14 ngày tới."
                />
              ) : (
                <ul className="flex flex-col">
                  {nhacViec.slice(0, 6).map((r) => (
                    <li key={`${r.customerId}-${r.occasionName}-${r.targetDate}`}>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => router.push("/khach-hang" as never)}
                        className="text-[length:inherit] justify-start font-[inherit] flex min-h-11 w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
                      >
                        <CalendarHeart size={17} className="flex-shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body font-semibold">{r.customerName}</span>
                          <span className="block truncate text-caption text-text-muted">
                            {r.occasionName}
                            {r.recipientName && r.recipientName !== r.customerName ? ` · tặng ${r.recipientName}` : ""}
                            {r.isZaloAllowed ? " · nhắn Zalo được" : ""}
                          </span>
                        </span>
                        <span className={r.daysLeft <= 2 ? "text-caption font-bold text-danger" : "text-caption font-bold text-text-muted"}>
                          {nhanNgayConLai(r.daysLeft)}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* P0 — Đơn nháp cần chốt */}
          {(!daTai || donNhap !== null) && (
            <Card className="flex flex-col gap-2 p-4">
              <h2 className="text-title-sm font-bold">
                Đơn nháp cần chốt{donNhap && donNhap.total > 0 ? ` (${donNhap.total})` : ""}
              </h2>
              {!daTai || donNhap === null ? (
                <SkeletonBlock lines={2} />
              ) : donNhap.orders.length === 0 ? (
                <EmptyState
                  title="Không có đơn nháp nào"
                  reason="Mọi đơn hàng đều đã được xử lý hoặc chốt thành công."
                />
              ) : (
                <ul className="flex flex-col">
                  {donNhap.orders.map((o) => (
                    <li key={o.id}>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => router.push("/don-hang" as never)}
                        className="py-0 text-[length:inherit] font-[inherit] flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-1 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
                      >
                        <span className="text-body font-semibold">{o.code}</span>
                        <span className="flex items-center gap-1 text-body-sm font-bold text-text">
                          {formatCurrency(o.totalVnd)}                          <ChevronRight size={15} className="text-text-muted" aria-hidden="true" />
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        {daTai && nhacViec === null && donNhap === null && !loi && (
          <p className="text-body-sm text-text-muted">
            Tài khoản của bạn chưa được cấp quyền xem khách hàng hoặc đơn hàng. Liên hệ người điều hành tiệm.
          </p>
        )}

        <p className="text-caption text-text-muted">
          Pipeline cơ hội (tiềm năng → cơ hội → chốt) đang phát triển.
        </p>
      </div>
    </div>
  )
}
