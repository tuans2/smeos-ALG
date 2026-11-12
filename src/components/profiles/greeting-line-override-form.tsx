"use client"

/**
 * greeting-line-override-form.tsx — UI cài đặt cho tenant tự nhập câu chào mở
 * đầu kịch bản Zalo (nợ #99/#105, "ghi đè template theo tenant" — lát cắt đầu
 * tiên đúng một field: họ ST, template `sales_pitch_zalo`, field
 * `greeting_line`). Trước bản này chỉ có API (`GET,PUT,DELETE
 * /api/v1/template-overrides`), chưa có nơi để tenant tự nhập — xem
 * `TECHNICAL_DEBT.md` nợ #105.
 *
 * CỐ TÌNH tự nạp/tự lưu riêng qua `template-overrides` API (giống
 * `OccasionsSettingsForm`), KHÔNG đi qua `useTenantProfile()`/`saveBrand()`
 * (ghi vào `brand_profiles`) — đúng quyết định kiến trúc đã chốt cho nợ #99:
 * ghi đè template là bảng riêng `template_overrides`, không mở rộng
 * `brand_profiles`. Trộn chung đường lưu sẽ lặp lại đúng việc phải quay đầu
 * đã xảy ra một lần với quyết định nơi lưu trữ.
 *
 * Value rỗng không PUT được (domain layer từ chối — value rỗng nghĩa là "xoá
 * ghi đè", không phải "ghi đè bằng chuỗi rỗng"), nên nút "Xoá, dùng mặc định
 * hệ thống" gọi DELETE riêng, không phải PUT với value rỗng.
 */

import React, { useEffect, useState } from "react"
import { MessageSquareText } from "@/components/ui/icon-set/message-square-text"
import { Check } from "@/components/ui/icon-set/check"
import { X } from "@/components/ui/icon-set/x"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { errorText } from "@/lib/error-text"

import { snakeKeys } from "@/lib/case-keys"
const TEMPLATE_FAMILY = "ST"
const TEMPLATE_KEY = "sales_pitch_zalo"
const FIELD_KEY = "greeting_line"
const MAX_LENGTH = 200

export function GreetingLineOverrideForm() {
  const [value, setValue] = useState("")
  const [hasOverride, setHasOverride] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/template-overrides?template_key=${TEMPLATE_KEY}`)
      if (!res.ok) throw new Error(`Không tải được câu chào tuỳ chỉnh (${res.status})`)
      const json = await res.json()
      const rows = (json.data ?? []) as Array<{ field_key: string; value: string }>
      const row = rows.find((r) => r.field_key === FIELD_KEY)
      setValue(row?.value ?? "")
      setHasOverride(Boolean(row))
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi tải câu chào tuỳ chỉnh")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch("/api/v1/template-overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snakeKeys({
          templateFamily: TEMPLATE_FAMILY,
          templateKey: TEMPLATE_KEY,
          fieldKey: FIELD_KEY,
          value: trimmed,
        })),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error?.message || `Lưu câu chào thất bại (${res.status})`)
      }
      setValue(trimmed)
      setHasOverride(true)
      setSuccessMessage("Đã lưu câu chào tuỳ chỉnh!")
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi khi lưu câu chào")
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch(`/api/v1/template-overrides/${TEMPLATE_KEY}/${FIELD_KEY}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error?.message || `Xoá câu chào thất bại (${res.status})`)
      }
      setValue("")
      setHasOverride(false)
      setSuccessMessage("Đã xoá — kịch bản Zalo trở về mặc định hệ thống (không có dòng chào riêng).")
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi khi xoá câu chào")
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

      <form onSubmit={handleSave} className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareText size={18} />
          </div>
          <div>
            <h3 className="text-body-sm font-bold text-text">Câu chào mở đầu kịch bản Zalo</h3>
            <p className="text-caption text-text-muted">
              Tuỳ chọn — thêm một câu chào riêng của cửa hàng vào đầu mỗi kịch bản tư vấn Zalo tự động (trước
              dòng &quot;[THÔNG TIN SẢN PHẨM]&quot;). Để trống thì dùng mặc định hệ thống, không có dòng chào riêng.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-4"><SkeletonBlock lines={2} /></div>
        ) : (
          <>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={MAX_LENGTH}
              rows={2}
              placeholder="VD: Chào mừng quý khách đến với SiiN Store! 🌸"
              className="resize-none text-body-sm"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-caption text-text-muted">{value.length}/{MAX_LENGTH} ký tự</span>
              <div className="flex items-center gap-2">
                {hasOverride && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    disabled={saving}
                    className="flex items-center gap-1.5"
                  >
                    <X size={14} />
                    <span>Xoá, dùng mặc định</span>
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={saving || !value.trim()}
                  className="flex items-center gap-1.5"
                >
                  <Check size={15} />
                  <span>{saving ? "Đang lưu..." : "Lưu câu chào"}</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
