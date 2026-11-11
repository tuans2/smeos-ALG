import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-notification"
import * as res from "./responses-notification"

/** Operation `/notification/*` — hệ thông báo 4 tầng (OpenAPI nội bộ, PO 07/11/2026). */
const INBOX = "Thông báo — hộp thư"
const PREF = "Thông báo — tuỳ chọn & chính sách"
const OWN = "Dữ liệu của chính người đăng nhập trong tổ chức của phiên; không cần mã năng lực."
const LEGACY = "Thành công trả `{ success: true, … }` cũ (ngoại lệ envelope, `api-envelope-legacy.txt`)."
const LOCK = (tier: "CHAIN" | "STORE") =>
  `Khoá cứng tầng \`${tier}\`, phạm vi = tổ chức của phiên — người dùng trong phạm vi không tự bật/tắt được sự kiện × kênh đã khoá.`

export const NOTIFICATION_OPERATIONS: OpenApiOperation[] = [
  op(PREF, { method: "get", path: "/notification/events", operationId: "listNotificationEvents", summary: "Danh mục sự kiện thông báo của một tầng", cap: null,
    query: req.eventsQuery,
    description: "Mặc định `STORE`; đã áp ma trận hiển thị của SaaS Mother (trừ `MOTHER`, luôn thấy hết). `tier` lạ không bị chặn — trả danh sách theo luật lọc.",
    ok: [200, { description: "Sự kiện", schema: res.eventsResponse }] }),
  op(PREF, { method: "get", path: "/notification/channels", operationId: "listNotificationChannels", summary: "Kênh gửi đang bật toàn sàn (chỉ đọc)", cap: null,
    ok: [200, { description: "Kênh → bật", schema: res.channelsResponse }] }),

  op(INBOX, { method: "get", path: "/notification/inbox", operationId: "listInbox", summary: "Hộp thư thông báo", cap: null, query: req.inboxQuery,
    description: `${OWN} Phân trang theo trang: \`page\` (mặc định 1), \`limit\` 1–100 (mặc định 20). Không phải số nguyên hoặc ngoài khoảng → 400.`,
    ok: [200, { description: "Tin và đếm", schema: res.inboxResponse }], errors: [400] }),
  op(INBOX, { method: "patch", path: "/notification/inbox/{id}/read", operationId: "markInboxRead", summary: "Đánh dấu một tin đã đọc", cap: null,
    description: `${OWN} Tin của người/tổ chức khác → 200 \`success: false\`, không đổi gì. ${LEGACY}`,
    ok: [200, { description: "Kết quả", schema: res.inboxReadResponse }] }),
  op(INBOX, { method: "post", path: "/notification/inbox/mark-all-read", operationId: "markAllInboxRead", summary: "Đánh dấu đã đọc toàn bộ", cap: null,
    description: `${OWN} ${LEGACY}`, ok: [200, { description: "Số tin đã đổi", schema: res.inboxReadAllResponse }] }),
  op(INBOX, { method: "get", path: "/notification/stream", operationId: "streamNotifications", summary: "Luồng tin mới (SSE)", cap: null, auth: "session",
    description: "`text/event-stream`: sự kiện `connected` khi mở, `notification` mỗi tin mới; dòng chú thích `: ping` mỗi 25 giây. Hub trong bộ nhớ của tiến trình (AUD-007) — chỉ nhận tin phát trên cùng máy chủ.",
    ok: [200, { description: "Luồng sự kiện", contentType: "text/event-stream" }] }),

  op(PREF, { method: "get", path: "/notification/push-subscriptions", operationId: "getPushStatus", summary: "Nhận tin trên trình duyệt: khoá công khai và thiết bị của tôi", cap: null,
    query: req.pushStatusQuery,
    description: `${OWN} \`public_key\` chỉ có khi tầng Mẹ đã kết nối và bật kênh Web Push. \`endpoint\` (tuỳ chọn) để biết trình duyệt này đã đăng ký chưa.`,
    ok: [200, { description: "Trạng thái", schema: res.pushStatusResponse }] }),
  op(PREF, { method: "post", path: "/notification/push-subscriptions", operationId: "subscribePush", summary: "Bật nhận tin trên trình duyệt này", cap: null,
    body: req.pushSubscribeBody,
    description: `${OWN} Chỉ nhận \`endpoint\` https của dịch vụ đẩy thật (Google, Mozilla, Apple, Microsoft) → khác: 422. Cùng trình duyệt đăng nhập người khác của tổ chức thì thiết bị chuyển sang người đó; tối đa 10 thiết bị mỗi người. Trần 30 lần / 10 phút / người.`,
    ok: [200, { description: "Đã lưu", schema: res.pushSubscribedResponse }], errors: [...BODY_ERRORS, 422, 429] }),
  op(PREF, { method: "delete", path: "/notification/push-subscriptions", operationId: "unsubscribePush", summary: "Tắt nhận tin trên trình duyệt này", cap: null,
    body: req.pushUnsubscribeBody, description: `${OWN} Thân JSON trên \`DELETE\`. Thiết bị của người khác → \`removed: false\`, không đổi gì.`,
    ok: [200, { description: "Kết quả", schema: res.pushUnsubscribedResponse }], errors: BODY_ERRORS }),
  op(PREF, { method: "get", path: "/notification/preferences", operationId: "getNotificationPreferences", summary: "Tuỳ chọn nhận thông báo của tôi", cap: null,
    description: OWN, ok: [200, { description: "Tuỳ chọn", schema: res.preferencesResponse }] }),
  op(PREF, { method: "patch", path: "/notification/preferences", operationId: "updateNotificationPreference", summary: "Bật/tắt một sự kiện × kênh cho tôi", cap: null,
    body: req.patchPreferenceSchema,
    description: `${OWN} Sự kiện × kênh bị khoá cứng ở tầng trên cửa hàng (vd. khoá tầng chuỗi của chính tổ chức) → 403 với thân \`{ error: "chuỗi", reason }\` (ngoại lệ envelope). Khoá tầng cửa hàng hiện KHÔNG chặn ở đây (lỗi đã ghi nhận, audit API §15). ${LEGACY}`,
    ok: [200, { description: "Thân đã gửi", schema: res.updatedResponse }], errors: [...BODY_ERRORS, 403] }),
  op(PREF, { method: "get", path: "/notification/org-policy", operationId: "getOrgNotificationPolicy", summary: "Chính sách thông báo của tổ chức", cap: "F1",
    ok: [200, { description: "Chính sách", schema: res.preferencesResponse }] }),
  op(PREF, { method: "patch", path: "/notification/org-policy", operationId: "updateOrgNotificationPolicy", summary: "Đặt chính sách sự kiện × kênh × vai", cap: "F2",
    body: req.patchOrgPolicySchema, description: `\`roleKey\` = \`*\` áp mọi vai. ${LEGACY}`,
    ok: [200, { description: "Thân đã gửi", schema: res.updatedResponse }], errors: BODY_ERRORS }),
  op(PREF, { method: "get", path: "/notification/store-defaults", operationId: "getStoreNotificationDefaults", summary: "Mặc định thông báo của cửa hàng theo vai", cap: "F1",
    query: req.storeDefaultsQuery, ok: [200, { description: "Mặc định", schema: res.preferencesResponse }] }),
  op(PREF, { method: "patch", path: "/notification/store-defaults", operationId: "updateStoreNotificationDefault", summary: "Đặt mặc định cửa hàng (kèm khung giờ)", cap: "F2",
    body: req.patchStoreDefaultSchema, description: LEGACY, ok: [200, { description: "Thân đã gửi", schema: res.updatedResponse }], errors: BODY_ERRORS }),

  ...(["CHAIN", "STORE"] as const).flatMap((tier) => {
    const path = tier === "CHAIN" ? "/notification/org-hard-locks" : "/notification/store-hard-locks"
    const name = tier === "CHAIN" ? "OrgHardLock" : "StoreHardLock"
    return [
      op(PREF, { method: "get", path, operationId: `list${name}s`, summary: `Khoá cứng tầng ${tier === "CHAIN" ? "chuỗi" : "cửa hàng"}`, cap: "F1",
        description: LOCK(tier), ok: [200, { description: "Khoá cứng", schema: res.hardLocksResponse }] }),
      op(PREF, { method: "post", path, operationId: `set${name}`, summary: "Đặt khoá cứng một sự kiện × kênh", cap: "F2", body: req.postHardLockSchema,
        description: `${LOCK(tier)} ${LEGACY}`, ok: [200, { description: "Thân đã gửi", schema: res.hardLockSetResponse }], errors: BODY_ERRORS }),
      op(PREF, { method: "delete", path, operationId: `remove${name}`, summary: "Gỡ khoá cứng một sự kiện × kênh", cap: "F2", body: req.deleteHardLockSchema,
        description: `Thân JSON ở lệnh DELETE. Không có khoá → vẫn 200. ${LEGACY}`, ok: [200, { description: "Thân đã gửi", schema: res.hardLockRemovedResponse }], errors: BODY_ERRORS }),
    ]
  }),
]
