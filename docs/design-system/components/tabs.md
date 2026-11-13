# Component Contract: Tabs & TabActionHeader

- **File**: `src/components/ui/tabs.tsx`, `src/components/ui/tab-header.tsx`
- **Thư viện gốc**: `@base-ui/react/tabs`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready, chuẩn K2)

---

## 1. Purpose (Mục đích)
Hệ thống thanh tab điều hướng (`Tabs`, `TabActionHeader`) phân tách nội dung của một trang hoặc khu vực thành các khung nhìn logic độc lập, kết hợp khu vực nút hành động nhanh (`primaryActions`) và menu tràn (`overflowActions`) theo quy chuẩn K2.

## 2. Props Interface (Giao diện props)
```typescript
export interface TabActionHeaderProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  primaryActions?: TabAction[]
  overflowActions?: TabOverflowAction[]
  className?: string
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Tab List**: Bọc trong container `bg-surface-alt/90 rounded-2xl border border-border p-1.5`.
- **Tab Trigger**: Chiều cao `36px` (`py-2 px-3.5`), bo góc `rounded-xl`, chữ `text-body-sm font-bold`.
- **Tab Badge**: Nhãn số đếm đi kèm với tone: `neutral`, `success`, `warning`, `danger`, `accent`.

## 4. States (Trạng thái)
- `inactive`: Chữ `text-text-muted`, hover chuyển sang `hover:text-text hover:bg-surface/60`.
- `active / selected`: Nền trắng `bg-surface text-primary shadow-sm border border-border`.
- `disabled`: Mờ `opacity-50`, con trỏ `cursor-not-allowed`.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- Mũi tên `Left` / `Right`: Chuyển tab liền kề trong `TabsList`.
- `Enter` / `Space`: Kích hoạt chuyển tab.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Tự động cuộn ngang (`overflow-x-auto scrollbar-none`) trên màn hình nhỏ không bị vỡ bố cục.
- Các nút hành động tự động xếp gọn sang bên phải.

## 7. Accessibility (Trợ năng & ARIA)
- Container mang `role="tablist"`, các tab mang `role="tab"` và `aria-selected="true"`.
- Tab panel mang `role="tabpanel"` liên kết qua `aria-labelledby`.

## 8. Usage Guidelines (Quy tắc sử dụng)
- **Quy chuẩn K2 & 03a UX-010**: Tối đa 1 nút `variant="primary"` và tổng số nút hành động hiển thị không quá 3. Nút thứ 4 trở đi bắt buộc đưa vào `overflowActions`.
- Tôn trọng kiểm định môi trường phát triển (console.warn nếu vi phạm).

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM tạo nhiều hơn 1 nút chính `primary` trên thanh header tab.
- CẤM dùng màu hardcode (`mint`, `alert`, `sand`) cho badge, bắt buộc dùng semantic tokens.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `@base-ui/react/tabs`, `DropdownMenu`, `@/components/ui/icons`, `@/lib/utils` (`cn`).
