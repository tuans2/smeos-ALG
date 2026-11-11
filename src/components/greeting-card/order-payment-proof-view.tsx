"use client"

import React from "react"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import type { PaymentProofAnalysisResult } from "@/modules/greeting-card/domain/payment-proof-analysis"
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, ExternalLink, Clock } from "@/components/ui/icons"

interface OrderPaymentProofViewProps {
  paymentProofUrl?: string | null | undefined
  paymentProofAnalysis?: PaymentProofAnalysisResult | null | undefined
  paymentProofBalanceUrl?: string | null | undefined
  paymentProofBalanceAnalysis?: PaymentProofAnalysisResult | null | undefined
}

function ProofVerificationCard({
  title,
  url,
  analysis,
}: {
  title: string
  url: string
  analysis?: PaymentProofAnalysisResult | null | undefined
}) {
  const ext = analysis?.extracted

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl border border-border bg-surface-muted/60">
      {/* Thumbnail ảnh bill */}
      <div className="flex flex-col gap-1 items-start shrink-0">
        <span className="text-caption font-bold text-text-muted">{title}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative h-24 w-20 rounded-xl border border-border overflow-hidden bg-surface hover:opacity-95 transition-opacity block group cursor-pointer shadow-sm"
        >
          <FlowerImage
            src={url}
            alt={title}
            className="h-24 w-20 object-cover"
            sizes="80px"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-caption font-bold gap-0.5">
            <ExternalLink size={14} />
            <span>Phóng to</span>
          </div>
        </a>
      </div>

      {/* Thông tin thẩm định từ AI Vision */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={11} className="text-primary" />
              <span>Thẩm định AI</span>
            </span>

            {analysis?.status === "MATCHED" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-success-bg text-success border border-success/30">
                <CheckCircle2 size={11} />
                <span>Khớp hoàn toàn</span>
              </span>
            )}
            {analysis?.status === "AMOUNT_MISMATCH" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-warning-bg text-warning-text border border-warning/40">
                <AlertTriangle size={11} />
                <span>Lệch số tiền</span>
              </span>
            )}
            {analysis?.status === "ACCOUNT_MISMATCH" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-danger-bg text-danger border border-danger/40">
                <AlertCircle size={11} />
                <span>Sai số tài khoản</span>
              </span>
            )}
            {analysis?.status === "SUSPICIOUS" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-danger-bg text-danger border border-danger/40">
                <AlertCircle size={11} />
                <span>Nghi vấn</span>
              </span>
            )}
          </div>

          {/* Ba nhánh hiển thị rõ ràng — không lấp lửng */}
          {!analysis && (
            // Chưa có kết quả AI (đang xử lý ngầm — thường chỉ vài giây sau khi khách tải lên)
            <p className="text-caption text-text-muted flex items-center gap-1">
              <Clock size={11} className="animate-spin motion-reduce:animate-none shrink-0" />
              <span>Đang đọc dữ liệu biên lai...</span>
            </p>
          )}

          {analysis?.status === "UNREADABLE" && (
            // Không đối chiếu tự động được (AI không đọc được ảnh, hoặc không chạy vì ảnh chứa dữ liệu cá nhân)
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-warning-bg border border-warning/30">
              <AlertTriangle size={12} className="text-warning-text shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-caption font-bold text-warning-text">Chưa đối chiếu tự động</span>
                <span className="text-caption text-text-muted leading-relaxed">
                  Hệ thống chưa đọc được số liệu trên ảnh này. Vui lòng xem ảnh và đối chiếu với sao kê ngân hàng trước khi xác nhận.
                </span>
              </div>
            </div>
          )}

          {ext && analysis?.status !== "UNREADABLE" && (
            // Đã đọc được số liệu — hiển thị chi tiết
            <div className="flex flex-col gap-1 text-caption">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-text-muted">Tiền trên bill:</span>
                <span className="font-extrabold text-text text-body-sm">
                  {ext.amountVnd.toLocaleString("vi-VN")} đ
                </span>
              </div>
              {ext.bankName && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-text-muted">Ngân hàng:</span>
                  <span className="font-semibold text-text truncate">{ext.bankName}</span>
                </div>
              )}
              {ext.receiverAccountNumber && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-text-muted">Tài khoản nhận:</span>
                  <span className="font-mono font-bold text-text">{ext.receiverAccountNumber}</span>
                </div>
              )}
              {ext.transactionCode && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-text-muted">Mã GD:</span>
                  <span className="font-mono text-text-muted truncate max-w-[150px]">{ext.transactionCode}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cảnh báo nếu có */}
        {analysis?.reasons && analysis.reasons.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-border/40">
            <ul className="text-caption text-danger flex flex-col gap-0.5 font-medium">
              {analysis.reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export function OrderPaymentProofView({
  paymentProofUrl,
  paymentProofAnalysis,
  paymentProofBalanceUrl,
  paymentProofBalanceAnalysis,
}: OrderPaymentProofViewProps) {
  if (!paymentProofUrl && !paymentProofBalanceUrl) return null

  return (
    <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
      <span className="text-caption font-bold text-text-muted flex items-center gap-1">
        📸 Biên nhận chuyển khoản của khách hàng:
      </span>
      <div className="flex flex-col gap-2">
        {paymentProofUrl && (
          <ProofVerificationCard
            title="Biên lai Đợt 1"
            url={paymentProofUrl}
            analysis={paymentProofAnalysis}
          />
        )}
        {paymentProofBalanceUrl && (
          <ProofVerificationCard
            title="Biên lai Đợt 2"
            url={paymentProofBalanceUrl}
            analysis={paymentProofBalanceAnalysis}
          />
        )}
      </div>
    </div>
  )
}
