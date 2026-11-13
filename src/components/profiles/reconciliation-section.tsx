"use client"

import React from "react"
import { HelpCircle } from "@/components/ui/icon-set/help-circle"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { StorePaymentMethodsConfig } from "@/modules/greeting-card/domain/store-payment-methods"

interface ReconciliationSectionProps {
  config: StorePaymentMethodsConfig
  updateConfig: (patch: Partial<StorePaymentMethodsConfig>) => void
}

/** Cơ chế xác nhận & đối soát giao dịch */
export function ReconciliationSection({ config, updateConfig }: ReconciliationSectionProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
      <div>
        <h3 className="text-body-sm font-bold text-text flex items-center gap-2">
          <HelpCircle size={16} className="text-primary" /> Cơ chế xác nhận & đối soát giao dịch
        </h3>
        <p className="text-caption text-text-muted mt-0.5">
          Lựa chọn quy trình kiểm tra tiền về để chuyển trạng thái đơn hàng sang “Đã thanh toán”
        </p>
      </div>

      <RadioGroup
        aria-label="Cơ chế xác nhận giao dịch"
        value={config.reconciliationMode}
        onValueChange={(v) => updateConfig({ reconciliationMode: v as StorePaymentMethodsConfig["reconciliationMode"] })}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
      >
        <label
          className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
            config.reconciliationMode === "MANUAL_PROOF"
              ? "border-primary bg-primary/5"
              : "border-border bg-surface hover:bg-surface-alt"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-body-sm font-bold text-text">Xác nhận bằng chứng từ thủ công</p>
              <p className="text-caption text-text-muted mt-1 leading-relaxed">
                Khách chuyển khoản rồi tải ảnh bill hoặc bấm “Tôi đã chuyển”. Nhân viên đối soát sao kê app và bấm Duyệt tiền.
              </p>
            </div>
            <RadioGroupItem value="MANUAL_PROOF" className="mt-1" />
          </div>
        </label>

        <label
          className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
            config.reconciliationMode === "AUTO_WEBHOOK"
              ? "border-primary bg-primary/5"
              : "border-border bg-surface hover:bg-surface-alt"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-body-sm font-bold text-text">Tự động khớp lệnh tức thì (Webhook)</p>
                <span className="text-caption font-bold px-1.5 py-0.5 rounded-full bg-success-bg text-success-text border border-success-border">
                  Khuyên dùng
                </span>
              </div>
              <p className="text-caption text-text-muted mt-1 leading-relaxed">
                Bắt biến động số dư qua Open Banking / SePay / PayOS. Đơn hàng tự động đổi sang “Đã thanh toán” trong 3 giây.
              </p>
            </div>
            <RadioGroupItem value="AUTO_WEBHOOK" className="mt-1" />
          </div>
        </label>
      </RadioGroup>
    </div>
  )
}
