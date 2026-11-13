"use client"

import { useState, useEffect } from "react"
import { catalogItemToProduct } from "@/modules/greeting-card/domain/catalog-product-price"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { useI18n } from "@/lib/i18n"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

/** Sản phẩm mẫu cho khung xem trước khi tiệm chưa có sản phẩm — không ảnh kho (PO 06/11/2026), hiện ảnh giữ chỗ. */
const SAMPLE_PRODUCTS_BY_INDUSTRY: Record<string, GreetingCatalogProduct[]> = {
  HOMESTAY: [
    {
      id: "sample-homestay-1",
      name: "Phòng Studio Deluxe Ban Công View Thung Lũng",
      code: "ST-01",
      price: 850000,
      imageUrl: null,
      description: "Không gian phòng thoáng đãng đón trọn ánh nắng sớm, ban công rộng view núi và thung lũng mây mộng mơ.",
      flowersSummary: "1 Giường đôi Queen, Bồn tắm ngâm thảo mộc, Bữa sáng địa phương, Wi-Fi tốc độ cao",
      style: "Thư Giãn",
      meaning: "Tận hưởng không gian nghỉ dưỡng bình yên và tái tạo năng lượng",
      sortOrder: 1,
    },
    {
      id: "sample-homestay-2",
      name: "Villa Sân Vườn Tiệc Nướng BBQ Hoàng Hôn",
      code: "VL-02",
      price: 2500000,
      imageUrl: null,
      description: "Nguyên căn 3 phòng ngủ tiện nghi chuẩn gia đình, bếp riêng và sân vườn tiệc nướng chill ngắm hoàng hôn.",
      flowersSummary: "3 Phòng ngủ lớn, Bếp nấu trang bị đầy đủ, Sân BBQ ngoài trời, Hồ bơi thư giãn",
      style: "Ấm Cúng",
      meaning: "Gắn kết kỷ niệm trọn vẹn bên gia đình và những người thân yêu",
      sortOrder: 2,
    },
  ],
  FASHION: [
    {
      id: "sample-fashion-1",
      name: "Đầm Lụa Tơ Tằm Cổ Yếm Dáng Suông",
      code: "DR-01",
      price: 1250000,
      imageUrl: null,
      description: "Chất liệu lụa satin tơ tằm dệt cao cấp, đường may tinh xảo tôn vinh vóc dáng người phụ nữ hiện đại.",
      flowersSummary: "Lụa tơ tằm cao cấp, lót habutai mềm mát, cúc ngọc trai mạ vàng",
      style: "Thanh Lịch",
      meaning: "Khẳng định khí chất và sự tự tin tinh tế trong mọi buổi tiệc",
      sortOrder: 1,
    },
  ],
  FNB: [
    {
      id: "sample-fnb-1",
      name: "Set Bò Fuji Nướng Sốt Tiêu Đen & Salad",
      code: "FB-01",
      price: 320000,
      imageUrl: null,
      description: "Thịt bò nướng mềm mọng nước hòa quyện sốt tiêu đen đậm đà kèm rau rocket tươi giòn.",
      flowersSummary: "Bò thượng hạng 200g, Sốt tiêu đen đặc chế, Salad hữu cơ, Bánh mì bơ tỏi",
      style: "Đậm Đà",
      meaning: "Đánh thức mọi giác quan qua trải nghiệm ẩm thực thượng lưu",
      sortOrder: 1,
    },
  ],
  FLORAL: [
    {
      id: "sample-1",
      name: "Sản Phẩm Hồng Red Naomi Ecuador",
      code: "HH-01",
      price: 850000,
      imageUrl: null,
      description: "Hoa hồng đỏ nhung Ecuador tuyển chọn, phối cành lá bạc bạch đàn.",
      flowersSummary: "12 thành phần hồng Red Naomi Ecuador, lá bạc thơm, giấy gói lụa cao cấp",
      style: "Sang Trọng",
      meaning: "Tình yêu mãnh liệt, đam mê và sự gắn kết trường tồn",
      sortOrder: 1,
    },
    {
      id: "sample-2",
      name: "Giỏ Hoa Mẫu Đơn & Tulip Mùa Xuân",
      code: "GH-02",
      price: 1450000,
      imageUrl: null,
      description: "Mẫu đơn Sarah Bernhardt phối cùng tulip pastel Hà Lan trong giỏ mây tự nhiên.",
      flowersSummary: "5 bông mẫu đơn hồng, 10 cành tulip, hoa thanh liễu",
      style: "Thơ Mộng",
      meaning: "Sự thịnh vượng, thanh nhã và niềm vui trọn vẹn",
      sortOrder: 2,
    },
  ],
}

interface UseCatalogProductsResult {
  products: GreetingCatalogProduct[]
  isLoading: boolean
  isRealData: boolean
}

/**
 * Fetches real products for a catalog, falls back to sample data theo ngành.
 * Pass `previewProducts` to skip the network request entirely.
 */
export function useCatalogProducts(
  catalogId?: string | undefined,
  previewProducts?: GreetingCatalogProduct[] | undefined
): UseCatalogProductsResult {
  const [loadedProducts, setLoadedProducts] = useState<GreetingCatalogProduct[]>([])
  // Bộ sưu tập đã tải xong (thành công hoặc lỗi) — dùng để suy ra trạng thái đang tải
  const [settledFor, setSettledFor] = useState<string | null>(null)
  const hasPreview = Boolean(previewProducts && previewProducts.length > 0)
  const isLoading = Boolean(catalogId) && !hasPreview && settledFor !== catalogId

  useEffect(() => {
    if (hasPreview || !catalogId) return

    let cancelled = false
    fetch(`/api/v1/greeting-card/catalogs/${catalogId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.data?.items) return
        type RawItem = Parameters<typeof catalogItemToProduct>[0] & { product: { masterImageUrl?: string; driveLink?: string } }
        // Cùng hàm dựng với trang khách — khung xem trước hiện đúng những gì khách sẽ thấy
        const mapped: GreetingCatalogProduct[] = (json.data.items as RawItem[]).map((item) => {
          const prod = catalogItemToProduct(item, item.product.masterImageUrl ?? null)
          if (item.product.driveLink && !prod.driveLink) {
            prod.driveLink = item.product.driveLink
          }
          return prod
        })
        if (mapped.length > 0 && !cancelled) setLoadedProducts(mapped)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSettledFor(catalogId)
      })

    return () => {
      cancelled = true
    }
  }, [catalogId, hasPreview])

  const { industry } = useI18n()
  const activeIndustry = industry || getIndustryPlugin()
  const defaultIndustrySamples =
    SAMPLE_PRODUCTS_BY_INDUSTRY[activeIndustry.identity.key] ||
    SAMPLE_PRODUCTS_BY_INDUSTRY.FLORAL!

  const products =
    hasPreview && previewProducts
      ? previewProducts
      : loadedProducts.length > 0
        ? loadedProducts
        : previewProducts && previewProducts.length > 0
        ? previewProducts
        : defaultIndustrySamples

  return {
    products,
    isLoading,
    isRealData: hasPreview || loadedProducts.length > 0,
  }
}
