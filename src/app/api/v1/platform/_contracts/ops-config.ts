import type { OpenApiOperation } from "@/core/http/openapi"
import {
  createCustomFieldSchema,
  updateFieldConfigSchema,
  upsertCatalogValueSchema,
} from "@/modules/field-platform/adapters/http-schemas"

import { op } from "./ops-orgs"
import * as req from "./requests"
import * as res from "./responses-config"

/**
 * Operation Console Vận hành Nền tảng — cấu hình toàn sàn (OpenAPI `/platform/*`, PO 07/11/2026). Lược đồ thân của
 * nền quản trị trường lấy thẳng từ `field-platform/adapters/http-schemas` (cùng lược đồ route dùng).
 */
const FIELDS = "Nền tảng — trường & danh mục"
const MATRIX = "Nền tảng — ma trận & giao diện"
const NOTIFY = "Nền tảng — thông báo"
const INTEGRATION = "Nền tảng — tích hợp"
const BODY_ERRORS = [400, 413]
const D60 = "Ghi nhật ký truy cập nền tảng trước khi đọc/ghi (D-60)."

export const CONFIG_OPERATIONS: OpenApiOperation[] = [
  op(FIELDS, { method: "get", path: "/platform/fields", operationId: "platformListFields", summary: "Trường dữ liệu đã xây và trường tự tạo", cap: "N12", query: req.fieldEntityQuery,
    ok: [200, { description: "Trường", schema: res.fieldsResponse }] }),
  op(FIELDS, { method: "patch", path: "/platform/fields", operationId: "platformUpdateField", summary: "Sửa cấu hình toàn sàn của một trường", cap: "N12", body: updateFieldConfigSchema,
    ok: [200, { description: "Trường", schema: res.fieldResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(FIELDS, { method: "post", path: "/platform/fields", operationId: "platformCreateField", summary: "Tạo trường tự tạo", cap: "N12", body: createCustomFieldSchema,
    ok: [200, { description: "Trường", schema: res.fieldResponse }], errors: [...BODY_ERRORS, 409, 422] }),
  op(FIELDS, { method: "post", path: "/platform/fields/{key}/deactivate", operationId: "platformDeactivateField", summary: "Ngừng dùng một trường", cap: "N12",
    ok: [200, { description: "Trường", schema: res.fieldResponse }], errors: [404, 422] }),
  op(FIELDS, { method: "get", path: "/platform/catalogs", operationId: "platformListCatalogs", summary: "Mọi danh mục kèm giá trị", cap: "N12",
    ok: [200, { description: "Danh mục", schema: res.catalogsResponse }] }),
  op(FIELDS, { method: "post", path: "/platform/catalogs/{key}/values", operationId: "platformUpsertCatalogValue", summary: "Thêm/sửa giá trị danh mục",
    description: "Danh mục loại có hành vi chỉ nhận mã hành vi có thật (`GET /platform/behaviors`).", cap: "N12", body: upsertCatalogValueSchema,
    ok: [200, { description: "Giá trị", schema: res.catalogValueResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(FIELDS, { method: "get", path: "/platform/behaviors", operationId: "platformListBehaviors", summary: "Mã hành vi có thật cho một loại hành vi",
    description: "Không có `kind` → danh sách loại hành vi.", cap: "N12", query: req.behaviorsQuery,
    ok: [200, { description: "Loại hoặc mã hành vi", schema: res.behaviorsResponse }], errors: [400] }),
  op(FIELDS, { method: "put", path: "/platform/organizations/{id}/field-overrides", operationId: "platformSetFieldOverride", summary: "Ghi đè theo tổ chức cho một trường hoặc một giá trị danh mục",
    description: D60, cap: "N12", body: req.fieldOverridesBody, ok: [200, { description: "Ghi đè", schema: res.fieldOverrideResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(FIELDS, { method: "get", path: "/platform/organizations/{id}/field-preview", operationId: "platformFieldPreview", summary: "Cấu hình trường tổ chức sẽ thấy sau khi cộng ghi đè",
    description: D60, cap: "N12", query: req.fieldEntityQuery, ok: [200, { description: "Cấu hình hiệu lực", schema: res.fieldPreviewResponse }], errors: [404] }),

  op(MATRIX, { method: "get", path: "/platform/governance-matrix", operationId: "platformGetGovernanceMatrix", summary: "Ma trận quản trị tầng Mẹ của một hệ", cap: null,
    query: req.governanceSystemQuery, ok: [200, { description: "Quyết định của tầng Mẹ", schema: res.governanceMatrixResponse }], errors: [400] }),
  op(MATRIX, { method: "put", path: "/platform/governance-matrix", operationId: "platformSaveGovernanceMatrix", summary: "Lưu ma trận quản trị tầng Mẹ (áp xuống mọi tổ chức)",
    description: "Khoá trùng quy chuẩn bất biến → 400 `details.violations`. Mục sai kiểu bị bỏ qua.", cap: "N12", query: req.governanceSystemQuery, body: req.governanceMatrixBody,
    ok: [200, { description: "Quyết định đã lưu", schema: res.governanceMatrixResponse }], errors: BODY_ERRORS }),
  op(MATRIX, { method: "get", path: "/platform/nav-matrix", operationId: "platformGetNavMatrix", summary: "Ma trận điều hướng theo ngành", cap: null,
    ok: [200, { description: "Ngành, nhóm, mục điều hướng, mặc định và ghi đè", schema: res.navMatrixResponse }] }),
  op(MATRIX, { method: "put", path: "/platform/nav-matrix", operationId: "platformSaveNavMatrix", summary: "Lưu ghi đè điều hướng theo ngành", cap: "N12", body: req.navMatrixBody,
    ok: [200, { description: "Ghi đè đang áp", schema: res.saveNavMatrixResponse }], errors: BODY_ERRORS }),
  op(MATRIX, { method: "get", path: "/platform/ux-rollout-flags", operationId: "platformGetUxRolloutFlags", summary: "Cờ bật giao diện mới theo tổ chức", cap: null,
    ok: [200, { description: "Cờ", schema: res.uxRolloutFlagsResponse }] }),
  op(MATRIX, { method: "put", path: "/platform/ux-rollout-flags", operationId: "platformSaveUxRolloutFlags", summary: "Lưu cờ giao diện mới",
    description: "Cờ thiếu hoặc giá trị lạ → `off`.", cap: "N12", body: req.uxRolloutFlagsBody, ok: [200, { description: "Cờ đã lưu", schema: res.saveUxRolloutFlagsResponse }], errors: BODY_ERRORS }),

  op(NOTIFY, { method: "get", path: "/platform/notification/events", operationId: "platformNotificationEvents", summary: "Danh mục sự kiện thông báo đầy đủ", cap: null,
    ok: [200, { description: "Sự kiện", schema: res.notificationEventsResponse }] }),
  op(NOTIFY, { method: "get", path: "/platform/notification/channels", operationId: "platformGetChannelActivations", summary: "Kênh thông báo đang bật toàn sàn", cap: null,
    ok: [200, { description: "Kênh → bật/tắt", schema: res.channelActivationsResponse }] }),
  op(NOTIFY, { method: "patch", path: "/platform/notification/channels", operationId: "platformSetChannelActivation", summary: "Bật/tắt một kênh toàn sàn", cap: "N2", body: req.channelActivationBody,
    ok: [200, { description: "Đã lưu", schema: res.channelActivationSavedResponse }], errors: BODY_ERRORS }),
  op(NOTIFY, { method: "get", path: "/platform/notification/visibility", operationId: "platformGetEventVisibility", summary: "Sự kiện nào hiện cho tầng dưới", cap: null,
    ok: [200, { description: "Ma trận hiển thị", schema: res.eventVisibilityResponse }] }),
  op(NOTIFY, { method: "patch", path: "/platform/notification/visibility", operationId: "platformSetEventVisibility", summary: "Ẩn/hiện một sự kiện cho một tầng", cap: "N2", body: req.eventVisibilityBody,
    ok: [200, { description: "Đã lưu", schema: res.eventVisibilitySavedResponse }], errors: BODY_ERRORS }),
  op(NOTIFY, { method: "get", path: "/platform/notification/hard-locks", operationId: "platformListHardLocks", summary: "Khoá cứng kênh theo sự kiện của tầng Mẹ", cap: null, query: req.hardLocksQuery,
    ok: [200, { description: "Khoá cứng", schema: res.hardLocksResponse }] }),
  op(NOTIFY, { method: "post", path: "/platform/notification/hard-locks", operationId: "platformSetHardLock", summary: "Đặt khoá cứng (tầng dưới không ghi đè được)", cap: "N2", body: req.setHardLockBody,
    ok: [200, { description: "Đã đặt", schema: res.hardLockSetResponse }], errors: BODY_ERRORS }),
  op(NOTIFY, { method: "delete", path: "/platform/notification/hard-locks", operationId: "platformRemoveHardLock", summary: "Gỡ khoá cứng", description: "Thân JSON trên `DELETE`.", cap: "N2", body: req.removeHardLockBody,
    ok: [200, { description: "Đã gỡ", schema: res.hardLockRemovedResponse }], errors: BODY_ERRORS }),

  op(INTEGRATION, { method: "get", path: "/platform/integrations/governance", operationId: "platformGetIntegrationGovernance", summary: "Khoá/cấp sẵn tích hợp toàn sàn hoặc theo ngành",
    description: "`?scope=GLOBAL` (mặc định) hoặc `industry:<key>`.", cap: "N16", query: req.integrationScopeQuery,
    ok: [200, { description: "Chế độ từng đầu nối", schema: res.integrationGovernanceResponse }], errors: [400] }),
  op(INTEGRATION, { method: "put", path: "/platform/integrations/governance", operationId: "platformSetIntegrationGovernance", summary: "Đặt chế độ một đầu nối cho một phạm vi",
    cap: "N16", body: req.integrationGovernanceBody, ok: [200, { description: "Chế độ sau khi lưu", schema: res.integrationGovernanceResponse }], errors: [...BODY_ERRORS, 422] }),
]
