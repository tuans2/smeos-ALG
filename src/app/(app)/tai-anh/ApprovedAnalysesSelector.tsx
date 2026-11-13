"use client"

import { useEffect, useState, useMemo } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Search } from "@/components/ui/icon-set/search"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Layers } from "@/components/ui/icon-set/layers"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/i18n/formatters"

export interface ApprovedAnalysisItem {
  id: string
  product_id: string | null
  asset_id: string
  image_url?: string | null
  job_id: string
  provider: string
  model: string
  raw: Record<string, unknown>
  edited: Record<string, unknown> | null
  approval_state: "APPROVED"
  approved_at: string | null
  approved_by: string | null
  created_at: string
  product?: {
    id: string
    name: string
    code: string
    category: string | null
  } | null
}

interface ApprovedAnalysesSelectorProps {
  onSelect: (analysis: ApprovedAnalysisItem) => void
  disabled?: boolean
  selectedAnalysisId?: string | null
}

export function ApprovedAnalysesSelector({
  onSelect,
  disabled = false,
  selectedAnalysisId,
}: ApprovedAnalysesSelectorProps) {
  const [items, setItems] = useState<ApprovedAnalysisItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchApprovedAnalyses = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/vision/analyses?approval_state=APPROVED&limit=50", {
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        let msg = `Lỗi tải danh sách (${res.status})`
        try {
          const body = (await res.json()) as { error?: { message?: string } }
          msg = body.error?.message ?? msg
        } catch { /* ignore */ }
        throw new Error(msg)
      }
      const json = (await res.json()) as { data?: ApprovedAnalysisItem[] }
      setItems(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải phân tích đã duyệt")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    fetchApprovedAnalyses()
  }, [])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase().trim()
    return items.filter((item) => {
      const pName = item.product?.name?.toLowerCase() ?? ""
      const pCode = item.product?.code?.toLowerCase() ?? ""
      const effective = (item.edited ?? item.raw) as Record<string, unknown>
      const identity = (effective.identity as Record<string, unknown> | undefined) ?? {}
      const bom = (effective.bom as Record<string, unknown> | undefined) ?? {}
      const flowers = Array.isArray(bom.flowers)
        ? bom.flowers.map((f: { name?: string }) => f.name?.toLowerCase() ?? "").join(" ")
        : ""
      const style = typeof identity.phong_cach === "string" ? identity.phong_cach.toLowerCase() : ""
      return pName.includes(q) || pCode.includes(q) || flowers.includes(q) || style.includes(q)
    })
  }, [items, searchQuery])

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã sản phẩm, thành phần, phong cách..."
            className="pl-9"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchApprovedAnalyses}
          disabled={loading}
          className="flex items-center gap-1.5 self-end sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
          Làm mới ({items.length})
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-body-sm text-danger flex items-start gap-2.5">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Loading state */}
      {loading && items.length === 0 && (
        <div className="py-12 text-center text-text-muted text-body-sm flex flex-col items-center gap-2">
          <RefreshCw size={24} className="animate-spin motion-reduce:animate-none text-primary" />
          <span>Đang tải danh sách phân tích đã duyệt từ kho...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && !error && (
        <Card className="p-8 text-center bg-surface-alt border-dashed">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-sm mb-3">
            <Layers size={24} className="text-text-muted" />
          </div>
          <div className="text-title-sm font-bold">Chưa có phân tích nào được duyệt</div>
          <div className="mt-1.5 text-body-sm text-text-muted max-w-md mx-auto">
            Vào tab <span className="font-semibold text-primary">Nhận diện ảnh</span>, phân tích một ảnh sản phẩm và duyệt kết quả —
            ảnh đã duyệt sẽ hiện ở đây để tạo kịch bản tư vấn.
          </div>
        </Card>
      )}

      {/* Grid of approved items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const effective = (item.edited ?? item.raw) as Record<string, unknown>
          const bom = (effective.bom as Record<string, unknown> | undefined) ?? {}
          const identity = (effective.identity as Record<string, unknown> | undefined) ?? {}
          const flowers = Array.isArray(bom.flowers) ? (bom.flowers as Array<{ name?: string; count?: number; quantity?: number; dvt_dem?: string }>) : []
          const flowerSummary = flowers
            .slice(0, 3)
            .map((f) => {
              const qty = f.quantity ?? f.count
              return `${f.name ?? "Nguyên liệu"}${qty ? ` (${qty} ${f.dvt_dem?.toLowerCase() ?? "đơn vị"})` : ""}`
            })
            .join(", ")
          const moreFlowersCount = flowers.length > 3 ? flowers.length - 3 : 0
          const style = (identity.phong_cach as string) ?? (identity.category as string) ?? "Mẫu thiết kế"
          const totalStems = typeof effective.flower_count === "number" ? effective.flower_count : typeof effective.total_stems === "number" ? effective.total_stems : null
          const isSelected = selectedAnalysisId === item.id

          return (
            <Card
              key={item.id}
              className={`p-4 flex flex-col justify-between transition-all ${
                isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-surface"
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image_url ? (
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface-alt border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image_url} alt={item.product?.name ?? "Ảnh"} className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <div className="text-body font-bold truncate text-text">
                        {item.product?.name ?? `Bản phân tích #${item.id.slice(0, 8)}`}
                      </div>
                      <div className="text-caption text-text-muted flex items-center gap-1.5 mt-0.5">
                        {item.product?.code && (
                          <span className="font-mono bg-surface-alt px-1.5 py-0.5 rounded text-caption">
                            {item.product.code}
                          </span>
                        )}
                        <span>•</span>
                        <Calendar size={11} />
                        <span>
                          {item.approved_at ? formatDate(item.approved_at) : "Đã duyệt"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge tone="success" className="flex items-center gap-1 flex-shrink-0 text-caption">
                    <CheckCircle2 size={11} />
                    Đã duyệt
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-meta bg-surface-alt/60 p-2.5 rounded-lg">
                  <div className="flex items-start gap-1.5">
                    <span className="text-text-muted min-w-[70px]">Thành phần:</span>
                    <span className="font-medium text-text line-clamp-2">
                      {flowerSummary || "Chưa có chi tiết thành phần"}
                      {moreFlowersCount > 0 && ` +${moreFlowersCount} loại khác`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted min-w-[70px]">Phong cách:</span>
                    <span className="font-medium text-text">{style}</span>
                    {totalStems !== null && (
                      <span className="text-text-muted text-caption ml-auto">({totalStems} cành)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-caption text-text-muted">Dữ liệu bán hàng</span>
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(item)
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  Sinh dữ liệu bán hàng
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {!loading && filteredItems.length === 0 && items.length > 0 && (
        <div className="py-8 text-center text-text-muted text-body-sm">
          Không tìm thấy phân tích nào khớp với từ khoá &quot;{searchQuery}&quot;.
        </div>
      )}
    </div>
  )
}
