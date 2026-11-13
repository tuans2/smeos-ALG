import { asSystemDb } from "@/core/tenancy/db-context"
import { shareLinkPreview } from "@/modules/greeting-card/use-cases/share-links"
import { catalogCollageById } from "@/modules/greeting-card/use-cases/catalog-collage"
import { COLLAGE_SIZE, renderCatalogCollage } from "@/components/greeting-card/og/catalog-collage-image"

export const size = COLLAGE_SIZE
export const contentType = "image/png"
export const alt = "Bộ sưu tập sản phẩm"

/** Ảnh xem trước khi dán link /s/... vào Zalo/Messenger/Facebook: ghép các hình ảnh sản phẩm nổi bật. */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const preview = await asSystemDb("page:/s", () => shareLinkPreview(code.toUpperCase()))
  if (!preview) {
    return renderCatalogCollage({ catalogName: "Bộ Sưu Tập Sản Phẩm", shopName: null, priceLabel: null, logo: null, productCount: 0, images: [] })
  }
  const data = await asSystemDb("page:/s", () => catalogCollageById(preview.catalogId, `/s/${code.toUpperCase()}`))
  return renderCatalogCollage(data ?? { catalogName: preview.name, shopName: null, priceLabel: null, logo: null, productCount: 0, images: [] })
}
