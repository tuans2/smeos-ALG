import * as React from "react"
import { PageHeader } from "@/components/ui/page-header"
import { ToastProvider } from "@/components/ui/toast"
import { LiveRegionProvider } from "@/components/ui/live-region"
import { CatalogSections } from "./catalog-sections"
import { CatalogLayoutSection } from "./catalog-layout-section"

export const metadata = {
  title: "Thư viện Giao diện & Design System | Vận hành Nền tảng",
  description: "Trưng bày danh mục các thành phần giao diện Design System chuẩn Enterprise của ALG",
}

export default function ThuVienGiaoDienPage() {
  return (
    <LiveRegionProvider>
      <ToastProvider>
        <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
          <PageHeader
            title="Thư viện Giao diện (UI Catalog)"
            description="Không gian đối soát, xem trước và kiểm thử toàn bộ các thành phần Design System của ALG theo tiêu chuẩn Enterprise."
          />
          <CatalogSections />
          <CatalogLayoutSection />
        </div>
      </ToastProvider>
    </LiveRegionProvider>
  )
}
