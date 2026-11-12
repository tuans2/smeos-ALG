"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ARCHETYPES = [
  { code: "A", name: "Dashboard / Tổng quan", desc: "Ưu tiên chỉ số & việc cần làm ngay (max-w-7xl)" },
  { code: "B", name: "Danh sách / Tìm kiếm", desc: "Tìm/lọc sát danh sách, hỗ trợ chọn hàng loạt & phân trang (max-w-7xl)" },
  { code: "C", name: "Chi tiết / Hồ sơ", desc: "Tên & trạng thái ở đầu, nhóm theo chủ đề nghiệp vụ (max-w-6xl)" },
  { code: "D", name: "Biểu mẫu / Cấu hình", desc: "Khổ hẹp tập trung, nhãn rõ, lỗi cạnh trường, thanh hành động ở đáy (max-w-3xl)" },
  { code: "E", name: "Tạo nội dung / Builder", desc: "Bố cục chia 2 cột: điều khiển bên trái, xem trước trực tiếp bên phải (max-w-7xl)" },
  { code: "F", name: "Cài đặt / Kết nối", desc: "Trạng thái kết nối ở đầu, nhóm cấu hình rõ ràng có menu phân mục (max-w-5xl)" },
]

export function CatalogLayoutSection() {
  return (
    <div className="space-y-6 pt-4">
      {/* PageHeader v2 Showcase */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">14. Tiêu đề trang chuẩn (PageHeader v2)</h2>
        <div className="rounded-xl border border-border p-4 bg-surface">
          <PageHeader
            title="Quản lý chiến dịch tiếp thị"
            description="Theo dõi và tối ưu hiệu suất các chiến dịch đa kênh theo thời gian thực."
            breadcrumbItems={[
              { label: "Trang chủ", href: "/" },
              { label: "Tiếp thị", href: "/quang-ba/chien-dich" },
              { label: "Chiến dịch" },
            ]}
            badge={<Badge tone="success">Đang kích hoạt</Badge>}
            tip="Chiến dịch tự động đồng bộ hóa trên các kênh liên kết"
            backHref="/quang-ba/chien-dich"
            backLabel="Quay lại danh mục"
            actions={
              <Button variant="primary" size="sm" onClick={() => {}}>
                Tạo chiến dịch mới
              </Button>
            }
          />
        </div>
      </Card>

      {/* 6 Archetypes Showcase */}
      <Card className="p-6 space-y-4">
        <h2 className="text-title font-bold text-text">15. Bộ khung 6 loại trang (PageLayout Archetypes A–F)</h2>
        <p className="text-body-sm text-text-muted">
          Đặc tả UX-028 định nghĩa chuẩn hoá 6 loại trang cho toàn bộ StoreOS, ChainOS và SaaS Mother:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARCHETYPES.map((arch) => (
            <div key={arch.code} className="rounded-xl border border-border p-4 bg-surface-alt space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white text-caption font-bold">
                  {arch.code}
                </span>
                <span className="text-caption font-bold text-text">{arch.name}</span>
              </div>
              <p className="text-caption text-text-muted leading-relaxed">{arch.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
