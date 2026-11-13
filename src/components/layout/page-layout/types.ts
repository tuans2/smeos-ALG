import * as React from "react"

export type PageArchetype =
  | "A" // Dashboard / Tổng quan
  | "B" // Danh sách / Tìm kiếm
  | "C" // Chi tiết / Hồ sơ
  | "D" // Biểu mẫu / Cấu hình
  | "E" // Tạo nội dung / Builder
  | "F" // Cài đặt / Kết nối

export interface BasePageLayoutProps {
  className?: string
  children?: React.ReactNode
}
