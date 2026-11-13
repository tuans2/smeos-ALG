"use client"

import { useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"

import { Button } from "@/components/ui/button"
import { Disclosure } from "@/components/ui/disclosure"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { discountLabel, MAX_BATCH_QUANTITY, type VoucherBatchMode, type VoucherDiscountType } from "@/modules/promotions/domain/voucher-batch"

export interface PromotionOption {
  id: string
  title: string
}

const FIELD = "flex flex-col gap-1.5 text-body-sm font-semibold text-text"
const SELECT = "h-11 rounded-xl border border-border bg-surface px-3 text-body text-text focus-visible:outline-2 focus-visible:outline-primary"

const intOrNull = (v: string) => (v.trim() === "" ? null : Math.round(Number(v)))
/** Ngày `YYYY-MM-DD` → đầu ngày (bắt đầu) / cuối ngày (hết hạn) theo giờ Việt Nam. */
const dayIso = (v: string, end: boolean) => (v ? `${v}T${end ? "23:59:59" : "00:00:00"}+07:00` : null)

/** Phát hành một đợt mã: việc chính (tên, kiểu, mức giảm) luôn thấy; điều kiện thêm nằm trong mục mở rộng. */
export function VoucherBatchForm({
  promotions,
  maxDiscountPercent,
  onCreated,
  onCancel,
}: {
  promotions: PromotionOption[]
  maxDiscountPercent: number | null
  onCreated: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [mode, setMode] = useState<VoucherBatchMode>("SHARED")
  const [sharedCode, setSharedCode] = useState("")
  const [prefix, setPrefix] = useState("")
  const [quantity, setQuantity] = useState("50")
  const [discountType, setDiscountType] = useState<VoucherDiscountType>("PERCENTAGE")
  const [discountValue, setDiscountValue] = useState("10")
  const [promotionId, setPromotionId] = useState("")
  const [minOrder, setMinOrder] = useState("")
  const [maxDiscount, setMaxDiscount] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [usageLimit, setUsageLimit] = useState("")
  const [perCustomer, setPerCustomer] = useState("1")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const value = Number(discountValue) || 0
  const summary = `${discountLabel(discountType, value, discountType === "PERCENTAGE" ? intOrNull(maxDiscount) : null)} · ${
    mode === "SHARED" ? `mã chung ${sharedCode.trim().toUpperCase() || "…"}` : `${quantity || 0} mã riêng`
  }`

  async function submit() {
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch("/api/v1/vouchers/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mode,
          shared_code: mode === "SHARED" ? sharedCode : null,
          code_prefix: mode === "UNIQUE" ? prefix || null : null,
          quantity: mode === "UNIQUE" ? Number(quantity) : 1,
          promotion_id: promotionId || null,
          discount_type: discountType,
          discount_value: value,
          min_order_vnd: intOrNull(minOrder) ?? 0,
          max_discount_vnd: discountType === "PERCENTAGE" ? intOrNull(maxDiscount) : null,
          starts_at: dayIso(startsAt, false),
          expires_at: dayIso(expiresAt, true),
          // Mã chung: tổng lượt của cả đợt; mã riêng: mặc định mỗi mã một lượt
          usage_limit: intOrNull(usageLimit) ?? (mode === "UNIQUE" ? 1 : null),
          per_customer_limit: intOrNull(perCustomer),
        }),
      })
      if (res.ok) return onCreated()
      const body = await res.json().catch(() => null)
      const details = body?.error?.details as Record<string, unknown> | undefined
      const fieldErrors = Object.fromEntries(Object.entries(details ?? {}).filter(([, v]) => typeof v === "string")) as Record<string, string>
      setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { form: body?.error?.message ?? "Chưa phát hành được, vui lòng thử lại" })
    } catch {
      setErrors({ form: "Mất kết nối, vui lòng thử lại" })
    } finally {
      setSaving(false)
    }
  }

  const err = (k: string) => errors[k] && <span className="text-meta font-normal text-danger-text">{errors[k]}</span>

  return (
    <div className="flex flex-col gap-4">
      <label className={FIELD}>
        Tên đợt phát hành
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Tri ân khách Tết 2027" hasError={!!errors.name} />
        {err("name")}
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-body-sm font-semibold text-text">Kiểu mã</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([["SHARED", "Một mã chung", "Nhiều khách cùng nhập một mã, ví dụ TET2027"], ["UNIQUE", "Nhiều mã riêng", "Mỗi khách một mã, để in lên thiệp hoặc gửi riêng"]] as const).map(([m, title, hint]) => (
            <Button
              key={m}
              type="button"
              variant="ghost"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-xl border p-3 h-auto text-left block whitespace-normal w-full ${mode === m ? "border-primary bg-primary-muted" : "border-border bg-surface hover:border-primary"}`}
            >
              <span className="block text-body font-semibold text-text">{title}</span>
              <span className="block text-meta text-text-muted font-normal">{hint}</span>
            </Button>
          ))}
        </div>
      </fieldset>

      {mode === "SHARED" ? (
        <label className={FIELD}>
          Mã khách sẽ nhập
          <Input value={sharedCode} onChange={(e) => setSharedCode(e.target.value.toUpperCase())} placeholder="TET2027" hasError={!!errors.sharedCode} />
          {err("sharedCode")}
        </label>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={FIELD}>
            Số mã cần tạo
            <Input type="number" min={1} max={MAX_BATCH_QUANTITY} value={quantity} onChange={(e) => setQuantity(e.target.value)} hasError={!!errors.quantity} />
            {err("quantity")}
          </label>
          <label className={FIELD}>
            Chữ đầu mã (không bắt buộc)
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="TRIAN" hasError={!!errors.codePrefix} />
            {err("codePrefix")}
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={FIELD}>
          Cách giảm
          <NativeSelect className={SELECT} value={discountType} onChange={(e) => setDiscountType(e.target.value as VoucherDiscountType)}>
            <option value="PERCENTAGE">Giảm theo %</option>
            <option value="FIXED_AMOUNT">Giảm số tiền</option>
          </NativeSelect>
        </label>
        <label className={FIELD}>
          {discountType === "PERCENTAGE" ? `Mức giảm (%)${maxDiscountPercent ? ` — tối đa ${maxDiscountPercent}%` : ""}` : "Số tiền giảm (đ)"}
          <Input type="number" min={1} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} hasError={!!errors.discountValue} />
          {err("discountValue")}
        </label>
      </div>

      <label className={FIELD}>
        Thuộc chương trình ưu đãi
        <NativeSelect className={SELECT} value={promotionId} onChange={(e) => setPromotionId(e.target.value)}>
          <option value="">Không gắn — mã dùng độc lập</option>
          {promotions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </NativeSelect>
        <span className="text-meta font-normal text-text-muted">Gắn vào một ưu đãi thì khi tắt ưu đãi đó, mọi mã của đợt cũng ngừng nhận.</span>
        {err("promotionId")}
      </label>

      <Disclosure label="Điều kiện áp dụng" appliedSummary={minOrder || expiresAt || startsAt || usageLimit ? "Đã đặt điều kiện" : "Không giới hạn"}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={FIELD}>
            Đơn tối thiểu (đ)
            <Input type="number" min={0} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" />
            {err("minOrderVnd")}
          </label>
          {discountType === "PERCENTAGE" && (
            <label className={FIELD}>
              Giảm tối đa (đ)
              <Input type="number" min={1} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="Không giới hạn" />
              {err("maxDiscountVnd")}
            </label>
          )}
          <label className={FIELD}>
            Ngày bắt đầu
            <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className={FIELD}>
            Ngày hết hạn
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} hasError={!!errors.expiresAt} />
            {err("expiresAt")}
          </label>
          <label className={FIELD}>
            {mode === "SHARED" ? "Tổng lượt dùng của mã" : "Lượt dùng mỗi mã"}
            <Input type="number" min={1} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder={mode === "SHARED" ? "Không giới hạn" : "1"} />
            {err("usageLimit")}
          </label>
          <label className={FIELD}>
            Lượt dùng mỗi khách
            <Input type="number" min={1} value={perCustomer} onChange={(e) => setPerCustomer(e.target.value)} placeholder="Không giới hạn" />
            {err("perCustomerLimit")}
          </label>
        </div>
      </Disclosure>

      {errors.form && <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-3 py-2 text-body-sm text-danger-text">{errors.form}</p>}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-text-muted">{summary}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>Huỷ</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
            Phát hành
          </Button>
        </div>
      </div>
    </div>
  )
}
