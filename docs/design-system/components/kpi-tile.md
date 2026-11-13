# Component Contract: KpiTile

- **File**: `src/components/ui/kpi-tile.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready, thay thế `StatTile` theo ADR-011 / D-UI-12)

---

## 1. Purpose (Mục đích)
Thẻ chỉ số hiệu năng (`KpiTile`) dùng để trực quan hoá các con số đo lường kinh doanh cốt lõi (Doanh thu, Đơn hàng, Lợi nhuận, Tỷ lệ chuyển đổi), hỗ trợ ẩn/hiện số nhạy cảm (`sensitive masking`), hiển thị xu hướng tăng/giảm và giải thích phương pháp tính qua tooltip.

## 2. Props Interface (Giao diện props)
```typescript
export interface KpiTileProps {
  label: string
  value: React.ReactNode
  sensitive?: boolean
  tip?: React.ReactNode
  icon?: React.ReactNode
  trend?: {
    value: string
    direction: "up" | "down" | "neutral"
    label?: string
  }
  description?: React.ReactNode
  className?: string
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Kiểu chữ số**: Bắt buộc dùng `text-display font-extrabold tracking-tight text-text tabular-nums`. Độ đậm `font-extrabold` theo quy định D-UI-05 chỉ được sử dụng cho số liệu KPI.
- **Kích thước**: Bo góc lớn `rounded-2xl`, viền `border-border`, padding `p-5`.

## 4. States (Trạng thái)
- `default`: Hiển thị con số rõ ràng.
- `masked`: Khi `sensitive={true}` và người dùng bấm ẩn, con số được thay bằng chuỗi bảo mật `••••••••`.
- `trend up`: Nhãn xanh lá `bg-success-bg text-success-text` kèm icon mũi tên lên.
- `trend down`: Nhãn đỏ `bg-danger-bg text-danger-text` kèm icon mũi tên xuống.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- Nút mắt ẩn/hiện số nhạy cảm có thể thao tác bằng phím `Enter` / `Space`.
- Tooltip giải thích `InfoTip` mở/đóng độc lập.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Tự động bố trí trong lưới 2 cột trên tablet hoặc 3–4 cột trên desktop.
- Nút bấm ẩn/hiện số có vùng chạm mở rộng.

## 7. Accessibility (Trợ năng & ARIA)
- Nút ẩn/hiện có nhãn `aria-label="Hiện số liệu"` / `aria-label="Ẩn số liệu"`.
- Giá trị hiển thị số hỗ trợ thuộc tính `tabular-nums` giúp các con số thẳng hàng khi thay đổi theo thời gian thực.

## 8. Usage Guidelines (Quy tắc sử dụng)
- Áp dụng trên các trang Dashboard, Thống kê, Báo cáo doanh số và Trung tâm điều hành.
- Tuyệt đối cấm tạo các `div` tự vẽ con số KPI ngoài component này.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM sử dụng `StatTile` (đã `@deprecated`).
- CẤM dùng `font-black` cho số KPI.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `InfoTip`, `@/components/ui/icons` (`Eye`, `EyeOff`, `ArrowUpRight`, `ArrowDownRight`), `@/lib/utils` (`cn`).
