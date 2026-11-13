# Component Contract: Selection Controls (Checkbox, RadioGroup, Switch)

- **File**: `src/components/ui/checkbox.tsx`, `src/components/ui/radio-group.tsx`, `src/components/ui/switch.tsx`
- **Thư viện gốc**: `@base-ui/react` (Checkbox, Radio, RadioGroup, Switch)
- **Phiên bản**: 1.0.0
- **Trạng thái**: STABLE (Production Ready)

---

## 1. Purpose (Mục đích)
Nhóm thành phần điều khiển chọn (`Checkbox`, `RadioGroup`, `Switch`) dùng để chuyển đổi trạng thái bật/tắt nhị phân, chọn nhiều tùy chọn độc lập (Checkbox) hoặc chọn đúng một tùy chọn duy nhất trong một nhóm loại trừ lẫn nhau (RadioGroup).

## 2. Props Interface (Giao diện props)
```typescript
// Checkbox
export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  required?: boolean
  name?: string
  value?: string
}

// Switch
export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof BaseSwitch.Root> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  required?: boolean
  name?: string
}

// RadioGroup & Item
export interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof BaseRadioGroup> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
}

export interface RadioGroupItemProps extends React.ComponentPropsWithoutRef<typeof BaseRadio.Root> {
  value: string
  disabled?: boolean
}
```

## 3. Variants & Sizes (Biến thể & Kích thước)
- **Checkbox**: `20×20px` (`h-5 w-5`), bo góc `rounded-md`, icon tích dấu `Check`.
- **RadioGroupItem**: `20×20px` (`h-5 w-5`), tròn `rounded-full`, chấm tròn tâm `10×10px` (`h-2.5 w-2.5`).
- **Switch**: Chiều rộng `44px` (`w-11`), chiều cao `24px` (`h-6`), nút trượt tròn `20×20px` (`h-5 w-5`) dịch chuyển 20px (`translate-x-5`).

## 4. States (Trạng thái)
- `unchecked`: Nền bề mặt hoặc nhạt (`bg-surface` / `bg-surface-alt`), viền `border-border`.
- `checked`: Nền `--color-primary`, viền `--color-primary`, chữ/icon màu trắng.
- `hover`: Viền nổi bật `hover:border-primary/60`.
- `focus-visible`: Viền outline chuẩn `--color-primary` với offset 2px.
- `disabled`: Mờ `opacity-40`, con trỏ `cursor-not-allowed`.

## 5. Interaction & Keyboard Navigation (Tương tác & Bàn phím)
- `Space`: Đổi trạng thái chọn cho `Checkbox` và `Switch`.
- Mũi tên `Up`/`Down`/`Left`/`Right`: Di chuyển lựa chọn trong `RadioGroup` (WAI-ARIA roving tabindex).
- Bấm nhãn đi kèm `<label>`: Tự động kích hoạt điều khiển tương ứng.

## 6. Responsive & Touch Targets (Thích ứng & Vùng chạm)
- Khi lồng trong thẻ hàng danh sách hoặc đi kèm nhãn văn bản, toàn bộ vùng chứa nhãn phải hỗ trợ bấm chọn với chiều cao tối thiểu `44px` trên thiết bị cảm ứng.

## 7. Accessibility (Trợ năng & ARIA)
- Checkbox mang `role="checkbox"` và `aria-checked`.
- Switch mang `role="switch"` và `aria-checked`.
- RadioGroup mang `role="radiogroup"`, các item mang `role="radio"` và `aria-checked`.
- Luôn đi kèm `aria-label` hoặc `<label htmlFor="...">`.

## 8. Usage Guidelines (Quy tắc sử dụng)
- Dùng `Checkbox` khi người dùng có thể chọn 0, 1 hoặc nhiều mục.
- Dùng `RadioGroup` khi người dùng chỉ được chọn đúng 1 trong số 2–7 mục hiển thị đồng thời.
- Dùng `Switch` cho các thiết lập có hiệu lực tức thì (vd: bật chế độ bảo trì, bật thông báo).

## 9. Prohibited Patterns (Điều cấm kỵ)
- CẤM sử dụng `<input type="checkbox">` hoặc `<input type="radio">` trần ngoài `src/components/ui/` (Vi phạm UX Lint R18).
- CẤM dùng Switch để thay thế cho nút Submit trong biểu mẫu nhiều bước.

## 10. Dependencies & Composition (Phụ thuộc & Kết hợp)
- Phụ thuộc: `@base-ui/react` (Checkbox, Radio, RadioGroup, Switch), `@/components/ui/icons` (`Check`), `@/lib/utils` (`cn`).

## 11. Examples (Ví dụ chuẩn)
```tsx
// Checkbox điều khoản
<div className="flex items-center gap-2">
  <Checkbox id="terms" checked={agreed} onCheckedChange={setAgreed} />
  <label htmlFor="terms" className="text-body-sm text-text">
    Tôi đồng ý với điều khoản sử dụng
  </label>
</div>

// Switch kích hoạt tính năng
<div className="flex items-center justify-between">
  <span className="text-body-sm font-medium">Nhận thông báo qua Telegram</span>
  <Switch checked={telegramActive} onCheckedChange={setTelegramActive} />
</div>

// RadioGroup chọn gói dịch vụ
<RadioGroup value={plan} onValueChange={setPlan}>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="standard" id="plan-std" />
    <label htmlFor="plan-std" className="text-body-sm">Tiêu chuẩn</label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="pro" id="plan-pro" />
    <label htmlFor="plan-pro" className="text-body-sm">Chuyên nghiệp</label>
  </div>
</RadioGroup>
```
