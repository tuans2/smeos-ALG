/**
 * Danh mục Asset video: 02 Tạo nội dung (content).
 *
 * SSOT: `02_DANH_MUC_ASSET.md` phần A.
 */

import type { AssetTypeDefinition } from "../asset-type"

export const CONTENT_VIDEO_ASSET_TYPES: readonly AssetTypeDefinition[] = [
  {
    code: "38",
    name: "Video trình chiếu ảnh",
    purpose: "Đoạn phim ngắn chuyển động mượt mà từ bộ ảnh có sẵn",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Bộ ảnh sản phẩm", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "39",
    name: "Video ngắn dạng reel",
    purpose: "Video nhịp độ nhanh thu hút tương tác trên Facebook",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Ảnh hoặc clip ngắn", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "40",
    name: "Video ngắn TikTok",
    purpose: "Đoạn video chuẩn kích thước dọc kèm phụ đề hấp dẫn",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Ảnh sản phẩm", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "41",
    name: "Video giới thiệu sản phẩm",
    purpose: "Thước phim mô tả công dụng và câu chuyện làm nên món đồ",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Thông tin món hàng", source: "PRODUCT", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "42",
    name: "Video khuyến mãi",
    purpose: "Video ngắn nêu bật mức giảm giá và quà tặng hấp dẫn",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Chương trình ưu đãi", source: "ACTIVE_PROMOTIONS", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "43",
    name: "Poster động dạng video",
    purpose: "Thiết kế áp phích có hiệu ứng chuyển động bắt mắt",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Ảnh và thông điệp", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "44",
    name: "Video câu chuyện sản phẩm",
    purpose: "Kể lại nguồn cảm hứng và quy trình tạo ra tác phẩm",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Chi tiết sản phẩm", source: "PRODUCT", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "45",
    name: "Catalog dạng video",
    purpose: "Lật từng trang sản phẩm dưới dạng thước phim sống động",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Danh mục sản phẩm", source: "PRODUCT", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "46",
    name: "Video so sánh trước sau",
    purpose: "Minh hoạ sự biến đổi ấn tượng trước và sau khi dùng",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Ảnh trước và sau", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["MP4"],
  },
  {
    code: "47",
    name: "Video bộ sưu tập mùa",
    purpose: "Tổng hợp các mẫu nổi bật dành riêng cho mùa lễ hội",
    module: "content",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: 6,
    fit: "PARTIAL",
    inputs: [
      { label: "Sản phẩm sự kiện", source: "PRODUCT", required: true },
    ],
    outputs: ["MP4"],
  },
]
