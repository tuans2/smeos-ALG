"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { BarChart3 } from "@/components/ui/icons"
import { useApi } from "@/components/greeting-card/greeting-api"
import type { SaleFunnelRow } from "@/modules/greeting-card/domain/sales-funnel"

interface FunnelResponse {
  data: { days: number; rows: SaleFunnelRow[]; total: SaleFunnelRow }
}

const PERIODS = [7, 30, 90] as const

/** Phễu chuyển đổi theo từng sale: gửi → mở → đặt → thu tiền, kèm doanh thu. */
export function SalesFunnelStats() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30)
  const { data, error, isLoading } = useApi<FunnelResponse>(`/api/v1/greeting-card/stats?days=${days}`)
  const funnel = data?.data

  return (
    <section className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-body font-extrabold text-text flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" />
          Hiệu quả chào hàng theo nhân viên
        </h3>
        <div role="group" aria-label="Khoảng thời gian" className="flex gap-1">
          {PERIODS.map((p) => (
            <Button variant="outline"
              key={p}
              type="button"
              onClick={() => setDays(p)}
              aria-pressed={days === p}
              className={`py-0 gap-0 px-3 h-8 rounded-lg text-caption font-bold border ${
                days === p ? "bg-primary text-white border-primary hover:bg-primary" : "border-border text-text-muted hover:bg-surface-alt"
              }`}
            >
              {p} ngày
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="p-4 text-body-sm text-danger">{error.message}</p>
      ) : isLoading || !funnel ? (
        <div className="p-4 flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : funnel.rows.length === 0 ? (
        <p className="p-6 text-center text-body-sm text-text-muted">Chưa có link nào được gửi trong {days} ngày qua.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-alt text-text-muted text-caption uppercase border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Nhân viên</th>
                <th className="px-4 py-2.5 text-right">Đã gửi</th>
                <th className="px-4 py-2.5 text-right">Đã mở</th>
                <th className="px-4 py-2.5 text-right">Đặt đơn</th>
                <th className="px-4 py-2.5 text-right">Đã thu đủ</th>
                <th className="px-4 py-2.5 text-right">Tiền đã thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...funnel.rows, funnel.total].map((r) => (
                <tr key={r.saleId} className={r.saleId === "ALL" ? "font-extrabold bg-surface-alt/50" : ""}>
                  <td className="px-4 py-2.5 text-text">{r.saleName}</td>
                  <td className="px-4 py-2.5 text-right">{r.sent}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.opened} <span className="text-caption text-text-muted">({r.openRate}%)</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.ordered} <span className="text-caption text-text-muted">({r.orderRate}%)</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.paid} <span className="text-caption text-text-muted">({r.paidRate}%)</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-primary font-bold">
                    {r.revenueVnd.toLocaleString("vi-VN")} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
