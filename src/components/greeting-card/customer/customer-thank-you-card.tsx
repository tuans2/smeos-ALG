"use client"

import { Heart, FileText, CheckCircle2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { ReorderButton } from "./reorder-button"
import { ThankYouVoucherBox, type ThankYouVoucherData } from "./thank-you-voucher-box"

export type { ThankYouVoucherData }

/** Mục trên trang theo dõi mà hai nút "Xem lại" cuộn tới. */
export const THANK_YOU_TARGET = { details: "order-details-section", progress: "progress-evidence-section" } as const

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" })

interface CustomerThankYouCardProps {
  orderCode: string
  /** Có link → nút "Đặt đơn mới" mở link mới (mã đơn mới), đơn này giữ nguyên. */
  sendCode?: string | null | undefined
  /** Mã giảm giá dùng một lần cho đơn sau, chỉ người đặt đã xác minh (ALG 5.15) */
  voucher?: ThankYouVoucherData | null | undefined
}

export function CustomerThankYouCard({
  orderCode,
  sendCode,
  voucher,
}: CustomerThankYouCardProps) {
  return (
    <section
      aria-label="Cảm ơn quý khách"
      className="w-full overflow-hidden rounded-3xl border border-primary/20 bg-surface shadow-md flex flex-col"
    >
      {/* Banner cảm ơn trang trọng */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/15 via-primary/5 to-surface p-6 sm:p-8 text-center flex flex-col items-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
          <Heart size={32} className="animate-pulse motion-reduce:animate-none fill-primary/20" />
        </div>

        <span className="rounded-full bg-primary/15 px-3 py-1 text-caption font-extrabold uppercase tracking-wider text-primary">
          Đơn hàng đã hoàn tất thành công
        </span>

        <h3 className="mt-3 text-title font-black text-text sm:text-display-lg">
          Cảm ơn bạn đã tin chọn chúng tôi!
        </h3>

        <p className="mt-2 max-w-md text-body-sm text-text-muted leading-relaxed">
          Đơn hàng <strong className="text-text">#{orderCode}</strong> đã được trao gửi trọn vẹn và chu đáo đến người nhận. Sự hài lòng của bạn là niềm vinh hạnh lớn nhất của chúng tôi.
        </p>

        {voucher && <ThankYouVoucherBox voucher={voucher} />}

        {/* 3 Nút Tác vụ chính */}
        <div className="mt-6 flex w-full max-w-sm flex-col gap-2.5">
          {/* Nút 1: Xem lại thông tin đơn hàng */}
          <Button
            type="button"
            variant="outline"
            onClick={() => scrollTo(THANK_YOU_TARGET.details)}
            className="h-11 w-full justify-center gap-2 rounded-xl border-border bg-surface text-body-sm font-bold text-text hover:bg-surface-alt cursor-pointer"
          >
            <FileText size={16} className="text-primary" />
            <span>Xem lại thông tin đơn hàng</span>
          </Button>

          {/* Nút 2: Theo dõi tiến độ */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => scrollTo(THANK_YOU_TARGET.progress)}
            className="h-11 w-full justify-center gap-2 rounded-xl text-body-sm font-bold text-text hover:bg-surface-alt cursor-pointer"
          >
            <CheckCircle2 size={16} className="text-success" />
            <span>Theo dõi tiến độ & Bằng chứng</span>
          </Button>

          {/* Nút 3: Đặt đơn mới */}
          {sendCode && <ReorderButton sendCode={sendCode} label="Đặt đơn mới" primary />}
        </div>
      </div>
    </section>
  )
}
