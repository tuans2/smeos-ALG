"use client"

import { useMemo, useState } from "react"
import { Package } from "@/components/ui/icon-set/package"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { MaterialForm } from "@/components/costing/material-form"
import { MaterialItem } from "@/components/costing/material-item"
import { MaterialImport } from "@/components/costing/material-import"
import { costingFetch, useCostingResource } from "@/components/costing/use-costing-api"
import { useCostingProfile } from "@/components/costing/costing-profile-context"
import { normalizeMaterialName } from "@/modules/costing/domain/bom-adapters"
import { selectClass, type MaterialRow } from "@/components/costing/costing-ui-types"

/** #32 — Bảng giá nguyên liệu. */
export default function NguyenLieuPage() {
  const { spec } = useCostingProfile()
  const [showInactive, setShowInactive] = useState(false)
  const { state, reload } = useCostingResource<MaterialRow[]>(`/api/v1/costing/materials${showInactive ? "?include_inactive=true" : ""}`)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [confirm, confirmNode] = useConfirmDialog()

  const rows = useMemo(() => {
    if (state.status !== "ready") return []
    const q = normalizeMaterialName(query)
    // Xếp theo thứ tự nhóm của ngành (hoa chính trước), không theo mã nhóm.
    const order = new Map(spec.materialCategories.map((c, i) => [c.key, i]))
    return state.data
      .filter((m) => (!category || m.categoryKey === category) && (!q || normalizeMaterialName(m.name).includes(q)))
      .sort((x, y) => (order.get(x.categoryKey) ?? 99) - (order.get(y.categoryKey) ?? 99) || x.name.localeCompare(y.name, "vi"))
  }, [state, query, category, spec])

  const all = state.status === "ready" ? state.data : []
  const missing = all.filter((m) => m.active && m.unitCostVnd === null).length
  const alerts = all.filter((m) => m.priceChange?.alert).length

  /** Lần đầu: tạo nhanh danh sách nguyên liệu thường dùng của ngành (chưa có giá — người dùng tự điền). */
  const seedStarter = async () => {
    setSeeding(true)
    setSeedError(null)
    try {
      for (const s of spec.starterMaterials) {
        await costingFetch("/api/v1/costing/materials", {
          method: "POST",
          body: JSON.stringify({ name: s.name, unit: s.unit, category_key: s.categoryKey, unit_cost_vnd: null }),
        })
      }
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : "Chưa tạo được danh sách gợi ý.")
    } finally {
      setSeeding(false)
      reload()
    }
  }

  const confirmArchive = (m: MaterialRow) =>
    confirm({
      title: `Ngừng dùng "${m.name}"?`,
      consequence: "Nguyên liệu sẽ ẩn khỏi danh sách và không chọn được cho công thức mới. Công thức cũ và lịch sử giá vẫn giữ nguyên; bạn có thể dùng lại bất cứ lúc nào.",
      confirmLabel: "Ngừng dùng",
    })

  return (
    <section className="flex flex-col gap-4" aria-labelledby="nl-title">
      <h2 id="nl-title" className="sr-only">
        Nguyên liệu và đơn giá
      </h2>
      <MaterialForm onCreated={reload} />
      <MaterialImport existingNames={all.map((m) => m.name)} onImported={reload} />

      {state.status === "loading" && <SkeletonBlock lines={5} label="Đang tải nguyên liệu" />}
      {state.status === "error" && <InlineError message={state.message} onRetry={reload} />}
      {state.status === "ready" && all.length === 0 && !showInactive && (
        <div className="flex flex-col gap-3">
          <EmptyState
            icon={Package}
            title="Chưa có nguyên liệu nào"
            reason={`Thêm nguyên liệu ở trên, hoặc tạo nhanh ${spec.starterMaterials.length} nguyên liệu thường dùng rồi điền giá sau.`}
          />
          {spec.starterMaterials.length > 0 && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={seedStarter} disabled={seeding}>
                {seeding ? "Đang tạo…" : "Tạo danh sách nguyên liệu gợi ý"}
              </Button>
            </div>
          )}
          {seedError && <InlineError message={seedError} />}
        </div>
      )}

      {state.status === "ready" && (all.length > 0 || showInactive) && (
        <>
          {(missing > 0 || alerts > 0) && (
            <p className="rounded-xl bg-warning-bg px-3.5 py-2.5 text-body-sm text-warning-text" role="status">
              {missing > 0 && `${missing} nguyên liệu chưa có giá — giá vốn của mẫu dùng chúng sẽ chưa đầy đủ. `}
              {alerts > 0 && `${alerts} nguyên liệu vừa đổi giá mạnh — nên xem lại giá bán.`}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-body-sm text-text">
              Tìm nguyên liệu
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Gõ tên, có dấu hay không đều được" />
            </label>
            <label className="flex flex-col gap-1 text-body-sm text-text">
              Nhóm
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tất cả nhóm</option>
                {spec.materialCategories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="flex h-11 items-center gap-2 text-body-sm text-text cursor-pointer">
              <Checkbox checked={showInactive} onCheckedChange={(checked) => setShowInactive(Boolean(checked))} />
              Hiện cả nguyên liệu đã ngừng dùng
            </label>
          </div>
          {rows.length === 0 ? (
            <p className="text-body-sm text-text-muted">Không có nguyên liệu khớp với bộ lọc.</p>
          ) : (
            <ul className="rounded-2xl border border-border bg-surface" aria-label="Danh sách nguyên liệu">
              {rows.map((m) => (
                <MaterialItem key={`${m.id}-${m.unitCostVnd}-${m.active}`} material={m} onChanged={reload} confirmArchive={confirmArchive} />
              ))}
            </ul>
          )}
        </>
      )}
      {confirmNode}
    </section>
  )
}
