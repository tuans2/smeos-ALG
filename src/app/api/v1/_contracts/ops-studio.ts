import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-studio"
import * as res from "./responses-studio"

/** Operation hành trình Tạo nội dung và Đăng tự động (OpenAPI nội bộ, PO 07/11/2026). */
const STUDIO = "Tạo nội dung — hành trình 4 bước"
const SOCIAL = "Đăng bài tự động"
const NF = "Của tổ chức khác hoặc mã lạ → 404."
const PAGE = "`limit` 1–100 (mặc định 25), sai → 400; `cursor` mờ → `{ data, next_cursor }`."
const CHANNEL_NF = "`channel`: `facebook` · `instagram` · `zalo` · `tiktok`; khác → 404."

export const STUDIO_OPERATIONS: OpenApiOperation[] = [
  op(STUDIO, { method: "get", path: "/content-studio/products", operationId: "listContentLibrary", summary: "Kho sản phẩm kèm cờ đã có gì cho từng bước", cap: "L1", query: req.contentLibraryQuery,
    description: `Phạm vi chi nhánh, che giá như \`/products\`. ${PAGE}`, ok: [200, { description: "Sản phẩm", schema: res.contentLibraryResponse }], errors: [400] }),
  op(STUDIO, { method: "get", path: "/content-studio/products/{id}", operationId: "getContentProduct", summary: "Sản phẩm đang làm: bản quét, Bài giới thiệu, Thẻ chào, bài đăng, cờ từng bước", cap: "L1",
    description: `Tổ chức / chi nhánh khác → 404. ${NF}`, ok: [200, { description: "Sản phẩm", schema: res.contentProductResponse }], errors: [404] }),
  op(STUDIO, { method: "put", path: "/content-studio/products/{id}/sales-pitch", operationId: "saveSalesPitch", summary: "Chốt Thẻ chào sản phẩm (tư vấn bán hàng)", cap: "L3", body: req.salesPitchBody,
    description: `Ghi \`products.attributes.sales_pitch\`, giữ mọi khoá khác, \`version\` tăng mỗi lần chốt; mẫu chính thức chỉ \`H3\` sửa được. Thẻ sản phẩm / Bài giới thiệu chưa duyệt → 409. 30 lần/phút/người → 429. ${NF}`,
    ok: [200, { description: "Thẻ chào đã lưu", schema: res.salesPitchSavedResponse }], errors: [...BODY_ERRORS, 404, 429] }),
  op(STUDIO, { method: "get", path: "/content-studio/scans/{jobId}", operationId: "getScanResults", summary: "Các Thẻ sản phẩm của một lượt quét ảnh", cap: "H1",
    description: "Mỗi ảnh một dòng, tối đa 20. Lượt của tổ chức khác → danh sách rỗng (không 404).", ok: [200, { description: "Bản quét", schema: res.scanResultsResponse }] }),

  op(SOCIAL, { method: "get", path: "/social-publishing/channels", operationId: "listSocialChannels", summary: "Trạng thái kết nối 4 kênh", cap: "J5",
    description: "Không trả khoá. `app_configured: false` → nền tảng chưa cấu hình ứng dụng, kênh chưa mở.", ok: [200, { description: "Kênh", schema: res.channelsResponse }] }),
  op(SOCIAL, { method: "post", path: "/social-publishing/channels/{channel}/connect", operationId: "startSocialConnect", summary: "Bắt đầu kết nối kênh (OAuth)", cap: "W2",
    description: `Trả \`authorize_url\` tới trang đồng ý của nền tảng (Instagram đi luồng Facebook); \`state\` mã hoá gắn tổ chức + người + hạn 10 phút. Ứng dụng nền tảng chưa cấu hình → 409. 20 lần/phút/người → 429. ${CHANNEL_NF}`,
    ok: [200, { description: "Link đồng ý", schema: res.connectStartedResponse }], errors: [404, 409, 429] }),
  op(SOCIAL, { method: "get", path: "/social-publishing/channels/{channel}/callback", operationId: "finishSocialConnect", summary: "Nền tảng chuyển trình duyệt về sau khi đồng ý", cap: "W2",
    description: `Luôn 303 về \`/cong-cu?muc=content&buoc=dang-tu-dong\` kèm \`ket_noi=ok|chon-trang|loi\` (và \`ly_do\` khi lỗi) — kể cả \`state\` sai/hết hạn hoặc nền tảng từ chối. ${CHANNEL_NF}`,
    ok: [303, { description: "Chuyển về màn Đăng tự động (header `Location`)" }], errors: [404, 429] }),
  op(SOCIAL, { method: "post", path: "/social-publishing/channels/{channel}/disconnect", operationId: "disconnectSocialChannel", summary: "Ngắt kết nối kênh, xoá khoá", cap: "W2",
    description: `Giữ dòng kết nối để đối soát. ${CHANNEL_NF}`, ok: [204, { description: "Đã ngắt" }], errors: [404] }),
  op(SOCIAL, { method: "get", path: "/social-publishing/facebook-pages", operationId: "listPendingFacebookPages", summary: "Trang Facebook chờ chọn sau khi đồng ý", cap: "W2",
    description: "Tài khoản quản lý nhiều Trang; không trả khoá.", ok: [200, { description: "Trang", schema: res.pendingPagesResponse }] }),
  op(SOCIAL, { method: "post", path: "/social-publishing/facebook-pages", operationId: "selectFacebookPage", summary: "Kết nối một Trang (kèm Instagram Business gắn với Trang)", cap: "W2", body: req.selectFacebookPageBody,
    description: "Trang không nằm trong danh sách chờ (hoặc danh sách đã hết hạn) → 400 `details.page_id`.", ok: [200, { description: "Kênh đã kết nối", schema: res.pageSelectedResponse }], errors: BODY_ERRORS }),
  op(SOCIAL, { method: "get", path: "/social-publishing/posts", operationId: "listSocialPosts", summary: "Bài đăng tự động của tổ chức, mới trước", cap: "J5", query: req.socialPostsQuery,
    description: `\`status\` lạ → 400. ${PAGE}`, ok: [200, { description: "Bài đăng", schema: res.postsResponse }], errors: [400] }),
  op(SOCIAL, { method: "post", path: "/social-publishing/posts", operationId: "scheduleSocialPosts", summary: "Lên lịch bài đã duyệt ở Bước 3, mỗi kênh một bài", cap: "J5", body: req.schedulePostsBody,
    description: "Header `Idempotency-Key` bắt buộc (thiếu → 400); gửi lại cùng khoá không tạo bài thứ hai. `mode`: `NOW` · `AUTO` (giờ vàng) · `AT` (kèm `scheduled_at`). Chưa có bài đã duyệt cho kênh → 400; lượt bài chưa duyệt hoặc kênh chưa kết nối → 409. 30 lần/phút/người → 429. Lượt bài của tổ chức khác → 404.",
    ok: [201, { description: "Bài đã lên lịch", schema: res.postsScheduledResponse }], errors: [...BODY_ERRORS, 404, 409, 429] }),
  op(SOCIAL, { method: "post", path: "/social-publishing/posts/{id}/cancel", operationId: "cancelSocialPost", summary: "Huỷ bài đang chờ", cap: "J5",
    description: `Chỉ bài \`QUEUED\`; đã bắt đầu đăng → 409. Huỷ bài cuối cùng còn lại của lượt bài nguồn (mọi bài đều \`CANCELED\`) → lượt về \`APPROVED\` để sửa / duyệt lại. ${NF}`, ok: [200, { description: "Bài", schema: res.postResponse }], errors: [404, 409] }),
  op(SOCIAL, { method: "post", path: "/social-publishing/posts/{id}/retry", operationId: "retrySocialPost", summary: "Thử lại bài đăng thất bại", cap: "J5",
    description: `Chỉ bài \`FAILED\` (khác → 409); đăng ở lượt cron kế tiếp, cấp lại đủ 5 lượt. 30 lần/phút/người → 429. ${NF}`, ok: [200, { description: "Bài", schema: res.postResponse }], errors: [404, 409, 429] }),
]
