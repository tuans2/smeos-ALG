"use client"

import type { GreetingTemplateId } from "@/modules/greeting-card/domain/greeting-template-registry"
import { photoBackdrop } from "./swipe/swipe-card"
import { getSwipeTheme } from "./swipe/swipe-themes"
import { COLOR_MOODS } from "./aux/catalog-filters"

const AUX_IDS = new Set<GreetingTemplateId>([
  "lookbook-grid", "editorial-story", "video-reels", "occasion-budget-quiz", "event-moodboard", "split-compare",
])

function Photo({ src, backdrop, className = "" }: { src: string | null; backdrop: string; className?: string }) {
  return (
    <span className={`relative block overflow-hidden ${className}`} style={{ background: backdrop }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" style={{ mixBlendMode: "multiply" }} />
      )}
    </span>
  )
}

/**
 * Ảnh thu nhỏ của một mẫu, dựng từ ảnh hoa thật của bộ sưu tập và đúng
 * bảng màu / bố cục của mẫu — thay cho hình minh họa chung chung.
 */
export function TemplateThumb({ templateId, photo }: { templateId: GreetingTemplateId; photo: string | null }) {
  const paper = "var(--color-surface-alt)"

  if (!AUX_IDS.has(templateId)) {
    const theme = getSwipeTheme(templateId)
    const light = theme.info === "paper" || theme.info === "polaroid"
    return (
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center p-1" style={{ background: theme.stage }}>
        <span className="relative flex h-full w-full flex-col overflow-hidden" style={{ borderRadius: Math.max(3, theme.radius / 5), background: theme.card }}>
          <Photo src={photo} backdrop={photoBackdrop(theme)} className="min-h-0 flex-1" />
          {light ? (
            <span className="block h-2.5 shrink-0 px-1 pt-1" style={{ background: theme.infoBg }}>
              <span className="block h-0.5 w-3/4 rounded-full" style={{ background: theme.accent }} />
            </span>
          ) : (
            <span className="absolute inset-x-1 bottom-1 block h-0.5 w-2/3 rounded-full" style={{ background: theme.accent }} />
          )}
        </span>
      </span>
    )
  }

  const tile = (k: number, cls = "") => <Photo key={k} src={photo} backdrop={paper} className={`rounded-[2px] ${cls}`} />

  return (
    <span aria-hidden="true" className="absolute inset-0 bg-bg p-1">
      {templateId === "lookbook-grid" && <span className="grid h-full grid-cols-2 gap-0.5">{[0, 1, 2, 3].map((k) => tile(k))}</span>}
      {templateId === "event-moodboard" && (
        <span className="flex h-full flex-col gap-0.5">
          <span className="flex gap-0.5">
            {COLOR_MOODS.slice(0, 3).map((m) => (
              <span key={m.id} className="h-2 w-2 rounded-full" style={{ background: m.swatch }} />
            ))}
          </span>
          <span className="grid flex-1 grid-cols-2 gap-0.5">{[0, 1].map((k) => tile(k))}</span>
        </span>
      )}
      {templateId === "editorial-story" && (
        <span className="flex h-full flex-col gap-0.5">
          {tile(0, "flex-1")}
          <span className="block h-0.5 w-1/3 bg-primary" />
          <span className="block h-0.5 w-full bg-text/30" />
        </span>
      )}
      {templateId === "split-compare" && <span className="grid h-full grid-cols-2 gap-0.5">{[0, 1].map((k) => tile(k))}</span>}
      {templateId === "occasion-budget-quiz" && (
        <span className="flex h-full flex-col gap-0.5">
          <span className="flex gap-0.5">
            <span className="h-1.5 w-3 rounded-full bg-text" />
            <span className="h-1.5 w-3 rounded-full border border-text/30" />
          </span>
          {[0, 1].map((k) => (
            <span key={k} className="flex flex-1 gap-0.5 rounded-[2px] bg-surface p-0.5">
              {tile(k, "w-1/2")}
              <span className="mt-0.5 block h-0.5 flex-1 bg-primary" />
            </span>
          ))}
        </span>
      )}
      {templateId === "video-reels" && (
        <span className="absolute inset-0 bg-black">
          <Photo src={photo} backdrop={photoBackdrop(getSwipeTheme("03"))} className="h-full w-full" />
          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-white" />
          <span className="absolute inset-x-1 bottom-1 mr-3 block h-1 rounded-full bg-white" />
        </span>
      )}
    </span>
  )
}
