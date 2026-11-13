"use client"

import { use, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { orderPrintLoadError } from "@/lib/load-error-message"
import { FloristTicketA6 } from "@/components/orders/print/florist-ticket-a6"
import { RibbonBannerPrint } from "@/components/orders/print/ribbon-banner-print"
import type { OrderPrintData } from "@/modules/orders/use-cases/get-order-printout"

/**
 * Trang in đơn (checklist ALG 4.9) — ngoài khung ứng dụng để bản in sạch: phiếu xưởng khổ A6 hoặc băng
 * rôn. Dữ liệu từ `GET /api/v1/orders/:id/print` (R7, cách ly theo tổ chức và chi nhánh ở máy chủ).
 */
export default function PrintOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ loai?: string }> }) {
  const { id } = use(params)
  const kind = use(searchParams).loai === "bang-ron" ? "bang-ron" : "xuong"
  const [data, setData] = useState<OrderPrintData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/v1/orders/${id}/print`)
      .then(async (r) => (r.ok ? ((await r.json()) as { print: OrderPrintData }) : Promise.reject(new Error(orderPrintLoadError(r.status)))))
      .then((j) => setData(j.print))
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <main className="p-6 text-body-sm text-danger" role="alert">{error}</main>
  if (!data) return <main className="p-6 text-body-sm text-text-muted">Đang chuẩn bị phiếu in…</main>
  return (
    <main className="mx-auto max-w-3xl bg-surface p-4">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => window.print()}>In {kind === "bang-ron" ? "băng rôn" : "phiếu xưởng"}</Button>
        <Button type="button" variant="outline" onClick={() => { window.location.search = kind === "bang-ron" ? "" : "?loai=bang-ron" }}>
          {kind === "bang-ron" ? "Xem phiếu xưởng A6" : "Xem băng rôn"}
        </Button>
      </div>
      {kind === "bang-ron" ? <RibbonBannerPrint data={data} /> : <FloristTicketA6 data={data} />}
    </main>
  )
}
