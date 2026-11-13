import React from "react"
import { Camera } from "@/components/ui/icon-set/camera"
import { Info } from "@/components/ui/icon-set/info"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { useI18n } from "@/lib/i18n"

export interface M01aGuidanceCardProps {
  className?: string
}

/**
 * Template Hướng dẫn Nhận diện Sản phẩm M01a
 * Dành riêng cho chức năng Phân tích ảnh sản phẩm từ thiết bị.
 */
export function M01aGuidanceCard({ className }: M01aGuidanceCardProps) {
  const { ti } = useI18n()
  const sampleProduct = ti("sampleProduct") || "sản phẩm"
  const rawMaterial = ti("rawMaterialItem") || "nguyên phụ liệu"

  return (
    <FeatureGuidanceCard
      badgeLabel={`Hướng dẫn chụp ảnh ${sampleProduct}`}
      badgeIcon={Info}
      title="Chụp ảnh thế nào để AI nhận diện chính xác hơn"
      titleIcon={Camera}
      description={`Chụp chính diện, đủ sáng và phông nền gọn để AI nhận diện đúng ${sampleProduct} và các ${rawMaterial}.`}
      tips={[
        `📸 Chụp bao quát toàn bộ ${sampleProduct}, không để che khuất các chi tiết quan trọng`,
        "💡 Tránh chụp ngược sáng hoặc để bóng đổ gắt làm mất chi tiết",
        `✨ Ảnh càng rõ nét, AI càng nhận diện chính xác các thành phần và phụ kiện`,
      ]}
      className={className}
    />
  )
}
