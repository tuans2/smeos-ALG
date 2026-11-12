"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import {
  CheckCircle2,
  UploadCloud,
  ImageIcon,
  Loader2,
  Trash2,
  FileCheck2,
  Lock,
  ChevronDown,
  Clock,
  Sparkles,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { PhotoSourcePicker } from "./photo-source-picker"
import { cn } from "@/lib/utils"
import type { DeliveryProofInfo } from "./subcontract-card-types"
import { SubcontractPodPreview } from "./subcontract-pod-preview"
import { SubcontractPodSuccess } from "./subcontract-pod-success"
import { useStepCountdown } from "./use-step-countdown"
import { StepCountdownBadge } from "./step-countdown-badge"

import { SubcontractBypassControl, type StepBypassRequestInfo } from "./subcontract-bypass-control"
import { subcontractAccessHeaders } from "@/components/greeting-card/subcontract/subcontract-access"

export interface SubcontractStepProofProps {
  orderCode: string
  branchId: string
  existingDeliveryProof?: DeliveryProofInfo | null | undefined
  deliveryStatus?: string | null | undefined
  orderStatus?: string | null | undefined
  subcontractPriceVnd: number
  deadlineMs?: number | null | undefined
  bypassRequest?: StepBypassRequestInfo | null | undefined
  isActive: boolean
  isCompleted: boolean
  isUnlocked: boolean
  onActivate: () => void
  onDelivered?: (() => void) | undefined
  onBypassRequested?: (() => void) | undefined
}

export function SubcontractStepProof({
  orderCode,
  branchId,
  existingDeliveryProof,
  deliveryStatus,
  orderStatus,
  subcontractPriceVnd,
  deadlineMs,
  bypassRequest,
  isActive,
  isCompleted,
  isUnlocked,
  onActivate,
  onDelivered,
  onBypassRequested,
}: SubcontractStepProofProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successJustSubmitted, setSuccessJustSubmitted] = useState(false)

  const isActuallyDelivered =
    isCompleted ||
    deliveryStatus === "DELIVERED" ||
    orderStatus === "COMPLETED" ||
    Boolean(existingDeliveryProof?.deliveredAt) ||
    successJustSubmitted

  const countdown = useStepCountdown(isUnlocked && !isActuallyDelivered ? deadlineMs : null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Vui lòng chỉ chọn tệp hình ảnh (JPG, PNG, WebP)")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Ảnh vượt quá dung lượng tối đa cho phép (10MB)")
      return
    }

    setErrorMsg(null)
    setSelectedFile(file)
  }

  function handleCancelPreview() {
    setSelectedFile(null)
  }

  async function handleSubmitProof() {
    if (!selectedFile) {
      setErrorMsg("Vui lòng chụp hoặc chọn ảnh bằng chứng giao hàng")
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("branchId", branchId)
      if (note.trim()) {
        formData.append("note", note.trim())
      }

      const res = await fetch(`/api/v1/public/subcontract/${encodeURIComponent(orderCode)}/submit-delivery`, {
        method: "POST",
        headers: subcontractAccessHeaders(),
        body: formData,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Không thể tải bằng chứng giao hàng")
      }

      setSuccessJustSubmitted(true)
      handleCancelPreview()
      onDelivered?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi gửi bằng chứng")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-label="Công đoạn 4: Bằng chứng giao hàng & Nghiệm thu"
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden",
        isActive
          ? "border-primary/50 bg-surface shadow-md ring-2 ring-primary/20 opacity-100"
          : isActuallyDelivered
          ? "border-success/30 bg-surface/90 opacity-90 hover:opacity-100"
          : isUnlocked
          ? "border-border/60 bg-surface/80 opacity-70 hover:opacity-95"
          : "border-border/40 bg-surface/50 opacity-50 cursor-not-allowed"
      )}
    >
      {/* Header bar của Bước 4 */}
      <Button variant="ghost"
        type="button"
        onClick={onActivate}
        disabled={!isUnlocked}
        className="text-[length:inherit] h-auto font-[inherit] gap-0 w-full p-4 flex items-center justify-between text-left border-b border-border/60 bg-surface-alt/30 hover:bg-surface-alt/60 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-black",
              isActuallyDelivered
                ? "bg-success text-white"
                : isActive
                ? "bg-primary text-white ring-2 ring-primary/30"
                : isUnlocked
                ? "bg-surface-alt text-text border border-border"
                : "bg-surface-alt text-text-muted/60 border border-border/40"
            )}
          >
            {isActuallyDelivered ? <CheckCircle2 size={16} /> : !isUnlocked ? <Lock size={12} /> : "4"}
          </div>
          <div>
            <span className="text-body-sm font-extrabold text-text block">
              4. Bằng chứng giao hàng & Nghiệm thu
            </span>
            <span className="text-caption text-text-muted">
              {isActuallyDelivered
                ? "Đã giao thành công 100% & Ghi nhận thù lao"
                : isUnlocked
                ? "Tải ảnh xác nhận đã giao hàng thành công"
                : "Chờ hoàn thành bàn giao Shipper ở Bước 3"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActuallyDelivered ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/20 text-success text-caption font-bold">
              <CheckCircle2 size={12} /> Hoàn tất 100%
            </span>
          ) : isUnlocked ? (
            countdown ? (
              <StepCountdownBadge countdown={countdown} labelPrefix="Giao trước" />
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning-text text-caption font-bold">
                <Clock size={12} /> Chờ ảnh giao hàng
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-alt text-text-muted text-caption font-bold">
              <Lock size={12} /> Khóa
            </span>
          )}
          <ChevronDown
            size={16}
            className={cn(
              "text-text-muted transition-transform duration-200",
              isActive ? "rotate-180 text-primary" : ""
            )}
          />
        </div>
      </Button>

      {/* Thân chi tiết Bước 4 */}
      <div className={cn("p-4 sm:p-5 flex flex-col gap-4", !isActive && "hidden")}>
        {/* Banner đếm ngược hạn chót giao hàng POD khi mở bước */}
        {countdown && !isActuallyDelivered && (
          <div
            className={cn(
              "p-3 rounded-xl border flex items-center justify-between gap-2 text-caption",
              countdown.isOverdue
                ? "bg-danger-bg border-danger/30 text-danger font-bold"
                : "bg-primary/5 border-primary/20 text-text"
            )}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} className={countdown.isOverdue ? "text-danger" : "text-primary"} />
              <span>
                Hạn chót giao hàng: <strong>{countdown.targetTimeStr || "Đang tính"}</strong>
              </span>
            </div>
            <strong className={cn("text-body-sm font-black", countdown.isOverdue ? "text-danger" : "text-primary")}>
              {countdown.formatted}
            </strong>
          </div>
        )}

        {!isUnlocked ? (
          <div className="p-4 rounded-xl bg-surface-alt text-center flex flex-col items-center gap-2 text-text-muted">
            <Lock size={24} className="opacity-50" />
            <p className="text-caption">
              Vui lòng bàn giao đơn hàng cho Shipper ở <strong>Bước 3</strong> để mở khóa xác nhận giao hàng.
            </p>
          </div>
        ) : isActuallyDelivered ? (
          <SubcontractPodSuccess
            existingDeliveryProof={existingDeliveryProof}
            subcontractPriceVnd={subcontractPriceVnd}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-body-sm">
                {errorMsg}
              </div>
            )}

            {selectedFile ? (
              <SubcontractPodPreview
                file={selectedFile}
                submitting={submitting}
                onCancel={handleCancelPreview}
              />
            ) : (
              <PhotoSourcePicker
                hint="Ảnh người nhận nhận hoa hoặc ảnh hoa tại cửa/cổng địa chỉ nhận"
                onChange={handleFileChange}
              />
            )}

            <div>
              <label htmlFor="pod-note" className="block text-caption font-bold text-text mb-1">
                Ghi chú người nhận / giao hàng (tùy chọn)
              </label>
              <Input
                id="pod-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Giao tận tay anh Tuấn tại sảnh chung cư..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <Button
              variant="primary"
              disabled={submitting || !selectedFile}
              onClick={handleSubmitProof}
              className="w-full h-11 text-caption font-extrabold flex items-center justify-center gap-1.5 rounded-xl shadow-sm mt-1 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> Đang tải lên...
                </>
              ) : (
                <>
                  <FileCheck2 size={16} /> XÁC NHẬN ĐÃ GIAO HÀNG THÀNH CÔNG
                </>
              )}
            </Button>
          </div>
        )}

        {/* Khối xin bỏ qua bằng chứng giao hàng POD */}
        <SubcontractBypassControl
          orderCode={orderCode}
          branchId={branchId}
          stepKey="POD"
          stepTitle="Bằng chứng giao hàng"
          existingRequest={bypassRequest}
          isCompleted={isActuallyDelivered}
          onBypassRequested={onBypassRequested}
        />
      </div>
    </section>
  )
}
