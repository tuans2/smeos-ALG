"use client"

import { Input } from "@/components/ui/input"

/**
 * Câu khẩu hiệu chính thức — cùng một giá trị với Bộ nhận diện ở mục Thương hiệu (`/ho-so`): sửa ở đây thì
 * danh thiếp, ảnh bìa và Landing page chính thức đọc theo; chọn lại phương án ở mục Thương hiệu thì ghi đè.
 */
export function BrandSloganField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-1.5">
      <label className="block text-body font-bold text-text" htmlFor="brand-slogan">Câu khẩu hiệu</label>
      <p className="text-caption text-text-muted">Hiện trên danh thiếp, ảnh bìa và trang chính thức. Tạo tự động ở mục Thương hiệu.</p>
      <Input id="brand-slogan" value={value} maxLength={60} onChange={(e) => onChange(e.target.value)} placeholder="Ví dụ: Tinh tế trong từng chi tiết" className="h-11" />
    </div>
  )
}
