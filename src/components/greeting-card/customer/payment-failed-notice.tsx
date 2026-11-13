"use client"

import React from "react"
import { XCircle } from "@/components/ui/icons"

/**
 * Đơn không hoàn thành: hết hạn thanh toán mà cửa hàng chưa nhận được chuyển khoản và khách chưa
 * bấm "Tôi đã chuyển khoản" → thanh toán thất bại, đơn tự huỷ. Kêu gọi khách đặt lại đơn mới.
 */
export function PaymentFailedNotice({ orderCode, cta }: { orderCode: string; cta?: React.ReactNode }) {
  return (
    <section role="status" aria-labelledby="payment-failed-title" className="w-full flex flex-col items-center gap-2 rounded-2xl border border-danger/30 bg-danger-bg p-5 text-center">
      <XCircle size={32} className="text-danger" aria-hidden="true" />
      <h2 id="payment-failed-title" className="text-title-sm font-extrabold text-danger">Đơn hàng không hoàn thành</h2>
      <p className="text-body-sm text-text">
        Đơn #{orderCode} đã hết thời gian thanh toán mà cửa hàng chưa nhận được chuyển khoản, nên đơn đã được huỷ.
      </p>
      <p className="text-body-sm text-text-muted">
        Bạn vẫn muốn đặt hoa? Hãy đặt lại một đơn mới — nếu bạn đã chuyển khoản cho đơn này, vui lòng liên hệ cửa hàng để được hỗ trợ.
      </p>
      {cta}
    </section>
  )
}
