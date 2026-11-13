"use client"

import React from "react"
import type { PaymentProofAnalysisResult } from "@/modules/greeting-card/domain/payment-proof-analysis"
import { CheckCircle2, AlertTriangle, AlertCircle, Clock } from "@/components/ui/icons"

export interface PaymentProofBadgeProps {
  analysis?: PaymentProofAnalysisResult | null | undefined
  hasProofUrl: boolean
  className?: string
}

/**
 * Smart Badge hiển thị trạng thái thẩm định bill ngân hàng qua AI Vision.
 * Tuân thủ quy chuẩn UX ALG (Token màu ngữ nghĩa, cỡ chữ text-caption, không jargon).
 */
export function PaymentProofBadge({
  analysis,
  hasProofUrl,
  className = "",
}: PaymentProofBadgeProps) {
  if (!hasProofUrl) return null

  // Chưa có kết quả AI: tiệm tắt "AI đọc bill" (mặc định) hoặc đang xử lý — không ghi "đang đọc" vì có thể
  // không bao giờ có kết quả (Đợt 4, D4-14)
  if (!analysis) {
    return (
      <span
        title="Có ảnh bill — chưa có kết quả đọc tự động, xem ảnh để đối chiếu"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-surface-alt text-text-muted border border-border ${className}`}
      >
        <Clock size={12} className="text-text-muted" aria-hidden="true" />
        <span>Có ảnh bill</span>
      </span>
    )
  }

  const { status, amountDifferenceVnd, extracted } = analysis

  if (status === "MATCHED") {
    return (
      <span
        title={`Đã khớp 100%: ${extracted.bankName || "Ngân hàng"} - ${extracted.amountVnd.toLocaleString("vi-VN")} đ`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-success-bg text-success border border-success/30 ${className}`}
      >
        <CheckCircle2 size={12} className="text-success" aria-hidden="true" />
        <span>Khớp bill ({extracted.amountVnd.toLocaleString("vi-VN")} đ)</span>
      </span>
    )
  }

  if (status === "AMOUNT_MISMATCH") {
    const isUnder = amountDifferenceVnd < 0
    return (
      <span
        title={`Lệch tiền: Khách chuyển ${extracted.amountVnd.toLocaleString("vi-VN")} đ (${isUnder ? "Thiếu" : "Thừa"} ${Math.abs(amountDifferenceVnd).toLocaleString("vi-VN")} đ)`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-warning-bg text-warning-text border border-warning/40 ${className}`}
      >
        <AlertTriangle size={12} className="text-warning-text" aria-hidden="true" />
        <span>
          {isUnder ? `Thiếu ${Math.abs(amountDifferenceVnd).toLocaleString("vi-VN")} đ` : `Thừa ${amountDifferenceVnd.toLocaleString("vi-VN")} đ`}
        </span>
      </span>
    )
  }

  if (status === "ACCOUNT_MISMATCH") {
    return (
      <span
        title={`Sai số tài khoản nhận: ${extracted.receiverAccountNumber || "Không rõ"}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-danger-bg text-danger border border-danger/40 ${className}`}
      >
        <AlertCircle size={12} className="text-danger" aria-hidden="true" />
        <span>Sai STK nhận</span>
      </span>
    )
  }

  if (status === "SUSPICIOUS") {
    return (
      <span
        title="Giao dịch chưa hoàn tất hoặc bill có dấu hiệu bất thường"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-danger-bg text-danger border border-danger/40 ${className}`}
      >
        <AlertCircle size={12} className="text-danger" aria-hidden="true" />
        <span>Bill nghi vấn</span>
      </span>
    )
  }

  return (
    <span
      title="Không nhận diện được nội dung chữ/số trên ảnh"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-surface-alt text-text-muted border border-border ${className}`}
    >
      <span>Ảnh mờ / Không rõ</span>
    </span>
  )
}
