"use client"

import { useI18n } from "@/lib/i18n"
import { useState } from "react"
import useSWR from "swr"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import type { AvailabilityBoardResult } from "@/modules/availability/use-cases/get-availability-board"
import { HomestayCalendarMatrix } from "@/components/availability/homestay-calendar-matrix"
import { DailyCapacityBoard } from "@/components/availability/daily-capacity-board"
import { QuickStockBoard } from "@/components/availability/quick-stock-board"
import { PageHeader } from "@/components/ui/page-header"

const fetcher = async (url: string): Promise<AvailabilityBoardResult> => {
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok || json?.error) {
    const message = json?.error?.message || `Lỗi tải dữ liệu (${res.status})`
    throw new Error(message)
  }
  return json as AvailabilityBoardResult
}

export default function AvailabilityPage() {
  const { t } = useI18n()
  const { organization } = useSession()
  const industryKey = organization?.industry
  const terms = getIndustryTerminology(industryKey)

  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar")

  const { data, error, isLoading, mutate } = useSWR<AvailabilityBoardResult>(
    `/api/v1/availability/board?month=${currentMonth}`,
    fetcher,
    { revalidateOnFocus: true }
  )

  const isHomestay = industryKey === "HOMESTAY"
  const isFloralOrFnb = industryKey === "FLORAL" || industryKey === "FNB" || industryKey === "SERVICES"

  let pageTitle = "Khả dụng & tồn kho"
  let pageDesc = "Theo dõi và quản lý khả năng cung ứng, đặt trước cho sản phẩm của tiệm."

  if (isHomestay) {
    pageTitle = "Lịch phòng & khả dụng"
    pageDesc = "Theo dõi lịch trống, đơn khách đặt tự động và khóa bảo trì các phòng homestay."
  } else if (industryKey === "FLORAL") {
    pageTitle = "Năng lực nhận đơn & Giờ hẹn"
    pageDesc = `Kiểm soát giới hạn số lượng ${terms.sampleProduct.toLowerCase()} mỗi ngày để tránh quá tải.`
  } else if (industryKey === "FNB") {
    pageTitle = "Lịch phục vụ & Khung giờ"
    pageDesc = "Theo dõi công suất phục vụ bàn và khung giờ tiếp nhận khách hàng."
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-caption font-semibold text-text-muted mb-1">
            <span>Sản phẩm</span>
            <span>/</span>
            <span className="text-primary font-bold">{pageTitle}</span>
          </div>
          {/* Tiêu đề ngắn; mô tả trong "?" (OPERATING_PRINCIPLES §6.1) */}
          <PageHeader
            title={<><span>{pageTitle}</span> <Sparkles size={18} className="text-primary" /></>}
            tip={<>{pageDesc}</>}
          />
        </div>

        {/* View mode toggle & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-border bg-surface-alt p-1">
            <Button
              type="button"
              variant={activeTab === "calendar" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption font-semibold transition-all ${
                activeTab === "calendar"
                  ? "bg-surface text-primary shadow-xs hover:bg-surface"
                  : "text-text-muted hover:text-text hover:bg-transparent"
              }`}
            >
              <Calendar size={14} />
              <span>Chế độ Lịch</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === "list" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption font-semibold transition-all ${
                activeTab === "list"
                  ? "bg-surface text-primary shadow-xs hover:bg-surface"
                  : "text-text-muted hover:text-text hover:bg-transparent"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Danh sách sản phẩm</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => mutate()}
            disabled={isLoading}
            aria-label="Tải lại dữ liệu"
            className="h-9 w-9 rounded-xl"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin motion-reduce:animate-none" : ""} />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface">
          <Loader2 size={24} className="animate-spin motion-reduce:animate-none text-primary" />
          <span className="text-caption text-text-muted">Đang tải dữ liệu khả dụng...</span>
        </div>
      ) : error || !data || !Array.isArray(data.days) || !Array.isArray(data.products) ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/10 p-6 text-center text-caption text-danger space-y-3">
          <div className="font-semibold">
            {error instanceof Error
              ? error.message
              : "Không thể tải dữ liệu bảng điều khiển khả dụng. Vui lòng kiểm tra lại kết nối."}
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => mutate()}
            className="inline-flex items-center gap-1.5 rounded-xl font-bold"
          >
            <RefreshCw size={13} />
            <span>Thử lại</span>
          </Button>
        </div>
      ) : activeTab === "list" ? (
        <QuickStockBoard products={data.products} />
      ) : isHomestay ? (
        <HomestayCalendarMatrix
          products={data.products}
          bookings={data.bookings ?? []}
          days={data.days}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          onRefresh={() => mutate()}
        />
      ) : isFloralOrFnb ? (
        <DailyCapacityBoard
          products={data.products}
          bookings={data.bookings ?? []}
          days={data.days}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      ) : (
        <QuickStockBoard products={data.products} />
      )}
    </div>
  )
}
