"use client"

import React from "react"
import { BookOpen } from "@/components/ui/icons"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

export function CatalogGuidanceCard() {
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  return (
    <FeatureGuidanceCard
      tag="HƯỚNG DẪN CATALOG & WEBSITE"
      icon={BookOpen}
      title={`Quản lý ${ti.catalogTitle} số trực tuyến & Landing Page chiến dịch`}
      description={`Xuất bản ${ti.catalogTitle} điện tử tự động đồng bộ từ Product Master, sinh mã QR chia sẻ Zalo/Mạng xã hội và tạo trang đích chiến dịch bán ${ti.sampleProduct} theo dịp lễ.`}
      tips={[
        `📱 Mọi ${ti.sampleProduct} đã duyệt sẽ tự động cập nhật vào ${ti.catalogTitle} số trực tuyến`,
        "⚡ Sinh mã QR tải về ngay lập tức để in ấn thiệp hoặc gửi cho khách hàng quét Zalo",
        "🌐 Trang xem trước /c/[slug] tối ưu hiển thị hoàn hảo trên màn hình Zalo di động",
      ]}
    />
  )
}
