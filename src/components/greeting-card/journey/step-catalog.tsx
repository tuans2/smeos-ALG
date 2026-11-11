"use client"

import type { ReactNode } from "react"
import { ArrowRight, BookOpen, Check, Plus } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { Skeleton } from "@/components/ui/skeleton"
import { CatalogProductPicker } from "@/components/greeting-card/catalog/catalog-product-picker"
import { useI18n } from "@/lib/i18n"
import { useJourneyFocus } from "./journey-focus-context"
import { cn } from "@/lib/utils"
import { catalogPublicPath, type CatalogOption } from "./use-journey-catalogs"

interface StepCatalogProps {
  catalogs: CatalogOption[]
  orgSlug: string
  loading: boolean
  loadError: string | null
  selectedId: string
  itemCount: number
  onRetry: () => void
  onSelect: (catalog: CatalogOption) => void
  onCreate: () => void
  onItemCountChange: (count: number) => void
  onNext: () => void
  onQuickGenerate?: () => void
  templateSlot?: ReactNode
  readOnly?: boolean
}

export function StepCatalog(props: StepCatalogProps) {
  const { catalogs, orgSlug, loading, loadError, selectedId, itemCount } = props
  const { ti } = useI18n()
  const { activeBlock, setActiveBlock } = useJourneyFocus()

  const isBlock1Active = activeBlock === 1
  const isBlock3Active = activeBlock === 3

  return (
    <div className="flex flex-col gap-6">
      {/* Khối 1: Chọn BST & Danh sách sản phẩm */}
      <section
        aria-labelledby="step-catalog-title"
        onClick={() => setActiveBlock(1)}
        className={cn(
          "flex flex-col gap-5 rounded-2xl p-4 sm:p-5 transition-all duration-300 border cursor-pointer",
          isBlock1Active
            ? "border-primary/50 bg-surface shadow-sm ring-2 ring-primary/20 opacity-100"
            : "border-border/60 bg-transparent hover:bg-surface/60"
        )}
      >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-body-sm font-bold shadow-xs">
            1
          </span>
          <div>
            <h2 id="step-catalog-title" className="text-title font-bold text-text">
              Chọn {ti("catalogTitle").toLowerCase()}
            </h2>
            <p className="mt-1 text-body-sm text-text-muted">
              Khách sẽ lướt xem các {ti("sampleProduct").toLowerCase()} trong bộ sưu tập bạn chọn.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {props.onQuickGenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={props.onQuickGenerate}
              className="gap-1.5 font-bold border-primary/40 text-primary hover:bg-primary/10"
            >
              <Plus size={16} aria-hidden="true" />
              Tạo nhanh BST (&lt;10s)
            </Button>
          )}
          {catalogs.length > 0 && (
            <Button variant="outline" size="sm" onClick={props.onCreate} className="gap-1.5">
              <Plus size={16} aria-hidden="true" />
              Bộ sưu tập mới
            </Button>
          )}
        </div>
      </header>

      {loadError && <InlineError message={loadError} onRetry={props.onRetry} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Đang tải bộ sưu tập">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : catalogs.length === 0 && !loadError ? (
        <EmptyState
          icon={BookOpen}
          title="Chưa có bộ sưu tập nào"
          reason={`Tạo bộ sưu tập theo dịp (ưu đãi, sự kiện…) rồi thêm ${ti("sampleProduct").toLowerCase()} để gửi khách.`}
          action={{ label: "Tạo bộ sưu tập đầu tiên", onClick: props.onCreate }}
          className="rounded-2xl border border-dashed border-border py-10"
        />
      ) : (
        <div role="radiogroup" aria-label="Bộ sưu tập" className="grid max-h-80 grid-cols-1 gap-3 overflow-y-auto p-0.5 sm:grid-cols-2">
          {catalogs.map((cat) => {
            const selected = cat.id === selectedId
            return (
              <Button variant="outline"
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => props.onSelect(cat)}
                className={cn("h-auto", "font-[inherit]", 
                  "flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  selected ? "border-primary bg-selected ring-1 ring-primary" : "border-border bg-surface hover:border-primary/40",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-bold text-text">{cat.name}</span>
                  <span className="mt-0.5 block truncate font-mono text-caption text-text-muted">
                    {catalogPublicPath(orgSlug, cat)}
                  </span>
                  <span
                    className={cn(
                      "mt-2 inline-flex rounded-full px-2 py-0.5 text-caption font-semibold",
                      cat.itemCount > 0 ? "bg-success-bg text-success" : "bg-warning-bg text-warning-text",
                    )}
                  >
                    {cat.itemCount > 0
                      ? `${cat.itemCount} ${ti("sampleProduct").toLowerCase()}`
                      : `Chưa có ${ti("sampleProduct").toLowerCase()}`}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-primary bg-primary text-white" : "border-border",
                  )}
                >
                  {selected && <Check size={12} />}
                </span>
              </Button>
            )
          })}
        </div>
      )}

      {selectedId && (
        <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:p-5">
          <CatalogProductPicker catalogId={selectedId} compact onItemCountChange={props.onItemCountChange} readOnly={props.readOnly === true} />
        </div>
      )}
      </section>

      {/* Khối 2: TemplateSection (Giao diện khách xem) */}
      {selectedId && props.templateSlot}

      {/* Khối 3A: Gửi riêng cho khách */}
      {catalogs.length > 0 && (
        <footer
          onClick={() => setActiveBlock(3)}
          className={cn(
            "flex flex-col gap-3 rounded-2xl p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between border transition-all duration-300 cursor-pointer",
            isBlock3Active
              ? "border-primary/50 bg-surface shadow-sm ring-2 ring-primary/20 opacity-100"
              : "border-border/60 bg-transparent hover:bg-surface/60"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold transition-colors",
              isBlock3Active ? "bg-primary text-white" : "bg-primary/15 text-primary"
            )}>
              3
            </span>
            <div>
              <p className="text-body-sm font-bold text-text">Gửi riêng cho khách</p>
              <p className="text-caption text-text-muted">
                {itemCount > 0
                  ? "Tạo link kèm lời chào cá nhân hóa (ví dụ: Chào anh Minh, chị Lan) và theo dõi mở thẻ."
                  : `Thêm ít nhất 1 ${ti("sampleProduct").toLowerCase()} để tiếp tục.`}
              </p>
            </div>
          </div>
          <Button size="sm" disabled={!selectedId || itemCount === 0} onClick={props.onNext} className="gap-1.5 shrink-0">
            Tạo link gửi riêng
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </footer>
      )}
    </div>
  )
}
