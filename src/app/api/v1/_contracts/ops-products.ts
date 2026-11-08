import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-products"
import * as res from "./responses-products"

/** Operation sản phẩm `/products/*` (OpenAPI nội bộ, PO 07/11/2026). */
const PRODUCTS = "Sản phẩm"
const REVIEW = "Sản phẩm — duyệt, phiên bản, nhập hàng loạt"
const KIT = "Sản phẩm — từ 1 ảnh"
const L5 = "Thiếu `L5`: `cost_price_vnd` trả `null`, `attributes` bỏ khoá giá (kê trong `redacted_fields`)."
const ID = " Tổ chức khác → 404."

export const PRODUCT_OPERATIONS: OpenApiOperation[] = [
  op(PRODUCTS, { method: "get", path: "/products", operationId: "listProducts", summary: "Danh sách sản phẩm", cap: "L1", query: req.listProductsQuery,
    description: `\`proposal\` lọc mẫu đề xuất. Lọc toàn kho \`occasion\`/\`price_range\`/\`sort\` quét tối đa 3.000 mẫu, \`cursor\` dạng \`o:<n>\`, trả thêm \`total\`, \`truncated\`. ${L5}`,
    ok: [200, { description: "Trang sản phẩm", schema: res.productsResponse }], errors: [400] }),
  op(PRODUCTS, { method: "post", path: "/products", operationId: "createProduct", summary: "Tạo sản phẩm", cap: "L2", body: req.createProductBody,
    description: "Gửi `cost_price_vnd` cần thêm `L5`. Người thiếu `H3` tạo → mẫu mang nhãn đề xuất, báo Điều hành. Ảnh/chi nhánh của tổ chức khác → 404.",
    ok: [201, { description: "Sản phẩm đã tạo", schema: res.productRow }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(PRODUCTS, { method: "get", path: "/products/{id}", operationId: "getProduct", summary: "Chi tiết sản phẩm", cap: "L1", description: L5 + ID,
    ok: [200, { description: "Sản phẩm", schema: res.productLookup }], errors: [404] }),
  op(PRODUCTS, { method: "patch", path: "/products/{id}", operationId: "updateProduct", summary: "Sửa sản phẩm", cap: "L3", body: req.patchProductBody,
    description: "Chuyển `ARCHIVED` cần thêm `L4`; sửa `cost_price_vnd` cần thêm `L5`. Mở bán khi chưa đủ điều kiện vẫn lưu, trả `readiness_warnings`." + ID,
    ok: [200, { description: "Sản phẩm sau khi sửa", schema: res.updatedProductResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(PRODUCTS, { method: "get", path: "/products/master-index", operationId: "listProductMasterIndex", summary: "Hồ sơ đầy đủ (công thức, ảnh, giá, màu) toàn tổ chức", cap: "L1",
    query: req.masterIndexQuery, ok: [200, { description: "Hồ sơ sản phẩm", schema: res.masterIndexListResponse }] }),
  op(PRODUCTS, { method: "get", path: "/products/{id}/master-index", operationId: "getProductMasterIndex", summary: "Hồ sơ đầy đủ của một sản phẩm", cap: "L1",
    ok: [200, { description: "Hồ sơ sản phẩm", schema: res.masterIndexItemResponse }], errors: [404] }),
  op(PRODUCTS, { method: "get", path: "/products/export", operationId: "exportProducts", summary: "Xuất CSV danh sách sản phẩm", cap: "R13", query: req.exportProductsQuery,
    description: "Cột giá chỉ khi có `L5`; tối đa 5.000 dòng (header `X-Export-Truncated: 1` khi bị cắt).",
    ok: [200, { description: "Tệp CSV", contentType: "text/csv; charset=utf-8" }], errors: [400] }),
  op(PRODUCTS, { method: "post", path: "/products/bulk-status", operationId: "bulkUpdateProductStatus", summary: "Đổi trạng thái hàng loạt", cap: "L3", body: req.bulkStatusBody,
    description: "Chuyển `ARCHIVED` cần thêm `L4`. Từng dòng qua cùng luật sửa sản phẩm; mở bán kèm `warnings` các mẫu còn thiếu điều kiện.",
    ok: [200, { description: "Dòng đã đổi và dòng hỏng", schema: res.bulkStatusResponse }], errors: BODY_ERRORS }),
  op(PRODUCTS, { method: "post", path: "/products/drive-thumbnails", operationId: "resolveDriveThumbnails", summary: "Phân giải ảnh thu nhỏ của tối đa 50 thư mục Drive", cap: "L2",
    body: req.driveThumbnailsBody, description: "60 lần/phút/người dùng.",
    ok: [200, { description: "URL ảnh theo thư mục (`null` khi không có ảnh)", schema: res.driveThumbnailsResponse }], errors: [...BODY_ERRORS, 429] }),

  op(REVIEW, { method: "post", path: "/products/{id}/approve", operationId: "approveProductProposal", summary: "Duyệt mẫu đề xuất vào danh mục chính thức", cap: "H3",
    description: "Không có đề xuất chờ duyệt → 422." + ID, ok: [200, { description: "Sản phẩm đã duyệt", schema: res.productRow }], errors: [404, 422] }),
  op(REVIEW, { method: "post", path: "/products/{id}/reject", operationId: "rejectProductProposal", summary: "Từ chối mẫu đề xuất (bắt buộc lý do)", cap: "H3", body: req.rejectProductBody,
    description: "Mẫu tạm ẩn (`DRAFT`), báo người đề xuất; 30 ngày sau vào thùng rác." + ID,
    ok: [200, { description: "Sản phẩm đã từ chối", schema: res.productRow }], errors: [...BODY_ERRORS, 404, 422] }),
  op(REVIEW, { method: "get", path: "/products/{id}/change-requests", operationId: "listProductChangeRequests", summary: "Đề xuất sửa đang chờ của một mẫu", cap: "H3",
    ok: [200, { description: "Đề xuất", schema: res.changeRequestsResponse }], errors: [404] }),
  op(REVIEW, { method: "post", path: "/products/{id}/change-requests", operationId: "submitProductChangeRequest", summary: "Đề xuất sửa mẫu chính thức", cap: "L3", body: req.changeRequestBody,
    description: "Bản gốc giữ nguyên, báo Điều hành. Không có thay đổi → 422." + ID,
    ok: [201, { description: "Đề xuất đã tạo", schema: res.changeRequestRow }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(REVIEW, { method: "get", path: "/products/{id}/revisions", operationId: "listProductRevisions", summary: "50 phiên bản gần nhất của mẫu", cap: "H3",
    ok: [200, { description: "Phiên bản, mới nhất trước", schema: res.revisionsResponse }], errors: [404] }),
  op(REVIEW, { method: "post", path: "/products/{id}/revisions/{revisionId}/restore", operationId: "restoreProductRevision", summary: "Khôi phục một phiên bản", cap: "H3",
    description: "Giữ trạng thái bán và nhãn đề xuất hiện tại; bản hiện tại được lưu thành phiên bản trước khi ghi." + ID,
    ok: [200, { description: "Sản phẩm sau khi khôi phục", schema: res.productRow }], errors: [404, 409, 422] }),
  op(REVIEW, { method: "post", path: "/products/batch-import", operationId: "batchImportProducts", summary: "Nhập hàng loạt (tối đa 500 dòng)", cap: "L2 + H3", body: req.batchImportBody,
    description: "Mỗi lần gọi là một lô (`batch_id`) hoàn tác được trong 24 giờ; tệp không gắn/gỡ được nhãn đề xuất.",
    ok: [201, { description: "Kết quả theo dòng", schema: res.batchImportResponse }], errors: BODY_ERRORS }),
  op(REVIEW, { method: "get", path: "/products/import-batches", operationId: "listImportBatches", summary: "10 lô nhập gần nhất", cap: "H3",
    ok: [200, { description: "Lô nhập, `canUndo` trong 24 giờ", schema: res.importBatchesResponse }] }),
  op(REVIEW, { method: "post", path: "/products/import-batches/{id}/undo", operationId: "undoImportBatch", summary: "Hoàn tác lô nhập", cap: "H3",
    description: "Mẫu tạo ra vào thùng rác, mẫu bị cập nhật trả về bản trước lô; quá 24 giờ hoặc đã hoàn tác → 422." + ID,
    ok: [200, { description: "Số mẫu đã xử lý", schema: res.undoImportBatchResponse }], errors: [404, 422] }),

  op(KIT, { method: "post", path: "/products/one-image-kit", operationId: "startOneImageKit", summary: "Gửi một ảnh đi nhận diện", cap: "H1", body: req.oneImageKitBody,
    description: "Header `Idempotency-Key` bắt buộc. Trừ credit theo bảng giá; hết credit → 422 `QUOTA_EXCEEDED`. Mã năng lực kiểm ở use-case.",
    ok: [202, { description: "Job nhận diện đã xếp hàng", schema: res.oneImageKitStartResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(KIT, { method: "get", path: "/products/one-image-kit", operationId: "getOneImageKitProgress", summary: "Tiến độ nhận diện và tóm tắt kết quả", cap: "H1", query: req.oneImageKitQuery,
    ok: [200, { description: "Trạng thái job; `analysis` khi đã có kết quả", schema: res.oneImageKitProgressResponse }], errors: [400, 404] }),
  op(KIT, { method: "post", path: "/products/one-image-kit/run", operationId: "runOneImageKit", summary: "Chạy chuỗi sau nhận diện: thẻ sản phẩm, nội dung, giá vốn, bài đăng, thẻ in", cap: "H3",
    body: req.oneImageKitRunBody, description: "Header `Idempotency-Key` bắt buộc. Bước hỏng vẫn trả 200 với `status = FAILED`, `failedStep` và các đầu ra đã có.",
    ok: [200, { description: "Kết quả từng bước", schema: res.oneImageKitRunResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
]
