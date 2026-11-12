import type { Metadata } from "next"
import localFont from "next/font/local"
import { connection } from "next/server"
import "./globals.css"
import { publicAppUrl } from "@/lib/public-url"
import { BRAND } from "@/lib/brand"

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
  title: BRAND.productName,
  description: "Nền tảng quản trị kinh doanh đa ngành cho SME",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // CSP theo nonce (ARC-022 A6): Next.js chỉ gắn nonce vào script khi render theo request — trang dựng sẵn lúc build
  // không có nonce và bị CSP chặn. Chờ request ở đây để mọi trang render động (trước đó chỉ 4 trang là tĩnh).
  await connection()
  return (
    <html lang="vi" data-theme="alg" data-density="comfortable">
      <body className={`min-h-dvh bg-bg text-text antialiased ${googleSans.variable} ${googleSans.className}`}>
        {/* UiSystemProvider nằm trong AppShell — nơi có theme máy chủ phân giải theo tầng */}
        {children}
      </body>
    </html>
  )
}
