"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"

const MESSAGE = {
  identity: "Hồ sơ cửa hàng đã thay đổi sau lần tạo gần nhất.",
  landing: "Hồ sơ hoặc Bộ nhận diện đã đổi sau lần tạo gần nhất.",
} as const

/** Báo hồ sơ đã đổi + nút tạo lại 3 phương án miễn phí — dùng chung cho /ho-so và /cong-cu. */
export function RefreshBanner({ kind, show, canRefresh, busy, onRefresh }: {
  kind: keyof typeof MESSAGE
  show: boolean
  canRefresh: boolean
  busy: boolean
  onRefresh: () => void
}) {
  if (!show) return null
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border border-warning-border bg-warning-bg p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-body-sm text-warning-text">{MESSAGE[kind]}</p>
      {canRefresh && (
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" disabled={busy} onClick={onRefresh}>
          <RefreshCw size={16} aria-hidden /> Tạo lại theo hồ sơ mới (miễn phí)
        </Button>
      )}
    </div>
  )
}
