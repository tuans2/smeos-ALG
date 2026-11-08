import type { OpenApiOperation } from "@/core/http/openapi"

import { op } from "./ops-orgs"
import * as req from "./requests"
import * as res from "./responses-data"

/** Operation Console Vận hành Nền tảng — chợ đối tác và dữ liệu tổ chức (OpenAPI `/platform/*`, PO 07/11/2026). */
const MARKET = "Nền tảng — chợ đối tác"
const DATA = "Nền tảng — dữ liệu tổ chức"
const D60 = "Ghi nhật ký truy cập nền tảng trước khi đọc/ghi (D-60)."

export const DATA_OPERATIONS: OpenApiOperation[] = [
  op(MARKET, { method: "get", path: "/platform/marketplace/stores", operationId: "platformMarketplaceStores", summary: "Hồ sơ khảo sát cửa hàng đối tác",
    description: "Ảnh qua URL ký có hạn.", cap: "N1", query: req.marketplaceStoresQuery, ok: [200, { description: "Hồ sơ và số theo hạng", schema: res.marketplaceStoresResponse }], errors: [400] }),
  op(MARKET, { method: "post", path: "/platform/marketplace/sync", operationId: "platformMarketplaceSync", summary: "Đồng bộ từ Google Sheet khảo sát", cap: "N17",
    ok: [200, { description: "Số hồ sơ thêm/cập nhật", schema: res.marketplaceImportResponse }], errors: [422] }),
  op(MARKET, { method: "post", path: "/platform/marketplace/import-excel/preview", operationId: "platformMarketplaceImportPreview", summary: "Đọc tiêu đề tệp khảo sát và tự ghép cột",
    description: "Không ghi dữ liệu.", cap: "N17", multipart: req.excelPreviewForm, ok: [200, { description: "Tiêu đề, mẫu, bảng ghép đề xuất", schema: res.marketplacePreviewResponse }], errors: [400, 413] }),
  op(MARKET, { method: "post", path: "/platform/marketplace/import-excel", operationId: "platformMarketplaceImport", summary: "Nhập tệp khảo sát .xlsx/.xls/.csv (≤ 10 MB)",
    description: "`mapping`: bảng ghép cột đã duyệt (JSON); thiếu → tự ghép theo tên tiêu đề.", cap: "N17", multipart: req.excelUploadForm,
    ok: [200, { description: "Số hồ sơ thêm/cập nhật", schema: res.marketplaceImportResponse }], errors: [400, 413] }),
  op(MARKET, { method: "post", path: "/platform/marketplace/sync-photos", operationId: "platformMarketplaceSyncPhotos", summary: "Tải một lượt ảnh khảo sát từ Drive vào kho",
    description: "`remaining` > 0 thì gọi tiếp.", cap: "N17", ok: [200, { description: "Kết quả lượt", schema: res.marketplacePhotosResponse }], errors: [422] }),
  op(MARKET, { method: "get", path: "/platform/marketplace/share-links", operationId: "platformListShareLinks", summary: "Link chia sẻ chợ đối tác", cap: "N17",
    ok: [200, { description: "Link", schema: res.shareLinksResponse }] }),
  op(MARKET, { method: "post", path: "/platform/marketplace/share-links", operationId: "platformCreateShareLink", summary: "Tạo link chia sẻ có hạn", cap: "N17", body: req.shareLinkBody,
    ok: [201, { description: "Link và token (chỉ trả lúc tạo)", schema: res.createShareLinkResponse }], errors: [400, 413, 422] }),
  op(MARKET, { method: "delete", path: "/platform/marketplace/share-links/{id}", operationId: "platformRevokeShareLink", summary: "Huỷ link chia sẻ ngay", cap: "N17",
    ok: [200, { description: "Link đã huỷ", schema: res.revokeShareLinkResponse }], errors: [404] }),
  op(MARKET, { method: "delete", path: "/platform/marketplace/stores/{id}", operationId: "platformDeleteMarketplaceStore", summary: "Xoá một hồ sơ chợ đối tác", cap: "N18",
    ok: [200, { description: "Đã xoá", schema: res.deleteStoreResponse }], errors: [404] }),
  op(MARKET, { method: "post", path: "/platform/marketplace/stores/bulk-delete", operationId: "platformBulkDeleteMarketplaceStores", summary: "Xoá hàng loạt hồ sơ chợ đối tác",
    description: "`{ ids }` (1–500 hồ sơ) hoặc `{ all: true, expectedTotal }` — phải khớp số hồ sơ hiện có, lệch → 409.", cap: "N18", body: req.bulkDeleteStoresBody,
    ok: [200, { description: "Số đã xoá", schema: res.bulkDeleteStoresResponse }], errors: [400, 409, 413] }),

  op(DATA, { method: "get", path: "/platform/orgs-data", operationId: "platformOrgsData", summary: "Tóm tắt dữ liệu mọi tổ chức", cap: "N1",
    ok: [200, { description: "Tổ chức và độ đầy đủ dữ liệu", schema: res.orgsDataResponse }] }),
  op(DATA, { method: "get", path: "/platform/orgs-data/{orgId}", operationId: "platformOrgFolderData", summary: "Dữ liệu một tổ chức theo thư mục nghiệp vụ", description: D60, cap: "N1",
    ok: [200, { description: "Thư mục và trường", schema: res.orgFolderResponse }], errors: [404] }),
  op(DATA, { method: "get", path: "/platform/orgs-data/{orgId}/records/{domain}", operationId: "platformOrgRecords", summary: "Bản ghi một miền theo trang, hoặc tải CSV",
    description: `\`domain\`: catalog, orders, members, branches, customers, jobs. \`?export=csv\` → \`text/csv\`. ${D60}`, cap: "N1", query: req.recordsQuery,
    ok: [200, { description: "Trang bản ghi (JSON) — hoặc tệp CSV khi `export=csv`", schema: res.orgRecordsResponse }], errors: [400, 404] }),
  op(DATA, { method: "get", path: "/platform/orgs-data/{orgId}/export", operationId: "platformOrgExport", summary: "Xuất dữ liệu tổ chức dạng ZIP",
    description: `\`type=csv\`: chỉ CSV; mặc định CSV + ảnh sản phẩm. Ghi nhật ký nền tảng. ${D60}`, cap: "N1", query: req.exportQuery,
    ok: [200, { description: "Tệp ZIP", contentType: "application/zip" }], errors: [404] }),
  op(DATA, { method: "put", path: "/platform/orgs-data/{orgId}/legal-hold", operationId: "platformSetOrgLegalHold", summary: "Đặt/gỡ giữ pháp lý cho cả tổ chức",
    description: `\`until: null\` để gỡ. ${D60}`, cap: "N14", body: req.legalHoldBody, ok: [200, { description: "Hạn giữ", schema: res.legalHoldResponse }], errors: [400, 404, 413] }),
  op(DATA, { method: "put", path: "/platform/orgs-data/{orgId}/assets/{assetId}/legal-hold", operationId: "platformSetAssetLegalHold", summary: "Đặt/gỡ giữ pháp lý cho một tệp",
    description: D60, cap: "N14", body: req.legalHoldBody, ok: [200, { description: "Hạn giữ", schema: res.legalHoldResponse }], errors: [400, 404, 413] }),
]
