"use client"

import { Button } from "@/components/ui/button"
import { usePromptDialog } from "@/components/ui/prompt-dialog"
import { NativeSelect } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { ViDateInput } from "@/components/greeting-card/customer/vi-date-input"
import {
  Bookmark,
  Calendar as CalendarIcon,
  Filter,
  Kanban,
  List,
  Clock,
  LayoutGrid,
  BarChart3,
  Search,
  Trash2,
  X,
  RefreshCw,
  SlidersHorizontal,
} from "@/components/ui/icons"
import { useApi } from "@/components/greeting-card/greeting-api"
import { useSession } from "@/lib/session"
import { TRACKING_CATEGORIES, getIndustryTrackingCategories } from "@/modules/greeting-card/domain/tracking-filters"
import { getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"
import {
  VIEW_TABS,
  loadSavedViews,
  presetViews,
  storeSavedViews,
  type SavedView,
  type TrackingViewState,
  type ViewKind,
} from "./tracking-view-state"

const SELECT = "h-9 rounded-xl border border-border bg-surface px-2.5 text-caption text-text focus:border-primary focus:outline-hidden"

interface Props {
  state: TrackingViewState
  onChange: (patch: Partial<TrackingViewState>) => void
  onApplyView: (v: SavedView) => void
  onRefresh?: () => void
}

const VIEW_ICONS: Record<ViewKind, React.ComponentType<{ size?: number; className?: string }>> = {
  kanban: Kanban,
  list: List,
  calendar: CalendarIcon,
  timeline: Clock,
  queue: LayoutGrid,
  dashboard: BarChart3,
}

export function TrackingToolbar({ state, onChange, onApplyView, onRefresh }: Props) {
  const { organization } = useSession()
  const orgId = organization?.id
  const recipients = useApi<{ data: { members: Array<{ userId: string; name: string }> } }>(
    "/api/v1/greeting-card/messages/recipients"
  )
  const members = recipients.data?.data.members ?? []
  const [saved, setSaved] = useState<SavedView[]>(() => loadSavedViews(orgId))
  const [savedOrgId, setSavedOrgId] = useState(orgId)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [askText, promptDialog] = usePromptDialog()

  if (savedOrgId !== orgId) {
    setSavedOrgId(orgId)
    setSaved(loadSavedViews(orgId))
  }

  async function saveCurrent() {
    const name = await askText({ title: "Lưu view hiện tại", label: "Tên view", placeholder: "Vd. Đơn của Sale Lan", confirmLabel: "Lưu view" })
    if (!name) return
    const next = [...saved, { id: `u-${Date.now().toString(36)}`, name: name.slice(0, 60), state: { ...state } }]
    setSaved(next)
    storeSavedViews(next, orgId)
  }

  function remove(id: string) {
    const next = saved.filter((v) => v.id !== id)
    setSaved(next)
    storeSavedViews(next, orgId)
  }

  // Đếm số lượng bộ lọc nâng cao đang kích hoạt để báo badge
  const advancedCount = [
    state.type ? 1 : 0,
    state.sla ? 1 : 0,
    state.deliveryFrom ? 1 : 0,
    state.deliveryTo ? 1 : 0,
    state.statusMode !== "ACTIVE" ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3 shadow-xs">
      {promptDialog}
      {/* HÀNG CHÍNH: Tìm kiếm + Lọc nhanh + View Tabs + Nút làm mới */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
          {/* Ô TÌM KIẾM THÔNG MINH */}
          <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Tìm kiếm đơn hàng"
              value={state.q}
              onChange={(e) => onChange({ q: e.target.value })}
              placeholder="Tìm mã đơn, tên khách, SĐT…"
              className="h-9 w-full rounded-xl border border-border bg-surface-alt pl-8 pr-7 text-caption text-text placeholder:text-text-muted focus:border-primary focus:bg-surface focus:outline-hidden"
            />
            {state.q && (
              <Button variant="ghost"
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => onChange({ q: "" })}
                className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={13} aria-hidden="true" />
              </Button>
            )}
          </div>

          {/* NHÓM BƯỚC */}
          <NativeSelect
            aria-label="Nhóm bước"
            value={state.category}
            onChange={(e) => onChange({ category: e.target.value as TrackingViewState["category"] })}
            className={SELECT}
          >
            <option value="">Mọi bước</option>
            {getIndustryTrackingCategories(organization?.industry).filter((c) => c.id !== "ALL").map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>

          {/* SALE PHỤ TRÁCH */}
          <NativeSelect
            aria-label="Sale phụ trách"
            value={state.saleId}
            onChange={(e) => onChange({ saleId: e.target.value })}
            className={SELECT}
          >
            <option value="">Mọi sale</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </NativeSelect>

          {/* NÚT BẬT/TẮT BỘ LỌC NÂNG CAO */}
          <Button variant="outline"
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`py-0 inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-caption font-semibold transition-colors ${
              showAdvanced || advancedCount > 0
                ? "border-primary bg-primary/10 text-primary hover:bg-primary/10"
                : "border-border text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Lọc thêm</span>
            {advancedCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-caption font-bold text-white">
                {advancedCount}
              </span>
            )}
          </Button>
        </div>

        {/* CỤM BÊN PHẢI: VIEW SWITCHER + REFRESH */}
        <div className="flex items-center gap-2">
          {/* Segmented View Switcher */}
          <div
            role="tablist"
            aria-label="Cách xem"
            className="flex items-center rounded-xl border border-border bg-surface-alt p-0.5"
          >
            {VIEW_TABS.map((t) => {
              const Icon = VIEW_ICONS[t.id]
              const active = state.view === t.id
              return (
                <Button variant="ghost"
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onChange({ view: t.id })}
                  className={`py-0 inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-caption font-bold transition-all ${
                    active ? "bg-surface text-primary shadow-xs hover:bg-surface" : "text-text-muted hover:text-text"
                  }`}
                  title={t.label}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{t.label}</span>
                </Button>
              )
            })}
          </div>

          {onRefresh && (
            <Button variant="outline"
              type="button"
              onClick={onRefresh}
              title="Làm mới tiến độ"
              className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted hover:bg-surface-muted hover:text-text"
            >
              <RefreshCw size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* HÀNG PRESET VIEW NHANH (Bookmark) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 text-caption">
        <Bookmark size={13} className="text-text-muted shrink-0 ml-1" />
        {[...presetViews(organization?.industry), ...saved].map((v) => (
          <span key={v.id} className="inline-flex items-center rounded-lg border border-border bg-surface-alt">
            <Button variant="ghost"
              type="button"
              onClick={() => onApplyView(v)}
              className="h-auto gap-0 px-2 py-0.5 font-medium text-text hover:text-primary transition-colors text-caption"
            >
              {v.name}
            </Button>
            {v.id.startsWith("u-") && (
              <Button variant="ghost"
                type="button"
                aria-label={`Xoá view ${v.name}`}
                onClick={() => remove(v.id)}
                className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 pr-1.5 text-text-muted hover:text-danger"
              >
                <Trash2 size={11} aria-hidden="true" />
              </Button>
            )}
          </span>
        ))}
        <Button variant="outline"
          type="button"
          onClick={() => void saveCurrent()}
          className="h-auto gap-0 rounded-lg border border-dashed border-primary/50 px-2 py-0.5 text-caption font-semibold text-primary hover:bg-primary/5"
        >
          + Lưu view
        </Button>
      </div>

      {/* BỘ LỌC NÂNG CAO (Chỉ hiện khi nhấn "Lọc thêm") */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/40 sm:grid-cols-2 md:grid-cols-4 animate-in fade-in duration-150">
          <NativeSelect
            aria-label="Thời gian chuẩn"
            value={state.sla}
            onChange={(e) => onChange({ sla: e.target.value as TrackingViewState["sla"] })}
            className={SELECT}
          >
            <option value="">Mọi trạng thái thời gian</option>
            <option value="ATTENTION">Quá hoặc sắp quá hạn</option>
            <option value="OVERDUE">Quá thời gian chuẩn</option>
            <option value="DUE_SOON">Sắp quá hạn</option>
            <option value="ON_TRACK">Đúng tiến độ</option>
          </NativeSelect>

          <NativeSelect
            aria-label="Loại"
            value={state.type}
            onChange={(e) => onChange({ type: e.target.value as TrackingViewState["type"] })}
            className={SELECT}
          >
            <option value="">Đơn và link</option>
            <option value="ORDER">Chỉ đơn đã đặt</option>
            <option value="SESSION">Chỉ link chờ khách</option>
          </NativeSelect>

          <label className="flex items-center gap-1.5 text-caption text-text-muted">
            <span>{getIndustryOrderTerms(organization?.industry).fulfillmentFlow === "CALENDAR_STAY" ? "Nhận phòng từ" : "Giao từ"}</span>
            <ViDateInput compact ariaLabel={getIndustryOrderTerms(organization?.industry).fulfillmentFlow === "CALENDAR_STAY" ? "Nhận phòng từ ngày" : "Giao từ ngày"} value={state.deliveryFrom} onChange={(v) => onChange({ deliveryFrom: v })} wrapperClassName="flex-1" className={SELECT} />
          </label>

          <label className="flex items-center gap-1.5 text-caption text-text-muted">
            <span>đến</span>
            <ViDateInput compact ariaLabel={getIndustryOrderTerms(organization?.industry).fulfillmentFlow === "CALENDAR_STAY" ? "Đến ngày" : "Giao đến ngày"} value={state.deliveryTo} onChange={(v) => onChange({ deliveryTo: v })} wrapperClassName="flex-1" className={SELECT} />
          </label>

          <NativeSelect
            aria-label="Trạng thái hiển thị"
            value={state.statusMode}
            onChange={(e) => onChange({ statusMode: e.target.value as TrackingViewState["statusMode"] })}
            className={SELECT}
          >
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="DISMISSED">Đã hủy / Bỏ hiển thị</option>
            <option value="ALL">Tất cả</option>
          </NativeSelect>
        </div>
      )}
    </div>
  )
}
