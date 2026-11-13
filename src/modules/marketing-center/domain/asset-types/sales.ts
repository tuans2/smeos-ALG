/**
 * Danh mục Asset: 04 Bán hàng & Tư vấn (sales).
 *
 * SSOT: `02_DANH_MUC_ASSET.md` phần A.
 */

import type { AssetTypeDefinition } from "../asset-type"

export const SALES_ASSET_TYPES: readonly AssetTypeDefinition[] = [
  {
    code: "19",
    name: "Danh mục nhỏ chọn lọc",
    purpose: "Bộ sưu tập rút gọn 5 đến 10 mẫu gửi riêng từng vị khách",
    module: "sales",
    destinations: ["SALES", "CARE", "LIBRARY"],
    toolId: 14,
    fit: "FULL",
    inputs: [
      { label: "Mẫu phù hợp sở thích", source: "PRODUCT", required: true },
    ],
    outputs: ["URL"],
  },
  {
    code: "21",
    name: "Bảng giá niêm yết",
    purpose: "Bảng giá chuẩn gửi khách tham khảo hoặc in để bàn",
    module: "sales",
    destinations: ["SALES", "PRINT", "LIBRARY"],
    toolId: 65,
    fit: "FULL",
    inputs: [
      { label: "Mức giá hiện hành", source: "PRODUCT", required: true },
    ],
    outputs: ["PDF", "PNG"],
  },
  {
    code: "23",
    name: "Bài viết chào hàng",
    purpose: "Kịch bản tin nhắn tư vấn công dụng và thuyết phục mua",
    module: "sales",
    destinations: ["SALES", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Nhu cầu của khách", source: "CUSTOMER", required: true },
    ],
    outputs: ["TEXT"],
  },
  {
    code: "24",
    name: "Bản báo giá chi tiết",
    purpose: "Bảng tính chi phí có số hiệu lực gửi duyệt trước khi đặt",
    module: "sales",
    destinations: ["SALES", "LIBRARY"],
    toolId: 58,
    fit: "FULL",
    inputs: [
      { label: "Sản phẩm yêu cầu", source: "PRODUCT", required: true },
      { label: "Thông tin người nhận", source: "CUSTOMER", required: true },
    ],
    outputs: ["PDF", "URL"],
  },
  {
    code: "25",
    name: "Phiếu chọn mẫu",
    purpose: "Giao diện trực quan để khách bấm chọn mẫu yêu thích",
    module: "sales",
    destinations: ["SALES", "LIBRARY"],
    toolId: 14,
    fit: "FULL",
    inputs: [
      { label: "Danh sách mẫu chọn", source: "PRODUCT", required: true },
    ],
    outputs: ["URL"],
  },
  {
    code: "26",
    name: "Bộ gợi ý quà tặng",
    purpose: "Tập hợp các gói quà hoàn chỉnh theo mức ngân sách",
    module: "sales",
    destinations: ["SALES", "CARE", "LIBRARY"],
    toolId: 14,
    fit: "FULL",
    inputs: [
      { label: "Gói quà chọn lọc", source: "PRODUCT", required: true },
    ],
    outputs: ["URL"],
  },
  {
    code: "27",
    name: "Bộ sưu tập theo dịp",
    purpose: "Các mẫu thiết kế đón đầu dịp lễ kỷ niệm và sự kiện",
    module: "sales",
    destinations: ["SALES", "CARE", "LIBRARY"],
    toolId: 14,
    fit: "FULL",
    inputs: [
      { label: "Mẫu theo chủ đề lễ", source: "PRODUCT", required: true },
    ],
    outputs: ["URL"],
  },
  {
    code: "74",
    name: "Thẻ sản phẩm gửi tin",
    purpose: "Ảnh kèm nút bấm gửi thẳng qua Zalo để tư vấn tức thì",
    module: "sales",
    destinations: ["SALES", "LIBRARY"],
    toolId: 3,
    fit: "FULL",
    customHref: "/tai-anh?tab=m01c",
    inputs: [
      { label: "Sản phẩm", source: "PRODUCT", required: true },
    ],
    outputs: ["PNG"],
  },
]
