import type { Metadata } from "next"
import { Be_Vietnam_Pro } from "next/font/google"
import "./globals.css"
import { publicAppUrl } from "@/lib/public-url"

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-sans",
})

const appUrl = publicAppUrl()

export const metadata: Metadata = {
  // Ảnh xem trước khi dán link vào Zalo/Facebook cần URL tuyệt đối; thiếu dòng này
  // Next.js rơi về http://localhost:<PORT> ở mọi môi trường ngoài Vercel.
  ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
  title: "smeOS",
  description: "Nền tảng quản trị kinh doanh đa ngành cho SME",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" data-theme="moc-lan" data-density="comfortable">
      <body className={`min-h-dvh bg-bg text-text antialiased ${beVietnamPro.variable}`}>
        {/* UiSystemProvider nằm trong AppShell — nơi có theme máy chủ phân giải theo tầng */}
        {children}
      </body>
    </html>
  )
}
