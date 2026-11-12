/**
 * Social Post Journey Manifest MVP (PATCH P4)
 * ALG Core — Final Hardening Patch v2.3 / Mục 11.4 & Mục 12
 */

import { JourneyManifestV2 } from '../journey-manifest-v2'

export const SOCIAL_POST_MANIFEST: JourneyManifestV2 = {
  id: 'journey:social-post:v2',
  title: 'Soạn & Đăng bài Truyền thông Đa kênh (Social Post)',
  description: 'Hành trình AI sinh bài viết và hình ảnh theo sự kiện và sản phẩm với chế độ Tự động tối ưu',
  category: 'CONTENT',
  uxContract: {
    version: 2,
    executionMode: {
      default: 'automatic', // Khởi đầu tự động fast-track (PO 01/10)
      allowed: ['automatic', 'manual'],
    },
    entry: {
      screen: 'readiness_gate',
      maxRecommendationsShown: 5,
    },
    requirements: [
      {
        id: 'req:shop:name',
        label: 'Tên cửa hàng',
        subject: 'shop',
        predicate: 'name',
        type: 'hard',
        fallbackAction: {
          screen: 'gap_resolver',
          message: 'Vui lòng cập nhật tên tiệm trước khi soạn bài đăng',
        },
      },
      {
        id: 'req:brand:tone_of_voice',
        label: 'Tông giọng thương hiệu',
        subject: 'brand',
        predicate: 'tone_of_voice',
        type: 'soft',
        fallbackAction: {
          screen: 'inline_confirm_chip',
          message: 'Sẽ dùng tông giọng Thanh lịch, ấm áp nếu chưa cấu hình',
        },
      },
    ],
    inputs: [
      {
        kind: 'choose_channel',
        key: 'distribution_channels',
        label: 'Kênh đăng bài',
        target: 'publisher_config',
        decision: 'D-CHOOSE-CHANNEL',
        options: ['facebook', 'zalo', 'tiktok', 'instagram'],
        required: true,
      },
      {
        kind: 'choose_product',
        key: 'featured_flower',
        label: 'Sản phẩm làm chủ đề',
        target: 'content_context',
        decision: 'D-CHOOSE-PRODUCT',
        required: false,
      },
      {
        kind: 'free_text',
        key: 'custom_notes',
        label: 'Chỉ đạo ngữ cảnh / Lưu ý riêng',
        target: 'prompt_directives',
        decision: 'D-CONFIRM-DERIVED',
        required: false,
      },
    ],
    device: {
      mobileFirst: true,
    },
  },
}
