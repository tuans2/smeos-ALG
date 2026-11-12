"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "@/components/ui/icon-set/plus"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { FileSpreadsheet } from "@/components/ui/icon-set/file-spreadsheet"
import { Download } from "@/components/ui/icon-set/download"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import {
  TrashConfirmModal,
  type TrashConfirmTarget,
} from "@/components/storage/trash-confirm-modal"
import { readApiError } from "@/components/greeting-card/api-error"
import { useProductList } from "@/components/products/use-product-list"
import type { ProductListPage } from "@/components/products/product-list-page"
import { ProposalQueueBar } from "@/components/products/proposal-queue-bar"
import { ProductCard, type ProductItem } from "@/components/products/product-card"
import { ProductTableView } from "@/components/products/product-table-view"
import { ProductSearchFilterBar } from "@/components/products/product-search-filter-bar"
import { PriceModeFilterBar } from "@/components/products/price-mode-filter"
import { matchPriceMode, type PriceModeFilter } from "@/components/products/product-price-span"
import {
  DEFAULT_FILTER_STATE,
  filterAndSortProducts,
  type ProductFilterState,
} from "@/components/products/product-filter-types"
import { ProductBulkStatusBar } from "@/components/products/product-bulk-status-bar"
import { AiProductEnrichmentModal } from "@/components/products/ai-product-enrichment-modal"
import { OneImageKitDialog } from "@/components/products/one-image-kit-dialog"
import { PageHeader } from "@/components/ui/page-header"



/** Kho sản phẩm (phía client). Trang đầu danh sách do máy chủ tải sẵn (`page.tsx`). */
export function SanPhamClient({ initialPage }: { initialPage: ProductListPage<ProductItem> | null }) {
  const router = useRouter()
  const session = useSession()
  const { t, ti, industry } = useI18n()
  const [filters, setFilters] = useState<ProductFilterState>(DEFAULT_FILTER_STATE)
  const [priceMode, setPriceMode] = useState<PriceModeFilter>("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [trashTarget, setTrashTarget] = useState<TrashConfirmTarget | null>(null)
  const [kitOpen, setKitOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [onlyProposals, setOnlyProposals] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const toggleSelect = (ids: string[], on: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) if (on) next.add(id); else next.delete(id)
      return next
    })
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- `?duyet=1` từ Hộp việc → mở thẳng hàng chờ duyệt; đọc URL một lần sau khi mount
    if (new URLSearchParams(window.location.search).get("duyet") === "1") setOnlyProposals(true)
  }, [])

  const isExecutive = session.can("G3") || session.can("L4")

  // Server tải dữ liệu (từ khoá debounce + danh mục nếu có)
  const {
    items: rawProducts,
    error: loi,
    nextCursor,
    loadingMore,
    reload: napLai,
    loadMore: handleLoadMore,
    removeLocal,
    total: serverTotal,
  } = useProductList<ProductItem>(
    filters.search,
    filters.category === "Tất cả" ? null : filters.category,
    onlyProposals ? "pending" : null,
    filters,
    initialPage
  )

  const handleConfirmTrash = async (target: TrashConfirmTarget) => {
    const res = await fetch("/api/v1/storage/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id, type: target.type }),
    })
    if (!res.ok) {
      throw new Error(await readApiError(res, "Không thể chuyển sản phẩm vào thùng rác"))
    }
    removeLocal(target.id)
  }

  // Tự động gộp các danh mục thực tế từ kho sản phẩm và danh mục chuẩn của ngành
  // Mã danh mục trong dữ liệu (BOX, VASE…) hiện ra bằng nhãn tiếng Việt của ngành
  const categoryLabelByKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of industry?.taxonomy?.defaultCategories ?? []) map.set(c.key.toUpperCase(), c.label)
    return map
  }, [industry])
  const categoryLabelOf = (raw: string | null) => (raw ? (categoryLabelByKey.get(raw.trim().toUpperCase()) ?? raw.trim()) : null)

  const availableCategories = useMemo(() => {
    const defaultCats = industry?.taxonomy?.defaultCategories?.map((c) => c.label) || []
    const set = new Set<string>(["Tất cả", ...defaultCats])
    if (rawProducts) {
      for (const p of rawProducts) {
        const label = p.category && p.category.trim() ? (categoryLabelByKey.get(p.category.trim().toUpperCase()) ?? p.category.trim()) : null
        if (label) set.add(label)
      }
    }
    return Array.from(set)
  }, [rawProducts, industry, categoryLabelByKey])

  // Lọc và sắp xếp theo Dịp, Giá, Từ khoá, Danh mục
  const baseFiltered = useMemo(() => (rawProducts ? filterAndSortProducts(rawProducts, filters) : []), [rawProducts, filters])
  const filteredProducts = useMemo(() => baseFiltered.filter((p) => matchPriceMode(p, priceMode)), [baseFiltered, priceMode])

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTER_STATE)
    setPriceMode("all")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header tác vụ */}
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between border-b border-border bg-surface px-4 py-3.5 gap-3">
        <PageHeader
          title={ti("sampleProduct")}
          tip={<>Kho {ti("catalogTitle").toLowerCase()}: thêm, sửa và ẩn {ti("sampleProduct").toLowerCase()} để hiện trên catalog bán hàng.</>}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => napLai()}
            aria-label={t("products.header.refresh")}
            className="h-9 w-9 rounded-xl"
          >
            <RefreshCw size={15} />
          </Button>
          {/* Xuất Excel: quyền R13 như các màn khác (PO 14/10/2026) — máy chủ kiểm lại */}
          {session.can("R13") && <a
            href={`/api/v1/products/export?${new URLSearchParams({
              ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
              ...(filters.category !== "Tất cả" ? { category: filters.category } : {}),
            }).toString()}`}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 h-9 text-body-sm font-semibold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            title="Tải danh sách sản phẩm (theo từ khoá và danh mục đang chọn) ra file CSV mở bằng Excel"
          >
            <Download size={14} className="text-text-muted" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </a>}
          {/* Chỉ Điều hành nhập Excel (H3, PO 23/10/2026) — máy chủ kiểm lại */}
          {session.can("H3") && <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/san-pham/nhap-hang-loat" as never)}
            className="flex items-center gap-1.5 h-9"
            title="Nhập sản phẩm đồng loạt từ file Excel và folder ảnh"
          >
            <FileSpreadsheet size={14} className="text-success" />
            <span className="hidden sm:inline">{t("products.header.importExcel")}</span>
          </Button>}
          {session.can("H3") && <Button type="button" variant="outline" size="sm" onClick={() => setKitOpen(true)} className="flex items-center gap-1.5 h-9"
            title="Một ảnh → thẻ sản phẩm, nội dung bán hàng, giá vốn, bài đăng và thẻ A6">
            <Sparkles size={14} className="text-primary" /><span className="hidden sm:inline">Bộ nội dung từ 1 ảnh</span>
          </Button>}
          {kitOpen && <OneImageKitDialog open onOpenChange={setKitOpen} />}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/tai-anh" as never)}
            className="flex items-center gap-1.5 h-9"
            title={`Tải ảnh ${ti("sampleProduct").toLowerCase()} → AI phân tích tự động`}
          >
            <Sparkles size={14} className="text-primary" />
            <span className="hidden sm:inline">{ti("scanButtonLabel")}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => router.push("/san-pham/tao-moi" as never)}
            className="flex items-center gap-1.5 h-9"
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>{ti("createButtonLabel")}</span>
          </Button>
        </div>
      </header>

      {/* Bộ lọc + tìm kiếm theo Dịp, Giá, Danh mục & Sắp xếp */}
      <ProductSearchFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={filteredProducts.length}
        availableCategories={availableCategories}
      />
      <PriceModeFilterBar value={priceMode} onChange={setPriceMode} products={baseFiltered} />
      {session.can("H3") && <ProposalQueueBar active={onlyProposals} onToggle={() => setOnlyProposals((v) => !v)} />}

      {/* Nội dung chính */}
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {loi && (
          <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger">
            {loi}
          </div>
        )}

        {rawProducts === null ? (
          <div className="py-4">
            <SkeletonBlock lines={5} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title={rawProducts.length === 0 ? `Chưa có ${ti("sampleProduct").toLowerCase()} nào trong kho` : `Không tìm thấy ${ti("sampleProduct").toLowerCase()} phù hợp`}
            reason={
              rawProducts.length === 0
                ? `Tải ảnh ${ti("sampleProduct").toLowerCase()} hoặc nhập file Excel để thêm vào kho.`
                : "Thử tìm kiếm với từ khoá khác, điều chỉnh khoảng giá hoặc chọn dịp khác."
            }
            action={
              rawProducts.length === 0
                ? { label: ti("scanButtonLabel"), onClick: () => router.push("/tai-anh" as never) }
                : { label: "Xóa tất cả bộ lọc", onClick: handleResetFilters }
            }
          />
        ) : viewMode === "grid" ? (
          /* Dạng lưới card có ảnh */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
            {filteredProducts.map((p, index) => (
              <ProductCard
                key={p.id}
                product={p}
                categoryLabel={categoryLabelOf(p.category)}
                priority={index < 4}
                isExecutive={isExecutive}
                onImageClick={(prod) => setSelectedProduct(prod)}
                onTrash={(prod) =>
                  setTrashTarget({
                    id: prod.id,
                    name: prod.name,
                    code: prod.code,
                    imageUrl: prod.masterImageUrl,
                    type: "PRODUCT",
                  })
                }
              />
            ))}
          </div>
        ) : (
          /* Dạng bảng quản trị */
          <>
          {session.can("L3") && (
            <ProductBulkStatusBar
              selectedIds={[...selectedIds]}
              canArchive={session.can("L4")}
              onClear={() => setSelectedIds(new Set())}
              onDone={() => { setSelectedIds(new Set()); void napLai() }}
            />
          )}
          <ProductTableView
            products={filteredProducts}
            selectedIds={session.can("L3") ? selectedIds : undefined}
            onToggleSelect={session.can("L3") ? toggleSelect : undefined}
            isExecutive={isExecutive}
            onImageClick={(prod) => setSelectedProduct(prod)}
            onTrash={(prod) =>
              setTrashTarget({
                id: prod.id,
                name: prod.name,
                code: prod.code,
                imageUrl: prod.masterImageUrl,
                type: "PRODUCT",
              })
            }
          />
          </>
        )}

        {/* Phân trang / Tải thêm sản phẩm */}
        {rawProducts !== null && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {nextCursor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
                className="flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" />
                    <span>Đang tải thêm...</span>
                  </>
                ) : (
                  `Xem thêm ${ti("sampleProduct").toLowerCase()}`
                )}
              </Button>
            )}
            {filteredProducts.length > 0 && (
              <div className="text-caption text-text-muted">
                Hiển thị {filteredProducts.length}
                {serverTotal ? ` / ${serverTotal.count}${serverTotal.truncated ? "+" : ""}` : ""} {ti("sampleProduct").toLowerCase()}
                {serverTotal ? "" : nextCursor ? " — còn nhiều hơn" : " (tất cả)"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal xác nhận xóa an toàn */}
      <TrashConfirmModal
        target={trashTarget}
        onClose={() => setTrashTarget(null)}
        onConfirm={handleConfirmTrash}
      />

      {/* Modal Bảng thông số sản phẩm & Phân tích AI */}
      {selectedProduct && (
        <AiProductEnrichmentModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          productId={selectedProduct.id}
          initialProduct={selectedProduct}
          onSuccess={() => {
            napLai()
            setSelectedProduct(null)
          }}
          onSavedAsNew={(created) => router.push(`/san-pham/${created.id}?moi=1` as never)}
        />
      )}
    </div>
  )
}
