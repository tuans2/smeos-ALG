# Component Contract: Overlay Primitives (Dialog, Drawer, BottomSheet, ConfirmDialog, PromptDialog)

- **File**: `src/components/ui/dialog.tsx`, `src/components/ui/drawer.tsx`, `src/components/ui/bottom-sheet.tsx`, `src/components/ui/confirm-dialog.tsx`, `src/components/ui/prompt-dialog.tsx`
- **Thư viện gốc**: `@base-ui/react/dialog`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready)

---

## 1. Purpose (Mục đích)
Bộ thành phần lớp phủ (`Overlay`) dùng để hiển thị nội dung nổi tách biệt khỏi luồng chính: hộp thoại nhập liệu / chi tiết (`Dialog`), bảng trượt cạnh màn hình (`Drawer`), bảng trượt từ đáy trên di động (`BottomSheet`), và hộp thoại xác nhận các hành động rủi ro cao (`ConfirmDialog`).

## 2. Props Interface (Giao diện props)
```typescript
// Dialog
export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  subHeader?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg"
  className?: string
  showCloseButton?: boolean
}

// Drawer
export interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  side?: "right" | "left"
  size?: "sm" | "md" | "lg"
  showCloseButton?: boolean
}

// BottomSheet
export interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  showCloseButton?: boolean
}

// ConfirmDialog
export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title: string
  consequence: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: "danger" | "default"
  requireText?: string
}

// PromptDialog — thay window.prompt(); thường dùng qua hook usePromptDialog()
export interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (value: string) => void // nội dung đã trim
  title: string
  label: string
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  placeholder?: string
  required?: boolean // mặc định true: khoá nút xác nhận khi ô trống
  tone?: "danger" | "default"
}
// const [ask, promptDialog] = usePromptDialog(); const v = await ask({...}) // null = huỷ
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Dialog Sizes**:
  - `sm`: `max-w-md` (448px) — Dùng cho confirm, biểu mẫu ngắn 1-2 trường.
  - `md`: `max-w-lg` (512px) — Dùng cho biểu mẫu tiêu chuẩn, cài đặt.
  - `lg`: `max-w-2xl` (672px) — Dùng cho xem trước tài liệu, bảng chọn phức tạp.
  - Chiều cao tối đa: Luôn bị giới hạn `max-h-[90dvh]` với vùng cuộn nội dung độc lập.
- **Drawer**: Trượt từ cạnh `right` (mặc định) hoặc `left`, chiều rộng tối đa `max-w-md` / `max-w-xl`.
- **BottomSheet**: Trượt từ đáy màn hình lên, bo tròn góc trên `rounded-t-[20px]`, có thanh cầm kéo (`grab handle`).

## 4. States (Trạng thái)
- `closed`: Không hiển thị hoặc ẩn khỏi cây trợ năng (`aria-hidden="true"`).
- `opening` / `closing`: Hiệu ứng trượt và mờ dần nhẹ nhàng (150-200ms) tôn trọng `motion-reduce:hidden`.
- `open`: Bẫy tiêu điểm (`focus-trap`), khóa cuộn thân trang nền (`scroll-lock`).
- `confirm busy`: Nút xác nhận chuyển sang `aria-busy="true"` và khóa thao tác click đúp.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- `Escape`: Tự động đóng lớp phủ và trả tiêu điểm (`focus-restore`) về phần tử kích hoạt trước đó.
- `Tab` / `Shift+Tab`: Luân chuyển tiêu điểm chỉ bên trong overlay, không lọt ra ngoài trang nền.
- Bấm vào nền mờ (`Backdrop`): Tự động kích hoạt `onOpenChange(false)` (trừ khi đang bận xử lý xác nhận).

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Tự động co giãn theo viewport, đảm bảo đệm vùng an toàn trên iOS: `pb-[max(1rem,env(safe-area-inset-bottom))]`.
- Trên màn hình nhỏ (`< sm`), `BottomSheet` là lựa chọn tối ưu thay thế `Dialog` để người dùng dễ thao tác bằng một tay.

## 7. Accessibility (Trợ năng & ARIA)
- Tự động gán `role="dialog"` hoặc `role="alertdialog"` (đối với ConfirmDialog).
- Tiêu đề liên kết qua `aria-labelledby`, mô tả qua `aria-describedby`.
- Nút đóng có thuộc tính `aria-label="Đóng hộp thoại"`.

## 8. Usage Guidelines (Quy tắc sử dụng)
- **Quy tắc K2**: Footer của Dialog tối đa 1 nút `primary` và không quá 2 nút phụ.
- `ConfirmDialog` bắt buộc cho mọi thao tác xóa dữ liệu, hủy đơn hàng, hoặc thay đổi quyền hạn không thể hoàn tác.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM tạo lớp phủ thủ công dạng `<div className="fixed inset-0 bg-black/50">` ngoài `src/components/ui/` (Vi phạm UX Lint R19).
- CẤM sử dụng `window.confirm()`, `window.alert()` hoặc `window.prompt()` (lint R13) — dùng `ConfirmDialog`, `useToast()`, `usePromptDialog()`.
- CẤM bỏ sót tiêu đề (`title`) trên bất kỳ hộp thoại nào.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `@base-ui/react/dialog`, `@/components/ui/button`, `@/components/ui/icons` (`X`), `@/lib/utils` (`cn`).

## 11. Examples (Ví dụ chuẩn)
```tsx
// Hộp thoại chỉnh sửa
<Dialog open={isOpen} onOpenChange={setIsOpen} title="Sửa chính sách đổi trả" footer={<Button onClick={save}>Lưu</Button>}>
  <p>Biểu mẫu cấu hình...</p>
</Dialog>

// Hộp thoại xác nhận nguy hiểm
<ConfirmDialog
  open={confirmDelete}
  onOpenChange={setConfirmDelete}
  onConfirm={handleDelete}
  title="Xoá vĩnh viễn chi nhánh này?"
  consequence="Tất cả dữ liệu đơn hàng và nhân sự của chi nhánh sẽ bị thu hồi. Thao tác không thể hoàn tác."
  confirmLabel="Xoá chi nhánh"
  tone="danger"
  requireText="XOACHINHANH"
/>
```
