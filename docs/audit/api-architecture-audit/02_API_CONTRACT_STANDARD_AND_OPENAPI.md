# Đề xuất chuẩn API Contract v1.1 và OpenAPI (06/11/2026)

> Trạng thái: **DRAFT — chờ PO duyệt**. Khi được duyệt, phần quy ước (§1–§8) chuyển vào đặc tả 06 §2
> (`docs/dac-ta/06-api-specification.md`, SSOT) và skill `api-development`; tài liệu này không tự thành SSOT.
> Căn cứ: `01_API_ARCHITECTURE_AUDIT.md` (mã phát hiện `API-xx`).

**Quyết định PO 07/11/2026 (đợt 3).** (1) `limit` mặc định **25**; (2) route mới **snake_case**; (3) lỗi validation **giữ `details.issues`** — phần `details.fields` ở §4–§5 dưới đây KHÔNG áp dụng, để sau; (4) bật ratchet: route mới bắt buộc `defineRoute`, cấm envelope lệch. Đã thực thi: `src/core/http/define-route.ts`, `src/core/http/pagination.ts`, `src/core/http/contract-responses.ts`, `tests/unit/architecture/route-contract-ratchet.test.ts`; quy ước chép vào đặc tả 06 §2 và skill `api-development`. Phần còn là đề xuất: idempotency gắn băm thân (§7), version/deprecation (§8), OpenAPI (§9), các gate ở §10 ngoài hai ratchet trên.

**Nguyên tắc áp dụng.** Chuẩn chỉ **bắt buộc cho route mới và route đang được sửa**; route cũ chuyển dần qua ratchet (như `lint:ratchet`). Không đổi path/hình dạng phản hồi của route đang chạy trong `/v1` — thay đổi phá vỡ chỉ qua §8. Không cần thêm dependency: zod 4 có sẵn `z.toJSONSchema`.

## 1. Tài nguyên và đường dẫn

| Luật | Ví dụ đúng | Tránh |
|---|---|---|
| Danh từ số nhiều, kebab-case, tiếng Anh | `/price-lists/:id` | `/noi-bo/identity`, `/priceList` |
| Một họ tài nguyên một gốc; ngữ cảnh đặt ở query hoặc ở năng lực, không nhân bản gốc | `/orders?channel=greeting_card` | `orders` + `greeting-card/orders` + `coordinator/orders` cho route **mới** |
| Hành động không phải CRUD: `POST /x/:id/<động-từ>` — đã là quy ước đặc tả 06 §1 | `POST /orders/:id/cancel` | `POST /x/:id/create-order` (dùng `POST /orders` + `conversation_id`) |
| Không động từ CRUD trong path (`create`, `get`, `update`, `delete`, `list`, `run`, `submit`) | `POST /product-copies` | `/product-copies/generate` |
| Bề mặt theo người gọi tách bằng tiền tố cố định | `/public/*` (khách), `/integration/*` (máy, Bearer), `/platform/*` (vận hành), `/internal/*` (cron) | Trộn người gọi trong cùng tiền tố |

## 2. Method và mã trạng thái

| Thao tác | Method | Thành công | Ghi chú |
|---|---|---|---|
| Đọc một / danh sách | `GET` | 200 | Không ghi dữ liệu nghiệp vụ (audit xuất dữ liệu được phép) |
| Tạo đồng bộ | `POST` | 201 + `Location` | |
| Tạo job / việc bất đồng bộ | `POST` | **202** `{ data: { job_id, status } }` | Luật 4 đặc tả 06 |
| Sửa một phần | `PATCH` | 200 `{ data }` | Mặc định cho sửa |
| Thay toàn bộ cấu hình | `PUT` | 200 `{ data }` | Chỉ khi client gửi đủ tài nguyên (vd. ma trận cấu hình) |
| Xoá | `DELETE` | **204** không thân | Xoá mềm vẫn 204; cần trả trạng thái → 200 `{ data }` và ghi rõ |
| Hành động | `POST /x/:id/<action>` | 200 `{ data }` (hoặc 202 nếu tạo job) | Sai trạng thái → 409 |

## 3. Đặt tên trường

- **snake_case** cho mọi khoá JSON, query param và trường `details` (theo đặc tả 06: `organization_id`, `next_cursor`, `job_id`). Áp cho route mới; route cũ giữ nguyên trong `/v1`. *(Câu hỏi PO số 4 ở tài liệu 01.)*
- Thời gian: ISO 8601 UTC (`2026-11-06T07:00:00Z`), khoá đuôi `_at`; ngày thuần đuôi `_date` (`YYYY-MM-DD`).
- Tiền: số nguyên VND, khoá đuôi `_vnd` (đã dùng: `balance_vnd`).
- Enum: `UPPER_SNAKE` như Prisma; liệt kê trong schema.
- ID: chuỗi mờ; client không suy luận định dạng.

## 4. Envelope

```jsonc
// Một bản ghi / kết quả hành động
{ "data": { … } }
// Danh sách
{ "data": [ … ], "next_cursor": "opaque" | null }
// Lỗi — giữ nguyên hình dạng hiện tại của src/core/http/errors.ts
{ "error": { "code": "VALIDATION_FAILED", "message": "Dữ liệu gửi lên không hợp lệ",
             "details": { "fields": { "phone": "Số điện thoại không hợp lệ" } }, "request_id": "…" } }
```

- Cấm ở route mới: `{ success }`, `{ ok }`, khoá tên riêng ở gốc (`{ order }`), trả mảng trần, `{ error: "chuỗi" }` (API-06).
- `request_id` trong thân lỗi = header `x-request-id` (đã gắn bởi `src/proxy.ts`), để người dùng báo lỗi.
- Webhook nhà cung cấp được miễn khi nhà cung cấp quy định thân phản hồi riêng — ghi lý do trong registry (§7).

## 5. Lỗi

**Catalog mã** (bổ sung vào đặc tả 06 §2 bốn mã đang có trong mã mà chưa có trong tài liệu):

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Sai lược đồ / JSON hỏng / query sai |
| 401 | `UNAUTHENTICATED` | Không có phiên/token hợp lệ (`details.reason` tuỳ chọn) |
| 402 | `SUBSCRIPTION_OVERDUE` | Gói quá hạn — chỉ xem |
| 403 | `CAPABILITY_DENIED` · `ENTITLEMENT_REQUIRED` · `PASSWORD_CHANGE_REQUIRED` | Thiếu năng lực / gói / phải đổi mật khẩu |
| 404 | `NOT_FOUND` | Không có **hoặc thuộc tổ chức khác** |
| 409 | `CONFLICT` | Sai trạng thái, trùng khoá idempotency đang xử lý |
| 413 | `PAYLOAD_TOO_LARGE` *(mới)* | Thân vượt trần |
| 422 | `UNPROCESSABLE_ENTITY` · `QUOTA_EXCEEDED` · `IDEMPOTENCY_KEY_REUSED` *(mới)* | Vi phạm luật nghiệp vụ / hết hạn mức / cùng khoá khác thân |
| 429 | `RATE_LIMITED` | Kèm `Retry-After` (giây) |
| 500 | `INTERNAL` | Không lộ chi tiết |

**`details` của validation** — một dạng duy nhất: `details.fields` là bản đồ `đường_dẫn_trường → câu tiếng Việt`, đường dẫn nối bằng dấu chấm (`items.0.quantity`). Không trả mảng issue thô của zod ra client (API-07). Header thiếu → khoá `fields["header.idempotency-key"]`.

**`handle()` phải** đổi `ZodError` → 400 `fields` và lỗi parse JSON → 400 (API-01); route không tự `try/catch` để tạo envelope (API-04).

## 6. Phân trang, lọc, sắp xếp

- `?limit=` mặc định **25**, 1–100, sai → 400; `?cursor=` mờ (base64url của khoá sắp xếp + id). Không dùng `offset/page` ở route mới (API-10).
- Phản hồi `{ data, next_cursor }`; `total` chỉ khi màn hình cần và có chỉ mục — trả trong `meta: { total }`.
- Lọc: `?status=A,B` (enum kiểm bằng `enumParam`), khoảng thời gian `?created_from=&created_to=` (ISO). Sắp xếp `?sort=-created_at` chỉ trên danh sách khoá cho phép.
- Repository danh sách luôn có `take` — test kiến trúc quét `findMany` không `take` trong `infra/` (có danh sách miễn trừ cho bảng cấu hình nhỏ).

## 7. Cắt ngang: auth, idempotency, rate limit, header

**Khai báo tập trung bằng `defineRoute`** (helper mới trong `src/core/http/`, bọc `handle()` — không thay `handle()`):

```ts
// src/app/api/v1/price-lists/route.ts — minh hoạ đề xuất, chưa có trong mã
export const POST = defineRoute({
  operationId: "createPriceList",
  summary: "Tạo bảng giá",
  auth: { kind: "tenant", capability: "L2" },        // tenant | platform | integration | public | cron | signed-url | webhook
  idempotency: "optional",                           // required cho tạo job; optional cho tạo bản ghi
  rateLimit: { scope: "price-list-create", limit: 30, windowMs: 60_000, key: "user" },
  body: CreatePriceListBody,                         // zod, đặt ở src/modules/<m>/contracts/
  response: { 201: PriceListResponse },
  handler: async ({ ctx, body }) => created(await createPriceList(ctx, body)),
})
```

Lợi ích: (1) gác quyền khai báo được kiểm tĩnh thay vì dò regex sâu 2 bước (API-12); (2) cùng một nguồn sinh OpenAPI (§9); (3) `body`/`response` là schema thật → test hợp đồng tự sinh; (4) `auth.kind = "public"` bắt buộc `rateLimit` — vá lỗ test loại trừ `public/`.

**Idempotency** (mở rộng YC-U7, API-11):
- Header `Idempotency-Key` (1–255 ký tự in được). Bắt buộc với tạo job/trừ credit/thanh toán; khuyến nghị với mọi `POST` tạo bản ghi từ giao diện.
- Lưu `(organization_id, scope, key) → (request_hash, status, response)` 24 giờ. Cùng khoá + cùng thân → phát lại phản hồi cũ kèm header `Idempotent-Replayed: true`; cùng khoá + thân khác → 422 `IDEMPOTENCY_KEY_REUSED`; đang xử lý → 409.
- Không bao giờ tự sinh khoá phía máy chủ khi client không gửi (API-05).

**Rate limit** (API-08/09): mọi 429 đặt `Retry-After`; mọi phản hồi trong scope có giới hạn đặt `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`. Khoá: `ip` cho `/public/*`, `user` cho phiên, `token` cho `/integration/*`, `organization` cho AI đồng bộ.

**Header mặc định** của `jsonResponse` cho route có phiên/token: `Cache-Control: no-store`; `x-request-id` (đã có). Trần thân mặc định 1 MB cho JSON (413), route tải tệp khai trần riêng.

> **Đã làm 07/11/2026 (đợt 5):** `no-store` mặc định cho mọi `jsonResponse` (route tự đặt thì giữ); trần thân JSON **2 MB** (PO chọn, rộng hơn 1 MB đề xuất vì `products/batch-import` gửi 250 dòng/lượt). Idempotency gắn thân: PO chọn **chỉ cảnh báo** (`jobs.idempotency_payload_mismatch`), chưa chặn 422; `POST /orders` để đợt sau (cần cột + migration). Ngoại lệ (đợt 6, sửa e2e treo trên PR #172): phản hồi lỗi (≥ 400) và route chỉ xác nhận mà client không đọc thân (`ACK_ONLY_ROUTES`, `src/core/http/ack-routes.ts`) → `no-cache`, vì Chromium không hoàn tất request `no-store` chưa đọc thân; test `ack-routes.test.ts` bắt buộc mọi `fetch` `keepalive` trong `src/components` trỏ tới route trong danh sách.

## 8. Version và deprecation

> **Đã làm (07/11/2026, đợt 6)** — PO chốt 90 ngày cho `/integration/*` và `/public/*`, 30 ngày cho API nội bộ. Sổ `DEPRECATIONS` + header ở `src/core/http/deprecation.ts` (`handle()` tự gắn); `tests/unit/core/http/deprecation.test.ts` đỏ khi báo trước thiếu ngày, quá ngày gỡ mà route còn, hoặc đặc tả 06 thiếu dòng **SẮP GỠ**. Changelog OpenAPI chưa có (chưa endpoint nào chờ gỡ).

- **Không phá vỡ** trong `/v1`: thêm trường tuỳ chọn, thêm endpoint, thêm giá trị enum ở *phản hồi* (client phải bỏ qua giá trị lạ), nới validation.
- **Phá vỡ** (đổi/xoá trường, đổi kiểu, siết validation, đổi mã trạng thái/lỗi, đổi ngữ nghĩa) → endpoint mới song song hoặc `/v2` theo họ tài nguyên.
- Endpoint sắp gỡ: header `Deprecation: @<unix-time>` + `Sunset: <HTTP-date>` + `Link: <…>; rel="successor-version"`; tối thiểu **90 ngày** cho `/integration/*` và webhook ra ngoài, 30 ngày cho API nội bộ chỉ giao diện SMEOS gọi. Ghi lịch gỡ trong đặc tả 06 và changelog OpenAPI.
- Giao diện SMEOS và API phát hành cùng nhau nên route nội bộ được đổi nhanh hơn, nhưng vẫn qua ratchet để không vỡ tab đang mở (phiên dài, `session-status` 15 giây).

## 9. OpenAPI Specification

> **Đã làm cho `/integration/*` (07/11/2026, đợt 4)** — `src/core/http/openapi.ts`, `src/modules/integration/contracts/`, tệp `docs/spec/contracts/openapi/integration.openapi.json`. Khác đề xuất dưới đây: registry khai riêng ở `integration-openapi.ts` (route Integration chưa chuyển sang `defineRoute`), gác bằng unit test trong `npm test` thay cho bước CI `check:openapi` (PO chọn). `/public/*` làm ở đợt 6 (dưới); nội bộ chưa làm.
>
> **Đã làm cho `/public/*` (07/11/2026, đợt 6)** — 42 operation (40 route), `src/app/api/v1/public/_contracts/` (thư mục `_` không định tuyến), tệp `docs/spec/contracts/openapi/public.openapi.json`. Lược đồ thân/query dùng chung với route (trừ 3 route Catalog đóng băng: bản sao + test đối chiếu); phản hồi kiểm trên CSDL thật; `tests/unit/public/public-openapi.test.ts` đỏ khi có route `public/*` chưa khai operation.
>
> **Đã làm cho `/platform/*` (07/11/2026)** — 70 operation (51 route), `src/app/api/v1/platform/_contracts/`, tệp `docs/spec/contracts/openapi/platform.openapi.json`. Lược đồ zod từng khai trong 23 route chuyển nguyên văn về `requests.ts`; ba thân do hàm parse tự viết kiểm (tài khoản nhận tiền, ma trận quản trị, cờ giao diện) có lược đồ mô tả + test đối chiếu; `x-capability` khớp đặc tả 06 mục 21.
>
> **Đã làm cho API nội bộ của tiệm — đợt nhóm lõi (08/11/2026)** — 94 operation (74 route): `/orders/*`, `/quotations/*`, `/products/*`, `/crm/*`, `/members/*`, `/organizations/*`, `/organization/brand`, `/auth/*`; `src/app/api/v1/_contracts/`, tệp `docs/spec/contracts/openapi/internal.openapi.json`. Phủ dần theo nhóm: `INTERNAL_COVERED_PREFIXES` chỉ được dài thêm, mọi route trong nhóm đã phủ phải có operation. Còn lại (đợt sau, mỗi đợt một PR): Thẻ chào, Điều phối, Creative Studio, media và các nhóm khác.

**Mục tiêu.** OpenAPI **3.1** (dùng JSON Schema 2020-12 — trùng `target: "draft-2020-12"` mà 3 bộ sinh hiện có đã dùng) được **sinh từ mã**, không viết tay; đặc tả 06 giữ phần nghiệp vụ, OpenAPI giữ phần máy đọc.

**Cách sinh (không thêm dependency).**
1. `defineRoute` ghi metadata vào registry tĩnh (`operationId`, `auth`, `body`, `query`, `response`, `rateLimit`, `idempotency`).
2. `scripts/gen-openapi.ts` duyệt `src/app/api/v1/**/route.ts`, import registry, đổi schema bằng `z.toJSONSchema(schema, { target: "draft-2020-12", io })` (cùng cách `src/modules/coordinator/contracts/json-schema.ts:30`), ghép `components.schemas`, `securitySchemes`, `responses` lỗi dùng chung.
3. Ghi `docs/spec/contracts/openapi/<surface>.openapi.json` theo bề mặt: `integration`, `public`, `internal-app`, `platform`.
4. `npm run check:openapi` (mẫu `--check` của `gen-coordinator-schemas.ts`) đỏ khi tệp lệch mã — **thêm gate CI cần PO duyệt**.
5. Test hợp đồng: với mỗi `operationId` có ví dụ, gọi handler trong test tenant và kiểm phản hồi khớp `response` schema.

**Khung tệp sinh ra** (rút gọn):

```yaml
openapi: 3.1.0
info: { title: SMEOS Integration API, version: 1.1.0 }
servers: [{ url: /api/v1 }]
components:
  securitySchemes:
    session: { type: apiKey, in: cookie, name: smeos_session }
    integrationToken: { type: http, scheme: bearer }
  parameters:
    IdempotencyKey: { name: Idempotency-Key, in: header, schema: { type: string, maxLength: 255 } }
    Limit: { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 25 } }
    Cursor: { name: cursor, in: query, schema: { type: string } }
  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { enum: [VALIDATION_FAILED, UNAUTHENTICATED, CAPABILITY_DENIED, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL] }
            message: { type: string }
            details: { type: object }
            request_id: { type: string }
  responses:
    ValidationFailed: { description: Sai dữ liệu, content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } } }
    Unauthenticated: { description: Thiếu hoặc sai token, content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } } }
    RateLimited:
      description: Quá tần suất
      headers: { Retry-After: { schema: { type: integer } } }
      content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } }
paths:
  /integration/products:
    get:
      operationId: integrationListProducts
      security: [{ integrationToken: [] }]
      x-capability: null            # gác bằng phạm vi token (requireIntegrationClient)
      parameters: [{ $ref: "#/components/parameters/Limit" }, { $ref: "#/components/parameters/Cursor" }]
      responses:
        "200": { description: Danh sách sản phẩm, content: { application/json: { schema: { $ref: "#/components/schemas/ProductPage" } } } }
        "400": { $ref: "#/components/responses/ValidationFailed" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "429": { $ref: "#/components/responses/RateLimited" }
```

Phần mở rộng riêng: `x-capability` (mã năng lực, đối chiếu catalog `src/core/rbac/capability-catalog.ts`), `x-tenant-scope` (`organization` | `branch` | `platform`), `x-rate-limit`. Bản `public`/`internal-app` không công bố ra ngoài; chỉ bản `integration` dành cho đối tác.

**Thứ tự phủ.** (a) `/integration/*` 9 route — bên thứ ba, ARC-024 đã khuyến nghị; (b) `/public/*` 40 route — nhiều rủi ro lạm dụng nhất; (c) route đang sửa trong mỗi PR (ratchet: tỉ lệ route có `defineRoute` chỉ được tăng); (d) phần còn lại.

## 10. Gate kiểm tự động đề xuất

| Gate | Kiểm | Kiểu |
|---|---|---|
| Test `handle()` | `ZodError` / JSON hỏng → 400; `AppError` giữ mã | Unit, ngay |
| Ratchet `route-contract` | Route mới phải dùng `defineRoute`; số route cũ chưa chuyển chỉ giảm | Unit kiến trúc |
| Ratchet envelope | Cấm `NextResponse.json`, `new Response(JSON.stringify`, `{ success:`, `{ error: "` trong route mới (danh sách miễn trừ có lý do) | Unit kiến trúc |
| `check:docs` mở rộng | Cột năng lực đặc tả 06 khớp `auth.capability` | Script sẵn có |
| `check:openapi` | Tệp OpenAPI khớp mã | CI — cần PO |
| Public guard | Mọi route `public/*` có `rateLimit` | Unit kiến trúc |
