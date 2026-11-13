"use client"

// Cấu hình nền tảng — bật giao diện chuẩn mới theo tổ chức (03c E9, cờ `ux_rollout_flags`).
// Đọc: phiên nền tảng · Ghi: `N12`, có nhật ký kiểm toán. Xem đặc tả 06.

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import type { UxRolloutFlagKey, UxRolloutFlags, UxRolloutMode } from "@/modules/platform/domain/ux-rollout-flags"
import { PageHeader } from "@/components/ui/page-header"

const FLAG_LABEL: Record<UxRolloutFlagKey, string> = {
  ux_pd_anh_san_pham: "Tạo ảnh sản phẩm chuyên nghiệp",
  ux_pd_bo_anh_san_pham: "Tạo bộ ảnh sản phẩm",
  ux_pd_poster_banner: "Poster và banner",
  ux_pd_the_chao_san_pham: "Thẻ chào sản phẩm",
  ux_pd_noi_dung: "Nội dung bán hàng",
  ux_pd_catalog_nhu_cau: "Catalog bán hàng theo nhu cầu",
  ux_pd_market_intelligence: "Xu hướng thị trường",
  ux_pd_cai_dat: "Cài đặt, thành viên, kết nối",
}

const MODE_LABEL: Record<UxRolloutMode, string> = {
  off: "Tắt — dùng giao diện cũ",
  allowlist: "Chỉ các tổ chức được chọn",
  all: "Bật cho mọi tổ chức",
}

type Org = { id: string; name: string; slug: string }

export default function CauHinhNenTangPage() {
  const [keys, setKeys] = useState<UxRolloutFlagKey[] | null>(null)
  const [flags, setFlags] = useState<UxRolloutFlags | null>(null)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirm, confirmDialog] = useConfirmDialog()

  useEffect(() => {
    void (async () => {
      const [fRes, oRes] = await Promise.all([
        fetch("/api/v1/platform/ux-rollout-flags", { cache: "no-store" }),
        fetch("/api/v1/platform/organizations", { cache: "no-store" }),
      ])
      if (!fRes.ok) {
        setLoadError("Không tải được cấu hình giao diện mới.")
        return
      }
      const fBody = (await fRes.json()) as { data: { keys: UxRolloutFlagKey[]; flags: UxRolloutFlags } }
      setKeys(fBody.data.keys)
      setFlags(fBody.data.flags)
      if (oRes.ok) {
        const oBody = (await oRes.json()) as { data: Org[] }
        setOrgs(oBody.data.map((o) => ({ id: o.id, name: o.name, slug: o.slug })))
      }
    })()
  }, [])

  if (loadError) return <InlineError message={loadError} />
  if (!keys || !flags) return <div className="py-4"><SkeletonBlock lines={4} /></div>

  function setMode(key: UxRolloutFlagKey, mode: UxRolloutMode) {
    setSavedAt(null)
    setFlags((prev) => (prev ? { ...prev, [key]: { ...prev[key], mode } } : prev))
  }

  function toggleOrg(key: UxRolloutFlagKey, orgId: string) {
    setSavedAt(null)
    setFlags((prev) => {
      if (!prev) return prev
      const ids = prev[key].organizationIds
      const next = ids.includes(orgId) ? ids.filter((id) => id !== orgId) : [...ids, orgId]
      return { ...prev, [key]: { ...prev[key], organizationIds: next } }
    })
  }

  async function save() {
    if (!flags || saving) return
    const forAll = (keys ?? []).filter((k) => flags[k].mode === "all").map((k) => FLAG_LABEL[k])
    if (forAll.length > 0) {
      const ok = await confirm({
        title: "Bật giao diện mới cho mọi tổ chức?",
        consequence: `Mọi cửa hàng sẽ thấy giao diện mới của: ${forAll.join(", ")}. Có thể tắt lại, hiệu lực trong khoảng 30 giây.`,
        confirmLabel: "Bật cho mọi tổ chức",
      })
      if (!ok) return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch("/api/v1/platform/ux-rollout-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flags }),
      })
      if (!res.ok) {
        setSaveError(res.status === 403 ? "Bạn chưa có quyền đổi cấu hình nền tảng." : "Chưa lưu được. Hãy thử lại.")
        return
      }
      const body = (await res.json()) as { data: { flags: UxRolloutFlags } }
      setFlags(body.data.flags)
      setSavedAt(new Date().toLocaleTimeString("vi-VN"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        className="px-4 pt-2 sm:px-0"
        title="Cấu hình nền tảng"
        tip="Bật giao diện chuẩn mới cho từng công cụ, theo từng tổ chức. Tắt có hiệu lực trong khoảng 30 giây."
        actions={
          <span className="rounded bg-surface-alt px-2 py-0.5 text-caption text-text-muted">Phạm vi: Toàn hệ thống</span>
        }
      />

      {keys.map((key) => {
        const rule = flags[key]
        const selectId = `mode-${key}`
        return (
          <Card key={key} className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor={selectId} className="text-body font-semibold text-text">
                {FLAG_LABEL[key]}
              </label>
              <NativeSelect
                id={selectId}
                value={rule.mode}
                onChange={(e) => setMode(key, e.target.value as UxRolloutMode)}
                className="w-auto"
              >
                {(Object.keys(MODE_LABEL) as UxRolloutMode[]).map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {rule.mode === "allowlist" && (
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1 text-body-sm text-text-muted">
                  Tổ chức dùng thử ({rule.organizationIds.length} đã chọn)
                </legend>
                {orgs.length === 0 && <p className="text-body-sm text-text-muted">Chưa tải được danh sách tổ chức.</p>}
                <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                  {orgs.map((o) => (
                    <label key={o.id} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-body-sm text-text hover:bg-surface-alt cursor-pointer">
                      <Checkbox
                        checked={rule.organizationIds.includes(o.id)}
                        onCheckedChange={() => toggleOrg(key, o.id)}
                      />
                      <span>
                        {o.name} <span className="text-meta text-text-muted">· {o.slug}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </Card>
        )
      })}

      {saveError && <InlineError message={saveError} />}
      <div className="flex items-center justify-end gap-3">
        {savedAt && (
          <p role="status" className="text-body-sm text-success-text">
            Đã lưu lúc {savedAt}
          </p>
        )}
        <Button onClick={() => void save()} disabled={saving} aria-busy={saving || undefined}>
          {saving ? "Đang lưu…" : "Lưu cấu hình"}
        </Button>
      </div>
      {confirmDialog}
    </div>
  )
}
