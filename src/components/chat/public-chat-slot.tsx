import { asSystemDb } from "@/core/tenancy/db-context"
import {
  loadPublicChatSlot,
  type PublicPageKey,
} from "@/modules/chat-assistant/use-cases/resolve-public-chat-slot"
import type { PublicChatSurface } from "@/modules/chat-assistant/domain/public-chat-policy"
import { PublicStorefrontChatWidget } from "./public-storefront-chat-widget"

interface PublicChatSlotProps {
  pageKey: PublicPageKey
  surface: PublicChatSurface
}

/**
 * Khung chat AI cho trang công khai do công cụ ALG tạo. Máy chủ quyết định có vẽ
 * hay không (kênh bật + chủ tiệm không tắt loại trang này); tắt thì không vẽ gì.
 */
export async function PublicChatSlot({ pageKey, surface }: PublicChatSlotProps) {
  // Server Component tự tải (React vẽ sau khi trang trả về, ngoài ngữ cảnh của trang): quyền hệ thống, tra theo mã trang
  const slot = await asSystemDb("component:public-chat-slot", () => loadPublicChatSlot(pageKey, surface))
  if (!slot) return null
  return <PublicStorefrontChatWidget shopSlug={slot.shopSlug} shopName={slot.shopName} surface={slot.surface} />
}
