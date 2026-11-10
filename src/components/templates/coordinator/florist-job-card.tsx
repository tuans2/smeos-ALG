"use client"

import { Input } from "@/components/ui/input"; import { Button } from "@/components/ui/button"
import React, { useRef, useState } from "react"
import { Clock } from "@/components/ui/icon-set/clock"
import { Printer } from "@/components/ui/icon-set/printer"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Ban } from "@/components/ui/icon-set/ban"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Card } from "@/components/ui/card"
import type { FlowerBomItem, FoliageBomItem, WrappingLayer, AccessoryBomItem, StructuredAddress } from "@/modules/products/domain/product-master-index"
import type { VisibleCustomField } from "@/components/coordinator/custom-fields-section"
import { FloristJobBom, formatAddress, maskPhoneNumber } from "./florist-job-bom"
import { FloristJobCardRecipient } from "./florist-job-card-recipient"
import { DimensionPhotoFrame, AssemblyStepsPanel } from "./florist-job-card-spec"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { AVI_LOTUS_BRAND_VARS, AVI_LOTUS_LOGO } from "./avi-lotus-brand"

export interface FloristJobCardProps {
  orderCode: string
  recipeTitle: string
  unitPriceVnd: number
  suggestedFeeVnd?: number | undefined // phí gợi ý theo phương án tiệm cài; chưa tải xong → 50% giá bán
  targetReadyTime: string
  deliveryTargetTime?: string | undefined
  sampleImageUrl?: string | null | undefined
  flowers: FlowerBomItem[]
  foliage?: FoliageBomItem[] | undefined
  wrapping?: WrappingLayer[] | undefined
  accessories?: AccessoryBomItem[] | undefined
  cardMessage?: string | null | undefined
  partnerInstruction?: string | null | undefined
  partnerName?: string | undefined
  recipientName?: string | undefined
  recipientPhone?: string | undefined
  deliveryAddress?: StructuredAddress | string | unknown
  customFields?: VisibleCustomField[] | undefined
  /** Kích thước thành phẩm ước tính (Product Master Index) — ẩn khi chưa đo, không bịa số. */
  dimensions?: { heightCm: number; widthCm: number } | undefined
  /** Các bước cắm tham khảo (Product Master Index) — ẩn khi chưa ai nhập, không bịa quy trình. */
  assemblySteps?: string[] | undefined
  onConfirmAcceptance?: (suggestedFee: number) => void
  onCancelOrder?: () => void
  onPrint?: () => void
}

export function FloristJobCard({
  orderCode,
  recipeTitle,
  unitPriceVnd, suggestedFeeVnd,
  targetReadyTime,
  deliveryTargetTime,
  sampleImageUrl,
  flowers,
  foliage = [],
  wrapping = [],
  accessories = [],
  cardMessage,
  partnerInstruction,
  partnerName,
  recipientName = "Khách hàng",
  recipientPhone,
  deliveryAddress,
  customFields = [],
  dimensions,
  assemblySteps,
  onConfirmAcceptance,
  onCancelOrder,
  onPrint,
}: FloristJobCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const defaultFee = suggestedFeeVnd ?? Math.round(unitPriceVnd * 0.5)
  const [feeOverride, setSuggestedCraftFee] = useState<number | null>(null)
  const suggestedCraftFee = feeOverride ?? defaultFee
  const [maskPhone, setMaskPhone] = useState(true)
  const [copiedImage, setCopiedImage] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)

  const handleCopyText = async () => {
    const phoneDisplay = maskPhone ? maskPhoneNumber(recipientPhone) : recipientPhone || "Chưa có"
    const flowerSummary = flowers.map((f) => `${f.flowerName} (${f.quantity} ${f.unit})`).join(", ")
    const textBrief = [
      `📋 THẺ GIA CÔNG — ĐƠN #${orderCode}`,
      `✨ Mẫu: ${recipeTitle}`,
      `⏰ Hạn ${ti.makerAction.toLowerCase()} xong: ${targetReadyTime}${deliveryTargetTime ? ` (Giao lúc: ${deliveryTargetTime})` : ""}`,
      `💰 Giá gia công: ${suggestedCraftFee.toLocaleString("vi-VN")}đ`,
      `🌿 ${ti.rawMaterialItem} chính: ${flowerSummary || "Theo mẫu"}`,
      cardMessage ? `💌 Thiệp: "${cardMessage}"` : "",
      `📍 Giao tới: ${recipientName} · ${phoneDisplay} · ${formatAddress(deliveryAddress)}`,
      partnerInstruction ? `⚠️ Lưu ý: ${partnerInstruction}` : "",
      ``,
      `🌸 AVI LOTUS GROUP`,
    ]
      .filter(Boolean)
      .join("\n")

    try {
      await navigator.clipboard.writeText(textBrief)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2500)
    } catch {
    }
  }

  const handleCopyImage = async () => {
    if (!cardRef.current) return
    try {
      const { toBlob } = await import("html-to-image")
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        skipFonts: true,
      })
      if (blob && navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        setCopiedImage(true)
        setTimeout(() => setCopiedImage(false), 2500)
        return
      }
      throw new Error("Không hỗ trợ clipboard blob")
    } catch {
      try {
        const html2canvasModule = await import("html2canvas").catch(() => null)
        if (html2canvasModule && html2canvasModule.default) {
          const canvas = await html2canvasModule.default(cardRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
          })
          canvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && window.ClipboardItem) {
              await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
              setCopiedImage(true)
              setTimeout(() => setCopiedImage(false), 2500)
            } else {
              await handleCopyText()
            }
          })
          return
        }
      } catch {
      }
      await handleCopyText()
    }
  }

  return (
    <div className="flex flex-col gap-4" style={AVI_LOTUS_BRAND_VARS}>
      {/* Top Header & Actions Bar (Thao tác điều phối, không đưa vào ảnh gửi thợ) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-5 rounded-2xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-caption font-extrabold uppercase tracking-wider text-[var(--avi-primary)] bg-[var(--avi-primary-10)] px-2 py-0.5 rounded-full">
              Thẻ Gia Công Cắm Hoa
            </span>
            <span className="text-caption font-bold text-text-muted">Đơn #{orderCode}</span>
          </div>
          <h3 className="text-title-sm font-extrabold text-text mt-1">{recipeTitle}</h3>
          {partnerName && (
            <div className="text-caption text-text-muted mt-0.5">
              Xưởng / Thợ phụ trách: <strong className="text-text">{partnerName}</strong>
            </div>
          )}
        </div>

        {/* Top-Right Action Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="text-caption gap-1.5 h-8 font-semibold text-text"
          >
            {copiedText ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
            <span>{copiedText ? "Đã chép text" : "Copy text Zalo"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyImage}
            className="text-caption gap-1.5 h-8 font-semibold text-text"
          >
            {copiedImage ? <Check size={13} className="text-primary" /> : <Sparkles size={13} className="text-primary" />}
            <span>{copiedImage ? "Đã chép ảnh" : "Copy ảnh thẻ"}</span>
          </Button>

          {onPrint && (
            <Button variant="ghost" size="sm" onClick={onPrint} className="h-8 text-caption gap-1 text-text-muted">
              <Printer size={13} />
              <span className="hidden sm:inline">In PDF</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Card (Chỉ chụp vùng này từ header thương hiệu trở xuống) */}
      <Card ref={cardRef} className="rounded-2xl border border-[var(--avi-primary-15)] bg-surface p-0 shadow-sm overflow-hidden flex flex-col gap-0">
        {/* Header — nền thương hiệu AVI LOTUS GROUP (đưa vào vùng xuất ảnh để thợ/xưởng thấy đúng thương hiệu) */}
        <div
          className="px-6 py-3.5 flex items-center gap-2.5"
          style={{ background: `linear-gradient(to right, var(--avi-primary), var(--avi-primary-dark))` }}
        >
          <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center p-1.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVI_LOTUS_LOGO.iconWhite} alt="AVI LOTUS GROUP" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-white/80 text-caption font-bold uppercase tracking-wider">
              Thẻ Gia Công Cắm Hoa · Đơn #{orderCode}
            </div>
            <div className="text-white text-body-sm font-extrabold truncate">{recipeTitle}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6">
          {/* Sample Image */}
          <div className="flex flex-col gap-2">
            <span className="text-caption font-bold text-[var(--avi-ink-muted)] flex items-center justify-between">
              <span>ẢNH MẪU THAM CHIẾU</span>
              {deliveryTargetTime && (
                <span className="text-caption font-normal text-[var(--avi-ink-muted)]">Giao: {deliveryTargetTime}</span>
              )}
            </span>
            <DimensionPhotoFrame sampleImageUrl={sampleImageUrl} alt={ti.sampleProduct} dimensions={dimensions} />

            {/* Target Ready Time Badge */}
            <div className="p-2.5 rounded-xl bg-[var(--avi-brick-10)] border border-[var(--avi-brick-25)] flex items-center justify-between text-caption">
              <span className="font-bold text-[var(--avi-brick)] flex items-center gap-1.5">
                <Clock size={14} />
                Hạn cắm xong:
              </span>
              <span className="font-extrabold text-[var(--avi-brick)] text-body-sm">{targetReadyTime}</span>
            </div>

            {/* Editable Suggested Craft Fee (Đã loại bỏ Giá bán đơn và Đặt lại 50% bảo mật nội bộ) */}
            <div className="p-3 rounded-xl bg-[var(--avi-primary-05)] border border-[var(--avi-primary-15)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption font-bold text-[var(--avi-ink)]">Giá gia công trên thẻ:</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  step={10000}
                  value={suggestedCraftFee || ""}
                  onChange={(e) => setSuggestedCraftFee(Number(e.target.value))}
                  placeholder={`${defaultFee.toLocaleString("vi-VN")}đ`}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--avi-ink-15)] bg-surface text-[var(--avi-ink)] font-bold text-body-sm focus:outline-none focus:ring-1 focus:ring-[var(--avi-primary)]"
                />
                <span className="absolute right-2.5 top-1.5 text-caption font-bold text-[var(--avi-ink-muted)]">VNĐ</span>
              </div>
            </div>
          </div>

        {/* Recipe & Details */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <FloristJobBom flowers={flowers} foliage={foliage} wrapping={wrapping} accessories={accessories} />

          {assemblySteps && assemblySteps.length > 0 && <AssemblyStepsPanel steps={assemblySteps} />}

          {/* Card Message */}
          {cardMessage && (
            <div className="p-3 rounded-xl bg-[var(--avi-pink-25)] border border-[var(--avi-pink)] text-caption">
              <div className="font-bold text-[var(--avi-pink-text)] flex items-center gap-1.5 mb-1">
                <MessageSquare size={13} />
                <span>Nội dung thiệp / Banner (In nguyên văn):</span>
              </div>
              <p className="text-[var(--avi-pink-text)] font-medium italic">&ldquo;{cardMessage}&rdquo;</p>
            </div>
          )}

          <FloristJobCardRecipient
            makerTitle={ti.makerTitle}
            recipientName={recipientName}
            recipientPhone={recipientPhone}
            deliveryAddress={deliveryAddress}
            maskPhone={maskPhone}
            onToggleMask={() => setMaskPhone(!maskPhone)}
            partnerInstruction={partnerInstruction}
            customFields={customFields}
          />
        </div>
        </div>

        {/* Footer — thương hiệu AVI LOTUS GROUP */}
        <div className="px-6 py-3 bg-[var(--avi-cream)] border-t border-[var(--avi-ink-08)] flex items-center gap-1.5 text-caption text-[var(--avi-ink-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVI_LOTUS_LOGO.iconDark} alt="" className="h-3.5 w-auto opacity-70" />
          AVI LOTUS GROUP • Thẻ Gia Công tự động
        </div>
      </Card>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-dashed border-border">
        <div className="text-caption text-text-muted">
          Điều phối gửi Thẻ Gia công để thợ thẩm định. Sau khi chốt giá, bấm Xác nhận nhận đơn.
        </div>
        <div className="flex items-center gap-2">
          {onCancelOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelOrder}
              className="text-caption h-8 text-[var(--avi-brick)] border-[var(--avi-brick)]/40 hover:bg-[var(--avi-brick-10)] gap-1.5 font-bold"
            >
              <Ban size={13} />
              <span>Hủy không nhận đơn</span>
            </Button>
          )}

          {onConfirmAcceptance && (
            <Button
              size="sm"
              onClick={() => onConfirmAcceptance(suggestedCraftFee)}
              className="bg-[var(--avi-primary)] hover:bg-[var(--avi-primary-dark)] text-white text-caption h-8 gap-1.5 font-bold shadow-sm"
            >
              <CheckCircle2 size={14} />
              <span>Xác nhận nhận đơn</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
