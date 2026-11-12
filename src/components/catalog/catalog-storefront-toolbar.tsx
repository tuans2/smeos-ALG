"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React from "react"
import { Search, LayoutGrid, BookOpen, List } from "@/components/ui/icons"
import type { StyleDefinition } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

interface CatalogStorefrontToolbarProps {
  searchQuery: string
  onSearchChange: (v: string) => void
  catalogStyle: "grid" | "lookbook" | "compact"
  onStyleChange: (v: "grid" | "lookbook" | "compact") => void
  selectedOccasion: string
  onOccasionChange: (v: string) => void
  allOccasions: string[]
  totalCount: number
  hasCampaign: boolean
  style: StyleDefinition
}

export function CatalogStorefrontToolbar({
  searchQuery,
  onSearchChange,
  catalogStyle,
  onStyleChange,
  selectedOccasion,
  onOccasionChange,
  allOccasions,
  totalCount,
  hasCampaign,
  style,
}: CatalogStorefrontToolbarProps) {
  const activeStyle = { backgroundColor: style.tokens.ctaBg, color: style.tokens.ctaText }
  const inactiveStyle = { backgroundColor: "transparent", color: style.tokens.textSecondary }

  return (
    <div
      role="search" aria-label="Tìm và lọc sản phẩm"
      className="sticky top-[57px] z-30 py-2.5 backdrop-blur-md transition-colors"
      style={{ backgroundColor: `${style.tokens.background}F2` }}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: style.tokens.textSecondary }}
          />
          <Input
            type="text"
            placeholder="Tìm theo tên, mã sản phẩm…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              backgroundColor: style.tokens.surface,
              borderColor: style.tokens.border,
              color: style.tokens.textPrimary,
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-body-sm placeholder:opacity-50 focus:outline-none focus:ring-2 shadow-xs transition-colors"
          />
        </div>

        {/* Layout Switcher (hidden when campaign mode) */}
        {!hasCampaign && (
          <div
            className="flex items-center p-1 rounded-2xl border shrink-0 self-start sm:self-auto"
            style={{ backgroundColor: style.tokens.surface, borderColor: style.tokens.border }}
          >
            {(["grid", "lookbook", "compact"] as const).map((mode) => (
              <Button variant="ghost"
                key={mode}
                type="button"
                onClick={() => onStyleChange(mode)}
                title={mode === "grid" ? "Lưới tiêu chuẩn" : mode === "lookbook" ? "Tạp chí ảnh" : "Danh sách đặt nhanh"}
                style={catalogStyle === mode ? activeStyle : inactiveStyle}
                className="h-auto text-[length:inherit] font-[inherit] gap-0 p-1.5 rounded-xl transition-colors"
              >
                {mode === "grid" ? <LayoutGrid size={16} /> : mode === "lookbook" ? <BookOpen size={16} /> : <List size={16} />}
              </Button>
            ))}
          </div>
        )}

        {/* Occasion Filter */}
        {allOccasions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Button variant="outline" type="submit"
              onClick={() => onOccasionChange("all")}
              style={selectedOccasion === "all" ? activeStyle : { backgroundColor: style.tokens.surface, color: style.tokens.textSecondary, borderColor: style.tokens.border }}
              className="h-auto gap-0 px-3 py-1.5 rounded-xl text-caption font-bold whitespace-nowrap border transition-colors"
            >
              Tất cả ({totalCount})
            </Button>
            {allOccasions.map((occ) => (
              <Button variant="outline" type="submit"
                key={occ}
                onClick={() => onOccasionChange(occ)}
                style={selectedOccasion === occ ? activeStyle : { backgroundColor: style.tokens.surface, color: style.tokens.textSecondary, borderColor: style.tokens.border }}
                className="h-auto gap-0 px-3 py-1.5 rounded-xl text-caption font-bold whitespace-nowrap border transition-colors"
              >
                {occ}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
