import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-chain"
import * as res from "./responses-chain"

/** Operation `/branches/*`, `/branch-portal/*`, `/chain/*` (OpenAPI nội bộ, PO 07/11/2026). */
const BR = "Chi nhánh"
const CHAIN = "Chuỗi — dữ liệu cửa hàng"
const LINK = "Chuỗi — liên kết (phía cửa hàng)"
const RULES_BUG = "Thiếu `rules` hoặc không phải mảng → 400 `details.rules`."
const LINK_NF = "Liên kết của tổ chức khác → 404; liên kết vừa đổi trạng thái → 409."

export const CHAIN_OPERATIONS: OpenApiOperation[] = [
  op(BR, { method: "get", path: "/branches", operationId: "listBranches", summary: "Chi nhánh của tổ chức", cap: "F6",
    description: "Sắp theo mã; chưa phân trang (`next_cursor` luôn `null`).", ok: [200, { description: "Chi nhánh", schema: res.branchesResponse }] }),
  op(BR, { method: "post", path: "/branches", operationId: "createBranch", summary: "Tạo chi nhánh", cap: "F7", body: req.createBranchBody,
    description: "Mã viết hoa và cắt khoảng trắng; tên/mã chỉ có khoảng trắng → 400; mã đã có trong tổ chức → 409.",
    ok: [201, { description: "Chi nhánh mới", schema: res.branchResponse }], errors: [...BODY_ERRORS, 409] }),
  op(BR, { method: "patch", path: "/branches/{id}", operationId: "updateBranch", summary: "Sửa chi nhánh", cap: "F7", body: req.updateBranchBody,
    description: "Thân rỗng → 400. Chi nhánh của tổ chức khác → 404.", ok: [200, { description: "Chi nhánh", schema: res.branchResponse }], errors: [...BODY_ERRORS, 404] }),
  op(BR, { method: "get", path: "/branch-portal/orders", operationId: "listBranchPortalOrders", summary: "Đơn gia công đang mời và đang làm của chi nhánh tôi", cap: "R14",
    description: "Chi nhánh lấy từ tư cách thành viên của phiên — không nhận tham số chi nhánh. `cardUrl`: link Thẻ Gia Công đã ký cho đúng chi nhánh.",
    ok: [200, { description: "Đơn của chi nhánh", schema: res.branchPortalOrdersResponse }] }),

  op(CHAIN, { method: "get", path: "/chain/collection-profile", operationId: "getChainCollectionProfile", summary: "Hồ sơ thu thập dữ liệu của chuỗi", cap: "F1",
    description: "Chưa có hồ sơ → hồ sơ mặc định dựng từ trường lõi chọn được (không gồm trường bí mật S3).",
    ok: [200, { description: "Hồ sơ và trường thu thập được", schema: res.collectionProfileResponse }] }),
  op(CHAIN, { method: "put", path: "/chain/collection-profile", operationId: "publishChainCollectionProfile", summary: "Phát hành phiên bản hồ sơ thu thập mới", cap: "F2",
    body: req.collectionProfileBody,
    description: `Mỗi lần phát hành là một phiên bản mới, không sửa bản cũ. Quy tắc sai luật (trường S3, mức sàn vượt trần, thiếu mục đích cho trường S2, vượt trần thoả thuận chia sẻ dữ liệu) → 422 kèm \`details.issues\` (cùng dạng \`validation.issues\` của \`/preview\`). ${RULES_BUG}`,
    ok: [200, { description: "Hồ sơ đã phát hành", schema: res.collectionProfilePublishedResponse }], errors: [...BODY_ERRORS, 422] }),
  op(CHAIN, { method: "post", path: "/chain/collection-profile/preview", operationId: "previewChainCollectionProfile", summary: "Xem trước tác động của hồ sơ thu thập", cap: "F1",
    body: req.collectionProfileBody, description: `Không lưu. Quy tắc sai luật trả trong \`validation.issues\` (vẫn 200). ${RULES_BUG}`,
    ok: [200, { description: "Kết quả xem trước", schema: res.collectionProfilePreviewResponse }], errors: BODY_ERRORS }),
  op(CHAIN, { method: "post", path: "/chain/partner-stores", operationId: "registerPartnerStore", summary: "Đăng ký cửa hàng đối tác (pháp nhân riêng) kèm thoả thuận chia sẻ dữ liệu", cap: "F2",
    body: req.registerPartnerStoreBody, description: "Mã cửa hàng đã có trong tổ chức → 409.",
    ok: [201, { description: "Cửa hàng và thoả thuận", schema: res.partnerStoreResponse }], errors: [...BODY_ERRORS, 409] }),
  op(CHAIN, { method: "get", path: "/chain/stores-data", operationId: "listChainStoresData", summary: "Tóm tắt dữ liệu các cửa hàng của chuỗi", cap: "F1",
    ok: [200, { description: "Thẻ cửa hàng", schema: res.chainStoresResponse }] }),
  op(CHAIN, { method: "get", path: "/chain/stores-data/{storeId}", operationId: "getChainStoreFolder", summary: "Thư mục dữ liệu một cửa hàng theo miền", cap: "F1",
    description: "Giá trị đã qua phép lan truyền (thô / che / gộp) theo hồ sơ thu thập và thoả thuận chia sẻ. Cửa hàng của tổ chức khác → 404.",
    ok: [200, { description: "Thư mục dữ liệu", schema: res.storeFolderResponse }], errors: [404] }),

  op(LINK, { method: "get", path: "/chain/links", operationId: "listChainLinks", summary: "Lời mời liên kết đang chờ và chuỗi đang tham gia", cap: "F2",
    description: "Lời mời quá 7 ngày không hiện.", ok: [200, { description: "Liên kết", schema: res.chainLinksResponse }] }),
  op(LINK, { method: "post", path: "/chain/links/{id}/accept", operationId: "acceptChainLink", summary: "Đồng ý lời mời liên kết của chuỗi", cap: "F2",
    description: `Lời mời quá hạn → 409. ${LINK_NF}`, ok: [200, { description: "Liên kết", schema: res.chainLinkResponse }], errors: [404, 409] }),
  op(LINK, { method: "post", path: "/chain/links/{id}/decline", operationId: "declineChainLink", summary: "Từ chối lời mời liên kết", cap: "F2",
    description: `Đang là thành viên thì phải dùng \`/leave\` kèm lý do → 400. ${LINK_NF}`, ok: [200, { description: "Liên kết", schema: res.chainLinkResponse }], errors: [400, 404, 409] }),
  op(LINK, { method: "post", path: "/chain/links/{id}/leave", operationId: "leaveChain", summary: "Rời chuỗi (kèm lý do)", cap: "F2", body: req.leaveChainBody,
    description: `Ghi nhật ký kiểm toán và báo chuỗi. ${LINK_NF}`, ok: [200, { description: "Liên kết", schema: res.chainLinkResponse }], errors: [...BODY_ERRORS, 404, 409] }),
]
