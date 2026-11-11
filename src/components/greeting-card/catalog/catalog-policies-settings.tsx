"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Gift, ShieldCheck, FileText, Check, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { parseHolidayPolicy } from "@/modules/greeting-card/domain/holiday-policy"
import {
  parseStorePolicies,
  type StorePoliciesConfig,
} from "@/modules/greeting-card/domain/store-policy"
import {
  parseStepTimeoutPolicy,
  parseCatalogTimeoutOverride,
  CATALOG_TIMEOUT_OVERRIDE_KEY,
  type CatalogTimeoutOverride as CatalogTimeoutOverrideType,
} from "@/modules/greeting-card/domain/step-timeout-policy"
import {
  parsePaymentPolicy,
  type TrackingTriggerPolicy,
} from "@/modules/greeting-card/domain/brochure-payment-policy"
import { CatalogStepTimeoutOverride } from "./catalog-step-timeout-override"
import { CatalogTrackingTriggerOverride } from "./catalog-tracking-trigger-override"

interface Props {
  catalogId: string
  currentFilters?: Record<string, unknown> | null
  onSaved: () => void
}

export function CatalogPoliciesSettings({ catalogId, currentFilters, onSaved }: Props) {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const policies = org.data ? parseStorePolicies(org.data.settings) : null

  const rawPolicyConfig = (currentFilters?.appliedPolicies as {
    promotionIds?: string[]
    commitmentIds?: string[]
    agreementIds?: string[]
    allowCustomerPromotionChoice?: boolean
    photoApprovalCountdownMinutes?: number
    applyHolidaySurcharge?: boolean
  } | undefined) ?? {}
  const holidays = org.data ? parseHolidayPolicy(org.data.settings).filter((h) => h.surchargeVnd > 0) : []

  const [selectedPromos, setSelectedPromos] = useState<string[]>(
    rawPolicyConfig.promotionIds ?? policies?.promotions.map((p) => p.id) ?? []
  )
  const [selectedCommits, setSelectedCommits] = useState<string[]>(
    rawPolicyConfig.commitmentIds ?? policies?.commitments.map((c) => c.id) ?? []
  )
  const [selectedAgrees, setSelectedAgrees] = useState<string[]>(
    rawPolicyConfig.agreementIds ?? policies?.agreements.map((a) => a.id) ?? []
  )
  const [allowPromoChoice, setAllowPromoChoice] = useState<boolean>(
    rawPolicyConfig.allowCustomerPromotionChoice ?? true
  )
  const [countdownMinutes, setCountdownMinutes] = useState<number>(
    rawPolicyConfig.photoApprovalCountdownMinutes ?? 10
  )

  const [applyHolidaySurcharge, setApplyHolidaySurcharge] = useState<boolean>(rawPolicyConfig.applyHolidaySurcharge === true)
  const [requirePaymentProofOverride, setRequirePaymentProofOverride] = useState<boolean | null>(() => {
    return typeof currentFilters?.requirePaymentProof === "boolean"
      ? (currentFilters.requirePaymentProof as boolean)
      : null
  })
  const storeStepPolicy = parseStepTimeoutPolicy(org.data?.settings)
  const storePaymentPolicy = parsePaymentPolicy(org.data?.settings)
  const [timeoutOverride, setTimeoutOverride] = useState<CatalogTimeoutOverrideType | null>(() =>
    parseCatalogTimeoutOverride(currentFilters)
  )
  const [trackingTriggerOverride, setTrackingTriggerOverride] = useState<TrackingTriggerPolicy | null>(() => {
    const t = currentFilters?.trackingTriggerPolicy
    return t === "PAYMENT_ONLY" || t === "PAYMENT_OR_COORDINATOR" ? t : null
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const togglePromo = (id: string) =>
    setSelectedPromos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleCommit = (id: string) =>
    setSelectedCommits((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleAgree = (id: string) =>
    setSelectedAgrees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  async function handleSave() {
    setSaving(true)
    try {
      const updatedFilters = {
        ...(currentFilters ?? {}),
        appliedPolicies: {
          ...((currentFilters?.appliedPolicies as Record<string, unknown> | undefined) ?? {}),
          promotionIds: selectedPromos,
          commitmentIds: selectedCommits,
          agreementIds: selectedAgrees,
          allowCustomerPromotionChoice: allowPromoChoice,
          photoApprovalCountdownMinutes: countdownMinutes,
          applyHolidaySurcharge,
        },
        [CATALOG_TIMEOUT_OVERRIDE_KEY]: timeoutOverride,
        requirePaymentProof: requirePaymentProofOverride,
        trackingTriggerPolicy: trackingTriggerOverride,
      }

      await apiSend(
        `/api/v1/greeting-card/catalogs/${catalogId}`,
        "PATCH",
        { filters: updatedFilters },
        "Không lưu được cài đặt chính sách"
      )

      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
      onSaved()
    } catch {
      // API error handled by apiSend
    } finally {
      setSaving(false)
    }
  }

  if (org.isLoading || !policies) {
    return <div className="p-8 text-center text-text-muted text-caption">Đang tải chính sách cửa hàng...</div>
  }

  return (
    <div className="space-y-5 bg-surface p-5 rounded-2xl border border-border shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h3 className="text-body font-bold text-text">Chính sách & Cam kết áp dụng cho Bộ sưu tập</h3>
          <p className="text-caption text-text-muted">
            Chọn các ưu đãi, cam kết và thỏa thuận áp dụng khi khách xem và đặt hàng trong bộ sưu tập này.
          </p>
        </div>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 font-bold h-9">
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : success ? <Check size={14} /> : null}
          <span>{saving ? "Đang lưu..." : success ? "Đã lưu!" : "Lưu cài đặt"}</span>
        </Button>
      </div>

      {/* 1. ƯU ĐÃI ÁP DỤNG */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
            <Gift size={15} className="text-primary" />
            <span>Ưu đãi áp dụng ({selectedPromos.length}/{policies.promotions.length})</span>
          </h4>
          <label className="flex items-center gap-2 cursor-pointer text-caption font-semibold text-text">
            <Checkbox
              checked={allowPromoChoice}
              onCheckedChange={(checked) => setAllowPromoChoice((checked === true))}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Cho phép khách chọn 01 ưu đãi khi đặt hàng</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {policies.promotions.map((p) => {
            const active = selectedPromos.includes(p.id)
            return (
              <Button variant="outline"
                key={p.id}
                type="button"
                onClick={() => togglePromo(p.id)}
                className={`text-[length:inherit] h-auto justify-start font-[inherit] p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  active ? "border-primary bg-primary/5 text-text hover:bg-primary/5" : "border-border text-text-muted opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-caption">
                  <span>{p.title}{p.active === false ? " (Điều hành đang tạm tắt)" : ""}</span>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${active ? "bg-primary border-primary text-white" : "border-border"}`}>
                    {active && <Check size={12} />}
                  </div>
                </div>
                <p className="text-caption text-text-muted line-clamp-2">{p.description}</p>
              </Button>
            )
          })}
        </div>
      </div>

      {/* 2. CAM KẾT ÁP DỤNG */}
      <div className="space-y-3 pt-3 border-t border-border">
        <h4 className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-success" />
          <span>Cam kết công bố ({selectedCommits.length}/{policies.commitments.length})</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {policies.commitments.map((c) => {
            const active = selectedCommits.includes(c.id)
            return (
              <Button variant="outline"
                key={c.id}
                type="button"
                onClick={() => toggleCommit(c.id)}
                className={`text-[length:inherit] h-auto justify-start font-[inherit] p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  active ? "border-success bg-success/5 text-text hover:bg-success/5" : "border-border text-text-muted opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-caption">
                  <span>{c.title}</span>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${active ? "bg-success border-success text-white" : "border-border"}`}>
                    {active && <Check size={12} />}
                  </div>
                </div>
                <p className="text-caption text-text-muted line-clamp-2">{c.customerText}</p>
              </Button>
            )
          })}
        </div>
      </div>

      {/* 3. THỎA THUẬN ÁP DỤNG */}
      <div className="space-y-3 pt-3 border-t border-border">
        <h4 className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
          <FileText size={15} className="text-warning-text" />
          <span>Thỏa thuận khách cần xác nhận ({selectedAgrees.length}/{policies.agreements.length})</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {policies.agreements.map((a) => {
            const active = selectedAgrees.includes(a.id)
            return (
              <Button variant="outline"
                key={a.id}
                type="button"
                onClick={() => toggleAgree(a.id)}
                className={`text-[length:inherit] h-auto justify-start font-[inherit] p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  active ? "border-warning bg-warning/5 text-text hover:bg-warning/5" : "border-border text-text-muted opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-caption">
                  <span>{a.title}</span>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${active ? "bg-warning border-warning text-white" : "border-border"}`}>
                    {active && <Check size={12} />}
                  </div>
                </div>
                <p className="text-caption text-text-muted line-clamp-2">{a.customerText}</p>
              </Button>
            )
          })}
        </div>
      </div>

      {/* PHỤ PHÍ NGÀY LỄ — giờ chốt & số đơn tối đa ngày lễ áp cả tiệm, phụ phí chỉ khi bộ sưu tập bật */}
      <div className="space-y-2 pt-3 border-t border-border">
        <label className="flex items-center gap-2 cursor-pointer text-body-sm font-extrabold text-text">
          <Checkbox
            checked={applyHolidaySurcharge}
            onCheckedChange={(checked) => setApplyHolidaySurcharge((checked === true))}
            className="rounded border-border text-primary focus:ring-primary"
          />
          <span>Áp dụng phụ phí ngày lễ cho bộ sưu tập này</span>
        </label>
        <p className="text-caption text-text-muted">
          {holidays.length > 0
            ? `Khách chọn ngày giao trùng ngày lễ sẽ cộng phụ phí: ${holidays.map((h) => `${h.name} +${h.surchargeVnd.toLocaleString("vi-VN")}đ`).join(" · ")}.`
            : "Chưa có ngày lễ nào có phụ phí — khai trong Cài đặt Bộ sưu tập riêng → Ngày lễ."}{" "}
          Giờ chốt nhận đơn và số đơn tối đa ngày lễ luôn áp cho cả tiệm.
        </p>
      </div>

      {/* 4. CẤU HÌNH THỜI GIAN DUYỆT ẢNH HOÀN THIỆN (SPEC #3) */}
      <div className="space-y-2 pt-3 border-t border-border">
        <h4 className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
          <span>Thời gian khách duyệt ảnh hoàn thiện (Phút)</span>
        </h4>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            max={60}
            value={countdownMinutes}
            onChange={(e) => setCountdownMinutes(Math.max(1, parseInt(e.target.value) || 10))}
            className="w-24 h-10 px-3 rounded-lg border border-border bg-bg text-body text-text font-bold"
          />
          <p className="text-caption text-text-muted">
            Thời gian đếm ngược khi thợ/điều phối tải ảnh lên. Hết thời gian này hệ thống sẽ tự động coi như khách đã duyệt để chuẩn bị giao hàng hoặc đón tiếp. (Mặc định: 10 phút)
          </p>
        </div>
      </div>

      {/* 5. CẤU HÌNH THỜI HẠN & TỰ ĐỘNG HỦY ĐƠN THEO BƯỚC CỦA BỘ SƯU TẬP */}
      <CatalogStepTimeoutOverride
        storePolicy={storeStepPolicy}
        override={timeoutOverride}
        onChange={setTimeoutOverride}
      />

      {/* 6. CẤU HÌNH BẮT BUỘC ẢNH CHUYỂN KHOẢN (GHI ĐÈ THEO BỘ SƯU TẬP) */}
      <div className="space-y-2 pt-3 border-t border-border">
        <h4 className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-primary" />
          <span>Ảnh chụp chuyển khoản</span>
        </h4>
        <div className="flex flex-col gap-2">
          <RadioGroup aria-label="Bắt buộc ảnh chuyển khoản" value={requirePaymentProofOverride === null ? "__default" : String(requirePaymentProofOverride)} onValueChange={(v) => setRequirePaymentProofOverride(v === "__default" ? null : v === "true")} className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-body-sm">
            <RadioGroupItem value={"__default"} />
            <span className="font-semibold text-text">Theo chính sách tiệm (Mặc định)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-body-sm">
            <RadioGroupItem value={"true"} />
            <span className="font-semibold text-text">Bắt buộc tải ảnh chuyển khoản</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-body-sm">
            <RadioGroupItem value={"false"} />
            <span className="font-semibold text-text">Không bắt buộc tải ảnh (Cho phép bỏ qua)</span>
          </label>
          </RadioGroup>
        </div>
        <p className="text-caption text-text-muted">
          Áp dụng cho khách xác nhận chuyển khoản đặt cọc và thanh toán phần còn lại của bộ sưu tập này.
        </p>
      </div>

      {/* 7. CẤU HÌNH CƠ CHẾ KÍCH HOẠT BƯỚC TIẾP THEO (GHI ĐÈ THEO BỘ SƯU TẬP) */}
      <CatalogTrackingTriggerOverride
        storeTriggerPolicy={storePaymentPolicy.trackingTriggerPolicy}
        overrideValue={trackingTriggerOverride}
        onChange={setTrackingTriggerOverride}
      />
    </div>
  )
}
