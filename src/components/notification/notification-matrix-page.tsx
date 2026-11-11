/**
 * NOTIFICATION MATRIX PAGE — Component chính hiển thị ma trận thông báo
 *
 * Dùng chung cho tất cả 4 tầng: Mother, Industry, Chain, Store.
 * Mỗi tầng truyền vào props khác nhau (viewerTier, scopeId, data).
 *
 * Layout: Header → Guidance Card → Filter bar → Event Group Tables
 */
"use client"

import { useState, useMemo } from "react"
import { BellRing } from "@/components/ui/icon-set/bell-ring"
import { Search } from "@/components/ui/icon-set/search"
import { Filter } from "@/components/ui/icon-set/filter"
import { Shield } from "@/components/ui/icon-set/shield"
import { Lock } from "@/components/ui/icon-set/lock"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { NotificationMatrixGroupTable } from "./notification-matrix-group-table"
import type {
  NotificationMatrixProps,
  MatrixEventGroupSection,
} from "./notification-matrix-types"
import {
  TIER_LABELS,
  EVENT_GROUP_LABELS,
} from "./notification-matrix-types"
import type { NotificationEventGroup } from "@/modules/notification/domain/events/_contract"
import { PageHeader } from "@/components/ui/page-header"

export function NotificationMatrixPage({
  viewerTier,
  title,
  description,
  scopeId,
  activeChannels,
  sections,
  canManageHardLocks,
  onToggleCell,
  onToggleHardLock,
  onRemoveHardLock,
  loading = false,
  error,
  beforeMatrix,
}: NotificationMatrixProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<NotificationEventGroup | "ALL">("ALL")

  // Stats
  const totalEvents = useMemo(
    () => sections.reduce((sum, s) => sum + s.events.length, 0),
    [sections]
  )
  const hardLockCount = useMemo(
    () =>
      sections.reduce(
        (sum, s) =>
          sum +
          s.events.reduce(
            (eSum, e) =>
              eSum +
              Object.values(e.channels).filter(
                (c) => c.hardLockedBy !== null
              ).length,
            0
          ),
        0
      ),
    [sections]
  )

  // Filter logic
  const filteredSections = useMemo<MatrixEventGroupSection[]>(() => {
    let result = sections

    // Filter by group
    if (selectedGroup !== "ALL") {
      result = result.filter((s) => s.groupKey === selectedGroup)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result
        .map((s) => ({
          ...s,
          events: s.events.filter(
            (e) =>
              e.label.toLowerCase().includes(q) ||
              e.description.toLowerCase().includes(q) ||
              e.eventKey.toLowerCase().includes(q)
          ),
        }))
        .filter((s) => s.events.length > 0)
    }

    return result
  }, [sections, selectedGroup, searchQuery])

  // Available groups for filter dropdown
  const availableGroups = useMemo(
    () => [...new Set(sections.map((s) => s.groupKey))],
    [sections]
  )

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-start gap-3 p-5 rounded-2xl border border-destructive/30 bg-destructive/5">
          <AlertTriangle size={20} className="text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-body font-semibold text-text">Không tải được ma trận thông báo</p>
            <p className="text-caption text-text-muted mt-1">{error}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <SkeletonBlock lines={3} label="Đang tải ma trận thông báo..." />
        <SkeletonBlock lines={8} label="Đang tải danh sách sự kiện..." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <p role="note" className="rounded-xl border border-border bg-surface-alt px-4 py-2.5 text-body-sm text-text-muted">
        Đang tự gửi theo ma trận này: Đơn hàng mới, Đơn bị huỷ, Giao việc chế tác. Các sự kiện khác sẽ được nối dần; thông báo bộ sưu tập riêng và điều phối vẫn theo cài đặt riêng của từng chức năng.
      </p>
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-border bg-surface shadow-xs">
        {/* Giải thích trong "?" (OPERATING_PRINCIPLES §6.1) */}
        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              <BellRing size={20} className="text-primary" aria-hidden="true" />
              {title}
            </span>
          }
          tip={description}
        />

        {/* Stats Pill */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-alt border border-border">
            <Sparkles size={12} className="text-primary" />
            <span className="text-caption font-bold text-text">
              {totalEvents} sự kiện
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-alt border border-border">
            <Shield size={12} className="text-warning" />
            <span className="text-caption font-bold text-text">
              {hardLockCount} khóa cứng
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-caption font-bold text-primary">
              {TIER_LABELS[viewerTier]}
            </span>
          </div>
        </div>
      </div>

      {/* ── GUIDANCE CARD ── */}
      <FeatureGuidanceCard
        badgeLabel="HƯỚNG DẪN QUẢN LÝ THÔNG BÁO"
        badgeIcon={BellRing}
        title="Ma trận quản lý thông báo"
        description="Thiết lập sự kiện nào được gửi qua kênh nào. Tầng dưới kế thừa cài đặt tầng trên, nhưng có thể ghi đè (Bottom-up Override). Khóa cứng (🔒) ngăn tầng dưới thay đổi."
        tips={[
          "Bật/tắt toggle để kích hoạt hoặc vô hiệu hóa thông báo cho từng kênh.",
          `${canManageHardLocks ? "Bấm biểu tượng ổ khóa để khóa cứng — tầng dưới không thể ghi đè." : "Biểu tượng 🔒 vàng nghĩa là tầng trên đã khóa cứng, bạn không thể thay đổi."}`,
          "Tìm kiếm theo tên sự kiện hoặc lọc theo nhóm để nhanh chóng tìm đúng cài đặt.",
        ]}
      />

      {beforeMatrix}

      {/* ── FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sự kiện..."
            className="pl-9 pr-3"
          />
        </div>

        {/* Group Filter */}
        <div className="relative">
          <NativeSelect
            aria-label="Lọc theo nhóm thông báo"
            value={selectedGroup}
            onChange={(e) =>
              setSelectedGroup(e.target.value as NotificationEventGroup | "ALL")
            }
            className="w-auto"
          >
            <option value="ALL">Tất cả nhóm</option>
            {availableGroups.map((g) => (
              <option key={g} value={g}>
                {EVENT_GROUP_LABELS[g] ?? g}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Hard Lock Legend */}
        {canManageHardLocks && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-warning-bg border border-warning-border">
            <Lock size={12} className="text-warning" />
            <span className="text-caption text-warning-text">
              Bạn có quyền khóa cứng
            </span>
          </div>
        )}
      </div>

      {/* ── MATRIX TABLES ── */}
      {filteredSections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-border bg-surface">
          <BellRing size={40} className="text-text-muted mb-3" />
          <p className="text-body font-semibold text-text">
            Không tìm thấy sự kiện nào
          </p>
          <p className="text-caption text-text-muted mt-1">
            {searchQuery
              ? "Thử thay đổi từ khóa tìm kiếm."
              : "Chưa có sự kiện nào được hiển thị ở tầng này."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredSections.map((section) => (
            <NotificationMatrixGroupTable
              key={section.groupKey}
              section={section}
              activeChannels={activeChannels}
              canManageHardLocks={canManageHardLocks}
              onToggleCell={onToggleCell}
              onToggleHardLock={onToggleHardLock}
              onRemoveHardLock={onRemoveHardLock}
            />
          ))}
        </div>
      )}
    </div>
  )
}
