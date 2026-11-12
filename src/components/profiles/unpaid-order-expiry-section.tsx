"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  parseUnpaidExpiryPolicy,
  STOCK_HOLD_MAX_HOURS,
  UNPAID_EXPIRY_MAX_HOURS,
  UNPAID_EXPIRY_MIN_HOURS,
  UNPAID_EXPIRY_SETTINGS_KEY,
  type UnpaidExpiryPolicy,
} from "@/modules/orders/domain/unpaid-order-expiry"

/**
 * Tự huỷ đơn chưa thanh toán của catalog / trang bán hàng (audit hành trình O10, gói UJ-12). Mặc định tắt;
 * đơn nhân viên nhập tay và đơn từ báo giá không bị tự huỷ. Đơn Thẻ chào theo chính sách thanh toán ở trên.
 * Đơn có sản phẩm theo dõi tồn (đang giữ hàng) có công tắc riêng, mặc định bật, 2 giờ (PO 12/11/2026, audit BL-26).
 */
export function UnpaidOrderExpirySection() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<UnpaidExpiryPolicy | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const policy = draft ?? (org.data ? parseUnpaidExpiryPolicy(org.data.settings) : null)
  if (!policy) return null

  const edit = (patch: Partial<UnpaidExpiryPolicy>) => {
    setDraft({ ...policy, ...patch })
    setMessage(null)
  }

  async function save() {
    if (!policy) return
    setSaving(true)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [UNPAID_EXPIRY_SETTINGS_KEY]: policy } }, "Không lưu được cài đặt tự huỷ đơn")
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: "Đã lưu cài đặt tự huỷ đơn chưa thanh toán." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được cài đặt tự huỷ đơn" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-body font-bold text-text">Tự huỷ đơn chưa thanh toán (catalog, trang bán hàng)</h3>
          <p className="text-caption text-text-muted">
            Khách đặt qua link công khai mà chưa chuyển khoản sau số giờ dưới đây thì đơn tự huỷ, hàng giữ chỗ được trả lại và
            khách được đưa vào danh sách cần gọi lại. Đơn nhập tay và đơn từ báo giá không bị tự huỷ.
          </p>
        </div>
        <Switch checked={policy.enabled} onCheckedChange={(v) => edit({ enabled: v })} disabled={saving} aria-label="Bật tự huỷ đơn chưa thanh toán" />
      </div>
      {policy.enabled && (
        <label className="flex items-center gap-2 text-body-sm text-text">
          <span>Huỷ sau</span>
          <Input
            type="number"
            min={UNPAID_EXPIRY_MIN_HOURS}
            max={UNPAID_EXPIRY_MAX_HOURS}
            className="w-24"
            value={policy.hours}
            onChange={(e) => edit({ hours: Number(e.target.value) || UNPAID_EXPIRY_MIN_HOURS })}
            disabled={saving}
          />
          <span>giờ kể từ lúc khách đặt</span>
        </label>
      )}
      <div className="flex items-start justify-between gap-3 border-t border-border/60 pt-3">
        <div>
          <h4 className="text-body-sm font-bold text-text">Đơn đang giữ hàng (sản phẩm theo dõi tồn)</h4>
          <p className="text-caption text-text-muted">
            Đơn có sản phẩm đang trừ tồn mà chưa thanh toán thì huỷ sớm để trả hàng cho khách khác. Đơn đã có chuyển khoản
            đúng số tiền nhưng chưa khớp mã không bị huỷ.
          </p>
        </div>
        <Switch checked={policy.stockHoldEnabled} onCheckedChange={(v) => edit({ stockHoldEnabled: v })} disabled={saving} aria-label="Bật tự huỷ đơn đang giữ hàng" />
      </div>
      {policy.stockHoldEnabled && (
        <label className="flex items-center gap-2 text-body-sm text-text">
          <span>Huỷ sau</span>
          <Input
            type="number"
            min={UNPAID_EXPIRY_MIN_HOURS}
            max={STOCK_HOLD_MAX_HOURS}
            className="w-24"
            value={policy.stockHoldHours}
            onChange={(e) => edit({ stockHoldHours: Number(e.target.value) || UNPAID_EXPIRY_MIN_HOURS })}
            disabled={saving}
          />
          <span>giờ kể từ lúc khách đặt</span>
        </label>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <p role="status" className={`text-caption ${message ? (message.ok ? "text-success" : "text-danger") : "text-text-muted"}`}>
          {message?.text ??
            `${policy.enabled ? `Đơn thường: huỷ sau ${policy.hours} giờ.` : "Đơn thường: không tự huỷ."} ${policy.stockHoldEnabled ? `Đơn giữ hàng: huỷ sau ${policy.stockHoldHours} giờ.` : "Đơn giữ hàng: không tự huỷ."}`}
        </p>
        <Button type="button" size="sm" variant="secondary" disabled={saving || !draft} onClick={() => void save()}>
          Lưu
        </Button>
      </div>
    </section>
  )
}
