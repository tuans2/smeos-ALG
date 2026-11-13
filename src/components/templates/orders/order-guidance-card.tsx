"use client"

import React from "react"
import { Package } from "@/components/ui/icon-set/package"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { useI18n } from "@/lib/i18n"

export function OrderGuidanceCard() {
  const { dict, ti } = useI18n()
  const makerAction = ti("makerAction") ? ti("makerAction").toLowerCase() : "chuẩn bị"
  const sampleProduct = ti("sampleProduct") ? ti("sampleProduct").toLowerCase() : "sản phẩm"
  const productRecipe = ti("productRecipe") || "Phiếu kỹ thuật"

  return (
    <FeatureGuidanceCard
      tag={dict.orders.guidance.badge}
      icon={Package}
      title={`Quy trình ${makerAction} và bàn giao đơn`}
      description={`Mỗi đơn hàng có phiếu ${productRecipe.toLowerCase()} cho nhân sự và phiếu bàn giao kèm mã QR để xác nhận hoàn tất thành công.`}
      tips={[
        `✂️ Phiếu ${productRecipe.toLowerCase()} ghi rõ chi tiết cấu phần, vật tư và tiêu chuẩn hoàn thiện`,
        `📸 ${ti("completedProductPhoto") || "Chụp ảnh thành phẩm"} gửi khách duyệt trước khi bàn giao`,
        `🛵 In phiếu giao hàng kèm thông tin người nhận và hướng dẫn sử dụng`,
      ]}
    />
  )
}
