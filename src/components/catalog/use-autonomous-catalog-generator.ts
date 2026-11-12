import { useState } from "react"
import type { ProcessingStep } from "./journey-processing-state"
import type { SmartInputData } from "./smart-input-dropzone"
import type {
  CatalogProductItem,
  CatalogPageModel,
  StyleDefinition,
  BrandProfile,
  CatalogTemplateId,
  CatalogStyleId,
} from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { resolveCatalogBrief } from "@/modules/catalog-studio/use-cases/resolve-catalog-brief"
import type { CatalogProduct } from "./catalog-management-tab"

export interface AutonomousResult {
  /** `null` cho tới khi người dùng xem lại và bấm "Xuất bản" (R3) — AI không tự tạo link công khai. */
  publishedUrl: string | null
  publishedSlug: string | null
  name: string
  /** Dữ liệu gửi `POST /catalog-links` khi người dùng xác nhận xuất bản. */
  publishPayload: { name: string; description: string; filters: Record<string, unknown> }
  pages: CatalogPageModel[]
  style: StyleDefinition
  brand: BrandProfile
  products: CatalogProductItem[]
}

interface UseAutonomousCatalogGeneratorOptions {
  activeProducts: CatalogProduct[]
  sampleProductTerm: string
  currentShopName: string
  organizationId?: string | null | undefined
  business?: {
    phone?: string | null
    address?: string | null
  } | null
  onRefresh: () => void
}

export function useAutonomousCatalogGenerator({
  activeProducts,
  sampleProductTerm,
  currentShopName,
  organizationId,
  business,
  onRefresh,
}: UseAutonomousCatalogGeneratorOptions) {
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
  const [autonomousResult, setAutonomousResult] = useState<AutonomousResult | null>(null)
  // Lỗi thật khi xuất bản — không bao giờ hiện link giả (03c UX-016).
  const [publishError, setPublishError] = useState<string | null>(null)
  // AI chưa viết được lời giới thiệu → đang dùng lời mẫu, người dùng cần biết để chỉnh (UX-017).
  const [usedFallbackIntro, setUsedFallbackIntro] = useState(false)

  const [catalogAiSteps, setCatalogAiSteps] = useState<ProcessingStep[]>([
    { id: "analyze", label: "Phân tích yêu cầu & sự kiện", status: "idle" },
    { id: "select", label: `Tuyển chọn các ${sampleProductTerm} phù hợp nhất`, status: "idle" },
    { id: "intro", label: "Sinh lời chào & tiêu đề Catalog bằng AI", status: "idle" },
    { id: "layout", label: "Hoàn thiện cấu hình & Xuất bản Catalog tự động", status: "idle" },
  ])

  const executeGeneration = async (
    data: SmartInputData,
    templateId: CatalogTemplateId,
    styleId: CatalogStyleId
  ) => {
    setIsAiAnalyzing(true)
    setAutonomousResult(null)
    setPublishError(null)
    setUsedFallbackIntro(false)
    setCatalogAiSteps([
      { id: "analyze", label: "Phân tích yêu cầu & sự kiện", status: "running" },
      { id: "select", label: `Tuyển chọn các ${sampleProductTerm} phù hợp nhất`, status: "idle" },
      { id: "intro", label: "Sinh lời chào & tiêu đề Catalog bằng AI", status: "idle" },
      { id: "layout", label: "Hoàn thiện cấu hình & Xuất bản Catalog tự động", status: "idle" },
    ])

    try {
      const lower = data.userDirectives.toLowerCase()
      let matchedOccasion = ""
      if (lower.includes("20/10") || lower.includes("phụ nữ")) matchedOccasion = "20-10"
      else if (lower.includes("valentine") || lower.includes("14/2")) matchedOccasion = "valentine"
      else if (lower.includes("8/3")) matchedOccasion = "8-3"
      else if (lower.includes("khai trương")) matchedOccasion = "grand-opening"
      else if (lower.includes("sinh nhật")) matchedOccasion = "birthday"

      // Bước 1 xong ngay khi đọc xong yêu cầu — không chờ giả lập.
      setCatalogAiSteps((prev) =>
        prev.map((s) =>
          s.id === "analyze" ? { ...s, status: "succeeded" } : s.id === "select" ? { ...s, status: "running" } : s
        )
      )

      // Ưu tiên các sản phẩm người dùng đã chủ động chọn từ kho ở Step trước
      let chosenProducts: CatalogProduct[] = []
      if (data.selectedProducts && data.selectedProducts.length > 0) {
        chosenProducts = data.selectedProducts
      } else if (matchedOccasion) {
        chosenProducts = activeProducts.filter((p) => p.occasion_code === matchedOccasion)
      }
      if (chosenProducts.length === 0) {
        chosenProducts = activeProducts.slice(0, 6)
      }
      const chosenIds = chosenProducts.map((p) => p.id)

      setCatalogAiSteps((prev) =>
        prev.map((s) =>
          s.id === "select" ? { ...s, status: "succeeded" } : s.id === "intro" ? { ...s, status: "running" } : s
        )
      )

      let generatedName = `Bộ sưu tập ${sampleProductTerm} tuyển chọn`
      if (matchedOccasion) {
        const occName = matchedOccasion === "20-10" ? "Ngày Phụ Nữ 20/10" : matchedOccasion
        generatedName = `Bộ sưu tập ${sampleProductTerm} ${occName}`
      } else {
        // Bỏ phần "Mẫu kho: …" do ô nhập tự ghép; chỉ thêm "…" khi thật sự cắt bớt.
        const note = (data.userDirectives ?? "").replace(/\(?Mẫu kho: [^)]*\)?/g, "").trim()
        if (note) generatedName = `Bộ sưu tập: ${note.length > 40 ? `${note.slice(0, 40).trimEnd()}…` : note}`
      }

      let generatedDesc = `${chosenIds.length} ${sampleProductTerm} từ ${currentShopName} — xem ảnh, chọn mẫu và nhắn tiệm để đặt.`
      let aiIntroOk = false
      try {
        const res = await fetch("/api/v1/content-engine/catalog-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionName: generatedName,
            productCount: chosenIds.length,
            productIds: chosenIds,
            styleVariant: "EDITORIAL_LOOKBOOK",
          }),
        })
        if (res.ok) {
          const json = await res.json()
          if (json.data?.description) {
            generatedDesc = json.data.description
            aiIntroOk = true
          }
        }
      } catch {
        // Mạng lỗi: dùng lời giới thiệu mẫu và báo cho người dùng bên dưới.
      }
      setUsedFallbackIntro(!aiIntroOk)

      setCatalogAiSteps((prev) =>
        prev.map((s) =>
          s.id === "intro" ? { ...s, status: "succeeded" } : s.id === "layout" ? { ...s, status: "running" } : s
        )
      )

      // Bước 4: chỉ dựng bản xem trước — link công khai tạo ở `publish()` sau khi người dùng xác nhận.
      const publishPayload = {
        name: generatedName,
        description: generatedDesc,
        filters: { product_ids: chosenIds, style_variant: "EDITORIAL_LOOKBOOK", template_id: templateId, style_id: styleId },
      }

      const studioProducts: CatalogProductItem[] = chosenProducts.map((p, idx) => ({
        productId: p.id,
        name: p.name,
        code: p.code || p.id,
        category: p.category ?? null,
        primaryImage: p.imageUrl || null,
        price: p.price ?? null,
        currency: "VND",
        sortOrder: idx + 1,
        status: p.status,
      }))

      const brandProfile: BrandProfile = {
        brandId: organizationId || "brand",
        name: currentShopName,
        slogan: "Bộ sưu tập tuyển chọn",
        brandColors: { primary: "#9A3412" },
        contacts: {
          phone: business?.phone || null,
          hotline: business?.phone || null,
          zalo: business?.phone || null,
          address: business?.address || null,
        },
      }

      const resolved = resolveCatalogBrief(
        {
          catalogId: `draft-${Date.now()}`,
          title: generatedName,
          purpose: "COLLECTION",
          audience: "CONSUMER",
          language: "vi-VN",
          styleId,
          templateId,
          pageSize: "A4_PORTRAIT",
          outputProfile: "DIGITAL_PDF",
          brandId: brandProfile.brandId,
          productIds: studioProducts.map((p) => p.productId),
        },
        brandProfile,
        studioProducts
      )

      setCatalogAiSteps((prev) => prev.map((s) => (s.id === "layout" ? { ...s, status: "succeeded" } : s)))

      setAutonomousResult({
        publishedUrl: null,
        publishedSlug: null,
        name: generatedName,
        publishPayload,
        pages: resolved.pages,
        style: resolved.style,
        brand: resolved.brand,
        products: studioProducts,
      })
      onRefresh()
    } finally {
      setIsAiAnalyzing(false)
    }
  }

  /** Xuất bản catalog đã xem lại (gọi sau `ConfirmDialog`). */
  const publish = async () => {
    if (!autonomousResult) return
    setPublishError(null)
    const res = await fetch("/api/v1/catalog-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(autonomousResult.publishPayload),
    }).catch(() => null)
    const json = res ? await res.json().catch(() => null) : null
    const slug: string | undefined = res?.ok ? json?.data?.slug : undefined
    if (!slug) {
      setPublishError(json?.error?.message || "Chưa xuất bản được catalog nên chưa có link để gửi khách. Hãy thử lại.")
      return
    }
    setAutonomousResult({ ...autonomousResult, publishedSlug: slug, publishedUrl: `${window.location.origin}/c/${slug}` })
    onRefresh()
  }

  return {
    publish,
    isAiAnalyzing,
    autonomousResult,
    setAutonomousResult,
    publishError,
    clearPublishError: () => setPublishError(null),
    usedFallbackIntro,
    catalogAiSteps,
    executeGeneration,
  }
}
