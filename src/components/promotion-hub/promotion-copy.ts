/**
 * Câu chữ của nhóm "Quảng bá sản phẩm" trên /cong-cu (PO 09/11/2026) — một chỗ, tiếng Việt tự nhiên, không mã kỹ thuật.
 * Dòng phụ trên ô lấy từ `promotionSummary` (domain).
 */
import { PRIVATE_COLLECTION, PUBLIC_COLLECTION } from "@/modules/toolkit/domain/collection-names"
import type { PromotionFeature } from "@/modules/toolkit/domain/promotion-hub"

export const PROMOTION_GRID_SUMMARY = "3 chức năng: Landing · Bộ sưu tập chung · Bộ sưu tập riêng"

export const FEATURE_COPY: Readonly<Record<PromotionFeature, { title: string; hint: string }>> = {
  LANDING: {
    title: "Landing page",
    hint: "Trang riêng cho từng chiến dịch, sản phẩm hoặc dịp lễ — tạo được nhiều trang. Trang chính thức của cửa hàng nằm ở nhóm Hồ sơ & Thương hiệu.",
  },
  PUBLIC_COLLECTION: { title: PUBLIC_COLLECTION.name, hint: PUBLIC_COLLECTION.hint },
  PRIVATE_COLLECTION: { title: PRIVATE_COLLECTION.name, hint: PRIVATE_COLLECTION.hint },
}

export const NUDGE = {
  profile: {
    text: "Hồ sơ cửa hàng chưa đủ — landing và bộ sưu tập sẽ thiếu tên, số điện thoại hoặc nút gọi/Zalo.",
    action: "Hoàn thiện hồ sơ",
    href: "/ho-so",
  },
  products: {
    text: "Chưa có sản phẩm đã duyệt để đưa lên trang.",
    action: "Tạo Thẻ sản phẩm",
    href: "/cong-cu?muc=content&buoc=the-san-pham",
  },
} as const

export const PANEL_COPY = {
  pickHint: "Chọn một chức năng ở trên để bắt đầu. Ba chức năng độc lập, làm cái nào trước cũng được.",
  forbidden: (what: string) => `Bạn chưa có quyền ${what}. Nhờ chủ cửa hàng cấp quyền nếu cần.`,
  privateManage: "Quản lý đơn và theo dõi",
  privateRecent: "Link gửi gần đây",
  privateNone: "Chưa gửi link riêng cho khách nào.",
  landingList: "Landing đã tạo",
  landingNone: "Chưa có landing nào. Bấm \"Tạo landing mới\" để bắt đầu.",
  landingCreate: "Tạo landing mới",
  collectionList: "Bộ sưu tập chung đã tạo",
  collectionNone: "Chưa có bộ sưu tập chung nào. Bấm \"Tạo bộ sưu tập\" để bắt đầu.",
  collectionCreate: "Tạo bộ sưu tập",
  backToList: "Về danh sách",
  loadError: "Chưa tải được danh sách",
} as const
