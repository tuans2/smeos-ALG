/**
 * NOTIFICATION EVENT CONTRACT — Interface chuẩn (Portable)
 *
 * File này định nghĩa tất cả types & interfaces cần thiết để một tầng
 * tự khai báo sự kiện thông báo của mình.
 *
 * THIẾT KẾ ĐỘC LẬP: File này không import bất kỳ module nào trong ALG.
 * Khi tách repo, copy file này sang repo mới là đủ để hoạt động.
 *
 * @module notification/domain/events
 */

/** Tầng sở hữu event */
export type NotificationTier = "MOTHER" | "INDUSTRY" | "CHAIN" | "STORE"

/** Tầng dưới (không phải Mother) — dùng cho Visibility Matrix */
export type NotificationSubTier = Exclude<NotificationTier, "MOTHER">

/** Kênh gửi thông báo */
export type NotifyChannel =
  | "APP_INBOX"  // In-app — luôn kích hoạt, không bao giờ tắt
  | "EMAIL"
  | "PUSH"       // Web Push / Mobile Push
  | "TELEGRAM"
  | "ZALO"
  | "SMS"
  | "WHATSAPP"
  | "MESSENGER"

/** Độ ưu tiên thông báo */
export type NotifyPriority = "NORMAL" | "URGENT" | "CRITICAL"

/** Nhóm phân loại sự kiện — gom trong UI Settings */
export type NotificationEventGroup =
  | "ORDER"       // Đơn hàng
  | "PAYMENT"     // Thanh toán
  | "PRODUCTION"  // Sản xuất, chế tác
  | "DISPATCH"    // Điều phối
  | "QC"          // Kiểm soát chất lượng
  | "NETWORK"     // Mạng lưới đối tác / chi nhánh
  | "PRODUCT"     // Sản phẩm, danh mục
  | "AI"          // AI jobs
  | "CRM"         // Khách hàng, chăm sóc
  | "FINANCE"     // Tài chính, đối soát
  | "TENANT"      // Quản trị tổ chức
  | "INFRA"       // Hạ tầng, sức khỏe hệ thống
  | "SECURITY"    // Bảo mật
  | "MARKETING"   // Nội dung, kênh bán
  | "CUSTOM"      // Sự kiện tùy chỉnh

/** Cấu hình mặc định theo vai cho 1 sự kiện */
export interface EventRoleDefault {
  /** Ref RoleUxKey — "*" = tất cả vai */
  roleKey: string
  /** Kênh mặc định cho vai này */
  channels: NotifyChannel[]
  priority: NotifyPriority
  /** OWNER: gửi đúng người phụ trách | BROADCAST: gửi toàn bộ vai đó */
  dispatchMode: "OWNER" | "BROADCAST"
}

/** Định nghĩa 1 sự kiện thông báo — đơn vị nguyên tử */
export interface NotificationEventDefinition {
  /** UPPER_SNAKE_CASE, unique toàn hệ thống */
  key: string
  /** Nhãn hiển thị UI */
  label: string
  /** Mô tả chi tiết cho trang settings */
  description: string
  /** Nhóm phân loại */
  group: NotificationEventGroup
  /** Tầng sở hữu event này */
  tier: NotificationTier
  /** Versioning — để migration/deprecation */
  version: number
  /**
   * Visibility mặc định khi event được đăng ký lần đầu.
   * Mother luôn thấy tất cả — không cần khai báo.
   * Mother Admin có thể override trên /van-hanh.
   */
  defaultVisibleToTiers: NotificationSubTier[]
  /** Ma trận vai → kênh mặc định */
  roleDefaults: EventRoleDefault[]
  /** Template URL deep link, VD: "/don-hang" */
  deepLinkTemplate?: string
  /** Icon từ lucide-react */
  iconName?: string
  /** Event đã lỗi thời — không hiển thị trong settings mới */
  deprecated?: boolean
  /** Key của event thay thế (nếu deprecated) */
  replacedBy?: string
}

/**
 * Hợp đồng mà mỗi tầng xuất ra — 1 file duy nhất cho mỗi tầng.
 * File này portable: khi tách repo, mang theo là đủ để hoạt động.
 */
export interface TierEventContract {
  tier: NotificationTier
  /** Semver: "1.0.0" */
  version: string
  events: NotificationEventDefinition[]
}
