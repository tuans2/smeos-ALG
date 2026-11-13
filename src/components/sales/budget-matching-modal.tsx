"use client"

import React, { useState, useMemo } from "react"
import { Search } from "@/components/ui/icon-set/search"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Filter } from "@/components/ui/icon-set/filter"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { usePriceBudgets } from "@/components/catalog/use-price-budgets"
import { useI18n } from "@/lib/i18n"
import {
  matchProductsByBudget,
  type BudgetMatchCriteria,
  type ProductMatchCandidate,
  type MatchScoredProduct,
} from "@/modules/products/domain/budget-flower-matcher"

export interface BudgetMatchingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectProduct?: ((product: ProductMatchCandidate) => void) | undefined
  customCandidates?: ProductMatchCandidate[] | undefined
}

const SAMPLE_PRODUCTS: ProductMatchCandidate[] = [
  {
    id: "prod-1",
    code: "FL-801",
    name: "Sản Phẩm Hồng Ohara Tinh Khôi",
    sellingPriceVnd: 550_000,
    category: "Sản phẩm",
    colorTheme: "Hồng pastel",
    occasions: ["Sinh nhật", "Tình yêu", "Kỷ niệm"],
    style: "Sản phẩm tròn",
    highlightFlowers: ["Hồng Ohara", "Baby trắng", "Lá bạc"],
    isFeatured: true,
  },
  {
    id: "prod-2",
    code: "FL-802",
    name: "Giỏ Hoa Hướng Dương Rực Rỡ",
    sellingPriceVnd: 680_000,
    category: "Giỏ hoa",
    colorTheme: "Vàng ấm",
    occasions: ["Sinh nhật", "Khai trương", "Chúc mừng"],
    style: "Giỏ mây",
    highlightFlowers: ["Hướng dương Đà Lạt", "Cúc tana", "Hồng vàng"],
    isFeatured: true,
  },
  {
    id: "prod-3",
    code: "FL-803",
    name: "Sản Phẩm Hồng Juliet Hoàng Gia VIP",
    sellingPriceVnd: 850_000,
    category: "Sản phẩm",
    colorTheme: "Cam pastel",
    occasions: ["Sinh nhật", "Kỷ niệm", "Tình yêu"],
    style: "Sản phẩm dài",
    highlightFlowers: ["Hồng Juliet", "Lan hồ điệp", "Phi yến"],
    isFeatured: true,
  },
  {
    id: "prod-4",
    code: "FL-804",
    name: "Lẵng Hoa Khai Trương Thịnh Vượng",
    sellingPriceVnd: 1_250_000,
    category: "Lẵng hoa",
    colorTheme: "Đỏ vàng",
    occasions: ["Khai trương", "Khánh thành"],
    style: "Lẵng 1 tầng",
    highlightFlowers: ["Hồng môn đỏ", "Hướng dương", "Thiên điểu"],
    isFeatured: false,
  },
]

export function BudgetMatchingModal({
  open,
  onOpenChange,
  onSelectProduct,
  customCandidates,
}: BudgetMatchingModalProps) {
  const priceBudgets = usePriceBudgets()
  const [minPrice, setMinPrice] = useState<number>(500_000)
  const [maxPrice, setMaxPrice] = useState<number>(800_000)
  const [occasion, setOccasion] = useState<string>("Sinh nhật")
  const [recipient, setRecipient] = useState<string>("Bạn gái")
  const [colorTone, setColorTone] = useState<string>("")
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null)

  const candidates = customCandidates ?? SAMPLE_PRODUCTS

  const matchResult = useMemo(() => {
    const criteria: BudgetMatchCriteria = {
      minPriceVnd: minPrice,
      maxPriceVnd: maxPrice,
      occasion: occasion || undefined,
      recipient: recipient || undefined,
      colorTone: colorTone || undefined,
    }
    return matchProductsByBudget(candidates, criteria)
  }, [candidates, minPrice, maxPrice, occasion, recipient, colorTone])

  const handleCopyPitch = async (item: MatchScoredProduct) => {
    try {
      await navigator.clipboard.writeText(item.suggestedCustomerPitch)
      setCopiedPitchId(item.product.id)
      setTimeout(() => setCopiedPitchId(null), 2500)
    } catch {
      // Fallback
    }
  }

  const { ti } = useI18n()
  const sampleProd = ti("sampleProduct")
  const modalTitle = sampleProd ? `Tìm ${sampleProd.toLowerCase()} theo ngân sách & Gợi ý Upsell` : "Tìm theo ngân sách & Gợi ý Upsell"

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center justify-between gap-3 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-primary font-semibold">{modalTitle}</span>
            <Badge tone="accent" className="text-caption">Độ khớp AI</Badge>
          </div>
          <span className="text-caption text-muted">Tư vấn chốt đơn 1-chạm</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-caption text-muted">{matchResult.consultingSummary}</div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Bộ lọc ngân sách & Tiêu chí tư vấn */}
        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-caption font-semibold text-text flex items-center gap-1.5">
              <Filter size={14} className="text-primary" />
              Tiêu chí ngân sách & người nhận
            </div>
            <div className="flex items-center gap-1.5">
              {priceBudgets.map((qb) => (
                <Button variant="outline"
                  type="button"
                  key={qb.id}
                  onClick={() => {
                    setMinPrice(qb.min)
                    setMaxPrice(qb.max ?? qb.min * 2)
                  }}
                  className={`h-auto gap-0 px-2 py-0.5 rounded text-caption font-medium transition border cursor-pointer ${
                    minPrice === qb.min && maxPrice === (qb.max ?? qb.min * 2)
                      ? "border-primary bg-primary/10 text-primary font-bold hover:bg-primary/10"
                      : "border-border bg-surface text-muted hover:border-primary/30 hover:bg-surface"
                  }`}
                >
                  {qb.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-caption text-muted mb-1 font-medium">Ngân sách tối thiểu</label>
              <Input
                type="number"
                step={50000}
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value))}
                className="w-full h-8"
              />
            </div>
            <div>
              <label className="block text-caption text-muted mb-1 font-medium">Ngân sách tối đa</label>
              <Input
                type="number"
                step={50000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-8"
              />
            </div>
            <div>
              <label className="block text-caption text-muted mb-1 font-medium">Dịp tặng hoa</label>
              <Input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="vd: Sinh nhật, Kỷ niệm..."
                className="w-full h-8"
              />
            </div>
            <div>
              <label className="block text-caption text-muted mb-1 font-medium">Người nhận</label>
              <Input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="vd: Bạn gái, Mẹ, Sếp..."
                className="w-full h-8"
              />
            </div>
          </div>
        </div>

        {/* Danh sách sản phẩm phù hợp chuẩn ngân sách */}
        <div>
          <div className="text-caption font-bold text-text mb-2 flex items-center justify-between">
            <span>Sản phẩm chuẩn ngân sách ({matchResult.bestMatches.length} mẫu)</span>
            <span className="text-caption text-muted">Sắp xếp theo độ khớp cao nhất</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {matchResult.bestMatches.map((item) => (
              <div
                key={item.product.id}
                className="p-3 rounded-lg border border-border bg-surface hover:border-primary/40 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-body-sm text-text">{item.product.name}</div>
                  <Badge tone="success" className="text-caption">{item.matchScore}% khớp</Badge>
                </div>
                <div className="flex items-center justify-between text-caption">
                  <span className="font-bold text-primary text-body-sm">
                    {item.product.sellingPriceVnd.toLocaleString("vi-VN")} đ
                  </span>
                  <span className="text-muted">{item.product.colorTheme} · {item.product.style}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.matchReasons.map((r, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-surface-alt text-caption text-text-muted">
                      ✓ {r}
                    </span>
                  ))}
                </div>
                <div className="pt-1 flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-caption gap-1"
                    onClick={() => handleCopyPitch(item)}
                  >
                    {copiedPitchId === item.product.id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedPitchId === item.product.id ? "Đã chép câu tư vấn" : "Chép câu tư vấn"}
                  </Button>
                  {onSelectProduct && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-caption text-primary"
                      onClick={() => {
                        onSelectProduct(item.product)
                        onOpenChange(false)
                      }}
                    >
                      Báo giá ngay
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Khối gợi ý nâng cấp (Upsell Recommendations) */}
        {matchResult.upsellMatches.length > 0 && (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center gap-1.5 text-caption font-bold text-primary">
              <TrendingUp size={14} />
              Gợi ý nâng cấp sang trọng hơn (Upsell +10% - 25% ngân sách)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {matchResult.upsellMatches.map((item) => (
                <div key={item.product.id} className="p-2.5 rounded-lg border border-border bg-surface space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-body-sm text-text">{item.product.name}</span>
                    <Badge tone="accent" className="text-caption">Đề xuất Upsell</Badge>
                  </div>
                  <div className="text-caption font-bold text-primary">
                    {item.product.sellingPriceVnd.toLocaleString("vi-VN")} đ
                  </div>
                  <p className="text-caption text-muted italic line-clamp-2">{item.suggestedCustomerPitch}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-caption gap-1 mt-1"
                    onClick={() => handleCopyPitch(item)}
                  >
                    {copiedPitchId === item.product.id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedPitchId === item.product.id ? "Đã chép lời chào Upsell" : "Chép lời chào Upsell"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
