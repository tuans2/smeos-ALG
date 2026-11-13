"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "@/components/ui/icon-set/search"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { Input } from "@/components/ui/input"
import type { AvailabilityBoardProduct } from "@/modules/availability/use-cases/get-availability-board"
import { stockBadge, type StockBadgeIcon } from "@/components/availability/stock-status-badge"

const BADGE_ICONS: Record<StockBadgeIcon, typeof CheckCircle2> = {
  "in-stock": CheckCircle2,
  "pre-order": AlertTriangle,
  "out-of-stock": XCircle,
}

export interface QuickStockBoardProps {
  products: AvailabilityBoardProduct[]
}

export function QuickStockBoard({ products }: QuickStockBoardProps) {
  const safeProducts = Array.isArray(products) ? products : []
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = safeProducts.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên sản phẩm hoặc mã..."
            className="w-full pl-9 pr-4 text-caption"
          />
        </div>
        <div className="text-caption font-medium text-text-muted">
          Tổng cộng: <span className="font-bold text-text">{filtered.length}</span> sản phẩm
        </div>
      </div>

      {/* Product List */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
        <table className="w-full border-collapse text-left text-caption">
          <thead>
            <tr className="border-b border-border bg-surface-alt font-bold text-text">
              <th className="p-3">Sản phẩm</th>
              <th className="p-3">Mã</th>
              <th className="p-3">Danh mục</th>
              <th className="p-3">Chế độ khả dụng</th>
              <th className="p-3">Trạng thái tồn kho</th>
              <th className="p-3 text-right">Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-muted">
                  Không tìm thấy sản phẩm nào phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const badge = stockBadge(p.inventoryStatus)
                const badgeColor = badge.className
                const Icon = BADGE_ICONS[badge.icon]
                const label = badge.label

                return (
                  <tr key={p.id} className="border-b border-border hover:bg-surface-alt/40 transition-colors">
                    <td className="p-3 font-semibold text-text">
                      <div>{p.name}</div>
                    </td>
                    <td className="p-3 text-text-muted font-mono">{p.code}</td>
                    <td className="p-3 text-text-muted">{p.category || "Mặc định"}</td>
                    <td className="p-3">
                      <span className="rounded-lg bg-surface-alt px-2 py-1 text-caption font-medium text-text">
                        {p.mode === "HOMESTAY_CALENDAR"
                          ? "Lịch phòng"
                          : p.mode === "DAILY_CAPACITY"
                          ? "Giới hạn đơn/ngày"
                          : "Tồn kho nhanh"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold ${badgeColor}`}>
                        <Icon size={12} />
                        <span>{label}</span>
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/san-pham/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-caption font-medium text-text hover:bg-surface-alt transition-colors"
                      >
                        <span>Thiết lập</span>
                        <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
