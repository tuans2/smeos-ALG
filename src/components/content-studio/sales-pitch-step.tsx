"use client"

import { useState } from "react"
import { Tile, TilePill } from "@/components/brand-kit/tiles/tile"
import { SalesPitchCard } from "@/components/sales/sales-pitch-card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Library } from "@/components/ui/icon-set/library"
import { Package } from "@/components/ui/icon-set/package"
import { InlineError } from "@/components/ui/inline-error"
import { useTenantSalesDefaults } from "@/lib/hooks/use-tenant-sales-defaults"
import { errorText } from "@/lib/error-text"
import { formatDateTime } from "@/lib/i18n/formatters"
import { useSession } from "@/lib/session"
import { pitchToRecord, toSalesPitchData } from "@/modules/products/domain/sales-pitch-record"
import { buildSalesPitchData, type SalesPitchData } from "@/modules/products/domain/sales-pitch-template"
import { saveSalesPitch } from "./content-api"
import { LibraryPickerDialog } from "./library-picker-dialog"
import type { ContentJourney } from "./use-content-journey"

/**
 * Bước 2 — Thẻ chào sản phẩm (tư vấn bán hàng): dựng từ Thẻ sản phẩm + Bài giới thiệu đã duyệt ở Bước 1 và hồ sơ
 * cửa hàng; user sửa rồi bấm chốt → lưu vào Kho sản phẩm (máy chủ kiểm lại khoá bước). Đã lưu thì mở lại bản đã lưu.
 */
export function SalesPitchStep({ journey }: { journey: ContentJourney }) {
  const session = useSession()
  const defaults = useTenantSalesDefaults()
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const view = journey.view
  const canSave = session.can("L3")

  if (!view) {
    return (
      <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <Tile title="Chọn sản phẩm từ Kho" icon={Library} pill={<TilePill tone="muted">Dữ liệu có sẵn</TilePill>}
            preview="Dùng sản phẩm đã có Thẻ sản phẩm và Bài giới thiệu được duyệt." onOpen={() => setLibraryOpen(true)} />
          <Tile title="Bắt đầu từ ảnh mới" icon={Package} pill={<TilePill tone="muted">Bước 1</TilePill>}
            preview="Tải ảnh sản phẩm để tạo Thẻ sản phẩm trước." onOpen={() => journey.go("PRODUCT_CARD")} />
        </div>
        <LibraryPickerDialog open={libraryOpen} requireCopy onClose={() => setLibraryOpen(false)} onPick={(id) => journey.setProduct(id, "SALES_PITCH")} />
      </>
    )
  }

  const saved = view.sales_pitch
  const pitch: SalesPitchData = saved
    ? toSalesPitchData(saved, { productId: view.product.id, analysisId: view.analysis?.id ?? null, imageUrl: view.analysis?.image_url ?? null })
    : { ...buildSalesPitchData(view.analysis?.data ?? null, view.copy?.data ?? null, undefined, view.analysis?.image_url ?? null, defaults), productId: view.product.id, analysisId: view.analysis?.id ?? null }

  const finalize = async (p: SalesPitchData) => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await saveSalesPitch(view.product.id, pitchToRecord(p))
      await journey.reload()
      setJustSaved(true)
    } catch (e) {
      setError(errorText(e) || "Chưa lưu được Thẻ chào sản phẩm")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-text-muted">Sản phẩm đang làm</p>
          <p className="truncate text-title-sm font-bold text-text">{view.product.name}</p>
          <p className="text-caption text-text-muted">
            {saved ? `Đã lưu vào Kho sản phẩm · lần ${saved.version} · ${formatDateTime(saved.finalized_at)}` : "Chưa chốt — kiểm tra thẻ bên dưới rồi bấm chốt để lưu vào Kho."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setLibraryOpen(true)}>Đổi sản phẩm</Button>
          {saved && <Button type="button" size="sm" onClick={() => journey.go("CHANNEL_POSTS")}>Sang Bước 3 <ArrowRight size={14} aria-hidden /></Button>}
        </div>
      </div>

      {justSaved && <p role="status" className="rounded-xl border border-success-border bg-success-bg px-4 py-3 text-body-sm text-success-text">Đã lưu Thẻ chào sản phẩm vào Kho sản phẩm.</p>}
      {error && <InlineError message={error} />}
      {!canSave && <p className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-body-sm text-warning-text">Bạn xem và sửa được thẻ, nhưng chưa có quyền lưu vào Kho — nhờ quản lý cửa hàng chốt giúp.</p>}
      {saving && <p className="text-caption text-text-muted" aria-live="polite">Đang lưu vào Kho sản phẩm…</p>}

      <SalesPitchCard key={`${view.product.id}:${saved?.version ?? 0}`} pitchData={pitch} onFinalize={(p) => void finalize(p)} />

      <LibraryPickerDialog open={libraryOpen} requireCopy onClose={() => setLibraryOpen(false)} onPick={(id) => journey.setProduct(id, "SALES_PITCH")} />
    </div>
  )
}
