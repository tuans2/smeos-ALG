"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { ArrowLeft, Package, Plus, Trash2, Search, Loader2, CheckCircle, ShieldCheck } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { useSession } from "@/lib/session"
import { useCatalogItems } from "./use-catalog-items"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { CatalogHeartsPanel } from "./catalog-hearts-panel"
import { CatalogPoliciesSettings } from "./catalog-policies-settings"
import { useApi } from "@/components/greeting-card/greeting-api"
import { canEditCatalog } from "@/modules/greeting-card/domain/catalog-edit-policy"
import { useI18n } from "@/lib/i18n"

type ProductVariant = { id: string; price_vnd: number; name: string }
type CatalogProduct = {
  id: string
  product: {
    id: string
    name: string
    masterImageUrl?: string | undefined
    driveLink?: string | undefined
    variants: ProductVariant[]
  }
  sort_order: number
}
type CatalogDetail = {
  id: string
  code: string
  name: string
  type: string
  description: string | null
  filters?: Record<string, unknown> | null
  created_by?: string | null
  _count: { sessions: number }
  items: CatalogProduct[]
}

type Props = {
  catalogId: string
  catalogName: string
  onBack: () => void
}

export function CatalogDetailPanel({ catalogId, catalogName, onBack }: Props) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const { ti } = useI18n()
  const [showPolicies, setShowPolicies] = useState(false)
  // Chính sách theo bộ sưu tập ghi đè chính sách tiệm → chỉ người sửa được cấu hình tiệm (máy chủ cũng kiểm)
  const { can } = useSession()
  const canEditPolicies = can("F2")
  const me = useApi<{ user: { id: string } }>("/api/v1/auth/me")
  const [productSearch, setProductSearch] = useState("")
  const ci = useCatalogItems<CatalogDetail>(catalogId)
  const catalog = ci.catalog
  const loading = ci.loading
  // Thêm/xoá mẫu: người tạo bộ sưu tập hoặc L4 — Sale và Điều phối chỉ xem bộ sưu tập người khác tạo (PO 16/10/2026)
  const canEdit = Boolean(catalog) && canEditCatalog({ createdBy: catalog?.created_by }, { userId: me.data?.user.id, has: can })
  const isAddOpen = ci.pickerOpen
  const setIsAddOpen = (open: boolean) => (open ? ci.openPicker() : ci.closePicker())
  const openAddProduct = ci.openPicker
  const addingId = ci.busyId
  const removingId = ci.busyId
  const handleAddProduct = (productId: string) => void ci.add(productId)
  async function handleRemoveProduct(productId: string) {
    const ok = await confirm({ title: "Xoá mẫu khỏi bộ sưu tập?", consequence: "Mẫu sẽ biến mất khỏi mọi link đã gửi khách.", confirmLabel: "Xoá mẫu", tone: "danger" })
    if (!ok) return
    void ci.remove(productId)
  }
  const filteredProducts = ci.available

  if (loading && !catalog) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 size={24} className="animate-spin motion-reduce:animate-none mr-2" />
        <span className="text-body-sm">Đang tải bộ sưu tập...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {ci.error && <p role="alert" className="p-3 rounded-xl bg-danger-bg text-danger text-body-sm">{ci.error}</p>}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline"
            type="button"
            onClick={onBack}
            aria-label="Quay lại danh sách bộ sưu tập"
            className="text-[length:inherit] h-auto font-[inherit] gap-0 p-2 rounded-xl border border-border hover:bg-surface-alt transition-colors text-text-muted hover:text-text"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h2 className="text-title font-extrabold text-text">{catalogName}</h2>
            <p className="text-body-sm text-text-muted">
              {catalog?._count.sessions ?? 0} link đã gửi ·{" "}
              {catalog?.items.length ?? 0} {ti("sampleProduct").toLowerCase()} trong bộ sưu tập
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEditPolicies && (
          <Button
            type="button"
            variant={showPolicies ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowPolicies((prev) => !prev)}
            className="gap-1.5 font-bold text-body-sm h-9"
          >
            <ShieldCheck size={16} />
            <span>{showPolicies ? `Xem ${ti("sampleProduct")}` : "Chính sách & Cam kết"}</span>
          </Button>
          )}
          {canEdit && (
          <Button
            type="button"
            size="sm"
            onClick={() => void openAddProduct()}
            className="bg-primary hover:bg-primary-dark text-white font-bold gap-1.5 text-body-sm h-9 shadow-sm"
          >
            <Plus size={16} />
            <span>Thêm {ti("sampleProduct")}</span>
          </Button>
          )}
        </div>
      </div>

      {catalog && !canEdit && (
        <p role="note" className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-body-sm text-text-muted">
          Bộ sưu tập do người khác tạo — bạn xem và gửi link được, không thêm/xoá mẫu. Cần bộ sưu tập riêng? Quay lại danh sách và bấm &quot;Tạo bộ sưu tập&quot;.
        </p>
      )}

      {showPolicies && canEditPolicies && (
        <CatalogPoliciesSettings
          catalogId={catalogId}
          currentFilters={catalog?.filters ?? null}
          onSaved={() => {
            // refresh
          }}
        />
      )}

      {/* Add Product Modal */}
      {isAddOpen && (
        <Dialog open onOpenChange={(o) => { if (!o) { setIsAddOpen(false); setProductSearch("") } }} size="md"
          title={`Chọn ${ti("sampleProduct").toLowerCase()} thêm vào bộ sưu tập`}>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                type="text"
                placeholder="Tìm tên sản phẩm..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-bg text-body text-text"
              />
            </div>
            <div className="overflow-y-auto flex flex-col gap-2 flex-1 min-h-0">
              {filteredProducts.length === 0 ? (
                <p className="text-body-sm text-text-muted text-center py-8">
                  {productSearch ? "Không tìm thấy sản phẩm phù hợp" : "Tất cả sản phẩm đã được thêm vào bộ sưu tập"}
                </p>
              ) : (
              filteredProducts.map((product) => {
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-surface transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-surface-alt border border-border flex items-center justify-center shrink-0 overflow-hidden">
                        <FlowerImage src={product.masterImageUrl} driveLink={product.driveLink} alt={product.name} sizes="(max-width: 640px) 50vw, 200px" fallback="icon" className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-bold text-text truncate">{product.name}</p>
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
                        onClick={() => void handleAddProduct(product.id)}
                        disabled={addingId === product.id}
                        className="text-[length:inherit] h-auto font-[inherit] gap-0 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
                      >
                        {addingId === product.id
                          ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
                          : <Plus size={16} />}
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsAddOpen(false); setProductSearch("") }}
              className="self-end h-9"
            >
              Xong
            </Button>
          </div>
        </Dialog>
      )}

      {/* Products Grid */}
      {catalog?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
            <Package size={28} className="text-text-muted" />
          </div>
          <div className="text-center">
            <p className="text-title-sm font-bold text-text">Bộ sưu tập chưa có {ti("sampleProduct").toLowerCase()}</p>
            <p className="text-body-sm text-text-muted mt-1">
              Thêm {ti("sampleProduct").toLowerCase()} từ danh mục sản phẩm để khách có thể vuốt chọn
            </p>
          </div>
          {canEdit && <Button
            type="button"
            variant="outline"
            onClick={() => void openAddProduct()}
            className="gap-2 mt-2 font-bold"
          >
            <Plus size={16} />
            Thêm {ti("sampleProduct")} Đầu Tiên
          </Button>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {catalog?.items.map((item) => {
            const price = item.product.variants[0]?.price_vnd
            return (
              <div
                key={item.id}
                className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
              >
                <div className="aspect-square bg-surface-alt relative overflow-hidden">
                  <FlowerImage src={item.product.masterImageUrl} driveLink={item.product.driveLink} alt={item.product.name} sizes="(max-width: 640px) 50vw, 200px" fallback="icon" className="w-full h-full" />
                  <div className="absolute top-2 left-2">
                    <span className="w-6 h-6 rounded-full bg-black/50 text-white text-caption font-bold flex items-center justify-center">
                      {item.sort_order + 1}
                    </span>
                  </div>
                  {canEdit && <Button variant="ghost"
                    type="button"
                    onClick={() => void handleRemoveProduct(item.product.id)}
                    disabled={removingId === item.product.id}
                    aria-label={`Xóa ${item.product.name} khỏi bộ sưu tập`}
                    className="text-[length:inherit] h-auto font-[inherit] gap-0 absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-danger/80 text-white"
                  >
                    {removingId === item.product.id
                      ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" />
                      : <Trash2 size={12} />}
                  </Button>}
                </div>
                <div className="p-3 flex flex-col gap-1">
                  <p className="text-caption font-bold text-text line-clamp-2 leading-tight">
                    {item.product.name}
                  </p>
                  {price !== undefined && (
                    <p className="text-caption text-text-muted font-mono">
                      {price.toLocaleString("vi-VN")}đ
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add More Card */}
          {canEdit && <Button variant="ghost"
            type="button"
            onClick={() => void openAddProduct()}
            className="text-[length:inherit] h-auto p-0 font-[inherit] aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-primary"
          >
            <Plus size={24} />
            <span className="text-caption font-bold">Thêm mẫu</span>
          </Button>}
        </div>
      )}

      {catalog && catalog.items.length > 0 && <CatalogHeartsPanel catalogId={catalogId} />}

      {catalog && catalog.items.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success-bg border border-success/20 text-success">
          <CheckCircle size={16} />
          <p className="text-caption font-bold">
            Bộ sưu tập sẵn sàng — {catalog.items.length} {ti("sampleProduct").toLowerCase()}, {catalog._count.sessions} link đã gửi tới khách
          </p>
        </div>
      )}
      {confirmDialog}
    </div>
  )
}
