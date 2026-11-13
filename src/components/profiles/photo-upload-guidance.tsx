/**
 * PhotoUploadGuidance — Khuyến cáo số lượng ảnh cần upload theo danh mục
 *
 * Hiển thị ngay bên dưới tiêu đề mỗi mục upload để nhân viên/chủ tiệm biết
 * cần chuẩn bị bao nhiêu ảnh để đạt hiệu quả tốt nhất.
 * Component thuần tĩnh — không state, không side-effect.
 */

import React from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Info } from "@/components/ui/icon-set/info"

type GuidanceStatus = "empty" | "partial" | "optimal" | "full"

interface GuidanceTier {
  min: number
  optimal: number
  max: number
}

interface PhotoUploadGuidanceProps {
  /** Số ảnh hiện tại user đã upload */
  currentCount: number
  /** Ngưỡng số lượng */
  tier: GuidanceTier
  /** Mô tả ngắn dùng để render label (ví dụ: "ảnh cửa hàng") */
  categoryLabel: string
  /** Các lợi ích đạt được khi upload đủ số lượng khuyến nghị */
  benefits: string[]
  /** Mẹo nhanh về góc chụp / chất lượng */
  tips?: string[]
}

function resolveStatus(current: number, tier: GuidanceTier): GuidanceStatus {
  if (current === 0) return "empty"
  if (current >= tier.max) return "full"
  if (current >= tier.optimal) return "optimal"
  return "partial"
}

export function PhotoUploadGuidance({
  currentCount,
  tier,
  categoryLabel,
  benefits,
  tips,
}: PhotoUploadGuidanceProps) {
  const status = resolveStatus(currentCount, tier)
  const remaining = Math.max(0, tier.optimal - currentCount)

  const statusConfig = {
    empty: {
      icon: <Info size={13} />,
      badgeClass: "bg-warning-bg text-warning-text border-warning-border",
      barClass: "bg-warning",
      barWidth: "5%",
      label: `Khuyến nghị ${tier.optimal}–${tier.max} ${categoryLabel}`,
    },
    partial: {
      icon: <AlertCircle size={13} />,
      badgeClass: "bg-warning-bg text-warning-text border-warning-border",
      barClass: "bg-warning",
      barWidth: `${Math.round((currentCount / tier.optimal) * 100)}%`,
      label: `Còn thiếu ${remaining} ${categoryLabel} để đạt tối ưu`,
    },
    optimal: {
      icon: <CheckCircle2 size={13} />,
      badgeClass: "bg-success-bg text-success border-success-border",
      barClass: "bg-success",
      barWidth: "100%",
      label: "Đạt mức khuyến nghị tối ưu ✓",
    },
    full: {
      icon: <CheckCircle2 size={13} />,
      badgeClass: "bg-success-bg text-success border-success-border",
      barClass: "bg-success",
      barWidth: "100%",
      label: "Hoàn hảo — đã đạt tối đa ✓",
    },
  }

  const cfg = statusConfig[status]

  return (
    <div className="mt-2 mb-3 rounded-xl border border-border bg-surface p-3 space-y-2.5">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-caption font-semibold ${cfg.badgeClass}`}
        >
          {cfg.icon}
          <span>{cfg.label}</span>
        </span>
      </div>

      {/* Thanh tiến trình */}
      <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.barClass}`}
          style={{ width: cfg.barWidth }}
        />
      </div>

      {/* Ngưỡng tham chiếu */}
      <div className="flex items-center justify-between text-caption text-text-muted">
        <span>0</span>
        <span className="font-medium text-text">
          Khuyến nghị: {tier.optimal} {categoryLabel}
        </span>
        <span>Tối đa: {tier.max}</span>
      </div>

      {/* Lợi ích */}
      {benefits.length > 0 && (
        <ul className="space-y-1 pt-1 border-t border-border">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-caption text-text-muted">
              <span className="text-primary mt-0.5 shrink-0">✦</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Mẹo chụp ảnh */}
      {tips && tips.length > 0 && (
        <div className="pt-1 border-t border-border">
          <p className="text-caption font-bold text-text-muted mb-1">💡 Mẹo chụp đẹp hơn:</p>
          <ul className="space-y-0.5">
            {tips.map((t, i) => (
              <li key={i} className="text-caption text-text-muted">
                · {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------
 * Cấu hình chuẩn theo từng danh mục — export để dùng lại
 * ------------------------------------------------------------------ */

export const LOGO_GUIDANCE = {
  tier: { min: 0, optimal: 1, max: 1 },
  categoryLabel: "logo",
  benefits: [
    "Tự động đóng watermark lên ảnh & video sản phẩm",
    "Hiển thị nhận diện thương hiệu trên trang Catalog và Landing Page",
    "Tăng uy tín và khả năng nhận diện khi chia sẻ lên mạng xã hội",
  ],
  tips: [
    "Dùng ảnh PNG nền trong suốt để ghép mượt lên mọi nền màu",
    "Kích thước tối thiểu 512×512px để sắc nét trên màn hình Retina",
  ],
}

export const STOREFRONT_GUIDANCE = {
  tier: { min: 0, optimal: 4, max: 8 },
  categoryLabel: "ảnh không gian",
  benefits: [
    "Hiển thị trong Section Story của Landing Page thay vì ảnh mẫu",
    "Dùng làm Gallery trên Catalog — 100% ảnh thật của tiệm",
    "Tăng độ tin cậy với khách hàng mới, giảm tỷ lệ thoát trang",
  ],
  tips: [
    "Chụp vào buổi sáng có ánh sáng tự nhiên — sản phẩm và không gian sáng sủa",
    "Chụp bàn chế tác, tủ trưng bày hoặc góc shop đẹp nhất",
    "Tỉ lệ 4:3 (ngang) hoặc 1:1 (vuông) phù hợp nhất với layout Gallery",
  ],
}

export const VIDEO_GUIDANCE = {
  tier: { min: 0, optimal: 1, max: 3 },
  categoryLabel: "video nhận diện",
  benefits: [
    "Tự động ghép vào đầu / cuối video sản phẩm đăng TikTok & Reels",
    "Tạo bộ nhận diện chuyên nghiệp đồng nhất trên tất cả nội dung video",
  ],
  tips: [
    "Clip 3–5 giây, không có tiếng (nhạc sẽ được thêm khi render)",
    "Quay logo + tên tiệm hoặc bàn tay nghệ nhân đang chế tác",
  ],
}

export const QR_GUIDANCE = {
  tier: { min: 0, optimal: 1, max: 1 },
  categoryLabel: "mã QR Zalo",
  benefits: [
    "Khách quét để kết bạn / nhắn Zalo với tiệm ngay trên trang đặt hoa",
    "Giảm bước trung gian — khách không cần tìm số Zalo",
  ],
  tips: [
    "Lấy mã trong Zalo: Cá nhân → mã QR của tôi, rồi lưu ảnh",
    "Chụp rõ ràng, không mờ hay vỡ pixel; không dùng mã QR ngân hàng",
  ],
}
