"use client"

import { useState } from "react"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Disclosure } from "@/components/ui/disclosure"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { ProductPicker, useSelectedProduct } from "@/components/costing/product-picker"
import { costingFetch, formatVnd, useCostingResource } from "@/components/costing/use-costing-api"
import { parseNumberInput, type CostResponse } from "@/components/costing/costing-ui-types"
import type { PriceScenario } from "@/modules/costing/domain/price-scenarios"

/** #34 — Giá bán & lợi nhuận: 3 kịch bản theo ngành; áp giá là R3 nên luôn qua hộp xác nhận và được ghi nhật ký. */
export default function GiaBanPage() {
  const { productId } = useSelectedProduct()
  const [competitorInput, setCompetitorInput] = useState("")
  const [competitor, setCompetitor] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, confirmNode] = useConfirmDialog()
  const url = productId ? `/api/v1/costing/products/${productId}/cost${competitor ? `?competitor_vnd=${competitor}` : ""}` : null
  const { state, reload } = useCostingResource<CostResponse>(url)
  const ready = productId && state.status === "ready" && state.data.product.id === productId ? state.data : null

  const applyCompetitor = () => {
    const v = parseNumberInput(competitorInput, true)
    if (Number.isNaN(v) || (v !== null && v <= 0)) return setError("Giá đối thủ phải là số lớn hơn 0.")
    setError(null)
    setCompetitor(v)
  }

  const apply = async (s: PriceScenario) => {
    if (!ready) return
    const ok = await confirm({
      title: `Đổi giá "${ready.product.name}" thành ${formatVnd(s.priceVnd)}?`,
      consequence: (
        <>
          Giá hiện tại {formatVnd(ready.product.priceVnd)} sẽ được thay bằng {formatVnd(s.priceVnd)}. Báo giá và đơn tạo từ bây giờ dùng giá mới; đơn đã tạo giữ nguyên giá cũ.
          Thay đổi được ghi vào nhật ký hoạt động, và bạn có thể đổi lại bất cứ lúc nào.
        </>
      ),
      confirmLabel: "Áp giá mới",
    })
    if (!ok) return
    setError(null)
    try {
      await costingFetch(`/api/v1/costing/products/${ready.product.id}/price`, { method: "POST", body: JSON.stringify({ price_vnd: s.priceVnd, scenario: s.key }) })
      setMessage(`Đã áp giá ${formatVnd(s.priceVnd)} cho "${ready.product.name}".`)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa áp được giá.")
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="gb-title">
      <h2 id="gb-title" className="sr-only">
        Giá bán và lợi nhuận
      </h2>
      <ProductPicker />
      {!productId && <p className="text-body-sm text-text-muted">Chọn một mẫu để xem gợi ý giá bán.</p>}
      {productId && state.status === "loading" && <SkeletonBlock lines={4} label="Đang tính gợi ý giá" />}
      {productId && state.status === "error" && <InlineError message={state.message} onRetry={reload} />}
      {ready && ready.scenarios.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title={ready.hasRecipe ? "Giá vốn chưa đầy đủ" : "Mẫu này chưa có công thức"}
          reason={ready.hasRecipe ? "Cần đủ đơn giá nguyên liệu và tiền công thì mới gợi ý giá bán đáng tin." : "Gợi ý giá dựa trên giá vốn — hãy ghi công thức trước."}
          action={ready.hasRecipe ? { label: "Xem giá vốn còn thiếu gì", href: "/tinh-gia/gia-von" } : { label: "Ghi công thức", href: "/tinh-gia/cong-thuc" }}
        />
      )}
      {ready && ready.scenarios.length > 0 && (
        <>
          <p className="text-body text-text">
            Giá vốn: <strong>{formatVnd(ready.cost?.totalVnd)}</strong> · Đang bán: <strong>{formatVnd(ready.product.priceVnd)}</strong>
          </p>
          <ul className="grid gap-3 sm:grid-cols-3" aria-label="Các mức giá gợi ý">
            {ready.scenarios.map((s) => (
              <li key={s.key} className={`flex flex-col gap-2 rounded-2xl border bg-surface p-4 ${s.key === "RECOMMENDED" ? "border-primary" : "border-border"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text">{s.label}</span>
                  {s.key === "RECOMMENDED" && <Badge tone="success">Nên chọn</Badge>}
                </div>
                <p className="text-title font-bold text-text">{formatVnd(s.priceVnd)}</p>
                <p className={`text-body-sm ${s.profitVnd < 0 ? "text-danger" : "text-text-muted"}`}>
                  Lãi {formatVnd(s.profitVnd)} · biên {s.marginPercent.toLocaleString("vi-VN")}%
                </p>
                {s.warnings.map((w) => (
                  <p key={w} className="text-body-sm text-warning-text">
                    {w}
                  </p>
                ))}
                {s.key !== "CURRENT" && s.priceVnd !== ready.product.priceVnd && (
                  <Button size="sm" variant={s.key === "RECOMMENDED" ? "primary" : "outline"} className="mt-auto" onClick={() => void apply(s)}>
                    Áp giá này
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {ready && ready.hasRecipe && (
        <Disclosure label="So với giá đối thủ" {...(competitor ? { appliedSummary: `Đối thủ: ${formatVnd(competitor)}` } : {})}>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-body-sm text-text">
              Giá đối thủ bán mẫu tương tự (đồng)
              <Input inputSize="sm" value={competitorInput} onChange={(e) => setCompetitorInput(e.target.value)} inputMode="numeric" />
            </label>
            <Button size="sm" variant="secondary" onClick={applyCompetitor}>
              So sánh
            </Button>
            {competitor && (
              <Button size="sm" variant="ghost" onClick={() => { setCompetitor(null); setCompetitorInput("") }}>
                Bỏ so sánh
              </Button>
            )}
          </div>
        </Disclosure>
      )}
      {message && <p role="status" className="rounded-xl bg-success-bg px-3.5 py-2.5 text-body-sm text-primary">{message}</p>}
      {error && <InlineError message={error} />}
      {confirmNode}
    </section>
  )
}
