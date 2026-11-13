"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Disclosure } from "@/components/ui/disclosure"
import { InlineError } from "@/components/ui/inline-error"
import { costingFetch } from "./use-costing-api"
import { useCostingProfile } from "./costing-profile-context"
import { parseNumberInput, selectClass } from "./costing-ui-types"

/**
 * #32 — thêm nguyên liệu. L0: tên, nhóm, đơn vị, đơn giá.
 * Nhà cung cấp và tồn kho nằm trong "Tùy chỉnh thêm" (03c UX-017) vì không bắt buộc để tính giá vốn.
 */
export function MaterialForm({ onCreated }: { onCreated: () => void }) {
  const { spec } = useCostingProfile()
  const first = spec.materialCategories[0]
  const [name, setName] = useState("")
  const [categoryKey, setCategoryKey] = useState(first?.key ?? "")
  const [unit, setUnit] = useState(first?.defaultUnit ?? "")
  const [price, setPrice] = useState("")
  const [supplier, setSupplier] = useState("")
  const [onHand, setOnHand] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const changeCategory = (key: string) => {
    setCategoryKey(key)
    const cat = spec.materialCategories.find((c) => c.key === key)
    if (cat) setUnit(cat.defaultUnit)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const unitCost = parseNumberInput(price, true)
    const qty = parseNumberInput(onHand)
    if (!name.trim()) return setError("Hãy nhập tên nguyên liệu.")
    if (Number.isNaN(unitCost) || (unitCost !== null && unitCost < 0)) return setError("Đơn giá phải là số không âm, ví dụ 12000.")
    if (Number.isNaN(qty) || (qty !== null && qty < 0)) return setError("Tồn kho phải là số không âm.")
    setSaving(true)
    setError(null)
    try {
      await costingFetch("/api/v1/costing/materials", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          unit: unit.trim(),
          category_key: categoryKey,
          unit_cost_vnd: unitCost,
          supplier_name: supplier.trim() || null,
          on_hand_qty: qty,
        }),
      })
      setName("")
      setPrice("")
      setSupplier("")
      setOnHand("")
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa lưu được nguyên liệu.")
    } finally {
      setSaving(false)
    }
  }

  const extras = [supplier.trim(), onHand.trim()].filter(Boolean).length

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4" aria-label="Thêm nguyên liệu">
      <h2 className="text-title-sm font-semibold text-text">Thêm nguyên liệu</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-body-sm text-text sm:col-span-2">
          Tên nguyên liệu
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Hoa hồng Đà Lạt" maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-body-sm text-text">
          Nhóm
          <NativeSelect className={selectClass} value={categoryKey} onChange={(e) => changeCategory(e.target.value)}>
            {spec.materialCategories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-body-sm text-text">
          Đơn vị
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={30} />
        </label>
        <label className="flex flex-col gap-1 text-body-sm text-text sm:col-span-2">
          Đơn giá (đồng / {unit || "đơn vị"})
          <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="Để trống nếu chưa biết giá" />
        </label>
      </div>
      <Disclosure label="Nhà cung cấp và tồn kho" {...(extras > 0 ? { appliedSummary: `Đã nhập ${extras} mục` } : {})}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-body-sm text-text">
            Nhà cung cấp
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={120} placeholder="Tên vựa hoặc người bán" />
          </label>
          <label className="flex flex-col gap-1 text-body-sm text-text">
            Đang còn trong kho ({unit || "đơn vị"})
            <Input value={onHand} onChange={(e) => setOnHand(e.target.value)} inputMode="decimal" />
          </label>
        </div>
      </Disclosure>
      {error && <InlineError message={error} />}
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu nguyên liệu"}
        </Button>
      </div>
    </form>
  )
}
