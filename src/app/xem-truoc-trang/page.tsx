import type { Metadata } from "next"
import { StorefrontPreviewFrame } from "@/components/catalog/public/storefront-preview-frame"

export const metadata: Metadata = {
  title: "Xem trước trang khách",
  robots: { index: false, follow: false },
}

/**
 * Khung xem trước trang khách cho Công cụ 08/09: không đọc dữ liệu nào ở máy chủ — chỉ vẽ dữ liệu
 * do màn quản trị (cùng nguồn gốc) gửi qua postMessage, bằng đúng component trang `/c/[slug]`.
 */
export default function StorefrontPreviewPage() {
  return <StorefrontPreviewFrame />
}
