"use client"

import React, { useRef, useCallback, useState } from "react"
import { Clock } from "@/components/ui/icon-set/clock"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Copy } from "@/components/ui/icon-set/copy"
import { Send } from "@/components/ui/icon-set/send"
import { Download } from "@/components/ui/icon-set/download"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Banknote } from "@/components/ui/icon-set/banknote"
import { ClipboardList } from "@/components/ui/icon-set/clipboard-list"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import type {
  AccessoryBomItem,
  FlowerBomItem,
  FoliageBomItem,
  StructuredAddress,
  WrappingLayer,
} from "@/modules/products/domain/product-master-index"
import type { VisibleCustomField } from "@/components/coordinator/custom-fields-section"
import { formatDateTime } from "@/lib/i18n/formatters"
import { PartnerProductCardBom } from "./partner-product-card-bom"
import { AVI_LOTUS_BRAND_VARS, AVI_LOTUS_LOGO } from "./avi-lotus-brand"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PartnerProductCardProps {
  /** Mã đơn hàng */
  orderCode: string
  /** Tên sản phẩm */
  productTitle: string
  /** URL ảnh mẫu sản phẩm */
  sampleImageUrl?: string | null | undefined
  /** BOM — Công thức cành hoa */
  flowers: FlowerBomItem[]
  /** ĐP-2.12 (26/09/2026): lá/cành trang trí từ snapshot Master Index (MI-5) — rỗng nếu đơn không chọn mẫu từ danh mục. */
  foliage?: FoliageBomItem[] | undefined
  /** Các lớp gói theo snapshot Master Index. */
  wrapping?: WrappingLayer[] | undefined
  /** Phụ kiện trang trí theo snapshot Master Index. */
  accessories?: AccessoryBomItem[] | undefined
  /** Giá bán ra khách (VNĐ) */
  unitPriceVnd?: number | undefined
  /** Giá công trả đối tác (VNĐ) */
  partnerPayoutVnd?: number | undefined
  /** Thời gian yêu cầu hoàn thành */
  deliveryTargetTime: string
  /** Địa chỉ giao hàng */
  deliveryAddress: StructuredAddress | string
  /** Tên người nhận */
  recipientName: string
  /** SĐT người nhận */
  recipientPhone: string
  /** Nội dung thiệp */
  cardMessage?: string | undefined
  /** Ghi chú kỹ thuật từ điều phối viên */
  technicalNotes?: string | undefined
  /** Tên đối tác xưởng đã phân công */
  partnerName?: string | undefined
  /** Mức độ rủi ro */
  riskLevel?: "NORMAL" | "ATTENTION" | "AT_RISK" | "CRITICAL" | undefined
  /** Lý do rủi ro */
  riskReason?: string | null | undefined
  /**
   * ĐP-3.16 (26/09/2026): trường tự tạo (entity ORDER) đã lọc theo đối
   * tượng PARTNER (`visibleCustomFieldsForAudience`, `custom-fields-section.tsx`)
   * — caller (control-tower-dashboard.tsx) tự lọc trước khi truyền vào, thẻ
   * này không tự quyết định ẩn/hiện.
   */
  customFields?: VisibleCustomField[] | undefined
  /** Callback chuyển bước */
  onAdvanceStage?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAddress(addr: StructuredAddress | string): string {
  if (typeof addr === "string") return addr
  return [addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(", ")
}

export function buildZaloText(props: PartnerProductCardProps): string {
  const lines: string[] = [
    `📦 PHIẾU ĐẶT HÀNG GIA CÔNG — ĐƠN #${props.orderCode}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📋 Sản phẩm: ${props.productTitle}`,
  ]

  if (props.partnerPayoutVnd) {
    lines.push(`💰 Giá công: ${props.partnerPayoutVnd.toLocaleString("vi-VN")}đ`)
  }

  if (props.flowers.length > 0) {
    lines.push(``)
    lines.push(`🌿 Công thức định lượng (BOM):`)
    props.flowers.forEach((fl) => {
      lines.push(`   • ${fl.quantity} ${fl.unit} ${fl.flowerName} (${fl.color})`)
    })
  }

  lines.push(``)
  lines.push(`⏰ Hoàn thành trước: ${props.deliveryTargetTime}`)
  lines.push(`📍 Giao tới: ${formatAddress(props.deliveryAddress)}`)
  lines.push(`👤 Người nhận: ${props.recipientName} (${props.recipientPhone})`)

  if (props.cardMessage) {
    lines.push(``)
    lines.push(`💌 Nội dung thiệp: "${props.cardMessage}"`)
  }

  if (props.technicalNotes) {
    lines.push(``)
    lines.push(`📝 Ghi chú kỹ thuật:`)
    lines.push(`${props.technicalNotes}`)
  }

  if (props.customFields && props.customFields.length > 0) {
    lines.push(``)
    lines.push(`ℹ️ Thông tin bổ sung:`)
    props.customFields.forEach((f) => lines.push(`   • ${f.label}: ${String(f.value)}`))
  }

  lines.push(``)
  lines.push(`━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🌸 AVI LOTUS GROUP • Kết nối giá trị, đồng hành phát triển`)

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PartnerProductCard(props: PartnerProductCardProps) {
  const {
    orderCode,
    productTitle,
    sampleImageUrl,
    flowers,
    foliage = [],
    wrapping = [],
    accessories = [],
    unitPriceVnd,
    partnerPayoutVnd,
    deliveryTargetTime,
    deliveryAddress,
    recipientName,
    recipientPhone,
    cardMessage,
    technicalNotes,
    partnerName,
    riskLevel,
    riskReason,
    customFields = [],
    onAdvanceStage,
  } = props

  const cardRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const formattedAddress = formatAddress(deliveryAddress)

  // ── Copy text Zalo ──
  const handleCopyZalo = useCallback(async () => {
    const text = buildZaloText(props)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [props])

  // ── Gửi Zalo đối tác (deep-link) ──
  const handleSendZalo = useCallback(() => {
    const text = encodeURIComponent(buildZaloText(props))
    window.open(`https://zalo.me/?text=${text}`, "_blank")
  }, [props])

  // ── Tải Product Card PNG ──
  const handleDownloadPng = useCallback(async () => {
    if (!cardRef.current) return
    try {
      // Dùng `html-to-image` (phụ thuộc sẵn có); `html2canvas` không có trong package.json.
      const { toPng } = await import("html-to-image")
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true })
      const link = document.createElement("a")
      link.download = `AviLotus_the-san-pham_${orderCode}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.warn("Tải PNG thất bại:", err)
      toast.error("Không tạo được ảnh PNG của thẻ (ảnh mẫu có thể chặn tải chéo nguồn). Dùng Copy Zalo thay thế.")
    }
  }, [orderCode, toast])

  const riskTone =
    riskLevel === "CRITICAL"
      ? "danger"
      : riskLevel === "AT_RISK"
      ? "warning"
      : riskLevel === "ATTENTION"
      ? "neutral"
      : "success"

  return (
    <div className="flex flex-col gap-4">
      {/* ── Thanh tác vụ góc trên bên phải ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[var(--avi-primary-10)] text-[var(--avi-primary)] text-caption font-black uppercase border border-[var(--avi-primary-30)] tracking-wider">
            T02 • PRODUCT CARD
          </span>
          <span className="text-caption font-bold text-[var(--avi-ink-muted)]">PHIẾU ĐẶT HÀNG GỬI ĐỐI TÁC</span>
          <span className="text-body-sm font-extrabold text-[var(--avi-ink)]">#{orderCode}</span>
        </div>

        {/* Primary Visible Buttons + Overflow Menu */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyZalo}
            className="h-7 text-caption px-2.5 font-bold gap-1 border-[var(--avi-sage)]/50 text-[var(--avi-primary)] bg-[var(--avi-sage-10)] hover:bg-[var(--avi-sage-15)]"
          >
            {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            <span>{copied ? "Đã copy!" : "Copy Zalo"}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendZalo}
            className="h-7 text-caption px-2.5 font-bold gap-1 border-[#0068FF]/30 text-[#0068FF] bg-[#0068FF]/10 hover:bg-[#0068FF]/15"
          >
            <Send size={12} />
            <span>Gửi Zalo</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPng}
            className="h-7 text-caption px-2.5 font-bold gap-1 border-[var(--avi-ink-15)] text-[var(--avi-ink-muted)] bg-[var(--avi-cream)] hover:opacity-80"
          >
            <Download size={12} />
            <span>Tải PNG</span>
          </Button>
        </div>
      </div>

      {/* ── Product Card chính (ref cho PNG export) ── */}
      <Card
        ref={cardRef}
        data-testid="t07-png-export-region"
        style={AVI_LOTUS_BRAND_VARS}
        className="rounded-2xl border border-[var(--avi-primary-15)] bg-white p-0 shadow-lg overflow-hidden"
      >
        {/* Header — nền thương hiệu AVI LOTUS GROUP */}
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ background: `linear-gradient(to right, var(--avi-primary), var(--avi-primary-dark))` }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center p-1.5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVI_LOTUS_LOGO.iconWhite} alt="AVI LOTUS GROUP" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-white/80 text-caption font-bold uppercase tracking-wider">
                Phiếu Đặt Hoa Đối Tác
              </div>
              <div className="text-white text-body-sm font-extrabold">
                ĐƠN #{orderCode}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5 text-white/90 text-caption font-bold">
              <Clock size={12} />
              <span>Hoàn thành trước:</span>
            </div>
            <div className="text-white text-body-sm font-black">
              {deliveryTargetTime}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Rủi ro cảnh báo */}
          {riskLevel && riskLevel !== "NORMAL" && riskReason && (
            <div
              className="flex items-start gap-2 p-2.5 rounded-xl text-caption font-medium"
              style={{
                background: riskLevel === "ATTENTION" ? "var(--avi-gold-10)" : "var(--avi-brick-10)",
                border: `1px solid ${riskLevel === "ATTENTION" ? "var(--avi-gold-30)" : "var(--avi-brick-25)"}`,
                color: riskLevel === "ATTENTION" ? "var(--avi-gold-text)" : "var(--avi-brick)",
              }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{riskReason}</span>
            </div>
          )}

          {/* Row 1: Ảnh + Thông tin sản phẩm */}
          <div className="flex gap-4">
            {/* Ảnh mẫu lớn */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl border-2 border-[var(--avi-primary-20)] overflow-hidden shrink-0 relative bg-[var(--avi-cream)] shadow-sm">
              {sampleImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sampleImageUrl}
                  alt={productTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--avi-ink-muted)] gap-1.5">
                  <ImageIcon size={32} />
                  <span className="text-caption font-medium">Chưa có ảnh mẫu</span>
                </div>
              )}
              {/* Badge ảnh mẫu */}
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[var(--avi-primary)]/90 text-white text-caption font-black uppercase backdrop-blur-sm">
                Ảnh Mẫu
              </div>
            </div>

            {/* Thông tin sản phẩm */}
            <div className="flex-1 flex flex-col gap-2.5 min-w-0">
              <div>
                <div className="text-caption font-bold text-[var(--avi-primary)] uppercase tracking-wide mb-0.5">
                  Tên sản phẩm
                </div>
                <div className="text-body font-extrabold text-[var(--avi-ink)] leading-snug">
                  {productTitle}
                </div>
              </div>

              {/* Giá */}
              <div className="flex items-center gap-3 flex-wrap">
                {partnerPayoutVnd != null && partnerPayoutVnd > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--avi-gold-10)] border border-[var(--avi-gold-30)]">
                    <Banknote size={14} className="text-[var(--avi-gold-text)]" />
                    <div>
                      <div className="text-caption font-bold text-[var(--avi-gold-text)] uppercase">Giá công đối tác</div>
                      <div className="text-body-sm font-black text-[var(--avi-gold-text)]">
                        {partnerPayoutVnd.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Đối tác đã phân công */}
              {partnerName && (
                <div className="px-2.5 py-1 rounded-lg bg-[var(--avi-blue-15)] border border-[var(--avi-blue)]/50 text-caption font-bold text-[var(--avi-blue-text)] inline-flex items-center gap-1.5 self-start">
                  🏪 Xưởng: {partnerName}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: BOM — Công thức cành hoa (tách sang partner-product-card-bom.tsx) */}
          <PartnerProductCardBom
            flowers={flowers}
            foliage={foliage}
            wrapping={wrapping}
            accessories={accessories}
          />

          {/* Row 3: Thông tin giao hàng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Địa chỉ giao */}
            <div className="p-3 rounded-xl bg-[var(--avi-cream)] border border-[var(--avi-ink-08)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[var(--avi-brick)]" />
                <span className="text-caption font-bold text-[var(--avi-ink-muted)] uppercase">Địa chỉ giao hàng</span>
                {typeof deliveryAddress === "object" && deliveryAddress !== null && (
                  <span className="text-caption font-bold text-[var(--avi-brick)] bg-[var(--avi-brick-10)] px-1.5 py-0.5 rounded border border-[var(--avi-brick-25)]">
                    Chuẩn 5 tầng
                  </span>
                )}
              </div>
              <div className="text-caption font-bold text-[var(--avi-ink)] leading-relaxed">
                {formattedAddress}
              </div>
              {typeof deliveryAddress === "object" && deliveryAddress !== null && (
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--avi-primary-10)] text-[var(--avi-primary)] text-caption font-bold">
                    {deliveryAddress.ward}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--avi-blue-15)] text-[var(--avi-blue-text)] text-caption font-bold">
                    {deliveryAddress.district}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--avi-gold-10)] text-[var(--avi-gold-text)] text-caption font-bold">
                    {deliveryAddress.city}
                  </span>
                </div>
              )}
            </div>

            {/* Người nhận */}
            <div className="p-3 rounded-xl bg-[var(--avi-cream)] border border-[var(--avi-ink-08)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-caption font-bold text-[var(--avi-ink-muted)] uppercase">👤 Người nhận hàng</span>
              </div>
              <div className="text-caption font-bold text-[var(--avi-ink)]">
                {recipientName}
              </div>
              <div className="text-caption text-[var(--avi-ink-muted)] font-medium">
                📞 {recipientPhone}
              </div>
            </div>
          </div>

          {/* Row 4: Thiệp */}
          {cardMessage && (
            <div className="p-3 rounded-xl bg-[var(--avi-pink-25)] border border-[var(--avi-pink)] flex items-start gap-2">
              <MessageSquare size={14} className="text-[var(--avi-pink-text)] shrink-0 mt-0.5" />
              <div>
                <div className="text-caption font-bold text-[var(--avi-pink-text)] uppercase mb-0.5">
                  Nội dung thiệp chúc mừng
                </div>
                <div className="text-caption text-[var(--avi-pink-text)] font-semibold italic leading-relaxed">
                  &ldquo;{cardMessage}&rdquo;
                </div>
              </div>
            </div>
          )}

          {/* Row 5: Ghi chú kỹ thuật */}
          {technicalNotes && (
            <div className="p-3 rounded-xl bg-[var(--avi-sage-10)] border border-[var(--avi-sage-40)] flex items-start gap-2">
              <ClipboardList size={14} className="text-[var(--avi-primary)] shrink-0 mt-0.5" />
              <div>
                <div className="text-caption font-bold text-[var(--avi-primary)] uppercase mb-0.5">
                  Ghi chú kỹ thuật từ Điều phối
                </div>
                <div className="text-caption text-[var(--avi-ink)] font-medium leading-relaxed whitespace-pre-line">
                  {technicalNotes}
                </div>
              </div>
            </div>
          )}

          {/* Row 6: Trường tự tạo hiện cho đối tác (ĐP-3.16) */}
          {customFields.length > 0 && (
            <div className="p-3 rounded-xl bg-[var(--avi-cream)] border border-[var(--avi-ink-08)]">
              <div className="text-caption font-bold text-[var(--avi-ink-muted)] uppercase mb-1">Thông tin bổ sung</div>
              <div className="space-y-0.5 text-caption text-[var(--avi-ink)]">
                {customFields.map((f) => (
                  <div key={f.key}>
                    <span className="font-semibold">{f.label}:</span> {String(f.value)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — thương hiệu AVI LOTUS GROUP */}
        <div className="px-5 py-3 bg-[var(--avi-cream)] border-t border-[var(--avi-ink-08)] flex items-center justify-between text-caption text-[var(--avi-ink-muted)]">
          <span className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVI_LOTUS_LOGO.iconDark} alt="" className="h-3.5 w-auto opacity-70" />
            AVI LOTUS GROUP • Phiếu đặt hoa đối tác tự động
          </span>
          <span className="font-bold">
            {formatDateTime(new Date())}
          </span>
        </div>
      </Card>

      {/* ── Giá bán khách: chỉ hiển thị nội bộ, KHÔNG nằm trong vùng PNG/cardRef ── */}
      {unitPriceVnd != null && unitPriceVnd > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-alt border border-dashed border-border self-start">
          <Banknote size={14} className="text-text-muted" />
          <div>
            <div className="text-caption font-bold text-text-muted uppercase flex items-center gap-1">
              Giá bán khách <span className="italic normal-case font-medium">(chỉ nội bộ, không gửi đối tác)</span>
            </div>
            <div className="text-body-sm font-bold text-text-muted">
              {unitPriceVnd.toLocaleString("vi-VN")}đ
            </div>
          </div>
        </div>
      )}

      {/* ── Nút chuyển bước ── */}
      {onAdvanceStage && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onAdvanceStage}
            className="bg-[#133d31] hover:bg-[#0c2920] text-white gap-1.5 px-4 font-bold shadow-sm"
          >
            <span>Chuyển bước</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}
