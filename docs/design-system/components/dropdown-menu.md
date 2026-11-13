# Component Contract: DropdownMenu

- **File**: `src/components/ui/dropdown-menu.tsx`
- **Thư viện gốc**: `@base-ui/react/menu`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready)

---

## 1. Purpose (Mục đích)
Trình đơn thả xuống ngữ cảnh (`DropdownMenu`) cung cấp danh sách các thao tác bổ trợ, lựa chọn hành động hoặc menu tràn (`overflowActions`) gắn với một nút kích hoạt (Trigger).

## 2. Props Interface (Giao diện props)
```typescript
export interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> {
  sideOffset?: number
}

export interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof BaseMenu.Item> {
  destructive?: boolean
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Content**: Chiều rộng tối thiểu `12rem` (192px), bo góc `rounded-xl`, bóng đổ `shadow-xl`.
- **Item**: Chiều cao khoảng `36px`, padding `10px 8px`, cỡ chữ `text-body-sm`.
- **Destructive Item**: Chữ và icon màu đỏ (`text-danger hover:bg-danger/10`), dùng cho xóa/hủy.

## 4. States (Trạng thái)
- `default`: Nền `bg-surface`, viền `border-border`.
- `hover / focused item`: Nền `bg-surface-alt`.
- `disabled item`: Mờ `opacity-50`, con trỏ `cursor-not-allowed`.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- `Enter` hoặc `Space` trên Trigger: Mở menu và đưa tiêu điểm vào mục đầu tiên.
- Mũi tên `Down` / `Up`: Di chuyển tuần hoàn giữa các mục hoạt động.
- `Escape`: Đóng menu và trả tiêu điểm về Trigger.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Tự động tránh lọt ra ngoài mép màn hình (auto-flip / collision avoidance).
- Mỗi mục item có diện tích chạm tối thiểu 36px trên desktop và 44px trên mobile.

## 7. Accessibility (Trợ năng & ARIA)
- Trigger mang `aria-haspopup="menu"` và `aria-expanded`.
- Popup mang `role="menu"`, mỗi mục mang `role="menuitem"`.

## 8. Usage Guidelines (Quy tắc sử dụng)
- Dùng cho menu ba chấm `...` trong `TabActionHeader` hoặc hàng bảng `DataTable`.
- Các hành động nguy hiểm đặt ở cuối menu và cách biệt bằng `DropdownMenuSeparator`.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM tự viết event listener `mousedown` bên ngoài khi đã có Base-UI Menu quản lý lifecycle.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `@base-ui/react/menu`, `@/lib/utils` (`cn`), design tokens.
