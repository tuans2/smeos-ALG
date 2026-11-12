# Rà soát đồng bộ codebase ↔ tài liệu — floraos-core · LocalBudd · SocialFlow

**Ngày rà soát:** 2026-09-18
**Phạm vi:** tài liệu ↔ tài liệu · tài liệu ↔ mã · hợp đồng API chéo ba repo
**Cách làm:** đối chiếu bằng máy — trích endpoint từ `06-api-specification.md` so với `route.ts` thật; trích khối `prisma` trong `07-database-specification.md` so với `schema.prisma`; đối chiếu mã năng lực giữa `capability-catalog.ts` và đặc tả 02; quét mọi lời gọi core trong hai repo khách. Chạy thật: `npx tsc --noEmit`, `npm test`.
**Nhánh khi soát:** `fix/m01-m01b-production-ready`, cây làm việc đang bẩn.

---

## 0. Kết luận một dòng

**Chưa đồng bộ 100%.** Mã chạy tốt và tự nhất quán — `tsc` sạch, `npm test` 525/525 — nhưng bộ tài liệu Level-1 và đặc tả 02–08 đã tụt lại sau bốn đợt P16–P24, tới mức **không còn mô tả đúng hệ thống đã dựng**. Ba điểm không chỉ là lệch giấy tờ mà là lỗ thật trong mã: cổng duyệt video, phủ cách ly tenant, và bảng `catalog_links` tồn tại hai bản ở hai cơ sở dữ liệu.

| Trục | Mức đồng bộ | Đánh giá |
|---|---|---|
| Hợp đồng API chéo repo (đường đang chạy thật) | **~95%** | Mọi endpoint hai repo khách gọi đều tồn tại; cổng 3100/3000/8000 khớp |
| Mã ↔ mã trong core | **~90%** | Không route nào gác bằng mã ngoài danh mục; ba lỗ nêu ở mục 1 |
| Đặc tả 06 API ↔ route thật | **~58%** | 74/106 khớp; 32 endpoint đặc tả không có, 77 route không có trong đặc tả |
| Đặc tả 07 CSDL ↔ `schema.prisma` | **~65%** | 6 bảng doc-only, 10 bảng code-only, 4 enum lệch giá trị |
| Level-1 (V2 + TRANG_THAI §3) ↔ thực tế | **~50%** | Quyền sở hữu bốn module đã đổi mà bảng chưa đổi |

---

## 1. Chặn — ba lỗ trong chính mã nguồn

### 1.1 Cổng cách ly tenant rỗng cho 16/39 bảng

Đặc tả `07-database-specification.md` §19 viết: *"Mỗi bảng có `organization_id` phải có một trường hợp trong bộ test cách ly"*, và branch protection trên `main` lấy `npm run test:tenant` làm cổng duy nhất chặn lỗi cách ly. Đối chiếu thật:

**16 bảng thuộc tenant không xuất hiện trong bất kỳ ca thử nào của `tests/tenant/`** (đã dò cả biến thể `snake_case`/`camelCase`/số ít):

`catalog_links` · `chat_channel_integrations` · `chat_conversations` · `chat_messages` · `content_metrics` · `customer_consents` · `customer_occasions` · `order_assignments` · `order_events` · `order_items` · `pricing_rules` · `product_images` · `product_inventory` · `product_variants` · `template_overrides` · `vouchers`

Nặng hơn: **6 bảng thuộc tenant không nằm trong `TENANT_TABLES` của `tests/helpers/database.ts`**, nên không bị `TRUNCATE` giữa các ca thử — `catalog_links` · `content_metrics` · `occasions` · `product_copies` · `product_inventory` · `template_overrides`. Chính chú thích ở `database.ts:84-88` nói ra hệ quả: *"Bộ test cách ly phải bắt đầu từ một cơ sở dữ liệu rỗng, nếu không thì 'không tìm thấy' có thể là do dữ liệu sót lại chứ không do bộ gác."* Với sáu bảng này, một ca thử xanh không chứng minh được điều nó khẳng định.

Đáng chú ý là `chat_messages` và `chat_conversations` — TRANG_THAI §1 (P23) ghi `chat-channel-isolation.test.ts` 2/2 và `chat-isolation.test.ts` 3/3 "xanh thật"; hai tệp đó có tồn tại, nhưng không ca nào chạm tới tên bảng, nên phạm vi chúng phủ hẹp hơn nhãn.

*Không kiểm chạy được trong lượt này:* `npm run test:tenant` đỏ 199/200 vì không có Postgres ở `127.0.0.1:5432` — lỗi hạ tầng, không phải lỗi mã. Con số 200/200 trong TRANG_THAI chưa được lượt rà soát này xác nhận lại.

### 1.2 Hai cổng duyệt video dùng chung mã năng lực của Master Image

```
src/app/api/v1/video/jobs/[id]/approve-script/route.ts:9   requireCapability(ctx, "I2");
src/app/api/v1/video/jobs/[id]/approve-video/route.ts:9    requireCapability(ctx, "I2");
```

`I2` là `media.approve` — *"Nâng Master Image thành ảnh chính thức của sản phẩm"* (`capability-catalog.ts:174`).

TRANG_THAI §1 (P17) mô tả đây là **"Quy trình 2 cổng kiểm soát & duyệt độc lập"**, cổng 1 mã `P3`, cổng 2 mã `P4`. Thực tế: `P3` và `P4` **không tồn tại** trong danh mục 143 mã, và hai cổng không độc lập — chúng là cùng một cổng, lại là cổng của một module khác. Ai duyệt được Master Image thì duyệt luôn kịch bản và video thành phẩm, và `audit_logs` không phân biệt được ba hành động đó.

Đặc tả 06 §1 đặt luật *"Kiểm quyền bằng mã năng lực, không bằng vai giao diện"* — luật này không bị phá, nhưng tinh thần tách cổng thì có. Đặc tả 02 §363 xếp dải `P` vào nhóm chờ *"vào danh mục theo đúng pha của module chúng gác"*; M04c đã xong ở P17 mà dải `P` chưa vào.

### 1.3 `catalog_links` có hai bản, ở hai cơ sở dữ liệu, với ba hình dạng

| Nơi | Cột trạng thái | Ghi cục bộ? |
|---|---|---|
| `floraos-core/prisma/schema.prisma:990` | `is_revoked Boolean` + `revoked_by` + `created_by` | Có |
| `LocalBudd/prisma/schema.prisma:293` | `status catalog_link_status` (enum) — không có `created_by` | Có |
| `docs/dac-ta/07-database-specification.md:736` | `state` (enum `catalog_link_state`) + `label` + `filter` + `open_count` | — |

Ba hình dạng, không cái nào khớp cái nào. Enum `catalog_link_state` mà đặc tả 07 khai **không tồn tại trong cả hai schema**.

Cả hai repo đều đặt `slug @unique` — nhưng trên hai cơ sở dữ liệu tách biệt, nên tính duy nhất không có thật ở phạm vi hệ thống. Đặc tả 07 §789 nói rõ vì sao điều đó quan trọng: *"`catalog_links.slug` unique **toàn cục**, không theo tổ chức: một liên kết công khai phải giải được khi chưa biết tổ chức nào sở hữu nó."* Hai tiệm ở hai repo có thể đúc cùng một slug.

`LocalBudd/src/modules/catalog-links/infra/repository.ts` ghi thẳng vào Prisma cục bộ. Chỉ hai route đọc sang core (`[slug]/products`, `[slug]/filter-options`). Trong khi đó `ALG_SAAS_TARGET_ARCHITECTURE_V2.md:65` xếp `catalog_links` vào **thực thể lõi**, §463 ghi *"core giữ `catalog_links`"*, và `08-integration-specification.md:18` cũng liệt nó ở cột core. Luật *"engine ngoài không giữ bản sao entity lõi"* (V2 §71) đang bị phá, và không tài liệu nào ghi nhận việc đó.

### 1.4 `POST /integration/assets` — đặc tả và route mâu thuẫn trực diện

Đặc tả 06 §11.1:

```
"storage_key": null,        // core tự sinh; giá trị client gửi bị bỏ qua
"upload_token": "…",        // lấy từ POST /integration/assets/upload-url
```

Route thật (`src/app/api/v1/integration/assets/route.ts:11-16`): **không có trường `upload_token`**, và `storage_key: z.string().min(1)` — **bắt buộc**, do client gửi, rồi kiểm khớp tổ chức ở `:39`.

`POST /integration/assets/upload-url` mà đặc tả bảo đi lấy token **không tồn tại**. Bất kỳ ai hiện thực engine ngoài theo đặc tả 06 sẽ viết ra lời gọi 404 rồi gửi một thân yêu cầu bị 400.

Ba endpoint Integration khác cũng chỉ có trên giấy: `GET /integration/ai-policy` · `POST /integration/ai-requests` · `GET /integration/learning-profile`.

*Điểm sáng:* các đường **đang chạy thật** thì khớp. `LocalBudd/src/core/ports/FloraOsCoreClient.ts` gọi `/integration/products`, `/integration/products/:id/master-image`, `/integration/business-profile`, `/integration/brand-profile`, `/integration/capabilities/check`, `/integration/jobs`; `SocialFlow/backend/floraos_core.py` gọi `/integration/brand-profile`, `/integration/usage` — **cả tám đều tồn tại trong core**. Cổng `3100 / 3000 / 8000` khớp ở cả `.env`, `.env.example` và mã của cả ba repo.

---

## 2. Nặng — Level-1 không còn mô tả hệ thống đã dựng

### 2.1 Quyền sở hữu module đã đổi bốn lần mà bảng chưa đổi

| Module | V2 §44-48 · TRANG_THAI §3 nói | Thực tế trong mã |
|---|---|---|
| M04b Marketing Creative | `SocialFlow` | **`floraos-core`** — `/api/v1/media/variants*`, `workers/media_ai/jobs/variant_worker.py` (P16/P24) |
| M04c Video Studio | `SocialFlow` | **`floraos-core`** — `/api/v1/video/*`, `video_jobs`/`video_scenes`, `workers/media_ai/video/` (P17) |
| M06 Catalog & QR | `LocalBudd` | **cả hai** — core có `/c/[slug]`, `/api/v1/public/catalog/[slug]`, `catalog-links/*`; LocalBudd cũng có đủ bộ |
| M08 Customer Chat | *"(chưa đặt tên)"* · *"Chưa bắt đầu"* | **`floraos-core`** — `src/modules/chat-assistant/`, `/api/v1/chat/*` (P23) |

Mã thì thành thật hơn tài liệu: `SocialFlow/backend/m04b/routes.py:18-28` tự ghi *"Quyết định: khai tử, không vá — M04b thật … đã dựng xong trong floraos-core từ P24"*. Nhưng `ALG_SAAS_TARGET_ARCHITECTURE_V2.md` — tài liệu Level-1 có hiệu lực — và **bảng "Bốn repo" ở chính TRANG_THAI §3** vẫn gán M04b/M04c cho SocialFlow và không nhắc M08 trong danh sách của core. TRANG_THAI §3 mâu thuẫn với TRANG_THAI §1.

Đây là mục cần sửa trước, vì mọi phiên làm việc mới đọc TRANG_THAI đầu tiên và sẽ lấy bảng §3 làm bản đồ.

### 2.2 Đặc tả 07 nói core không khai `video_jobs` — core có khai

`07-database-specification.md:1008`: *"`content_queue` · `posts` · `campaigns` · `social_accounts` · **`video_jobs`** · `post_metrics` thuộc `SocialFlow`. … **Core không khai chúng**."*

`prisma/schema.prisma:1079` `model video_jobs` · `:1125` `model video_scenes`. `08-integration-specification.md:15` cũng còn xếp `video_jobs` ở cột SocialFlow.

### 2.3 `campaign_rollups` — tên bảng trong hợp đồng ghi số liệu không tồn tại

Sáu tài liệu gọi bảng này là `campaign_rollups`: `06-api-specification.md:298` (*"`POST /integration/content-metrics` ghi vào `campaign_rollups`"*), `00-PRD.md:206,232`, `V2:65,71,178`, `Checklist_Thuc_Thi.md:398`, `CHECKLIST_AI_CAPABILITIES_BUILD.md:158`, `10-ai-orchestration.md:468`.

Trong `schema.prisma` bảng tên là **`content_metrics`**. Chuỗi `content_metrics` không xuất hiện một lần nào trong `docs/`.

### 2.4 Đặc tả 06 ↔ route thật: 74/106 khớp

**32 endpoint có trong đặc tả, không có trong mã.** Phần lớn là **đổi tên hàng loạt chưa cập nhật tài liệu**:

| Đặc tả 06 | Route thật |
|---|---|
| `/customers`, `/customers/:id`, `/customers/export`, `/customers/:id/archive` (§14) | `/crm/customers*` |
| `/conversations`, `/conversations/:id`, `/conversations/:id/messages`, `/conversations/:id/handoff` (§17) | `/chat/conversations*` — `handoff` và `/conversations/settings` thì **không có** |
| `/vision/copies*` — 6 endpoint (§12) | `/product-copies*` |
| `/catalog-links/:id`, `PATCH /catalog-links/:id`, `/catalog-links/:id/qr` (§13) | `/catalog-links/:slug`; `qr` **không có** ở core |

Phần còn lại là chưa xây, đúng pha: `/analytics/*` (4), `/learning-profile` (2), `/ai-evaluations/:entity_type/:entity_id`, `/approvals` + `/approvals/batch` (§9 hàng đợi duyệt), `/products/:id/images`, `/orders/:id/delivery`.

**77 route có trong mã, không có trong đặc tả.** Đáng kể nhất: **toàn bộ M04c** — `/video/jobs`, `/video/jobs/:id`, `/video/jobs/:id/{render,storyboard,approve-script,approve-video}` — không có một dòng nào trong đặc tả 06. Cùng với đó: `/sso/refresh`, `/proxy/:path` (4 method), `/storage/:key`, `/integration-tokens*`, `/template-overrides*`, `/content-guard/validate`, `/jobs/batch`, `/media/variants/batch`, `/chat/webhooks/{facebook,zalo}`, `/chat/public/widget`, `/occasions*`, `/products/master-index`, `/organizations/current/upgrade-request`.

### 2.5 Đặc tả 07 ↔ `schema.prisma`

**Bảng doc có, schema không (6):** `campaign_rollups` · `content_features` · `conversations` · `conversation_messages` · `knowledge_chunks` · `learning_profiles`
**Bảng schema có, doc không (10):** `chat_channel_integrations` · `chat_conversations` · `chat_messages` · `content_metrics` · `flower_confusable_pairs` · `integration_tokens` · `product_inventory` · `template_overrides` · `video_jobs` · `video_scenes`

**Enum lệch giá trị — bốn cái:**

| Enum | Doc có, schema không | Schema có, doc không |
|---|---|---|
| `order_status` | — | `PROCESSING`, `DELIVERED` |
| `production_status` | `IN_PROGRESS`, `DONE` | `ARRANGING`, `QUALITY_CHECK`, `READY` |
| `delivery_status` | `RETURNED` | `DELIVERING` |
| `asset_kind` | — | `RATIO` |

**Enum doc khai mà schema không có (2):** `catalog_link_state` · `consent_state`
**Enum schema có mà doc không khai (11):** `chat_channel` · `chat_sender_type` · `consent_channel` · `customer_tier` · `integration_client` · `occasion_register` · `stock_status` · `template_family` · `video_format` · `video_stage` · `voucher_discount_type`

**Bảng lệch cột nặng** (bỏ qua trường quan hệ Prisma, vốn không thuộc phạm vi doc):

- `customers` — doc `full_name`/`note`/`branch_id`/`archived_at`; schema `name`/`notes`/`code`/`tier`/`total_spent`/`order_count`/`last_order_at`/`preferred_flowers`/`preferred_colors`/`tags`
- `customer_occasions` — doc `kind`/`label`/`day`/`month`/`year`; schema `name`/`date`/`is_recurring`/`reminder_days_before`/`recipient_name`/`notes`
- `customer_consents` — doc `state`/`purpose`/`source`/`withdrawn_at`; schema `granted` (Boolean)/`revoked_at`
- `vouchers` — doc `kind`/`value`/`valid_from`/`valid_to`; schema `discount_type`/`discount_value`/`expires_at`/`min_order_vnd`/`max_discount_vnd`/`is_used`/`order_id`
- `occasions` — doc `day`/`month`/`is_recurring`/`position`/`is_seed`; schema `register`/`sort_order`/`is_active`
- `product_copies` — doc `model`/`model_version`; schema `model_key`/`cost_usd`/`latency_ms`/`job_id`/`reject_reason`
- `assets` — schema có `approval_state`/`approved_at`/`approved_by`, doc §5 không khai, dù đặc tả 06 §11 dựa hẳn vào `approval_state = PENDING`

**Bảng `stage`/`result` theo module** (07 §343) chỉ có M01, M04a, M05, M06 — thiếu hẳn M04b (`variant_worker.py` có bốn `stage` thật: `ANALYZING`/`SMART_REFRAME`/`VERIFYING`/`GENERATING_OUTPUTS`) và M04c (enum `video_stage` 9 giá trị).

---

## 3. Mâu thuẫn nội bộ giữa các tài liệu

### 3.1 Đặc tả 07 tự mâu thuẫn ba lần về Luật 1

| Dòng | Khẳng định |
|---|---|
| `:16` | *"`users` là bảng **duy nhất** không có `organization_id`"* |
| `:963` | *"`flower_taxonomy` không có `organization_id` — đây là **ngoại lệ duy nhất** của Luật 1"* |
| `:1020` | *"**Hai bảng** cố ý không có `organization_id` … `flower_taxonomy` … `platform_audit_logs`. **Bảng thứ ba tự nhận ngoại lệ là lỗi chặn ở review**."* |

Thực tế trong `schema.prisma`: **chín** bảng không có `organization_id` — `users`, `organizations`, `role_capabilities`, `job_events`, `ai_capabilities`, `ai_models`, `video_scenes`, `flower_taxonomy`, `flower_confusable_pairs`. Sáu trong số đó (`role_capabilities`, `job_events`, `ai_capabilities`, `ai_models`, `video_scenes`, `flower_confusable_pairs`) chưa bảng nào "nêu được lý do" ở tài liệu như §1020 đòi. Phần lớn có lý do chính đáng — bảng con nối qua khoá cha, hoặc sổ đăng ký cấp nền tảng — nhưng luật viết ra là luật đếm, và nó đang bị phá sáu lần.

`platform_audit_logs` mà §1020 viện dẫn **chưa tồn tại**: nó chỉ được đề xuất trong `DASHBOARD_VAN_HANH_NEN_TANG.md` (dải `N1`–`N8`, chưa xây).

### 3.2 "Bốn bảng còn chặn" hay "Ba bảng còn chặn"

`07:1012` — *"**bốn bảng** còn chặn vì Integration API chưa có đường ghi"*
`08:38` — *"**Ba bảng** còn chặn vì bề mặt tích hợp trước đây chỉ có đường đọc"*

### 3.3 Luật 2 (tên cột tiếng Anh) bị phá ở hai bảng

`07` §1 Luật 2: *"Đặt tên `snake_case` tiếng Anh. Thuật ngữ tiếng Việt chỉ ở nhãn giao diện."*

- `flower_taxonomy` — **19 cột tiếng Việt**: `ma_loai`, `ten_chuan`, `ten_khac`, `nhom`, `nhom_hoa`, `cong_nang`, `dvt_chuan`, `so_bong_tren_dvt`, `duong_kinh_bong_cm`, `dien_tich_phu_cm2`, `ty_le_nhuy_tren_bong`, `mau_nhuy`, `kieu_moc`, `dai_mau_tu_nhien`, `dac_diem_phan_biet`, `mua_vu`, `trang_thai`, `cap_a`, `cap_b`
- `flower_confusable_pairs` — **5 cột**: `ma_cap`, `ma_loai_a`, `ma_loai_b`, `loai_a`, `loai_b`

Ngoài ra `flower_taxonomy` trong doc §16 là một bảng **hoàn toàn khác**: `canonical_id`/`name_vi`/`name_en`/`aliases`/`colors`/`season`/`price_segment`/`visual_features`/`confusable_with`/`embedding`. Không một cột nào trùng với schema thật. Cột `embedding Unsupported("vector(1536)")` và cả bảng `knowledge_chunks` (nền pgvector cho M08) chưa có trong schema.

### 3.4 Bộ máy Vision mặc định — mã đúng, ba tài liệu còn kể chuyện cũ

Mã hiện tại thống nhất và đúng với chốt nợ #83: `workers/vision/providers/registry.py:27` `MAC_DINH = "openai_structured"`, `src/modules/products/domain/vision-engine.ts:38` `VISION_ENGINE_MAC_DINH = "openai_structured"`, có ca thử khoá lại.

Nhưng:
- `TRANG_THAI.md:271` vẫn ghi *"(mặc định hiện là `openai_direct` …)"*
- `10-ai-orchestration.md:28` vẫn ghi *"Bộ máy `local_cv` … vào mặc định bằng một quyết định ghi đè có chủ đích (D5-e)"*
- `M01_FLORAOS_VISION_CODING_AGENT_GUIDE.md:267` đặt luật *"Bộ mặc định chỉ đổi bằng số đo trên bộ ảnh vàng, không chốt cứng trong tài liệu và không đổi bằng lập luận"* — trong khi nợ #83 đổi nó bằng đúng một lập luận và một quyết định của chủ sản phẩm. Hoặc luật này phải sửa, hoặc quyết định phải có số đo kèm.

Ba bản ghi cho một giá trị, hai bản sai, và bản sai nằm trong tệp mà mọi phiên đọc đầu tiên.

---

## 4. Nhẹ

- `AGENTS.md:73` ghi *"Trạng thái hiện tại: P24 … `npm test` 479/479"*. Chạy thật hôm nay: **525/525, 69 tệp**. Con số 479 đúng tại mốc P24 nhưng đang được trình bày là hiện trạng.
- `tests/tenant/README.md` bảng "Tệp | Phủ" liệt kê **4 tệp**; thư mục có **25 tệp**.
- `BO_TINH_NANG_HIEN_TRANG.md` có nhãn "HISTORICAL AUDIT SNAPSHOT 11/09" rõ ràng và trỏ TRANG_THAI làm OSOT — **đúng quy cách, không tính là lệch**. Nhưng bảng gán repo của nó (M04b/M04c → `SocialFlow`, M08 → "Chưa có repo") nay sai, và nó đang được TRANG_THAI §1 trích dẫn như một căn cứ còn hiệu lực cho mục "mở rộng khung ảnh — Chưa có".
- Thư mục `~/Projects/floraos-core` **rỗng**. Repo thật ở `~/ORGANIZED/02_PROJECTS/Active/floraos-core`. Bất kỳ phiên nào được nối vào đường dẫn thứ nhất sẽ thấy một repo trống.

---

## 5. Những gì đã kiểm và **đúng**

- **Cổng cục bộ** `3100 / 3000 / 8000` khớp giữa `.env`, `.env.example` và mã của cả ba repo.
- **Mọi endpoint hai repo khách thực sự gọi** đều tồn tại trong core (tám đường, mục 1.4).
- **Không route nào gác bằng mã năng lực ngoài danh mục** — quét 54 mã được tham chiếu trong `src/app/api`, tất cả đều có trong `capability-catalog.ts`.
- **143 mã / 39 trần cứng** khớp giữa `capability-catalog.ts`, `capability-catalog.test.ts`, `AGENTS.md` và `TRANG_THAI.md`. Đặc tả 02 §359 **cố ý không giữ hai con số này dưới dạng hằng số** và nói rõ chỉ đọc từ hai tệp mã — đây là cách làm đúng, và là lý do trục này không lệch. 18 mã đặc tả 02 nêu mà danh mục chưa có (`J7`, dải `O`, `P`, `S`) đều nằm trong danh sách chờ có kiểm soát ở §363.
- **D1 (SocialFlow đa tenant thật)** đã đồng bộ giữa `08:40` và `UNIFIED_SHELL.md:67,74` — mâu thuẫn cũ đã đóng đúng cách, có ghi lại lý do phân xử.
- **`POST /api/v1/media/background-removal`** đã đóng đúng như tài liệu ghi, trả 409 kèm đường thay thế, và giữ lại tệp có chú thích thay vì xoá lặng.
- `npx tsc --noEmit` **sạch**. `npm test` **525/525**.

**Chưa kiểm được:** `npm run test:tenant` (không có Postgres chạy ở `127.0.0.1:5432`), `pytest` của `workers/`.

---

## 6. Thứ tự sửa đề xuất

| # | Việc | Vì sao trước |
|---|---|---|
| 1 | Sửa bảng "Bốn repo" ở `TRANG_THAI.md` §3 và bảng tầng ở `V2` §44-48 theo đúng quyền sở hữu thật (mục 2.1) | Mọi phiên mới đọc tệp này đầu tiên; bản đồ sai làm hỏng mọi việc sau |
| 2 | Tách cổng duyệt video khỏi `I2` — thêm hai mã dải `P` vào danh mục, cập nhật hai route (mục 1.2) | Lỗ quyền thật, và `audit_logs` đang không phân biệt được ba hành động |
| 3 | Chốt một chủ cho `catalog_links` và gỡ bản kia (mục 1.3) | Hai nguồn sự thật cho một slug công khai; càng nhiều liên kết đã in QR thì càng khó gỡ |
| 4 | Bù 16 ca cách ly còn thiếu, thêm 6 bảng vào `TENANT_TABLES` (mục 1.1) | Cổng branch protection đang rỗng cho gần một nửa số bảng |
| 5 | Sửa `06-api-specification.md` theo bốn nhóm đổi tên + thêm mục M04c; hoặc đổi tên route về đúng đặc tả (mục 2.4) | Đặc tả API là thứ engine ngoài đọc để viết mã |
| 6 | Sửa `07-database-specification.md`: `campaign_rollups`→`content_metrics`, 4 enum, 10 bảng thiếu, và **gộp ba câu mâu thuẫn về Luật 1 thành một** (mục 2.3, 2.5, 3.1) | |
| 7 | Sửa `POST /integration/assets` — hoặc xây `upload-url`, hoặc sửa đặc tả 06 §11.1 theo route thật (mục 1.4) | |
| 8 | Xoá ba câu kể chuyện cũ về bộ máy Vision mặc định (mục 3.4) | Rẻ, và nó nằm trong tệp đọc đầu tiên |

Mục 1, 6 và 8 là sửa tài liệu, làm được ngay. Mục 2, 3, 4, 7 đụng mã và cần quyết định của anh trước.

---

## 7. Đã thực hiện — 18/09

**Phần sửa được bằng tài liệu đã sửa xong.** Đặc tả 06 và 07 nay khớp mã ở cả ba trục đối chiếu được bằng máy:

| Trục | Trước | Sau |
|---|---|---|
| Endpoint — đặc tả có, mã không | 32 | **0** *(14 mục còn lại đánh dấu CHƯA XÂY, xem RS-7)* |
| Endpoint — mã có, đặc tả không | 77 | **0** |
| Bảng — lệch hai chiều | 16 | **0** *(3 bảng M11 đánh dấu CHƯA XÂY)* |
| Enum — lệch giá trị / thiếu / thừa | 17 | **0** |
| Cách ly tenant | 22 chỗ hở | **0** — xem mục 8, thực thi RS-2 |

Danh sách việc đã làm: bảng quyền sở hữu module ở `TRANG_THAI.md` mục 3 và `ALG_SAAS_TARGET_ARCHITECTURE_V2.md` mục 2 và 12.2 · bốn nhóm endpoint đổi tên trong đặc tả 06 · mục 19 M04c và mục 20 hạ tầng mới trong đặc tả 06 · ba câu mâu thuẫn về Luật 1 gộp thành một bảng chín ngoại lệ trong đặc tả 07 · 11 enum sinh lại từ lược đồ · 7 model thay bằng bản thật · `campaign_rollups` → `content_metrics` · `conversations` → `chat_conversations`/`chat_messages` · mục 20 sáu bảng bỏ sót trong đặc tả 07 · ba câu cũ về bộ máy Vision mặc định.

**`npm run check:docs` là cách giữ cho nó không lệch lại.** `scripts/check-docs.mjs` đọc `src/app/api/v1/`, `prisma/schema.prisma` và `tests/tenant/` rồi đối chiếu ngược với hai tệp đặc tả. Nó chạy trong vài giây và nên vào CI cùng `test:tenant`.

Cách làm này chép từ chỗ duy nhất trong bộ tài liệu chưa bao giờ lệch: đặc tả 02 mục 359 **từ chối giữ con số** 143/39 và chỉ thẳng vào `capability-catalog.test.ts`. Tài liệu nào không tự nhớ thì không sai được.

*Bằng chứng cách làm này có tác dụng: trong lượt sửa hôm nay tôi tự gõ 11 enum theo trí nhớ, và `check-docs` bắt được **6 trong 11 sai giá trị** ngay lần chạy đầu — `chat_channel` thiếu bốn giá trị, `chat_sender_type` sai cả ba, `consent_channel` sai cả bốn, `occasion_register` sai hai, `voucher_discount_type` sai một, `stock_status` sai hai. Không có phép đối chiếu tự động thì cả sáu đã đi thẳng vào tài liệu.*

**Mười quyết định còn lại ở `QUYET_DINH_RS_18_09.md`** — mỗi mục có phương án, đánh đổi và ô chốt để trống.

---

## 8. Thực thi quyết định — 18/09 (tiếp)

Anh Tony đã chốt cả mười mục qua `AskUserQuestion` (xem `QUYET_DINH_RS_18_09.md`). Đã thực thi trên `floraos-core`:

- **RS-1** (thêm `P3`/`P4`, tách khỏi `I2`): thêm hai mã vào danh mục, sửa hai route VÀ hai use-case (`approve-storyboard.ts`, `approve-video-output.ts`) — soát lại phát hiện route và use-case cùng gác `I2` độc lập, sửa một chỗ không đủ. Cập nhật `capability-catalog.test.ts` (143→**146** mã, 39→**41** trần cứng) và `tests/tenant/video-studio.test.ts` (thêm `P3`/`P4` vào tập quyền cấp cho tenant thử).
- **RS-10** (sửa `Q5`/`Q6`): bản nháp quyết định trước đó của tôi tự đề xuất "đổi Q6→Q3 ở route consent" — sai, vì `Q3` đã là `crm.customer.update`. Đọc lại đặc tả 02, sửa đúng: `Q5`=xuất khách hàng (trần cứng), `Q6`=quản lý dịp, thêm **`Q9` mới** cho consent (đặc tả không hề dành sẵn mã cho consent). Sửa hai route CRM theo đó.
- **RS-9 + RS-8** (gác quyền về use-case, gác điểm bỏ sót): bốn use-case `product-copies` chuyển gác quyền từ route (`ctx.capabilities.has(...)` gõ tay) vào use-case (`requireCapability`), gác thêm hai điểm đọc trước đây không gác gì (`GET /product-copies`, `GET /product-copies/:id`). Kiểm `GET /catalog-links/:slug` thấy đây là endpoint CÔNG KHAI có chủ đích (khách quét QR, không đăng nhập) — không phải lỗ hổng, không sửa. Kiểm `POST /jobs/batch` thấy có bảng `MODULE_RUN_CAPABILITY` nhưng module lạ (ví dụ M03/M08/M11 — chưa có mã "run" chính thức) làm điều kiện gác bị bỏ qua hoàn toàn thay vì chặn — **lỗ thật, đã đóng theo hướng mặc định từ chối** (module không có trong bảng thì chặn thẳng).
- **RS-2** (ca thử cách ly tự động quét mọi bảng): `check-docs.mjs` báo 22 chỗ hở nhưng khi đọc từng ca thử thật, **14 trong 22 là báo động giả** của chính công cụ — sáu bảng chỉ thiếu đăng ký `TENANT_TABLES` (sửa thẳng), và tám bảng (`pricing_rules`, `catalog_links`, `order_items`, `order_events`, `customer_occasions`, `chat_conversations`, `chat_messages`, `chat_channel_integrations`) **đã có ca thử thật**, chỉ là ca thử gọi qua route công khai chứ không gõ lại tên bảng snake_case nên phép dò chữ của `check-docs.mjs` không thấy — đã sửa `check-docs.mjs` để nhận diện đúng (bảng `COVERED_VIA_ROUTE`, trỏ thẳng vào ca thử). Bốn bảng còn lại (`order_assignments`, `customer_consents`, `template_overrides`, `content_metrics`) có route thật đang chạy nhưng chưa từng có ca thử — thêm `tests/tenant/scoping-gaps-18-09.test.ts`. Bốn bảng cuối (`product_variants`, `product_images`, `product_inventory`, `vouchers`) đọc mã xác nhận **chưa có route/use-case nào ghi vào** (schema có, nhưng chết) — không viết ca thử cho một tính năng chưa tồn tại; đánh dấu miễn trừ tường minh trong `check-docs.mjs` (`SCHEMA_ONLY_CHUA_NOI`), không phải bỏ sót.
  *(Ca thử mới `tsc --noEmit` sạch nhưng CHƯA chạy được trên Postgres thật trong phiên này — máy không có Postgres khởi động. Chạy `npm run test:tenant` để xác nhận trước khi coi RS-2 là đóng hẳn.)*

`npx tsc --noEmit` sạch, `npm test` **525/525**, `npm run check:docs` **0 lỗi** sau các sửa trên.

- **RS-3** (core làm chủ duy nhất `catalog_links`, bỏ bảng ở `LocalBudd`): thêm ba route `/integration/catalog-links*` ở core (cùng khuôn `/integration/jobs` — nhánh SSO mang năng lực thật, gác `J1`/`J2` y hệt route phiên; nhánh token bị `requireCapability` tự chặn vì `capabilities` rỗng). Nhân lúc sửa, phát hiện và sửa luôn một lỗi có sẵn: `PATCH /catalog-links/:slug` (đổi tên/mô tả/bộ lọc) nằm nhầm trong tệp route của `/revoke` nên thực ra chạy ở `PATCH /catalog-links/:slug/revoke` — không ai gọi tới; dời về đúng chỗ.
  Bên `LocalBudd`: bỏ `model catalog_links` khỏi lược đồ, viết lại `CatalogLinkRepository` thành adapter HTTP gọi core qua `coreClientForUser(ssoToken)` (giữ nguyên cổng `ICatalogLinkRepository`, chỉ đổi `update`/`revoke` từ khoá bằng `id` sang `slug` — khoá tự nhiên mọi route đã có sẵn, core cũng dùng slug). Bộ lọc catalog hai bên khác hình dạng (`LocalBudd` phẳng một giá trị mỗi trường; core mảng + khoảng giá) — dịch hai chiều ở `FloraOsCoreClient.ts` (`catalogFiltersToCore`/`catalogFiltersFromCore`), không đổi giao diện `LocalBudd`. Trang public `/c/:slug` (ẩn danh, khách quét QR) gọi thẳng `GET /catalog-links/:slug` không xác thực của core (`getPublicCatalogLink`) — route quản trị (tạo/sửa/thu hồi/mã QR) dùng nhánh SSO có xác thực.
  `npx tsc --noEmit` của `LocalBudd` sạch sau sửa. `npm test` của `LocalBudd` không chạy được trong phiên này (thiếu binary `@rollup/rollup-linux-arm64-gnu` trên máy — sự cố môi trường có sẵn, không liên quan tới đợt sửa này).
  **Phát hiện phụ, CHƯA sửa (khác diện RS-3):** `getProductsForCatalog` phía `LocalBudd` gọi `floraOsCoreClient` — client NỀN gắn với MỘT token tích hợp cố định — nên trang catalog public trên thực tế chỉ đọc đúng sản phẩm của MỘT tổ chức bất kể slug đang xem thuộc tổ chức nào; đây là giới hạn có từ trước RS-3, chỉ dọn tham số chết chứ không sửa. Cũng còn treo: trang catalog có HAI bản render song song (core `/c/:slug` và `LocalBudd` `/c/:slug`) — RS-3 chỉ chốt ai làm chủ dữ liệu, chưa chốt ai phục vụ trang.

- **RS-5** (`flower_taxonomy`/`flower_confusable_pairs` đặt tên cột tiếng Việt): anh Tony chọn F2 — ghi ngoại lệ vào Luật 2 thay vì đổi tên 24 cột. Sửa `docs/dac-ta/07-database-specification.md`: thêm khoản ngoại lệ vào dòng Luật 2 và cập nhật đoạn diễn giải cạnh hai bảng, ghi rõ đây là quyết định đã chốt (RS-5, 18/09) chứ không còn là điểm mâu thuẫn bỏ ngỏ.
- **RS-6** (luật "bộ máy Vision mặc định chỉ đổi bằng số đo" bị phá ba lần): anh Tony chọn G3 — luật chỉ bắt buộc số đo khi **hạ** mặc định, còn **nâng** lên bộ đã qua kiểm chứng (`san_xuat`) thì chốt bằng lập luận cũng được. Sửa ba chỗ: `docs/dac-ta/00-PRD.md` (thêm khoản phạm vi vào dòng D5-d), `docs/dac-ta/10-ai-orchestration.md` (viết lại đoạn kể ba lần đổi mặc định để chỉ rõ chỉ D5-e — lần hạ — là vi phạm cổng thật; hai lần sau là nâng, không cần số đo).
- **RS-11** (thư mục `~/Projects/floraos-core` đang nối vào phiên thì rỗng hoàn toàn): anh Tony chọn "đổi thư mục kết nối sang Active". Xác nhận lại bằng `ls`/`git log` trong phiên 18/09: `~/Projects/floraos-core` vẫn 0 tệp, `~/ORGANIZED/02_PROJECTS/Active/floraos-core` là repo thật (`git log` ra commit `8d2fd45`, remote `antranhub22/floraos-core`). **Đây là việc KHÔNG sửa được từ phiên này** — nó là cấu hình "thư mục đã nối" của app Claude desktop, không phải tệp trong repo hay thứ `device_bash` có quyền đổi. Việc còn lại thuộc về anh Tony: mở app Claude desktop, bỏ `~/Projects/floraos-core` khỏi danh sách thư mục nối cho phiên floraos-core (hoặc chỉ giữ lại `~/ORGANIZED/02_PROJECTS/Active/floraos-core`), để phiên sau không còn thấy repo rỗng.

**Xác minh cuối cùng sau khi thực thi cả 10/11 mục quyết định (18/09/2026):** `floraos-core` — `npx tsc --noEmit` sạch, `npm test` 525/525, `npm run check:docs` 0 lỗi ở cả bốn trục (endpoint, bảng, enum, cách ly tenant). `LocalBudd` — `npm run typecheck` sạch; `npm test` và `npx prisma generate` không chạy được trong phiên này vì sự cố môi trường có sẵn (thiếu binary `@rollup/rollup-linux-arm64-gnu`, mạng chặn tải engine Prisma), không liên quan tới các sửa đổi của đợt này. `npm run test:tenant` không chạy được ở cả hai repo — máy không có Postgres khởi động trong phiên; cần anh Tony chạy cục bộ để xác nhận runtime trước khi coi RS-2 và RS-3 là đóng hẳn về mặt kiểm chứng (không chỉ về mặt biên dịch/tài liệu).
