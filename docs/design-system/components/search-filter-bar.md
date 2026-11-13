# Component Contract: SearchFilterBar

- **File**: `src/components/ui/search-filter-bar.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready, chuẩn UX-P09)

---

## 1. Purpose (Mục đích)
Thanh công cụ tìm kiếm và lọc dữ liệu (`SearchFilterBar`) chuẩn hoá trải nghiệm tra cứu danh sách trên toàn hệ thống: ô tìm kiếm tức thì, 2-3 bộ lọc thường dùng nhất, vùng mở rộng bộ lọc nâng cao (`Disclosure`), bộ đếm điều kiện lọc đang kích hoạt và nút "Xoá bộ lọc" một chạm.

## 2. Props Interface (Giao diện props)
```typescript
export interface SearchFilterBarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  quickFilters?: React.ReactNode
  advancedFilters?: React.ReactNode
  advancedFiltersLabel?: string
  activeFilterCount?: number
  onResetFilters?: () => void
  resetLabel?: string
  className?: string
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- Ô tìm kiếm: Chiều cao `40px` (`h-10`), bo góc `rounded-xl`, icon kính lúp bên trái và nút xóa nhanh `X` bên phải khi có từ khóa.
- Các bộ lọc nhanh (`quickFilters`): Đặt thẳng hàng ngang trên desktop, tự co giãn linh hoạt trên mobile.

## 4. States (Trạng thái)
- `default`: Nền `bg-surface`, viền `border-border`.
- `focused`: Viền `--color-primary` với offset 2px.
- `filtered`: Khi có bộ lọc hoặc từ khóa tìm kiếm, nút "Xoá bộ lọc" tự động xuất hiện kèm huy hiệu đếm số lượng điều kiện lọc đang hoạt động.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- Người dùng gõ từ khoá tìm kiếm, có thể bấm nút `X` để xoá ngay từ khoá.
- Bấm "Bộ lọc nâng cao" để mở/đóng các tiêu chí lọc ít dùng mà không làm mất giá trị đã chọn bên trong.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Trên mobile: Tự động xuống dòng theo hàng (`flex-wrap`), ô tìm kiếm chiếm toàn bộ chiều rộng hàng đầu tiên.

## 7. Accessibility (Trợ năng & ARIA)
- Ô tìm kiếm mang `aria-label="Tìm kiếm"` hoặc placeholder mô tả cụ thể.
- Nút xoá tìm kiếm mang `aria-label="Xoá tìm kiếm"`.

## 8. Usage Guidelines (Quy tắc sử dụng)
- Đặt ngay phía trên `DataTable` hoặc danh sách dạng lưới (`Grid`).
- Chỉ đưa 2-3 bộ lọc phổ biến nhất vào `quickFilters`. Tất cả các bộ lọc còn lại đưa vào `advancedFilters`.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM hiển thị dàn trải quá 4 dropdown bộ lọc trên cùng một hàng gây vỡ màn hình (Vi phạm UX-P09).

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `Disclosure`, `Button`, `@/components/ui/icons` (`Search`, `X`).
