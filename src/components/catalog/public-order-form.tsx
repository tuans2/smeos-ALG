"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { TURNSTILE_SITE_KEY, TurnstileWidget } from "@/components/acquisition/turnstile-widget"
import { formatCurrency } from "@/lib/i18n/formatters"

interface OrderResult {
  orderCode: string
  totalVnd: number
  needsQuote: boolean
  payment: { bankName: string | null; accountNo: string; accountName: string | null; transferContent: string } | null
}

const field = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-body-sm text-text"

/**
 * Form đặt hàng trên catalog/landing công khai (Đơn hàng đa nguồn P3, §3.2) — chỉ hiện khi Điều hành bật nút
 * Đặt hàng cho nguồn này. Không dữ liệu giả: tổng tiền và thông tin chuyển khoản lấy từ máy chủ.
 */
export function PublicOrderForm({ slug, productId, productName, onBack }: { slug: string; productId: string; productName: string; onBack: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", address: "", quantity: "1", deliveryDate: "", timeSlot: "", note: "", website: "" })
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OrderResult | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function submit() {
    if (TURNSTILE_SITE_KEY && !token) {
      setError("Vui lòng chờ xác minh xong rồi gửi lại.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/public/catalog/${encodeURIComponent(slug)}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId, quantity: Number(f.quantity) || 1, name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim(),
          ...(f.deliveryDate ? { deliveryDate: f.deliveryDate } : {}), ...(f.timeSlot ? { timeSlot: f.timeSlot } : {}),
          ...(f.note.trim() ? { note: f.note.trim() } : {}), website: f.website, ...(token ? { verificationToken: token } : {}),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as OrderResult & { error?: { message?: string; details?: Record<string, unknown> } }
      if (!res.ok) {
        const detail = data.error?.details ? Object.values(data.error.details).find((v) => typeof v === "string") : undefined
        throw new Error((detail as string | undefined) || data.error?.message || "Chưa đặt được, vui lòng thử lại.")
      }
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa đặt được, vui lòng thử lại.")
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div role="status" className="space-y-3 rounded-xl bg-surface-alt p-4 text-body-sm text-text">
        <p className="text-title-sm font-bold">Đã nhận đơn {result.orderCode}</p>
        {result.needsQuote ? (
          <p>Mẫu này chưa có giá niêm yết — cửa hàng sẽ gọi báo giá cho bạn.</p>
        ) : (
          <p>Tổng tiền: <span className="font-bold">{formatCurrency(result.totalVnd)}</span></p>
        )}
        {result.payment ? (
          <div className="space-y-1">
            <p>Chuyển khoản tới {result.payment.bankName ?? "tài khoản"} · {result.payment.accountNo}{result.payment.accountName ? ` · ${result.payment.accountName}` : ""}</p>
            <p>Nội dung chuyển khoản: <span className="font-bold">{result.payment.transferContent}</span></p>
          </div>
        ) : (
          !result.needsQuote && <p>Cửa hàng sẽ liên hệ để hướng dẫn thanh toán.</p>
        )}
      </div>
    )
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <p className="text-body-sm text-text">Đặt mẫu <span className="font-bold">{productName}</span></p>
      <Input aria-label="Họ tên" placeholder="Họ tên" required value={f.name} onChange={set("name")} className={field} />
      <Input aria-label="Số điện thoại" placeholder="Số điện thoại" inputMode="tel" required value={f.phone} onChange={set("phone")} className={field} />
      <Input aria-label="Địa chỉ nhận hàng" placeholder="Địa chỉ nhận hàng" required value={f.address} onChange={set("address")} className={field} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Input aria-label="Số lượng" inputMode="numeric" value={f.quantity} onChange={set("quantity")} className={field} />
        <Input aria-label="Ngày giao" type="date" value={f.deliveryDate} onChange={set("deliveryDate")} className={field} />
        <Input aria-label="Giờ giao" placeholder="Giờ giao (vd. 9:00)" value={f.timeSlot} onChange={set("timeSlot")} className={`${field} col-span-2 sm:col-span-1`} />
      </div>
      <Input aria-label="Ghi chú" placeholder="Ghi chú (không bắt buộc)" value={f.note} onChange={set("note")} className={field} />
      {/* Ô bẫy máy — người thật không thấy */}
      <Input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set("website")} className="hidden" />
      <TurnstileWidget onToken={setToken} />
      {error && <p role="alert" className="text-body-sm text-danger-text">{error}</p>}
      <div className="flex gap-2">
        <Button variant="outline" type="button" onClick={onBack} className="py-0 gap-0 min-h-11 rounded-xl border border-border px-4 text-body-sm font-semibold text-text hover:bg-surface-alt">Quay lại</Button>
        <Button variant="primary" type="submit" disabled={busy} className="py-0 gap-0 min-h-11 flex-1 rounded-xl bg-primary px-4 text-body-sm font-bold text-white hover:bg-primary-dark disabled:opacity-40">
          {busy ? "Đang gửi…" : "Đặt hàng"}
        </Button>
      </div>
    </form>
  )
}
