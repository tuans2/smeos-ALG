"use client"

import React, { useRef, useState } from "react"
import { CheckCircle2, Clock, Copy, Check, ShieldCheck, Printer } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi } from "@/components/greeting-card/greeting-api"
import { OrderEvidencePrint } from "./order-evidence-print"
import type { TimelineEvent, StepSegment } from "@/modules/greeting-card/domain/tracking-timeline"

import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

interface EvidenceTimelineProps {
  orderId?: string | null | undefined
  sessionId?: string | null | undefined
  orderCode?: string | null | undefined
  customerName?: string | null | undefined
  customerPhone?: string | null | undefined
  recipientName?: string | null | undefined
  recipientPhone?: string | null | undefined
  deliveryAddress?: string | null | undefined
  deliveryTimeSlot?: string | null | undefined
  productName?: string | null | undefined
  totalVnd?: number | null | undefined
  paidVnd?: number | null | undefined
}

interface AllImageUrls {
  productPhotoUrls: string[]
  recipientPhotoUrls: string[]
  paymentProofUrl: string | null
  paymentProofBalanceUrl: string | null
}

interface TimelineResponse {
  orderId: string | null
  sessionId: string | null
  segments: StepSegment[]
  data: TimelineEvent[]
  total: number
  allImageUrls?: AllImageUrls | undefined
}

function formatDt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  return `${hh}:${mm} - ${dd}/${mo}/${d.getFullYear()}`
}

const IMAGE_EVENT_KINDS = new Set(["PRODUCT_PHOTO_UPLOADED", "RECIPIENT_PHOTO_UPLOADED", "CLICK_PAID"])

export function EvidenceTimelineDiagram({
  orderId, sessionId, orderCode, customerName, customerPhone,
  recipientName, recipientPhone, deliveryAddress, deliveryTimeSlot,
  productName, totalVnd, paidVnd,
}: EvidenceTimelineProps) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const [copied, setCopied] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const qs = orderId ? `orderId=${encodeURIComponent(orderId)}` : `sessionId=${encodeURIComponent(sessionId ?? "")}`
  const { data, isLoading } = useApi<TimelineResponse>(`/api/v1/greeting-card/tracking/timeline?${qs}`)

  const events = data?.data ?? []
  const segments = data?.segments ?? []
  const allImageUrls = data?.allImageUrls ?? { productPhotoUrls: [], recipientPhotoUrls: [], paymentProofUrl: null, paymentProofBalanceUrl: null }

  const hasImages = allImageUrls.productPhotoUrls.length > 0
    || allImageUrls.recipientPhotoUrls.length > 0
    || allImageUrls.paymentProofUrl != null
    || allImageUrls.paymentProofBalanceUrl != null

  function handleCopyEvidence() {
    const lines: string[] = [
      `=== BẰNG CHỨNG ĐỐI SOÁT ĐƠN HÀNG ALG ===`,
      `Mã đơn: #${orderCode || "---"}`,
      `${orderTerms.customerRoleLabel}: ${customerName || "---"} (${customerPhone || "---"})`,
      `${orderTerms.recipientRoleLabel}: ${recipientName || "---"} (${recipientPhone || "---"})`,
      `${orderTerms.addressLabel}: ${deliveryAddress || "---"}`,
      `${orderTerms.deliveryTimeLabel}: ${deliveryTimeSlot || orderTerms.fallbackTimeSlotText}`,
      `${terms.sampleProduct}: ${productName || "---"}`,
      `Giá trị: ${(totalVnd ?? 0).toLocaleString("vi-VN")} đ | Đã thanh toán: ${(paidVnd ?? 0).toLocaleString("vi-VN")} đ`,
      ``,
      `--- LỊCH SỬ DIỄN TIẾN & MỐC BẰNG CHỨNG ---`,
    ]
    if (events.length === 0) {
      lines.push(`(Chưa có bản ghi sự kiện chi tiết)`)
    } else {
      for (const ev of events) {
        lines.push(`• [${formatDt(ev.at)}] ${ev.label}${ev.note ? ` — Ghi chú: ${ev.note}` : ""}`)
      }
    }
    lines.push(``)
    lines.push(`Hệ thống đối soát xác nhận tự động · ALG Core`)
    void navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handlePrint() {
    const printHtml = printRef.current?.innerHTML
    if (!printHtml) return
    const win = window.open("", "_blank", "width=800,height=900")
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="vi"><head>
      <meta charset="UTF-8">
      <title>Bằng chứng đơn hàng #${orderCode ?? ""}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #fff; color: #111; }
        img { max-width: 100%; display: block; }
        @media print {
          body { margin: 0; }
          @page { size: A4; margin: 15mm 12mm; }
        }
      </style>
    </head><body>${printHtml}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 600)
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-alt p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" />
          <h4 className="text-body-sm font-extrabold text-text">
            Lịch sử đơn hàng &amp; bằng chứng xác nhận
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button" size="sm" variant="outline"
            onClick={handleCopyEvidence}
            className="h-8 gap-1.5 text-caption font-bold"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            <span>{copied ? "Đã sao chép bằng chứng" : "Sao chép tóm tắt đối soát"}</span>
          </Button>
          {!isLoading && events.length > 0 && (
            <Button
              type="button" size="sm" variant="outline"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-caption font-bold"
            >
              <Printer size={14} />
              <span>In / Xuất PDF</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-caption text-text-muted">
          <Clock size={16} className="mr-2 animate-spin motion-reduce:animate-none text-primary" />
          Đang nạp dữ liệu lịch sử đối soát...
        </div>
      ) : events.length === 0 ? (
        <p className="py-4 text-center text-caption italic text-text-muted">
          Chưa ghi nhận sự kiện lịch sử nào cho mục này.
        </p>
      ) : (
        <div className="relative pl-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-0.5 before:bg-border">
          <div className="flex flex-col gap-4">
            {events.map((ev, idx) => {
              const isLatest = idx === events.length - 1
              const hasEventImages = ev.imageUrls && ev.imageUrls.length > 0
              return (
                <div key={`${ev.at}-${idx}`} className="relative flex flex-col gap-0.5">
                  <div
                    className={`absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-surface ${
                      hasEventImages ? "border-success text-success" : isLatest ? "border-primary text-primary" : "border-border text-text-muted"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${hasEventImages ? "bg-success" : isLatest ? "bg-primary" : "bg-text-muted"}`} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className={`text-body-sm font-bold ${IMAGE_EVENT_KINDS.has(ev.kind) ? "text-text" : "text-text"}`}>
                      {ev.label}
                      {hasEventImages && (
                        <span className="ml-1.5 text-caption font-normal text-success">📸 {ev.imageUrls!.length} ảnh</span>
                      )}
                    </span>
                    <span className="font-mono text-caption text-text-muted">{formatDt(ev.at)}</span>
                  </div>
                  {ev.note && <p className="text-caption text-text-muted italic">{ev.note}</p>}
                  {/* Thumbnails ảnh inline */}
                  {hasEventImages && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ev.imageUrls!.map((url, j) => (
                        <a
                          key={j} href={url} target="_blank" rel="noopener noreferrer"
                          className="relative h-20 w-20 overflow-hidden rounded-lg border border-border block group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-caption font-bold">
                            Xem
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {segments.length > 0 && (
        <div className="mt-2 border-t border-border/40 pt-3">
          <span className="text-caption font-bold text-text-muted block mb-1.5">
            Thời lượng từng bước:
          </span>
          <div className="flex flex-wrap gap-2">
            {segments.map((seg) => (
              <span
                key={seg.stepId}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-caption font-medium"
              >
                <CheckCircle2 size={12} className="text-success" />
                <span>{seg.title}: {seg.durationMinutes} phút</span>
                {seg.overMinutes > 0 && (
                  <span className="text-danger font-bold">(vượt {seg.overMinutes}p)</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tổng hợp ảnh bằng chứng */}
      {hasImages && (
        <div className="mt-2 border-t border-border/40 pt-3 flex flex-col gap-3">
          <span className="text-caption font-bold text-text-muted">Toàn bộ ảnh bằng chứng:</span>
          {(allImageUrls.paymentProofUrl || allImageUrls.paymentProofBalanceUrl) && (
            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-text-muted font-bold">📸 Ảnh chuyển khoản</span>
              <div className="flex gap-2 flex-wrap">
                {allImageUrls.paymentProofUrl && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-caption text-text-muted">Lần 1</span>
                    <a href={allImageUrls.paymentProofUrl} target="_blank" rel="noopener noreferrer"
                      className="relative h-24 w-24 overflow-hidden rounded-lg border border-border block group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={allImageUrls.paymentProofUrl} alt="CK lần 1" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-caption font-bold">Xem</div>
                    </a>
                  </div>
                )}
                {allImageUrls.paymentProofBalanceUrl && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-caption text-text-muted">Lần 2</span>
                    <a href={allImageUrls.paymentProofBalanceUrl} target="_blank" rel="noopener noreferrer"
                      className="relative h-24 w-24 overflow-hidden rounded-lg border border-border block group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={allImageUrls.paymentProofBalanceUrl} alt="CK lần 2" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-caption font-bold">Xem</div>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          {allImageUrls.productPhotoUrls.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-text-muted font-bold">🌸 Ảnh hoa thành phẩm</span>
              <div className="flex gap-2 flex-wrap">
                {allImageUrls.productPhotoUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="relative h-24 w-24 overflow-hidden rounded-lg border border-border block group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Hoa ${i + 1}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-caption font-bold">Xem</div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {allImageUrls.recipientPhotoUrls.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-text-muted font-bold">📷 Ảnh người nhận</span>
              <div className="flex gap-2 flex-wrap">
                {allImageUrls.recipientPhotoUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="relative h-24 w-24 overflow-hidden rounded-lg border border-border block group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Người nhận ${i + 1}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-caption font-bold">Xem</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden print template */}
      <div ref={printRef} style={{ display: "none" }}>
        <OrderEvidencePrint
          orderCode={orderCode}
          customerName={customerName}
          customerPhone={customerPhone}
          recipientName={recipientName}
          deliveryAddress={deliveryAddress}
          deliveryTimeSlot={deliveryTimeSlot}
          productName={productName}
          totalVnd={totalVnd}
          paidVnd={paidVnd}
          events={events}
          segments={segments}
          allImageUrls={allImageUrls}
        />
      </div>
    </div>
  )
}
