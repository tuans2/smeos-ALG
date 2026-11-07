# 07 — Đặc tả cơ sở dữ liệu

Postgres, truy cập qua Prisma. `prisma/schema.prisma` là nguồn sự thật; tài liệu này giải thích vì sao lược đồ có hình dạng đó. Khi hai bên lệch nhau, lược đồ đúng và tài liệu này phải sửa.

Worker Python đọc lược đồ sinh sẵn, không tự khai bảng.

## 1. Bốn luật bất di bất dịch

| # | Luật | Kiểm ở đâu |
|---|---|---|
| 1 | Mọi bảng thuộc tenant có `organization_id NOT NULL`, có index. Không ngoại lệ, kể cả bảng tra cứu và workspace trải nghiệm | Bộ test cách ly trong CI |
| 2 | Đặt tên `snake_case` tiếng Anh. Thuật ngữ tiếng Việt chỉ ở nhãn giao diện. **Ngoại lệ (RS-5, 18/09):** `flower_taxonomy` và `flower_confusable_pairs` — tên cột tiếng Việt (`ma_loai`, `ten_chuan`, `so_bong_tren_dvt`, `muc_do_nham`…) đã chạy thật, đổi lại tốn một migration cho hai bảng tra cứu tĩnh không ai gọi qua tên cột từ ngoài; xem mục 16 | Review |
| 3 | Asset gốc bất biến. Dẫn xuất là bản ghi mới, nối bằng `parent_asset_id` và `version` | Review |
| 4 | Job tách ba trục `status` / `stage` / `result`. Không gộp thành một cột | Review |

**Ngoại lệ của Luật 1 — danh sách đóng, đối chiếu 18/09, cập nhật 26/09 (ĐP-3).** Mười lăm bảng không có `organization_id`, và mỗi bảng phải nêu được lý do khi review:

| Bảng | Lý do |
|---|---|
| `users` | Một người thuộc nhiều tổ chức qua `memberships` |
| `organizations` | Chính nó là tổ chức; khoá lọc là cột `id` |
| `roles` *(qua)* `role_capabilities` | Danh mục vai cấp nền tảng, không phải dữ liệu tenant |
| `job_events` | Bảng con, thuộc tổ chức qua `generation_jobs.organization_id` |
| `video_scenes` | Bảng con, thuộc tổ chức qua `video_jobs.organization_id` |
| `ai_capabilities` · `ai_models` | Sổ đăng ký nền AI cấp nền tảng; `tests/helpers/database.ts` cũng không truncate hai bảng này |
| `flower_taxonomy` · `flower_confusable_pairs` | Tri thức ngành hoa, không phải dữ liệu của một cửa hàng — xem mục 16 |
| `platform_secrets` | Bí mật cấp nền tảng đã niêm phong (token Zalo OA chung) — xem mục `chain_branches` |
| `platform_operators` · `platform_role_capabilities` · `platform_audit_logs` | Console Vận hành Nền tảng (P25, 19/09) — dữ liệu của người vận hành xuyên tổ chức, không thuộc một tổ chức nào. Từ vựng năng lực `N1`–`N8` TÁCH HẲN khỏi `roles`/`role_capabilities` của tenant (D-N6) — không dùng `capability_scope`, không thêm giá trị `PLATFORM` vào enum đó. Xem `../kien-truc/KE_HOACH_CONSOLE_VAN_HANH.md` mục 4.1 |
| `partner_marketplace_stores` | Chợ đối tác (PO 31/10/2026): hồ sơ khảo sát cửa hàng TIỀM NĂNG, chưa là tenant nên không thuộc tổ chức nào. Đọc `N1`, ghi `N17`, xoá `N18` (chỉ superadmin). `match_key` (tên chuẩn hoá) duy nhất; `profile` JSONB giữ đủ 75 cột khảo sát; `photo_keys` là nguồn registry kho (`platform/…`) |
| `partner_marketplace_share_links` | Link chia sẻ chợ đối tác (PO 01/11/2026): xem danh sách đã che không cần đăng nhập. Cấp nền tảng, không thuộc tổ chức. Tạo/huỷ `N17`. Chỉ lưu `token_hash` (SHA-256, duy nhất); `expires_at` do người tạo chọn (1–365 ngày); `revoked_at` khi huỷ; `view_count`/`last_viewed_at` |
| `market_sources` · `trend_signals` · `trend_timeseries` · `topics` · `topic_signals` · `topic_scores` · `research_runs` · `provider_health` | Dữ liệu nghiên cứu thị trường cấp nền tảng (Market Intelligence Engine, Đợt A) — thu thập xu hướng chung toàn ngành, không thuộc một tổ chức nào; chỉ có `content_opportunities` thuộc tenant |
| `field_definitions` · `field_catalogs` · `field_catalog_values` | Nền quản trị trường (ĐP-3, 26/09/2026) — sổ đăng ký trường (lõi và tự tạo) và danh mục giá trị của TOÀN hệ thống, cùng hạng với `platform_operators`/`ai_models`. `field_config_overrides` (ghi đè THEO TỪNG tổ chức) NGƯỢC LẠI có `organization_id` — thuộc tenant, không nằm trong danh sách này. Trường cửa hàng tự tạo (checklist ALG 1.9) nằm trong `field_definitions` với `owner_organization_id` = tổ chức sở hữu: chỉ tổ chức đó đọc/ghi, Console nền tảng không liệt kê, hạn mức 50 trường/thực thể tính riêng từng tổ chức. Xem mục 22b |
| `governance_decisions` | Một bảng quyết định theo tầng (ADR-012 D-T10, 06/11/2026) — nơi lưu duy nhất của ma trận quản trị, khoá/hiển thị thông báo, khoá tích hợp (T-7c đã bỏ `integration_governance`, `notification_hard_locks`, `notification_event_visibility`); phạm vi ở cột `scope` dạng D-T5 (`platform`, `industry:<key>`, `org:<id>`), không phải dữ liệu riêng của một tổ chức nên không có `organization_id`. Xem mục 45 |

| `platform_settings` | Cấu hình cấp nền tảng, một dòng mỗi khoá, chỉ Console vận hành ghi (mã `N12`) — vd ma trận điều hướng theo ngành áp cho MỌI tổ chức cùng ngành. Xem mục 31 |
Một bảng tự nhận ngoại lệ mà không nêu được lý do ở trên là lỗi chặn ở review.

*Ba câu cũ ở mục 1, mục 16 và mục 19 từng nói ba con số khác nhau ("duy nhất `users`" · "ngoại lệ duy nhất `flower_taxonomy`" · "hai bảng, gồm `platform_audit_logs`"), không câu nào đúng — bảng trên thay cả ba. Cập nhật 19/09: ba bảng Console Vận hành đã XÂY (P25a), không còn là đề xuất — dòng cũ ghi "`platform_audit_logs` chưa tồn tại... dải N1–N8 chưa xây" đã hết hiệu lực.*

## 2. Kiểu liệt kê

> **Đối chiếu 18/09 với `prisma/schema.prisma`.** Bốn enum từng lệch giá trị (`order_status`, `production_status`, `delivery_status`, `asset_kind`) đã sửa theo lược đồ; mười một enum có trong lược đồ mà thiếu ở đây đã bổ sung; hai enum chỉ tồn tại trên giấy (`consent_state`, `catalog_link_state`) đã bỏ.

```prisma
enum organization_type { EXPERIENCE  SINGLE  STORE  CHAIN }  // FLOWER_NETWORK gộp vào CHAIN — ADR-012 T-8b (mục 42)
enum workspace_kind    { EXPERIENCE  PRODUCTION }
enum membership_status { INVITED  ACTIVE  SUSPENDED }
enum capability_scope  { ORGANIZATION  BRANCH  STORE  FLOWER_NETWORK }
enum job_status        { PENDING  PROCESSING  COMPLETED  FAILED  CANCELLED }
enum approval_state    { PENDING  APPROVED  REJECTED }
enum product_status    { DRAFT  ACTIVE  PAUSED  ARCHIVED }   // PAUSED: tạm ngưng nhận đơn, ẩn khỏi link khách
enum asset_kind        { ORIGINAL  ANALYZED  ENHANCED  MASTER  RATIO  MARKETING  VIDEO  CATALOG  LANDING  SOCIAL }
enum asset_state       { PROCESSING  READY  FAILED  ARCHIVED }
enum trial_status      { ACTIVE  EXHAUSTED  EXPIRED }
enum order_status      { DRAFT  CONFIRMED  PROCESSING  DELIVERED  COMPLETED  CANCELLED }
enum production_status { WAITING  ASSIGNED  ARRANGING  QUALITY_CHECK  READY }
enum delivery_status   { PENDING  DISPATCHED  DELIVERING  DELIVERED  FAILED }

// M08 hội thoại · M09 khách hàng · M10 đơn hàng
enum chat_channel          { WEB_WIDGET  INTERNAL_DASHBOARD  STOREFRONT_CATALOG  LANDING_PAGE  FACEBOOK_MESSENGER  ZALO_OA  EMBEDDED_WIDGET  ZALO }
enum chat_sender_type      { USER  ASSISTANT  SYSTEM }
enum consent_channel       { ZALO_ZNS  SMS  PHONE_CALL  PROMOTION }
enum customer_tier         { NEW  BRONZE  SILVER  GOLD  VIP }
enum occasion_register     { FESTIVE  NEUTRAL  SOLEMN }
enum voucher_discount_type { PERCENTAGE  FIXED_AMOUNT }
enum stock_status          { IN_STOCK  PRE_ORDER_ONLY  OUT_OF_STOCK }

// M04c video · hệ thống template · Integration
enum video_format       { REEL_15S  TIKTOK_30S  STORY_15S  SLIDESHOW  PRODUCT_PAGE  AD_MOTION }
enum video_stage        { DRAFT  SCRIPT_GENERATING  SCRIPT_READY  SCRIPT_APPROVED  RENDERING  RENDER_COMPLETED  APPROVED  REJECTED  FAILED }
enum template_family    { GT  IT  CT  ST  OT }
enum integration_client { LOCALBUDD  SOCIALFLOW }
enum ai_mode           { API  SELF_HOST  DETERMINISTIC }
enum ai_privacy_level  { PUBLIC  SHOP  SENSITIVE }
enum ai_measure_state  { CHUA_DO  THU_NGHIEM  SAN_XUAT }
enum market_source_status  { ACTIVE  DEGRADED  DISABLED }
enum trend_topic_status    { EMERGING  RISING  STABLE  DECLINING  SEASONAL  BREAKOUT }
enum research_run_type     { DAILY_DEEP  INTRADAY_PULSE  WEEKLY_DEEP  MANUAL }
enum research_run_status   { PENDING  RUNNING  PARTIAL_SUCCESS  COMPLETED  FAILED }
enum provider_health_status { HEALTHY  DEGRADED  UNAVAILABLE }
```

`order_status`, `production_status` và `delivery_status` là ba enum riêng, không phải ba giá trị của một enum. Một đơn đã xác nhận, đang cắm, chưa giao là một trạng thái hợp lệ và thường gặp; gộp ba trục lại sẽ cần tích Descartes của chúng và sẽ mất một trục ngay lần đầu ai đó thêm giá trị.

`stage` và `result` **không phải enum**. Chúng là `String?` vì mỗi module có bộ giá trị riêng, và màn hình theo dõi job toàn hệ thống chỉ đọc `status`. Bộ giá trị hợp lệ của từng module ghi ở mục 6.

## 3. Nền tảng đa tenant — P1

```prisma
enum user_approval_status {
  PENDING
  APPROVED
  REJECTED
}

model users {
  id                  String               @id @default(uuid())
  email               String               @unique
  password_hash       String?
  name                String?
  avatar_url          String?
  locale              String               @default("vi")
  approval_status     user_approval_status @default(APPROVED) // 22/10/2026 — mục 31
  approval_decided_at DateTime?
  approval_decided_by String?
  created_at          DateTime             @default(now())
  updated_at          DateTime             @updatedAt

  memberships   memberships[]
  sessions      sessions[]
}

model sessions {
  id              String    @id @default(uuid())
  user_id         String
  token_hash      String    @unique
  organization_id String?          // tổ chức đang hoạt động của phiên
  created_at      DateTime  @default(now())
  expires_at      DateTime
  revoked_at      DateTime?

  user            users     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  @@index([user_id])
}

model organizations {
  id             String            @id @default(uuid())
  name           String
  slug           String            @unique
  type           organization_type @default(SINGLE)
  credit_balance Int               @default(0)
  credit_plan    String?
  settings       Json?             // bảng công tắc cấp tổ chức — xem bảng khoá dưới đây
  created_at     DateTime          @default(now())
  updated_at     DateTime          @updatedAt
}

**Khoá của `organizations.settings`.** Cột Json chứ không phải bảng riêng: đây là những công tắc ít, đọc cùng lúc với chính bản ghi tổ chức, và không cái nào cần truy vấn theo giá trị. Mọi đường ghi vào cột này dùng **hợp nhất nông** — đặt một khoá không được xoá các khoá khác.

| Khoá | Kiểu | Mặc định khi vắng | Nghĩa |
|---|---|---|---|
| `cho_phep_tu_duyet` | boolean | `true` | Bản ghi do chính người duyệt tạo có hiện trong hàng đợi duyệt của họ không |
| `bo_may_phan_tich` | string | `"openai_structured"` | Bộ máy M01 chạy cho mọi lượt phân tích của tổ chức. Giá trị lạ rơi về mặc định thay vì ném lỗi — một khoá cấu hình hỏng không được chặn cả luồng phân tích |

model workspaces {
  id              String        @id @default(uuid())
  organization_id String
  name            String
  kind            workspace_kind @default(PRODUCTION)
  trial_count     Int           @default(0)
  trial_limit     Int?
  trial_reset_at  DateTime?
  trial_status    trial_status?
  created_at      DateTime      @default(now())

  @@index([organization_id])
}

model branches {
  id              String   @id @default(uuid())
  organization_id String
  name            String
  code            String
  address         String?
  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())

  @@unique([organization_id, code])
  @@index([organization_id])
}

model roles {
  id              String   @id @default(uuid())
  organization_id String?          // null = vai hệ thống, dùng chung mọi tổ chức
  key             String           // dieu_hanh · sale · dieu_phoi · experience_user
  name            String
  is_system       Boolean  @default(false)
  created_at      DateTime @default(now())

  capabilities    role_capabilities[]
  @@unique([organization_id, key])
  @@index([organization_id])
}

model role_capabilities {
  id              String           @id @default(uuid())
  role_id         String
  capability_code String                              // A1 … K2, xem tài liệu 02
  scope           capability_scope @default(ORGANIZATION)

  role            roles            @relation(fields: [role_id], references: [id], onDelete: Cascade)
  @@unique([role_id, capability_code])
}

model capability_overrides {
  id              String   @id @default(uuid())
  organization_id String
  role_id         String
  capability_code String
  allowed         Boolean
  updated_by      String
  updated_at      DateTime @updatedAt

  @@unique([organization_id, role_id, capability_code])
  @@index([organization_id])
}

model memberships {
  id              String            @id @default(uuid())
  organization_id String
  user_id         String
  role_id         String
  branch_id       String?           // null = phạm vi toàn tổ chức
  status          membership_status @default(INVITED)
  invited_at      DateTime          @default(now())
  joined_at       DateTime?

  user            users             @relation(fields: [user_id], references: [id], onDelete: Cascade)
  @@unique([organization_id, user_id])
  @@index([organization_id])
  @@index([user_id])
}
```

**Trần cứng không nằm trong cơ sở dữ liệu.** Nó là bảng hằng trong mã, cắt sau cùng. Đặt nó vào `capability_overrides` là biến một luật không mở được thành một dòng ai sửa cũng được — mất toàn bộ ý nghĩa. 18 mã có trần cứng, xem tài liệu 02.

## 4. Hồ sơ kinh doanh và thương hiệu — P4

```prisma
model business_profiles {
  id              String   @id @default(uuid())
  organization_id String
  legal_name      String?
  display_name    String
  phone           String?
  email           String?
  address         String?
  website         String?
  social_links    Json?
  tax_code        String?
  description     String?
  operating_hours Json?
  brand_message    String?  // checklist ALG 9.3 — thông điệp thương hiệu, vào ngữ cảnh AI
  target_customers Json?    // danh sách nhóm khách mục tiêu (tối đa 10)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@unique([organization_id])
}

model brand_profiles {
  id               String   @id @default(uuid())
  organization_id  String
  primary_color    String?
  secondary_color  String?
  accent_color     String?
  background_color String?
  text_color       String?
  font_heading     String?
  font_body        String?
  logo_asset_id    String?
  tone_of_voice    String?
  hashtags         Json?     // theo nền tảng
  cta_templates    Json?
  forbidden_styles Json?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  @@unique([organization_id])
}
```

`background_color` và `text_color` có mặt vì `design_contracts` của `LocalBudd` cần đủ bốn màu để dựng landing page. Thiếu hai trường này thì M05 phải tự đoán màu nền, và mỗi trang ra một kiểu.

Thu hoạch E3 từ `SocialFlow/backend/brand_kit.py` — bảng `brand_config` ở đó gộp hồ sơ kinh doanh và hồ sơ thương hiệu làm một. Core tách đôi: hồ sơ kinh doanh là dữ liệu pháp lý và liên hệ, hồ sơ thương hiệu là dữ liệu tạo sinh. Landing page cần cả hai; sinh ảnh marketing chỉ cần cái sau.

## 5. Asset — P3

Thu hoạch E1 từ bảng `assets` thật của SocialFlow (23 cột, xác nhận trong `socialflow.db`), thêm 11 cột.

```prisma
model assets {
  id               String     @id @default(uuid())
  organization_id  String
  product_id       String?              // null ở workspace trải nghiệm
  parent_asset_id  String?              // phả hệ; asset gốc có null
  kind             asset_kind
  state            asset_state @default(PROCESSING)
  version          Int         @default(1)

  storage_key      String               // org/<organization_id>/<product_id>/<asset_id>.<ext>
  thumb_key        String?
  mime_type        String
  width            Int?
  height           Int?
  aspect_ratio     String?
  file_size        Int?

  provider         String?
  model            String?
  model_version    String?
  pipeline_version String?
  parameters       Json?
  prompt           String?

  input_sha256     String?
  output_sha256    String?
  quality_score    Float?
  identity_score   Float?
  generated_flags  Json?                // { generative_fill_used, requires_reshoot_warning }
  cost_usd         Float?

  metadata         Json?
  created_by       String
  created_at       DateTime   @default(now())

  // SDAGF P1 — vòng đời thùng rác thành cột và legal hold
  trashed_at       DateTime?
  purge_after      DateTime?            // quá hạn → cron xoá vĩnh viễn
  legal_hold_until DateTime?            // còn hạn → không xoá vĩnh viễn

  @@index([organization_id])
  @@index([purge_after])
  @@index([organization_id, product_id])
  @@index([parent_asset_id])
  @@index([output_sha256])
}
```

`video_jobs.created_by String?` (29/10/2026, migration `20261029200000_video_jobs_created_by`): người tạo video để Kho dữ liệu xếp theo chi nhánh; job trước đó null (tính là trụ sở).

### 5.0a Thùng rác Kho dữ liệu (L-4, PO 05/11/2026)

`video_jobs`, `content_generations`, `catalog_links`, `greeting_catalogs`, `landing_pages` có `trashed_at`, `purge_after` (`@db.Timestamptz(3)`, `@@index([purge_after])`, migration `20261105230000_library_trash_columns`). Quá `purge_after` cron xoá vĩnh viễn (`storage/use-cases/sweep-storage-lifecycle.ts`); xoá `greeting_catalogs` cascade `greeting_sessions`, `greeting_catalog_products`, `greeting_share_links`, `greeting_catalog_events`; `orders.source_session_id` → null.

### 5.0 Landing page đã sinh — `landing_pages` (Kho dữ liệu v2, L-1)

`POST /content-engine/landing-generate` lưu mỗi lượt sinh để tìm lại trong Kho dữ liệu (`GET /storage/library?type=landing`, `J1`). Lỗi lưu không chặn kết quả sinh.

```prisma
model landing_pages {
  id              String   @id @default(uuid())
  organization_id String
  title           String               // tiêu đề hero, thiếu thì nhãn dịp
  page_type       String?
  occasion_label  String?
  input           Json                 // yêu cầu đã gửi
  content         Json                 // GeneratedLandingPackage
  created_by      String
  created_at      DateTime @default(now())

  @@index([organization_id])
  @@index([organization_id, created_at])
}
```

### 5.0b Đánh giá khách do chủ tiệm nhập — `shop_reviews` (PO 30/10/2026)

Hiện ở mục "Khách hàng nói gì" trên trang khách `/c/[slug]` (Landing 08 / Catalog 09). Chủ tiệm chép lại nhận xét thật; không có form khách tự gửi, không lưu số điện thoại khách. Quản lý qua `/shop-reviews` (`J1`); trang công khai chỉ đọc dòng `is_visible = true` của tổ chức sở hữu link (tối đa 6). Bản ghi tổ chức khác → 404.

```prisma
model shop_reviews {
  id              String   @id @default(uuid())
  organization_id String
  author_name     String               // ≤ 60 ký tự
  occasion        String?              // ≤ 60 ký tự
  rating          Int                  // 1–5, kiểm ở domain
  comment         String               // 5–500 ký tự
  is_visible      Boolean  @default(true)
  created_by      String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@index([organization_id])
  @@index([organization_id, is_visible])
}
```

### 5.1 Hàng đợi xoá payload — `storage_outbox` (SDAGF P1)

Xoá vĩnh viễn một asset (API, thùng rác, cron dọn rác) xoá dòng `assets` và ghi hàng đợi trong **cùng một transaction**. Nơi trỏ tới tệp (registry) gồm cả hai nguồn JSON: `generation_jobs.output.audio_storage_key/voice_only_storage_key` và `order_coordinations.metadata.qc_photos/pod_photos` — danh sách SSOT `STORAGE_REFERENCE_SOURCES` (`src/modules/assets/infra/storage-registry-keys.ts`), test kiến trúc `storage-write-contract.test.ts`. Cron `/internal/chain-dispatch-sweep` xoá tệp thật khi cờ `STORAGE_DELETE_PAYLOADS=enabled`, thử lại tối đa 5 lần. Khoá còn bản ghi khác trỏ tới (Master dùng chung tệp gốc) thì đóng việc mà không xoá tệp.

```prisma
model storage_outbox {
  id              String    @id @default(uuid())
  organization_id String
  op              String               // DELETE
  storage_key     String
  asset_id        String?
  attempts        Int       @default(0)
  last_error      String?
  created_at      DateTime  @default(now())
  done_at         DateTime?

  @@unique([op, storage_key])
  @@index([organization_id])
  @@index([done_at, created_at])
}
```

Legal hold cấp tổ chức nằm ở `organizations.legal_hold_until` (chặn mọi xoá vĩnh viễn của tổ chức, kể cả `handover-clean-tenant`). Legal hold (`assets.legal_hold_until`) chỉ người vận hành nền tảng có `N14` được đặt hoặc gỡ, kèm lý do, ghi `platform_audit_logs` (SDAGF D-04).

`generated_flags` không bao giờ mặc định ngầm. Ảnh phải dùng generative fill vì chất lượng quá kém được đánh dấu ở cả metadata lẫn giao diện.

Đường dẫn lưu trữ theo **tổ chức**, không theo người dùng. Người dùng đổi vai, rời tổ chức hoặc bị xoá; quyền sở hữu dữ liệu thuộc về tổ chức. `created_by` lưu ai tải lên, nhưng không tham gia vào đường dẫn.

## 6. Job — P3

```prisma
model generation_jobs {
  id              String     @id @default(uuid())
  organization_id String
  workspace_id    String
  branch_id       String?
  user_id         String
  product_id      String?

  feature         String                // vision.analyze · media.optimize · catalog.generate …
  status          job_status @default(PENDING)
  stage           String?               // chỉ có giá trị khi status = PROCESSING
  result          String?               // phán quyết nghiệp vụ, độc lập với status

  idempotency_key String?               // YC-U7 — chống trùng 24 giờ
  request_id      String?               // E1.1 — x-request-id của request tạo job
  run_after       DateTime?             // E5.1 — hẹn thử lại lỗi tạm thời; NULL = chạy ngay
  failure_kind    String?               // E5.1 — RETRYABLE | NEEDS_ACTION

  payload         Json
  output          Json?
  error           String?
  attempts        Int        @default(0)

  created_at      DateTime   @default(now())
  started_at      DateTime?
  completed_at    DateTime?
  cancelled_at    DateTime?

  @@unique([organization_id, feature, idempotency_key])
  @@index([organization_id])
  @@index([status, created_at])         // worker quét bằng index này
  @@index([status, run_after])          // job hẹn thử lại (E5.1)
  @@index([organization_id, user_id])
}
```

`idempotency_key` không có ở bản đặc tả gốc của tài liệu này — thêm ở P3 để
thực thi `YC-U7` (đặc tả 06 mục 2: *"Mọi POST tạo job nhận Idempotency-Key.
Cùng khoá trong 24 giờ trả lại job cũ thay vì tạo job mới"*). Duy nhất theo
(`organization_id`, `feature`, `idempotency_key`) — hai tổ chức, hoặc hai
tính năng của cùng một tổ chức, dùng lại cùng chuỗi khoá không đụng nhau.

### 6.1 Nhật ký tiến trình — `job_events`

Đặc tả 05 mục 8 nói *"một bảng phụ theo `job_id` với số thứ tự tăng dần,
không giữ trong bộ nhớ"* nhưng không đặt tên hay khai cột — làm ở đây, vì
lược đồ là nguồn sự thật của cả tệp này.

```prisma
model job_events {
  id         String   @id @default(uuid())
  job_id     String
  seq        Int
  event      String              // stage · log · done
  payload    Json
  created_at DateTime @default(now())

  @@unique([job_id, seq])
  @@index([job_id, seq])
}
```

Ghi cộng dồn, không sửa/xoá dòng đã ghi. `GET /jobs/:id/events` (SSE, đặc tả
06 mục 7) đọc từ đây, nối tiếp qua `Last-Event-ID` bằng `seq` cuối client đã
thấy (`YC-J9`). `seq` tính bằng `MAX(seq)+1` trong phạm vi một `job_id` — an
toàn vì một job chỉ có đúng một worker sở hữu sau khi `claimNext` (mục 6),
không có hai người ghi đồng thời trong vận hành bình thường; đây là một giả
định, không phải khoá — ghi ở `TECHNICAL_DEBT.md`.

### Bộ giá trị của `stage` và `result` theo module

| Module | `stage` | `result` |
|---|---|---|
| M01 phân tích ảnh | `DETECTING` · `SEGMENTING` · `RECOGNIZING` · `MAPPING_TAXONOMY` | `OK` · `LOW_CONFIDENCE` |
| M04a tối ưu ảnh | `ANALYZING` · `DETECTING` · `ISOLATING` · `ENHANCING` · `BACKGROUND` · `COMPOSING` · `VERIFYING` · `GENERATING_OUTPUTS` | `SAFE` · `GOOD` · `WARNING` · `REJECTED` |
| M05 landing page | `INIT` · `GENERATING` · `FINALIZING` | `OK` |
| M06 catalog | `INIT` · `GENERATING` · `FINALIZING` | `OK` |
| M04b biến thể marketing | `ANALYZING` · `SMART_REFRAME` · `VERIFYING` · `GENERATING_OUTPUTS` | `SAFE` · `WARNING` · `REJECTED` |
| M04c video | không dùng `stage` của job — có trục riêng, enum `video_stage` chín giá trị ở mục 20 | — |

*(Hai hàng cuối bổ sung 18/09; bản trước chỉ có M01, M04a, M05, M06.)*

Cổng **Subject Integrity** của M04b đo tỷ lệ điểm ảnh lõi chủ thể còn trùng khít với Master Image: `SAFE` ≥ 0,999 · `WARNING` ≥ 0,99 · dưới nữa `REJECTED`, và `REJECTED` thì worker không ghi asset nào. Ngưỡng là luật nghiệp vụ nên phía TS tính lại phán quyết từ số đo thay vì tin `result` worker gửi kèm.

**`result = REJECTED` không phải job lỗi.** Cổng an toàn từ chối nghĩa là job chạy đúng và đi tới phán quyết: `status = COMPLETED`, `result = REJECTED`. Ánh xạ nó thành `FAILED` làm hỏng retry — chạy lại cho ra đúng phán quyết cũ, chỉ tốn GPU — và làm sai kế toán sử dụng. `FAILED` chỉ dành cho hỏng kỹ thuật: timeout, crash, lỗi nhà cung cấp.

### Cách worker lấy việc

```sql
SELECT * FROM generation_jobs
 WHERE status = 'PENDING' AND feature = $1
   AND (run_after IS NULL OR run_after <= now())   -- E5.1
 ORDER BY created_at
 FOR UPDATE SKIP LOCKED
 LIMIT 1;
```

Đánh thức bằng `LISTEN/NOTIFY` trên kênh theo `feature`. Không polling dày, không HTTP, không tiến trình con.

Worker lấy `organization_id` **chỉ từ dòng job**. Không suy từ dữ liệu ảnh, không nhận từ tham số.

## 7. Usage và credit — P3

Quyết định D2: **nền tảng giữ khoá nhà cung cấp, tính credit theo tổ chức.** Tổ chức không mang khoá riêng ở bản này.

```prisma
model usage {
  id              String   @id @default(uuid())
  organization_id String
  workspace_id    String
  user_id         String
  job_id          String?
  feature         String
  quantity        Int      @default(1)
  cost_credit     Int      @default(0)
  cost_usd        Float?              // chi phí thật phía nhà cung cấp, để đối soát
  status          String              // ENQUEUED · COMPLETED · REFUNDED
  metadata        Json?
  created_at      DateTime @default(now())

  @@index([organization_id, created_at])
  @@index([job_id])
}
```

Sổ cái credit (checklist ALG 10.6): mọi thay đổi `organizations.credit_balance` ghi một dòng `credit_transactions` trong cùng giao dịch, qua `OrganizationRepository` (`tryDeductCredit`/`tryDeductCreditFor` → `USAGE`, `refundCredit` → `REFUND`, `topUpCredit` → `TOPUP`/`GIFT`/`REFUND`, tạo tổ chức có credit khởi tạo → `GIFT`). Số dư luôn bằng tổng `amount`; migration mở sổ ghi một dòng `OPENING` cho số dư đang có. Console nạp/tặng/hoàn qua `POST /platform/organizations/:id/credits` (`N3`, bắt buộc lý do, ghi `platform_audit_logs`).

```prisma
enum credit_transaction_kind { OPENING  TOPUP  GIFT  REFUND  USAGE  EXPIRE }

model credit_transactions {
  id              String                  @id @default(uuid())
  organization_id String
  kind            credit_transaction_kind
  amount          Int                     // dương = cộng, âm = trừ
  balance_after   Int
  service         String?                 // AI · SMS · ZNS · CHAT · SUBSCRIPTION
  reason          String?
  reference       String?                 // job_id, mã hoá đơn…
  actor_id        String?
  created_at      DateTime                @default(now())

  @@index([organization_id])
  @@index([organization_id, created_at])
}
```

Hạn mức credit theo tháng (checklist ALG 10.3, 9.7, 10.5). `service = CREDIT`: tổng credit mọi dịch vụ trong tháng, Console đặt (`N3`, mặc định lấy `platform_settings.credit_pricing.defaultMonthlyLimit`); `service = AI`: trần phần AI do Điều hành cửa hàng đặt (`U2`). Dòng `period = DEFAULT` giữ mức cấu hình cho các tháng sau; dòng kỳ (YYYY-MM giờ Việt Nam) sinh khi trừ credit lần đầu trong tháng. `OrganizationRepository.tryDeductCreditFor` cộng `used` bằng một câu UPDATE có điều kiện (`used + cost <= monthly_limit`) cùng giao dịch với trừ số dư; hoàn credit trừ lại `used`. `alerted_near`/`alerted_low` bật một lần mỗi kỳ cho thông báo `USAGE_LIMIT_NEAR`/`CREDIT_LOW`.

```prisma
model usage_limits {
  id              String   @id @default(uuid())
  organization_id String
  service         String   // CREDIT · AI
  period          String   // YYYY-MM · DEFAULT
  monthly_limit   Int?     // null = không giới hạn
  used            Int      @default(0)
  alerted_near    Boolean  @default(false)
  alerted_low     Boolean  @default(false)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@unique([organization_id, service, period])
  @@index([organization_id])
}
```

Chi phí nhà cung cấp ngoài AI (checklist ALG 10.4): mỗi tin SMS/ZNS gửi khách thành công ghi một dòng theo giá vốn tham chiếu Console nhập (`credit_pricing.smsCostVnd`/`znsCostVnd`; 0 thì không ghi). Chi phí AI đọc thẳng `ai_requests.cost_usd`. Báo cáo `GET /platform/margin` cộng hai nguồn với credit đã dùng trong sổ cái.

```prisma
model provider_cost_entries {
  id              String   @id @default(uuid())
  organization_id String
  provider        String   // ESMS · ZALO_ZNS
  service         String   // SMS · ZNS
  cost_usd        Float?
  cost_vnd        Int
  reference       String?
  occurred_at     DateTime @default(now())

  @@index([organization_id])
  @@index([organization_id, occurred_at])
}
```

Gói thuê bao (checklist ALG 10.7, PO Q9). Một tổ chức một thuê bao; giá theo kỳ nhập ở Console (`N19`). Hoá đơn kỳ đầu hạn trả ngay — chưa thu thì `OVERDUE` (chỉ xem); kỳ sau sinh 7 ngày trước `current_period_end`, hạn = ngày bắt đầu kỳ sau. Ghi đã thu (SePay theo `code` trong nội dung chuyển khoản, hoặc Console) dời kỳ hiện tại; `payment_reference` duy nhất chống ghi trùng. `plan_credit_period`/`plan_credit_granted`: credit tặng theo gói của tháng (PO Q10) — đầu tháng cấp `GIFT`, phần tháng trước chưa dùng thu hồi `EXPIRE`. Gói đang thuê bao quyết định tính năng (`entitlement-service`), đứng trước `organizations.credit_plan`. Tài khoản nhận tiền của nền tảng ở `platform_settings.platform_billing_account`.

```prisma
enum subscription_cycle          { MONTHLY  YEARLY }
enum subscription_status         { ACTIVE  OVERDUE  CANCELLED }
enum subscription_invoice_status { PENDING  PAID  VOID }

model subscriptions {
  id                       String              @id @default(uuid())
  organization_id          String              @unique
  plan                     String              // EXPERIENCE · STARTER · PRO · FLOWER_NETWORK · ENTERPRISE
  cycle                    subscription_cycle
  price_vnd                Int
  included_credits_monthly Int                 @default(0)
  status                   subscription_status @default(ACTIVE)
  current_period_start     DateTime
  current_period_end       DateTime
  plan_credit_period       String?
  plan_credit_granted      Int                 @default(0)
  created_by               String?
  created_at               DateTime            @default(now())
  updated_at               DateTime            @updatedAt

  @@index([organization_id])
}

model subscription_invoices {
  id                String                      @id @default(uuid())
  organization_id   String
  subscription_id   String
  code              String                      @unique   // TB + 8 ký tự, nội dung chuyển khoản
  period_start      DateTime
  period_end        DateTime
  amount_vnd        Int
  status            subscription_invoice_status @default(PENDING)
  due_at            DateTime
  paid_at           DateTime?
  payment_reference String?                     @unique
  reminded_7d       Boolean                     @default(false)
  reminded_1d       Boolean                     @default(false)
  created_at        DateTime                    @default(now())
  updated_at        DateTime                    @updatedAt

  @@unique([subscription_id, period_start])
  @@index([organization_id])
  @@index([status, due_at])
}
```

**Một bảng usage duy nhất cho toàn hệ thống.** Mọi module ở cả ba repo ghi vào bảng này, phân biệt bằng `feature`. Không repo nào dựng bảng usage hay credit riêng — tách ra thì không tính được hạn mức trải nghiệm và không xuất được hoá đơn hợp nhất.

**Ghi tại điểm tạo job phía core, không ghi ở worker.** Trình tự trong một giao dịch:

```
kiểm hạn mức → ghi usage (status = ENQUEUED, trừ credit) → tạo generation_jobs → NOTIFY
```

Hạn mức chặn **trước** khi bản ghi job tồn tại. Module vượt hạn mức không bao giờ tới được worker.

### Job bị Identity Guard từ chối

Quyết định D3: **không tính phí khách.** Ghi `usage` với `quantity = 1`, `cost_usd` thật, `cost_credit = 0`, và một bản ghi `status = REFUNDED` hoàn lại credit đã trừ lúc enqueue.

Lý do: GPU đã tiêu thụ nên chi phí phía nền tảng là thật và phải vào sổ để đối soát; nhưng khách không dùng được kết quả nên trừ credit của họ là bán một thứ không giao.

## 8. Nhật ký kiểm toán — P3

```prisma
model audit_logs {
  id              String   @id @default(uuid())
  organization_id String
  user_id         String
  action          String              // product.approve · media.approve · role.manage …
  entity_type     String
  entity_id       String
  before          Json?
  after           Json?
  ip              String?
  user_agent      String?
  created_at      DateTime @default(now())

  @@index([organization_id, created_at])
  @@index([entity_type, entity_id])
}
```

Mọi hành động duyệt bắt buộc sinh một bản ghi. Vì Điều hành là tập cha của Sale và Điều phối nên Điều hành duyệt được việc của chính mình; nhật ký này là thứ duy nhất còn lại để truy trách nhiệm.

## 9. Sản phẩm — P5

```prisma
model products {
  id              String         @id @default(uuid())
  organization_id String
  branch_id       String?
  code            String
  name            String
  category        String?                 // enum identity.category của hợp đồng Vision
  shape           String?
  facing          String?
  container       String?
  status          product_status @default(DRAFT)
  attributes      Json?
  barcode         String?                 // trường bán hàng chuẩn (30/10/2026, công cụ 53)
  cost_price_vnd  Int?                    // giá vốn — đọc/ghi cần L5, cắt khi thiếu L5
  vat_percent     Int?                    // 0..100
  weight_grams    Int?
  tags            String[] @default([])  // tối đa 20, bỏ trùng không phân biệt hoa-thường
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt

  @@unique([organization_id, code])
  @@index([organization_id])
  @@index([organization_id, barcode])
}

model product_variants {
  id              String   @id @default(uuid())
  organization_id String
  product_id      String
  name            String
  size            String?
  multiplier      Float    @default(1)
  attributes      Json?
  sku             String?                 // duy nhất trong tổ chức khi đã khai (30/10/2026)
  barcode         String?

  @@unique([organization_id, sku])
  @@index([organization_id, product_id])
}

model product_images {
  id              String   @id @default(uuid())
  organization_id String
  product_id      String
  asset_id        String
  role            String            // MAIN · GALLERY · CATALOG · SOCIAL
  position        Int      @default(0)

  @@unique([organization_id, product_id, asset_id, role])
  @@index([organization_id, product_id])
}

model product_analyses {
  id                String         @id @default(uuid())
  organization_id   String
  product_id        String?
  asset_id          String
  job_id            String

  provider          String
  model             String
  model_version     String
  contract_name     String                    // PhanTichSanPhamHoa
  contract_version  String

  raw               Json                      // dự đoán gốc của máy, bất biến
  edited            Json?                     // bản người sửa, lưu tách biệt
  approval_state    approval_state @default(PENDING)
  approved_by       String?
  approved_at       DateTime?

  created_at        DateTime       @default(now())

  @@unique([job_id, asset_id])
  @@index([organization_id])
  @@index([organization_id, product_id])
  @@index([job_id])
}

model pricing_rules {
  id              String   @id @default(uuid())
  organization_id String
  branch_id       String?
  key             String              // san · tran · muc_thu · lam_tron …
  value           Json
  effective_from  DateTime @default(now())
  created_by      String

  @@index([organization_id, key])
}
```

```prisma
model occasions {
  id              String            @id @default(uuid())
  organization_id String
  code            String
  name            String
  sort_order      Int               @default(0)
  is_active       Boolean           @default(true)
  /** Tông giọng khi dịp này được dùng để sinh kịch bản Zalo (nợ #104). */
  register        occasion_register @default(FESTIVE)
  created_at      DateTime          @default(now())
  updated_at      DateTime          @updatedAt


  @@unique([organization_id, code])
  @@index([organization_id])
}
```

**Danh mục dịp là dữ liệu cấu hình cấp tổ chức, không phải hằng số trong mã.** Bốn module đọc nó — M01b gán `dip_su_dung` cho sản phẩm, M05 dựng trang chiến dịch, M06 lọc catalog, M09 nhắc mua — nên nó thuộc core theo luật cắt.

Sáu dòng nạp sẵn khi tạo tổ chức, mang `is_seed = true`: 20/10 · Valentine · 8/3 · Ngày của Mẹ · khai trương · hoa cưới. Tổ chức thêm dịp riêng, đổi tên, đổi thứ tự và ngừng dùng một dịp; **không xoá cứng** một dịp đã gắn vào sản phẩm hay chiến dịch — `archived_at` là đường ngừng dùng, vì xoá cứng làm mọi bản ghi trỏ vào nó mất nhãn.

`month` và `day` để trống với dịp không cố định ngày (hoa cưới, khai trương). Dịp có ngày cố định dùng cùng cặp cột với `customer_occasions` ở mục 11, và cùng lý do: phần lớn dịp lặp hằng năm nên index đánh trên cặp tháng-ngày.

**`raw` và `edited` tách rời.** Dự đoán gốc của máy không bao giờ bị ghi đè bởi bản người sửa. Đây là điều kiện để về sau có dữ liệu huấn luyện: cặp *máy đoán gì / người sửa thành gì* là thứ có giá trị nhất mà hệ thống sinh ra hằng ngày.

`edited` chỉ giữ bản mới nhất, nên lịch sử từng lượt sửa nằm ở `audit_logs` (`product.analysis_edit`), không ở đây.

**`@@unique([job_id, asset_id])` — một ảnh có đúng một kết quả trong một lượt job.** Không có ràng buộc này thì một job lô hỏng giữa chừng rồi chạy lại (`POST /jobs/:id/retry`) sẽ ghi lần hai cho những ảnh đã phân tích xong ở lần trước: hàng chờ duyệt nhân đôi, và người duyệt không biết bản nào là bản nên duyệt. Worker dựa vào chính ràng buộc này để chạy lại an toàn — nó đọc danh sách ảnh đã xong, bỏ qua chúng, và ghi kèm `ON CONFLICT DO NOTHING` làm rào cuối.

**Đầu ra AI là kết quả từng phần, không phải giao dịch cả lô.** Kết nối của worker chạy `autocommit`, nên những ảnh phân tích xong trước ảnh gây lỗi đã được ghi và không lấy lại được. Chúng là kết quả thật và được giữ nguyên; job chuyển `FAILED`, và lần chạy lại tiếp tục từ đúng chỗ dừng thay vì gọi lại nhà cung cấp cho những ảnh đã xong.

`pricing_rules` theo tổ chức, có thể theo chi nhánh — đổi so với FloraOS v1 nơi quy tắc giá là cấu hình toàn cục.

## 10. Dữ liệu bán hàng của sản phẩm — M01b

```prisma
model product_copies {
  id              String   @id @default(uuid())
  organization_id String
  analysis_id     String // bắt buộc: product_analyses đã APPROVED
  product_id      String? // null khi phân tích chưa gắn sản phẩm (sẽ tạo mới khi duyệt)

  // Dự đoán gốc của máy (bất biến) — keys: suggested_name, suggested_description,
  // suggested_tags[], suggested_occasions[], suggested_price_segment
  raw             Json
  // Bản người sửa trước khi duyệt (PATCH /product-copies/:id, H5)
  edited          Json?
  approval_state  approval_state @default(PENDING)
  approved_by     String?
  approved_at     DateTime?

  // Phiên bản hồ sơ phong cách đã dùng (learning_profiles.version), để truy xuất
  profile_version String?

  // Lý do từ chối — CỘT RIÊNG, không nhét vào `edited`. `edited` là bản sửa
  // của người theo hình dạng câu chữ bán hàng; trộn một khoá quản trị vào đó
  // làm `resolveEffective` phải phân biệt hai loại khoá trong cùng một object.
  reject_reason   String?

  // Truy vết lượt gọi mô hình đã sinh ra bản này — PRD mục 9, nhóm "Truy vết".
  // Không có bốn cột này thì không đối soát được chi phí, không so sánh được
  // hai mô hình, và không biết bản nào sinh ra bởi mô hình nào khi đổi mô hình.
  job_id          String?
  model_key       String?
  provider        String?
  cost_usd        Float?
  latency_ms      Int?

  created_at      DateTime @default(now())


  @@unique([analysis_id]) // một lượt phân tích chỉ tạo một product_copy
  @@index([organization_id])
  @@index([organization_id, product_id])
  @@index([approval_state])
}
```

Cùng khuôn `raw`/`edited` của `product_analyses`, cùng lý do: cặp *máy viết gì / người sửa thành gì* là dữ liệu huấn luyện, và lịch sử từng lượt sửa nằm ở `audit_logs`.

`analysis_id` bắt buộc trỏ tới một lượt `APPROVED`. Ràng buộc này không đặt được bằng khoá ngoại, nên nó kiểm ở use-case và có ca thử khoá — sinh câu chữ từ một kết quả chưa ai soát là đưa cái sai của máy đi thẳng ra kênh bán.

`profile_version` là chỗ duy nhất trả lời được "vì sao hai bản mô tả của cùng một sản phẩm viết khác nhau" sau khi hồ sơ phong cách đổi.

## 11. Khách hàng — M09

```prisma
model customers {
  id                String         @id @default(uuid())
  organization_id   String
  code              String         // KH-0001, KH-0002
  name              String
  phone             String
  email             String?
  address           String?
  tier              customer_tier  @default(NEW)
  notes             String?
  tags              String[]       @default([])
  preferred_flowers String[]       @default([])
  preferred_colors  String[]       @default([])

  total_spent       Decimal        @default(0) @db.Decimal(14, 2)
  order_count       Int            @default(0)
  last_order_at     DateTime?

  created_at        DateTime       @default(now())
  updated_at        DateTime       @updatedAt

  orders            orders[]
  occasions         customer_occasions[]
  consents          customer_consents[]
  vouchers          vouchers[]
  conversations     chat_conversations[]

  @@unique([organization_id, phone])
  @@unique([organization_id, code])
  @@index([organization_id, tier])
  @@index([organization_id, name])
}

model customer_occasions {
  id                   String        @id @default(uuid())
  organization_id      String
  customer_id          String
  name                 String        // Sinh nhật vợ, Kỷ niệm ngày cưới, Ngày của Mẹ...
  date                 String        // MM-DD hoặc YYYY-MM-DD
  is_recurring         Boolean       @default(true)
  reminder_days_before Int           @default(7)
  recipient_name       String?
  notes                String?
  created_at           DateTime      @default(now())


  @@index([organization_id, customer_id])
  @@index([organization_id, date])
}

model customer_consents {
  id              String          @id @default(uuid())
  organization_id String
  customer_id     String
  channel         consent_channel
  granted         Boolean         @default(true)
  granted_at      DateTime        @default(now())
  revoked_at      DateTime?
  created_at      DateTime        @default(now())


  @@unique([customer_id, channel])
  @@index([organization_id, customer_id])
}

model vouchers {
  id               String                @id @default(uuid())
  organization_id  String
  customer_id      String?               // null nếu áp dụng công khai
  code             String                // FLORA10, VIP2026
  discount_type    voucher_discount_type @default(PERCENTAGE)
  discount_value   Decimal               @db.Decimal(14, 2)
  min_order_vnd    Decimal               @default(0) @db.Decimal(14, 2)
  max_discount_vnd Decimal?              @db.Decimal(14, 2)
  expires_at       DateTime?
  is_used          Boolean               @default(false)
  used_at          DateTime?
  order_id         String?
  created_at       DateTime              @default(now())
  batch_id           String?             // đợt phát hành; null = mã lẻ cũ
  promotion_id       String?             // ưu đãi trong store_policies — tắt/khoá ưu đãi là mã ngừng nhận
  starts_at          DateTime?
  usage_limit        Int?                @default(1)   // null = không giới hạn
  per_customer_limit Int?
  used_count         Int                 @default(0)
  is_active          Boolean             @default(true)


  @@unique([organization_id, code])
  @@index([organization_id, customer_id])
  @@index([organization_id, batch_id])
}

model voucher_batches {
  id                 String                @id @default(uuid())
  organization_id    String
  name               String
  promotion_id       String?
  code_prefix        String?
  quantity           Int
  discount_type      voucher_discount_type
  discount_value     Decimal               @db.Decimal(14, 2)
  min_order_vnd      Decimal               @default(0) @db.Decimal(14, 2)
  max_discount_vnd   Decimal?              @db.Decimal(14, 2)
  starts_at          DateTime?
  expires_at         DateTime?
  usage_limit        Int?
  per_customer_limit Int?
  is_active          Boolean               @default(true)
  created_by         String
  created_at         DateTime              @default(now())

  @@index([organization_id])
}

model voucher_redemptions {
  id              String    @id @default(uuid())
  organization_id String
  voucher_id      String
  order_id        String
  customer_id     String?
  redeemed_at     DateTime  @default(now())
  released_at     DateTime?

  @@unique([voucher_id, order_id])
  @@index([organization_id])
  @@index([organization_id, order_id])
}
```

**Phát hành mã giảm giá (30/10/2026).** Một đợt (`voucher_batches`) sinh một mã chung hoặc nhiều mã riêng (`vouchers.batch_id`). Trừ lượt bằng một câu `UPDATE … WHERE used_count < usage_limit` trong giao dịch đặt đơn, ghi `voucher_redemptions`; huỷ/từ chối đơn trả lượt theo `voucher_redemptions`. `is_used` giữ nghĩa "đã hết lượt" để chỗ đọc cũ (CRM) không đổi. Mã cũ được điền `used_count = 1` nếu đã dùng.

**Bản ghi đồng ý là chèn-chỉ.** Rút lại đồng ý là một dòng mới mang `state = WITHDRAWN`, không phải một lượt `UPDATE` — câu hỏi "lúc gửi tin đó khách đã đồng ý chưa" chỉ trả lời được nếu lịch sử còn nguyên.

`customer_occasions` tách `month`/`day` khỏi `year` vì phần lớn ngày đặc biệt lặp hằng năm và index cần đánh trên cặp tháng-ngày. Đây cũng là index mà màn danh sách khách hàng và chiến dịch nhắc mua đều đọc.

**Ba ràng buộc riêng của lớp dữ liệu này**, không áp cho bảng nào khác trong lược đồ: không trường định danh nào đi qua nhà cung cấp AI; xoá theo yêu cầu của chính khách hàng cuối là một luồng riêng, không mở được bằng mã năng lực nào của tổ chức; mỗi lượt xuất danh sách ghi `audit_logs`.

## 12. Đơn hàng và vận hành — M10

```prisma
model orders {
  id                String            @id @default(uuid())
  organization_id   String
  branch_id         String?
  code              String
  customer_id       String?
  status            order_status      @default(DRAFT)
  production_status production_status @default(WAITING)
  delivery_status   delivery_status   @default(PENDING)

  total_vnd         Decimal           @db.Decimal(14, 2)
  pricing_rule_ref  Json?                       // quy tắc giá đã dùng, để đối soát
  voucher_id        String?
  card_message      String?                     // lời nhắn thiệp, tách khỏi ghi chú nội bộ
  internal_note     String?
  delivery_window   Json?                       // ngày và khung giờ đã hẹn
  delivery_address  Json?

  created_by        String
  created_at        DateTime          @default(now())
  updated_at        DateTime          @updatedAt

  // Đơn hàng đa nguồn (PO 31/10/2026 — docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md §4.1).
  // Chỉ THÊM; đơn Thẻ chào không đọc các cột này.
  source            String?           @default("MANUAL") // mã ở src/modules/orders/domain/order-source.ts
  owner_sale_id     String?                     // sale phụ trách đơn nguồn mới
  lead_id           String?                     // lead gốc (FK leads, SET NULL)
  workflow          String            @default("LEGACY") // LEGACY · STANDARD (P3)

  @@unique([organization_id, code])
  @@index([organization_id, status])
  @@index([organization_id, production_status])
  @@index([organization_id, source])
  @@index([organization_id, owner_sale_id])
  @@index([organization_id, lead_id])
}

// Đơn hàng đa nguồn P3 (PO 31/10/2026 — KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md §5). Yêu cầu duyệt theo đơn,
// chỉ đơn NGOÀI Thẻ chào. kind: DELIVER_BEFORE_PAY.
model order_approval_requests {
  id              String    @id @default(uuid())
  organization_id String
  order_id        String                      // FK orders, CASCADE
  kind            String                      // DELIVER_BEFORE_PAY
  status          String    @default("PENDING") // PENDING | APPROVED | REJECTED | AUTO_APPROVED
  basis           String?                     // POLICY | URGENT | SELF_LIMIT | ADMIN
  reason          String
  requested_by    String
  requested_at    DateTime  @default(now())
  decided_by      String?
  decided_at      DateTime?
  decision_note   String?
  collect_due_at  DateTime?                   // hạn thu tiền sau giao
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@index([organization_id])
  @@index([organization_id, status, created_at])
  @@index([organization_id, order_id])
}

model order_items {
  id              String   @id @default(uuid())
  organization_id String
  order_id        String
  product_id      String?
  variant_id      String?
  description     String?              // khi khách đặt mẫu ngoài danh mục
  quantity        Int      @default(1)
  unit_price_vnd  Decimal  @db.Decimal(14, 2)

  @@index([organization_id, order_id])
}

model order_assignments {
  id              String   @id @default(uuid())
  organization_id String
  order_id        String
  assignee_id     String                // thành viên nhận việc cắm
  assigned_by     String
  difficulty      String?               // định mức tiền công theo độ khó
  assigned_at     DateTime @default(now())
  released_at     DateTime?

  @@index([organization_id, assignee_id])
  @@index([organization_id, order_id])
}

model order_events {
  id              String   @id @default(uuid())
  organization_id String
  order_id        String
  axis            String                // order · production · delivery
  from_value      String?
  to_value        String
  actor_id        String?
  reason          String?
  created_at      DateTime @default(now())

  @@index([organization_id, order_id, created_at])
}
```

`order_events` là nguồn duy nhất đo SLA. Không cột `sla_dat` nào trên `orders`: một con số chốt sẵn sẽ đúng vào lúc ghi rồi sai mãi về sau, còn chuỗi sự kiện thì tính lại được bất cứ lúc nào và tính lại được theo định nghĩa SLA mới.

`pricing_rule_ref` giữ dấu vết quy tắc giá đã dùng. Đơn mang một giá không truy được về quy tắc nào là đơn không đối soát được, và đó là loại lệch không ai phát hiện cho tới kỳ quyết toán.

## 13. Kênh bán, số liệu và hồ sơ phong cách

```prisma
model catalog_links {
  id              String   @id @default(uuid())
  organization_id String
  slug            String   @unique
  name            String
  description     String?
  filters         Json?
  is_revoked      Boolean  @default(false)
  revoked_at      DateTime?
  revoked_by      String?
  created_by      String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt


  @@index([organization_id])
  @@index([slug])
}

// Công cụ 45 (30/10/2026) — thư viện nhận diện thương hiệu có phiên bản. Cửa hàng thành
// viên chỉ đọc mục `share_with_members` + ACTIVE của chuỗi (liên kết chuỗi ACTIVE ở organization_links).
model brand_library_items {
  id                 String   @id @default(uuid())
  organization_id    String
  title              String
  category           String // LOGO | COLOR | FONT | IMAGE | TEMPLATE | GUIDELINE | COPY
  description        String?
  share_with_members Boolean  @default(false)
  status             String   @default("ACTIVE") // ACTIVE | ARCHIVED
  current_version    Int      @default(1)
  created_by         String
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  @@index([organization_id])
  @@index([organization_id, status])
}

model brand_library_versions {
  id              String   @id @default(uuid())
  organization_id String
  item_id         String
  version         Int
  asset_id        String?
  text_value      String?
  note            String?
  created_by      String
  created_at      DateTime @default(now())

  @@unique([item_id, version])
  @@index([organization_id])
}

// Công cụ 11 (30/10/2026) — link hồ sơ cửa hàng công khai /ch/<slug>. Tối đa một
// link chưa thu hồi mỗi tổ chức (kiểm trong giao dịch Serializable ở repository).
model store_share_links {
  id              String    @id @default(uuid())
  organization_id String
  slug            String    @unique
  is_revoked      Boolean   @default(false)
  revoked_at      DateTime?
  revoked_by      String?
  view_count      Int       @default(0)
  created_by      String
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@index([organization_id])
  @@index([organization_id, is_revoked])
}

// Bước 4 — thu hút khách (30/10/2026). Lead từ trang công khai (trước đây nằm trong
// catalog_links.filters.leads — bỏ vì mất khi gửi đồng thời). Lưu thời điểm + phiên bản
// lời đồng ý liên hệ (ND 13/2023).
model leads {
  id                String    @id @default(uuid())
  organization_id   String
  customer_id       String?
  name              String
  phone             String
  message           String?
  source            String // CATALOG_LINK | SHORT_LINK | LANDING | CHAT | MANUAL
  source_ref        String?
  short_link_id     String?
  utm_source        String?
  utm_medium        String?
  utm_campaign      String?
  consent_at        DateTime
  consent_version   String
  status            String    @default("NEW") // NEW | IN_PROGRESS | WON | LOST (CONTACTED → IN_PROGRESS, 31/10/2026)
  assignee_user_id  String?
  status_changed_at DateTime?
  // Đơn hàng đa nguồn (PO 31/10/2026, §3.3–3.4)
  reason             String?   // CONTACT | QUOTE_REQUEST | ABANDONED | PAYMENT_TIMEOUT | WALK_IN | CHAT
  next_follow_up_at  DateTime?
  closed_reason      String?   // NO_NEED | UNREACHABLE | BOUGHT_ELSEWHERE | INVALID
  converted_order_id String?   // đơn đã chuyển thành (FK orders, SET NULL)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@index([organization_id])
  @@index([organization_id, status, created_at])
  @@index([organization_id, phone, created_at])
  @@index([organization_id, next_follow_up_at])
  @@index([organization_id, converted_order_id])
}

// Link/QR động `/r/<code>` — đích chỉ là đường dẫn nội bộ.
model short_links {
  id              String    @id @default(uuid())
  organization_id String
  code            String    @unique
  kind            String // QR | SALES_LINK
  name            String
  target_path     String
  placement_label String?
  utm_source      String?
  utm_medium      String?
  utm_campaign    String?
  expires_at      DateTime?
  is_active       Boolean   @default(true)
  scan_count      Int       @default(0)
  created_by      String
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@index([organization_id])
  @@index([organization_id, created_at])
}

// Lượt quét/bấm — không lưu IP thô (visitor_hash băm IP+trình duyệt+ngày+mã).
model link_events {
  id              String   @id @default(uuid())
  organization_id String
  short_link_id   String
  device          String // MOBILE | TABLET | DESKTOP | UNKNOWN
  referrer_host   String?
  visitor_hash    String?
  created_at      DateTime @default(now())

  @@index([organization_id])
  @@index([organization_id, short_link_id, created_at])
}

// ĐỔI TÊN: bảng này từng được đặc tả là `content_metrics`. Tên thật trong
// lược đồ là `content_metrics`, và hình dạng cột cũng khác. Sửa 18/09.
model content_metrics {
  id              String   @id @default(uuid())
  organization_id String
  platform        String
  content_id      String
  metric_date     DateTime @db.Date

  reach           Int?
  impressions     Int?
  engagement      Int?
  clicks          Int?
  conversions     Int?
  spend_usd       Float?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt


  @@unique([organization_id, platform, content_id, metric_date])
  @@index([organization_id])
  @@index([organization_id, metric_date])
}

// CHƯA XÂY (soát 18/09) — bảng này chưa có trong `prisma/schema.prisma`.
// M11 chưa bắt đầu; dải năng lực `S1`–`S4` chưa vào danh mục. Xem RS-7.
model learning_profiles {
  id              String   @id @default(uuid())
  organization_id String
  version         Int      @default(1)
  parameters      Json                          // tham số soạn nội dung đang hiệu lực
  evidence        Json                          // kết luận kèm số bản ghi đã dùng
  sample_size     Int      @default(0)
  is_sufficient   Boolean  @default(false)
  overridden_by   String?                       // người đè bằng S4, nếu có
  computed_at     DateTime @default(now())

  @@unique([organization_id, version])
  @@index([organization_id])
}
```

`catalog_links.slug` unique **toàn cục**, không theo tổ chức: một liên kết công khai phải giải được khi chưa biết tổ chức nào sở hữu nó.

`content_metrics` là **bộ nhớ đệm dựng lại được**, không phải nguồn sự thật. Cột `source` nói dữ liệu tới từ đâu, khoá tự nhiên bốn cột cho phép ghi lại nhiều lần mà không nhân đôi, và `is_legacy` giữ mốc dữ liệu kế thừa của thương hiệu trước khi tài khoản nền tảng được gán cho tổ chức — số liệu ấy có thật nhưng không phải của tổ chức này.

`learning_profiles` là chèn-chỉ theo `version`. Hồ sơ không giữ một con số kết luận mà giữ cả `evidence`: một hồ sơ không nói được căn cứ của mình thì không ai dám để nó đổi cách viết bài, và `is_sufficient = false` chặn nó khỏi được dùng trước ngưỡng dữ liệu tối thiểu.

## 14. Hội thoại — M08

```prisma
// ĐỔI TÊN 18/09: `conversations` → `chat_conversations`,
// `conversation_messages` → `chat_messages`. Thêm `chat_channel_integrations`.
model chat_conversations {
  id              String        @id @default(uuid())
  organization_id String
  customer_id     String?
  title           String        @default("Hội thoại tư vấn hoa")
  channel         chat_channel  @default(WEB_WIDGET)
  status          String        @default("ACTIVE") // ACTIVE, CLOSED
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

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
  metadata        Json?             // Gợi ý hoa từ Master Index, Draft Order ID

  created_at      DateTime          @default(now())


  @@index([organization_id, conversation_id, created_at])
}

model chat_channel_integrations {
  id                       String        @id @default(uuid())
  organization_id          String
  channel                  chat_channel
  is_enabled               Boolean       @default(false)
  config                   Json          @default("{}")
  subscription_expires_at  DateTime?
  created_at               DateTime      @default(now())
  updated_at               DateTime      @updatedAt


  @@unique([organization_id, channel])
  @@index([organization_id, is_enabled])
}
```

`is_automated` không bao giờ mặc định ngầm ở tầng giao diện: tin do trợ lý trả lời mang cờ trong chính bản ghi, nên mọi màn hình đọc cùng một sự thật. `price_source` là điều kiện để một câu báo giá cho khách đối soát được về quy tắc giá — trợ lý không tự tính giá.

## 15. Nền AI — sổ đăng ký, chính sách, sổ chi phí

```prisma
model ai_capabilities {
  code              String   @id                 // product_vision, content_generation …
  module            String                       // M01, M04b, M07 …
  kind              String                       // generative · measuring · deterministic
  needs_approval    Boolean  @default(true)
  privacy_floor     ai_privacy_level @default(SHOP)
  accept_threshold  Float?                       // null = chưa đo được, xem nợ kỹ thuật
  measure_channels  Json                         // các kênh chấm điểm của năng lực này
  enabled           Boolean  @default(true)
}

model ai_models {
  id                String   @id @default(uuid())
  key               String   @unique             // openai_structured, local_cv …
  display_name      String
  provider          String
  mode              ai_mode
  capabilities      Json                         // mã năng lực nó phục vụ

  license           String                       // bốn ô dưới đây bắt buộc có giá trị
  commercial_use    Boolean
  territory         String
  allowed_use       String

  cost_class        String
  latency_class     String
  quality_class     String
  measure_state     ai_measure_state @default(CHUA_DO)
  leaves_infra      Boolean                      // ảnh có rời hạ tầng không
  enabled           Boolean  @default(false)
  version           String
  registered_by     String
  created_at        DateTime @default(now())
}

model ai_policies {
  id                String   @id @default(uuid())
  organization_id   String
  capability_code   String
  allowed_models    Json                         // trần: bộ định tuyến chọn trong đây
  quality_target    String?
  cost_ceiling      Int?                         // credit mỗi lượt
  privacy_floor     ai_privacy_level
  updated_by        String
  updated_at        DateTime @updatedAt

  @@unique([organization_id, capability_code])
}

model ai_requests {
  id                String   @id @default(uuid())
  organization_id   String
  job_id            String?
  capability_code   String
  model_key         String
  attempt           Int      @default(1)         // lượt leo thác thứ mấy
  escalated_from    String?                      // mô hình của lượt trước
  fallback_from     String?                      // mô hình đã hỏng, nếu là dự phòng
  source            String                       // CORE · LOCALBUDD · SOCIALFLOW

  input_tokens      Int?
  output_tokens     Int?
  image_count       Int?
  duration_seconds  Float?
  gpu_seconds       Float?
  cost_usd          Float?                       // cùng kiểu với usage.cost_usd
  latency_ms        Int?
  quality_score     Float?
  outcome           String                       // ACCEPTED · ESCALATED · FAILED · NEEDS_REVIEW

  created_at        DateTime @default(now())

  @@index([organization_id, created_at])
  @@index([organization_id, capability_code, model_key])
  @@index([job_id])
}

model ai_evaluations {
  id                String   @id @default(uuid())
  organization_id   String
  capability_code   String
  entity_type       String                       // product_analysis · asset · post …
  entity_id         String
  scores            Json                         // một khoá cho mỗi kênh đã khai
  overall_score     Float
  threshold_used    Float?
  needs_review      Boolean  @default(false)
  reason            String?
  created_at        DateTime @default(now())

  @@index([organization_id, entity_type, entity_id])
}
```

**`ai_models` là bảng duy nhất trong lược đồ có bốn cột không cho phép giá trị rỗng vì lý do pháp lý, không vì lý do kỹ thuật**: `license`, `commercial_use`, `territory`, `allowed_use`. Một mô hình thiếu một trong bốn ô không bật được (`enabled`), và `registry` phía worker từ chối nó ngay cả khi ai đó bật bằng tay trong cơ sở dữ liệu.

`ai_policies` giữ **trần**, không giữ lựa chọn: `allowed_models` là phạm vi mà bộ định tuyến được chọn trong đó. Năng lực phân tích ảnh có thêm một đường ghi cũ hơn (`organizations.settings.bo_may_phan_tich`, gác bằng `H4`) và hai đường này ghi cùng một chỗ — `ai_policies` là bản chuẩn, còn khoá cũ đọc ra từ đó, chứ không phải hai nguồn sự thật song song.

`ai_requests` là bảng **chỉ ghi thêm**, và nó không giữ prompt lẫn đầu ra. Một lượt nghiệp vụ sinh nhiều hàng khi thác nghiệm leo hoặc dự phòng chạy; `attempt` cùng `escalated_from` là chỗ đọc ra điều đó. Bảng này không thay `usage`: hạn mức vẫn kiểm tại điểm tạo job, và một lượt nghiệp vụ vẫn trừ đúng số credit đã công bố dù bên dưới gọi mô hình ba lần.

## 16. Tri thức ngành hoa

```prisma
// ⚠ Tên cột bằng TIẾNG VIỆT — phá Luật 2 ở mục 1. Xem RS-5.
model flower_taxonomy {
  ma_loai      String  @id // LH001…
  nhom         String  // Hoa · Lá · Phụ kiện
  cong_nang    String? // Hoa chính · Hoa phụ · Hoa lấp đầy…
  ten_chuan    String
  ten_khac     Json    // string[] — tên gọi khác, dùng để so tên máy trả về
  nhom_hoa     String?
  dvt_chuan    String?
  so_bong_tren_dvt Int?
  duong_kinh_bong_cm Float?
  dien_tich_phu_cm2  Float?
  ty_le_nhuy_tren_bong Float?
  mau_nhuy     String?
  kieu_moc     String?
  dai_mau_tu_nhien Json?  // string[]
  dac_diem_phan_biet String?
  mua_vu       String?
  trang_thai   String  @default("Đang dùng")

  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt


  @@index([ten_chuan])
  @@index([nhom])
}

model flower_confusable_pairs {
  ma_cap          String @id // CN001…
  ma_loai_a       String
  ma_loai_b       String
  dau_hieu_tach_a String
  dau_hieu_tach_b String
  muc_do_nham     String // Cao · Trung bình · Thấp


  @@index([ma_loai_a])
  @@index([ma_loai_b])
  @@index([muc_do_nham])
}

// CHƯA XÂY (soát 18/09) — chưa có trong `prisma/schema.prisma`; pgvector chưa bật.
model knowledge_chunks {
  id                String   @id @default(uuid())
  organization_id   String
  source_kind       String                       // product · policy · delivery · pricing
  source_id         String                       //   · faq · brand · campaign · past_post
  content           String
  embedding         Unsupported("vector(1536)")?
  updated_at        DateTime @updatedAt

  @@index([organization_id, source_kind])
  @@index([organization_id, source_id])
}
```

`flower_taxonomy` và `flower_confusable_pairs` **không có `organization_id`** — hai trong chín ngoại lệ liệt ở mục 1, và lý do là: danh mục loài là tri thức ngành, không phải dữ liệu của một cửa hàng.

**Hai bảng này đặt tên cột bằng tiếng Việt** (`ma_loai`, `ten_chuan`, `so_bong_tren_dvt`, `muc_do_nham`…) — đã chạy thật trên dữ liệu thật. Bản đặc tả trước mô tả một bảng hoàn toàn khác bằng tiếng Anh (`canonical_id`/`name_vi`/`aliases`/`embedding`) — bảng đó chưa bao giờ tồn tại, đó là phần đã sửa. Phần đặt tên cột: **RS-5 (18/09, quyết định của anh Tony) chọn ghi ngoại lệ vào Luật 2** — xem mục 1 — thay vì đổi tên cột, vì hai bảng này là tra cứu tĩnh cấp nền tảng, không ai gọi qua tên cột từ bên ngoài lược đồ.

Cột `embedding Unsupported("vector(1536)")` và bảng `knowledge_chunks` ở dưới **chưa có trong lược đồ**. Mọi thứ một tổ chức tự khai — tên gọi riêng, mã nội bộ, giá theo loài — nằm ở `products.attributes` và ở `pricing_rules`, vốn đều mang `organization_id`. Bảng này chỉ đọc từ phía ứng dụng; ghi vào nó là việc cấp nền tảng.

`knowledge_chunks` thì **có** `organization_id`, và bộ test cách ly phủ nó như mọi bảng khác: chính sách giao hàng của một cửa hàng không được đi vào câu trả lời của cửa hàng khác.

`pgvector` là extension trên chính Postgres đang dùng. Không thêm một cơ sở dữ liệu vector riêng — một Postgres là quyết định nền ở tài liệu 01 mục 1, và khối lượng tri thức của một cửa hàng hoa không đòi hơn thế.

## 17. Đặc trưng nội dung cho vòng học

```prisma
// CHƯA XÂY (soát 18/09) — chưa có trong `prisma/schema.prisma`. M11 chưa bắt đầu.
model content_features {
  id                String   @id @default(uuid())
  organization_id   String
  post_ref          String                       // bản ghi nội dung ở engine ngoài
  product_id        String?
  campaign_ref      String?
  platform          String

  hook              String?
  angle             String?
  tone              String?
  length            Int?
  cta               String?
  visual_style      String?                      // nền, tỉ lệ, bố cục, cỡ sản phẩm
  posting_hour      Int?

  reach             Int      @default(0)
  engagement        Int      @default(0)
  clicks            Int      @default(0)
  inbox             Int      @default(0)
  orders            Int      @default(0)
  revenue_vnd       Decimal? @db.Decimal(14, 2)

  updated_at        DateTime @updatedAt

  @@unique([organization_id, post_ref])
  @@index([organization_id, platform, posting_hour])
}
```

Đây là bảng mà vòng học đọc, và nó là lý do vòng học nói được câu "ảnh nền sáng bán tốt hơn cho hoa tone đỏ" thay vì chỉ "bài này hiệu quả hơn bài kia". Không có các cột đặc trưng thì số liệu hiệu quả chỉ xếp hạng được bài, không giải thích được vì sao.

Học phải học cả phần hình, không chỉ phần chữ: `visual_style` là cột giữ điều đó, và nó nối ngược về `assets` của biến thể đã dùng.

## 18. Bảng chưa thuộc phạm vi bản này

`content_queue` · `posts` · `campaigns` · `social_accounts` · `post_metrics` thuộc `SocialFlow`. *(`video_jobs` từng nằm trong danh sách này; M04c đã chuyển về core ở P17, nên core **có** khai `video_jobs` và `video_scenes` — xem mục 20. Sửa 18/09.)* `pages` · `page_versions` · `layouts` · `design_directions` · `design_contracts` thuộc `LocalBudd`. Core không khai chúng.

Số liệu gốc của từng nền tảng ở lại `SocialFlow`; core chỉ giữ `content_metrics` ở mục 13 làm bộ nhớ đệm dựng lại được, và nó mang cột nguồn để không ai đọc nó như số liệu gốc.

Đối lại, `LocalBudd` bỏ `products`, `product_assets`, `media_assets`, `generation_jobs`, `projects` khỏi lược đồ của nó và đọc core qua API. Trạng thái thật của việc này ghi ở đặc tả 08 mục 2 — ba bảng còn chặn vì Integration API chưa có đường ghi, và ba đường ghi ở đặc tả 06 mục 11 là chỗ mở khoá nó.

## 20. Bảng có trong lược đồ mà bản đặc tả trước bỏ sót

> **Bổ sung 18/09.** Sáu bảng dưới đây đã chạy trong `prisma/schema.prisma` nhưng chưa từng có mục nào ở tài liệu này.

### M04c video — P17

```prisma
model video_jobs {
  id                 String          @id @default(uuid())
  organization_id    String
  product_id         String?
  title              String
  format             video_format
  stage              video_stage     @default(DRAFT)

  // Cổng duyệt 1: Kịch bản (Script / Storyboard)
  script_approval    approval_state  @default(PENDING)
  script_approved_at DateTime?
  script_approved_by String?

  // Cổng duyệt 2: Video kết quả (Final Render)
  video_approval     approval_state  @default(PENDING)
  video_approved_at  DateTime?
  video_approved_by  String?

  // Cấu hình video
  duration_seconds   Int             @default(15)
  aspect_ratio       String          @default("9:16")
  music_track        String?
  voice_code         String?
  has_subtitle       Boolean         @default(true)
  caption_style      String          @default("MODERN_BADGE")
  has_watermark      Boolean         @default(false)

  // Tài sản đầu ra & Hạch toán
  final_video_url    String?
  final_asset_id     String?
  cost_credits       Int             @default(0)
  error_message      String?

  created_at         DateTime        @default(now())
  updated_at         DateTime        @updatedAt

  scenes             video_scenes[]

  @@index([organization_id])
  @@index([organization_id, product_id])
  @@index([stage])
  @@index([script_approval])
  @@index([video_approval])
}

model video_scenes {
  id                String       @id @default(uuid())
  video_job_id      String
  scene_index       Int
  duration_seconds  Float        @default(3.0)
  image_asset_id    String?
  text_overlay      String?
  voice_script      String?
  transition_effect String?      @default("fade")
  motion_effect     String?      // Ken Burns theo cảnh — thêm 23/09/2026
  created_at        DateTime     @default(now())


  @@index([video_job_id])
  @@unique([video_job_id, scene_index])
}
```

Hai cổng duyệt của `video_jobs` tách đúng ở tầng dữ liệu (`script_approval` và `video_approval` là hai cột riêng), và hai endpoint duyệt gác bằng hai mã riêng `P3` (kịch bản) và `P4` (video thành phẩm, trần cứng) ở use-case — soát lại 23/09/2026, thay ghi chú "cùng mã `I2`" cũ. `video_scenes` là bảng con, thuộc tổ chức qua `video_jobs`.

### Tồn kho, template, token tích hợp

```prisma
model product_inventory {
  id                 String      @id @default(uuid())
  organization_id    String
  product_id         String
  branch_id          String
  status             stock_status @default(IN_STOCK)
  quantity_available Int?
  updated_at         DateTime    @updatedAt


  @@unique([organization_id, product_id, branch_id])
  @@index([organization_id, branch_id])
}

model template_overrides {
  id              String          @id @default(uuid())
  organization_id String
  template_family template_family
  template_key    String
  field_key       String
  value           String
  updated_by      String
  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt


  @@unique([organization_id, template_key, field_key])
  @@index([organization_id])
}

model integration_tokens {
  id              String             @id @default(uuid())
  organization_id String
  client          integration_client
  token_hash      String             @unique
  created_by      String
  created_at      DateTime           @default(now())
  expires_at      DateTime
  revoked_at      DateTime?
  rotated_from_id String?


  @@index([organization_id])
  @@index([organization_id, client])
}
```

`integration_tokens` giữ `token_hash @unique`, không giữ token thô — token chỉ hiện một lần lúc cấp. `rotated_from_id` nối một token với token nó thay thế, để thu hồi được cả chuỗi.

### Khoá idempotent dùng chung — `idempotency_keys` (E5.3, 30/10/2026)

```prisma
model idempotency_keys {
  id              String   @id @default(uuid())
  organization_id String
  scope           String   // "webhook.facebook" · "webhook.zalo" · "payment.<provider>"
  key             String   // mã sự kiện của nguồn gửi
  created_at      DateTime @default(now())

  @@unique([organization_id, scope, key])
  @@index([organization_id])
  @@index([created_at])
}
```

Sự kiện đến chỉ xử lý một lần: `claimIdempotencyKey` (`src/core/idempotency/infra/idempotency-repository.ts`) chèn `ON CONFLICT DO NOTHING`, có dòng trả về = lần đầu. `organization_id` do máy chủ xác định (tra kênh theo page/OA id), không lấy từ thân sự kiện. Dùng ở webhook Facebook (`message.mid`) và Zalo (`message.msg_id`); luồng tiền (E6) phải ghi khoá trong cùng giao dịch. Cron `/internal/chain-dispatch-sweep` xoá khoá quá 30 ngày.

### Chợ đối tác — `partner_marketplace_stores` (PO 31/10/2026)

```prisma
model partner_marketplace_stores {
  id               String   @id @default(uuid())
  match_key        String   @unique // tên cửa hàng chuẩn hoá — khoá khớp khi đồng bộ lại
  shop_name        String
  tier             String
  address          String   @default("")
  profile          Json     // đủ 75 cột khảo sát (PartnerStoreMarketplaceEntity trừ id)
  photo_keys       String[] @default([]) // khoá kho platform/partner-stores/<id>/…
  photo_source_ids String[] @default([]) // Drive id đã xử lý — đổi danh sách thì tải lại
  search_text      String   @default("")
  source           String   // SHEET · EXCEL · SEED
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  @@index([tier])
}
```

### Link chia sẻ chợ đối tác — `partner_marketplace_share_links` (PO 01/11/2026)

```prisma
model partner_marketplace_share_links {
  id             String    @id @default(uuid())
  token_hash     String    @unique
  label          String
  expires_at     DateTime
  revoked_at     DateTime?
  created_by     String
  view_count     Int       @default(0)
  last_viewed_at DateTime?
  created_at     DateTime  @default(now())

  @@index([created_at])
}
```

Bảng cấp nền tảng: cửa hàng khảo sát chưa là tenant nên không có `organization_id`. Chỉ console vận hành chạm tới — đọc `N1`, đồng bộ/nhập/ảnh `N16`, mọi lần ghi vào `platform_audit_logs`. `photo_keys` là một nguồn registry kho (`STORAGE_REFERENCE_SOURCES`); tiền tố `platform/` nằm trong `MANAGED_PREFIXES` để đối soát. Nạp lần đầu từ JSON: `scripts/nap-cho-doi-tac.ts`.

## 19. Kiểm chứng

Mỗi bảng có `organization_id` phải có một trường hợp trong bộ test cách ly: dựng hai tổ chức, đọc bản ghi của tổ chức A bằng ngữ cảnh phiên của tổ chức B, kết quả phải là không tìm thấy — không phải lỗi quyền, vì lỗi quyền đã tiết lộ rằng bản ghi tồn tại.

Chạy bằng `npm run test:tenant`. Bắt buộc xanh trước mọi merge.

Danh sách ngoại lệ của Luật 1 nằm ở **mục 1** — mười hai bảng, mỗi bảng một lý do. Bảng thứ mười ba tự nhận ngoại lệ là lỗi chặn ở review.

**Đối chiếu 18/09 — luật này đang bị phá.** 39 bảng có `organization_id`; **16 bảng chưa xuất hiện trong bất kỳ ca thử nào** của `tests/tenant/`: `catalog_links` · `chat_channel_integrations` · `chat_conversations` · `chat_messages` · `content_metrics` · `customer_consents` · `customer_occasions` · `order_assignments` · `order_events` · `order_items` · `pricing_rules` · `product_images` · `product_inventory` · `product_variants` · `template_overrides` · `vouchers`.

Nặng hơn: **6 bảng không nằm trong `TENANT_TABLES`** của `tests/helpers/database.ts` nên không bị `TRUNCATE` giữa các ca — `catalog_links` · `content_metrics` · `occasions` · `product_copies` · `product_inventory` · `template_overrides`. Với sáu bảng này, một ca xanh không chứng minh được điều nó khẳng định, đúng như chú thích trong chính tệp đó cảnh báo. Xem **RS-2**.
## 21. Console Vận hành Nền tảng — P25a

Ba bảng ngoại lệ của Luật 1 (mục 1) — không có `organization_id`, vì dữ liệu của người vận hành nền tảng không thuộc một tổ chức. Từ vựng năng lực `N1`–`N8` (đặc tả 02) TÁCH HẲN khỏi `capability_scope`/`role_capabilities` của tenant (D-N6, chốt 19/09) — không bảng nào dưới đây có cột tham chiếu `capability_scope`.

```prisma
model platform_operators {
  id         String    @id @default(uuid())
  user_id    String    @unique
  granted_by String?
  created_at DateTime  @default(now())
  revoked_at DateTime?

  capabilities platform_role_capabilities[]

  @@index([user_id])
}

model platform_role_capabilities {
  id              String @id @default(uuid())
  operator_id     String
  capability_code String // N1 … N8

  @@unique([operator_id, capability_code])
}

model platform_audit_logs {
  id          String   @id @default(uuid())
  user_id     String
  action      String // platform.health.read · platform.operator.grant …
  entity_type String
  entity_id   String
  before      Json?
  after       Json?
  ip          String?
  user_agent  String?
  created_at  DateTime @default(now())

  @@index([created_at])
  @@index([entity_type, entity_id])
}
```

`platform_operators.user_id` là `@unique` — một người chỉ một dòng vận hành; gán thêm năng lực đi qua `platform_role_capabilities`, không tạo dòng `platform_operators` mới. `platform_audit_logs` tách khỏi `audit_logs` (mục 8) vì `audit_logs.organization_id` là `NOT NULL` (D-N3) — hành động không thuộc tổ chức nào không ghi được vào đó. Gán/thu quyền vận hành hiện chạy tay qua `scripts/gan-van-hanh-nen-tang.ts`, không có route. Xem `../kien-truc/KE_HOACH_CONSOLE_VAN_HANH.md` mục 4.1 và đặc tả 06 mục 21.

## 22. Phân hệ Nghiên cứu Thị trường & Xu hướng (Market Intelligence Engine, Đợt A mở rộng)

Tám bảng nghiên cứu dữ liệu thị trường là **GLOBAL** (ngoại lệ Luật 1 nêu ở mục 1), hai bảng thuộc **TENANT** (`organization_id` bắt buộc): `content_opportunities` (cơ hội nội dung cá nhân hóa) và `product_analysis_runs` (lịch sử phân tích Product Intelligence — nợ #113, đã trả 21/09/2026).

```prisma
model market_sources {
  id              String               @id @default(uuid())
  provider        String
  platform        String
  source_type     String
  status          market_source_status @default(ACTIVE)
  last_success_at DateTime?
  last_error_at   DateTime?
  created_at      DateTime             @default(now())
  updated_at      DateTime             @updatedAt

  trend_signals trend_signals[]
  topic_signals topic_signals[]

  @@unique([provider, platform])
}

model trend_signals {
  id           String   @id @default(uuid())
  source_id    String
  platform     String
  country_code String   @default("VN")
  region_code  String?
  city         String?
  industry     String   @default("florist")
  topic_raw    String
  metric_name  String
  metric_value Float
  growth_rate  Float?
  confidence   Float    @default(1.0)
  captured_at  DateTime @default(now())
  created_at   DateTime @default(now())

  source market_sources @relation(fields: [source_id], references: [id], onDelete: Cascade)

  @@unique([source_id, platform, country_code, topic_raw, captured_at])
  @@index([source_id])
  @@index([platform, country_code])
  @@index([captured_at])
  @@index([industry])
}

model trend_timeseries {
  id           String   @id @default(uuid())
  topic_id     String
  platform     String
  geo_scope    String   @default("VN")
  date         DateTime
  value        Float
  growth_rate  Float?
  velocity     Float?
  acceleration Float?
  confidence   Float    @default(1.0)

  topic topics @relation(fields: [topic_id], references: [id], onDelete: Cascade)

  @@unique([topic_id, platform, geo_scope, date])
  @@index([topic_id])
  @@index([date])
}

model topics {
  id             String             @id @default(uuid())
  canonical_name String
  description    String?
  language       String             @default("vi")
  industry       String             @default("florist")
  status         trend_topic_status @default(EMERGING)
  first_seen_at  DateTime           @default(now())
  last_seen_at   DateTime           @default(now())

  timeseries            trend_timeseries[]
  signals               topic_signals[]
  scores                topic_scores[]
  content_opportunities content_opportunities[]

  @@unique([canonical_name, industry])
  @@index([status])
  @@index([industry])
  @@index([last_seen_at])
}

model topic_signals {
  id                 String   @id @default(uuid())
  topic_id           String
  source_id          String
  external_reference String?
  signal_type        String
  signal_value       Float
  captured_at        DateTime @default(now())

  topic  topics         @relation(fields: [topic_id], references: [id], onDelete: Cascade)
  source market_sources @relation(fields: [source_id], references: [id], onDelete: Cascade)

  @@index([topic_id])
  @@index([source_id])
}

model topic_scores {
  id                        String   @id @default(uuid())
  topic_id                  String
  geo_scope                 String   @default("VN")
  industry                  String   @default("florist")
  period                    String   @default("7d")
  trend_score               Float
  viral_score               Float
  commercial_score          Float
  content_opportunity_score Float
  confidence                Float    @default(1.0)
  calculated_at             DateTime @default(now())
  model_version             String   @default("v1_florist")

  topic topics @relation(fields: [topic_id], references: [id], onDelete: Cascade)

  @@index([topic_id])
  @@index([period])
  @@index([content_opportunity_score])
}

model content_opportunities {
  id                        String   @id @default(uuid())
  organization_id           String
  topic_id                  String
  audience                  String?
  opportunity_summary       String
  content_angles            Json
  recommended_formats       Json
  recommended_hooks         Json
  trend_score               Float
  viral_score               Float
  commercial_score          Float
  content_opportunity_score Float
  confidence                Float    @default(1.0)
  expires_at                DateTime?
  created_at                DateTime @default(now())
  updated_at                DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  topic        topics        @relation(fields: [topic_id], references: [id], onDelete: Cascade)

  @@index([organization_id, content_opportunity_score])
  @@index([organization_id])
  @@index([topic_id])
}

model product_analysis_runs {
  id                  String   @id @default(uuid())
  organization_id     String
  asset_id            String?
  product_name        String
  image_url           String
  trend_fit_score     Float
  audience_fit_score  Float
  content_fit_score   Float
  overall_fit         String
  report              Json
  created_at          DateTime @default(now())

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([organization_id, created_at])
}

model research_runs {
  id                    String              @id @default(uuid())
  run_type              research_run_type   @default(DAILY_DEEP)
  status                research_run_status @default(PENDING)
  started_at            DateTime?
  completed_at          DateTime?
  sources_attempted     Int                 @default(0)
  sources_succeeded     Int                 @default(0)
  sources_failed        Int                 @default(0)
  records_collected     Int                 @default(0)
  topics_created        Int                 @default(0)
  opportunities_created Int                 @default(0)
  error_summary         String?
  created_at            DateTime            @default(now())

  @@index([status, created_at])
}

model provider_health {
  id              String                 @id @default(uuid())
  provider        String                 @unique
  status          provider_health_status @default(HEALTHY)
  latency_ms      Int?
  error_rate      Float?
  quota_status    String?
  last_checked_at DateTime               @default(now())

  @@index([status])
}
```

## 23. Gói chiến dịch Creative Studio — Khu vực F (Chặng 07–14)

> **Thêm 23/09/2026.** Trước ngày này Chặng 07–09 chỉ là state phía trình duyệt (QA gõ cứng "PASSED", duyệt không ghi gì). Bảng **TENANT** — `organization_id` bắt buộc, có trong `TRUNCATE` của bộ test cách ly (`tests/helpers/database.ts`) và ca thử `tests/tenant/campaign-packages.test.ts`. Migration: `prisma/migrations/20260923160000_campaign_packages`.

Gói chỉ giữ **định danh** tới tài sản thật — `variant_asset_ids` (asset `MARKETING` con của đúng `master_asset_id`), `video_job_ids` (mỗi khung một video — migration `20260924180000_campaign_packages_video_job_ids` điền từ `video_job_id`, cột này giữ làm video chính), `audio_job_id` (`generation_jobs` feature `audio.generate`) — cộng nội dung bài đăng người dùng soạn. Use-case kiểm từng định danh thuộc đúng tổ chức và đúng Master trước khi ghi. Trạng thái: `DRAFT → QA_PASSED | QA_NEEDS_REVIEW | QA_REJECTED → APPROVED`; sửa gói chưa duyệt đưa về `DRAFT` và xoá `qa_report`. Duyệt ghi `audit_logs` (`campaign_package.approve`) trong cùng giao dịch.

```prisma
model campaign_packages {
  id                 String    @id @default(uuid())
  organization_id    String
  product_id         String?
  master_asset_id    String
  name               String
  mode               String
  topic              Json?
  content            Json?
  variant_asset_ids  String[]  @default([])
  video_job_id       String?   // video chính = video_job_ids[0]
  video_job_ids      String[]  @default([])  // 24/09/2026: mỗi khung trong phạm vi một video
  audio_job_id       String?
  status             String    @default("DRAFT")
  qa_report          Json?
  qa_checked_at      DateTime?
  approved_by        String?
  approved_at        DateTime?
  launch_plan        Json?
  created_by         String
  created_at         DateTime  @default(now())
  updated_at         DateTime  @updatedAt

  @@index([organization_id, created_at])
  @@index([organization_id, master_asset_id])
  @@index([organization_id, status])
}
```

Chặng 11–13 **không** có bảng riêng: đọc `orders`/`order_items` (theo `product_id` của gói, kể từ `approved_at`), `chat_conversations`, và `content_metrics` (theo `launch_plan.postRefs`). Chưa quy được một đơn về một bài đăng cụ thể — giao diện nói rõ giới hạn này.

## 24. Bài Khu vực B tự lưu — `content_drafts`

> **Thêm 24/09/2026.** Trước ngày này bài viết Khu vực B chỉ vào gói chiến dịch khi người dùng bấm "Lưu bài vào gói"; chuyển tab là mất. Bảng **TENANT** — `organization_id` bắt buộc, có trong `TRUNCATE` của bộ test cách ly và ca thử `tests/tenant/content-drafts.test.ts`. Migration: `prisma/migrations/20260924090000_content_drafts`.

Khoá `(organization_id, asset_id, topic_id, mode)` — cùng khoá với kịch bản bối cảnh (`creative.scene_plan`). Khu vực B tự lưu 1,2 giây sau lần sửa cuối (`PUT`), Chặng 07 đưa sẵn `posts` vào gói khi tạo và đề xuất "Dùng bài của Khu vực B" khi bài tự lưu khác bài trong gói. Use-case kiểm `asset_id` thuộc đúng tổ chức của phiên.

```prisma
model content_drafts {
  id              String   @id @default(uuid())
  organization_id String
  asset_id        String
  topic_id        String
  mode            String
  topic_title     String?
  posts           Json
  created_by      String
  updated_by      String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@unique([organization_id, asset_id, topic_id, mode])
  @@index([organization_id, updated_at])
}
```

## 24b. `video_jobs` — cột Đợt 4 (24/09/2026)

Migration `20260924150000_video_jobs_plan_audio` thêm 4 cột null được: `scene_plan_id` (kịch bản sản xuất tổng), `scene_plan_revision`, `audio_job_id` (job `audio.generate` Khu vực C), `audio_storage_key`. Có `audio_storage_key` (và khoá thuộc `org/<organization_id>/`) thì `video.render` dùng nguyên bản phối C, không đọc lại TTS, không phủ thêm nhạc.

## 25. Thư viện âm thanh Khu vực C — `voice_clones`, `music_tracks`

> **Thêm 24/09/2026** (rà soát Khu vực C, quyết định PO: Voice Clone xây thật với ElevenLabs; nhạc nền = thư viện có giấy phép + tiệm tự tải). Hai bảng **TENANT** — `organization_id` bắt buộc, có trong `TRUNCATE` của bộ test cách ly và ca thử `tests/tenant/audio-library.test.ts`. Migration: `prisma/migrations/20260924120000_audio_voice_clones_music_tracks`.

`voice_clones`: giọng nhân bản của chủ tiệm. Mẫu giọng lưu ở kho `org/<org>/audio/voice-samples/<id>.<ext>`; `consent_text` lưu NGUYÊN VĂN câu cam kết người dùng đã tick (`VOICE_CLONE_CONSENT_TEXT`), kèm `consented_by`/`consented_at`. Worker `audio.voice_clone` ghi `status` (`PENDING → READY | FAILED`), `provider_voice_id`, `error` bằng SQL lọc theo `organization_id` của dòng job. Xoá = gỡ trên ElevenLabs + `status = DELETED`, `deleted_at`.

```prisma
model voice_clones {
  id                 String    @id @default(uuid())
  organization_id    String
  name               String
  provider           String    @default("elevenlabs")
  provider_voice_id  String?
  status             String    @default("PENDING")   // PENDING | READY | FAILED | DELETED
  sample_storage_key String
  sample_mime_type   String
  sample_bytes       Int
  consent_text       String
  consented_by       String
  consented_at       DateTime
  job_id             String?
  error              String?
  created_at         DateTime  @default(now())
  updated_at         DateTime  @updatedAt
  deleted_at         DateTime?

  @@index([organization_id, status])
}
```

`music_tracks`: nhạc nền tiệm tự tải. Bắt buộc `license_type` + `license_source` và cam kết (`attested_by`/`attested_at`). Thư viện HỆ THỐNG không nằm ở bảng này mà ở `src/modules/audio-studio/domain/music-catalog.ts` (trường `licenseSource`, `licenseVerified`). Job `audio.generate` nhận bài tiệm qua `payload.musicStorageKey` (use-case kiểm thuộc tổ chức; worker kiểm lại tiền tố `org/<organization_id>/`).

```prisma
model music_tracks {
  id               String    @id @default(uuid())
  organization_id  String
  title            String
  mood             String      // romantic | upbeat | chill | warm | luxury
  storage_key      String
  mime_type        String
  file_bytes       Int
  duration_seconds Float?
  license_type     String      // owned | royalty_free | licensed | creative_commons
  license_source   String
  license_note     String?
  attested_by      String
  attested_at      DateTime
  created_at       DateTime  @default(now())
  deleted_at       DateTime?

  @@index([organization_id, mood])
}
```

## 26. Điều phối đơn hàng — Chức năng 12 (Control Tower)

Bốn bảng, đều có `organization_id`, tạo bằng migration `20260925200000_coordinator_control_tower`. `order_coordinations` là hồ sơ điều phối 1–1 với `orders` (`order_id @unique`); ba trục `status`/`production_status`/`delivery_status` vẫn nằm trên `orders` và đổi theo `stage` qua `domain/state-mapper.ts` + `domain/stage-transitions.ts` — mỗi trục đổi giá trị ghi một dòng `order_events` (nguồn đo SLA của M10). Ảnh (mẫu, thành phẩm, POD) lưu bằng id `assets` cùng tổ chức, đổi sang URL ký lúc đọc; không lưu URL ký, không lưu base64. `ai_score` chỉ ghi khi có lượt Vision thật (nợ #140). Mức rủi ro trả qua API được TÍNH LẠI lúc đọc (`evaluateRisk`), cột `risk_level` chỉ là giá trị lúc tạo.

```prisma
enum coordinator_stage {
  INTAKE
  VALIDATING
  PLANNING
  ASSIGNING
  IN_PRODUCTION
  QUALITY_CHECK
  DISPATCHING
  DELIVERED
  COMPLETED
  EXCEPTION
  CANCELLED
}

enum coordination_risk_level {
  NORMAL
  ATTENTION
  AT_RISK
  CRITICAL
}

enum qc_record_status {
  PENDING
  PASSED
  REJECTED
  REWORK_REQUESTED
}

/// Mạng lưới đối tác xưởng ngoài / thợ cắm hoa. TENANT ISOLATION.
model partners {
  id              String   @id @default(uuid())
  organization_id String
  code            String
  name            String
  phone           String
  address         String?
  district        String?
  province        String?
  tier            String   @default("STANDARD")
  rating          Decimal  @default(5.0) @db.Decimal(3, 2)
  capacity_daily  Int      @default(10)
  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization    organizations         @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  coordinations   order_coordinations[]

  @@unique([organization_id, code])
  @@index([organization_id, is_active])
}

/// Hồ sơ điều phối tiến trình của từng đơn hàng. TENANT ISOLATION.
model order_coordinations {
  id                    String                  @id @default(uuid())
  organization_id       String
  order_id              String                  @unique
  partner_id            String?
  coordinator_id        String?
  stage                 coordinator_stage       @default(INTAKE)
  risk_level            coordination_risk_level @default(NORMAL)
  risk_reason           String?
  next_action           String?
  next_action_due       DateTime?
  estimated_delivery_at DateTime?
  actual_delivery_at    DateTime?
  /// Bước quay về khi mọi sự cố của đơn đã xử lý xong (stage = EXCEPTION).
  resume_stage          coordinator_stage?
  production_progress   Int                     @default(0)
  /// Mảng id `assets` cùng tổ chức — ảnh thành phẩm thợ gửi lên.
  finished_asset_ids    Json?
  /// Ảnh mẫu tải lên lúc tiếp nhận (id `assets`), khi không lấy từ Product Master.
  sample_asset_id       String?
  shipper_name          String?
  shipper_phone         String?
  carrier               String?
  /// PICKED_UP · ON_THE_WAY · DELIVERED_SUCCESS · DELIVERY_FAILED (F12).
  delivery_state        String?
  pod_asset_id          String?
  pod_recipient_name    String?
  pod_captured_at       DateTime?
  partner_payout_vnd    Decimal?                @db.Decimal(14, 2)
  partner_rating        Int?
  closure_notes         String?
  closed_by             String?
  closed_at             DateTime?
  cancelled_reason      String?
  metadata              Json?
  created_at            DateTime                @default(now())
  updated_at            DateTime                @updatedAt

  organization          organizations           @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  order                 orders                  @relation(fields: [order_id], references: [id], onDelete: Cascade)
  partner               partners?               @relation(fields: [partner_id], references: [id])

  @@index([organization_id, stage])
  @@index([organization_id, risk_level])
}

Sổ thu (ĐP-4a, 26/09/2026, PO D2), migration `20260926220000_order_payments`. `orders` thêm `paid_vnd`/`balance_vnd` (Decimal); `balance_vnd = total_vnd − paid_vnd` giữ bằng CHECK ở SQL thô (không đẩy được qua `prisma db push`, cần `migrate deploy`). Mỗi lần thu/hoàn tiền là một dòng `order_payments`; `paymentStatus` (UNPAID/PARTIALLY_PAID/PAID/REFUNDED) là trường suy ra lúc đọc, không lưu.

```prisma
enum order_payment_kind {
  DEPOSIT
  BALANCE
  REFUND
}

/// Sổ thu. TENANT ISOLATION.
model order_payments {
  id                String              @id @default(uuid())
  organization_id   String
  order_id          String
  kind              order_payment_kind
  amount_vnd        Decimal             @db.Decimal(14, 2)
  payment_method    String?
  reference         String?
  evidence_asset_id String?
  collected_by      String
  collected_at      DateTime            @default(now())
  note              String?
  custom_fields     Json?
  created_at        DateTime            @default(now())

  organization      organizations       @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  order             orders              @relation(fields: [order_id], references: [id], onDelete: Cascade)

  @@index([organization_id, order_id])
}
```

ĐP-4a.1 (26/09/2026), T01 — đủ trường P0/P1 (Đặc tả trường §2.1/§3.1), migration `20260926230000_coordinator_p1_p2_fields`. Thêm 17 cột vào `order_coordinations`, ĐỀU CHO PHÉP NULL. Các cột kiểm theo danh mục (`channel`/`order_type`/`priority`/`service_level`/`delivery_type`/`delivery_location_type`) là CHUỖI kiểm active ở tầng ứng dụng (`field-platform/use-cases/validate-catalog-code.ts`), không phải Prisma enum (D12). `priority` để trống lúc tạo thì máy TỰ GỢI Ý (`domain/priority-suggestion.ts`, §2.15.1). `production_deadline_at`/`pickup_target_at`/`next_action_owner_id`/`handoff_at` mới có CỘT, CHƯA có logic ghi (để cho ĐP-4a.2 tính SLA và ĐP-4a.5 luồng bàn giao T02).

```prisma
model order_coordinations {
  // … các cột đã có (xem trên) …
  source                  String?  // ORDER_M10 · CHAT_M08 · CATALOG_M06 · MANUAL
  source_reference        String?
  channel                 String?  // danh mục §2.15.3 (MỞ)
  order_type              String?  // danh mục §2.15.4 (CÓ HÀNH VI) — bật nhóm trường §12
  priority                String?  // danh mục §2.15.1 (CÓ HÀNH VI) — máy gợi ý
  service_level           String?  // danh mục §2.15.2 (CÓ HÀNH VI) — dùng tính SLA (ĐP-4a.2)
  delivery_type           String?  // danh mục §2.15.5 (CÓ HÀNH VI)
  delivery_location_type  String?  // danh mục §2.15.5 (CÓ HÀNH VI) — bật nhóm trường §12
  card_required            Boolean  @default(false) // cardMessage bắt buộc khi true
  received_at              DateTime?
  delivery_window_start    DateTime?
  delivery_window_end      DateTime?
  production_deadline_at   DateTime? // CHƯA tính ở 4a.1 — để cho ĐP-4a.2/4a.9
  pickup_target_at         DateTime? // CHƯA tính ở 4a.1 — để cho ĐP-4a.2/4a.9
  sales_owner_id           String?   // gán = người tạo đơn lúc tiếp nhận (giống coordinator_id)
  next_action_owner_id     String?   // CHƯA gán ở 4a.1 — để cho ĐP-4a.5 (bàn giao T02)
  handoff_at               DateTime? // CHƯA ghi ở 4a.1 — để cho ĐP-4a.5
  handoff_confirmed        Boolean   @default(false)
  collection_method        String?
  collection_due_at        DateTime?
  planned_at               DateTime?
  production_buffer_minutes     Int?
  pickup_buffer_minutes         Int?
  planned_production_minutes    Int?
  planned_qc_buffer_minutes     Int?
  planned_pickup_minutes        Int?
  planned_delivery_minutes      Int?
  partner_selection_deadline_at DateTime?
  technical_instruction         String?
}
```

ĐP-4a.6/4a.7 (27/09/2026), T03 Yêu cầu bổ sung thông tin & T04 Yêu cầu thay đổi đơn, migration `20260927100000_coordinator_p1_p2_remaining`.

```prisma
enum order_info_request_status {
  OPEN
  SENT
  WAITING
  RECEIVED
  OVERDUE
  CANCELLED
}

enum order_change_type {
  PRODUCT
  FLOWERS
  COLOR
  WRAPPING
  ACCESSORY
  CARD_MESSAGE
  ADDRESS
  RECIPIENT
  DELIVERY_DATE
  DELIVERY_TIME
  PRICE
  QUANTITY
  PARTNER
  OTHER
}

enum order_change_request_status {
  PENDING
  APPROVED
  REJECTED
  APPLIED
  CANCELLED
}

/// Yêu cầu bổ sung thông tin còn thiếu (T03, ĐP-4a.6). TENANT ISOLATION.
model order_info_requests {
  id                    String                    @id @default(uuid())
  organization_id       String
  order_id              String
  missing_field         String
  field_label           String
  reason                String
  business_impact       String?
  requested_from        String
  requested_by          String
  requested_at          DateTime                  @default(now())
  due_at                DateTime?
  channel               String?
  message_template      String?
  response_required     Boolean                   @default(true)
  response_value        String?
  response_received_at  DateTime?
  status                order_info_request_status @default(OPEN)
  cancelled_reason      String?
  created_at            DateTime                  @default(now())
  updated_at            DateTime                  @updatedAt

  organization          organizations             @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  order                 orders                    @relation(fields: [order_id], references: [id], onDelete: Cascade)

  @@index([organization_id, order_id])
  @@index([organization_id, status])
}

/// Yêu cầu thay đổi đơn (T04, ĐP-4a.7). TENANT ISOLATION.
model order_change_requests {
  id                 String                       @id @default(uuid())
  organization_id    String
  order_id           String
  requested_by       String
  requested_at       DateTime                     @default(now())
  change_type        order_change_type
  field_changed      String
  old_value          String?
  new_value          String?
  reason             String
  customer_impact    String?
  production_impact  String?
  delivery_impact    String?
  cost_impact_vnd    Decimal?                     @db.Decimal(14, 2)
  requires_approval  Boolean                      @default(false)
  approved_by        String?
  approved_at        DateTime?
  partner_notified   Boolean                      @default(false)
  customer_confirmed Boolean                      @default(false)
  effective_at       DateTime?
  status             order_change_request_status  @default(PENDING)
  rejected_reason    String?
  created_at         DateTime                     @default(now())
  updated_at         DateTime                     @updatedAt

  organization       organizations                @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  order              orders                       @relation(fields: [order_id], references: [id], onDelete: Cascade)

  @@index([organization_id, order_id])
  @@index([organization_id, status])
}
```

Bảng mới `GET /api/v1/field-config/catalogs` (`R1`, tenant, CHỈ ĐỌC) đọc `field_catalogs`/`field_catalog_values` (ĐP-3, đã có) để nạp ô chọn — không phải bảng mới, chỉ route mới.

/// Hồ sơ kiểm tra chất lượng sản phẩm hoa cắm (QC). TENANT ISOLATION.
model order_qc_records {
  id               String           @id @default(uuid())
  organization_id  String
  order_id         String
  inspector_id     String?
  status           qc_record_status @default(PENDING)
  /// Điểm chấm AI — CHỈ ghi khi có lượt Vision thật (nợ #140), không nhận từ client.
  ai_score         Int?
  ai_critique      String?
  /// Mảng id `assets` cùng tổ chức — ảnh thành phẩm đã kiểm.
  image_asset_ids  Json?
  checklist_result Json?
  notes            String?
  created_at       DateTime         @default(now())
  updated_at       DateTime         @updatedAt

  organization     organizations    @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  order            orders           @relation(fields: [order_id], references: [id], onDelete: Cascade)

  @@index([organization_id, order_id])
}

/// Nhật ký sự cố và ngoại lệ phát sinh trong quá trình điều phối. TENANT ISOLATION.
model order_exceptions {
  id              String   @id @default(uuid())
  organization_id String
  order_id        String
  code            String
  type            String
  severity        String   @default("MEDIUM")
  description     String
  resolution      String?
  status          String   @default("OPEN")
  reported_by     String?
  resolved_by     String?
  resolved_at     DateTime?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization    organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  order           orders        @relation(fields: [order_id], references: [id], onDelete: Cascade)

  @@unique([organization_id, code])
  @@index([organization_id, order_id])
  @@index([organization_id, status])
}
```

## 27. Content Engine — `content_generations` (P27)

> **Thêm 25/09/2026.** Mỗi lượt chạy chuỗi agent Strategist→Writer→Critic→Rewriter (`POST /content-engine/generations`, feature `content.generate`) ghi một dòng. Bảng **TENANT** — `organization_id` bắt buộc, có trong `TRUNCATE` của bộ test cách ly và ca thử `tests/tenant/content-generations.test.ts`. Vòng đời `DRAFT → APPROVED → SCHEDULED`; duyệt (`J5`) ghi `approved_posts` + `audit_logs` cùng giao dịch. Migration: `prisma/migrations/20260925090000_content_generations`.

```prisma
model content_generations {
  id              String  @id @default(uuid())
  organization_id String
  job_id          String?
  /// creative_studio | content_engine_ui | package_rewrite
  origin          String
  asset_id        String?
  product_id      String?
  topic_id        String?
  scene_plan_id   String?
  /// AUTHENTIC | CREATIVE — vắng khi không gắn với kịch bản Chặng 05
  mode            String?

  /// Kênh đã chạy — facebook | instagram | tiktok | zalo
  channels Json
  /// Bản chụp Content Brief v1 tại thời điểm chạy (`contracts/brief.ts`).
  brief    Json
  /// Trùng `contracts/brief.ts#BRIEF_VERSION` tại thời điểm chạy.
  brief_version Int
  /// { strategist, writer, critic, rewriter } — mã phiên bản prompt mỗi bước.
  prompt_versions Json
  rubric_version  String

  /// Kết quả Strategist — thông điệp chính + góc/hook/dàn ý mỗi kênh.
  strategy Json?
  /// [{ channel, text, hashtags, fact_ids, scores, rounds, needs_review, source }]
  posts         Json
  overall_score Float?
  /// Bài sau khi chủ tiệm sửa rồi duyệt — nguồn học phong cách tiệm (Đợt 4).
  approved_posts Json?

  /// DRAFT | APPROVED | SCHEDULED
  status          String  @default("DRAFT")
  /// Mã bài bên SocialFlow sau khi gửi Lịch đăng (Đợt 3).
  social_post_ids Json?
  created_by      String
  approved_by     String?

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([organization_id, asset_id, topic_id, mode])
  @@index([organization_id, created_at])
}
```

## 27b. Nền quản trị trường (ĐP-3, 26/09/2026)

Bốn bảng theo kế hoạch `../kien-truc/KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md` mục 6.1. Ba bảng đầu là ngoại lệ Luật 1 (mục 1) — sổ đăng ký của TOÀN hệ thống, không thuộc tổ chức nào, cùng hạng `platform_operators`. Bảng thứ tư (`field_config_overrides`) NGƯỢC LẠI là TENANT (`organization_id` bắt buộc) — ghi đè cấu hình trường/danh mục CHỈ áp cho một tổ chức, dù chỉ quản trị nền tảng (mã `N12`) mới được ghi vào đó; ca thử cách ly ở `tests/tenant/cach-ly-repository.test.ts`.

```prisma
enum field_origin {
  CORE
  CUSTOM
}

enum field_requirement_level {
  OPTIONAL
  RECOMMENDED
  REQUIRED
}

enum field_sensitivity {
  NORMAL
  PII
  SENSITIVE
}

enum field_status {
  ACTIVE
  INACTIVE
}

enum field_catalog_governance {
  OPEN
  BEHAVIOR
  CLOSED
}

enum field_override_target {
  FIELD
  CATALOG_VALUE
}

model field_definitions {
  id                  String                   @id @default(uuid())
  key                 String                   @unique
  entity              String // ORDER · PARTNER (ĐP-4 mở thêm QC_RECORD/EXCEPTION/PAYMENT)
  origin              field_origin             @default(CORE)
  data_type           String
  label               String
  description         String?
  placeholder         String?
  placements          Json?
  requirement         field_requirement_level  @default(OPTIONAL)
  required_at_stage   String?
  visibility          Json?
  validation          Json?
  catalog_key         String?
  sensitivity         field_sensitivity        @default(NORMAL)
  floor_internal_only Boolean                  @default(false)
  status              field_status             @default(ACTIVE)
  default_enabled     Boolean                  @default(true)
  owner_organization_id String?                // null = trường nền tảng; có giá trị = trường cửa hàng tự tạo
  created_by          String?
  updated_by          String?
  created_at          DateTime                 @default(now())
  updated_at          DateTime                 @updatedAt

  owner_organization organizations? @relation("field_definition_owner", fields: [owner_organization_id], references: [id], onDelete: Cascade)

  @@index([entity])
  @@index([catalog_key])
  @@index([owner_organization_id])
}

model field_catalogs {
  id            String                    @id @default(uuid())
  key           String                    @unique
  label         String
  governance    field_catalog_governance  @default(OPEN)
  behavior_kind String?
  created_at    DateTime                  @default(now())
  updated_at    DateTime                  @updatedAt
}

model field_catalog_values {
  id          String   @id @default(uuid())
  catalog_key String
  code        String
  label       String
  description String?
  sort_order  Int      @default(0)
  is_active   Boolean  @default(true)
  behavior    String?
  params      Json?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@unique([catalog_key, code])
  @@index([catalog_key])
}

model field_config_overrides {
  id              String                    @id @default(uuid())
  organization_id String
  target          field_override_target
  override_key    String
  label           String?
  visibility      Json?
  requirement     field_requirement_level?
  is_enabled      Boolean?
  created_by      String?
  updated_by      String?
  created_at      DateTime                  @default(now())
  updated_at      DateTime                  @updatedAt

  @@unique([organization_id, target, override_key])
  @@index([organization_id])
}
```

Kiến trúc hai lớp (Đặc tả trường §16.2): **lớp mã** là `src/modules/field-platform/domain/core-field-registry.ts` (khoá, kiểu dữ liệu, mức sàn — không đổi lúc chạy, mỗi module tự khai trường của mình, vd. `src/modules/coordinator/contracts/field-registry.ts`); **lớp cấu hình** là `field_definitions` (platform-wide, quản trị nền tảng sửa qua `N12`) cộng `field_config_overrides` (riêng một tổ chức). `field-rules.ts` là nơi DUY NHẤT cộng hai lớp (`computeEffectiveFieldConfig`) — không route/component nào tự cộng lấy. Cửa hàng (năng lực `D18`, chỉ Điều hành) ghi được hai việc trong phạm vi sàn (`shop-field-floor.ts`): tạo trường riêng (`owner_organization_id`) và ghi đè trường nền tảng của chính mình (ẩn trường không bắt buộc, đổi nhãn, nâng mức yêu cầu); ghi vào `audit_logs` của tổ chức.

Mức sàn không cấu hình được (5 điều, Đặc tả trường §16.2): (1) `floor_internal_only = true` thì không cấu hình nào mở được hiển thị ra ngoài `INTERNAL`; (2) không hạ được `requirement` của trường lõi xuống dưới mức khai trong lớp mã; (3) `field_catalog_values` không xoá cứng, chỉ `is_active`; (4) `field_catalog_values.code` và `field_definitions.key` không đổi được sau khi tạo; (5) mọi thao tác ghi vào `platform_audit_logs`.

Trường TỰ TẠO (`origin = CUSTOM`, D13) lưu giá trị ở cột `custom_fields Json?` trên chính dòng tenant (`order_coordinations`, `partners` — ĐP-4 mở thêm khi các bảng đó có), nên cách ly theo `organization_id` có sẵn, không cần thêm gì. Giới hạn an toàn (§16.3): tối đa 50 trường tự tạo/thực thể, mỗi giá trị ≤ 4 KB, không đổi kiểu dữ liệu khi đã có giá trị, khoá `cf_…` máy sinh — kiểm ở `src/modules/field-platform/domain/field-rules.ts`.

`scripts/check-field-registry.ts` (`npm run check:field-registry`) đối chiếu: mọi trường lõi trong code có dòng `field_definitions`; `catalog_key`/`behavior` trong DB chỉ trỏ tới danh mục/hành vi có thật; không `field_config_overrides` mồ côi.

## 28. Thẻ Chào mẫu hoa — Swipe Brochure (`greeting-card`)

> **Đồng bộ 06/10/2026.** Mười một bảng **TENANT** `greeting_*` — `organization_id` bắt buộc, có trong `TRUNCATE` của bộ test cách ly; ca thử: `tests/tenant/greeting-card*.test.ts`. Build Render vẫn đẩy lược đồ bằng `prisma db push`; từ 06/10/2026 có thêm migration **idempotent** `prisma/migrations/20261006120000_greeting_card` (mọi lệnh `IF NOT EXISTS`): áp lên CSDL đã có bảng thì không đổi gì, áp lên CSDL thiếu bảng thì tạo đúng như schema — đã kiểm `migrate diff` rỗng trên Postgres 16.

- `greeting_sessions.send_code` sinh ngẫu nhiên, duy nhất toàn hệ thống (kiểm ở use-case; ràng buộc DB vẫn theo tổ chức để giữ link cũ `T01-001`); tra công khai trùng giữa hai tiệm → 404.
- `expires_at`/`revoked_at` chỉ chặn link CHƯA có đơn.
- `greeting_integrations`: khoá webhook ngân hàng chỉ lưu băm SHA-256; thông tin đăng nhập Zalo/eSMS lưu AES-256-GCM (khoá dẫn xuất HKDF từ `INTEGRATION_TOKEN_SECRET`).
- `greeting_payment_events`: unique `(organization_id, provider, external_id)` — webhook gửi lại không ghi thu hai lần.
- `greeting_notifications`: unique `(organization_id, order_id, event_key)` — mỗi mốc gửi một lần; FAILED được gửi lại.
- Cấu hình tiệm nằm trong `organizations.settings`: `brochure_payment` (tài khoản nhận tiền), `brochure_policy` (cọc %, chặn xưởng, `hold_minutes` giữ đơn, `auto_cancel_unpaid` tự huỷ khi quá hạn — mặc định tắt, `payment_timeout_minutes` hạn thanh toán: hết hạn chưa chuyển/chưa báo → huỷ ngay + `orders.pricing_rule_ref.paymentFailed`), `brochure_payment_plans` (`campaigns[]`: `id, name, policy, active, starts_on, ends_on`; `codes[]`: `code, policy, active, starts_on, ends_on, max_uses, min_order_vnd, max_order_vnd, catalog_ids, issued_by, note` — mã thanh toán đặt cọc, không giảm giá; kế hoạch áp cho đơn chụp ở `orders.pricing_rule_ref.paymentPlan`), `brochure_shipping` (khu vực + phí giao, giờ chốt), `brochure_step_sla` (thời gian chuẩn từng bước), `brochure_visibility` (sale xem tất cả / chỉ khách của mình), `brochure_discount` (trần % giảm giá), `brochure_default_owner` (người phụ trách link cũ), `greetingCardDisplay` (trường hiển thị theo mẫu).
- `greeting_notifications.status`: `SENDING → SENT | FAILED | SKIPPED`. Bộ quét nền (06/10/2026, mỗi phút trong tiến trình web) chuyển `SENDING` quá 5 phút → `FAILED`, gửi lại `FAILED` cách 30 phút trong 6 giờ đầu; mốc mới `QUOTED` (đã báo giá) và `PAYMENT_REMINDER` (nhắc chuyển khoản khi hết hạn giữ đơn).
- `greeting_sessions.status = COMPLETED` chỉ khi đơn đã thu ĐỦ (trước 06/10/2026: ngay lần thu đầu kể cả cọc). `BROWSING` có trong mô tả cột nhưng không còn được ghi.
- Tồn kho: mẫu có dòng `product_inventory` đúng chi nhánh của sản phẩm ở trạng thái `OUT_OF_STOCK` (hoặc `quantity_available = 0`, trừ `PRE_ORDER_ONLY`) không hiện trên link khách và không đặt được — cùng quy tắc với Product Master Index.
- `greeting_catalogs` — bộ sưu tập chào khách theo dịp (`STANDARD`) hoặc riêng cho một khách (`CLIENT`); xoá là đặt `is_active = false`.
- `greeting_catalog_products` — sản phẩm trong catalog. **Sản phẩm phải thuộc cùng tổ chức** (kiểm ở repository từ 05/10/2026; trước đó gắn được sản phẩm của tổ chức khác).
- `greeting_sessions` — một đường link chào khách (`send_code`, duy nhất theo tổ chức); `product_snapshot` đóng băng mẫu hoa lúc khách chốt.
- `greeting_share_links` — link bộ sưu tập do một nhân viên sao chép (06/10/2026): người bấm "Sao chép" chịu trách nhiệm mọi khách mở link; mỗi khách một `greeting_sessions` (`sale_id` = người sao chép). Đơn từ link cũ không qua nút Sao chép giao cho `organizations.settings.brochure_default_owner.user_id` (mặc định chủ tiệm).
- `greeting_messages` / `greeting_message_reads` — tin nhắn nội bộ theo đơn/link (06/10/2026): người gửi và vai suy từ phiên, gửi cho một vai hoặc một người, trả lời về đúng người đã nhắn; đã đọc lưu ở máy chủ (đồng bộ mọi thiết bị). Thay hẳn ghi chú theo bước kiểu cũ (`order_events.axis = internal_note`, `greeting_journey_events.INTERNAL_NOTE`) — bỏ 06/10/2026, không đọc/ghi nữa.
- `greeting_catalog_events` — lượt xem/xem mẫu/mở form/đặt đơn trên link bộ sưu tập công khai theo kênh chia sẻ `?kenh=` (06/10/2026); mỗi khách × bước 1 lần/ngày.
- `greeting_journey_events` — sự kiện hành trình: `OPEN` (do trình duyệt khách báo, 06/10/2026), `SELECT_PRODUCT`, `SUBMIT_ORDER`, `CLICK_PAID` (kèm `purpose: BALANCE` khi báo chuyển phần còn lại), `ADMIN_CONFIRMED_PAYMENT`, `LINK_COPIED`, `SHARE_OPEN`, `LINK_REVOKED`, `REORDER`. `INTERNAL_NOTE` đã bỏ 06/10/2026 (chú thích cột trong `schema.prisma` còn ghi — sửa khi có đợt đổi schema).

```prisma
model greeting_catalogs {
  id              String   @id @default(uuid())
  organization_id String
  code            String // 20-10, 8-3, sinh-nhat, cc
  name            String
  type            String   @default("STANDARD") // STANDARD | CLIENT
  description     String?
  filters         Json? // Bộ lọc dịp, mức giá, màu sắc khi tạo Client Catalog
  is_active       Boolean  @default(true)
  created_by      String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization organizations               @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  items        greeting_catalog_products[]
  sessions     greeting_sessions[]

  @@unique([organization_id, code])
  @@index([organization_id])
}

model greeting_catalog_products {
  id              String   @id @default(uuid())
  organization_id String
  catalog_id      String
  product_id      String
  sort_order      Int      @default(0)
  created_at      DateTime @default(now())

  organization organizations     @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  catalog      greeting_catalogs @relation(fields: [catalog_id], references: [id], onDelete: Cascade)
  product      products          @relation(fields: [product_id], references: [id], onDelete: Cascade)

  @@unique([catalog_id, product_id])
  @@index([organization_id, catalog_id])
  @@index([product_id])
}

model greeting_sessions {
  id                  String    @id @default(uuid())
  organization_id     String
  catalog_id          String
  send_code           String // T01-001, T01-002...
  sale_id             String // Người tạo link chào khách
  customer_name       String?
  customer_phone      String?
  status              String    @default("CREATED") // CREATED | OPENED | BROWSING | SELECTED | ORDER_SUBMITTED | PAYMENT_REPORTED | COMPLETED
  selected_product_id String?
  product_snapshot    Json? // Đóng băng ảnh, tên, giá mẫu hoa lúc khách chốt
  order_id            String?
  opened_at           DateTime?
  selected_at         DateTime?
  /// Hết hạn link (null = không hết hạn). Hết hạn/thu hồi mà chưa có đơn → link trả 404.
  expires_at          DateTime?
  revoked_at          DateTime?
  revoked_by          String?
  last_active_at      DateTime  @default(now())
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt

  organization organizations             @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  catalog      greeting_catalogs         @relation(fields: [catalog_id], references: [id], onDelete: Cascade)
  order        orders?                   @relation(fields: [order_id], references: [id], onDelete: SetNull)
  events       greeting_journey_events[]

  @@unique([organization_id, send_code])
  @@index([organization_id, catalog_id])
  @@index([organization_id, sale_id])
  @@index([send_code])
}

model greeting_journey_events {
  id              String   @id @default(uuid())
  organization_id String
  session_id      String
  event_type      String // OPEN | SWIPE_NEXT | SWIPE_PREV | SELECT_PRODUCT | OPEN_ORDER_FORM | SUBMIT_ORDER | CLICK_PAID | TRACK_VIEW
  metadata        Json?
  created_at      DateTime @default(now())

  organization organizations     @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  session      greeting_sessions @relation(fields: [session_id], references: [id], onDelete: Cascade)

  @@index([organization_id, session_id])
}

model greeting_share_links {
  id              String    @id @default(uuid())
  organization_id String
  code            String    @unique // mã trong `/s/<code>` — ngẫu nhiên, không đoán được
  catalog_id      String
  owner_id        String // người đã bấm Sao chép
  channel         String? // ?kenh= lúc sao chép
  created_at      DateTime  @default(now()) // = lúc sao chép
  revoked_at      DateTime?

  organization organizations     @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  catalog      greeting_catalogs @relation(fields: [catalog_id], references: [id], onDelete: Cascade)

  @@index([organization_id, owner_id, created_at])
  @@index([organization_id, catalog_id])
}

model greeting_messages {
  id              String   @id @default(uuid())
  organization_id String
  order_id        String? // đơn đã đặt
  session_id      String? // link chưa có đơn
  step_key        String   @default("GENERAL")
  sender_id       String
  sender_role     String // ADMIN | SALE | COORDINATOR — suy từ năng lực
  to_role         String? // gửi cho cả vai
  to_user_id      String? // gửi cho một người (trả lời luôn vào đây)
  kind            String   @default("MESSAGE")
  body            String
  payload         Json?
  reply_to_id     String?
  created_at      DateTime @default(now())

  organization organizations            @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  reads        greeting_message_reads[]

  @@index([organization_id, order_id])
  @@index([organization_id, session_id])
  @@index([organization_id, to_user_id, created_at])
  @@index([organization_id, to_role, created_at])
}

model greeting_message_reads {
  id              String   @id @default(uuid())
  organization_id String
  message_id      String
  user_id         String
  read_at         DateTime @default(now())

  organization organizations     @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  message      greeting_messages @relation(fields: [message_id], references: [id], onDelete: Cascade)

  @@unique([message_id, user_id])
  @@index([organization_id, user_id])
}

model greeting_catalog_events {
  id              String   @id @default(uuid())
  organization_id String // suy từ catalog ở server, không nhận từ khách
  catalog_id      String
  channel         String // zalo | facebook | instagram | tiktok | website | khac | truc-tiep
  event_type      String // VIEW | DETAIL | FORM_OPEN | ORDER | LIKE | UNLIKE
  visitor_hash    String // sha256(catalog_id:mã khách ngẫu nhiên) — không lưu IP
  order_id        String?
  product_id      String? // LIKE/UNLIKE: mẫu được thả/bỏ tim (07/10/2026)
  created_at      DateTime @default(now())

  organization organizations     @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  catalog      greeting_catalogs @relation(fields: [catalog_id], references: [id], onDelete: Cascade)

  @@index([organization_id, catalog_id, created_at])
  @@index([organization_id, channel])
  @@index([organization_id, catalog_id, product_id])
}

model greeting_integrations {
  id                       String   @id @default(uuid())
  organization_id          String   @unique
  payment_provider         String? // SEPAY
  payment_webhook_key_hash String?  @unique
  payment_webhook_key_hint String? // 4 ký tự cuối, để nhận diện khoá
  payment_webhook_enabled  Boolean  @default(false)
  notify_channel           String? // ZNS | ESMS
  notify_enabled           Boolean  @default(false)
  notify_config_encrypted  String?
  notify_templates         Json? // mã mẫu tin theo sự kiện — không bí mật
  created_at               DateTime @default(now())
  updated_at               DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([organization_id])
}

model greeting_payment_events {
  id              String    @id @default(uuid())
  organization_id String
  provider        String // SEPAY
  external_id     String
  amount_vnd      Decimal   @db.Decimal(14, 2)
  content         String
  account_no      String?
  transaction_at  DateTime?
  status          String // MATCHED | UNMATCHED | IGNORED
  order_id        String?
  payment_id      String?
  note            String?
  created_at      DateTime  @default(now())

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([organization_id, provider, external_id])
  @@index([organization_id, status])
}

model greeting_notifications {
  id                  String   @id @default(uuid())
  organization_id     String
  order_id            String
  event_key           String // PAYMENT_CONFIRMED | READY | DISPATCHED | DELIVERED | CANCELLED
  channel             String // ZNS | ESMS
  recipient_masked    String
  status              String // SENT | FAILED | SKIPPED
  provider_message_id String?
  error               String?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([organization_id, order_id, event_key])
  @@index([organization_id, order_id])
}
```

## 29. Journey Engine — `journey_runs`, `decision_registry` (30/09/2026)

> **Bổ sung 05/10/2026** theo mã thật.
>
> - `journey_runs` — **TENANT**, có `organization_id`. **Chưa có đường đọc/ghi nào trong `src/`** (soát bằng `grep` 05/10/2026), nên nằm trong `SCHEMA_ONLY_CHUA_NOI` của `scripts/check-docs.mjs`; vẫn có trong `TRUNCATE` của bộ test cách ly. Khi có đường ghi thật phải bỏ khỏi danh sách đó và thêm ca thử cách ly.
> - `decision_registry` — **bảng nền tảng**, không có `organization_id` (ngoại lệ có chủ đích của Luật 1, như `ai_capabilities`). Nạp từ `DECISION_REGISTRY_SEED` (`src/modules/journey/domain/decision-ownership.ts`) bởi `prisma/seed/decision-registry.ts`; đối chiếu bằng `npm run lint:decisions`.

```prisma
model journey_runs {
  id               String   @id @default(uuid())
  organization_id  String
  workspace_id     String?
  manifest_id      String
  execution_mode   String   @default("manual") // manual | automatic
  status           String   @default("PENDING") // PENDING | RUNNING | COMPLETED | FAILED
  params           Json?
  context_snapshot Json?
  degraded_steps   Json?
  created_by       String
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([organization_id, manifest_id])
  @@index([organization_id, status])
}

model decision_registry {
  decision_id String  @id
  ownership   String // USER | SYSTEM | SHARED
  locked      Boolean @default(false)
  description String
  spec_ref    String?

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

## 30. Bổ sung đợt smeOS đa ngành (17–21/10/2026)

> **Bổ sung 21/10/2026** theo mã thật — các bảng và cột thêm từ mốc chuyển sang smeOS (`8c53b38`).
>
> - `product_bookings` — **TENANT**. Lịch đặt chỗ theo khoảng ngày (Homestay, chế độ `BOOKING_CALENDAR`). `order_id = null` là khoá thủ công do admin đặt. Ngày ra không tính. Từ 22/10/2026 ngày là cột `DATE`, trạng thái là enum `booking_status`, `order_id` có khoá ngoại sang `orders` — xem mục 31. Chống chồng lịch: mọi lần ghi đi qua `AvailabilityRepository.createBooking`, khoá tư vấn theo sản phẩm (`pg_advisory_xact_lock`) rồi kiểm chồng với đặt chỗ ACTIVE trong cùng giao dịch. Chưa đặt ràng buộc `EXCLUDE` ở CSDL, vì Prisma không khai được và `db push` lúc deploy sẽ gỡ ràng buộc ngoài lược đồ. Ca thử cách ly: `tests/tenant/availability-isolation.test.ts`.
> - `staff_notifications` — **TENANT**. Nhật ký thông báo nhân viên đa kênh (APP_INBOX, ZALO, SMS, TELEGRAM, WHATSAPP, MESSENGER). `recipient_info` là thông tin liên hệ nội bộ, chưa có hạn lưu (M5). Ca thử cách ly: `tests/tenant/availability-isolation.test.ts`.
> - Cột mới: `products.availability_config` (Json, cấu hình kiểm khả dụng theo ngành), `users.phone`, `greeting_integrations.staff_notify_enabled` / `staff_notify_channels` / `staff_notify_config_encrypted` (mã hoá như `notify_config_encrypted`) / `staff_notify_events`.

```prisma
enum booking_status {
  ACTIVE
  CANCELLED
}

model product_bookings {
  id              String         @id @default(uuid())
  organization_id String
  product_id      String
  order_id        String? // null = admin block thủ công
  check_in_date   DateTime       @db.Date
  check_out_date  DateTime       @db.Date // exclusive — ngày check-out không được tính
  note            String? // "Bảo trì", "Sửa chữa", null = đặt từ đơn khách
  status          booking_status @default(ACTIVE)
  created_at      DateTime       @default(now())

  organization organizations @relation(fields: [organization_id], references: [id])
  product      products      @relation(fields: [product_id], references: [id])
  order        orders?       @relation(fields: [order_id], references: [id], onDelete: Cascade)

  @@index([organization_id, product_id, check_in_date])
  @@index([organization_id, product_id, status])
  @@index([organization_id, order_id])
}

/// Nhật ký thông báo nhân viên Thẻ Chào (Đa kênh: APP_INBOX, ZALO, TELEGRAM, WHATSAPP, MESSENGER, SMS)
model staff_notifications {
  id              String   @id @default(uuid())
  organization_id String
  order_id        String?
  event_key       String
  channel         String // APP_INBOX | ZALO | SMS | TELEGRAM | WHATSAPP | MESSENGER
  recipient_role  String? // ADMIN | SALE | COORDINATOR
  recipient_id    String? // user_id hoặc null nếu broadcast toàn bộ vai trò
  recipient_info  String? // SĐT, Telegram Chat ID, Zalo User ID...
  title           String?
  message         String?
  status          String   @default("SENT") // SENT | FAILED | SKIPPED
  provider_msg_id String?
  error           String?
  created_at      DateTime @default(now())

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([organization_id, event_key])
  @@index([organization_id, recipient_id])
}
```

## 31. Cấu hình nền tảng và đặt chỗ (22/10/2026)

> - `product_bookings` — kiểu dữ liệu chặt (rà soát M5). `check_in_date`/`check_out_date` là `DATE`; code vẫn dùng chuỗi `YYYY-MM-DD` và chỉ đổi ở biên repository (`src/modules/availability/domain/booking-day.ts`; ngày không có thật trên lịch → 422). `status` là enum `booking_status`. `order_id` có khoá ngoại sang `orders`, `ON DELETE CASCADE`: đơn chỉ bị xoá cứng khi dọn tenant bàn giao, và đặt chỗ sinh từ đơn đi theo; khoá thủ công (`order_id = null`) ở lại. Migration `20261022110000_product_bookings_typed` VIẾT TAY: đổi kiểu tại chỗ (`ALTER … TYPE … USING`), không để Prisma xoá và tạo lại cột. Ngày sai thì migration dừng, không đoán. Trạng thái lạ chuyển thành `CANCELLED`. Đặt chỗ trỏ tới đơn đã xoá được giải phóng (`CANCELLED`, ghi chú "Đơn gốc đã bị xoá"). Ca thử: `tests/tenant/availability-typed-dates.test.ts`.
> - `users.approval_status` (enum `user_approval_status`, PO 22/10/2026) — duyệt tài khoản tự đăng ký. `/auth/signup` và `/auth/instant-trial` tạo tài khoản `PENDING`. Chỉ `APPROVED` đăng nhập được (`log-in.ts`) và dùng được phiên (`resolve-session.ts`; tài khoản bị chuyển về `PENDING`/`REJECTED` mất luôn phiên đang mở). Mặc định cột là `APPROVED`: tài khoản có sẵn, nhân viên được mời và tài khoản tạo bằng script vận hành không phải duyệt. Superadmin mã `N13` duyệt ở `/van-hanh/dang-ky`; `approval_decided_by` lưu `user_id` của superadmin. Migration `20261022120000_user_approval` chỉ thêm cột. Ca thử: `tests/tenant/registration-approval.test.ts`, `tests/platform/registration-approval.test.ts`.
> - `platform_settings` — **NỀN TẢNG** (không có `organization_id`, mục 1). Khoá `nav_matrix_overrides`: ma trận điều hướng theo ngành do Admin SaaS ghi đè ở Console `/van-hanh` (`PUT /platform/nav-matrix`, mã `N12`). Trước 22/10 lưu vào một tệp trên máy chủ: mất khi deploy, mỗi instance một bản, và menu không đọc nó. Giờ máy chủ đọc (bộ nhớ đệm 30 giây) và gửi danh sách mục ẩn xuống qua phiên (`organization.navHiddenKeys`). Chưa có dòng thì dùng `src/lib/data/industry-nav-matrix-overrides.json` làm giá trị khởi đầu. Migration `20261022100000_platform_settings`. Ca thử: `tests/platform/nav-matrix-overrides.test.ts`. Khoá `ux_rollout_flags`: cờ rollout giao diện chuẩn Progressive Disclosure theo tổ chức (`PUT /platform/ux-rollout-flags`, mã `N12`; bộ nhớ đệm 30 giây; giá trị lạ thành tắt) — ca thử `tests/platform/ux-rollout-flags.test.ts`.

> - `chain_branches` — **ĐÃ XOÁ** (ADR-012 T-4c, 06/11/2026; gộp vào `branches` có `accepts_dispatch`, mục 41). Mô tả cũ giữ để tra lịch sử: **TENANT** (rà soát M5, PO duyệt 22/10/2026). Chi nhánh nhận gia công của điều phối chuỗi, trước nằm trong `organizations.settings.chain_branches`: mỗi lần trừ điểm ghi đè cả mảng JSON, hai lần phạt cùng lúc mất một. Giờ mỗi chi nhánh một dòng, khoá `(organization_id, branch_code)`; `branch_code` là `branchId` phía domain (mã trên link gia công `?branch=`), khác `branches.id`. Nhập Excel (`POST /greeting-card/chain-branches/bulk-import`) cập nhật theo mã, giữ số lần phạt và lịch sử phạt. Trừ điểm (`ChainBranchRepository.applyPenalty`) khoá dòng `FOR UPDATE`: −2 điểm, sàn 10, lịch sử tối đa 50 mục. Migration `20261022130000_chain_branches_table` VIẾT TAY: chép từng phần tử JSON có mã và tên sang bảng (trùng mã giữ phần tử cuối), rồi xoá khoá `chain_branches` khỏi `settings`. Ca thử: `tests/tenant/chain-branches-table.test.ts`.


> - `platform_secrets` — **NỀN TẢNG** (PO duyệt 22/10/2026). Bí mật không thuộc tổ chức nào, `sealed_value` luôn là bản niêm phong secret-box (không bao giờ trả ra API/log). Hiện chỉ có khoá `zalo_oa_tokens`: access + refresh token của Zalo OA chung. Refresh token Zalo dùng một lần nên làm mới chạy dưới khoá dòng `FOR UPDATE` (`PlatformSecretRepository.withLock`). Không nằm trong TRUNCATE của bộ test tenant (ca thử tự dọn). Cùng migration `20261022140000_zalo_oa_platform`: cột `chain_branches.zalo_link_code` (mã `ZL` + 8 ký tự, duy nhất toàn nền tảng — webhook OA suy ra tổ chức từ mã). Ca thử: `tests/tenant/zalo-oa-branch-link.test.ts`.

> - `chain_branches.ward` · `district` · `province` · `service_wards` (PO duyệt 22/10/2026, migration `20261022160000_chain_branch_area`, chỉ thêm cột). Khu vực hành chính của chi nhánh, nhập từ Excel; `service_wards` là mảng phường/xã lân cận nhận giao thêm. Khi không tính được khoảng cách theo toạ độ, điều phối xếp hạng theo mức khớp với địa chỉ người nhận (`orders.delivery_address.parts`): cùng phường (kể cả phường phục vụ) > cùng quận (chỉ khi cả hai còn ghi quận cũ) > cùng tỉnh; khác tỉnh bị loại (`domain/area-match.ts`, so không dấu, bỏ tiền tố). Ca thử: `tests/tenant/chain-branch-area.test.ts`.

```prisma
model platform_secrets {
  key          String   @id
  sealed_value String
  updated_at   DateTime @updatedAt
}
```

```prisma
model platform_settings {
  key        String   @id
  value      Json
  updated_by String?
  updated_at DateTime @updatedAt
}
```


## 32. Quản trị danh mục sản phẩm (23/10/2026)

> - **TENANT**, PO duyệt 23/10/2026 — giai đoạn 3 của `docs/dac-ta/FLORAOS_PRODUCT_CATALOG_GOVERNANCE_SPEC.md`. Migration `20261023024723_product_catalog_governance` chỉ thêm ba bảng. Ca thử: `tests/tenant/product-governance.test.ts`.
> - `product_change_requests` — nhân viên không có `H3` đề xuất sửa mẫu chính thức; bản gốc không đổi tới khi Điều hành duyệt (toàn bộ hoặc một phần). `base_updated_at` khác `products.updated_at` lúc duyệt → 409, không tự gộp. Quá `expires_at` (30 ngày) tác vụ quét đóng `EXPIRED`.
> - `product_revisions` — ảnh chụp nội dung mẫu TRƯỚC mỗi lần đổi (Điều hành sửa, duyệt đề xuất sửa, nhập Excel cập nhật, khôi phục). Khôi phục giữ nguyên trạng thái bán và nhãn đề xuất hiện tại.
> - `product_import_batches` — mỗi lần gọi `POST /products/batch-import`; hoàn tác trong 24 giờ: mẫu tạo ra vào thùng rác, mẫu bị cập nhật trả về phiên bản đầu tiên cùng `import_batch_id`.
> - Trạng thái mẫu đề xuất mới (giai đoạn 1–2) KHÔNG có cột riêng: nằm ở `products.attributes.proposal` (`pending`/`approved`/`rejected`/`expired`), chỉ máy chủ ghi.

```prisma
model product_change_requests {
  id              String    @id @default(uuid())
  organization_id String
  product_id      String
  proposed_by     String
  changes         Json // tập con trường của PATCH /products/:id (đã bỏ khoá chỉ máy chủ ghi)
  base_updated_at DateTime
  status          String    @default("PENDING") // PENDING | APPROVED | PARTIAL | REJECTED | EXPIRED
  applied_fields  Json? // các trường Điều hành chọn áp dụng khi duyệt một phần
  reviewed_by     String?
  reviewed_at     DateTime?
  note            String?
  expires_at      DateTime
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id])
  product      products      @relation(fields: [product_id], references: [id], onDelete: Cascade)

  @@index([organization_id])
  @@index([organization_id, status])
  @@index([organization_id, product_id])
}
```

```prisma
model product_revisions {
  id              String   @id @default(uuid())
  organization_id String
  product_id      String
  snapshot        Json // name, code, category, shape, facing, container, status, attributes, availability_config
  reason          String // EDIT | CHANGE_REQUEST | IMPORT | RESTORE
  actor_id        String
  import_batch_id String?
  created_at      DateTime @default(now())

  organization organizations @relation(fields: [organization_id], references: [id])
  product      products      @relation(fields: [product_id], references: [id], onDelete: Cascade)

  @@index([organization_id])
  @@index([organization_id, product_id, created_at])
  @@index([organization_id, import_batch_id])
}
```

```prisma
model product_import_batches {
  id              String    @id @default(uuid())
  organization_id String
  created_by      String
  created_ids     Json // string[]
  updated_ids     Json // string[]
  undone_at       DateTime?
  undone_by       String?
  created_at      DateTime  @default(now())

  organization organizations @relation(fields: [organization_id], references: [id])

  @@index([organization_id])
  @@index([organization_id, created_at])
}
```


## 33. Thông báo đa tầng (`notification`, 27/10/2026)

Migration `20261027000000_notification_system`. Ba bảng cấp nền tảng (không có `organization_id`, chỉ SaaS Mother ghi qua `/platform/notification/*`): kích hoạt kênh, hiển thị sự kiện theo tầng, khoá cứng. Bốn bảng tenant lọc theo `organization_id` của phiên.

Khoá cứng (`notification_hard_locks.scope_id`) chỉ áp đúng phạm vi đã đặt: `MOTHER` → `"GLOBAL"`; `INDUSTRY`/`CHAIN` → tổ chức đặt khoá và cửa hàng trực thuộc; `STORE` → chính cửa hàng (audit AUD-014, 28/10/2026). Migration `20261028000000_notification_org_index_and_names` (PO duyệt 28/10/2026): thêm `@@index([organization_id])` cho `notification_inbox` và `notification_user_preferences` (AUD-008), đổi tên chỉ mục/ràng buộc về đúng tên Prisma (AUD-032) — idempotent.

```prisma
model notification_channel_activations {
  channel     String   // APP_INBOX | EMAIL | PUSH | TELEGRAM | ZALO | SMS | WHATSAPP | MESSENGER
  activated   Boolean  @default(false)
  updated_by  String   // platform_admin user_id
  updated_at  DateTime @updatedAt

  @@id([channel])
}
```

Hiển thị sự kiện theo tầng và khoá cứng (trước đây hai bảng `notification_event_visibility`,
`notification_hard_locks`) lưu ở `governance_decisions` từ ADR-012 T-7c (06/11/2026) — `system` =
`notification.visibility` / `notification.hard_lock`. Xem mục 45.

```prisma
model notification_org_policies {
  id                String   @id @default(uuid())
  organization_id   String
  event_key         String
  channel           String
  role_key          String   // RoleUxKey hoặc "*" cho all roles
  enabled           Boolean  @default(true)
  priority_override String?  // NORMAL | URGENT | CRITICAL
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([organization_id, event_key, channel, role_key])
  @@index([organization_id])
}
```

```prisma
model notification_store_defaults {
  id              String   @id @default(uuid())
  organization_id String
  event_key       String
  channel         String
  role_key        String
  enabled         Boolean  @default(true)
  schedule_start  String?  // "08:00"
  schedule_end    String?  // "22:00"
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([organization_id, event_key, channel, role_key])
  @@index([organization_id, role_key])
}
```

```prisma
model notification_user_preferences {
  id              String    @id @default(uuid())
  user_id         String
  organization_id String
  event_key       String
  channel         String
  enabled         Boolean
  mute_until      DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([user_id, organization_id, event_key, channel])
  @@index([user_id, organization_id])
  @@index([organization_id])
}
```

```prisma
model notification_inbox {
  id              String    @id @default(uuid())
  user_id         String
  organization_id String
  event_key       String
  title           String
  message         String
  deep_link       String?
  priority        String    @default("NORMAL")
  is_read         Boolean   @default(false)
  read_at         DateTime?
  created_at      DateTime  @default(now())

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([user_id, organization_id, is_read])
  @@index([organization_id])
  @@index([user_id, organization_id, created_at])
}
```


## 34. Đối tác chuỗi và chat nội bộ (26/10/2026)

Quan hệ chuỗi ↔ cửa hàng đối tác: từ 06/11/2026 là `organization_links` (§40; `chain_partnerships` đã xoá ở ADR-012 T-3b), mỗi cặp cha–con một dòng. Chỉ chuỗi sở hữu quan hệ được đổi trạng thái / mở khoá công cụ; tổ chức khác → 404 (audit 28/10/2026).

Chat nội bộ: `internal_chat_conversations` thuộc tổ chức tạo (`organization_id`); `internal_chat_participants` ghi người tham gia kèm tổ chức của họ (cho phép đối tác chuỗi cùng một luồng đơn); `internal_chat_messages` theo cuộc hội thoại. Chỉ người tham gia đọc/gửi tin; luồng đơn của tổ chức khác không tự tham gia được; chỉ mời được người của chính tổ chức hoặc chuỗi/đối tác đang liên kết ACTIVE. Ca thử: `tests/tenant/internal-chat-isolation.test.ts`.

```prisma
model internal_chat_conversations {
  id                String   @id @default(uuid())
  organization_id   String
  conversation_type String   // PLATFORM_TENANT | CHAIN_PARTNER | ORDER_THREAD
  title             String?
  order_id          String?
  metadata          Json     @default("{}")
  created_by        String   // user_id of creator
  last_message_at   DateTime @default(now())
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  organization organizations                @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  participants internal_chat_participants[]
  messages     internal_chat_messages[]

  @@index([organization_id, conversation_type])
  @@index([order_id])
}
```

```prisma
model internal_chat_participants {
  id              String   @id @default(uuid())
  conversation_id String
  user_id         String
  organization_id String
  role_in_chat    String   @default("MEMBER") // OWNER | ADMIN | MEMBER | GUEST_PARTNER
  last_read_at    DateTime @default(now())
  is_muted        Boolean  @default(false)
  joined_at       DateTime @default(now())

  conversation internal_chat_conversations @relation(fields: [conversation_id], references: [id], onDelete: Cascade)
  organization organizations               @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  user         users                       @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([conversation_id, user_id])
  @@index([user_id, organization_id])
}
```

```prisma
model internal_chat_messages {
  id              String   @id @default(uuid())
  conversation_id String
  sender_user_id  String
  sender_role     String
  message_type    String   @default("TEXT") // TEXT | IMAGE | ACTION_CARD_ORDER | ACTION_CARD_QC | SYSTEM_NOTICE
  content         String   @default("")
  attachments     String[] @default([])
  action_payload  Json?
  is_deleted      Boolean  @default(false)
  created_at      DateTime @default(now())

  conversation internal_chat_conversations @relation(fields: [conversation_id], references: [id], onDelete: Cascade)
  sender       users                       @relation("ChatSender", fields: [sender_user_id], references: [id], onDelete: Cascade)

  @@index([conversation_id, created_at])
}
```

## 35. Nhóm công cụ 6 — Tính giá và tối ưu lợi nhuận (29/10/2026)

PO duyệt schema 29/10/2026. Migration `20261029061403_costing_materials_recipes` — chỉ thêm bảng, không đụng dữ liệu cũ.
Cả bốn bảng là **dữ liệu riêng của cửa hàng** (có `organization_id` + chỉ mục). Đặc điểm theo ngành (nhóm nguyên liệu, hao hụt mặc định, cách tính công, kịch bản giá) **không** lưu ở đây mà khai trong `IndustryCostingSpec` của Industry Pack (`src/modules/organization/domain/industry-costing-spec.ts`) — đúng REQ-BND-007/008. Ghi đè chi phí của cửa hàng nằm ở `pricing_rules` (khoá `labor_rate_per_hour`, `overhead_percent`, `default_packaging_vnd`, `price_change_alert_percent`).

- `materials.unit_cost_vnd = null` nghĩa là **chưa nhập giá**: giá vốn báo "thiếu đơn giá", không đoán.
- `material_price_history` chèn-chỉ: mỗi lần đổi đơn giá một dòng (cảnh báo biến động #32).
- `product_recipes` một công thức hiện hành mỗi sản phẩm; lưu lại thì tăng `version` và thay toàn bộ `product_recipe_items`.
- Lưu công thức kiểm mọi `material_id` thuộc đúng tổ chức — khác tổ chức trả 404.

```prisma
model materials {
  id              String   @id @default(uuid())
  organization_id String
  name            String
  unit            String
  category_key    String // khoá trong IndustryCostingSpec.materialCategories của ngành
  unit_cost_vnd   Decimal? @db.Decimal(14, 2)
  supplier_name   String? // PO 29/10/2026: chỉ ghi tên nhà cung cấp, quản lý đầy đủ làm sau
  on_hand_qty     Decimal? @db.Decimal(14, 3) // tồn nhập tay (#35)
  active          Boolean  @default(true)
  created_by      String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization  organizations            @relation(fields: [organization_id], references: [id])
  price_history material_price_history[]
  recipe_items  product_recipe_items[]

  @@unique([organization_id, name])
  @@index([organization_id])
  @@index([organization_id, category_key])
}

model material_price_history {
  id              String   @id @default(uuid())
  organization_id String
  material_id     String
  unit_cost_vnd   Decimal  @db.Decimal(14, 2)
  source          String // MANUAL · IMPORT · PURCHASE
  effective_at    DateTime @default(now())
  created_by      String

  organization organizations @relation(fields: [organization_id], references: [id])
  material     materials     @relation(fields: [material_id], references: [id], onDelete: Cascade)

  @@index([organization_id])
  @@index([organization_id, material_id, effective_at])
}

model product_recipes {
  id              String   @id @default(uuid())
  organization_id String
  product_id      String
  version         Int      @default(1)
  waste_percent   Decimal? @db.Decimal(5, 2) // null = dùng mặc định theo nhóm nguyên liệu của ngành
  labor_minutes   Int? // dùng khi ngành tính công theo phút
  note            String?
  updated_by      String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization organizations          @relation(fields: [organization_id], references: [id])
  product      products               @relation(fields: [product_id], references: [id], onDelete: Cascade)
  items        product_recipe_items[]

  @@unique([organization_id, product_id])
  @@index([organization_id])
}

model product_recipe_items {
  id              String  @id @default(uuid())
  organization_id String
  recipe_id       String
  material_id     String
  quantity        Decimal @db.Decimal(14, 3)

  organization organizations   @relation(fields: [organization_id], references: [id])
  recipe       product_recipes @relation(fields: [recipe_id], references: [id], onDelete: Cascade)
  material     materials       @relation(fields: [material_id], references: [id])

  @@unique([recipe_id, material_id])
  @@index([organization_id])
}
```

## 36. Trung tâm Tích hợp — `integration_*` (30/10/2026)

Kế hoạch: `docs/kien-truc/KE_HOACH_TRUNG_TAM_TICH_HOP.md` (GĐ1). Ba bảng thuộc tổ chức (`integration_connections`, `integration_events`, `integration_sync_cursors`) và một bảng cấp nền tảng (`integration_governance`, dùng từ GĐ3 — từ 06/11/2026 gộp vào `governance_decisions`, mục 45).

- `integration_connections.credential_encrypted` là bản mã secret-box (AES-256-GCM, purpose `integration:<connector_key>`); `config` không chứa bí mật; API chỉ trả `credential_hint` (4 ký tự cuối). Ngắt kết nối xoá bản mã, giữ dòng để truy vết.
- `connection_ref` là mã ngẫu nhiên 24 byte dùng trong URL webhook công khai — không lộ `organization_id`.
- `integration_events` chống trùng bằng unique `(connection_id, direction, external_event_id)`; `payload_redacted` đã che bí mật, số điện thoại, email. Thử lại tối đa 6 lần rồi `DEAD`.
- `integration_sync_cursors` chưa có đường ghi (GĐ4 — đồng bộ kênh bán hàng).

```prisma
enum integration_connection_status {
  DRAFT
  CONNECTING
  ACTIVE
  DEGRADED
  EXPIRED
  ERROR
  DISCONNECTED
  DISABLED_BY_UPPER
}

enum integration_event_direction {
  IN
  OUT
}

enum integration_event_status {
  PENDING
  DONE
  FAILED
  DEAD
}

/// Một kết nối của tổ chức tới dịch vụ ngoài. Bí mật chỉ nằm trong `credential_encrypted` (secret-box);
/// `config` không chứa bí mật. `connection_ref` là mã ngẫu nhiên dùng trong URL webhook công khai.
model integration_connections {
  id                    String                        @id @default(uuid())
  organization_id       String
  connector_key         String
  scope_tier            String
  external_account_id   String                        @default("")
  display_name          String
  status                integration_connection_status @default(DRAFT)
  config                Json                          @default("{}")
  credential_encrypted  String?
  credential_hint       String?
  connection_ref        String                        @unique
  inherited_from_org_id String?
  expires_at            DateTime?
  last_health_at        DateTime?
  last_error_code       String?
  created_by            String
  created_at            DateTime                      @default(now())
  updated_at            DateTime                      @updatedAt

  organization organizations              @relation(fields: [organization_id], references: [id])
  events       integration_events[]
  cursors      integration_sync_cursors[]

  @@unique([organization_id, connector_key, external_account_id])
  @@index([organization_id])
  @@index([status, last_health_at])
}

/// Nhật ký sự kiện vào (webhook) / ra (lệnh gọi) của một kết nối. Chống trùng theo
/// (connection, direction, external_event_id). Payload đã che dữ liệu cá nhân.
model integration_events {
  id                String                      @id @default(uuid())
  organization_id   String
  connection_id     String
  direction         integration_event_direction
  event_type        String
  external_event_id String?
  status            integration_event_status    @default(PENDING)
  attempts          Int                         @default(0)
  next_retry_at     DateTime?
  error_code        String?
  payload_redacted  Json                        @default("{}")
  created_at        DateTime                    @default(now())
  updated_at        DateTime                    @updatedAt

  organization organizations           @relation(fields: [organization_id], references: [id])
  connection   integration_connections @relation(fields: [connection_id], references: [id], onDelete: Cascade)

  @@unique([connection_id, direction, external_event_id])
  @@index([organization_id])
  @@index([organization_id, connection_id, created_at])
  @@index([status, next_retry_at])
}

/// Con trỏ đồng bộ (đơn hàng, tồn kho…) theo kết nối.
model integration_sync_cursors {
  id              String   @id @default(uuid())
  organization_id String
  connection_id   String
  resource        String
  cursor          String
  updated_at      DateTime @updatedAt

  organization organizations           @relation(fields: [organization_id], references: [id])
  connection   integration_connections @relation(fields: [connection_id], references: [id], onDelete: Cascade)

  @@unique([connection_id, resource])
  @@index([organization_id])
}

```

Khoá/cấp sẵn tích hợp theo tầng (trước đây bảng nền tảng `integration_governance`) lưu ở `governance_decisions` từ
ADR-012 T-7c (06/11/2026) — `system` = `integration`, `value` = `{mode: FORBID | INHERIT_ONLY}`. Xem mục 45.

## 37. Kênh bán hàng — `sales_channel_*` (31/10/2026)

Trung tâm Tích hợp GĐ4A (PO duyệt 31/10/2026). Hai bảng thuộc tổ chức, con của `integration_connections` (xoá kết nối → xoá theo).

- `sales_channel_listings`: một sản phẩm một tin đăng mỗi kết nối (`@@unique([connection_id, product_id])`); `last_error` là lý do tiếng Việt khi thiếu dữ liệu hoặc kênh từ chối.
- `sales_channel_orders`: unique `(connection_id, external_order_id)` — webhook hay lượt kéo gửi lại không tạo đơn trùng. Giữ chỗ trước khi tạo đơn (`FAILED` + `IN_PROGRESS`), xong thì `IMPORTED` kèm `order_id`; lỗi giữa chừng được nhận lại ở lượt sau.
- Đơn nhập từ kênh ghi `orders.source = "CHANNEL"`.
- `integration_sync_cursors` nay có đường ghi: con trỏ `orders` của lượt kéo đơn dự phòng.

```prisma
enum sales_listing_status {
  PENDING
  SYNCED
  REJECTED
  REMOVED
}

enum sales_channel_order_status {
  IMPORTED
  FAILED
}

/// Sản phẩm ↔ tin đăng trên một kênh bán (theo kết nối). Một sản phẩm một tin mỗi kết nối.
model sales_channel_listings {
  id              String               @id @default(uuid())
  organization_id String
  connection_id   String
  product_id      String
  external_id     String?
  status          sales_listing_status @default(PENDING)
  last_error      String?
  last_synced_at  DateTime?
  created_at      DateTime             @default(now())
  updated_at      DateTime             @updatedAt

  organization organizations           @relation(fields: [organization_id], references: [id])
  connection   integration_connections @relation(fields: [connection_id], references: [id], onDelete: Cascade)

  @@unique([connection_id, product_id])
  @@index([organization_id])
  @@index([organization_id, product_id])
}

/// Đơn trên kênh bán ↔ đơn nội bộ. Unique theo (kết nối, mã đơn ngoài) → webhook/lượt kéo gửi lại không tạo đơn trùng.
model sales_channel_orders {
  id                String                     @id @default(uuid())
  organization_id   String
  connection_id     String
  external_order_id String
  order_id          String?
  status            sales_channel_order_status
  error_code        String?
  created_at        DateTime                   @default(now())
  updated_at        DateTime                   @updatedAt

  organization organizations           @relation(fields: [organization_id], references: [id])
  connection   integration_connections @relation(fields: [connection_id], references: [id], onDelete: Cascade)

  @@unique([connection_id, external_order_id])
  @@index([organization_id])
  @@index([organization_id, created_at])
}
```


## 38. Marketing & Sales Center (PO 01/11/2026)

Bảy bảng thuộc tenant, mỗi bảng có `organization_id` và index dẫn đầu bằng `organization_id`. Khoá ngoại chỉ bảo đảm bản ghi tồn tại; use-case kiểm thêm ID tham chiếu cùng tổ chức trước khi ghi (`quotation-reference-guard.ts`, `create-asset-usage.use-case.ts`, `create-print-rendition.use-case.ts`). Ca thử cách ly trong `tests/tenant/`: `asset-usage-isolation`, `campaign-isolation`, `quotation-isolation`, `quotation-public-link`, `customer-care-isolation`, `print-isolation`, `marketing-kpi-isolation` (`.test.ts`).

- `quotations.public_token` — token ngẫu nhiên 256 bit, duy nhất toàn hệ thống, là quyền xem duy nhất của link công khai `/bg/<token>`. Mã `code` (`BG-xxxx`) chỉ duy nhất trong một tổ chức và không dùng cho link công khai.
- `quotation_items.organization_id` lấy theo báo giá cha khi ghi (migration `20261103090000` backfill dữ liệu cũ).

### 38.1 Bảng

```prisma
/// Nơi dùng tư liệu (Asset Usage) — Marketing & Sales Center (PO 01/11/2026, PR-2).
/// Liên kết một tư liệu nguồn (từ 8 LIBRARY_TYPES) với đích sử dụng và CTA,
/// gắn kèm link rút gọn để đo lường lượt quét/bấm và lead quy thuộc.
model asset_usages {
  id              String            @id @default(uuid())
  organization_id String
  /// 8 LIBRARY_TYPES (original, ai_image, video, audio, content, catalog, greeting_catalog, landing)
  source_type     String
  source_id       String
  asset_type_code String
  destination     usage_destination
  cta_code        String
  title           String
  short_link_id   String?
  campaign_id     String?
  config          Json?             @default("{}")
  status          usage_status      @default(ACTIVE)
  created_by      String
  created_at      DateTime          @default(now())
  updated_at      DateTime          @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id])
  short_link   short_links?  @relation(fields: [short_link_id], references: [id], onDelete: SetNull)
  campaign     campaigns?    @relation(fields: [campaign_id], references: [id], onDelete: SetNull)
  quotations   quotations[]
  customer_interactions customer_interactions[]
  print_renditions      print_renditions[]

  @@index([organization_id])
  @@index([organization_id, source_type, source_id])
  @@index([organization_id, destination, status])
  @@index([campaign_id])
}

/// Chiến dịch Quảng bá & Bán hàng — Marketing & Sales Center (PO 01/11/2026, PR-3).
/// Quản lý mục tiêu, dịp/sự kiện, thời gian chạy và tập hợp Asset Usages.
model campaigns {
  id              String             @id @default(uuid())
  organization_id String
  name            String
  objective       campaign_objective
  occasion_code   String?
  starts_at       DateTime?
  ends_at         DateTime?
  status          campaign_status    @default(DRAFT)
  created_by      String
  created_at      DateTime           @default(now())
  updated_at      DateTime           @updatedAt

  organization organizations  @relation(fields: [organization_id], references: [id])
  usages       asset_usages[]

  @@index([organization_id])
  @@index([organization_id, status])
  @@index([organization_id, created_at])
}

/// Báo giá bán hàng (Quotations) — Marketing & Sales Center (PO 01/11/2026, PR-4).
/// Liên kết cơ hội từ Lead/Customer, tính toán sản phẩm & ưu đãi, chuyển đổi thành đơn hàng.
model quotations {
  id                 String           @id @default(uuid())
  organization_id    String
  code               String           // VD: BG-0001 — mã nội bộ, không dùng cho link công khai
  public_token       String           @unique // token ngẫu nhiên của link công khai /bg/<token>
  lead_id            String?
  customer_id        String?
  asset_usage_id     String?
  status             quotation_status @default(DRAFT)
  valid_until        DateTime?
  subtotal           Decimal          @default(0) @db.Decimal(12, 2)
  discount_amount    Decimal          @default(0) @db.Decimal(12, 2)
  shipping_fee       Decimal          @default(0) @db.Decimal(12, 2) // phí vận chuyển, cộng sau ưu đãi
  total_amount       Decimal          @default(0) @db.Decimal(12, 2)
  terms              String?          // Điều kiện & điều khoản báo giá
  notes              String?          // Ghi chú nội bộ
  converted_order_id String?
  created_by         String
  created_at         DateTime         @default(now())
  updated_at         DateTime         @updatedAt

  organization    organizations    @relation(fields: [organization_id], references: [id])
  lead            leads?           @relation(fields: [lead_id], references: [id], onDelete: SetNull)
  customer        customers?       @relation(fields: [customer_id], references: [id], onDelete: SetNull)
  asset_usage     asset_usages?    @relation(fields: [asset_usage_id], references: [id], onDelete: SetNull)
  converted_order orders?          @relation("quotation_converted_order", fields: [converted_order_id], references: [id], onDelete: SetNull)
  items           quotation_items[]
  revisions       quotation_revisions[]

  @@unique([organization_id, code])
  @@index([organization_id])
  @@index([organization_id, status])
  @@index([organization_id, created_at])
  @@index([lead_id])
  @@index([customer_id])
}

/// Chi tiết từng dòng sản phẩm trong báo giá (Quotation Items).
model quotation_items {
  id              String   @id @default(uuid())
  organization_id String
  quotation_id    String
  product_id      String?
  name            String
  variant_label   String?  // phiên bản kích cỡ khách chọn, ví dụ "Lớn"
  qty             Int      @default(1)
  unit_price      Decimal  @default(0) @db.Decimal(12, 2)
  total_price     Decimal  @default(0) @db.Decimal(12, 2)
  note            String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id])
  quotation    quotations    @relation(fields: [quotation_id], references: [id], onDelete: Cascade)
  product      products?     @relation(fields: [product_id], references: [id], onDelete: SetNull)

  @@index([organization_id])
  @@index([quotation_id])
  @@index([product_id])
}

/// Ảnh chụp báo giá trước mỗi lần sửa nội dung (dòng, tổng, người sửa, thời điểm).
model quotation_revisions {
  id              String   @id @default(uuid())
  organization_id String
  quotation_id    String
  version         Int
  snapshot        Json
  created_by      String
  created_at      DateTime @default(now())

  organization organizations @relation(fields: [organization_id], references: [id])
  quotation    quotations    @relation(fields: [quotation_id], references: [id], onDelete: Cascade)

  @@unique([quotation_id, version])
  @@index([organization_id])
  @@index([organization_id, quotation_id])
}

/// Phân khúc khách hàng (Customer Segments) — Chăm sóc khách hàng (PO 01/11/2026, PR-5).
/// Hỗ trợ lọc động theo RFM, hạng khách, dịp đặc biệt, lần mua cuối, và đồng ý nhận tin.
model customer_segments {
  id              String                @id @default(uuid())
  organization_id String
  name            String
  description     String?
  kind            customer_segment_kind @default(DYNAMIC)
  rules           Json?                 // Zod schema: tier, rfmMin, rfmMax, occasions, lastPurchaseDays, tags, consentChannel
  created_by      String
  created_at      DateTime              @default(now())
  updated_at      DateTime              @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id])

  @@index([organization_id])
  @@index([organization_id, kind])
  @@index([organization_id, created_at])
}

/// Nhật ký tương tác & chăm sóc khách hàng (Customer Interactions) — Chăm sóc khách hàng (PO 01/11/2026, PR-5).
model customer_interactions {
  id              String                          @id @default(uuid())
  organization_id String
  customer_id     String
  channel         customer_interaction_channel
  direction       customer_interaction_direction  @default(OUTBOUND)
  asset_usage_id  String?
  summary         String
  outcome         String?
  occurred_at     DateTime                        @default(now())
  created_by      String
  created_at      DateTime                        @default(now())
  updated_at      DateTime                        @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id])
  customer     customers     @relation(fields: [customer_id], references: [id], onDelete: Cascade)
  asset_usage  asset_usages? @relation(fields: [asset_usage_id], references: [id], onDelete: SetNull)

  @@index([organization_id])
  @@index([organization_id, customer_id, occurred_at])
  @@index([customer_id])
  @@index([asset_usage_id])
}

/// Bản in chuẩn quy cách kỹ thuật (Print Renditions) — Ấn phẩm & In ấn (PO 01/11/2026, PR-6).
model print_renditions {
  id              String                 @id @default(uuid())
  organization_id String
  asset_id        String?
  asset_usage_id  String?
  source_type     String
  source_id       String?
  preset_code     String
  width_mm        Decimal                @db.Decimal(8, 2)
  height_mm       Decimal                @db.Decimal(8, 2)
  bleed_mm        Decimal                @default(3) @db.Decimal(5, 2)
  dpi             Int                    @default(300)
  storage_key     String?
  file_url        String?
  preflight       Json?
  status          print_rendition_status @default(PENDING)
  created_by      String
  created_at      DateTime               @default(now())
  updated_at      DateTime               @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id])
  asset_usage  asset_usages? @relation(fields: [asset_usage_id], references: [id], onDelete: SetNull)

  @@index([organization_id])
  @@index([organization_id, status])
  @@index([organization_id, preset_code])
  @@index([organization_id, created_at])
  @@index([asset_usage_id])
}
```

### 38.2 Enum

```prisma
enum usage_destination {
  PROMOTION
  SALES
  CARE
  PRINT
  OTHER
}

enum usage_status {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}

enum campaign_objective {
  AWARENESS
  LEAD
  SALE
  RETENTION
}

enum campaign_status {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

enum quotation_status {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
  CONVERTED
}

enum customer_segment_kind {
  DYNAMIC
  STATIC
}

enum customer_interaction_channel {
  ZALO
  PHONE
  SMS
  EMAIL
  IN_PERSON
  OTHER
}

enum customer_interaction_direction {
  OUTBOUND
  INBOUND
}

enum print_rendition_status {
  PENDING
  READY
  FAILED
}
```

## 39. Đối soát số dư — `reconciliation_findings` (05/11/2026)

ADR-013 D-I6, bước I-3 của `docs/plan/db-enterprise-architecture.md`. Job `reconcileOrderPayments`
(`src/modules/orders/use-cases/`, chạy mỗi 6 giờ từ `src/instrumentation.ts`) so `orders.paid_vnd` với
Σ `order_payments` CONFIRMED (REFUND trừ). Một dòng cho mỗi đơn đang lệch; khớp lại thì đóng `resolved_at`,
lệch lần nữa thì mở lại cùng dòng. Chỉ ghi nhận, không tự sửa số liệu. Đối soát `credit_balance` để sau
P2-B5 (sổ nạp credit) — hiện credit tặng và chỉnh tay chưa có dòng sổ nên đối soát sẽ báo lệch sai.

```prisma
enum reconciliation_kind {
  ORDER_PAID_MISMATCH
}

model reconciliation_findings {
  id                String              @id @default(uuid())
  organization_id   String
  kind              reconciliation_kind
  entity_id         String
  expected_vnd      Decimal             @db.Decimal(14, 2)
  actual_vnd        Decimal             @db.Decimal(14, 2)
  first_detected_at DateTime            @default(now())
  last_detected_at  DateTime            @default(now())
  resolved_at       DateTime?
  created_at        DateTime            @default(now())
  updated_at        DateTime            @updatedAt

  @@unique([kind, entity_id])
  @@index([organization_id])
  @@index([organization_id, resolved_at])
}
```


## 40. Cây tổ chức — `organization_links` (06/11/2026)

ADR-012 D-T3, bước T-2 của `docs/plan/db-enterprise-architecture.md`. Quan hệ giữa các tổ chức là đồ thị có hướng
cha → con; "tầng trên" của một tổ chức đi theo cạnh `is_primary` (tối đa một cạnh chính ACTIVE mỗi tổ chức con —
trigger ràng buộc `organization_links_one_primary` trong migration `20261106010000_organization_links`). Giai đoạn
chuyển T-2 → T-3: `id` giữ nguyên từ `chain_partnerships`, repository đối tác ghi kép. Luật chung (lọc cạnh chuỗi,
cạnh chính): `src/modules/organization/infra/organization-links.ts`.
`INDUSTRY_MEMBER`, `AFFILIATE` khai sẵn cho tầng Ngành (D-48), chưa dùng.

**T-3a (06/11/2026):** mọi đường ĐỌC quan hệ chuỗi–đối tác ở `organization_links`, lọc `ACTIVE_CHAIN_LINK`
(`status = ACTIVE`, `link_type ∈ {SUBCONTRACTOR, FRANCHISE}` — cạnh tầng Ngành không bao giờ hiện là đối tác hay chuỗi
cha): chuỗi cha (`findPrimaryChainLink` theo `is_primary`), kiểm đích đẩy đơn / chat (`partner-link-guard.ts`),
danh sách và chi tiết đối tác, `identity-query`, `partnerOrgIds` của Integration Hub. Đường ghi vẫn ghi
`chain_partnerships` trước rồi chép sang — bản phát hành trước còn đọc bảng cũ, nên quay lui không mất dữ liệu.
`partnership_type = BRANCH` không còn được nhận ở API (D-T2).

**T-3b (06/11/2026):** repository đối tác ghi thẳng `organization_links` (đặt lại cạnh chính trong cùng giao dịch;
`TERMINATED` → `valid_to = now()`, liên kết lại → `valid_to = null`). Migration contract
`20261106020000_drop_chain_partnerships` xoá `chain_partnerships`; trước khi xoá, chốt an toàn dừng cả migration nếu
còn dòng nào chưa có bản khớp (cùng id, cha, con, trạng thái) ở `organization_links`.

```prisma
enum organization_link_type {
  SUBCONTRACTOR
  FRANCHISE
  INDUSTRY_MEMBER
  AFFILIATE
}

enum organization_link_status {
  PENDING
  ACTIVE
  SUSPENDED
  TERMINATED
}

model organization_links {
  id              String                   @id @default(uuid())
  parent_org_id   String
  child_org_id    String
  link_type       organization_link_type   @default(SUBCONTRACTOR)
  status          organization_link_status @default(ACTIVE)
  is_primary      Boolean                  @default(false)
  valid_from      DateTime                 @default(now()) @db.Timestamptz(3)
  valid_to        DateTime?                @db.Timestamptz(3)
  partner_code    String
  capacity_daily  Int                      @default(10)
  commission_rate Decimal?
  contact_name    String?
  contact_phone   String?
  contact_email   String?
  address         String?
  province        String?
  district        String?
  created_at      DateTime                 @default(now()) @db.Timestamptz(3)
  updated_at      DateTime                 @default(now()) @updatedAt @db.Timestamptz(3)

  parent_organization organizations @relation("OrgLinkParent", fields: [parent_org_id], references: [id], onDelete: Cascade)
  child_organization  organizations @relation("OrgLinkChild", fields: [child_org_id], references: [id], onDelete: Cascade)

  @@unique([parent_org_id, child_org_id])
  @@unique([parent_org_id, partner_code])
  @@index([parent_org_id, status])
  @@index([child_org_id, status])
}
```

## 41. Một bảng chi nhánh — gộp `chain_branches` vào `branches` (06/11/2026)

ADR-012 D-T2, bước T-4. Chi nhánh là đơn vị con trong một tổ chức, ranh giới **phạm vi quyền** (`memberships.branch_id`
→ `src/core/tenancy/branch-scope.ts`), không phải ranh giới tenant. `branches` nhận thêm các cột vận hành điều phối của
`chain_branches` và cờ `accepts_dispatch` (chi nhánh nằm trong danh sách nhận đơn điều phối chuỗi, nhập Excel).
`branches.code` là mã chi nhánh trên link gia công (`?branch=`) — trùng `chain_branches.branch_code`.

**T-4a** (migration `20261106030000_branches_merge_chain_branches`, một giao dịch):

- Chép mọi dòng `chain_branches` sang `branches`, khoá (tổ chức, mã); dòng mới giữ id cũ.
- **D-57** trùng mã với một dòng `branches` có sẵn → gộp vào dòng đó: giữ tên/địa chỉ của `branches`, lấy cấu hình nhận
  đơn từ `chain_branches`, `is_active` = cả hai cùng bật; NOTICE báo số dòng trùng.
- **D-56** thành viên có `chain_branch_code` mà chưa có `branch_id` → `branch_id` = chi nhánh đó (từ đây bị giới hạn theo
  chi nhánh trên mọi màn hình, trừ người có F7). Đã có `branch_id` khác → giữ, NOTICE.
- Đơn gia công đã có chi nhánh nhận/chốt (`order_coordinations.metadata.subcontract_dispatch.claimedBranchId` là mã,
  trạng thái `CLAIMED_GRACE`/`COMMITTED`) → `orders.branch_id`.
- Ghi kép (`src/modules/greeting-card/infra/chain-branch-sync.ts`): nhập Excel, bật/tắt, trừ điểm, liên kết Zalo chép
  sang `branches` trong cùng giao dịch; tên/địa chỉ/trạng thái chỉ chép khi người dùng đổi chúng (nhập Excel, bật/tắt).
  Gắn chi nhánh cho thành viên ghi kèm `branch_id`; gỡ chỉ bỏ `branch_id` khi nó trỏ đúng chi nhánh vừa gỡ. Chi nhánh
  nhận đơn theo mã → `orders.branch_id`.

**T-4b** (không đổi schema): mọi đường đọc lấy từ `branches` có `accepts_dispatch` — danh sách ứng viên và tra theo mã
(`ChainBranchRepository`), danh sách mã liên kết Zalo và tra mã liên kết, trang cửa hàng (chi nhánh của tài khoản theo
`memberships.branch_id`; `branch_id` trỏ chi nhánh thường thì dùng `chain_branch_code` tới T-4c), danh sách chi nhánh để
gắn cho thành viên, Thẻ Gia Công công khai (`findBranchInOrganization`: `branches.id`, rồi mã). Ghi kép giữ nguyên.

**T-4c** (migration contract `20261106060000_drop_chain_branches`): repository ghi thẳng `branches` (nhập Excel upsert
theo tổ chức + mã, trùng mã với chi nhánh thường thì chính dòng đó nhận đơn; bật/tắt, mã liên kết Zalo, trừ điểm khoá
dòng `branches` `FOR UPDATE`). Trang cửa hàng chỉ đọc `memberships.branch_id`; API gắn chi nhánh cho thành viên vẫn
nhận mã (`chain_branch_code`) và ghi `branch_id`; `GET /members` suy mã từ `branch_id`. Migration: chốt an toàn dừng cả
migration nếu còn chi nhánh `chain_branches` chưa có dòng `branches` nhận đơn cùng mã; gắn `branch_id` cho thành viên
còn sót; NOTICE số thành viên có `branch_id` khác chi nhánh chuỗi (cần gắn lại); xoá cột `memberships.chain_branch_code`
và bảng `chain_branches`.

Ca thử: `tests/tenant/branches-merge.test.ts`.


## 42. Tên miền riêng — `custom_domains` (06/11/2026)

Checklist ALG 10.8 (PO 06/11/2026). Cửa hàng gắn tên miền của mình cho trang danh mục và Thẻ Chào. `hostname`
duy nhất toàn hệ thống (đã chuẩn hoá chữ thường, punycode). Xác minh bằng bản ghi TXT `_smeos-verify.<hostname>`
có giá trị `smeos-verify=<verification_token>`. `src/proxy.ts` chỉ phục vụ tên miền `VERIFIED` và chỉ các trang
có dữ liệu thuộc đúng `organization_id` (`src/modules/custom-domain/use-cases/resolve-custom-domain.ts`); `LOCKED`
do Console nền tảng đặt (`N20`), cửa hàng không tự gỡ. `certificate_status` ghi kết quả gắn tên miền trên Render
(PO Q11: tự động qua API; chưa cấu hình khoá → `MANUAL`). Có chính sách RLS `tenant_isolation`
(migration `20261106040000_custom_domains`).

```prisma
enum custom_domain_status {
  PENDING
  VERIFIED
  LOCKED
}

enum custom_domain_certificate_status {
  NOT_REQUESTED
  REQUESTED
  MANUAL
  FAILED
}

model custom_domains {
  id                 String                           @id @default(uuid())
  organization_id    String
  hostname           String                           @unique
  verification_token String
  status             custom_domain_status             @default(PENDING)
  verified_at        DateTime?                        @db.Timestamptz(3)
  last_checked_at    DateTime?                        @db.Timestamptz(3)
  certificate_status custom_domain_certificate_status @default(NOT_REQUESTED)
  locked_reason      String?
  created_by         String?
  created_at         DateTime                         @default(now()) @db.Timestamptz(3)
  updated_at         DateTime                         @default(now()) @updatedAt @db.Timestamptz(3)

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([organization_id])
}
```

## 42. Loại tổ chức chuỗi — `FLOWER_NETWORK` gộp vào `CHAIN` (06/11/2026)

ADR-012 D-T11 (D-55), bước T-8. `organization_type.FLOWER_NETWORK` và `CHAIN` chỉ khác nhãn: mọi tổ chức chuỗi lưu là
`CHAIN`. Gói dịch vụ `FLOWER_NETWORK` (`credit_plan`/`plan`, `PLAN_FEATURES`), nhóm vai giao diện "Mạng lưới" và
`capability_scope.FLOWER_NETWORK` là khái niệm khác, không đổi.

- **T-8a** — migration `20261106040000_organization_type_flower_network_to_chain` (một giao dịch, chỉ đổi dữ liệu): tổ
  chức `FLOWER_NETWORK` → `CHAIN` (NOTICE báo số dòng), yêu cầu đổi mô hình đang chờ
  (`settings.pending_model_change.requested_type`) → `CHAIN`. Mọi đường ghi loại tổ chức đi qua
  `toStoredOrganizationType` (`src/modules/organization/domain/organization-type.ts`): gửi yêu cầu đổi mô hình, Admin
  SaaS duyệt. API vẫn nhận `FLOWER_NETWORK` (yêu cầu cũ) và lưu `CHAIN`; đường đọc còn so cả hai giá trị.
- **T-8b** — migration contract `20261106070000_organization_type_drop_flower_network`: đổi nốt dòng còn sót (NOTICE),
  rồi dựng lại enum `organization_type` không có `FLOWER_NETWORK` (`EXPERIENCE · SINGLE · STORE · CHAIN`). Bỏ mọi nhánh
  so loại tổ chức `FLOWER_NETWORK` (`tier-of.ts`, điều hướng, ma trận, thông báo, entitlement, duyệt đổi mô hình); API
  `requested_type` / `target_type` từ chối giá trị này (400). Hàm chuyển `toStoredOrganizationType` (T-8a) đã bỏ.

Ca thử: `tests/unit/organization/request-and-approve-model-change.test.ts`, `src/core/governance/tier-of.test.ts`.

## 43. Ngành — bảng `industries`, cột `organizations.industry_key` (06/11/2026)

ADR-012 D-T6, bước T-6. `industries` là bảng **NỀN TẢNG** (không có `organization_id`): `key` = khoá plugin ngành
(`src/modules/organization/domain/industries`), `name`, `status` (`ACTIVE` · `INACTIVE`). `organizations.industry_key`
là khoá ngoại về `industries.key` (`ON DELETE RESTRICT`, `ON UPDATE CASCADE`), thay dần `settings.industry`. Tầng
Ngành **chưa bật**: không có loại tổ chức `INDUSTRY`, không có vai quản trị ngành, chưa dùng `link_type`
`INDUSTRY_MEMBER`/`AFFILIATE`.

**T-6a** — migration `20261106050000_industries` (một giao dịch): tạo bảng, seed 7 ngành của plugin (Điện hoa
`FLORAL` đầu tiên), chép `industry_key` từ `settings.industry` (không phân biệt hoa thường; mã lạ để trống, NOTICE báo
số dòng). Trigger `organizations_sync_industry_key` (`BEFORE INSERT OR UPDATE OF settings`): mỗi lần ghi
`settings.industry` qua bất kỳ đường cũ nào (đăng ký, Admin SaaS tạo tổ chức, dùng thử, dữ liệu mẫu,
`PATCH /organizations/current`) thì `industry_key` theo trong cùng lệnh ghi; đổi cột khác không đụng.
`resolveTierChain` đọc `industry_key`, dự phòng `settings.industry`.

**T-6b** (06/11/2026, không đổi schema):

- Ngành đọc từ cột: `withIndustryKey` (`src/modules/organization/domain/industry-key.ts`) đặt `settings.industry` =
  `industry_key` ngay khi đọc dòng tổ chức ở `OrganizationRepository` (phiên đăng nhập → toàn bộ giao diện, tính giá,
  lịch khả dụng, phân tích thị trường…) và `GreetingCardRepository.getShopProfile` (đặt đơn công khai, kiểm định ảnh
  QC, xác nhận thanh toán). Mã phía sau đọc `settings.industry` như cũ mà nguồn đã là cột.
- Còn đọc thẳng `settings.industry` từ `select` lồng (phải chuyển trước T-6c): `greeting-card-repository`
  (`organization: { select: { settings } }` của phiên/catalog/đơn), `subcontract-order-repository`
  (`findOrganizationSettings`), `availability-check-repository`, `shop-contact-repository`,
  `craft-fee-facts-repository`, `sample-catalog-repository.findOrganization`, nguồn của `active-shop-promotions` và
  `personalize-opportunities`. Trigger T-6a giữ hai giá trị khớp nên hành vi không đổi.
- Khoá phạm vi dạng D-T5: migration `20261106080000_scope_keys_d_t5` đổi `scope_id` của `notification_hard_locks` và
  `integration_governance` ("GLOBAL" → `platform`, id tổ chức → `org:<id>`; `industry:<key>` giữ nguyên).
  `src/core/governance/scope-key.ts` đổi qua lại với dạng domain/API ("GLOBAL", id tổ chức) ở repository; đọc chấp
  nhận cả dạng cũ. Ca thử: `tests/tenant/scope-keys.test.ts`, `src/core/governance/scope-key.test.ts`.

**T-6c-1** (06/11/2026, không đổi schema, không migration):

- Ghi: `OrganizationRepository` (`create`, `update`, `updateSettings`, `updateTypeAndSettings` — đăng ký, dùng thử,
  Admin SaaS tạo tổ chức, `PATCH /organizations/current`, duyệt yêu cầu) và `SampleCatalogRepository`
  (nạp dữ liệu mẫu) ghi settings qua `organizationSettingsData` (`src/modules/organization/infra/organization-industry.ts`):
  khoá `industry` bị tách khỏi JSON, mã chuẩn hoá (`normalizeIndustryKey`, mã lạ → `null`) ghi vào `industry_key`.
  Ghi settings không có khoá `industry` thì cột giữ nguyên. Trigger T-6a không còn việc gì (JSON mới không có khoá).
- Đọc: các `select` lồng liệt kê ở T-6b, cùng `order-change-repository`, `brochure-order-repository` (trang theo dõi),
  `background-sweep-repository`, `cancellation-follow-up-repository`, `greeting-notification-repository`,
  `chain-dispatch-sweep-query`, `public-order-repository`, `approval-request-repository`, cài đặt chuỗi của
  `findPrimaryChainLink`, chọn `ORG_SETTINGS_SELECT` và phủ ngành bằng `withIndustryKey` / `withOrganizationIndustry`.
  Hai màn Admin SaaS (danh sách và hồ sơ tổ chức) đọc `industryKeyOf` thay cho `settings.industry_key` (khoá không tồn
  tại, trước đây luôn hiện "Chưa phân loại"). Worker phân tích ảnh đọc `COALESCE(industry_key, settings->>'industry')`.
- Chặn hồi quy: `tests/unit/architecture/organization-industry-read.test.ts` — chọn `settings: true` mà không kèm
  `industry_key` chỉ được ở danh sách ghi lý do (chỉ đọc một khoá không phải ngành, hoặc đọc để ghi lại).
- Ca thử: `tests/tenant/industries.test.ts` (ghi tách ngành ra cột; đọc lồng theo cột khi JSON không còn `industry`).

**T-6c-2** (contract, PO duyệt 06/11/2026, sau khi T-6c-1 #161 đã chạy trên production; không đổi schema): migration
`20261106110000_industry_contract` (một giao dịch) bỏ trigger + hàm `smeos_organizations_sync_industry_key` TRƯỚC, chép
bù `industry_key` cho dòng còn trống mà JSON có mã hợp lệ, báo (NOTICE) số dòng mã lạ sẽ mất, rồi xoá khoá
`settings.industry`; chốt cuối: không còn dòng nào có khoá đó. Mã: `industryKeyOf` và `resolveTierChain` chỉ đọc cột;
`withIndustryKey` phủ `settings.industry` = cột, cột trống thì BỎ khoá (JSON sót lại không có tác dụng); worker phân tích
ảnh chỉ đọc `industry_key`.

Ca thử: `tests/tenant/industries.test.ts` (JSON sót lại không có tác dụng; seed ngành của CSDL test ở
`tests/helpers/industries-seed.ts`), `tests/tenant/tier-chain.test.ts`, `src/modules/organization/domain/industry-key.test.ts`.

```prisma
model industries {
  key        String          @id
  name       String
  status     industry_status @default(ACTIVE)
  created_at DateTime        @default(now()) @db.Timestamptz(3)
  updated_at DateTime        @default(now()) @updatedAt @db.Timestamptz(3)

  organizations organizations[]
}

enum industry_status {
  ACTIVE
  INACTIVE
}

// organizations: thêm
//   industry_key String?
//   industry     industries? @relation(fields: [industry_key], references: [key], onUpdate: Cascade, onDelete: Restrict)
//   @@index([industry_key])
```

## 44. Phạm vi chi nhánh theo mã quyền — đợt 1: khách hàng (06/11/2026)

ADR-012 D-T7, bước T-5 (quyết định D-58, D-59).

- `TenantContext.grants`: phạm vi của từng mã quyền (`role_capabilities.scope`: `ORGANIZATION` | `BRANCH`), nạp ở
  `resolve-session`. `branchScopeFor(ctx, code)` / `scopedWhereForBranch(ctx, code)` (`src/core/tenancy/branch-scope.ts`):
  mã phạm vi `BRANCH` luôn giới hạn vào chi nhánh của người dùng (kể cả có F7); mã phạm vi `ORGANIZATION` theo luật cũ
  (có chi nhánh mà không có F7 thì giới hạn). Mặc định mọi mã phạm vi `ORGANIZATION` — không đổi hành vi.
- **D-58** `customers.branch_id` (khoá ngoại `branches`, `ON DELETE SET NULL`, index `(organization_id, branch_id)`):
  khách tạo ở CRM nhận chi nhánh của người tạo khi người đó bị giới hạn theo chi nhánh; khách chưa có chi nhánh nhận
  chi nhánh của đơn đầu tiên có chi nhánh (trigger `orders_customer_branch`, mọi đường tạo/gán đơn kể cả đơn công
  khai); null = khách dùng chung toàn tổ chức. Migration `20261106090000_customers_branch`: thêm cột, chép từ đơn sớm
  nhất có chi nhánh cùng tổ chức, tạo trigger.
- **D-59** cờ `organizations.settings.branch_scope.wave1` (mặc định tắt; chỉ Admin SaaS bật —
  `PATCH /platform/organizations/:id { branch_scope_wave1 }`, N2; tổ chức không tự sửa khoá `branch_scope`). Bật: nhân
  viên bị giới hạn theo chi nhánh cho quyền xem khách (`Q1`) chỉ thấy khách của chi nhánh mình và khách dùng chung —
  danh sách, chi tiết, sửa, xoá, xuất, đơn của khách; ngoài phạm vi → 404. Tra theo số điện thoại (chống trùng khách)
  không lọc. Đơn hàng và điều phối đã lọc theo chi nhánh từ trước (`branchScopedWhere`), không cần cờ.

Ca thử: `tests/tenant/branch-scope-customers.test.ts` (tự cài trigger từ tệp migration khi CSDL test dựng bằng
`db push`), `src/core/tenancy/branch-scope-grants.test.ts`, `tests/unit/platform/set-branch-scope-wave.test.ts`.

**T-5b — đợt 2 và 3 (06/11/2026, không đổi schema).** Rà mọi bảng có `branch_id`: `products`, `product_inventory`
(theo sản phẩm), `pricing_rules`, `generation_jobs`, `orders`, `customers`, `memberships`. Đọc đã lọc theo chi nhánh
(ALG 9.13); đợt này vá các đường GHI và đường tra theo id còn lọt (luôn bật, không cần cờ — không thêm luật hiển thị mới):

- `ProductRepository.findById` lọc theo chi nhánh (chi nhánh mình hoặc dùng chung) → sửa, đổi trạng thái hàng loạt,
  phân tích ảnh, duyệt đề xuất… trên sản phẩm chi nhánh khác đều 404.
- Thùng rác: liệt kê, chuyển vào, khôi phục, xoá vĩnh viễn sản phẩm chỉ trong phạm vi; nhập Excel cập nhật theo mã bỏ
  qua sản phẩm chi nhánh khác.
- `canAssignBranch(ctx, code, branchId, { allowShared })` (`branch-scope.ts`): tạo/sửa sản phẩm chỉ gán chi nhánh mình
  hoặc dùng chung; ghi quy tắc giá chỉ cho chi nhánh mình (không ghi quy tắc toàn tổ chức).
- `GET /pricing-rules`: người bị giới hạn luôn nhận cấu hình hiệu lực của chi nhánh mình (bỏ qua `branch_id` khác).
- Báo cáo đã lọc theo chi nhánh (sổ giao dịch ngân hàng không có chi nhánh — dữ liệu cấp tổ chức). Kho dữ liệu lọc theo
  chi nhánh của người tải lên (`creatorFilterForScope`). Job AI lọc theo người tạo (thiếu G5 chỉ thấy job của mình).
- Đợt 3: không còn bảng mang `branch_id` nào chưa lọc; giới hạn thêm (vd. tệp/ảnh theo chi nhánh) cần cột mới — ngoài
  phạm vi T-5b.

Ca thử: `tests/tenant/branch-scope-products.test.ts`.

## 51. Mã hoá cột dữ liệu cá nhân — `tenant_data_keys`, cột `*_enc` / `*_hash` / `*_last4` (07/11/2026)

ADR-014 D-P3, bước **P-5a** (expand). PO duyệt 07/11/2026 (D-65): phạm vi A — dữ liệu của khách cuối; khoá chủ
`PII_ENCRYPTION_KEY`; tìm khách theo 4 số cuối hoặc đủ số; chia 3 PR (P-5a cột + ghi kép + job, P-5b đọc và tra cứu, P-5c
bỏ cột rõ). Migration `20261107220000_pii_encryption_expand`.

```prisma
model tenant_data_keys {
  id              String    @id @default(uuid())
  organization_id String
  version         Int
  wrapped_key     String
  created_at      DateTime  @default(now()) @db.Timestamptz(3)
  retired_at      DateTime? @db.Timestamptz(3)

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([organization_id, version])
  @@index([organization_id])
}```

- Cột thêm (đều `String?`): `customers.phone_enc` `phone_hash` `phone_last4` `email_enc` `address_enc` `notes_enc`;
  `leads.phone_enc` `phone_hash` `phone_last4` `message_enc`; `greeting_sessions.customer_phone_enc`
  `customer_phone_hash` `customer_phone_last4`; `order_recipients.recipient_phone_enc` `address_line_enc` `address_parts_enc`
  (JSON đã mã hoá) `vat_company_name_enc` `vat_tax_code_enc` `vat_company_address_enc` `vat_email_enc`;
  `order_coordinations.shipper_phone_enc`. Index `(organization_id, phone_hash)` ở `customers`, `leads`, `greeting_sessions`
  (`customer_phone_hash`), `(organization_id, phone_last4)` ở `customers`. Sổ cột: `src/core/security/pii-fields.ts`.
- Mã hoá (`src/core/security/pii-cipher.ts`): AES-256-GCM qua `node:crypto`; bản mã `pii1.<phiên bản khoá>.<iv>.<tag>.<ct>`;
  khoá dữ liệu 32 byte ngẫu nhiên mỗi tổ chức, lưu ở `tenant_data_keys` dạng bọc bằng khoá chủ (`v1.<iv>.<tag>.<ct>`).
  `phone_hash` = HMAC-SHA256 số đã chuẩn hoá (chỉ chữ số, +84/84 → 0), khoá HKDF từ khoá chủ theo tổ chức; số không có chữ
  số → chuỗi rỗng. `phone_last4` dạng rõ. Tên khách không mã hoá.
- Ghi kép (`src/core/security/infra/pii-write.ts`, extension của client Prisma): mọi `create`/`update`/`upsert`/`*Many`
  vào cột rõ của sổ → ghi kèm bản mã/băm cùng lệnh. Tổ chức lấy từ dữ liệu, `where`, dòng đang sửa hoặc ngữ cảnh tổ chức;
  không xác định được → bản mã `null` (không bao giờ lệch chữ rõ), job xử lý sau.
- Dữ liệu cũ: `encryptPendingPii` (`src/core/security/infra/pii-backfill.ts`) — lượt quét nền 5 phút
  (`/api/v1/internal/chain-dispatch-sweep`, trường `piiEncrypted`, 200 dòng mỗi bảng) và `npm run pii:backfill` (runbook §14).
- Production chưa đặt khoá chủ → chưa mã hoá, log `pii.encryption_disabled`. Ở P-5a mọi chỗ đọc vẫn đọc cột rõ.

Ca thử: `tests/tenant/pii-encryption.test.ts`, `src/core/security/__tests__/pii-cipher.test.ts`.

## 50. Quyền xem đơn của chi nhánh gia công — `shared_order_access` (07/11/2026)

ADR-014 D-P6, bước **P-4**. PO duyệt 07/11/2026 (D-64): làm ngay; chi nhánh làm đơn còn quyền **7 ngày** sau khi đơn
đóng; chi nhánh được mời **mất quyền ngay** khi hết vòng hoặc chi nhánh khác nhận; tin mời Telegram/Zalo **chỉ ghi khu
vực**. Migration `20261107200000_shared_order_access`.

```prisma
model shared_order_access {
  id              String                    @id @default(uuid())
  organization_id String
  order_id        String
  branch_key      String
  level           shared_order_access_level
  granted_at      DateTime                  @default(now()) @db.Timestamptz(3)
  revoked_at      DateTime?                 @db.Timestamptz(3)
  updated_at      DateTime                  @updatedAt @db.Timestamptz(3)

  organization organizations @relation(fields: [organization_id], references: [id])
  order        orders        @relation(fields: [order_id, organization_id], references: [id, organization_id], onDelete: Cascade)

  @@unique([order_id, branch_key])
  @@index([organization_id, branch_key])
}```

```prisma
enum shared_order_access_level {
  INVITED
  ASSIGNED
}```

- Một dòng mỗi (đơn, chi nhánh); `branch_key` là `branches.id` hoặc mã điều phối, đúng như trong phiên điều phối và link
  ký. Khoá ghép `(order_id, organization_id)` tới `orders`, xoá đơn → xoá quyền. Thuộc tổ chức: RLS `tenant_isolation`.
- Ghi: `SubcontractOrderRepository.updateSubcontractState` (mọi lần đổi phiên điều phối) gọi `syncOrderShares` cùng giao
  dịch, theo `subcontractShares` (`src/modules/greeting-card/domain/subcontract-share.ts`): phiên `OPEN` → chi nhánh được
  mời ở vòng hiện tại (trừ đã từ chối) mức `INVITED`; `CLAIMED_GRACE`/`COMMITTED` → chỉ chi nhánh giữ đơn, mức `ASSIGNED`;
  `ESCALATED`/`CANCELLED` → không ai. Bên không còn trong tập → `revoked_at`; được mời lại → cấp lại.
- Đọc: `loadSubcontractOrderForBranch` (cổng mọi route `/api/v1/public/subcontract/*`) → `hasActiveOrderShare`
  (`src/modules/orders/infra/shared-order-access-repository.ts`, luật ở `src/modules/orders/domain/order-share.ts`): thu
  hồi → 404; đơn đóng (hoàn tất, huỷ, hoặc đã giao) → `INVITED` hết ngay, `ASSIGNED` hết sau 7 ngày tính từ sự kiện đóng
  đầu tiên trong `order_events` (đơn cũ không có sự kiện: `updated_at`).
- Link ký vẫn định danh chi nhánh; hạn chữ ký nâng 14 → 120 ngày (trần an toàn), quyền do bảng này quyết.
- Khác ADR: quyền gắn chi nhánh (`branch_key`) thay cho `grantee_org_id` vì gia công hiện chỉ giao cho chi nhánh cùng tổ
  chức; "trường được xem" theo mức (`INVITED`: SĐT người nhận che; `ASSIGNED`: đủ); hạn tính khi đọc thay cho cột.
- Tin mời (`inviteSubcontract`): biến `{{deliveryAddress}}` nay là khu vực (`subcontractAreaText`: phường, quận, tỉnh);
  địa chỉ đầy đủ chỉ dùng để tìm chi nhánh gần và hiện trong Thẻ Gia Công.

Ca thử: `tests/tenant/shared-order-access.test.ts` (được mời/không mời, chi nhánh khác nhận, huỷ nhận, vòng mới, đơn đóng
+ 7 ngày, xoá đơn, backfill), `src/modules/greeting-card/domain/__tests__/subcontract-share.test.ts`.

## 49. Người nhận và hoá đơn VAT của đơn — `order_recipients` (07/11/2026)

ADR-014 D-P2, bước **P-3a** (expand). PO duyệt 07/11/2026: P-3 chia ba bước (P-3a bảng + backfill + ghi kép; P-3b
chuyển đọc; P-3c bỏ dữ liệu cá nhân khỏi `orders.delivery_address` và các cột `orders.vat_*`), gồm cả VAT (D-63).
Migration `20261107120000_order_recipients`.

```prisma
model order_recipients {
  organization_id     String
  order_id            String   @id // một dòng mỗi đơn
  recipient_name      String?
  recipient_phone     String?
  address_line        String?
  address_parts       Json?
  vat_company_name    String?
  vat_tax_code        String?
  vat_company_address String?
  vat_email           String?
  created_at          DateTime @default(now()) @db.Timestamptz(3)
  updated_at          DateTime @updatedAt @db.Timestamptz(3)

  organization organizations @relation(fields: [organization_id], references: [id])
  order        orders        @relation(fields: [order_id, organization_id], references: [id, organization_id], onDelete: Cascade)

  @@unique([order_id, organization_id])
  @@index([organization_id])
}```

- Một dòng mỗi đơn (`order_id` là khoá chính); khoá ghép `(order_id, organization_id)` tới `orders`, xoá đơn → xoá
  dòng. Thuộc tổ chức: RLS `tenant_isolation` (`scripts/gen-rls-policies.mjs`).
- Cột suy từ JSON `orders.delivery_address` bằng `recipientFromDeliveryAddress` (`src/modules/orders/domain/order-recipient.ts`):
  tên `recipientName` → `name`; SĐT `phone` → `recipientPhone`; `address_line` (dòng hiển thị) `street` → `full_address`
  → `fullAddress` → `address` → `formattedAddress` → ghép từ `parts`; `address_parts` giữ NGUYÊN mọi khoá địa chỉ như
  đã lưu (`houseNumber`, `street`, `ward`, `district`, `province`, `city`, `country`, `formattedAddress`, `full_address`,
  `fullAddress`, `address`, `parts` — từ P-3b, migration `20261107150000_order_recipients_address` chép lại). JSON là
  chuỗi → chỉ `address_line`. Khoá vận hành (`zone`, `notes`, `mapUrl`) ở lại JSON.
- Ghi kép (`upsertOrderRecipient`, `src/modules/orders/infra/order-recipient-repository.ts`), cùng giao dịch với lệnh ghi
  đơn: tạo đơn nhập tay và sửa địa chỉ (`order-repository.ts`), đặt đơn Thẻ chào (`brochure-checkout-repository.ts`),
  duyệt đổi thông tin (`order-change-repository.ts`), tạo đơn điều phối (`coordinator-query-helper.ts`), hoá đơn VAT
  (`order-vat-repository.ts` — chỉ phần `vat_*`).
- Đọc (P-3b, 07/11/2026): mọi lệnh `orders.find*` có trả `delivery_address` đi qua query extension của client Prisma
  (`src/core/tenancy/infra/prisma.ts` → `src/modules/orders/infra/order-recipient-view.ts`): lấy kèm `recipient` và trả
  về JSON ghép (`deliveryAddressView`: khoá vận hành của JSON + phần cá nhân từ bảng; đơn chưa có dòng → JSON như cũ).
  Chọn đơn lồng trong bảng khác (`order: { select: { delivery_address } }`) dùng `RECIPIENT_VIEW_SELECT` +
  `withDeliveryView` (`tests/unit/architecture/order-recipient-reads.test.ts` khoá). VAT đọc `order_recipients`, đơn
  chưa có dòng → cột cũ. Dữ liệu cũ khoá `name`/`full_address` nay đọc ra thêm `recipientName`/`street`.
- Backfill trong migration (khối `P3A-BACKFILL`, rồi `P3B-BACKFILL` chép lại phần địa chỉ, `ON CONFLICT DO UPDATE`):
  làm đúng như `recipientFromDeliveryAddress` (test so hai bên).
- Nơi lưu DUY NHẤT (P-3c, 07/11/2026, migration `20261107180000_order_recipients_contract`): đường ghi chỉ ghi khoá vận
  hành vào `orders.delivery_address` (`storedDeliveryAddress` = `stripRecipientPii`), người nhận/địa chỉ/VAT vào bảng này;
  bỏ 4 cột `orders.vat_company_name`, `vat_tax_code`, `vat_company_address`, `vat_email`. Migration chốt khớp trước (khối
  `P3C-VERIFY` + kiểm VAT; lệch → RAISE, không xoá gì), rồi bỏ phần cá nhân khỏi JSON đơn cũ (khối `P3C-STRIP`, chuỗi →
  NULL). `OrderRepository.update` trả về qua `withDeliveryView` (lệnh `update` không qua extension đọc).

Ca thử: `tests/tenant/order-recipients.test.ts` (mọi đường ghi, khoá ghép khác tổ chức, backfill 13 dạng địa chỉ, xoá
phần cá nhân khỏi nơi cũ mà màn hình vẫn đủ), `src/modules/orders/domain/__tests__/order-recipient.test.ts`.

## 48. Một hồ sơ khách — `customers.status`, `greeting_sessions.customer_id` (07/11/2026)

ADR-014 D-P2, bước **P-2** (expand). PO duyệt 07/11/2026, phương án A. Migration `20261107090000_customer_prospects`.

```prisma
enum customer_status {
  ACTIVE
  PROSPECT
}
```

- `customers.status` (`customer_status`, mặc định `ACTIVE`, index `(organization_id, status)`). `PROSPECT` = người nhận
  link Thẻ chào có SĐT mà chưa đặt đơn. Khách cũ và khách do lead tạo vẫn là `ACTIVE`.
- Khách `PROSPECT` không hiện ở danh sách, tìm kiếm, chi tiết, xuất khách, đơn của khách, báo giá và gợi ý thị trường
  (`status: "ACTIVE"` ở `customer-repository.ts`, `customer-export-query.ts`, `customer-orders-query.ts`,
  `quotation-reference-guard.ts`, `market-intelligence-repository.ts`). Console (`platform-records-repository.ts`, xuất
  dữ liệu tổ chức) vẫn thấy mọi hồ sơ.
- Thành `ACTIVE` (cùng hồ sơ, cùng `id`): khi đặt đơn hoặc để lại lead (`findOrCreateCustomer` → `activateProspect`, lấy
  tên/địa chỉ vừa nhập), hoặc khi nhân viên tạo khách cùng SĐT (`CustomerRepository.create` nâng thay vì báo trùng).
- `greeting_sessions.customer_id` (`String?`, khoá ngoại tới `customers`, `ON DELETE SET NULL`, index): khách của đơn
  (khi gắn đơn) hoặc hồ sơ theo SĐT trên link (`ensureProspectCustomer`, `src/modules/greeting-card/infra/session-customer.ts`)
  — lúc tạo link, đặt thêm đơn, Sale ghi SĐT (link công khai: gắn lúc đơn tạo xong, đơn bị chặn thì không có hồ sơ). Link
  chỉ có tên thì để trống. Khoá một cột như
  `leads.customer_id`: khoá ghép với `SET NULL` sẽ xoá cả `organization_id`; cùng tổ chức do mã ghi bảo đảm.
- Ghi kép: `customer_name`, `customer_phone` của link vẫn ghi và vẫn được đọc; bỏ ở bước contract sau.
- Backfill trong migration (khối `P2-BACKFILL`): link có đơn → khách của đơn; link chưa có đơn → khách cùng tổ chức +
  SĐT; chưa có → tạo `PROSPECT` (một dòng mỗi tổ chức + SĐT, tên ở link mới nhất, `ON CONFLICT DO NOTHING`).

Ca thử: `tests/tenant/customer-prospects.test.ts` (gồm chạy lại khối backfill của migration).

## 47. Truy cập của nhân viên nền tảng — `platform_access_logs` (06/11/2026)

ADR-013 D-I5, bước **I-2b**; D-60 (PO 06/11/2026: chủ tổ chức xem ngay trong ứng dụng — tab "Truy cập của nền tảng"
trong `/audit`, quyền `G9`; mục đích tự suy từ thao tác). Migration `20261106140000_platform_access_logs`.

```prisma
model platform_access_logs {
  id              String   @id @default(uuid())
  organization_id String
  operator_id     String
  purpose         String
  method          String
  route           String
  created_at      DateTime @default(now()) @db.Timestamptz(3)

  organization organizations @relation(fields: [organization_id], references: [id])

  @@index([organization_id, created_at])
}
```

- Thuộc tổ chức: RLS `tenant_isolation` như mọi bảng tenant (`scripts/gen-rls-policies.mjs`); đọc qua `scopedWhere`.
- Chỉ thêm dòng: trigger `platform_access_logs_append_only` (hàm `smeos_append_only_guard`, §46).
- Ghi: `recordPlatformAccess` (`src/modules/audit/use-cases/record-platform-access.ts`) ở mọi handler
  `platform/organizations/[id]/*` và `platform/orgs-data/[orgId]/*`, ngay sau khi giải phiên Console (xuất dữ liệu: sau
  khi kiểm `N1`), TRƯỚC khi đọc/ghi; ghi lỗi → yêu cầu lỗi (biện pháp bù R-2). `INSERT … SELECT … WHERE` tổ chức tồn
  tại — id sai không ghi, route vẫn 404. `purpose` là mã (`org.profile.read`, `org.records.orders.export`…); nhãn tiếng
  Việt ở `src/modules/audit/domain/platform-access.ts`, giao diện không hiện mã.
- Chặn hồi quy: `tests/unit/architecture/platform-access-guard.test.ts` (mỗi handler gọi đúng một lần).

Ca thử: `tests/tenant/platform-access-isolation.test.ts`, `src/modules/audit/domain/platform-access.test.ts`.

## 46. Nhật ký bất biến — `audit_logs`, `platform_audit_logs`, `order_events`, `job_events`, `usage` (06/11/2026)

ADR-013 D-I4, bước **I-2a** (PO duyệt ADR-013 06/11/2026; không đổi schema Prisma). Migration
`20261106130000_append_only_logs`: hàm `smeos_append_only_guard()` + trigger `<bảng>_append_only` (`BEFORE UPDATE OR
DELETE … FOR EACH ROW`) trên năm bảng:

- `UPDATE` → luôn từ chối (mọi tài khoản, kể cả chủ sở hữu).
- `DELETE` — kể cả xoá dây chuyền từ `orders` (→ `order_events`) và `generation_jobs` (→ `job_events`) — chỉ được khi
  giao dịch đã đặt `app.purge_reason` (`setPurgeReason(tx, reason)`, `src/core/tenancy/infra/purge-reason.ts`; lý do:
  `tenant_offboarding` · `test_data_cleanup` · `retention_policy`). `set_config(…, true)` chỉ sống trong giao dịch.
- `TRUNCATE` không qua trigger theo dòng (chỉ dùng ở CSDL test, `resetDatabase`).
- Rà mã 06/11/2026: ứng dụng, worker, test không sửa/xoá năm bảng này; chỉ `scripts/handover-clean-tenant.ts` và
  `prisma/seed/clean-siin-store-orders.ts` xoá — cả hai đặt lý do purge đầu giao dịch.
- Quyền: `scripts/db/create-roles.sql` thu `UPDATE, DELETE` của `smeos_app`/`smeos_worker` trên năm bảng.

Ca thử: `tests/tenant/append-only-logs.test.ts` (tự cài hàm + trigger từ tệp migration và gỡ khi xong, vì CSDL test
dựng bằng `db push`).

Còn lại của I-2 (I-2b): bảng `platform_access_logs` (D-I5) và màn hình chỉ đọc cho chủ tổ chức (D-60).

## 45. Một bảng quyết định theo tầng — `governance_decisions` (06/11/2026)

ADR-012 D-T10, bước **T-7a (expand)** — PO duyệt đổi schema 06/11/2026. Gộp ba nơi lưu "khoá / ghi đè theo tầng":

| Nơi lưu cũ | `system` | `decision_key` | `tier` · `scope` | `locked` · `value` |
|---|---|---|---|---|
| `organizations.settings.governance_matrix.<SYSTEM>` | `matrix:<SYSTEM>` | khoá mục | `CHAIN`/`STORE` (theo loại tổ chức) · `org:<id>` | ghi đè: `false` · `{enabled}`; khoá: `true` · `{enabled}` |
| `platform_settings` `governance_matrix:<SYSTEM>` | `matrix:<SYSTEM>` | khoá mục | `MOTHER` · `platform` | như trên |
| `notification_hard_locks` | `notification.hard_lock` | `<event_key>:<channel>` | `tier` · `scope_id` | `true` · `{enabled, reason}` |
| `notification_event_visibility` | `notification.visibility` | `<event_key>:<tầng được hiển thị>` | `MOTHER` · `platform` | `false` · `{visible}` |
| `integration_governance` | `integration` | `connector_key` | `tier` · `scope_id` | `true` · `{mode}` (`ALLOW_OWN` không lưu) |

```prisma
model governance_decisions {
  id           String   @id @default(uuid())
  version      BigInt   @unique @default(autoincrement())
  system       String
  decision_key String
  tier         String
  scope        String
  locked       Boolean
  value        Json?
  decided_by   String?
  decided_at   DateTime @default(now()) @db.Timestamptz(3)

  @@index([system, scope, decision_key, tier, locked, version])
  @@index([scope])
}
```

- **Chỉ thêm dòng.** Một quyết định = bộ (`system`, `decision_key`, `tier`, `scope`, `locked`); dòng hiện hành là dòng
  `version` lớn nhất (thứ tự toàn cục, không tranh chấp khi ghi đồng thời); `value` null = đã gỡ. Lưu lại đúng giá trị
  hiện hành không thêm dòng.
- **Ghi kép (T-7a).** Mọi đường ghi nơi lưu cũ ghi `governance_decisions` trong CÙNG giao dịch
  (`src/core/governance/infra/decision-log.ts`): `saveOrgGovernance`, `saveMotherGovernance`, khoá cứng thông báo
  (đặt/gỡ — dòng gỡ ghi người gỡ), `setEventVisibility`, `GovernanceRepository.set`. `PATCH /organizations/current`
  không còn nhận khoá `governance_matrix` (trước đây ghi thẳng được, bỏ qua kiểm khoá tầng trên) — 403.
- **Chép dữ liệu.** Migration `20261106100000_governance_decisions` chép mọi quyết định đang có, cùng bộ lọc với
  `parseDecisions` (6 hệ thống, khoá `^[A-Za-z0-9_.:-]{1,96}$`, giá trị boolean); dòng phạm vi dạng cũ trùng dạng mới
  gộp về dòng cập nhật sau cùng; chốt cuối so số dòng với nguồn, lệch thì cuộn lại.
- **T-7b — đọc từ bảng (không đổi schema).** Mọi đường đọc qua `currentDecisions` (`decision-log.ts`):
  `getOrgGovernance`, `getMotherGovernance`, `getUpperLayers`, `getPolicyGovernanceUpper` (ma trận); `getHardLocks`,
  `getEventVisibilityMap` (thông báo); `GovernanceRepository.listForScopes` (tích hợp). Luồng bán hàng (Thẻ chào) nhận
  quyết định riêng của tiệm qua `PolicyGovernanceUpper.own` thay cho `settings.governance_matrix`
  (`isGovernedItemEnabled(key, own, …)`); `decisionsFromSettings` bỏ. Nơi lưu cũ vẫn được ghi kép để quay lui được.
  Dòng ghi thẳng vào nơi lưu cũ (không qua ghi kép) không còn tác dụng.
- **T-7c — contract (PO duyệt 06/11/2026, sau khi T-7b #165 đã chạy ổn trên production).** Migration
  `20261106120000_governance_decisions_contract` (một giao dịch): CHỐT TRƯỚC — quyết định hiện hành của bảng phải trùng
  khớp phép chiếu nơi lưu cũ (như T-7a; ma trận so không kể `tier`; bỏ qua ma trận của tổ chức đã xoá), lệch thì in
  tối đa 20 dòng lệch rồi RAISE, không xoá gì. Sau đó `DROP TABLE` `integration_governance`, `notification_event_visibility`,
  `notification_hard_locks` + enum `integration_governance_mode`, xoá khoá `settings.governance_matrix` và các dòng
  `platform_settings` `governance_matrix:*`. Mã bỏ ghi kép; lưu ma trận khoá dòng tổ chức (`SELECT … FOR UPDATE`) hoặc
  khoá theo giao dịch (Mẹ) để hai lần lưu đồng thời chạy lần lượt. `PATCH /organizations/current` vẫn từ chối khoá
  `governance_matrix`.

Ca thử: `tests/tenant/governance-decisions.test.ts` (sau mỗi chuỗi thao tác qua route thật, quyết định hiện hành của
bảng khớp nơi lưu cũ), `tests/tenant/governance-decisions-read.test.ts` (mỗi trục: chỉ bảng mới có tác dụng),
`src/core/governance/decision-record.test.ts`, `tests/tenant/tier-consistency.test.ts`.
