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
const LEGACY = "Thành công trả `{ success: true, data }` cũ (ngoại lệ envelope, `api-envelope-legacy.txt`)."
/** Route trả `{ error: "chuỗi" }` cho bên gọi ngoài thay cho envelope `Error` chung. */
const legacyErrors = (o: OpenApiOperation): OpenApiOperation => ({ ...o, extensions: { ...o.extensions, "x-legacy-error-envelope": true } })

export const CHAT_OPERATIONS: OpenApiOperation[] = [
  op(AI, { method: "get", path: "/chat/conversations", operationId: "listChatConversations", summary: "Hội thoại tư vấn", cap: "T1", query: req.chatConversationsQuery,
    description: "`status` mặc định `ACTIVE`; `limit` mặc định 50, chưa có trần; `limit` không phải số hiện trả 500 (lỗi đã ghi nhận, audit API §15).", ok: [200, { description: "Hội thoại", schema: res.chatConversationsResponse }], errors: [500] }),
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

  op(CH, { method: "get", path: "/chat/channels", operationId: "listChatChannels", summary: "Kênh chat, biểu phí và trạng thái", cap: null,
    description: "Chưa gác mã năng lực (RS-8 đặc tả 06). Khoá bí mật đã che.", ok: [200, { description: "Kênh", schema: res.chatChannelsResponse }] }),
  op(CH, { method: "post", path: "/chat/channels", operationId: "configureChatChannel", summary: "Bật/tắt và cấu hình một kênh", cap: "T4", body: req.configureChatChannelBody,
    description: "Mã năng lực kiểm ở use-case. Bật kênh có phí trừ credit gia hạn — không đủ → 422 `QUOTA_EXCEEDED`. Khoá bí mật gửi lại dạng đã che thì giữ giá trị cũ.",
    ok: [200, { description: "Kênh sau khi lưu", schema: res.chatChannelConfiguredResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(CH, { method: "get", path: "/chat/public-limits", operationId: "getPublicChatLimits", summary: "Hạn mức chat công khai đang áp dụng", cap: null,
    description: "`pending`: yêu cầu nâng đang chờ nền tảng duyệt.", ok: [200, { description: "Hạn mức", schema: res.publicChatLimitsResponse }] }),
  op(CH, { method: "post", path: "/chat/public-limits", operationId: "requestPublicChatLimits", summary: "Xin nâng hạn mức chat công khai", cap: "T4",
    body: req.publicChatLimitRequestBody,
    description: "Mức xin phải là một mức chọn sẵn và cao hơn mức hiện tại → không thì 400; đã có yêu cầu chờ duyệt → 409.",
    ok: [201, { description: "Yêu cầu đã ghi", schema: res.publicChatLimitRequestedResponse }], errors: [...BODY_ERRORS, 409] }),

  legacyErrors(op(CH, { method: "post", path: "/chat/public/widget", operationId: "sendPublicChatWidgetMessage", summary: "Khung chat AI trên trang công khai", cap: null, auth: "public",
    body: req.publicChatWidgetBody,
    description: "Tổ chức suy từ `slug`. Không thấy tiệm hoặc trang bị tắt → 404; quá hạn mức theo khách/IP → 429; lỗi khác → 500 không kèm chi tiết. **Lỗi đã ghi nhận (audit API §15):** tiệm còn credit thì lượt trả lời hiện luôn 500 sau khi đã trừ credit (ghi sổ `usage` vỡ khoá ngoại `workspace_id`). Mọi lỗi trả `{ error: \"chuỗi\" }`; route không qua `handle()` nên không có header `RateLimit-*`.",
    ok: [200, { description: "Trả lời của trợ lý", schema: res.publicChatWidgetResponse }], errors: [400, 404, 429, 500] })),
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
    query: req.internalConversationsQuery, description: `Không cần mã năng lực. ${LEGACY}`,
    ok: [200, { description: "Hội thoại", schema: res.internalConversationsResponse }] }),
  op(IN, { method: "post", path: "/internal-chat/conversations", operationId: "createInternalConversation", summary: "Tạo hoặc lấy lại hội thoại nội bộ", cap: null,
    body: req.createInternalConversationBody,
    description: `Không cần mã năng lực. \`targetUserId\` ngoài tổ chức/đối tác/chuỗi đang liên kết, hoặc \`orderId\` của tổ chức khác → 404. Sai lược đồ → 400 \`details.reason\` (một chuỗi). ${LEGACY}`,
    ok: [200, { description: "Hội thoại", schema: res.internalConversationResponse }], errors: [...BODY_ERRORS, 404] }),
  op(IN, { method: "get", path: "/internal-chat/conversations/{id}/messages", operationId: "listInternalMessages", summary: "Tin nhắn của hội thoại nội bộ", cap: null,
    description: `${MEMBER} ${LEGACY}`, ok: [200, { description: "Tin nhắn", schema: res.internalMessagesResponse }], errors: [404] }),
  op(IN, { method: "post", path: "/internal-chat/conversations/{id}/messages", operationId: "sendInternalMessage", summary: "Gửi tin nhắn nội bộ", cap: null,
    body: req.sendInternalMessageBody, description: `${MEMBER} Tin rỗng không kèm tệp → 400. ${LEGACY}`,
    ok: [200, { description: "Tin đã gửi", schema: res.internalMessageResponse }], errors: [...BODY_ERRORS, 404] }),
  op(IN, { method: "post", path: "/internal-chat/messages/{id}/action", operationId: "handleInternalCardAction", summary: "Bấm nút trên thẻ hành động (nhận/từ chối đơn)", cap: null,
    body: req.internalCardActionBody,
    description: `Không cần mã năng lực. **Lỗi đã ghi nhận (audit API §15):** use-case chưa kiểm người tham gia lẫn tổ chức của tin — ghi đè \`action_payload\` của tin theo \`id\` rồi đăng tin hệ thống vào hội thoại đó; mã tin không tồn tại → 500. ${LEGACY}`,
    ok: [200, { description: "Tin sau khi cập nhật", schema: res.internalMessageResponse }], errors: [...BODY_ERRORS, 500] }),
]
