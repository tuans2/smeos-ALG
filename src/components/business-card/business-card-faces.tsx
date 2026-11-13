/**
 * Hai mặt danh thiếp ở đúng kích thước in (90×54 mm, 300 dpi = 1063×638 px).
 * Đây là ấn phẩm xuất ra giấy, không theo chế độ sáng/tối của ứng dụng — nên
 * màu nền/chữ cố định (trắng/đen, đạt tương phản in), chỉ dải nhấn lấy màu
 * thương hiệu.
 */
import { forwardRef } from "react"
import { BUSINESS_CARD_PRINT_PX, type BusinessCardData, type CardLineKind } from "@/modules/profiles/domain/business-card"

const W = BUSINESS_CARD_PRINT_PX.width
const H = BUSINESS_CARD_PRINT_PX.height
const INK = "#1a1a1a"
const MUTED = "#4a4a4a"
const PAPER = "#ffffff"
const FALLBACK_ACCENT = "#1a1a1a"

const LINE_LABEL: Record<CardLineKind, string> = { PHONE: "ĐT", EMAIL: "Thư", ADDRESS: "Đ/c", WEBSITE: "Web" }

const face = { width: W, height: H, background: PAPER, color: INK, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", position: "relative" as const, overflow: "hidden" as const }

export const BusinessCardFront = forwardRef<HTMLDivElement, { card: BusinessCardData; logoOk: boolean }>(
  function BusinessCardFront({ card, logoOk }, ref) {
    const accent = card.accentColor ?? FALLBACK_ACCENT
    return (
      <div ref={ref} style={face} aria-label="Mặt trước danh thiếp">
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 28, background: accent }} />
        <div style={{ position: "absolute", left: 96, right: 72, top: 72, bottom: 64, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {card.logoUrl && logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh đưa vào canvas để xuất, không qua tối ưu ảnh
              <img src={card.logoUrl} alt="" crossOrigin="anonymous" style={{ width: 140, height: 140, objectFit: "contain" }} />
            ) : null}
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{card.name}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 34, lineHeight: 1.3 }}>
            {card.lines.map((l) => (
              <div key={l.kind} style={{ display: "flex", gap: 20 }}>
                <span style={{ width: 70, flexShrink: 0, color: MUTED, fontWeight: 600 }}>{LINE_LABEL[l.kind]}</span>
                <span style={{ overflowWrap: "anywhere" }}>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
)

export const BusinessCardBack = forwardRef<HTMLDivElement, { card: BusinessCardData; qrDataUrl: string | null; logoOk: boolean }>(
  function BusinessCardBack({ card, qrDataUrl, logoOk }, ref) {
    const accent = card.accentColor ?? FALLBACK_ACCENT
    return (
      <div ref={ref} style={{ ...face, display: "flex", alignItems: "center", justifyContent: "center", gap: 72 }} aria-label="Mặt sau danh thiếp">
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 28, background: accent }} />
        {qrDataUrl && card.qr ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- mã QR dạng data URL */}
            <img src={qrDataUrl} alt="" style={{ width: 380, height: 380 }} />
            <div style={{ maxWidth: 440 }}>
              <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.2 }}>{card.name}</div>
              <div style={{ marginTop: 20, fontSize: 32, color: MUTED }}>{card.qr.caption}</div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            {card.logoUrl && logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh đưa vào canvas để xuất
              <img src={card.logoUrl} alt="" crossOrigin="anonymous" style={{ width: 200, height: 200, objectFit: "contain", margin: "0 auto" }} />
            ) : null}
            <div style={{ marginTop: 24, fontSize: 64, fontWeight: 700 }}>{card.name}</div>
          </div>
        )}
      </div>
    )
  }
)
