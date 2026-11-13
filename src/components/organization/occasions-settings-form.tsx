"use client"

/**
 * occasions-settings-form.tsx — Quản lý danh mục "Dịp lễ" của tổ chức, mỗi
 * dịp mang một TÔNG GIỌNG (nợ #104, "giọng theo dịp" — Tony chốt xây đầy đủ
 * qua AskUserQuestion 17/09). Tông giọng ảnh hưởng kịch bản Zalo sinh ra ở
 * M01c (`generateZaloPitchScript()`, `sales-pitch-template.ts`) khi dịp đầu
 * tiên của một lượt chào hàng khớp CHÍNH XÁC tên dịp ở đây.
 *
 * Tự nạp dữ liệu riêng (không qua `useTenantProfile()`) vì đây là một DANH
 * SÁCH nhiều dòng, không phải hồ sơ đơn như business/brand profile.
 */

import React, { useEffect, useState } from "react"
import { CalendarHeart } from "@/components/ui/icon-set/calendar-heart"
import { Plus } from "@/components/ui/icon-set/plus"
import { Check } from "@/components/ui/icon-set/check"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Power } from "@/components/ui/icon-set/power"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { OCCASION_REGISTER_LABELS, type OccasionRegisterValue } from "@/modules/organization/domain/occasion-rules"
import { errorText } from "@/lib/error-text"

import { snakeKeys } from "@/lib/case-keys"
interface OccasionRow {
  id: string
  code: string
  name: string
  sort_order: number
  is_active: boolean
  register: OccasionRegisterValue
}

const REGISTER_BADGE_CLASS: Record<OccasionRegisterValue, string> = {
  FESTIVE: "bg-warning/10 text-warning-text border-warning/30",
  NEUTRAL: "bg-surface-alt text-text-muted border-border",
  SOLEMN: "bg-primary/10 text-primary border-primary/30",
}

export function OccasionsSettingsForm() {
  const [occasions, setOccasions] = useState<OccasionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [newName, setNewName] = useState("")
  const [newCode, setNewCode] = useState("")
  const [newRegister, setNewRegister] = useState<OccasionRegisterValue>("FESTIVE")

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/occasions")
      if (!res.ok) throw new Error(`Không tải được danh mục dịp (${res.status})`)
      const json = await res.json()
      setOccasions(json.data ?? [])
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi tải danh mục dịp")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    load()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newCode.trim()) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch("/api/v1/occasions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snakeKeys({ code: newCode, name: newName, register: newRegister, sortOrder: occasions.length + 1 })),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error?.message || `Thêm dịp thất bại (${res.status})`)
      }
      setNewName("")
      setNewCode("")
      setNewRegister("FESTIVE")
      setSuccessMessage("Đã thêm dịp mới thành công!")
      await load()
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi khi thêm dịp")
    } finally {
      setSaving(false)
    }
  }

  const patchOccasion = async (id: string, patch: Partial<{ name: string; register: OccasionRegisterValue; isActive: boolean }>) => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch(`/api/v1/occasions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snakeKeys(patch)),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error?.message || `Cập nhật dịp thất bại (${res.status})`)
      }
      await load()
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi khi cập nhật dịp")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-success/30 bg-success/10 p-4 text-body-sm font-medium text-success shadow-xs">
          <CheckCircle2 size={18} className="text-success flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-body-sm font-medium text-danger-text shadow-xs">
          <AlertCircle size={18} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Khối 1: Thêm dịp mới */}
      <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarHeart size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">Thêm dịp mới</h3>
            <p className="text-caption text-text-muted">Mỗi dịp mang một tông giọng — dùng để chỉnh kịch bản Zalo tự động</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.4fr_1.4fr_auto] gap-3">
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên dịp (VD: Ngày Nhà giáo)"
            className="text-body-sm"
          />
          <Input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Mã (VD: teacher_day)"
            className="text-body-sm"
          />
          <NativeSelect
            aria-label="Giọng điệu của dịp mới"
            value={newRegister}
            onChange={(e) => setNewRegister(e.target.value as OccasionRegisterValue)}
            className="text-body-sm"
          >
            {Object.entries(OCCASION_REGISTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </NativeSelect>
          <Button
            type="submit"
            disabled={saving || !newName.trim() || !newCode.trim()}
            className="gap-1.5"
          >
            <Plus size={15} />
            <span>Thêm</span>
          </Button>
        </div>
      </form>

      {/* Khối 2: Danh sách dịp hiện có */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <h3 className="text-body-sm font-bold text-text pb-4 border-b border-border mb-4">Danh mục dịp của cửa hàng</h3>

        {loading ? (
          <div className="py-4"><SkeletonBlock lines={3} /></div>
        ) : occasions.length === 0 ? (
          <p className="text-caption text-text-muted italic text-center py-6">Chưa có dịp nào — thêm dịp đầu tiên ở trên</p>
        ) : (
          <div className="space-y-2.5">
            {occasions.map((o) => (
              <div
                key={o.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-xl border border-border p-3 ${o.is_active ? "bg-surface" : "bg-surface-alt opacity-60"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-semibold text-text truncate">{o.name}</p>
                  <p className="text-caption text-text-muted">Mã: {o.code}</p>
                </div>

                <NativeSelect
                  aria-label={`Giọng điệu — ${o.name}`}
                  value={o.register}
                  onChange={(e) => patchOccasion(o.id, { register: e.target.value as OccasionRegisterValue })}
                  disabled={saving}
                  className={`w-auto text-caption font-semibold ${REGISTER_BADGE_CLASS[o.register]}`}
                >
                  {Object.entries(OCCASION_REGISTER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </NativeSelect>

                <Button
                  type="button"
                  variant={o.is_active ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => patchOccasion(o.id, { isActive: !o.is_active })}
                  disabled={saving}
                  title={o.is_active ? "Tắt dịp này" : "Bật lại dịp này"}
                  className="gap-1.5 text-caption font-semibold flex-shrink-0"
                >
                  <Power size={13} />
                  <span>{o.is_active ? "Đang bật" : "Đã tắt"}</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 text-caption text-text-muted px-1">
        <Check size={14} className="mt-0.5 flex-shrink-0 text-primary" />
        <span>
          Dịp ở tông <strong>&quot;Trang trọng, chia buồn&quot;</strong> sẽ tự động bớt biểu tượng cảm xúc ăn mừng trong
          kịch bản Zalo khi đúng dịp đó được chọn cho một lượt chào hàng.
        </span>
      </p>
    </div>
  )
}
