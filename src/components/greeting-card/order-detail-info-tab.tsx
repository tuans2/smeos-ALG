"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { User, Phone, MapPin, Flower2, CheckCircle2, Home, Utensils, Shirt, Sparkles } from "@/components/ui/icons"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { zaloHref } from "@/components/greeting-card/work/work-item-card"
import { OrderPaymentProofView } from "./order-payment-proof-view"
import type { OrderDetailModalTarget } from "./brochure-order-detail-modal"
import { LinkCustomerCard } from "./link-customer-card"
import { DEPOSIT_PENDING_APPROVAL_NOTE, isDepositPendingApproval } from "@/modules/greeting-card/domain/deposit-acknowledgement"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

export interface OrderDetailInfoTabProps {
  target: OrderDetailModalTarget
  onCustomerSaved?: ((customer: { customerName: string; customerPhone: string | null }) => void) | undefined
}

export function OrderDetailInfoTab({ target, onCustomerSaved }: OrderDetailInfoTabProps) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const isPaid = (target.paidVnd ?? 0) >= (target.totalVnd ?? 0) && (target.totalVnd ?? 0) > 0
  const isDeposit = (target.paidVnd ?? 0) > 0 && !isPaid
  const depositPendingApproval = isDepositPendingApproval({
    status: target.status ?? "",
    productionStatus: target.productionStatus,
    totalVnd: target.totalVnd ?? 0,
    paidVnd: target.paidVnd ?? 0,
    customerReported: Boolean(target.paymentProofUrl) || target.customerReportedPaid === true,
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Link chưa có đơn: gửi cho ai, lúc nào — thay cho khối Người đặt & Người nhận còn trống */}
      {!target.orderId && target.sessionId ? <LinkCustomerCard target={target} onSaved={onCustomerSaved} /> : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-alt p-3.5 flex flex-col gap-1.5">
          <span className="text-caption font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
            <User size={13} /> {orderTerms.customerRoleLabel}
          </span>
          <p className="text-body-sm font-bold text-text">{target.customerName || "Khách lẻ"}</p>
          {target.customerPhone && (
            <div className="flex items-center gap-2 mt-1">
              <a
                href={`tel:${target.customerPhone}`}
                className="inline-flex items-center gap-1 text-caption font-bold text-primary hover:underline"
              >
                <Phone size={12} /> {target.customerPhone}
              </a>
              <a
                href={zaloHref(target.customerPhone)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-surface px-2 py-0.5 text-caption font-bold text-info hover:bg-surface-alt"
              >
                Zalo
              </a>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface-alt p-3.5 flex flex-col gap-1.5">
          <span className="text-caption font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
            <MapPin size={13} /> {orderTerms.recipientRoleLabel}
          </span>
          <p className="text-body-sm font-bold text-text">{target.recipientName || target.customerName || "Chưa có tên"}</p>
          {target.recipientPhone && (
            <a
              href={`tel:${target.recipientPhone}`}
              className="inline-flex items-center gap-1 text-caption font-bold text-primary hover:underline"
            >
              <Phone size={12} /> {target.recipientPhone}
            </a>
          )}
          <p className="text-caption text-text-muted mt-1 leading-relaxed">
            {target.deliveryAddress || orderTerms.emptyAddressText}
          </p>
        </div>
      </div>
      )}

      {/* Khối Sản phẩm & Ấn phẩm đính kèm */}
      <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
        <span className="text-caption font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
          {organization?.industry === "HOMESTAY" ? (
            <Home size={13} />
          ) : organization?.industry === "FNB" ? (
            <Utensils size={13} />
          ) : organization?.industry === "FASHION" ? (
            <Shirt size={13} />
          ) : organization?.industry === "SERVICES" ? (
            <Sparkles size={13} />
          ) : (
            <Flower2 size={13} />
          )} {terms.sampleProduct} đã chọn
        </span>
        <div className="flex items-center gap-3">
          <FlowerImage
            src={target.productImageUrl}
            alt={target.productName || terms.sampleProduct}
            sizes="60px"
            fallback="icon"
            className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-body font-bold text-text truncate">{target.productName || `${terms.sampleProduct} theo mẫu`}</h4>
            <p className="text-body-sm font-extrabold text-primary mt-0.5">
              {(target.totalVnd ?? 0) > 0 ? `${(target.totalVnd ?? 0).toLocaleString("vi-VN")} đ` : "Chưa có giá"}
            </p>
          </div>
        </div>

        {/* Ấn phẩm đính kèm / Thiệp */}
        {target.cardMessage ? (
          <div className="rounded-xl border border-warning/30 bg-warning-bg p-3 flex flex-col gap-1 mt-1">
            <span className="text-caption font-bold text-warning-text flex items-center gap-1">
              💌 Lời nhắn gửi trên {terms.printablesTitle.toLowerCase()}:
            </span>
            <p className="text-body-sm italic text-text">&ldquo;{target.cardMessage}&rdquo;</p>
          </div>
        ) : (
          <p className="text-caption text-text-muted italic">Không kèm nội dung {terms.printablesTitle.toLowerCase()}.</p>
        )}
      </div>

      {/* Khối Thanh toán */}
      <div className="rounded-2xl border border-border bg-surface-alt p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-text-muted">Tổng giá trị đơn:</span>
          <span className="text-body font-bold text-text">
            {(target.totalVnd ?? 0).toLocaleString("vi-VN")} đ
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-text-muted">Đã thanh toán:</span>
          <span className="text-body font-bold text-success">
            {(target.paidVnd ?? 0).toLocaleString("vi-VN")} đ
          </span>
        </div>
        {(target.balanceVnd ?? 0) > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 pt-2">
            <span className="text-body-sm font-bold text-danger">Còn phải thu:</span>
            <span className="text-body font-black text-danger">
              {(target.balanceVnd ?? 0).toLocaleString("vi-VN")} đ
            </span>
          </div>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold ${
              isPaid ? "bg-success/15 text-success" : isDeposit ? "bg-warning/15 text-warning-text" : "bg-danger-bg text-danger"
            }`}
          >
            <CheckCircle2 size={12} />
            {isPaid ? "Đã thanh toán đủ" : isDeposit ? "Đã thanh toán một phần (Cọc)" : "Chưa thanh toán"}
          </span>
        </div>
        {depositPendingApproval && (
          <p role="status" className="mt-1 rounded-xl border border-warning/30 bg-warning-bg/40 p-2.5 text-caption font-bold text-warning-text">
            ⚠️ {DEPOSIT_PENDING_APPROVAL_NOTE}
          </p>
        )}
        {isDeposit && (target.balanceVnd ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-bg/40 p-2.5">
            <span className="text-caption font-bold text-warning-text">
              ⚠️ Đơn cọc — Cần thanh toán lần 2: {(target.balanceVnd ?? 0).toLocaleString("vi-VN")} đ
            </span>
            <Button variant="outline"
              type="button"
              onClick={() => {
                const url = target.sendCode ? `${window.location.origin}/b/${target.sendCode}` : ""
                const msg = organization?.industry === "HOMESTAY"
                  ? `Dạ chào anh/chị, ${terms.sampleProduct.toLowerCase()} cho đơn #${target.orderCode || target.sendCode} đã sẵn sàng đón tiếp ạ! Anh/chị mở link kiểm tra thông tin nhận phòng và thanh toán phần còn lại ${(target.balanceVnd ?? 0).toLocaleString("vi-VN")} đ để hoàn tất thủ tục nhé ạ:${url ? ` ${url}` : ""}`
                  : `Dạ chào anh/chị, ${terms.sampleProduct.toLowerCase()} cho đơn #${target.orderCode || target.sendCode} đã ${terms.makerAction.toLowerCase()} hoàn tất ạ! Anh/chị mở link kiểm tra ${terms.completedProductPhoto.toLowerCase()} và thanh toán phần còn lại ${(target.balanceVnd ?? 0).toLocaleString("vi-VN")} đ để cửa hàng tiến hành bàn giao nhé ạ:${url ? ` ${url}` : ""}`
                void navigator.clipboard.writeText(msg)
              }}
              className="h-auto gap-0 rounded-lg border border-border bg-surface px-2.5 py-1 text-caption font-bold text-text hover:bg-surface-alt transition-colors"
            >
              📋 Chép tin nhắc khách
            </Button>
          </div>
        )}

        {/* Ảnh chuyển khoản do khách tải lên */}
        <OrderPaymentProofView
          paymentProofUrl={target.paymentProofUrl}
          paymentProofAnalysis={target.paymentProofAnalysis}
          paymentProofBalanceUrl={target.paymentProofBalanceUrl}
          paymentProofBalanceAnalysis={target.paymentProofBalanceAnalysis}
        />
      </div>
    </div>
  )
}
