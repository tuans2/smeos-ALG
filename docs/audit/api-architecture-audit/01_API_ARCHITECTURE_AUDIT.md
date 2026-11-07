# Audit Kiến trúc API — `/api/v1` (06/11/2026)

> Trạng thái: **DRAFT — chờ PO duyệt**. Không thay thế đặc tả 06 (`docs/dac-ta/06-api-specification.md`, SSOT API).
> Bổ sung và đào sâu ARC-022/024/025 của `docs/audit/architecture-audit/08_ARCHITECTURE_RISK_REGISTER.md`.
> Đề xuất chuẩn hoá: `02_API_CONTRACT_STANDARD_AND_OPENAPI.md` (cùng thư mục).

## 0. Phạm vi, phương pháp, giới hạn

| Mục | Nội dung |
|---|---|
| Phạm vi | 504 tệp `route.ts` dưới `src/app/api/` (501 ở `/api/v1`, 2 `health`, 1 `dev`); `src/core/http/*`; `src/proxy.ts`; đặc tả 06; test kiến trúc `tests/unit/architecture/route-capability-guard.test.ts`; `scripts/check-docs.mjs` |
| Phương pháp | Quét tĩnh bằng script (đếm mẫu trong route + tệp handler cục bộ nó import), đọc mã các điểm nghi vấn, đối chiếu cột năng lực đặc tả 06 ↔ `requireCapability(ctx, "…")` |
| Mức xác minh | **V** = đã đọc mã, khẳng định được · **PV** = theo heuristic quét, cần rà từng tệp |
| Giới hạn | `npm ci` bị chặn (403 khi tải `xlsx` từ `cdn.sheetjs.com`) nên **không chạy được test/typecheck** để tái hiện bằng thực nghiệm; các phát hiện V dựa trên đọc luồng mã. `npm run check:docs` chạy được: **đạt**. Không pentest, không đo tải |

## 1. Tóm tắt điều hành

**Nền tảng tốt.** Một lớp lỗi `AppError` + `handle()` dùng ở 498/504 route; `handle()` gắn `x-request-id`, ngữ cảnh RLS, audit ghi/chặn. Tenancy giải từ phiên, khác tổ chức → 404. Test kiến trúc chặn route mới thiếu gác năng lực. Webhook ký HMAC so sánh hằng thời gian. Rate limit công khai dùng Redis, băm IP, tính đúng số proxy tin cậy. `check:docs` đối chiếu hai chiều path+method giữa đặc tả 06 và mã. Job AI có `Idempotency-Key` bắt buộc + ràng buộc unique chống đua.

**Lỗ hổng chính** — hợp đồng API mới được giữ **một nửa**: hình dạng lỗi thống nhất, nhưng thân yêu cầu, thân phản hồi, phân trang, cách đặt tên và tài liệu máy đọc thì không.

| # | Phát hiện | Mức | XM |
|---|---|---|---|
| API-01 | `ZodError` và JSON hỏng thoát khỏi `handle()` → **500** thay vì 400 (17 route `schema.parse`, 28 route `request.json()` không `.catch`) | P1 | V |
| API-02 | `POST /content-engine/rewrite`: gọi LLM **đồng bộ**, không mã năng lực, không trừ credit, không rate limit | P1 | V |
| API-03 | `GET /orders?limit=` không chặn trần (kèm `include` 3 quan hệ + `count`); `limit=abc` → `NaN` → 500 | P1 | V |
| API-04 | `GET /noi-bo/identity` nuốt mọi lỗi kể cả 401 → trả **500** `IDENTITY_ERROR` với envelope riêng | P2 | V |
| API-05 | `POST /jobs/batch`: không zod, mảng không giới hạn, `Idempotency-Key` thiếu thì tự sinh UUID (vô hiệu YC-U7), trả `Response` thô 200 | P2 | V |
| API-06 | Envelope lỗi/thành công lệch chuẩn ở ≥ 12 route; 4 mã lỗi có trong mã nhưng không có trong đặc tả | P2 | V |
| API-07 | `details` của lỗi validation có ≥ 4 dạng; tên header idempotency viết 3 kiểu | P2 | V |
| API-08 | 429 không kèm `Retry-After` dù đặc tả 06 §2 hứa có | P2 | V |
| API-09 | Rate limit gần như chỉ ở `/public/*`; Integration API (máy gọi máy, bên thứ ba) không có | P2 | V |
| API-10 | Phân trang 3 hình dạng, 3 mặc định (20/25/50), 9 route offset/page; ~32 repository `findMany` không `take` | P2 | PV |
| API-11 | Idempotency chỉ phủ job; khoá không gắn băm payload; `POST /orders` không chống trùng | P2 | V |
| API-12 | 8 endpoint lệch mã năng lực đặc tả ↔ mã; `check:docs` không kiểm cột năng lực; test gác dựa regex | P2 | V |
| API-13 | Đặt tên trộn camelCase/snake_case; họ tài nguyên trùng lặp (`integration`/`integrations`, `organization`/`organizations`…) | P2 | V |
| API-14 | Không có chính sách version/deprecation (`Sunset`, `Deprecation`) dù đã có bề mặt cho bên thứ ba | P2 | V |
| API-15 | Không OpenAPI; schema yêu cầu khai inline ở 226 route; không route nào khai schema phản hồi | P2 | V |
| API-16 | Mã trạng thái thiếu nhất quán: job trả 200/201 thay vì 202; DELETE 2/27 trả 204; động từ trong path | P3 | V |
| API-17 | Vệ sinh bảo mật: thiếu `Cache-Control: no-store` mặc định, giới hạn kích thước thân rời rạc, audit cấu hình nền tảng nuốt lỗi im lặng | P3 | V |

Chấm điểm theo hạng mục (1 = yếu … 5 = chuẩn mực):

| Hạng mục | Điểm | Lý do ngắn |
|---|---|---|
| Endpoints & REST conventions | 3 | Cấu trúc `/x/:id/action` có quy ước; tên/casing trộn; họ tài nguyên trùng |
| Contracts & schemas | 2 | zod ở ~51% route nhưng inline; không có schema phản hồi, không OpenAPI |
| Validation | 3 | `safeParse` phổ biến; 45 route rơi 500 khi sai dữ liệu |
| Authentication | 4 | Cookie phiên HttpOnly/Lax; Bearer băm cho Integration; webhook ký HMAC |
| Authorization | 4 | Mã năng lực + test chặn; còn nợ #170 và lệch đặc tả 8 điểm |
| Error handling | 3 | Envelope chung tốt; Zod/JSON → 500; vài route tự chế envelope |
| Versioning | 2 | Có `/v1`; chưa có chính sách thay đổi phá vỡ |
| Rate limiting | 3 | Công khai tốt; đăng nhập/Integration/AI đồng bộ chưa có; thiếu header |
| Idempotency | 3 | Job tốt; ngoài job chưa có chuẩn |
| Tài liệu | 3 | Đặc tả 06 phủ 100% path+method (CI); không máy đọc được |

## 2. Kiểm kê

- 504 route · method: GET 266, POST 274, PATCH 45, PUT 42, DELETE 28.
- 180 route hành động con dạng `/x/:id/<action>` (đúng quy ước đặc tả 06 §1 cho `approve`).
- Gác truy cập: 379 route gọi `requireTenantContext`, 52 gọi `requirePlatform*`, 9 `requireIntegration*`; 70 route không gọi gác phiên nào — gồm 40 `/public/*`, `auth/*`, webhook, cron (`internal/*`), URL ký `storage/[...key]` — đều có lý do trong `NO_CAPABILITY_GUARD` hoặc nằm ở `public/` (test loại trừ cả thư mục).
- zod: 258 route dùng `safeParse`/`parseBody`, 17 dùng `parse` trực tiếp, 226 route tự khai `z.object` inline; chỉ 4 module có thư mục `contracts/` (`coordinator`, `creative-production`, `content-engine`, `greeting-card`).
- Rate limit: 47 route (39/40 route `/public/*`; 7 route có đăng nhập).

## 3. Phát hiện chi tiết

### API-01 — Lỗi dữ liệu đầu vào thành 500 (P1, V)

- **Bằng chứng.** `src/core/http/response.ts:34-60`: `errorResponse` chỉ nhận `AppError`; mọi lỗi khác → `INTERNAL` 500 + `captureError`. `ZodError` (từ `schema.parse`) và `SyntaxError` (từ `request.json()` với thân hỏng) rơi vào nhánh này. Chính tác giả `src/modules/coordinator/adapters/http-schemas.ts:1-5` đã ghi nhận ("không phải 500 như bản trước") và vá **cục bộ** cho coordinator.
- **Route còn dính** (`schema.parse` trực tiếp): `orders/route.ts:88`, `orders/[id]`, `orders/[id]/assign|cancel|my-work|info-requests`, `orders/[id]/info-requests/[requestId]`, `delivery/my-runs/[id]`, `notification/preferences:36`, `notification/org-policy|org-hard-locks|store-defaults|store-hard-locks`, `platform/nav-matrix`, `platform/notification/channels|hard-locks|visibility` (17 tệp). Thêm 28 route gọi `request.json()` không `.catch` (PV — một số nằm trong `try`).
- **Hậu quả.** Client gửi sai nhận "Lỗi hệ thống" thay vì lỗi theo trường; Sentry và SLI 5xx (`OPERATIONS_RUNBOOK §10`) bị nhiễu; vi phạm đặc tả 06 §2 (400 `VALIDATION_FAILED`).
- **Khuyến nghị.** Một chỗ: `errorResponse` đổi `ZodError` → 400 `VALIDATION_FAILED` (`details.fields`) và `SyntaxError` của body → 400. Đưa `parseBody` của coordinator lên `src/core/http/` thành helper chung. Thêm test đơn vị cho `handle()` với hai ca này.

### API-02 — `POST /content-engine/rewrite` không gác, không tính phí (P1, V)

- **Bằng chứng.** `src/app/api/v1/content-engine/rewrite/route.ts:38` chỉ `requireTenantContext`; `:119` gọi `callCapability` đồng bộ trong request; không có `requireCapability`, `enqueueJob`, ghi usage/credit hay `enforceRateLimit` (grep `usage|credit|quota|limit` trong tệp: không có). Đang là nợ #170 (`NO_CAPABILITY_GUARD`, ARC-025) — nhưng ARC-025 chỉ nêu thiếu mã năng lực, chưa nêu thiếu tính phí và thiếu chặn tần suất.
- **Hậu quả.** Bất kỳ thành viên nào của bất kỳ tổ chức nào (kể cả dùng thử) gọi LLM không giới hạn, không trừ credit; trái luật 4 đặc tả 06 ("thao tác AI trả `job_id` ngay").
- **Khuyến nghị.** PO chốt mã năng lực (nợ #170); tối thiểu ngay: `enforceRateLimit` theo `subject: userId` + trừ credit qua `usage`. Dài hạn: thống nhất mô hình "AI đồng bộ ngắn" (≤ N token, có hạn mức) hay đưa vào job.

### API-03 — `GET /orders` không chặn `limit` (P1, V)

- **Bằng chứng.** `src/app/api/v1/orders/route.ts:63-64` `parseInt(limitParam)` không kiểm khoảng; `src/modules/orders/infra/order-repository.ts:200-211` `take: filter.limit ?? 50` với `include: { items, assignments, events }` + `count`.
- **Hậu quả.** `?limit=100000` tải toàn bộ đơn kèm quan hệ trong một request (tốn bộ nhớ/CSDL, có thể làm treo instance); `?limit=abc` → `take: NaN` → Prisma ném → 500. Phản hồi `{ orders, total }` lệch chuẩn `{ data, next_cursor }`, không có cursor.
- **Khuyến nghị.** Dùng helper phân trang chung (mục API-10), chặn 1–100, chuyển sang cursor.

### API-04 — `GET /noi-bo/identity` nuốt lỗi xác thực (P2, V)

- **Bằng chứng.** `src/app/api/v1/noi-bo/identity/route.ts:18-43`: `try` bọc cả `requireTenantContext`; `catch` trả 500 `{ success: false, error: { code: "IDENTITY_ERROR" } }`; nhánh không thấy trả `{ success: false, error: "Organization not found" }` (chuỗi tiếng Anh).
- **Hậu quả.** Chưa đăng nhập / phiên bị thay → 500 thay vì 401 (giao diện không hiện được cảnh báo `SESSION_SUPERSEDED`); `auditDenied` không ghi vì lỗi bị nuốt; mã lỗi ngoài catalog.
- **Khuyến nghị.** Bỏ `try/catch`, `throw notFound()`, để `handle()` lo.

### API-05 — `POST /jobs/batch` lệch mọi chuẩn (P2, V)

- **Bằng chứng.** `src/app/api/v1/jobs/batch/route.ts`: ép kiểu `body as {…}` không zod (`:44-51`), `capabilities: string[]` không giới hạn độ dài/định dạng; `:88` `request.headers.get("idempotency-key") ?? crypto.randomUUID()` — thiếu khoá thì mỗi lần bấm là một job mới, trái `enqueue-job.ts:56-57` (bắt buộc khoá); `:96-106` `new Response(...)` 200 thay vì `jsonResponse` 202; thông điệp lỗi lộ giá trị nội bộ ("kỳ vọng ${expectedFeature}"); `resolved` không dùng.
- **Khuyến nghị.** Viết lại theo mẫu `media/optimizations/route.ts` (zod + `readIdempotencyKey` bắt buộc + 202).

### API-06 — Envelope lệch và catalog mã lỗi chưa đồng bộ (P2, V)

- `{ error: "chuỗi" }` thay vì `{ error: { code, message } }`: `public/zalo-oa/webhook/route.ts:26,32,44`, `internal/chain-dispatch-sweep/route.ts:59`, `internal/health/route.ts:20`.
- `NextResponse.json` trực tiếp: `chat/webhooks/facebook`, `chat/webhooks/zalo`, `chat/public/widget`, `health`, `health/ready`, `dev/role-override` (ARC-024 đã nêu).
- Thành công: 243 lần `{ data: … }`, nhưng 25 lần `{ success: … }`, 13 lần `{ ok: … }`, ~150 lần khoá tên riêng (`{ order }`, `{ job }`, `{ customer }`…), 159 lần trả thẳng giá trị.
- `ErrorCode` (`src/core/http/errors.ts:7-19`) có 12 mã; bảng lỗi đặc tả 06 §2 liệt 8 — thiếu `ENTITLEMENT_REQUIRED`, `PASSWORD_CHANGE_REQUIRED`, `SUBSCRIPTION_OVERDUE` (402), `UNPROCESSABLE_ENTITY` (422).

### API-07 — `details` của lỗi validation không thống nhất (P2, V)

Đếm khoá đầu tiên trong `validationFailed({...})` ở route: `issues` 191 (mảng issue thô của zod — lộ cấu trúc schema, thông điệp mặc định tiếng Anh nếu schema không tự đặt), `body` 26 (một câu chung, không chỉ trường nào — vd. `leads/[id]/route.ts`), còn lại là bản đồ trường. Header idempotency trong `details` viết 3 kiểu: `"idempotency-key"` (11), `"Idempotency-Key"` (5), `idempotency_key` (`enqueue-job.ts:57`). Giao diện không thể có một bộ hiển thị lỗi theo trường dùng chung.

### API-08 — 429 thiếu `Retry-After` (P2, V)

`src/core/http/rate-limit.ts:98-103` ném `RATE_LIMITED` không kèm thời điểm mở lại; `jsonResponse` không đặt header; grep `Retry-After` trong `src/`: 0. Đặc tả 06 §2 ghi "Kèm `Retry-After`" — tài liệu nói sai so với mã. Client (vd. `drive-thumbnails` thử lại 4 lần) phải đoán thời gian chờ.

### API-09 — Phạm vi rate limit hẹp (P2, V)

- Có: 39/40 route `/public/*` (thiếu `GET /public/catalog/[slug]` — dò slug/cào dữ liệu), `auth/login|signup|instant-trial`, `session/password`, `custom-domains/[id]/verify`, `products/drive-thumbnails`, webhook.
- Không có: 9 route Integration API `/integration/*` (Bearer, bên thứ ba gọi), các route AI đồng bộ (API-02, `chat/*` phía nhân viên), export (`*/export`).
- Khi không có `REDIS_URL` bộ đếm nằm trong bộ nhớ từng instance (`rate-limit.ts:66-96`) → trần thực tế = trần × số instance; cần ghi vào runbook.

### API-10 — Phân trang không thống nhất (P2, PV)

- Đặc tả 06 §2: `?limit` mặc định 25, tối đa 100, kết quả `{ data, next_cursor }`. Skill `api-development` ghi mặc định 20. Mã: `DEFAULT_LIMIT = 25` (9 nơi), mặc định 20 (`greeting-card/contracts/list-query.ts:6`, 3 route), mặc định 50 (11 route).
- Khoá phản hồi: `next_cursor` 46 lần, `nextCursor` 52, `hasMore` 35.
- Offset/page: `crm/customers`, `customer-interactions`, `customer-segments`, `customer-segments/[id]/customers`, `customers/[id]/interactions`, `notification/inbox`, `print/renditions`, `platform/orgs-data/[orgId]/records/[domain]`.
- ~32 tệp `infra/` có `findMany` mà không có `take` ở bất kỳ đâu (vd. `organization/infra/membership-repository.ts`, `product-copies/infra/product-copy-repository.ts`, `storage/infra/library-trash-repository.ts`, `jobs/infra/job-event-repository.ts`, `promotions/infra/voucher-redemption-repository.ts`). Nhiều tệp là danh mục cấu hình nhỏ — cần rà từng tệp, không kết luận hàng loạt.

### API-11 — Idempotency chỉ phủ job (P2, V)

- Tốt: `src/modules/jobs/use-cases/enqueue-job.ts:56-67,165` bắt buộc khoá, tra trước, bắt vi phạm unique khi đua. Chuyển trạng thái thanh toán có khoá trạng thái (`greeting-card/use-cases/confirm-brochure-payment.ts:189,214,259` → 409). Đơn công khai idempotent theo phiên (đặc tả 06 §23b).
- Thiếu: khoá không gắn băm thân yêu cầu — cùng khoá, thân khác vẫn trả job cũ âm thầm (chuẩn phổ biến: 422); `POST /orders` (`ingestOrder`) và các `POST` tạo bản ghi khác không có cơ chế chống bấm đúp; không có header phản hồi báo "đây là kết quả phát lại".

### API-12 — Năng lực đặc tả ↔ mã lệch, công cụ kiểm chưa đủ chặt (P2, V)

Đối chiếu tự động 345 endpoint có mã năng lực ở cả hai phía, lệch 8:

| Endpoint | Mã | Đặc tả 06 |
|---|---|---|
| `POST /crm/customers/:id/consent` | Q9 | Q6 |
| `POST /crm/customers/:id/occasions` | Q6 | Q5 |
| `POST /greeting-card/catalogs`, `PATCH /greeting-card/catalogs/:id` | F2 | L1, R2 |
| `GET /media/optimizations` | I2 | I1 |
| `PATCH /products/:id` | L3, L4, L5 | L1, L3 |
| `POST /products` | L2, L5 | L2 |
| `GET /vision/analyses` | H5, H3 | H3 |

Một số có thể là gác theo trường (L4/L5) chưa ghi vào đặc tả — cần PO/Backend Lead chốt bên nào đúng. `scripts/check-docs.mjs:44-48` chỉ kiểm path+method, không kiểm cột năng lực. `route-capability-guard.test.ts:18-19,88-103` coi là "có gác" nếu **bất kỳ** tệp import sâu 2 bước chứa `hasCapability(`/`requireCapability(` — không chứng minh endpoint đó thật sự gác; và loại trừ cả `public/` (`:107`) nên không có test nào buộc route công khai phải rate limit hay suy tổ chức từ mã gửi.

### API-13 — Đặt tên và họ tài nguyên (P2, V)

- Đặc tả dùng snake_case (`organization_id`, `next_cursor`, `job_id`). Query param: snake 56, camel 14 (`orderId`, `unreadOnly`, `storeId`, `sessionId`, `roleKey`, `productId`, `leadId`, `templateKey`). Khoá đối tượng trong tệp route: camel ~1158, snake ~326. Cùng một endpoint trộn: `jobs/batch` nhận `productId` nhưng trả `job_id`.
- Họ tài nguyên trùng/chồng: `integration/*` (máy gọi máy) vs `integrations/*` (Trung tâm Tích hợp); `organization/*` vs `organizations/*`; `customers/*` vs `crm/customers/*`; `catalog-links/*` vs `integration/catalog-links/*`; `orders` vs `greeting-card/orders` vs `coordinator/orders`. Một đoạn path tiếng Việt `noi-bo` giữa các path tiếng Anh.

### API-14 — Chưa có chính sách version (P2, V)

Chỉ có `/api/v1`; grep `deprecat|sunset|api-version` trong `src/app/api`, `src/core`: 0. Đặc tả 06 không định nghĩa thế nào là thay đổi phá vỡ, thời gian báo trước, hay cách đánh dấu endpoint sắp gỡ. Integration API (§11) và webhook ra ngoài đã có người tiêu thụ bên thứ ba → cần trước khi mở rộng đầu nối sàn (nợ #201).

### API-15 — Hợp đồng chưa máy đọc được (P2, V)

Không có OpenAPI (ARC-024). Đặc tả 06 (1.242 dòng markdown) mô tả thân/phản hồi bằng văn xuôi; CI chỉ bảo đảm có dòng cho mỗi path+method. 226 route khai `z.object` inline — không tái dùng được cho client/test/tài liệu; không route nào khai hay kiểm schema **phản hồi**. Sẵn có để tận dụng: zod 4 (`z.toJSONSchema`) và 3 bộ sinh JSON Schema có `--check` trong CI (`check:schemas:creative|coordinator|content-engine`).

### API-16 — Mã trạng thái và động từ (P3, V)

- Đặc tả 06 luật 4: AI trả `job_id` ngay — chỉ 4 route dùng 202; 9 route tạo job trả 201, `jobs/batch` trả 200.
- `DELETE`: 2/27 trả 204, còn lại 200 kèm thân khác nhau.
- Động từ trong path: `chat/conversations/[id]/create-order`, `product-copies/generate`, `products/one-image-kit/run`, `public/subcontract/[orderCode]/submit-delivery|submit-shipper`. `greeting-card/orders/[id]/confirm-order` có cả `POST` và `DELETE` (huỷ xác nhận) — khó đoán.

### API-17 — Vệ sinh bảo mật (P3, V)

- `jsonResponse` không đặt `Cache-Control`; chỉ 16 route tự đặt. Phản hồi có dữ liệu tổ chức nên mặc định `no-store` (an toàn khi sau này đặt CDN).
- Giới hạn kích thước thân chỉ kiểm tay ở 4 nơi (vd. `public/zalo-oa/webhook`, `public/integrations` 256 KB, `storage/[...key]`, `proxy/[...path]`); `request.json()` còn lại dựa vào mặc định của nền tảng.
- `platform/nav-matrix/route.ts:81-83`, `platform/ux-rollout-flags/route.ts:30-32`: ghi audit thay đổi cấu hình toàn sàn thất bại bị nuốt, không log.
- CSRF chỉ dựa `SameSite=Lax` + JSON, CSP `Report-Only` — đã có ở ARC-022, không lặp lại.
- Không bật CORS (đúng chủ đích, đặc tả 06 §17).

## 4. Lộ trình đề xuất

| Đợt | Việc | Phát hiện | Cần PO? |
|---|---|---|---|
| 1 (ngay) — **đã làm 06/11/2026**, xem §6 | Map `ZodError`/`SyntaxError` → 400 trong `errorResponse` + test; chặn `limit` ở `GET /orders`; sửa `noi-bo/identity`; `jobs/batch` bắt buộc khoá + zod; rate limit + trừ credit cho `content-engine/rewrite` | 01, 02, 03, 04, 05 | Mã năng lực + credit cho rewrite (nợ #170) |
| 2 — **đã làm 07/11/2026** trừ phần chờ PO, xem §7 | `Retry-After` + `RateLimit-*`; rate limit Integration API theo token; chốt 8 dòng năng lực lệch; `check:docs` kiểm cột năng lực | 08, 09, 12 | Chốt bên đúng cho 8 dòng |
| 3 — **đã làm 07/11/2026**, xem §8 | Ban hành chuẩn API Contract v1.1 (tài liệu 02); helper `defineRoute` + `parseBody` + `paginate` dùng chung; ratchet test cho route mới | 06, 07, 10, 13, 16 | Duyệt chuẩn — PO đã chốt 4 điểm |
| 4 — **Integration API đã làm 07/11/2026** (§9), **`/public/*` và chính sách deprecation đã làm** (§11) | OpenAPI 3.1 sinh từ zod: Integration API + `/public/*` trước, sau đó nội bộ; `check:openapi` trong CI | 14, 15 | PO chọn gác bằng `npm test`, không sửa CI |

Không đổi tên/di chuyển route hiện có trong các đợt trên — gom họ tài nguyên (API-13) chỉ áp cho route mới hoặc khi lên `/v2` (tài liệu 02 §8).

## 5. Câu hỏi cho PO

1. Mã năng lực cho `POST /content-engine/rewrite`, và có tính credit cho "AI viết lại nhanh" không?
2. 8 dòng năng lực lệch (API-12): mã hay đặc tả đúng?
3. Chốt mặc định `limit`: 25 (đặc tả) hay 20 (skill)?
4. Casing chuẩn cho route **mới**: snake_case theo đặc tả 06 (khuyến nghị) hay camelCase theo đa số mã hiện tại?
5. Thêm gate CI `check:openapi` (thay đổi CI cần PO duyệt theo CLAUDE.md)?

## 6. Nhật ký sửa — đợt 1 (06/11/2026)

| Mã | Đã sửa | Test | Còn lại |
|---|---|---|---|
| API-01 | `src/core/http/response.ts`: `errorResponse` đổi `ZodError` → 400 `details.issues`; `handle()` bọc `request.json()` của request — chỉ `SyntaxError` khi đọc thân mới thành 400 `details.body`, `JSON.parse` chỗ khác vẫn 500; route `.catch(() => null)` giữ nguyên hành vi. Phủ luôn 4 use-case CRM/in ấn gọi `schema.parse(rawInput)` | `tests/unit/core/http/handle-input-errors.test.ts` | Thống nhất dạng `details` (API-07) chờ chuẩn ở tài liệu 02 |
| API-02 | `content-engine/rewrite/route.ts`: 30 lần/10 phút/người dùng + 200 lần/giờ/tổ chức, kiểm trước khi gọi AI | `tests/unit/content-engine/rewrite-rate-limit-route.test.ts` | Mã năng lực và trừ credit — **chờ PO** (nợ #170) |
| API-03 | `orders/route.ts`: `?limit=` 1–100 (giữ mặc định 50), sai → 400 | `tests/unit/orders/list-orders-limit-route.test.ts` | Cursor + `{ data, next_cursor }` (API-10) |
| API-04 | `noi-bo/identity/route.ts`: bỏ `try/catch`, `notFound()`; giữ `{ success, data }` cho trang Kết nối | `tests/unit/organization/noi-bo-identity-route.test.ts` | — |
| API-05 | `jobs/batch/route.ts`: zod (`capabilities` 1–50), `Idempotency-Key` bắt buộc, `jsonResponse`; giữ mã 200 + hình dạng phản hồi mà `FeaturePicker` đọc | `tests/unit/jobs/batch-route.test.ts` | Đổi sang 202 khi chuẩn API-16 được duyệt |

Đặc tả 06 cập nhật cùng commit (§2 bảng lỗi; dòng `GET /orders`, `POST /jobs/batch`, `POST /content-engine/rewrite`, `GET /noi-bo/identity`).

## 7. Nhật ký sửa — đợt 2 (07/11/2026)

| Mã | Đã sửa | Test | Còn lại |
|---|---|---|---|
| API-08 | `enforceRateLimit` ghi trạng thái (giới hạn, còn lại, mốc mở lại = cuối cửa sổ cố định) vào ngữ cảnh request (`src/core/observability/request-context.ts#recordRateLimit`); `handle()` gắn `RateLimit-Limit/Remaining/Reset` cho mọi phản hồi của route có giới hạn, thêm `Retry-After` khi 429. Nhiều luật → báo luật còn ít lượt nhất | `tests/unit/core/http/rate-limit-headers.test.ts` | Route không dùng `handle()` (`chat/public/widget`, webhook chat) chưa có header — gắn với API-06 |
| API-09 | `requireIntegrationContext`: 600 lần/phút theo token (SSO: theo người dùng + tổ chức), đếm sau xác thực — phủ cả 12 route `/integration/*` | `tests/unit/integration/integration-rate-limit.test.ts` | Trần chưa đo trên tải thật của LocalBudd/SocialFlow — theo dõi 429 sau khi triển khai |
| API-12 | `scripts/check-docs.mjs` đối chiếu thêm cột năng lực: mã trong `requireCapability(ctx, "…")` của từng handler phải có trong cột năng lực đặc tả 06 (khi cột có mã). 8 dòng lệch hiện có nằm trong `NANG_LUC_LECH_CHO_PO`, danh sách chỉ được co lại (mục đã khớp mà còn giữ → đỏ) | Đã thử: bỏ một mục khỏi danh sách → đỏ; thêm mục đã khớp → đỏ | **Chờ PO** chốt mã hay đặc tả đúng cho 8 dòng (§3 API-12), rồi xoá khỏi danh sách |

## 8. Nhật ký sửa — đợt 3 (07/11/2026)

PO chốt: `limit` mặc định 25 · route mới snake_case · giữ `details.issues` · bật cả hai ratchet.

| Mã | Đã làm | Test |
|---|---|---|
| API-06/07/13/16 | `src/core/http/define-route.ts`: `defineRoute({ auth, rateLimit?, idempotency?, body?, query?, handler })` — `auth` theo kiểu (`tenant` + mã năng lực hoặc `capability: null` + lý do, `platform`, `integration`, `public` bắt buộc `rateLimit`, `cron`, `custom` + lý do); kiểm khoá snake_case của thân/query ngay lúc nạp module; bọc `handle()`. `src/core/http/contract-responses.ts`: `ok`/`created` (+`Location`)/`accepted` (202)/`noContent` (204)/`page` | `tests/unit/core/http/define-route.test.ts` (gồm kiểm lúc biên dịch: khớp chữ ký route handler Next 16) |
| API-10 | `src/core/http/pagination.ts`: `pageQuery` (1–100, mặc định 25, câu lỗi tiếng Việt), `toPage` (lấy dư 1 dòng), con trỏ mờ base64url, con trỏ hỏng → 400 | `tests/unit/core/http/pagination.test.ts` |
| Ratchet | `tests/unit/architecture/route-contract-ratchet.test.ts`: route mới phải dùng `defineRoute`; không tệp mới nào dưới `src/app/api` dùng `NextResponse.json`, `new Response(JSON.stringify`, `{ success }`, `{ ok }`, `{ error: "chuỗi" }`. Miễn trừ: `route-contract-legacy.txt` (501 route), `api-envelope-legacy.txt` (67 mục); cả hai chỉ được co lại | Đã thử: thêm route tạm vi phạm → đỏ cả hai phép |
| Gác quyền | `route-capability-guard.test.ts` tính `defineRoute(` là có gác — khai `auth` thay cho một mục `NO_CAPABILITY_GUARD` | — |

Chưa chuyển route cũ nào sang `defineRoute` (không đổi hợp đồng client đang chạy). Đặc tả 06 §2 và skill `api-development` đã cập nhật.

## 9. Nhật ký sửa — đợt 4 (07/11/2026)

PO chốt: phạm vi chỉ `/integration/*` · viết lược đồ phản hồi + test hợp đồng · chặn lệch bằng `npm test` (không sửa CI).

| Hạng mục | Đã làm | Test |
|---|---|---|
| Bộ dựng | `src/core/http/openapi.ts`: `buildOpenApiDocument` (OpenAPI 3.1, `z.toJSONSchema` 2020-12, không thêm dependency), envelope `Error` + 9 phản hồi lỗi dùng chung, header `RateLimit-*`/`Retry-After`; mã lỗi lấy từ `ERROR_CODES` (`src/core/http/errors.ts`) | — |
| Hợp đồng | `src/modules/integration/contracts/http-requests.ts` (lược đồ thân — 5 route chuyển sang import, luật kiểm giữ nguyên văn), `http-responses.ts` (13 phản hồi, `strictObject`), `integration-openapi.ts` (13 operation). Trần tần suất chuyển về `domain/integration-rate-limit.ts` (thuần) | — |
| Tệp sinh | `docs/spec/contracts/openapi/integration.openapi.json` — `npm run gen:openapi` / `npm run check:openapi` | `tests/unit/integration/integration-openapi.test.ts`: tệp khớp mã; route ↔ operation khớp hai chiều; route ngoài vùng đóng băng không tự khai lược đồ |
| Phản hồi thật | Mọi operation gọi trên CSDL thật, phản hồi phải qua lược đồ strict | `tests/tenant/integration-contract.test.ts` (8 ca) — lần đầu chạy bắt được 3 chỗ lệch: catalog trả thêm `trashed_at`/`purge_after`; dạng đọc lại của catalog thiếu `organization_id`/`trashed_at`/`purge_after`; `generated_flags` bắt buộc ở use-case dù lược đồ thân ghi tuỳ chọn (đã ghi vào mô tả) |
| Catalog đóng băng | 3 route `integration/catalog-links*` KHÔNG sửa; lược đồ chép sang hợp đồng | `tests/unit/integration/integration-catalog-contract.test.ts`: cùng bộ mẫu gửi tới route đóng băng và bản sao — kết luận phải trùng |

Phát hiện ngoài phạm vi (không sửa): `GET /integration/catalog-links?include_revoked=false` vẫn tính là `true` (`z.coerce.boolean` coi mọi chuỗi khác rỗng là `true`) — route nằm trong vùng Catalog đóng băng, cần PO duyệt mới sửa được. Phản hồi Integration API trả nguyên bản ghi nội bộ (vd. `usage.user_id`, `generation_jobs.payload/output/error`) — cân nhắc thu gọn khi lên `/v2`.

## 10. Nhật ký sửa — đợt 5 (07/11/2026)

PO chốt: trần thân JSON 2 MB · khoá trùng mà thân khác → chỉ cảnh báo, vẫn trả job cũ · `POST /orders` để đợt sau (cần sửa schema).

| Mã | Đã làm | Test |
|---|---|---|
| API-17 | `jsonResponse` đặt `Cache-Control: no-store` khi route chưa tự đặt | `tests/unit/core/http/handle-input-errors.test.ts` |
| API-17 | `handle()` đọc thân JSON theo luồng, trần `MAX_JSON_BODY_BYTES` = 2 MB → 413 `PAYLOAD_TOO_LARGE` (mã lỗi mới, `details.max_bytes`); chặn sớm theo `content-length` khai báo; `formData` không bị ảnh hưởng | cùng tệp: khai vượt trần, luồng không khai độ dài vượt trần, dưới trần vẫn đọc |
| API-17 | `platform/nav-matrix`, `platform/ux-rollout-flags`: ghi audit lỗi thì `log.error("platform.audit_write_failed")` thay vì nuốt im lặng | — |
| API-11 | `enqueueJob`: khoá trùng mà `payload`/`product_id` khác (so theo dạng chuẩn JSON, không phụ thuộc thứ tự khoá `jsonb`) → `log.warn("jobs.idempotency_payload_mismatch", { feature, job_id })`, vẫn trả job cũ | `tests/unit/jobs/idempotency-payload.test.ts`, `tests/tenant/job-idempotency-mismatch.test.ts` |
| OpenAPI | Operation có thân khai thêm 413; enum mã lỗi có `PAYLOAD_TOO_LARGE` | `tests/unit/integration/integration-openapi.test.ts` |
| CodeQL | `scripts/gen-openapi.ts` bỏ mẫu `existsSync` rồi đọc/ghi (`js/file-system-race`) — cảnh báo high trên PR #172 | — |

Còn lại cho đợt sau: ~~chống bấm đúp `POST /orders`~~ (đã làm, §12); chặn 422 khi khoá trùng thân khác sau khi có số đo cảnh báo.

## 11. Nhật ký sửa — đợt 6 (07/11/2026)

PO chốt: báo trước 90 ngày cho `/integration/*` và `/public/*`, 30 ngày cho API nội bộ · OpenAPI cho cả 40 route `/public/*`, đủ hợp đồng thân và phản hồi.

| Mã | Đã làm | Test |
|---|---|---|
| API-14 | `src/core/http/deprecation.ts`: sổ `DEPRECATIONS`, `NOTICE_DAYS` (ngoài 90 / nội bộ 30), header `Deprecation` / `Sunset` / `Link: rel="successor-version"`; `handle()` tự gắn cho route có trong sổ. Đặc tả 06 §2 ghi luật thay đổi phá vỡ và nhãn **SẮP GỠ**. Hiện sổ rỗng | `tests/unit/core/http/deprecation.test.ts` (báo trước thiếu ngày, quá ngày gỡ, route không tồn tại, đặc tả thiếu dòng) |
| API-15 | OpenAPI 3.1 cho 42 operation `/public/*` (40 route): `src/app/api/v1/public/_contracts/` (thư mục `_` không định tuyến), tệp `docs/spec/contracts/openapi/public.openapi.json`, `npm run gen:openapi` sinh cả hai bề mặt | `tests/unit/public/public-openapi.test.ts` (route ↔ operation, tệp khớp mã, route có rate limit) |
| API-15 | Lược đồ thân/query của 18 route chuyển sang `_contracts/requests.ts` nguyên văn (Thẻ chào, SePay, subcontract) — route import lại, hành vi không đổi. 3 route Catalog đóng băng giữ lược đồ riêng; bản sao đối chiếu bằng test | `tests/unit/public/public-catalog-contract.test.ts`; test Thẻ chào cũ chạy xanh không sửa (B5) |
| API-15 | Phản hồi khai `strictObject`, kiểm trên CSDL thật — bắt được 5 chỗ tài liệu/kiểu lệch mã (trường thùng rác catalog, danh sách thiếu trường, `generated_flags` bắt buộc, ảnh chụp mẫu trang theo dõi có `variant`/`flowers`, nhánh `alreadySubmitted` của shipper) | `tests/tenant/public-contract-{utility,catalog,greeting-session,greeting-tracking,subcontract}.test.ts`, `tests/helpers/contract.ts` |
| API-17 (sửa đợt 5) | e2e-ux treo 15 phút trên PR #172: `no-store` mặc định khiến Chromium không hoàn tất `fetch` "bắn rồi quên" (không đọc thân) của trang Thẻ chào → trang không rảnh mạng, kết nối bị giữ. `src/core/http/ack-routes.ts`: mọi phản hồi lỗi (≥ 400 — nhiều client chỉ xem `res.ok`, vd. 404 link gia công) và `ACK_ONLY_ROUTES` (2 route sự kiện + nhận chủ phiên) trả `no-cache`; phản hồi có dữ liệu giữ `no-store` | `tests/unit/core/http/ack-routes.test.ts` (đỏ trên mã cũ; gác `fetch` `keepalive` trong `src/components`), `tests/e2e/ux/a11y-journeys.spec.ts` |

Ghi nhận ngoài phạm vi (chưa sửa):
- `GET /public/catalog/{slug}` không có rate limit — route Catalog đóng băng; OpenAPI ghi `x-rate-limit: chưa có`.
- ~~`POST /public/subcontract/{orderCode}` `CLAIM` trả 500 khi `metadata` điều phối thiếu `declinedBranchIds`~~ — đã sửa (§12).
- Webhook Zalo OA vẫn trả envelope lỗi cũ (`x-legacy-error-envelope`); đổi cần thống nhất với Zalo.
- Còn từ đợt trước: `include_revoked=false` của Integration catalog bị hiểu là `true` (đóng băng); chống bấm đúp `POST /orders` cần sửa schema; 8 lệch năng lực và năng lực/credit của `content-engine/rewrite` chờ PO.

## 12. Nhật ký sửa — sau đợt 6 (07/11/2026)

PO chọn hai việc từ danh sách còn lại: sửa lỗi 500 nhận đơn gia công, chống bấm đúp `POST /orders` (đồng ý sửa schema).

| Mã | Đã làm | Test |
|---|---|---|
| API-11 | `POST /orders` nhận `Idempotency-Key` (≤ 255 ký tự): gửi lại cùng khoá → trả đơn đã tạo, 201 + `Idempotent-Replayed: true`; gửi đồng thời → một đơn. Cột `orders.idempotency_key` + chỉ mục duy nhất `(organization_id, idempotency_key)`, migration `20261107230000_orders_idempotency_key` (expand). Modal tạo đơn gửi một khoá cho mỗi lần soạn, giữ khi thử lại. Không lưu thân yêu cầu nên chưa phân biệt "cùng khoá, thân khác" | `tests/tenant/order-idempotency.test.ts` (3/5 ca đỏ trên mã cũ), `ingest-order-once.test.ts` |
| Ngoài phạm vi đợt 6 | `CLAIM` gia công với `subcontract_dispatch` thiếu `declinedBranchIds` → coi như rỗng, ghi lại khi nhận; `CANCEL` sau đó cũng không vỡ. Đường này đã có test khoá hành vi (B5) | `subcontract-order.test.ts`, `tests/tenant/public-contract-subcontract.test.ts` (đỏ trên mã cũ) |
