"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Disclosure } from "@/components/ui/disclosure"
import { InlineError } from "@/components/ui/inline-error"
import type { DraftRecipeLine } from "@/modules/costing/domain/bom-adapters"
import { costingFetch } from "./use-costing-api"
import { categoryLabel, useCostingProfile } from "./costing-profile-context"
import { parseNumberInput, selectClass, type MaterialRow } from "./costing-ui-types"

export interface RecipeResponse {
  product: { id: string; name: string }
  recipe: { version: number; note: string | null; wastePercent: number | null; laborMinutes: number | null; lines: { materialId: string; quantity: number }[] } | null
  draft: DraftRecipeLine[] | null
}

interface EditLine {
  key: string
  materialId: string | null
  quantity: string
  /** Tên do AI đọc từ ảnh khi chưa ghép được nguyên liệu. */
  draftName: string | null
  draftUnit: string
  draftCategory: string
}

let seq = 0
const nextKey = () => `l${++seq}`

function initialLines(r: RecipeResponse): EditLine[] {
  if (r.recipe) return r.recipe.lines.map((l) => ({ key: nextKey(), materialId: l.materialId, quantity: String(l.quantity), draftName: null, draftUnit: "", draftCategory: "" }))
  return (r.draft ?? []).map((d) => ({ key: nextKey(), materialId: d.materialId, quantity: String(d.quantity), draftName: d.materialId ? null : d.name, draftUnit: d.unit, draftCategory: d.categoryKey }))
}

/** #31 — định mức nguyên liệu của một mẫu. Bản nháp từ ảnh chỉ là gợi ý: người dùng xem lại rồi mới lưu. */
export function RecipeEditor({ data, materials, onSaved, onMaterialsChanged }: { data: RecipeResponse; materials: MaterialRow[]; onSaved: () => void; onMaterialsChanged: () => void }) {
  const { spec, config } = useCostingProfile()
  const [lines, setLines] = useState<EditLine[]>(() => initialLines(data))
  const [waste, setWaste] = useState(data.recipe?.wastePercent?.toString() ?? "")
  const [minutes, setMinutes] = useState(data.recipe?.laborMinutes?.toString() ?? "")
  const [note, setNote] = useState(data.recipe?.note ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedVersion, setSavedVersion] = useState<number | null>(null)
  const active = materials.filter((m) => m.active)
  const unitOf = (id: string | null) => materials.find((m) => m.id === id)?.unit ?? ""

  const update = (key: string, patch: Partial<EditLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const createFromDraft = async (line: EditLine) => {
    try {
      const m = await costingFetch<{ id: string }>("/api/v1/costing/materials", {
        method: "POST",
        body: JSON.stringify({ name: line.draftName, unit: line.draftUnit || "cái", category_key: line.draftCategory, unit_cost_vnd: null }),
      })
      update(line.key, { materialId: m.id, draftName: null })
      onMaterialsChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tạo được nguyên liệu.")
    }
  }

  const save = async () => {
    setError(null)
    if (lines.some((l) => !l.materialId)) return setError("Còn dòng chưa chọn nguyên liệu — hãy chọn hoặc tạo mới, hoặc xóa dòng đó.")
    const parsed = lines.map((l) => ({ material_id: l.materialId as string, quantity: parseNumberInput(l.quantity) }))
    if (parsed.some((l) => l.quantity === null || Number.isNaN(l.quantity) || l.quantity <= 0)) return setError("Số lượng mỗi dòng phải lớn hơn 0.")
    if (new Set(parsed.map((l) => l.material_id)).size !== parsed.length) return setError("Một nguyên liệu đang xuất hiện ở hai dòng — hãy gộp lại.")
    const w = parseNumberInput(waste)
    const mins = parseNumberInput(minutes)
    if (Number.isNaN(w) || (w !== null && (w < 0 || w >= 100))) return setError("Hao hụt phải từ 0 đến dưới 100%.")
    if (Number.isNaN(mins) || (mins !== null && (mins < 0 || !Number.isInteger(mins)))) return setError("Số phút làm phải là số nguyên không âm.")
    setSaving(true)
    try {
      const r = await costingFetch<{ version: number }>(`/api/v1/costing/recipes/${data.product.id}`, {
        method: "PUT",
        body: JSON.stringify({ lines: parsed, waste_percent: w, labor_minutes: mins, note: note.trim() || null }),
      })
      setSavedVersion(r.version)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa lưu được công thức.")
    } finally {
      setSaving(false)
    }
  }

  const customized = [waste, minutes, note].filter((v) => v.trim()).length
  const isDraft = !data.recipe && (data.draft?.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-title-sm font-semibold text-text">Công thức: {data.product.name}</h2>
        <p className="text-body-sm text-text-muted">
          {data.recipe
            ? `Phiên bản ${data.recipe.version}. Sửa rồi lưu sẽ tạo phiên bản mới.`
            : isDraft
              ? "Bản nháp đọc từ ảnh sản phẩm — hãy kiểm tra số lượng và nguyên liệu trước khi lưu."
              : "Chưa có công thức. Thêm từng nguyên liệu dùng cho một sản phẩm."}
        </p>
      </div>
      {active.length === 0 && (
        <p className="rounded-xl bg-warning-bg px-3.5 py-2.5 text-body-sm text-warning-text">
          Chưa có nguyên liệu nào. <Link href="/tinh-gia/nguyen-lieu" className="font-semibold underline">Thêm nguyên liệu trước</Link>.
        </p>
      )}
      <ul className="flex flex-col gap-2" aria-label="Các dòng nguyên liệu">
        {lines.map((l, i) => (
          <li key={l.key} className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-alt p-3">
            {l.draftName ? (
              <div className="flex min-w-56 flex-[2] flex-col gap-1 text-body-sm text-text">
                <span>
                  Ảnh gợi ý: <strong>{l.draftName}</strong> ({categoryLabel(spec, l.draftCategory)}) — chưa có trong danh sách
                </span>
                <div className="flex flex-wrap gap-2">
                  <NativeSelect aria-label={`Chọn nguyên liệu cho dòng ${i + 1}`} className={selectClass} value="" onChange={(e) => update(l.key, { materialId: e.target.value, draftName: null })}>
                    <option value="">Ghép với nguyên liệu có sẵn…</option>
                    {active.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </NativeSelect>
                  <Button size="sm" variant="secondary" onClick={() => void createFromDraft(l)}>Tạo nguyên liệu mới</Button>
                </div>
              </div>
            ) : (
              <label className="flex min-w-56 flex-[2] flex-col gap-1 text-body-sm text-text">
                Nguyên liệu {i + 1}
                <NativeSelect className={selectClass} value={l.materialId ?? ""} onChange={(e) => update(l.key, { materialId: e.target.value || null })}>
                  <option value="">Chọn nguyên liệu…</option>
                  {active.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </NativeSelect>
              </label>
            )}
            <label className="flex w-36 flex-col gap-1 text-body-sm text-text">
              Số lượng {unitOf(l.materialId) && `(${unitOf(l.materialId)})`}
              <Input value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} inputMode="decimal" />
            </label>
            <Button size="icon" variant="ghost" aria-label={`Xóa dòng ${i + 1}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { key: nextKey(), materialId: null, quantity: "1", draftName: null, draftUnit: "", draftCategory: "" }])}>
          <Plus className="mr-1 h-4 w-4" aria-hidden /> Thêm nguyên liệu vào công thức
        </Button>
      </div>
      <Disclosure label="Hao hụt, thời gian làm và ghi chú" {...(customized > 0 ? { appliedSummary: `Đã tùy chỉnh ${customized} mục` } : {})}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-body-sm text-text">
            Hao hụt riêng (%)
            <Input value={waste} onChange={(e) => setWaste(e.target.value)} inputMode="decimal" placeholder="Để trống: theo từng nhóm" />
          </label>
          <label className="flex flex-col gap-1 text-body-sm text-text">
            Số phút làm
            <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" />
            {config.laborModel === "PER_COMPLEXITY" && <span className="text-caption text-text-muted">Tiền công đang tính theo độ khó của mẫu; số phút chỉ để ghi nhận.</span>}
          </label>
          <label className="flex flex-col gap-1 text-body-sm text-text">
            Ghi chú
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </label>
        </div>
      </Disclosure>
      {error && <InlineError message={error} />}
      {savedVersion !== null && (
        <p role="status" className="rounded-xl bg-success-bg px-3.5 py-2.5 text-body-sm text-primary">
          Đã lưu công thức (phiên bản {savedVersion}). <Link href="/tinh-gia/gia-von" className="font-semibold underline">Xem giá vốn</Link>
        </p>
      )}
      <div>
        <Button onClick={() => void save()} disabled={saving || lines.length === 0}>{saving ? "Đang lưu…" : "Lưu công thức"}</Button>
      </div>
    </div>
  )
}
