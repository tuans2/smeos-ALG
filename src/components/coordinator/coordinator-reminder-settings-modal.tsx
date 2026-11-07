"use client"

import React, { useState, useEffect } from "react"
import { Settings2 } from "@/components/ui/icon-set/settings2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Check } from "@/components/ui/icon-set/check"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { ShieldAlert } from "@/components/ui/icon-set/shield-alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import type { DispatchReminderPolicyConfig } from "@/modules/coordinator/domain/dispatch-reminder-types"

interface CoordinatorReminderSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export function CoordinatorReminderSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: CoordinatorReminderSettingsModalProps) {
  const [config, setConfig] = useState<DispatchReminderPolicyConfig>({
    m0MinutesAfterPaid: 10,
    m1MinutesBeforeDelivery: 120,
    m2MinutesBeforeDelivery: 60,
    m3MinutesAfterShipperAssigned: 20,
    m5MinutesAfterDelivery: 30,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải cấu hình mỗi lần mở hộp thoại, chủ đích
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

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
        setErrorMessage(err.message || "Lỗi tải cấu hình")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
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

      setSuccessMessage("Đã lưu chính sách nhắc việc thành công!")
      onSaved?.()
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra"
      setErrorMessage(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Settings2 size={18} />
          </div>
          <div>
            <span className="text-body font-bold text-text">
              Cài Đặt Chính Sách Nhắc Nghiệp Vụ
            </span>
          </div>
        </div>
      }
      description="Các mốc nhắc việc tự động cho Điều phối viên theo tiến độ đơn, từ in thẻ gia công tới chăm sóc sau giao"
      size="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-danger-bg text-danger text-body-sm flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-success-bg text-success text-body-sm flex items-center gap-2">
              <Check size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
              <RefreshCw size={24} className="animate-spin motion-reduce:animate-none text-primary" />
              <span className="text-body-sm">Đang tải cài đặt chính sách...</span>
            </div>
          ) : (
            <>
              {/* M0 */}
              <div className="p-3.5 rounded-xl border border-border bg-surface-alt/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-caption font-bold text-primary uppercase">
                      In thẻ gia công
                    </span>
                    <h4 className="text-body-sm font-bold text-text">
                      Sau khi nhận thanh toán
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={360}
                      value={config.m0MinutesAfterPaid}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          m0MinutesAfterPaid: Number(e.target.value),
                        })
                      }
                      className="w-20 text-center font-bold"
                    />
                    <span className="text-caption text-text-muted">phút</span>
                  </div>
                </div>
                <p className="text-caption text-text-muted leading-relaxed">
                  Nhắc kiểm tra hóa đơn, in thẻ gia công và gửi xưởng xác nhận nhận đơn.
                </p>
              </div>

              {/* M1 */}
              <div className="p-3.5 rounded-xl border border-border bg-surface-alt/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-caption font-bold text-warning uppercase">
                      Bắt đầu chế tác
                    </span>
                    <h4 className="text-body-sm font-bold text-text">
                      Trước giờ giao hẹn
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={10}
                      max={720}
                      value={config.m1MinutesBeforeDelivery}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          m1MinutesBeforeDelivery: Number(e.target.value),
                        })
                      }
                      className="w-20 text-center font-bold"
                    />
                    <span className="text-caption text-text-muted">phút</span>
                  </div>
                </div>
                <p className="text-caption text-text-muted leading-relaxed">
                  Tạo cửa sổ đệm can thiệp: nhắc xưởng xác nhận đã bắt đầu thực hiện đơn.
                </p>
              </div>

              {/* M2 */}
              <div className="p-3.5 rounded-xl border border-border bg-surface-alt/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-caption font-bold text-info uppercase">
                      Hoàn thành & đặt lịch giao
                    </span>
                    <h4 className="text-body-sm font-bold text-text">
                      Trước giờ giao hẹn
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={10}
                      max={360}
                      value={config.m2MinutesBeforeDelivery}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          m2MinutesBeforeDelivery: Number(e.target.value),
                        })
                      }
                      className="w-20 text-center font-bold"
                    />
                    <span className="text-caption text-text-muted">phút</span>
                  </div>
                </div>
                <p className="text-caption text-text-muted leading-relaxed">
                  Nhắc xưởng chụp ảnh thành phẩm kiểm tra và báo SĐT tài xế shipper.
                </p>
              </div>

              {/* M3 */}
              <div className="p-3.5 rounded-xl border border-border bg-surface-alt/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-caption font-bold text-warning uppercase">
                      Shipper lấy hàng
                    </span>
                    <h4 className="text-body-sm font-bold text-text">
                      Sau khi gán shipper
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={config.m3MinutesAfterShipperAssigned}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          m3MinutesAfterShipperAssigned: Number(e.target.value),
                        })
                      }
                      className="w-20 text-center font-bold"
                    />
                    <span className="text-caption text-text-muted">phút</span>
                  </div>
                </div>
                <p className="text-caption text-text-muted leading-relaxed">
                  Xóa blind spot: kiểm tra tài xế đã đến xưởng nhận hoa hay chưa.
                </p>
              </div>

              {/* M5 */}
              <div className="p-3.5 rounded-xl border border-border bg-surface-alt/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-caption font-bold text-success uppercase">
                      Chăm sóc sau giao
                    </span>
                    <h4 className="text-body-sm font-bold text-text">
                      Sau giờ giao thành công
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={5}
                      max={360}
                      value={config.m5MinutesAfterDelivery}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          m5MinutesAfterDelivery: Number(e.target.value),
                        })
                      }
                      className="w-20 text-center font-bold"
                    />
                    <span className="text-caption text-text-muted">phút</span>
                  </div>
                </div>
                <p className="text-caption text-text-muted leading-relaxed">
                  Nhắc kiểm tra ảnh POD từ shipper và liên hệ hỏi mức độ hài lòng của khách.
                </p>
              </div>
            </>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="h-9 px-4 text-body-sm"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || isLoading}
              className="h-9 px-5 bg-primary hover:bg-primary-dark text-white font-bold text-body-sm"
            >
              {isSaving ? "Đang lưu..." : "Lưu chính sách"}
            </Button>
          </div>
        </form>
    </Dialog>
  )
}
