"use client"

import { Input } from "@/components/ui/input"
import React from "react"
import { Search, Plus, Trash2, Loader2, CheckCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { useCatalogItems } from "./use-catalog-items"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { ExcludeCatalogsFilter } from "./exclude-catalogs-filter"
import { useI18n } from "@/lib/i18n"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

type CatalogItem = {
  id: string
  product: { id: string; name: string; masterImageUrl?: string | undefined; driveLink?: string | undefined }
  sort_order: number
}

interface Props {
  catalogId: string
  /** Hiển thị compact (dùng trong wizard) hay full (dùng trong manager) */
  compact?: boolean
  /** Callback sau khi thêm/xóa để wizard cập nhật itemCount */
  onItemCountChange?: (count: number) => void
  /** Chỉ xem (người không được sửa bộ sưu tập dùng chung — vd. Sale ở "Gửi nhanh") */
  readOnly?: boolean
}

export function CatalogProductPicker({ catalogId, compact = false, onItemCountChange, readOnly = false }: Props) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const { ti, industry } = useI18n()
  const activeIndustry = industry || getIndustryPlugin()
  const ci = useCatalogItems<{ items: CatalogItem[] }>(catalogId, onItemCountChange)
  const items = ci.catalog?.items ?? []
  const loadingItems = ci.loading
  const loadingProducts = ci.loadingProducts
  const showPicker = ci.pickerOpen
  const openPicker = ci.openPicker
  const setShowPicker = (open: boolean) => (open ? ci.openPicker() : ci.closePicker())
  const addingId = ci.busyId
  const removingId = ci.busyId
  const handleAdd = (productId: string) => void ci.add(productId)
  // Bộ sưu tập dùng chung cho mọi link đã gửi: xoá mẫu phải hỏi lại (PO 08/10/2026)
  const handleRemove = async (productId: string, name: string) => {
    if (await confirm({ title: `Xoá "${name}" khỏi bộ sưu tập?`, consequence: "Mẫu sẽ biến mất khỏi mọi link đã gửi khách.", confirmLabel: "Xoá mẫu", tone: "danger" })) void ci.remove(productId)
  }

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center py-8 text-text-muted gap-2">
        <Loader2 size={18} className="animate-spin motion-reduce:animate-none" />
        <span className="text-body-sm">Đang tải danh sách sản phẩm...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body-sm font-bold text-text">
            {items.length > 0
              ? `${items.length} ${ti("sampleProduct").toLowerCase()} trong bộ sưu tập`
              : `Bộ sưu tập chưa có ${ti("sampleProduct").toLowerCase()} nào`}
          </p>
          {items.length === 0 && (
            <p className="text-caption text-text-muted mt-0.5">
              Thêm ít nhất 1 mẫu để khách có thể vuốt xem
            </p>
          )}
        </div>
        {!readOnly && <Button
          type="button"
          size="sm"
          onClick={() => void openPicker()}
          className="gap-1.5 font-bold text-body-sm h-9 shadow-sm"
        >
          <Plus size={15} />
          Thêm {ti("sampleProduct").toLowerCase()}
        </Button>}
      </div>

      {/* Selected product chips */}
      {items.length > 0 && (
        <div
          className={`grid gap-2 ${
            compact
              ? "grid-cols-2 sm:grid-cols-3"
              : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
          }`}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group rounded-xl border border-border bg-surface overflow-hidden"
            >
              <div className="aspect-square bg-surface-alt flex items-center justify-center overflow-hidden">
                <FlowerImage src={item.product.masterImageUrl} driveLink={item.product.driveLink} alt={item.product.name} sizes="(max-width: 640px) 50vw, 160px" fallback="icon" className="w-full h-full" />
              </div>
              <div className="p-2">
                <p className="text-caption font-semibold text-text line-clamp-2 leading-tight">
                  {item.product.name}
                </p>
              </div>
              {!readOnly && <Button variant="ghost"
                type="button"
                onClick={() => handleRemove(item.product.id, item.product.name)}
                disabled={removingId === item.product.id}
                aria-label={`Xóa ${item.product.name}`}
                className="text-[length:inherit] h-auto font-[inherit] gap-0 absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/50 hover:bg-danger/80 text-white"
              >
                {removingId === item.product.id ? (
                  <Loader2 size={11} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <Trash2 size={13} />
                )}
              </Button>}
            </div>
          ))}
        </div>
      )}

      {/* Success notice */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-success-bg border border-success/20 text-success">
          <CheckCircle size={14} />
          <span className="text-caption font-bold">
            Bộ sưu tập sẵn sàng — {items.length} {ti("sampleProduct").toLowerCase()} đã thêm
          </span>
        </div>
      )}

      {/* Inline picker panel */}
      {ci.error && <p role="alert" className="p-2.5 rounded-xl bg-danger-bg text-danger text-body-sm">{ci.error}</p>}
      {showPicker && (
        <div className="rounded-2xl border border-border bg-surface-alt p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-body-sm font-bold text-text">Chọn từ kho sản phẩm</p>
            <Button variant="ghost" type="button" onClick={() => setShowPicker(false)} className="h-auto p-0 gap-0 text-caption text-text-muted hover:text-text font-medium underline">Đóng</Button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <Input
              type="text"
              placeholder="Tìm tên hoặc mã sản phẩm..."
              value={ci.searchQuery}
              onChange={(e) => ci.setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-bg text-body-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <ExcludeCatalogsFilter currentCatalogId={catalogId} selected={ci.excludedCatalogIds} onChange={ci.setExcludedCatalogIds} loading={ci.excludeLoading} hiddenCount={ci.excludedHiddenCount} />
          {/* Quick Search Filters (Khoảng giá, Dịp tặng, Phân loại, Chất liệu / Cấu phần, Tone màu) */}
          <div className="p-2.5 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption font-bold text-text flex items-center gap-1">
                ⚡ Lọc nhanh {ti("sampleProduct").toLowerCase()}
              </span>
              {ci.hasActiveFilters && (
                <Button variant="ghost"
                  type="button"
                  onClick={ci.resetFilters}
                  className="h-auto p-0 gap-0 text-caption text-primary hover:underline font-medium"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            {/* 1. Khoảng giá */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-caption text-text-muted shrink-0 w-16">Khoảng giá:</span>
              {ci.priceBudgets.map((b) => {
                const isSelected = ci.selectedBudgets.includes(b.id)
                return (
                  <Button variant="outline"
                    type="button"
                    key={b.id}
                    onClick={() =>
                      ci.setSelectedBudgets(
                        isSelected
                          ? ci.selectedBudgets.filter((id) => id !== b.id)
                          : [...ci.selectedBudgets, b.id]
                      )
                    }
                    className={`h-auto gap-0 px-2 py-0.5 rounded-lg text-caption font-medium transition border ${
                      isSelected
                        ? "border-primary bg-primary text-white font-bold hover:bg-primary"
                        : "border-border bg-surface text-text-muted hover:border-primary/40 hover:bg-surface"
                    }`}
                  >
                    {b.label}
                  </Button>
                )
              })}
            </div>

            {/* 2. Dịp / Mục đích */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-caption text-text-muted shrink-0 w-16">Dịp sử dụng:</span>
              {(activeIndustry.taxonomy?.occasions?.map((o) => o.label) || ["Dự tiệc", "Hằng ngày", "Quà tặng", "Khai trương"]).map((occ) => {
                const isSelected = ci.filterOccasion === occ
                return (
                  <Button variant="outline"
                    type="button"
                    key={occ}
                    onClick={() => ci.setFilterOccasion(isSelected ? "" : occ)}
                    className={`h-auto gap-0 px-2 py-0.5 rounded-lg text-caption font-medium transition border ${
                      isSelected
                        ? "border-primary bg-primary text-white font-bold hover:bg-primary"
                        : "border-border bg-surface text-text-muted hover:border-primary/40 hover:bg-surface"
                    }`}
                  >
                    {occ}
                  </Button>
                )
              })}
            </div>

            {/* 3. Phân loại sản phẩm */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-caption text-text-muted shrink-0 w-16">Phân loại:</span>
              {(activeIndustry.taxonomy?.defaultCategories?.map((c) => c.label) || ["Tiêu chuẩn", "Đặc biệt"]).map((cat) => {
                const isSelected = ci.filterCategory === cat
                return (
                  <Button variant="outline"
                    type="button"
                    key={cat}
                    onClick={() => ci.setFilterCategory(isSelected ? "" : cat)}
                    className={`h-auto gap-0 px-2 py-0.5 rounded-lg text-caption font-medium transition border ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold hover:bg-primary/10"
                        : "border-border bg-surface text-text-muted hover:border-primary/40 hover:bg-surface"
                    }`}
                  >
                    {cat}
                  </Button>
                )
              })}
            </div>

            {/* 4. Cấu phần / Tiện ích / Chất liệu & Tone màu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-caption text-text-muted shrink-0 w-16">
                  {activeIndustry.identity.key === "FASHION"
                    ? "Chất liệu:"
                    : activeIndustry.identity.key === "HOMESTAY"
                    ? "Tiện ích:"
                    : "Cấu phần:"}
                </span>
                {(
                  activeIndustry.identity.key === "FASHION"
                    ? ["Lụa", "Dạ Tweed", "Cotton", "Lanh / Đũi"]
                    : activeIndustry.identity.key === "HOMESTAY"
                    ? (activeIndustry.terminology?.defaultComponentRoles?.map((r) => r.label) || ["Tiện nghi phòng", "Chăn ga", "Vệ sinh", "Chào mừng"])
                    : activeIndustry.identity.key === "FLORAL"
                    ? ["Hoa hồng", "Lan hồ điệp", "Hướng dương", "Baby"]
                    : (activeIndustry.terminology?.defaultComponentRoles?.map((r) => r.label) || ["Chính", "Phụ", "Kèm theo"])
                ).map((fl) => {
                  const isSelected = ci.filterFlowerType === fl
                  return (
                    <Button variant="outline"
                      type="button"
                      key={fl}
                      onClick={() => ci.setFilterFlowerType(isSelected ? "" : fl)}
                      className={`h-auto gap-0 px-2 py-0.5 rounded-lg text-caption font-medium transition border ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold hover:bg-primary/10"
                          : "border-border bg-surface text-text-muted hover:border-primary/40 hover:bg-surface"
                      }`}
                    >
                      {fl}
                    </Button>
                  )
                })}
              </div>

              {/* Chỉ hiện tone màu cho các ngành có định hướng màu sắc rõ nét như HOA hoặc THỜI TRANG */}
              {(activeIndustry.identity.key === "FLORAL" || activeIndustry.identity.key === "FASHION" || activeIndustry.identity.key === "CRAFT_GIFT") ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-caption text-text-muted shrink-0 w-16">Tone màu:</span>
                  {["Pastel", "Đỏ", "Vàng", "Hồng", "Trắng"].map((col) => {
                    const isSelected = ci.filterColorTone === col
                    return (
                      <Button variant="outline"
                        type="button"
                        key={col}
                        onClick={() => ci.setFilterColorTone(isSelected ? "" : col)}
                        className={`h-auto gap-0 px-2 py-0.5 rounded-lg text-caption font-medium transition border ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-bold hover:bg-primary/10"
                            : "border-border bg-surface text-text-muted hover:border-primary/40 hover:bg-surface"
                        }`}
                      >
                        {col}
                      </Button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {/* Product list */}
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8 text-text-muted gap-2">
                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
                <span className="text-body-sm">Đang tải danh sách {ti("sampleProduct").toLowerCase()}...</span>
              </div>
            ) : ci.available.length === 0 ? (
              <p className="text-body-sm text-text-muted text-center py-8">
                {ci.searchQuery || ci.hasActiveFilters
                  ? `Không tìm thấy ${ti("sampleProduct").toLowerCase()} phù hợp tiêu chí lọc`
                  : ci.totalWarehouseCount === 0
                  ? `Kho chưa có ${ti("sampleProduct").toLowerCase()} nào. Vui lòng tạo ${ti("sampleProduct").toLowerCase()} mới trước.`
                  : `Tất cả ${ti("sampleProduct").toLowerCase()} đã được thêm vào bộ sưu tập`}
              </p>
            ) : (
              ci.available.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-bg hover:border-primary/30 transition-colors"
                >
                  <div className="w-11 h-11 rounded-lg bg-surface-alt border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    <FlowerImage src={product.masterImageUrl} driveLink={product.driveLink} alt={product.name} sizes="44px" fallback="icon" className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-bold text-text truncate">{product.name}</p>
                    <p className="text-caption text-text-muted font-mono">{product.code}</p>
                    {product.price_vnd != null ? (
                      <p className="text-caption text-primary font-semibold">
                        {product.price_vnd.toLocaleString("vi-VN")}đ
                      </p>
                    ) : (
                      <p className="text-caption text-text-muted italic">Liên hệ báo giá</p>
                    )}
                  </div>
                  <Button variant="ghost"
                    type="button"
                    onClick={() => void handleAdd(product.id)}
                    disabled={addingId === product.id}
                    aria-label={`Thêm ${product.name} vào bộ sưu tập`}
                    className="text-[length:inherit] h-auto font-[inherit] gap-0 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
                  >
                    {addingId === product.id ? (
                      <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Plus size={15} />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  )
}
