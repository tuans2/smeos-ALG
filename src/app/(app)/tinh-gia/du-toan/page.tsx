"use client"

import { useState } from "react"
import Link from "next/link"
import { ClipboardList } from "@/components/ui/icon-set/clipboard-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { costingFetch, formatVnd, useCostingResource } from "@/components/costing/use-costing-api"
import { parseNumberInput } from "@/components/costing/costing-ui-types"
import { noPurchaseMessage, type MaterialNeedsResult } from "@/modules/costing/domain/material-needs"

type NeedsResponse = MaterialNeedsResult & { perishable: boolean; orderCount: number }

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const plusDays = (n: number) => isoDate(new Date(Date.now() + n * 86_400_000))

/** #35 — Dự toán mua nguyên liệu theo đơn sắp giao; "đã mua" cộng tồn kho và ghi giá mua thực tế. */
export default function DuToanPage() {
  const [from, setFrom] = useState(() => plusDays(0))
  const [to, setTo] = useState(() => plusDays(2))
  const { state, reload } = useCostingResource<NeedsResponse>(from && to && from <= to ? `/api/v1/costing/needs?from=${from}&to=${to}` : null)
  const [picked, setPicked] = useState<Record<string, { qty: string; price: string }>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirm, confirmNode] = useConfirmDialog()

  const toBuy = state.status === "ready" ? state.data.needs.filter((n) => n.toBuyQty > 0) : []
  const copyList = async () => {
    const lines = toBuy.map((n) => `- ${n.name}: ${n.toBuyQty.toLocaleString("vi-VN")} ${n.unit}`)
    try {
      await navigator.clipboard.writeText(`Cần mua (giao ${from} → ${to}):\n${lines.join("\n")}`)
      setMessage("Đã sao chép danh sách — dán vào Zalo hoặc tin nhắn cho nhà cung cấp.")
    } catch {
      setError("Trình duyệt chưa cho sao chép. Hãy chọn và sao chép danh sách bằng tay.")
    }
  }

  const toggle = (id: string, qty: number, checked: boolean) =>
    setPicked((p) => {
      const next = { ...p }
      if (checked) next[id] = { qty: String(Math.ceil(qty * 100) / 100), price: "" }
      else delete next[id]
      return next
    })

  const markBought = async () => {
    setError(null)
    const items = Object.entries(picked).map(([id, v]) => ({ material_id: id, quantity: parseNumberInput(v.qty), unit_cost_vnd: parseNumberInput(v.price, true) }))
    if (items.some((i) => i.quantity === null || Number.isNaN(i.quantity) || i.quantity <= 0)) return setError("Số lượng đã mua phải lớn hơn 0.")
    if (items.some((i) => Number.isNaN(i.unit_cost_vnd) || (i.unit_cost_vnd !== null && i.unit_cost_vnd < 0))) return setError("Giá mua phải là số không âm.")
    const ok = await confirm({
      title: `Ghi nhận đã mua ${items.length} nguyên liệu?`,
      consequence: "Số lượng sẽ được cộng vào tồn kho. Dòng có nhập giá mua sẽ cập nhật đơn giá nguyên liệu và lưu vào lịch sử giá — giá vốn các mẫu dùng nguyên liệu đó sẽ tính lại theo giá mới.",
      confirmLabel: "Ghi nhận đã mua",
    })
    if (!ok) return
    setSaving(true)
    try {
      await costingFetch("/api/v1/costing/needs/purchase", { method: "POST", body: JSON.stringify({ items }) })
      setMessage(`Đã ghi nhận ${items.length} nguyên liệu vào kho.`)
      setPicked({})
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa ghi nhận được.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="dt-title">
      <h2 id="dt-title" className="sr-only">
        Dự toán mua nguyên liệu
      </h2>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-body-sm text-text">
          Đơn giao từ ngày
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-body-sm text-text">
          Đến ngày
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        {from > to && <p className="pb-3 text-body-sm text-danger">Ngày kết thúc phải sau ngày bắt đầu.</p>}
      </div>
      {from <= to && state.status === "loading" && <SkeletonBlock lines={4} label="Đang tính nguyên liệu cần mua" />}
      {state.status === "error" && <InlineError message={state.message} onRetry={reload} />}
      {state.status === "ready" && state.data.orderCount === 0 && (
        <EmptyState icon={ClipboardList} title="Không có đơn cần giao trong khoảng này" reason="Dự toán chỉ tính đơn đã xác nhận hoặc đang làm. Thử chọn khoảng ngày rộng hơn." />
      )}
      {state.status === "ready" && state.data.orderCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <p className="text-body text-text">
            {state.data.orderCount} đơn · cần mua {toBuy.length} nguyên liệu · ước tính <strong>{formatVnd(state.data.totalEstimatedVnd)}</strong>
            {state.data.costIncomplete && " (chưa đủ — có nguyên liệu chưa có giá)"}
          </p>
          {state.data.perishable && <p className="text-body-sm text-text-muted">Nguyên liệu tươi dễ hư — nên mua sát ngày giao, đã tính sẵn hao hụt theo từng nhóm.</p>}
          {state.data.productsWithoutRecipe.length > 0 && (
            <p role="status" className="rounded-xl bg-warning-bg px-3.5 py-2.5 text-body-sm text-warning-text">
              {state.data.productsWithoutRecipe.length} mẫu trong các đơn này chưa có công thức nên chưa được cộng vào dự toán.{" "}
              <Link href="/tinh-gia/cong-thuc" className="font-semibold underline">Ghi công thức</Link>
            </p>
          )}
          {toBuy.length === 0 ? (
            <p className="text-body-sm text-text-muted">{noPurchaseMessage(state.data.needs.length, state.data.productsWithoutRecipe.length)}</p>
          ) : (
            <ul className="flex flex-col" aria-label="Nguyên liệu cần mua">
              {toBuy.map((n) => {
                const p = picked[n.materialId]
                return (
                  <li key={n.materialId} className="flex flex-wrap items-center gap-3 border-t border-border py-2.5 first:border-t-0">
                    <label className="flex min-w-56 flex-1 items-center gap-2 text-body text-text cursor-pointer">
                      <Checkbox checked={!!p} onCheckedChange={(checked) => toggle(n.materialId, n.toBuyQty, Boolean(checked))} />
                      <span>
                        <strong>{n.name}</strong>: mua {n.toBuyQty.toLocaleString("vi-VN")} {n.unit}
                        <span className="block text-body-sm text-text-muted">
                          Cần {n.requiredQty.toLocaleString("vi-VN")}, tồn {n.onHandQty === null ? "chưa nhập" : n.onHandQty.toLocaleString("vi-VN")} · {formatVnd(n.estimatedCostVnd)}
                        </span>
                      </span>
                    </label>
                    {p && (
                      <div className="flex flex-wrap gap-2">
                        <Input inputSize="sm" className="w-28" aria-label={`Số lượng đã mua ${n.name}`} value={p.qty} onChange={(e) => setPicked((s) => ({ ...s, [n.materialId]: { ...p, qty: e.target.value } }))} inputMode="decimal" />
                        <Input inputSize="sm" className="w-36" aria-label={`Giá mua mỗi ${n.unit} ${n.name}`} placeholder="Giá mua (tùy chọn)" value={p.price} onChange={(e) => setPicked((s) => ({ ...s, [n.materialId]: { ...p, price: e.target.value } }))} inputMode="numeric" />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {toBuy.length > 0 && (
            <Button size="sm" variant="outline" className="self-start" onClick={() => void copyList()}>
              Sao chép danh sách mua
            </Button>
          )}
          {Object.keys(picked).length > 0 && (
            <Button className="self-start" onClick={() => void markBought()} disabled={saving}>
              {saving ? "Đang ghi…" : `Đánh dấu đã mua (${Object.keys(picked).length})`}
            </Button>
          )}
        </div>
      )}
      {message && <p role="status" className="rounded-xl bg-success-bg px-3.5 py-2.5 text-body-sm text-primary">{message}</p>}
      {error && <InlineError message={error} />}
      {confirmNode}
    </section>
  )
}
