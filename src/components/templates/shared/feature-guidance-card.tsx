"use client"

import "@/lib/brand-storage-migration"

import * as React from "react"
import type { LucideIcon } from "@/components/ui/icon-set/wrap"
import { Info } from "@/components/ui/icon-set/info"
import { BookOpen } from "@/components/ui/icon-set/book-open"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface GuidanceTip {
  icon?: string | LucideIcon
  text: string
}

export interface FeatureGuidanceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  badgeLabel?: string | undefined
  tag?: string | undefined
  badgeIcon?: LucideIcon | undefined
  icon?: LucideIcon | undefined
  title: string
  titleIcon?: LucideIcon | undefined
  description: string
  tips?: Array<string | GuidanceTip> | undefined
  maxWidthClassName?: string | undefined
  /** ID duy nhất để lưu trạng thái "đã xem" vào localStorage. Tự sinh từ title nếu bỏ trống. */
  guidanceId?: string | undefined
}

const STORAGE_KEY_PREFIX = "alg_guidance_seen_"
const LEGACY_STORAGE_KEY_PREFIX = "floraos_guidance_seen_"

/** Sinh kebab-case ID ổn định từ chuỗi tiếng Việt có dấu */
function toStableId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Kiểm tra xem guidance đã được xem chưa (chỉ chạy client-side) */
function hasBeenSeen(id: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return (
      localStorage.getItem(STORAGE_KEY_PREFIX + id) === "1" ||
      localStorage.getItem(LEGACY_STORAGE_KEY_PREFIX + id) === "1"
    )
  } catch {
    return false
  }
}

/** Đánh dấu guidance đã được xem */
function markAsSeen(id: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + id, "1")
  } catch {
    // localStorage có thể bị disabled — bỏ qua
  }
}

/**
 * Base Feature Guidance Card Component (Họ Guidance Templates)
 *
 * Khung chuẩn hiển thị hướng dẫn thao tác cho các Tab tính năng trong ALG:
 * - Khung viền đứt nét màu đỏ: `border-2 border-dashed border-red-300`
 * - Nền đỏ pastel dịu mắt: `bg-red-50/70`
 * - Badge định danh chức năng: `bg-guidance-tag-bg text-red-700`
 * - Tiêu đề & nội dung đỏ chuẩn tương phản cao WCAG (>7:1)
 * - Thanh gợi ý mẹo thao tác ở chân khối: `border-t border-dashed border-red-200/90`
 *
 * Collapsible: Lần đầu hiện đầy đủ → đánh dấu "đã xem" → lần sau tự thu gọn
 * thành nút "📖 XEM HƯỚNG DẪN". Click để mở/đóng.
 */
export function FeatureGuidanceCard({
  badgeLabel,
  tag,
  badgeIcon,
  icon,
  title,
  titleIcon,
  description,
  tips = [],
  maxWidthClassName = "max-w-xl",
  guidanceId,
  className,
  ...props
}: FeatureGuidanceCardProps) {
  const effectiveBadgeLabel = badgeLabel ?? tag
  const EffectiveBadgeIcon = badgeIcon ?? icon ?? Info
  const EffectiveTitleIcon = titleIcon ?? (badgeIcon ? icon : undefined)

  // Sinh ID ổn định nếu không truyền
  const stableId = React.useMemo(
    () => guidanceId ?? toStableId(title),
    [guidanceId, title]
  )

  // SSR-safe: mặc định expanded, client sẽ đồng bộ lại sau hydration
  const [isExpanded, setIsExpanded] = React.useState(true)
  const [hasMounted, setHasMounted] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Sau khi mount trên client: kiểm tra localStorage để quyết định trạng thái
  React.useEffect(() => {
    const seen = hasBeenSeen(stableId)
    if (seen) {
      setIsExpanded(false)
    } else {
      // Lần đầu → hiện đầy đủ + đánh dấu đã xem
      markAsSeen(stableId)
    }
    setHasMounted(true)
  }, [stableId])

  const handleToggle = React.useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  // --- Trạng thái thu gọn: nút compact ---
  if (hasMounted && !isExpanded) {
    return (
      <div
        className={cn(
          "w-full mx-auto",
          maxWidthClassName,
          className
        )}
        {...props}
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={handleToggle}
          className={cn(
            "w-full h-auto group flex items-center justify-center gap-2",
            "rounded-2xl border-2 border-dashed border-guidance-border/80 bg-guidance-bg/40",
            "px-4 py-2.5 cursor-pointer",
            "transition-all duration-300 ease-out",
            "hover:border-guidance-border hover:bg-guidance-bg/70 hover:shadow-sm",
            "active:scale-[0.99]"
          )}
        >
          <BookOpen
            size={15}
            className="text-guidance transition-colors duration-200"
          />
          <span className="text-meta font-bold tracking-wider uppercase text-guidance transition-colors duration-200">
            Xem hướng dẫn
          </span>
          <ChevronDown
            size={14}
            className="text-guidance-border group-hover:text-guidance transition-all duration-200 group-hover:translate-y-0.5"
          />
        </Button>
      </div>
    )
  }

  // --- Trạng thái mở rộng: nội dung đầy đủ ---
  return (
    <div
      className={cn(
        "w-full mx-auto rounded-2xl border-2 border-dashed border-guidance-border bg-guidance-bg/70 p-4 sm:p-5 text-center transition-all shadow-xs",
        maxWidthClassName,
        className
      )}
      {...props}
    >
      {/* Nút thu gọn ở góc trên phải (chỉ hiện khi đã mount) */}
      {hasMounted && (
        <div className="flex justify-end -mt-1 -mr-1 mb-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleToggle}
            className="gap-1 px-2 rounded-full text-caption font-semibold text-guidance hover:bg-guidance-tag-bg/60 transition-all duration-200 cursor-pointer"
            title="Thu gọn hướng dẫn"
          >
            <ChevronDown size={12} className="rotate-180" />
            <span>Thu gọn</span>
          </Button>
        </div>
      )}

      <div ref={contentRef}>
        {effectiveBadgeLabel && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-guidance-tag-bg text-guidance text-caption font-bold tracking-wider uppercase mb-2">
            {EffectiveBadgeIcon && <EffectiveBadgeIcon size={13} className="text-guidance" />}
            <span>{effectiveBadgeLabel}</span>
          </div>
        )}

        <div className="text-title font-extrabold text-guidance-text flex items-center justify-center gap-2">
          {EffectiveTitleIcon && <EffectiveTitleIcon size={18} className="text-guidance" />}
          <span>{title}</span>
        </div>

        <div className="mt-1.5 text-body-sm leading-relaxed text-guidance/90 max-w-lg mx-auto">
          {description}
        </div>

        {tips.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dashed border-guidance-border/90 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-caption font-medium text-guidance">
            {tips.map((tip, index) => {
              if (typeof tip === "string") {
                return (
                  <span key={index} className="inline-flex items-center gap-1">
                    {tip}
                  </span>
                )
              }
              const TipIcon = typeof tip.icon === "function" ? tip.icon : null
              return (
                <span key={index} className="inline-flex items-center gap-1">
                  {TipIcon && <TipIcon size={12} className="text-guidance" />}
                  {typeof tip.icon === "string" && <span>{tip.icon}</span>}
                  <span>{tip.text}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
