# ĐẶC TẢ KỸ THUẬT & NGHIỆP VỤ: MODULE INTERNAL CHAT (CHAT NỘI BỘ ĐA CẤP & ĐIỀU PHỐI ĐƠN HÀNG)
**Mã phân hệ:** `src/modules/internal-chat/`  
**Phiên bản:** v1.0.0 (SSOT)  
**Ngày lập:** 25/10/2026  
**Trạng thái:** Đã triển khai một phần (09/11/2026) — **trạng thái thật và quyết định PO ở `docs/plan/hoan-thien-chat-noi-bo.md`** (v3, §10). Các mục §3 (bảng `chat_*`) và §6 (lộ trình) bên dưới là bản thiết kế ban đầu, đã lỗi thời: bảng thật là `internal_chat_*` (đặc tả 07 §34), quyền theo tổ chức + `S1`/`S2`, thẻ đơn gia công phản chiếu Thẻ Gia Công.

---

## 1. TỔNG QUAN & BỐI CẢNH (EXECUTIVE SUMMARY)

### 1.1 Vấn đề nghiệp vụ
Hiện tại, sự tương tác giữa:
1. **Nền tảng SaaS (Platform Admin / Tech Support)** với **Khách hàng (Chuỗi / Cửa hàng - Tenant)**
2. **Tổng bộ Chuỗi (Chain HQ / Coordinator)** với **Cửa hàng chi nhánh / Đối tác gia công (Subcontractors / Partner Branches)**

chủ yếu diễn ra qua các kênh bên ngoài (Zalo, Telegram, Messenger...). Điều này dẫn đến các hệ quả:
- **Phân mảnh thông tin & Mất dấu lịch sử**: Trao đổi về duyệt mẫu, thay đổi yêu cầu đơn hàng hoặc lỗi đơn bị trôi tin nhắn.
- **Tắc nghẽn quy trình (Context Switch)**: Người điều phối phải sao chép mã đơn sang Zalo, nhận ảnh thành phẩm từ Zalo rồi quay lại hệ thống để tải lên và phê duyệt.
- **Rủi ro rò rỉ dữ liệu khách hàng**: Thông tin người nhận, địa chỉ bị sao chép tùy tiện trên các nhóm chat cá nhân.

### 1.2 Mục tiêu module
Xây dựng phân hệ **Internal Chat (Chat nội bộ thời gian thực)** nằm ngay trong ứng dụng web (`ALG`):
- **Phân cấp luồng giao tiếp rõ ràng**: Hỗ trợ 2 phạm vi chính: `PLATFORM_TENANT` (SaaS - Khách hàng) và `CHAIN_PARTNER` (Chuỗi - Đối tác/Chi nhánh).
- **Chat hướng hành động (Actionable Business Cards)**: Không chỉ chat văn bản mà còn gửi trực tiếp Thẻ đơn hàng (Order Card), Thẻ duyệt QC (QC Card), Thẻ điều phối shipper. Người nhận có thể bấm "Nhận đơn", "Từ chối", "Tải ảnh mẫu" ngay trong khung chat.
- **Bảo mật & Cách ly Đa Tenant tuyệt đối**: Đúng chuẩn quy tắc kiến trúc ALG (bảo vệ phân quyền, tenant isolation, không lộ dữ liệu chéo giữa các đối tác).

---

## 2. PHÂN CẤP LUỒNG HỘI THOẠI (COMMUNICATION TAXONOMY)

| Loại phòng chat (`type`) | Bên khởi tạo | Bên tham gia | Mục đích & Ngữ cảnh |
|---|---|---|---|
| `PLATFORM_TENANT` | Platform Admin / User | Ban quản trị tiệm / Quản lý chuỗi | Hỗ trợ kỹ thuật, giải đáp thắc mắc SaaS, nâng cấp gói, cảnh báo bảo trì. |
| `CHAIN_PARTNER` | Điều phối chuỗi / Chủ tiệm | Chi nhánh / Thợ cắm / Đối tác gia công | Điều phối gia công, thảo luận tiến độ, gửi mẫu chung, giải quyết khiếu nại đối tác. |
| `ORDER_THREAD` | Hệ thống / Điều phối | Bên giao việc & Bên nhận việc đơn hàng | Thảo luận chuyên sâu cho DUY NHẤT 1 đơn hàng (`order_id`), gắn liền lịch sử đơn. |

---

## 3. THIẾT KẾ DỮ LIỆU & LƯỢC ĐỒ CSDL (DATABASE SCHEMA SPEC)

Tuân thủ quy ước `snake_case`, mọi bản ghi gắn liền `organization_id` (trừ luồng nền tảng toàn cục kết nối tới tenant):

### 3.1 Bảng `chat_conversations` (Cuộc hội thoại)
```prisma
model chat_conversations {
  id              String    @id @default(uuid()) @db.Uuid
  organization_id String    @db.Uuid
  conversation_type String  @db.VarChar(50) // PLATFORM_TENANT, CHAIN_PARTNER, ORDER_THREAD
  title           String?   @db.VarChar(255)
  order_id        String?   @db.Uuid // Nếu là ORDER_THREAD
  metadata        Json      @default("{}") // Lưu thông tin phụ (partner_org_id, priority, tags)
  created_by      String    @db.Uuid
  created_at      DateTime  @default(now()) @db.Timestamptz(6)
  updated_at      DateTime  @updated_at @db.Timestamptz(6)
  last_message_at DateTime  @default(now()) @db.Timestamptz(6)

  participants    chat_participants[]
  messages        chat_messages[]

  @@index([organization_id, conversation_type])
  @@index([order_id])
}
```

### 3.2 Bảng `chat_participants` (Thành viên tham gia)
```prisma
model chat_participants {
  id              String    @id @default(uuid()) @db.Uuid
  conversation_id String    @db.Uuid
  user_id         String    @db.Uuid
  organization_id String    @db.Uuid
  role_in_chat    String    @default("MEMBER") @db.VarChar(30) // OWNER, ADMIN, MEMBER, GUEST_PARTNER
  last_read_at    DateTime  @default(now()) @db.Timestamptz(6)
  is_muted        Boolean   @default(false)
  joined_at       DateTime  @default(now()) @db.Timestamptz(6)

  conversation    chat_conversations @relation(fields: [conversation_id], references: [id], onDelete: Cascade)

  @@unique([conversation_id, user_id])
  @@index([user_id, organization_id])
}
```

### 3.3 Bảng `chat_messages` (Nội dung tin nhắn & Actionable Payloads)
```prisma
model chat_messages {
  id              String    @id @default(uuid()) @db.Uuid
  conversation_id String    @db.Uuid
  sender_user_id  String    @db.Uuid
  sender_role     String    @db.VarChar(50) // platform_admin, coordinator, partner_manager...
  message_type    String    @default("TEXT") @db.VarChar(30) 
  // TEXT: Tin nhắn thường
  // IMAGE: Ảnh gửi kèm (link storage org/<org_id>/chat/...)
  // ACTION_CARD_ORDER: Thẻ đơn hàng (chứa mã đơn, thời hạn, ngân sách, nút nhận đơn)
  // ACTION_CARD_QC: Thẻ duyệt ảnh thành phẩm (chứa ảnh QC, nút duyệt/yêu cầu sửa)
  // SYSTEM_NOTICE: Thông báo trạng thái hệ thống
  content         String    @db.Text
  attachments     Json      @default("[]") // Danh sách URL ảnh / tài liệu
  action_payload  Json      @default("{}") // Dữ liệu thẻ tương tác (status, orderId, actions)
  is_deleted      Boolean   @default(false)
  created_at      DateTime  @default(now()) @db.Timestamptz(6)

  conversation    chat_conversations @relation(fields: [conversation_id], references: [id], onDelete: Cascade)

  @@index([conversation_id, created_at])
}
```

---

## 4. KIẾN TRÚC MÃ NGUỒN 4 LỚP (CLEAN ARCHITECTURE)

Module được đặt tại `src/modules/internal-chat/`:

```
src/modules/internal-chat/
├── domain/
│   ├── chat-conversation.ts        # Entity Conversation & Invariants
│   ├── chat-message.ts             # Entity Message, MessageType enum, ActionPayload rules
│   └── errors.ts                   # Domain Exceptions (AccessDenied, ThreadLocked...)
├── use-cases/
│   ├── send-chat-message.ts        # Gửi tin nhắn thường / đính kèm file
│   ├── dispatch-order-to-chat.ts   # Bắn thẻ đơn hàng vào cuộc trò chuyện chi nhánh/đối tác
│   ├── handle-card-action.ts       # Xử lý nút bấm trên Thẻ (Nhận đơn, Duyệt QC)
│   ├── list-conversations.ts       # Lấy danh sách hội thoại có phân trang & unread count
│   └── get-conversation-messages.ts# Tải lịch sử tin nhắn kèm pagination
├── infra/
│   ├── prisma-chat-repository.ts   # Tầng truy xuất DB qua Prisma
│   └── sse-event-stream.ts         # Stream tin nhắn realtime qua Server-Sent Events
└── adapters/
    ├── chat-storage-adapter.ts     # Upload ảnh chat vào storage chuẩn org/<org_id>/chat/
    └── order-integration-adapter.ts# Cầu nối gọi module greeting-card / orders khi click Action Card
```

---

## 5. ĐẶC TẢ GIAO DIỆN (UI/UX SPECIFICATION)

1. **Vị trí hiển thị**:
   - **Floating Chat Dock / Drawer** (Góc dưới bên phải màn hình): Có huy hiệu số tin chưa đọc (Unread badge). Bấm mở popup chat tiện lợi mà không rời khỏi trang đang làm việc.
   - **Full Chat Console** (`/tro-chuyen` hoặc `/dieu-phoi/tin-nhan`): Màn hình chat toàn trang chuyên dụng cho Điều phối viên Chuỗi hoặc Nhân viên CSKH.
   - **Tab Chat trong Chi tiết Đơn hàng**: Mở thẳng thread chat gắn với `order_id` đó.
2. **Quy chuẩn Actionable Card (Thẻ tương tác)**:
   - Thẻ đơn hàng hiển thị: Mã đơn, Thời gian giao, Ảnh mẫu đại diện (theo chuẩn Product Thumbnail SSOT), Giá trị đơn hàng, Nút bấm: `[Xác nhận nhận đơn]` / `[Từ chối]`.
   - Trạng thái thẻ biến đổi trực tiếp (Living state): Khi đối tác bấm nhận, thẻ đổi sang trạng thái `ĐÃ NHẬN VIỆC - ĐANG THỰC HIỆN` (disable nút, không sinh thêm tin spam).
3. **Tuân thủ quy tắc SaaS**:
   - 100% Tiếng Việt thân thiện, không dùng thuật ngữ kỹ thuật.
   - Giới hạn file tối đa 350 dòng/file (chia nhỏ `ChatDrawer`, `ChatThreadList`, `ChatMessageItem`, `ActionCardOrder`).

---

## 6. LỘ TRÌNH TRIỂN KHAI CHI TIẾT (IMPLEMENTATION ROADMAP)

### Giai đoạn 1: Nền tảng Dữ liệu & Clean Architecture Core
- [ ] Cập nhật `prisma/schema.prisma` với 3 bảng: `chat_conversations`, `chat_participants`, `chat_messages`.
- [ ] Chạy `npx prisma db push` & sinh client.
- [ ] Xây dựng Domain Entities & Port Interfaces (`IChatRepository`, `IChatStream`).
- [ ] Xây dựng Use-Cases cơ bản: `list-conversations`, `get-conversation-messages`, `send-chat-message`.

### Giai đoạn 2: API Routes & Cơ chế Realtime (SSE)
- [ ] Viết API `/api/v1/internal-chat/conversations` (GET, POST).
- [ ] Viết API `/api/v1/internal-chat/conversations/[id]/messages` (GET, POST).
- [ ] Viết API SSE `/api/v1/internal-chat/stream` để đẩy tin nhắn mới và badge unread tới client.

### Giai đoạn 3: Actionable Business Cards (Thẻ nghiệp vụ)
- [ ] Use-Case: `dispatch-order-to-chat` (Bắn đơn từ Điều phối vào chat đối tác).
- [ ] Use-Case: `handle-card-action` (Xử lý bấm nút Nhận đơn / Duyệt QC từ thẻ chat).
- [ ] Đảm bảo cơ chế cập nhật trạng thái thẻ tại chỗ (Living Dashboard Card pattern).

### Giai đoạn 4: UI Components & Tích hợp Trải nghiệm
- [ ] Xây dựng `ChatDockFloatingButton` & `ChatDrawer` gắn vào layout chính.
- [ ] Xây dựng Component hiển thị các loại Message: `TextMessage`, `ImageAttachmentMessage`, `ActionCardOrderMessage`.
- [ ] Tích hợp nút "Gửi đơn vào Chat" tại trang Quản lý điều phối đơn chuỗi.

### Giai đoạn 5: Kiểm thử, Bảo mật & Nghiệm thu
- [ ] Kiểm thử cách ly Tenant (`test:tenant`).
- [ ] Kiểm thử UX lint & WCAG (`lint:ux`, `test:e2e:ux`).
- [ ] Typecheck `npx tsc --noEmit` & bàn giao.
