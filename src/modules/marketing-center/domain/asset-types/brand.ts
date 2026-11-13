/**
 * Danh mục Asset: 01 Hồ sơ & Thương hiệu (brand).
 *
 * Gồm:
 * - 37: Ảnh bìa mạng xã hội (từ danh mục 77 asset)
 * - TH01–TH15: Bộ nhận diện thương hiệu (PO QĐ6)
 */

import type { AssetTypeDefinition } from "../asset-type"

export const BRAND_ASSET_TYPES: readonly AssetTypeDefinition[] = [
  {
    code: "37",
    name: "Ảnh bìa mạng xã hội",
    purpose: "Ảnh bìa trang cá nhân và trang bán hàng của cửa hàng",
    module: "brand",
    destinations: ["PROMOTION", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Tên và logo", source: "BRAND_PROFILE", required: true },
      { label: "Thông điệp chính", source: "MANUAL_TEXT", required: false },
    ],
    outputs: ["PNG", "JPG"],
  },
  {
    code: "TH01",
    name: "Logo thương hiệu",
    purpose: "Biểu trưng chính thức gồm bản ngang, vuông và đơn sắc",
    module: "brand",
    destinations: ["PROMOTION", "SALES", "CARE", "PRINT", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Tên cửa hàng", source: "STORE_PROFILE", required: true },
      { label: "Phong cách mong muốn", source: "MANUAL_TEXT", required: false },
    ],
    outputs: ["SVG", "PNG"],
  },
  {
    code: "TH02",
    name: "Câu định vị thương hiệu",
    purpose: "Khẩu hiệu ngắn gọn thể hiện giá trị cốt lõi của tiệm",
    module: "brand",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Ngành hàng và điểm mạnh", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["TEXT"],
  },
  {
    code: "TH03",
    name: "Bảng màu thương hiệu",
    purpose: "Hệ thống mã màu chủ đạo và phụ trợ chuẩn nhận diện",
    module: "brand",
    destinations: ["PROMOTION", "SALES", "CARE", "PRINT", "LIBRARY"],
    toolId: 51,
    fit: "PARTIAL",
    inputs: [
      { label: "Màu sắc ưa thích", source: "STORE_PROFILE", required: false },
    ],
    outputs: ["HEX_CODES"],
  },
  {
    code: "TH04",
    name: "Bộ phông chữ chuẩn",
    purpose: "Phông chữ tiêu đề và nội dung đồng bộ mọi thiết kế",
    module: "brand",
    destinations: ["PROMOTION", "SALES", "CARE", "PRINT", "LIBRARY"],
    toolId: 51,
    fit: "PARTIAL",
    inputs: [
      { label: "Phong cách chữ", source: "STORE_PROFILE", required: false },
    ],
    outputs: ["FONT_FAMILY"],
  },
  {
    code: "TH05",
    name: "Giọng văn thương hiệu",
    purpose: "Quy chuẩn ngữ điệu viết bài và trò chuyện cùng khách",
    module: "brand",
    destinations: ["PROMOTION", "LIBRARY"],
    toolId: 51,
    fit: "PARTIAL",
    inputs: [
      { label: "Đối tượng khách hàng", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["GUIDELINE_TEXT"],
  },
  {
    code: "TH06",
    name: "Hồ sơ thương hiệu",
    purpose: "Tài liệu tổng hợp câu chuyện và giá trị của cửa hàng",
    module: "brand",
    destinations: ["PROMOTION", "SALES", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Thông tin tiệm", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "TH07",
    name: "Cẩm nang dùng thương hiệu",
    purpose: "Hướng dẫn nhân viên áp dụng đúng logo và màu sắc",
    module: "brand",
    destinations: ["LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Quy chuẩn logo và màu", source: "BRAND_PROFILE", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "TH08",
    name: "Danh thiếp thương hiệu",
    purpose: "Danh thiếp chuẩn kích thước in và mã danh bạ số",
    module: "brand",
    destinations: ["SALES", "PRINT", "LIBRARY"],
    toolId: 64,
    fit: "PARTIAL",
    inputs: [
      { label: "Thông tin liên hệ", source: "STORE_PROFILE", required: true },
      { label: "Logo và màu", source: "BRAND_PROFILE", required: true },
    ],
    outputs: ["PDF", "PNG", "VCF"],
  },
  {
    code: "TH09",
    name: "Ảnh đại diện kênh",
    purpose: "Ảnh đại diện chuẩn kích thước vuông cho các kênh",
    module: "brand",
    destinations: ["PROMOTION", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Logo chính thức", source: "BRAND_PROFILE", required: true },
    ],
    outputs: ["PNG"],
  },
  {
    code: "TH10",
    name: "Từ khoá thương hiệu",
    purpose: "Danh sách thẻ hashtag và câu kêu gọi hành động chuẩn",
    module: "brand",
    destinations: ["PROMOTION", "LIBRARY"],
    toolId: 51,
    fit: "PARTIAL",
    inputs: [
      { label: "Tên tiệm và ngành", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["TEXT_LIST"],
  },
  {
    code: "TH11",
    name: "Đoạn giới thiệu chuẩn",
    purpose: "Bài viết giới thiệu ngắn dùng cho các trang đối tác",
    module: "brand",
    destinations: ["PROMOTION", "SALES", "CARE", "LIBRARY"],
    toolId: 51,
    fit: "PARTIAL",
    inputs: [
      { label: "Thông tin cửa hàng", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["TEXT"],
  },
  {
    code: "TH12",
    name: "Trang hồ sơ chia sẻ",
    purpose: "Liên kết hồ sơ trực tuyến gửi đối tác và khách hàng",
    module: "brand",
    destinations: ["PROMOTION", "LIBRARY"],
    toolId: 11,
    fit: "PARTIAL",
    inputs: [
      { label: "Hồ sơ tiệm", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["URL"],
  },
  {
    code: "TH13",
    name: "Trang giới thiệu chính thức",
    purpose: "Trang thông tin thương hiệu trực tuyến chuyên nghiệp",
    module: "brand",
    destinations: ["PROMOTION", "LIBRARY"],
    toolId: 8,
    fit: "PARTIAL",
    inputs: [
      { label: "Nội dung giới thiệu", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["URL"],
  },
  {
    code: "TH14",
    name: "Tập gấp giới thiệu tiệm",
    purpose: "Ấn phẩm giới thiệu không gian và dịch vụ của cửa hàng",
    module: "brand",
    destinations: ["PROMOTION", "PRINT", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    inputs: [
      { label: "Hình ảnh và giới thiệu", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "TH15",
    name: "Mẫu sản phẩm tiêu biểu",
    purpose: "Bộ sưu tập các mẫu đặc trưng làm nên tên tuổi tiệm",
    module: "brand",
    destinations: ["PROMOTION", "LIBRARY"],
    toolId: 9,
    fit: "PARTIAL",
    inputs: [
      { label: "Sản phẩm chọn lọc", source: "PRODUCT", required: true },
    ],
    outputs: ["URL"],
  },
]
