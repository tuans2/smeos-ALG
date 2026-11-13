"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Sparkles, ShieldCheck } from "@/components/ui/icons"
import {
  SubcontractSpotlightStepper,
  type SubcontractStepId,
} from "./subcontract-spotlight-stepper"
import { SubcontractStepClaim } from "./subcontract-step-claim"
import { SubcontractStepQc } from "./subcontract-step-qc"
import { SubcontractStepShipper } from "./subcontract-step-shipper"
import { SubcontractStepProof } from "./subcontract-step-proof"
import {
  getGraceSecondsRemaining,
  type SubcontractDispatchStatus,
} from "@/modules/greeting-card/domain/subcontract-order"
import type { SubcontractCardProduct } from "./subcontract-card-types"
import type { DeliveryProofInfo } from "./subcontract-card-types"

import type { StepMilestoneDeadlines } from "@/modules/greeting-card/domain/subcontract-countdown"
import type { StepBypassRequestInfo } from "./subcontract-bypass-control"

export interface SubcontractSpotlightShellProps {
  orderCode: string
  branchId: string
  branchName: string
  product: SubcontractCardProduct
  deliveryAddress: string
  deliveryTime: string
  deliveryTimestampMs?: number | null | undefined
  stepDeadlines?: StepMilestoneDeadlines | null | undefined
  recipientName?: string | null | undefined
  recipientPhone?: string | null | undefined
  isPhoneMasked?: boolean | undefined
  cardMessage?: string | null | undefined
  specialNotes?: string | null | undefined
  subcontractPriceVnd: number
  /** Khoản trừ phí (giao trễ, khiếu nại) và số thực nhận — chỉ có với chi nhánh đang làm đơn. */
  craftFeeDeductions?: Array<{ amountVnd: number; reason: string }> | undefined
  craftFeePayableVnd?: number | undefined
  dispatchStatus: SubcontractDispatchStatus
  claimedByBranchId?: string | null | undefined
  claimedBranchName?: string | null | undefined
  graceExpiresAt?: string | null | undefined
  productionStatus?: string | null | undefined
  qcPhotos?: string[] | undefined
  deliveryStatus?: string | null | undefined
  orderStatus?: string | null | undefined
  shipperInfo?: {
    shipperName: string
    shipperPhone: string
    submittedAt: string
  } | null | undefined
  deliveryProof?: DeliveryProofInfo | null | undefined
  bypassRequests?: Record<string, StepBypassRequestInfo> | null | undefined
  initialStep?: SubcontractStepId | undefined
  onClaim: () => Promise<void>
  onCancelClaim: () => Promise<void>
  onCommitEarly?: (() => Promise<void>) | undefined
  onQcUploaded?: (() => void) | undefined
  onShipperSubmitted?: (() => void) | undefined
  onDelivered?: (() => void) | undefined
  onBypassRequested?: (() => void) | undefined
}

export function SubcontractSpotlightShell({
  orderCode,
  branchId,
  branchName,
  product,
  deliveryAddress,
  deliveryTime,
  deliveryTimestampMs,
  stepDeadlines,
  recipientName,
  recipientPhone,
  isPhoneMasked,
  cardMessage,
  specialNotes,
  subcontractPriceVnd,
  craftFeeDeductions = [],
  craftFeePayableVnd,
  dispatchStatus,
  claimedByBranchId,
  claimedBranchName,
  graceExpiresAt,
  productionStatus,
  qcPhotos = [],
  deliveryStatus,
  orderStatus,
  shipperInfo,
  deliveryProof,
  bypassRequests,
  initialStep,
  onClaim,
  onCancelClaim,
  onCommitEarly,
  onQcUploaded,
  onShipperSubmitted,
  onDelivered,
  onBypassRequested,
}: SubcontractSpotlightShellProps) {
  const isMyClaim = claimedByBranchId === branchId
  const isClaimedByOther =
    (dispatchStatus === "CLAIMED_GRACE" || dispatchStatus === "COMMITTED") && !isMyClaim

  const [graceSeconds, setGraceSeconds] = useState(() =>
    getGraceSecondsRemaining(graceExpiresAt ?? null)
  )

  useEffect(() => {
    if (dispatchStatus !== "CLAIMED_GRACE" || !graceExpiresAt) return

    const timer = setInterval(() => {
      const remaining = getGraceSecondsRemaining(graceExpiresAt)
      setGraceSeconds(remaining)
      if (remaining <= 0) clearInterval(timer)
    }, 1000)

    return () => clearInterval(timer)
  }, [dispatchStatus, graceExpiresAt])

  // Xác định trạng thái hoàn thành và mở khóa của 4 bước (có tính đến bypass đã duyệt)
  const isQcBypassed = bypassRequests?.QC?.status === "APPROVED"
  const isShipperBypassed = bypassRequests?.SHIPPER?.status === "APPROVED"
  const isPodBypassed = bypassRequests?.POD?.status === "APPROVED"

  const isStep1Completed = dispatchStatus === "COMMITTED"
  const isStep2Completed =
    productionStatus === "READY" ||
    (Boolean(qcPhotos) && qcPhotos.length > 0) ||
    isQcBypassed
  const isStep3Completed =
    Boolean(shipperInfo) ||
    deliveryStatus === "DELIVERING" ||
    deliveryStatus === "DELIVERED" ||
    isShipperBypassed
  const isStep4Completed =
    deliveryStatus === "DELIVERED" ||
    orderStatus === "COMPLETED" ||
    Boolean(deliveryProof?.deliveredAt) ||
    isPodBypassed

  const completedSteps = useMemo<SubcontractStepId[]>(() => {
    const list: SubcontractStepId[] = []
    if (isStep1Completed) list.push(1)
    if (isStep2Completed) list.push(2)
    if (isStep3Completed) list.push(3)
    if (isStep4Completed) list.push(4)
    return list
  }, [isStep1Completed, isStep2Completed, isStep3Completed, isStep4Completed])

  const unlockedSteps = useMemo<SubcontractStepId[]>(() => {
    const list: SubcontractStepId[] = [1]
    if (isStep1Completed) list.push(2)
    if (isStep1Completed && isStep2Completed) list.push(3)
    if (isStep1Completed && isStep2Completed && isStep3Completed) list.push(4)
    return list
  }, [isStep1Completed, isStep2Completed, isStep3Completed])

  // Tự động gom tiêu điểm vào bước hiện tại cần thao tác
  const defaultStep = useMemo<SubcontractStepId>(() => {
    if (initialStep) return initialStep
    if (isStep4Completed) return 4
    if (isStep3Completed) return 4
    if (isStep2Completed) return 3
    if (isStep1Completed) return 2
    return 1
  }, [initialStep, isStep1Completed, isStep2Completed, isStep3Completed, isStep4Completed])

  const [activeStep, setActiveStep] = useState<SubcontractStepId>(defaultStep)

  // Cập nhật activeStep khi trạng thái bên ngoài thay đổi (ví dụ sau khi chốt đơn hoặc tải ảnh) —
  // điều chỉnh ngay lúc render thay vì setState trong effect
  const [syncedDefaultStep, setSyncedDefaultStep] = useState<SubcontractStepId>(defaultStep)
  if (syncedDefaultStep !== defaultStep) {
    setSyncedDefaultStep(defaultStep)
    setActiveStep(defaultStep)
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-surface rounded-2xl border border-border shadow-md overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="bg-primary/10 border-b border-border p-4 flex items-center justify-between">
        <div>
          <span className="text-caption font-bold uppercase tracking-wider text-primary-dark flex items-center gap-1">
            <Sparkles size={13} /> Thẻ Gia Công Đơn Hàng Chuỗi
          </span>
          <h2 className="text-title font-extrabold text-text">
            Đơn hàng #{orderCode}
          </h2>
        </div>
        <div className="text-right">
          <span className="text-caption font-semibold text-text block">Thù lao gia công</span>
          <span className="text-title font-black text-primary-dark">
            {subcontractPriceVnd.toLocaleString("vi-VN")} đ
          </span>
          {craftFeeDeductions.map((d) => (
            <span key={d.reason} className="text-caption text-danger block">
              − {d.amountVnd.toLocaleString("vi-VN")} đ ({d.reason})
            </span>
          ))}
          {craftFeeDeductions.length > 0 && craftFeePayableVnd !== undefined && (
            <span className="text-caption font-bold text-text block">Thực nhận: {craftFeePayableVnd.toLocaleString("vi-VN")} đ</span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Stepper điều hướng 4 bước theo chuẩn Spotlight */}
        <SubcontractSpotlightStepper
          activeStep={activeStep}
          completedSteps={completedSteps}
          unlockedSteps={unlockedSteps}
          deadlines={{
            1: stepDeadlines?.step1GraceExpiresAt,
            2: stepDeadlines?.step2QcDeadlineMs,
            3: stepDeadlines?.step3ShipperDeadlineMs,
            4: stepDeadlines?.step4DeliveryDeadlineMs,
          }}
          onSelectStep={(step) => setActiveStep(step)}
        />

        {/* Khối Bước 1: Tiếp nhận & Chốt sản xuất */}
        <SubcontractStepClaim
          product={product}
          deliveryAddress={deliveryAddress}
          deliveryTime={deliveryTime}
          cardMessage={cardMessage}
          specialNotes={specialNotes}
          subcontractPriceVnd={subcontractPriceVnd}
          dispatchStatus={dispatchStatus}
          isMyClaim={isMyClaim}
          isClaimedByOther={isClaimedByOther}
          claimedBranchName={claimedBranchName}
          graceSeconds={graceSeconds}
          isActive={activeStep === 1}
          isCompleted={isStep1Completed}
          onActivate={() => setActiveStep(1)}
          onClaim={onClaim}
          onCancelClaim={onCancelClaim}
          onCommitEarly={onCommitEarly}
        />

        {/* Khối Bước 2: Chế tác & Kiểm định chất lượng (QC) */}
        <SubcontractStepQc
          orderCode={orderCode}
          branchId={branchId}
          recipientName={recipientName}
          recipientPhone={recipientPhone}
          isPhoneMasked={isPhoneMasked}
          qcPhotos={qcPhotos}
          productionStatus={productionStatus}
          deadlineMs={stepDeadlines?.step2QcDeadlineMs}
          bypassRequest={bypassRequests?.QC}
          isActive={activeStep === 2}
          isCompleted={isStep2Completed}
          isUnlocked={unlockedSteps.includes(2)}
          onActivate={() => setActiveStep(2)}
          onQcUploaded={onQcUploaded}
          onBypassRequested={onBypassRequested}
        />

        {/* Khối Bước 3: Bàn giao Shipper & Vận chuyển */}
        <SubcontractStepShipper
          orderCode={orderCode}
          branchId={branchId}
          existingShipperInfo={shipperInfo}
          deliveryStatus={deliveryStatus}
          deadlineMs={stepDeadlines?.step3ShipperDeadlineMs}
          bypassRequest={bypassRequests?.SHIPPER}
          isActive={activeStep === 3}
          isCompleted={isStep3Completed}
          isUnlocked={unlockedSteps.includes(3)}
          onActivate={() => setActiveStep(3)}
          onSubmitted={onShipperSubmitted}
          onBypassRequested={onBypassRequested}
        />

        {/* Khối Bước 4: Bằng chứng giao hàng & Nghiệm thu (POD) */}
        <SubcontractStepProof
          orderCode={orderCode}
          branchId={branchId}
          existingDeliveryProof={deliveryProof}
          deliveryStatus={deliveryStatus}
          orderStatus={orderStatus}
          subcontractPriceVnd={subcontractPriceVnd}
          deadlineMs={stepDeadlines?.step4DeliveryDeadlineMs}
          bypassRequest={bypassRequests?.POD}
          isActive={activeStep === 4}
          isCompleted={isStep4Completed}
          isUnlocked={unlockedSteps.includes(4)}
          onActivate={() => setActiveStep(4)}
          onDelivered={onDelivered}
          onBypassRequested={onBypassRequested}
        />
      </div>
    </div>
  )
}
