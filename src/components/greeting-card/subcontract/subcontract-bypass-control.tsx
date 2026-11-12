"use client"

import React, { useState } from "react"
import { ShieldAlert, Clock, AlertTriangle, CheckCircle2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { BypassRequestModal } from "./bypass-request-modal"
import { subcontractAccessHeaders } from "@/components/greeting-card/subcontract/subcontract-access"

export interface StepBypassRequestInfo {
  status: "PENDING" | "APPROVED" | "REJECTED"
  requestedAt?: string
  reason?: string
  decisionAt?: string
  decidedBy?: string
  reviewNote?: string
}

export interface SubcontractBypassControlProps {
  orderCode: string
  branchId: string
  stepKey: "QC" | "SHIPPER" | "POD"
  stepTitle: string
  existingRequest?: StepBypassRequestInfo | null | undefined
  isCompleted: boolean
  onBypassRequested?: (() => void) | undefined
}

export function SubcontractBypassControl({
  orderCode,
  branchId,
  stepKey,
  stepTitle,
  existingRequest,
  isCompleted,
  onBypassRequested,
}: SubcontractBypassControlProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const isPending = existingRequest?.status === "PENDING"
  const isApproved = existingRequest?.status === "APPROVED"

  if (isCompleted || isApproved) return null

  async function handleSendRequest(reason: string) {
    const res = await fetch(`/api/v1/public/subcontract/${encodeURIComponent(orderCode)}/request-bypass`, {
      method: "POST",
      headers: subcontractAccessHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ branchId, step: stepKey, reason }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Không thể gửi yêu cầu xin bỏ qua")
    }
    onBypassRequested?.()
  }

  return (
    <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
      {isPending ? (
        <div className="p-3 rounded-xl bg-warning-bg border border-warning/30 flex items-start gap-2.5 text-caption">
          <Clock size={16} className="text-warning-text shrink-0 mt-0.5 animate-pulse motion-reduce:animate-none" />
          <div className="flex flex-col gap-0.5">
            <span className="font-extrabold text-warning-text">
              Đang chờ Điều phối viên chuỗi duyệt bỏ qua ({stepKey})
            </span>
            <span className="text-text-muted">
              Lý do gửi: &ldquo;{existingRequest?.reason}&rdquo;
            </span>
            <span className="text-caption text-danger font-medium mt-1">
              * Lưu ý: Khi được duyệt, chi nhánh sẽ bị trừ 2 điểm chất lượng KPI theo quy chế chuỗi.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-text-muted">
            Gặp sự cố thiết bị hoặc khách nhận gấp?
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-8 text-caption font-bold border-dashed border-warning/50 text-warning-text hover:bg-warning-bg gap-1.5 cursor-pointer"
          >
            <ShieldAlert size={13} />
            Xin bỏ qua {stepKey}
          </Button>
        </div>
      )}

      <BypassRequestModal
        isOpen={modalOpen}
        stepTitle={stepTitle}
        stepKey={stepKey}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSendRequest}
      />
    </div>
  )
}
