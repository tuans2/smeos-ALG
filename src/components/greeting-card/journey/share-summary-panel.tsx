"use client"

import { Check, CheckCircle2, Circle, Copy, CopyPlus, Eye, Link as LinkIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { useJourneyFocus } from "./journey-focus-context"
import { cn } from "@/lib/utils"
import type { CatalogOption } from "./use-journey-catalogs"

interface ShareSummaryPanelProps {
  catalog: CatalogOption | undefined
  templateLabel: string | null
  itemCount: number
  copied: boolean
  copyError: string | null
  /** Link vừa tạo nhưng trình duyệt chặn chép — hiện ra để chép tay. */
  copyFallback?: string | null | undefined
  onCopy: () => void
  onPreview: () => void
  onClone: () => void
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  const Icon = done ? CheckCircle2 : Circle
  return (
    <li className="flex items-center gap-2 text-body-sm">
      <Icon size={16} aria-hidden="true" className={done ? "text-success" : "text-text-muted"} />
      <span className={done ? "text-text" : "text-text-muted"}>{label}</span>
      <span className="sr-only">{done ? "(đã xong)" : "(chưa xong)"}</span>
    </li>
  )
}

/** Cột tóm tắt: trạng thái sẵn sàng + link dùng chung (một nơi duy nhất cho thao tác chia sẻ). */
export function ShareSummaryPanel(props: ShareSummaryPanelProps) {
  const { catalog, templateLabel, itemCount, copied, copyError, copyFallback, onCopy, onPreview, onClone } = props
  const { ti } = useI18n()
  const { activeBlock, setActiveBlock } = useJourneyFocus()
  const isBlock3Active = activeBlock === 3
  const ready = Boolean(catalog) && itemCount > 0

  return (
    <aside aria-label="Tóm tắt và chia sẻ" className="flex flex-col gap-4 lg:sticky lg:top-6">
      <section
        onClick={() => setActiveBlock(3)}
        className={cn(
          "rounded-2xl border p-5 transition-all duration-300 cursor-pointer",
          isBlock3Active
            ? "border-primary/50 bg-surface shadow-sm ring-2 ring-primary/20 opacity-100"
            // Khối chưa tới lượt: làm nhạt nền/viền, không làm mờ chữ — chữ mờ chỉ đạt 2,49:1 (axe, audit A17).
            : "border-border/60 bg-surface-alt/60 hover:bg-surface",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold shadow-xs transition-colors",
            isBlock3Active ? "bg-primary text-white" : "bg-primary/15 text-primary"
          )}>
            3
          </span>
          <div className="flex items-center gap-1.5">
            <LinkIcon size={16} aria-hidden="true" className="text-primary" />
            <h2 className="text-body font-bold text-text">Link dùng chung</h2>
          </div>
        </div>
        <p className="mt-1 text-body-sm text-text-muted">
          Đăng lên Fanpage, Zalo, bio hoặc quảng cáo. Ai mở link cũng xem được {ti("sampleProduct").toLowerCase()} và tự đặt, thanh toán qua mã QR.
        </p>

        {ready ? (
          <>
            <p className="mt-4 rounded-xl border border-border bg-surface px-3 py-2.5 text-body-sm text-text-muted">
              Mỗi lần bấm <strong className="text-text">Sao chép</strong> tạo một link <strong className="text-text">mang tên bạn</strong> — khách mở link này được tính cho bạn từ lúc mở tới khi xong đơn.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={onPreview} className="gap-1.5 whitespace-nowrap px-3">
                <Eye size={16} aria-hidden="true" />
                Xem trước
              </Button>
              <Button variant="primary" size="sm" onClick={onCopy} className="gap-1.5 whitespace-nowrap px-3">
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? "Đã chép" : "Sao chép"}
              </Button>
            </div>
            {copyError && (
              <p role="alert" className="mt-2 text-caption text-danger">
                {copyError}
              </p>
            )}
            {copyFallback && (
              <output className="mt-2 block break-all rounded-xl border border-border bg-bg p-2.5 font-mono text-caption text-text select-all">
                {copyFallback}
              </output>
            )}
            <Button variant="ghost"
              type="button"
              onClick={onClone}
              className="h-auto p-0 mt-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
            >
              <CopyPlus size={16} aria-hidden="true" />
              Tạo link riêng cho kênh khác
            </Button>
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-surface-alt px-3 py-2.5 text-body-sm text-text-muted">
            Link sẽ xuất hiện khi bộ sưu tập có ít nhất 1 {ti("sampleProduct").toLowerCase()}.
          </p>
        )}
      </section>
    </aside>
  )
}
