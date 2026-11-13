"use client"

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import React, { useRef, useState } from "react"
import { Clock, Printer, Copy, Check, Sparkles, MapPin, Eye, EyeOff, Layers, MessageSquare, ShieldCheck, XCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi } from "@/components/greeting-card/greeting-api"
import type { OrderDetailModalTarget } from "./brochure-order-detail-modal"
import { coordinatorAcceptanceBlocker } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import { CoordinatorAcceptRejectModal } from "./coordinator/coordinator-accept-reject-modal"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"
import { ChainDispatchPanel } from "./subcontract/chain-dispatch-panel"
import { isChainOrganizationType } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { useCraftFeeSuggestion } from "./subcontract/use-craft-fee-suggestion"

export interface BrochureFloristJobTabProps {
  target: OrderDetailModalTarget
  onClose: () => void
  onAcceptedOrRejected?: (() => void) | undefined
}

function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "—"
  const clean = phone.replace(/\s+/g, "")
  return clean.length < 7 ? clean : `${clean.slice(0, 4)}***${clean.slice(-3)}`
}

export function BrochureFloristJobTab({
  target,
  onClose,
  onAcceptedOrRejected,
}: BrochureFloristJobTabProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { organization, organizationType } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  // Phí gia công do máy chủ tính theo phương án tiệm cài; điều phối chuỗi chỉ có ở mô hình Chuỗi
  const isChain = isChainOrganizationType(organizationType)
  const { data: dispatchData } = useApi<{
    data: { dispatchState?: { claimedBranchName?: string | null; claimedBranchId?: string | null }; craftFee?: { finalVnd: number | null } }
  }>(target.orderId && isChain ? `/api/v1/greeting-card/orders/${target.orderId}/chain-dispatch` : null)
  const claimedBranchName = dispatchData?.data.dispatchState?.claimedBranchName || dispatchData?.data.dispatchState?.claimedBranchId || null
  const feeSuggestion = useCraftFeeSuggestion(target.orderId)
  const defaultFee = dispatchData?.data.craftFee?.finalVnd ?? feeSuggestion?.suggestedVnd ?? 0
  const [feeOverride, setSuggestedCraftFee] = useState<number | null>(null)
  const suggestedCraftFee = feeOverride ?? defaultFee
  const [floristNote, setFloristNote] = useState<string>("")
  const [maskPhone, setMaskPhone] = useState(true)
  const [copiedImage, setCopiedImage] = useState(false)
  const [copiedProductImage, setCopiedProductImage] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [modalMode, setModalMode] = useState<"accept" | "reject" | null>(null)

  const acceptBlocker = target.orderId
    ? coordinatorAcceptanceBlocker(
        { status: target.status ?? "DRAFT", productionStatus: target.productionStatus ?? "WAITING", deliveryStatus: target.deliveryStatus ?? "PENDING" },
        { paidVnd: target.paidVnd ?? 0, paymentProofUrl: target.paymentProofUrl },
      )
    : "Chưa có đơn hàng"
  const canDecide = acceptBlocker === null

  const handleCopyText = async () => {
    const phoneDisplay = maskPhone ? maskPhoneNumber(target.recipientPhone) : target.recipientPhone || "Chưa có"
    const textBrief = [
      `📋 THẺ GIA CÔNG & ${terms.makerAction.toUpperCase()} — ĐƠN #${target.orderCode || target.sendCode || "---"}`,
      `📌 Mẫu: ${target.productName || `${terms.sampleProduct} theo mẫu`}`,
      `⏰ ${orderTerms.readyDeadlineLabel}: ${target.deliveryTimeSlot || orderTerms.fallbackTimeSlotText}${target.deliveryDate ? ` · Ngày ${target.deliveryDate}` : ""}`,
      `💰 Giá gia công: ${suggestedCraftFee.toLocaleString("vi-VN")} VNĐ`,
      `🌿 ${terms.rawMaterialItem}: ${target.flowersSummary || `Theo ${terms.sampleProduct.toLowerCase()} chuẩn`}`,
      target.cardMessage ? `💌 ${terms.printablesTitle}: "${target.cardMessage}"` : "",
      floristNote.trim() ? `📝 Lưu ý: ${floristNote.trim()}` : "",
      `📍 ${orderTerms.addressLabel}: ${target.recipientName || target.customerName || "Khách nhận"} · ${phoneDisplay} · ${target.deliveryAddress || "Chưa có địa chỉ"}`,
    ].filter(Boolean).join("\n")

    try {
      await navigator.clipboard.writeText(textBrief)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2500)
    } catch { /* Fallback */ }
  }

  const handleCopyProductImage = async () => {
    if (!target.productImageUrl) return
    try {
      const resp = await fetch(target.productImageUrl, { mode: "cors" })
      const blob = await resp.blob()
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })])
        setCopiedProductImage(true)
        setTimeout(() => setCopiedProductImage(false), 2500)
        return
      }
    } catch { /* Fallback */ }
    window.open(target.productImageUrl, "_blank")
  }

  const handleCopyImage = async () => {
    if (!cardRef.current) return
    try {
      const { toBlob } = await import("html-to-image")
      const blob = await toBlob(cardRef.current, { pixelRatio: 3, backgroundColor: "#ffffff", cacheBust: true, skipFonts: true })
      if (blob && navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        setCopiedImage(true)
        setTimeout(() => setCopiedImage(false), 2500)
        return
      }
    } catch { /* Fallback */ }
    try {
      const h2c = (await import("html2canvas").catch(() => null))?.default
      if (h2c && cardRef.current) {
        const canvas = await h2c(cardRef.current, { scale: 3, useCORS: true, allowTaint: true })
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && typeof ClipboardItem !== "undefined") {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
            setCopiedImage(true)
            setTimeout(() => setCopiedImage(false), 2500)
          } else {
            void handleCopyText()
          }
        })
        return
      }
    } catch { /* Fallback */ }
    await handleCopyText()
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Top Header & Actions (Thanh tác vụ điều phối, không đưa vào ảnh gửi thợ) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-caption font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {orderTerms.makerTabLabel}
              </span>
              <span className="text-caption font-bold text-text-muted">
                #{target.orderCode || target.sendCode}
              </span>
            </div>
            <h3 className="text-body font-extrabold text-text mt-1 break-words [overflow-wrap:anywhere] line-clamp-2">
              {target.productName || `${terms.sampleProduct} theo mẫu`}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 [&_button]:whitespace-nowrap">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyText} className="text-caption gap-1.5 h-8 font-semibold text-text">
              {copiedText ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
              <span>{copiedText ? "Đã chép text" : "Copy text Zalo"}</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCopyImage} className="text-caption gap-1.5 h-8 font-semibold text-text">
              {copiedImage ? <Check size={13} className="text-primary" /> : <Sparkles size={13} className="text-primary" />}
              <span>{copiedImage ? "Đã chép ảnh thẻ" : "Copy ảnh thẻ (HD)"}</span>
            </Button>
            {target.productImageUrl && (
              <Button type="button" variant="outline" size="sm" onClick={handleCopyProductImage} className="text-caption gap-1.5 h-8 font-semibold text-text border-primary/30 text-primary hover:bg-primary/5">
                {copiedProductImage ? <Check size={13} /> : <Eye size={13} />}
                <span>{copiedProductImage ? "Đã chép ảnh mẫu" : "Copy ảnh mẫu gốc HD"}</span>
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => window.print()} className="h-8 text-caption gap-1 text-text-muted">
              <Printer size={13} />
              <span>In PDF</span>
            </Button>
          </div>
        </div>

        {/* Khối Điều Phối Chuỗi Tự Động (Matching Engine & Phát Lệnh Gửi Riêng) */}
        {target.orderId && isChain && (
          <ChainDispatchPanel
            orderId={target.orderId}
            orderCode={target.orderCode || target.sendCode || ""}
            suggestedCraftFee={feeOverride ?? undefined}
          />
        )}

        {/* Khung Thẻ Gia Công gửi cho Thợ (Chỉ chụp vùng này từ Ảnh mẫu tham chiếu trở xuống) */}
        <div
          ref={cardRef}
          className="rounded-3xl border border-border/80 bg-surface p-6 shadow-md flex flex-col gap-5 text-text relative overflow-hidden"
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-caption uppercase tracking-wider">
                <Sparkles size={12} />
                {orderTerms.makerTabLabel}
              </span>
              <span className="text-body-sm font-extrabold text-text">
                #{target.orderCode || target.sendCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Sample Image & Costing */}
            <div className="flex flex-col gap-3">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-border bg-surface-alt shadow-xs">
                {target.productImageUrl ? (
                  <img
                    src={target.productImageUrl}
                    alt={target.productName || terms.sampleProduct}
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-text-muted text-caption">
                    Chưa có ảnh mẫu
                  </div>
                )}
                <div className="absolute bottom-2 left-2 rounded-lg bg-black/65 px-2 py-0.5 text-caption font-bold text-white backdrop-blur-xs">
                  {orderTerms.referencePhotoLabel}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-danger-bg/60 border border-danger/25 flex items-center justify-between text-caption">
                <span className="font-bold text-danger flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <Clock size={15} />
                  {orderTerms.readyDeadlineLabel}:
                </span>
                <span className="font-extrabold text-danger text-body-sm text-right">
                  {target.deliveryTimeSlot || orderTerms.fallbackTimeSlotText}
                  {target.deliveryDate ? ` · ${target.deliveryDate}` : ""}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
                <span className="text-caption font-bold text-text block">
                  💰 Giá gia công trên thẻ:
                </span>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={suggestedCraftFee ? suggestedCraftFee.toLocaleString("vi-VN") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "")
                      setSuggestedCraftFee(raw ? Number(raw) : 0)
                    }}
                    placeholder={defaultFee.toLocaleString("vi-VN")}
                    className="w-full px-3 py-2 pr-12 rounded-xl border border-border bg-surface text-text font-extrabold text-body focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="absolute right-3 top-2.5 text-caption font-black text-text-muted">VNĐ</span>
                </div>
              </div>
            </div>

            {/* Column 2 & 3: Details, Materials & Recipient */}
            <div className="md:col-span-2 min-w-0 flex flex-col gap-3.5 justify-between">
              <div className="p-3.5 rounded-2xl bg-surface-alt/50 border border-border/80">
                <span className="text-caption font-bold text-text-muted uppercase tracking-wider block mb-1">
                  {terms.sampleProduct}
                </span>
                <h3 className="text-body font-black text-text break-words [overflow-wrap:anywhere]">
                  {target.productName || `${terms.sampleProduct} theo mẫu`}
                </h3>
              </div>

              {/* Materials summary */}
              <div className="p-4 rounded-2xl bg-surface-alt/70 border border-border text-caption flex flex-col gap-1.5">
                <span className="font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" />
                  {orderTerms.rawMaterialLabel}
                </span>
                <p className="text-body-sm text-text font-semibold leading-relaxed">
                  {target.flowersSummary || `${terms.makerAction} theo chuẩn mẫu ảnh tham chiếu.`}
                </p>
              </div>

              {/* Card Message */}
              {target.cardMessage && (
                <div className="p-4 rounded-2xl bg-warning-bg/50 border border-warning/30 text-caption flex flex-col gap-1">
                  <div className="font-bold text-warning-text flex items-center gap-1.5">
                    <MessageSquare size={14} />
                    <span>Nội dung {terms.printablesTitle.toLowerCase()} (In nguyên văn):</span>
                  </div>
                  <p className="text-body-sm italic text-text font-semibold">&ldquo;{target.cardMessage}&rdquo;</p>
                </div>
              )}

              {/* Florist Custom Note / Message */}
              <div className="p-3.5 rounded-2xl bg-surface-alt/50 border border-border/80 text-caption flex flex-col gap-1.5">
                <label htmlFor="florist-custom-note" className="font-bold text-text flex items-center gap-1.5">
                  <span>📝 Lưu ý & Ghi chú cho {terms.makerTitle.toLowerCase()}:</span>
                </label>
                <Textarea
                  id="florist-custom-note"
                  rows={2}
                  value={floristNote}
                  onChange={(e) => setFloristNote(e.target.value)}
                  placeholder={`VD: ${terms.makerAction} theo form chuẩn, tỉ mỉ đường may và độ hoàn thiện...`}
                  className="w-full p-2.5 rounded-xl border border-border bg-surface text-text text-body-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                />
              </div>

              {/* Delivery & Recipient */}
              <div className="p-4 rounded-2xl bg-surface-alt/70 border border-border text-caption flex flex-col gap-2.5">
                <div className="flex items-center justify-between font-bold text-text pb-1 border-b border-border/40">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary shrink-0" />
                    <span>{orderTerms.recipientInfoLabel}</span>
                  </div>
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setMaskPhone(!maskPhone)}
                    className="h-auto p-0 inline-flex items-center gap-1 text-caption text-text-muted hover:text-text font-medium shrink-0"
                  >
                    {maskPhone ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{maskPhone ? "Hiện số đầy đủ" : "Che số ĐT"}</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text text-body-sm">
                  <div>
                    <span className="text-text-muted font-medium text-caption block">{orderTerms.recipientRoleLabel}:</span>
                    <strong className="text-text">{target.recipientName || target.customerName || "Khách lẻ"}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted font-medium text-caption block">Số điện thoại:</span>
                    <strong className="text-text">{maskPhone ? maskPhoneNumber(target.recipientPhone) : target.recipientPhone || "—"}</strong>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-border/50 text-text">
                  <span className="text-text-muted font-medium text-caption block">{orderTerms.addressLabel}:</span>
                  <span className="font-medium text-body-sm">{target.deliveryAddress || "Chưa có địa chỉ chi tiết"}</span>
                </div>
              </div>
            </div>
          </div>

        {/* Bottom Actions Bar */}
        {canDecide && target.orderId && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-dashed border-border">
            <div className="text-caption text-text-muted">Gửi Thẻ cho bộ phận {terms.makerTitle.toLowerCase()} / {terms.makerAction.toLowerCase()}. Sau khi chốt xong, bấm Xác nhận nhận đơn.</div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalMode("reject")} className="text-caption h-8 text-danger border-danger/30 hover:bg-danger/10 gap-1.5 font-bold">
                <XCircle size={13} />
                <span>Từ chối (Hoàn tiền)</span>
              </Button>
              <Button type="button" size="sm" onClick={() => setModalMode("accept")} className="bg-success hover:bg-success/90 text-white text-caption h-8 gap-1.5 font-bold shadow-xs">
                <ShieldCheck size={14} />
                <span>Xác nhận nhận đơn</span>
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>

      {modalMode && target.orderId && (
        <CoordinatorAcceptRejectModal
          mode={modalMode}
          orderId={target.orderId}
          orderCode={target.orderCode || target.sendCode || ""}
          defaultBranchName={claimedBranchName}
          onClose={() => setModalMode(null)}
          onDone={() => { setModalMode(null); onClose(); onAcceptedOrRejected?.() }}
        />
      )}
    </>
  )
}
