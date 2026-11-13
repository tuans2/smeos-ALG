"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/i18n/formatters"

export interface ThankYouVoucherData {
  code: string
  percent: number
  expiresAt: string | null
  used: boolean
}

/** Mã cảm ơn dùng một lần cho lần đặt sau (ALG 5.15) — chỉ người đặt đơn này dùng được. */
export function ThankYouVoucherBox({ voucher }: { voucher: ThankYouVoucherData }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(voucher.code).then(() => setCopied(true)).catch(() => {})
  }
  return (
    <div className="mt-5 w-full max-w-sm rounded-2xl border border-dashed border-primary/40 bg-surface p-4 text-left">
      <p className="text-caption font-semibold text-primary">Quà cảm ơn cho lần đặt sau</p>
      <p className="mt-1 text-body-sm text-text">
        Giảm {voucher.percent}% cho đơn tiếp theo của bạn
        {voucher.expiresAt ? `, dùng trước ngày ${formatDate(voucher.expiresAt)}` : ""}.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="flex-1 rounded-lg bg-surface-alt px-3 py-2 text-center font-mono text-body font-bold tracking-wider text-text">
          {voucher.code}
        </span>
        {voucher.used ? (
          <span className="text-caption font-semibold text-text-muted">Đã dùng</span>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? "Đã chép" : "Chép mã"}
          </Button>
        )}
      </div>
      <p className="mt-2 text-caption text-text-muted">Mã dùng một lần, gắn với số điện thoại đã đặt đơn này.</p>
    </div>
  )
}
