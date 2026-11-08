import { z } from "zod"

import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-creative"
import * as plan from "./responses-creative-plan"
import * as res from "./responses-creative"

/** Operation Creative Studio `/creative-production/*` (OpenAPI nội bộ, PO 07/11/2026 — chỉ ghi tài liệu, PO 08/11/2026). */
const PLAN = "Creative Studio — kế hoạch & nội dung"
const SCENE = "Creative Studio — kịch bản phân cảnh & video"
const PKG = "Creative Studio — gói chiến dịch"
const ACT = [...BODY_ERRORS, 404, 409, 422]
const IDEM = "Header `Idempotency-Key` bắt buộc. Trừ credit theo bảng giá; hết credit → 422 `QUOTA_EXCEEDED`."
const NF = " Gói của tổ chức khác → 404."
const p = "/creative-production/packages/{id}"

export const CREATIVE_OPERATIONS: OpenApiOperation[] = [
  op(PLAN, { method: "post", path: "/creative-production/plan", operationId: "planCreativeProduction", summary: "Lập kế hoạch sản xuất (chặng 06) và ước tính credit", cap: "I1",
    body: req.planBody, description: "Hàm thuần — không gọi AI, không ghi gì. `organizationId` trong thân phải khớp phiên (400).",
    ok: [201, { description: "Kế hoạch", schema: plan.planResponse }], errors: BODY_ERRORS }),
  op(PLAN, { method: "post", path: "/creative-production/produce", operationId: "produceCreativeBriefs", summary: "Dựng đề bài sản xuất ảnh/video/giọng/nội dung theo chủ đề", cap: "I1",
    body: req.produceBody, description: "Hàm thuần — trả đầu vào cho các job, không tự tạo job.", ok: [201, { description: "Đề bài theo chủ đề", schema: plan.produceResponse }], errors: BODY_ERRORS }),
  op(PLAN, { method: "post", path: "/creative-production/package", operationId: "packageCampaignDraft", summary: "Gộp kết quả sản xuất thành bản nháp chiến dịch", cap: "I1",
    body: req.packageCampaignBody,
    description: "Hàm thuần — không lưu (gói lưu được ở `POST /creative-production/packages`). Cần ít nhất một trong `creativeResult`/`authenticResult` (kết quả của `/produce`); thiếu cả hai hiện trả 500 (lỗi đã ghi nhận).",
    ok: [201, { description: "Bản nháp chiến dịch", schema: plan.packageResponse }], errors: [...BODY_ERRORS, 500] }),
  op(PLAN, { method: "get", path: "/creative-production/content-drafts", operationId: "getContentDraft", summary: "Bản nháp bài đăng theo ảnh + chủ đề + chế độ", cap: "I1",
    query: req.contentDraftKeySchema, ok: [200, { description: "Bản nháp, hoặc `null`", schema: res.contentDraftResponse }], errors: [400] }),
  op(PLAN, { method: "put", path: "/creative-production/content-drafts", operationId: "saveContentDraft", summary: "Lưu bản nháp bài đăng", cap: "I1", body: req.contentDraftBodySchema,
    description: "Ảnh của tổ chức khác → 404.", ok: [200, { description: "Bản nháp", schema: res.contentDraftResponse }], errors: [...BODY_ERRORS, 404] }),
  op(PLAN, { method: "post", path: "/creative-production/content-rewrites", operationId: "rewriteContent", summary: "AI viết lại bài đăng theo yêu cầu", cap: "I1", body: req.contentRewriteBody,
    description: IDEM, ok: [200, { description: "Bài viết lại", schema: res.contentRewriteResponse }], errors: [...BODY_ERRORS, 422] }),
  op(PLAN, { method: "get", path: "/creative-production/providers", operationId: "getProviderPreferences", summary: "Nhà cung cấp AI theo nhóm và thứ tự ưu tiên của tiệm", cap: "I1",
    description: "Mã năng lực kiểm ở use-case.", ok: [200, { description: "Danh mục", schema: res.providerPreferencesResponse }] }),
  op(PLAN, { method: "put", path: "/creative-production/providers", operationId: "setProviderOrder", summary: "Đổi thứ tự ưu tiên nhà cung cấp của một nhóm", cap: "U2",
    body: req.providerOrderBody, description: "Mã năng lực kiểm ở use-case; mã nhà cung cấp lạ → 400.", ok: [200, { description: "Danh mục", schema: res.providerPreferencesResponse }], errors: BODY_ERRORS }),

  op(SCENE, { method: "post", path: "/creative-production/scene-plans", operationId: "createScenePlan", summary: "Sinh kịch bản phân cảnh (chặng 05)", cap: "I1", body: req.scenePlanBodySchema,
    description: `${IDEM} Gửi lại cùng khoá trả kịch bản đã có (200, \`deduped\`).`,
    ok: [201, { description: "Kịch bản (hoặc job đang chạy)", schema: res.scenePlanCreatedResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(SCENE, { method: "get", path: "/creative-production/scene-plans", operationId: "findScenePlan", summary: "Tìm kịch bản theo ảnh + chủ đề + chế độ", cap: "I1",
    query: req.scenePlanLookupQuery, ok: [200, { description: "Kịch bản; không có → mọi trường `null`", schema: res.scenePlanResponse }], errors: [400] }),
  op(SCENE, { method: "get", path: "/creative-production/scene-plans/{id}", operationId: "getScenePlan", summary: "Kịch bản theo id job", cap: "I1",
    description: "Của tổ chức khác → 404.", ok: [200, { description: "Kịch bản", schema: res.scenePlanResponse }], errors: [404] }),
  op(SCENE, { method: "patch", path: "/creative-production/scene-plans/{id}", operationId: "updateScenePlan", summary: "Sửa kịch bản: nền tảng, đầu ra, cảnh, giọng/nhạc, video, bài đăng", cap: "I1",
    body: req.patchScenePlanBody, description: "Giọng ngoài danh mục → 400; mỗi lần sửa tăng phiên bản.", ok: [200, { description: "Kịch bản", schema: res.scenePlanResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(SCENE, { method: "post", path: "/creative-production/scene-revisions", operationId: "reviseScene", summary: "AI sửa một cảnh theo yêu cầu", cap: "I1", body: req.sceneRevisionBody,
    description: IDEM, ok: [200, { description: "Cảnh mới", schema: res.sceneRevisionResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(SCENE, { method: "post", path: "/creative-production/video-assembly", operationId: "assembleVideo", summary: "Ráp video từ kịch bản + ảnh cảnh + giọng đọc", cap: "I1",
    body: req.videoAssemblyBody, description: "`dry_run` chỉ kiểm; thiếu ảnh/giọng hoặc khung ngoài phạm vi → `ready: false` kèm `problems`, không tạo job.",
    ok: [200, { description: "Bảng ráp và job video", schema: res.videoAssemblyResponse }], errors: [...BODY_ERRORS, 404, 422] }),

  op(PKG, { method: "post", path: "/creative-production/packages", operationId: "createCampaignPackage", summary: "Lưu gói chiến dịch (chặng 07)", cap: "I1", body: req.createPackageBodySchema,
    description: "Ảnh/job của tổ chức khác → 404.", ok: [201, { description: "Gói", schema: res.campaignPackageResponse }], errors: ACT }),
  op(PKG, { method: "get", path: "/creative-production/packages", operationId: "listCampaignPackages", summary: "Gói chiến dịch", cap: "G1",
    query: z.object({ master_asset_id: z.string().optional(), limit: z.string().regex(/^\d+$/).optional() }), ok: [200, { description: "Gói", schema: res.campaignPackagesResponse }], errors: [400] }),
  op(PKG, { method: "get", path: p, operationId: "getCampaignPackage", summary: "Chi tiết gói (URL ảnh/video ký có hạn)", cap: "G1", description: NF.trim(),
    ok: [200, { description: "Gói", schema: res.campaignPackageResponse }], errors: [404] }),
  op(PKG, { method: "patch", path: p, operationId: "updateCampaignPackage", summary: "Sửa gói: tên, bài đăng, ảnh, video, giọng", cap: "I1", body: req.patchPackageBody,
    description: "Gói đã duyệt/đăng không sửa được (409)." + NF, ok: [200, { description: "Gói", schema: res.campaignPackageResponse }], errors: ACT }),
  op(PKG, { method: "post", path: `${p}/qa`, operationId: "runCampaignQa", summary: "Kiểm tra chất lượng gói (chặng 08)", cap: "I1", description: NF.trim(),
    ok: [200, { description: "Gói kèm báo cáo QA", schema: res.campaignPackageResponse }], errors: [404, 409] }),
  op(PKG, { method: "post", path: `${p}/approve`, operationId: "approveCampaignPackage", summary: "Chủ shop duyệt gói (chặng 09)", cap: "J5", body: req.approveBodySchema,
    description: "QA còn cảnh báo cần `acknowledge_warnings`; chưa QA hoặc QA lỗi → 409." + NF, ok: [200, { description: "Gói đã duyệt", schema: res.campaignPackageResponse }], errors: ACT }),
  op(PKG, { method: "put", path: `${p}/launch`, operationId: "saveLaunchPlan", summary: "Kế hoạch đăng đa kênh (chặng 10)", cap: "J5", body: req.launchPlanBodySchema,
    description: "Chỉ gói đã duyệt (409)." + NF, ok: [200, { description: "Gói", schema: res.campaignPackageResponse }], errors: ACT }),
  op(PKG, { method: "get", path: `${p}/performance`, operationId: "getCampaignPerformance", summary: "Hiệu quả gói: bán, đo, học, việc tiếp theo (chặng 11–14)", cap: "R1",
    description: NF.trim(), ok: [200, { description: "Hiệu quả", schema: res.campaignPerformanceResponse }], errors: [404] }),
]
