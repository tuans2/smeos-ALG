"use client"

import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { AlertTriangle, CheckCircle2, Coins, RotateCcw, Save } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  CRAFT_FEE_METHODS,
  CRAFT_FEE_POLICY_KEY,
  craftFeePolicyOf,
  craftFeeSpecOf,
  defaultCraftFeePolicy,
  type CraftFeeMethod,
  type CraftFeePolicy,
} from "@/modules/greeting-card/domain/craft-fee-policy"
import { CraftFeePreview } from "./craft-fee-preview"

const METHOD_TEXT: Record<CraftFeeMethod, { title: string; hint: string }> = {
  PERCENT: { title: "Theo % giá hàng", hint: "Đơn giản nhất: một tỷ lệ cho mọi đơn." },
  PERCENT_BOUNDED: { title: "Theo % giá hàng, có mức sàn và trần", hint: "Khuyên dùng: đơn rẻ vẫn đủ công, đơn đắt không trả quá tay." },
  TIERED: { title: "Bậc thang theo giá trị đơn", hint: "Đơn nhỏ trả tỷ lệ cao hơn, đơn lớn tỷ lệ thấp hơn." },
  FIXED_PER_PRODUCT: { title: "Phí cố định theo từng mẫu", hint: "Mỗi mẫu một mức phí riêng; mẫu chưa có phí thì tạm tính theo %." },
  MATERIAL_PLUS_LABOR: { title: "Nguyên liệu + công theo độ khó", hint: "Tiền nguyên liệu theo định mức cộng tiền công Dễ / Vừa / Khó." },
  PARTNER_PERCENT: { title: "Theo % dành cho đối tác", hint: "Mọi đơn đều trả theo tỷ lệ đối tác ngoài chuỗi." },
}

function NumberField(props: { label: string; value: number; onChange: (v: number) => void; suffix: string; step?: number }) {
  return (
    <label className="flex items-center justify-between gap-3 text-body-sm text-text">
      <span>{props.label}</span>
      <span className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          step={props.step ?? 1}
          value={props.value}
          onChange={(e) => props.onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-32 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-right font-bold"
        />
        <span className="w-8 text-caption text-text-muted">{props.suffix}</span>
      </span>
    </label>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5 p-4 rounded-xl border border-border">
      <legend className="px-1 text-body-sm font-extrabold text-text">{title}</legend>
      {children}
    </fieldset>
  )
}

/** Cài đặt → Phí gia công: tiệm chọn 1 trong 6 cách tính, phụ cấp và khoản trừ (PO 22/10/2026). */
export function CraftFeeSettings() {
  const [confirm, confirmDialog] = useConfirmDialog()
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<CraftFeePolicy | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const settings = org.data?.settings ?? {}
  const { spec, industryHasCraftFee } = craftFeeSpecOf(settings)
  const policy = draft ?? (org.data ? craftFeePolicyOf(settings) : null)

  if (org.data && !industryHasCraftFee) return null
  if (!policy) return <div className="h-44 rounded-2xl bg-surface-muted animate-pulse motion-reduce:animate-none" aria-busy="true" />

  const set = <K extends keyof CraftFeePolicy>(key: K, value: CraftFeePolicy[K]) => {
    setDraft({ ...policy, [key]: value })
    setMessage(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [CRAFT_FEE_POLICY_KEY]: policy } }, `Không lưu được cài đặt ${spec.feeLabel.toLowerCase()}`)
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: `Đã lưu. Đơn mời chi nhánh từ giờ tính ${spec.feeLabel.toLowerCase()} theo cách mới.` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Lỗi lưu cài đặt" })
    } finally {
      setSaving(false)
    }
  }

  const tierAt = (i: number) => policy.tiers[i]

  return (
    <form onSubmit={handleSave} className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-col gap-5">
      {confirmDialog}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h3 className="text-title font-extrabold text-text flex items-center gap-2">
            <Coins size={22} className="text-primary" /> {spec.feeLabel}
          </h3>
          <p className="text-caption text-text-muted mt-0.5">
            Số tiền trả cho chi nhánh hoặc đối tác làm thay đơn. Luôn tính trên giá hàng trước VAT, không gồm phí giao.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9 text-caption" onClick={async () => { if (await confirm({ title: "Khôi phục cách tính mặc định?", consequence: "Cách tính đang chỉnh sẽ trở về mặc định. Thay đổi chỉ có hiệu lực khi bấm Lưu.", confirmLabel: "Khôi phục mặc định" })) setDraft(defaultCraftFeePolicy(spec)) }}>
            <RotateCcw size={14} className="mr-1" /> Mặc định
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving || !draft} className="h-9 font-bold">
            <Save size={14} className="mr-1" /> {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-body-sm ${message.ok ? "bg-success-bg border-success/30 text-success" : "bg-danger-bg border-danger/30 text-danger"}`}>
          {message.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <Group title="Cách tính">
        <RadioGroup aria-label="Cách tính" value={policy.method} onValueChange={(v) => set("method", v as CraftFeePolicy["method"])} className="flex flex-col gap-2">
        {CRAFT_FEE_METHODS.map((method) => (
          <label key={method} className="flex items-start gap-2.5 cursor-pointer">
            <RadioGroupItem value={method} className="mt-1" />
            <span>
              <span className="block text-body-sm font-bold text-text">{METHOD_TEXT[method].title}</span>
              <span className="block text-caption text-text-muted">{METHOD_TEXT[method].hint}</span>
            </span>
          </label>
        ))}
        </RadioGroup>
        <label className="flex items-center gap-2 pt-1 text-body-sm text-text">
          <Checkbox checked={policy.base === "AFTER_DISCOUNT"} onCheckedChange={(checked) => set("base", (checked === true) ? "AFTER_DISCOUNT" : "LIST_PRICE")} className="accent-primary" />
          Tính trên giá sau khi trừ mã giảm giá (mặc định: giá niêm yết)
        </label>
      </Group>

      <Group title="Mức phí">
        {policy.method !== "PARTNER_PERCENT" && <NumberField label="Tỷ lệ trên giá hàng" value={policy.percent} onChange={(v) => set("percent", Math.min(100, v))} suffix="%" />}
        {policy.method === "PERCENT_BOUNDED" && (
          <>
            <NumberField label="Mức sàn" value={policy.minVnd} onChange={(v) => set("minVnd", v)} suffix="đ" step={10_000} />
            <NumberField label="Mức trần" value={policy.maxVnd} onChange={(v) => set("maxVnd", v)} suffix="đ" step={10_000} />
          </>
        )}
        {policy.method === "TIERED" &&
          [0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-lg bg-surface-muted p-2.5">
              {i < 2 ? (
                <NumberField label={`Bậc ${i + 1}: đơn đến`} value={tierAt(i)?.upToVnd ?? 0} onChange={(v) => set("tiers", policy.tiers.map((t, j) => (j === i ? { ...t, upToVnd: v } : t)))} suffix="đ" step={100_000} />
              ) : (
                <span className="text-body-sm text-text">Bậc 3: đơn lớn hơn</span>
              )}
              <NumberField label="Tỷ lệ" value={tierAt(i)?.percent ?? policy.percent} onChange={(v) => set("tiers", policy.tiers.map((t, j) => (j === i ? { ...t, percent: Math.min(100, v) } : t)))} suffix="%" />
            </div>
          ))}
        {policy.method === "MATERIAL_PLUS_LABOR" && (
          <>
            <NumberField label="Cộng thêm trên tiền nguyên liệu" value={policy.materialMarkupPercent} onChange={(v) => set("materialMarkupPercent", v)} suffix="%" />
            {(["EASY", "MEDIUM", "HARD"] as const).map((level) => (
              <NumberField key={level} label={`Tiền công mẫu ${spec.complexityLabels[level].toLowerCase()}`} value={policy.laborByComplexityVnd[level]} onChange={(v) => set("laborByComplexityVnd", { ...policy.laborByComplexityVnd, [level]: v })} suffix="đ" step={10_000} />
            ))}
          </>
        )}
        <NumberField label="Tỷ lệ cho đối tác ngoài chuỗi" value={policy.partnerPercent} onChange={(v) => set("partnerPercent", Math.min(100, v))} suffix="%" />
        <NumberField label="Làm tròn lên bội số của" value={policy.roundToVnd} onChange={(v) => set("roundToVnd", Math.max(1, v))} suffix="đ" step={1_000} />
      </Group>

      <Group title="Phụ cấp">
        <NumberField label="Đơn gấp: cộng thêm" value={policy.rushSurchargePercent} onChange={(v) => set("rushSurchargePercent", v)} suffix="%" />
        <NumberField label="Tính là gấp khi phải giao trong vòng" value={policy.rushWithinMinutes} onChange={(v) => set("rushWithinMinutes", v)} suffix="phút" step={15} />
        <NumberField label="Ngày cao điểm: cộng thêm" value={policy.peakSurchargePercent} onChange={(v) => set("peakSurchargePercent", v)} suffix="%" />
        <p className="text-caption text-text-muted">Ngày cao điểm cố định: {spec.peakDays.length ? spec.peakDays.map((d) => d.label).join(", ") : "chưa có"}.</p>
        <label className="flex flex-col gap-1 text-body-sm text-text">
          Thêm ngày cao điểm (năm-tháng-ngày, cách nhau bằng dấu phẩy — vd. Tết, Trung thu)
          <Input
            type="text"
            defaultValue={policy.extraPeakDates.join(", ")}
            onBlur={(e) => set("extraPeakDates", e.target.value.split(",").map((s) => s.trim()).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)))}
            placeholder="2027-02-06, 2027-09-15"
            className="px-2.5 py-1.5 rounded-lg border border-border bg-surface"
          />
        </label>
      </Group>

      <Group title="Điều chỉnh và khấu trừ">
        <NumberField label="Điều phối được sửa phí quanh mức gợi ý trong khoảng ±" value={policy.coordinatorAdjustPercent} onChange={(v) => set("coordinatorAdjustPercent", Math.min(100, v))} suffix="%" />
        <p className="text-caption text-text-muted">Sửa vượt khoảng này cần người có quyền Điều hành.</p>
        <label className="flex items-center gap-2 text-body-sm text-text">
          <Checkbox checked={policy.deductionsEnabled} onCheckedChange={(checked) => set("deductionsEnabled", checked === true)} className="accent-primary" />
          Áp dụng khấu trừ phí gia công
        </label>
        {policy.deductionsEnabled && (
          <>
            <NumberField label="Trừ khi giao trễ giờ hẹn" value={policy.lateDeliveryDeductionPercent} onChange={(v) => set("lateDeliveryDeductionPercent", Math.min(100, v))} suffix="%" />
            <NumberField label="Chỉ tính trễ sau giờ hẹn quá" value={policy.lateGraceMinutes} onChange={(v) => set("lateGraceMinutes", Math.min(60, v))} suffix="phút" />
            <NumberField label="Trừ khi khách khiếu nại" value={policy.complaintDeductionPercent} onChange={(v) => set("complaintDeductionPercent", Math.min(100, v))} suffix="%" />
          </>
        )}
        <p className="text-caption text-text-muted">
          Tắt hoặc để 0% thì chỉ ghi nhận, không trừ. Tắt, hạ % hay tăng thời gian ân hạn áp dụng ngay cho cả đơn đang làm;
          tăng % chỉ áp cho đơn gửi lời mời sau khi lưu. Đơn không có giờ hẹn cụ thể không bị tính trễ.
        </p>
      </Group>

      <CraftFeePreview policy={policy} feeLabel={spec.feeLabel} />
    </form>
  )
}
