/**
 * Danh mục Asset: 06 Ấn phẩm & Vật phẩm tại quầy (print).
 *
 * SSOT: `02_DANH_MUC_ASSET.md` phần A.
 * Nâng cấp PR-6: Toàn bộ 10 ấn phẩm kết nối workspace `/in-an` kèm preset chuẩn.
 */

import type { AssetTypeDefinition } from "../asset-type"

export const PRINT_ASSET_TYPES: readonly AssetTypeDefinition[] = [
  {
    code: "58",
    name: "Ảnh sản phẩm in ấn",
    purpose: "Ảnh độ phân giải cao 300 dpi sẵn sàng đưa vào nhà in",
    module: "print",
    destinations: ["PRINT", "LIBRARY"],
    toolId: 1,
    fit: "FULL",
    customHref: "/in-an?asset=58&preset=A6",
    inputs: [
      { label: "Ảnh chụp gốc", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["TIFF", "PDF", "PNG"],
  },
  {
    code: "59",
    name: "Áp phích in ấn",
    purpose: "Bản vẽ thiết kế chuẩn kích thước có chừa lề cắt xén",
    module: "print",
    destinations: ["PRINT", "LIBRARY"],
    toolId: 5,
    fit: "FULL",
    customHref: "/in-an?asset=59&preset=A4",
    inputs: [
      { label: "Thiết kế áp phích", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "60",
    name: "Tập danh mục in",
    purpose: "Cuốn danh mục đóng cuốn in giấy láng để khách lật xem",
    module: "print",
    destinations: ["PRINT", "LIBRARY"],
    toolId: 9,
    fit: "FULL",
    customHref: "/in-an?asset=60&preset=A4",
    inputs: [
      { label: "Danh sách sản phẩm", source: "PRODUCT", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "61",
    name: "Thực đơn món in ấn",
    purpose: "Bản in thực đơn ép plastic bền đẹp dùng lâu dài tại bàn",
    module: "print",
    destinations: ["PRINT", "LIBRARY"],
    toolId: 65,
    fit: "FULL",
    customHref: "/in-an?asset=61&preset=A4",
    inputs: [
      { label: "Bảng giá và món", source: "PRODUCT", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "62",
    name: "Kệ trưng bày quầy",
    purpose: "Khay đứng bằng mica hoặc bìa cứng đựng tờ gấp tại thu ngân",
    module: "print",
    destinations: ["PRINT", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    customHref: "/in-an?asset=62&preset=TABLE_TENT_100X150",
    inputs: [
      { label: "Kích thước khay", source: "MANUAL_TEXT", required: false },
    ],
    outputs: ["PDF"],
  },
  {
    code: "63",
    name: "Bảng để bàn mã vuông",
    purpose: "Bảng nhỏ để bàn in mã quét thanh toán hoặc xem thực đơn",
    module: "print",
    destinations: ["PROMOTION", "PRINT", "LIBRARY"],
    toolId: 12,
    fit: "FULL",
    customHref: "/in-an?asset=63&preset=TABLE_TENT_100X150",
    inputs: [
      { label: "Mã liên kết", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["PDF", "SVG"],
  },
  {
    code: "64",
    name: "Áp phích dán cửa kính",
    purpose: "Bản in kích thước dọc dán mặt kính đón khách từ ngoài vào",
    module: "print",
    destinations: ["PROMOTION", "PRINT", "LIBRARY"],
    toolId: 5,
    fit: "FULL",
    customHref: "/in-an?asset=64&preset=STANDEE_60X160",
    inputs: [
      { label: "Thông điệp chào đón", source: "STORE_PROFILE", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "65",
    name: "Áp phích treo tường",
    purpose: "Tranh trang trí đóng khung treo tạo điểm nhấn trong tiệm",
    module: "print",
    destinations: ["PRINT", "LIBRARY"],
    toolId: 5,
    fit: "FULL",
    customHref: "/in-an?asset=65&preset=A4",
    inputs: [
      { label: "Ảnh chụp nghệ thuật", source: "PRODUCT_PHOTO", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "66",
    name: "Thẻ treo sản phẩm",
    purpose: "Thẻ nhỏ xỏ dây treo trên từng món đồ ghi giá và thương hiệu",
    module: "print",
    destinations: ["PRINT", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    customHref: "/in-an?asset=66&preset=HANG_TAG_50X90",
    inputs: [
      { label: "Thông tin món đồ", source: "PRODUCT", required: true },
    ],
    outputs: ["PDF"],
  },
  {
    code: "67",
    name: "Nhãn dán bao bì",
    purpose: "Tem tròn hoặc vuông dán niêm phong hộp quà và túi xách",
    module: "print",
    destinations: ["PRINT", "LIBRARY"],
    toolId: null,
    fit: "FULL",
    customHref: "/in-an?asset=67&preset=STICKER_50X50",
    inputs: [
      { label: "Logo và tên tiệm", source: "BRAND_PROFILE", required: true },
    ],
    outputs: ["PDF"],
  },
]
