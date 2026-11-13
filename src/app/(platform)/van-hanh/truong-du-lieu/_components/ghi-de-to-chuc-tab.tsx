"use client"

// Tab "Ghi đè theo tổ chức" — CHỈ áp cho MỘT tổ chức, không đổi mặc định
// platform-wide (đó là tab "Trường lõi"). Có "xem trước" dùng CHUNG phép
// tính hiệu lực với tenant thật (`get-effective-field-config.ts`) qua
// route `/platform/organizations/:id/field-preview` (ĐP-3 3.15).

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DiffConfirmButton } from "./diff-confirm"
import { SkeletonBlock } from "@/components/ui/skeleton"
import {
  ALL_AUDIENCES,
  REQUIREMENT_LEVELS,
  fieldPlatformApi,
  type EffectiveFieldConfigView,
  type FieldAudience,
  type FieldEntityKind,
  type FieldRequirementLevel,
  type PlatformOrganizationSummary,
} from "../_lib/api"


export function GhiDeToChucTab() {
  const [orgs, setOrgs] = useState<PlatformOrganizationSummary[] | null>(null)
  const [orgId, setOrgId] = useState<string>("")
  const [entity, setEntity] = useState<FieldEntityKind>("ORDER")
  const [preview, setPreview] = useState<EffectiveFieldConfigView[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)

  const [fieldKey, setFieldKey] = useState("")
  const [overrideLabel, setOverrideLabel] = useState("")
  const [overrideRequirement, setOverrideRequirement] = useState<FieldRequirementLevel | "">("")
  const [overrideVisibility, setOverrideVisibility] = useState<Record<FieldAudience, boolean>>({
    INTERNAL: true,
    PARTNER: false,
    SHIPPER: false,
    CUSTOMER: false,
  })

  const [catalogKey, setCatalogKey] = useState("")
  const [catalogCode, setCatalogCode] = useState("")
  const [catalogLabel, setCatalogLabel] = useState("")
  const [catalogEnabled, setCatalogEnabled] = useState(true)

  useEffect(() => {
    void (async () => {
      const res = await fieldPlatformApi.listOrganizations()
      if (res.ok) setOrgs(res.data)
    })()
  }, [])

  async function loadPreview() {
    if (!orgId) {
      setPreview(null)
      return
    }
    const res = await fieldPlatformApi.previewOrgConfig(orgId, entity)
    if (!res.ok) {
      setLoi(res.error)
      return
    }
    setLoi(null)
    setPreview(res.data)
  }

  useEffect(() => {
    void (async () => {
      await loadPreview()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, entity])

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-body-sm">
            <span className="mb-1 block text-text-muted">Tổ chức</span>
            <NativeSelect
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <option value="">— chọn tổ chức —</option>
              {orgs?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.slug})
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="text-body-sm">
            <span className="mb-1 block text-text-muted">Thực thể xem trước</span>
            <NativeSelect
              value={entity}
              onChange={(e) => setEntity(e.target.value as FieldEntityKind)}
            >
              <option value="ORDER">Đơn điều phối</option>
              <option value="PARTNER">Đối tác</option>
            </NativeSelect>
          </label>
        </div>
      </Card>

      {!orgId && <p className="text-body-sm text-text-muted">Chọn một tổ chức để xem cấu hình hiệu lực và ghi đè.</p>}

      {orgId && (
        <>
          <Card className="p-4">
            <p className="mb-2 text-body-sm font-semibold">Ghi đè một trường cho tổ chức này</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-body-sm">
                <span className="mb-1 block text-text-muted">Khoá trường</span>
                <Input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} placeholder="vd. cardMessage" />
              </label>
              <label className="text-body-sm">
                <span className="mb-1 block text-text-muted">Nhãn riêng (để trống nếu không đổi nhãn)</span>
                <Input value={overrideLabel} onChange={(e) => setOverrideLabel(e.target.value)} />
              </label>
              <label className="text-body-sm">
                <span className="mb-1 block text-text-muted">Mức yêu cầu riêng (để trống nếu giữ mặc định)</span>
                <NativeSelect
                  value={overrideRequirement}
                  onChange={(e) => setOverrideRequirement(e.target.value as FieldRequirementLevel | "")}
                >
                  <option value="">(giữ mặc định)</option>
                  {REQUIREMENT_LEVELS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <div className="text-body-sm">
                <span className="mb-1 block text-text-muted">Hiển thị riêng cho tổ chức này</span>
                <div className="flex flex-wrap gap-3">
                  {ALL_AUDIENCES.map((a) => (
                    <label key={a} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={Boolean(overrideVisibility[a])}
                        onCheckedChange={(checked) => setOverrideVisibility({ ...overrideVisibility, [a]: Boolean(checked) })}
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <DiffConfirmButton
                label="Ghi đè cho tổ chức này"
                confirmLabel="Xác nhận ghi đè"
                disabled={fieldKey.trim().length === 0}
                buildDiff={() => [
                  { label: "Trường", from: "—", to: fieldKey },
                  ...(overrideLabel ? [{ label: "Nhãn riêng", from: "—", to: overrideLabel }] : []),
                  ...(overrideRequirement ? [{ label: "Mức yêu cầu riêng", from: "—", to: overrideRequirement }] : []),
                  { label: "Hiển thị riêng", from: "—", to: ALL_AUDIENCES.filter((a) => overrideVisibility[a]).join(", ") || "(không hiện đâu)" },
                ]}
                onConfirm={async () => {
                  const res = await fieldPlatformApi.setFieldOverride(orgId, {
                    fieldKey,
                    label: overrideLabel || undefined,
                    requirement: overrideRequirement || undefined,
                    visibility: overrideVisibility,
                  })
                  if (!res.ok) return { ok: false, error: res.error }
                  setFieldKey("")
                  setOverrideLabel("")
                  setOverrideRequirement("")
                  await loadPreview()
                  return { ok: true }
                }}
              />
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-body-sm font-semibold">Ghi đè một giá trị danh mục cho tổ chức này</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-body-sm">
                <span className="mb-1 block text-text-muted">Khoá danh mục</span>
                <Input value={catalogKey} onChange={(e) => setCatalogKey(e.target.value)} placeholder="vd. serviceLevel" />
              </label>
              <label className="text-body-sm">
                <span className="mb-1 block text-text-muted">Mã giá trị</span>
                <Input value={catalogCode} onChange={(e) => setCatalogCode(e.target.value)} placeholder="vd. EXPRESS_2H" />
              </label>
              <label className="text-body-sm">
                <span className="mb-1 block text-text-muted">Nhãn riêng (tuỳ chọn)</span>
                <Input value={catalogLabel} onChange={(e) => setCatalogLabel(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-body-sm cursor-pointer">
                <Checkbox checked={catalogEnabled} onCheckedChange={(checked) => setCatalogEnabled(Boolean(checked))} />
                Bật cho tổ chức này (tắt = ẩn giá trị này chỉ với tổ chức này)
              </label>
            </div>
            <div className="mt-3">
              <DiffConfirmButton
                label="Ghi đè giá trị danh mục"
                confirmLabel="Xác nhận ghi đè"
                disabled={catalogKey.trim().length === 0 || catalogCode.trim().length === 0}
                buildDiff={() => [
                  { label: "Danh mục", from: "—", to: catalogKey },
                  { label: "Mã giá trị", from: "—", to: catalogCode },
                  { label: "Bật cho tổ chức", from: "—", to: catalogEnabled ? "Có" : "Không" },
                  ...(catalogLabel ? [{ label: "Nhãn riêng", from: "—", to: catalogLabel }] : []),
                ]}
                onConfirm={async () => {
                  const res = await fieldPlatformApi.setCatalogValueOverride(orgId, {
                    catalogKey,
                    code: catalogCode,
                    label: catalogLabel || undefined,
                    isEnabled: catalogEnabled,
                  })
                  if (!res.ok) return { ok: false, error: res.error }
                  setCatalogKey("")
                  setCatalogCode("")
                  setCatalogLabel("")
                  return { ok: true }
                }}
              />
            </div>
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="border-b border-border p-3 text-body-sm font-semibold">
              Xem trước — tổ chức này sẽ thấy gì (sau khi cộng ghi đè)
            </div>
            {loi && <p className="p-3 text-body-sm text-danger">{loi}</p>}
            {!loi && !preview && <SkeletonBlock lines={2} />}
            {!loi && preview && (
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="py-2 pl-3 pr-3">Khoá</th>
                    <th className="py-2 pr-3">Nhãn hiệu lực</th>
                    <th className="py-2 pr-3">Mức yêu cầu</th>
                    <th className="py-2 pr-3">Hiển thị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((p) => (
                    <tr key={p.key}>
                      <td className="py-1.5 pl-3 pr-3 font-mono text-meta">{p.key}</td>
                      <td className="py-1.5 pr-3">{p.label}</td>
                      <td className="py-1.5 pr-3">
                        <Badge tone={p.requirement === "REQUIRED" ? "warning" : "neutral"}>{p.requirement}</Badge>
                      </td>
                      <td className="py-1.5 pr-3 text-text-muted">
                        {ALL_AUDIENCES.filter((a) => p.visibility[a]).join(", ") || "(không hiện đâu)"}
                      </td>
                    </tr>
                  ))}
                  {preview.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-text-muted">
                        Chưa có trường nào cho thực thể này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
