"use client"

import React from "react"
import type { TimelineEvent, StepSegment } from "@/modules/greeting-card/domain/tracking-timeline"

interface AllImageUrls {
  productPhotoUrls: string[]
  recipientPhotoUrls: string[]
  paymentProofUrl: string | null
  paymentProofBalanceUrl: string | null
}

interface OrderEvidencePrintProps {
  orderCode?: string | null | undefined
  customerName?: string | null | undefined
  customerPhone?: string | null | undefined
  recipientName?: string | null | undefined
  deliveryAddress?: string | null | undefined
  deliveryTimeSlot?: string | null | undefined
  productName?: string | null | undefined
  totalVnd?: number | null | undefined
  paidVnd?: number | null | undefined
  events: TimelineEvent[]
  segments: StepSegment[]
  allImageUrls: AllImageUrls
  storeName?: string | null | undefined
}

function fmtDt(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} — ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

function vnd(n: number) {
  return `${n.toLocaleString("vi-VN")} đ`
}

/** Template bằng chứng đơn hàng — tối ưu cho window.print() / lưu PDF. */
export function OrderEvidencePrint({
  orderCode, customerName, customerPhone, recipientName,
  deliveryAddress, deliveryTimeSlot, productName,
  totalVnd, paidVnd, events, segments, allImageUrls, storeName,
}: OrderEvidencePrintProps) {
  const printedAt = new Date().toLocaleString("vi-VN")

  return (
    <div id="order-evidence-print" style={{ fontFamily: "Arial, sans-serif", maxWidth: 720, margin: "0 auto", padding: "24px 20px", color: "#111" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#555" }}>
            {storeName ?? "ALG"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>
            BẰNG CHỨNG ĐƠN HÀNG
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#444", marginTop: 2 }}>
            #{orderCode ?? "—"}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#666" }}>
          <div>In lúc: {printedAt}</div>
          <div style={{ marginTop: 4, fontSize: 9 }}>ALG · Nền tảng quản trị bán hàng đa ngành</div>
        </div>
      </div>

      {/* Thông tin đơn hàng */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Người đặt hàng</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{customerName ?? "—"}</div>
          {customerPhone && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{customerPhone}</div>}
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Người nhận hàng</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{recipientName ?? customerName ?? "—"}</div>
          {deliveryAddress && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{deliveryAddress}</div>}
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Mẫu sản phẩm</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{productName ?? "—"}</div>
          {deliveryTimeSlot && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Giao: {deliveryTimeSlot}</div>}
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Thanh toán</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Tổng: {vnd(totalVnd ?? 0)}</div>
          <div style={{ fontSize: 11, color: "#5F714B", fontWeight: 700, marginTop: 2 }}>Đã thu: {vnd(paidVnd ?? 0)}</div>
          {(totalVnd ?? 0) > (paidVnd ?? 0) && (
            <div style={{ fontSize: 11, color: "#9C3740", fontWeight: 700 }}>
              Còn: {vnd(Math.max(0, (totalVnd ?? 0) - (paidVnd ?? 0)))}
            </div>
          )}
        </div>
      </div>

      {/* Ảnh chuyển khoản */}
      {(allImageUrls.paymentProofUrl || allImageUrls.paymentProofBalanceUrl) && (
        <div style={{ marginBottom: 16, border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 8 }}>
            📸 Ảnh chuyển khoản của khách
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {allImageUrls.paymentProofUrl && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 10, color: "#555" }}>Lần 1 (Cọc / Trả đủ)</div>
                <img src={allImageUrls.paymentProofUrl} alt="Ảnh CK lần 1" style={{ width: 160, height: 200, objectFit: "cover", border: "1px solid #ddd", borderRadius: 4 }} />
              </div>
            )}
            {allImageUrls.paymentProofBalanceUrl && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 10, color: "#555" }}>Lần 2 (Phần còn lại)</div>
                <img src={allImageUrls.paymentProofBalanceUrl} alt="Ảnh CK lần 2" style={{ width: 160, height: 200, objectFit: "cover", border: "1px solid #ddd", borderRadius: 4 }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ảnh thành phẩm */}
      {allImageUrls.productPhotoUrls.length > 0 && (
        <div style={{ marginBottom: 16, border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 8 }}>
            🌸 Ảnh hoa thành phẩm (do tiệm tải lên)
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {allImageUrls.productPhotoUrls.map((url, i) => (
              <img key={i} src={url} alt={`Ảnh hoa ${i + 1}`} style={{ width: 140, height: 140, objectFit: "cover", border: "1px solid #ddd", borderRadius: 4 }} />
            ))}
          </div>
        </div>
      )}

      {/* Ảnh người nhận */}
      {allImageUrls.recipientPhotoUrls.length > 0 && (
        <div style={{ marginBottom: 16, border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 8 }}>
            📷 Ảnh người nhận (bằng chứng giao hàng thành công)
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {allImageUrls.recipientPhotoUrls.map((url, i) => (
              <img key={i} src={url} alt={`Ảnh người nhận ${i + 1}`} style={{ width: 140, height: 140, objectFit: "cover", border: "1px solid #ddd", borderRadius: 4 }} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline sự kiện */}
      <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 10 }}>
          📋 Lịch sử diễn tiến & Mốc bằng chứng
        </div>
        {events.map((ev, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: i < events.length - 1 ? "1px solid #eee" : "none" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.imageUrls?.length ? "#5F714B" : "#999", marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{ev.label}</span>
                <span style={{ fontSize: 10, color: "#888", fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmtDt(ev.at)}</span>
              </div>
              {ev.note && <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{ev.note}</div>}
              {ev.imageUrls && ev.imageUrls.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {ev.imageUrls.map((url, j) => (
                    <img key={j} src={url} alt="" style={{ width: 80, height: 80, objectFit: "cover", border: "1px solid #ddd", borderRadius: 3 }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Thời lượng bước */}
      {segments.length > 0 && (
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 8 }}>
            ⏱ Thời lượng xử lý từng bước
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {segments.map((seg) => (
              <div key={seg.stepId} style={{
                border: `1px solid ${seg.overMinutes > 0 ? "#9C3740" : "#ddd"}`,
                borderRadius: 4, padding: "3px 8px", fontSize: 10,
                color: seg.overMinutes > 0 ? "#9C3740" : "#333",
              }}>
                {seg.title}: {seg.durationMinutes}p
                {seg.overMinutes > 0 && ` (vượt ${seg.overMinutes}p)`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #ddd", paddingTop: 10, fontSize: 9, color: "#aaa", display: "flex", justifyContent: "space-between" }}>
        <span>Hệ thống đối soát xác nhận tự động · ALG Core</span>
        <span>{printedAt}</span>
      </div>
    </div>
  )
}
