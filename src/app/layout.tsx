import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { publicAppUrl } from "@/lib/public-url"

// Phông thương hiệu AVI Lotus Group: Google Sans (SIL OFL 1.1 — giấy phép kèm trong thư mục phông).
// Bản biến thiên trục đậm 400–700, đã lọc Latin + tiếng Việt và nén woff2; tự lưu, không gọi CDN.
const googleSans = localFont({
  src: [
    { path: "./fonts/google-sans/GoogleSans-Variable.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/google-sans/GoogleSans-Italic-Variable.woff2", weight: "400 700", style: "italic" },
  ],
  display: "swap",
  variable: "--font-sans",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
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
    <html lang="vi" data-theme="alg" data-density="comfortable">
      <body className={`min-h-dvh bg-bg text-text antialiased ${googleSans.variable} ${googleSans.className}`}>
        {/* UiSystemProvider nằm trong AppShell — nơi có theme máy chủ phân giải theo tầng */}
        {children}
      </body>
    </html>
  )
}
