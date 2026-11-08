"use client"

import React, { useRef, useCallback, useState } from "react"
import { Flower2 } from "@/components/ui/icon-set/flower2"
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
import { Scissors } from "@/components/ui/icon-set/scissors"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"
import type {
  AccessoryBomItem,
  FlowerBomItem,
  FoliageBomItem,
  StructuredAddress,
  WrappingLayer,
} from "@/modules/products/domain/product-master-index"
import type { VisibleCustomField } from "@/components/coordinator/custom-fields-section"
import { formatDateTime } from "@/lib/i18n/formatters"

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
  lines.push(`smeOS • Hệ thống Điều phối Tự động`)

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
      link.download = `smeOS_the-san-pham_${orderCode}.png`
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
          <span className="px-2.5 py-0.5 rounded-md bg-primary-muted text-primary text-caption font-black uppercase border border-primary-border tracking-wider">
            T02 • PRODUCT CARD
          </span>
          <span className="text-caption font-bold text-text-muted">PHIẾU ĐẶT HÀNG GỬI ĐỐI TÁC</span>
          <span className="text-body-sm font-extrabold text-text">#{orderCode}</span>
        </div>

        {/* Primary Visible Buttons + Overflow Menu */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyZalo}
            className="h-7 text-caption px-2.5 font-bold gap-1 border-success-border text-success-text bg-success-bg hover:bg-success-bg/80"
          >
            {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            <span>{copied ? "Đã copy!" : "Copy Zalo"}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendZalo}
            className="h-7 text-caption px-2.5 font-bold gap-1 border-info-border text-info-text bg-info-bg hover:bg-info-bg/80"
          >
            <Send size={12} />
            <span>Gửi Zalo</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPng}
            className="h-7 text-caption px-2.5 font-bold gap-1 border-border text-text-muted bg-surface-alt hover:bg-surface-alt/80"
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
        className="rounded-2xl border-2 border-danger-border bg-white p-0 shadow-lg overflow-hidden"
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-primary via-primary to-primary-dark px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Flower2 size={18} className="text-white" />
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
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-warning-bg border border-warning-border text-warning-text text-caption font-medium">
              <AlertTriangle size={14} className="shrink-0 text-warning mt-0.5" />
              <span>{riskReason}</span>
            </div>
          )}

          {/* Row 1: Ảnh + Thông tin sản phẩm */}
          <div className="flex gap-4">
            {/* Ảnh mẫu lớn */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl border-2 border-primary-border overflow-hidden shrink-0 relative bg-surface-alt shadow-sm">
              {sampleImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sampleImageUrl}
                  alt={productTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-1.5">
                  <ImageIcon size={32} />
                  <span className="text-caption font-medium">Chưa có ảnh mẫu</span>
                </div>
              )}
              {/* Badge ảnh mẫu */}
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-danger/90 text-white text-caption font-black uppercase backdrop-blur-sm">
                Ảnh Mẫu
              </div>
            </div>

            {/* Thông tin sản phẩm */}
            <div className="flex-1 flex flex-col gap-2.5 min-w-0">
              <div>
                <div className="text-caption font-bold text-primary uppercase tracking-wide mb-0.5">
                  Tên sản phẩm
                </div>
                <div className="text-body font-extrabold text-text leading-snug">
                  {productTitle}
                </div>
              </div>

              {/* Giá */}
              <div className="flex items-center gap-3 flex-wrap">
                {partnerPayoutVnd != null && partnerPayoutVnd > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success-bg border border-success-border">
                    <Banknote size={14} className="text-success" />
                    <div>
                      <div className="text-caption font-bold text-success uppercase">Giá công đối tác</div>
                      <div className="text-body-sm font-black text-success-text">
                        {partnerPayoutVnd.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Đối tác đã phân công */}
              {partnerName && (
                <div className="px-2.5 py-1 rounded-lg bg-info-bg border border-info-border text-caption font-bold text-info-text inline-flex items-center gap-1.5 self-start">
                  🏪 Xưởng: {partnerName}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: BOM — Công thức cành hoa */}
          {flowers.length > 0 && (
            <div className="p-3.5 rounded-xl bg-primary-muted/60 border border-primary-border">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Scissors size={13} className="text-primary" />
                <span className="text-caption font-extrabold text-primary-dark uppercase tracking-wide">
                  Công Thức Cành Hoa
                </span>
                <Badge tone="danger" className="text-caption font-black ml-1">
                  {flowers.length} loại
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {flowers.map((fl, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-primary-muted shadow-xs"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary-muted text-primary text-caption font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-bold text-text truncate flex items-center gap-1.5 flex-wrap">
                        <span>{fl.flowerName}</span>
                        {fl.shade && (
                          <span className="px-1 py-0 rounded bg-surface-alt text-text-muted text-caption font-bold">
                            {fl.shade}
                          </span>
                        )}
                        {typeof fl.budCount === "number" && fl.budCount > 0 && (
                          <span className="px-1 py-0 rounded bg-warning-bg text-warning-text text-caption font-bold">
                            {fl.budCount} nụ chưa nở
                          </span>
                        )}
                      </div>
                      <div className="text-caption text-text-muted font-medium">
                        {fl.quantity} {fl.unit} • {fl.color}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ĐP-2.12 (26/09/2026): lá/gói/phụ kiện thật từ snapshot Master Index — trước bản
              này T07-BRIEF chỉ có cành hoa, thợ không biết gói/phụ kiện đúng mẫu là gì. */}
          {(foliage.length > 0 || wrapping.length > 0 || accessories.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-caption">
              {foliage.length > 0 && (
                <div className="p-2.5 rounded-lg bg-success-bg/60 border border-success-border">
                  <span className="font-bold text-success-text block mb-1">🌿 Lá/cành đệm</span>
                  <div className="text-success space-y-0.5">
                    {foliage.map((fol, i) => (
                      <div key={i}>• {fol.name} ({fol.role}){fol.quantity ? ` × ${fol.quantity} ${fol.unit}` : ""}</div>
                    ))}
                  </div>
                </div>
              )}
              {wrapping.length > 0 && (
                <div className="p-2.5 rounded-lg bg-info-bg/60 border border-info-border">
                  <span className="font-bold text-info-text block mb-1">🎁 Gói ({wrapping.length} lớp)</span>
                  <div className="text-info space-y-0.5">
                    {wrapping.map((w, i) => (
                      <div key={i}>• {w.layer}: {w.material}, {w.color}</div>
                    ))}
                  </div>
                </div>
              )}
              {accessories.length > 0 && (
                <div className="p-2.5 rounded-lg bg-accent-bg/60 border border-accent-border">
                  <span className="font-bold text-accent-text block mb-1">✨ Phụ kiện</span>
                  <div className="text-accent-text space-y-0.5">
                    {accessories.map((a, i) => (
                      <div key={i}>• {a.name} ({a.material}, {a.color}){a.printedText ? ` — "${a.printedText}"` : ""}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row 3: Thông tin giao hàng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Địa chỉ giao */}
            <div className="p-3 rounded-xl bg-surface-alt border border-border flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-danger-text" />
                <span className="text-caption font-bold text-text-muted uppercase">Địa chỉ giao hàng</span>
                {typeof deliveryAddress === "object" && deliveryAddress !== null && (
                  <span className="text-caption font-bold text-danger-text bg-danger-bg px-1.5 py-0.5 rounded border border-danger-border">
                    Chuẩn 5 tầng
                  </span>
                )}
              </div>
              <div className="text-caption font-bold text-text leading-relaxed">
                {formattedAddress}
              </div>
              {typeof deliveryAddress === "object" && deliveryAddress !== null && (
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-primary-muted text-primary text-caption font-bold">
                    {deliveryAddress.ward}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-info-bg text-info-text text-caption font-bold">
                    {deliveryAddress.district}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-accent-bg text-accent-text text-caption font-bold">
                    {deliveryAddress.city}
                  </span>
                </div>
              )}
            </div>

            {/* Người nhận */}
            <div className="p-3 rounded-xl bg-surface-alt border border-border flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-caption font-bold text-text-muted uppercase">👤 Người nhận hàng</span>
              </div>
              <div className="text-caption font-bold text-text">
                {recipientName}
              </div>
              <div className="text-caption text-text-muted font-medium">
                📞 {recipientPhone}
              </div>
            </div>
          </div>

          {/* Row 4: Thiệp */}
          {cardMessage && (
            <div className="p-3 rounded-xl bg-warning-bg/60 border border-warning-border flex items-start gap-2">
              <MessageSquare size={14} className="text-warning shrink-0 mt-0.5" />
              <div>
                <div className="text-caption font-bold text-warning uppercase mb-0.5">
                  Nội dung thiệp chúc mừng
                </div>
                <div className="text-caption text-warning-text font-semibold italic leading-relaxed">
                  &ldquo;{cardMessage}&rdquo;
                </div>
              </div>
            </div>
          )}

          {/* Row 5: Ghi chú kỹ thuật */}
          {technicalNotes && (
            <div className="p-3 rounded-xl bg-accent-bg/60 border border-accent-border flex items-start gap-2">
              <ClipboardList size={14} className="text-accent shrink-0 mt-0.5" />
              <div>
                <div className="text-caption font-bold text-accent-text uppercase mb-0.5">
                  Ghi chú kỹ thuật từ Điều phối
                </div>
                <div className="text-caption text-accent-text font-medium leading-relaxed whitespace-pre-line">
                  {technicalNotes}
                </div>
              </div>
            </div>
          )}

          {/* Row 6: Trường tự tạo hiện cho đối tác (ĐP-3.16) */}
          {customFields.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-alt border border-border">
              <div className="text-caption font-bold text-text-muted uppercase mb-1">Thông tin bổ sung</div>
              <div className="space-y-0.5 text-caption text-text">
                {customFields.map((f) => (
                  <div key={f.key}>
                    <span className="font-semibold">{f.label}:</span> {String(f.value)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-alt border-t border-border flex items-center justify-between text-caption text-text-muted">
          <span>smeOS Coordinator • Phiếu T02 tự động</span>
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
            className="bg-danger hover:bg-danger-text text-white gap-1.5 px-4 font-bold shadow-sm"
          >
            <span>Chuyển bước</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}
