/**
 * Decision Ownership & Definition SSOT
 * ALG Core — Final Hardening Patch v2.3 / PATCH P2 (Mục 11.5)
 */

export type DecisionOwnership = 'USER' | 'SYSTEM' | 'SHARED'

export type DecidedBy =
  | 'user_override'
  | 'user_confirm'
  | 'system_default'
  | 'system_rule'

export interface DecisionDefinition {
  decisionId: string
  ownership: DecisionOwnership
  locked: boolean
  description: string
  specRef?: string
}

/**
 * 19 Quyết định chuẩn của Decision Registry (Bảng 11.5)
 */
export const DECISION_REGISTRY_SEED: DecisionDefinition[] = [
  {
    decisionId: 'D-PERM-GRANT',
    ownership: 'USER',
    locked: true,
    description: 'Cấp quyền cho thành viên hoặc ứng dụng',
    specRef: 'ADR-001 / RBAC',
  },
  {
    decisionId: 'D-VERIFY-FACT',
    ownership: 'USER',
    locked: true,
    description: 'Xác minh một Fact tự khai thành Fact VERIFIED',
    specRef: 'Fact Architecture §5.6',
  },
  {
    decisionId: 'D-APPROVE-PUBLIC',
    ownership: 'USER',
    locked: true,
    description: 'Duyệt công khai nội dung hoặc tài nguyên ra bên ngoài',
    specRef: 'Publishing Engine',
  },
  {
    decisionId: 'D-REVOKE-MANUAL',
    ownership: 'USER',
    locked: true,
    description: 'Người dùng thu hồi quyền hoặc hủy kích hoạt tài nguyên',
    specRef: 'Security Audit',
  },
  {
    decisionId: 'D-REVOKE-EXPIRY',
    ownership: 'SYSTEM',
    locked: true,
    description: 'Hệ thống tự động thu hồi khi hết hạn hiệu lực',
    specRef: 'TTL Engine',
  },
  {
    decisionId: 'D-RESOLVE-CONFLICT',
    ownership: 'USER',
    locked: true,
    description: 'Xử lý xung đột giữa hai Fact hoặc phiên bản đối nghịch',
    specRef: 'Conflict Ticket §5.6',
  },
  {
    decisionId: 'D-EVALUATE-USAGE',
    ownership: 'SYSTEM',
    locked: true,
    description: 'Hệ thống kiểm tra hạn mức sử dụng và trừ credit',
    specRef: 'Usage Engine',
  },
  {
    decisionId: 'D-PUBLISH-OUTPUT',
    ownership: 'USER',
    locked: true,
    description: 'Quyết định phát hành sản phẩm ra các kênh',
    specRef: 'Omnichannel Publishing',
  },
  {
    decisionId: 'D-COMPUTE-READINESS',
    ownership: 'SYSTEM',
    locked: true,
    description: 'Hệ thống kiểm tra điều kiện tiên quyết tại Readiness Gate',
    specRef: 'Journey Engine §11.4',
  },
  {
    decisionId: 'D-DEDUP-DETECT',
    ownership: 'SYSTEM',
    locked: false,
    description: 'Phát hiện trùng lặp tài sản hoặc thông tin tiệm',
    specRef: 'Deduplication Pipeline',
  },
  {
    decisionId: 'D-CLASSIFY-ASSET',
    ownership: 'SHARED',
    locked: false,
    description: 'Phân loại hình ảnh / video hoa (AI gợi ý, người duyệt)',
    specRef: 'Creative Studio M04',
  },
  {
    decisionId: 'D-LINK-ASSET',
    ownership: 'SHARED',
    locked: false,
    description: 'Liên kết ảnh với sản phẩm hoặc chiến dịch',
    specRef: 'Asset Management',
  },
  {
    decisionId: 'D-PROMOTE-FACT',
    ownership: 'SHARED',
    locked: false,
    description: 'Nâng cấp Fact từ quan sát AI thành thông số cửa hàng',
    specRef: 'Fact Architecture §5.6',
  },
  {
    decisionId: 'D-CONFIRM-DERIVED',
    ownership: 'SHARED',
    locked: false,
    description: 'Xác nhận giá trị suy luận từ hồ sơ hoặc lịch sử',
    specRef: 'Business Profile Pre-fill',
  },
  {
    decisionId: 'D-CONFIRM-EXPIRING',
    ownership: 'USER',
    locked: false,
    description: 'Người dùng xác nhận gia hạn nội dung sắp hết hạn',
    specRef: 'Lifecycle Management',
  },
  {
    decisionId: 'D-CHOOSE-PRODUCT',
    ownership: 'USER',
    locked: false,
    description: 'Chọn sản phẩm trọng tâm cho chiến dịch hoặc Landing Page',
    specRef: 'Journey Manifest §11.4',
  },
  {
    decisionId: 'D-CHOOSE-CHANNEL',
    ownership: 'USER',
    locked: false,
    description: 'Chọn kênh phân phối truyền thông (Facebook, TikTok, Zalo)',
    specRef: 'Journey Manifest §11.4',
  },
  {
    decisionId: 'D-CHOOSE-OPTION',
    ownership: 'SHARED',
    locked: false,
    description: 'Lựa chọn phương án phong cách, tông giọng hoặc bố cục',
    specRef: 'Template Engine',
  },
  {
    decisionId: 'D-SELECT-ASSETS',
    ownership: 'SHARED',
    locked: false,
    description: 'Chọn danh sách hình ảnh phục vụ tạo sinh',
    specRef: 'Creative Studio M04',
  },
]
