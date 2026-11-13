"use client"

import React from "react"
import { XCircle } from "@/components/ui/icons"
import { vnDeadlineLabel } from "@/modules/greeting-card/domain/customer-cancellation-notice"

export interface CancellationNoticeData {
  cancelledAt: string
  contactDeadline: string
  /** 0 = huỷ không hoàn tiền → không nhắc tới hoàn tiền */
  refundVnd: number
  /** Khách đã báo chuyển khoản nhưng tiệm chưa ghi nhận → hứa hoàn tiền, chưa nêu số */
  refundToConfirm?: boolean | undefined
}

/**
 * Đơn bị huỷ vì tiệm không thực hiện được (Điều phối không nhận / huỷ giữa chừng, đã được duyệt):
 * báo khách lý do, hạn nhân viên liên hệ và hoàn tiền (nếu có) — PO 16/10/2026.
 */
export function OrderCancelledNotice({ orderCode, notice }: { orderCode: string; notice: CancellationNoticeData }) {
  const deadline = vnDeadlineLabel(notice.contactDeadline)
  return (
    <section role="alert" aria-labelledby="order-cancelled-title" className="w-full flex flex-col items-center gap-2 rounded-2xl border border-danger/30 bg-danger-bg p-5 text-center">
      <XCircle size={32} className="text-danger" aria-hidden="true" />
      <h2 id="order-cancelled-title" className="text-title-sm font-extrabold text-danger">
        Rất tiếc, cửa hàng không thể thực hiện đơn #{orderCode}
      </h2>
      <p className="text-body-sm text-text">Cửa hàng đang quá tải nên không thực hiện được đơn hàng của bạn.</p>
      <p className="text-body-sm text-text">
        {notice.refundVnd > 0 ? (
          <>
            Nhân viên cửa hàng sẽ liên hệ và hoàn <strong>{notice.refundVnd.toLocaleString("vi-VN")}đ</strong> cho bạn trước{" "}
            <strong>{deadline}</strong>.
          </>
        ) : notice.refundToConfirm ? (
          <>
            Nhân viên cửa hàng sẽ liên hệ và hoàn tiền cho bạn trước <strong>{deadline}</strong>.
          </>
        ) : (
          <>
            Nhân viên cửa hàng sẽ liên hệ với bạn trước <strong>{deadline}</strong>.
          </>
        )}
      </p>
      <p className="text-body-sm text-text-muted">Cần thêm thông tin, bạn vui lòng liên hệ nhân viên đã tư vấn cho bạn.</p>
    </section>
  )
}
