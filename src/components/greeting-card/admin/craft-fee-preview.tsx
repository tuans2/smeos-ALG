"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { computeCraftFee, type CraftFeePolicy } from "@/modules/greeting-card/domain/craft-fee-policy"

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

/** Xem thử phí trên một đơn mẫu — đổi giá hàng để thấy ngay cách tính đang cài. */
export function CraftFeePreview({ policy, feeLabel }: { policy: CraftFeePolicy; feeLabel: string }) {
  const [priceVnd, setPriceVnd] = useState(800_000)
  const now = new Date()
  const result = computeCraftFee(policy, {
    listPriceVnd: priceVnd,
    discountVnd: 0,
    invitedAt: now,
    deliverAt: new Date(now.getTime() + 6 * 60 * 60_000),
  })

  return (
    <div className="p-4 rounded-xl bg-surface-alt border border-border flex flex-col gap-2">
      <label className="flex items-center justify-between gap-3 text-body-sm font-bold text-text">
        Xem thử với đơn giá hàng (trước VAT)
        <Input
          type="number"
          min={0}
          step={50_000}
          value={priceVnd}
          onChange={(e) => setPriceVnd(Math.max(0, Number(e.target.value) || 0))}
          className="w-36 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-right font-bold"
        />
      </label>
      <ul className="flex flex-col gap-1 text-caption text-text-muted">
        {result.lines.map((line) => (
          <li key={line.label} className="flex justify-between gap-3">
            <span>{line.label}</span>
            <span className="font-semibold text-text">{vnd(line.amountVnd)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-border pt-2 text-body-sm font-extrabold text-text">
        <span>{feeLabel} (đơn giao sau 6 giờ, ngày thường)</span>
        <span className="text-primary">{vnd(result.feeVnd)}</span>
      </div>
    </div>
  )
}
