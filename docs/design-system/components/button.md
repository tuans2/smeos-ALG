# Component Contract: Button

- **File**: `src/components/ui/button.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready)

---

## 1. Purpose (Mục đích)
Nút bấm hành động (`Button`) là thành phần điều khiển cốt lõi của giao diện ALG, đại diện cho các hành vi tương tác do người dùng chủ động kích hoạt: gửi dữ liệu, xác nhận hành động, đóng/mở luồng, chuyển bước, hoặc điều hướng (`asChild`).

## 2. Props Interface (Giao diện props)
```typescript
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "warning" | "danger" | "subtle"
  size?: "default" | "sm" | "xs" | "lg" | "icon" | "icon-sm"
  asChild?: boolean
  loading?: boolean
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Variants**:
  - `primary`: Nền `--color-primary`, chữ trắng. Hành động chính duy nhất của màn hình/khối.
  - `secondary`: Nền `--color-surface`, viền `--color-border`, chữ primary. Hành động phụ quan trọng.
  - `outline`: Nền trong suốt, viền `--color-border`, chữ text. Hành động phụ nhẹ.
  - `ghost`: Nền trong suốt, không viền, hover nền `--color-surface-alt`. Dùng trong toolbar, bảng.
  - `warning`: Nền `--color-warning`, chữ trắng. Hành động cảnh báo rủi ro.
  - `danger`: Nền `--color-danger`, chữ trắng. Hành động nguy hiểm, xóa dữ liệu vĩnh viễn.
  - `subtle`: Nền `--color-surface-alt`, chữ text.
- **Sizes**:
  - `default`: Chiều cao `48px` (`h-12`), padding ngang `20px` (`px-5`), chữ `text-title-sm`.
  - `sm`: Chiều cao `44px` (`h-11`), padding ngang `16px` (`px-4`), chữ `text-sm`.
  - `xs`: Chiều cao `32px` (`h-8`), padding ngang `10px` (`px-2.5`), chữ `text-caption`. Tự động nâng lên ≥ 44px trên thiết bị cảm ứng (`pointer: coarse`).
  - `lg`: Chiều cao `56px` (`h-14`), padding ngang `24px` (`px-6`), chữ `text-base`.
  - `icon`: Kích thước `44×44px` (`h-11 w-11`), dùng riêng cho icon độc lập.
  - `icon-sm`: Kích thước `32×32px` (`h-8 w-8`), tự động nâng lên ≥ 44×44px trên thiết bị cảm ứng.

## 4. States (Trạng thái)
- `default`: Hiển thị bình thường theo variant.
- `hover`: Nâng tương phản màu nền hoặc làm tối nhẹ (`hover:bg-primary-dark`, `hover:bg-surface-alt`).
- `active`: Nhấn chuột/chạm: `active:opacity-90` hoặc `active:bg-surface-alt`.
- `focus-visible`: Viền tiêu điểm rõ ràng: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- `disabled`: Mờ `opacity-40`, khóa chuột `pointer-events-none`.
- `loading`: Tự động khóa thao tác (`disabled`), thêm thuộc tính `aria-busy="true"`, hiển thị spinner xoay tròn tôn trọng `motion-reduce:hidden`.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- Phím `Tab` di chuyển focus tới nút.
- Phím `Enter` hoặc `Space` kích hoạt nút (tự nhiên của thẻ `<button>`).
- Khi `asChild={true}` bọc `<Link>`, giữ trọn vẹn hành vi điều hướng của Next.js Router và phím bấm tương ứng.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Tuân thủ WCAG 2.5.8 (Target Size Minimum 24px) và Apple/Android HIG 44px:
  - Mọi nút bấm trên màn hình cảm ứng (`@media (pointer: coarse)`) đều đảm bảo `min-h-[44px]`, kể cả khi khai báo `size="xs"` hay `size="icon-sm"`.

## 7. Accessibility (Trợ năng & ARIA)
- Thẻ mặc định là `<button type="button">` ngăn chặn việc vô tình submit form khi người dùng nhấn Enter trong ô nhập dữ liệu.
- Nút icon-only (`size="icon"` hoặc `size="icon-sm"`) **bắt buộc** phải truyền `aria-label` hoặc có tooltip giải thích.
- Trạng thái tải: Gắn `aria-busy="true"`, thông báo rõ cho screen reader.

## 8. Usage Guidelines (Quy tắc sử dụng)
- **Quy tắc K2**: Tối đa 1 nút `variant="primary"` trên mỗi trang hoặc màn hình tác vụ.
- Nút hủy hoặc đóng dùng `variant="outline"` hoặc `variant="ghost"`.
- Nút xóa dữ liệu hoặc thu hồi vĩnh viễn dùng `variant="danger"`.
- Liên kết điều hướng trông giống nút bấm dùng `<Button asChild><Link href="...">...</Link></Button>`.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM tạo thẻ `<button>` trần ngoài `src/components/ui/` với class CSS tự chế (Vi phạm UX Lint R18).
- CẤM dùng `variant="primary"` nhiều hơn 1 lần trên cùng một màn hình thao tác.
- CẤM bỏ qua `aria-label` trên nút chỉ chứa icon.
- CẤM gán inline style ghi đè màu sắc hoặc chiều cao của nút.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `class-variance-authority` (`cva`), `cn` từ `@/lib/utils`, CSS tokens (`--radius-button`, `--color-primary`, `--color-primary-dark`, `--color-border`).
- Kết hợp hoàn hảo với Next.js `<Link>` qua `asChild`, `ConfirmDialog`, `PageHeader`, `TabActionHeader`.

## 11. Examples (Ví dụ chuẩn)
```tsx
// Nút hành động chính
<Button variant="primary" onClick={handleSave}>
  Lưu thay đổi
</Button>

// Nút đang xử lý tải
<Button variant="primary" loading>
  Đang đồng bộ dữ liệu...
</Button>

// Nút xóa nguy hiểm
<Button variant="danger" onClick={handleDelete}>
  Xóa tài khoản vĩnh viễn
</Button>

// Nút liên kết điều hướng
<Button asChild variant="outline">
  <Link href="/cai-dat">Về trang cài đặt</Link>
</Button>

// Nút icon truy cập
<Button size="icon" variant="ghost" aria-label="Đóng bảng">
  <X size={18} />
</Button>
```
