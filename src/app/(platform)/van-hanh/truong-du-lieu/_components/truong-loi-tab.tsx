"use client"

// Tab "Trường lõi" — quản trị nền tảng sửa cấu hình PLATFORM-WIDE của
// trường đã xây bằng code (`origin = CORE`). Mức sàn (không hạ được mức
// yêu cầu dưới sàn code, `floorInternalOnly` không tắt được) đã chặn ở
// server (`update-field-config.ts`) — UI chỉ hiện lỗi trả về, không tự ý
// khoá thêm ở đây để tránh hai nguồn sự thật.

import { Fragment, useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DiffConfirmButton, buildDiffRows } from "./diff-confirm"
import { SkeletonBlock } from "@/components/ui/skeleton"
import {
  ALL_AUDIENCES,
  REQUIREMENT_LEVELS,
  fieldPlatformApi,
  type FieldAudience,
  type FieldDefinitionApiView,
  type FieldEntityKind,
  type FieldRequirementLevel,
} from "../_lib/api"

type EditState = {
  label: string
  description: string
  placeholder: string
  requirement: FieldRequirementLevel
  visibility: Record<FieldAudience, boolean>
  catalogKey: string
  defaultEnabled: boolean
}

function toEditState(field: FieldDefinitionApiView): EditState {
  return {
    label: field.label,
    description: field.description ?? "",
    placeholder: field.placeholder ?? "",
    requirement: field.requirement,
    visibility: {
      INTERNAL: field.visibility.INTERNAL ?? true,
      PARTNER: field.visibility.PARTNER ?? false,
      SHIPPER: field.visibility.SHIPPER ?? false,
      CUSTOMER: field.visibility.CUSTOMER ?? false,
    },
    catalogKey: field.catalogKey ?? "",
    defaultEnabled: field.defaultEnabled,
  }
}

function visibilityLabel(v: Record<FieldAudience, boolean>): string {
  const on = ALL_AUDIENCES.filter((a) => v[a])
  return on.length > 0 ? on.join(", ") : "(không hiện đâu)"
}

export function TruongLoiTab() {
  const [entityFilter, setEntityFilter] = useState<FieldEntityKind | "ALL">("ALL")
  const [fields, setFields] = useState<FieldDefinitionApiView[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)

  async function reload() {
    const res = await fieldPlatformApi.listFields(entityFilter === "ALL" ? undefined : entityFilter)
    if (!res.ok) {
      setLoi(res.error)
      return
    }
    setLoi(null)
    setFields(res.data.filter((f) => f.origin === "CORE"))
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter])

  const current = useMemo(() => fields?.find((f) => f.key === expandedKey) ?? null, [fields, expandedKey])

  if (loi) return <p className="text-body-sm text-danger">{loi}</p>
  if (!fields) return <SkeletonBlock lines={2} />

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-body-sm">
        <span className="text-text-muted">Thực thể:</span>
        {(["ALL", "ORDER", "PARTNER"] as const).map((e) => (
          <Button
            key={e}
            type="button"
            variant={entityFilter === e ? "primary" : "secondary"}
            size="xs"
            onClick={() => setEntityFilter(e)}
            className="rounded-lg px-2.5 py-1 h-auto font-medium"
          >
            {e === "ALL" ? "Tất cả" : e}
          </Button>
        ))}
        <span className="ml-auto text-text-muted">{fields.length} trường lõi</span>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="py-2 pl-3 pr-3">Khoá</th>
              <th className="py-2 pr-3">Nhãn</th>
              <th className="py-2 pr-3">Kiểu</th>
              <th className="py-2 pr-3">Mức yêu cầu</th>
              <th className="py-2 pr-3">Hiển thị</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((f) => (
              <Fragment key={f.key}>
                <tr className="hover:bg-surface-alt">
                  <td className="py-2 pl-3 pr-3 font-mono text-meta">{f.key}</td>
                  <td className="py-2 pr-3 font-medium">
                    {f.label}
                    {f.floorInternalOnly && (
                      <Badge tone="danger" className="ml-2">
                        chỉ INTERNAL
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-text-muted">{f.dataType}</td>
                  <td className="py-2 pr-3">{f.requirement}</td>
                  <td className="py-2 pr-3 text-text-muted">{visibilityLabel(toEditState(f).visibility)}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={f.status === "ACTIVE" ? "success" : "neutral"}>{f.status}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (expandedKey === f.key) {
                          setExpandedKey(null)
                          setEdit(null)
                        } else {
                          setExpandedKey(f.key)
                          setEdit(toEditState(f))
                        }
                      }}
                    >
                      {expandedKey === f.key ? "Đóng" : "Sửa"}
                    </Button>
                  </td>
                </tr>
                {expandedKey === f.key && current && edit && (
                  <tr key={`${f.key}-edit`}>
                    <td colSpan={7} className="bg-surface-alt/60 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-body-sm">
                          <span className="mb-1 block text-text-muted">Nhãn</span>
                          <Input
                            value={edit.label}
                            onChange={(e) => setEdit({ ...edit, label: e.target.value })}
                          />
                        </label>
                        <label className="text-body-sm">
                          <span className="mb-1 block text-text-muted">Gợi ý nhập (placeholder)</span>
                          <Input
                            value={edit.placeholder}
                            onChange={(e) => setEdit({ ...edit, placeholder: e.target.value })}
                          />
                        </label>
                        <label className="text-body-sm sm:col-span-2">
                          <span className="mb-1 block text-text-muted">Mô tả</span>
                          <Input
                            value={edit.description}
                            onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                          />
                        </label>
                        <label className="text-body-sm">
                          <span className="mb-1 block text-text-muted">
                            Mức yêu cầu {current.origin === "CORE" && <span className="text-text-muted">(không hạ được dưới mức sàn)</span>}
                          </span>
                          <NativeSelect
                            value={edit.requirement}
                            onChange={(e) => setEdit({ ...edit, requirement: e.target.value as FieldRequirementLevel })}
                          >
                            {REQUIREMENT_LEVELS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </NativeSelect>
                        </label>
                        <label className="text-body-sm">
                          <span className="mb-1 block text-text-muted">Khoá danh mục (nếu là trường chọn)</span>
                          <Input
                            value={edit.catalogKey}
                            onChange={(e) => setEdit({ ...edit, catalogKey: e.target.value })}
                            placeholder="vd. serviceLevel"
                          />
                        </label>
                        <div className="text-body-sm sm:col-span-2">
                          <span className="mb-1 block text-text-muted">
                            Hiển thị theo đối tượng xem
                            {current.floorInternalOnly && (
                              <span className="ml-1 text-danger">
                                (mức sàn: trường này chỉ hiện INTERNAL, không mở được cho các đối tượng khác)
                              </span>
                            )}
                          </span>
                          <div className="flex flex-wrap gap-3">
                            {ALL_AUDIENCES.map((a) => (
                              <label key={a} className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                  checked={Boolean(edit.visibility[a])}
                                  disabled={Boolean(current.floorInternalOnly && a !== "INTERNAL")}
                                  onCheckedChange={(checked) =>
                                    setEdit({ ...edit, visibility: { ...edit.visibility, [a]: Boolean(checked) } })
                                  }
                                />
                                {a}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <DiffConfirmButton
                          label="Lưu thay đổi"
                          buildDiff={() =>
                            buildDiffRows(
                              {
                                label: current.label,
                                description: current.description ?? "",
                                placeholder: current.placeholder ?? "",
                                requirement: current.requirement,
                                catalogKey: current.catalogKey ?? "",
                                visibility: visibilityLabel(toEditState(current).visibility),
                              },
                              {
                                label: edit.label,
                                description: edit.description,
                                placeholder: edit.placeholder,
                                requirement: edit.requirement,
                                catalogKey: edit.catalogKey,
                                visibility: visibilityLabel(edit.visibility),
                              },
                              {
                                label: "Nhãn",
                                description: "Mô tả",
                                placeholder: "Gợi ý nhập",
                                requirement: "Mức yêu cầu",
                                catalogKey: "Khoá danh mục",
                                visibility: "Hiển thị",
                              }
                            )
                          }
                          onConfirm={async () => {
                            const res = await fieldPlatformApi.updateFieldConfig({
                              key: f.key,
                              label: edit.label,
                              description: edit.description || null,
                              placeholder: edit.placeholder || null,
                              requirement: edit.requirement,
                              visibility: edit.visibility,
                              catalogKey: edit.catalogKey || null,
                            })
                            if (!res.ok) return { ok: false, error: res.error }
                            await reload()
                            setExpandedKey(null)
                            setEdit(null)
                            return { ok: true }
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-text-muted">
                  Chưa có trường lõi nào trong sổ (chạy <code>npm run seed:field-registry</code> trên máy thật).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
