# Component Contract: DataTable & Pagination

- **File**: `src/components/ui/data-table.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready, đáp ứng UX-P10 & Density Tokens)

---

## 1. Purpose (Mục đích)
Bảng dữ liệu doanh nghiệp (`DataTable`, `Pagination`) cung cấp giao diện hiển thị danh sách dạng bảng chuyên nghiệp trên máy tính, tự động chuyển đổi sang thẻ xếp chồng (`stacked cards`) trên thiết bị di động (`< sm`), hỗ trợ sắp xếp cột, chọn hàng (Selection), phân trang và tuân thủ các biến mật độ giao diện (`--table-py`, `--table-px`).

## 2. Props Interface (Giao diện props)
```typescript
export interface ColumnDef<T> {
  id: string
  header: React.ReactNode
  cell: (row: T, index: number) => React.ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
  mobileCardTitle?: boolean
  mobileCardSubtitle?: boolean
  hideOnMobile?: boolean
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  getRowId?: (row: T, index: number) => string
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  sortColumn?: string | null
  sortDirection?: "asc" | "desc" | null
  onSortChange?: (columnId: string, direction: "asc" | "desc" | null) => void
  loading?: boolean
  emptyMessage?: React.ReactNode
  className?: string
}

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Mật độ (Density Tokens)**:
  - Chiều cao dòng và khoảng cách padding phụ thuộc trực tiếp vào token `--table-py` và `--table-px`.
  - Chế độ `comfortable`: `py-3 px-4` (hàng cao ~48px).
  - Chế độ `compact`: `py-2 px-3` (hàng cao ~36px).
- **Mobile (< sm)**: Tự động chuyển đổi thành danh sách các thẻ bo góc `rounded-xl border border-border p-4`.

## 4. States (Trạng thái)
- `default`: Nền `bg-surface`, kẻ ngang `divide-border/60`.
- `hover row`: Nền sáng nhẹ `hover:bg-surface-alt/50`.
- `selected row`: Nền màu chọn lọc `bg-selected/50` với dữ liệu thuộc tính `data-state="selected"`.
- `loading`: Hiển thị hàng thông báo nạp dữ liệu.
- `empty`: Hiển thị thông điệp rỗng trang nhã.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- Bấm vào tiêu đề cột có `sortable: true` để chuyển đổi: `asc` -> `desc` -> `null`.
- Hộp chọn Checkbox trên tiêu đề cho phép chọn/bỏ chọn toàn bộ dữ liệu trang hiện tại.
- Hộp chọn Checkbox trên từng dòng cho phép chọn đơn lẻ.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Tự động cuộn ngang trên tablet / desktop nhỏ (`overflow-x-auto`).
- Trên điện thoại di động (`< sm`), bảng biến thành các Card độc lập giúp thao tác chạm cảm ứng dễ dàng (đáp ứng WCAG 2.5.8).

## 7. Accessibility (Trợ năng & ARIA)
- Thẻ `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` đúng chuẩn ngữ nghĩa HTML5.
- Hàng được chọn mang thuộc tính `aria-selected="true"`.
- Nút phân trang có `aria-label="Trang trước"` và `aria-label="Trang sau"`.

## 8. Usage Guidelines (Quy tắc sử dụng)
- Luôn truyền `getRowId` để đảm bảo ID của từng bản ghi là duy nhất.
- Luôn kết hợp với `SearchFilterBar` và `Pagination` khi dữ liệu vượt quá 20 bản ghi.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM sử dụng `<table>` trần ngoài `src/components/ui/` với CSS tự viết (Vi phạm UI-C-01).
- CẤM bỏ qua giao diện hiển thị trên mobile.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `Checkbox`, `Button`, `@/components/ui/icons`, design tokens (`--table-py`, `--table-px`, `--color-selected`).
