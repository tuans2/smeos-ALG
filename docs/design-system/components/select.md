# Component Contract: Select

- **File**: `src/components/ui/select.tsx`
- **Thư viện gốc**: `@base-ui/react/select`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready, thay thế Radix Select)

---

## 1. Purpose (Mục đích)
Trình chọn mục thả xuống (`Select`) cho phép người dùng lựa chọn một giá trị duy nhất từ một danh sách các lựa chọn được định nghĩa trước, hỗ trợ định vị popover chuẩn xác, tìm kiếm theo ký tự gõ phím, và đồng bộ biểu mẫu HTML tự động.

## 2. Props Interface (Giao diện props)
```typescript
export interface SelectProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.Root> {
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  disabled?: boolean
  required?: boolean
  name?: string
}

export interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger> {
  error?: boolean
}

export interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.Popup> {
  sideOffset?: number
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **SelectTrigger**: Chiều cao `44px` (`h-11`), padding `14px 8px`, chữ `text-body-sm`. Vùng chạm đáp ứng chuẩn cảm ứng trên di động.
- **SelectPopup**: Chiều cao tối đa `384px` (`max-h-96`), chiều rộng tối thiểu `8rem`, tự động cuộn nội dung khi danh sách dài.
- **SelectItem**: Chiều cao tương đương 36px (`py-2`), padding trái `32px` (`pl-8`) chừa chỗ cho dấu tích chọn (`Check`).

## 4. States (Trạng thái)
- `default`: Nền `bg-surface`, viền `border-border`, chữ `text-text`.
- `hover`: Nền viền sáng lên `hover:border-primary/40`.
- `focus-visible`: Viền outline chuẩn `--color-primary`.
- `error`: Viền `border-danger`, outline `outline-danger`.
- `disabled`: Mờ `opacity-50`, con trỏ `cursor-not-allowed`.
- `selected item`: Chữ đậm `font-semibold`, icon Check hiển thị màu `--color-primary`.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- `Space` hoặc `Enter`: Mở/đóng popup danh sách lựa chọn.
- Mũi tên `Down` / `Up`: Di chuyển tiêu điểm giữa các mục.
- Gõ ký tự (typeahead): Tự động nhảy tới mục bắt đầu bằng ký tự được gõ.
- `Escape`: Đóng popup và trả tiêu điểm về nút kích hoạt (`SelectTrigger`).

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Chiều cao `44px` bảo đảm chuẩn chạm tối thiểu trên mọi thiết bị cảm ứng.
- Popup tự động lật chiều (flip) và né mép màn hình khi không đủ không gian hiển thị bên dưới.

## 7. Accessibility (Trợ năng & ARIA)
- Trigger mang `role="combobox"` kèm `aria-expanded` và `aria-haspopup="listbox"`.
- Popup mang `role="listbox"`, các item mang `role="option"` và `aria-selected`.
- Tự động tạo hidden input `<input type="hidden">` để hỗ trợ submit form HTML native.

## 8. Usage Guidelines (Quy tắc sử dụng)
- Dùng cho danh sách từ 4 đến 15 lựa chọn.
- Dưới 4 lựa chọn: Khuyến nghị dùng `<RadioGroup>`.
- Trên 15 lựa chọn: Cân nhắc kết hợp tìm kiếm (Combobox).

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM sử dụng `@radix-ui/react-select` (đã được thay thế hoàn toàn bởi `@base-ui/react`).
- CẤM bỏ qua `aria-label` khi trigger không đi kèm nhãn (`FormLabel`).
- CẤM đặt thẻ `<select>` native thô với CSS tự chế ngoài `src/components/ui/`.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `@base-ui/react/select`, `@/components/ui/icons` (`ChevronDown`, `Check`), `@/lib/utils` (`cn`).
- Kết hợp hoàn hảo với `FormField`, `FormLabel`, `FormMessage`.

## 11. Examples (Ví dụ chuẩn)
```tsx
<FormField id="shipping-method">
  <FormLabel>Phương thức vận chuyển</FormLabel>
  <Select value={shipping} onValueChange={setShipping}>
    <SelectTrigger>
      <SelectValue placeholder="Chọn phương thức…" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="standard">Giao tiêu chuẩn (2-3 ngày)</SelectItem>
      <SelectItem value="express">Giao hỏa tốc (2 giờ)</SelectItem>
    </SelectContent>
  </SelectSelect>
</FormField>
```
