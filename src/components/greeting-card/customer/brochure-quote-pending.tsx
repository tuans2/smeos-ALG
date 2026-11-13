"use client"

import { ArrowRight, CheckCircle2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

/** Bước thanh toán cho mẫu chưa niêm yết giá: nhận đơn, cửa hàng sẽ báo giá sau. */
export function BrochureQuotePending({ orderCode, onGoToTracking }: { orderCode: string; onGoToTracking: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border border-border bg-surface p-6 text-center shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
        <CheckCircle2 size={26} aria-hidden="true" />
      </div>
      <h2 className="text-title font-extrabold">Đã nhận đơn #{orderCode}</h2>
      <p className="text-body-sm text-text-muted">
        Sản phẩm này chưa niêm yết giá. Cửa hàng sẽ liên hệ báo giá và hướng dẫn thanh toán cho bạn sớm nhất.
      </p>
      <Button type="button" onClick={onGoToTracking} className="w-full gap-1.5">
        Theo dõi đơn hàng <ArrowRight size={16} aria-hidden="true" />
      </Button>
    </div>
  )
}
