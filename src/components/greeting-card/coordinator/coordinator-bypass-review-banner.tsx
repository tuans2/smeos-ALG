"use client"

/**
 * coordinator-bypass-review-banner.tsx
 *
 * Khối hiển thị thông báo khẩn & phê duyệt trực tiếp cho Điều phối viên
 * khi chi nhánh yêu cầu bỏ qua ảnh/bằng chứng (QC, SHIPPER, POD) do sự cố bất khả kháng.
 * Có cảnh báo rõ ràng về việc trừ điểm hợp tác (-2 Quality Score KPI) của chi nhánh khi duyệt.
 */

import React, { useState } from "react"
import { AlertTriangle, CheckCircle2, XCircle, Loader2, ShieldAlert } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

export interface StepBypassRecord {
  requestedAt?: string
  requestedByBranchId?: string
  requestedByBranchName?: string
  reason?: string
  status?: "PENDING" | "APPROVED" | "REJECTED"
  decisionAt?: string
  decidedBy?: string
  reviewNote?: string
}

interface CoordinatorBypassReviewBannerProps {
  orderId: string
  orderCode: string
  bypassRequests?: Record<string, StepBypassRecord> | null
  onDecisionComplete: () => void
}

const STEP_LABELS: Record<string, string> = {
  QC: "Bước 2 — Ảnh thành phẩm (QC)",
  SHIPPER: "Bước 3 — Thông tin Shipper",
  POD: "Bước 4 — Ảnh giao hàng",
}

export function CoordinatorBypassReviewBanner({
  orderId,
  orderCode,
  bypassRequests,
  onDecisionComplete,
}: CoordinatorBypassReviewBannerProps) {
  const [submittingStep, setSubmittingStep] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!bypassRequests) return null

  // Tìm các yêu cầu đang PENDING
  const pendingEntries = Object.entries(bypassRequests).filter(
    ([, req]) => req && req.status === "PENDING"
  )

  if (pendingEntries.length === 0) return null

  async function handleDecision(step: string, decision: "APPROVE" | "REJECT") {
    setSubmittingStep(step)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/v1/coordinator/orders/${orderId}/approve-bypass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          decision,
          reviewNote:
            decision === "APPROVE"
              ? "Điều phối đã duyệt bỏ qua do sự cố bất khả kháng"
              : "Điều phối từ chối yêu cầu bỏ qua, yêu cầu thực hiện đúng quy trình",
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error?.message || data?.message || "Không thể xử lý yêu cầu"
        throw new Error(msg)
      }

      onDecisionComplete()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setSubmittingStep(null)
    }
  }

  return (
    <div className="w-full flex flex-col gap-2 p-3.5 rounded-xl bg-warning-bg border-2 border-warning-border text-text">
      <div className="flex items-center gap-2 text-warning-text font-bold text-body-sm">
        <ShieldAlert size={18} className="text-warning-text animate-pulse motion-reduce:animate-none shrink-0" />
        <span>Yêu Cầu Bỏ Qua Bằng Chứng Cần Phê Duyệt</span>
      </div>

      {errorMessage && (
        <div className="p-2 text-caption bg-danger/10 border border-danger/20 text-danger rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {pendingEntries.map(([stepKey, req]) => {
          const stepTitle = STEP_LABELS[stepKey] || stepKey
          const isLoading = submittingStep === stepKey

          return (
            <div
              key={stepKey}
              className="p-3 rounded-lg bg-surface border border-warning-border shadow-xs flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-caption font-bold uppercase tracking-wider text-warning-text">
                    {stepTitle}
                  </span>
                  <div className="text-caption text-text-muted mt-0.5">
                    Chi nhánh:{" "}
                    <strong className="text-text">
                      {req.requestedByBranchName || req.requestedByBranchId || "Chi nhánh gia công"}
                    </strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-caption font-extrabold rounded-full bg-warning-bg text-warning-text shrink-0">
                  CHỜ DUYỆT
                </span>
              </div>

              <div className="p-2 rounded bg-surface-alt text-caption text-text-muted italic border-l-2 border-warning">
                &ldquo;{req.reason || "Lý do bất khả kháng"}&rdquo;
              </div>

              {/* Cảnh báo KPI hợp tác */}
              <div className="flex items-center gap-1.5 text-caption text-danger font-semibold bg-danger/5 p-1.5 rounded">
                <AlertTriangle size={13} className="shrink-0" />
                <span>
                  Lưu ý: Nếu duyệt, chi nhánh sẽ bị trừ 2 điểm chất lượng KPI và giảm ưu tiên chia đơn!
                </span>
              </div>

              {/* Nút hành động của Điều phối */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleDecision(stepKey, "REJECT")}
                  className="h-8 px-3 text-caption text-danger hover:bg-danger/10 border-danger/30"
                >
                  {isLoading ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <XCircle size={13} />}
                  Từ chối
                </Button>
                <Button
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleDecision(stepKey, "APPROVE")}
                  className="h-8 px-3 text-caption bg-warning hover:bg-warning/90 text-white font-bold"
                >
                  {isLoading ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={13} />}
                  Chấp thuận Bỏ qua
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
