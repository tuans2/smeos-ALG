/**
 * PRODUCT & INVENTORY 4-TIER HIERARCHY SSOT CONTRACT
 *
 * Định nghĩa chuẩn hóa phân cấp dữ liệu Sản phẩm & Kho cho 4 tầng của ALG:
 * - Tầng 1 (SaaS Mother): Thu thập & giám sát toàn diện dữ liệu sản phẩm/kho toàn nền tảng.
 * - Tầng 2 (SaaS Ngành): Thu thập dữ liệu & chuẩn hóa theo từng ngành hàng (Taxonomy, BOM, Mẫu).
 * - Tầng 3 (ChainOS): Thu thập, quản lý dữ liệu chuỗi (bộ sưu tập chuỗi + chi nhánh/đối tác trực thuộc).
 * - Tầng 4 (StoreOS): Quản lý trực tiếp sản phẩm, giá bán, BOM và kho nguyên liệu của tiệm.
 */

export type ProductTierLevel = 1 | 2 | 3 | 4

export interface ProductTierDefinition {
  level: ProductTierLevel
  tierName: string
  scope: string
  primaryObjective: string
  productGroupKey: string
  productGroupLabel: string
  inventoryScope: string
  keyEndpoints: {
    catalogHref: string
    inventoryHref?: string
    pricingHref?: string
  }
}

export const PRODUCT_INVENTORY_4TIER_SSOT: Record<ProductTierLevel, ProductTierDefinition> = {
  1: {
    level: 1,
    tierName: "SaaS Mother",
    scope: "Platform-wide (Cross-tier 2, 3, 4)",
    primaryObjective: "Thu thập toàn bộ dữ liệu về sản phẩm và kho của các tầng 2-3-4 phục vụ giám sát toàn diện",
    productGroupKey: "san-pham-kho-platform",
    productGroupLabel: "SẢN PHẨM & KHO",
    inventoryScope: "Tổng hợp toàn bộ tài nguyên lưu trữ, dữ liệu và mức tiêu thụ tài nguyên của các tenant",
    keyEndpoints: {
      catalogHref: "/van-hanh/du-lieu",
      inventoryHref: "/van-hanh/truong-du-lieu",
    },
  },
  2: {
    level: 2,
    tierName: "SaaS Ngành",
    scope: "Industry Ecosystem",
    primaryObjective: "Thu thập dữ liệu và chuẩn hóa danh mục, taxonomy, định lượng mẫu theo từng ngành",
    productGroupKey: "san-pham-nganh",
    productGroupLabel: "SẢN PHẨM & QUY CHUẨN",
    inventoryScope: "Chuẩn hóa đơn vị đo, vai trò linh kiện BOM và trường thuộc tính động theo ngành",
    keyEndpoints: {
      catalogHref: "/san-pham",
      pricingHref: "/cai-dat",
    },
  },
  3: {
    level: 3,
    tierName: "ChainOS",
    scope: "Brand Network & Branches",
    primaryObjective: "Thu thập, quản lý dữ liệu của riêng chuỗi (bản thân chuỗi và các cửa hàng/đối tác thuộc chuỗi)",
    productGroupKey: "san-pham-kho-chuoi",
    productGroupLabel: "03 · SẢN PHẨM & KHO CHUỖI",
    inventoryScope: "Giám sát khả dụng, tồn kho nguyên liệu và năng lực sản xuất tổng hợp từ các chi nhánh",
    keyEndpoints: {
      catalogHref: "/san-pham",
      inventoryHref: "/san-pham/kha-dung",
      pricingHref: "/san-pham",
    },
  },
  4: {
    level: 4,
    tierName: "StoreOS",
    scope: "Individual Store / Workshop",
    primaryObjective: "Quản lý sản phẩm, định giá, BOM và kho nguyên liệu trực tiếp tại cửa hàng",
    productGroupKey: "san-pham",
    productGroupLabel: "03 · SẢN PHẨM",
    inventoryScope: "Kho tài nguyên, nguyên vật liệu thực tế, khả dụng ngày và tính giá thành chi tiết",
    keyEndpoints: {
      catalogHref: "/san-pham",
      inventoryHref: "/kho-du-lieu",
      pricingHref: "/gia",
    },
  },
}
