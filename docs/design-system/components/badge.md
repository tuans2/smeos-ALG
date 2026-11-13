# Component Contract: Badge & StatusBadge

- **File**: `src/components/ui/badge.tsx`, `src/components/ui/status-badge.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready, loại bỏ triệt để hardcoded hex)

---

## 1. Purpose (Mục đích)
Huy hiệu (`Badge`) và Huy hiệu trạng thái nghiệp vụ (`StatusBadge`) hiển thị thông tin metadata ngắn gọn, trạng thái tiến độ đơn hàng/sản phẩm/job/phê duyệt một cách trực quan, nhất quán về từ vựng tiếng Việt và màu sắc theo semantic tokens.

## 2. Props Interface (Giao diện props)
```typescript
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "success" | "warning" | "danger" | "accent" | "info" | "neutral"
  size?: "default" | "sm"
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string
  label?: string
  tone?: BadgeProps["tone"]
  showIcon?: boolean
  size?: BadgeProps["size"]
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Tones**:
  - `success`: Nền `--color-success-bg`, chữ `--color-success-text`.
  - `warning`: Nền `--color-warning-bg`, chữ `--color-warning-text`.
  - `danger`: Nền `--color-danger-bg`, chữ `--color-danger-text`.
  - `accent`: Nền `--color-selected`, chữ `--color-selected-text`.
  - `info`: Nền `--color-primary-muted`, chữ `--color-primary`.
  - `neutral`: Nền `--color-surface-alt`, chữ `--color-text-muted`.
- **Sizes**:
  - `default`: Cỡ chữ `11px` (`text-caption`), padding `px-2.5 py-0.5`.
  - `sm`: Cỡ chữ `10px`, padding `px-2 py-0.2`.

## 4. Status Registry (Danh mục trạng thái chuẩn)
- Đơn hàng: `DRAFT`, `PENDING` (Chờ xử lý), `CONFIRMED` (Đã xác nhận), `PROCESSING` (Đang xử lý), `SHIPPED` (Đang giao), `COMPLETED` (Hoàn tất), `CANCELLED` (Đã hủy), `REJECTED` (Đã từ chối).
- Sản phẩm: `ACTIVE` (Đang bán), `INACTIVE` (Tạm dừng), `ARCHIVED` (Lưu trữ), `OUT_OF_STOCK` (Hết hàng).
- Tác vụ / Job: `QUEUED` (Hàng đợi), `PROCESSING`, `SUCCESS`, `FAILED`.
- Phê duyệt: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`.

## 5. Usage Guidelines (Quy tắc sử dụng)
- Luôn ưu tiên dùng `<StatusBadge status="PENDING" />` thay vì tự viết Badge kèm text thủ công.
- Tự động chuẩn hóa chữ hoa (case-insensitive) khi nhận prop `status`.

## 6. Prohibited Patterns (Điều cấm kỵ)
- CẤM sử dụng mã màu HEX hoặc Tailwind palette thô (như `text-emerald-600`, `text-blue-600`) trong Badge.
