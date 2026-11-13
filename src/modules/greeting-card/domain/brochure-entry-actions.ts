/**
 * Nút "Đặt hàng" / "Liên hệ" trên trang khách Bộ sưu tập riêng (`/b`, `/g`) — cùng công tắc Điều hành
 * với Bộ sưu tập chung (`orders/domain/entry-actions.ts`), nguồn `BROCHURE`.
 * Mặc định hệ thống của nguồn này: Đặt hàng bật, Liên hệ tắt → trang khách giữ nguyên như trước
 * cho tới khi chủ cửa hàng tự bật. Pure TypeScript — không I/O.
 *
 * - `order = false`: khách không chọn mẫu để đặt; mọi mẫu mở khung liên hệ; API chọn mẫu / báo giá /
 *   đặt hàng trả 404.
 * - `contact = true`: thêm nút "Nhắn tin" chung trên thanh liên hệ (form tư vấn → lead).
 *   Khung liên hệ của mẫu "Liên hệ" (giá theo yêu cầu) luôn có, vì đó là cách duy nhất để hỏi giá.
 */
import {
  parseEntryActionsSettings,
  resolveEntryActions,
  type EntryActions,
} from "@/modules/orders/domain/entry-actions"

export function brochureEntryActions(orgSettings: unknown): EntryActions {
  return resolveEntryActions(parseEntryActionsSettings(orgSettings), "BROCHURE")
}
