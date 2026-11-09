import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-content"
import * as res from "./responses-content"

/** Operation `/content-engine/*` và `/market-intelligence/*` (OpenAPI nội bộ, PO 07/11/2026). */
const CE = "Viết nội dung AI"
const MI = "Xu hướng thị trường & đọc ảnh"
const NF = "Của tổ chức khác → 404."
const FALLBACK = "AI không chạy được → nội dung dựng sẵn (vẫn 200), không chặn."
const SHARED = "Dữ liệu thị trường dùng chung toàn nền tảng (không theo tổ chức)."

export const CONTENT_OPERATIONS: OpenApiOperation[] = [
  op(CE, { method: "post", path: "/content-engine/generations", operationId: "generateContent", summary: "Chuỗi agent viết bài đa kênh", cap: "I1", body: req.generateContentBodySchema,
    description: "Header `Idempotency-Key` bắt buộc (thiếu → 400). Cần `asset_id` hoặc `product_id`. 201 tạo mới; trùng khoá → 200 bản cũ (`deduped`), hoặc 202 khi lượt đầu còn chạy (theo dõi `GET /jobs/{id}`), không trừ credit lần hai. AI không chạy được → bài dựng sẵn (`source`, `needsReview` trên từng bài). Hết credit → 422.",
    ok: [201, { description: "Bài vừa viết", schema: res.generationCreatedResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(CE, { method: "get", path: "/content-engine/generations", operationId: "findLatestGeneration", summary: "Bản bài viết mới nhất khớp bộ lọc", cap: "I1", query: req.generationLookupQuerySchema,
    description: "Không tạo job, không trừ credit. Chưa có → `generation: null`.", ok: [200, { description: "Bản mới nhất", schema: res.generationLookupResponse }], errors: [400] }),
  op(CE, { method: "get", path: "/content-engine/generations/{id}", operationId: "getGeneration", summary: "Một bản bài viết (kèm brief và chiến lược)", cap: "I1", description: NF,
    ok: [200, { description: "Bản bài viết", schema: res.generationResponse }], errors: [404] }),
  op(CE, { method: "post", path: "/content-engine/generations/{id}/approve", operationId: "approveGeneration", summary: "Chốt bài AI viết thành bài đã duyệt", cap: "J5", body: req.approveGenerationBodySchema,
    description: `Có thể sửa chữ/hashtag từng kênh trước khi chốt (\`edited: true\`). Ghi nhật ký kiểm toán cùng giao dịch. ${NF}`,
    ok: [200, { description: "Bài đã duyệt", schema: res.generationApprovedResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(CE, { method: "post", path: "/content-engine/landing-generate", operationId: "generateLandingContent", summary: "Viết nội dung 7 phần của landing page", cap: "J7", body: req.landingGenerateBody,
    description: `Mô tả bán hàng lấy từ bản đã duyệt của sản phẩm (máy chủ tự đọc theo \`id\`); ưu đãi chỉ lấy từ Hồ sơ tiệm — \`discountPercent\` trình duyệt gửi bị bỏ qua. Lưu vào Kho dữ liệu. ${FALLBACK}`,
    ok: [200, { description: "Gói nội dung", schema: res.landingContentResponse }], errors: BODY_ERRORS }),
  op(CE, { method: "post", path: "/content-engine/catalog-generate", operationId: "generateCatalogContent", summary: "Viết lời giới thiệu bộ sưu tập catalog", cap: "J7", body: req.catalogGenerateBody,
    description: FALLBACK, ok: [200, { description: "Nội dung catalog", schema: res.catalogContentResponse }], errors: BODY_ERRORS }),
  op(CE, { method: "post", path: "/content-engine/rewrite", operationId: "rewriteText", summary: "Viết lại nhanh một câu (3 gợi ý)", cap: "một trong `F2`, `L2`, `L3`", body: req.rewriteBody,
    description: "Mã năng lực kiểm trong route. Giữ 1 lượt `content.rewrite` trước khi gọi AI — hết credit → 422 `QUOTA_EXCEEDED` (không gian dùng thử không trừ); gợi ý dựng sẵn (`fallback: true`) thì hoàn. 30 lần/10 phút/người, 200 lần/giờ/tổ chức → 429. Trả envelope cũ `{ success: true, … }`.",
    ok: [200, { description: "Gợi ý", schema: res.rewriteResponse }], errors: [...BODY_ERRORS, 422, 429] }),

  op(MI, { method: "get", path: "/market-intelligence/opportunities", operationId: "listContentOpportunities", summary: "Cơ hội nội dung đã cá nhân hoá cho tổ chức", cap: "V2", query: req.opportunitiesQuery,
    description: "`limit` mặc định 20, máy chủ kẹp 1–100; phân trang con trỏ (`nextCursor`). `limit` không phải số hiện trả 500 (lỗi đã ghi nhận, audit API §22).",
    ok: [200, { description: "Cơ hội", schema: res.opportunitiesResponse }], errors: [500] }),
  op(MI, { method: "post", path: "/market-intelligence/research-runs", operationId: "triggerResearchRun", summary: "Kích hoạt lượt nghiên cứu xu hướng", cap: "V1", body: req.researchRunBody,
    description: `${SHARED} Thân sai lược đồ không bị từ chối — lùi về \`MANUAL\` không tham số. Chưa giới hạn tần suất (audit API §22).`,
    ok: [201, { description: "Lượt đã xếp", schema: res.researchRunResponse }] }),
  op(MI, { method: "get", path: "/market-intelligence/research-runs", operationId: "listResearchRuns", summary: "20 lượt nghiên cứu gần nhất", cap: "V1", description: SHARED,
    ok: [200, { description: "Lượt nghiên cứu", schema: res.researchRunsResponse }] }),
  op(MI, { method: "get", path: "/market-intelligence/health", operationId: "getMarketProviderHealth", summary: "Sức khoẻ các nguồn dữ liệu xu hướng", cap: "V1", description: SHARED,
    ok: [200, { description: "Nguồn", schema: res.providerHealthResponse }] }),
  op(MI, { method: "post", path: "/market-intelligence/vision-extract", operationId: "extractProductVision", summary: "Đọc ảnh sản phẩm (hợp đồng Chặng 02)", cap: "V1", body: req.visionExtractBodySchema,
    description: "Ảnh đọc từ kho theo `asset_id` của đúng tổ chức (`image_url` client gửi bị bỏ qua); thu 1 credit khi mô hình thật sự đọc ảnh, đã có kết quả của ảnh này → trả lại (`reused`). Không mô hình nào đọc được hoặc không có tệp trong kho → 500 `INTERNAL` (đã hoàn credit). Ảnh của tổ chức khác → 404.",
    ok: [200, { description: "Đặc trưng thị giác", schema: res.visionExtractResponse }], errors: [...BODY_ERRORS, 404, 422, 500] }),
  op(MI, { method: "post", path: "/market-intelligence/product-intelligence", operationId: "analyzeProductIntelligence", summary: "Phân tích sản phẩm với xu hướng (hợp đồng Chặng 03)", cap: "V1", body: req.productIntelligenceBodySchema,
    description: "Đầu vào là đầu ra Chặng 02 (đã sửa). Thiếu `components` hiện trả 500 thay vì 400 (lỗi đã ghi nhận, audit API §22).",
    ok: [200, { description: "Báo cáo phân tích", schema: res.productIntelligenceResponse }], errors: [...BODY_ERRORS, 500] }),
]
