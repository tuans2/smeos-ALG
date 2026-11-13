"use client"

// Console "Trường dữ liệu" (`N12`, ĐP-3 3.15) — nơi quản trị nền tảng
// ALG sửa trường/danh mục đã xây và tạo trường tự tạo, theo nguyên lý
// PO 26/09/2026 (Đặc tả trường §16.2/§16.3). 4 tab, mỗi thao tác ghi đều
// xác nhận-có-diff trước khi gọi API (`_components/diff-confirm.tsx`).
//
// Nếu gặp lỗi 403 ở bất kỳ tab nào — người vận hành đang đăng nhập không
// có năng lực `N12`, không phải lỗi trang.

import { useState } from "react"
import { useI18n } from "@/lib/i18n"
import { TabActionHeader, type TabItem } from "@/components/ui/tab-header"
import { TruongLoiTab } from "./_components/truong-loi-tab"
import { TruongTuTaoTab } from "./_components/truong-tu-tao-tab"
import { DanhMucTab } from "./_components/danh-muc-tab"
import { GhiDeToChucTab } from "./_components/ghi-de-to-chuc-tab"
import { PageHeader } from "@/components/ui/page-header"

const TABS: TabItem[] = [
  { id: "loi", label: "Trường lõi" },
  { id: "tu-tao", label: "Trường tự tạo" },
  { id: "danh-muc", label: "Danh mục" },
  { id: "ghi-de", label: "Ghi đè theo tổ chức" },
]

export default function TruongDuLieuPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<string>("loi")

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trường dữ liệu"
        tip="Kiến trúc hai lớp mã/cấu hình, 5 mức sàn không cấu hình được. Mọi thay đổi ghi vào nhật ký nền tảng."
      />

      <TabActionHeader tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {tab === "loi" && <TruongLoiTab />}
      {tab === "tu-tao" && <TruongTuTaoTab />}
      {tab === "danh-muc" && <DanhMucTab />}
      {tab === "ghi-de" && <GhiDeToChucTab />}
    </div>
  )
}
