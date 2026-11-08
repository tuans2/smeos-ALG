"use client"

import { useRef } from "react"
import { Tile, TilePill } from "@/components/brand-kit/tiles/tile"
import { Button } from "@/components/ui/button"
import { CostPreview } from "@/components/ui/cost-preview"
import { ImagePlus } from "@/components/ui/icon-set/image-plus"
import { Images } from "@/components/ui/icon-set/images"
import { Library } from "@/components/ui/icon-set/library"
import { Package } from "@/components/ui/icon-set/package"
import { X } from "@/components/ui/icon-set/x"
import { cn } from "@/lib/utils"
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTOS_PER_BATCH, type PhotoBatchMode } from "@/modules/content-studio/domain/photo-batch"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"
import { MODE_COPY } from "./content-copy"
import type { PhotoScanState } from "./use-photo-scan"

const MODES: readonly PhotoBatchMode[] = ["ONE_PRODUCT", "MANY_PRODUCTS"]

/**
 * Bước 1 — chọn ảnh: 2 ô kiểu tải (một sản phẩm nhiều góc / nhiều sản phẩm), ô thêm ảnh, lưới ảnh đã chọn,
 * nút quét kèm chi phí, và ô "Chọn từ Kho" cho sản phẩm đã quét trước đây.
 */
export function PhotoPickTiles({ scan, canScan, onOpenLibrary }: { scan: PhotoScanState; canScan: boolean; onOpenLibrary: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const count = scan.photos.length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {MODES.map((m) => (
          <Tile
            key={m}
            title={MODE_COPY[m].title}
            icon={m === "ONE_PRODUCT" ? Package : Images}
            tone={scan.mode === m ? "selected" : "default"}
            pill={scan.mode === m ? <TilePill tone="primary">Đang chọn</TilePill> : <TilePill tone="muted">Kiểu tải ảnh</TilePill>}
            preview={MODE_COPY[m].text}
            onOpen={() => scan.setMode(m)}
          />
        ))}
        <Tile
          title="Chọn từ Kho sản phẩm"
          icon={Library}
          pill={<TilePill tone="muted">Dữ liệu có sẵn</TilePill>}
          preview="Sản phẩm đã quét và duyệt trước đây — làm tiếp các bước sau mà không cần tải ảnh lại."
          onOpen={onOpenLibrary}
        />
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/70 sm:p-5">
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPTED_PHOTO_TYPES.join(",")}
          className="sr-only"
          aria-label="Chọn ảnh sản phẩm"
          onChange={(e) => { if (e.target.files) scan.addFiles(e.target.files); e.target.value = "" }}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
          {scan.photos.map((p, i) => (
            <figure key={p.id} className="relative overflow-hidden rounded-xl bg-surface-alt ring-1 ring-border/70">
              <img src={p.previewUrl} alt={p.name} className="aspect-square w-full object-cover" />
              {scan.mode === "ONE_PRODUCT" && (
                <figcaption className={cn("absolute bottom-1 left-1 rounded-full px-2 py-0.5 text-caption font-bold", i === 0 ? "bg-primary text-surface" : "bg-surface/90 text-text-muted")}>
                  {i === 0 ? "Ảnh chính" : "Góc khác"}
                </figcaption>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Bỏ ảnh ${p.name}`}
                onClick={() => scan.removePhoto(p.id)}
                className="absolute right-1 top-1 h-7 w-7 rounded-full bg-surface/90 p-0 text-text hover:bg-surface"
              >
                <X size={14} aria-hidden />
              </Button>
            </figure>
          ))}
          {count < MAX_PHOTOS_PER_BATCH && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => input.current?.click()}
              className="flex aspect-square h-auto w-full flex-col items-center justify-center gap-1 whitespace-normal rounded-xl border-2 border-dashed border-border text-caption font-semibold text-text-muted hover:border-primary hover:text-primary"
            >
              <ImagePlus size={22} aria-hidden />
              {count === 0 ? "Thêm ảnh" : "Thêm nữa"}
            </Button>
          )}
        </div>

        {scan.errors.length > 0 && (
          <ul role="alert" className="mt-3 space-y-1 text-caption text-danger-text">
            {scan.errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-body-sm font-semibold text-text">
              {count === 0 ? `Chọn tối đa ${MAX_PHOTOS_PER_BATCH} ảnh JPG, PNG hoặc WEBP` : scan.mode === "ONE_PRODUCT" ? `${count} ảnh → 1 Thẻ sản phẩm` : `${count} ảnh → ${count} Thẻ sản phẩm`}
            </p>
            <CostPreview cost={costCreditForFeature("vision.analyze")} />
          </div>
          <Button type="button" disabled={count === 0 || !canScan} onClick={() => void scan.start()}>
            Quét ảnh và tạo Thẻ sản phẩm
          </Button>
        </div>
        {!canScan && <p className="mt-2 text-caption text-warning-text">Bạn chưa có quyền quét ảnh — nhờ quản lý cửa hàng cấp quyền.</p>}
      </div>
    </div>
  )
}
