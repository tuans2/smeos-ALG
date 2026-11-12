import { getDictionary, translate } from "@/lib/i18n/server"
import { cookies } from "next/headers"
import { resolveAppSession } from "@/modules/organization/use-cases/resolve-app-session"
import { ProductImageSetEntry } from "@/components/product-image-set/product-image-set-entry"

export const metadata = {
  title: "Tạo bộ ảnh sản phẩm từ một ảnh gốc | ALG",
  description: "Sinh trọn gói ảnh đa tỉ lệ, đa góc cạnh và đa phong cách đồng bộ từ một ảnh duy nhất",
}

export default async function ProductImageSetPage() {
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
      <ProductImageSetEntry />
    </div>
  )
}
