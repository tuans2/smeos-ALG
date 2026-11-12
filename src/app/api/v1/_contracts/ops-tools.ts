import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-tools"
import * as res from "./responses-tools"

/** Operation nhóm công cụ (OpenAPI nội bộ, PO 07/11/2026). */
const BANNER = "Ấn phẩm quảng cáo"
const FIELD = "Trường dữ liệu"
const TPL = "Ghi đè mẫu"
const ORG = "Định danh tổ chức"
const PROXY = "Chuyển tiếp sang hệ thống ngoài"
const NF = "Của tổ chức khác → 404."
const PROXY_DESC =
  "Chuyển tiếp nguyên văn sang SocialFlow/LocalBudd (`client` bắt buộc; sai → 400) với danh tính SSO của người gọi, không gửi cookie của core. Chỉ đường dẫn trong danh sách trắng — khác → 404. Luôn đòi phiên của tổ chức (chưa đăng nhập → 401, không chuyển tiếp — audit API §33); lệnh ghi `api/accounts` của SocialFlow còn đòi `J5`. Phản hồi là phản hồi của hệ thống đích; không gọi được → 500 thông báo chung (chi tiết chỉ vào log máy chủ)."
const proxyOp = (method: "get" | "post" | "put" | "patch" | "delete", id: string) =>
  op(PROXY, { method, path: "/proxy/{path}", operationId: id, summary: `Chuyển tiếp ${method.toUpperCase()} sang hệ thống ngoài`, cap: null, auth: "session", query: req.proxyQuery,
    ...(method === "get" || method === "delete" ? {} : { body: req.proxyBody }), description: PROXY_DESC,
    ok: [200, { description: "Phản hồi của hệ thống đích (nguyên văn)" }], errors: [400, 401, 403, 404, 500] })

export const TOOLS_OPERATIONS: OpenApiOperation[] = [
  op(BANNER, { method: "get", path: "/ad-banner-poster/copy", operationId: "listBannerPromotions", summary: "Ưu đãi tiệm đang bật — nguồn duy nhất cho ô ưu đãi trên poster", cap: "I1",
    ok: [200, { description: "Ưu đãi", schema: res.bannerPromotionsResponse }] }),
  op(BANNER, { method: "post", path: "/ad-banner-poster/copy", operationId: "generateBannerCopy", summary: "Sinh chữ cho banner", cap: "I1", body: req.bannerCopyBody,
    description: "Gọi AI qua cổng `callCapability` (năng lực `content_generation`, sàn quyền riêng tư `SHOP`, ghi sổ `ai_requests` của tổ chức). Nhãn ưu đãi chỉ lấy từ ưu đãi tiệm đang bật. Mô hình không chạy được → mẫu dựng sẵn (`source: INSTANT_TEMPLATE`), vẫn 200.", ok: [200, { description: "Chữ banner", schema: res.bannerCopyResponse }], errors: BODY_ERRORS }),
  op(BANNER, { method: "post", path: "/ad-banner-poster/render", operationId: "renderBanner", summary: "Dựng banner theo khổ và kiểm chất lượng", cap: "I1", body: req.bannerRenderBody,
    description: "Mỗi khổ trong `target_formats` một kết quả. Thiếu ảnh sản phẩm thật → QC không đạt (`product_fidelity`), vẫn 200.", ok: [200, { description: "Kết quả dựng", schema: res.bannerRenderResponse }], errors: BODY_ERRORS }),
  op(BANNER, { method: "post", path: "/ad-banner-poster/save", operationId: "saveBannerToLibrary", summary: "Lưu banner PNG đã dựng vào thư viện", cap: "G2", body: req.bannerSaveBody,
    description: "`image_data` là PNG (base64 hoặc data URL); kiểm chữ ký PNG và ≤ 20 MB trước khi ghi kho — sai → 400. Tư liệu chờ duyệt.", ok: [201, { description: "Tư liệu", schema: res.bannerSavedResponse }], errors: BODY_ERRORS }),

  op(FIELD, { method: "get", path: "/field-config", operationId: "getEffectiveFieldConfig", summary: "Cấu hình trường hiệu lực của tổ chức", cap: "R1", query: req.fieldConfigQuery,
    description: "Mã năng lực kiểm ở use-case. Lớp mã + cấu hình nền tảng + ghi đè của tổ chức + trường riêng. `entity` lạ → danh sách rỗng (không 400).", ok: [200, { description: "Trường", schema: res.fieldConfigResponse }] }),
  op(FIELD, { method: "post", path: "/field-config", operationId: "createShopField", summary: "Cửa hàng tạo trường riêng", cap: "D18", body: req.createShopFieldSchema,
    description: "Mã năng lực kiểm ở use-case. Khoá máy sinh từ nhãn; nhãn trùng → thêm hậu tố (`cf_…_2`).", ok: [201, { description: "Trường", schema: res.shopFieldCreatedResponse }], errors: BODY_ERRORS }),
  op(FIELD, { method: "put", path: "/field-config", operationId: "updateShopField", summary: "Ẩn/hiện, đổi nhãn, nâng mức một trường", cap: "D18", body: req.updateShopFieldSchema,
    description: `Mã năng lực kiểm ở use-case. Trường nền tảng: ghi đè của chính tổ chức, không hạ dưới mức sàn, không ẩn trường bắt buộc. ${NF}`, ok: [200, { description: "Trường", schema: res.shopFieldUpdatedResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(FIELD, { method: "get", path: "/field-config/settings", operationId: "listShopFieldSettings", summary: "Danh sách trường cho màn Cài đặt (gồm trường đang ẩn)", cap: "D18", query: req.fieldConfigQuery,
    description: "Mã năng lực kiểm ở use-case. Trường nền tảng kèm mức sàn (`floorRequirement`, `canHide`) và trường riêng.", ok: [200, { description: "Trường", schema: res.fieldSettingsResponse }] }),
  op(FIELD, { method: "get", path: "/field-config/catalogs", operationId: "listFieldCatalogs", summary: "Danh mục cho form nhập liệu", cap: "R1", query: req.fieldCatalogsQuery,
    description: "Chỉ giá trị đang bật; `keys` cách dấu phẩy, bỏ trống trả hết.", ok: [200, { description: "Danh mục", schema: res.fieldCatalogsResponse }] }),

  op(TPL, { method: "get", path: "/template-overrides", operationId: "listTemplateOverrides", summary: "Ghi đè của một mẫu", cap: "F1", query: req.templateOverridesQuery,
    description: "Thiếu `templateKey` → 400. `next_cursor` luôn `null`.", ok: [200, { description: "Ghi đè", schema: res.templateOverridesResponse }], errors: [400] }),
  op(TPL, { method: "put", path: "/template-overrides", operationId: "setTemplateOverride", summary: "Ghi đè một trường của mẫu", cap: "F2", body: req.putTemplateOverrideBody,
    description: "Chỉ các cặp mẫu/trường đã có nơi đọc thật trong mã; khác → 400. Giá trị cắt khoảng trắng, quá độ dài → 400.", ok: [200, { description: "Ghi đè", schema: res.templateOverrideResponse }], errors: BODY_ERRORS }),
  op(TPL, { method: "delete", path: "/template-overrides/{templateKey}/{fieldKey}", operationId: "removeTemplateOverride", summary: "Bỏ ghi đè, về giá trị mặc định", cap: "F2",
    description: "Chưa có ghi đè → 404.", ok: [200, { description: "Đã bỏ", schema: res.overrideRemovedResponse }], errors: [404] }),

  op(ORG, { method: "get", path: "/noi-bo/identity", operationId: "getOrganizationIdentity", summary: "Định danh tổ chức của phiên, liên kết chuỗi, thành viên", cap: "F1",
    description: "Có tên và email của tối đa 100 thành viên đang hoạt động — cùng mã `F1` với `GET /members`.",
    ok: [200, { description: "Định danh", schema: res.identityResponse }], errors: [404] }),

  proxyOp("get", "proxyGet"),
  proxyOp("post", "proxyPost"),
  proxyOp("put", "proxyPut"),
  proxyOp("patch", "proxyPatch"),
  proxyOp("delete", "proxyDelete"),
]
