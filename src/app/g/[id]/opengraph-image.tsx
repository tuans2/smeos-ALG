import { asSystemDb } from "@/core/tenancy/db-context"
import { catalogCollageById } from "@/modules/greeting-card/use-cases/catalog-collage"
import { COLLAGE_SIZE, renderCatalogCollage } from "@/components/greeting-card/og/catalog-collage-image"

export const size = COLLAGE_SIZE
export const contentType = "image/png"
export const alt = "Bộ sưu tập sản phẩm"

/** Ảnh xem trước khi dán link /g/... vào Zalo/Facebook: ghép nhiều sản phẩm thay vì 1 ảnh. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await asSystemDb("page:/g", () => catalogCollageById(id))
  return renderCatalogCollage(data ?? { catalogName: "Bộ sưu tập sản phẩm", shopName: null, priceLabel: null, logo: null, productCount: 0, images: [] })
}
