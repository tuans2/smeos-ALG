import { asSystemDb } from "@/core/tenancy/db-context"
import { getPublicCatalog } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { buildCollage } from "@/modules/greeting-card/use-cases/catalog-collage"
import { COLLAGE_SIZE, renderCatalogCollage } from "@/components/greeting-card/og/catalog-collage-image"

export const size = COLLAGE_SIZE
export const contentType = "image/png"
export const alt = "Bộ sưu tập hoa"

/**
 * Ảnh xem trước khi dán link /c/... (Landing 08 / Catalog 09) vào Zalo/Facebook: tên bộ sưu tập, tên tiệm,
 * khoảng giá và ảnh mẫu thật — cùng bộ dựng với bộ sưu tập Thẻ chào. Link đã thu hồi/không có → ảnh trung tính.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await asSystemDb("page:/c", () => getPublicCatalog(slug)).catch(() => null)
  if (data?.status !== "ACTIVE") {
    return renderCatalogCollage({ catalogName: "Bộ sưu tập hoa", shopName: null, priceLabel: null, logo: null, productCount: 0, images: [] })
  }
  const headline = (data.campaignConfig?.generatedPackage as { hero?: { headline?: string } } | undefined)?.hero?.headline
  return renderCatalogCollage(await asSystemDb("page:/c", () => buildCollage({ ...data, catalog: { name: headline || data.catalog.name } })))
}
