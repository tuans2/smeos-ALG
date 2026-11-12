"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import React from "react"
import { Archive, Filter, User } from "@/components/ui/icons"

export type CatalogStatusFilter = "active" | "archived"
export type CatalogDaysFilter = "3" | "all"

type Props = {
  statusFilter: CatalogStatusFilter
  setStatusFilter: (v: CatalogStatusFilter) => void
  daysFilter?: CatalogDaysFilter
  setDaysFilter?: (v: CatalogDaysFilter) => void
  staffFilter: string
  setStaffFilter: (v: string) => void
  /** Danh sách nhân sự — chỉ người được quản lý catalog của người khác mới thấy bộ lọc này. */
  staffList: Array<{ userId: string; name: string }>
  showStaffFilter: boolean
}

/** Thanh lọc danh sách bộ sưu tập: đang hoạt động / đã ẩn, nhân sự tạo. */
export function CatalogListFilters({
  statusFilter, setStatusFilter, staffFilter, setStaffFilter, staffList, showStaffFilter,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-alt/40 p-3.5 rounded-xl border border-border">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm font-semibold text-text flex items-center gap-1.5">
          <Filter size={15} className="text-primary" />
          <span>Xem:</span>
        </span>
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          <Button variant="ghost"
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`h-auto gap-0 px-3 py-1 text-caption font-bold rounded-md transition-colors ${
              statusFilter === "active" ? "bg-primary text-white shadow-xs hover:bg-primary" : "text-text-muted hover:text-text"
            }`}
          >
            Đang hoạt động
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => setStatusFilter("archived")}
            className={`h-auto px-3 py-1 text-caption font-bold rounded-md transition-colors flex items-center gap-1 ${
              statusFilter === "archived" ? "bg-danger-bg text-danger shadow-xs hover:bg-danger-bg" : "text-text-muted hover:text-text"
            }`}
          >
            <Archive size={12} />
            <span>Đã ẩn</span>
          </Button>
        </div>
      </div>

      {/* Lọc theo từng nhân sự dành cho Điều hành */}
      {showStaffFilter && staffList.length > 0 && (
        <div className="flex items-center gap-2 text-body-sm text-text-muted ml-auto">
          <User size={14} className="text-text-muted" />
          <span>Nhân sự:</span>
          <NativeSelect
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-2.5 text-body-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả nhân sự</option>
            {staffList.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
    </div>
  )
}
