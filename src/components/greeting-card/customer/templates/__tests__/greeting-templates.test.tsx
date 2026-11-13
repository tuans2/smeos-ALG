import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { GreetingTemplateRenderer } from "../greeting-template-renderer"
import { TemplateSelectorSplitPane } from "../template-selector-split-pane"
import {
  GREETING_TEMPLATES,
  GREETING_TEMPLATE_LIST,
  SWIPE_12_STYLES,
  type GreetingTemplateId,
} from "@/modules/greeting-card/domain/greeting-template-registry"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"

const mockProducts: GreetingCatalogProduct[] = [
  {
    id: "prod-1",
    name: "Bó Hoa Hồng Red Naomi",
    code: "HH-01",
    price: 850000,
    imageUrl: "https://example.com/flower1.jpg",
    description: "Hoa hồng đỏ nhập khẩu Ecuador kết hợp lá bạc",
    flowersSummary: "10 cành hồng Ecuador, lá bạc, hoa baby",
    style: "Sang Trọng",
    meaning: "Tình yêu mãnh liệt và thủy chung",
    sortOrder: 1,
  },
  {
    id: "prod-2",
    name: "Giỏ Hoa Khai Trương Phát Tài",
    code: "HH-02",
    price: 1500000,
    imageUrl: "https://example.com/flower2.jpg",
    description: "Giỏ hoa tông cam vàng rực rỡ",
    flowersSummary: "Hồng cam Spirit, đồng tiền vàng, lan vũ nữ",
    style: "Hiện Đại",
    meaning: "Vạn sự như ý, buôn may bán đắt",
    sortOrder: 2,
  },
]

describe("Greeting Card 12 Visual Swipe Styles & Engine Tests", () => {
  const swipe12TemplateIds: GreetingTemplateId[] = [
    "editorial-luxury",
    "minimal-clean",
    "cinematic-dark",
    "romantic-pastel",
    "botanical-frame",
    "glassmorphism",
    "real-life-shop",
    "real-life-daylight",
    "real-life-in-store",
    "real-life-handheld",
    "lifestyle-context",
    "mixed-media",
  ]

  const auxiliaryTemplateIds: GreetingTemplateId[] = [
    "enterprise-luxury",
    "swipe-classic",
    "lookbook-grid",
    "editorial-story",
    "video-reels",
    "occasion-budget-quiz",
    "event-moodboard",
    "split-compare",
  ]

  it("should have all 12 visual swipe styles defined in registry", () => {
    expect(SWIPE_12_STYLES).toHaveLength(12)
    for (const id of swipe12TemplateIds) {
      expect(GREETING_TEMPLATES[id]).toBeDefined()
      expect(GREETING_TEMPLATES[id].category).toBe("swipe-style")
    }
  })

  it("should have total templates registered correctly", () => {
    expect(GREETING_TEMPLATE_LIST.length).toBeGreaterThanOrEqual(18)
  })

  // Test rendering of all 12 styles
  swipe12TemplateIds.forEach((templateId) => {
    it(`should render visual swipe style '${templateId}' without crash and display product details`, () => {
      const html = renderToStaticMarkup(
        createElement(GreetingTemplateRenderer, {
          templateId,
          products: mockProducts,
          catalogName: "Bộ Sưu Tập Mùa Thu",
          selectedProductId: null,
          onSelectProduct: () => {},
          showTemplateSwitcher: true,
        })
      )

      expect(html).toContain("Bó Hoa Hồng Red Naomi")
      expect(html).toContain("Đặt mẫu này")
      expect(html).toContain("850.000")
      // Kiểu Facebook Story (PO 07/10/2026): mẫu trước/sau, nút ⓘ chi tiết, nút thả tim; bỏ THÍCH/BỎ QUA kiểu Tinder
      expect(html).toContain("Mẫu trước")
      expect(html).toContain("Mẫu sau")
      expect(html).toContain("Xem chi tiết")
      expect(html).toContain("Thả tim")
      expect(html).not.toContain("BỎ QUA")
      expect(html).not.toContain("Hoàn tác")
      // Ảnh sản phẩm luôn hiện trọn (không cắt mép)
      expect(html).toMatch(/<img[^>]*object-contain/)
      expect(html).not.toMatch(/<img[^>]*object-cover/)
    })
  })

  // Test rendering of auxiliary decks
  auxiliaryTemplateIds.forEach((templateId) => {
    it(`should render auxiliary template '${templateId}' without crash`, () => {
      const html = renderToStaticMarkup(
        createElement(GreetingTemplateRenderer, {
          templateId,
          products: mockProducts,
          catalogName: "Bộ Sưu Tập Bổ Trợ",
          selectedProductId: null,
          onSelectProduct: () => {},
          showTemplateSwitcher: false,
        })
      )

      expect(html).toContain("Bó Hoa Hồng Red Naomi")
      // Mỗi mẫu đều có đường đặt hoa: nút trực tiếp hoặc chạm ảnh để mở chi tiết
      expect(html).toMatch(/Đặt mẫu|Chọn mẫu này|aria-label="Xem Bó Hoa Hồng Red Naomi/)
      expect(html).not.toMatch(/<img[^>]*object-cover/)
    })
  })

  it("should render graceful empty state when products array is empty for each style", () => {
    for (const templateId of swipe12TemplateIds) {
      const html = renderToStaticMarkup(
        createElement(GreetingTemplateRenderer, {
          templateId,
          products: [],
          catalogName: "Bộ Sưu Tập Trống",
          selectedProductId: null,
          onSelectProduct: () => {},
          showTemplateSwitcher: false,
        })
      )

      expect(html).toContain("chưa có sản phẩm")
    }
  })

  it("should fallback gracefully to editorial-luxury when given invalid templateId", () => {
    const html = renderToStaticMarkup(
      createElement(GreetingTemplateRenderer, {
        templateId: "invalid-template-xyz",
        products: mockProducts,
        catalogName: "Bộ Sưu Tập Fallback",
        selectedProductId: null,
        onSelectProduct: () => {},
        showTemplateSwitcher: false,
      })
    )

    expect(html).toContain("Bó Hoa Hồng Red Naomi")
    expect(html).toContain("Đặt mẫu này")
  })

  it("trình chọn mẫu dựng đúng giao diện thật của mẫu đang chọn trong khung xem trước", () => {
    for (const templateId of ["cinematic-dark", "lookbook-grid"] as const) {
      const html = renderToStaticMarkup(
        createElement(TemplateSelectorSplitPane, {
          selectedTemplateId: templateId,
          onSelectTemplate: () => {},
          previewProducts: mockProducts,
        })
      )
      for (const tpl of SWIPE_12_STYLES) expect(html).toContain(tpl.name.replace(/&/g, "&amp;"))
      expect(html).toContain("Bó Hoa Hồng Red Naomi")
      // Khung xem trước là giao diện thật: thẻ vuốt có nút Thích, lookbook có ô lọc giá
      expect(html).toContain(templateId === "cinematic-dark" ? "Thả tim" : "Lookbook")
    }
  })
})
