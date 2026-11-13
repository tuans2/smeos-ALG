"use client"

import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Receipt } from "@/components/ui/icon-set/receipt"
import { formatCurrency, formatDate } from "@/lib/i18n/formatters"

interface Data {
  subscription: {
    planLabel: string; cycle: string; priceVnd: number; status: string; currentPeriodEnd: string; includedCreditsMonthly: number
    pendingChange?: { planLabel: string; cycle: string; priceVnd: number; effectiveAt: string } | null
  } | null
  invoices: Array<{
    id: string; code: string; amountVnd: number; status: string; dueAt: string; periodStart: string; periodEnd: string
    payment: { bankName: string; accountNumber: string; accountHolder: string; transferContent: string; qrImageUrl: string } | null
  }>
}

/**
 * Gói dịch vụ của cửa hàng (checklist ALG 10.7): gói, kỳ hiện tại, hoá đơn cần trả kèm mã VietQR. Quá hạn chưa trả
 * thì tài khoản chỉ xem; trả xong mở lại ngay khi tiền về (đối soát tự động hoặc nền tảng xác nhận).
 */
export function SubscriptionCard() {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    fetch("/api/v1/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data: Data } | null) => { if (j) setData(j.data) })
      .catch(() => setData(null))
  }, [])

  if (!data?.subscription) return null
  const s = data.subscription
  const pending = data.invoices.filter((i) => i.status === "PENDING")
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-body-sm font-bold text-text"><Receipt size={16} className="text-primary" /> Gói {s.planLabel}</h2>
        <Badge tone={s.status === "OVERDUE" ? "danger" : s.status === "ACTIVE" ? "success" : "neutral"}>
          {s.status === "OVERDUE" ? "Quá hạn — chỉ xem" : s.status === "ACTIVE" ? "Đang hoạt động" : "Đã huỷ"}
        </Badge>
      </div>
      <p className="text-caption text-text-muted">
        {formatCurrency(s.priceVnd)} mỗi {s.cycle === "YEARLY" ? "năm" : "tháng"} · kỳ hiện tại tới {formatDate(s.currentPeriodEnd)}
        {s.includedCreditsMonthly > 0 ? ` · tặng ${s.includedCreditsMonthly} credit mỗi tháng (hết hạn cuối tháng)` : ""}
      </p>
      {s.pendingChange && (
        <p className="text-caption text-text">
          Từ {formatDate(s.pendingChange.effectiveAt)} chuyển sang gói {s.pendingChange.planLabel} — {formatCurrency(s.pendingChange.priceVnd)} mỗi {s.pendingChange.cycle === "YEARLY" ? "năm" : "tháng"}. Tới lúc đó vẫn dùng gói hiện tại.
        </p>
      )}
      {s.status === "OVERDUE" && <p role="alert" className="text-caption font-semibold text-danger-text">Tài khoản đang ở chế độ chỉ xem. Thanh toán hoá đơn dưới đây để mở lại.</p>}
      {pending.map((i) => (
        <div key={i.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-border p-3">
          {i.payment && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={i.payment.qrImageUrl} alt={`Mã VietQR thanh toán hoá đơn ${i.code}`} className="h-36 w-36 rounded-lg border border-border" />
          )}
          <div className="space-y-1 text-caption text-text">
            <p className="font-semibold">Hoá đơn {i.code} · {formatCurrency(i.amountVnd)}</p>
            <p className="text-text-muted">Kỳ {formatDate(i.periodStart)} – {formatDate(i.periodEnd)} · hạn {formatDate(i.dueAt)}</p>
            {i.payment ? (
              <>
                <p>{i.payment.bankName} · {i.payment.accountNumber} · {i.payment.accountHolder}</p>
                <p>Nội dung chuyển khoản: <span className="font-mono font-bold">{i.payment.transferContent}</span></p>
              </>
            ) : <p className="text-text-muted">Liên hệ nền tảng để nhận thông tin thanh toán.</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
