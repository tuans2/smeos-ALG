"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Phone,
  User,
  Lock,
  ChevronDown,
  Clock,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useStepCountdown } from "./use-step-countdown"
import { StepCountdownBadge } from "./step-countdown-badge"

import { SubcontractBypassControl, type StepBypassRequestInfo } from "./subcontract-bypass-control"
import { subcontractAccessHeaders } from "@/components/greeting-card/subcontract/subcontract-access"

export interface ExistingShipperInfo {
  shipperName: string
  shipperPhone: string
  submittedAt: string
}

export interface SubcontractStepShipperProps {
  orderCode: string
  branchId: string
  existingShipperInfo?: ExistingShipperInfo | null | undefined
  deliveryStatus?: string | null | undefined
  deadlineMs?: number | null | undefined
  bypassRequest?: StepBypassRequestInfo | null | undefined
  isActive: boolean
  isCompleted: boolean
  isUnlocked: boolean
  onActivate: () => void
  onSubmitted?: (() => void) | undefined
  onBypassRequested?: (() => void) | undefined
}

const VIETNAM_PHONE_RE = /^(0|\+84)(3[2-9]|5[6-9]|7[0689]|8[1-9]|9[0-9])\d{7}$/

export function SubcontractStepShipper({
  orderCode,
  branchId,
  existingShipperInfo,
  deliveryStatus,
  deadlineMs,
  bypassRequest,
  isActive,
  isCompleted,
  isUnlocked,
  onActivate,
  onSubmitted,
  onBypassRequested,
}: SubcontractStepShipperProps) {
  const countdown = useStepCountdown(isUnlocked && !isCompleted ? deadlineMs : null)
  const [shipperName, setShipperName] = useState("")
  const [shipperPhone, setShipperPhone] = useState("")
  const [shipperNote, setShipperNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (!shipperName.trim() || shipperName.trim().length < 2) {
      setErrorMsg("Vui lòng nhập tên shipper (tối thiểu 2 ký tự)")
      return
    }
    if (!VIETNAM_PHONE_RE.test(shipperPhone.trim())) {
      setErrorMsg("Số điện thoại không hợp lệ (ví dụ: 0912345678)")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/v1/public/subcontract/${encodeURIComponent(orderCode)}/submit-shipper`,
        {
          method: "POST",
          headers: subcontractAccessHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            branchId,
            shipperName: shipperName.trim(),
            shipperPhone: shipperPhone.trim(),
            shipperNote: shipperNote.trim() || undefined,
          }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Không thể cập nhật thông tin shipper")
      }
      setSuccessMsg("Đã bàn giao shipper thành công!")
      onSubmitted?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi lưu thông tin shipper")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-label="Công đoạn 3: Bàn giao Shipper & Vận chuyển"
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden",
        isActive
          ? "border-primary/50 bg-surface shadow-md ring-2 ring-primary/20 opacity-100"
          : isCompleted
          ? "border-success/30 bg-surface/90 opacity-85 hover:opacity-100"
          : isUnlocked
          ? "border-border/60 bg-surface/80 opacity-70 hover:opacity-95"
          : "border-border/40 bg-surface/50 opacity-50 cursor-not-allowed"
      )}
    >
      {/* Header bar của Bước 3 */}
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
              isCompleted
                ? "bg-success text-white"
                : isActive
                ? "bg-primary text-white ring-2 ring-primary/30"
                : isUnlocked
                ? "bg-surface-alt text-text border border-border"
                : "bg-surface-alt text-text-muted/60 border border-border/40"
            )}
          >
            {isCompleted ? <CheckCircle2 size={16} /> : !isUnlocked ? <Lock size={12} /> : "3"}
          </div>
          <div>
            <span className="text-body-sm font-extrabold text-text block">
              3. Bàn giao Shipper & Vận chuyển
            </span>
            <span className="text-caption text-text-muted">
              {isCompleted
                ? "Đã xác nhận bàn giao cho shipper"
                : isUnlocked
                ? "Cung cấp tên và SĐT shipper phụ trách giao"
                : "Chờ hoàn thành Bước 2 (QC)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/20 text-success text-caption font-bold">
              <CheckCircle2 size={12} /> Đã bàn giao
            </span>
          ) : isUnlocked ? (
            countdown ? (
              <StepCountdownBadge countdown={countdown} labelPrefix="Giao trước" />
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning-text text-caption font-bold">
                <Clock size={12} /> Chờ thông tin
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

      {/* Thân chi tiết Bước 3 */}
      <div className={cn("p-4 sm:p-5 flex flex-col gap-4", !isActive && "hidden")}>
        {/* Banner đếm ngược hạn chót bàn giao shipper khi mở bước */}
        {countdown && !isCompleted && !existingShipperInfo && (
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
                Hạn bàn giao cho Shipper: <strong>{countdown.targetTimeStr || "Đang tính"}</strong>
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
              Vui lòng tải ảnh kiểm định thành phẩm ở <strong>Bước 2</strong> để mở khóa bàn giao đơn hàng cho Shipper.
            </p>
          </div>
        ) : isCompleted || existingShipperInfo ? (
          <div className="p-4 rounded-xl bg-success/10 border border-success/30 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-success" />
              <span className="text-body-sm font-extrabold text-success">
                Đã xác nhận thông tin giao hàng
              </span>
            </div>
            {existingShipperInfo && (
              <div className="text-caption text-text-muted flex flex-col gap-1 pl-6">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-text-muted" />
                  <strong className="text-text">{existingShipperInfo.shipperName}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-text-muted" />
                  <a
                    href={`tel:${existingShipperInfo.shipperPhone}`}
                    className="text-primary font-bold underline font-mono"
                  >
                    {existingShipperInfo.shipperPhone}
                  </a>
                </span>
              </div>
            )}
            <p className="text-caption text-text-muted pl-6">
              Hệ thống đã ghi nhận shipper. Đơn hàng đang trên đường giao tới người nhận.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-body-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-body-sm flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="shipper-name" className="block text-caption font-bold text-text mb-1">
                Tên Shipper / Tài xế phụ trách <span className="text-danger">*</span>
              </label>
              <Input
                id="shipper-name"
                type="text"
                value={shipperName}
                onChange={(e) => setShipperName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An (Ahamove)"
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label htmlFor="shipper-phone" className="block text-caption font-bold text-text mb-1">
                Số điện thoại Shipper <span className="text-danger">*</span>
              </label>
              <Input
                id="shipper-phone"
                type="tel"
                value={shipperPhone}
                onChange={(e) => setShipperPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
            </div>

            <div>
              <label htmlFor="shipper-note" className="block text-caption font-bold text-text mb-1">
                Ghi chú điều phối (tùy chọn)
              </label>
              <Input
                id="shipper-note"
                type="text"
                value={shipperNote}
                onChange={(e) => setShipperNote(e.target.value)}
                placeholder="Mã chuyến xe hoặc hướng dẫn bảo quản..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="w-full h-11 text-caption font-extrabold flex items-center justify-center gap-1.5 rounded-xl shadow-sm mt-1 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> Đang cập nhật...
                </>
              ) : (
                <>
                  <Truck size={16} /> XÁC NHẬN BÀN GIAO CHO SHIPPER
                </>
              )}
            </Button>
          </form>
        )}

        {/* Khối xin bỏ qua thông tin Shipper */}
        <SubcontractBypassControl
          orderCode={orderCode}
          branchId={branchId}
          stepKey="SHIPPER"
          stepTitle="Bàn giao Shipper"
          existingRequest={bypassRequest}
          isCompleted={isCompleted}
          onBypassRequested={onBypassRequested}
        />
      </div>
    </section>
  )
}
