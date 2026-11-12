import { getDictionary, translate } from "@/lib/i18n/server"
import { requestCookieHeader } from "@/lib/request-cookie-header"
import { redirect } from "next/navigation"
import { resolveAppSession } from "@/modules/organization/use-cases/resolve-app-session"
import { LandingPageStudioClient } from "@/components/landing-page/landing-page-studio-client"

export const metadata = {
  title: "Tạo Landing Page cửa hàng hoặc chuỗi | ALG",
  description: "Xây dựng trang giới thiệu trực tuyến chuyên nghiệp, tối ưu di động với link chia sẻ riêng bằng AI",
}

export default async function LandingPageStudioRoute() {
  const dict = getDictionary("vi")
  const cookieHeader = await requestCookieHeader()

  const session = await resolveAppSession(cookieHeader)
  if (!session) {
    redirect("/dang-nhap")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <LandingPageStudioClient />
    </div>
  )
}
