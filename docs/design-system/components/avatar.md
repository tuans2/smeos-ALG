# Component Contract: Avatar, DateField & Tooltip/InfoTip

- **File**: `src/components/ui/avatar.tsx`, `src/components/ui/date-field.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/info-tip.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready)

---

## 1. Purpose (Mục đích)
- **Avatar**: Đại diện hình ảnh người dùng, chi nhánh hoặc thương hiệu, kèm fallback chữ cái đầu (initials) hoặc icon mặc định.
- **DateField**: Ô chọn ngày tháng bọc thẻ `<input type="date">` gốc trình duyệt giúp tận dụng bàn phím chọn ngày tối ưu trên di động.
- **InfoTip vs Tooltip**: Phân vai rõ ràng theo chuẩn D-UI-06:
  - `InfoTip` là cách giải thích DUY NHẤT cho nội dung nghiệp vụ (dạng icon `?`).
  - `Tooltip` CHỈ dùng để mô tả nhãn cho các nút chỉ có icon (icon-only button) trên desktop.

## 2. Props Interface (Giao diện props)
```typescript
// Avatar
export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof BaseAvatar.Root> {
  src?: string | null
  alt?: string
  fallback?: React.ReactNode
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  shape?: "circle" | "rounded"
}

// DateField
export interface DateFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  hasError?: boolean
}

// InfoTip
export interface InfoTipProps {
  label: string
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
}
```

## 3. Usage Guidelines (Quy tắc sử dụng)
- `Avatar`: Dùng `size="md"` (40px) trong danh sách, `size="sm"` (32px) trong thanh điều hướng, `size="lg"` (48px) trên trang hồ sơ.
- `DateField`: Tự động kết nối với `FormField` để quản lý `aria-invalid` và `aria-describedby`.
- `Tooltip`: Chỉ kích hoạt hover trên thiết bị có chuột (`pointer: fine`), không render tooltip văn bản dài trên di động.
