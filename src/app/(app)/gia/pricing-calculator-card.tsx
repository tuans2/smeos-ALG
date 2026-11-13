"use client"

import { useState } from "react"
import { Info } from "@/components/ui/icon-set/info"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import {
  quotePrice,
  checkPriceInvariants,
  type PricingConfig,
  type PriceQuoteResult,
  type SurchargeGroup,
} from "@/modules/products/domain/pricing"
import { checkPriceGuard } from "@/modules/products/domain/price-guard"
import {
  SIZE_VARIANT_CONFIGS,
  type ProductSizeKey,
} from "@/modules/products/domain/product-size-variants"
import { formatCurrency } from "@/lib/i18n/formatters"

export interface PricingCalculatorCardProps {
  partnerTierBonus: Record<string, number>
  surchargeGroups: SurchargeGroup[]
  optimalPriceRatio: number
  floorRatio: number
  ceilingRatio: number
}

function formatVnd(value: number): string {
  return formatCurrency(Math.round(value || 0))
}

export function PricingCalculatorCard({
  partnerTierBonus,
  surchargeGroups,
  optimalPriceRatio,
  floorRatio,
  ceilingRatio,
}: PricingCalculatorCardProps) {
  const [costVnd, setCostVnd] = useState<number | "">("")
  const [partnerTier, setPartnerTier] = useState<string>(
    () => Object.keys(partnerTierBonus)[0] || ""
  )
  const [listPriceVnd, setListPriceVnd] = useState<number | "">("")
  const [closedPriceVnd, setClosedPriceVnd] = useState<number | "">("")
  const [depositPercent, setDepositPercent] = useState<number>(100)
  const [selectedSurcharges, setSelectedSurcharges] = useState<Record<string, number>>({})
  const [otherSurchargeVnd, setOtherSurchargeVnd] = useState<number | "">("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [ketQua, setKetQua] = useState<PriceQuoteResult | null>(null)
  const [canhBaoSanTran, setCanhBaoSanTran] = useState("")
  const [viPhamBatBien, setViPhamBatBien] = useState<string[]>([])
  const [selectedSize, setSelectedSize] = useState<ProductSizeKey>("SIZE_M")

  function handleSelectSize(newSize: ProductSizeKey) {
    const currentMultiplier = SIZE_VARIANT_CONFIGS[selectedSize].scaleMultiplier
    const targetMultiplier = SIZE_VARIANT_CONFIGS[newSize].scaleMultiplier
    const ratio = targetMultiplier / currentMultiplier
    setSelectedSize(newSize)

    if (typeof costVnd === "number" && costVnd > 0) {
      setCostVnd(Math.round(costVnd * ratio))
    }
    if (typeof listPriceVnd === "number" && listPriceVnd > 0) {
      setListPriceVnd(Math.round(listPriceVnd * ratio))
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (costVnd === "" || costVnd <= 0) {
      errors.costVnd = "Giá vốn bắt buộc và phải lớn hơn 0 đ"
    }
    if (listPriceVnd === "" || listPriceVnd <= 0) {
      errors.listPriceVnd = "Giá niêm yết bắt buộc và phải lớn hơn 0 đ"
    }
    if (closedPriceVnd !== "" && closedPriceVnd < 0) {
      errors.closedPriceVnd = "Giá chốt tay không được là số âm"
    }
    if (depositPercent < 0 || depositPercent > 100) {
      errors.depositPercent = "Tỷ lệ cọc phải trong khoảng 0% - 100%"
    }
    if (otherSurchargeVnd !== "" && otherSurchargeVnd < 0) {
      errors.otherSurchargeVnd = "Phụ phí khác không được là số âm"
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function tinhGia() {
    if (!validate()) return

    const config: PricingConfig = {
      partnerTierBonus,
      surchargeGroups,
      optimalPriceRatio,
    }
    const result = quotePrice(
      {
        effectiveCostVnd: Number(costVnd) || 0,
        partnerTier: partnerTier || Object.keys(partnerTierBonus)[0] || "",
        selectedSurcharges,
        otherSurchargeVnd: Number(otherSurchargeVnd) || 0,
        listPriceVnd: Number(listPriceVnd) || 0,
        closedPriceVnd: closedPriceVnd === "" ? null : Number(closedPriceVnd),
        depositPercent,
      },
      config
    )
    setKetQua(result)
    setViPhamBatBien(checkPriceInvariants(result))

    const guard = checkPriceGuard({
      code: "TAM_TINH",
      priceVnd: result.listPriceVnd,
      limits: {
        has: floorRatio > 0 || ceilingRatio > 0,
        floorVnd: result.costVnd * floorRatio,
        ceilingVnd: result.costVnd * ceilingRatio,
      },
    })
    setCanhBaoSanTran(guard.warning)
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-body-sm font-bold text-text">Máy tính giá sản phẩm</div>

      <div className="flex flex-col gap-3">
        {/* Bộ chuyển đổi kích thước Size S - M - L - XL (SP-12, 13, 14) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold text-text">Kích thước sản phẩm (Size S - M - L - XL)</span>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border">
            {(Object.keys(SIZE_VARIANT_CONFIGS) as ProductSizeKey[]).map((key) => (
              <Button
                key={key}
                type="button"
                variant={selectedSize === key ? "primary" : "ghost"}
                size="sm"
                onClick={() => handleSelectSize(key)}
                className="flex-1 py-1.5 h-auto text-caption font-semibold"
              >
                {SIZE_VARIANT_CONFIGS[key].shortLabel}
              </Button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          <span>Giá vốn (VNĐ) *</span>
          <Input
            type="number"
            min={0}
            placeholder="VD: 250000"
            value={costVnd}
            onChange={(e) => {
              setCostVnd(e.target.value === "" ? "" : Number(e.target.value))
              if (fieldErrors.costVnd) setFieldErrors((prev) => ({ ...prev, costVnd: "" }))
            }}
            hasError={Boolean(fieldErrors.costVnd)}
          />
          {fieldErrors.costVnd && (
            <span className="flex items-center gap-1 text-caption text-danger">
              <AlertCircle size={12} /> {fieldErrors.costVnd}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          <span>Hạng đối tác xưởng</span>
          <NativeSelect
            value={partnerTier}
            onChange={(e) => setPartnerTier(e.target.value)}
          >
            {Object.keys(partnerTierBonus).map((tier) => (
              <option key={tier} value={tier}>
                {tier} (+{Math.round((partnerTierBonus[tier] ?? 0) * 100)}%)
              </option>
            ))}
          </NativeSelect>
        </label>

        {surchargeGroups.map((group) => (
          <label key={group.id} className="flex flex-col gap-1 text-caption font-medium text-text">
            <span>{group.name}</span>
            <NativeSelect
              value={selectedSurcharges[group.id] ?? 0}
              onChange={(e) =>
                setSelectedSurcharges((cur) => ({ ...cur, [group.id]: Number(e.target.value) }))
              }
            >
              {group.options.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label} ({opt.value > 0 ? `+${formatVnd(opt.value)}` : "0 đ"})
                </option>
              ))}
            </NativeSelect>
          </label>
        ))}

        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          <span>Phụ phí khác (VNĐ, không bắt buộc)</span>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={otherSurchargeVnd}
            onChange={(e) => {
              setOtherSurchargeVnd(e.target.value === "" ? "" : Number(e.target.value))
              if (fieldErrors.otherSurchargeVnd) setFieldErrors((prev) => ({ ...prev, otherSurchargeVnd: "" }))
            }}
            hasError={Boolean(fieldErrors.otherSurchargeVnd)}
          />
          {fieldErrors.otherSurchargeVnd && (
            <span className="flex items-center gap-1 text-caption text-danger">
              <AlertCircle size={12} /> {fieldErrors.otherSurchargeVnd}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          <span>Giá niêm yết dự kiến (VNĐ) *</span>
          <Input
            type="number"
            min={0}
            placeholder="VD: 550000"
            value={listPriceVnd}
            onChange={(e) => {
              setListPriceVnd(e.target.value === "" ? "" : Number(e.target.value))
              if (fieldErrors.listPriceVnd) setFieldErrors((prev) => ({ ...prev, listPriceVnd: "" }))
            }}
            hasError={Boolean(fieldErrors.listPriceVnd)}
          />
          {fieldErrors.listPriceVnd && (
            <span className="flex items-center gap-1 text-caption text-danger">
              <AlertCircle size={12} /> {fieldErrors.listPriceVnd}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          <span>Giá chốt tay cho khách (VNĐ, tuỳ chọn — thay thế giá niêm yết khi chốt đơn)</span>
          <Input
            type="number"
            min={0}
            placeholder="Để trống nếu áp dụng giá niêm yết"
            value={closedPriceVnd}
            onChange={(e) => {
              setClosedPriceVnd(e.target.value === "" ? "" : Number(e.target.value))
              if (fieldErrors.closedPriceVnd) setFieldErrors((prev) => ({ ...prev, closedPriceVnd: "" }))
            }}
            hasError={Boolean(fieldErrors.closedPriceVnd)}
          />
          {fieldErrors.closedPriceVnd && (
            <span className="flex items-center gap-1 text-caption text-danger">
              <AlertCircle size={12} /> {fieldErrors.closedPriceVnd}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          <span>Tỷ lệ đặt cọc yêu cầu (%)</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={depositPercent}
            onChange={(e) => {
              setDepositPercent(Number(e.target.value))
              if (fieldErrors.depositPercent) setFieldErrors((prev) => ({ ...prev, depositPercent: "" }))
            }}
            hasError={Boolean(fieldErrors.depositPercent)}
          />
          {fieldErrors.depositPercent && (
            <span className="flex items-center gap-1 text-caption text-danger">
              <AlertCircle size={12} /> {fieldErrors.depositPercent}
            </span>
          )}
        </label>

        <Button type="button" onClick={tinhGia} className="min-h-11 w-full">
          Tính toán đối soát giá
        </Button>
      </div>

      {ketQua && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-surface-alt p-3.5 text-body-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Giá vốn hiệu lực (đã làm tròn)</span>
            <span className="font-semibold text-text">{formatVnd(ketQua.costVnd)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Thưởng đối tác theo hạng ({ketQua.tierBonusRatioPercent}%)</span>
            <span className="font-semibold text-text">{formatVnd(ketQua.tierBonusVnd)}</span>
          </div>
          {ketQua.surcharges.map((s) => (
            <div key={s.label} className="flex justify-between">
              <span className="text-text-muted">{s.label}</span>
              <span className="font-semibold text-text">{formatVnd(s.amountVnd)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-title-sm">
            <span className="font-bold text-text">Tổng tiệm nhận</span>
            <span className="font-extrabold text-primary">{formatVnd(ketQua.totalVnd)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Giá tối ưu đề xuất ({ketQua.optimalPriceRatioPercent}% giá bán)</span>
            <span className="font-semibold text-text">{formatVnd(ketQua.optimalPriceVnd)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Khoản cọc ({ketQua.depositPercent}%) / Còn lại</span>
            <span className="font-semibold text-text">
              {formatVnd(ketQua.depositVnd)} / {formatVnd(ketQua.remainingVnd)}
            </span>
          </div>

          {canhBaoSanTran && (
            <div className="mt-1 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-bg p-2.5 text-caption text-warning-text">
              <Info size={15} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 leading-snug">{canhBaoSanTran}</div>
            </div>
          )}
          {viPhamBatBien.length > 0 && (
            <div className="mt-1 flex flex-col gap-1 rounded-xl border border-danger/30 bg-danger-bg p-2.5 text-caption text-danger">
              <div className="font-bold">Lỗi bất biến số học:</div>
              {viPhamBatBien.map((v) => (
                <div key={v}>• {v}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
