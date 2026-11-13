"use client"

import React, { useState, useEffect } from "react"
import { Bell } from "@/components/ui/icon-set/bell"
import { Clock } from "@/components/ui/icon-set/clock"
import { Save } from "@/components/ui/icon-set/save"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Info } from "@/components/ui/icon-set/info"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { DispatchReminderPolicyConfig } from "@/modules/coordinator/domain/dispatch-reminder-types"

interface DispatchReminderPolicySectionProps {
  canEdit: boolean
}

const MILESTONE_META: {
  key: keyof DispatchReminderPolicyConfig
  code: string
  label: string
  description: string
  unit: string
  min: number
  max: number
  colorClass: string
}[] = [
  {
    key: "m0MinutesAfterPaid",
    code: "M0",
    label: "In thẻ gia công",
    description: "Nhắc sau khi nhận thanh toán từ khách để Điều phối kiểm tra hóa đơn và in thẻ gia công",
    unit: "phút sau thanh toán",
    min: 1,
    max: 360,
    colorClass: "text-primary bg-primary/10",
  },
  {
    key: "m1MinutesBeforeDelivery",
    code: "M1",
    label: "Xác nhận bắt đầu chế tác",
    description: "Nhắc Điều phối kiểm tra xưởng đã bắt đầu thực hiện đơn, tạo cửa sổ đệm can thiệp kịp thời",
    unit: "phút trước giờ giao",
    min: 10,
    max: 720,
    colorClass: "text-warning-text bg-warning/10",
  },
  {
    key: "m2MinutesBeforeDelivery",
    code: "M2",
    label: "Hoàn thành & đặt shipper",
    description: "Nhắc xưởng chụp ảnh thành phẩm và đặt shipper để có số điện thoại tài xế trước giờ giao",
    unit: "phút trước giờ giao",
    min: 10,
    max: 360,
    colorClass: "text-info bg-info/10",
  },
  {
    key: "m3MinutesAfterShipperAssigned",
    code: "M3",
    label: "Xác nhận shipper lấy hàng",
    description: "Nhắc kiểm tra shipper đã đến xưởng nhận hoa đúng giờ chưa, xóa điểm mù trong quy trình vận chuyển",
    unit: "phút sau khi gán shipper",
    min: 5,
    max: 120,
    colorClass: "text-warning-text bg-warning/10",
  },
  {
    key: "m5MinutesAfterDelivery",
    code: "M5",
    label: "Chăm sóc sau giao",
    description: "Nhắc kiểm tra ảnh giao hàng từ shipper và liên hệ hỏi mức độ hài lòng của khách hàng",
    unit: "phút sau giờ giao",
    min: 5,
    max: 360,
    colorClass: "text-success bg-success/10",
  },
]

export function DispatchReminderPolicySection({ canEdit }: DispatchReminderPolicySectionProps) {
  const [config, setConfig] = useState<DispatchReminderPolicyConfig>({
    m0MinutesAfterPaid: 10,
    m1MinutesBeforeDelivery: 120,
    m2MinutesBeforeDelivery: 60,
    m3MinutesAfterShipperAssigned: 20,
    m5MinutesAfterDelivery: 30,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải cấu hình chính sách khi mount
    setIsLoading(true)
    fetch("/api/v1/coordinator/settings/reminders")
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải cấu hình chính sách")
        return res.json()
      })
      .then((data: { config?: DispatchReminderPolicyConfig }) => {
        if (data.config) {
          setConfig(data.config)
        }
      })
      .catch((err: Error) => {
        setErrorMessage(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleChange = (key: keyof DispatchReminderPolicyConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const res = await fetch("/api/v1/coordinator/settings/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(errData.message || "Lưu cấu hình thất bại")
      }
      setSuccessMessage("Đã lưu chính sách nhắc việc toàn tiệm thành công!")
      setIsDirty(false)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center gap-2 text-text-muted">
        <Clock size={16} className="animate-spin motion-reduce:animate-none text-primary" />
        <span className="text-body-sm">Đang tải cấu hình nhắc việc...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mô tả ngắn */}
      <div className="flex gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <Info size={15} className="text-primary shrink-0 mt-0.5" />
        <p className="text-caption text-text-muted leading-relaxed">
          Hệ thống sẽ tự động nhắc Điều phối viên thực hiện đúng nghiệp vụ tại mỗi mốc thời gian.
          Mốc <strong>Dặn shipper chụp ảnh lúc giao</strong> kích hoạt ngay khi nhập SĐT shipper, không cần cấu hình thời gian.
          Cấu hình theo từng sản phẩm được thiết lập riêng tại trang Chi tiết sản phẩm.
        </p>
      </div>

      {/* Thông báo trạng thái */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-bg text-danger-text text-body-sm border border-danger/20">
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success-bg text-success text-body-sm border border-success-border">
          <CheckCircle2 size={15} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Bảng cấu hình 5 mốc */}
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {MILESTONE_META.map((m, i) => (
          <div
            key={m.key}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface hover:bg-surface-alt/30 transition-colors"
          >
            <div className="flex items-start gap-3 flex-1">
              <span
                className={`inline-flex items-center justify-center h-7 w-10 rounded-lg text-caption font-extrabold shrink-0 ${m.colorClass}`}
                aria-label={`Mốc ${i + 1}`}
              >
                {i + 1}
              </span>
              <div>
                <div className="text-body-sm font-bold text-text">{m.label}</div>
                <div className="text-caption text-text-muted leading-relaxed mt-0.5 max-w-md">
                  {m.description}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-13 sm:ml-0">
              <Input
                type="number"
                min={m.min}
                max={m.max}
                value={config[m.key]}
                disabled={!canEdit || isSaving}
                onChange={(e) => handleChange(m.key, Number(e.target.value))}
                className="w-20 text-center font-bold"
                aria-label={`Cấu hình ${m.label}`}
              />
              <span className="text-caption text-text-muted whitespace-nowrap">
                {m.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Nút lưu */}
      {canEdit && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            className="h-9 px-5 bg-primary hover:bg-primary-dark text-white font-bold text-body-sm gap-1.5"
          >
            <Save size={14} />
            {isSaving ? "Đang lưu..." : "Lưu chính sách"}
          </Button>
        </div>
      )}
    </div>
  )
}

export function DispatchReminderPolicyCard({ canEdit }: DispatchReminderPolicySectionProps) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Bell size={20} />
        </div>
        <div>
          <h2 className="text-title-sm font-extrabold text-text">
            Nhắc Nghiệp Vụ Điều Phối
          </h2>
          <p className="text-caption text-text-muted mt-0.5">
            Chuỗi mốc thời gian nhắc việc tự động kịp thời & chính xác — Đúng giờ · Đúng người · Đúng nghiệp vụ
          </p>
        </div>
      </div>
      <DispatchReminderPolicySection canEdit={canEdit} />
    </Card>
  )
}
