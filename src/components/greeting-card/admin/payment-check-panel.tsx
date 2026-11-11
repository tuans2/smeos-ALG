"use client"

import React from "react"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { paymentCheckOf } from "@/modules/greeting-card/domain/payment-check"
import { vnd, type AdminOrder } from "./admin-order-types"

/** Đối chiếu trước khi xác nhận: mẫu, giá công bố, giá chốt và lý do chênh lệch. */
export function PaymentCheckPanel({ order }: { order: AdminOrder }) {
  const c = paymentCheckOf(order)
  const differs = c.listedPriceVnd === null || c.listedPriceVnd !== c.agreedTotalVnd
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-surface-muted p-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
        <FlowerImage src={c.imageUrl} alt={c.productName} sizes="64px" fallback="icon" className="h-full w-full" />
      </div>
      <dl className="min-w-0 flex-1 text-caption">
        <dt className="sr-only">Mẫu</dt>
        <dd className="truncate text-body-sm font-bold text-text">
          {c.productName}{c.productCode && <span className="ml-1 font-mono font-medium text-text-muted">· {c.productCode}</span>}
        </dd>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
          <div className="flex gap-1">
            <dt className="text-text-muted">Giá công bố:</dt>
            <dd className="font-semibold text-text">{c.listedPriceVnd !== null ? vnd(c.listedPriceVnd) : "Chưa niêm yết"}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-text-muted">Giá chốt:</dt>
            <dd className={`font-extrabold ${differs ? "text-warning-text" : "text-text"}`}>{vnd(c.agreedTotalVnd)}</dd>
          </div>
        </div>
        {c.promotion && (
          <div className="mt-1 flex gap-1">
            <dt className="text-text-muted">Ưu đãi khách chọn:</dt>
            <dd className="font-semibold text-success">{c.promotion}</dd>
          </div>
        )}
        {c.reasons.length > 0 && (
          <div className="mt-1">
            <dt className="text-text-muted">Vì sao khác giá công bố:</dt>
            <dd>
              <ul className="list-disc pl-4 text-text">
                {c.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
