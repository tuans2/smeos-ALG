"use client"

import React from "react"
import { CheckCircle2, ArrowRight } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"

export interface BrochurePaymentConfirmedBannerProps {
  isPaymentConfirmed: boolean
  isOrderAccepted: boolean
  depositOnly: boolean
  onGoToTracking: () => void
}

export function BrochurePaymentConfirmedBanner({
  isPaymentConfirmed,
  isOrderAccepted,
  depositOnly,
  onGoToTracking,
}: BrochurePaymentConfirmedBannerProps) {
  const { ti } = useI18n()

  const title =
    isPaymentConfirmed && isOrderAccepted
      ? depositOnly
        ? "Đã nhận tiền cọc & Tiếp nhận đơn!"
        : "Đã thanh toán & Tiếp nhận đơn!"
      : isPaymentConfirmed
      ? depositOnly
        ? "Đã nhận tiền cọc thành công!"
        : "Chuyển khoản thành công!"
      : "Đã xác nhận nhận đơn!"

  const subtitle =
    isPaymentConfirmed && isOrderAccepted
      ? `Cửa hàng đã xác nhận thanh toán và xưởng đang tiến hành ${ti("makerAction").toLowerCase()}.`
      : isPaymentConfirmed
      ? "Cửa hàng sẽ xác nhận đơn hàng trong vòng 30’"
      : `Xưởng đã tiếp nhận đơn và đang chuẩn bị ${ti("makerAction").toLowerCase()}`

  const description =
    isPaymentConfirmed && isOrderAccepted
      ? `Bạn có thể theo dõi tiến độ ${ti("makerAction").toLowerCase()} và ${ti("completedProductPhoto").toLowerCase()} theo thời gian thực.`
      : isPaymentConfirmed
      ? `Bộ phận Điều phối đang kiểm tra để xác nhận tiếp nhận đơn. Nếu tiệm không thể đáp ứng ${ti("sampleProduct").toLowerCase()} hoặc lịch giao, cửa hàng sẽ liên hệ và hoàn tiền 100% cho bạn.${
          depositOnly ? ` Phần còn lại bạn sẽ thanh toán sau khi duyệt ${ti("completedProductPhoto").toLowerCase()}.` : ""
        }`
      : `Bộ phận kế toán đang hoàn tất đối soát chuyển khoản. Bạn có thể theo dõi tiến độ ${ti("makerAction").toLowerCase()} ngay bây giờ.`

  return (
    <div className="w-full flex flex-col gap-3.5">
      <div className="p-4 rounded-2xl bg-success-bg border border-success/30 text-success flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center">
          <CheckCircle2 size={28} />
        </div>
        <div className="text-center">
          <p className="text-title-sm font-extrabold text-success">{title}</p>
          <p className="text-body-sm text-text font-semibold mt-1">{subtitle}</p>
          <p className="text-caption text-text-muted mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        onClick={onGoToTracking}
        className="w-full h-12 font-extrabold text-body flex items-center justify-center gap-2 rounded-xl shadow-md bg-primary hover:bg-primary-dark text-white cursor-pointer"
      >
        <span>Theo dõi tiến độ Đơn hàng</span>
        <ArrowRight size={18} />
      </Button>
    </div>
  )
}
