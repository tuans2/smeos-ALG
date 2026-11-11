# Audit Kiến trúc API — `/api/v1` (06/11/2026)

> Trạng thái: **ĐÃ DUYỆT — đang thực thi** (PO duyệt từng đợt 06–11/11/2026; lộ trình §4 xong, việc còn lại ở §37). Không thay thế đặc tả 06 (`docs/dac-ta/06-api-specification.md`, SSOT API).
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

## 13. Nhật ký sửa — các việc chờ PO (07/11/2026)

PO chốt 07/11/2026: 8 dòng lệch năng lực sửa đặc tả theo mã (`GET /media/optimizations` giữ `I2`); `content-engine/rewrite` gác một trong `F2`/`L2`/`L3` và trừ 1 credit mỗi lượt AI trả gợi ý; cho phép sửa 2 lỗi vùng Catalog; chặn 422 khi khoá trùng mà thân khác; OpenAPI cho `/platform/*`.

| Mã | Đã làm | Test |
|---|---|---|
| API-12 | Đặc tả 06 ghi đủ mã gác theo trường/tham số của 7 route (consent `Q9`, occasions `Q6`, catalogs Thẻ chào +`F2`, `/products` +`L4`/`L5`, vision analyses `H5`/`H3`/`L1` khi đã duyệt, media optimizations `I2`); `NANG_LUC_LECH_CHO_PO` rỗng | `npm run check:docs` |
| API-02 / nợ #170 | `content-engine/rewrite`: `requireRewriteCapability` (một trong `F2`/`L2`/`L3`), `holdRewriteCredit` giữ giá `content.rewrite` trước khi gọi AI (thiếu → 422 `QUOTA_EXCEEDED`), hoàn khi rơi về gợi ý dựng sẵn hoặc AI lỗi; không gian trải nghiệm không trừ. Gỡ khỏi danh sách route chưa gác | `tests/unit/content-engine/rewrite-credit-route.test.ts`, `src/modules/content-engine/use-cases/__tests__/rewrite-credit.test.ts`, `tests/tenant/rewrite-credit.test.ts` |
| API-09 / Catalog | `GET /public/catalog/{slug}` giới hạn 60 lần/phút/IP (OpenAPI thêm 429, `NO_RATE_LIMIT` rỗng); `GET /integration/catalog-links?include_revoked=` đọc bằng `z.stringbool()` — "false"/"0" không còn thành `true`, giá trị lạ → 400. Mốc khoá Catalog cập nhật kèm ngày PO duyệt | `tests/unit/public/public-catalog-rate-limit.test.ts`, `tests/unit/integration/integration-catalog-contract.test.ts` (3 ca đỏ trên mã cũ) |
| API-15 | OpenAPI 3.1 cho Console Vận hành Nền tảng: 70 operation (51 route) ở `src/app/api/v1/platform/_contracts/`, tệp `platform.openapi.json`. 23 route import lại lược đồ thân đã chuyển nguyên văn; `MAX_BULK_DELETE_IDS` chuyển sang `domain/partner-marketplace-limits.ts` để bộ sinh chạy không cần CSDL; phản hồi `strictObject` kiểm trên CSDL thật (Google Sheet/Drive giả lập) | `tests/unit/platform/platform-openapi.test.ts` (tệp khớp, route ↔ operation, `x-capability` ↔ đặc tả 06), `tests/unit/platform/platform-request-parity.test.ts`, `tests/platform/platform-contract-{orgs,config,data}.test.ts` |
| API-15 nội bộ (đợt nhóm lõi) | OpenAPI 3.1 nội bộ `internal.openapi.json`: 94 operation (74 route) — đơn hàng, báo giá, sản phẩm, CRM, thành viên, tổ chức, xác thực; nguồn ở `src/app/api/v1/_contracts/`. Lược đồ zod từng khai trong 32 route chuyển nguyên văn về `requests-*.ts` (route import lại, không đổi hành vi; route đồng ý nhận tin dùng chung danh sách kênh); thân do use-case tự kiểm có lược đồ mô tả + test đối chiếu; `BULK_MAX_IDS` chuyển sang `products/domain/product-bulk.ts` để bộ sinh chạy không cần CSDL. Nhóm còn lại (Thẻ chào, Điều phối, Creative, media…) làm ở các đợt sau | `tests/unit/architecture/internal-openapi.test.ts` (tệp khớp, route ↔ operation trong nhóm đã phủ, `x-capability` ↔ đặc tả 06), `tests/unit/architecture/internal-request-parity.test.ts`, `tests/tenant/internal-contract-{orders,products,crm,org}.test.ts` |
| API-15 nội bộ (đợt Thẻ chào) | Thêm 85 operation (66 route) `/greeting-card/*` vào `internal.openapi.json` (tổng 179). Lược đồ zod của 41 route (và `_coordinator-handlers.ts`) chuyển nguyên văn về `requests-greeting*.ts`; `op()` thêm `auth: platform` cho route cấu hình kênh thông báo nhân viên do người vận hành nền tảng gọi. Phát hiện ngoài phạm vi (chưa sửa): Điều phối bấm "Nhận đơn" cho đơn khách đã gửi ảnh chuyển khoản, khi được tự ghi cọc, luôn nhận 409 (ghi tiến độ trên bản đọc cũ sau khi ghi cọc đã tự nhận đơn) | `tests/unit/architecture/internal-openapi.test.ts`, `tests/tenant/internal-contract-greeting-{catalog,orders,ops}.test.ts` (nhà cung cấp SMS/Drive giả lập) |
| API-15 nội bộ (đợt Điều phối) | Thêm 35 operation (30 route) `/coordinator/*` vào `internal.openapi.json` (tổng 214). Dùng thẳng lược đồ của module (`coordinator/adapters/http-schemas.ts`); lược đồ khai trong 12 route chuyển nguyên văn về `requests-coordinator.ts`. Bộ sinh khai được cả JSON lẫn multipart cho cùng một operation (xác nhận giao có/không ảnh); ba tệp OpenAPI có sẵn không đổi | `tests/unit/architecture/internal-openapi.test.ts`, `tests/tenant/internal-contract-coordinator{,-chain}.test.ts` (AI kiểm ảnh giả lập) |
| API-15 nội bộ (đợt Creative Studio) | Thêm 22 operation (16 route) `/creative-production/*` (tổng 236), chỉ ghi tài liệu — không đổi hành vi, không bật/tắt chặng (PO 08/11/2026). Hợp đồng chặng của module (`creative-production/contracts/`) được dùng thẳng cho gói chiến dịch, hiệu quả, kịch bản phân cảnh, bản nháp nội dung; lược đồ của 9 route chuyển nguyên văn về `requests-creative.ts`. Phát hiện ngoài phạm vi (chưa sửa): `POST /creative-production/package` thiếu cả `creativeResult` lẫn `authenticResult` trả 500 thay vì 400; `mediaPlanItems[].targetPlatform` của chế độ AUTHENTIC mang tên khung cắt (vd. `tiktok_story`) ngoài kiểu TS khai báo | `tests/unit/architecture/internal-openapi.test.ts`, `tests/tenant/internal-contract-creative.test.ts` (cổng AI giả lập) |
| API-15 nội bộ (đợt ảnh) | Thêm 13 operation (11 route) `/media/*` (tổng 249): tối ưu ảnh M04a, duyệt nhanh ảnh gốc, biến thể marketing M04b (đơn, lô). Thân `POST /media/variants` dùng thẳng hợp đồng Chặng 06c (`mediaVariantBodySchema`/`mediaVariantResultSchema`); lược đồ của 4 route chuyển nguyên văn về `requests-media.ts`. `POST /media/background-removal` (đã đóng, luôn 409, không cần phiên) khai `x-capability` "công khai" | `tests/unit/architecture/internal-openapi.test.ts`, `tests/tenant/internal-contract-media.test.ts` (kết quả worker chèn thẳng) |
| API-15 nội bộ (đợt tác vụ AI) | Thêm 32 operation (25 route) `/jobs/*`, `/vision/*`, `/audio/*`, `/video/*` (tổng 281). Thân job âm thanh/video và bản ghi video dùng thẳng hợp đồng Chặng 06b/06d; lược đồ của 7 route chuyển nguyên văn về `requests-ai-studio.ts`; luồng sự kiện (SSE), CSV, tệp nhạc khai kiểu nội dung riêng. Phát hiện ngoài phạm vi (chưa sửa): use-case video (`get-video-job`, `update-storyboard`, `approve-storyboard`, `approve-video-output`) ném `Error` trần khi không thấy job — kể cả job của tổ chức khác — hoặc sai trạng thái, nên trả 500 thay vì 404/409; `POST /video/jobs/:id/render` gặp thân không phải JSON cũng trả 500 (`JSON.parse` trực tiếp) | `tests/unit/architecture/internal-openapi.test.ts`, `tests/tenant/internal-contract-ai-studio.test.ts` (kết quả worker chèn thẳng, `fetch` giả lập) |
| API-02 (giao diện) | "Viết lại bằng AI" bị chặn giờ báo lý do: hết credit (422 `QUOTA_EXCEEDED`) → "Tiệm đã hết credit…", thiếu quyền (403) → "Tài khoản của bạn chưa được dùng…" (`src/lib/ai-rewrite-error.ts`). Form hồ sơ (`ai-rewrite-input.tsx`) trước đó bịa 3 gợi ý tại chỗ khi lỗi; form sản phẩm (`ai-product-enrichment-modal.tsx`) im lặng. Lỗi khác giữ cách xử lý cũ | `src/lib/ai-rewrite-error.test.ts` (đỏ trên mã cũ) |

**Đã làm ở §36 (09/11/2026), trừ `/integration/*` và `POST /orders`.** Hoãn (PO 07/11/2026): chặn 422 `IDEMPOTENCY_KEY_REUSED` khi khoá trùng mà thân khác. Lý do: tạo kịch bản Creative Studio (`creative.scene_plan`) cố ý gửi lại cùng khoá `scenePlanKey(assetId, topicId, mode)` (`src/components/creative-studio/scene-plan-client.ts`) để mở lại kịch bản đã có, trong khi thân có thể khác (nhà viết, dữ liệu thương hiệu) — chặn cho mọi job sẽ làm vỡ luồng đó. Khi làm lại: chặn mặc định và miễn trừ có lý do cho feature dùng khoá cố định, hoặc đổi luồng mở lại kịch bản sang đọc thẳng. Job vẫn chỉ ghi cảnh báo `jobs.idempotency_payload_mismatch`; `POST /orders` không lưu thân nên chưa phát hiện được.


## 14. Nhật ký sửa — lỗi 500 phát hiện khi viết OpenAPI nội bộ (08/11/2026)

Sửa các đường trả 500 đã ghi "chưa sửa" ở §13 (đợt Creative Studio, đợt tác vụ AI), theo chuẩn tài liệu 02 §2/§5: không thấy hoặc của tổ chức khác → 404, sai trạng thái → 409, vi phạm luật nghiệp vụ → 422, thân hỏng → 400. Không đổi hình dạng phản hồi thành công.

| Mã | Đã làm | Test |
|---|---|---|
| API-01 / API-16 | Use-case video `get-video-job`, `update-storyboard`, `approve-storyboard`, `approve-video-output` ném `AppError` thay cho `Error` trần (`src/modules/video-studio/use-cases/video-errors.ts`): không thấy job → 404 (câu lỗi không nhắc mã job); luật duyệt trong `domain/video-approval-rules.ts` ghi thêm `kind` (`state` → 409, `content` → 422); đang render mà sửa phân cảnh → 409; phân cảnh sai luật của khuôn → 422 | `tests/tenant/api-error-mapping.test.ts` (4 ca video đỏ trên mã cũ: 500 `INTERNAL`), `src/modules/video-studio/use-cases/__tests__/video-errors.test.ts` |
| API-01 | `POST /video/jobs/:id/render`: thân không phải JSON → 400 `details.body` (trước đó `JSON.parse` trần → 500) | `tests/tenant/api-error-mapping.test.ts` (đỏ trên mã cũ) |
| API-01 | `POST /creative-production/package`: lược đồ thân (`requests-creative.ts`) đòi ít nhất một trong `creativeResult`/`authenticResult` → 400 (trước đó hàm `packageCampaign()` ném `Error` → 500) | `tests/tenant/api-error-mapping.test.ts` (đỏ trên mã cũ) |
| API-15 | OpenAPI nội bộ: bỏ ghi chú "hiện trả 500" của 5 operation video và `packageCampaignDraft`, khai 404/409/422 thật; `internal.openapi.json` sinh lại | `tests/unit/architecture/internal-openapi.test.ts` |

Còn lại, chưa sửa (ngoài phạm vi đợt này):
- `POST /video/jobs/:id/render` vẫn trả 422 khi sai trạng thái (kịch bản chưa duyệt, đang/đã render) — theo chuẩn là 409; đổi là thay mã trạng thái client đang thấy nên để đợt riêng.
- `POST /creative-production/package`: `creativeResult`/`authenticResult` vẫn là `z.any()` — gửi đối tượng sai hình dạng (vd. thiếu `mediaPlanItems`) vẫn có thể thành 500. `mediaPlanItems[].targetPlatform` của chế độ AUTHENTIC vẫn mang tên khung cắt ngoài kiểu TS.
- Điều phối "Nhận đơn" luôn 409 khi đơn đã tự ghi cọc (§13, đợt Thẻ chào) — lỗi nghiệp vụ, không phải 500.

## 15. Nhật ký sửa — OpenAPI nội bộ, đợt thông báo & chat (08/11/2026)

Phủ thêm 3 nhóm vào `internal.openapi.json`: `/notification/*` (11 route, 18 operation), `/chat/*` (8 route, 13 operation), `/internal-chat/*` (3 route, 5 operation) — tổng 317 operation. Chỉ ghi tài liệu, không đổi hành vi hay hình dạng phản hồi.

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 11 route chuyển nguyên văn về `src/app/api/v1/_contracts/requests-notification.ts` và `requests-chat.ts` (route import lại). Danh sách kênh thông báo giống hệt nhau ở 5 route gom thành `notifyChannelSchema`. Thân do route tự đọc (tạo/gửi hội thoại tư vấn, chốt đơn từ chat) có lược đồ mô tả. Phản hồi khai `strictObject` (`responses-notification.ts`, `responses-chat.ts`), giữ nguyên các envelope cũ `{ success: true, … }` đã có trong `api-envelope-legacy.txt`; khung chat công khai và webhook Facebook/Zalo khai `x-legacy-error-envelope` | `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi kiểm trên CSDL thật: hộp thư, SSE, tuỳ chọn, chính sách tổ chức, mặc định cửa hàng, khoá cứng hai tầng; hội thoại tư vấn (cổng AI giả lập), chốt đơn nháp, kênh, hạn mức chat công khai, khung chat công khai, đường từ chối của webhook; chat nội bộ hai tổ chức | `tests/tenant/internal-contract-notification.test.ts`, `tests/tenant/internal-contract-chat.test.ts` |
| API-12 | Đặc tả 06 dòng `/chat/channels`: POST gác `T4` ở use-case (`configure-chat-channel.ts`), chỉ GET chưa gác — câu cũ "route không gọi qua nó" đã lỗi thời | `npm run check:docs`, `internal-openapi.test.ts` (`x-capability` ↔ đặc tả 06) |

Phát hiện khi viết hợp đồng — hai lỗi P1 đã sửa ở §16; còn lại chưa sửa:

- ~~`GET /notification/inbox` và `GET /chat/conversations`: `page`/`limit` không phải số → 500~~ (đã sửa ở §37) (`parseInt`/`Number` → `NaN` vào Prisma). Hộp thư kẹp `limit` 1–100 nhưng `pagination.limit` báo lại số đã gửi; `chat/conversations` không có trần `limit`.
- `PATCH /notification/preferences` chỉ xét khoá cứng của tầng TRÊN `STORE`, nên khoá tầng cửa hàng (`/notification/store-hard-locks`) không chặn người dùng bật lại; luật gửi (`resolveCascade`) vẫn áp khoá đó nên tuỳ chọn được lưu nhưng không có hiệu lực. Lỗi 403 ở đây trả envelope cũ `{ error: "chuỗi", reason }`.
- `GET /notification/events?tier=` không kiểm giá trị; `GET /chat/channels` và `GET /chat/public-limits` chưa gác mã năng lực (đã ghi RS-8).

## 16. Nhật ký sửa — hai lỗi P1 phát hiện ở §15 (08/11/2026)

Người dùng yêu cầu sửa trước khi phủ tiếp OpenAPI.

| Lỗi | Đã sửa | Test |
|---|---|---|
| **Cách ly tenant** — `POST /internal-chat/messages/{id}/action` ghi `action_payload` theo `where: { id }`, không kiểm tin thuộc tổ chức nào hay người bấm có tham gia hội thoại không; người của tổ chức bất kỳ biết mã tin sửa được thẻ của tổ chức khác và đăng tin hệ thống vào hội thoại đó. Kèm: ghi đè toàn bộ payload (mất `orderId`/`orderCode`), mã tin lạ → 500 | `HandleCardActionUseCase` đọc tin (`findMessageById`, thêm vào cổng `IInternalChatRepository`): không thấy, đã xoá, hoặc người bấm không tham gia → 404 (`ChatAccessDeniedError`, như mọi đường chat nội bộ); tin không phải thẻ đơn → 409; trạng thái mới gộp lên payload cũ. Test đơn vị cũ cho người KHÔNG tham gia bấm nút (khoá đúng hành vi lỗi) — nay mời đối tác vào hội thoại trước | `tests/tenant/chat-p1-fixes.test.ts` (3 ca đỏ trên mã cũ: tổ chức khác bấm được → 200, mã lạ → 500, mất mã đơn), `src/modules/internal-chat/use-cases/internal-chat.test.ts` |
| **Credit kênh ngoài** — `checkAndDeductUsageCredit` trừ credit rồi ghi `usage.workspace_id = "system"`; khoá ngoại `usage_workspace_id_fkey` (05/11/2026) chặn, nên từ 05/11 mọi lượt AI trả lời qua khung chat công khai, Facebook Messenger, Zalo OA của tiệm còn credit đều hỏng sau khi đã trừ credit | Tra workspace mặc định của tổ chức (cũ nhất, cùng luật `findDefaultForSessionOrganization`) TRƯỚC khi trừ; không có workspace → không trừ, trợ lý trả câu mời chờ nhân viên như khi hết credit | `tests/tenant/chat-p1-fixes.test.ts` (đỏ trên mã cũ: 500; nay 200, số dư −1, một dòng `usage` đúng workspace) |

Chưa làm: hoàn credit cho các lượt đã trừ mà không trả lời được trong khoảng 05/11–08/11/2026 — cần đối soát sổ cái credit (`credit_transactions` có dòng `kind = USAGE`, `service = CHAT`, lý do "Trả lời AI qua …" mà không có dòng `usage` `chat.message.ai_reply` tương ứng) trên CSDL thật; không làm được từ môi trường soạn mã.

## 17. Nhật ký sửa — OpenAPI nội bộ, đợt chi nhánh & chuỗi (08/11/2026)

Phủ thêm 3 nhóm vào `internal.openapi.json`: `/branches/*` (2 route, 3 operation), `/branch-portal/*` (1 route, 1 operation), `/chain/*` (9 route, 10 operation) — tổng 331 operation. Chỉ ghi tài liệu, không đổi hành vi hay hình dạng phản hồi.

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 4 route (tạo/sửa chi nhánh, đăng ký cửa hàng đối tác, rời chuỗi) chuyển nguyên văn về `src/app/api/v1/_contracts/requests-chain.ts`, route import lại. Thân hồ sơ thu thập (`rules`) có lược đồ mô tả theo kiểu `CollectionRule` — route vẫn đọc thô. Phản hồi khai `strictObject` (`responses-chain.ts`), gồm dòng `branches` nguyên bản và định nghĩa trường của Field Registry v2 | `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi kiểm trên CSDL thật hai tổ chức: chi nhánh (tạo, trùng mã 409, sửa, của tổ chức khác 404), cổng chi nhánh, hồ sơ thu thập (đọc, xem trước, phát hành), cửa hàng đối tác, tóm tắt và thư mục dữ liệu (chuỗi khác 404), liên kết phía cửa hàng (đồng ý, rời, từ chối; phía chuỗi gọi 404) | `tests/tenant/internal-contract-chain-org.test.ts` |

Phát hiện khi viết hợp đồng (chưa sửa):
- `PUT /chain/collection-profile` và `POST /chain/collection-profile/preview`: thiếu `rules` hoặc không phải mảng → route ném `Error` trần → 500 (đã thử). `PUT` với quy tắc sai luật → `publish-chain-collection-profile.ts` cũng ném `Error` trần → 500 (đọc mã); `/preview` trả lỗi đó trong `validation.issues`.
- `POST /chain/partner-stores` trùng mã cửa hàng trong tổ chức → 500 (vỡ ràng buộc duy nhất), không phải 409 như `POST /branches` (đã thử).
- `get-store-folder-data.ts` lùi về giá cố định 250.000đ khi sản phẩm tồn kho chưa có `price_vnd` — số bịa hiện trên thư mục dữ liệu cửa hàng (trái quyết định nợ #87 "không bịa giá").

## 18. Nhật ký sửa — OpenAPI nội bộ, đợt tính giá & bảng giá (08/11/2026)

Phủ thêm 3 nhóm vào `internal.openapi.json`: `/costing/*` (9 route, 11 operation), `/pricing-rules` (1 route, 2 operation), `/price-lists/*` (2 route, 6 operation) — tổng 350 operation. Chỉ ghi tài liệu, không đổi hành vi hay hình dạng phản hồi.

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 7 route chuyển nguyên văn về `src/app/api/v1/_contracts/requests-costing.ts`, route import lại; thân bảng giá giữ ở `price-lists/schema.ts` (dùng chung POST/PUT kèm hàm đổi) và được xuất lại. Phản hồi khai `strictObject` (`responses-costing.ts`), viết từ kiểu TS rồi đối chiếu với mẫu ghi từ phản hồi thật (`CAPTURE_CONTRACT_DIR`) | `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi kiểm trên CSDL thật: hồ sơ ngành, nguyên liệu (tạo, sửa giá, cảnh báo biến động, lịch sử), công thức (bản nháp từ BOM, lưu, đọc lại), giá vốn + kịch bản giá (kèm giá đối thủ), áp giá, dự toán mua + đánh dấu đã mua, quy tắc giá, bảng giá (tạo, danh sách, bản in, sửa, bật/tắt, bỏ) | `tests/tenant/internal-contract-costing.test.ts` |

Phát hiện khi viết hợp đồng (chưa sửa):
- `GET /pricing-rules?branch_id=` nhận mã chi nhánh của tổ chức khác hoặc không tồn tại → 200, lặp lại mã đó ở `branch_id` và trả cấu hình của tổ chức phiên (không lộ dữ liệu tổ chức khác — dòng quy tắc vẫn lọc theo phiên). `PUT` đã kiểm chi nhánh → 404; `GET` nên làm như vậy (luật 2 CLAUDE.md: khác tổ chức → 404).
- Envelope trộn: `/pricing-rules` và `/price-lists/*` trả thẳng đối tượng (không `{ data }`), `DELETE /price-lists/:id` trả `{ ok: true }` — đã có trong `api-envelope-legacy.txt`, ghi rõ ở OpenAPI.

## 19. Nhật ký sửa — OpenAPI nội bộ, đợt Trung tâm Tích hợp, token & SSO (08/11/2026)

Phủ thêm 3 nhóm vào `internal.openapi.json`: `/integrations/*` (12 route, 13 operation), `/integration-tokens/*` (3 route, 4 operation), `/sso/*` (1 route, 1 operation) — tổng 368 operation. Chỉ ghi tài liệu, không đổi hành vi hay hình dạng phản hồi. (`/integration/*` — Integration API cho bên thứ ba — đã có tệp riêng `integration.openapi.json` từ đợt 4.)

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 7 route chuyển nguyên văn về `src/app/api/v1/_contracts/requests-integrations.ts`, route import lại (đăng/gỡ tin dùng chung một lược đồ giống hệt). Phản hồi khai `strictObject` (`responses-integrations.ts`) từ kiểu TS của `integration-hub` và `integration`, đối chiếu mẫu ghi từ phản hồi thật. Mã năng lực `W1`–`W5` kiểm ở use-case — OpenAPI ghi rõ | `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi kiểm trên CSDL thật, không gọi nhà cung cấp thật (đầu nối thử `test_echo`, `test_shop`): kết nối (tạo, tổng quan, kiểm tra, đổi khoá, nhật ký, phát lại, ngắt), kênh bán (đăng, tin & đơn, còn/hết hàng, gỡ), quản trị chuỗi (cửa hàng thường → 422), token (cấp, danh sách, xoay, thu hồi; tổ chức khác → 404), làm mới SSO (cookie `smeos_sso`) | `tests/tenant/internal-contract-integrations.test.ts` |
| Tài liệu | Đặc tả 06 dòng `/sso/refresh` ghi cookie `floraos_sso` — tên cũ; mã đặt `smeos_sso` (`SSO_COOKIE`, `core/http/cookies.ts`), vẫn đọc cookie cũ để tương thích. Sửa dòng đặc tả | `npm run check:docs` |

Phát hiện khi viết hợp đồng (chưa sửa):
- `POST /integration-tokens/:id/rotate` cấp token mới với thời hạn MẶC ĐỊNH (`resolveExpiry(now, undefined)`), không giữ `ttl_days` đã chọn lúc cấp — token cấp 30 ngày xoay ra token 90 ngày (đã thử). Người cấp token ngắn hạn có chủ đích sẽ vô tình kéo dài hạn khi xoay.
- Chú thích đầu `sso/refresh/route.ts` vẫn nói cookie `floraos_session`/`floraos_sso` (tên cũ) — chỉ là chú thích, không đổi ở đợt này.
- Không có đường nào trả 500 trong 12 phép thử lỗi (đầu nối lạ, khoá sai, mã không phải UUID, `ttl_days` sai, đầu nối quản trị lạ).

## 20. Nhật ký sửa — OpenAPI nội bộ, đợt tư liệu & kho tệp (08/11/2026)

Phủ thêm 3 nhóm vào `internal.openapi.json`: `/assets/*` (5 route, 7 operation), `/asset-usages/*` (2 route, 3 operation), `/storage/*` (6 route, 8 operation) — tổng 386 operation. Chỉ ghi tài liệu, không đổi hành vi, cách ghi/xoá tệp hay hình dạng phản hồi.

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 5 route chuyển nguyên văn về `src/app/api/v1/_contracts/requests-storage.ts` (kèm hai danh sách giá trị nơi dùng/trạng thái mà `GET /asset-usages` dùng chung), route import lại; thân `POST /assets` là hợp đồng Chặng 01 (xuất lại). Phản hồi khai `strictObject` (`responses-storage.ts`), đối chiếu mẫu ghi từ phản hồi thật. `/storage/{key}` (route bắt mọi đường dẫn `[...key]`) khai xác thực bằng chữ ký URL, không cần phiên; test kiến trúc đổi `[...key]` → `{key}` khi so route ↔ operation | `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi kiểm trên CSDL thật và kho đĩa cục bộ: xin URL tải lên → tải thẳng bằng URL ký → ghi nhận asset → danh sách, đọc, URL xem, đọc tệp (cả `Range` 206, thiếu chữ ký 400), duyệt, xoá (204); thùng rác (chuyển, liệt kê, khôi phục, xoá vĩnh viễn, thiếu `type` 400); Kho dữ liệu (tóm tắt, danh sách); nơi dùng tư liệu (tạo, danh sách, sửa, `limit` sai 400) | `tests/tenant/internal-contract-storage.test.ts` |

Ghi nhận:
- Thùng rác trả envelope cũ `{ success: true }`, `PUT /storage/{key}` trả `{ ok, key }` (đã có trong `api-envelope-legacy.txt`).
- `x-capability` của `GET · POST /storage/trash` chỉ ghi `G3`: cột năng lực của đặc tả 06 viết `` `G3` \| `L4` \| `A3` \| `B6` `` — bộ tách cột của `internal-openapi.test.ts` (và `check:docs`) cắt ở dấu `|` dù đã thoát, nên chỉ đọc được `G3`. Ba mã còn lại ghi trong mô tả operation. Nên viết lại cột đó bằng `·` khi sửa đặc tả lần tới.
- 14 phép thử lỗi (mã lạ, khoá kho của tổ chức khác, chi nhánh lạ, `type` thư viện sai, `limit` không phải số…) không có đường nào trả 500.

## 21. Nhật ký sửa — OpenAPI nội bộ, đợt Thương hiệu & dữ liệu bán hàng (08/11/2026)

Phủ thêm 3 nhóm vào `internal.openapi.json`: `/brand-kit/*` (5 route, 5 operation), `/brand-library/*` (4 route, 6 operation), `/product-copies/*` (5 route, 6 operation) — tổng 403 operation. Chỉ ghi tài liệu, không đổi hành vi hay hình dạng phản hồi. (Cụm nội dung còn lại — `content-engine`, `market-intelligence` — làm ở đợt sau.)

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 5 route chuyển nguyên văn về `src/app/api/v1/_contracts/requests-brand.ts` (Bộ nhận diện và Landing page dùng chung một lược đồ giống hệt), route import lại. Thân `product-copies` do route/use-case tự kiểm có lược đồ mô tả; danh sách trường sửa được đối chiếu với `validateProductCopyEdited` | `tests/unit/architecture/internal-request-parity.test.ts` (5 mẫu), `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi khai `strictObject` (`responses-brand.ts`), đối chiếu mẫu ghi từ phản hồi thật; kiểm trên CSDL thật với cổng AI giả lập (dữ liệu bán hàng trả bản cố định, khẩu hiệu/landing lùi về nội dung dựng sẵn): mục Thương hiệu từ hồ sơ trống tới xuất bản landing page, thư viện nhận diện (tạo, sửa, phiên bản, mục chuỗi), dữ liệu bán hàng (sinh, sửa, trường lạ 400, duyệt, từ chối, thiếu khoá idempotency 400) | `tests/tenant/internal-contract-brand.test.ts` |
| API-12 | Đặc tả 06 bảng `product-copies`: `GET /product-copies` ghi "chưa gác" — mã gác `H5` ở `listProductCopies`; cột "Gác ở đâu" ghi `route` cho cả 6 dòng trong khi cả 6 gác ở use-case. Sửa theo mã | `npm run check:docs`, `internal-openapi.test.ts` |

Ghi nhận:
- `product-copies` trả thẳng dòng CSDL (không `{ data }`), `PATCH` sai thân trả lỗi chỉ có `message` (không `details`) — giữ nguyên, ghi ở OpenAPI.
- Một lượt phân tích chỉ có một bản dữ liệu bán hàng: gọi `generate` lần hai (khoá idempotency khác) trả lại bản cũ, không gọi AI và không tạo job mới.
- 8 phép thử lỗi (bước bị khoá, mục đã lưu trữ, mã lạ, mã không phải UUID) không có đường nào trả 500.

## 22. Nhật ký sửa — OpenAPI nội bộ, đợt viết nội dung AI & xu hướng thị trường (08/11/2026)

Phủ thêm 2 nhóm vào `internal.openapi.json`: `/content-engine/*` (6 route, 7 operation), `/market-intelligence/*` (5 route, 6 operation) — tổng 416 operation. Chỉ ghi tài liệu, không đổi hành vi hay hình dạng phản hồi.

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 3 route (landing page, viết lại nhanh, lượt nghiên cứu) chuyển nguyên văn về `src/app/api/v1/_contracts/requests-content.ts`, route import lại; `catalog-generate` nằm trong vùng Catalog đóng băng — route KHÔNG sửa, `catalogGenerateBody` là bản sao, cùng bộ mẫu gửi tới route thật và bản sao phải cho cùng kết luận (`tests/unit/content-engine/catalog-generate-contract.test.ts`, 10 mẫu); thân bài đa kênh dùng hợp đồng `content-engine/contracts/generation.ts`, đọc ảnh/phân tích sản phẩm dùng hợp đồng Chặng 02/03 (xuất lại, cả lược đồ đầu ra). Phản hồi còn lại khai `strictObject` (`responses-content.ts`), đối chiếu mẫu ghi từ phản hồi thật | `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi kiểm trên CSDL thật với cổng AI giả lập trả "không chạy được" (đúng kết quả cổng thật, không ném lỗi): bài đa kênh (tra, xem, duyệt, tạo mới → bài dựng sẵn 201, thiếu khoá idempotency 400), landing page, catalog, viết lại nhanh (`fallback: true`); xu hướng thị trường (cơ hội, lượt nghiên cứu, sức khoẻ nguồn), đọc ảnh (cổng trả ví dụ đầu ra Chặng 02, ảnh thật trong kho đĩa), phân tích sản phẩm (thân theo ví dụ Chặng 03) | `tests/tenant/internal-contract-content.test.ts` |

Phát hiện khi viết hợp đồng (chưa sửa):
- `POST /market-intelligence/product-intelligence` thiếu `components` → use-case ném `Error` trần → 500, không phải 400 (đã thử).
- `GET /market-intelligence/opportunities?limit=abc` → 500 (`parseInt` → `NaN` vào Prisma; đã thử). `min_score` không phải số bị bỏ qua.
- `POST /market-intelligence/research-runs`: lượt nghiên cứu và lịch sử (`research_runs`, `provider_health`) là dữ liệu chung toàn nền tảng, không có `organization_id` — người dùng của bất kỳ tổ chức nào có `V1` cũng kích hoạt được lượt chạy cho cả nền tảng và xem được lịch sử của mọi lượt; chưa giới hạn tần suất; thân sai lược đồ không bị từ chối mà lùi về `MANUAL`. Không lộ dữ liệu tổ chức, nhưng là bề mặt tốn tài nguyên chung — nên giới hạn tần suất hoặc chuyển sang Console Vận hành Nền tảng.
- `POST /market-intelligence/vision-extract` khi không có tệp trong kho trả 500 kèm thông báo chứa khoá kho nội bộ (`org/<id>/unfiled/<id>.jpg`) — lộ chi tiết nội bộ trong lỗi 500.
- Bài học test: `expectContract(res, status, schema)` bỏ qua bước kiểm khi `schema` là `undefined` — một lần xuất lại sai tên lược đồ đã làm ca phân tích sản phẩm xanh rỗng cho tới khi `typecheck` bắt được. Các đợt trước đều qua `typecheck` nên không bị ảnh hưởng.

## 23. Nhật ký sửa — OpenAPI nội bộ, đợt phiên, báo cáo, bản in, mã giảm giá, credit (09/11/2026)

Phủ thêm 5 nhóm vào `internal.openapi.json`: `/session/*` (5 route, 5 operation), `/reports/*` (5 route, 5 operation), `/print/*` (4 route, 5 operation), `/vouchers/*` (3 route, 5 operation), `/usage/*` (3 route, 4 operation) — tổng 440 operation. Chỉ ghi tài liệu, không đổi hành vi hay hình dạng phản hồi.

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 7 route chuyển nguyên văn về `src/app/api/v1/_contracts/requests-misc.ts`, route import lại; thân tạo bản in là lược đồ của module `print` (xuất lại). Phản hồi khai `strictObject` (`responses-misc.ts`) từ kiểu TS của `reporting`, `print`, `promotions`, `usage`, đối chiếu mẫu ghi từ phản hồi thật. Báo cáo và hạn mức credit gác mã năng lực ở use-case (`R20`, `G8`/`U2`) — OpenAPI ghi rõ | `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi kiểm trên CSDL thật: lời mời (xem, nhận, từ chối), đổi tổ chức (cookie `smeos_sso`, tổ chức không phải thành viên 404), đổi mật khẩu; 5 báo cáo (kỳ ngược 400); lịch sử, tổng hợp, hạn mức credit; đợt mã giảm giá (tạo, danh sách, xem, tạm dừng, xuất CSV); bản in (kiểm trước khi in, tạo, danh sách, xem, xuất PDF) | `tests/tenant/internal-contract-misc.test.ts` |

Phát hiện khi viết hợp đồng (chưa sửa):
- `GET /reports/*?from=abc`: ngày sai định dạng bị bỏ qua, dùng kỳ mặc định (200) — đặc tả 06 ghi "sai → 400"; chỉ kỳ quá 366 ngày hoặc `from` > `to` mới trả 400 (đã thử).
- Đặc tả 06 mục 14 (dòng "Chưa có: … `/vouchers`") còn ghi endpoint mã giảm giá chưa xây, trong khi `/vouchers/batches/*` đã có và có dòng riêng trong đặc tả — dòng "chưa có" là cũ (nằm trong danh sách RS-7 chờ PO, không tự sửa).
- Lỗi sai thân của `/print/*` trả `details` dạng bản đồ trường → câu (không phải `details.issues` như chuẩn v1.1).
- Lịch sử credit (`GET /usage`) rỗng trong test — lược đồ dòng `usage` viết theo lược đồ CSDL, chưa đối chiếu trên dòng thật.
- 19 phép thử lỗi (mật khẩu sai/yếu, mã trùng, vượt trần %, ngày ngược, `limit`/`period` sai, mã lạ) không có đường nào trả 500.

## 24. Nhật ký sửa — OpenAPI nội bộ, đợt hồ sơ & kênh cửa hàng (09/11/2026)

Phủ thêm 7 nhóm vào `internal.openapi.json`: `/business-profile/*` (2 route, 3 operation), `/brand-profile` (1 route, 2 operation), `/store/*` (1 route, 1 operation), `/store-share-link/*` (2 route, 3 operation), `/shop-reviews/*` (2 route, 4 operation), `/custom-domains/*` (3 route, 4 operation), `/short-links/*` (3 route, 4 operation) — tổng 461 operation. Chỉ ghi tài liệu, không đổi hành vi hay hình dạng phản hồi.

| Mã | Đã làm | Test |
|---|---|---|
| API-15 | Lược đồ zod khai trong 8 route chuyển nguyên văn về `src/app/api/v1/_contracts/requests-profile.ts`, route import lại; thân link động giữ ở `short-links/schema.ts` (dùng chung POST/PATCH, xuất lại). Phản hồi khai `strictObject` (`responses-profile.ts`), đối chiếu mẫu ghi từ phản hồi thật | `tests/unit/architecture/internal-openapi.test.ts` |
| API-15 | Phản hồi kiểm trên CSDL thật: hồ sơ doanh nghiệp/thương hiệu, dữ liệu mẫu theo ngành (tổ chức thường 403, không gian trải nghiệm 200, ngành lạ 400), minh bạch thu thập, link hồ sơ công khai (cần đủ hồ sơ kể cả logo), đánh giá khách (tổ chức khác 404), tên miền riêng (xác minh không thấy TXT → `verified: false`), link/QR động và thống kê | `tests/tenant/internal-contract-profile.test.ts` |

Phát hiện khi viết hợp đồng — lỗi P1 đã sửa ở §25; còn lại chưa sửa:
- ~~**Cách ly tenant (P1)**~~ (đã sửa §25) — `GET /store/collection-transparency?storeId=`: `getStoreCollectionTransparency` gọi `findBranchBasic(storeId)` và `getStoreDsa(storeId)` (`field-platform/infra/chain-collection-repository.ts`) đọc `branches` theo `id` KHÔNG lọc tổ chức. Người của tổ chức A gửi mã chi nhánh của tổ chức B → 200 kèm tên chi nhánh của B (đã thử: "Chi nhánh bí mật của Q") và mức trần lan truyền tính theo thoả thuận chia sẻ dữ liệu (DSA) của B. Mã lạ cũng trả 200 thay vì 404. Vi phạm luật 2 CLAUDE.md (khác tổ chức → 404). Route anh em `GET /chain/stores-data/:storeId` đã kiểm đúng (§17).
- `PUT /brand-profile`: `logo_asset_id` không được kiểm — mã lạ hoặc ảnh của tổ chức khác vẫn lưu (đã thử). Không lộ ảnh (`logo_url` ký theo tổ chức phiên → `null`), nhưng hồ sơ bị tính là đã có logo nên link hồ sơ công khai xuất bản được với logo không tồn tại.
- Link/QR động trả cả trường đếm nội bộ của Prisma `_count: { leads }` ra API.
- Phản hồi không bọc `{ data }` ở `business-profile`, `brand-profile`, `short-links`; sai thân `short-links` trả `details.body` một câu chung.
- 10 phép thử lỗi khác (số sao, đích link ra ngoài, `days` sai, tên miền sai/trùng, mã lạ) đều trả đúng mã, không có 500.

## 25. Nhật ký sửa — lỗi P1 phát hiện ở §24 (09/11/2026)

Người dùng yêu cầu sửa trước khi phủ tiếp OpenAPI.

| Lỗi | Đã sửa | Test |
|---|---|---|
| **Cách ly tenant** — `GET /store/collection-transparency?storeId=` đọc `branches` và thoả thuận chia sẻ dữ liệu theo `id` không lọc tổ chức: mã chi nhánh của tổ chức khác → 200 kèm tên chi nhánh và mức trần DSA của tổ chức đó; mã lạ → 200 | `getStoreCollectionTransparency` (`field-platform/use-cases/get-store-collection-transparency.ts`) trả `null` khi không thấy chi nhánh hoặc `branches.organization_id` khác tổ chức của phiên, TRƯỚC khi đọc DSA (cùng khuôn `getStoreFolderData`); route đổi `null` thành 404. Test đơn vị cũ giả lập "không thấy chi nhánh" vẫn ra kết quả (khoá đúng hành vi lỗi) — nay giả lập chi nhánh của chính tổ chức, thêm ca khác tổ chức/mã lạ → `null` và không đọc DSA | `tests/tenant/store-transparency-isolation.test.ts` (2 ca đỏ trên mã cũ: 200), `chain-collection-profile.use-case.test.ts`, `internal-contract-profile.test.ts` |

Chưa sửa (P3, ghi ở §24): `PUT /brand-profile` nhận `logo_asset_id` lạ/của tổ chức khác.

## 26. Nhật ký sửa — OpenAPI nội bộ, đợt khách hàng & marketing (09/11/2026)

Phủ 8 nhóm, 14 route, 22 operation (tổng 483): `/leads/*`, `/campaigns/*`, `/marketing-center/kpis`, `/customer-segments/*`, `/customers/{id}/interactions`, `/customer-interactions`, `/occasions/*`, `/delivery/my-runs/*`.

| Việc | Tệp |
|---|---|
| Lược đồ yêu cầu từng khai trong 6 route (`campaigns`, `campaigns/[id]`, `delivery/my-runs/[id]`, `leads/[id]`, `occasions`, `occasions/[id]`) chuyển NGUYÊN VĂN, route import lại; phân khúc và tương tác dùng lược đồ use-case `crm` (xuất lại); thân `POST /leads` và các query chỉ mô tả | `_contracts/requests-marketing.ts` |
| Phản hồi chặt sinh từ kiểu TS, đối chiếu mẫu thật; `assetUsage` của đợt kho tệp được xuất để dùng chung | `_contracts/responses-marketing.ts`, `responses-storage.ts` |
| Operation + mã năng lực theo spec 06 | `_contracts/ops-marketing.ts`, `internal-openapi.ts` |
| Test hợp đồng trên CSDL thật, kể cả đường lỗi 400/404/409 đã mô tả | `tests/tenant/internal-contract-marketing.test.ts` |

Phát hiện, chưa sửa (ghi để PO quyết):

| Mức | Lỗi | Tái hiện |
|---|---|---|
| **P1** | **Một khách tiềm năng làm hỏng danh sách khách của cả tổ chức.** `createStaffLead` và `captureLead` (form công khai, quét QR) gọi `findOrCreateCustomer` với `deliveryAddress: ""`. Lớp mã hoá dữ liệu cá nhân (`pii-write.ts`) mã hoá cả chuỗi rỗng thành bản mã có phần thân rỗng (`pii1.<v>.<iv>.<tag>.`), còn `decryptPii` (`pii-cipher.ts`) coi phần thân rỗng là bản mã hỏng và ném lỗi. Mọi lượt đọc khách đó → 500: `GET /crm/customers`, `GET /customer-segments/{id}/customers`, xuất khách… Người lạ gửi form để lại thông tin công khai là đủ làm sập màn Khách hàng của tiệm | Tạo một khách tiềm năng (`POST /leads`, lý do `WALK_IN`) → `GET /crm/customers` từ 200 thành 500 (đã chạy thử trên CSDL test). Đã sửa ở §27 |
| P3 | `POST /delivery/my-runs/{id}` dùng `.parse` thẳng (lỗi zod vẫn ra 400 qua `handle`) | — |
| P3 | `PATCH /campaigns/{id}` khai `objective`/`status` bằng mảng chữ cứng, không dùng `CAMPAIGN_OBJECTIVES`/`CAMPAIGN_STATUSES` như `POST` — sẽ lệch khi thêm giá trị | giữ nguyên văn khi chuyển |

## 27. Nhật ký sửa — lỗi P1 phát hiện ở §26 (09/11/2026)

Người dùng yêu cầu sửa trước khi phủ tiếp OpenAPI.

| Lỗi | Đã sửa | Test |
|---|---|---|
| **Một khách tiềm năng làm danh sách khách của cả tổ chức trả 500** — `createStaffLead` và `captureCatalogLead` (form công khai) tạo khách với địa chỉ `""`; bản mã AES-GCM của chuỗi rỗng có phần thân rỗng (`pii1.<v>.<iv>.<tag>.`), `decryptPii` kiểm `!body` nên coi là bản mã hỏng | `decryptPii` (`core/security/pii-cipher.ts`) chỉ từ chối khi không đủ đúng 5 phần hoặc thiếu tiền tố/iv/thẻ; phần thân rỗng giải ra `""` và GCM vẫn kiểm thẻ xác thực (sai khoá/sửa bản mã vẫn lỗi). Sửa ở chỗ đọc nên các dòng đã ghi trước đây đọc lại được, không cần chuyển dữ liệu; địa chỉ vẫn lưu dạng bản mã. Test hợp đồng §26 bỏ tổ chức tách riêng | `tests/tenant/lead-customer-empty-address.test.ts` (2 ca đỏ trên mã cũ: 500 — nhân viên thêm, form catalog công khai), `pii-cipher.test.ts` (chuỗi rỗng; thiếu/thừa phần → lỗi), `internal-contract-marketing.test.ts` |

Chưa sửa (ngoài phạm vi, cùng khuôn): `openSecret` (`core/security/secret-box.ts`) và `unwrapDataKey` cũng kiểm `!body` — bí mật rỗng không mở được. Khoá dữ liệu luôn 32 byte nên `unwrapDataKey` không gặp; `openSecret` chỉ gặp nếu có nơi ghi bí mật rỗng.

## 28. Nhật ký sửa — OpenAPI nội bộ, đợt sản phẩm phụ (09/11/2026)

Phủ 4 nhóm, 10 route, 13 operation (tổng 496): `/product-photo/*`, `/product-image-set/*`, `/product-change-requests/*`, `/availability/*`. Chỉ thêm tài liệu và chuyển lược đồ — không đổi hành vi tính năng tải ảnh.

| Việc | Tệp |
|---|---|
| Lược đồ yêu cầu từng khai trong 6 route chuyển NGUYÊN VĂN, route import lại; query chỉ mô tả | `_contracts/requests-product-extra.ts` |
| Phản hồi chặt sinh từ kiểu TS, đối chiếu mẫu thật; dùng lại `jobCreatedResponse` (đợt tác vụ AI) và `productRow` (đợt nhóm lõi) | `_contracts/responses-product-extra.ts` |
| Operation + mã năng lực theo spec 06; `operationId` hàng chờ là `listChangeRequestQueue` (tên `listProductChangeRequests` đã dùng cho `GET /products/{id}/change-requests`) | `_contracts/ops-product-extra.ts`, `internal-openapi.ts` |
| Spec 06: `GET /product-photo`, `GET /product-image-set` ghi *(phiên)* nhưng route không kiểm phiên — sửa cột theo mã thành *(công khai)* | `docs/dac-ta/06-api-specification.md` |
| Test hợp đồng trên CSDL thật, kể cả đường lỗi 400/404/422 đã mô tả | `tests/tenant/internal-contract-product-extra.test.ts` |

Phát hiện, chưa sửa (không có P1):

| Mức | Lỗi |
|---|---|
| P3 | `GET /product-photo` và `GET /product-image-set` không cần phiên và trả cả `promptDirective` (câu lệnh gửi mô hình ảnh) — có nên đòi phiên và ẩn câu lệnh không là quyết định của PO |
| P3 | `GET /product-photo/{id}` khi job chưa có điểm trả `qcEvaluation.passed: true`, mọi tiêu chí 1; `GET /product-image-set/{id}` khi chưa xong trả `url` từng biến thể là ảnh gốc kèm `passed: true`. Giao diện dựa `canApprove`/`status` thì không sai, nhưng dễ đọc nhầm là đã đạt |
| P3 | `GET /availability/board?month=` sai dạng → lặng lẽ trả tháng hiện tại thay vì 400 |
| P3 | `POST /product-change-requests/{id}/approve` trả dòng `products` nguyên bản (snake_case), khác các phản hồi camelCase còn lại của nhóm |

## 29. Nhật ký sửa — OpenAPI nội bộ, đợt quản trị & AI (09/11/2026)

Phủ 10 nhóm, 14 route, 18 operation (tổng 514): `/roles/*`, `/workspaces`, `/ux-rollout-flags`, `/audit-logs/*`, `/subscription`, `/billing/sepay`, `/ai-policy`, `/ai-capabilities`, `/ai-requests/*`, `/content-guard/validate`.

| Việc | Tệp |
|---|---|
| Lược đồ yêu cầu từng khai trong 7 route chuyển NGUYÊN VĂN, route import lại; query chỉ mô tả | `_contracts/requests-admin.ts` |
| Phản hồi chặt sinh từ dòng Prisma và kiểu TS, đối chiếu mẫu thật (webhook SePay ghi bằng khoá thử qua `vi.mock`, cùng cách `subscription-guard.test.ts`) | `_contracts/responses-admin.ts` |
| Operation + mã năng lực theo spec 06 | `_contracts/ops-admin.ts`, `internal-openapi.ts` |
| Test hợp đồng trên CSDL thật, kể cả đường lỗi 400/401/404 đã mô tả | `tests/tenant/internal-contract-admin.test.ts` |

Phát hiện, chưa sửa (không có P1):

| Mức | Lỗi | Tái hiện |
|---|---|---|
| **P2** | **Điều hành tự khoá quyền quản lý vai trò.** `PATCH /roles/{id}/capabilities` cho bỏ `F5` khỏi chính vai `dieu_hanh` (200); từ phiên đó gọi lại để bật `F5` → 403 vì phiên đã mất `F5`. Tổ chức chỉ có tài khoản Điều hành mất hẳn quyền chỉnh vai cho đến khi nền tảng can thiệp. Chưa có sàn "không bỏ được `F1`/`F5` khỏi vai Điều hành" | Đã sửa ở §30 |
| P3 | `GET /ai-requests/review?limit=abc` → 500 (`take: NaN` xuống Prisma); `/ai-requests` cùng tham số thì bỏ qua | Đã sửa ở §37 (riêng `/review`) |
| P3 | `POST /roles` trùng tên tạo vai mới với `key` thêm hậu tố, không báo trùng | — |
| P3 | `GET /ai-requests`: `from`/`to`/`limit` sai dạng bị bỏ qua thay vì 400 | — |

## 30. Nhật ký sửa — lỗi P2 phát hiện ở §29 (09/11/2026)

Người dùng yêu cầu sửa trước khi phủ tiếp OpenAPI.

| Lỗi | Đã sửa | Test |
|---|---|---|
| **Điều hành tự khoá quyền quản lý vai trò** — `PATCH /roles/{id}/capabilities` cho tắt `F5` (và `F1`) trên chính vai `dieu_hanh`; phiên mất `F5` nên không bật lại được (403) | Thêm sàn quyền trong lõi RBAC, đặt cạnh trần cứng: `OWNER_ROLE_FLOOR` / `breaksRoleFloor` (`core/rbac/permission-resolver.ts`) — vai `dieu_hanh` luôn giữ `F1` (xem tổ chức, danh sách vai) và `F5` (sửa vai); còn `F5` thì mọi mã khác bật lại được. `updateRoleCapabilities` kiểm sàn cùng vòng với trần cứng, TRƯỚC khi ghi: xuyên sàn → 422 `UNPROCESSABLE_ENTITY` kèm `details.capability`, không ghi gì kể cả thay đổi hợp lệ khác trong cùng yêu cầu. Spec 06 và mô tả OpenAPI cập nhật | `tests/tenant/role-owner-floor.test.ts` (3 ca đỏ trên mã cũ: 200/403), `permission-resolver.test.ts` |

Tổ chức đã tự khoá TRƯỚC bản sửa (dòng `capability_overrides` cũ tắt `F5`): đã xử lý ở §34 — sàn áp cả lúc tính quyền.

## 31. Nhật ký sửa — OpenAPI nội bộ, đợt công cụ (09/11/2026)

Phủ 5 nhóm, 10 route, 18 operation (tổng 532): `/ad-banner-poster/*`, `/field-config/*`, `/template-overrides/*`, `/noi-bo/identity`, `/proxy/{path}` (5 phương thức).

| Việc | Tệp |
|---|---|
| Lược đồ yêu cầu từng khai trong 4 route chuyển NGUYÊN VĂN, route import lại; trường dữ liệu dùng lược đồ `field-platform/adapters/http-schemas` (xuất lại); query và thân proxy chỉ mô tả | `_contracts/requests-tools.ts` |
| Phản hồi chặt sinh từ kiểu TS và dòng `template_overrides`, đối chiếu mẫu thật (danh mục nền tảng gieo trong test rồi dọn — `resetDatabase` không xoá bảng nền tảng); proxy trả nguyên văn phản hồi hệ thống đích, không có lược đồ | `_contracts/responses-tools.ts` |
| Operation + mã năng lực theo spec 06 | `_contracts/ops-tools.ts`, `internal-openapi.ts` |
| Test hợp đồng trên CSDL thật, kể cả đường lỗi 400/404 đã mô tả | `tests/tenant/internal-contract-tools.test.ts` |

Phát hiện, chưa sửa (không có P1 trong phạm vi core):

| Mức | Lỗi | Tái hiện |
|---|---|---|
| **P2** | **`/proxy/{path}` chuyển tiếp cả khi chưa đăng nhập.** Core chỉ đòi phiên cho lệnh ghi `api/accounts` của SocialFlow (`J5`); mọi đường dẫn khác trong danh sách trắng — gồm `api/v1/worker/cron` của LocalBudd — được chuyển tiếp với danh tính `none`, an toàn hoàn toàn dựa vào hệ thống đích tự kiểm. Core thành điểm chuyển tiếp công khai vào mạng nội bộ của SocialFlow/LocalBudd | Đã sửa ở §33 |
| P2 | `/proxy`: hệ thống đích không gọi được → 500 với thông báo chứa địa chỉ nội bộ của hệ thống đích | Đã sửa ở §33 |
| P2 | `generateBannerCopyUseCase` gọi LLM trực tiếp qua `createContentLLM` (`core/ai/adapters/multi-llm-provider.ts`), không qua `callCapability` — trái quy tắc AI bắt buộc (CLAUDE.md mục 5): bỏ qua trần mô hình, sàn quyền riêng tư, sổ `ai_requests` | Đã sửa ở §33 |
| P3 | `GET /noi-bo/identity` không đòi mã năng lực: mọi vai (kể cả Shipper) thấy tên và email của mọi thành viên | Đã sửa ở §37 |
| P3 | `GET /field-config/catalogs` chỉ kiểm phiên, không kiểm `R1` như đặc tả 06 và chú thích use-case ghi | Đã sửa ở §37 |
| P3 | `GET /field-config?entity=` lạ → 200 rỗng thay vì 400; tạo trường trùng nhãn → khoá thêm hậu tố, không báo trùng | — |

## 32. Nhật ký sửa — OpenAPI nội bộ, đợt cuối (09/11/2026)

Phủ 3 nhóm, 8 route, 9 operation (tổng 541): `/catalog-links/*`, `/product-intelligence/{id}`, `/internal/*` (cron). **Hết phạm vi OpenAPI nội bộ** — mọi thư mục route dưới `src/app/api/v1/` đã nằm trong `INTERNAL_COVERED_PREFIXES`, trừ `public` / `platform` / `integration` (có `public.openapi.json`, `platform.openapi.json`, `integration.openapi.json` riêng).

| Việc | Tệp |
|---|---|
| `catalog-links` thuộc vùng Catalog đóng băng: route KHÔNG sửa; OpenAPI dùng BẢN SAO lược đồ, test đối chiếu gửi cùng bộ mẫu tới route thật và bản sao (cùng khuôn `catalog-generate`, §20) | `_contracts/requests-final.ts`, `tests/unit/catalog-links/catalog-links-contract.test.ts` |
| Phản hồi chặt; báo cáo phân tích dùng lại `productIntelligenceReportSchema` (`creative-production/contracts`) | `_contracts/responses-final.ts` |
| Operation; cron mô tả xác thực bằng `x-cron-secret` (không phiên) | `_contracts/ops-final.ts`, `internal-openapi.ts` |
| Test hợp đồng trên CSDL thật (chỉ GỌI route catalog-links), kể cả 401 của cron và 404 cách ly | `tests/tenant/internal-contract-final.test.ts` |

Phát hiện, chưa sửa (không có P1):

| Mức | Lỗi |
|---|---|
| P3 | `GET /catalog-links/{slug}` (công khai) trả `created_by` — mã người dùng nội bộ lộ cho khách quét QR. Vùng đóng băng: cần PO mở băng để sửa |
| P3 | `GET /product-intelligence/{id}` nhánh dự phòng (bản phân tích ảnh) đặt `productName` = mã ảnh (UUID) thay vì tên sản phẩm |
| P3 | ~~`/internal/health` và `/internal/chain-dispatch-sweep` trả 401 bằng thân cũ `{ error: "Unauthorized" }`~~ — đã sửa ở §37 |
| P3 | `POST /catalog-links/{slug}/revoke` lần hai → 400 (nên là 409 hoặc 200 không đổi) |

## 33. Nhật ký sửa — ba lỗi P2 phát hiện ở §31 (09/11/2026)

Người dùng yêu cầu sửa trước khi làm tiếp.

| Lỗi | Đã sửa | Test |
|---|---|---|
| **`/proxy/{path}` chuyển tiếp khi chưa đăng nhập** — chỉ lệnh ghi `api/accounts` đòi phiên; mọi đường dẫn khác trong danh sách trắng (gồm `api/v1/worker/cron` của LocalBudd) được chuyển tiếp với danh tính `none` | Route luôn gọi `requireTenantContext` trước khi chuyển tiếp (sau kiểm `client` và danh sách trắng); `api/accounts` ghi vẫn đòi `J5`. Mọi nơi gọi proxy trong mã đều là màn hình của người đã đăng nhập; không cron/máy nào gọi qua proxy (đã `grep` mã, `render.yaml`, `workers/`) | `tests/tenant/proxy-auth.test.ts` (đỏ trên mã cũ: 500 vì đã gọi mạng thay vì 401) |
| **`/proxy` lộ địa chỉ nội bộ khi lỗi** — `sendToSibling` ghép nguyên văn lỗi mạng (có URL hệ thống đích) vào thông báo 500 | Lỗi mạng → `log.error("proxy.upstream_failed", …)` giữ chi tiết; phản hồi chỉ còn "Không gọi được <hệ thống>, vui lòng thử lại sau". Thông báo hết giờ không đổi (không có địa chỉ) | `proxy-auth.test.ts` (đỏ trên mã cũ: thân chứa địa chỉ) |
| **Chữ banner gọi LLM ngoài cổng AI** — `generateBannerCopyUseCase` gọi `createContentLLM().complete()` thẳng với `organizationId: "system"`: bỏ qua trần mô hình, sàn quyền riêng tư, sổ `ai_requests` | Dời lời gọi LLM vào adapter `ad-banner-poster/adapters/banner-copy-ai-adapter.ts` (kiểm JSON + luật ưu đãi tiệm trước khi chấm điểm); use-case gọi `callCapability` năng lực `content_generation` (AIC-23, sàn `SHOP`, cùng năng lực với landing/catalog) bằng `aiGatewayDeps(ctx)` và tổ chức thật của phiên. Không có phiên, cổng trả `khong_chay_duoc` hoặc lỗi → mẫu dựng sẵn như cũ. Route truyền `{ ctx }` | `ad-banner-poster/use-cases/banner-copy-gateway.test.ts` (4 ca), `banner-use-cases.test.ts` giữ nguyên |

## 34. Nhật ký sửa — sàn vai Điều hành lúc tính quyền (09/11/2026)

PO duyệt phương án "áp sàn cả lúc tính quyền" cho tổ chức đã tự khoá `F5` trước bản sửa §30 (không xoá tay dữ liệu).

| Việc | Đã làm | Test |
|---|---|---|
| Dòng `capability_overrides` cũ tắt `F1`/`F5` của vai `dieu_hanh` vẫn khoá tổ chức | `applyRoleFloor` (`core/rbac/permission-resolver.ts`) bật lại các mã của `OWNER_ROLE_FLOOR` sau `mergeOverrides`, trước `applyHardCap`; phạm vi giữ theo lớp một. Gọi ở MỘT chỗ — `CapabilityRepository.resolveGrants` — nên phiên (`resolveSession`), `GET /roles` và kết quả `PATCH /roles/{id}/capabilities` cùng thấy. Không xoá/sửa dữ liệu: dòng cũ vẫn nằm đó nhưng không còn hiệu lực với hai mã sàn; ngoại lệ trên mã khác vẫn áp. Vai khác không đổi | `tests/tenant/role-owner-floor.test.ts` (ca mới đỏ trên mã cũ: phiên mất `F1` → `GET /roles` 403), `permission-resolver.test.ts` |

## 35. Nhật ký sửa — OpenAPI nội bộ, hai nhóm mới từ `main` (09/11/2026)

Sau khi gộp `main` vào nhánh, PO duyệt phủ nốt hai nhóm route mới của hành trình Tạo nội dung 4 bước: `/content-studio/*` (4 route), `/social-publishing/*` (8 route) — 14 operation (tổng 555). Mọi thư mục route dưới `src/app/api/v1/` nay đều có OpenAPI.

| Việc | Tệp |
|---|---|
| 12 route đã viết bằng `defineRoute`; lược đồ thân/query khai tại chỗ trong 4 route chuyển NGUYÊN VĂN về `_contracts`, route import lại (không đổi hành vi) | `_contracts/requests-studio.ts` |
| Phản hồi chặt theo chuẩn v1.1 (`{ data }`, `{ data, next_cursor }`, snake_case) sinh từ kiểu TS, đối chiếu mẫu thật; Thẻ chào dùng lại `salesPitchRecord` | `_contracts/responses-studio.ts` |
| Operation + mã năng lực theo spec 06 (`L1`/`L3`/`H1`/`J5`/`W2`); `callback` khai 303 | `_contracts/ops-studio.ts`, `internal-openapi.ts` |
| Test hợp đồng trên CSDL thật (nền tảng mạng xã hội giả lập qua tham số `fetch` của use-case), kể cả 400/404/409 đã mô tả | `tests/tenant/internal-contract-studio.test.ts` |

Ghi nhận khi dò đường lỗi (đúng luật, chỉ ghi để mô tả chính xác): lên lịch kênh chưa có bài đã duyệt → 400 trước khi xét kết nối (409 chỉ khi có bài mà kênh chưa kết nối); chọn Trang Facebook không trong danh sách chờ → 400 `details.page_id` (không phải 404). Không phát hiện lỗi P1/P2.

## 36. Nhật ký sửa — API-10, API-11, API-16 (09/11/2026)

PO yêu cầu làm ba mục đang hoãn. Không đổi `prisma/schema.prisma`, CI, dependency.

| Mã | Đã làm | Test |
|---|---|---|
| API-10 | `GET /orders` phân trang con trỏ theo chuẩn v1.1: `{ data, next_cursor, meta: { total } }` (trước `{ orders, total }`, chỉ trang đầu). Thứ tự `created_at` giảm dần rồi `id` giảm dần (`ORDER_LIST_ORDER_BY`, `orders/infra/order-list-where.ts`) — đơn trùng thời điểm không lặp/sót giữa hai trang; lấy dư 1 dòng để biết còn trang. `cursor` mờ base64url `{ at, id }` qua `decodeCursor`/`encodeCursor` chung, hỏng → 400; `total` đếm cả danh sách đang lọc (không theo con trỏ); giữ `limit` 1–100 mặc định 50. Repository trả `OrderListPage`. Năm màn đọc danh sách đổi theo (Đơn hàng, Bàn làm việc Sale, bảng Quản lý cửa hàng, Trung tâm mạng lưới hoa, Trung tâm tăng trưởng) — hai màn cuối trước đây đọc nhầm khoá `items` nên luôn hiện 0 đơn, nay đọc đúng | `tests/tenant/order-cursor-pagination.test.ts` (đi hết trang, trùng thời điểm, total, con trỏ khác tổ chức), `tests/unit/orders/list-orders-limit-route.test.ts`, `order-isolation`, `order-filters`, `branch-scope`, `internal-contract-orders` |
| API-11 | `enqueueJob`: cùng `Idempotency-Key` mà `payload`/sản phẩm khác → 422 `IDEMPOTENCY_KEY_REUSED` (`details.job_id` = job của yêu cầu trước), không tạo job; cảnh báo `jobs.idempotency_payload_mismatch` vẫn ghi. Mã mới trong `core/http/errors.ts` (OpenAPI cả bốn tệp sinh lại). Miễn trừ có lý do `KEY_REUSE_ALLOWED` (`jobs/domain/idempotency.ts`): `creative.scene_plan` (mở lại kịch bản theo khoá cố định — lý do PO hoãn 07/11) và `product.copy.generate` (khoá `product-copy:<analysisId>`, `product_id` lấy từ bản phân tích có thể được gắn sau). Rà 23 nơi gọi `enqueueJob`: khoá máy chủ tự ghép có thân cố định theo khoá (phân tích ảnh, biến thể, Từ 1 ảnh); nhập lịch sử Avi không đi qua `enqueueJob`. Hai hook Tạo nội dung giữ khoá qua lần thử lại sau lỗi dù người dùng đổi kênh / ảnh tải lại có mã mới → nay khoá gắn theo chữ ký yêu cầu (`components/content-studio/request-key.ts`), đổi yêu cầu thì khoá mới. **Chưa áp:** `/integration/jobs` giữ hành vi cũ (`keyReuse: "legacy"`) — thay đổi phá vỡ với bên thứ ba cần báo trước ≥ 90 ngày (đặc tả 06 "Version và gỡ endpoint"), chờ PO chốt ngày; `POST /orders` không lưu thân nên chưa phát hiện được — cần thêm cột (đổi schema, chờ PO) | `tests/tenant/job-idempotency-mismatch.test.ts` (nội bộ → 422, đỏ trên mã cũ; Integration giữ cũ; miễn trừ mở lại), `request-key.test.ts` |
| API-16 | `POST /jobs/batch` trả **202** (đặc tả 06 luật 4), thân giữ nguyên `{ job_id, status, usage }`; `FeaturePicker` kiểm `res.ok` nên không phải sửa | `tests/unit/jobs/batch-route.test.ts`, `internal-contract-ai-studio.test.ts` |

Rủi ro đã cân nhắc: đổi hình dạng `GET /orders` và mã `jobs/batch` là thay đổi tại chỗ trên API chỉ giao diện SMEOS gọi; giao diện đổi cùng commit nên bản triển khai mới nhất quán — tab trình duyệt mở từ bản cũ cần tải lại trang (đặc tả 06 yêu cầu báo trước 30 ngày cho loại API này; PO yêu cầu làm ngay).

## 37. Nhật ký sửa — đợt dọn tài liệu và lỗi P2/P3 còn tồn (11/11/2026)

PO duyệt hai đợt sau bản rà tiến độ 11/11/2026: (1) dọn trạng thái tài liệu, (2) sửa lỗi `limit`, envelope 401 của cron, gác `noi-bo/identity` và `field-config/catalogs`. Không đổi `prisma/schema.prisma`, CI, dependency.

| Mã | Đã làm | Test |
|---|---|---|
| API-01/10 | `parseIntParam` (`src/core/http/pagination.ts`) cho route cũ chưa dùng `defineRoute`: bỏ trống → mặc định, không phải số nguyên hoặc ngoài khoảng → 400 `details.<tham số>`. Áp cho `GET /notification/inbox` (`page` ≥ 1, `limit` 1–100, mặc định 20 — trước kẹp im lặng và báo lại số đã gửi), `GET /chat/conversations` (`limit` 1–100, mặc định 50 — trước không trần), `GET /ai-requests/review` (`limit` 1–5.000, giữ trần sẵn có của repository) | `tests/unit/api-limits/legacy-list-limit-routes.test.ts`, `tests/unit/core/http/pagination.test.ts` (đỏ trên mã cũ) |
| API-06 | `/internal/health`, `/internal/chain-dispatch-sweep`: sai/thiếu `x-cron-secret` → 401 theo envelope chung `UNAUTHENTICATED` (cùng cách `/internal/integrations-sweep`); mã trạng thái không đổi nên `curl -f` của cron không bị ảnh hưởng. Gỡ 2 dòng `string-error` khỏi `api-envelope-legacy.txt` | `tests/unit/health/internal-health-route.test.ts` |
| API-12 | `GET /noi-bo/identity` gác `F1` (cùng mã với `GET /members`, vì phản hồi có tên + email thành viên); `GET /field-config/catalogs` gác `R1` như cột năng lực đặc tả 06. Mọi vai có `R2` (tạo đơn — form nhập đơn đọc danh mục) mặc định đều có `R1`. Gỡ hai mục khỏi `NO_CAPABILITY_GUARD` | `tests/unit/organization/noi-bo-identity-route.test.ts`, `tests/unit/api-limits/field-catalogs-capability.test.ts` |
| API-15 | Mô tả 6 operation trong OpenAPI nội bộ bỏ ghi chú "hiện trả 500"/"không kiểm `R1`", khai 400 thật; `x-capability` của hai route vừa gác; `internal.openapi.json` sinh lại. Đặc tả 06 cập nhật 6 dòng | `npm run check:openapi`, `npm run check:docs` |
| Tài liệu | Trạng thái tài liệu 01/02 đổi từ DRAFT; sổ rủi ro ARC-025 đóng, ARC-024 chỉ xong phần OpenAPI (đính chính ở §39); `TRANG_THAI.md` thêm quyết định và trạng thái chương trình | — |

Rủi ro đã cân nhắc: vai tự tạo có `R2` mà bị tắt `R1` sẽ không tải được danh mục ở form nhập đơn (form báo lỗi, vẫn gửi được đơn với giá trị mặc định); trang Kết nối (`/noi-bo/ket-noi`, đang khoá trong GĐ1) với vai không có `F1` nay báo "Tài khoản của bạn chưa được xem thông tin thành viên của tổ chức." thay vì hiện câu lỗi có mã năng lực.

**Còn lại sau §37 (cần PO):**

| Việc | Lý do chờ |
|---|---|
| ~~422 `IDEMPOTENCY_KEY_REUSED` cho `/integration/jobs`~~ | Đã chốt và làm ở §38: áp từ 09/02/2027 |
| ~~Phát hiện "cùng khoá, thân khác" ở `POST /orders`~~ | Đã làm ở §38 |
| Gate `check:openapi` trong CI | PO chốt lại 11/11/2026: giữ gác bằng `npm test`, không sửa CI |
| Chuyển 501 route cũ sang `defineRoute` | Ngoài phạm vi chuẩn (chuẩn chỉ bắt buộc cho route mới/đang sửa); làm theo nhóm nếu PO đặt mục tiêu |
| Lỗi P3 còn lại ở §14–§32 (vd. `video/jobs/:id/render` 422→409, `creative-production/package` `z.any()`, khoá tầng cửa hàng ở `PATCH /notification/preferences`, `GET /ai-requests` bỏ qua tham số sai, `created_by` ở `catalog-links/{slug}` vùng đóng băng) | Chưa được duyệt sửa |

## 38. Nhật ký sửa — ba quyết định PO và lỗi P3 còn tồn (11/11/2026)

PO chốt 11/11/2026: (1) `/integration/jobs` báo trước 90 ngày rồi tự áp 422; (2) duyệt thêm cột băm thân cho `POST /orders`; (3) giữ `check:openapi` gác qua `npm test`, không sửa CI; (4) sửa các lỗi P3 còn tồn, chưa chuyển route cũ sang `defineRoute`.

| Mã | Đã làm | Test |
|---|---|---|
| API-11 Integration | `src/modules/integration/domain/integration-key-reuse.ts`: báo 11/11/2026, **áp 422 `IDEMPOTENCY_KEY_REUSED` từ 09/02/2027 00:00 UTC** cho `POST /integration/jobs` (trước ngày đó giữ hành vi cũ). Test đỏ nếu khoảng báo trước dưới `NOTICE_DAYS.external`. Đặc tả 06 + OpenAPI tích hợp ghi ngày | `integration-key-reuse.test.ts`, `tests/tenant/job-idempotency-mismatch.test.ts` (giả lập ngày hiệu lực) |
| API-11 Đơn hàng | Cột `orders.idempotency_body_hash` (migration `20261111120000_orders_idempotency_body_hash`, chỉ THÊM, cho phép NULL). `ingestOrderOnce` lưu SHA-256 dạng chuẩn của thân đã kiểm; cùng khoá mà băm khác → 422 `IDEMPOTENCY_KEY_REUSED` (`details.order_id`); đơn cũ chưa có băm vẫn trả lại như trước. Form tạo đơn đổi khoá khi nội dung đơn đổi (dùng lại `requestKey`) và hiện đúng câu lỗi của máy chủ (trước đọc nhầm `data.message`) | `ingest-order-once.test.ts`, `tests/tenant/order-idempotency.test.ts` |
| §17 | `PUT /chain/collection-profile`, `POST …/preview`: thiếu `rules` → 400; quy tắc sai luật → 422 kèm `details.issues` (trước 500). `POST /chain/partner-stores` trùng mã → 409 (trước 500) | `chain-collection-profile.use-case.test.ts` (sẵn có), OpenAPI |
| §19 | `POST /integration-tokens/:id/rotate` giữ thời hạn (số ngày) của token đang xoay (`ttlDaysOf`) — trước luôn ra 90 ngày | `integration-use-cases.test.ts` |
| §22 | `POST /market-intelligence/product-intelligence` thiếu đầu vào Chặng 03 → 400 `details.<trường>` (trước 500); `GET /market-intelligence/opportunities?limit=` sai → 400; `POST /market-intelligence/vision-extract` lỗi không còn trả khoá kho nội bộ (chi tiết chỉ vào log `market_intel.vision_extract_failed`) | `analyze-product-vision.test.ts`, `product-pipeline-handshake.test.ts` |
| §24 | `PUT /brand-profile`: `logo_asset_id` mới phải là ảnh trong kho của tổ chức → khác thì 404, không lưu; đường dẫn và giá trị không đổi không kiểm lại | `profiles-use-cases.test.ts` |
| §15 | `PATCH /notification/preferences` áp cả khoá cứng tầng cửa hàng (`getLockForUserPreference`) — trước tuỳ chọn lưu được nhưng không có hiệu lực | `cascading-policy.test.ts`, `tests/tenant/internal-contract-notification.test.ts` |
| §26 | `PATCH /campaigns/{id}` dùng `CAMPAIGN_OBJECTIVES`/`CAMPAIGN_STATUSES` (cùng giá trị, không đổi hành vi) | `internal-request-parity.test.ts` |
| §32 | `GET /product-intelligence/{id}` nhánh dự phòng: `productName` = tên sản phẩm đã gắn, chưa gắn thì "Sản phẩm chưa đặt tên" (trước là mã ảnh) | `tests/tenant/internal-contract-final.test.ts` |
| §19 | Chú thích `sso/refresh` dùng tên cookie hiện hành `smeos_session`/`smeos_sso` | — |

**Chưa sửa, có lý do:**

| Việc | Lý do |
|---|---|
| Siết tham số đang bị bỏ qua thành 400: `GET /ai-requests` (`from`/`to`/`limit`), `/availability/board?month=`, `/reports/*?from=`, `/field-config?entity=`, `/notification/events?tier=`, `min_score` của `opportunities` | Siết validation là thay đổi phá vỡ (đặc tả 06 "Version và gỡ endpoint") — cần báo trước 30 ngày cho API nội bộ |
| `POST /video/jobs/:id/render` sai trạng thái 422 → 409 | Đổi mã HTTP client đang thấy — cùng lý do |
| `POST /roles`, `/field-config` trùng tên → 409 | Đổi hành vi nghiệp vụ (đang tự thêm hậu tố) — cần PO |
| `creative-production/package` `z.any()`; `targetPlatform` của AUTHENTIC | Hợp đồng chặng Creative Studio — cần PO (tính năng tải ảnh, 14 chặng) |
| `get-store-folder-data` giá dự phòng 250.000đ | Đổi số hiển thị trên giao diện — cần PO |
| `_count` ở link/QR động, envelope trộn của `/pricing-rules`, `/price-lists/*`, `product-copies`, hồ sơ | Đổi hình dạng phản hồi — chuyển dần theo ratchet |
| `GET /product-photo`, `/product-image-set` không cần phiên và trả `promptDirective`; `/chat/channels`, `/chat/public-limits` chưa gác (RS-8) | Quyết định của PO |
| `GET /catalog-links/{slug}` trả `created_by`; `revoke` lần hai → 400; Điều phối "Nhận đơn" 409 sau ghi cọc | Vùng đóng băng Catalog / Thẻ chào |

## 39. Nhật ký — SSOT của OpenAPI và đính chính ARC-024 (11/11/2026)

PO duyệt sau khi rà "SSOT / production / commercial ready".

| Việc | Đã làm |
|---|---|
| SSOT | 4 tệp OpenAPI đăng ký trong `docs/00-DOCUMENTATION-REGISTRY.yaml` (`DOC-03-OPENAPI-INTEGRATION/PUBLIC/PLATFORM/INTERNAL`, phái sinh, `canonical: false`). Đặc tả 06 §2 ghi thứ tự ưu tiên: đặc tả 06 thắng về đường dẫn, phương thức, mã năng lực, luật nghiệp vụ; hình dạng thân/phản hồi lấy theo lược đồ trong mã. `total_documents` cập nhật theo số mục thật (105) |
| ARC-024 | Đính chính: §37 ghi đóng cả mục là quá tay. Chỉ phần OpenAPI xong; còn mở: tài liệu API công bố cho đối tác, thu gọn phản hồi Integration API, 501 route cũ / 67 mục envelope lệch |

**Đánh giá sẵn sàng (11/11/2026):** API nội bộ đạt mức production cho giao diện SMEOS. Chưa đạt mức thương mại cho bên thứ ba: còn ARC-024 (phần trên), ARC-022 (không CSRF/kiểm `Origin`, CSP chỉ báo cáo), ARC-023 (chưa metrics), chưa kiểm thử tải/pentest, chưa SLA (ARC-028).

## 40. Nhật ký — chống CSRF bằng kiểm Origin (ARC-022, 11/11/2026)

PO duyệt kế hoạch "đợt CSRF" theo đề xuất (D-25: kiểm `Origin`; Q4: production chạy chế độ chỉ ghi log 1 tuần trước khi chặn; Q5: làm A1–A5 trước).

| Bước | Đã làm | Test |
|---|---|---|
| A1 | `src/core/http/origin-guard.ts`, gọi trong `handle()` (phủ cả `defineRoute`): `POST/PUT/PATCH/DELETE` có cookie phiên (`smeos_session`, `smeos_sso`, `floraos_sso`) và `auth/login`, `auth/signup`, `auth/instant-trial` (kể cả chưa có cookie — login CSRF). `Origin` phải trùng host của request (`x-forwarded-host`/`host`, gồm tên miền riêng của tiệm) hoặc `PUBLIC_APP_URL`/`NEXT_PUBLIC_APP_URL`; không có `Origin` thì xét `Sec-Fetch-Site` (`same-origin`/`none` qua); thiếu cả hai là máy gọi máy → qua. Sai → 403 `CROSS_ORIGIN_REJECTED` (câu tiếng Việt), log `security.cross_origin_request`. `ORIGIN_CHECK_MODE`: `enforce`/`log`; trống = `log` trên production, `enforce` nơi khác | `tests/unit/core/http/origin-guard.test.ts`, `tests/tenant/origin-guard.test.ts` (đỏ khi gỡ dòng gắn vào `handle()`) |
| A2 | Miễn trừ (đường dẫn sau `/api/v1/`, chỉ co lại, có lý do): `public/`, `integration/`, `internal/`, `storage/`, `chat/webhooks/`, `billing/sepay`. Ghi TƯƠNG ĐỐI vì bộ dò phạm vi bàn giao đọc chuỗi `/api/...` như liên kết route (lần đầu viết đủ đường dẫn đã kéo nhầm 2 webhook chat vào GD1) | cùng tệp unit |
| A3 | Rà mọi route `GET`: chỉ ghi nhật ký truy cập/xuất dữ liệu (`recordDataExport`, `recordPlatformAccess`, `recordPlatformAuditLog`) và luồng SSE — không đổi dữ liệu nghiệp vụ. Khoá bằng test kiến trúc | `tests/unit/architecture/get-no-side-effects.test.ts` |
| A4 | Mã lỗi `CROSS_ORIGIN_REJECTED` (403) trong `core/http/errors.ts`, OpenAPI 4 tệp sinh lại; đặc tả 06 §2, `.agents/standards/smeos/05-security-authz.md`, `.env.example` | `check:openapi`, `check:docs` |
| A5 | E2E giao diện chạy với `ORIGIN_CHECK_MODE=enforce` trên bản build production (CI chạy E2E ở chế độ `log` mặc định của production nên không thử được chặn) | `tests/e2e/ux` |

**Việc của PO sau khi triển khai:** theo dõi log `security.cross_origin_request` trên Render 1 tuần; không có request hợp lệ bị đánh dấu → đặt biến môi trường `ORIGIN_CHECK_MODE=enforce` cho dịch vụ web. A6 (CSP chặn thật) chờ 2 tuần log `csp.violation`.

