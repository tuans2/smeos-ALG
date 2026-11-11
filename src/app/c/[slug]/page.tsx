import { asSystemDb } from "@/core/tenancy/db-context"
import { getDictionary, translate } from "@/lib/i18n/server"
import { Metadata } from "next"
import { PublicChatSlot } from "@/components/chat/public-chat-slot"
import { getPublicCatalog } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { CatalogStorefront } from "@/components/catalog/catalog-storefront"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await asSystemDb("page:/c", () => getPublicCatalog(slug))

  if (data.status !== "ACTIVE") {
    return {
      title: "Bộ Sưu Tập Sản Phẩm",
      description: "Xem bộ sưu tập sản phẩm trực tuyến.",
    }
  }

  return {
    title: `${data.catalog.name} — ${data.shop.name}`,
    description: data.catalog.description || `Xem bộ sưu tập sản phẩm mới nhất từ ${data.shop.name}`,
    openGraph: {
      title: `${data.catalog.name} — ${data.shop.name}`,
      description: data.catalog.description || `Xem bộ sưu tập sản phẩm mới nhất từ ${data.shop.name}`,
      type: "website",
      // Ảnh chia sẻ dựng ở opengraph-image.tsx cùng thư mục (Next tự gắn)
    },
  }
}

export default async function PublicCatalogPage({ params }: PageProps) {
  const dict = getDictionary("vi")
  const { slug } = await params
  const data = await asSystemDb("page:/c", () => getPublicCatalog(slug))

  // Landing page (Công cụ 08) và Catalog (09) dùng chung trang /c — phân biệt theo gói chiến dịch
  const surface = data.status === "ACTIVE" && (data.campaignConfig?.archetype || data.campaignConfig?.generatedPackage)
    ? "landing_page"
    : "catalog"

  return (
    <>
      <CatalogStorefront initialData={data} />
      {data.status === "ACTIVE" && <PublicChatSlot pageKey={{ by: "catalog_slug", value: slug }} surface={surface} />}
    </>
  )
}

export const dynamic = "force-dynamic"
