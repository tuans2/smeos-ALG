"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { CheckCircle2, Wallet } from "@/components/ui/icons"
import type { BrochureQuote } from "@/modules/greeting-card/domain/brochure-pricing"
import { useI18n } from "@/lib/i18n"

const FIELD = "w-full h-10 px-3 rounded-lg border border-border bg-bg text-body text-text focus:outline-none focus:ring-2 focus:ring-primary/20"

/**
 * Ô nhập mã thanh toán (đặt cọc) — khối RIÊNG, tách khỏi mã giảm giá. Khách chỉ nhập MÃ do tiệm cấp,
 * không tự chọn phần trăm. Máy chủ kiểm mã; ô này chỉ hiện kết quả báo giá trả về. Không giảm giá.
 */
export function PaymentCodeField({
  value,
  onApply,
  quote,
  error,
}: {
  value: string
  onApply: (code: string) => void
  quote: BrochureQuote | null
  error: string | undefined
}) {
  const { t, locale } = useI18n()
  const isEn = locale === "en"
  const [input, setInput] = useState(value)
  const plan = quote?.paymentPlan
  const applied = !error && plan?.source === "PAYMENT_CODE" && plan.paymentCode ? plan : null

  return (
    <section aria-label={t("greetingCard.customer.options.paymentCodeTitle")} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-surface-alt/30">
      <div className="flex items-center justify-between">
        <span className="text-caption font-bold text-text flex items-center gap-1.5">
          <Wallet size={14} className="text-primary" />
          {t("greetingCard.customer.options.paymentCodeTitle")}
        </span>
        <span className="text-caption text-text-muted">{t("greetingCard.customer.options.paymentCodeSub")}</span>
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={input}
          maxLength={40}
          placeholder=""
          aria-label={t("greetingCard.customer.options.paymentCodeTitle")}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          className={FIELD}
        />
        <Button variant="outline"
          type="button"
          onClick={() => onApply(input.trim())}
          className="py-0 h-10 px-3 rounded-lg border border-primary text-primary font-bold text-body-sm whitespace-nowrap flex items-center gap-1.5 hover:bg-primary/5 transition"
        >
          <Wallet size={14} /> {t("greetingCard.customer.options.apply")}
        </Button>
      </div>
      {error && <span role="alert" className="text-caption text-danger">{error}</span>}
      {value && (
        <Button variant="ghost"
          type="button"
          onClick={() => {
            setInput("")
            onApply("")
          }}
          className="h-auto p-0 font-[inherit] gap-0 self-start text-caption text-text-muted underline"
        >
          {isEn ? "Remove code, proceed with default" : "Bỏ mã, thanh toán theo mặc định"}
        </Button>
      )}
      {applied && (
        <div role="status" className="rounded-lg bg-success-bg p-2.5 text-caption text-success flex gap-2">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              {applied.depositPercent > 0
                ? (isEn ? `Applied ${applied.depositPercent}% deposit code` : `Đã áp dụng mã đặt cọc ${applied.depositPercent}%`)
                : (isEn ? "Deposit code applied" : "Đã áp dụng mã đặt cọc")}
            </p>
            {applied.depositPercent > 0 && applied.dueLaterVnd > 0 && (
              <p className="text-text">
                {isEn
                  ? `You pay ${applied.depositPercent}% today. The remaining ${100 - applied.depositPercent}% will be settled upon check-in or delivery. Total amount remains unchanged.`
                  : `Bạn thanh toán ${applied.depositPercent}% hôm nay. ${100 - applied.depositPercent}% còn lại sẽ được thanh toán khi nhận phòng hoặc nhận bàn giao sản phẩm/dịch vụ. Tổng đơn hàng không thay đổi.`}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/** Dòng "Thanh toán hôm nay" hoặc "Đặt cọc hôm nay / Thanh toán sau" dưới tổng đơn. */
export function PaymentDueRows({ quote }: { quote: BrochureQuote | null }) {
  const { t, locale } = useI18n()
  const isEn = locale === "en"
  const vnd = (n: number) => isEn ? `${n.toLocaleString("en-US")} VND` : `${n.toLocaleString("vi-VN")} đ`

  const plan = quote?.paymentPlan
  if (!quote || quote.awaitingQuote || !plan) return null
  if (plan.dueLaterVnd <= 0) {
    return (
      <div className="flex justify-between font-bold">
        <dt>{t("greetingCard.customer.options.dueToday")}</dt>
        <dd>{vnd(quote.totalVnd)}</dd>
      </div>
    )
  }
  return (
    <>
      <div className="flex justify-between font-bold">
        <dt>{t("greetingCard.customer.options.depositAmount", { percent: plan.depositPercent })}</dt>
        <dd className="text-primary">{vnd(plan.dueNowVnd)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-text-muted">{t("greetingCard.customer.options.balanceOnDelivery")}</dt>
        <dd>{vnd(plan.dueLaterVnd)}</dd>
      </div>
    </>
  )
}
