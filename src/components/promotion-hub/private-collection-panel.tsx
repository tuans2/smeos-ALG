"use client"

import { JourneyWizard } from "@/components/greeting-card/journey/journey-wizard"
import { SESSION_STATUS_BADGE } from "@/components/greeting-card/sales/sales-types"
import { Disclosure } from "@/components/ui/disclosure"
import { formatDate } from "@/lib/i18n/formatters"
import { cn } from "@/lib/utils"
import { FEATURE_COPY, PANEL_COPY } from "./promotion-copy"
import type { PromotionHub } from "./use-promotion-hub"

const RECENT = 5

/**
 * Ô "Bộ sưu tập riêng": nhúng nguyên luồng gửi nhanh 3 bước của /the-chao (chọn bộ sưu tập → nhập khách → lấy link)
 * và danh sách link gửi gần đây. Quản lý đơn và theo dõi vẫn ở /the-chao (thanh tab khoá, PO 06/10/2026).
 */
export function PrivateCollectionPanel({ hub }: { hub: PromotionHub }) {
  if (!hub.can.send) {
    return <p className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-body-sm text-text-muted">{PANEL_COPY.forbidden("gửi link riêng cho khách")}</p>
  }
  const recent = hub.sentLinks.slice(0, RECENT)

  return (
    <section aria-label={FEATURE_COPY.PRIVATE_COLLECTION.title} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title-sm font-bold text-text">{FEATURE_COPY.PRIVATE_COLLECTION.title}</h3>
        <a href="/the-chao?mode=manager" className="text-body-sm font-semibold text-primary hover:underline">{PANEL_COPY.privateManage}</a>
      </div>

      <JourneyWizard onFinish={hub.reloadSent} />

      {hub.can.sent && (
        <Disclosure label={`${PANEL_COPY.privateRecent} (${recent.length})`}>
          {recent.length === 0 ? (
            <p className="pt-3 text-body-sm text-text-muted">{PANEL_COPY.privateNone}</p>
          ) : (
            <ul className="space-y-2 pt-3">
              {recent.map((s) => {
                const badge = SESSION_STATUS_BADGE[s.status] ?? { label: "Đã gửi", className: "bg-surface-alt text-text-muted" }
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-text">{s.customer_name || "Khách chưa đặt tên"}</p>
                      <p className="text-caption text-text-muted">{s.catalog?.name ?? "Bộ sưu tập"} · {formatDate(s.created_at)}</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-caption font-semibold", badge.className)}>{badge.label}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Disclosure>
      )}
    </section>
  )
}
