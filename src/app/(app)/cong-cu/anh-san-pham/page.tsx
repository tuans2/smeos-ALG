import { getDictionary, translate } from "@/lib/i18n/server"
import { cookies } from "next/headers"
import { resolveAppSession } from "@/modules/organization/use-cases/resolve-app-session"
import { ProductPhotoStudioEntry } from "@/components/product-photo-studio/product-photo-studio-entry"

export const metadata = {
  title: "Tạo ảnh sản phẩm chuyên nghiệp | ALG",
  description: "Biến ảnh chụp thô bằng điện thoại thành ảnh studio thương mại đạt chuẩn sàn bằng AI",
}

export default async function ProductPhotoStudioPage() {
  const dict = getDictionary("vi")
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const session = await resolveAppSession(cookieHeader)
  if (!session) return null

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <ProductPhotoStudioEntry />
    </div>
  )
}
