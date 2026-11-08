"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Package } from "@/components/ui/icon-set/package"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { errorText } from "@/lib/error-text"
import { safeImageSrc } from "@/lib/safe-image-src"
import { cn } from "@/lib/utils"
import { TilePill } from "@/components/brand-kit/tiles/tile"
import { fetchLibrary, type ContentLibraryItem } from "./content-api"

/** Sản phẩm dùng được cho bước nào — để user thấy ngay cái nào đã đủ dữ liệu. */
function readiness(p: ContentLibraryItem): { tone: "ok" | "need" | "muted"; text: string } {
  if (p.has_pitch) return { tone: "ok", text: "Có Thẻ chào" }
  if (p.has_copy) return { tone: "need", text: "Có Bài giới thiệu" }
  return { tone: "muted", text: "Chưa có Bài giới thiệu" }
}

const REQUIRE_TEXT = {
  copy: "Chỉ chọn được sản phẩm đã có Bài giới thiệu đã duyệt.",
  pitch: "Chỉ chọn được sản phẩm đã chốt Thẻ chào sản phẩm.",
} as const

/**
 * Chọn "sản phẩm đang làm" từ Kho sản phẩm (tình huống dùng lại dữ liệu đã phân tích). Phân trang con trỏ;
 * `require` → chỉ chọn được sản phẩm đã có Bài giới thiệu (Bước 2) hoặc Thẻ chào đã chốt (Bước 3).
 */
export function LibraryPickerDialog({
  open, onClose, onPick, require, title = "Chọn từ Kho sản phẩm",
}: {
  open: boolean
  onClose: () => void
  onPick: (productId: string) => void
  require?: "copy" | "pitch"
  title?: string
}) {
  const [items, setItems] = useState<ContentLibraryItem[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback((from: string | null) =>
    fetchLibrary(from)
      .then((page) => {
        setError(null)
        setItems((cur) => (from && cur ? [...cur, ...page.data] : page.data))
        setCursor(page.next_cursor)
      })
      .catch((e: unknown) => {
        setError(errorText(e) || "Chưa tải được Kho sản phẩm")
        setItems((cur) => cur ?? [])
      }), [])

  // Mỗi lần mở hộp: nạp lại trang đầu (danh sách lần trước hiện tạm trong lúc chờ)
  useEffect(() => {
    if (open) void load(null)
  }, [open, load])

  const more = async () => {
    setLoadingMore(true)
    await load(cursor)
    setLoadingMore(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }} size="lg" title={title}
      description={require ? REQUIRE_TEXT[require] : "Sản phẩm đã quét ảnh và duyệt trước đây."}>
      {error && <InlineError message={error} onRetry={() => { setItems(null); void load(null) }} />}
      {items === null && <SkeletonBlock lines={4} label="Đang tải Kho sản phẩm" />}
      {items !== null && items.length === 0 && !error && (
        <EmptyState icon={Package} title="Kho sản phẩm chưa có sản phẩm" reason="Tải ảnh ở Bước 1 để tạo sản phẩm đầu tiên." />
      )}
      {items && items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((p) => {
            const blocked = (require === "copy" && !p.has_copy) || (require === "pitch" && !p.has_pitch)
            const src = safeImageSrc(p.image_url)
            const r = readiness(p)
            return (
              <li key={p.id}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={blocked}
                  onClick={() => { onPick(p.id); onClose() }}
                  className={cn(
                    "h-auto w-full flex-col items-stretch justify-start gap-2 whitespace-normal rounded-xl border border-border bg-surface p-2 text-left hover:border-primary",
                    blocked && "opacity-60",
                  )}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-alt">
                    {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Package size={28} aria-hidden className="m-auto mt-8 text-text-muted" />}
                  </div>
                  <span className="line-clamp-2 text-caption font-semibold text-text">{p.name}</span>
                  <TilePill tone={r.tone}>{r.text}</TilePill>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {cursor && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" size="sm" disabled={loadingMore} onClick={() => void more()}>
            {loadingMore ? "Đang tải…" : "Xem thêm"}
          </Button>
        </div>
      )}
    </Dialog>
  )
}
