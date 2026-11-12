"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "@/components/ui/icon-set/search"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { List } from "@/components/ui/icon-set/list"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { ScreenCatalogSummary, ScreenItem } from "@/modules/platform/infra/screen-scanner"
import { ScreenCard } from "./screen-card"

export interface ScreenLibraryExplorerProps {
  initialCatalog: ScreenCatalogSummary
}

type TierFilter = "ALL" | "STORE" | "MOTHER" | "CHAIN" | "PUBLIC" | "AUTH"
type ArchetypeFilter = "ALL" | "A" | "B" | "C" | "D" | "E" | "F"
type StatusFilter = "ALL" | "CONTRACT_V2" | "CONTRACT_V1" | "EXEMPT"

export function ScreenLibraryExplorer({ initialCatalog }: ScreenLibraryExplorerProps) {
  const [search, setSearch] = React.useState("")
  const [selectedTier, setSelectedTier] = React.useState<TierFilter>("ALL")
  const [selectedArchetype, setSelectedArchetype] = React.useState<ArchetypeFilter>("ALL")
  const [selectedStatus, setSelectedStatus] = React.useState<StatusFilter>("ALL")
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid")
  const [copiedRoute, setCopiedRoute] = React.useState<string | null>(null)

  const handleCopyRoute = (route: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(route)
      setCopiedRoute(route)
      setTimeout(() => setCopiedRoute(null), 2000)
    }
  }

  const filteredScreens = React.useMemo(() => {
    return initialCatalog.screens.filter((screen) => {
      // Tier filter
      if (selectedTier !== "ALL" && screen.tier !== selectedTier) {
        return false
      }
      // Archetype filter
      if (selectedArchetype !== "ALL" && screen.archetype !== selectedArchetype) {
        return false
      }
      // Status filter
      if (selectedStatus !== "ALL" && screen.status !== selectedStatus) {
        return false
      }
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const matchRoute = screen.route.toLowerCase().includes(query)
        const matchTitle = screen.title.toLowerCase().includes(query)
        const matchId = screen.screenId.toLowerCase().includes(query)
        const matchModule = screen.module.toLowerCase().includes(query)
        if (!matchRoute && !matchTitle && !matchId && !matchModule) {
          return false
        }
      }
      return true
    })
  }, [initialCatalog.screens, selectedTier, selectedArchetype, selectedStatus, search])

  const tierCounts = React.useMemo(() => {
    return {
      ALL: initialCatalog.total,
      STORE: initialCatalog.byTier.STORE,
      MOTHER: initialCatalog.byTier.MOTHER,
      CHAIN: initialCatalog.byTier.CHAIN,
      PUBLIC: initialCatalog.byTier.PUBLIC,
      AUTH: initialCatalog.byTier.AUTH,
    }
  }, [initialCatalog])

  return (
    <div className="space-y-6">
      {/* Search & Main Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo URL (vd: /don-hang), tên màn hình, ID hoặc module..."
            className="pl-9 bg-surface-alt"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-caption text-text-muted hover:text-text font-bold"
            >
              Xóa
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-surface-alt p-1">
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("grid")}
              title="Dạng lưới thẻ"
              aria-label="Xem dạng lưới thẻ"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("table")}
              title="Dạng danh sách bảng"
              aria-label="Xem dạng danh sách bảng"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-body-sm font-semibold text-text-muted whitespace-nowrap px-2">
            Hiển thị <strong>{filteredScreens.length}</strong> / {initialCatalog.total}
          </span>
        </div>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        {(
          [
            { key: "ALL", label: "Tất cả màn hình" },
            { key: "STORE", label: "StoreOS (Cửa hàng)" },
            { key: "MOTHER", label: "SaaS Mother (Vận hành)" },
            { key: "CHAIN", label: "ChainOS (Chuỗi)" },
            { key: "PUBLIC", label: "Khách xem công khai" },
            { key: "AUTH", label: "Xác thực / Auth" },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant={selectedTier === tab.key ? "primary" : "outline"}
            size="xs"
            onClick={() => setSelectedTier(tab.key)}
            className="rounded-full"
          >
            <span>{tab.label}</span>
            <span
              className={`text-caption px-1.5 py-0.2 rounded-full ${
                selectedTier === tab.key ? "bg-black/20 text-white" : "bg-surface-alt text-text-muted"
              }`}
            >
              {tierCounts[tab.key]}
            </span>
          </Button>
        ))}
      </div>

      {/* Secondary Filter Chips: Archetypes & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-caption">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-text-muted font-bold mr-1">Archetype:</span>
          {(["ALL", "A", "B", "C", "D", "E", "F"] as const).map((arc) => (
            <Button
              key={arc}
              type="button"
              variant={selectedArchetype === arc ? "primary" : "outline"}
              size="xs"
              onClick={() => setSelectedArchetype(arc)}
              className="font-mono text-caption"
            >
              {arc === "ALL" ? "Tất cả" : `Archetype ${arc}`}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-text-muted font-bold mr-1">Hợp đồng:</span>
          {(["ALL", "CONTRACT_V2", "CONTRACT_V1", "EXEMPT"] as const).map((st) => (
            <Button
              key={st}
              type="button"
              variant={selectedStatus === st ? "secondary" : "outline"}
              size="xs"
              onClick={() => setSelectedStatus(st)}
              className="text-caption"
            >
              {st === "ALL" ? "Tất cả" : st === "CONTRACT_V2" ? "v2 chuẩn" : st === "CONTRACT_V1" ? "v1" : "Miễn trừ"}
            </Button>
          ))}
        </div>
      </div>

      {/* Screen List Rendering */}
      {filteredScreens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center space-y-3">
          <p className="text-body font-semibold text-text">Không tìm thấy màn hình phù hợp với bộ lọc</p>
          <p className="text-caption text-text-muted">
            Thử thay đổi từ khóa tìm kiếm hoặc chọn lại bộ lọc Tầng / Archetype.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("")
              setSelectedTier("ALL")
              setSelectedArchetype("ALL")
              setSelectedStatus("ALL")
            }}
          >
            Đặt lại tất cả bộ lọc
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScreens.map((screen) => (
            <ScreenCard
              key={screen.route}
              screen={screen}
              onCopyRoute={handleCopyRoute}
              isCopied={copiedRoute === screen.route}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt/60 text-caption text-text-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tầng / Tuyến</th>
                <th className="py-3 px-4">Tên màn hình & ID</th>
                <th className="py-3 px-4">Archetype</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredScreens.map((screen) => (
                <tr key={screen.route} className="hover:bg-surface-alt/40 transition-colors">
                  <td className="py-3 px-4 space-y-1">
                    <span className="inline-block text-caption font-semibold px-2 py-0.5 rounded-md bg-surface-alt text-text-muted">
                      {screen.tierLabel.split(" ")[0]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-caption text-text font-semibold">{screen.route}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleCopyRoute(screen.route)}
                        title="Sao chép"
                        aria-label={`Sao chép ${screen.route}`}
                      >
                        {copiedRoute === screen.route ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-text line-clamp-1">{screen.title}</p>
                    <p className="font-mono text-caption text-text-muted">{screen.screenId}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-caption font-bold px-2 py-0.5 rounded-md bg-surface-alt border border-border">
                      {screen.archetype}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge tone="neutral" className="text-caption font-mono">
                      {screen.status === "CONTRACT_V2"
                        ? "v2"
                        : screen.status === "CONTRACT_V1"
                          ? "v1"
                          : "Miễn trừ"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={screen.sampleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-caption font-semibold shadow-xs"
                    >
                      <span>Mở</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
