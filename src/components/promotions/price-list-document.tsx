"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Printer } from "@/components/ui/icon-set/printer"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/i18n/formatters"
import { useSession } from "@/lib/session"
import type { PriceListGroup, PriceListStatus } from "@/modules/products/domain/price-list"
import { PRICE_LIST_STATUS_LABEL } from "@/modules/products/domain/price-list"

interface Doc {
  priceList: { name: string; heading: string; note: string; validFrom: string | null; validTo: string | null; status: PriceListStatus }
  groups: PriceListGroup[]
  promotions: Array<{ id: string; title: string; customerText: string }>
  productCount: number
}

const vnd = (v: number) => formatCurrency(v)
const dayVi = (d: string) => d.split("-").reverse().join("/")

function priceText(price: number | null, peak: number | null) {
  if (price === null) return "Liên hệ"
  return peak !== null && peak !== price ? `${vnd(price)} (cao điểm ${vnd(peak)})` : vnd(price)
}

/** Bảng giá dựng sẵn — in hoặc "Lưu thành PDF" bằng hộp thoại in của trình duyệt. */
export function PriceListDocument({ id }: { id: string }) {
  const { organization } = useSession()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/price-lists/${id}`).catch(() => null)
    if (res?.status === 404) return setError("Không tìm thấy bảng giá này")
    if (!res?.ok) return setError("Chưa tải được bảng giá")
    const body = await res.json()
    setError(null)
    setDoc(body)
  }, [id])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!cancelled) await load()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [load])

  if (error) return <InlineError message={error} onRetry={() => void load()} />
  if (!doc) return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-64 w-full" /></div>

  const { priceList: p } = doc
  const period = p.validFrom || p.validTo ? `Áp dụng ${p.validFrom ? `từ ${dayVi(p.validFrom)}` : ""}${p.validTo ? ` đến ${dayVi(p.validTo)}` : ""}` : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/bang-gia" className="inline-flex min-h-9 items-center gap-1.5 text-body-sm font-semibold text-text hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Danh sách bảng giá
        </Link>
        <div className="flex items-center gap-2">
          {p.status !== "ACTIVE" && <span className="rounded-full border border-warning-border bg-warning-bg px-2 py-0.5 text-meta font-semibold text-warning-text">{PRICE_LIST_STATUS_LABEL[p.status]}</span>}
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            In hoặc lưu PDF
          </Button>
        </div>
      </div>

      <article className="rounded-2xl border border-border bg-surface p-5 sm:p-8 print:border-0 print:p-0">
        <header className="border-b border-border pb-4 text-center">
          {organization?.name && <p className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">{organization.name}</p>}
          <h1 className="mt-1 text-display font-extrabold text-text">{p.heading || p.name}</h1>
          {period && <p className="mt-1 text-body-sm text-text-muted">{period}</p>}
        </header>

        {doc.productCount === 0 ? (
          <EmptyState title="Chưa có sản phẩm đang bán trong phạm vi bảng giá" reason="Kiểm tra loại sản phẩm đã chọn hoặc thêm sản phẩm ở Quản lý sản phẩm." action={{ label: "Đến Quản lý sản phẩm", href: "/san-pham" }} className="mt-4" />
        ) : (
          doc.groups.map((g) => (
            <section key={g.category} className="mt-5 break-inside-avoid">
              <h2 className="text-title font-bold text-text">{g.category}</h2>
              <table className="mt-2 w-full text-body">
                <caption className="sr-only">Giá {g.category}</caption>
                <thead>
                  <tr className="border-b border-border text-left text-meta text-text-muted">
                    <th scope="col" className="py-1.5 font-semibold">Sản phẩm</th>
                    <th scope="col" className="py-1.5 text-right font-semibold">Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) =>
                    r.options.length > 0 ? (
                      r.options.map((o, i) => (
                        <tr key={`${r.productId}-${o.name}`} className="border-b border-border/60 align-top">
                          <td className="py-1.5 pr-3 text-text">{i === 0 ? <span className="font-semibold">{r.name}</span> : null}<span className="block text-body-sm text-text-muted">{o.name}</span></td>
                          <td className="py-1.5 text-right text-text">{priceText(o.priceVnd, o.peakPriceVnd)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr key={r.productId} className="border-b border-border/60">
                        <td className="py-1.5 pr-3 font-semibold text-text">{r.name}</td>
                        <td className="py-1.5 text-right text-text">{priceText(r.priceVnd, r.peakPriceVnd)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </section>
          ))
        )}

        {doc.promotions.length > 0 && (
          <section className="mt-6 rounded-xl border border-primary-border bg-primary-muted p-4 break-inside-avoid">
            <h2 className="text-title-sm font-bold text-text">Ưu đãi đang áp dụng</h2>
            <ul className="mt-1 list-disc pl-5 text-body text-text">
              {doc.promotions.map((pr) => <li key={pr.id}><span className="font-semibold">{pr.title}</span> — {pr.customerText}</li>)}
            </ul>
          </section>
        )}

        {p.note && <p className="mt-5 whitespace-pre-line text-body-sm text-text-muted">{p.note}</p>}
      </article>
    </div>
  )
}
