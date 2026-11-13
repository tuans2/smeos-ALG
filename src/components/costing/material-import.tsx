"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/select"
import { Disclosure } from "@/components/ui/disclosure"
import { InlineError } from "@/components/ui/inline-error"
import { parseMaterialTable } from "@/modules/costing/domain/material-import"
import { costingFetch, formatVnd } from "./use-costing-api"
import { categoryLabel, useCostingProfile } from "./costing-profile-context"
import { selectClass } from "./costing-ui-types"

/** #32 — nhập nhiều nguyên liệu bằng cách dán bảng từ Excel/Google Sheets; xem trước rồi mới lưu. */
export function MaterialImport({ existingNames, onImported }: { existingNames: readonly string[]; onImported: () => void }) {
  const { spec } = useCostingProfile()
  const [text, setText] = useState("")
  const [fallback, setFallback] = useState(spec.materialCategories[0]?.key ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const parsed = useMemo(() => parseMaterialTable(text, spec, fallback), [text, spec, fallback])
  const existing = useMemo(() => new Set(existingNames.map((n) => n.toLocaleLowerCase("vi"))), [existingNames])
  const fresh = parsed.rows.filter((r) => !existing.has(r.name.toLocaleLowerCase("vi")))
  const duplicates = parsed.rows.length - fresh.length

  const save = async () => {
    setSaving(true)
    setError(null)
    let created = 0
    try {
      for (const r of fresh) {
        await costingFetch("/api/v1/costing/materials", {
          method: "POST",
          body: JSON.stringify({ name: r.name, unit: r.unit, category_key: r.categoryKey, unit_cost_vnd: r.unitCostVnd }),
        })
        created++
      }
      setDone(`Đã thêm ${created} nguyên liệu.`)
      setText("")
    } catch (e) {
      setError(`Đã thêm ${created}/${fresh.length} nguyên liệu rồi dừng: ${e instanceof Error ? e.message : "lỗi không rõ"}`)
    } finally {
      setSaving(false)
      onImported()
    }
  }

  return (
    <Disclosure label="Nhập nhiều nguyên liệu từ Excel">
      <div className="flex flex-col gap-3">
        <p className="text-body-sm text-text-muted">
          Chọn các cột Tên · Nhóm · Đơn vị · Đơn giá trong Excel hoặc Google Sheets, sao chép rồi dán vào đây. Cột Nhóm, Đơn vị, Đơn giá có thể để trống.
        </p>
        <label className="flex flex-col gap-1 text-body-sm text-text">
          Bảng nguyên liệu
          <Textarea
            className="min-h-32 text-body"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setDone(null)
            }}
            placeholder={"Hoa hồng\tHoa chính\tcành\t12000"}
          />
        </label>
        <label className="flex flex-col gap-1 text-body-sm text-text sm:max-w-xs">
          Nhóm dùng khi cột Nhóm trống
          <NativeSelect className={selectClass} value={fallback} onChange={(e) => setFallback(e.target.value)}>
            {spec.materialCategories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        {parsed.rows.length > 0 && (
          <div className="flex flex-col gap-1 text-body-sm text-text" role="status">
            <span>
              Sẽ thêm <strong>{fresh.length}</strong> nguyên liệu{duplicates > 0 && ` · bỏ qua ${duplicates} đã có trong danh sách`}.
            </span>
            <ul className="max-h-48 overflow-auto rounded-xl bg-surface-alt px-3 py-2">
              {fresh.slice(0, 50).map((r) => (
                <li key={r.name}>
                  {r.name} — {categoryLabel(spec, r.categoryKey)} · {r.unit} · {r.unitCostVnd === null ? "chưa có giá" : formatVnd(r.unitCostVnd)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {parsed.skipped.length > 0 && (
          <ul className="text-body-sm text-warning-text">
            {parsed.skipped.map((s) => (
              <li key={s.line}>
                Dòng {s.line}: {s.reason}
              </li>
            ))}
          </ul>
        )}
        {error && <InlineError message={error} />}
        {done && <p role="status" className="text-body-sm text-primary">{done}</p>}
        <div>
          <Button variant="secondary" onClick={() => void save()} disabled={saving || fresh.length === 0}>
            {saving ? "Đang thêm…" : `Thêm ${fresh.length} nguyên liệu`}
          </Button>
        </div>
      </div>
    </Disclosure>
  )
}
