import { getDictionary, translate } from "@/lib/i18n/server"
import { Metadata } from "next"
import { PublicChatSlot } from "@/components/chat/public-chat-slot"
import { getPublicGreetingCatalogBySlug } from "@/modules/greeting-card/use-cases/get-public-greeting-catalog-by-slug"
import { LinkUnavailable } from "@/components/greeting-card/customer/link-unavailable"
import { ShopContactBar } from "@/components/greeting-card/customer/shop-contact-bar"
import { getShopContactBySlug } from "@/modules/greeting-card/use-cases/get-shop-contact"
import { BrochurePublicView } from "@/components/greeting-card/customer/brochure-public-view"

interface PageProps {
  params: Promise<{ orgSlug: string; catalogCode: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgSlug, catalogCode } = await params
  const data = await getPublicGreetingCatalogBySlug(orgSlug, catalogCode)
  if (data.status !== "ACTIVE") {
    return { title: "Bộ Sưu Tập Sản Phẩm" }
  }
  const title = `${data.catalog.name} — Bộ Sưu Tập Sản Phẩm`
  const description = data.catalog.description ?? `Xem bộ sưu tập sản phẩm ${data.catalog.name}`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: data.shop?.name ?? undefined,
      // Ảnh xem trước: ảnh ghép nhiều mẫu ở opengraph-image.tsx cùng thư mục
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function PublicGreetingCatalogSlugPage({ params }: PageProps) {
  const dict = getDictionary("vi")
  const { orgSlug, catalogCode } = await params
  const data = await getPublicGreetingCatalogBySlug(orgSlug, catalogCode)

  if (data.status === "NOT_FOUND") {
    // Đúng cửa hàng nhưng bộ sưu tập đã ngừng/sai mã: hiện liên hệ tiệm thay vì 404 chung
    const shop = await getShopContactBySlug(orgSlug)
    if (shop) return <LinkUnavailable shop={shop} />
    return (
      <LinkUnavailable
        title="Link không tồn tại hoặc đã hết hạn"
        message="Bộ sưu tập này không còn hiệu lực. Vui lòng liên hệ cửa hàng để nhận link mới."
      />
    )
  }

  return (
    <>
      {data.shop && <ShopContactBar shop={data.shop} />}
      <BrochurePublicView catalog={data.catalog} products={data.products} shipping={data.shipping} shop={data.shop} entryActions={data.entryActions} />
      <PublicChatSlot pageKey={{ by: "org_slug", value: orgSlug }} surface="greeting_catalog" />
    </>
  )
}

export const dynamic = "force-dynamic"
