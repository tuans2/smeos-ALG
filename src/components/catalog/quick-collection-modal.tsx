"use client"

import React, { useState, useMemo } from "react"
import { Sparkles, Zap, RefreshCw } from "@/components/ui/icons"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  generateQuickCollection,
  type QuickCollectionCandidate,
  type QuickCollectionCriteria,
  type QuickCollectionResult,
} from "@/modules/catalog-links/domain/quick-collection-engine"
import { toInclusiveRange } from "@/lib/price-budgets"
import { usePriceBudgets } from "./use-price-budgets"
import { QuickCollectionCriteriaPanel, type QuickCollectionCriteriaState } from "./quick-collection-criteria"
import { QuickCollectionPreview } from "./quick-collection-preview"
import { QuickCollectionShare } from "./quick-collection-share"
import { useApi } from "@/components/greeting-card/greeting-api"
import {
  toQuickCollectionCandidate,
  type QuickCollectionProductRow,
} from "@/modules/catalog-links/domain/quick-collection-candidate"

export interface QuickCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: QuickCollectionCandidate[]
  onCreatedLink?: () => void
  onCreatedGreetingCatalog?: (catalogId: string) => void
}

export function QuickCollectionModal({
  open,
  onOpenChange,
  products,
  onCreatedLink,
  onCreatedGreetingCatalog,
}: QuickCollectionModalProps) {
  // Step: "criteria" -> "result"
  const [step, setStep] = useState<"criteria" | "result">("criteria")

  // Criteria States
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [occasion, setOccasion] = useState("")
  const [category, setCategory] = useState("")
  const [flowerType, setFlowerType] = useState("")
  const [colorTone, setColorTone] = useState("")
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([])
  const [priceMin, setPriceMin] = useState<number | undefined>(undefined)
  const [priceMax, setPriceMax] = useState<number | undefined>(undefined)
  const [productLimit, setProductLimit] = useState<number>(6)
  const [templateId, setTemplateId] = useState<string>("editorial-luxury")
  const [refreshSeed, setRefreshSeed] = useState<number>(0)

  const criteriaState: QuickCollectionCriteriaState = {
    customerName, customerPhone, occasion, category, flowerType, colorTone,
    selectedBudgetIds, priceMin, priceMax, productLimit, templateId,
  }
  const patchCriteria = (patch: Partial<QuickCollectionCriteriaState>) => {
    if ("customerName" in patch) setCustomerName(patch.customerName ?? "")
    if ("customerPhone" in patch) setCustomerPhone(patch.customerPhone ?? "")
    if ("occasion" in patch) setOccasion(patch.occasion ?? "")
    if ("category" in patch) setCategory(patch.category ?? "")
    if ("flowerType" in patch) setFlowerType(patch.flowerType ?? "")
    if ("colorTone" in patch) setColorTone(patch.colorTone ?? "")
    if ("selectedBudgetIds" in patch) setSelectedBudgetIds(patch.selectedBudgetIds ?? [])
    if ("priceMin" in patch) setPriceMin(patch.priceMin)
    if ("priceMax" in patch) setPriceMax(patch.priceMax)
    if ("productLimit" in patch) setProductLimit(patch.productLimit ?? 6)
    if ("templateId" in patch) setTemplateId(patch.templateId ?? "editorial-luxury")
  }

  // Creation State
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // `products` từ caller chỉ là 100 mẫu mới nhất → mẫu cũ hơn (vd. bó hoa) không bao giờ lọt vào.
  // Khi chọn dáng hoa thì hỏi thêm server theo category (giống picker "Thêm sản phẩm") rồi gộp lại.
  const categoryRes = useApi<{ data: QuickCollectionProductRow[] }>(
    open && category
      ? `/api/v1/products?limit=100&status=ACTIVE&category=${encodeURIComponent(category)}`
      : null
  )
  const candidates = useMemo<QuickCollectionCandidate[]>(() => {
    const extra = (categoryRes.data?.data ?? []).map(toQuickCollectionCandidate)
    if (extra.length === 0) return products
    const seen = new Set(products.map((p) => p.id))
    return [...products, ...extra.filter((p) => !seen.has(p.id))]
  }, [products, categoryRes.data])

  // Compute live match
  const priceBudgets = usePriceBudgets()
  const liveResult = useMemo<QuickCollectionResult>(() => {
    const selectedRanges = priceBudgets
      .filter((b) => selectedBudgetIds.includes(b.id))
      .map(toInclusiveRange)

    const criteria: QuickCollectionCriteria = {
      occasion: occasion || undefined,
      category: category || undefined,
      flowerType: flowerType || undefined,
      colorTone: colorTone || undefined,
      priceMin,
      priceMax,
      priceRanges: selectedRanges.length > 0 ? selectedRanges : undefined,
      productLimit,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      refreshSeed: refreshSeed > 0 ? refreshSeed : undefined,
    }
    return generateQuickCollection(candidates, criteria)
  }, [
    candidates,
    occasion,
    category,
    flowerType,
    colorTone,
    selectedBudgetIds,
    priceBudgets,
    priceMin,
    priceMax,
    productLimit,
    customerName,
    customerPhone,
    refreshSeed,
  ])

  // Handle Publish Link (< 2s)
  const handlePublish = async () => {
    setIsPublishing(true)
    setErrorMessage(null)

    try {
      const selectedIds = liveResult.selectedProducts.map((p) => p.id)
      const origin = typeof window !== "undefined" ? window.location.origin : ""

      // 1. Gọi trực tiếp API createSendLink với customCatalog và templateId đã chọn
      const sendLinkRes = await fetch("/api/v1/greeting-card/send-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          custom_catalog: {
            name: liveResult.generatedName,
            description: liveResult.personalizedGreeting || "Bộ sưu tập sản phẩm tuyển chọn theo yêu cầu.",
            filters: {
              templateId,
              occasion: occasion || undefined,
              category: category || undefined,
            },
            productIds: selectedIds,
          },
        }),
      })

      if (!sendLinkRes.ok) {
        const errJson = await sendLinkRes.json().catch(() => ({}))
        const errMsg = errJson?.error?.message || errJson?.message || "Không thể tạo link Bộ sưu tập riêng gửi khách."
        throw new Error(errMsg)
      }

      const sendLinkJson = await sendLinkRes.json().catch(() => ({}))
      const sendData = sendLinkJson.data
      if (!sendData?.shareUrl) {
        throw new Error("Hệ thống không sinh được link Bộ sưu tập riêng gửi khách.")
      }

      const fullSendUrl = `${origin}${sendData.shareUrl}`
      setPublishedUrl(fullSendUrl)
      setStep("result")
      if (onCreatedLink) onCreatedLink()
      if (sendData.catalogId && onCreatedGreetingCatalog) {
        onCreatedGreetingCatalog(sendData.catalogId)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo link")
    } finally {
      setIsPublishing(false)
    }
  }

  const resetAll = () => {
    setStep("criteria")
    setPublishedUrl(null)
    setErrorMessage(null)
    setRefreshSeed(0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetAll()
        onOpenChange(val)
      }}
      size="lg"
      title={
        <div className="flex items-center justify-between gap-3 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-title font-extrabold text-primary flex items-center gap-1.5">
              <Zap size={18} className="text-accent-text" />
              Tạo nhanh bộ sưu tập
            </span>
            <Badge tone="accent" className="text-caption">&lt; 10s</Badge>
          </div>
          <span className="text-caption text-text-muted">Xuất link gửi khách</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {step === "criteria" ? (
            <>
              <div className="text-caption text-text-muted">
                Đã chọn{" "}
                <span className="font-bold text-primary">
                  {liveResult.selectedProducts.length}
                </span>{" "}
                mẫu phù hợp
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePublish}
                  disabled={isPublishing || liveResult.selectedProducts.length === 0}
                  className="gap-1.5"
                >
                  <Sparkles size={14} />
                  {isPublishing ? "Đang tạo..." : "Tạo link gửi khách"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={resetAll} className="gap-1.5 text-caption">
                <RefreshCw size={14} /> Tạo thêm bộ khác
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Xong
              </Button>
            </>
          )}
        </div>
      }
    >
      {step === "criteria" ? (
        <div className="space-y-4 py-1">
          {errorMessage && (
            <div className="rounded-xl bg-destructive-bg px-4 py-2.5 text-caption text-destructive flex items-center gap-2">
              ⚠️ {errorMessage}
            </div>
          )}

          <QuickCollectionCriteriaPanel value={criteriaState} onChange={patchCriteria} />

          <QuickCollectionPreview
            liveResult={liveResult}
            hasFilter={Boolean(category || occasion || flowerType)}
            onReshuffle={() => setRefreshSeed((n) => n + 1)}
          />
        </div>
      ) : (
        /* KẾT QUẢ: XUẤT LINK & CHIA SẺ */
        <QuickCollectionShare publishedUrl={publishedUrl} customerMessage={liveResult.customerMessage} customerPhone={customerPhone} />
      )}
    </Dialog>
  )
}
