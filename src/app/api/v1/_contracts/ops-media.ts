import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-media"
import * as res from "./responses-media"

/** Operation `/media/*` — tối ưu ảnh M04a và biến thể marketing M04b (OpenAPI nội bộ, PO 07/11/2026). */
const OPT = "Ảnh — tối ưu & duyệt ảnh chính"
const VAR = "Ảnh — biến thể marketing"
const JOB = [...BODY_ERRORS, 404, 409, 422, 429]
const IDEM =
  "Header `Idempotency-Key` bắt buộc (thiếu → 400); gửi lại cùng khoá, cùng thân trả job cũ (`deduped`), không trừ credit lần hai; cùng khoá khác thân → 422 `IDEMPOTENCY_KEY_REUSED`. Hết credit → 422 `QUOTA_EXCEEDED`; chạy dồn dập → 429."
const NF = "Job của tổ chức khác → 404."
const o = "/media/optimizations/{id}"
const v = "/media/variants/{id}"

export const MEDIA_OPERATIONS: OpenApiOperation[] = [
  op(OPT, { method: "post", path: "/media/optimizations", operationId: "requestOptimization", summary: "Tối ưu ảnh gốc thành ảnh chính (xếp job)", cap: "I1",
    body: req.optimizationBody,
    description: `${IDEM} Mọi bộ máy đi qua hàng đợi; \`config.enhancer_provider\` lạ → 400 trước khi trừ credit. Ảnh của tổ chức khác → 404.`,
    ok: [201, { description: "Job đã xếp", schema: res.optimizationCreatedResponse }], errors: [...BODY_ERRORS, 404, 422, 429] }),
  op(OPT, { method: "get", path: "/media/optimizations", operationId: "listPendingOptimizations", summary: "Hàng chờ duyệt ảnh đã tối ưu", cap: "I2",
    query: req.pendingQueueQuery, description: "Chỉ người duyệt; không phân trang con trỏ.", ok: [200, { description: "Hàng chờ", schema: res.pendingOptimizationsResponse }], errors: [400] }),
  op(OPT, { method: "get", path: o, operationId: "getOptimization", summary: "Trạng thái và kết quả một lượt tối ưu", cap: "I1",
    description: `\`{id}\` là \`job_id\`. Hoàn credit lúc đọc khi job hỏng/huỷ/bị Identity Guard từ chối hoặc lùi bộ máy cục bộ (một lần). ${NF}`,
    ok: [200, { description: "Kết quả", schema: res.optimizationResponse }], errors: [404] }),
  op(OPT, { method: "post", path: `${o}/approve`, operationId: "approveOptimization", summary: "Duyệt ảnh chính", cap: "I2",
    description: `Job chưa xong, không có phán quyết Identity Guard, bị từ chối hoặc đã duyệt → 409. ${NF}`,
    ok: [200, { description: "Kết quả sau duyệt", schema: res.optimizationResponse }], errors: [404, 409] }),
  op(OPT, { method: "get", path: `${o}/download`, operationId: "downloadOptimization", summary: "URL tải ảnh chính hoặc một khung", cap: "I3",
    query: req.optimizationDownloadQuery, description: `Identity Guard đã từ chối → 409. ${NF}`,
    ok: [200, { description: "URL ký có hạn", schema: res.downloadResponse }], errors: [404, 409] }),
  op(OPT, { method: "post", path: "/media/promote-to-master", operationId: "promoteOriginalToMaster", summary: "Duyệt nhanh ảnh gốc thành ảnh chính (bỏ qua tối ưu)", cap: "I2",
    body: req.promoteToMasterBody, description: "Chỉ ảnh gốc (ORIGINAL) — loại khác → 400. Ảnh của tổ chức khác → 404.",
    ok: [201, { description: "Ảnh chính đã duyệt", schema: res.promoteToMasterResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(OPT, { method: "post", path: "/media/background-removal", operationId: "removeBackgroundClosed", summary: "Đường tách nền cũ — đã đóng", cap: null, auth: "public",
    description: "Luôn trả 409 kèm đường thay thế `POST /media/variants`; không cần phiên vì không chạy gì.", ok: [409, { description: "Đã đóng" }], errors: [409] }),

  op(VAR, { method: "post", path: "/media/variants", operationId: "requestVariants", summary: "Dựng biến thể marketing từ ảnh chính (xếp job)", cap: "I4",
    body: req.mediaVariantBodySchema,
    description: `${IDEM} \`variant_count\` > 1 tạo n job cùng \`job_group_id\`, credit nhân n. Ảnh chính chưa duyệt → 409; của tổ chức khác → 404.`,
    ok: [201, { description: "Job đã xếp", schema: res.mediaVariantResultSchema }], errors: JOB }),
  op(VAR, { method: "post", path: "/media/variants/batch", operationId: "requestVariantBatch", summary: "Dựng lô biến thể theo ma trận kiểu nền × khung", cap: "I4",
    body: req.variantBatchBody, description: `${IDEM} Bỏ trống \`presets\`/\`ratios\` (hoặc \`"all"\`) chạy toàn bộ ma trận; mỗi tổ hợp một job cùng \`job_group_id\`.`,
    ok: [201, { description: "Các job đã xếp", schema: res.variantBatchResponse }], errors: JOB }),
  op(VAR, { method: "get", path: "/media/variants", operationId: "listPendingVariants", summary: "Hàng chờ duyệt biến thể", cap: "I5",
    query: req.pendingQueueQuery, ok: [200, { description: "Hàng chờ", schema: res.pendingVariantsResponse }], errors: [400] }),
  op(VAR, { method: "get", path: v, operationId: "getVariantJob", summary: "Trạng thái và kết quả một lượt dựng biến thể", cap: "I4",
    description: `\`{id}\` là \`job_id\`. Hoàn credit lúc đọc khi job hỏng/huỷ/bị cổng toàn vẹn từ chối hoặc lùi phông cục bộ (một lần). ${NF}`,
    ok: [200, { description: "Kết quả", schema: res.variantJobResponse }], errors: [404] }),
  op(VAR, { method: "post", path: `${v}/approve`, operationId: "approveVariant", summary: "Duyệt một biến thể", cap: "I5", body: req.approveVariantBody,
    description: `Job chưa xong, thiếu số đo toàn vẹn, bị từ chối hoặc biến thể đã duyệt → 409. ${NF}`,
    ok: [200, { description: "Kết quả sau duyệt", schema: res.variantJobResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(VAR, { method: "get", path: `${v}/download`, operationId: "downloadVariant", summary: "URL tải một biến thể", cap: "I3",
    query: req.variantDownloadQuery, description: `Thiếu \`asset_id\` → 400; cổng toàn vẹn đã từ chối → 409. ${NF}`,
    ok: [200, { description: "URL ký có hạn", schema: res.downloadResponse }], errors: [400, 404, 409] }),
]
