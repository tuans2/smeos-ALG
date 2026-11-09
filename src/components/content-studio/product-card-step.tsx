"use client"

import { useState } from "react"
import { Tile, TilePill } from "@/components/brand-kit/tiles/tile"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { ScanSearch } from "@/components/ui/icon-set/scan-search"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useSession } from "@/lib/session"
import { safeImageSrc } from "@/lib/safe-image-src"
import { CardReviewDialog } from "./card-review-dialog"
import { cardName } from "./content-copy"
import type { ScanResult } from "./content-api"
import { LibraryPickerDialog } from "./library-picker-dialog"
import { PhotoPickTiles } from "./photo-pick-tiles"
import type { ContentJourney } from "./use-content-journey"
import { usePhotoScan } from "./use-photo-scan"

const STATE_PILL = {
  PENDING: { tone: "need", text: "Chờ duyệt" },
  APPROVED: { tone: "ok", text: "Đã duyệt thẻ" },
  REJECTED: { tone: "muted", text: "Đã bỏ" },
} as const

/**
 * Bước 1 — Thẻ sản phẩm: tải ảnh → quét → mỗi kết quả một ô; bấm ô để duyệt Thẻ sản phẩm rồi Bài giới thiệu.
 * Xong một sản phẩm thì sản phẩm đó thành "sản phẩm đang làm" (một sản phẩm → mở luôn Bước 2).
 */
export function ProductCardStep({ journey }: { journey: ContentJourney }) {
  const session = useSession()
  const scan = usePhotoScan()
  const [open, setOpen] = useState<ScanResult | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const onProductReady = async (productId: string) => {
    const warn = await scan.attachExtras(productId)
    await scan.reloadResults()
    setNotice(warn)
    const single = scan.results.length <= 1
    journey.setProduct(productId, single ? "SALES_PITCH" : "PRODUCT_CARD")
    if (single) setOpen(null)
  }

  const current = journey.view
  const busy = scan.phase === "uploading" || scan.phase === "scanning"

  return (
    <div className="space-y-5">
      {current && scan.phase === "pick" && (
        <Tile
          title={current.product.name}
          icon={ScanSearch}
          tone="selected"
          pill={<TilePill tone={journey.flags?.copyApproved ? "ok" : "need"}>{journey.flags?.copyApproved ? "Đã duyệt đủ Bước 1" : "Còn phần chờ duyệt"}</TilePill>}
          preview={current.analysis ? "Sản phẩm đang làm. Bấm để mở lại Thẻ sản phẩm và Bài giới thiệu." : "Sản phẩm đang làm chưa có ảnh đã quét — tải ảnh bên dưới để tạo Thẻ sản phẩm."}
          {...(current.analysis ? {
            onOpen: () => current.analysis && setOpen({
              id: current.analysis.id, asset_id: "", product_id: current.product.id,
              approval_state: current.analysis.approval_state as ScanResult["approval_state"], image_url: current.analysis.image_url, data: current.analysis.data,
            }),
          } : {})}
          footer="Muốn làm sản phẩm khác? Tải ảnh mới bên dưới"
        />
      )}

      {scan.phase === "pick" && <PhotoPickTiles scan={scan} canScan={session.can("H1")} onOpenLibrary={() => setLibraryOpen(true)} />}

      {busy && (
        <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border/70" aria-live="polite">
          <p className="mb-3 text-body font-semibold text-text">{scan.progress ?? "Đang xử lý…"}</p>
          <SkeletonBlock lines={3} label={scan.progress ?? "Đang quét ảnh"} />
          <p className="mt-3 text-caption text-text-muted">Có thể mất một đến hai phút. Bạn có thể ở lại trang này để xem kết quả.</p>
        </div>
      )}

      {scan.phase === "failed" && (
        <div role="alert" className="rounded-2xl border border-danger-border bg-danger-bg p-5 text-body-sm text-danger-text">
          {scan.errors.map((e) => <p key={e}>{e}</p>)}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void scan.start()}><RefreshCw size={14} aria-hidden /> Thử lại</Button>
            <Button type="button" size="sm" variant="secondary" onClick={scan.reset}>Làm lại từ đầu</Button>
          </div>
        </div>
      )}

      {scan.phase === "review" && (
        <section className="space-y-3" aria-label="Thẻ sản phẩm vừa quét">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-body font-semibold text-text">
              {scan.results.length === 0 ? "Chưa có kết quả quét" : `${scan.results.length} Thẻ sản phẩm — bấm từng ô để duyệt`}
            </p>
            <Button type="button" size="sm" variant="secondary" onClick={scan.reset}>Tải ảnh khác</Button>
          </div>
          {scan.extraPhotos.length > 0 && (
            <p className="text-caption text-text-muted">{scan.extraPhotos.length} ảnh góc khác sẽ được gắn vào sản phẩm khi bạn duyệt Thẻ sản phẩm.</p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {scan.results.map((r, i) => {
              const src = safeImageSrc(r.image_url)
              const pill = STATE_PILL[r.approval_state]
              const isCurrent = r.product_id !== null && r.product_id === journey.productId
              return (
                <Tile
                  key={r.id}
                  title={cardName(r.data, `Sản phẩm ${i + 1}`)}
                  tone={isCurrent ? "selected" : r.approval_state === "PENDING" ? "need" : "default"}
                  pill={<TilePill tone={pill.tone}>{isCurrent ? "Đang làm" : pill.text}</TilePill>}
                  preview={src ? <img src={src} alt="" className="mt-2 aspect-video w-full rounded-xl object-cover" /> : null}
                  {...(r.approval_state === "REJECTED" ? {} : { onOpen: () => setOpen(r) })}
                  footer={r.approval_state === "PENDING" ? "Bấm để kiểm tra và duyệt" : r.approval_state === "APPROVED" ? "Bấm để làm tiếp Bài giới thiệu" : "Không dùng"}
                />
              )
            })}
          </div>
        </section>
      )}

      {notice && <p role="status" className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-body-sm text-warning-text">{notice}</p>}

      <CardReviewDialog
        result={open}
        onClose={() => setOpen(null)}
        onProductReady={onProductReady}
        onDiscarded={() => void scan.reloadResults()}
      />
      <LibraryPickerDialog open={libraryOpen} onClose={() => setLibraryOpen(false)} onPick={(id) => journey.setProduct(id)} />
    </div>
  )
}
