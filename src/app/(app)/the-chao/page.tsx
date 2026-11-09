"use client"

import { InfoTip } from "@/components/ui/info-tip"
import React, { useState, useCallback } from "react"
import Link from "next/link"
import { useSWRConfig } from "swr"
import { useApi } from "@/components/greeting-card/greeting-api"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Sparkles, Send, ShieldCheck, BookOpen, RefreshCw, GitMerge, Wand2, LayoutList } from "@/components/ui/icons"
import { TabActionHeader, type TabItem } from "@/components/ui/tab-header"
import { cn } from "@/lib/utils"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import { SalesBrochureTab } from "@/components/greeting-card/sales/sales-brochure-tab"
import { AdminBrochurePaymentTab } from "@/components/greeting-card/admin/admin-brochure-payment-tab"
import { CatalogListTab } from "@/components/greeting-card/catalog/catalog-list-tab"
import { CatalogDetailPanel } from "@/components/greeting-card/catalog/catalog-detail-panel"
import { JourneyWizard } from "@/components/greeting-card/journey/journey-wizard"
import { CoordinatorBrochureTab } from "@/components/greeting-card/coordinator/coordinator-brochure-tab"
import { BrochureOrderTrackingTab } from "@/components/greeting-card/tracking/brochure-order-tracking-tab"
import { InboxButton } from "@/components/greeting-card/inbox/inbox-button"
import { BrochureUserGuideModal } from "@/components/greeting-card/brochure-user-guide-modal"
import { ShopProfileReadiness } from "@/components/greeting-card/shop-profile-readiness"
import { defaultTheChaoView } from "@/components/greeting-card/default-view"
import { ExportOrdersButton } from "@/components/orders/export-orders-button"
import type { InboxTarget } from "@/components/greeting-card/inbox/inbox-panel"

type ActiveTab = "sales" | "payment" | "catalog" | "coordinator" | "tracking"
type ViewMode = "wizard" | "manager"
type CatalogBasic = { id: string; name: string }

const MODES: { id: ViewMode; label: string; icon: typeof Wand2 }[] = [
  { id: "wizard", label: "Gửi nhanh", icon: Wand2 },
  { id: "manager", label: "Quản lý", icon: LayoutList },
]

export default function TheChaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { can } = useSession()
  const { dict, ti } = useI18n()

  const requestedTab = searchParams.get("tab") as ActiveTab | null
  const requestedMode = searchParams.get("mode") as ViewMode | null
  const isQuickParam = searchParams.get("quick") === "true"

  // "wizard": luồng 3 bước gửi thẻ · "manager": bảng quản lý chi tiết — mở theo URL param hoặc vai
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (isQuickParam) return "wizard"
    if (requestedMode === "manager" || requestedMode === "wizard") return requestedMode
    if (requestedTab) return "manager"
    return defaultTheChaoView(can).viewMode
  })
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (requestedTab && ["sales", "payment", "catalog", "coordinator", "tracking"].includes(requestedTab)) {
      return requestedTab
    }
    return defaultTheChaoView(can).activeTab
  })

  // Đồng bộ reactive khi chuyển trang / đổi query params
  React.useEffect(() => {
    // Chạy sau lượt render (không setState đồng bộ trong effect)
    void Promise.resolve().then(() => {
      if (isQuickParam) {
        setViewMode("wizard")
      } else if (requestedMode === "manager" || requestedMode === "wizard") {
        setViewMode(requestedMode)
      } else if (requestedTab) {
        setViewMode("manager")
      }
      if (requestedTab && ["sales", "payment", "catalog", "coordinator", "tracking"].includes(requestedTab)) {
        setActiveTab(requestedTab)
      }
    })
  }, [isQuickParam, requestedMode, requestedTab])
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogBasic | null>(null)
  // Số đếm cho huy hiệu tab (SWR). Danh sách phân trang: quá 100 thì hiện "100+".
  const catalogList = useApi<{ data: unknown[]; next_cursor: string | null }>("/api/v1/greeting-card/catalogs?limit=100")
  const sessionList = useApi<{ data: unknown[]; next_cursor: string | null }>("/api/v1/greeting-card/send-links?limit=100")
  const countOf = (r: { data: unknown[]; next_cursor: string | null } | undefined) =>
    r ? (r.next_cursor ? "100+" : r.data.length) : null
  const catalogCount = countOf(catalogList.data)
  const sessionCount = countOf(sessionList.data)
  const cancellationList = useApi<{ data: unknown[] }>(
    can("R11") ? "/api/v1/greeting-card/cancellation-requests" : null,
    { refreshInterval: 20_000 }
  )
  const pendingCancelCount = cancellationList.data?.data.length ? cancellationList.data.data.length : null

  // Đếm đơn chờ Điều phối xác nhận bill lần 2 để hiển thị badge cảnh báo trên tab Điều phối
  const coordinatorBoardData = useApi<{ data: Array<{ paid_vnd: number; total_vnd: number; greeting_sessions: Array<{ status?: string }> }> }>(
    can("R3") || can("R4") || can("R5") ? "/api/v1/greeting-card/coordinator-board" : null,
    { refreshInterval: 20_000 }
  )
  const pendingBalanceConfirmCount = coordinatorBoardData.data?.data
    ? coordinatorBoardData.data.data.filter(
        (o) =>
          o.paid_vnd > 0 &&
          o.paid_vnd < o.total_vnd &&
          o.greeting_sessions.some((s) => s.status === "PAYMENT_REPORTED")
      ).length
    : null
  const coordinatorBadge = pendingBalanceConfirmCount && pendingBalanceConfirmCount > 0 ? pendingBalanceConfirmCount : null

  const [refreshKey, setRefreshKey] = useState(0)
  // Đơn cần mở ở tab Điều hành khi bấm "Xử lý" trong Hộp việc
  const [paymentFocus, setPaymentFocus] = useState<string | null>(null)

  // Từ Hộp việc: mở đúng tab rồi cuộn tới đúng thẻ đơn (chờ dữ liệu tab tải xong tối đa ~4 giây)
  const openInboxTarget = useCallback((t: InboxTarget) => {
    setViewMode("manager")
    setActiveTab(t.tab)
    setPaymentFocus(t.tab === "payment" ? t.orderId : null)
    const key = t.orderId ?? t.sessionId
    if (!key) return
    let tries = 0
    const timer = window.setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(key)}"]`)
      if (el || ++tries > 20) {
        window.clearInterval(timer)
        if (!el) return
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.classList.add("ring-2", "ring-primary")
        window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500)
      }
    }, 200)
  }, [])

  // "Làm mới" = mọi danh sách SWR trên trang tải lại
  const { mutate } = useSWRConfig()
  const refreshAll = useCallback(() => void mutate(() => true), [mutate])

  // Chỉ hiện tab người dùng có năng lực làm (ẩn hiện giao diện — máy chủ vẫn kiểm ở mọi endpoint)
  const allowed: Record<ActiveTab, boolean> = {
    catalog: can("L1"),
    tracking: can("R1"),
    sales: can("R2"),
    payment: can("R11"),
    coordinator: can("R3") || can("R4") || can("R5"),
  }
  const catalogTabLabel = ti("catalogTitle").toLowerCase().includes("phòng")
    ? "Danh sách phòng"
    : ti("catalogTitle").toLowerCase().includes("thực đơn")
    ? "Thực đơn món"
    : dict.greetingCard.tabs.catalogs

  const tabs: TabItem[] = ([
    { id: "catalog", icon: BookOpen, label: catalogTabLabel, ...(catalogCount !== null ? { badge: catalogCount } : {}) },
    { id: "tracking", icon: GitMerge, label: dict.greetingCard.tabs.tracking },
    { id: "sales", icon: Send, label: dict.greetingCard.tabs.sales, ...(sessionCount !== null ? { badge: sessionCount } : {}) },
    { id: "payment", icon: ShieldCheck, label: dict.greetingCard.tabs.operation, ...(pendingCancelCount !== null ? { badge: pendingCancelCount } : {}) },
    {
      id: "coordinator",
      icon: Sparkles,
      label: dict.greetingCard.tabs.coordination,
      ...(coordinatorBadge !== null ? { badge: coordinatorBadge, badgeTone: "warning" as const } : {}),
    },
  ] satisfies TabItem[]).filter((t) => allowed[t.id as ActiveTab])
  // Tab đang chọn bị ẩn (không đủ quyền) → mở tab đầu tiên được phép
  const shownTab: ActiveTab = allowed[activeTab] ? activeTab : ((tabs[0]?.id as ActiveTab | undefined) ?? activeTab)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Màn rộng: tiêu đề trái, nút phải trên MỘT hàng; hẹp hơn: nút xuống dưới tiêu đề — mọi vai cùng bố cục */}
      <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 xl:flex-1">
          <Link
            href="/don-hang"
            className="mb-2 inline-flex items-center gap-1 text-body-sm font-medium text-text-muted hover:text-text"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {dict.greetingCard.header.breadcrumb}
          </Link>
          {/* Tiêu đề ngắn; mô tả trong "?" (OPERATING_PRINCIPLES §6.1) */}
          <div className="flex items-center gap-2">
            <h1 className="text-title font-bold text-text">{dict.greetingCard.header.title}</h1>
            <InfoTip label={dict.greetingCard.header.title} side="bottom">
              {dict.greetingCard.header.description}
            </InfoTip>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:shrink-0 xl:flex-nowrap">
          <BrochureUserGuideModal />
          <InboxButton onOpenTarget={openInboxTarget} />
          <div role="tablist" aria-label="Chế độ làm việc" className="inline-flex rounded-xl border border-border bg-surface-alt p-1">
            {MODES.map((m) => {
              const active = viewMode === m.id
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setViewMode(m.id)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-body-sm font-semibold transition-colors",
                    active ? "bg-surface text-primary shadow-xs" : "text-text-muted hover:text-text",
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  {m.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              refreshAll()
              setRefreshKey((k) => k + 1)
              router.refresh()
            }}
            aria-label="Làm mới"
            title="Làm mới"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-alt text-text-muted hover:bg-surface hover:text-text active:bg-surface active:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          {(can("R11") || can("R1")) && (
            <ExportOrdersButton
              apiPath="/api/v1/orders/export"
              extraParams={{ source: "BROCHURE" }}
              filename="the-chao-don-hang.xlsx"
              label="Xuất file Excel"
              iconOnly
            />
          )}
        </div>
      </header>

      <ShopProfileReadiness />

      {viewMode === "wizard" ? (
        <JourneyWizard
          key={refreshKey}
          autoOpenQuickModal={isQuickParam}
          onFinish={() => {
            refreshAll()
            setActiveTab("sales")
            setViewMode("manager")
          }}
        />
      ) : (
        <div key={refreshKey} className="flex flex-col gap-4">
          <TabActionHeader
            tabs={tabs}
            activeTab={shownTab}
            onTabChange={(id) => {
              setActiveTab(id as ActiveTab)
              if (id !== "catalog") setSelectedCatalog(null)
            }}
          />

          {shownTab === "catalog" &&
            (selectedCatalog ? (
              <CatalogDetailPanel
                catalogId={selectedCatalog.id}
                catalogName={selectedCatalog.name}
                onBack={() => {
                  setSelectedCatalog(null)
                  refreshAll()
                }}
              />
            ) : (
              <CatalogListTab onSelectCatalog={(c) => setSelectedCatalog({ id: c.id, name: c.name })} />
            ))}
          {shownTab === "tracking" && <BrochureOrderTrackingTab />}
          {shownTab === "sales" && (
            <SalesBrochureTab
              onNavigateToCatalog={() => {
                setSelectedCatalog(null)
                setActiveTab("catalog")
              }}
            />
          )}
          {shownTab === "coordinator" && <CoordinatorBrochureTab canDecideInTransitCancel={can("R5")} />}
          {shownTab === "payment" && <AdminBrochurePaymentTab focusOrderId={paymentFocus} onClearFocus={() => setPaymentFocus(null)} />}
        </div>
      )}
    </div>
  )
}
