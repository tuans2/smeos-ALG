"use client"

import { usePagedList } from "@/components/greeting-card/greeting-api"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/i18n"

/** Một lần nhân viên nền tảng truy cập dữ liệu của tổ chức (ADR-013 D-I5, D-60) — `GET /audit-logs/platform-access`. */
interface PlatformAccessRow {
  id: string
  created_at: string
  operator_name: string | null
  purpose_label: string
}

/** Tab "Truy cập của nền tảng" trong trang Nhật ký: chỉ đọc, mới nhất trước, tải thêm theo trang. */
export function PlatformAccessTab() {
  const list = usePagedList<PlatformAccessRow>("/api/v1/audit-logs/platform-access", 50)
  const rows = list.items
  const loading = list.isLoading || list.isLoadingMore
  const error = list.error ? "Không tải được nhật ký truy cập của nền tảng." : null

  return (
    <section aria-labelledby="platform-access-title" className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="platform-access-title" className="text-body-sm font-bold text-text flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" aria-hidden="true" /> Truy cập của nền tảng
          </h2>
          <p className="text-caption text-text-muted">
            Mỗi lần nhân viên vận hành nền tảng mở dữ liệu của tổ chức đều được ghi lại tại đây.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void list.refresh()} disabled={loading} className="shrink-0 whitespace-nowrap text-caption flex items-center gap-1.5">
          <RefreshCw size={13} className={loading ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
          Làm mới
        </Button>
      </div>

      {error && <InlineError message={error} onRetry={() => void list.refresh()} />}

      {loading && rows.length === 0 ? (
        <SkeletonBlock lines={4} label="Đang tải nhật ký truy cập..." />
      ) : !error && rows.length === 0 ? (
        <EmptyState title="Chưa có lượt truy cập nào" reason="Nhân viên nền tảng chưa mở dữ liệu của tổ chức." />
      ) : (
        <ul className="flex flex-col divide-y divide-border" aria-label="Các lượt truy cập của nền tảng">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span className="text-body-sm font-medium text-text">{r.purpose_label}</span>
              <span className="text-caption text-text-muted">
                {r.operator_name ?? "Nhân viên nền tảng"} · <time dateTime={r.created_at}>{formatDateTime(r.created_at)}</time>
              </span>
            </li>
          ))}
        </ul>
      )}

      {list.hasMore && (
        <Button variant="ghost" size="sm" onClick={() => void list.loadMore()} disabled={loading} className="self-center">
          Xem thêm
        </Button>
      )}
    </section>
  )
}
