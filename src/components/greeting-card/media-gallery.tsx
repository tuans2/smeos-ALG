"use client"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Play } from "@/components/ui/icons"

/** URL ký sẵn có đuôi tệp trong đường dẫn; video nhận theo đuôi. */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
}

/**
 * Lưới ảnh/video thu nhỏ; bấm vào ô nào thì phóng to xem (vuốt/bấm qua lại, Esc để đóng).
 * Dùng cho ảnh thành phẩm và ảnh người nhận — trang khách lẫn trang điều phối.
 */
export function MediaGallery({ urls, label }: { urls: readonly string[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % urls.length))
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + urls.length) % urls.length))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, urls.length])

  if (urls.length === 0) return null
  const current = open === null ? null : urls[open]

  return (
    <>
      <ul className="grid grid-cols-3 gap-2" aria-label={label}>
        {urls.map((url, i) => (
          <li key={url}>
            <Button variant="outline"
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`${label} — xem ${isVideoUrl(url) ? "video" : "ảnh"} ${i + 1}/${urls.length}`}
              className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 relative block aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-alt hover:bg-surface-alt"
            >
              {isVideoUrl(url) ? (
                <>
                  <video src={url} muted preload="metadata" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-text/30 text-surface">
                    <Play size={22} aria-hidden="true" />
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </Button>
          </li>
        ))}
      </ul>

      {current && open !== null && (
        <Dialog open onOpenChange={(o) => { if (!o) setOpen(null) }} size="lg" title={label} description={`${open + 1}/${urls.length}`}>
          <div className="flex flex-col items-center gap-3">
            {isVideoUrl(current) ? (
              <video src={current} controls autoPlay playsInline className="max-h-[70dvh] max-w-full rounded-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current} alt={`${label} ${open + 1}`} className="max-h-[70dvh] max-w-full rounded-lg object-contain" />
            )}
            {urls.length > 1 && (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" aria-label="Ảnh trước" onClick={() => setOpen((open - 1 + urls.length) % urls.length)}>
                  <ChevronLeft size={22} aria-hidden="true" />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label="Ảnh sau" onClick={() => setOpen((open + 1) % urls.length)}>
                  <ChevronRight size={22} aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  )
}
