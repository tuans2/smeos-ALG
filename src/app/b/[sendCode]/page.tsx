import { asSystemDb } from "@/core/tenancy/db-context"
import { getDictionary, translate } from "@/lib/i18n/server"
import { Metadata } from "next"
import { PublicChatSlot } from "@/components/chat/public-chat-slot"
import { linkPreviewText } from "@/modules/greeting-card/domain/link-preview-text"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { brochureViewer } from "@/modules/greeting-card/use-cases/brochure-owner"
import { staffOrganizationId } from "@/modules/greeting-card/use-cases/staff-viewer"
import { FRESH_SESSION_PARAM, otherViewerAction, ownerCookieName } from "@/modules/greeting-card/domain/session-owner"
import { BrochureClaimGate } from "@/components/greeting-card/customer/brochure-claim-gate"
import { BrochureUnlockGate } from "@/components/greeting-card/customer/brochure-unlock-gate"
import { getGreetingCatalogForCustomer } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import type { ShopContact } from "@/modules/greeting-card/domain/shop-contact"
import { LinkUnavailable } from "@/components/greeting-card/customer/link-unavailable"
import { BrochureCustomerExperience } from "@/components/greeting-card/customer/brochure-customer-experience"
import { I18nProvider } from "@/lib/i18n"

interface PageProps {
  params: Promise<{ sendCode: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sendCode } = await params
  const data = await asSystemDb("page:/b", () => getGreetingCatalogForCustomer(sendCode))

  if (data.status === "UNAVAILABLE") {
    return {
      title: `Bộ Sưu Tập Sản Phẩm — ${data.shop.name}`,
      description: `Bộ sưu tập sản phẩm tuyển chọn từ ${data.shop.name}.`,
    }
  }

  if (data.status !== "ACTIVE") {
    return {
      title: "Bộ Sưu Tập Sản Phẩm",
      description: "Xem bộ sưu tập sản phẩm trực tuyến.",
    }
  }

  const { title, description } = linkPreviewText({
    catalogName: data.catalog.name,
    shopName: data.shop.name,
    catalogDescription: data.catalog.description,
    prices: data.products.map((p) => p.price),
  })

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: data.shop.name,
      // Ảnh xem trước: ảnh ghép tự động tại opengraph-image.tsx cùng thư mục
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function PublicBrochurePage({ params, searchParams }: PageProps) {
  const dict = getDictionary("vi")
  const { sendCode } = await params
  // Phiên thuộc trình duyệt đã mở đầu tiên: người nhận link chuyển tiếp không thấy lựa chọn / đơn
  // của người trước. Dữ liệu phiên chỉ được dựng ra HTML sau khi đã xác định là chủ phiên.
  const data = await asSystemDb("page:/b", () => getGreetingCatalogForCustomer(sendCode))
  if (data.status === "NOT_FOUND") {
    return (
      <LinkUnavailable
        title="Link không tồn tại hoặc đã hết hạn"
        message="Link xem bộ sưu tập này không còn hiệu lực hoặc đã hết thời gian sử dụng. Vui lòng liên hệ người gửi hoặc cửa hàng để nhận link mới."
      />
    )
  }
  // Link hết hạn / đóng: báo ngay cho mọi người mở, không cần nhận chủ phiên
  if (data.status === "UNAVAILABLE") return <UnavailableLink reason={data.reason} shop={data.shop} />

  const ownerToken = (await cookies()).get(ownerCookieName(sendCode))?.value ?? null
  const requestHeaders = await headers()
  // Trang công khai tra theo mã gửi (ngoài `handle()`): quyền hệ thống, như /api/v1/public/
  const viewer = await asSystemDb("page:/b", async () =>
    brochureViewer(sendCode, { ownerToken, staffOrganizationId: await staffOrganizationId(requestHeaders) }),
  )
  if (viewer?.viewer === "OTHER") {
    const justCreated = (await searchParams)?.[FRESH_SESSION_PARAM] !== undefined
    const action = otherViewerAction({ hasOrder: !!data.order, shareCode: viewer.shareCode, justCreated })
    // Phiên đã có đơn: trình duyệt khác mở lại bằng 4 số cuối SĐT người đặt (PO 08/10/2026)
    if (action === "UNLOCK") return <BrochureUnlockGate sendCode={sendCode} shop={data.shop} />
    if (action === "REDIRECT_SHARE") redirect(`/s/${viewer.shareCode}/mo`)
    if (action === "COOKIE_BLOCKED") {
      return (
        <LinkUnavailable
          shop={data.shop}
          title="Trình duyệt này chưa mở được bộ sưu tập"
          message={`Trình duyệt đang chặn lưu dữ liệu trang web nên không giữ được lượt xem mẫu của bạn. Hãy bấm "Mở lại", hoặc chọn "Mở bằng trình duyệt" (Safari, Chrome). Cần hỗ trợ, liên hệ ${data.shop.name}.`}
          action={{ href: `/s/${viewer.shareCode}/mo`, label: "Mở lại bộ sưu tập" }}
        />
      )
    }
  }
  if (viewer?.viewer === "UNCLAIMED") return <BrochureClaimGate sendCode={sendCode} />
  if (viewer?.viewer === "OTHER") {
    return (
      <LinkUnavailable
        shop={data.shop}
        title="Link này đã được mở trên thiết bị khác"
        message={`Mỗi link riêng chỉ dùng trên một thiết bị để giữ an toàn cho đơn hàng của khách. Liên hệ ${data.shop.name} để nhận link bộ sưu tập mới.`}
      />
    )
  }

  const initialLocale = data.shop?.languagePolicy?.defaultLocale ?? "vi"
  const industryKey = data.shop?.industry ?? undefined

  return (
    <I18nProvider initialLocale={initialLocale} industryKey={industryKey}>
      <BrochureCustomerExperience initialData={data} preview={viewer?.viewer === "STAFF"} />
      <PublicChatSlot pageKey={{ by: "send_code", value: sendCode }} surface="sales_link" />
    </I18nProvider>
  )
}

function UnavailableLink({ reason, shop }: { reason: "EXPIRED" | "CLOSED"; shop: ShopContact }) {
  if (reason === "CLOSED") return <LinkUnavailable shop={shop} />
  return (
    <LinkUnavailable
      shop={shop}
      title="Link đã hết hạn"
      message={`Link xem bộ sưu tập này đã hết thời gian sử dụng. Vui lòng liên hệ ${shop.name} để nhận link mới.`}
    />
  )
}

export const dynamic = "force-dynamic"
