"use client"

import { useI18n } from "@/lib/i18n"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useSession } from "@/lib/session"
import type { SurchargeGroup } from "@/modules/products/domain/pricing"
import { PricingCalculatorCard } from "./pricing-calculator-card"
import { PricingRulesConfigCard } from "./pricing-rules-config-card"
import { CustomerTierPricingCard } from "./customer-tier-pricing-card"
import { PageHeader } from "@/components/ui/page-header"

type FloorCeilingRatio = { floorRatio: number; ceilingRatio: number }

type PricingRulesResponse = {
  branch_id: string | null
  partner_tier_bonus: Record<string, number>
  surcharge_groups: SurchargeGroup[]
  optimal_price_ratio: number
  floor_ceiling_ratio: FloorCeilingRatio
}

export default function GiaPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { can } = useSession()
  const coQuyenSua = can("L6")

  const [dangTai, setDangTai] = useState(true)
  const [loi, setLoi] = useState<string | null>(null)
  const [rules, setRules] = useState<PricingRulesResponse | null>(null)

  const napLai = useCallback(async (isCancelled?: () => boolean) => {
    try {
      const res = await fetch("/api/v1/pricing-rules")
      if (res.status === 401) {
        router.push("/dang-nhap")
        return
      }
      if (!res.ok) throw new Error(`Không tải được cấu hình giá (${res.status})`)
      const data = (await res.json()) as PricingRulesResponse
      if (!isCancelled?.()) {
        setRules(data)
      }
    } catch (e) {
      if (!isCancelled?.()) {
        setLoi(e instanceof Error ? e.message : "Không tải được cấu hình giá")
      }
    } finally {
      if (!isCancelled?.()) {
        setDangTai(false)
      }
    }
  }, [router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      await napLai(() => cancelled)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [napLai])

  if (dangTai) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <PageHeader className="flex-shrink-0 border-b border-border bg-surface px-4 py-4" title="Tính giá sản phẩm" />
        <div className="p-4">
          <SkeletonBlock lines={5} label="Đang tải cấu hình giá" />
        </div>
      </div>
    )
  }

  if (loi || !rules) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-body-sm font-semibold text-danger">
          {loi ?? "Không tải được cấu hình giá"}
        </div>
        <Button variant="outline" size="sm" onClick={() => napLai()}>
          <RefreshCw size={14} className="mr-1.5" /> Thử lại
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Giải thích trong "?" (OPERATING_PRINCIPLES §6.1) */}
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        title="Tính giá sản phẩm"
        tip="Đối soát giá bán, hoa hồng xưởng và quy tắc giá sàn, giá trần."
        actions={
          <Button variant="ghost" onClick={() => router.push("/")} className="flex items-center gap-1.5">
            <ArrowLeft size={16} /> Quay về Trang chủ
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        <p className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-body-sm text-text">
          Muốn giá vốn tự cộng từ công thức và đơn giá nguyên liệu?{" "}
          <Link href="/tinh-gia/gia-von" className="font-semibold text-primary underline-offset-2 hover:underline">
            Mở Giá vốn &amp; định giá
          </Link>
        </p>
        {/* Máy tính giá */}
        <PricingCalculatorCard
          partnerTierBonus={rules.partner_tier_bonus}
          surchargeGroups={rules.surcharge_groups}
          optimalPriceRatio={rules.optimal_price_ratio}
          floorRatio={rules.floor_ceiling_ratio.floorRatio}
          ceilingRatio={rules.floor_ceiling_ratio.ceilingRatio}
        />

        {/* Cấu hình quy tắc giá */}
        <PricingRulesConfigCard
          initialTierRows={Object.entries(rules.partner_tier_bonus).map(([name, ratio]) => ({
            name,
            percent: Math.round(ratio * 1000) / 10,
          }))}
          initialOptimalPercent={Math.round(rules.optimal_price_ratio * 1000) / 10}
          initialFloorRatio={rules.floor_ceiling_ratio.floorRatio}
          initialCeilingRatio={rules.floor_ceiling_ratio.ceilingRatio}
          branchId={rules.branch_id}
          canEdit={coQuyenSua}
          onSaved={(updated) => {
            setRules((cur) =>
              cur
                ? {
                    ...cur,
                    partner_tier_bonus: updated.partnerTierBonus,
                    optimal_price_ratio: updated.optimalPriceRatio,
                    floor_ceiling_ratio: {
                      floorRatio: updated.floorRatio,
                      ceilingRatio: updated.ceilingRatio,
                    },
                  }
                : cur
            )
          }}
        />

        <CustomerTierPricingCard canEdit={coQuyenSua} />
      </div>
    </div>
  )
}
