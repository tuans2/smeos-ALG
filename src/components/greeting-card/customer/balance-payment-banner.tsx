"use client"

import React from "react"
import { Banknote, ArrowDownCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

export interface BalancePaymentBannerProps {
  totalVnd: number
  paidVnd: number
  productionStatus: string
  deliveryStatus?: string | undefined
  photoApprovalStatus?: "NONE" | "PENDING" | "APPROVED" | "AUTO_APPROVED" | undefined
  hasProductPhotos: boolean
  onScrollToPayment?: () => void
}

export function BalancePaymentBanner({
  totalVnd,
  paidVnd,
  productionStatus,
  deliveryStatus,
  photoApprovalStatus,
  hasProductPhotos,
  onScrollToPayment,
}: BalancePaymentBannerProps) {
  // Hiển thị khi đơn chưa thanh toán đủ 100% và hoa đã xong hoặc đang giao
  const isUnpaid = totalVnd > 0 && paidVnd < totalVnd
  const isReadyOrDelivering =
    productionStatus === "READY" ||
    productionStatus === "DONE" ||
    deliveryStatus === "DELIVERING" ||
    deliveryStatus === "DISPATCHED"

  if (!isUnpaid || !isReadyOrDelivering) return null

  const remainingVnd = totalVnd - paidVnd
  const isPendingApproval = hasProductPhotos && photoApprovalStatus === "PENDING"
  const isDelivering = deliveryStatus === "DELIVERING" || deliveryStatus === "DISPATCHED"

  return (
    <div
      role="region"
      aria-label="Thông báo thanh toán số tiền còn lại"
      className="p-4 rounded-2xl border-2 border-dashed border-warning/60 bg-warning-bg/90 flex flex-col gap-3 transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-warning/20 text-warning-text">
            <Banknote size={20} aria-hidden="true" />
          </div>
          <span className="text-body font-extrabold text-text">
            {paidVnd > 0 ? "Yêu cầu thanh toán số tiền còn lại" : "Yêu cầu thanh toán đơn hàng"}
          </span>
        </div>
        <span className="text-caption font-bold px-2.5 py-0.5 rounded-full bg-warning/20 text-warning-text shrink-0">
          {paidVnd > 0 ? "Đơn đặt cọc" : "Chờ thanh toán"}
        </span>
      </div>

      <p className="text-body-sm text-text leading-relaxed">
        {paidVnd > 0 ? (
          isPendingApproval ? (
            <>
              Hoa của bạn đã cắm xong hoàn thiện! Vui lòng kiểm tra ảnh hoa bên dưới và hoàn tất thanh toán phần còn lại{" "}
              <strong className="text-text font-extrabold">
                {remainingVnd.toLocaleString("vi-VN")} đ
              </strong>{" "}
              để cửa hàng tiến hành bàn giao cho tài xế giao hoa.
            </>
          ) : isDelivering ? (
            <>
              Đơn hoa của bạn đang trên đường giao! Vui lòng thanh toán số tiền còn lại{" "}
              <strong className="text-text font-extrabold">
                {remainingVnd.toLocaleString("vi-VN")} đ
              </strong>{" "}
              qua mã QR bên dưới hoặc cho tài xế khi nhận hoa.
            </>
          ) : !hasProductPhotos ? (
            <>
              Hoa của bạn đã cắm xong và đang được chuẩn bị giao gấp theo yêu cầu! Vui lòng thanh toán số tiền còn lại{" "}
              <strong className="text-text font-extrabold">
                {remainingVnd.toLocaleString("vi-VN")} đ
              </strong>{" "}
              để tài xế lên đường giao hoa ngay.
            </>
          ) : (
            <>
              Bình hoa hoàn thiện đã sẵn sàng giao! Vui lòng thanh toán phần còn lại{" "}
              <strong className="text-text font-extrabold">
                {remainingVnd.toLocaleString("vi-VN")} đ
              </strong>{" "}
              để hoàn tất đơn hàng.
            </>
          )
        ) : (
          <>
            Đơn hoa của bạn đang được tiến hành! Vui lòng chuyển khoản thanh toán hoặc đặt cọc{" "}
            <strong className="text-text font-extrabold">
              {remainingVnd.toLocaleString("vi-VN")} đ
            </strong>{" "}
            qua mã QR bên dưới để xác nhận hoàn tất.
          </>
        )}
      </p>

      {onScrollToPayment && (
        <div className="pt-1 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onScrollToPayment}
            className="h-9 gap-1.5 font-bold border-warning/50 text-warning-text hover:bg-warning/10"
          >
            <ArrowDownCircle size={15} aria-hidden="true" />
            <span>Xem mã QR & Thanh toán ngay</span>
          </Button>
        </div>
      )}
    </div>
  )
}
