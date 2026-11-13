"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LockKeyhole } from "@/components/ui/icons"
import type { ShopContact } from "@/modules/greeting-card/domain/shop-contact"
import { ShopContactBar } from "./shop-contact-bar"

/**
 * Link riêng đã có đơn, mở ở trình duyệt/máy khác (Zalo → Safari, link trong tin nhắn): khách nhập
 * 4 số cuối SĐT người đặt để xem lại đơn, mã QR và ảnh hoa — không phải liên hệ tiệm xin link mới.
 */
export function BrochureUnlockGate({ sendCode, shop }: { sendCode: string; shop: ShopContact }) {
  const router = useRouter()
  const [digits, setDigits] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}$/.test(digits)) return setError("Nhập đúng 4 số cuối số điện thoại của bạn.")
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/public/brochure/${encodeURIComponent(sendCode)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneLast4: digits }),
      })
      if (res.ok) return router.refresh()
      setError(res.status === 429 ? "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút hoặc liên hệ cửa hàng." : "Số chưa khớp với số điện thoại người đặt. Vui lòng kiểm tra lại.")
    } catch {
      setError("Mất kết nối mạng, vui lòng thử lại.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-text">
      <ShopContactBar shop={shop} />
      <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-14 text-center">
        <LockKeyhole size={28} className="text-primary" aria-hidden="true" />
        <h1 className="text-title font-bold">Xem lại đơn hàng của bạn</h1>
        <p className="text-body text-text-muted">Link này đã được mở trên thiết bị khác. Để bảo vệ đơn hàng, vui lòng nhập 4 số cuối số điện thoại người đặt hoa.</p>
        <form onSubmit={submit} className="mt-2 flex w-full flex-col gap-2">
          <label htmlFor="phone-last4" className="sr-only">4 số cuối số điện thoại người đặt</label>
          <Input
            id="phone-last4"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={digits}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="VD: 5678"
            className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-center text-title tracking-widest text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
          <Button variant="primary" type="submit" disabled={busy} className="px-0 py-0 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-body font-bold text-surface disabled:opacity-60 hover:bg-primary">
            {busy && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            Xem đơn hàng
          </Button>
        </form>
      </main>
    </div>
  )
}
