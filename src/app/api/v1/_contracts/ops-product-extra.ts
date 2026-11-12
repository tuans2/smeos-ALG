import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-product-extra"
import * as res from "./responses-product-extra"

/** Operation nhóm sản phẩm phụ (OpenAPI nội bộ, PO 07/11/2026). */
const PHOTO = "Ảnh studio & bộ ảnh sản phẩm"
const CR = "Đề xuất sửa sản phẩm"
const AV = "Lịch khả dụng"
const NF = "Của tổ chức khác → 404."
const IDEM = "Header `Idempotency-Key` bắt buộc (thiếu → 400); gửi lại cùng khoá, cùng thân trả job cũ, không trừ credit lần hai; cùng khoá khác thân → 422 `IDEMPOTENCY_KEY_REUSED`. Hết credit → 422. Ảnh `asset_id` của tổ chức khác hoặc lạ → 404."
const STATIC = "Danh mục tĩnh, không cần phiên (không đọc dữ liệu tổ chức)."

export const PRODUCT_EXTRA_OPERATIONS: OpenApiOperation[] = [
  op(PHOTO, { method: "get", path: "/product-photo", operationId: "listProductPhotoPresets", summary: "Phông nền và tỉ lệ khung có sẵn cho ảnh studio", cap: null, auth: "public",
    description: STATIC, ok: [200, { description: "Danh mục", schema: res.photoCatalogResponse }] }),
  op(PHOTO, { method: "post", path: "/product-photo", operationId: "createProductPhotoJob", summary: "Tạo ảnh studio từ ảnh sản phẩm (thay nền, giữ nguyên sản phẩm)", cap: "I1",
    body: req.productPhotoBody, description: `${IDEM} Theo dõi bằng \`GET /product-photo/{id}\`.`, ok: [201, { description: "Job đã xếp hàng", schema: res.jobCreatedResponse }], errors: [...BODY_ERRORS, 404, 422, 429] }),
  op(PHOTO, { method: "get", path: "/product-photo/{id}", operationId: "getProductPhotoResult", summary: "Kết quả ảnh studio và điểm kiểm chất lượng", cap: "G1",
    description: `Job chưa có điểm → mọi tiêu chí mặc định đạt; dùng \`canApprove\` (chỉ \`true\` khi job xong và đạt). ${NF}`, ok: [200, { description: "Kết quả", schema: res.photoResultResponse }], errors: [404] }),
  op(PHOTO, { method: "post", path: "/product-photo/{id}/retry", operationId: "retryProductPhoto", summary: "Làm lại ảnh chưa đạt", cap: "I1", body: req.productPhotoRetryBody,
    description: `${IDEM} Ảnh đã đạt hoặc đã làm lại 2 lần → 400 (\`details.retry\`). ${NF}`, ok: [201, { description: "Job mới", schema: res.jobCreatedResponse }], errors: [...BODY_ERRORS, 404, 422, 429] }),
  op(PHOTO, { method: "get", path: "/product-image-set", operationId: "listProductImageSetBundles", summary: "Gói bộ ảnh đa kênh có sẵn", cap: null, auth: "public",
    description: STATIC, ok: [200, { description: "Danh mục", schema: res.imageSetCatalogResponse }] }),
  op(PHOTO, { method: "post", path: "/product-image-set", operationId: "createProductImageSetJob", summary: "Tạo bộ ảnh nhiều tỉ lệ/góc từ một ảnh sản phẩm", cap: "I1",
    body: req.productImageSetBody, description: `${IDEM} \`bundle_id\` mặc định gói đa kênh.`, ok: [201, { description: "Job đã xếp hàng", schema: res.jobCreatedResponse }], errors: [...BODY_ERRORS, 404, 422, 429] }),
  op(PHOTO, { method: "get", path: "/product-image-set/{id}", operationId: "getProductImageSetResult", summary: "Kết quả bộ ảnh", cap: "G1",
    description: `Job chưa xong → \`url\` từng biến thể là ảnh gốc, điểm kiểm chất lượng là giá trị mặc định. ${NF}`, ok: [200, { description: "Kết quả", schema: res.imageSetResultResponse }], errors: [404] }),

  op(CR, { method: "get", path: "/product-change-requests", operationId: "listChangeRequestQueue", summary: "Hàng chờ đề xuất sửa của tổ chức", cap: "H3", query: req.changeRequestsQuery,
    description: "`status` mặc định `PENDING`; lạ → 400.", ok: [200, { description: "Đề xuất", schema: res.changeRequestsResponse }], errors: [400] }),
  op(CR, { method: "post", path: "/product-change-requests/{id}/approve", operationId: "approveProductChangeRequest", summary: "Duyệt đề xuất — toàn bộ hoặc chỉ `fields`", cap: "H3", body: req.approveChangeRequestBody,
    description: `Lưu phiên bản trước khi ghi. Bản gốc đã đổi sau lúc gửi → 409; đề xuất không còn chờ → 422. Trả dòng sản phẩm sau khi áp. ${NF}`,
    ok: [200, { description: "Sản phẩm", schema: res.changeRequestApprovedResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(CR, { method: "post", path: "/product-change-requests/{id}/reject", operationId: "rejectProductChangeRequest", summary: "Từ chối đề xuất (bắt buộc lý do)", cap: "H3", body: req.rejectChangeRequestBody,
    description: `Lý do rỗng → 400; đề xuất không còn chờ → 422. ${NF}`, ok: [200, { description: "Đã từ chối", schema: res.changeRequestRejectedResponse }], errors: [...BODY_ERRORS, 404, 422] }),

  op(AV, { method: "get", path: "/availability/board", operationId: "getAvailabilityBoard", summary: "Bảng khả dụng theo tháng (đặt phòng, khung giờ, tồn kho)", cap: "L1", query: req.availabilityBoardQuery,
    description: "`month` `YYYY-MM`; thiếu hoặc sai dạng → tháng hiện tại (không báo lỗi). Chế độ theo ngành của tổ chức.", ok: [200, { description: "Bảng", schema: res.boardResponse }] }),
  op(AV, { method: "post", path: "/availability/blocks", operationId: "createAvailabilityBlock", summary: "Chặn ngày thủ công", cap: "L3", body: req.availabilityBlockBody,
    description: "Ngày `YYYY-MM-DD`, ngày ra không tính. Sai → 400.", ok: [200, { description: "Đã chặn", schema: res.blockCreatedResponse }], errors: BODY_ERRORS }),
  op(AV, { method: "delete", path: "/availability/blocks/{id}", operationId: "removeAvailabilityBlock", summary: "Bỏ chặn thủ công", cap: "L3",
    description: `Chỉ xoá được dòng không gắn đơn. ${NF}`, ok: [200, { description: "Đã bỏ chặn", schema: res.blockRemovedResponse }], errors: [404] }),
]
