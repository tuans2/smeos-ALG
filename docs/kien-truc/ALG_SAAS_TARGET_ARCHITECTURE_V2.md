# ALG SAAS — TARGET ARCHITECTURE V2

**Trạng thái:** LEVEL 1 — SYSTEM. Thay thế bản V1 (`FLORAOS_SAAS_TARGET_ARCHITECTURE.md`), nay chỉ còn trong lịch sử git tại commit `c224a0f`.
**Ngày:** 2026-09-09 · **Quyết định nền:** Đường A (repo core mới, giữ tách ba repo)
**Căn cứ:** `HARVEST_MANIFEST.md` · hồ sơ rà soát `SAAS_GAP_ANALYSIS.md` và `D5_D6_PHUONG_AN.md` đã xoá khỏi cây làm việc, còn trong git tại `bb39810` (xem `TRANG_THAI.md` mục 2)

---

## 1. Thay đổi so với V1

V1 đặt nguyên tắc **"Upgrade, not rebuild"** trên giả định rằng `FloraOS` là baseline sản xuất tiến hoá được. Rà soát mã bác bỏ giả định đó:

- 21/28 tệp trong `analyzer/` import `openpyxl`/`pandas` — **Excel là cấu trúc dữ liệu**, không phải định dạng xuất. Chỉ 2/28 tệp chạm OpenAI.
- Webapp gọi lõi phân tích bằng `subprocess.Popen` rồi **parse stdout**.
- Nguồn sự thật của Product Master nằm ở ba tệp Excel trong thư mục đồng bộ, bảo vệ bằng **một khoá ghi toàn cục 15 phút** thuộc về *thư mục*, không thuộc tổ chức.
- Tiêu chí nghiệm thu số 3 của chính `BAN_GIAO.md`: *"Bấm chạy khi đang mở `02_KET-QUA.xlsx` → hệ thống chặn"*.

Đó là **công cụ desktop khoác giao diện web**. Không có đường mang ràng buộc ấy vào SaaS đa tenant.

Đồng thời rà soát phát hiện điều V1 không biết: **ba repo đã độc lập xây ba mảnh khác nhau của chính kiến trúc này**, và LocalBudd — chứ không phải ALG — mới là repo gần đích nhất.

### 1.1 Nguyên tắc nền mới

> **Dựng core mới. Thu hoạch tối đa. Không tiến hoá tại chỗ.**
>
> Thang ưu tiên (theo `LocalBudd/ORG_docx/08`): **REUSE > EXTEND > ADAPTER > BUILD**.
> Mọi hạng mục phải được xếp hạng trước khi viết dòng mã đầu tiên. Xếp hạng BUILD cho thứ đã tồn tại ở một trong ba repo là một lỗi cần chặn ở review.

### 1.2 Cái gì thay thế "Current Code Preservation" (§18 của V1)

V1 §18 (10 quy tắc bảo tồn mã cũ) **bị bãi bỏ**. Thay bằng:

1. Luật nghiệp vụ được thu hoạch **phải đi kèm test khoá nó**; test xanh trên core mới trước khi coi luật đó đã chuyển xong.
2. `FloraOS` v1 **đóng băng tính năng** kể từ ngày phê duyệt tài liệu này. Chỉ sửa lỗi chặn vận hành.
3. Không migrate dần. Cắt sang hệ mới **một lần** (mục 14).
4. Không repo nào được sinh thêm bảng trùng với entity lõi (mục 4.1).

---

## 2. Bốn repo và quyền sở hữu

| Nhóm | Repo | Trách nhiệm | Trạng thái |
|---|---|---|---|
| **0 — Core** | **`floraos-core`** | Org · Workspace · Membership · RBAC · cách ly tenant · BusinessProfile · BrandProfile · Product Master · Asset · GenerationJob · Usage · AuditLog · Customer · Order · Integration API · M01 · M01b · M02 · M03 · M04a · **M04b** · **M04c** · **M06** · **M07 (viết nội dung, Content Engine)** · **M08** · M09 · M10 · M11 | Đang xây |
| 1 — Legacy | `FloraOS` *(hiện tại)* | Phục vụ AVI GIFT tới ngày cắt. Đóng băng tính năng | Nghỉ hưu |
| 2 — Storefront | `LocalBudd` | M05 Landing Page · UI soạn Business Profile. M06 Catalog & QR **có bản thứ hai ở đây song song với bản ở core** — chủ sở hữu chưa chốt, xem **RS-3** | Đang phát triển |
| 3 — Marketing | `SocialFlow` | M07 Social Publishing (đăng bài, kết nối tài khoản, `content_metrics`) · số liệu nền tảng cho M11. **M04b, M04c và phần viết nội dung của M07 đã chuyển về core** (P16/P24, P17, P27) | Đang phát triển |
| 4 — Messaging | — | M08 Customer Chat **đã dựng trong `floraos-core`** ở P23 (`src/modules/chat-assistant/`, `/api/v1/chat/*`); không tách repo thứ tư nữa | Xong |

### 2.1 Ranh giới sở hữu dữ liệu — luật cắt

V1 §2.1 nói *"không repo ngoài nào nhân bản mô hình dữ liệu lõi"* nhưng không định nghĩa "lõi", nên LocalBudd đã hợp lệ xây `products`, `product_assets`, `media_assets`, `generation_jobs`. Luật thay thế:

> **Core sở hữu entity mà NHIỀU HƠN MỘT module đọc.**
> **Engine sở hữu entity chỉ module của nó đọc.**

| Thuộc `floraos-core` (canonical) | Thuộc `LocalBudd` | Thuộc `SocialFlow` |
|---|---|---|
| `organizations` · `workspaces` · `memberships` · `roles` · `branches` | `pages` · `page_versions` · `layouts` | `content_queue` · `posts` |
| `business_profiles` · `brand_profiles` | `design_directions` · `design_contracts` | `campaigns` · `signals` · `content_plans` |
| `products` · `product_variants` · `product_analyses` · `pricing_rules` | `publish_records` *(trang)* | `post_metrics` · `weekly_metrics` · `content_insights` |
| `assets` · `generation_jobs` · `usage` · `audit_logs` | | `social_accounts` *(credential theo org)* · `video_jobs` |
| `product_copies` · `occasions` · `customers` · `customer_occasions` · `customer_consents` · `vouchers` | | |
| `orders` · `order_items` · `order_assignments` · `order_events` | | |
| `learning_profiles` · `campaign_rollups` · `catalog_links` | | `post_metrics` *(số liệu gốc từng nền tảng)* |
| `ai_capabilities` · `ai_models` · `ai_policies` · `ai_requests` · `ai_evaluations` | | |
| `flower_taxonomy` · `knowledge_chunks` · `content_features` | | |

**Sổ đăng ký AI thuộc core dù không module nào "sở hữu" nó.** Nó là entity mà mọi module ở cả ba repo đọc, nên luật cắt đặt nó ở core theo đúng nghĩa của luật. Engine ngoài đọc chính sách qua Integration API và ghi số đo về; nó không giữ bản sao tự quyết (mục 13). `flower_taxonomy` là ngoại lệ duy nhất của Luật 1 — tri thức ngành, không mang `organization_id`, và lý do ghi ở đặc tả 07 mục 16.

**Hai chiều của luật này.** Chiều thuận đã có tên: engine ngoài không giữ bản sao entity lõi. Chiều ngược cũng bị ràng buộc — core giữ `campaign_rollups` là **bộ nhớ đệm dựng lại được** từ số liệu của `SocialFlow`, mang cột nguồn, và không bao giờ là nguồn sự thật của số liệu nền tảng. Phép nối ROI thuộc core vì nó cần `orders`, thứ chỉ core có.

**Hệ quả bắt buộc:** LocalBudd bỏ `products`, `product_assets`, `media_assets`, `generation_jobs`, `projects` khỏi schema của nó và đọc core qua API (mục 13). Đây là công việc có tên trong lộ trình (P7), không phải việc tuỳ nghi.

### 2.2 Thứ bậc tài liệu

```
LEVEL 1 — SYSTEM
   ALG_SAAS_TARGET_ARCHITECTURE_V2.md   (tài liệu này)
   Thắng tuyệt đối về: sở hữu repo, đa tenant, RBAC, GenerationJob, Usage,
   Asset, Review & Approval, Experience/trial, thứ tự pha hệ thống.
        ↓
LEVEL 2 — MODULE
   ALG_AI_Vision_Architecture_V2_Canonical.md      (M01)
   M04_ALG_PRODUCT_IMAGE_OPTIMIZER_FULL.md     (M04a, và phạm vi M04b)
   LocalBudd/ORG_docx/01–08                        (M05, M06)
   Thắng về: interface nhà cung cấp, phân loại, pipeline nội bộ, Identity
   Guard, ngưỡng kỹ thuật, quyết định trong module.
        ↓
LEVEL 3 — PROCESS
   Coding Agent Guides · AGENTS.md
   Không bao giờ thắng về nội dung kỹ thuật.
```

**Hồ sơ đối chiếu** đứng ngoài ba cấp trên và không thắng về nội dung kỹ thuật — chúng ghi trạng thái, không ghi quyết định: `BO_TINH_NANG_HIEN_TRANG.md` (bộ tính năng đối chiếu với mã thật) · `TRANG_THAI.md` · `RA_SOAT_THU_HOACH.md` · `RA_SOAT_DONG_BO_BA_REPO.md`.

**Luật ràng buộc:** Level 2 không được đè ràng buộc Level 1. Agent gặp xung đột **dừng và báo**, không tự chọn.

---

## 3. Khuôn kiến trúc

Chép từ `LocalBudd/src/`, chuẩn hoá lại phần đang không nhất quán.

```
floraos-core/
├── prisma/schema.prisma          nguồn sự thật lược đồ
├── src/
│   ├── core/
│   │   ├── ports/                VisionAnalyzer · LLMProvider · StorageProvider
│   │   │                         · QueueProvider · PublisherProvider
│   │   │                         · SegmentationProvider · ImageProvider
│   │   │                         · VideoProvider · SpeechProvider
│   │   │                         · EmbeddingProvider
│   │   ├── ai/                   cổng AI: giải năng lực, chính sách, định tuyến,
│   │   │                         chấm điểm, sổ chi phí (đặc tả 10)
│   │   ├── tenancy/              ngữ cảnh org, bộ gác truy vấn
│   │   └── rbac/                 danh mục năng lực, dải A–T (76 thu hoạch R2 + mã mới)
│   ├── modules/<tên>/
│   │   ├── domain/               thực thể + luật, KHÔNG import hạ tầng
│   │   ├── use-cases/            điều phối
│   │   ├── infra/                repository, Prisma
│   │   └── adapters/             ra ngoài
│   └── app/api/v1/               API-first, có phiên bản
└── tests/
```

**Ba chuẩn hoá so với LocalBudd hiện tại:**
1. Thống nhất `use-cases` (LocalBudd đang lẫn `use-cases` / `usecases` / `repositories` / `services`).
2. `domain/` không được import Prisma — đó là điều kiện để test luật nghiệp vụ không cần cơ sở dữ liệu.
3. Mọi module đủ bốn thư mục; `mapping-engine` của LocalBudd hiện chỉ có `adapters` — không lặp lại.

**Giữ lại từ LocalBudd:** `circuit-breaker` cho lời gọi AI, tiền tố `/api/v1/`, và mẫu tách endpoint `approve` khỏi endpoint sinh kết quả (`/pages/[id]/approve`) — mẫu này đúng §7 và phải áp cho mọi module.

**Quy ước đặt tên:** lược đồ dùng `snake_case` tiếng Anh (theo LocalBudd). Mã nguồn dùng tiếng Anh. *Lý do: khuôn được chép là của LocalBudd; trộn `PascalCase` tiếng Việt của ALG vào sẽ tạo lược đồ song ngữ không ai điều hướng được.* Thuật ngữ nghiệp vụ tiếng Việt giữ trong nhãn giao diện và tài liệu, không vào lược đồ.


### 3.1 Ranh giới TypeScript / Python (quyết định D6-1)

Core web và API là TypeScript. M01 (phân tích ảnh) và M04a (tối ưu ảnh) là Python. Hai bên nối nhau **qua bảng `generation_jobs`, không qua HTTP và tuyệt đối không qua tiến trình con**.

```
core (TS)                          worker (Python)
────────────                       ────────────────
tạo generation_jobs  ──┐
  organization_id      │  Postgres   ┌── SELECT … FOR UPDATE SKIP LOCKED
  status = PENDING     ├────────────►│   LISTEN/NOTIFY đánh thức
  payload              │             └── cập nhật stage → result → status
ghi usage tại enqueue ─┘                  ghi assets
đọc trạng thái ◄─────────────────────────────┘
```

**Luật:**
1. Worker **không nhận `organization_id` từ đâu khác ngoài dòng job**. Không suy từ dữ liệu ảnh, không lấy từ tham số client.
2. Worker cập nhật `stage` khi đổi bước, `result` khi có phán quyết, `status` sau cùng. Ba trục theo mục 7.
3. `usage` ghi ở **điểm tạo job phía core** (mục 9), không ghi ở worker — hạn mức phải chặn trước khi job vào bảng.
4. Cổng `QueueProvider` khai ở mục 3 bọc cơ chế này. Đổi sang Redis về sau là thay adapter sau cổng, không sửa module.
5. HTTP nội bộ TS → Python **chỉ** cho lời gọi ngắn đồng bộ (kiểm tra sức khoẻ, tra một phép đo). Không chạy job qua HTTP — mục 7 cấm chặn HTTP cho thao tác AI dài.
6. **Cấm tuyệt đối `subprocess.Popen` + parse stdout** dưới mọi hình thức. Đây là seam của FloraOS v1 và là một trong những lý do dựng lại.

**Bố trí repo:** `floraos-core/` chứa cả hai — `src/` (Next.js/TS) và `workers/` (Python), dùng chung một Postgres và một lược đồ Prisma. Worker đọc lược đồ sinh sẵn, không tự khai bảng.

---

## 4. Mô hình dữ liệu lõi

```
User → Membership → Organization → Workspace → Branch
                          ↓
              Shared Business Data Layer
         (BusinessProfile · BrandProfile · Product Master · Asset)
                          ↓
              Independent Business Modules
                          ↓
            GenerationJob · Usage · AuditLog
```

**Thực thể lõi:** `users` · `organizations` · `workspaces` · `memberships` · `roles` · `branches` · `business_profiles` · `brand_profiles` · `products` · `product_variants` · `product_images` · `product_analyses` · `product_copies` · `occasions` · `pricing_rules` · `assets` · `generation_jobs` · `usage` · `audit_logs` · `customers` · `customer_occasions` · `customer_consents` · `vouchers` · `orders` · `order_items` · `order_assignments` · `order_events` · `learning_profiles` · `campaign_rollups` · `catalog_links` · `conversations` · `conversation_messages` · `ai_capabilities` · `ai_models` · `ai_policies` · `ai_requests` · `ai_evaluations` · `flower_taxonomy` · `knowledge_chunks` · `content_features`

**Dữ liệu cá nhân của người mua là một lớp riêng.** `customers` và họ hàng của nó mang tên, số điện thoại, địa chỉ, ngày kỷ niệm của khách hàng cuối. Chúng chịu thêm ba ràng buộc mà dữ liệu sản phẩm không chịu: cơ sở đồng ý riêng (`customer_consents`, tách khỏi consent dữ liệu huấn luyện), quyền xoá thuộc về chính khách hàng cuối, và không trường định danh nào đi qua nhà cung cấp AI — nội dung nhắc mua sinh từ dịp và sản phẩm, phần định danh ghép ở tầng gửi.

**Luật an toàn tenant:** mọi bản ghi thuộc tenant BẮT BUỘC mang `organization_id`. Không ngoại lệ, kể cả bảng tra cứu.

---

## 5. Đa tenant và cách ly

| Yêu cầu | Cách thực hiện |
|---|---|
| Mọi bản ghi có chủ | `organization_id` bắt buộc; kiểm ở tầng repository, không phải ở route |
| API xác thực quyền truy cập tenant | Ngữ cảnh org lấy từ phiên đăng nhập, **không bao giờ** từ tham số client |
| Đường dẫn lưu trữ theo tenant | `org/<organization_id>/<product_id>/<asset_id>.<ext>` — thay cấu trúc `product-images/<danh-mục>/<mã>.jpeg` của ALG |
| Job giữ ngữ cảnh tenant | `organization_id` là cột bắt buộc của `generation_jobs`, truyền suốt tới worker |
| Webhook/callback ngoài phân giải đúng tenant | Token callback mang định danh org đã ký |
| Không khoá toàn cục | **Bỏ hoàn toàn `he_thong.giu_khoa()`.** Đồng thời hoá bằng giao dịch cơ sở dữ liệu, không bằng tệp khoá |
| Mã API AI | Xem quyết định mở D2 (mục 17) |
| Kiểm chứng | Bộ test cách ly tenant chạy trong CI: mỗi endpoint bị thử với ngữ cảnh org khác và phải trả về không tìm thấy |

---

## 6. Xác thực và phân quyền

**Thu hoạch R2:** chép bảng 76 mã năng lực từ `FloraOS/floraos-web/src/lib/maChucNang.ts` (A1–A7, B1–B16, C1–C28, D1–D17, E1–E8) kèm `tests/maChucNang.test.ts`.

**Mã mới của core** nằm ở dải F trở đi, tách khỏi dải thu hoạch A–E để phần chuyển từ v1 luôn đối chiếu được nguyên vẹn:

| Dải | Nhóm năng lực | Module |
|---|---|---|
| A–E | Thu hoạch nguyên vẹn từ v1 — truy cập, phân tích ảnh, tạo thẻ và chào giá, cấu hình nghiệp vụ, hệ thống | M01 · M02 · M10 |
| F | Tổ chức, thành viên, token tích hợp | nền tảng |
| G | Asset và job | nền tảng |
| H | Phân tích ảnh và sinh dữ liệu bán hàng của sản phẩm | M01 · M01b |
| I | Tối ưu ảnh sản phẩm | M04a |
| J | Kênh bán — catalog, landing, đăng bài, QR | M05 · M06 · M07 |
| K | Trải nghiệm | workspace demo |
| L | Sản phẩm và giá | M02 · M03 |
| N | Vận hành nền tảng, phạm vi `PLATFORM` | console vận hành |
| O | Nội dung và đăng bài | M07 |
| P | Ảnh và video marketing | M04b · M04c |
| Q | Khách hàng và nhắc mua lại | M09 |
| R | Đơn hàng và vận hành | M10 |
| S | Phân tích hiệu quả và học | M11 |
| T | Trợ lý hội thoại | M08 |

**Con số của danh mục sinh từ mã nguồn, không sinh từ tài liệu.** `capability-catalog.ts` cùng `capability-catalog.test.ts` là nguồn duy nhất; bảng ở đặc tả 02 mục 3 sinh lại từ đó chứ không sửa tay. Giá trị tại 09/12 là **119 mã, 34 trần cứng** (`U1`–`U4` vào ở đợt AI-1); danh mục đích khi cả Tuyến B và Tuyến C xong là **159 mã, 48 trần cứng**, và mã của một dải chỉ vào danh mục ở đúng pha của module nó gác.

**Giữ nguyên cơ chế cắt ba lớp** — đây là thứ ALG làm đúng và hiếm:

```
mặc định theo vai  →  bảng công tắc trong cấu hình  →  TRẦN CỨNG
                                                       (cắt sau cùng)
```

18 mã thu hoạch có trần cứng, tổng cả danh mục là 32. Trần cứng cắt **sau** bảng công tắc, nên không đường nào từ giao diện hay cơ sở dữ liệu mở được nó. Luật này chuyển sang core nguyên vẹn.

**Cặp năng lực tách bắt buộc ở M01:** `H1` chạy phân tích ↔ `H3` ra phán quyết (duyệt và từ chối dùng chung một mã, vì phán quyết gồm cả hai chiều — tách ra sẽ dựng được một vai duyệt được mà không bỏ được, thứ không có nghĩa trong vận hành) ↔ `H4` chọn bộ máy phân tích cho cả tổ chức. `H4` có trần cứng `dieu_hanh`: đổi bộ máy đổi chất lượng dữ liệu của mọi lượt phân tích về sau, nên nó không phải một công tắc thao tác mà là một quyết định cấp tổ chức.

**Ba mở rộng bắt buộc:**

1. **Phạm vi org và branch.** Quyền không còn là `(vai, mã)` mà là `(vai, mã, phạm vi)` với phạm vi ∈ {organization, branch}. Chuỗi Chain cần Sale chỉ thấy chi nhánh mình, Điều hành thấy toàn tổ chức.
2. **Vai là bản ghi, không phải enum.** Bỏ `enum Role` của ALG (còn mang giá trị di sản `MANAGER`). Vai tối thiểu: `Experience User` · `Admin/Điều hành` · `Sale` · `Điều phối`.
3. **Tách `*.approve` khỏi hành động sinh kết quả.** Chạy job và duyệt kết quả là hai năng lực khác nhau, không bao giờ gói chung.

```
product.read · product.create · product.update · product.approve
pricing.read · pricing.manage
vision.analyze         (M01 — chạy phân tích)
vision.engine.manage   (M01 — chọn bộ máy phân tích cho cả tổ chức)
media.optimize         (M04a — chạy job tối ưu)
media.approve          (M04a — nâng Master Image thành ảnh chính thức)
catalog.create · catalog.publish
landing.create · landing.publish
catalog.qr.manage
product.copy.generate   (M01b — sinh tên, mô tả, thẻ, dịp, phân khúc giá)
product.copy.approve    (M01b — ghi phần bán hàng vào Product Master)
creative.compose        (M04b — soạn biến thể trên Master Image đã duyệt)
creative.approve        (M04b)
video.generate          (M04c)
video.approve           (M04c)
content.generate        (M07)
content.approve         (M07)
content.schedule · content.autoapprove.manage
customer.read · customer.update · customer.export
order.read · order.create · order.assign · delivery.manage
analytics.read · learning.profile.manage
conversation.reply · conversation.ai.manage
```

**Mỗi loại đầu ra AI mang theo đúng một cặp chạy ↔ duyệt.** Thêm một engine sinh nội dung mà không thêm cặp của nó là cách nhanh nhất để Luật 3 mất hiệu lực trên đúng phần dữ liệu đi ra ngoài công khai.

---

## 7. Kiến trúc Job

**Thu hoạch E2:** lấy `job_status` + `job_step` từ `LocalBudd/prisma/schema.prisma`, **thêm trục thứ ba**.

```
Request → GenerationJob → Queue/Worker → AI/External → Result → Persist → Notify UI
```

Ba trục **không được gộp thành một enum**:

```
status    ← TOÀN HỆ THỐNG, giống hệt ở mọi module
              PENDING → PROCESSING → COMPLETED / FAILED / CANCELLED

stage     ← THEO MODULE, dẫn thanh tiến trình, tự do theo module
              M04a: ANALYZING | DETECTING | ISOLATING | ENHANCING
                    | BACKGROUND | COMPOSING | VERIFYING | GENERATING_OUTPUTS

result    ← PHÁN QUYẾT NGHIỆP VỤ, chỉ module có cổng an toàn
              M04a: SAFE | GOOD | WARNING | REJECTED
```

> **Kết quả bị từ chối KHÔNG phải job lỗi.** Cổng an toàn từ chối nghĩa là job chạy đúng và đi tới phán quyết: `status = COMPLETED`, `result = REJECTED`. Ánh xạ nó thành `FAILED` làm hỏng retry (chạy lại cho cùng phán quyết) và làm sai kế toán sử dụng. `FAILED` chỉ dành cho hỏng kỹ thuật — timeout, crash, lỗi nhà cung cấp.

`CANCELLED` bắt buộc hỗ trợ: người dùng huỷ được job còn `PENDING`.

**Bền vững:** trạng thái job nằm ở Postgres, không ở RAM (ALG giữ `LUOT: dict` trong bộ nhớ, mất khi khởi động lại). Worker tách khỏi tiến trình web. Không chặn HTTP cho thao tác AI dài.

**Giữ lại từ FloraOS:** trải nghiệm nhật ký theo dòng qua SSE — đó là phần FloraOS làm tốt và người dùng đã quen. Chép mô hình *nhật ký cộng dồn đọc lại được từ vị trí bất kỳ*, bỏ phần parse stdout.

---

## 8. Asset

**Thu hoạch E1:** bảng `assets` của SocialFlow đã có `parent_asset_id`, `sha256`, `origin`, `provider`, `cost_usd`, `metadata`, `state`, `aspect_ratio`, `thumb_path`. Lấy nguyên, thêm phần còn thiếu.

```
assets
├── organization_id        ← THÊM
├── product_id
├── parent_asset_id        (đã có — chính là source_asset_id của V1 §15.1)
├── type · state · storage_key · aspect_ratio · thumb_path
├── version                ← THÊM
├── provider · model · model_version     ← model/version THÊM
├── pipeline_version       ← THÊM
├── parameters · prompt
├── sha256 (input/output hash)
├── quality_score · identity_score       ← THÊM
├── generated_flags        ← THÊM (không bao giờ mặc định ngầm)
├── cost_usd
└── created_at
```

**Loại asset:** ảnh gốc · ảnh đã phân tích · ảnh đã tăng cường · **master image** · biến thể marketing · ảnh catalog · ảnh landing page · ảnh và video social.

**Dẫn xuất marketing đăng ký về core.** `SocialFlow` giữ bản ghi làm việc của riêng nó trong lúc soạn, nhưng một creative hay một video đã hoàn tất thì được đăng ký vào `assets` của core qua Integration API, mang `parent_asset_id` trỏ về Master Image đã duyệt. Lý do: catalog, landing page và thư viện nội dung đều đọc chúng, nên theo luật cắt ở mục 2.1 chúng thuộc core. Bảng asset thứ hai làm nguồn sự thật là đúng cái bẫy mà mục 2.1 được lập ra để chặn.

**Asset gốc bất biến.** Asset dẫn xuất là phiên bản mới hoặc asset mới — không bao giờ ghi đè tệp nguồn. `version` là cơ chế lịch sử duy nhất; module không được dựng bảng phiên bản song song.

---

## 9. Usage và sẵn sàng thu phí

Chưa triển khai thanh toán ở giai đoạn này, nhưng kiến trúc phải đỡ được.

```
usage
├── organization_id
├── user_id
├── feature          vision.analyze · product.copy.generate · media.optimize
│                    · creative.compose · video.generate · content.generate
│                    · catalog.generate · landing.generate · social.publish …
├── job_id
├── quantity
├── status
├── cost_credit
└── created_at
```

**Một bảng Usage duy nhất, không phải một bảng mỗi module.** Mọi module ở cả ba repo ghi vào cùng bản ghi này, phân biệt bằng `feature`. Không repo nào được dựng bảng usage/credit riêng.

**Hạn mức chặn tại điểm vào hàng đợi, không chặn trong module.** Hạn mức Experience (mục 11.1) kiểm với `usage` **trước khi** `generation_jobs` được tạo. Module vượt hạn mức không bao giờ tới được worker. Mọi module gọi cùng một dịch vụ hạn mức.

*Ghi chú thu hoạch:* ALG đã có mô hình chi phí dùng được — `uocPhi.ts` (ước phí lượt chạy) và `YeuCauChay` (lượt vượt ngưỡng chi tiêu chờ duyệt). SocialFlow đã có `cost_usd` ở `assets` và `video_jobs`. Cả hai gộp vào bảng này.

---

## 10. Review & Approval

**Thu hoạch E4** từ `qa_results` của LocalBudd, tổng quát hoá.

```
INPUT → PROCESS → GENERATED RESULT → USER REVIEW → EDIT → APPROVE → PERSIST
```

Đầu ra AI **không** tự động thành dữ liệu nghiệp vụ chính thức trừ khi được cấu hình rõ ràng. Kết quả đã duyệt trở thành đầu vào dùng lại được cho module khác. Duyệt là một năng lực riêng (mục 6).

---

## 11. Loại workspace

### 11.1 Experience

Workspace demo tạm, để người dùng mới trải nghiệm với đầu vào tối thiểu.

**Nạp sẵn:** BusinessProfile mẫu · BrandProfile mẫu · sản phẩm mẫu · quy tắc giá mẫu · catalog mẫu · dữ liệu marketing mẫu.

Người dùng chỉ cung cấp phần **động**: ảnh sản phẩm, tên sản phẩm, thông tin đơn giản. **Không** bắt dựng business profile đầy đủ.

```
Vào Experience → Tạo/nạp workspace demo → Tải ảnh → Phân tích AI
→ Xem kết quả → Review → Approve → Gợi ý thông minh chức năng kế
→ Người dùng chọn → Review/Approve
```

Không tự động chạy hết mọi chức năng tính phí — mỗi chức năng phải chọn riêng.

**Hạn mức trial** cấu hình được: `trial_count` · `trial_limit` · `trial_reset_at` · `trial_status`. Thi hành ở tầng Usage (mục 9).

### 11.2 Single Shop / Brand
Một tổ chức là một cơ sở kinh doanh. Vai: Admin/Điều hành, Sale. RBAC mở rộng đỡ vai tương lai.

### 11.3 Chain / Flower Delivery Network
```
Organization
├── Central Operation
├── Branch A · Branch B · Branch C …
```
Vai: Điều hành, Sale, Điều phối. Đỡ nhiều sale, nhiều điều phối, nhiều chi nhánh, quản lý tập trung, truy cập cấp chi nhánh và cấp tổ chức. Mô hình quyền phải đỡ **cả hai phạm vi** (mục 6).

---

## 12. Module

Mười ba đơn vị triển khai. M04 tách ba ở ranh giới Master Image: trước nó là sự thật về sản phẩm, sau nó là sức bán của ảnh và video.

### 12.1 Năm Engine

Bốn engine đầu là cách nhóm năng lực theo chuỗi giá trị của cửa hàng, không phải một tầng triển khai mới: mỗi engine gồm những module đã có mã riêng, và ranh giới sở hữu dữ liệu ở mục 2.1 không đổi vì cách nhóm này. Engine thứ năm khác hẳn bốn engine kia — nó là một tầng thật, và mọi engine còn lại gọi AI qua nó (mục 19).

```
       ảnh bó hoa
            │
   ┌────────▼────────┐
   │  VISION ENGINE  │  M01 phân tích · M01b sinh dữ liệu bán hàng
   └────────┬────────┘
            │  Product Master đã duyệt
   ┌────────▼────────┐
   │ CREATIVE ENGINE │  M04a Master Image · M04b ảnh marketing · M04c video
   └────────┬────────┘
            │  Master Image đã duyệt + biến thể theo kênh
   ┌────────▼─────────┐
   │ MARKETING ENGINE │  M07 nội dung & đăng bài · M05 landing · M06 catalog
   └────────┬─────────┘
            │  số liệu hiệu quả từng bài, từng kênh, từng sản phẩm
   ┌────────▼────────┐
   │ LEARNING ENGINE │  M11 phân tích hiệu quả · hồ sơ phong cách của tổ chức
   └────────┬────────┘
            │  hồ sơ phong cách quay lại làm đầu vào cho ba engine trên
            └──────────────────────────────────────────────►
```

```
        ┌──────────────────────────────────────────────┐
        │  AI ORCHESTRATION ENGINE                     │
        │  năng lực · sổ đăng ký mô hình và giấy phép  │
        │  định tuyến · thác nghiệm · dự phòng         │
        │  chấm điểm · sàn quyền riêng tư · sổ chi phí │
        └──────────────────────────────────────────────┘
          ▲ mọi lời gọi AI của bốn engine trên đi qua đây
```

Vòng khép lại ở Learning Engine là điều phân biệt một hệ điều hành với một bộ công cụ: `learning_profiles` là entity của core đúng vì cả M01b, M04b và M07 đều đọc nó.

**AI Orchestration Engine là tầng phải có, không phải tầng nên có.** Bốn engine trên nói ALG làm gì với AI; engine này nói ALG gọi AI thế nào, và nó là chỗ duy nhất biết mô hình nào đang chạy, tốn bao nhiêu, cho chất lượng nào, và được phép chạm dữ liệu nào. Không có nó thì tên nhà cung cấp nằm rải trong mã nghiệp vụ của mười ba đơn vị triển khai ở ba repo, và mỗi lần thị trường mô hình đổi là một lần sửa mã nghiệp vụ. Đặc tả ở `../dac-ta/10-ai-orchestration.md`.

Năm module còn lại không thuộc engine nào vì chúng không sinh nội dung — chúng là phần nghiệp vụ mà bốn engine phục vụ: M02 giá, M03 tra cứu, M08 hội thoại, M09 khách hàng, M10 đơn hàng.

### 12.2 Bảng module

| Mã | Tên | Engine | Repo | Hạng thu hoạch |
|---|---|---|---|---|
| **M01** | Product Image Analysis | Vision | `floraos-core` | **REUSE R1** hợp đồng AI 40KB + **EXTEND E5/E6** engine đếm & màu. Bỏ toàn bộ lớp Excel |
| **M01b** | Product Sales Data — tên, mô tả, thẻ, dịp, phân khúc giá | Vision | `floraos-core` | **BUILD**. Đọc lượt phân tích đã duyệt, sinh phần câu chữ; cổng duyệt riêng |
| **M02** | Product Cost & Pricing | — | `floraos-core` | **REUSE R3/R4/R5** kèm test bất biến hai phía. Quy tắc giá theo tổ chức |
| **M03** | Product Search / KB | — | `floraos-core` | Xây lại trên Postgres; logic lọc thu hoạch từ `locTraCuu.test.ts` |
| **M04a** | Product Image Optimization | Creative | `floraos-core` | **BUILD** theo spec 1.159 dòng. Identity Guard là cổng cứng |
| **M04b** | Marketing Creative — xoá nền, đổi nền, mở rộng khung, retouch, watermark, biến thể | Creative | **`floraos-core`** *(đổi từ `SocialFlow` ở P16/P24)* | **ĐÃ XÂY** trong core: `POST /api/v1/media/variants` (`I4`/`I5`), `workers/media_ai/jobs/variant_worker.py`, cổng Subject Integrity. Bản ở SocialFlow đã khai tử 09/17 |
| **M04c** | Video Studio — Reel, TikTok, Story, slideshow, motion quảng cáo | Creative | **`floraos-core`** *(đổi từ `SocialFlow` ở P17)* | **ĐÃ XÂY** trong core: `/api/v1/video/jobs*`, bảng `video_jobs`/`video_scenes`, `workers/media_ai/video/`. Adapter HeyGen/Veo thu hoạch từ SocialFlow sang. Cổng duyệt còn dùng chung mã `I2` — xem **RS-1** |
| **M05** | Landing Page Generator | Marketing | `LocalBudd` | Giữ nguyên; bỏ bảng trùng, đọc core qua API |
| **M06** | Catalog Generator & QR | Marketing | **cả `floraos-core` lẫn `LocalBudd`** — chưa chốt, xem **RS-3** | **ĐÃ XÂY HAI LẦN**: core có `/c/[slug]`, `/api/v1/public/catalog/[slug]`, `/api/v1/catalog-links*` và bảng `catalog_links`; LocalBudd có bộ tương đương và bảng `catalog_links` riêng |
| **M07** | Content & Social Publishing | Marketing | **viết nội dung ở `floraos-core`** *(đổi từ `SocialFlow` ở P27)* · đăng bài + số liệu vẫn ở `SocialFlow` | **BUILD** trong core: brief từ dữ liệu tổ chức thật + chuỗi agent Strategist→Writer→Critic→Rewriter (thay `/api/m07/generate`, vốn viết mỗi kênh bằng một prompt không đọc brief); **EXTEND E7** giữ nguyên ở SocialFlow: adapter nền tảng, lịch đăng, `content_metrics` |
| **M08** | Customer Chat | — | **`floraos-core`** *(đổi từ "chưa có repo" ở P23)* | **ĐÃ XÂY**: `src/modules/chat-assistant/`, `/api/v1/chat/*`, bốn tầng engine, năm kênh, mã `T1`–`T4` |
| **M09** | Customer & Repurchase | — | `floraos-core` | **BUILD** |
| **M10** | Orders & Operations | — | `floraos-core` | **EXTEND** — 28 mã `C1`–`C28` và luồng chào giá/điều phối của v1 là nguồn thu hoạch |
| **M11** | Analytics & Learning | Learning | `floraos-core` · số liệu gốc ở `SocialFlow` | **EXTEND** `post_metrics`/`content_insights`; **BUILD** phép nối ROI và vòng học |

**M01 — Product Image Analysis.** Vào: ảnh sản phẩm, tên tuỳ chọn. Ra: nhận diện hoa/cấu phần, số lượng, cấu trúc, thuộc tính, màu, kích thước, độ tin cậy, dữ liệu sản phẩm có cấu trúc. Kết quả phải xem và sửa được; kết quả đã duyệt cập nhật Product Master.

Ba tổng đếm `flower_count` · `bud_count` · `damaged_count` nằm trong hợp đồng theo `QUY_UOC_DEM.md`, và chúng là trường bộ ảnh vàng chấm điểm. Chúng cộng từ `bom` sau khi nhận đáp ứng, không hỏi mô hình.

Kết quả đi tới một trong hai phán quyết, cả hai cần `H3`: **duyệt** ghi Product Master, **từ chối** đóng bản ghi lại mà không chạm Product Master. Cả hai ghi `audit_logs`, cùng với mọi lượt sửa (`product.analysis_edit`) — `product_analyses.edited` chỉ giữ bản mới nhất, nên nhật ký kiểm toán là nơi duy nhất còn lịch sử ai sửa gì lúc nào.

Bộ máy chạy phân tích chọn được ở cấp tổ chức — xem mục 17.1.

**M04a — Product Image Optimization.** Nguyên tắc chi phối: *Tăng cường sản phẩm, không tái sinh sản phẩm.* Nhận dạng sản phẩm — số lượng, màu, hình dáng, tỉ lệ tương đối — là bất biến; chỉ ánh sáng, độ nét, nhiễu, cân bằng trắng, nền và bố cục được đổi. **Product Identity Guard** chạy như cổng cứng bắt buộc sau tăng cường, so vân tay sản phẩm trước/sau bằng hợp đồng phân tích của M01. Phán quyết `SAFE`/`GOOD`/`WARNING`/`REJECTED`; `REJECTED` thì giữ ảnh gốc, không trả ảnh tăng cường. Tăng cường chạy **một lần** ra Master Image; các tỉ lệ khác đến từ Smart Reframe, không chạy lại AI.

**M04a ở core, không ở SocialFlow** vì Identity Guard gọi M01 hai lần mỗi ảnh — giữ cạnh M01 tránh vòng gọi liên repo trong SLA xử lý, và đầu ra của nó là `assets` + `products`, entity lõi.

**Luật M04b và M04c:** không bao giờ chạy lại tăng cường sản phẩm, không bao giờ đổi nhận dạng sản phẩm. Cả hai soạn **lên trên** một Master Image đã duyệt. Thay đổi chạm vào chính sản phẩm thuộc M04a và phải qua Identity Guard.

Hệ quả cho yêu cầu "một ảnh gốc ra 20–50 biến thể": biến thể là tổ hợp **nền · bố cục · khung · chữ chồng · watermark** áp lên cùng một Master Image, không phải một lượt sinh lại bó hoa. Chúng không gọi lại lớp tăng cường và không cần Guard lần nữa, vì chính sản phẩm không đổi. Một biến thể muốn sửa ánh sáng hay hình dáng bó hoa là một lượt M04a mới, có Guard và có cổng duyệt riêng của nó.

**M04c dựng cảnh, không sinh sản phẩm.** Chuyển cảnh, zoom, nhạc, phụ đề, giọng đọc, CTA và logo là lớp phủ lên Master Image và các tỉ lệ đã sinh từ Smart Reframe. Mô hình video không được nhận lệnh tạo hình bó hoa; khung đầu và khung cuối luôn là ảnh đã duyệt.

**M07 đọc sản phẩm thật.** Nội dung sinh ra gắn với một bản ghi Product Master và một Master Image đã duyệt, không gắn với một chủ đề rời. Đây là điều kiện để câu chữ nói đúng loại hoa, đúng số cành và đúng giá — và cũng là ranh giới phân biệt hệ điều hành ngành hoa với một công cụ viết bài tổng quát.

**M07 viết nội dung ở core, không ở SocialFlow (P27, 25/09/2026)** vì cùng lý do M04a/M04b/M04c ở core: viết bài cần đọc `product_analyses`, `commercial_passport`, `brand_profiles`, `business_profiles` và kịch bản Chặng 05 — dữ liệu lõi, cùng tổ chức, cùng phiên. `SocialFlow` chỉ còn nhận bài đã duyệt để đăng và ghi `content_metrics` — không viết bài nữa; `/api/m07/generate` (mỗi kênh một prompt, không đọc dữ liệu tổ chức) ngừng dùng.

**Độc lập module:** mọi module phải chạy được độc lập. `User → Product Image Analysis` phải hoạt động mà không cần Landing Page hay Catalog. Nhưng module dùng dữ liệu chung khi có sẵn, để giảm nhập liệu trùng.

---

## 13. Integration Layer

```
floraos-core  ──  Integration API (/api/v1, có phiên bản, xác thực máy-máy)
                        │
     ┌──────────────────┼──────────────────┬─────────────────┐
     ↓                  ↓                  ↓                 ↓
LocalBudd Adapter  SocialFlow Adapter  Chat Adapter    (tương lai)
M05 · M06          M04b · M07          M08
```

Core **phơi ra để đọc**: BusinessProfile · BrandProfile · Product Master · Asset (gồm Master Image và các tỉ lệ) · GenerationJob · Usage · hồ sơ phong cách · kiểm quyền.

Core **nhận ghi qua đúng ba đường hẹp**, không nhiều hơn:

| Đường ghi | Ai gọi | Vì sao nó phải tồn tại |
|---|---|---|
| Đăng ký asset dẫn xuất | `SocialFlow` (M04b, M04c) | Creative và video đã hoàn tất là tài sản nhiều module đọc; không có đường này thì engine ngoài buộc phải giữ bảng asset thứ hai làm nguồn sự thật |
| Ghi số liệu hiệu quả nội dung | `SocialFlow` (M07) | Phép nối ROI cần `orders`, thứ chỉ core có; số liệu phải đi về chỗ có mẫu số |
| Ghi mức dùng phát sinh ngoài core | cả hai engine | Một bảng `usage` duy nhất cho toàn hệ thống (mục 9) |
| Ghi số đo mỗi lời gọi mô hình | cả hai engine | Sổ chi phí và chất lượng ở một chỗ, để bộ định tuyến có dữ liệu (mục 19) |

Ba đường đầu chỉ nhận **kết quả đã hoàn tất**, không nhận bản nháp và không nhận dữ liệu chờ duyệt. Đường thứ tư không mang dữ liệu nghiệp vụ nào — chỉ số đo về chính lời gọi: mô hình, chi phí, độ trễ, điểm chất lượng. Mọi đường khác vẫn là đọc.

Chiều đọc có thêm một mục cho nền AI: engine ngoài đọc **chính sách AI của tổ chức** (năng lực được phép, mô hình đủ điều kiện, ngưỡng, sàn quyền riêng tư) và cache nó. Không đọc được thì dùng bản cache gần nhất, không tự nới chính sách — một engine tự quyết mô hình nào được dùng là một engine có thể gửi ảnh khách tới một nhà cung cấp chưa ai soát.

**Bắt buộc:**
- Xác thực máy-máy theo tổ chức; engine ngoài không bao giờ tự khai `organization_id`.
- API có phiên bản (`/api/v1/`) ngay từ đầu — LocalBudd đã theo lối này.
- Engine ngoài **không** giữ bản sao entity lõi (mục 2.1).
- Core không ghép chặt vào chi tiết cài đặt của engine ngoài.

### 13.1 Ma trận chọn công nghệ AI — bắt buộc trước khi chọn nhà cung cấp

Module nào gọi mô hình AI hoặc dịch vụ AI ngoài phải hoàn thành và được chủ sản phẩm ký duyệt ma trận này **trước khi** triển khai.

| Năng lực | Ứng viên OSS | Phương án thương mại | Giấy phép | Yêu cầu GPU | Benchmark | **Soát cách ly tenant** | Sẵn sàng production |
|---|---|---|---|---|---|---|---|

**Soát cách ly tenant là bắt buộc**, không tuỳ chọn: nhà cung cấp chạy trên worker và GPU dùng chung, nên mỗi ứng viên phải được đánh giá xem dữ liệu của tổ chức này có rò sang job của tổ chức khác không — qua cache còn nóng, phiên bền, lịch sử prompt, hay mặc định dùng dữ liệu để huấn luyện phía nhà cung cấp.

**Ma trận là nơi điền lần đầu; sổ đăng ký mô hình là nơi các giá trị đó sống.** Một mô hình chỉ chạy được trong production khi hàng của nó trong `ai_models` đủ bốn ô: giấy phép, được dùng thương mại, lãnh thổ, phạm vi sử dụng cho phép. Luật này áp cho cả thành phần không phải mô hình — cấu hình build FFmpeg khoá theo giấy phép và có một hàng riêng, vì bản cơ bản và các thành phần tuỳ chọn không cùng điều kiện.

---

## 14. Chuyển AVI GIFT sang hệ mới

Dữ liệu production hiện **rất nhỏ**: `01_NHAP-LIEU.xlsx` 320KB, `02_KET-QUA.xlsx` 862KB, 14 thư mục ảnh. Đây không phải bài toán dữ liệu lớn.

```
FloraOS v1 (đóng băng, vẫn chạy)
        │
        │  adapter nhập MỘT CHIỀU (thu hoạch A3: excel_parser.py, ket_qua_phan_tich.py)
        ↓
floraos-core — AVI GIFT là tổ chức đầu tiên
        │
        ↓
   cắt một lần → FloraOS v1 ngừng
```

**Luật:** đồng bộ một chiều, Excel → core. Không bao giờ ghi ngược. Không chạy song song lâu — đó là cái bẫy đắt nhất của mọi cuộc thay nền. Ngày cắt được chọn khi core đủ chức năng cho công việc hằng ngày của Sales và Điều phối, đo bằng chính bảng nghiệm thu trong `BAN_GIAO.md`.

---

## 15. Lộ trình

Ba tuyến. **Tuyến A** dựng nền đa tenant và bộ module sản phẩm lõi; nó chặn mọi thứ khác. **Tuyến B** dựng bộ tính năng hoàn chỉnh cho cửa hàng hoa trên nền đó. **Tuyến C** dựng nền AI, cắt ngang cả hai tuyến kia. Số pha của Tuyến A giữ nguyên để checklist và nhật ký nghiệm thu đã có không phải đánh số lại.

### 15.1 Tuyến A — nền tảng và module lõi

| Pha | Việc | Phụ thuộc | Ước lượng |
|---|---|---|---|
| **P0** | Dựng `floraos-core` theo khuôn mục 3. Chép `LocalBudd/ORG_docx/01–08` làm chuẩn tài liệu | — | 1 tuần |
| **P1** | **Organization · Workspace · Membership · Branch · cách ly tenant** — trước mọi thu hoạch khác | P0 | 2–3 tuần |
| **P2** | **RBAC** — thu hoạch 76 mã + phạm vi org/branch + vai thành bản ghi + tách `*.approve` | P1 | 1–2 tuần |
| **P3** | **Asset + GenerationJob + Usage trong một đợt** (§9: hạn mức kiểm tại điểm enqueue → cùng đường mã) | P1 | 2–3 tuần |
| **P4** | **BusinessProfile + BrandProfile** (thu hoạch E3 từ `brand_config`) | P1 | 1 tuần |
| **P5** | **M01** — hợp đồng AI + engine đếm + engine màu trên nền mới | P3 | 2–3 tuần |
| **P6** | **M02 + M03** — engine giá kèm bất biến; tìm kiếm trên Postgres | P5 | 2 tuần |
| **P7** | **Integration Layer**; LocalBudd bỏ bảng trùng, đọc core qua API; adapter SocialFlow | P3, P4 | 2–3 tuần |
| **P8** | **Nhập dữ liệu AVI GIFT** (mục 14) | P4, P5, P6 | 1 tuần |
| **P9** | **M04a** Identity Guard theo spec — *chạy song song được với P7/P8* | P3, P5 | 3–4 tuần |
| **P10** | **Experience Mode** | P2, P3 | 2 tuần |
| **P11** | **Cắt sang hệ mới**; FloraOS v1 ngừng | P8, P10 | 1 tuần |
| **P12** | Hardening — bảo mật, observability, hiệu năng, hồi quy | tất cả | 2 tuần |

**Tổng thô Tuyến A: 5–6 tháng** với một đội nhỏ, P9 chạy song song.

### 15.2 Tuyến B — bộ tính năng hoàn chỉnh

Bảy pha đầu là MVP: chủ cửa hàng chụp ảnh bó hoa và nhận về catalog, ảnh quảng cáo, video, bài viết, lịch đăng, landing page. Bốn pha sau mở phần vận hành và phần học.

| Pha | Việc | Phụ thuộc | Ước lượng | MVP |
|---|---|---|---|---|
| **P13** | **M04a đợt hai** — tăng cường ảnh thật thay chỗ giữ vị trí, Smart Reframe bốn tỉ lệ, màn bắt đầu một lượt tối ưu | P9 đợt một | 3–4 tuần | ✓ |
| **P14** | **M01b** — hai trường hợp đồng `phong_cach`/`dip_su_dung`, sinh tên · mô tả · thẻ · phân khúc giá, cổng duyệt `H5`/`H6`, bảng `product_copies` | P5 | 2 tuần | ✓ |
| **P15** | **Ba đường ghi của Integration API** — đăng ký asset dẫn xuất, số liệu nội dung, mức dùng (mục 13). Mở khoá bốn bảng còn lại của `LocalBudd` | P7, P13 | 1–2 tuần | ✓ |
| **P16** | **M04b** — xoá nền, đổi nền, mở rộng khung, retouch, watermark, biến thể theo kênh trên Master Image đã duyệt | P13, P15 | 3–4 tuần | ✓ |
| **P17** | **M04c** — sáu khuôn đầu ra video, lớp dựng cảnh, `organization_id` trên `video_jobs`, usage về core | P15, P16 | 3–4 tuần | ✓ |
| **P18** | **M07 cho ngành hoa** — nội dung sinh từ Product Master và Master Image thật, adapter Zalo OA, lịch đăng và thư viện nội dung, công tắc tự duyệt theo thời hạn. *Phần sinh nội dung chuyển về `floraos-core` ở **P27** (25/09/2026) — P18 chỉ còn đúng cho adapter nền tảng, lịch đăng, `content_metrics`* | P15, P16, Đợt 3 nhóm E | 3–4 tuần | ✓ |
| **P19** | **M06** — catalog số, bộ lọc theo dịp/màu/loại hoa/bộ sưu tập, bộ sưu tập chiến dịch, `catalog_links` và QR | P15 | 2–3 tuần | ✓ |
| **P20** | **M11** — số liệu hiệu quả về core, phép nối ROI, hồ sơ phong cách và vòng học | P18, P19, P22 | 3 tuần | |
| **P21** | **M09** — khách hàng, ngày đặc biệt, nhắc mua lại, voucher, cơ chế đồng ý cho dữ liệu cá nhân | P2, P3 | 3 tuần | |
| **P22** | **M10** — đơn hàng, trạng thái sản xuất, phân công thợ cắm, giao hàng và SLA, in phiếu, lời nhắn thiệp | P6, P21 | 4–5 tuần | |
| **P23** | **M08** — trợ lý hội thoại trả lời bằng catalog của chính cửa hàng | P19, P21, P22 | 3–4 tuần | |

**Điều kiện chặn thứ tự của Tuyến B:** không module nào của Creative Engine hay Marketing Engine được sinh nội dung từ một ảnh chưa qua Identity Guard và chưa được duyệt. P13 vì vậy đứng trước P16 và P17, không phải song song.

**Chạy song song được:** P14 với P13. P19 với P16. P21 với P16 và P17 — M09 không chạm engine nào.

### 15.3 Tuyến C — nền AI

Bốn đợt, mã `AI-1` đến `AI-4`. Chúng không đánh số theo dải P vì chúng cắt ngang mọi pha chứ không nối tiếp pha nào: `AI-1` và `AI-2` chặn P16, P17 và P18, trong khi `AI-4` phải chờ P20.

| Đợt | Việc | Phụ thuộc | Ước lượng | Chặn |
|---|---|---|---|---|
| **AI-1** | **Cổng AI và hai sổ đăng ký** — `ai_capabilities`, `ai_models` kèm bốn ô giấy phép, chính sách theo tổ chức, mười cổng nhà cung cấp, bộ định tuyến năm ràng buộc, sổ `ai_requests`. Mọi lời gọi AI đang có chuyển sang đi qua cổng | P3, P5 | 3–4 tuần | P16 · P17 · P18 |
| **AI-2** | **Chấm điểm, thác nghiệm, dự phòng** — điểm theo từng năng lực, ngưỡng chấp nhận, thác chỉ leo lên, chuỗi dự phòng không vượt sàn quyền riêng tư, `needs_review` nối vào hàng chờ duyệt | AI-1 | 2–3 tuần | Go-live P16 · P17 · P18 |
| **AI-3** | **Tri thức ngành hoa** — `flower_taxonomy` từ danh mục 86 loài và bảng cặp dễ nhầm đã có, `knowledge_chunks` với `pgvector`, truy hồi kèm thứ bậc nguồn sự thật | P5 | 2–3 tuần | P23; nâng chất lượng P14 và P18 |
| **AI-4** | **Sự kiện miền và vòng học** — sự kiện là gợi ý chứ không phải lệnh chạy, `content_features`, bốn pha học | AI-1, P20 | 2 tuần | — |

**AI-1 đứng trước P16 vì P16 là lần đầu ALG gọi một loại nhà cung cấp mới.** Làm P16 trước AI-1 nghĩa là tên nhà cung cấp ảnh đi vào mã của `SocialFlow` trước khi có cổng, và rút nó ra sau đó đắt hơn đặt đúng chỗ ngay từ đầu — đây chính là cái giá mà hệ v1 đã trả một lần với `subprocess` và Excel.

**So với V1:** bỏ pha "Existing Core Migration" (không còn migrate mã cũ); tách Usage ra khỏi pha 7 muộn màng của V1 và gộp vào P3 cùng job; thêm P8 và P11 mà V1 không có.

---

## 16. Tiêu chí nghiệm thu

**SaaS** — nhiều tổ chức dùng đồng thời · dữ liệu cách ly (có bộ test CI chứng minh) · quyền đúng · một tổ chức chứa nhiều chi nhánh.

**Experience** — bắt đầu với thông tin tối thiểu · dữ liệu demo có sẵn · đi hết chức năng lõi qua các bước dẫn dắt · hạn mức có giới hạn và đặt lại được.

**Dữ liệu** — BusinessProfile nhập một lần · Product Master dùng lại được xuyên module · kết quả AI cập nhật được dữ liệu đã duyệt · module chia sẻ dữ liệu mà không ghép chặt · **không repo nào giữ bản sao entity lõi**.

**Module** — cả mười ba đơn vị chạy độc lập. M04a: Identity Guard chặn được một thay đổi sản phẩm mô phỏng, ảnh gốc được giữ. M04b và M04c: soạn trên Master Image đã duyệt mà không đổi nhận dạng sản phẩm.

**AI/Job** — thao tác dài dùng job · job có trạng thái quan sát được trên ba trục · job lỗi retry an toàn · `COMPLETED/REJECTED` không bị coi là lỗi · kết quả được lưu.

**Chuyển đổi** — AVI GIFT vận hành được trên core với đúng bảng nghiệm thu của `BAN_GIAO.md` · dữ liệu Excel đã nhập đủ · FloraOS v1 ngừng mà không mất việc nào.

**Bộ tính năng hoàn chỉnh** — một chủ cửa hàng tải lên ảnh một bó hoa và, không rời shell, nhận về: bản ghi sản phẩm có tên và mô tả · Master Image cùng bốn tỉ lệ · ít nhất một bộ biến thể marketing · một video ngắn · bài viết cho ba kênh · một mục trong lịch đăng · một trang catalog có QR. Mỗi bước sinh ra một mục chờ duyệt thật, và không bước nào chạy tự động sau bước trước.

**Học** — sau hai mươi bài đăng có số liệu, hồ sơ phong cách của tổ chức đổi được ít nhất một tham số soạn nội dung, và đổi đó truy được về số liệu đã sinh ra nó.

**Nền AI** — không mã nguồn nào ngoài `adapters/` import SDK của một nhà cung cấp, kiểm được bằng một lượt quét trong CI · đổi mô hình cho một năng lực làm được bằng một hàng trong sổ đăng ký cộng một lần đo, không sửa module nào · mọi mô hình đang bật đủ bốn ô giấy phép · một lời gọi tra được ngược ra mô hình, chi phí, độ trễ và điểm chất lượng · một lời gọi ở mức `sensitive` không có đường nào ra nhà cung cấp bên ngoài, kể cả qua bước dự phòng · nhà cung cấp mặc định sập mà tính năng vẫn chạy bằng đường dự phòng hoặc dừng sạch với credit hoàn lại, không treo.

---

## 17. Quyết định mở — chủ sản phẩm chốt

| # | Quyết định | Chặn pha | Khuyến nghị |
|---|---|---|---|
| ~~**D1**~~ | **ĐÃ CHỐT 09/09 — SocialFlow nhận `organization_id` trên mỗi lời gọi, không tự quản lý tổ chức. Chốt lại 09/10 (D1-b): đa tenant THẬT** — `organization_id` có mặt trên mọi bảng SocialFlow sở hữu, sáu agent lọc theo tổ chức, điều phối chạy lô song song theo tổ chức. Cách hiểu "worker đơn tenant" của bản 09/09 không còn hiệu lực; nghĩa đang chạy trong mã là nghĩa đúng | — | — |
| ~~**D2**~~ | **ĐÃ CHỐT 09/09 — khoá nền tảng, tính credit theo tổ chức.** Tổ chức không mang khoá riêng ở bản này | — | — |
| ~~**D3**~~ | **ĐÃ CHỐT 09/09 — không tính phí.** Credit trừ lúc enqueue được hoàn lại; `cost_usd` thật vẫn ghi để đối soát nội bộ. **Mở rộng 09/11 (D3-b):** ba diện được hoàn, luật ở `usage/domain/refund-policy.ts` — Guard từ chối (như D3 gốc) · job bị huỷ khi còn `PENDING` (chưa lời gọi nhà cung cấp nào phát sinh) · job `FAILED` vì lỗi kỹ thuật (nền tảng hỏng, và chạy lại sinh một lượt tính phí mới nên không hoàn là thu tiền hai lần). `COMPLETED` với `LOW_CONFIDENCE` KHÔNG hoàn — đó là kết quả thật kèm cảnh báo | — | — |
| ~~**D4**~~ | **ĐÃ CHỐT 09/09 — đóng băng từ 09/09, không ngoại lệ** | — | — |
| ~~**D5**~~ | **ĐÃ CHỐT 09/09 — D5-c: cổng ở mức Hợp đồng JSON.** Adapter GPT-4o làm trước (thu hoạch R1 nguyên vẹn); adapter Florence-2 + SAM2 làm sau, đổi khi thắng trên bộ ảnh vàng theo ma trận 13.1. **Mở rộng 09/11 (D5-d):** ba adapter cùng tồn tại, tổ chức chọn dùng bộ nào qua `H4`. Cổng nghiệm thu để đổi MẶC ĐỊNH giữ nguyên — tự chọn là để thử, không thay phép đo | — | Xem 17.1 |
| **D7** | **CHỐT 09/11 — ba bộ máy thu cùng một mức credit.** `vision.analyze = 1` bất kể bộ nào chạy, dù chi phí thật chênh nhau nhiều lần. Bảng giá theo bộ máy là quyết định kinh doanh, chưa có mô hình bán hàng thật | — | Mở lại cùng D2 |
| ~~**D6**~~ | **ĐÃ CHỐT 09/09 — D6-1: Postgres làm hàng đợi.** Worker Python lấy việc từ `generation_jobs` bằng `SELECT … FOR UPDATE SKIP LOCKED` + `LISTEN/NOTIFY`; HTTP nội bộ chỉ cho lời gọi ngắn đồng bộ | — | Xem 3.1 |

| ~~**D8**~~ | **CHỐT 09/11 — bộ tính năng hoàn chỉnh là phạm vi sản phẩm.** Mười ba đơn vị triển khai ở mục 12.2, nhóm theo bốn engine ở mục 12.1. Đóng băng tính năng ở mục 1.2 điều 2 áp cho `FloraOS` v1, không áp cho core | — | — |
| ~~**D9**~~ | **CHỐT 09/11 — MVP là bảy pha P13–P19.** Thứ tự ưu tiên theo đúng chuỗi "chụp ảnh → catalog, ảnh, video, bài viết, lịch đăng, landing". CRM, đơn hàng, hội thoại và phân tích nâng cao mở sau | — | — |
| ~~**D10**~~ | **CHỐT 09/11 — video vào MVP.** Ghi đè có chủ đích hai câu "ngoài phạm vi bản này" trước đó (video, Marketing Creative Engine). Căn cứ: `SocialFlow` đã có `video_jobs`, adapter HeyGen/Veo và chi phí thật ghi sẵn, nên đây là EXTEND chứ không phải BUILD | — | — |
| ~~**D11**~~ | **CHỐT 09/11 — tự duyệt theo thời hạn chỉ áp cho nội dung đăng bài.** Công tắc cấp tổ chức, gác bằng `O7` trần cứng Điều hành, tắt theo mặc định, mỗi lượt ghi `audit_logs` với người bật công tắc là người chịu trách nhiệm. Hết thời hạn mà công tắc tắt thì bài quay về hàng chờ, không tự đăng. Không áp cho kết quả phân tích, Master Image, giá, hay dữ liệu khách hàng | — | — |
| ~~**D12**~~ | **CHỐT 09/11 — Integration API mở đúng ba đường ghi** (mục 13): đăng ký asset dẫn xuất, số liệu hiệu quả nội dung, mức dùng. Đây là câu trả lời cho việc bốn bảng còn lại của `LocalBudd` bị chặn từ P7 vì không có đường ghi nào | — | — |

| ~~**D15**~~ | **CHỐT 09/11 — năng lực trước, mô hình sau.** Mã nghiệp vụ gọi một năng lực đã đăng ký, không gọi một nhà cung cấp. Mọi lời gọi AI đi qua cổng AI; không route, use-case, agent hay script nào gọi thẳng SDK nhà cung cấp. Mô hình là cấu hình trong sổ đăng ký, không phải mã | — | — |
| ~~**D16**~~ | **CHỐT 09/11 — cổng AI là một lớp trong `floraos-core`, không phải dịch vụ thứ tư.** `src/core/ai/` và `workers/ai/`, dùng chung sổ đăng ký trong Postgres. Một dịch vụ cổng riêng đứng giữa core và worker sẽ là đúng đường HTTP mà D6-1 cấm, hoặc một hàng đợi thứ hai. Engine ngoài giữ cổng AI của riêng nó, đọc cùng sổ đăng ký và cùng chính sách qua Integration API | — | — |
| ~~**D17**~~ | **CHỐT 09/11 — bộ định tuyến bị bó năm ràng buộc:** chỉ chọn trong số mô hình đã đo trên bộ ảnh vàng · chính sách của tổ chức (`H4`) là trần chứ không phải gợi ý · mô hình chốt vào `payload` lúc tạo job, worker không tra lại · thác nghiệm chỉ leo lên, không bao giờ hạ chất lượng để tiết kiệm · sàn quyền riêng tư cắt sau cùng, kể cả ở bước dự phòng. D5-c không đổi: máy không tự đổi mặc định bằng lập luận | — | — |
| ~~**D18**~~ | **CHỐT 09/11 — không mô hình nào vào production khi thiếu một trong bốn ô giấy phép**: giấy phép, được dùng thương mại, lãnh thổ, phạm vi sử dụng cho phép. Áp cả cho thành phần không phải mô hình — cấu hình build FFmpeg có hàng riêng, vì bản cơ bản và thành phần tuỳ chọn không cùng điều kiện | — | — |
| ~~**D19**~~ | **CHỐT 09/11 — không thêm hạ tầng cho nền AI.** `pgvector` trên chính Postgres đang dùng, không cơ sở dữ liệu vector riêng. Hàng đợi vẫn là `generation_jobs`, không Redis (D6-1). Kho tệp vẫn tương thích S3 | — | — |

**Còn mở**

| # | Quyết định | Chặn pha |
|---|---|---|
| **D13** | Cơ sở pháp lý và hình dạng cơ chế đồng ý cho dữ liệu cá nhân của khách hàng cuối, gồm quyền xoá thuộc về chính khách hàng. Điều kiện chặn go-live của M09 và M10, không chặn việc dựng lược đồ | P21 |
| **D14** | Bảng giá `cost_credit` cho các `feature` mới — sinh ảnh biến thể, sinh video, sinh nội dung. Chi phí thật của một video chênh hai bậc so với một ảnh, nên D7 (thu cùng một mức) không mở rộng sang được — **CHỐT v1 25/09/2026** (PO giao agent đề xuất): định giá tương đối theo bốn nguyên tắc ở `src/modules/usage/domain/pricing.ts` — 1 credit ≈ một lượt gọi một mô hình; đường nhà cung cấp ảnh = cục bộ + 1; thu theo đường thật đã chạy (lùi cục bộ → hoàn chênh); một lần bấm = một lần thu. Tỷ giá credit ↔ VND vẫn thuộc D2; xem lại con số sau 30 ngày có `cost_usd` thật (nợ #151) | — (đã chốt v1) |
| **D20** | Ngưỡng chấp nhận của từng năng lực ngoài `AIC-10`. Ngưỡng của Identity Guard đã chốt (0,95 và 0,90); các năng lực còn lại chưa có dữ liệu có đáp án để đặt ngưỡng, nên chúng chạy bằng giá trị tạm có ghi nợ, không bằng một con số trông hợp lý | AI-2 |

### 17.1 D5 — quyết định: cổng ở mức Hợp đồng JSON (D5-c)

Interface Vision **không** khai theo `detect()/segment()/recognize()` như `M01` mục 5 bản cũ. Cổng là:

```
port VisionAnalyzer:
    analyze(image, context) -> ProductAnalysis     // đúng JSON Contract, M01 mục 8
```

Ba adapter đứng sau cổng này, đăng ký ở `workers/vision/providers/registry.py`. Không module nào import thẳng một lớp adapter; worker cầm khoá bộ máy lấy từ dòng job và hỏi sổ đăng ký.

| Khoá | Tên hiển thị | Cách chạy | Ảnh rời hạ tầng |
|---|---|---|---|
| `openai_structured` | Đầy đủ | Đo bảng màu tại chỗ (`color_engine`, thu hoạch R1) → gửi ảnh kèm bảng màu đo được và `Prompt.md` → một hoặc hai lượt, đồng thuận trung vị qua `count_engine.trung_vi` | Có |
| `openai_direct` | Gọn | Gửi thẳng ảnh kèm `PromptGon.md`, một lượt, không tiền xử lý, không đồng thuận | Có |
| `local_cv` | Cục bộ | SAM2 tách thực thể → Florence-2 gọi tên → `color_engine` → lắp ráp hợp đồng | Không |

**Hai adapter đầu đều gọi nhà cung cấp.** Khác biệt giữa chúng không phải "tự xây hay gọi ngoài" — nó là lớp kỷ luật bọc quanh lời gọi: bảng màu đo được buộc mô hình giải trình theo số đã đo, `Prompt.md` mang đủ quy ước đếm, và lượt thứ hai lộ ra chỗ mô hình dao động. Bộ Gọn bỏ cả ba để đổi lấy chi phí và tốc độ.

**Hợp đồng trả về không đổi giữa ba bộ.** Đó là điều kiện để Review, Approve, Product Master, M02 và M03 không biết bộ nào đã chạy. Ba tổng đếm (`flower_count`, `bud_count`, `damaged_count`) cộng tại chỗ từ `bom` ở cả ba adapter, không hỏi mô hình — một con số suy được từ các con số khác mà đi hỏi thì sẽ có ngày hai giá trị bất đồng trong cùng một bản ghi.

**Chọn bộ máy là quyền của tổ chức, không phải hằng số trong mã.** Lựa chọn lưu ở `organizations.settings.bo_may_phan_tich`, đọc bằng `GET /vision/engine` (`H1`), ghi bằng `PUT /vision/engine` (`H4`, trần cứng `dieu_hanh`). Mỗi lần đổi ghi `audit_logs` action `vision.engine.change` — đó là chỗ duy nhất trả lời được vì sao kết quả hai giai đoạn khác nhau.

**Bộ máy chốt vào `payload` của job lúc tạo**, worker không tra lại lúc nhận việc. Đổi bộ máy giữa lúc một lô đang xếp hàng thì lô đó vẫn chạy bằng bộ đã chọn lúc bấm nút; nếu tra lại thì hai ảnh cùng một lô có thể chạy bằng hai bộ khác nhau và không ai biết.

**Cổng nghiệm thu để đổi mặc định:** một adapter chỉ được coi là thay được adapter đang chạy khi bằng hoặc hơn trên bộ ảnh vàng, đo bằng ma trận 13.1. Không đổi bằng lập luận, chỉ đổi bằng số đo. Việc tổ chức tự chọn bộ máy **không** thay cổng này: nó cho phép thử, và giao diện phải nói rõ bộ nào đã đo bộ nào chưa thay vì bày các lựa chọn trông ngang nhau.

**Ba kênh đếm giữ nguyên bất kể provider.** `count_engine.py` chốt số cuối từ `chot(kenh_llm, kenh_dt, kenh_chan)`; hai kênh sau thuần numpy và không thuộc phạm vi cổng này. Đường chạy hiện tại mới nối kênh một — hai kênh còn lại cần hiệu chỉnh trên dữ liệu có đáp án, tức cần bộ ảnh vàng trước.

**Bắt buộc kèm theo:** xây **bộ ảnh vàng 8 ảnh sản phẩm thật có nhãn số lượng đúng** trong P5. Chưa có bộ này thì không nghiệm thu được adapter nào, không hồi quy được phần thu hoạch, và ma trận 13.1 không có dữ liệu để điền.

**Luật giữ lại từ `M04` mục 5:** Identity Guard phải dùng **cùng một provider và cùng model version cho cả hai lần phân tích** của một job, ghi vào metadata asset (mục 8). Luật này đúng với mọi provider — nó không phụ thuộc D5.

### 17.2 D6 — quyết định: Postgres làm hàng đợi (D6-1)

Xem mục 3.1.

---

## 18. Luật vận hành cho AI coding agent

Trước khi viết mã cho bất kỳ hạng mục nào, agent phải trả lời:

1. Hạng mục này xếp hạng gì trong **REUSE / EXTEND / ADAPTER / BUILD**?
2. Nếu REUSE hoặc EXTEND: nguồn nằm ở repo nào, tệp nào, bao nhiêu dòng?
3. Luật nghiệp vụ đi kèm được khoá bởi test nào? Test đó đã chép sang chưa?
4. Entity chạm tới thuộc core hay thuộc engine (mục 2.1)?
5. Đã có `organization_id` chưa?
6. Thao tác này dài bao lâu — có phải là job không?
7. Có ghi `usage` không?
8. Kết quả có cần duyệt trước khi thành dữ liệu chính thức không?
9. Năng lực nào gác nó? Năng lực duyệt có tách riêng không?
10. Hạng mục có gọi AI không? Nếu có: năng lực nào trong `ai_capabilities`, cổng nào trong mười cổng, và lời gọi đi qua cổng AI chứ không qua SDK nhà cung cấp?
11. Mô hình định dùng đã có hàng trong `ai_models` với đủ bốn ô giấy phép chưa? Mức quyền riêng tư của dữ liệu đi vào là gì?

Xếp hạng **BUILD** cho thứ đã tồn tại ở một trong ba repo là lỗi phải chặn ở review.

> **Nguyên tắc cuối:** Đây không phải viết lại từ số không. Ba repo đã xây ba mảnh khác nhau của chính kiến trúc này. Việc của core là **ghép ba mảnh lại trên một nền đa tenant sạch** — và chỉ xây mới đúng sáu hạng mục mà không repo nào có.

---

## 19. Nền AI

Đặc tả đầy đủ ở `../dac-ta/10-ai-orchestration.md`. Mục này giữ phần thắng tuyệt đối.

**Bốn luật.** Năng lực trước, mô hình sau · mọi lời gọi AI đi qua cổng AI · mô hình là cấu hình không phải mã · đầu ra AI được chấm điểm trước khi thành dữ liệu.

**Ba mức triển khai, thứ tự không đảo được.** API là mặc định để ra sản phẩm. Trọng số mở là lớp tối ưu, vào khi khối lượng, chi phí, độ trễ hoặc quyền riêng tư đủ lớn. Đường lai là kiến trúc đích. Tinh chỉnh mô hình là bước cuối, và chỉ sau khi ALG biết mô hình hiện tại sai ở đâu — tinh chỉnh trước khi biết là trả tiền để khoá lại một cái sai chưa ai mô tả được.

**Ba cổng chất lượng khác nhau, không cổng nào thay cổng nào.** Điểm chất lượng là máy chấm mọi đầu ra AI. Identity Guard là máy chấm riêng nhận dạng sản phẩm và là cổng cứng của M04a. Review → Approve là người ra phán quyết, theo Luật 3. Một đầu ra điểm cao vẫn phải qua người; một đầu ra bị Guard từ chối không được vào luồng duyệt.

**Sổ đăng ký là nguồn sự thật về mô hình.** `ai_capabilities` khai năng lực và ngưỡng; `ai_models` khai mô hình kèm bốn ô giấy phép (D18); chính sách theo tổ chức khai trần mà bộ định tuyến được chọn trong đó. Ba thứ này sống ở core, một bản, và engine ngoài đọc chúng qua Integration API.

**Ba nguồn số liệu chi phí, ba câu hỏi khác nhau.** `usage` trả lời tổ chức còn bao nhiêu credit. `assets.cost_usd` trả lời một tài sản tốn bao nhiêu tiền thật. `ai_requests` trả lời một lời gọi mô hình tốn gì và cho chất lượng nào. Thác nghiệm gọi mô hình ba lần vẫn chỉ trừ credit của một lượt nghiệp vụ — hạn mức kiểm tại điểm tạo job, không kiểm theo số lời gọi bên dưới.

**Sàn quyền riêng tư cắt sau cùng**, cùng vị trí và cùng tính chất với trần cứng của RBAC: không đường nào từ cấu hình, chính sách hay bước dự phòng mở được một lời gọi `sensitive` ra nhà cung cấp bên ngoài. Hết đường trong phạm vi cho phép thì job `FAILED` và credit hoàn theo D3-b.

**Tri thức ngành hoa là phần không thay được khi mô hình đổi.** Danh mục loài, bộ ảnh có nhãn, cặp *máy đoán gì / người sửa thành gì*, và số liệu hiệu quả theo từng cửa hàng — bốn thứ này tích theo thời gian vận hành và không mua được. Mô hình thì đổi trong sáu tháng. Kiến trúc ALG không được phép đổi theo chúng.
