/**
 * Chia sản phẩm thành các trang PDF: lưới (L05), phân chương theo nhóm (L03) và chi tiết (L06).
 * Thuần — không Prisma, không mạng.
 */

import type { CatalogLayoutId, CatalogProductItem } from "./entities/catalog-studio.types"

export interface PlannedPage {
  layoutId: CatalogLayoutId
  title: string
  subtitle?: string
  heroImage?: string | null
  products: CatalogProductItem[]
}

export interface PlanOptions {
  itemsPerPage: number
  /** Mẫu có L03: tách chương theo nhóm sản phẩm khi có từ 2 nhóm trở lên */
  withDividers: boolean
  /** Mẫu có L06: thêm trang chi tiết cho vài mẫu đầu */
  withDetails: boolean
  collectionTitle: string
}

/** Số trang chi tiết tối đa — giữ PDF gọn, đủ cho các mẫu tiêu biểu. */
export const MAX_DETAIL_PAGES = 4

function gridPages(products: CatalogProductItem[], perPage: number, label: string, subtitle: string): PlannedPage[] {
  const total = Math.ceil(Math.max(1, products.length) / perPage)
  return Array.from({ length: total }, (_, i) => ({
    layoutId: "L05_PRODUCT_GRID" as const,
    title: total > 1 ? `${label} (${i + 1}/${total})` : label,
    subtitle,
    products: products.slice(i * perPage, (i + 1) * perPage),
  }))
}

export function planProductPages(products: CatalogProductItem[], opts: PlanOptions): PlannedPage[] {
  const pages: PlannedPage[] = []
  const groups = new Map<string, CatalogProductItem[]>()
  for (const p of products) {
    const key = p.category?.trim() || "Mẫu khác"
    groups.set(key, [...(groups.get(key) ?? []), p])
  }

  if (opts.withDividers && groups.size >= 2) {
    for (const [category, items] of groups) {
      pages.push({
        layoutId: "L03_COLLECTION_DIVIDER",
        title: category,
        subtitle: `${items.length} mẫu`,
        heroImage: items.find((p) => p.primaryImage)?.primaryImage ?? null,
        products: [],
      })
      pages.push(...gridPages(items, opts.itemsPerPage, category, opts.collectionTitle))
    }
  } else {
    pages.push(...gridPages(products, opts.itemsPerPage, "Các mẫu trong bộ sưu tập", opts.collectionTitle))
  }

  if (opts.withDetails) {
    for (const p of products.slice(0, MAX_DETAIL_PAGES)) {
      pages.push({ layoutId: "L06_PRODUCT_DETAIL", title: p.name, subtitle: opts.collectionTitle, heroImage: p.primaryImage, products: [p] })
    }
  }
  return pages
}
