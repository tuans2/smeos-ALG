"use client"

/**
 * Ô bẫy chống máy tự điền đơn: nằm ngoài màn hình, không nhận Tab, trình đọc màn hình bỏ qua.
 * Người thật không bao giờ thấy nên để trống; máy điền vào → máy chủ từ chối đơn.
 */
export function HoneypotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>
        Trang web
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  )
}
