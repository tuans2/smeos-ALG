"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React from "react"
import { Timer, ArrowDownLeft } from "@/components/ui/icons"
import {
  type StepTimeoutPolicy,
  type CatalogTimeoutOverride,
  DEFAULT_STEP_TIMEOUT_POLICY,
  formatTimeoutDuration,
} from "@/modules/greeting-card/domain/step-timeout-policy"

interface Props {
  storePolicy: StepTimeoutPolicy
  override: CatalogTimeoutOverride | null
  onChange: (next: CatalogTimeoutOverride) => void
}

export function CatalogStepTimeoutOverride({ storePolicy, override, onChange }: Props) {
  const isCustom = override?.enabled === true
  const custom = override?.policy ?? {}

  const activeUnopened = custom.autoCancelUnopened ?? storePolicy.autoCancelUnopened
  const activeUnopenedHours = custom.unopenedExpiryHours ?? storePolicy.unopenedExpiryHours

  const activeBrowsing = custom.autoCancelBrowsing ?? storePolicy.autoCancelBrowsing
  const activeBrowsingHours = custom.browsingExpiryHours ?? storePolicy.browsingExpiryHours

  const activeUnpaid = custom.autoCancelUnpaid ?? storePolicy.autoCancelUnpaid
  const activeUnpaidMinutes = custom.unpaidExpiryMinutes ?? storePolicy.unpaidExpiryMinutes

  const activePhotoApprove = custom.autoApprovePhotoOnTimeout ?? storePolicy.autoApprovePhotoOnTimeout
  const activePhotoMinutes = custom.photoReviewTimeoutMinutes ?? storePolicy.photoReviewTimeoutMinutes

  function setField<K extends keyof StepTimeoutPolicy>(key: K, val: StepTimeoutPolicy[K]) {
    onChange({
      enabled: true,
      policy: {
        ...custom,
        [key]: val,
      },
    })
  }

  function handleToggleMode(enableCustom: boolean) {
    if (!enableCustom) {
      onChange({ enabled: false })
    } else {
      onChange({
        enabled: true,
        policy: {
          unopenedExpiryHours: storePolicy.unopenedExpiryHours,
          autoCancelUnopened: storePolicy.autoCancelUnopened,
          browsingExpiryHours: storePolicy.browsingExpiryHours,
          autoCancelBrowsing: storePolicy.autoCancelBrowsing,
          unpaidExpiryMinutes: storePolicy.unpaidExpiryMinutes,
          autoCancelUnpaid: storePolicy.autoCancelUnpaid,
          photoReviewTimeoutMinutes: storePolicy.photoReviewTimeoutMinutes,
          autoApprovePhotoOnTimeout: storePolicy.autoApprovePhotoOnTimeout,
        },
      })
    }
  }

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
          <Timer size={16} className="text-primary" aria-hidden="true" />
          <span>Thời hạn & tự động huỷ đơn cho bộ sưu tập này</span>
        </h4>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-caption font-bold text-text cursor-pointer">
            <Checkbox
              checked={!isCustom}
              onCheckedChange={(checked) => handleToggleMode(!(checked === true))}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Kế thừa mặc định từ Hồ sơ tiệm</span>
          </label>
        </div>
      </div>

      {!isCustom ? (
        <div className="rounded-xl border border-border bg-surface-alt p-3.5 flex items-start gap-2 text-caption text-text-muted">
          <ArrowDownLeft size={16} className="mt-0.5 text-primary shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-text">
              Đang áp dụng thời hạn chuẩn theo Hồ sơ tiệm:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-caption">
              <li>
                Khách không mở link:{" "}
                <span className="font-bold text-text">
                  {storePolicy.autoCancelUnopened
                    ? `Tự huỷ sau ${formatTimeoutDuration(storePolicy.unopenedExpiryHours, "hours")}`
                    : "Không tự huỷ"}
                </span>
              </li>
              <li>
                Mở nhưng không chọn mẫu:{" "}
                <span className="font-bold text-text">
                  {storePolicy.autoCancelBrowsing
                    ? `Tự huỷ sau ${formatTimeoutDuration(storePolicy.browsingExpiryHours, "hours")}`
                    : "Không tự huỷ"}
                </span>
              </li>
              <li>
                Chờ chuyển khoản cọc:{" "}
                <span className="font-bold text-text">
                  {storePolicy.autoCancelUnpaid
                    ? `Tự huỷ sau ${formatTimeoutDuration(storePolicy.unpaidExpiryMinutes, "minutes")}`
                    : "Không tự huỷ"}
                </span>
              </li>
              <li>
                Duyệt ảnh thành phẩm:{" "}
                <span className="font-bold text-text">
                  {storePolicy.autoApprovePhotoOnTimeout
                    ? `Tự duyệt sau ${storePolicy.photoReviewTimeoutMinutes} phút`
                    : "Không tự duyệt"}
                </span>
              </li>
            </ul>
            <p className="pt-1 text-meta text-primary font-medium">
              Bỏ chọn &ldquo;Kế thừa mặc định&rdquo; để tùy biến thời hạn riêng cho bộ sưu tập / đợt sự kiện này.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 rounded-xl border border-primary/30 bg-surface-alt p-3.5">
          <p className="text-caption font-bold text-primary">
            Đang tùy biến riêng cho bộ sưu tập này (ghi đè cài đặt của tiệm):
          </p>

          {/* 1. Hủy nếu không mở link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-surface">
            <label className="flex items-center gap-2 text-caption font-bold text-text cursor-pointer">
              <Checkbox
                checked={activeUnopened}
                onCheckedChange={(checked) => setField("autoCancelUnopened", (checked === true))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>1. Tự hủy nếu không mở link</span>
            </label>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                min={1}
                max={720}
                disabled={!activeUnopened}
                value={activeUnopenedHours}
                onChange={(e) =>
                  setField("unopenedExpiryHours", Math.max(1, parseInt(e.target.value) || 24))
                }
                className="h-8 w-16 rounded border border-border bg-surface px-1.5 text-right text-caption font-bold text-text disabled:opacity-40"
              />
              <span className="text-caption text-text-muted">giờ</span>
            </div>
          </div>

          {/* 2. Hủy nếu không chọn mẫu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-surface">
            <label className="flex items-center gap-2 text-caption font-bold text-text cursor-pointer">
              <Checkbox
                checked={activeBrowsing}
                onCheckedChange={(checked) => setField("autoCancelBrowsing", (checked === true))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>2. Tự hủy nếu không chọn mẫu</span>
            </label>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                min={1}
                max={168}
                disabled={!activeBrowsing}
                value={activeBrowsingHours}
                onChange={(e) =>
                  setField("browsingExpiryHours", Math.max(1, parseInt(e.target.value) || 12))
                }
                className="h-8 w-16 rounded border border-border bg-surface px-1.5 text-right text-caption font-bold text-text disabled:opacity-40"
              />
              <span className="text-caption text-text-muted">giờ</span>
            </div>
          </div>

          {/* 3. Hủy nếu chưa cọc */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-surface">
            <label className="flex items-center gap-2 text-caption font-bold text-text cursor-pointer">
              <Checkbox
                checked={activeUnpaid}
                onCheckedChange={(checked) => setField("autoCancelUnpaid", (checked === true))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>3. Tự hủy nếu chưa cọc / chuyển khoản</span>
            </label>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                min={5}
                max={1440}
                disabled={!activeUnpaid}
                value={activeUnpaidMinutes}
                onChange={(e) =>
                  setField("unpaidExpiryMinutes", Math.max(5, parseInt(e.target.value) || 30))
                }
                className="h-8 w-16 rounded border border-border bg-surface px-1.5 text-right text-caption font-bold text-text disabled:opacity-40"
              />
              <span className="text-caption text-text-muted">phút</span>
            </div>
          </div>

          {/* 4. Tự duyệt ảnh */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-surface">
            <label className="flex items-center gap-2 text-caption font-bold text-text cursor-pointer">
              <Checkbox
                checked={activePhotoApprove}
                onCheckedChange={(checked) => setField("autoApprovePhotoOnTimeout", (checked === true))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>4. Tự duyệt ảnh thành phẩm nếu khách im lặng</span>
            </label>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                min={5}
                max={120}
                disabled={!activePhotoApprove}
                value={activePhotoMinutes}
                onChange={(e) =>
                  setField("photoReviewTimeoutMinutes", Math.max(5, parseInt(e.target.value) || 15))
                }
                className="h-8 w-16 rounded border border-border bg-surface px-1.5 text-right text-caption font-bold text-text disabled:opacity-40"
              />
              <span className="text-caption text-text-muted">phút</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
