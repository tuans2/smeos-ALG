"use client"

import React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { PROMOTION_KINDS, PROMOTION_KIND_LABEL, promotionPricingOf, type PromotionKind } from "@/modules/greeting-card/domain/promotion-pricing"
import type { PromotionItem } from "@/modules/greeting-card/domain/store-policy"

/**
 * Loại tính tiền của một ưu đãi: "Giảm %" trừ thật trên tổng đơn, "Miễn phí giao" đưa phí giao về 0,
 * "Tặng kèm" không đổi tiền (xưởng làm theo ghi chú). Máy chủ tự tính, khách không sửa được.
 * "Đang áp dụng": Điều hành bật/tắt ưu đãi theo từng thời điểm mà không phải xoá (PO 08/10/2026).
 */
export function PromotionKindField({ item, onChange }: { item: PromotionItem; onChange: (patch: Partial<PromotionItem>) => void }) {
  const pricing = promotionPricingOf(item)
  const setKind = (kind: PromotionKind) =>
    onChange(kind === "PERCENT_OFF" ? { kind, config: { ...item.config, percent: pricing.percent ?? 10 } } : { kind })
  return (
    <div className="flex flex-wrap items-center gap-2 text-caption">
      <label className="flex min-h-8 items-center gap-1.5 font-semibold text-text cursor-pointer">
        <Checkbox
          checked={item.active !== false}
          onCheckedChange={(checked) => onChange({ active: Boolean(checked) })}
          className="h-4 w-4"
        />
        <span>{item.active !== false ? "Đang áp dụng" : "Tạm tắt — khách không thấy"}</span>
      </label>
      <Select value={pricing.kind} onValueChange={(v) => setKind(v as PromotionKind)}>
        <SelectTrigger aria-label="Loại ưu đãi" className="h-8 w-[160px] text-caption">
          <SelectValue placeholder="Loại ưu đãi" />
        </SelectTrigger>
        <SelectContent>
          {PROMOTION_KINDS.map((k) => (
            <SelectItem key={k} value={k}>{PROMOTION_KIND_LABEL[k]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pricing.kind === "PERCENT_OFF" && (
        <label className="flex items-center gap-1 text-text-muted">
          <Input
            inputMode="numeric"
            aria-label="Phần trăm giảm"
            value={String(pricing.percent ?? "")}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""))
              onChange({ config: { ...item.config, percent: Math.min(100, Math.max(1, n || 1)) } })
            }}
            className="h-8 w-14 rounded-lg border border-border bg-surface px-2 text-caption"
          />
          <span>% trên tổng đơn</span>
        </label>
      )}
    </div>
  )
}
