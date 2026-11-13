# Component Contract: EmptyState

- **File**: `src/components/ui/empty-state.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready, chuẩn UX-P08)

---

## 1. Purpose (Mục đích)
Màn hình trạng thái rỗng (`EmptyState`) hiển thị khi một khu vực hoặc danh sách không có dữ liệu để xem, giúp người dùng hiểu rõ nguyên nhân và định hướng hành động tiếp theo theo chuẩn 4 biến thể của UX-P08.

## 2. Props Interface (Giao diện props)
```typescript
export type EmptyStateKind = "none" | "filtered" | "forbidden" | "error"

export interface EmptyStateProps {
  kind?: EmptyStateKind
  title?: string
  reason?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  icon?: React.ComponentType<{ size?: number; className?: string; weight?: "regular" | "duotone" | "fill" }>
  className?: string
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **4 Biến thể chuẩn (UX-P08)**:
  - `none`: Trạng thái chưa có dữ liệu nào (Onboarding). Icon `Package`, nút "Tạo mới".
  - `filtered`: Trạng thái lọc không tìm thấy kết quả. Icon `Search`, nút "Xoá bộ lọc".
  - `forbidden`: Không có quyền truy cập khu vực này (RBAC / Capability). Icon `Lock`, nút liên hệ quản trị.
  - `error`: Lỗi khi tải dữ liệu từ máy chủ. Icon `AlertCircle`, mang `role="alert"`, nút "Thử lại".
- **Kích thước**: Viền nét đứt `border-dashed border-border/80`, đệm `p-8`, bo góc `rounded-2xl`.

## 4. States (Trạng thái)
- Hiển thị theo từng `kind` với màu sắc nền ô icon tương ứng:
  - `none`: Nền `--color-primary-muted`, icon `--color-primary`.
  - `filtered`: Nền `bg-surface-alt`, icon `text-text-muted`.
  - `forbidden`: Nền `--color-warning-bg`, icon `--color-warning-text`.
  - `error`: Nền `--color-danger-bg`, icon `--color-danger-text`.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- Nút hành động (`action`) có thể kích hoạt bằng bàn phím (`Enter`, `Space`) hoặc điều hướng qua `Link`.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Tự động căn giữa màn hình hoặc căn giữa thẻ cha.
- Nút hành động đảm bảo chiều cao tối thiểu 36px (desktop) và 44px (mobile).

## 7. Accessibility (Trợ năng & ARIA)
- Biến thể `error` mang `role="alert"` để thông báo ngay lập tức.
- Các biến thể còn lại mang `role="status"` phi gián đoạn.
- Icon trang trí mang `aria-hidden="true"`.

## 8. Usage Guidelines (Quy tắc sử dụng)
- Luôn chỉ định rõ `kind` để nhận tiêu đề, icon và văn phong mặc định chuẩn mực tiếng Việt.
- Có thể ghi đè `title`, `reason`, `action` theo ngữ cảnh nghiệp vụ cụ thể.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM để trang trắng hoàn toàn khi danh sách không có dữ liệu.
- CẤM viết câu trống không: "Không có gì" hoặc "Lỗi". Phải giải thích lý do và có hành động giải thoát.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `Button`, Next.js `<Link>`, `@/components/ui/icons`.
