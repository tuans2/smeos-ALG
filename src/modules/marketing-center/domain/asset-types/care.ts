/**
 * Danh mục Asset: 05 Chăm sóc & Giữ chân khách hàng (care).
 *
 * SSOT: `02_DANH_MUC_ASSET.md` phần A.
 */

import type { AssetTypeDefinition } from "../asset-type"

export const CARE_ASSET_TYPES: readonly AssetTypeDefinition[] = [
  {
    code: "48",
    name: "Thiệp chúc mừng",
    purpose: "Tấm thiệp gửi kèm đơn hàng mang thông điệp ấm áp",
    module: "care",
    destinations: ["CARE", "PRINT", "LIBRARY"],
    toolId: 7,
    fit: "FULL",
    customHref: "/cham-soc?asset=48",
    inputs: [
      { label: "Lời chúc ý nghĩa", source: "MANUAL_TEXT", required: false },
    ],
    outputs: ["PDF", "PNG"],
  },
  {
    code: "49",
    name: "Thiệp cảm ơn mua hàng",
    purpose: "Lời tri ân chân thành gửi đến khách sau mỗi lần ủng hộ",
    module: "care",
    destinations: ["CARE", "PRINT", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    customHref: "/cham-soc?asset=49",
    inputs: [
      { label: "Tên khách hàng", source: "CUSTOMER", required: true },
    ],
    outputs: ["PDF", "PNG"],
  },
  {
    code: "50",
    name: "Thiệp mừng sinh nhật",
    purpose: "Lời chúc kèm món quà bất ngờ gửi đúng ngày sinh nhật",
    module: "care",
    destinations: ["CARE", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    customHref: "/cham-soc?asset=50",
    inputs: [
      { label: "Ngày sinh của khách", source: "CUSTOMER", required: true },
    ],
    outputs: ["JPG", "URL"],
  },
  {
    code: "51",
    name: "Thiệp mừng ngày kỷ niệm",
    purpose: "Ghi dấu ngày khách gắn bó cùng cửa hàng qua từng năm",
    module: "care",
    destinations: ["CARE", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    customHref: "/cham-soc?asset=51",
    inputs: [
      { label: "Mốc thời gian gắn bó", source: "CUSTOMER", required: true },
    ],
    outputs: ["JPG", "URL"],
  },
  {
    code: "52",
    name: "Thẻ quà tặng điện tử",
    purpose: "Phiếu quà tặng có mệnh giá dành tặng người thân bạn bè",
    module: "care",
    destinations: ["CARE", "PRINT", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    customHref: "/cham-soc?asset=52",
    inputs: [
      { label: "Mệnh giá thẻ", source: "MANUAL_TEXT", required: true },
    ],
    outputs: ["PDF", "URL"],
  },
  {
    code: "53",
    name: "Mã ưu đãi cá nhân",
    purpose: "Mã giảm giá cấp riêng khuyến khích khách quay lại mua",
    module: "care",
    destinations: ["SALES", "CARE", "LIBRARY"],
    toolId: 66,
    fit: "PARTIAL",
    inputs: [
      { label: "Tỷ lệ giảm giá", source: "ACTIVE_PROMOTIONS", required: true },
    ],
    outputs: ["TEXT", "URL"],
  },
  {
    code: "54",
    name: "Phiếu giảm giá tri ân",
    purpose: "Thẻ ưu đãi in kèm đơn hàng tặng cho lần mua kế tiếp",
    module: "care",
    destinations: ["SALES", "CARE", "LIBRARY"],
    toolId: 66,
    fit: "PARTIAL",
    inputs: [
      { label: "Mức chiết khấu", source: "ACTIVE_PROMOTIONS", required: true },
    ],
    outputs: ["PDF", "PNG"],
  },
  {
    code: "55",
    name: "Thẻ hướng dẫn bảo quản",
    purpose: "Chỉ dẫn cách giữ sản phẩm bền đẹp dài lâu sau khi nhận",
    module: "care",
    destinations: ["CARE", "PRINT", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    customHref: "/cham-soc?asset=55",
    inputs: [
      { label: "Loại sản phẩm", source: "PRODUCT", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "56",
    name: "Thẻ xác nhận giao hàng",
    purpose: "Hình ảnh hoàn thiện món đồ gửi khách duyệt trước khi đi",
    module: "care",
    destinations: ["CARE", "PRINT", "LIBRARY"],
    toolId: 39,
    fit: "PARTIAL",
    inputs: [
      { label: "Ảnh chụp hoàn thiện", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["PNG"],
  },
  {
    code: "57",
    name: "Thẻ mời nhận xét",
    purpose: "Lời mời khách chấm điểm trải nghiệm và gửi đóng góp ý kiến",
    module: "care",
    destinations: ["CARE", "LIBRARY"],
    toolId: 26,
    fit: "PARTIAL",
    inputs: [
      { label: "Đơn hàng vừa nhận", source: "CUSTOMER", required: true },
    ],
    outputs: ["URL"],
  },
  {
    code: "75",
    name: "Thư tin tức chăm sóc",
    purpose: "Nội dung cập nhật xu hướng và ưu đãi mới gửi định kỳ",
    module: "care",
    destinations: ["CARE", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Danh sách người nhận", source: "CUSTOMER", required: true },
    ],
    outputs: ["TEXT"],
  },
]
