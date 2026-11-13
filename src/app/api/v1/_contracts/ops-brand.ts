import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-brand"
import * as res from "./responses-brand"

/** Operation `/brand-kit/*`, `/brand-library/*`, `/product-copies/*` (OpenAPI nội bộ, PO 07/11/2026). */
const KIT = "Thương hiệu — 3 bước"
const LIB = "Thương hiệu — thư viện nhận diện"
const COPY = "Dữ liệu bán hàng sản phẩm"
const NF = "Của tổ chức khác → 404."
const UC = "Mã năng lực kiểm ở use-case."
const GEN = (step: string) =>
  `\`initial\`/\`refresh\`: 3 phương án miễn phí; \`extra\`: 1 phương án, trừ credit — bắt buộc header \`Idempotency-Key\` (thiếu → 400), hết credit → 422, AI không chạy được → hoàn credit (\`usage.refunded\`). ${step} → 400 (\`details.step\`); hết lượt hoặc chưa có lô để thêm → 409; dồn dập → 429.`

export const BRAND_OPERATIONS: OpenApiOperation[] = [
  op(KIT, { method: "get", path: "/brand-kit", operationId: "getBrandKit", summary: "Trạng thái 3 bước Thương hiệu", cap: "F1",
    description: "Hồ sơ cửa hàng → Bộ nhận diện → Landing page; mỗi bước kèm phương án đã sinh và phương án đã chọn.", ok: [200, { description: "Mục Thương hiệu", schema: res.brandKitResponse }] }),
  op(KIT, { method: "post", path: "/brand-kit/identity-options", operationId: "generateIdentityOptions", summary: "Sinh phương án Bộ nhận diện", cap: "F2", body: req.brandOptionsBody,
    description: GEN("Hồ sơ cửa hàng chưa đủ"), ok: [201, { description: "Phương án mới", schema: res.identityGeneratedResponse }], errors: [...BODY_ERRORS, 409, 422, 429] }),
  op(KIT, { method: "post", path: "/brand-kit/identity-options/{id}/select", operationId: "selectIdentityOption", summary: "Chọn Bộ nhận diện chính thức", cap: "F2",
    description: `Ghi màu, phông chữ, khẩu hiệu và logo (lưu vào kho) vào hồ sơ thương hiệu. Bước bị khoá → 400; dồn dập → 429. ${NF}`,
    ok: [200, { description: "Phương án đã chọn", schema: res.identitySelectedResponse }], errors: [400, 404, 429] }),
  op(KIT, { method: "post", path: "/brand-kit/landing-options", operationId: "generateLandingOptions", summary: "Sinh phương án Landing page chính thức", cap: "J7", body: req.brandOptionsBody,
    description: GEN("Chưa chọn Bộ nhận diện"), ok: [201, { description: "Phương án mới", schema: res.landingGeneratedResponse }], errors: [...BODY_ERRORS, 409, 422, 429] }),
  op(KIT, { method: "post", path: "/brand-kit/landing-options/{id}/select", operationId: "selectLandingOption", summary: "Chọn và xuất bản Landing page chính thức", cap: "J1",
    description: `Xuất bản tại \`/c/:slug\`; đổi phương án giữ nguyên đường dẫn. Bước bị khoá → 400; dồn dập → 429. ${NF}`,
    ok: [200, { description: "Trang đã xuất bản", schema: res.landingSelectedResponse }], errors: [400, 404, 429] }),

  op(LIB, { method: "get", path: "/brand-library", operationId: "listBrandLibrary", summary: "Thư viện nhận diện của tổ chức", cap: "F1", query: req.brandLibraryQuery,
    ok: [200, { description: "Mục", schema: res.brandLibraryResponse }] }),
  op(LIB, { method: "post", path: "/brand-library", operationId: "createBrandLibraryItem", summary: "Thêm mục nhận diện (phiên bản 1)", cap: "F2", body: req.createBrandLibraryBody,
    description: "Ảnh (`asset_id`) chỉ nhận JPG, PNG, WebP của chính tổ chức — khác → 400.", ok: [201, { description: "Mục kèm phiên bản", schema: res.brandLibraryItemResponse }], errors: BODY_ERRORS }),
  op(LIB, { method: "get", path: "/brand-library/{id}", operationId: "getBrandLibraryItem", summary: "Một mục kèm các phiên bản", cap: "F1", description: NF,
    ok: [200, { description: "Mục kèm phiên bản", schema: res.brandLibraryItemResponse }], errors: [404] }),
  op(LIB, { method: "patch", path: "/brand-library/{id}", operationId: "updateBrandLibraryItem", summary: "Sửa tên, mô tả, chia sẻ, lưu trữ", cap: "F2", body: req.patchBrandLibraryBody,
    description: NF, ok: [200, { description: "Mục kèm phiên bản", schema: res.brandLibraryItemResponse }], errors: [...BODY_ERRORS, 404] }),
  op(LIB, { method: "post", path: "/brand-library/{id}/versions", operationId: "addBrandLibraryVersion", summary: "Thêm phiên bản mới", cap: "F2", body: req.brandLibraryVersionBody,
    description: `Bản cũ giữ nguyên để xem lại. Mục đã lưu trữ → 400. ${NF}`, ok: [201, { description: "Mục kèm phiên bản", schema: res.brandLibraryItemResponse }], errors: [...BODY_ERRORS, 404] }),
  op(LIB, { method: "get", path: "/brand-library/chain", operationId: "listChainBrandLibrary", summary: "Tài nguyên chuỗi đã chia sẻ (chỉ đọc)", cap: "F1",
    description: "Cửa hàng thành viên; `data: null` khi không thuộc chuỗi.", ok: [200, { description: "Mục của chuỗi", schema: res.brandLibraryChainResponse }] }),

  op(COPY, { method: "post", path: "/product-copies/generate", operationId: "generateProductCopy", summary: "Sinh dữ liệu bán hàng từ lượt phân tích đã duyệt", cap: "H5", body: req.generateProductCopyBody,
    description: `${UC} Header \`Idempotency-Key\` bắt buộc (thiếu → 400). Lượt phân tích đã có bản → trả lại bản đó, không gọi AI lần hai. Phân tích chưa duyệt → 422; \`productId\` không khớp phân tích → 409; AI không chạy được → 500 (job hỏng, hoàn credit). ${NF}`,
    ok: [200, { description: "Bản dữ liệu bán hàng", schema: res.productCopyGeneratedResponse }], errors: [...BODY_ERRORS, 404, 409, 422, 500] }),
  op(COPY, { method: "get", path: "/product-copies", operationId: "listProductCopies", summary: "Dữ liệu bán hàng của tổ chức", cap: "H5", query: req.productCopiesQuery,
    description: `${UC} Lọc theo sản phẩm và trạng thái duyệt.`, ok: [200, { description: "Bản dữ liệu bán hàng", schema: res.productCopiesResponse }] }),
  op(COPY, { method: "get", path: "/product-copies/{id}", operationId: "getProductCopy", summary: "Một bản dữ liệu bán hàng", cap: "H5",
    description: `${UC} ${NF}`, ok: [200, { description: "Bản ghi", schema: res.productCopyResponse }], errors: [404] }),
  op(COPY, { method: "patch", path: "/product-copies/{id}", operationId: "updateProductCopy", summary: "Sửa trường trong `edited`", cap: "H5", body: req.patchProductCopyBody,
    description: `${UC} Thiếu \`edited\` hoặc có trường lạ → 400 (lỗi chỉ có \`message\`, không có \`details\`). ${NF}`,
    ok: [200, { description: "Bản ghi", schema: res.productCopyResponse }], errors: [...BODY_ERRORS, 404] }),
  op(COPY, { method: "post", path: "/product-copies/{id}/approve", operationId: "approveProductCopy", summary: "Duyệt — ghi vào Product Master", cap: "H6",
    description: `${UC} Ghi Product Master và nhật ký kiểm toán cùng giao dịch. ${NF}`, ok: [200, { description: "Bản ghi đã duyệt", schema: res.productCopyResponse }], errors: [404, 409] }),
  op(COPY, { method: "post", path: "/product-copies/{id}/reject", operationId: "rejectProductCopy", summary: "Từ chối", cap: "H6", body: req.rejectProductCopyBody,
    description: `${UC} Chỉ bản đang chờ duyệt — khác → 409. ${NF}`, ok: [200, { description: "Bản ghi đã từ chối", schema: res.productCopyResponse }], errors: [404, 409] }),
]
