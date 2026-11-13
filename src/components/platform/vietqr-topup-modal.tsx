"use client"

import React, { useState, useMemo, useEffect } from "react"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { Clock } from "@/components/ui/icon-set/clock"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Zap } from "@/components/ui/icon-set/zap"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CREDIT_TOPUP_OPTIONS,
  SUBSCRIPTION_PLANS,
  createVietQrTransaction,
  type CreditTopupOption,
  type SubscriptionPlan,
} from "@/modules/platform/domain/vietqr-billing"

export interface VietQrTopupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgCode?: string | undefined
  onPaymentSuccess?: ((creditsAdded: number) => void) | undefined
  /** Có thì xác nhận nạp ghi thật vào sổ cái credit của tổ chức (Console, `N3` — checklist ALG 10.6). */
  organizationId?: string | undefined
}

export function VietQrTopupModal({
  open,
  onOpenChange,
  orgCode = "SHOPHOA",
  onPaymentSuccess,
  organizationId,
}: VietQrTopupModalProps) {
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"CREDITS" | "PLANS">("CREDITS")
  const [selectedTopup, setSelectedTopup] = useState<CreditTopupOption>(CREDIT_TOPUP_OPTIONS[1]!)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SUBSCRIPTION_PLANS[1]!)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60)

  // Đếm ngược 15 phút
  useEffect(() => {
    if (!open) return
    setIsSuccess(false)
    setTimeLeftSeconds(15 * 60)

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [open, selectedTopup, selectedPlan, activeTab])

  const qrData = useMemo(() => {
    if (activeTab === "CREDITS") {
      return createVietQrTransaction({
        orgCode,
        amountVnd: selectedTopup.priceVnd,
        packageCode: selectedTopup.code,
        itemType: "CREDIT_TOPUP",
      })
    }
    return createVietQrTransaction({
      orgCode,
      amountVnd: selectedPlan.priceMonthlyVnd,
      packageCode: selectedPlan.code,
      itemType: "PLAN_SUBSCRIPTION",
    })
  }, [orgCode, activeTab, selectedTopup, selectedPlan])

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Fallback
    }
  }

  const handleConfirmPaid = async () => {
    const credits = activeTab === "CREDITS" ? selectedTopup.totalCredits : selectedPlan.includedCreditsMonthly
    if (organizationId && activeTab === "CREDITS") {
      setConfirmError(null)
      const res = await fetch(`/api/v1/platform/organizations/${organizationId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "TOPUP", amount: credits, reason: `Chuyển khoản VietQR ${qrData.transferSyntax}` }),
      }).catch(() => null)
      if (!res?.ok) {
        setConfirmError("Chưa ghi được khoản nạp. Kiểm tra quyền nạp credit rồi thử lại.")
        return
      }
    }
    setIsSuccess(true)
    setTimeout(() => {
      onPaymentSuccess?.(credits)
      onOpenChange(false)
    }, 2000)
  }

  const minutes = Math.floor(timeLeftSeconds / 60)
  const seconds = timeLeftSeconds % 60
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center justify-between gap-3 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-primary font-semibold">Cổng thanh toán VietQR PRO & Nạp AI</span>
            <Badge tone="success" className="text-caption">Napas 247</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-caption text-text-muted">
            <Clock size={13} className="text-warning-text" />
            Hết hạn sau: <span className="font-mono font-bold text-text">{formattedTime}</span>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-caption text-text-muted">
            <ShieldCheck size={14} className="text-success" />
            {confirmError ?? "Nhân viên vận hành xác nhận sau khi tiền về tài khoản"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              disabled={isSuccess}
              onClick={() => void handleConfirmPaid()}
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 size={14} className="mr-1 text-success" />
                  Đã xác nhận giao dịch!
                </>
              ) : (
                "Tôi đã chuyển khoản xong"
              )}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Tab Switcher: Nạp Credit vs Nâng gói */}
        <div className="flex rounded-lg border border-border bg-surface p-1">
          <Button variant="ghost"
            type="button"
            onClick={() => setActiveTab("CREDITS")}
            className={`px-0 h-auto gap-0 cursor-pointer text-center flex-1 py-1.5 rounded-md text-caption font-semibold transition ${
              activeTab === "CREDITS"
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            ⚡ Nạp thêm Credit AI (Sinh ảnh / Video)
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => setActiveTab("PLANS")}
            className={`px-0 h-auto gap-0 cursor-pointer text-center flex-1 py-1.5 rounded-md text-caption font-semibold transition ${
              activeTab === "PLANS"
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            👑 Gói cước phần mềm cửa hàng hoa
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cột trái: Lựa chọn gói */}
          <div className="space-y-2.5">
            {activeTab === "CREDITS" ? (
              <div className="space-y-2">
                <div className="text-caption font-semibold text-text">Chọn mức nạp Credit AI:</div>
                {CREDIT_TOPUP_OPTIONS.map((opt) => (
                  <Button variant="outline"
                    type="button"
                    key={opt.id}
                    onClick={() => setSelectedTopup(opt)}
                    className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 cursor-pointer w-full text-left p-3 rounded-lg border transition ${
                      selectedTopup.id === opt.id
                        ? "border-primary bg-primary/10 hover:bg-primary/10"
                        : "border-border bg-surface hover:border-primary/40 hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-body-sm text-text">
                        {opt.priceVnd.toLocaleString("vi-VN")} đ
                      </span>
                      {opt.isBestValue && <Badge tone="accent" className="text-caption">Ưu đãi nhất</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-caption text-primary font-semibold">
                      <Zap size={13} />
                      {opt.totalCredits} Credit AI
                      <span className="text-success font-medium">(Tặng thêm {opt.bonusCredits} cr)</span>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-caption font-semibold text-text">Chọn gói cước phần mềm:</div>
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <Button variant="outline"
                    type="button"
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 cursor-pointer w-full text-left p-3 rounded-lg border transition ${
                      selectedPlan.id === plan.id
                        ? "border-primary bg-primary/10 hover:bg-primary/10"
                        : "border-border bg-surface hover:border-primary/40 hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-body-sm text-text">{plan.name}</span>
                      {plan.isPopular && <Badge tone="accent" className="text-caption">Phổ biến nhất</Badge>}
                    </div>
                    <div className="text-caption font-bold text-primary mt-0.5">
                      {plan.priceMonthlyVnd.toLocaleString("vi-VN")} đ / tháng
                    </div>
                    <div className="text-caption text-text-muted mt-1">{plan.description}</div>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Cột phải: Mã VietQR & Cú pháp chuyển khoản */}
          <div className="flex flex-col items-center p-3.5 rounded-xl border border-border bg-surface space-y-3">
            {/* Ảnh mã QR */}
            <div className="p-2 rounded-lg bg-surface border border-border shadow-sm flex flex-col items-center">
              <img
                src={qrData.qrImageUrl}
                alt="Mã VietQR Chuyển khoản"
                className="w-48 h-48 object-contain rounded"
              />
              <div className="text-caption text-text-muted mt-1 font-medium flex items-center gap-1">
                <QrCode size={13} className="text-primary" /> Quét mã bằng App Ngân hàng bất kỳ
              </div>
            </div>

            {/* Thông tin chuyển khoản sao chép 1-chạm */}
            <div className="w-full space-y-1.5 text-caption">
              <div className="flex items-center justify-between p-2 rounded bg-surface-alt border border-border">
                <div>
                  <span className="text-text-muted">Ngân hàng: </span>
                  <span className="font-semibold text-text">{qrData.bankName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-surface-alt border border-border">
                <div>
                  <span className="text-text-muted">Số tài khoản: </span>
                  <span className="font-mono font-bold text-primary">{qrData.accountNumber}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(qrData.accountNumber, "acc")}
                  className="h-auto p-0 text-primary hover:underline font-medium flex items-center gap-1"
                >
                  {copiedField === "acc" ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  {copiedField === "acc" ? "Đã chép" : "Chép"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-surface-alt border border-border">
                <div>
                  <span className="text-text-muted">Số tiền: </span>
                  <span className="font-bold text-text">{qrData.amountVnd.toLocaleString("vi-VN")} đ</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(String(qrData.amountVnd), "amount")}
                  className="h-auto p-0 text-primary hover:underline font-medium flex items-center gap-1"
                >
                  {copiedField === "amount" ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  {copiedField === "amount" ? "Đã chép" : "Chép"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/30">
                <div>
                  <span className="text-text-muted">Nội dung CK: </span>
                  <span className="font-mono font-bold text-primary">{qrData.transferSyntax}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(qrData.transferSyntax, "syntax")}
                  className="h-auto p-0 text-primary hover:underline font-bold flex items-center gap-1"
                >
                  {copiedField === "syntax" ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  {copiedField === "syntax" ? "Đã chép" : "Chép mã"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
