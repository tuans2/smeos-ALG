/**
 * GOVERNANCE MATRIX TABLE
 * Bảng hiển thị ma trận phân tầng theo nhóm chuyên đề:
 * - Hỗ trợ tìm kiếm, lọc theo nhóm
 * - Hiển thị trạng thái phân cấp 4 tầng
 * - Quản trị khóa cứng và tùy biến cục bộ
 */
"use client"

import { useState, useMemo } from "react"
import { Search } from "@/components/ui/icon-set/search"
import { Lock } from "@/components/ui/icon-set/lock"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import type { GovernanceMatrixState, GovernanceViewerTier } from "./governance-matrix-types"
import { GovernanceMatrixCell } from "./governance-matrix-cell"

interface GovernanceMatrixTableProps {
  state: GovernanceMatrixState
  canManageHardLocks?: boolean | undefined
  onToggleItem: (key: string, enabled: boolean) => Promise<void>
  onResetItem?: ((key: string) => Promise<void>) | undefined
  onToggleLock?: ((key: string, locked: boolean) => Promise<void>) | undefined
  onRefresh?: (() => void) | undefined
}

export function GovernanceMatrixTable({
  state,
  canManageHardLocks = false,
  onToggleItem,
  onResetItem,
  onToggleLock,
  onRefresh,
}: GovernanceMatrixTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL")

  const filteredGroups = useMemo(() => {
    let result = state.groups

    if (selectedGroup !== "ALL") {
      result = result.filter((g) => g.groupKey === selectedGroup)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.description?.toLowerCase().includes(q) ||
              i.key.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.items.length > 0)
    }

    return result
  }, [state.groups, selectedGroup, searchQuery])

  if (state.error) {
    return (
      <div className="flex flex-col gap-4 p-6 rounded-2xl border border-border-danger/30 bg-danger-bg">
        <div className="flex items-center gap-3 text-danger-text">
          <AlertTriangle size={20} />
          <span className="font-semibold text-body">Lỗi tải cấu hình ma trận quản trị</span>
        </div>
        <p className="text-body-sm text-text-muted">{state.error}</p>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="self-start"
          >
            Thử lại
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Ô tìm kiếm */}
          <div className="relative min-w-0 flex-1 lg:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Tìm kiếm quy tắc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4"
            />
          </div>

          {/* Lọc theo nhóm */}
          <div className="w-40 shrink-0 sm:w-56">
            <NativeSelect
              aria-label="Lọc theo nhóm"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="ALL">Tất cả nhóm</option>
              {state.groups.map((g) => (
                <option key={g.groupKey} value={g.groupKey}>
                  {g.groupTitle}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="flex flex-wrap items-center gap-3 text-caption text-text-muted">
          <span>Tổng số: {state.totalItems}</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-danger">
            <Lock size={12} /> {state.lockedCount} Đã khóa cứng
          </span>
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0 text-text-muted hover:text-text"
              title="Làm mới"
            >
              <RefreshCw size={14} className={state.loading ? "animate-spin motion-reduce:animate-none" : ""} />
            </Button>
          )}
        </div>
      </div>

      {/* Danh sách Groups & Items */}
      <div className="flex flex-col gap-4">
        {filteredGroups.map((group) => (
          <div
            key={group.groupKey}
            className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm"
          >
            {/* Tiêu đề nhóm */}
            <div className="px-5 py-3.5 bg-surface-alt border-b border-border flex items-center justify-between">
              <span className="font-semibold text-body text-text">{group.groupTitle}</span>
              <span className="text-caption text-text-muted">{group.items.length} quy tắc</span>
            </div>

            {/* Danh sách các dòng quy tắc */}
            <div className="divide-y divide-border">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-surface-alt/40 transition-colors"
                >
                  <div className="flex flex-col gap-0.5 flex-1 pr-4">
                    <span className="font-medium text-body-sm text-text">{item.title}</span>
                    {item.description && (
                      <span className="text-caption text-text-muted">{item.description}</span>
                    )}
                  </div>

                  <GovernanceMatrixCell
                    item={item}
                    viewerTier={state.viewerTier}
                    canManageHardLocks={canManageHardLocks}
                    onToggle={(enabled) => onToggleItem(item.key, enabled)}
                    onResetOverride={
                      onResetItem ? () => onResetItem(item.key) : undefined
                    }
                    onToggleHardLock={
                      onToggleLock ? (locked) => onToggleLock(item.key, locked) : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="text-center py-12 text-text-muted text-body-sm">
            Không tìm thấy quy tắc nào khớp với bộ lọc.
          </div>
        )}
      </div>
    </div>
  )
}
