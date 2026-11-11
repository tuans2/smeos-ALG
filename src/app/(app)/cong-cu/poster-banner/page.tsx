import { getDictionary, translate } from "@/lib/i18n/server"
import { requestCookieHeader } from "@/lib/request-cookie-header"
import { resolveAppSession } from "@/modules/organization/use-cases/resolve-app-session"
import { PosterBannerClient } from "@/components/ad-banner-poster/poster-banner-client"

export const metadata = {
  title: "Tạo poster và banner quảng cáo | smeOS",
  description: "Tạo bộ ấn phẩm quảng cáo đa kênh, đa kích thước (1:1, 4:5, 9:16, 16:9, A4) chuẩn sàn bằng AI",
}

export default async function PosterBannerPage() {
  const dict = getDictionary("vi")
  const cookieHeader = await requestCookieHeader()

  const session = await resolveAppSession(cookieHeader)
  if (!session) return null

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PosterBannerClient />
    </div>
  )
}
