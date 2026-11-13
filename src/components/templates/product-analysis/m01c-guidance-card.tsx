import React from "react"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Info } from "@/components/ui/icon-set/info"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { useI18n } from "@/lib/i18n"

export interface M01cGuidanceCardProps {
  className?: string
}

/**
 * Template Hướng dẫn Tạo Thẻ Chào Khách M01c
 * Dành riêng cho chức năng tổng hợp Thẻ A6 và Kịch bản tư vấn Zalo.
 */
export function M01cGuidanceCard({ className }: M01cGuidanceCardProps) {
  const { ti } = useI18n()
  const sampleProduct = ti("sampleProduct") || "sản phẩm"
  const rawMaterial = ti("rawMaterialItem") || "nguyên phụ liệu"

  return (
    <FeatureGuidanceCard
      badgeLabel={`Hướng dẫn tạo thẻ chào ${sampleProduct}`}
      badgeIcon={Info}
      title="Tạo Thẻ Chào Sản Phẩm từ Kho đã duyệt"
      titleIcon={FileText}
      description={`Chọn một ${sampleProduct} đã duyệt để tự động tổng hợp thành phần ${rawMaterial} và nội dung tư vấn thành Thẻ chào & Báo giá hoàn chỉnh cho nhân viên bán hàng.`}
      tips={[
        `📋 Tổng hợp thành phần ${rawMaterial} & kịch bản chốt đơn`,
        "💬 Copy 1 chạm gửi Zalo / Chat",
        "🖼️ Xuất ảnh báo giá A6 / PNG",
      ]}
      className={className}
    />
  )
}
