import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-profile"
import * as res from "./responses-profile"

/** Operation hồ sơ & kênh cửa hàng (OpenAPI nội bộ, PO 07/11/2026). */
const PROFILE = "Hồ sơ cửa hàng"
const CHANNEL = "Kênh cửa hàng — link, QR, đánh giá"
const DOMAIN = "Tên miền riêng"
const NF = "Của tổ chức khác → 404."
const D19 = "Mã năng lực kiểm ở use-case (chỉ Điều hành)."

export const PROFILE_OPERATIONS: OpenApiOperation[] = [
  op(PROFILE, { method: "get", path: "/business-profile", operationId: "getBusinessProfile", summary: "Hồ sơ doanh nghiệp", cap: "F1",
    description: "Thân không bọc `{ data }`; chưa có hồ sơ → `null`.", ok: [200, { description: "Hồ sơ", schema: res.businessProfileResponse }] }),
  op(PROFILE, { method: "put", path: "/business-profile", operationId: "putBusinessProfile", summary: "Lưu hồ sơ doanh nghiệp", cap: "F2", body: req.putBusinessProfileBody,
    description: "Không gửi `brand_message`/`target_customers` thì giữ giá trị đang lưu. Hai trường này đi vào ngữ cảnh AI viết nội dung.", ok: [200, { description: "Hồ sơ", schema: res.businessProfileResponse }], errors: BODY_ERRORS }),
  op(PROFILE, { method: "post", path: "/business-profile/mock-data", operationId: "applyIndustryMockData", summary: "Nạp dữ liệu mẫu theo ngành (không gian trải nghiệm)", cap: "`F2` (hoặc `H4`/`N1`/`N12`)",
    body: req.industryMockDataBody, description: "Chỉ tổ chức loại không gian trải nghiệm — tổ chức thường → 403. Mã ngành lạ → 400. Trả envelope cũ `{ success: true, data }`.",
    ok: [200, { description: "Dữ liệu mẫu đã nạp", schema: res.mockDataResponse }], errors: BODY_ERRORS }),
  op(PROFILE, { method: "get", path: "/brand-profile", operationId: "getBrandProfile", summary: "Hồ sơ thương hiệu", cap: "F1",
    description: "Thân không bọc `{ data }`.", ok: [200, { description: "Hồ sơ thương hiệu", schema: res.brandProfileResponse }] }),
  op(PROFILE, { method: "put", path: "/brand-profile", operationId: "putBrandProfile", summary: "Lưu hồ sơ thương hiệu", cap: "F2", body: req.putBrandProfileBody,
    description: "`slogan` không gửi thì giữ giá trị đang lưu. `logo_asset_id` không được kiểm: mã lạ hoặc ảnh của tổ chức khác vẫn lưu (khi đó `logo_url` = `null`, không lộ ảnh) và hồ sơ bị tính là đã có logo (audit API §24).", ok: [200, { description: "Hồ sơ thương hiệu", schema: res.brandProfileResponse }], errors: BODY_ERRORS }),
  op(PROFILE, { method: "get", path: "/store/collection-transparency", operationId: "getStoreCollectionTransparency", summary: "Chuỗi đang thu thập dữ liệu gì của cửa hàng", cap: "F1",
    query: req.collectionTransparencyQuery,
    description: "Không gửi `storeId` → chi nhánh đang hoạt động đầu tiên; không có → danh sách rỗng. Chi nhánh của tổ chức khác hoặc mã lạ → 404.",
    ok: [200, { description: "Mục dữ liệu và dạng hiệu lực", schema: res.transparencyResponse }], errors: [404] }),

  op(CHANNEL, { method: "get", path: "/store-share-link", operationId: "getStoreShareLink", summary: "Link hồ sơ cửa hàng công khai đang hoạt động", cap: "F1",
    description: "Chưa có → `data: null`.", ok: [200, { description: "Link", schema: res.shareLinkResponse }] }),
  op(CHANNEL, { method: "post", path: "/store-share-link", operationId: "createStoreShareLink", summary: "Tạo link hồ sơ công khai", cap: "F2",
    description: "Chỉ xuất bản khi hồ sơ đủ mục thiết yếu (tên, liên hệ, địa chỉ, logo…) — thiếu → 400 kèm `details.missing`.", ok: [201, { description: "Link", schema: res.shareLinkResponse }], errors: [400] }),
  op(CHANNEL, { method: "post", path: "/store-share-link/revoke", operationId: "revokeStoreShareLink", summary: "Ngừng link công khai", cap: "F2",
    description: "Link cũ hiện \"đã ngừng chia sẻ\".", ok: [200, { description: "Đã ngừng", schema: res.shareLinkRevokedResponse }] }),
  op(CHANNEL, { method: "get", path: "/shop-reviews", operationId: "listShopReviews", summary: "Đánh giá khách do chủ tiệm nhập", cap: "J1", ok: [200, { description: "Đánh giá", schema: res.reviewsResponse }] }),
  op(CHANNEL, { method: "post", path: "/shop-reviews", operationId: "createShopReview", summary: "Thêm đánh giá (hiện trên Landing/Catalog)", cap: "J1", body: req.createReviewBody,
    description: "`rating` 1–5, thiếu tên/nội dung → 400.", ok: [201, { description: "Đánh giá", schema: res.reviewResponse }], errors: BODY_ERRORS }),
  op(CHANNEL, { method: "patch", path: "/shop-reviews/{id}", operationId: "updateShopReview", summary: "Sửa / ẩn đánh giá", cap: "J1", body: req.patchReviewBody, description: NF,
    ok: [200, { description: "Đánh giá", schema: res.reviewResponse }], errors: [...BODY_ERRORS, 404] }),
  op(CHANNEL, { method: "delete", path: "/shop-reviews/{id}", operationId: "removeShopReview", summary: "Xoá đánh giá", cap: "J1", description: NF,
    ok: [200, { description: "Đã xoá", schema: res.reviewRemovedResponse }], errors: [404] }),
  op(CHANNEL, { method: "get", path: "/short-links", operationId: "listShortLinks", summary: "Link/QR động có thống kê", cap: "J1", query: req.shortLinksQuery,
    description: "`limit` 1–100 (mặc định 20), sai → 400; phân trang con trỏ (`nextCursor`). Thân không bọc `{ data }`.", ok: [200, { description: "Link", schema: res.shortLinksResponse }], errors: [400] }),
  op(CHANNEL, { method: "post", path: "/short-links", operationId: "createShortLink", summary: "Tạo link/QR động", cap: "J1", body: req.createShortLinkBody,
    description: "`kind` `QR` · `SALES_LINK`; đích phải là đường dẫn trong ứng dụng. Sai → 400 `details.body` (một câu chung, không chỉ trường).", ok: [201, { description: "Link", schema: res.shortLinkResponse }], errors: BODY_ERRORS }),
  op(CHANNEL, { method: "patch", path: "/short-links/{id}", operationId: "updateShortLink", summary: "Đổi đích, tên, vị trí đặt, hạn, bật/tắt", cap: "J1", body: req.shortLinkBodySchema,
    description: `Mã đã in giữ nguyên. ${NF}`, ok: [200, { description: "Link", schema: res.shortLinkResponse }], errors: [...BODY_ERRORS, 404] }),
  op(CHANNEL, { method: "get", path: "/short-links/{id}/stats", operationId: "getShortLinkStats", summary: "Lượt quét theo ngày, thiết bị, khách riêng, lead", cap: "J1", query: req.shortLinkStatsQuery,
    description: `\`days\` mặc định 30. ${NF}`, ok: [200, { description: "Thống kê", schema: res.shortLinkStatsResponse }], errors: [404] }),

  op(DOMAIN, { method: "get", path: "/custom-domains", operationId: "listCustomDomains", summary: "Tên miền riêng kèm bản ghi DNS cần thêm", cap: "D19", description: D19,
    ok: [200, { description: "Tên miền", schema: res.domainsResponse }] }),
  op(DOMAIN, { method: "post", path: "/custom-domains", operationId: "addCustomDomain", summary: "Gắn tên miền mới (chờ xác minh)", cap: "D19", body: req.addCustomDomainBody,
    description: `${D19} Tên miền sai dạng hoặc đã có → 400/409.`, ok: [201, { description: "Tên miền", schema: res.domainResponse }], errors: [...BODY_ERRORS, 409] }),
  op(DOMAIN, { method: "post", path: "/custom-domains/{id}/verify", operationId: "verifyCustomDomain", summary: "Kiểm bản ghi TXT xác minh", cap: "D19",
    description: `${D19} Đúng → "Đang hoạt động" và gửi cấp chứng chỉ HTTPS; chưa thấy → \`verified: false\` (vẫn 200). 20 lần/phút/tổ chức → 429. ${NF}`,
    ok: [200, { description: "Kết quả", schema: res.domainVerifyResponse }], errors: [404, 429] }),
  op(DOMAIN, { method: "delete", path: "/custom-domains/{id}", operationId: "removeCustomDomain", summary: "Gỡ tên miền riêng", cap: "D19",
    description: `${D19} Tên miền đang bị nền tảng khoá → 409. ${NF}`, ok: [200, { description: "Đã gỡ", schema: res.domainRemovedResponse }], errors: [404, 409] }),
]
