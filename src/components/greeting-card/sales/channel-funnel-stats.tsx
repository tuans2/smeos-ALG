"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { Share2 } from "@/components/ui/icons"
import { useApi } from "@/components/greeting-card/greeting-api"
import type { ChannelFunnelRow } from "@/modules/greeting-card/domain/catalog-channel"
import { useI18n } from "@/lib/i18n"

interface ChannelResponse {
  data: { days: number; rows: ChannelFunnelRow[] }
}

const PERIODS = [7, 30, 90] as const

/** Phễu link bộ sưu tập theo kênh chia sẻ: xem → xem chi tiết → mở form → đặt đơn. */
export function ChannelFunnelStats() {
  const { ti } = useI18n()
  const catalogTitle = ti("catalogTitle") || "Bộ sưu tập"
  const sampleProduct = (ti("sampleProduct") || "mẫu").replace(/ chuẩn$/i, "")
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30)
  const { data, error, isLoading } = useApi<ChannelResponse>(`/api/v1/greeting-card/stats/channels?days=${days}`)
  const rows = data?.data.rows

  return (
    <section className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-body font-extrabold text-text flex items-center gap-2">
          <Share2 size={18} className="text-primary" aria-hidden="true" />
          Hiệu quả {catalogTitle.toLowerCase()} theo kênh
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
      ) : isLoading || !rows ? (
        <div className="p-4 flex flex-col gap-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="p-6 text-center text-body-sm text-text-muted">
          Chưa có lượt xem nào trong {days} ngày qua. Chọn kênh trước khi sao chép link {catalogTitle.toLowerCase()} để theo dõi.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-alt text-text-muted text-caption uppercase border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Kênh</th>
                <th className="px-4 py-2.5 text-right">Khách xem</th>
                <th className="px-4 py-2.5 text-right">Xem {sampleProduct.toLowerCase()}</th>
                <th className="px-4 py-2.5 text-right">Mở form</th>
                <th className="px-4 py-2.5 text-right">Đặt đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.channel}>
                  <td className="px-4 py-2.5 text-text font-semibold">{r.label}</td>
                  <td className="px-4 py-2.5 text-right">{r.views}</td>
                  <td className="px-4 py-2.5 text-right">{r.details}</td>
                  <td className="px-4 py-2.5 text-right">{r.formOpens}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.orders} <span className="text-caption text-text-muted">({r.orderRate}%)</span>
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
