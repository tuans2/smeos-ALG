"use client"

import { Button } from "@/components/ui/button"
import React, { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Search } from "@/components/ui/icon-set/search"
import { Input } from "@/components/ui/input"
import {
  countByStatus,
  STATUS_DISPLAY,
  type ToolStatus,
} from "@/modules/toolkit/domain/toolkit-catalog"
import {
  deferredToolIds,
  getVisibleBusinessModules,
  type BusinessModule,
  type ModuleTool,
} from "@/modules/toolkit/domain/business-modules"
import {
  getStoreOperationsSection,
  type StoreOperationsSection,
} from "@/modules/toolkit/domain/store-operations"
import { DashboardLayout } from "@/components/layout/page-layout"
import { isDevEnvironment } from "@/lib/dev-environment"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { ModuleGrid } from "./toolkit-module-grid"
import { ModuleDetail } from "./toolkit-module-detail"
import { StoreOperationsPanel } from "./store-operations-panel"

const useIsDev = isDevEnvironment

type StatusFilter = "ALL" | ToolStatus

const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "DONE", label: "✅ Hoàn thiện" },
  { id: "IN_PROGRESS", label: "🔨 Đang làm" },
  { id: "FOUNDATION", label: "🏗️ Nền tảng sẵn" },
  { id: "PLANNED", label: "📋 Sẽ làm" },
]

function ToolkitStats({ isDev }: { isDev: boolean }) {
  if (!isDev) return null
  // Không đếm công cụ PHÁT_TRIỂN_SAU (PO 08/11/2026) — số liệu khớp những gì người dùng thấy
  const counts = countByStatus(deferredToolIds())

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {(Object.entries(counts) as [ToolStatus, number][]).map(([status, count]) => {
        const info = STATUS_DISPLAY[status]
        return (
          <div
            key={status}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface"
          >
            <span className="text-display">{info.emoji}</span>
            <div>
              <div className="text-title font-extrabold text-text">{count}</div>
              <div className="text-caption text-text-muted">{info.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function filterModule(
  module: BusinessModule,
  query: string,
  status: StatusFilter,
): BusinessModule | null {
  const q = query.trim().toLowerCase()

  const matchTool = (t: ModuleTool) => {
    const matchStatus = status === "ALL" || t.status === status
    const matchQuery = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    return matchStatus && matchQuery
  }

  const matchAsset = (a: BusinessModule["assets"][number]) => {
    if (status !== "ALL" && status !== "DONE") return false
    return !q || a.name.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q)
  }

  const filteredTools = module.tools.filter(matchTool)
  const filteredAssets = module.assets.filter(matchAsset)

  if (filteredTools.length === 0 && filteredAssets.length === 0) return null

  return {
    ...module,
    tools: filteredTools,
    assets: filteredAssets,
  }
}

export function ToolkitHome() {
  const isDev = useIsDev()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL")
  // `?muc=` mở thẳng một nhóm (hành trình Tạo nội dung giữ sản phẩm đang làm trên URL, tải lại vẫn đúng chỗ)
  const params = useSearchParams()
  const [selectedKey, setSelectedKey] = useState<string | null>(() => params.get("muc"))

  const modules = useMemo(() => getVisibleBusinessModules(isDev), [isDev])
  const storeOperations = useMemo(() => getStoreOperationsSection(isDev), [isDev])

  const filteredModules = useMemo(() => {
    if (!searchQuery && selectedStatus === "ALL") return modules
    return modules
      .map((m) => filterModule(m, searchQuery, selectedStatus))
      .filter((m): m is BusinessModule => m !== null)
  }, [modules, searchQuery, selectedStatus])

  const currentModule = useMemo(() => {
    if (!selectedKey || selectedKey === "store_operations") return null
    return modules.find((m) => m.key === selectedKey) ?? null
  }, [modules, selectedKey])

  const isFiltering = searchQuery.trim().length > 0 || selectedStatus !== "ALL"

  return (
    <DashboardLayout
      header={
        <PageHeader
          title="Trung tâm Tiếp thị & Bán hàng"
          tip="Chuẩn bị các loại ấn phẩm, trang bán hàng và công cụ kinh doanh theo 6 mục tiêu phát triển."
          description="Chọn mục tiêu tăng trưởng để xem các ấn phẩm và công cụ chuyên trách"
        />
      }
      kpis={<ToolkitStats isDev={isDev} />}
    >
      <div className="space-y-6">
        {/* Tìm kiếm và bộ lọc */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ấn phẩm hoặc công cụ..."
              className="w-full pl-10 pr-4"
            />
          </div>

          {isDev && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {FILTER_OPTIONS.map((opt) => (
                <Button variant="ghost"
                  type="button"
                  key={opt.id}
                  onClick={() => setSelectedStatus(opt.id)}
                  className={`h-auto gap-0 px-3 py-1.5 rounded-lg text-caption font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedStatus === opt.id
                      ? "bg-primary text-primary-fg shadow-xs hover:bg-primary"
                      : "bg-surface-alt text-text-muted hover:text-text hover:bg-surface border border-border"
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Hiển thị chi tiết hoặc lưới */}
        {selectedKey === "store_operations" ? (
          <StoreOperationsPanel
            section={storeOperations}
            isDev={isDev}
            onBack={() => setSelectedKey(null)}
          />
        ) : currentModule ? (
          <ModuleDetail
            module={currentModule}
            isDev={isDev}
            onBack={() => setSelectedKey(null)}
          />
        ) : isFiltering ? (
          <div className="space-y-8">
            {filteredModules.length === 0 ? (
              <EmptyState
                kind="filtered"
                title="Không tìm thấy ấn phẩm hoặc công cụ"
                reason="Thử thay đổi từ khoá tìm kiếm hoặc đặt lại bộ lọc trạng thái."
                action={{
                  label: "Xoá bộ lọc",
                  onClick: () => {
                    setSearchQuery("")
                    setSelectedStatus("ALL")
                  },
                }}
              />
            ) : (
              filteredModules.map((m) => (
                <ModuleDetail key={m.key} module={m} isDev={isDev} />
              ))
            )}
          </div>
        ) : (
          <ModuleGrid
            modules={modules}
            storeOperations={storeOperations}
            isDev={isDev}
            onOpen={(key) => setSelectedKey(key)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
