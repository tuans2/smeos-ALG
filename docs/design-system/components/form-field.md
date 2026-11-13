# Component Contract: FormField & Controls (Input, Textarea)

- **File**: `src/components/ui/form-field.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready)

---

## 1. Purpose (Mục đích)
Hệ thống thành phần biểu mẫu (`FormField`, `FormLabel`, `Input`, `Textarea`, `FormDescription`, `FormMessage`) cung cấp giải pháp thống nhất để thu thập và kiểm tra tính hợp lệ của dữ liệu người dùng, tự động quản lý liên kết nhãn, mô tả và thông báo lỗi theo chuẩn trợ năng WAI-ARIA.

## 2. Props Interface (Giao diện props)
```typescript
export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string
  name?: string
  error?: string | boolean | null
  required?: boolean
  disabled?: boolean
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "default" | "sm"
  hasError?: boolean
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Input Sizes**:
  - `default`: Chiều cao `48px` (`h-12`), padding ngang `14px`, text `text-body`.
  - `sm`: Chiều cao `36px` (`h-9`), padding ngang `12px`, text `text-body-sm`.
- **Textarea**:
  - Chiều cao tối thiểu `80px` (`min-h-[80px]`), padding `14px 10px`, tự động co giãn dọc (`resize-y`).

## 4. States (Trạng thái)
- `default`: Nền `bg-surface`, viền `border-border`.
- `hover`: Viền đổi sang `hover:border-primary/40`.
- `focus-visible`: Viền outline chuẩn `--color-primary` với offset 2px.
- `error` / `invalid`: Viền `border-danger`, outline focus `outline-danger`.
- `disabled`: Mờ `opacity-50`, con trỏ `cursor-not-allowed`.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- Nhấn nhãn (`FormLabel`) tự động chuyển focus vào ô nhập liệu (`Input` hoặc `Textarea`) qua thuộc tính `htmlFor`.
- Phím `Tab` tuần tự di chuyển giữa các trường biểu mẫu theo đúng thứ tự DOM.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Chiều cao mặc định `h-12` (48px) đảm bảo chuẩn chạm di động (≥ 44px) mà không cần phóng to.
- Kích thước font chữ tối thiểu `14px` (`text-body`) ngăn chặn trình duyệt Safari trên iOS tự động zoom trang khi focus.

## 7. Accessibility (Trợ năng & ARIA)
- Tự động gắn thuộc tính `aria-invalid="true"` khi trường có lỗi.
- Tự động liên kết `aria-describedby` tới cả mô tả (`FormDescription`) và thông báo lỗi (`FormMessage` với `role="alert"`).
- Dấu sao bắt buộc (`RequiredMark`) có `aria-hidden="true"`, trong khi thuộc tính `required` được truyền thẳng vào input.

## 8. Usage Guidelines (Quy tắc sử dụng)
- Luôn bọc cặp Label + Control trong `<FormField>` để đảm bảo tự động dây nối ARIA.
- Biểu mẫu có nhiều trường nên nhóm thành các `<fieldset>` có `<legend>` ngữ nghĩa.
- Dùng `showOptional` khi trường không bắt buộc cần thông báo rõ ràng cho người dùng.

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM tạo thẻ `<input>` hoặc `<textarea>` trần với class CSS tự chế ngoài `src/components/ui/` (Vi phạm UX Lint R18).
- CẤM hiển thị thông báo lỗi mà không liên kết tới input qua `aria-describedby` hoặc `role="alert"`.
- CẤM dùng placeholder thay thế cho `FormLabel`.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `@/lib/utils` (`cn`), design tokens (`--color-surface`, `--color-border`, `--color-primary`, `--color-danger`).
- Tích hợp liền mạch với React Hook Form, Formik hoặc React Server Actions.

## 11. Examples (Ví dụ chuẩn)
```tsx
<FormField id="store-name" required error={errors.name}>
  <FormLabel>Tên cửa hàng</FormLabel>
  <Input placeholder="Ví dụ: Tiệm Hoa Mộc Lan" />
  <FormDescription>Tên thương hiệu sẽ in trên hoá đơn và thiệp</FormDescription>
  <FormMessage>{errors.name}</FormMessage>
</FormField>
```
