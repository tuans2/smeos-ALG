"use client"

import React, { useState } from "react"
import { Landmark } from "@/components/ui/icon-set/landmark"
import { Save } from "@/components/ui/icon-set/save"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { BROCHURE_PAYMENT_SETTINGS_KEY } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import {
  DEFAULT_PAYMENT_METHODS_CONFIG,
  parseStorePaymentMethods,
  serializeStorePaymentMethods,
  validateStorePaymentMethods,
  type StorePaymentMethodsConfig,
} from "@/modules/greeting-card/domain/store-payment-methods"
import {
  BankTransferSection,
  CodPaymentSection,
  InternationalCardSection,
  InStoreAndEWalletSection,
} from "./payment-method-sections"
import { ReconciliationSection } from "./reconciliation-section"

/**
 * Trình biên tập Cơ chế nhận thanh toán & Đối soát toàn diện cho Cửa hàng.
 * Quản lý đa phương thức (VietQR, COD, Thẻ quốc tế, Quầy shop, Ví điện tử) và chế độ đối soát.
 */
export function StorePaymentMethodsEditor() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<StorePaymentMethodsConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const loading = !org.data && !org.error
  const currentConfig = draft ?? (org.data ? parseStorePaymentMethods(org.data.settings) : DEFAULT_PAYMENT_METHODS_CONFIG)

  const updateConfig = (patch: Partial<StorePaymentMethodsConfig>) => {
    setDraft({ ...currentConfig, ...patch })
    setMessage(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validateStorePaymentMethods(currentConfig)
    if (validationErrors.length > 0) {
      setMessage({ kind: "error", text: validationErrors[0] ?? "Vui lòng kiểm tra lại thông tin cài đặt" })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        [BROCHURE_PAYMENT_SETTINGS_KEY]: serializeStorePaymentMethods(currentConfig),
      }
      await apiSend(
        "/api/v1/organizations/current",
        "PATCH",
        { settings: payload },
        "Không lưu được cơ chế nhận thanh toán"
      )
      await org.mutate()
      setDraft(null)
      setMessage({ kind: "ok", text: "Đã lưu toàn bộ cơ chế nhận thanh toán và phương thức áp dụng thành công!" })
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Lỗi khi lưu cơ chế nhận thanh toán",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* 1. Header & Trạng thái */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-title-sm font-extrabold text-text flex items-center gap-2">
              <Landmark size={18} className="text-primary" /> Cơ Chế Nhận Thanh Toán & Đối Soát
            </h2>
            <p className="text-caption text-text-muted mt-1">
              Thiết lập các phương thức thanh toán hiển thị cho khách hàng trên bộ sưu tập riêng, trang đặt hàng và tại điểm bán.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-bold self-start sm:self-auto ${
              currentConfig.accountNo
                ? "bg-success-bg text-success border border-success/20"
                : "bg-warning-bg text-warning-text border border-warning/20"
            }`}
          >
            {currentConfig.accountNo ? "Tài khoản VietQR sẵn sàng" : "Chưa nhập số tài khoản nhận tiền"}
          </span>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-xl text-caption flex items-center gap-2 border ${
              message.kind === "ok"
                ? "bg-success-bg text-primary border-success-border"
                : "bg-danger/10 text-danger-text border-danger/20"
            }`}
          >
            {message.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* 2. Phương thức 1: Chuyển khoản VietQR */}
      <BankTransferSection config={currentConfig} updateConfig={updateConfig} />

      {/* 3. Phương thức 2: Thu hộ COD */}
      <CodPaymentSection config={currentConfig} updateConfig={updateConfig} />

      {/* 4. Phương thức 3: Thẻ quốc tế & Cổng thanh toán */}
      <InternationalCardSection config={currentConfig} updateConfig={updateConfig} />

      {/* 5. Phương thức 4 & 5: Tại quầy & Ví điện tử */}
      <InStoreAndEWalletSection config={currentConfig} updateConfig={updateConfig} />

      {/* 6. Cơ chế xác nhận & đối soát giao dịch */}
      <ReconciliationSection config={currentConfig} updateConfig={updateConfig} />

      {/* Nút lưu */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={saving || loading}
          className="text-caption font-bold gap-1.5 shadow-xs"
        >
          {saving ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <Save size={13} />}
          {saving ? "Đang lưu cấu hình..." : "Lưu cơ chế thanh toán"}
        </Button>
      </div>
    </form>
  )
}
