"use client"

import React, { useState } from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Phone } from "@/components/ui/icon-set/phone"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  type ChatOrderDraft,
  validateChatOrderDraft,
  generateChatOrderCheckout,
  type ChatOrderCheckoutPayload,
} from "@/modules/chat-assistant/domain/chat-order-extractor"

interface ChatOrderCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  initialDraft: ChatOrderDraft
  onOrderCreated?: (orderCode: string) => void
}

export function ChatOrderCheckoutModal({
  isOpen,
  onClose,
  initialDraft,
  onOrderCreated,
}: ChatOrderCheckoutModalProps) {
  const [draft, setDraft] = useState<ChatOrderDraft>(initialDraft)
  const [checkoutPayload, setCheckoutPayload] = useState<ChatOrderCheckoutPayload | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [step, setStep] = useState<"REVIEW" | "PAYMENT">("REVIEW")

  const validation = validateChatOrderDraft(draft)

  function handleConfirmAndCheckout() {
    const payload = generateChatOrderCheckout(draft)
    setCheckoutPayload(payload)
    setStep("PAYMENT")
    if (onOrderCreated) {
      onOrderCreated(payload.orderCode)
    }
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {step === "REVIEW" ? <ShoppingBag className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-title-sm font-semibold text-text">
              {step === "REVIEW" ? "Trích xuất Đơn từ Hội thoại" : "Thanh toán VietQR Napas 247"}
            </h3>
            <p className="text-caption text-text-muted">
              {step === "REVIEW" ? "AI tự động bóc tách thông tin khách đặt" : "Quét mã để hoàn tất đơn hàng"}
            </p>
          </div>
        </div>
      }
    >
      {/* Body Step 1: REVIEW */}
      {step === "REVIEW" && (
        <div className="space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Thanh điểm tự tin AI */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="text-body-sm font-medium text-text">
                  Độ tin cậy trích xuất AI: <span className="text-primary font-bold">{validation.confidenceScore}%</span>
                </div>
                <div className="text-caption text-text-muted">
                  {validation.isReadyForCheckout
                    ? "Đủ thông tin để tạo đơn & phát hành mã thanh toán"
                    : "Còn thiếu thông tin, bạn có thể điền bổ sung bên dưới"}
                </div>
              </div>
            </div>
            <Badge tone={validation.isReadyForCheckout ? "success" : "neutral"}>
              {validation.isReadyForCheckout ? "Sẵn sàng" : "Cần bổ sung"}
            </Badge>
          </div>

          {/* Các trường bóc tách */}
          <div className="space-y-3">
            <div>
              <label className="text-meta font-medium text-text-muted flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-primary" /> Số điện thoại người nhận
              </label>
              <Input
                type="text"
                value={draft.recipientPhone || ""}
                onChange={(e) => setDraft({ ...draft, recipientPhone: e.target.value })}
                placeholder="Ví dụ: 0901234567"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-meta font-medium text-text-muted flex items-center gap-1.5 mb-1">
                  Tên người nhận
                </label>
                <Input
                  type="text"
                  value={draft.recipientName || ""}
                  onChange={(e) => setDraft({ ...draft, recipientName: e.target.value })}
                  placeholder="Ví dụ: Chị Lan"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-meta font-medium text-text-muted flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Giờ giao hoa
                </label>
                <Input
                  type="text"
                  value={draft.deliveryTime || ""}
                  onChange={(e) => setDraft({ ...draft, deliveryTime: e.target.value })}
                  placeholder="Ví dụ: 9h sáng mai"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-meta font-medium text-text-muted flex items-center gap-1.5 mb-1">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Địa chỉ giao hoa
              </label>
              <Input
                type="text"
                value={draft.deliveryAddress || ""}
                onChange={(e) => setDraft({ ...draft, deliveryAddress: e.target.value })}
                placeholder="Số nhà, đường, phường, quận/huyện..."
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-meta font-medium text-text-muted flex items-center gap-1.5 mb-1">
                  Sản phẩm / Phong cách
                </label>
                <Input
                  type="text"
                  value={draft.productName || draft.flowerStyleOrTone || ""}
                  onChange={(e) => setDraft({ ...draft, flowerStyleOrTone: e.target.value })}
                  placeholder="Ví dụ: Tone Hồng Pastel"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-meta font-medium text-text-muted flex items-center gap-1.5 mb-1">
                  Tổng tiền / Ngân sách (đ)
                </label>
                <Input
                  type="number"
                  value={draft.budgetVnd || ""}
                  onChange={(e) => setDraft({ ...draft, budgetVnd: Number(e.target.value) })}
                  placeholder="Ví dụ: 650000"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-meta font-medium text-text-muted flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5 text-primary" /> Lời chúc / Thiệp
              </label>
              <Input
                type="text"
                value={draft.cardMessage || ""}
                onChange={(e) => setDraft({ ...draft, cardMessage: e.target.value })}
                placeholder="Ví dụ: Chúc mừng sinh nhật em yêu..."
                className="w-full"
              />
            </div>
          </div>

          {/* Nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmAndCheckout}
              disabled={!draft.recipientPhone}
            >
              Chốt đơn & Lấy mã VietQR
            </Button>
          </div>
        </div>
      )}

      {/* Body Step 2: PAYMENT VIETQR (DH-04) */}
      {step === "PAYMENT" && checkoutPayload && (
        <div className="space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Thông báo thành công */}
          <div className="rounded-xl border border-success/30 bg-success-bg/30 p-3.5 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <div className="text-body-sm font-semibold text-text">
                Đơn hàng đã được khởi tạo: <span className="font-mono text-primary">{checkoutPayload.orderCode}</span>
              </div>
              <div className="text-caption text-text-muted">
                Vui lòng chuyển khoản đúng số tiền và nội dung để hệ thống đối soát tức thời.
              </div>
            </div>
          </div>

          {/* Khối VietQR */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={checkoutPayload.vietqrPayload.qrQuickLink}
              alt="VietQR Napas 247"
              className="w-48 h-48 object-contain rounded-lg shadow-xs"
            />
            <div className="text-caption text-text-muted mt-2 text-center">
              Quét bằng ứng dụng Ngân hàng bất kỳ (VietinBank, Vietcombank, Techcombank, MB...)
            </div>
          </div>

          {/* Chi tiết chuyển khoản */}
          <div className="space-y-2 rounded-xl border border-border bg-surface-alt/30 p-3.5 text-body-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Số tiền:</span>
              <span className="font-bold text-primary text-title-sm">
                {checkoutPayload.totalVnd.toLocaleString("vi-VN")} đ
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-muted">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-text">
                  {checkoutPayload.vietqrPayload.accountNumber}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(checkoutPayload.vietqrPayload.accountNumber, "stk")}
                  aria-label="Sao chép số tài khoản"
                  className="p-1 h-auto"
                >
                  {copiedKey === "stk" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-muted">Nội dung CK:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-text">
                  {checkoutPayload.vietqrPayload.paymentTransferCode}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(checkoutPayload.vietqrPayload.paymentTransferCode, "nd")}
                  aria-label="Sao chép nội dung chuyển khoản"
                  className="p-1 h-auto"
                >
                  {copiedKey === "nd" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setStep("REVIEW")}>
              Quay lại sửa
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Xong & Đóng
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
