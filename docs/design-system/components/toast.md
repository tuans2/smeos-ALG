# Component Contract: Toast & useToast

- **File**: `src/components/ui/toast.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready, tích hợp LiveRegionProvider)

---

## 1. Purpose (Mục đích)
Hệ thống thông báo tức thời (`Toast`) cung cấp phản hồi hình ảnh và âm thanh/screen reader phi gián đoạn (non-blocking) sau khi người dùng thực hiện một tác vụ: thành công (`success`), thất bại (`error`), cảnh báo (`warning`), hoặc thông tin (`info`).

## 2. Props Interface (Giao diện props)
```typescript
export type ToastTone = "success" | "error" | "info" | "warning"

export interface ToastOptions {
  id?: string
  title?: string
  message: string
  tone?: ToastTone
  durationMs?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ToastContextValue {
  show: (options: ToastOptions | string) => string
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  dismiss: (id: string) => void
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Tones**:
  - `success`: Icon xanh lá `CheckCircle2`, thông báo tác vụ hoàn thành tốt đẹp.
  - `error`: Icon đỏ `XCircle`, thời gian hiển thị lâu hơn (6000ms), thông báo lỗi.
  - `warning`: Icon cam `AlertCircle`, thông báo lưu ý hoặc cảnh báo.
  - `info`: Icon xanh dương `Info`, thông báo thông tin hệ thống.
- **Kích thước**: Chiều rộng tối đa `max-w-sm` (384px), tự động xếp chồng theo thứ tự thời gian.

## 4. States (Trạng thái)
- `entering`: Trượt từ trên xuống với hiệu ứng mờ dần nhẹ (`slide-in-from-top-2`).
- `visible`: Hiển thị ở góc trên bên phải màn hình tại `--z-toast`.
- `dismissing`: Biến mất sau thời gian chờ hoặc khi người dùng nhấn nút đóng `X`.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- Người dùng có thể nhấn nút `X` đóng thông báo bằng chuột hoặc phím `Enter`/`Space`.
- Hỗ trợ nút hành động nhanh (`action.onClick`), tự động đóng toast khi bấm.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Trên thiết bị di động (`< sm`), khung toast cách hai mép 16px (`inset-x-4`), nằm trên đỉnh màn hình; từ `sm` trở lên nằm góc phải trên, rộng tối đa `max-w-sm`.
- Nút đóng `X` có diện tích chạm mở rộng `-mr-1 -mt-1 p-1`.

## 7. Accessibility (Trợ năng & ARIA)
- Tự động truyền văn bản sang `LiveRegionProvider`:
  - `error`: Đọc qua vùng `assertive` ngay lập tức để người khiếm thị nhận biết lỗi kịp thời.
  - `success` / `info` / `warning`: Đọc qua vùng `polite` không ngắt lời người dùng.
- Khối thông báo mang `role="status"` và container mang `aria-label="Thông báo nổi"`.

## 8. Usage Guidelines (Quy tắc sử dụng)
- `ToastProvider` đã gắn sẵn trong `AppShell` (mọi trang `(app)` và `(platform)`); gọi qua hook `const toast = useToast()`. Ngoài `AppShell` (trang công khai) hook không hiển thị gì — dùng lỗi tại chỗ.
- Dùng thay `window.alert()` (lint R13).
- Dùng thông điệp ngắn gọn, rõ nghĩa tiếng Việt: "Đã lưu thay đổi", "Không thể kết nối máy chủ".
- Không dùng Toast cho các câu hỏi cần người dùng quyết định — trường hợp đó dùng `ConfirmDialog`.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM tạo state nội bộ `const [toast, setToast] = useState(...)` tự vẽ div fixed (Vi phạm UI-D-01).
- CẤM spam nhiều toast giống hệt nhau liên tiếp.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `LiveRegionProvider`, `@/components/ui/icons`, CSS token `--z-toast`.
- Bọc ở tầng App Shell (`AppShell` hoặc Root Layout).

## 11. Examples (Ví dụ chuẩn)
```tsx
const toast = useToast()

// Thành công
toast.success("Đã đồng bộ 24 sản phẩm lên Zalo Shop")

// Thất bại
toast.error("Mất kết nối mạng, vui lòng thử lại sau", "Lỗi lưu dữ liệu")

// Kèm hành động hoàn tác
toast.show({
  message: "Đã chuyển đơn hàng #1024 vào lưu trữ",
  action: {
    label: "Hoàn tác",
    onClick: handleUndo,
  },
})
```
