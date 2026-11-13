"use client"

import React, { useState, useEffect } from "react"
import { Bell } from "@/components/ui/icon-set/bell"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Save } from "@/components/ui/icon-set/save"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Info } from "@/components/ui/icon-set/info"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  DispatchReminderPolicyConfig,
  TemplateReminderOverrides,
} from "@/modules/coordinator/domain/dispatch-reminder-types"
import { OVERRIDE_META } from "./product-reminder-override-meta"

interface ProductReminderOverrideCardProps {
  productId: string
  canEdit: boolean
}

export function ProductReminderOverrideCard({
  productId,
  canEdit,
}: ProductReminderOverrideCardProps) {
  const [policyConfig, setPolicyConfig] = useState<DispatchReminderPolicyConfig | null>(null)
  const [overrides, setOverrides] = useState<TemplateReminderOverrides>({})
  const [localValues, setLocalValues] = useState<Record<string, number>>({})
  const [enabledKeys, setEnabledKeys] = useState<Set<keyof TemplateReminderOverrides>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải cấu hình khi mount/đổi sản phẩm
    setIsLoading(true)
    Promise.all([
      fetch("/api/v1/coordinator/settings/reminders").then((r) => r.json()),
      fetch(`/api/v1/coordinator/templates/${productId}/reminders`).then((r) => r.json()),
    ])
      .then(([policyData, templateData]: [{ config?: DispatchReminderPolicyConfig }, { overrides?: TemplateReminderOverrides }]) => {
        const policy = policyData.config ?? {
          m0MinutesAfterPaid: 10,
          m1MinutesBeforeDelivery: 120,
          m2MinutesBeforeDelivery: 60,
          m3MinutesAfterShipperAssigned: 20,
          m5MinutesAfterDelivery: 30,
        }
        setPolicyConfig(policy)

        const savedOverrides = templateData.overrides ?? {}
        setOverrides(savedOverrides)

        // Khởi tạo local values từ overrides (nếu có) hoặc policy default
        const initValues: Record<string, number> = {}
        const initEnabled = new Set<keyof TemplateReminderOverrides>()
        for (const m of OVERRIDE_META) {
          const savedVal = savedOverrides[m.key]
          if (savedVal !== undefined && savedVal !== null) {
            initValues[m.key] = savedVal
            initEnabled.add(m.key)
          } else {
            initValues[m.key] = policy[m.defaultKey]
          }
        }
        setLocalValues(initValues)
        setEnabledKeys(initEnabled)
      })
      .catch((err: Error) => {
        setErrorMessage(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [productId])

  const toggleKey = (key: keyof TemplateReminderOverrides) => {
    setEnabledKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
    setIsDirty(true)
    setSuccessMessage(null)
  }

  const handleChangeValue = (key: keyof TemplateReminderOverrides, value: number) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
    setSuccessMessage(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const payload: TemplateReminderOverrides = {}
    for (const key of enabledKeys) {
      const val = localValues[key]
      if (val !== undefined) {
        payload[key] = val
      }
    }

    try {
      const res = await fetch(`/api/v1/coordinator/templates/${productId}/reminders`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(errData.message || "Lưu cấu hình thất bại")
      }
      setOverrides(payload)
      setSuccessMessage("Đã lưu cấu hình riêng cho sản phẩm này!")
      setIsDirty(false)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetAll = () => {
    setEnabledKeys(new Set())
    if (policyConfig) {
      const resetValues: Record<string, number> = {}
      for (const m of OVERRIDE_META) {
        resetValues[m.key] = policyConfig[m.defaultKey]
      }
      setLocalValues(resetValues)
    }
    setIsDirty(true)
    setSuccessMessage(null)
  }

  const activeOverrideCount = enabledKeys.size

  return (
    <Card className="flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell size={16} />
          </div>
          <div>
            <div className="text-body-sm font-bold text-text">
              Cấu hình mốc nhắc riêng cho sản phẩm này
            </div>
            <div className="text-caption text-text-muted">
              {activeOverrideCount > 0
                ? `${activeOverrideCount} mốc đang ghi đè chính sách tiệm`
                : "Đang dùng chính sách mặc định của tiệm cho toàn bộ mốc"}
            </div>
          </div>
        </div>
        {canEdit && activeOverrideCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="h-7 px-2.5 text-caption gap-1 border-border text-text-muted hover:text-danger"
            title="Đặt lại toàn bộ về mặc định chính sách tiệm"
          >
            <RotateCcw size={12} />
            <span>Đặt lại mặc định</span>
          </Button>
        )}
      </div>

      {/* Hướng dẫn */}
      <div className="flex gap-2 p-2.5 rounded-lg bg-surface-alt/50 border border-border">
        <Info size={13} className="text-text-muted shrink-0 mt-0.5" />
        <p className="text-caption text-text-muted leading-relaxed">
          Bật cài đặt ghi đè (toggle) để đặt timeout riêng cho sản phẩm cầu kỳ cần nhiều thời gian hơn. Mốc không bật sẽ tự kế thừa từ chính sách toàn tiệm.
        </p>
      </div>

      {/* Thông báo */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-bg text-danger text-caption border border-danger/20">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success-bg text-success text-caption border border-success-border">
          <CheckCircle2 size={14} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Bảng cấu hình */}
      {isLoading ? (
        <div className="py-4 flex items-center justify-center gap-2 text-text-muted">
          <RefreshCw size={14} className="animate-spin motion-reduce:animate-none text-primary" />
          <span className="text-caption">Đang tải cấu hình...</span>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {OVERRIDE_META.map((m) => {
            const isEnabled = enabledKeys.has(m.key)
            const policyDefault = policyConfig ? policyConfig[m.defaultKey] : null
            const currentVal = localValues[m.key] ?? policyDefault ?? 0

            return (
              <div
                key={m.key}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 transition-colors ${
                  isEnabled ? "bg-primary/3" : "bg-surface"
                }`}
              >
                {/* Toggle bật/tắt ghi đè */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Button variant="ghost"
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`Bật/tắt ghi đè mốc ${m.label}`}
                    onClick={() => {
                      if (canEdit) toggleKey(m.key)
                    }}
                    className={`px-0 py-0 text-[length:inherit] font-[inherit] gap-0 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      isEnabled ? "bg-primary hover:bg-primary" : "bg-surface-alt hover:bg-surface-alt"
                    } ${!canEdit ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 translate-y-0 rounded-full bg-white shadow-sm transition-transform ${
                        isEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </Button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-body-sm font-medium text-text truncate">
                        {m.label}
                      </span>
                    </div>
                    {!isEnabled && policyDefault !== null && (
                      <span className="text-caption text-text-muted">
                        Mặc định tiệm: {policyDefault} {m.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Input giá trị (chỉ hiện khi bật) */}
                {isEnabled && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min={m.min}
                      max={m.max}
                      value={currentVal}
                      disabled={!canEdit || isSaving}
                      onChange={(e) => handleChangeValue(m.key, Number(e.target.value))}
                      aria-label={`Giá trị ghi đè mốc ${m.label}`}
                      className="w-20 text-center font-bold"
                    />
                    <span className="text-caption text-text-muted whitespace-nowrap">
                      {m.unit}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Nút lưu */}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || isSaving || isLoading}
            onClick={handleSave}
            className="h-8 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-caption gap-1.5"
          >
            <Save size={13} />
            {isSaving ? "Đang lưu..." : "Lưu cài đặt sản phẩm"}
          </Button>
        </div>
      )}
    </Card>
  )
}
