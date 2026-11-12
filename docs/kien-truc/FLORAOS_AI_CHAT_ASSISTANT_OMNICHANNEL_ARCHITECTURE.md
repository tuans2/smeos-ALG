# ĐẶC TẢ KIẾN TRÚC & KỸ THUẬT: FLORAOS AI CHAT ASSISTANT & OMNICHANNEL PLATFORM (M08 — P23)

> **Mục tiêu tài liệu:** Thiết lập tài liệu Chuẩn Duy Nhất (Single Source of Truth - SSOT) về toàn bộ kiến trúc, ranh giới module, hợp đồng tích hợp đa kênh và cơ chế định giá / thu phí của phân hệ **AI Chat Assistant (M08)**. Tài liệu này đảm bảo bất kỳ kỹ sư hoặc AI agent nào khi tiếp quản hệ thống đều có thể nâng cấp, thay thế AI provider hoặc bổ sung kênh mới mà không làm mất đi tính toàn vẹn và đồng bộ với nền tảng FloraOS-core.

---

## 1. Tổng Quan & Vai Trò Trong Hệ Sinh Thái FloraOS

Phân hệ **AI Chat Assistant (M08)** hoạt động theo cơ chế **Dual-Intent Engine (Trợ lý Kép 2-trong-1)**:

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │             FLORAOS AI CHAT ASSISTANT (M08)             │
                                  └────────────────────────────┬────────────────────────────┘
                                                               │
                                ┌──────────────────────────────┴──────────────────────────────┐
                                │                                                             │
                                ▼                                                             ▼
             ┌─────────────────────────────────────┐                       ┌─────────────────────────────────────┐
             │         NHÁNH A: NỘI BỘ             │                       │         NHÁNH B: ĐA KÊNH            │
             │   (SaaS Operations Copilot)         │                       │ (Omnichannel Sales & Consultant)    │
             └──────────────────┬──────────────────┘                       └──────────────────┬──────────────────┘
                                │                                                             │
            ┌───────────────────┴───────────────────┐                     ┌───────────────────┴───────────────────┐
            │ - Nổi toàn hệ thống (layout.tsx)      │                     │ - E-Catalog Web (/c/[slug])           │
            │ - Phím tắt Cmd+K / Ctrl+K             │                     │ - Landing Page Sự Kiện                │
            │ - Hướng dẫn tính năng M01 - M10       │                     │ - Facebook Messenger (Fanpage)        │
            │ - Deep Link điều hướng trực tiếp      │                     │ - Zalo Official Account (OA)          │
            │ - Trích xuất cẩm nang tri thức SSOT   │                     │ - Mã nhúng Website ngoài (Script)     │
            └───────────────────────────────────────┘                     │ - Trích xuất Product Master Index     │
                                                                          │ - 1-Chạm tạo đơn hàng nháp M10        │
                                                                          └───────────────────────────────────────┘
```

1. **Nhánh A — Trợ Lý Vận Hành SaaS Nội Bộ (`INTERNAL_DASHBOARD`)**:
   - Xuất hiện trên mọi màn hình của webapp FloraOS thông qua `<AlgGlobalCopilot />` nhúng tại `src/app/(app)/layout.tsx`.
   - Trả lời 24/7 mọi thắc mắc của chủ tiệm và thợ hoa về quy trình: in phiếu cắm hoa giấu giá M10, phiếu giao hàng A6, công thức giá sàn/trần M02, quét ngày kỷ niệm CRM M09, dựng video marketing 9:16 M04c.
   - Cung cấp nút Deep Link điều hướng trực tiếp đến đúng màn hình cần thao tác.

2. **Nhánh B — Trợ Lý Tư Vấn Bán Hàng Đa Điểm Chạm (Omnichannel)**:
   - Tiếp xúc trực tiếp với khách hàng của tiệm hoa trên 5 kênh đối ngoại: E-Catalog, Landing Page, Facebook Fanpage, Zalo OA, Website ngoài.
   - Hiểu ngôn ngữ tự nhiên: nhận diện ngân sách (vd: `500k`, `1 triệu`), loài hoa yêu thích, tone màu và dịp lễ (sinh nhật, khai trương, 20/10).
   - Tự động trích xuất mẫu hoa có thật từ **Product Master Index (BOM hoa, ảnh thật, giá niêm yết)**.
   - Hỗ trợ khách hàng chốt đơn và tự động đẩy đơn hàng nháp sang **Kanban M10**.

---

## 2. Nguyên Tắc Thiết Kế Đồng Bộ (Architectural Invariants)

Để bảo đảm tính toàn vẹn của nền tảng khi nâng cấp, phân hệ AI Chat Assistant bắt buộc phải tuân thủ 5 nguyên tắc bất biến:

1. **Chân Lý Đơn Duy Nhất về Dữ Liệu (Master Index SSOT)**:
   - Trợ lý AI **tuyệt đối không tự sinh ra thông tin sản phẩm ảo**. Mọi mẫu hoa gợi ý bắt buộc phải truy vấn từ `listProductMasterIndex()` của module Products.
   - Dữ liệu khách hàng và ngày kỷ niệm liên kết trực tiếp với `CustomerMasterIndex` của module CRM.

2. **Cách Ly Đa Khách Thuê Tuyệt Đối (Strict Tenant Isolation)**:
   - Mọi cuộc hội thoại (`chat_conversations`), tin nhắn (`chat_messages`) và cấu hình kênh (`chat_channel_integrations`) đều gắn chặt với `organization_id`.
   - Token API của Facebook / Zalo OA của Tiệm A không bao giờ lộ sang Tiệm B.
   - Được bảo vệ bởi bộ test tự động bắt buộc xanh: `tests/tenant/chat-isolation.test.ts` và `tests/tenant/chat-channel-isolation.test.ts`.

3. **Cơ Chế Kiểm Soát Định Giá & Chốt Chặn Tài Nguyên (Aegis Monetization & Resource Protection)**:
   - Nền tảng FloraOS-core nắm giữ quyền kiểm soát biểu phí kích hoạt kênh và phí tin nhắn AI thông qua module `usage`.
   - Khi shop hết credit: AI tự động ngắt phản hồi, bảo vệ quota hệ thống không bị spam/vòng lặp vô hạn, đồng thời gửi thông báo mời nhân viên vào chat thủ công.

4. **Kiến Trúc Headless Cắm Rút Đa Tầng (4-Tier Fallback AI Engine)**:
   - Mã nghiệp vụ gọi qua cổng `DifyChatProvider` hoặc `callCapability`. Tuyệt đối không gọi thẳng SDK nhà cung cấp trong `use-cases/`.
   - Cơ chế dự phòng 4 tầng tự động chuyển mạch liền mạch:
     * **Tầng 1 (Dify Cloud/Self-hosted)**: Khi cấu hình `DIFY_API_KEY`.
     * **Tầng 2 (OpenAI Direct - `gpt-4o-mini`)**: Khi có `OPENAI_API_KEY`, sinh câu trả lời tự nhiên, linh hoạt, cá nhân hóa theo hạng khách và giải quyết triệt để vấn đề rập khuôn, lặp từ.
     * **Tầng 3 (Local Qwen 2.5:7b qua Ollama)**: Chi phí **0 VNĐ / 0 Token**, chạy on-premise cục bộ tại `OLLAMA_URL`, bảo mật tuyệt đối.
     * **Tầng 4 (Local Rule Engine Nội Bộ)**: Chốt chặn an toàn cuối cùng, hoạt động 100% khi ngắt mạng hoặc thiếu mọi API key mà không bao giờ gây crash hệ thống.

5. **Ranh Giới Kiến Trúc Sạch (Clean Architecture Law)**:
   - `domain/`: Thuần TypeScript, cấm import Prisma, cấm import hạ tầng.
   - `use-cases/`: Điều phối nghiệp vụ, cấm import trực tiếp `@/core/tenancy/infra/prisma`.
   - `infra/`: Nơi duy nhất được phép truy vấn Prisma. Được kiểm định bởi `khong-import-prisma-ngoai-infra.test.ts`.
   - Giới hạn file: Tuân thủ nghiêm ngặt SRP < 350 dòng/file.

---

## 3. Cấu Trúc Thư Mục Module `src/modules/chat-assistant/`

```
src/modules/chat-assistant/
├── domain/                                  # 1. Tầng Nghiệp vụ cốt lõi (Thuần TypeScript)
│   ├── chat-types.ts                       # Định nghĩa ChatConversation, ChatMessage, SuggestedFlowerCard
│   ├── channel-integration-types.ts        # SupportedChatChannel, ChannelPricingInfo, ChannelConfig
│   ├── channel-integration-rules.ts        # Biểu phí niêm yết, chốt chặn canActivateChannel, gia hạn
│   ├── saas-knowledge-base.ts              # Tri thức vận hành M01-M10, detectUserIntent, querySaasKnowledge
│   └── flower-consultant-rules.ts          # Bóc tách ngân sách, dịp lễ, thuật toán khớp hoa Master Index
│
├── infra/                                   # 2. Tầng Hạ tầng & Cơ sở dữ liệu (Prisma Scoped)
│   ├── chat-repository.ts                  # CRUD hội thoại và tin nhắn theo TenantContext
│   └── chat-channel-repository.ts          # CRUD cấu hình đa kênh, tra cứu Webhook Page/OA ID, trừ credit
│
├── use-cases/                               # 3. Tầng Ca sử dụng nghiệp vụ
│   ├── create-conversation.ts              # Khởi tạo cuộc hội thoại mới
│   ├── list-conversations.ts               # Lấy danh sách hội thoại theo bộ lọc trạng thái
│   ├── get-conversation-messages.ts        # Lấy lịch sử tin nhắn của cuộc hội thoại
│   ├── send-chat-message.ts                # Tiếp nhận tin nhắn, nạp Master Index, gọi AI phản hồi
│   ├── convert-chat-to-draft-order.ts      # 1-chạm chốt đơn mẫu hoa gợi ý sang M10 Đơn hàng
│   ├── list-chat-channels.ts               # Liệt kê 6 kênh tiếp xúc, biểu phí và thời hạn thuê bao
│   ├── configure-chat-channel.ts           # Bật/tắt, cấu hình API và trừ phí kích hoạt kênh
│   └── handle-incoming-channel-message.ts  # Xử lý tin nhắn từ Webhooks/Widget, trừ usage credit
│
└── adapters/                                # 4. Tầng Adapter kết nối bên ngoài
    └── dify-chat-provider.ts               # Bộ điều hợp Headless AI (Dual-Intent Routing & Local Fallback)
```

---

## 4. Mô Hình Dữ Liệu Cơ Sở Dữ Liệu (Prisma Schema)

Lược đồ được định nghĩa tại `prisma/schema.prisma` và đồng bộ trên cả 2 cơ sở dữ liệu `floraos` và `floraos_test`:

```prisma
enum chat_channel {
  WEB_WIDGET
  INTERNAL_DASHBOARD
  STOREFRONT_CATALOG
  LANDING_PAGE
  FACEBOOK_MESSENGER
  ZALO_OA
  EMBEDDED_WIDGET
  ZALO
}

enum chat_sender_type {
  USER
  ASSISTANT
  SYSTEM
}

model chat_conversations {
  id              String        @id @default(uuid())
  organization_id String
  customer_id     String?
  title           String        @default("Hội thoại tư vấn hoa")
  channel         chat_channel  @default(WEB_WIDGET)
  status          String        @default("ACTIVE") // ACTIVE, CLOSED
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  organization    organizations @relation(fields: [organization_id], references: [id])
  customer        customers?    @relation(fields: [customer_id], references: [id])
  messages        chat_messages[]

  @@index([organization_id, status])
  @@index([organization_id, customer_id])
}

model chat_messages {
  id              String            @id @default(uuid())
  organization_id String
  conversation_id String
  sender_type     chat_sender_type
  content         String
  metadata        Json?             // Gợi ý hoa từ Master Index, Draft Order ID, Deep Link

  created_at      DateTime          @default(now())

  organization    organizations      @relation(fields: [organization_id], references: [id])
  conversation    chat_conversations @relation(fields: [conversation_id], references: [id], onDelete: Cascade)

  @@index([organization_id, conversation_id, created_at])
}

model chat_channel_integrations {
  id                       String        @id @default(uuid())
  organization_id          String
  channel                  chat_channel
  is_enabled               Boolean       @default(false)
  config                   Json          @default("{}") // fbPageId, fbPageAccessToken, zaloOaId, zaloAccessToken
  subscription_expires_at  DateTime?
  created_at               DateTime      @default(now())
  updated_at               DateTime      @updatedAt

  organization             organizations @relation(fields: [organization_id], references: [id])

  @@unique([organization_id, channel])
  @@index([organization_id, is_enabled])
}
```

---

## 5. Cơ Chế Định Giá & Mô Hình Thu Phí Của FloraOS-core

Hệ thống định giá được quản lý tập trung tại `src/modules/usage/domain/pricing.ts` và `channel-integration-rules.ts`:

### A. Biểu Phí Kích Hoạt Kênh (Monthly Channel Subscription)

| Kênh tích hợp | Mã Channel | Phí thuê bao | Phí tin nhắn AI | Mục đích sử dụng |
|---|---|---|---|---|
| **In-App Copilot** | `INTERNAL_DASHBOARD` | **0 credit** | 0 credit | Hướng dẫn vận hành nội bộ webapp |
| **E-Catalog Web** | `STOREFRONT_CATALOG` | **0 credit** | 1 credit / 10 tin | Gắn nổi trên link `/c/[slug]` |
| **Landing Page** | `LANDING_PAGE` | **0 credit** | 1 credit / 10 tin | Gắn trên landing page chiến dịch |
| **Facebook Messenger** | `FACEBOOK_MESSENGER` | **50 credit / tháng** (~150k đ) | 1 credit / 10 tin | Kết nối Fanpage Facebook 24/7 |
| **Zalo Official Account** | `ZALO_OA` | **70 credit / tháng** (~200k đ) | 1 credit / 10 tin | Kết nối Zalo OA Doanh Nghiệp |
| **Mã Nhúng Website Ngoài** | `EMBEDDED_WIDGET` | **30 credit / tháng** (~100k đ) | 1 credit / 10 tin | Nhúng website WordPress, Haravan, Shopify |

### B. Quy Trình Thu Phí & Chốt Chặn Tài Nguyên (Monetization Flow)

1. **Khi Chủ Shop Bấm Kích Hoạt Kênh Có Phí**:
   ```ts
   // use-cases/configure-chat-channel.ts
   const check = canActivateChannel(channel, org.credit_balance, currentExpiry)
   if (!check.allowed) {
     throw new AppError("QUOTA_EXCEEDED", check.reason)
   }
   if (check.requiredCredit > 0) {
     await orgRepo.tryDeductCredit(ctx, check.requiredCredit)
     await usageRepo.record(ctx, {
       feature: `chat.channel.${channel.toLowerCase()}`,
       costCredit: check.requiredCredit,
       status: "COMPLETED",
     })
     newExpiry = calculateNewExpiry(currentExpiry, 30) // Gia hạn 30 ngày
   }
   ```

2. **Khi Khách Nhắn Tin Trên Bất Kỳ Kênh Nào**:
   - `handleIncomingChannelMessage()` kiểm tra `isChannelSubscriptionActive()`:
     - Nếu kênh chưa kích hoạt hoặc hết hạn: Trả tin nhắn thông báo kênh tạm đóng.
     - Nếu ví của shop `< 1 credit`: Trả tin nhắn báo trợ lý đang bận và chuyển cho nhân viên trực fanpage.
     - Nếu hợp lệ: Trừ 1 credit, ghi nhật ký vào `usage` (`chat.message.ai_reply`), gọi AI trích xuất mẫu hoa và gửi phản hồi.

### C. Phân Tích Chi Phí Token LLM, Tùy Chọn Miễn Phí 0đ & Cơ Chế Xử Lý Lặp Lời Thoại

Hệ thống phân định rành mạch 2 tầng chi phí độc lập:

1. **Tầng Chi Phí Nền Tảng SaaS FloraOS (Credit Phía Khách Hàng)**:
   - Đây là khoản phí phần mềm mà tiệm hoa trả cho FloraOS để vận hành kênh tự động (1 credit / 10 tin).
   - **In-App Copilot nội bộ (`INTERNAL_DASHBOARD`)**: Hoàn toàn **0 credit (Miễn phí trọn đời)** cho mọi nhân sự của tiệm để tra cứu nghiệp vụ M01-M10.

2. **Tầng Chi Phí Hạ Tầng AI (Token AI Engine)**:
   - **Tùy chọn Miễn Phí 0đ (Zero-Cost Local AI)**:
     - Khi chạy **Local Qwen 2.5:7b qua Ollama** (`http://127.0.0.1:11434`), chi phí Token = **0 VNĐ**. Không tốn một đồng chi phí API nào ra bên ngoài, dữ liệu sản phẩm và khách hàng được bảo mật hoàn toàn on-premise.
     - Khi chạy **Local Rule Engine**: Chi phí Token = **0 VNĐ**, phản hồi dưới 5ms.
   - **Tùy chọn OpenAI Direct (`gpt-4o-mini`)**:
     - Tiêu tốn token OpenAI ở mức cực kỳ thấp (~$0.15 / 1 triệu input tokens, ~$0.60 / 1 triệu output tokens). Mỗi lượt tư vấn hoa chỉ tốn khoảng 30–70 VNĐ.
   - **Tùy chọn Dify AI**: Tùy thuộc vào việc tự host Dify mã nguồn mở (0đ) hoặc dùng gói Dify Cloud.

3. **Cơ Chế Giải Quyết Triệt Để Hiện Tượng "Câu Trả Lời Bị Lặp Đi Lặp Lại"**:
   - **Nguyên nhân**: Khi chưa cấu hình API Key hoặc LLM offline, hệ thống tự kích hoạt Fallback Tầng 4 (Local Rule Engine). Rule Engine sử dụng các template câu định sẵn nên nếu khách hỏi nhiều câu tương đồng, câu chữ sẽ bị lặp lại rập khuôn.
   - **Giải pháp nâng cấp**:
     - Kích hoạt tầng LLM thông minh: OpenAI `gpt-4o-mini` hoặc Local Qwen 2.5:7b.
     - System Prompt chuyên sâu: Huấn luyện AI nhập vai chuyên gia cắm hoa FloraOS với `temperature: 0.7`, câu văn tự nhiên, duyên dáng, thay đổi cấu trúc linh hoạt theo từng lượt hỏi.
     - Dynamic Context Injection: Tự động trích xuất ngữ cảnh khách hàng (`VIP`, `Gold`, sở thích hoa) và danh mục mẫu hoa thực tế từ `ProductMasterIndex` để câu trả lời luôn mới mẻ, đúng thực tế và không bị ảo giác.

---

## 6. Hợp Đồng Giao Tiếp API (API Endpoints Specification)

| Phương thức | Đường dẫn API | Mã quyền RBAC | Mô tả chức năng |
|---|---|---|---|
| `GET` | `/api/v1/chat/conversations` | `T1` | Xem danh sách hội thoại của shop |
| `POST` | `/api/v1/chat/conversations` | `T2` | Tạo hội thoại mới thủ công |
| `GET` | `/api/v1/chat/conversations/:id/messages` | `T1` | Xem tin nhắn trong một cuộc hội thoại |
| `POST` | `/api/v1/chat/conversations/:id/messages` | `T2` | Gửi tin nhắn và nhận phản hồi AI |
| `POST` | `/api/v1/chat/conversations/:id/create-order` | `T3` | 1-chạm chốt đơn hàng nháp sang M10 |
| `GET` | `/api/v1/chat/channels` | `T1` | Xem danh sách 6 kênh, biểu phí và hạn dùng |
| `POST` | `/api/v1/chat/channels` | `T4` (Trần cứng) | Bật/tắt kênh, cài đặt API token và trừ phí |
| `GET` | `/api/v1/chat/webhooks/facebook` | Public | Xác thực Webhook Meta (`hub.challenge`) |
| `POST` | `/api/v1/chat/webhooks/facebook` | Public | Tiếp nhận tin nhắn từ Facebook Messenger |
| `POST` | `/api/v1/chat/webhooks/zalo` | Public | Tiếp nhận tin nhắn từ Zalo OA |
| `POST` | `/api/v1/chat/public/widget` | Public (CORS) | Nhận tin nhắn từ E-Catalog hoặc Website ngoài |

---

## 7. Giao Diện Người Dùng & Trải Nghiệm Khách Hàng (Frontend Components)

1. **Trợ Lý Nổi Toàn Hệ Thống (`<AlgGlobalCopilot />`)**:
   - File: `src/components/chat/alg-global-copilot.tsx` & `copilot-message-item.tsx`.
   - Vị trí: Góc dưới bên phải trên toàn bộ webapp, hỗ trợ phím tắt `Cmd + K`.
   - Tự động bắt intent người dùng: Hướng dẫn nghiệp vụ SaaS (`SAAS_HELP`) kèm nút Deep Link điều hướng, hoặc Tư vấn bán hoa tươi (`FLOWER_SALES`) trích xuất từ Product Master Index.

2. **Trung Tâm Quản Trị Tích Hợp Đa Kênh**:
   - File: `src/app/(app)/hoi-thoai/kenh-tich-hop/page.tsx`.
   - Thành phần: `<FeatureGuidanceCard />` đỏ pastel chuẩn SSOT, `<ChannelIntegrationCard />`, `<ChannelConfigModal />`.
   - Khối mã nhúng script 1 dòng cho website ngoài kèm nút 1-chạm sao chép.

3. **Widget Cho Khách Hàng Xem Catalog (`<PublicStorefrontChatWidget />`)**:
   - File: `src/components/chat/public-storefront-chat-widget.tsx`.
   - Nhúng trực tiếp tại trang E-Catalog `/c/[slug]` và Landing Pages.
   - Gợi ý câu hỏi nhanh, xem mẫu hoa từ Master Index và đặt hàng trực tuyến.

4. **Cẩm Nang Tri Thức & Quy Chuẩn Nhập Liệu Chuẩn SSOT (`/tri-thuc`)**:
   - File trang: `src/app/(app)/tri-thuc/page.tsx`.
   - Dữ liệu tri thức 7 phân hệ: `src/components/knowledge-base/knowledge-data.ts`.
   - Thẻ hiển thị chuẩn SSOT: `src/components/knowledge-base/knowledge-module-card.tsx` (bảng so sánh Trực quan Chuẩn Good vs Sai Bad, danh sách Atomic Disaggregated Fields).
   - Thanh tiến độ Onboarding: `src/components/knowledge-base/onboarding-progress-bar.tsx` (đo lường mức độ sẵn sàng dữ liệu của tiệm).
   - Đồng bộ tri thức Copilot: `src/modules/chat-assistant/domain/saas-knowledge-base.ts` cập nhật từ khóa và quy trình 7 phân hệ M01–M10.

5. **Tái Cấu Trúc Điều Hướng Sidebar (`src/components/layout/desktop-nav.tsx`)**:
   - Đưa mục **"Tri thức & Nhập liệu"** (`/tri-thuc`) với badge `SSOT Guide` và **"AI Chat Assistant"** (`/hoi-thoai`) với badge `AI Copilot` lên vị trí trung tâm nổi bật.
   - Nhóm đầy đủ phân hệ cốt lõi: Sản phẩm & Giá, Phân tích hoa Vision, Creative Studio, Video Studio, CRM, Đơn hàng.
   - Chân Sidebar tích hợp nút 1-chạm kích hoạt **FloraOS Copilot (`Cmd+K`)**.

---

## 8. Hướng Dẫn Mở Rộng & Nâng Cấp (Developer Guide)

### A. Cách Bổ Sung Một Kênh Tiếp Xúc Mới (Ví dụ: Telegram hoặc TikTok Shop)
1. Thêm định danh kênh vào `SupportedChatChannel` trong `domain/channel-integration-types.ts` và `enum chat_channel` trong `prisma/schema.prisma`.
2. Khai báo biểu phí niêm yết trong `CHANNEL_PRICING_CATALOG` tại `domain/channel-integration-rules.ts`.
3. Bổ sung hàm tra cứu Webhook trong `infra/chat-channel-repository.ts` (ví dụ: `findActiveByTelegramBotToken`).
4. Tạo route webhook tiếp nhận tin nhắn tại `src/app/api/v1/chat/webhooks/<tên-kênh>/route.ts`, gọi hàm dùng chung `handleIncomingChannelMessage()`.
5. Viết unit test và tenant test tương ứng.

### B. Vận Hành Kiến Trúc AI Engine Đa Tầng (Multi-tier Engine Fallback)
Cấu trúc chuyển mạch tại `src/modules/chat-assistant/adapters/dify-chat-provider.ts`:
1. **Ưu tiên 1 — Dify API**: Kiểm tra biến môi trường `DIFY_API_KEY`. Nếu có, gọi qua `DifyChatProvider` tới Dify API Endpoint.
2. **Ưu tiên 2 — OpenAI Direct (`gpt-4o-mini`)**: Nếu không có Dify hoặc Dify lỗi mạng, kiểm tra `OPENAI_API_KEY`. Sử dụng model `gpt-4o-mini`, nạp dynamic context từ `ProductMasterIndex` và hạng khách hàng, temperature 0.7 để sinh văn phong ấm áp, tự nhiên, chống trùng lặp.
3. **Ưu tiên 3 — Local Qwen 2.5:7b (Ollama - 0đ)**: Gọi qua `http://127.0.0.1:11434/v1/chat/completions`. Chi phí **0 VNĐ / 0 Token**, hoàn toàn offline trên máy chủ cửa hàng. Timeout 6s bảo vệ hệ thống.
4. **Ưu tiên 4 — Local Rule Engine**: Fallback nội bộ cuối cùng, đảm bảo 100% không bao giờ crash nếu mất internet hoặc không có bất kỳ API key nào.

### C. Bộ Quyền RBAC & Sổ Đăng Ký Năng Lực
- `T1`: Quyền xem danh sách hội thoại, tin nhắn và danh mục kênh.
- `T2`: Quyền gửi tin nhắn tư vấn và tạo hội thoại.
- `T3`: Quyền 1-chạm chốt đơn hàng nháp từ gợi ý AI sang module M10.
- `T4`: Quyền quản trị kênh tích hợp đa kênh (Bật/tắt, nạp API token) — **Trần cứng bảo vệ**.
- Mọi vai hệ thống (`ADMIN_HE_THONG`, `CHU_TO_CHUC`, `QUAN_TRI_VIEN_CHI_NHANH`, `NHAN_VIEN`) đã được seed tự động và bảo đảm bởi `npm run test:tenant`.
- Toàn bộ hệ thống được bảo chứng bởi **414/414 unit tests passed** và bộ test cách ly đa khách thuê trên PostgreSQL thật.
