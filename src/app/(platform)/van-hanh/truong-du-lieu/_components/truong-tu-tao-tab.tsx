"use client"

// Tab "Trường tự tạo" — quản trị nền tảng tạo trường hoàn toàn mới lúc
// chạy (D13, Đặc tả trường §16.3) và tắt trường tự tạo không dùng nữa.
// Giá trị được nhập và lưu ở: đơn điều phối (ORDER — form tiếp nhận, chi tiết
// đơn, `PATCH /coordinator/orders/:id/custom-fields`) và đối tác gia công
// (PARTNER — form tạo đối tác, `POST/PATCH /coordinator/partners`; audit L-09).

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DiffConfirmButton } from "./diff-confirm"
import { SkeletonBlock } from "@/components/ui/skeleton"
import {
  ALL_AUDIENCES,
  CUSTOM_FIELD_DATA_TYPES,
  REQUIREMENT_LEVELS,
  SENSITIVITY_LEVELS,
  fieldPlatformApi,
  type FieldAudience,
  type FieldDefinitionApiView,
  type FieldEntityKind,
  type FieldRequirementLevel,
  type FieldSensitivity,
} from "../_lib/api"

const BLANK_FORM = {
  entity: "ORDER" as FieldEntityKind,
  label: "",
  description: "",
  placeholder: "",
  dataType: "TEXT" as (typeof CUSTOM_FIELD_DATA_TYPES)[number],
  requirement: "OPTIONAL" as FieldRequirementLevel,
  requiredAtStage: "",
  visibility: { INTERNAL: true, PARTNER: false, SHIPPER: false, CUSTOMER: false } as Record<FieldAudience, boolean>,
  catalogKey: "",
  sensitivity: "NORMAL" as FieldSensitivity,
}

export function TruongTuTaoTab() {
  const [fields, setFields] = useState<FieldDefinitionApiView[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [showForm, setShowForm] = useState(false)

  async function reload() {
    const res = await fieldPlatformApi.listFields()
    if (!res.ok) {
      setLoi(res.error)
      return
    }
    setLoi(null)
    setFields(res.data.filter((f) => f.origin === "CUSTOM"))
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
  }, [])

  if (loi) return <p className="text-body-sm text-danger">{loi}</p>
  if (!fields) return <SkeletonBlock lines={2} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-text-muted">{fields.length} trường tự tạo (tối đa 50 mỗi thực thể)</p>
        <Button type="button" size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Đóng form" : "+ Tạo trường mới"}
        </Button>
      </div>

      {showForm && (
        <Card className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-body-sm">
              <span className="mb-1 block text-text-muted">Thực thể</span>
              <NativeSelect
                value={form.entity}
                onChange={(e) => setForm({ ...form, entity: e.target.value as FieldEntityKind })}
              >
                <option value="ORDER">Đơn điều phối</option>
                <option value="PARTNER">Đối tác</option>
              </NativeSelect>
            </label>
            <label className="text-body-sm">
              <span className="mb-1 block text-text-muted">Kiểu dữ liệu</span>
              <NativeSelect
                value={form.dataType}
                onChange={(e) => setForm({ ...form, dataType: e.target.value as (typeof CUSTOM_FIELD_DATA_TYPES)[number] })}
              >
                {CUSTOM_FIELD_DATA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-body-sm sm:col-span-2">
              <span className="mb-1 block text-text-muted">Nhãn</span>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="vd. Mã PO khách" />
            </label>
            <label className="text-body-sm sm:col-span-2">
              <span className="mb-1 block text-text-muted">Mô tả</span>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="text-body-sm">
              <span className="mb-1 block text-text-muted">Gợi ý nhập</span>
              <Input value={form.placeholder} onChange={(e) => setForm({ ...form, placeholder: e.target.value })} />
            </label>
            <label className="text-body-sm">
              <span className="mb-1 block text-text-muted">Mức yêu cầu</span>
              <NativeSelect
                value={form.requirement}
                onChange={(e) => setForm({ ...form, requirement: e.target.value as FieldRequirementLevel })}
              >
                {REQUIREMENT_LEVELS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-body-sm">
              <span className="mb-1 block text-text-muted">Bắt buộc phải có trước bước (mã bước, để trống nếu không chặn)</span>
              <Input
                value={form.requiredAtStage}
                onChange={(e) => setForm({ ...form, requiredAtStage: e.target.value })}
                placeholder="vd. INTAKE"
              />
            </label>
            <label className="text-body-sm">
              <span className="mb-1 block text-text-muted">Độ nhạy</span>
              <NativeSelect
                value={form.sensitivity}
                onChange={(e) => setForm({ ...form, sensitivity: e.target.value as FieldSensitivity })}
              >
                {SENSITIVITY_LEVELS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-body-sm">
              <span className="mb-1 block text-text-muted">Khoá danh mục (nếu kiểu SELECT/MULTI_SELECT)</span>
              <Input value={form.catalogKey} onChange={(e) => setForm({ ...form, catalogKey: e.target.value })} />
            </label>
            <div className="text-body-sm sm:col-span-2">
              <span className="mb-1 block text-text-muted">Hiển thị theo đối tượng xem</span>
              <div className="flex flex-wrap gap-3">
                {ALL_AUDIENCES.map((a) => (
                  <label key={a} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={Boolean(form.visibility[a])}
                      onCheckedChange={(checked) => setForm({ ...form, visibility: { ...form.visibility, [a]: Boolean(checked) } })}
                    />
                    {a}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DiffConfirmButton
            label="Tạo trường"
            confirmLabel="Xác nhận tạo"
            buildDiff={() => [
              { label: "Nhãn", from: "—", to: form.label || "(chưa nhập)" },
              { label: "Thực thể", from: "—", to: form.entity },
              { label: "Kiểu dữ liệu", from: "—", to: form.dataType },
              { label: "Mức yêu cầu", from: "—", to: form.requirement },
              { label: "Độ nhạy", from: "—", to: form.sensitivity },
            ]}
            disabled={form.label.trim().length === 0}
            onConfirm={async () => {
              const res = await fieldPlatformApi.createCustomField({
                entity: form.entity,
                label: form.label,
                description: form.description || undefined,
                placeholder: form.placeholder || undefined,
                dataType: form.dataType,
                requirement: form.requirement,
                requiredAtStage: form.requiredAtStage || undefined,
                visibility: form.visibility,
                catalogKey: form.catalogKey || undefined,
                sensitivity: form.sensitivity,
              })
              if (!res.ok) return { ok: false, error: res.error }
              setForm(BLANK_FORM)
              setShowForm(false)
              await reload()
              return { ok: true }
            }}
          />
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="py-2 pl-3 pr-3">Khoá</th>
              <th className="py-2 pr-3">Nhãn</th>
              <th className="py-2 pr-3">Thực thể</th>
              <th className="py-2 pr-3">Kiểu</th>
              <th className="py-2 pr-3">Độ nhạy</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((f) => (
              <tr key={f.key} className="hover:bg-surface-alt">
                <td className="py-2 pl-3 pr-3 font-mono text-meta">{f.key}</td>
                <td className="py-2 pr-3 font-medium">{f.label}</td>
                <td className="py-2 pr-3 text-text-muted">{f.entity}</td>
                <td className="py-2 pr-3 text-text-muted">{f.dataType}</td>
                <td className="py-2 pr-3">
                  {f.sensitivity !== "NORMAL" && <Badge tone="warning">{f.sensitivity}</Badge>}
                  {f.sensitivity === "NORMAL" && <span className="text-text-muted">—</span>}
                </td>
                <td className="py-2 pr-3">
                  <Badge tone={f.status === "ACTIVE" ? "success" : "neutral"}>{f.status}</Badge>
                </td>
                <td className="py-2 pr-3 text-right">
                  {f.status === "ACTIVE" && (
                    <DiffConfirmButton
                      label="Tắt"
                      confirmLabel="Xác nhận tắt"
                      buildDiff={() => [{ label: "Trạng thái", from: "ACTIVE", to: "INACTIVE (chỉ tắt, không xoá)" }]}
                      onConfirm={async () => {
                        const res = await fieldPlatformApi.deactivateField(f.key)
                        if (!res.ok) return { ok: false, error: res.error }
                        await reload()
                        return { ok: true }
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-text-muted">
                  Chưa có trường tự tạo nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
