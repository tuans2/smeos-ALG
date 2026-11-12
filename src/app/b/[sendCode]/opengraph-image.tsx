import { asSystemDb } from "@/core/tenancy/db-context"
import { catalogCollageBySendCode } from "@/modules/greeting-card/use-cases/catalog-collage"
import { COLLAGE_SIZE, renderCatalogCollage } from "@/components/greeting-card/og/catalog-collage-image"

export const size = COLLAGE_SIZE
export const contentType = "image/png"
export const alt = "Thẻ giới thiệu bộ sưu tập sản phẩm"

/** Ảnh xem trước khi dán link /b/... vào Zalo/Messenger/Facebook: ghép các hình ảnh sản phẩm nổi bật. */
export default async function Image({ params }: { params: Promise<{ sendCode: string }> }) {
  const { sendCode } = await params
  const data = await asSystemDb("page:/b", () => catalogCollageBySendCode(sendCode))
  return renderCatalogCollage(data ?? { catalogName: "Bộ Sưu Tập Sản Phẩm", shopName: null, priceLabel: null, logo: null, productCount: 0, images: [] })
}
