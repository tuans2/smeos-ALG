"use client"

import React from "react"
import { Search } from "@/components/ui/icon-set/search"
import { Plus } from "@/components/ui/icon-set/plus"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface CoordinatorToolbarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  loading: boolean
  onRefresh: () => void
  onOpenCreate: () => void
}

const TABS = [
  { id: "ALL", label: "Tất cả" },
  { id: "INTAKE", label: "Tiếp nhận" },
  { id: "PLANNING", label: "Phân công" },
  { id: "IN_PRODUCTION", label: "Chế tác" },
  { id: "QUALITY_CHECK", label: "Kiểm định" },
  { id: "DISPATCHING", label: "Giao hàng" },
  { id: "DELIVERED", label: "Nghiệm thu" },
  { id: "EXCEPTION", label: "Sự cố" },
]

export function CoordinatorToolbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  loading,
  onRefresh,
  onOpenCreate,
}: CoordinatorToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeTab === tab.id ? "primary" : "ghost"}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 py-1.5 rounded-lg text-caption font-bold whitespace-nowrap"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none" />
          <Input
            type="text"
            placeholder="Tìm mã, khách, địa chỉ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-caption"
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          aria-label="Làm mới"
          className="p-2 rounded-xl border border-border hover:bg-surface-alt text-text-muted"
        >
          <RefreshCw size={14} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onOpenCreate}
          className="font-bold gap-1 text-caption"
        >
          <Plus size={14} /> Tiếp nhận đơn
        </Button>
      </div>
    </div>
  )
}
