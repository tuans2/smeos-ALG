/**
 * Trang công cụ ALG — 6 Business Modules & Khu Vận hành cửa hàng (business-modules.ts).
 *
 * Route: /cong-cu
 *
 * - Dev: hiển thị toàn bộ ấn phẩm và công cụ kèm trạng thái và lộ trình
 * - Production: chỉ hiển thị các ấn phẩm Sẵn và chức năng đã hoàn thiện
 */

import { getDictionary, translate } from "@/lib/i18n/server"
import { cookies } from "next/headers"
import { resolveAppSession } from "@/modules/organization/use-cases/resolve-app-session"
import { ToolkitHome } from "@/components/dashboard/toolkit-home"

export default async function ToolkitPage() {
  const dict = getDictionary("vi")
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const session = await resolveAppSession(cookieHeader)
  if (!session) return null

  return <ToolkitHome />
}
