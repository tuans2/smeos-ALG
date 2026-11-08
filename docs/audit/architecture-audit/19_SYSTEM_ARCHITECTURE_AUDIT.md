# 19 — Audit kiến trúc hệ thống: ranh giới module, phụ thuộc, khả năng mở rộng

> Loại tài liệu: báo cáo audit (chỉ đọc mã; không sửa mã sản phẩm). Ngày: 06/11/2026.
> Commit được audit: `d8dd00d` (HEAD `main`, "Merge pull request #166").
> Bổ sung cho bộ audit 31/10 (`01`–`18`, commit `c27f39e1`). Bộ đó phủ bảo mật, vận hành, 4 tầng. Bản này **đo cấu trúc mã**: đồ thị import, ranh giới tầng, vòng phụ thuộc, quyền ghi bảng, khả năng mở rộng ngang, kiến trúc tích hợp.
> Mọi con số đều sinh từ `node docs/audit/architecture-audit/evidence/arch-graph.mjs <mode>` (chạy ở gốc repo, không cần `node_modules`) hoặc từ lệnh `grep` ghi kèm. Mã phát hiện: `SA-xx`.

## 1. Kết luận

SMEOS là một **modular monolith có kỷ luật ở mức tệp, nhưng rối ở mức module**.

- **Tốt:** Prisma chỉ nằm trong `infra/`. Không có `domain/` nào import Prisma. Mọi route đều có gác tenant hoặc năng lực, hoặc nằm trong danh sách miễn trừ có lý do. Ở mức tệp gần như không có vòng phụ thuộc (6 vòng runtime). AI phía TS chỉ đi qua một cổng.
- **Chưa tốt:** 29/52 module nằm chung **một** thành phần liên thông mạnh (SCC). Lý do là module import thẳng vào `infra/` và `use-cases/` của nhau, và không module nào có API công khai. 35 bảng bị từ hai module trở lên ghi trực tiếp. Riêng `orders` bị ghi bởi 4 module trong 24 tệp.
- **Không khớp tài liệu:** kế hoạch "3 tầng sẵn sàng bóc tách" (`src/layers`) chỉ có khung rỗng. `check:layers` vẫn báo xanh nên tạo cảm giác an toàn giả. Quy tắc "domain không import Prisma" (CLAUDE.md #4) đang đúng nhưng **không có cổng tự động nào giữ**.
- **Gợi ý chính:** chỉ cần cắt **13 cạnh phụ thuộc đi ngược** từ nhân nền tảng lên nghiệp vụ là SCC 29 module tách thành 3 bounded context tự nhiên: Nền tảng (10), Thương mại/Đơn hàng (10), Sáng tạo/AI (6). Đó là bản đồ kiến trúc chuẩn hoá đề xuất ở §6.

## 2. Phạm vi và số đo nền

| Hạng mục | Giá trị | Nguồn |
|---|---|---|
| Tệp TS/TSX/JS trong `src/` | 4.085 (prod 3.599 · test 486), ~397k dòng | `arch-graph.mjs summary`; `wc -l` |
| Phân bổ dòng | `modules` 175k · `components` 158k · `app` 48k · `core` 8,5k · `lib` 7k · `layers` 264 | `find … \| wc -l` |
| Module nghiệp vụ | 52 thư mục trong `src/modules` | `ls` |
| Route API | 504 `route.ts` | `find src/app/api -name route.ts` |
| Model Prisma / migration | 147 / 73 | `grep -c '^model '`; `ls prisma/migrations` |
| Worker Python | 165 tệp `.py` | `find workers -name '*.py'` |
| Tệp prod > 350 dòng | 76 | `arch-graph.mjs summary` |
| Tệp `"use client"` | 1.001; trang client 80/114 | `arch-graph.mjs summary` |

**Giới hạn phương pháp:** import được đọc bằng regex (bỏ chú thích) và phân giải alias `@/`. `import type` và `import()` động không tính là cạnh runtime. Đếm quyền ghi bảng chỉ bắt dạng `.<model>.create|update|upsert|delete…(` (gồm `tx.`), không bắt SQL thô. Đồ thị không đi qua `workers/`.

## 3. Đánh giá theo miền (0–5)

| Miền | Điểm | Căn cứ đo |
|---|:---:|---|
| Kiến trúc tổng thể | 3 | Monolith + worker qua Postgres phù hợp quy mô; tầng ranh giới rõ trên giấy (`AGENT_RULES` §10) |
| Ranh giới module | **1,5** | 0 module có `index.ts`; nhập chéo: 258 vào `infra`, 187 vào `use-cases`, 38 vào `adapters`; SCC 29 module (SA-01) |
| Phụ thuộc thành phần | 2,5 | Vòng cấp tệp ít (6 runtime, 20 kể cả type); có phụ thuộc ngược `core→modules`, `lib→modules/ui`, `domain→components` (SA-08) |
| Tách bạch trách nhiệm | 3 | Prisma 100% trong `infra`; nhưng 77/504 route gọi thẳng `infra`, 95 tệp `useEffect`+`fetch` (SA-09, SA-11) |
| Khả năng mở rộng (scale) | 2 | Bộ quét `setInterval` trong tiến trình web, SSE trong bộ nhớ, việc nền trong tiến trình (SA-05) |
| Khả năng mở rộng (extensibility) | 2,5 | Port cho nhà cung cấp tốt (`core/ports`); thiếu API công khai module, quyền ghi bảng phân tán (SA-02) |
| Kiến trúc tích hợp | 2 | 3 hợp đồng kênh song song, kênh thông báo SMS/Zalo/Push vẫn là stub, worker là cổng AI thứ hai (SA-04, SA-06) |
| Tuân thủ kiến trúc đã thiết kế | 2,5 | Luật Prisma/tenancy/AI-TS đạt; luật DI, 4 thư mục, 3 tầng chưa đạt hoặc không có cổng giữ (SA-03, SA-10, SA-13) |

## 4. Phát hiện

Mức: **P1** chặn khả năng tiến hoá hoặc có rủi ro sai dữ liệu · **P2** nợ cấu trúc cần lộ trình · **P3** vệ sinh.

### SA-01 (P1) — Ranh giới module chỉ là thư mục: 29/52 module dính thành một khối vòng

- `arch-graph.mjs summary`: vòng cấp module (runtime) = **29 module**. `modules`: **23 cặp phụ thuộc hai chiều**, ví dụ `organization↔usage`, `organization↔platform`, `orders↔greeting-card`, `assets↔products`, `jobs↔usage`, `notification↔integration-hub`.
- Không module nào có `index.ts` (`ls src/modules/*/index.ts` → không có). Module khác nhập thẳng vào ruột: `cross-module->infra` 258, `->use-cases` 187, `->domain` 166, `->adapters` 38.
- Module hút nhiều nhất (fan-in): `audit`, `organization` (22 module phụ thuộc), `assets` (20). Module toả nhiều nhất (fan-out): `greeting-card` (13), `creative-production` (11), `orders` (10).
- **Nguyên nhân gốc đo được** (`arch-graph.mjs upward`): 13 cạnh từ nhân nền tảng đi lên nghiệp vụ, như `assets/use-cases/list-assets.ts → products/infra/product-repository.ts`, `platform/use-cases/* → greeting-card/domain/*` và `chat-assistant/infra/*`, `integration-hub/use-cases/sales-channel-deps.ts → orders/use-cases/ingest-order.ts`, `storage/use-cases/list-library.ts → marketing-center/domain/*`, `field-platform/domain/all-core-fields.ts → coordinator/contracts/*`. Cắt 13 cạnh này thì SCC 29 tách thành 3 cụm (§6).
- **Hệ quả:** không tách được repo hay bounded context (trái với `KE_HOACH_PHAN_LAP_3_TANG_MONOLITH_SSOT.md`). Sửa một repository lan sang module xa. Test đơn vị của một module phải kéo theo nửa hệ thống.

### SA-02 (P1) — Bảng không có module chủ: 35 bảng bị nhiều module ghi

- `arch-graph.mjs writers`: 138 bảng có lệnh ghi; **35 bảng có > 1 module ghi**.
- Nặng nhất: `organizations` và `products` (7 module mỗi bảng); `orders`, `assets`, `memberships` (4 module); `order_items`, `order_payments`, `order_events`, `order_coordinations` (3 module: `orders`, `greeting-card`, `coordinator`).
- `orders` bị ghi trong **24 tệp** (`grep -rlE "\.orders\.(update|updateMany|create|upsert)\(" src`): 4 tệp ở `orders`, 3 ở `coordinator`, 16 ở `greeting-card`, 1 ở `availability`.
- **Hệ quả:** bất biến của máy trạng thái đơn hàng không có một chốt chặn duy nhất. Đây là cơ chế đứng sau phát hiện "ba động cơ trạng thái cùng chạy trên `orders`" của audit 31/10. Thêm nguồn đơn hay đổi luật trạng thái phải sửa ở nhiều module.
- Một số nhiều-chủ có lý do (`storage` dọn thùng rác hoặc xoá vĩnh viễn trên `assets`/`products`). Cần ghi rõ thành ngoại lệ, không để mặc định.

### SA-03 (P1) — Kiến trúc "3 tầng sẵn sàng bóc tách" chỉ là khung; cổng `check:layers` cho tín hiệu xanh giả

- `src/layers/` có 5 tệp (2 interface hợp đồng, 1 preset, `index.ts`, 1 test). **Không tệp nào ngoài `src/layers` import chúng** (`grep -rln "@/layers/" src` → 0). `store-os/` không tồn tại.
- `scripts/check-layer-boundaries.ts` (CI bước "check:layers") quét `layers/contracts`, `layers/chain-os` (gần rỗng) và `components→infra`. Khi đạt, nó in "Sẵn sàng bóc tách repo", trong khi logic chuỗi thật nằm ở `greeting-card`, `coordinator`, `chain-partnership` và dính vào SCC ở SA-01.
- Cùng dạng lỗi với `AGENT_RULES` §14 #11 (tài liệu mô tả kiến trúc đích như thể đã xây).

### SA-04 (P1, còn mở từ ARC-009) — Worker Python là cổng AI thứ hai

- 24 tệp trong `workers/media_ai`, `workers/vision` gọi thẳng OpenAI, fal, Stability, Replicate, ElevenLabs. Worker tự ghi `ai_requests` (`media_ai/providers/chung.py`).
- `workers/shared/ai_policy.py` (việc P2-D1 ở `16_IMPLEMENTATION_PLAN.md`) **chưa có**. Sàn riêng tư và lọc giấy phép của `callCapability` vì vậy không áp cho đường worker.

### SA-05 (P1 khi scale ngang, hiện P2) — Giả định một tiến trình web

| Cơ chế | Vị trí | Hỏng khi chạy > 1 instance |
|---|---|---|
| 4 bộ quét `setInterval` chạy trong tiến trình web (Thẻ chào, cứu lead, khớp SePay, đối soát thu) | `src/instrumentation.ts`, `*-scheduler.ts` | Mỗi instance chạy một lần → nhắc trùng, ghi đè đua. Cờ chống chạy trùng chỉ có trong một tiến trình (`globalThis` + `running`). Không có `pg_try_advisory_lock` (`grep` → 0) |
| SSE thông báo: `SseNotificationHub` giữ `Map` người nghe trong bộ nhớ | `notification/adapters/notification-sse-adapter.ts` | Tin được tạo ở instance A không tới người đang nối ở instance B |
| `runInBackground` (12 chỗ gọi) | `core/runtime/background.ts` | Mất việc khi deploy hoặc restart; không retry |
| Circuit breaker, rate-limit dự phòng, cache domain riêng | `core/http/*`, `custom-domain/use-cases/resolve-custom-domain.ts` | Trạng thái riêng từng instance (rate-limit có Redis làm đường chính, chấp nhận được) |

Hiện có hai cơ chế lập lịch song song: cron của Render (`smeos-cron-dispatch-sweep`) và `setInterval` trong web. `worker:market-intelligence` có trong `package.json` nhưng **không có trong `render.yaml`**. *Chưa kiểm chứng* job Tình báo thị trường có được xử lý ở production hay không.

### SA-06 (P2) — Kiến trúc tích hợp phân mảnh (ARC-007 mới khép một phần)

- Có **ba hợp đồng kênh** cho cùng một việc "gửi tin ra ngoài":
  - `greeting-card/adapters/staff-channels/channel-provider.interface.ts`, với Telegram, Zalo OA, SMS, WhatsApp, Messenger, cùng `esms-adapter.ts` và `zalo-zns-adapter.ts`;
  - `notification/infra/channel-adapters/_channel-adapter.interface.ts`;
  - `integration-hub/adapters/connector-contract.ts`.
- Đã khép được một phần: Telegram Bot API nay dùng chung (`integration-hub/adapters/connectors/telegram/telegram-bot-api.ts`).
- Kênh SMS, Zalo, Web Push của thông báo vẫn là stub 26 dòng, luôn trả `NOT_CONFIGURED`. Registry đầu nối của Hub chỉ có Telegram và 2 đầu nối thử.
- Tên dễ nhầm: `modules/integration` (token Integration API cho LocalBudd/SocialFlow), `modules/integration-hub` (đầu nối kênh), `coordinator/connectors` (nối nội bộ giữa module).
- Gọi ra ngoài nằm ở `use-cases`:
  - `audio-studio/use-cases/voice-clones.ts` gọi `api.elevenlabs.io` (đã được miễn trừ trong `no-direct-ai-provider.test.ts`);
  - `platform/use-cases/export-org-data-zip.ts:174` gọi HTTP vào chính API `/api/v1/storage` của hệ thống.

### SA-07 (P2) — Đảo ngược phụ thuộc chỉ là danh nghĩa với repository

- Theo ma trận tầng nội module (runtime), `use-cases → infra` cụ thể có **771** import. Có 49 tệp interface trong `domain/repositories`, nhưng use-case nhập thẳng lớp Prisma.
- 8 interface repository trong `domain/` import kiểu dòng Prisma qua `infra/entities.ts` (`arch-graph.mjs violations "domain->infra|adapters|use-cases"`; ví dụ `profiles/domain/repositories/brand-profile-repository.interface.ts`). Như vậy mô hình domain chính là mô hình lưu trữ.
- `core/ports` (15 port) làm đúng việc của mình cho nhà cung cấp ngoài. Phần repository thì nên **chính thức chấp nhận** kiểu thực dụng (use-case được gọi `infra` của chính module), thay vì giữ tuyên bố DI không ai thực thi.

### SA-08 (P2) — Phụ thuộc ngược chiều tầng

| Luật | Số | Ví dụ |
|---|---:|---|
| `core → modules` | 3 | `core/entitlements/entitlement-service.ts` → `organization/infra`, `subscription/infra`; `core/rbac/capability-catalog.ts` → `organization/domain/system-roles.ts` |
| `lib → modules` | 9 | `lib/session.tsx` → `organization/domain/role-ux-catalog.ts`; `lib/hooks/use-tenant-profile.ts` → `profiles/infra/*` (type) |
| `lib → components` | 13 | `lib/mock-data.ts` → `components/ui/icon-set/*` |
| `domain → components` | 5 | `products/domain/product-master-index.ts` → `components/templates/orders/*`; `toolkit/domain/tool-registry.ts` → `components/layout/nav/nav-types.ts` |
| `components → app` | 9 | `CreativeStudioContext` khai báo trong `app/(app)/creative-studio/page.tsx` → tạo vòng 10 tệp lớn nhất |
| `infra → use-cases` | 16 chéo + 7 nội | 14 import từ repository vào `audit/use-cases/record-audit-log.ts`; `organization/infra/organization-repository.ts` → `usage/use-cases/credit-alerts.ts` |
| client component → `use-cases` | 5 | `components/catalog/*` → `catalog-studio/use-cases/resolve-catalog-brief.ts` (mã thuần, thực chất thuộc `domain`) |

Ngoài ra, `requireFeatureAccess` (lý do duy nhất `core/entitlements` cần `organization/infra`) **không có route nào gọi** (`grep` → chỉ có định nghĩa). Đây là mã chết, lại tạo phụ thuộc ngược (ARC-033 còn mở).

### SA-09 (P2) — Route API bỏ qua tầng use-case

77/504 `route.ts` import thẳng `modules/*/infra` (128 import); 34 import `adapters`. Phần lớn là đọc danh sách đơn giản. Nhưng như vậy route ôm luôn điều phối, và bộ gác ở tầng use-case (ví dụ RS-1..11: "gác quyền chuyển về tầng use-case") không phủ được các đường này.

### SA-10 (P2) — Luật kiến trúc cốt lõi không có cổng tự động

- CLAUDE.md #4 ("domain không import Prisma/infra; Prisma chỉ trong infra; SDK chỉ trong adapters"): hiện **đạt** (`domain->prisma` = 0; Prisma runtime chỉ ở `modules/*/infra` 198 chỗ và `core/*/infra`). Nhưng không test nào trong `tests/unit/architecture/` kiểm. `check:layers` chỉ kiểm `components→infra`.
- Không có cổng chống vòng phụ thuộc hay chống nhập chéo vào `infra` của module khác. Các chỉ số ở SA-01 và SA-08 vì thế chỉ có thể tăng.

### SA-11 (P2) — Giao diện nặng phía client, lấy dữ liệu bằng `useEffect`

80/114 trang là `"use client"`. 95 tệp client dùng `useEffect` + `fetch` (anti-pattern A6), trong khi chỉ 14 tệp dùng SWR, dù SWR đã có trong dependency. Mặc định RSC (`AGENT_RULES` §6) chưa được áp.

### SA-12 (P2) — Mất cân đối kích thước: `greeting-card` là module "thượng đế"

`greeting-card` có 395 tệp, 30,5k dòng (17% mã `modules`), fan-out 13. Module này ôm đơn hàng, thanh toán, điều phối chuỗi, kênh nhắn tin, VAT, huỷ đơn và ghi vào 16 tệp chạm `orders`. Có 76 tệp prod vượt 350 dòng; lớn nhất là `app/(app)/tai-anh/page.tsx` (1.950 dòng) và `components/upload/upload-wizard.tsx` (1.383 dòng). Ratchet K11 đang giữ không cho các tệp này phình thêm.

### SA-13 (P3) — Quy ước module lệch tài liệu

`src/modules/README.md` ghi "đủ bốn thư mục, không thiếu cái nào". Thực tế 26 module thiếu `adapters/`, 7 thiếu `infra/`, 3 thiếu `use-cases/`. Có thư mục ngoài quy ước: `contracts`, `connectors`, `workflow`, `ops-copilot`, `sales-concierge`, `jobs`. Danh sách module trong README (M01–M04a) đã cũ.

### SA-14 (P3) — Vòng phụ thuộc cấp tệp (mức thấp, đáng giữ)

Có 6 vòng runtime (`arch-graph.mjs cycles`):
- creative-studio (10 tệp, do Context đặt trong `page.tsx`);
- `greeting-card/domain` (brochure-pricing ↔ delivery-schedule ↔ slot-capacity; brochure-payment-policy ↔ brochure-policy-resolvers);
- `journey/domain` (industry-journeys ↔ journey-catalog);
- `creative-production/use-cases` (manage-campaign-package ↔ qa-and-approve-package);
- `core/terminology` (index ↔ use-tier-terminology; đồng thời đặt một React hook trong `core`).

## 5. Điểm mạnh đã kiểm chứng

- Prisma chỉ nằm trong `infra/` (0 import runtime từ `domain`, `use-cases`, `api`, `components`).
- Tenancy và RBAC ở biên có test gác route, kèm danh sách miễn trừ chỉ được co lại (`route-capability-guard.test.ts`).
- Phía TS chỉ có một cổng AI (`no-direct-ai-provider.test.ts`). Port cho mọi nhà cung cấp ngoài nằm ở `core/ports`.
- Hàng đợi job qua Postgres `SKIP LOCKED` + `LISTEN/NOTIFY` (D6-1). Có outbox lưu trữ và bảng sự kiện tích hợp.
- Đã khép từ audit 31/10:
  - ARC-001: Render deploy với `autoDeployTrigger: checksPass`.
  - ARC-004: chỉ bỏ kiểm kiểu khi có `SKIP_BUILD_TYPECHECK` tường minh.
  - ARC-006: cấm lùi về đĩa cục bộ qua `localStorageAllowed`; *chưa kiểm sâu*.

## 6. Kiến trúc chuẩn hoá đề xuất

Giữ **modular monolith + worker Python** (đúng D6-1, D15–D19). Không tách microservice. Chuẩn hoá theo bốn vòng phụ thuộc **chỉ đi xuống**, lấy đúng ranh giới mà đồ thị đã tự lộ ra:

```
L3  Biên         src/app (trang, api/v1)  ·  src/components (UI thuần, không import app/infra)
        │  chỉ gọi API công khai của module (index.ts)
L2  Ngữ cảnh     Thương mại: orders* · greeting-card · coordinator · products · product-copies · costing
    nghiệp vụ                availability · promotions · catalog-links · acquisition (+ crm, sales, print)
                 Sáng tạo/AI: creative-production · content-engine · media · audio-studio · video-studio
                              market-intelligence (+ product-photo-studio, ad-banner-poster, …)
                 Tương tác: chat-assistant · marketing-center · landing-page · journey · toolkit …
        │  L2↔L2 chỉ qua index.ts hoặc sự kiện miền; KHÔNG vào infra/adapters của nhau
L1  Nhân nền     organization · platform · subscription · usage · jobs · assets · storage · audit
    tảng         notification · integration-hub · field-platform · profiles
        │  L1 không bao giờ import L2 (13 cạnh của SA-01 phải đảo chiều)
L0  Lõi chung    src/core (tenancy, rbac, ai, ports, http, observability) · src/lib (tiện ích thuần)
                 không import modules/components/app
```

`*` là chủ duy nhất của bảng `orders*`.

**Năm quy tắc đi kèm**

1. **API công khai mỗi module:** `src/modules/<m>/index.ts`, chỉ xuất use-case và kiểu DTO. Import `@/modules/<m>/(infra|adapters|use-cases)/…` từ module khác là vi phạm. Nội bộ module vẫn được `use-case → infra` (chấp nhận chính thức SA-07).
2. **Một bảng, một chủ:** mỗi model Prisma gắn một module chủ (ghi chú `/// owner:` trong schema hoặc bảng sổ trong tài liệu). Module khác ghi qua lệnh của chủ. `orders*` thuộc `orders`. `greeting-card` và `coordinator` gọi lệnh chuyển trạng thái của `orders`, nhờ đó có **một** máy trạng thái.
3. **Đảo chiều nhân → nghiệp vụ** bằng đăng ký (registry) hoặc sự kiện, ví dụ:
   - `platform` cần dữ liệu `chat-assistant` thì `chat-assistant` đăng ký một nhà cung cấp vào port của `platform`;
   - `integration-hub` nhận đơn qua port `OrderIngestion` (`core/ports`), do `orders` cài đặt;
   - `audit` được gọi từ `use-cases` (hoặc qua port), không gọi từ repository.
4. **Một hợp đồng kênh:** `core/ports/messaging-channel.ts`, cài đặt duy nhất trong `integration-hub/adapters/connectors/*`. `notification` và `greeting-card` chỉ tiêu thụ.
5. **Không trạng thái trong tiến trình web:**
   - bộ quét chuyển sang cron hoặc worker và chạy dưới `pg_try_advisory_lock`;
   - SSE phát qua Postgres `LISTEN/NOTIFY` hoặc Redis pub/sub (`ioredis` đã có);
   - việc nền quan trọng (thông báo, ghi kênh) đi qua outbox hoặc `generation_jobs` thay vì `runInBackground`.

## 7. Lộ trình

| Bước | Việc | Phát hiện | Cỡ | Cần PO? |
|---|---|---|:---:|---|
| 1 | Test ratchet `tests/unit/architecture/module-boundaries.test.ts`: chốt mốc số nhập chéo `infra`/`adapters`, cạnh L1→L2, `core/lib→modules`, `domain→components`, `domain→prisma` = 0, số vòng; **chỉ được giảm** (cùng mô hình `file-size-ratchet`) | SA-01, SA-08, SA-10 | S | Không (nằm trong `npm test`) |
| 2 | Sửa `check:layers` cho trung thực: bỏ thông điệp "sẵn sàng bóc tách"; quyết số phận `src/layers` (xoá, hoặc biến thành API công khai thật cho ngữ cảnh Chuỗi) | SA-03 | S | Có (đổi định hướng 3 tầng) |
| 3 | Cắt 13 cạnh L1→L2 (port/registry); dời kiểu dùng chung khỏi `components` sang `domain`/`contracts`; dời `CreativeStudioContext` khỏi `page.tsx`; dời `resolve-catalog-brief` vào `domain`; `core/entitlements` dùng port | SA-01, SA-08, SA-14 | M | Không |
| 4 | `index.ts` cho các module có fan-in cao (`organization`, `assets`, `audit`, `usage`, `jobs`, `products`, `orders`); chuyển nơi gọi sang đó, ratchet đếm xuống | SA-01 | M | Không |
| 5 | Sổ chủ bảng + chuyển mọi lệnh ghi `orders*` từ `greeting-card`/`coordinator`/`availability` về lệnh của `orders`; test kiến trúc "chỉ chủ được ghi" | SA-02 | L | Có (chạm luồng Thẻ chào, B5) |
| 6 | Bộ quét sang cron + khoá advisory; SSE qua `LISTEN/NOTIFY`; đưa worker Tình báo thị trường vào `render.yaml` hoặc ghi rõ lý do | SA-05 | M | Có (`render.yaml`) |
| 7 | Gộp hợp đồng kênh vào `integration-hub` + port chung; đổi tên `modules/integration` → `integration-api` | SA-06 | M | Có (nhà cung cấp kênh) |
| 8 | `workers/shared/ai_policy.py` (P2-D1) | SA-04 | M | Đã có trong kế hoạch 16 |
| 9 | Dời 77 route gọi `infra` về use-case khi chạm tới; trang mới mặc định RSC + SWR | SA-09, SA-11 | dần | Không |
| 10 | Cập nhật `src/modules/README.md` theo quy ước thật (thư mục bắt buộc/tuỳ chọn, `index.ts`) | SA-13 | S | Không |

Bước 1 nên làm trước: nó chặn nợ mới ngay mà không đổi hành vi. Các bước 3–4 sau đó chỉ cần làm cho số đếm giảm.

## 8. Chưa kiểm chứng

- Hành vi production khi chạy > 1 instance web: suy ra từ mã, chưa đo.
- Job Tình báo thị trường ở production (SA-05).
- Đường SQL thô (`$queryRaw`/`$executeRaw`) không nằm trong phép đếm chủ bảng (SA-02).
- Các phát hiện ARC-034 (3 mô hình Chuỗi→Cửa hàng) và ARC-035 (phạm vi `BRANCH`) của audit 31/10 **không được kiểm lại** ở lượt này.
