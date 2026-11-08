/**
 * Đăng ký Hành động tiếp theo (Next Actions Registry) — Kiến trúc Journey-First.
 * Nguồn đặc tả: FLORAOS_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md (§2.3, §19)
 *
 * Luật Clean Architecture: Thuần túy không import React, không import Prisma.
 * UX Lint R8: Không chứa mã kỹ thuật (M01a, M04b, RBAC...) trong nhãn/mô tả.
 */

export interface RegisteredNextAction {
  id: string
  label: string
  description: string
  targetHref?: string
  targetJourneyId?: string
  requiredCapability?: string
  isPrimary?: boolean
}

export const NEXT_ACTIONS_REGISTRY: Record<string, RegisteredNextAction[]> = {
  // Sau khi phân tích xong sản phẩm từ ảnh
  "product-analyzed": [
    {
      id: "save-to-catalog",
      label: "Lưu vào danh mục sản phẩm",
      description: "Thêm sản phẩm mới vào kho hàng đang bán của tiệm",
      targetHref: "/san-pham",
      isPrimary: true,
    },
    {
      id: "create-quote-next",
      label: "Tạo bảng báo giá",
      description: "Lên báo giá chi tiết gửi khách hàng qua tin nhắn",
      targetJourneyId: "create-product-quote",
      targetHref: "/bao-gia",
    },
    {
      id: "create-image-next",
      label: "Tạo hình ảnh truyền thông",
      description: "Ghép bối cảnh lifestyle sang trọng cho ảnh sản phẩm",
      targetJourneyId: "create-marketing-image",
      targetHref: "/creative-studio",
    },
    {
      id: "create-video-next",
      label: "Tạo video giới thiệu",
      description: "Dựng video ngắn chuyển động giới thiệu hoa",
      targetJourneyId: "create-product-video",
      targetHref: "/creative-studio",
    },
    {
      id: "create-copy-next",
      label: "Viết bài tiếp thị",
      description: "Soạn nội dung đăng tải mạng xã hội",
      targetJourneyId: "create-marketing-copy",
      targetHref: "/creative-studio",
    },
  ],

  // Sau khi tạo xong báo giá
  "quote-created": [
    {
      id: "create-order-from-quote",
      label: "Chuyển thành đơn hàng",
      description: "Tạo đơn hàng ngay khi khách chốt mua hoa",
      targetJourneyId: "create-order",
      targetHref: "/don-hang",
      isPrimary: true,
    },
    {
      id: "share-quote-link",
      label: "Gửi báo giá cho khách",
      description: "Sao chép link hoặc gửi trực tiếp qua Zalo/Facebook",
      targetHref: "/bao-gia",
    },
  ],

  // Sau khi kết xuất hình ảnh truyền thông
  "image-created": [
    {
      id: "make-video-from-image",
      label: "Dựng video từ hình ảnh",
      description: "Tạo video ngắn thu hút từ bộ ảnh vừa hoàn thiện",
      targetJourneyId: "create-product-video",
      targetHref: "/creative-studio",
      isPrimary: true,
    },
    {
      id: "write-copy-for-image",
      label: "Viết bài đăng kèm ảnh",
      description: "Soạn nội dung tiếp thị phù hợp với phong cách ảnh",
      targetJourneyId: "create-marketing-copy",
      targetHref: "/creative-studio",
    },
  ],

  // Sau khi tạo đơn hàng mới
  "order-created": [
    {
      id: "print-work-ticket",
      label: "In phiếu giao việc cho thợ chế tác",
      description: "Xuất phiếu yêu cầu chế tác cho thợ thực hiện",
      targetHref: "/don-hang",
      isPrimary: true,
    },
    {
      id: "dispatch-order-network",
      label: "Điều phối đơn hàng",
      description: "Chuyển đơn tới cửa hàng đối tác trong mạng lưới",
      targetJourneyId: "network-dispatch",
      targetHref: "/dieu-phoi",
    },
    {
      id: "view-customer-history",
      label: "Xem hồ sơ khách hàng",
      description: "Ghi nhận lịch sử và chăm sóc khách thân thiết",
      targetJourneyId: "manage-customers",
      targetHref: "/khach-hang",
    },
  ],

  // Sau khi hoàn thành combo ra mắt sản phẩm
  "combo-launched": [
    {
      id: "view-product-published",
      label: "Xem trang sản phẩm mở bán",
      description: "Kiểm tra hiển thị sản phẩm trên catalog trực tuyến",
      targetHref: "/catalog",
      isPrimary: true,
    },
    {
      id: "view-marketing-campaign",
      label: "Theo dõi chiến dịch tiếp thị",
      description: "Xem bộ ấn phẩm và nội dung đã phát hành",
      targetHref: "/quang-ba/chien-dich",
    },
    {
      id: "track-sales-overview",
      label: "Theo dõi tình hình kinh doanh",
      description: "Nắm bắt đơn đặt hàng và doanh thu từ sản phẩm mới",
      targetJourneyId: "view-store-overview",
      targetHref: "/",
    },
  ],
}

/**
 * Lấy danh sách hành động tiếp theo theo khóa kết quả
 */
export function getNextActionsForOutcome(
  outcomeKey: string
): RegisteredNextAction[] {
  return NEXT_ACTIONS_REGISTRY[outcomeKey] || []
}
