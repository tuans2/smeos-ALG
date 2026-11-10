import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-storage"
import * as res from "./responses-storage"

/** Operation `/assets/*`, `/asset-usages/*`, `/storage/*` (OpenAPI nội bộ, PO 07/11/2026). */
const ASSET = "Tư liệu — ảnh & video"
const USAGE = "Tư liệu — nơi dùng"
const STORE = "Kho tệp & thùng rác"
const NF = "Của tổ chức khác → 404."
const TRASH_CAP = "Mã năng lực kiểm ở use-case theo loại mục (`G3` · `L4` · `A3` · `B6` — đặc tả 06 mục Thùng rác)."
const LEGACY = "Trả envelope cũ `{ success: true }`."
const legacyErrors = (o: OpenApiOperation): OpenApiOperation => ({ ...o, extensions: { ...o.extensions, "x-legacy-error-envelope": true } })

export const STORAGE_OPERATIONS: OpenApiOperation[] = [
  op(ASSET, { method: "post", path: "/assets/upload-url", operationId: "createAssetUploadUrl", summary: "Xin URL ký để tải tệp thẳng lên kho", cap: "G2", body: req.uploadUrlBody,
    description: "Trả khoá kho và URL `PUT` có hạn; tải xong gọi `POST /assets` với cùng `asset_id`/`storage_key`.",
    ok: [201, { description: "URL tải lên", schema: res.uploadUrlResponse }], errors: BODY_ERRORS }),
  op(ASSET, { method: "post", path: "/assets", operationId: "registerAsset", summary: "Ghi nhận asset sau khi tải xong (hợp đồng Chặng 01)", cap: "G2", body: req.registerAssetBodySchema,
    description: "Khoá kho phải thuộc tổ chức của phiên; `parent_asset_id` của tổ chức khác → 404.", ok: [201, { description: "Asset", schema: res.assetResponse }], errors: [...BODY_ERRORS, 404] }),
  op(ASSET, { method: "get", path: "/assets", operationId: "listAssets", summary: "Asset của tổ chức", cap: "G1", query: req.assetsQuery,
    description: "Lọc theo sản phẩm, loại, trạng thái duyệt, asset gốc; phân trang con trỏ. `limit` không phải số nguyên → 400.",
    ok: [200, { description: "Trang asset", schema: res.assetsResponse }], errors: [400] }),
  op(ASSET, { method: "get", path: "/assets/{id}", operationId: "getAsset", summary: "Một asset", cap: "G1", description: NF, ok: [200, { description: "Asset", schema: res.assetResponse }], errors: [404] }),
  op(ASSET, { method: "delete", path: "/assets/{id}", operationId: "deleteAsset", summary: "Xoá asset", cap: "G3",
    description: `Đang bị giữ pháp lý hoặc đang được dùng ở nơi khác (đơn, sản phẩm, gói chiến dịch…) → 409. ${NF}`,
    ok: [204, { description: "Đã xoá" }], errors: [404, 409] }),
  op(ASSET, { method: "get", path: "/assets/{id}/view-url", operationId: "getAssetViewUrl", summary: "URL ký để xem asset", cap: "G1",
    description: `Thay cho truyền Data URL/blob giữa các màn. ${NF}`, ok: [200, { description: "URL xem", schema: res.viewUrlResponse }], errors: [404] }),
  op(ASSET, { method: "post", path: "/assets/{id}/approve", operationId: "approveAsset", summary: "Duyệt asset dẫn xuất (ảnh chính, biến thể)", cap: "I2",
    description: `Vừa đổi trạng thái giữa chừng → 409. ${NF}`, ok: [200, { description: "Asset đã duyệt kèm URL ký", schema: res.assetResponse }], errors: [404, 409] }),

  op(USAGE, { method: "get", path: "/asset-usages", operationId: "listAssetUsages", summary: "Nơi dùng tư liệu", cap: "M1", query: req.usagesQuery,
    description: "`limit` 1–100 (mặc định 50), sai → 400; `destination`/`status` lạ → 400.", ok: [200, { description: "Nơi dùng", schema: res.usagesResponse }], errors: [400] }),
  op(USAGE, { method: "post", path: "/asset-usages", operationId: "createAssetUsage", summary: "Gắn tư liệu vào một nơi dùng", cap: "M2", body: req.createUsageSchema,
    description: "Kiểm CTA theo nơi dùng và nơi dùng theo loại tư liệu → sai 400; kênh link/QR tạo kèm short link; `campaign_id` của tổ chức khác → 404.",
    ok: [201, { description: "Nơi dùng", schema: res.usageCreatedResponse }], errors: [...BODY_ERRORS, 404] }),
  op(USAGE, { method: "patch", path: "/asset-usages/{id}", operationId: "updateAssetUsage", summary: "Sửa nơi dùng", cap: "M2", body: req.updateUsageSchema,
    description: NF, ok: [200, { description: "Nơi dùng", schema: res.usageResponse }], errors: [...BODY_ERRORS, 404] }),

  legacyErrors(op(STORE, { method: "put", path: "/storage/{key}", operationId: "uploadToStorage", summary: "Tải tệp lên kho bằng URL ký", cap: null, auth: "public",
    query: req.signedUrlQuery,
    description: "Không cần phiên: chữ ký HMAC theo khoá + hạn + phương thức là cách xác thực duy nhất (dùng `upload_url` của `POST /assets/upload-url`). Kiểu tệp lấy từ phần mở rộng của khoá, nội dung phải khớp; chữ ký sai/hết hạn, kiểu không hỗ trợ, quá dung lượng → 400. Thân là byte của tệp.",
    ok: [200, { description: "Đã lưu", schema: res.uploadedResponse }], errors: [400] })),
  legacyErrors(op(STORE, { method: "get", path: "/storage/{key}", operationId: "readFromStorage", summary: "Đọc tệp bằng URL ký", cap: null, auth: "public", query: req.signedUrlQuery,
    description: "Không cần phiên — chữ ký `GET`. Hỗ trợ `Range` (206 + `Content-Range`; khoảng sai → 416) để phát âm thanh/video. SVG kèm CSP `sandbox`; bảng tính tải xuống (`attachment`). Chữ ký sai/hết hạn → 400; không có tệp → 404 không thân.",
    ok: [200, { description: "Nội dung tệp (kiểu theo phần mở rộng)", contentType: "application/octet-stream" }], errors: [400, 404, 416] })),

  op(STORE, { method: "get", path: "/storage/trash", operationId: "listTrash", summary: "Thùng rác", cap: "G3",
    description: `${TRASH_CAP} Giữ 30 ngày rồi xoá vĩnh viễn tự động (\`daysRemaining\`).`, ok: [200, { description: "Mục trong thùng rác", schema: res.trashResponse }] }),
  op(STORE, { method: "post", path: "/storage/trash", operationId: "moveToTrash", summary: "Chuyển một mục vào thùng rác", cap: "G3", body: req.moveTrashSchema,
    description: `${TRASH_CAP} Catalog thu hồi link, thẻ chào ẩn. ${LEGACY} ${NF}`, ok: [200, { description: "Đã chuyển", schema: res.successResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(STORE, { method: "post", path: "/storage/trash/{id}/restore", operationId: "restoreFromTrash", summary: "Khôi phục từ thùng rác", cap: "phân quyền như `GET /storage/trash` (kiểm ở use-case)",
    body: req.restoreSchema, description: `${TRASH_CAP} ${LEGACY} ${NF}`, ok: [200, { description: "Đã khôi phục", schema: res.successResponse }], errors: [...BODY_ERRORS, 404] }),
  op(STORE, { method: "delete", path: "/storage/trash/{id}", operationId: "purgeFromTrash", summary: "Xoá vĩnh viễn", cap: "phân quyền như `GET /storage/trash` (kiểm ở use-case)",
    query: req.trashTypeQuery,
    description: `${TRASH_CAP} \`type\` bắt buộc, thiếu/sai → 400. Đang giữ pháp lý, ảnh đang được dùng hoặc sản phẩm đã có đơn → 409. Xoá tệp trên kho qua hàng đợi (outbox), ghi nhật ký kiểm toán. ${LEGACY} ${NF}`,
    ok: [200, { description: "Đã xoá vĩnh viễn", schema: res.successResponse }], errors: [400, 404, 409] }),
  op(STORE, { method: "get", path: "/storage/library", operationId: "listLibrary", summary: "Kho dữ liệu v2 — mục theo loại", cap: "theo `type`: `G1` (ảnh gốc, ảnh AI) · `I1` (video, âm thanh, nội dung) · `J1` (catalog, landing page) · `L1` (catalog thẻ chào)",
    query: req.libraryQuery,
    description: "Mã năng lực kiểm ở use-case theo `type`; `scope` = `all` · `hq` · mã chi nhánh (chi nhánh lạ → 404); `from` ISO; phân trang con trỏ. Ảnh bìa là URL ký 1 giờ.",
    ok: [200, { description: "Trang mục", schema: res.libraryResponse }], errors: [400, 404] }),
  op(STORE, { method: "get", path: "/storage/library/summary", operationId: "getLibrarySummary", summary: "Loại dữ liệu xem được và số mục theo phạm vi", cap: null,
    query: req.libraryScopeQuery, description: "Không trả dữ liệu nghiệp vụ; quyền từng loại kiểm ở `GET /storage/library`. Chi nhánh lạ → 404.",
    ok: [200, { description: "Tóm tắt", schema: res.librarySummaryResponse }], errors: [404] }),
]
