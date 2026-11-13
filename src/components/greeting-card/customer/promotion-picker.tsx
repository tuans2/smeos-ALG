"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import React from "react"
import type { PublicAppliedPolicies } from "@/modules/greeting-card/domain/store-policy"
import { customerChoosesPromotion } from "@/modules/greeting-card/domain/order-policies"
import { useI18n } from "@/lib/i18n"

/**
 * Khách nhận ĐÚNG 01 ưu đãi (Spec #2): nút radio nên không chọn được hai, không chọn sẵn — khách tự chọn
 * (PO 08/10/2026). Tiệm không cho khách chọn → chỉ hiện ưu đãi đầu tiên (máy chủ cũng ép như vậy).
 */
export function PromotionPicker({
  policies,
  value,
  onChange,
}: {
  policies: PublicAppliedPolicies
  value: string
  onChange: (id: string) => void
}) {
  const { t } = useI18n()
  const promos = policies.promotions
  if (promos.length === 0) return null
  const canChoose = customerChoosesPromotion(policies)
  const shown = canChoose ? promos : promos.slice(0, 1)

  return (
    <fieldset className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-2">
      <legend className="sr-only">{t("greetingCard.customer.options.promotions.appliedPromo")}</legend>
      <div className="text-body-sm font-extrabold text-text flex items-center justify-between">
        <span>{canChoose ? t("greetingCard.customer.options.promotions.chooseOne", { count: promos.length }) : t("greetingCard.customer.options.promotions.appliedPromo")}</span>
        <span className="text-caption font-normal text-primary">{canChoose && !value ? t("greetingCard.customer.options.promotions.required") : t("greetingCard.customer.options.promotions.onePerOrder")}</span>
      </div>
      <RadioGroup
        aria-label={t("greetingCard.customer.options.promotions.appliedPromo")}
        value={value}
        onValueChange={(v) => onChange(v as string)}
        disabled={!canChoose}
        className="flex flex-col gap-2"
      >
      {shown.map((p) => (
        <label
          key={p.id}
          className={`flex items-start gap-2.5 text-body-sm text-text bg-bg p-2.5 rounded-lg border cursor-pointer ${canChoose && value === p.id ? "border-primary" : "border-border"}`}
        >
          {canChoose && (
            <RadioGroupItem value={p.id} className="mt-0.5" />
          )}
          <span>
            <span className="font-bold text-primary">{p.title}: </span>
            <span>{p.customerText}</span>
          </span>
        </label>
      ))}
      </RadioGroup>
    </fieldset>
  )
}
