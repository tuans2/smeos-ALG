/**
 * Landing Page Journey Manifest MVP (PATCH P4)
 * ALG Core — Final Hardening Patch v2.3 / Mục 11.4 & Mục 12
 */

import { JourneyManifestV2 } from '../journey-manifest-v2'

export const LANDING_PAGE_MANIFEST: JourneyManifestV2 = {
  id: 'journey:landing-page:v2',
  title: 'Tạo Trang Giới thiệu & Bán hoa (Landing Page)',
  description: 'Hành trình dẫn dắt thiết lập Landing Page tự động kết hợp tùy biến phong cách và thông tin tiệm',
  category: 'MARKETING',
  uxContract: {
    version: 2,
    executionMode: {
      default: 'manual', // Khởi đầu kiểm soát từng bước (J2 / J6)
      allowed: ['manual', 'automatic'],
    },
    entry: {
      screen: 'readiness_gate',
      maxRecommendationsShown: 3,
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
          message: 'Vui lòng bổ sung tên cửa hàng trong Hồ sơ kinh doanh trước khi tạo Landing Page',
        },
      },
      {
        id: 'req:shop:phone',
        label: 'Số điện thoại / Hotline đặt hoa',
        subject: 'shop',
        predicate: 'phone',
        type: 'hard',
        fallbackAction: {
          screen: 'gap_resolver',
          message: 'Cần số điện thoại liên hệ để khách hàng có thể gọi đặt hàng',
        },
      },
      {
        id: 'req:brand:primary_color',
        label: 'Màu chủ đạo thương hiệu',
        subject: 'brand',
        predicate: 'primary_color',
        type: 'soft',
        fallbackAction: {
          screen: 'inline_confirm_chip',
          message: 'Hệ thống sẽ dùng màu mặc định nếu chưa thiết lập màu thương hiệu',
        },
      },
    ],
    inputs: [
      {
        kind: 'profile_field',
        key: 'phone',
        label: 'Hotline đặt hoa',
        target: 'contact_section',
        decision: 'D-CONFIRM-DERIVED',
        required: true,
      },
      {
        kind: 'choose_product',
        key: 'hero_product',
        label: 'Sản phẩm hoa tâm điểm',
        target: 'hero_section',
        decision: 'D-CHOOSE-PRODUCT',
        required: false,
      },
      {
        kind: 'choose_option',
        key: 'theme_style',
        label: 'Phong cách thiết kế',
        target: 'theme_config',
        decision: 'D-CHOOSE-OPTION',
        options: ['modern_elegance', 'vintage_bloom', 'fresh_minimalist'],
        required: true,
      },
      {
        kind: 'asset_picker',
        key: 'gallery_photos',
        label: 'Bộ ảnh trưng bày',
        target: 'gallery_section',
        decision: 'D-SELECT-ASSETS',
        required: false,
      },
    ],
    device: {
      mobileFirst: true,
    },
  },
}
