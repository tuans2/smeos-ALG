"use client"

import { useState } from "react"

import { Disclosure } from "@/components/ui/disclosure"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatCurrency, formatDateTime } from "@/lib/i18n/formatters"

interface Revision {
  version: number
  createdAt: string
  snapshot: { totalAmount?: number; shippingFee?: number; items?: { name: string; variantLabel: string | null; qty: number; unitPrice: number }[] }
}

/** Các phiên bản trước của báo giá (checklist ALG 3.10): mỗi lần sửa lưu ảnh chụp bản trước đó. */
export function QuotationRevisions({ quotationId }: { quotationId: string }) {
  const [rows, setRows] = useState<Revision[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = (open: boolean) => {
    if (!open || rows) return
    fetch(`/api/v1/quotations/${quotationId}/revisions`)
      .then(async (r) => (r.ok ? ((await r.json()) as { data: Revision[] }) : Promise.reject(new Error("Không tải được lịch sử sửa"))))
      .then((j) => setRows(j.data))
      .catch((e: Error) => setError(e.message))
  }

  return (
    <Disclosure label="Lịch sử sửa" onOpenChange={load}>
      {error && <p role="alert" className="text-caption text-danger">{error}</p>}
      {rows === null && !error && <SkeletonBlock lines={2} label="Đang tải lịch sử sửa" />}
      {rows?.length === 0 && <p className="text-caption text-text-muted">Báo giá chưa được sửa lần nào.</p>}
      <ul className="flex flex-col gap-2">
        {rows?.map((r) => (
          <li key={r.version} className="rounded-lg border border-border p-2 text-caption text-text">
            <p className="font-semibold">Bản {r.version} · trước lần sửa lúc {formatDateTime(r.createdAt)} · {formatCurrency(r.snapshot.totalAmount ?? 0)}</p>
            <p className="text-text-muted">
              {(r.snapshot.items ?? []).map((it) => `${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ""} × ${it.qty}`).join(", ")}
              {r.snapshot.shippingFee ? ` · vận chuyển ${formatCurrency(r.snapshot.shippingFee)}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </Disclosure>
  )
}
