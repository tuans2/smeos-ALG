import { z } from "zod"

import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-chat"
import * as res from "./responses-chat"

/** Operation `/chat/*` (trợ lý AI đa kênh) và `/internal-chat/*` (chat nội bộ) — OpenAPI nội bộ, PO 07/11/2026. */
const AI = "Trợ lý AI — hội thoại"
const CH = "Trợ lý AI — kênh & hạn mức"
const HOOK = "Webhook kênh chat"
const IN = "Chat nội bộ"
const NF = "Hội thoại của tổ chức khác → 404."
const MEMBER = "Không cần mã năng lực — chỉ người tham gia hội thoại; không phải người tham gia hoặc của tổ chức khác → 404."
const NOTE_AUDIT = "Nhật ký kiểm toán chỉ ghi loại tin và độ dài, không ghi nội dung."
/** Route trả `{ error: "chuỗi" }` cho bên gọi ngoài thay cho envelope `Error` chung. */
const legacyErrors = (o: OpenApiOperation): OpenApiOperation => ({ ...o, extensions: { ...o.extensions, "x-legacy-error-envelope": true } })

export const CHAT_OPERATIONS: OpenApiOperation[] = [
  op(AI, { method: "get", path: "/chat/conversations", operationId: "listChatConversations", summary: "Hội thoại tư vấn", cap: "T1", query: req.chatConversationsQuery,
    description: "`status` mặc định `ACTIVE`; `limit` 1–100, mặc định 50; không phải số nguyên hoặc ngoài khoảng → 400.", ok: [200, { description: "Hội thoại", schema: res.chatConversationsResponse }], errors: [400] }),
  op(AI, { method: "post", path: "/chat/conversations", operationId: "createChatConversation", summary: "Mở hội thoại tư vấn mới", cap: "T2", body: req.createChatConversationBody,
    description: "Thân không kiểm bằng lược đồ: trường vắng dùng mặc định.", ok: [201, { description: "Hội thoại", schema: res.chatConversationResponse }], errors: BODY_ERRORS }),
  op(AI, { method: "get", path: "/chat/conversations/{id}/messages", operationId: "listChatMessages", summary: "Tin nhắn của hội thoại", cap: "T1", description: NF,
    ok: [200, { description: "Tin nhắn", schema: res.chatMessagesResponse }], errors: [404] }),
  op(AI, { method: "post", path: "/chat/conversations/{id}/messages", operationId: "sendChatMessage", summary: "Gửi câu hỏi và nhận trả lời của trợ lý", cap: "T2",
    body: req.sendChatMessageBody, description: `Câu hỏi rỗng → 400. ${NF}`,
    ok: [200, { description: "Tin của người dùng và của trợ lý", schema: res.chatSendMessageResponse }], errors: [...BODY_ERRORS, 404] }),
  op(AI, { method: "post", path: "/chat/conversations/{id}/create-order", operationId: "createOrderFromChat", summary: "Chốt đơn nháp từ gợi ý trong hội thoại", cap: "T3",
    body: req.chatCreateOrderBody,
    description: `Thiếu \`productId\` hoặc sản phẩm chưa có giá bán → 400 (không tạo đơn 0đ). Hội thoại/sản phẩm của tổ chức khác → 404.`,
    ok: [201, { description: "Đơn nháp", schema: res.chatCreateOrderResponse }], errors: [...BODY_ERRORS, 404] }),

  op(CH, { method: "get", path: "/chat/channels", operationId: "listChatChannels", summary: "Kênh chat, biểu phí và trạng thái", cap: "W1",
    description: "Xem trong màn Tích hợp — cùng mã xem danh mục tích hợp (PO 12/11/2026; trước đó không gác mã). Khoá bí mật đã che.", ok: [200, { description: "Kênh", schema: res.chatChannelsResponse }], errors: [403] }),
  op(CH, { method: "post", path: "/chat/channels", operationId: "configureChatChannel", summary: "Bật/tắt và cấu hình một kênh", cap: "T4", body: req.configureChatChannelBody,
    description: "Mã năng lực kiểm ở use-case. Bật kênh có phí trừ credit gia hạn — không đủ → 422 `QUOTA_EXCEEDED`. Khoá bí mật gửi lại dạng đã che thì giữ giá trị cũ.",
    ok: [200, { description: "Kênh sau khi lưu", schema: res.chatChannelConfiguredResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(CH, { method: "get", path: "/chat/public-limits", operationId: "getPublicChatLimits", summary: "Hạn mức chat công khai đang áp dụng", cap: "W1",
    description: "`pending`: yêu cầu nâng đang chờ nền tảng duyệt.", ok: [200, { description: "Hạn mức", schema: res.publicChatLimitsResponse }], errors: [403] }),
  op(CH, { method: "post", path: "/chat/public-limits", operationId: "requestPublicChatLimits", summary: "Xin nâng hạn mức chat công khai", cap: "T4",
    body: req.publicChatLimitRequestBody,
    description: "Mức xin phải là một mức chọn sẵn và cao hơn mức hiện tại → không thì 400; đã có yêu cầu chờ duyệt → 409.",
    ok: [201, { description: "Yêu cầu đã ghi", schema: res.publicChatLimitRequestedResponse }], errors: [...BODY_ERRORS, 409] }),

  op(CH, { method: "post", path: "/chat/public/widget", operationId: "sendPublicChatWidgetMessage", summary: "Khung chat AI trên trang công khai", cap: null, auth: "public",
    body: req.publicChatWidgetBody,
    description: "Tổ chức suy từ `slug`. Không thấy tiệm hoặc trang bị tắt → 404; quá hạn mức theo khách/IP → 429; lỗi khác → 500 không kèm chi tiết. Mỗi lượt AI trả lời trừ 1 credit; tiệm hết credit → 200 với câu mời chờ nhân viên. Lỗi theo envelope chuẩn `{ error: { code, message } }`; route không qua `handle()` nên không có header `RateLimit-*`.",
    ok: [200, { description: "Trả lời của trợ lý", schema: res.publicChatWidgetResponse }], errors: [400, 404, 429, 500] }),
  legacyErrors(op(HOOK, { method: "get", path: "/chat/webhooks/facebook", operationId: "verifyFacebookWebhook", summary: "Xác minh webhook Facebook", cap: null, auth: "public",
    query: req.facebookVerifyQuery,
    description: "`hub.verify_token` khớp `FB_WEBHOOK_VERIFY_TOKEN` → 200 thân là `hub.challenge` (văn bản thường); khác hoặc chưa cấu hình → 403 `Forbidden`.",
    ok: [200, { description: "Chuỗi challenge", contentType: "text/plain" }], errors: [403] })),
  legacyErrors(op(HOOK, { method: "post", path: "/chat/webhooks/facebook", operationId: "receiveFacebookWebhook", summary: "Nhận tin Messenger", cap: null, auth: "public",
    description: "Ký `X-Hub-Signature-256` (HMAC-SHA256 thân gốc với App Secret) — sai → 401. Mỗi tin (`mid`) chỉ trả lời một lần. Lỗi xử lý vẫn trả 200 để Facebook không gửi lại.",
    ok: [200, { description: "Đã nhận", schema: res.facebookWebhookResponse }], errors: [401] })),
  legacyErrors(op(HOOK, { method: "post", path: "/chat/webhooks/zalo", operationId: "receiveZaloWebhook", summary: "Nhận tin Zalo OA", cap: null, auth: "public",
    description: "Thân không phải JSON → 400. Ký `X-ZEvent-Signature` theo App ID + Secret Key của OA tiệm đã cấu hình, sự kiện cũ bị từ chối — sai → 401. Mỗi tin chỉ trả lời một lần; lỗi xử lý vẫn trả 200.",
    ok: [200, { description: "Đã nhận", schema: res.zaloWebhookResponse }], errors: [400, 401] })),

  op(IN, { method: "get", path: "/internal-chat/conversations", operationId: "listInternalConversations", summary: "Hội thoại nội bộ tôi tham gia", cap: null,
    query: req.internalConversationsQuery, description: "Không cần mã năng lực.",
    ok: [200, { description: "Hội thoại", schema: res.internalConversationsResponse }] }),
  op(IN, { method: "post", path: "/internal-chat/conversations", operationId: "createInternalConversation", summary: "Tạo hoặc lấy lại hội thoại nội bộ", cap: null,
    body: z.union([req.openInternalRoomBody, req.createInternalConversationBody]),
    description: `Thân \`{ partner_org_id }\` / \`{ chain_org_id }\` / \`{ branch_id }\` mở phòng của đúng một cặp (không liên kết đang có hiệu lực → 404); thân còn lại tạo hội thoại — \`PLATFORM_TENANT\` client không tự tạo được (→ 400). \`targetUserId\` ngoài tổ chức/đối tác/chuỗi đang liên kết, hoặc \`orderId\` của tổ chức khác → 404. Sai lược đồ → 400 \`details.reason\` (một chuỗi).`,
    ok: [200, { description: "Hội thoại", schema: res.internalConversationResponse }], errors: [...BODY_ERRORS, 404] }),
  op(IN, { method: "get", path: "/internal-chat/conversations/{id}/messages", operationId: "listInternalMessages", summary: "Tin nhắn của hội thoại nội bộ", cap: null,
    description: MEMBER, ok: [200, { description: "Tin nhắn", schema: res.internalMessagesResponse }], errors: [404] }),
  op(IN, { method: "post", path: "/internal-chat/conversations/{id}/messages", operationId: "sendInternalMessage", summary: "Gửi tin nhắn nội bộ", cap: null,
    body: req.sendInternalMessageBody, description: `${MEMBER} Chỉ tin chữ: thân có \`actionPayload\` / \`attachments\` / loại khác \`TEXT\` hoặc tin rỗng → 400 (thẻ đơn và tin hệ thống chỉ do máy chủ sinh; ảnh gửi qua \`/images\`).`,
    ok: [200, { description: "Tin đã gửi", schema: res.internalMessageResponse }], errors: [...BODY_ERRORS, 404] }),
  op(IN, { method: "post", path: "/internal-chat/messages/{id}/action", operationId: "handleInternalCardAction", summary: "Bấm nút trên thẻ hành động (nhận/từ chối đơn)", cap: null,
    body: req.internalCardActionBody, description: `${MEMBER} Chỉ tổ chức được giao, không phải người gửi thẻ (khác → 404). Tin không phải thẻ đơn (\`ACTION_CARD_ORDER\`) → 409; thẻ đã xử lý hoặc vừa bị người khác xử lý → 409. Giữ trạng thái sống của thẻ, chỉ đổi phần do nút quyết định.`,
    ok: [200, { description: "Tin sau khi cập nhật", schema: res.internalMessageResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(IN, { method: "patch", path: "/internal-chat/messages/{id}", operationId: "editInternalMessage", summary: "Sửa tin của mình (trong 24 giờ)", cap: "S1",
    body: req.editInternalMessageBody,
    description: `Chỉ người gửi, chỉ tin chữ / chú thích ảnh. Tin của người khác hoặc ngoài phòng → 404; quá 24 giờ, đã thu hồi, thẻ đơn, tin hệ thống → 409. ${NOTE_AUDIT}`,
    ok: [200, { description: "Tin sau khi sửa", schema: res.internalMessageDataResponse }], errors: [...BODY_ERRORS, 404, 409, 429] }),
  op(IN, { method: "delete", path: "/internal-chat/messages/{id}", operationId: "deleteInternalMessage", summary: "Thu hồi tin của mình (trong 24 giờ)", cap: "S1",
    description: `Xoá mềm: xoá nội dung và đính kèm; ảnh vào hàng đợi xoá tệp của tổ chức chủ phòng. Cùng luật 404 / 409 như sửa tin. ${NOTE_AUDIT}`,
    ok: [200, { description: "Đã thu hồi", schema: res.internalMessageDeletedResponse }], errors: [404, 409, 429] }),
  op(IN, { method: "patch", path: "/internal-chat/conversations/{id}/mute", operationId: "muteInternalConversation", summary: "Tắt / bật thông báo của phòng cho chính mình", cap: "S1",
    body: req.muteInternalConversationBody, description: "Không vào được phòng → 404.",
    ok: [200, { description: "Trạng thái tắt tiếng", schema: res.internalMuteResponse }], errors: [...BODY_ERRORS, 404] }),
  op(IN, { method: "post", path: "/internal-chat/conversations/{id}/images", operationId: "sendInternalImages", summary: "Gửi 1–5 ảnh kèm chú thích trong một tin", cap: "S1",
    multipart: req.internalChatImagesForm,
    description: "Kiểm byte thật từng ảnh (JPG/PNG/WebP, ≤ 10 MB, ≤ 5 ảnh). `attachments` là khoá kho; đọc lại phòng để có URL ký. Không vào được phòng → 404.",
    ok: [201, { description: "Tin ảnh vừa tạo", schema: res.internalMessageDataResponse }], errors: [...BODY_ERRORS, 404, 429] }),
  op(IN, { method: "get", path: "/internal-chat/unread", operationId: "countInternalUnread", summary: "Tổng tin chưa đọc của tôi", cap: "S1",
    ok: [200, { description: "Số tin chưa đọc", schema: res.internalUnreadResponse }] }),
  op(IN, { method: "get", path: "/internal-chat/stats", operationId: "internalChatStats", summary: "Số liệu giao đơn qua chat 30 ngày (phía chuỗi)", cap: "S1",
    description: "Tổ chức không có cửa hàng đối tác → toàn 0. Chỉ số đếm.",
    ok: [200, { description: "Số liệu", schema: res.internalChatStatsResponse }] }),
  op(IN, { method: "get", path: "/internal-chat/stream", operationId: "streamInternalChat", summary: "Luồng báo phòng có tin mới (SSE)", cap: "S1",
    description: "`text/event-stream`: sự kiện `connected`, rồi `room` với `{ conversationId }` (không có nội dung tin); ping 25 giây; đóng sau 30 phút, trình duyệt tự nối lại. Lọc theo tổ chức và chi nhánh của phiên.",
    ok: [200, { description: "Luồng sự kiện", contentType: "text/event-stream" }] }),
]
