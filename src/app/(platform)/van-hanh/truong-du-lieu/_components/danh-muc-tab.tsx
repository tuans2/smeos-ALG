"use client"

// Tab "Danh mục" — ba loại quản trị theo Đặc tả trường §16.2: MỞ (thêm tự
// do), CÓ HÀNH VI (giá trị mới phải chọn một hành vi có thật trong code),
// ĐÓNG (không thêm/xoá, chỉ Console phần "Trường lõi"/ghi đè mới sửa nhãn
// được — form này chỉ có tác vụ THÊM giá trị mới nên tự khoá cho ĐÓNG).

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DiffConfirmButton } from "./diff-confirm"
import { fieldPlatformApi, type CatalogApiView } from "../_lib/api"
import { SkeletonBlock } from "@/components/ui/skeleton"

function governanceTone(g: CatalogApiView["governance"]): "success" | "warning" | "neutral" {
  if (g === "OPEN") return "success"
  if (g === "BEHAVIOR") return "warning"
  return "neutral"
}

function ThemGiaTriForm({ catalog, onDone }: { catalog: CatalogApiView; onDone: () => Promise<void> }) {
  const [code, setCode] = useState("")
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [behavior, setBehavior] = useState("")
  const [behaviorCodes, setBehaviorCodes] = useState<string[] | null>(null)

  useEffect(() => {
    if (catalog.governance !== "BEHAVIOR" || !catalog.behaviorKind) return
    void (async () => {
      const res = await fieldPlatformApi.listBehaviorCodes(catalog.behaviorKind as string)
      if (res.ok) setBehaviorCodes(res.data.codes)
    })()
  }, [catalog.governance, catalog.behaviorKind])

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-dashed border-border p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-body-sm">
          <span className="mb-1 block text-text-muted">Mã (không đổi được sau khi tạo)</span>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="vd. EXPRESS_2H" />
        </label>
        <label className="text-body-sm sm:col-span-2">
          <span className="mb-1 block text-text-muted">Nhãn</span>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="vd. Giao nhanh 2 giờ" />
        </label>
        <label className="text-body-sm sm:col-span-3">
          <span className="mb-1 block text-text-muted">Mô tả</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {catalog.governance === "BEHAVIOR" && (
          <label className="text-body-sm sm:col-span-3">
            <span className="mb-1 block text-text-muted">
              Hành vi có sẵn trong code (nhóm <code>{catalog.behaviorKind}</code>) — bắt buộc
            </span>
            {behaviorCodes ? (
              <NativeSelect
                value={behavior}
                onChange={(e) => setBehavior(e.target.value)}
              >
                <option value="">— chọn —</option>
                {behaviorCodes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <Input value={behavior} onChange={(e) => setBehavior(e.target.value)} placeholder="đang tải gợi ý…" />
            )}
          </label>
        )}
      </div>
      <DiffConfirmButton
        label="Thêm giá trị"
        confirmLabel="Xác nhận thêm"
        disabled={code.trim().length === 0 || label.trim().length === 0 || (catalog.governance === "BEHAVIOR" && !behavior)}
        buildDiff={() => [
          { label: "Mã", from: "—", to: code || "(chưa nhập)" },
          { label: "Nhãn", from: "—", to: label || "(chưa nhập)" },
          ...(catalog.governance === "BEHAVIOR" ? [{ label: "Hành vi", from: "—", to: behavior || "(chưa chọn)" }] : []),
        ]}
        onConfirm={async () => {
          const res = await fieldPlatformApi.addCatalogValue(catalog.key, {
            code,
            label,
            description: description || undefined,
            behavior: catalog.governance === "BEHAVIOR" ? behavior : undefined,
          })
          if (!res.ok) return { ok: false, error: res.error }
          setCode("")
          setLabel("")
          setDescription("")
          setBehavior("")
          await onDone()
          return { ok: true }
        }}
      />
    </div>
  )
}

export function DanhMucTab() {
  const [catalogs, setCatalogs] = useState<CatalogApiView[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)

  async function reload() {
    const res = await fieldPlatformApi.listCatalogs()
    if (!res.ok) {
      setLoi(res.error)
      return
    }
    setLoi(null)
    setCatalogs(res.data)
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
  }, [])

  if (loi) return <p className="text-body-sm text-danger">{loi}</p>
  if (!catalogs) return <SkeletonBlock lines={2} />

  return (
    <div className="space-y-3">
      {catalogs.map((c) => (
        <Card key={c.key} className="p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="font-mono text-meta text-text-muted">{c.key}</p>
            <p className="font-semibold">{c.label}</p>
            <Badge tone={governanceTone(c.governance)}>{c.governance}</Badge>
            {c.behaviorKind && <span className="text-meta text-text-muted">nhóm hành vi: {c.behaviorKind}</span>}
            <span className="ml-auto text-meta text-text-muted">{c.values.length} giá trị</span>
          </div>

          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="py-1.5 pr-3">Mã</th>
                <th className="py-1.5 pr-3">Nhãn</th>
                <th className="py-1.5 pr-3">Hành vi</th>
                <th className="py-1.5 pr-3">Thứ tự</th>
                <th className="py-1.5 pr-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {c.values.map((v) => (
                <tr key={v.id}>
                  <td className="py-1.5 pr-3 font-mono text-meta">{v.code}</td>
                  <td className="py-1.5 pr-3">{v.label}</td>
                  <td className="py-1.5 pr-3 text-text-muted">{v.behavior ?? "—"}</td>
                  <td className="py-1.5 pr-3 text-text-muted">{v.sortOrder}</td>
                  <td className="py-1.5 pr-3">
                    <Badge tone={v.isActive ? "success" : "neutral"}>{v.isActive ? "Bật" : "Tắt"}</Badge>
                  </td>
                </tr>
              ))}
              {c.values.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2 text-center text-text-muted">
                    Chưa có giá trị.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {c.governance === "CLOSED" ? (
            <p className="mt-2 text-meta text-text-muted">
              Danh mục ĐÓNG — logic mã nguồn phụ thuộc giá trị này, không thêm/xoá được ở đây.
            </p>
          ) : (
            <div className="mt-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setOpenKey(openKey === c.key ? null : c.key)}>
                {openKey === c.key ? "Đóng form" : "+ Thêm giá trị"}
              </Button>
              {openKey === c.key && <ThemGiaTriForm catalog={c} onDone={reload} />}
            </div>
          )}
        </Card>
      ))}
      {catalogs.length === 0 && <p className="text-body-sm text-text-muted">Chưa có danh mục nào.</p>}
    </div>
  )
}
