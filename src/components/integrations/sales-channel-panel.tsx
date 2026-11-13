"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { Route } from "next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { InlineError } from "@/components/ui/inline-error"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonBlock } from "@/components/ui/skeleton"
import type { ChannelOrderView, ListingView } from "@/modules/integration-hub/domain/integration-views"
import { formatDateTime } from "./integration-labels"

type Product = { id: string; code: string; name: string; price_vnd: number | null }
type Confirm = (options: { title: string; consequence: string; confirmLabel: string; tone?: "danger" | "default" }) => Promise<boolean>

const LISTING_LABEL: Record<ListingView["status"], { text: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  SYNCED: { text: "Đang bán trên kênh", tone: "success" },
  PENDING: { text: "Đang gửi", tone: "neutral" },
  REJECTED: { text: "Kênh từ chối", tone: "danger" },
  REMOVED: { text: "Đã gỡ", tone: "neutral" },
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } })
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T
  if (!res.ok) throw new Error(body.error?.message ?? "Không thực hiện được")
  return body
}

/**
 * Ánh xạ sản phẩm ↔ kênh bán (GĐ4A): chọn sản phẩm đang mở bán để đăng/gỡ, xem lý do kênh từ chối,
 * đẩy còn/hết hàng và xem đơn đã nhận từ kênh. Đăng/gỡ là hành động công khai → hỏi xác nhận.
 */
export function SalesChannelPanel({ connectionId, channelLabel, askConfirm }: { connectionId: string; channelLabel: string; askConfirm: Confirm }) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [listings, setListings] = useState<ListingView[]>([])
  const [orders, setOrders] = useState<ChannelOrderView[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const base = `/api/v1/integrations/connections/${connectionId}/sales`

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        call<{ data: Product[] }>("/api/v1/products?status=ACTIVE&limit=100"),
        call<{ listings: ListingView[]; orders: ChannelOrderView[] }>(base),
      ])
      setProducts(p.data)
      setListings(s.listings)
      setOrders(s.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu kênh bán")
    }
  }, [base])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount; setState nằm trong hàm tải (nợ #149)
    void load()
  }, [load])

  const listingOf = useMemo(() => new Map(listings.map((l) => [l.productId, l])), [listings])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setSelected(new Set())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thực hiện được")
    } finally {
      setBusy(false)
    }
  }

  async function publish(remove: boolean) {
    const ids = [...selected]
    const ok = await askConfirm({
      title: remove ? `Gỡ ${ids.length} sản phẩm khỏi ${channelLabel}?` : `Đăng ${ids.length} sản phẩm lên ${channelLabel}?`,
      consequence: remove ? "Khách sẽ không thấy và không đặt được các sản phẩm này trên kênh." : "Tên, giá và ảnh sản phẩm sẽ hiện công khai cho khách trên kênh.",
      confirmLabel: remove ? "Gỡ khỏi kênh" : "Đăng lên kênh",
      ...(remove ? { tone: "danger" as const } : {}),
    })
    if (ok) await run(() => call(`${base}/${remove ? "unpublish" : "publish"}`, { method: "POST", body: JSON.stringify({ product_ids: ids }) }))
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section aria-label="Sản phẩm trên kênh bán" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title-sm font-bold text-text">Sản phẩm trên kênh</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="xs" disabled={busy || selected.size === 0} onClick={() => publish(false)}>
            Đăng lên kênh ({selected.size})
          </Button>
          <Button size="xs" variant="outline" disabled={busy || selected.size === 0} onClick={() => publish(true)}>
            Gỡ khỏi kênh
          </Button>
          <Button size="xs" variant="outline" disabled={busy || listings.length === 0} onClick={() => run(() => call(`${base}/availability`, { method: "POST" }))}>
            Cập nhật còn/hết hàng
          </Button>
        </div>
      </div>
      {error && <InlineError message={error} />}
      {products === null ? (
        <SkeletonBlock lines={4} label="Đang tải sản phẩm" />
      ) : products.length === 0 ? (
        <EmptyState title="Chưa có sản phẩm đang mở bán" reason="Mở bán sản phẩm ở mục Sản phẩm rồi quay lại đây để đăng lên kênh." />
      ) : (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {products.map((p) => {
            const listing = listingOf.get(p.id)
            const label = listing ? LISTING_LABEL[listing.status] : null
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-body-sm">
                <label className="flex min-w-0 items-center gap-3">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Chọn ${p.name}`} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-text">{p.name}</span>
                    <span className="block text-text-muted">Mã {p.code}</span>
                  </span>
                </label>
                <span className="flex flex-col items-end gap-1">
                  {label && <Badge tone={label.tone}>{label.text}</Badge>}
                  {listing?.lastError && <span className="text-caption text-danger-text">{listing.lastError}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <div className="space-y-2">
        <h3 className="text-title-sm font-bold text-text">Đơn nhận từ kênh</h3>
        {orders.length === 0 ? (
          <p className="text-body-sm text-text-muted">Chưa có đơn nào từ kênh này.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {orders.map((o) => (
              <li key={o.externalOrderId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-body-sm">
                <span className="text-text">Mã trên kênh {o.externalOrderId} · {formatDateTime(o.createdAt)}</span>
                {o.status === "IMPORTED" ? (
                  <Link href={"/don-hang" as Route} className="font-semibold text-primary underline">
                    Đã vào Đơn hàng
                  </Link>
                ) : (
                  <span className="font-semibold text-danger-text">Chưa nhập được — hệ thống sẽ thử lại</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
