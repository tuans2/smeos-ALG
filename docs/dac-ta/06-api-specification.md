# 06 — Đặc tả API

Mọi route dưới `/api/v1/`. Có phiên bản ngay từ đầu.

Năng lực gác từng endpoint ghi bằng mã ở tài liệu 02. Bảng dữ liệu và tên cột ở tài liệu 07.

## 1. Bốn luật áp cho mọi endpoint

| # | Luật |
|---|---|
| 1 | `organization_id` giải từ phiên đăng nhập phía máy chủ. Không endpoint nào nhận nó từ body, query hay header do client gửi |
| 2 | Mọi truy vấn đọc lọc theo tổ chức hiện tại. Không endpoint nào trả dữ liệu xuyên tổ chức |
| 3 | Kiểm quyền bằng mã năng lực, không bằng vai giao diện. Không có `if (role === 'ADMIN')` ở bất kỳ đâu |
| 4 | Thao tác AI trả `job_id` ngay, không chặn HTTP. Trạng thái đọc qua `/jobs/:id` hoặc luồng sự kiện |

Endpoint duyệt luôn tách khỏi endpoint sinh kết quả: `POST /x/:id/approve`.

## 2. Quy ước chung

**Xác thực.** Cookie phiên `HttpOnly`, `Secure`, `SameSite=Lax`. Máy gọi máy dùng `Authorization: Bearer <token>` cấp theo tổ chức, xem mục 9.

**Đổi tổ chức đang hoạt động.** `POST /api/v1/session/organization` với `{ organization_id }`. Máy chủ kiểm người dùng có `memberships` ở tổ chức đó rồi mới đổi `sessions.organization_id`. Đây là **chỗ duy nhất** client được nêu tên một tổ chức.

**Phân trang.** `?limit=` mặc định 25, tối đa 100; `?cursor=` là con trỏ mờ. Kết quả `{ data: [...], next_cursor: string|null }`.

**Hợp đồng route mới (PO chốt 07/11/2026, chuẩn API Contract v1.1).** Route thêm từ ngày này khai bằng `defineRoute` (`src/core/http/define-route.ts`): xác thực + mã năng lực, giới hạn tần suất (bắt buộc với `/public/*`), `Idempotency-Key`, lược đồ zod của thân và query trong một khai báo. Tên trường thân/query/phản hồi là **snake_case**. Thành công trả `{ data }` (danh sách `{ data, next_cursor }`; tạo 201 + `Location`, việc bất đồng bộ 202, xoá 204); lỗi validation giữ `details.issues`. Route có trước giữ nguyên hình dạng trong `/v1`. Hai danh sách miễn trừ chỉ được co lại: `tests/unit/architecture/route-contract-legacy.txt`, `tests/unit/architecture/api-envelope-legacy.txt`.

**Lỗi.** Một hình dạng duy nhất:

```json
{ "error": { "code": "QUOTA_EXCEEDED", "message": "Đã hết lượt dùng thử", "details": { } } }
```

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Thân yêu cầu sai lược đồ zod (`details.issues`), hoặc thân không phải JSON hợp lệ (`details.body`). `handle()` tự đổi `ZodError` và lỗi đọc JSON của thân thành mã này — trước 06/11/2026 hai lỗi đó ra 500 (audit API-01) |
| 401 | `UNAUTHENTICATED` | Không có phiên hợp lệ |
| 403 | `CAPABILITY_DENIED` | Thiếu mã năng lực. Thân lỗi nêu mã còn thiếu |
| 403 | `CROSS_ORIGIN_REJECTED` | Lệnh ghi (`POST/PUT/PATCH/DELETE`) có cookie phiên, hoặc đăng nhập/đăng ký/dùng thử, gửi từ origin khác host của request và `PUBLIC_APP_URL` (`Origin`, hoặc `Sec-Fetch-Site` khi không có `Origin`). Miễn (đường dẫn sau `/api/v1/`): `public/`, `integration/`, `internal/`, `storage/`, webhook chat và SePay. Chế độ `ORIGIN_CHECK_MODE` (`log` mặc định trên production trong tuần theo dõi đầu, rồi `enforce`) — `src/core/http/origin-guard.ts` (ARC-022, PO D-25, 11/11/2026). Route `GET` không được đổi trạng thái (`tests/unit/architecture/get-no-side-effects.test.ts`) |
| 404 | `NOT_FOUND` | Không tìm thấy, **hoặc thuộc tổ chức khác** |
| 409 | `CONFLICT` | Xung đột trạng thái, ví dụ duyệt một bản ghi đã duyệt |
| 413 | `PAYLOAD_TOO_LARGE` | Thân JSON vượt 2 MB (`details.max_bytes`); `handle()` chặn theo `content-length` hoặc khi đọc luồng vượt trần — tải tệp đi `formData`/URL ký, không qua trần này (07/11/2026, audit API-17) |
| 422 | `QUOTA_EXCEEDED` | Vượt hạn mức, job không được tạo |
| 422 | `IDEMPOTENCY_KEY_REUSED` | Cùng `Idempotency-Key` mà thân khác — job không được tạo; `details.job_id` là job của yêu cầu trước (audit API-11, PO 09/11/2026) |
| 429 | `RATE_LIMITED` | Kèm `Retry-After` (giây tới cuối cửa sổ). Mọi phản hồi của route có giới hạn tần suất (qua `handle()`) kèm `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` theo luật còn ít lượt nhất (07/11/2026, audit API-08; trước đó mã không đặt header nào) |
| 500 | `INTERNAL` | Không lộ chi tiết |

**Bản ghi của tổ chức khác trả 404, không trả 403.** Trả 403 là xác nhận bản ghi đó tồn tại — rò rỉ thông tin xuyên tổ chức bằng chính mã lỗi.

**Chống trùng.** Mọi `POST` tạo job nhận `Idempotency-Key`. Cùng khoá trong 24 giờ trả lại job cũ thay vì tạo job mới. Người dùng bấm hai lần không bị trừ credit hai lần. Cùng khoá mà `payload`/sản phẩm khác → 422 `IDEMPOTENCY_KEY_REUSED`, không tạo job (PO 09/11/2026, audit API-11; trước đó trả job cũ và chỉ ghi cảnh báo `jobs.idempotency_payload_mismatch` — cảnh báo vẫn ghi, không kèm nội dung). Miễn trừ có lý do (`KEY_REUSE_ALLOWED`, `src/modules/jobs/domain/idempotency.ts`): `creative.scene_plan` và `product.copy.generate` cố ý mở lại kết quả theo khoá cố định. `POST /integration/jobs` giữ hành vi cũ trong thời gian báo trước thay đổi phá vỡ (90 ngày, mục dưới): **báo 11/11/2026, áp 422 từ 09/02/2027 00:00 UTC** (`src/modules/integration/domain/integration-key-reuse.ts`, PO 11/11/2026). `POST /orders` cùng khoá khác thân → 422 (lưu băm thân, PO 11/11/2026).

**Lưu đệm.** Phản hồi JSON mặc định `Cache-Control: no-store`; route tự đặt `cache-control` (ảnh công khai, tệp xuất) được giữ nguyên (07/11/2026, audit API-17). Ngoại lệ trả `no-cache` (`src/core/http/ack-routes.ts`): mọi phản hồi lỗi (≥ 400, chỉ có envelope `{ error }`) và route chỉ trả xác nhận mà trang khách gọi không đọc thân (`ACK_ONLY_ROUTES` — sự kiện catalog/brochure Thẻ chào, nhận chủ phiên brochure): với `no-store`, Chromium không hoàn tất request chưa đọc thân, giữ kết nối và trang không bao giờ rảnh mạng.

**Version và gỡ endpoint (PO 07/11/2026, audit API-14).** Không thay đổi phá vỡ tại chỗ trong `/v1` (đổi/xoá trường, đổi kiểu, siết validation, đổi mã HTTP/lỗi, đổi ngữ nghĩa) — dựng endpoint mới song song. Thêm trường tuỳ chọn, thêm endpoint, thêm giá trị enum ở phản hồi, nới validation không phá vỡ; client phải bỏ qua trường/giá trị lạ. Endpoint cũ khai ở `DEPRECATIONS` (`src/core/http/deprecation.ts`): mọi phản hồi kèm `Deprecation: @<unix ngày báo>`, `Sunset: <ngày gỡ>`, `Link: <thay thế>; rel="successor-version"`; dòng của nó trong đặc tả này ghi **SẮP GỠ** kèm ngày gỡ. Báo trước tối thiểu **90 ngày** cho `/integration/*` và `/public/*`, **30 ngày** cho API chỉ giao diện SMEOS gọi; quá ngày gỡ mà route còn → test đỏ. Hiện chưa endpoint nào chờ gỡ. Thay đổi hành vi đã báo trước (không gỡ endpoint): `POST /integration/jobs` — cùng khoá khác thân → 422 từ **09/02/2027** (báo 11/11/2026).

**Thứ tự ưu tiên giữa đặc tả này và OpenAPI (11/11/2026).** Bốn tệp `docs/spec/contracts/openapi/{integration,public,platform,internal}.openapi.json` là bản PHÁI SINH, sinh từ lược đồ zod trong mã (`npm run gen:openapi`), không sửa tay; đăng ký ở `docs/00-DOCUMENTATION-REGISTRY.yaml` (`DOC-03-OPENAPI-*`). Khi lệch: đặc tả này thắng về đường dẫn, phương thức, mã năng lực và luật nghiệp vụ — sửa mã/lược đồ theo nó (hoặc sửa nó cùng commit nếu PO đổi luật); hình dạng thân/phản hồi chi tiết lấy theo lược đồ trong mã. `npm test` (test OpenAPI từng bề mặt) và `npm run check:docs` chặn mọi lệch giữa ba nguồn.

**OpenAPI `/public/*` (07/11/2026, audit API đợt 6).** Bản máy đọc được của mọi route công khai (42 operation): `docs/spec/contracts/openapi/public.openapi.json` (OpenAPI 3.1, tệp sinh ra — `npm run gen:openapi`). Nguồn là lược đồ zod ở `src/app/api/v1/public/_contracts/`: route dùng chung lược đồ thân/query ở `requests.ts`; phản hồi khai `strictObject` và kiểm trên CSDL thật (`tests/tenant/public-contract-*.test.ts`). Route Catalog đóng băng giữ lược đồ riêng — bản sao trong `requests.ts` được test đối chiếu (`tests/unit/public/public-catalog-contract.test.ts`). Bản `public` không công bố cho đối tác; chỉ dùng để rà và kiểm hợp đồng.

**OpenAPI nội bộ (08/11/2026, PO chọn chia đợt).** Bản máy đọc được của API tiệm do giao diện SMEOS gọi: `docs/spec/contracts/openapi/internal.openapi.json` (OpenAPI 3.1, tệp sinh ra — `npm run gen:openapi`; nội bộ, không công bố). Đợt nhóm lõi phủ đơn hàng, báo giá, sản phẩm, khách hàng (`/crm/*`), thành viên, tổ chức và xác thực (94 operation). Đợt Thẻ chào thêm `/greeting-card/*` (85 operation); đợt Điều phối thêm `/coordinator/*` (35 operation); đợt Creative Studio thêm `/creative-production/*` (22 operation); đợt ảnh thêm `/media/*` (13 operation); đợt tác vụ AI thêm `/jobs/*`, `/vision/*`, `/audio/*`, `/video/*` (32 operation; tổng 281). Nguồn ở `src/app/api/v1/_contracts/`: route dùng chung lược đồ thân ở `requests-*.ts`; phản hồi khai `strictObject` và kiểm trên CSDL thật (`tests/tenant/internal-contract-*.test.ts`); `x-capability` khớp cột năng lực các bảng dưới (`tests/unit/architecture/internal-openapi.test.ts`). Nhóm khác thêm ở các đợt sau.

## 3. Phiên và tổ chức

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| POST | `/auth/signup` | — | Tạo người dùng và tổ chức trải nghiệm. Từ 22/10/2026 tài khoản **chờ superadmin duyệt** (`approval_status = PENDING`): trả `202 { status: "PENDING_APPROVAL", message }`, không đặt cookie, không tạo phiên. Giới hạn 20 lần/giờ/IP (429); `industry_key` phải có trong danh mục ngành, chuỗi giới hạn độ dài (email 254, tên/tên tổ chức 120) → sai: 400 (rà soát cụm B, 22/10/2026) |
| POST | `/auth/login` | — | Chặn dò mật khẩu: 10 lần/15 phút mỗi email, 40 lần/15 phút mỗi IP → 429 (08/10/2026). Đúng mật khẩu nhưng tài khoản chưa duyệt / bị từ chối → 403 kèm câu báo; sai mật khẩu vẫn 401 như cũ, nên không dò được trạng thái |
| POST | `/auth/logout` | — | |
| GET | `/auth/me` | — | Người dùng, tổ chức hiện tại, danh sách năng lực đã tính |
| GET | `/auth/session-status` | — | Kiểm nhanh phiên còn sống; giao diện hỏi mỗi 15 giây và khi quay lại tab |
| GET | `/organizations` | — | Các tổ chức người dùng là thành viên |
| POST | `/session/organization` | — | Đổi tổ chức đang hoạt động |
| GET | `/session/invitations` | — | Lời mời vào tổ chức khác của chính người đang đăng nhập (thành viên `INVITED` chưa quá 14 ngày) — UJ-14 |
| POST | `/session/invitations/:id/accept` | — | Nhận lời mời của chính mình → thành viên đang hoạt động; của người khác → 404; quá 14 ngày → 409 (UJ-14) |
| POST | `/session/invitations/:id/decline` | — | Từ chối lời mời của chính mình (xoá thành viên `INVITED`) — UJ-14 |
| POST | `/session/password` | `A2` | Tự đổi mật khẩu `{ current_password, new_password }` (≥ 10 ký tự, khác mật khẩu cũ); sai mật khẩu hiện tại → 400; giữ phiên đang dùng, đăng xuất các máy khác; ghi audit (08/10/2026) |
| GET | `/organizations/current` | `F1` | |
| PATCH | `/organizations/current` | `F2` | `{ name?, settings? }` — `settings` hợp nhất nông. Tenant không sửa được khoá do nền tảng quản lý (`industry_locked`, `pending_model_change`, `is_instant_trial`, `lead_*`); đổi `industry` khi đã khoá ngành chỉ dành cho người vận hành nền tảng `N1`/`N12`. Vi phạm → 403 (21/10/2026) |

**Mỗi tài khoản chỉ một phiên.** `POST /auth/login` thu hồi mọi phiên còn hiệu lực của người dùng rồi mới cấp phiên mới (người đăng nhập sau thắng). Phiên cũ gọi bất kỳ endpoint nào nhận `401 UNAUTHENTICATED` kèm `details.reason = "SESSION_SUPERSEDED"`; giao diện hiện cảnh báo "đăng nhập trên thiết bị khác" và đưa về trang đăng nhập. Phiên tự đăng xuất hoặc hết hạn trả 401 không có `reason`.

`GET /auth/me` trả **danh sách mã năng lực đã tính sẵn** cho phiên hiện tại. Giao diện đọc danh sách này để ẩn hiện nút; máy chủ vẫn kiểm lại ở mọi endpoint. Giao diện ẩn nút không phải là phép kiểm quyền. Phần tổ chức chỉ gồm `id`, `name`, `slug`, `type`, `industry`, `industry_locked`, `pending_model_change` — không trả nguyên `settings` (SĐT, chat id, chính sách nội bộ).

```json
{
  "user": { "id": "…", "name": "…", "email": "…" },
  "organization": { "id": "…", "name": "…", "type": "CHAIN" },
  "workspace": { "id": "…", "kind": "PRODUCTION" },
  "membership": { "role_key": "dieu_hanh", "branch_id": null },
  "capabilities": ["A1", "A2", "B1", "…", "I2"],
  "credit_balance": 480
}
```

## 4. Thành viên, vai, chi nhánh

| Method | Path | Năng lực |
|---|---|---|
| GET | `/members` | `F1` |
| POST | `/members` | `A3` |
| POST | `/members/invite` | `F3` |
| DELETE | `/members/:id` | `F4` |
| POST | `/members/:id/reset-password` | `A7` |
| PUT | `/members/:id/phone` | `A3` |
| PATCH | `/members/:id/status` | `A5` |
| PATCH | `/members/:id/role` | `F5` |
| PUT | `/members/:id/chain-branch` | `F5` |
| GET | `/members/chain-branches` | `F5` |
| GET | `/branch-portal/orders` | `R14` |
| GET | `/roles` | `F1` |
| POST | `/roles` | `F5` |
| PATCH | `/roles/:id/capabilities` | `F5` |
| GET | `/branches` | `F6` |
| POST | `/branches` | `F7` |
| PATCH | `/branches/:id` | `F7` |
| GET | `/workspaces` | `F1` |
| POST | `/workspaces` | `F8` |

**Tài khoản cửa hàng nhận gia công (PO 22/10/2026).** Vai hệ thống `cua_hang`; `PUT /members/:id/chain-branch` `{ chain_branch_code | null }` gắn tài khoản với một chi nhánh chuỗi theo mã (ghi `memberships.branch_id`, ADR-012 T-4c — tài khoản bị giới hạn theo chi nhánh, D-56) — chi nhánh hoặc thành viên không thuộc tổ chức → 404; `GET /members/chain-branches` liệt kê chi nhánh để chọn. `GET /branch-portal/orders` (`R14`) trả `{ branch, orders[] }` cho trang `/cua-hang`: đơn đang mời chi nhánh (`OPEN`, có trong `invitedBranchIds` vòng hiện tại, chưa từ chối, chưa hết hạn), đơn chi nhánh đã nhận (`CLAIMED_GRACE`) hoặc đang làm (`COMMITTED`); lọc trong DB theo JSON, tối đa 100 đơn; chi nhánh lấy từ phiên, không nhận tham số. Mỗi đơn có `cardUrl` — link Thẻ Gia Công đã ký cho đúng chi nhánh (dựng từ `NEXT_PUBLIC_APP_URL`). Trang tự làm mới 30 giây/lần; chi nhánh không có Telegram/Zalo vẫn thấy lời mời ở đây (kết quả phát lệnh ghi kênh `APP`).

**Tài khoản nhân viên (PO 08/10/2026).** `POST /members` `{ name, email, role_id, branch_id?, phone? }` tạo người dùng + thành viên **đang hoạt động** trong một giao dịch, trả `temporaryPassword` (12 ký tự, hiện một lần, `Cache-Control: no-store`); email đã có tài khoản FloraOS → 409 (không chiếm tài khoản người khác — dùng `/members/invite`). `POST /members/invite` chỉ mời người **đã có** tài khoản (tạo thành viên `INVITED`); email chưa có tài khoản → 422 chỉ sang "Thêm nhân viên", không tạo người dùng mật khẩu rỗng (UJ-06, 07/11/2026). Người được mời nhận/từ chối ở `GET/POST /session/invitations…` (hạn 14 ngày); mời lại lời mời chưa nhận thì làm mới hạn (UJ-14). `POST /members/:id/reset-password` cấp mật khẩu tạm mới và đăng xuất người đó ở mọi máy; người đó còn là thành viên tiệm khác → 409; chính mình → 422. `PUT /members/:id/phone` `{ phone | null }` sửa số điện thoại nhân viên (Shipper được gắn đơn qua số này; số không hợp lệ → 400; người đó còn là thành viên tiệm khác → 409); `GET /members` chỉ trả `user.phone` cho người có `A3`. `PATCH /members/:id/status` `{ active }` tạm khoá (`SUSPENDED`, thu hồi ngay phiên ở tiệm này, giữ dữ liệu) hoặc mở lại. `A3`/`A5`/`A7` trần cứng Điều hành; thành viên tiệm khác → 404; mọi thao tác ghi `audit_logs` (không ghi mật khẩu).

`PATCH /roles/:id/capabilities` ghi vào `capability_overrides`. Yêu cầu bật một mã bị trần cứng chặn trả 403 `CAPABILITY_DENIED` và **không** ghi gì — trần cứng cắt sau bảng công tắc. Sàn quyền (09/11/2026, audit API §30): tắt `F1` hoặc `F5` trên vai `dieu_hanh` trả 422 và **không** ghi gì — tắt thì Điều hành không bật lại được. Khi tính quyền, vai `dieu_hanh` luôn có `F1`/`F5` kể cả nếu `capability_overrides` cũ đang tắt chúng (PO duyệt 09/11/2026, audit API §34).

## 5. Hồ sơ

| Method | Path | Năng lực |
|---|---|---|
| GET · PUT | `/business-profile` | `F1` · `F2` |
| GET · PUT | `/brand-profile` | `F1` · `F2` |

`/business-profile` có thêm `brand_message` (≤ 500 ký tự) và `target_customers` (tối đa 10 nhóm, mỗi nhóm ≤ 80 ký tự) — checklist ALG 9.3; PUT không gửi hai trường này thì giữ giá trị đang lưu. Hai trường đi vào ngữ cảnh AI viết nội dung (`readShopContext` → brief `shop.brandMessage`, `shop.targetCustomers`).

## 6. Sản phẩm, giá, asset

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/products` | `L1` | Lọc theo `branch_id`, `status`, `category`; `proposal=pending/rejected/expired` lọc mẫu đề xuất theo `attributes.proposal.status` (hàng chờ duyệt, PO 23/10/2026). Lọc toàn kho `occasion`, `price_range` (+`price_min`/`price_max` khi `custom`), `sort` → quét tối đa 3.000, `cursor` dạng `o:<n>`, trả thêm `total`, `truncated`; mỗi dòng có khối `commerce` (giá vốn cắt khi thiếu `L5`) (30/10/2026) |
| POST | `/products` | `L2` (+`L5` khi gửi `cost_price_vnd`) | Người thiếu `H3` tạo → mẫu mang nhãn đề xuất (`attributes.proposal`, chỉ máy chủ ghi), dùng được ngay, báo Điều hành sự kiện `PRODUCT_PROPOSED` (PO 23/10/2026). Nhận thêm `barcode`, `cost_price_vnd` (cần `L5`), `vat_percent`, `weight_grams`, `tags` (30/10/2026) |
| GET · PATCH | `/products/:id` | `L1` · `L3` (+`L4` khi `status=ARCHIVED`, +`L5` khi sửa `cost_price_vnd`) | PATCH `image_asset_id` thay ảnh chính; asset của tổ chức khác → 404. Thiếu `L5`: `attributes` bỏ `bom`, `priceGuard` và `craft_fee_vnd` (phí làm thay của mẫu, PO 22/10/2026) (kê trong `redacted_fields`), giá bán niêm yết vẫn trả; PATCH của người thiếu `L5` không ghi đè các khoá này (PO 14/10/2026). `craft_complexity` (`EASY`/`MEDIUM`/`HARD`) không bị ẩn. Thiếu `H3`: chỉ sửa nội dung mẫu đề xuất của chính mình; trên mẫu chính thức chỉ đổi `status` ACTIVE↔DRAFT và `availability_config`, còn lại `CAPABILITY_DENIED` (PO 23/10/2026). PATCH nhận cùng các trường bán hàng như POST; `cost_price_vnd` cần `L5`; phản hồi bỏ giá vốn khi thiếu `L5` (30/10/2026). Chuyển `status: ACTIVE` khi chưa đủ điều kiện (ảnh chính, danh mục, giá/công thức, bài viết bán hàng đã duyệt) vẫn lưu, phản hồi kèm `readiness_warnings` (checklist ALG 7.3, chỉ cảnh báo); `POST /products/bulk-status` trả `warnings: [{ id, code, missing }]` |
| POST | `/products/:id/approve` | `H3` | Duyệt mẫu đề xuất vào danh mục chính thức, ghi `audit_logs` `product.approve`; không có đề xuất chờ duyệt → 422; tổ chức khác → 404 (PO 23/10/2026) |
| POST | `/products/:id/reject` | `H3` | Body `{ reason }` (bắt buộc). Từ chối mẫu đề xuất: tạm ẩn (`DRAFT`), báo người đề xuất, 30 ngày sau tác vụ quét chuyển vào thùng rác; tổ chức khác → 404 (PO 23/10/2026) |
| GET · POST | `/products/:id/change-requests` | `H3` · `L3` | POST: người không có `H3` đề xuất sửa mẫu chính thức (body như PATCH, không có `status`); bản gốc giữ nguyên, báo Điều hành `PRODUCT_CHANGE_REQUESTED`. Không có thay đổi → 422. GET: đề xuất đang chờ của mẫu |
| GET | `/product-change-requests` | `H3` | Hàng chờ đề xuất sửa của tổ chức; `?status=` mặc định `PENDING` |
| POST | `/product-change-requests/:id/approve` | `H3` | Body `{ fields? }` — áp toàn bộ hoặc một phần; lưu `product_revisions` trước khi ghi; bản gốc đã đổi sau lúc gửi → 409 |
| POST | `/product-change-requests/:id/reject` | `H3` | Body `{ reason }` (bắt buộc) |
| GET | `/products/:id/revisions` | `H3` | 50 phiên bản gần nhất của mẫu |
| POST | `/products/:id/revisions/:revisionId/restore` | `H3` | Khôi phục nội dung (giữ trạng thái bán và nhãn đề xuất hiện tại); bản hiện tại được lưu thành phiên bản trước khi ghi |
| GET | `/products/import-batches` | `H3` | 10 lô nhập Excel gần nhất, `canUndo` trong 24 giờ |
| POST | `/products/import-batches/:id/undo` | `H3` | Hoàn tác lô: mẫu tạo ra vào thùng rác, mẫu bị cập nhật trả về bản trước lô; quá 24 giờ hoặc đã hoàn tác → 422 |
| POST | `/products/batch-import` | `L2` + `H3` | Chỉ Điều hành nhập Excel (PO 23/10/2026). Mỗi lần gọi là một lô (`batch_id` trong phản hồi), hoàn tác được 24 giờ; mẫu bị cập nhật được lưu phiên bản trước; tệp không gắn/gỡ được nhãn đề xuất. Nhập đồng loạt tối đa 500 sản phẩm (Excel/thư mục ảnh đã parse); `skip_duplicates` mặc định `true`. Mã đã có + kèm `image_asset_id` → chỉ bù ảnh chính nếu sản phẩm chưa có ảnh (không ghi đè dữ liệu/ảnh sẵn có), trả `images_attached_count`; link ảnh đang lưu không phải Google Drive (trống/trang web) được thay bằng link Drive trong file → `drive_links_updated_count` (09/10/2026). Bổ sung vào đặc tả 05/10/2026 |
| GET | `/products/export` | `R13` | CSV danh sách theo `status`/`category`/`search`; cột giá chỉ khi có `L5`; tối đa 5.000 dòng (`X-Export-Truncated`); ghi audit `data.export` (30/10/2026) |
| POST | `/products/bulk-status` | `L3` (+`L4` khi `ARCHIVED`) | Body `{ ids: string[1..100], status }`; từng dòng qua `updateProduct`, trả `{ updated, failed[{id, reason}] }` (30/10/2026) |
| POST | `/products/drive-thumbnails` | `L2` | Body `{ folder_ids: string[] }` (1–50 Drive id) → `{ thumbnails: { [folder_id]: url \| null } }`; màn nhập hàng loạt gom lô thay cho gọi `/public/drive-thumbnail` từng folder (trần 120/phút/IP làm file >120 dòng mất ảnh). 60 lần/phút/người dùng; server phân giải tối đa 6 luồng song song; client thử lại 429/5xx tối đa 4 lần (09/10/2026) |
| GET | `/products/:id/images` | **CHƯA XÂY** `G1` | |
| PUT | `/products/:id/images` | **CHƯA XÂY** `G2` | Đặt lại thứ tự và vai trò ảnh |
| GET · PUT | `/pricing-rules` | `L5` · `L6` | Theo tổ chức, có thể theo chi nhánh. Khoá phạm vi tổ chức `customer_tier_discount` (`{ NEW|BRONZE|SILVER|GOLD|VIP: tỷ lệ [0, 0,5] }`) và `peak_hour_surcharge` (`[{ startHour, endHour, vnd, label? }]`, 0 ≤ startHour < endHour ≤ 24) áp ở báo giá Thẻ Chào khi nhận diện khách qua SĐT và khung giờ giao; mỗi khoản là một dòng riêng |
| GET · POST | `/price-lists` | `L1` · `L3` | Bảng giá sản phẩm (30/10/2026). Lưu ở `pricing_rules` khoá `price_list:<id>` (chèn-chỉ, mỗi lần sửa là một phiên bản). GET trả `{ data, categories }` |
| GET · PUT · PATCH · DELETE | `/price-lists/:id` | `L1` · `L3` | GET: bảng giá dựng từ giá đang bán của sản phẩm + ưu đãi đang bật; PATCH `{ active }`: công tắc Đang dùng; DELETE: bỏ khỏi danh sách, giữ lịch sử. Tổ chức khác → 404 |
| GET · POST | `/vouchers/batches` | `Q8` | Phát hành mã giảm giá (30/10/2026). GET trả `{ batches, promotions, maxDiscountPercent }` (ưu đãi đang bật, cùng nguồn ma trận ưu đãi). POST: `mode` `SHARED` (một mã chung) · `UNIQUE` (tối đa 1000 mã riêng); trần % theo khoá nền tảng; `promotion_id` phải là ưu đãi đang bật |
| GET · PATCH | `/vouchers/batches/:id` | `Q8` | GET: đợt + tối đa 1000 mã; PATCH `{ is_active }`: tạm dừng/mở lại cả đợt. Tổ chức khác → 404 |
| GET | `/vouchers/batches/:id/export` | `Q8` | CSV (UTF-8 BOM) danh sách mã; ghi `audit_logs` `data.export` |
| POST | `/assets/upload-url` | `G2` | Trả URL ký sẵn; client tải thẳng lên kho |
| POST | `/assets` | `G2` | Ghi nhận asset sau khi tải xong |
| GET | `/assets/:id` | `G1` | |
| GET | `/assets/:id/view-url` | `G1` | Trả URL có chữ ký xem an toàn |
| DELETE | `/assets/:id` | `G3` | |

`POST /assets/upload-url` **tự sinh `storage_key`** theo `org/<organization_id>/<product_id>/<asset_id>.<ext>`. Client không đề xuất đường dẫn; nhận đường dẫn từ client là mở đường ghi đè chéo tổ chức.

## 7. Job

Một họ endpoint dùng chung cho mọi module. Màn hình theo dõi job đọc đúng bộ này.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/jobs` | `G4` · `G5` | `G4` chỉ thấy job của mình; có `G5` thì thấy toàn tổ chức |
| GET | `/jobs/:id` | `G4` | |
| GET | `/jobs/:id/events` | `G4` | Luồng sự kiện, xem dưới |
| POST | `/jobs/:id/cancel` | `G6` | Chỉ job còn `PENDING` |
| POST | `/jobs/:id/retry` | `G7` | Chỉ job `FAILED`. Job `COMPLETED/REJECTED` trả 409. Lượt mới: `attempts` về 0. Lượt trước đã được hoàn credit → trừ lại đúng giá lượt trước (không đủ → 422 `QUOTA_EXCEEDED`, job giữ `FAILED`); chưa hoàn → không trừ thêm (nợ #200) |

`POST /jobs/:id/retry` trên một job `COMPLETED` với `result = REJECTED` trả **409**, không phải 200. Chạy lại cho ra đúng phán quyết cũ và chỉ tốn GPU.

### Luồng sự kiện

`GET /jobs/:id/events` là SSE. Hai loại sự kiện, tách rời:

```
event: stage
data: {"stage":"ENHANCING","at":"2026-09-10T04:12:33Z"}

event: log
data: {"seq":118,"text":"Đã tách nền, còn 3 vùng nhiễu","at":"…"}

event: done
data: {"status":"COMPLETED","result":"WARNING"}
```

`stage` dẫn checklist tiến trình trên giao diện; `log` là nhật ký chi tiết mở ra khi cần điều tra. Nhật ký **cộng dồn và đọc lại được từ vị trí bất kỳ**: client gửi `Last-Event-ID` để nối tiếp sau khi mất kết nối. Đây là phần FloraOS v1 làm tốt và người dùng đã quen; giữ nguyên trải nghiệm, bỏ phần parse stdout.

## 8. Vision và tối ưu ảnh

### M01 — phân tích ảnh

| Method | Path | Năng lực |
|---|---|---|
| POST | `/vision/analyses` | `H1` |
| GET | `/vision/analyses` | `H3` (hàng chờ duyệt) · một trong `H5`/`H3`/`L1` khi `approval_state=APPROVED` |
| GET | `/vision/analyses/:id` | `H1` |
| PATCH | `/vision/analyses/:id` | `H2` |
| POST | `/vision/analyses/:id/approve` | `H3` |
| POST | `/vision/analyses/:id/reject` | `H3` |
| GET | `/vision/analyses/export` | `H3` |
| GET | `/vision/engine` | `H1` |
| PUT | `/vision/engine` | `H4` |
| POST | `/products/one-image-kit` | `H1` |
| GET | `/products/one-image-kit` | `H1` |
| POST | `/products/one-image-kit/run` | `H3` |

Luồng "Từ 1 ảnh" (checklist ALG 7.2, chặng 01, 02, 06, 08, 09, 10 theo PO Q12). `POST /products/one-image-kit` `{ asset_id }` + `Idempotency-Key` → job `vision.analyze` (202, `{ jobId, status, engine, usage }`). `GET /products/one-image-kit?job_id=&asset_id=` → `{ jobStatus, analysis: { id, approvalState, imageUrl, category, flowers } | null }` để người dùng kiểm tra. `POST /products/one-image-kit/run` `{ analysis_id }` + `Idempotency-Key` → duyệt phân tích (tạo thẻ sản phẩm nháp) → nội dung bán hàng (`H5`, job `product.copy.generate`) → giá vốn đề xuất từ BOM × đơn giá nguyên liệu (không AI) → bài đăng Facebook/Zalo (`I1`, job `content.generate`) → thẻ A6 (`M5`, `print_renditions` preset `A6`). Trả `{ status: READY | FAILED, failedStep, error, outputs: { productId, copyId, cost, contentGenerationId, posts, printRenditionId } }`; bước hỏng dừng chuỗi, job của bước đó tự hoàn credit, các đầu ra trước giữ nguyên. Chạy lại không tính tiền lại bản nội dung bán hàng đã có.

```http
POST /api/v1/vision/analyses
Idempotency-Key: 5b1e…

{ "asset_ids": ["…"], "product_id": null }
```
```json
{
  "job_id": "…", "status": "PENDING", "engine": "openai_structured",
  "usage": { "cost_credit": 1, "balance_after": 479 }
}
```

`engine` là bộ máy đã CHỐT cho lượt chạy này, đọc từ cấu hình tổ chức lúc tạo job và ghi vào `payload`. Đổi bộ máy sau đó không đổi job đã tạo.

`GET /vision/analyses` liệt kê hàng chờ duyệt (`approval_state = PENDING`), phân trang con trỏ. Gác bằng `H3` chứ không `H1` vì đây là màn của người duyệt, không phải người vừa gửi phân tích.

`PATCH` ghi vào `product_analyses.edited`; `raw` không bao giờ bị đụng tới. Cặp *máy đoán gì / người sửa thành gì* là dữ liệu huấn luyện về sau. Bản sửa **thay nguyên bản gốc**, nên nó phải giữ đủ mọi khoá cấp một mà máy đã trả — thiếu khoá trả 400 kèm danh sách khoá thiếu, vì một bản sửa thiếu `identity` sẽ âm thầm xoá trắng bốn trường nhận dạng của sản phẩm lúc duyệt. Mỗi lượt sửa sinh một bản ghi `audit_logs` action `product.analysis_edit`.

Kết quả đi tới một trong hai phán quyết, cả hai cần `H3`:

`POST …/approve` chuyển `approval_state` sang `APPROVED`, ghi `approved_by` và `approved_at`, cập nhật Product Master trong cùng một giao dịch, và sinh một bản ghi `audit_logs`. Duyệt một bản ghi đã `APPROVED` trả 409.

`POST …/reject` chuyển sang `REJECTED` và **không chạm Product Master** — từ chối là nói "kết quả này không dùng", không phải rút lại thứ gì đã ghi. Thân yêu cầu tuỳ chọn `{ "ly_do": "…" }`, vào phần `after` của `audit_logs` action `product.reject`; đó là chỗ duy nhất còn giữ được câu trả lời cho "vì sao bản này bị bỏ". Chỉ bản còn `PENDING` từ chối được — bản `APPROVED` đã vào Product Master và việc rút lại thuộc luồng thu hồi duyệt, bản `REJECTED` từ chối lại không đổi gì; cả hai trả 409.

`GET /vision/analyses/export` trả CSV mã hoá UTF-8 kèm BOM, `content-disposition: attachment`. Một dòng cho MỘT CẤU PHẦN chứ không phải một dòng cho một ảnh — đó là mức người vận hành đối chiếu thật. Cột `nguon` phân biệt số của máy với số của người. Tham số: `states` (nhiều giá trị hoặc ngăn bằng dấu phẩy), `from`, `to`. Trần 5.000 lượt phân tích mỗi lần xuất; chạm trần thì thu hẹp khoảng thời gian, và `x-cham-tran` trong phần đầu đáp ứng nói rõ đã chạm.

**Bộ máy phân tích.** `GET /vision/engine` trả bộ đang dùng và danh sách đủ ba bộ kèm trạng thái đo lường và việc ảnh có rời hạ tầng hay không — gác bằng `H1` vì người chạy phân tích cần biết bộ nào đang chạy để hiểu kết quả mình nhận, kể cả khi họ không đổi được.

```http
PUT /api/v1/vision/engine
{ "bo_may": "openai_direct" }
```
```json
{
  "dang_dung": "openai_direct",
  "danh_sach": [
    { "key": "openai_structured", "ten": "Đầy đủ", "trang_thai": "san_xuat", "gui_anh_ra_ngoai": true, "mo_ta": "…" },
    { "key": "openai_direct", "ten": "Gọn", "trang_thai": "thu_nghiem", "gui_anh_ra_ngoai": true, "mo_ta": "…" },
    { "key": "local_cv", "ten": "Cục bộ", "trang_thai": "chua_san_sang", "gui_anh_ra_ngoai": false, "mo_ta": "…" }
  ]
}
```

`PUT` cần `H4` (trần cứng Điều hành). Ghi vào `organizations.settings.bo_may_phan_tich` bằng hợp nhất nông — đổi bộ máy không được xoá công tắc khác của tổ chức. Mỗi lần đổi thật sự sinh `audit_logs` action `vision.engine.change`. Tên bộ máy ngoài danh sách trả 400.

### M04a — tối ưu ảnh

| Method | Path | Năng lực |
|---|---|---|
| POST | `/media/optimizations` | `I1` |
| GET | `/media/optimizations/:id` | `I1` |
| POST | `/media/optimizations/:id/approve` | `I2` |
| GET | `/media/optimizations/:id/download` | `I3` |
| POST | `/media/promote-to-master` | `I2` |

> **25/09/2026 (trả nợ #120).** `POST /media/optimizations` đưa MỌI bộ máy vào hàng đợi `media.optimize` qua `enqueueJob` — cả `config.engine = "cloud_provider"`. `config.enhancer_provider` ∈ `studio | local | openai | photoroom | fal_flux | fal` (`OPTIMIZE_ENHANCER_PROVIDERS`), mã khác → 400 trước khi trừ credit. Nhà cung cấp lỗi → worker lùi `StudioEnhancer` và ghi `parameters.fallback_reason`; Identity Guard do worker đo. Đáp ứng luôn `{ job_id, status, engine, usage }` — không còn trả ảnh ngay. Từ 25/09/2026 (PO: nhà cung cấp trước): trừ khi `enhancer_provider` là `studio`/`local`, máy chủ ghi `config.provider_order` (bên chọn cho lượt — `photoroom | fal_flux | imagen | openai`, `auto` = theo tiệm — rồi thứ tự của tiệm) và worker chạy chuỗi `ProviderChainEnhancer`; `engine` trong đáp ứng do máy chủ quyết. Giá (bảng giá v1): Photoroom/fal/OpenAI thu `media.optimize.cloud` = 3 credit, Studio/Local thu `media.optimize` = 2; `GET /media/optimizations/:id` hoàn chênh 1 credit khi worker lùi cục bộ (`output.provider_fallback`), hoàn toàn phần khi Guard từ chối / hỏng / huỷ.

```json
{
  "job_id": "…",
  "status": "COMPLETED",
  "result": "WARNING",
  "identity_guard": {
    "identity_score": 0.94, "color_score": 0.97,
    "geometry_score": 0.93, "component_consistency": 0.95
  },
  "outputs": { "master": "…", "ratios": { "1x1": "…", "4x5": "…", "9x16": "…", "16x9": "…" } },
  "approval": { "state": "pending", "approved_by": null, "approved_at": null },
  "flags": { "generative_fill_used": false, "requires_reshoot_warning": false }
}
```

`POST …/approve` trên job có `result = REJECTED` trả **409**. Ảnh bị cổng an toàn từ chối không được vào luồng duyệt. Job có `result = WARNING` duyệt được, nhưng giao diện phải hiện cảnh báo trước khi bấm.

Tải ảnh về (`/download`) **không** phải là phê duyệt. Hai việc khác nhau, hai năng lực khác nhau.

### M04b — biến thể marketing

| Method | Path | Năng lực |
|---|---|---|
| POST | `/media/variants` | `I4` |
| GET | `/media/variants` | `I5` |
| GET | `/media/variants/:id` | `I4` |
| POST | `/media/variants/:id/approve` | `I5` |
| GET | `/media/variants/:id/download` | `I3` |

**Hai nhánh, cùng đi qua `enqueueJob` (cập nhật 23/09/2026):** thân `POST /media/variants` mang `engine: "local_studio" | "cloud_provider"`, `preset` + `ratio` bắt buộc cho cả hai, `scene_index` (1–5, phân cảnh theo kịch bản bối cảnh của chủ đề — CREATIVE 5, AUTHENTIC 3; từ 24/09/2026) và `scene_plan_id` (job `creative.scene_plan` hoặc `rule:<topic>:<mode>`, ghi vào `assets.metadata`) tuỳ chọn; nhánh cloud thêm `provider_key` (hiện chỉ `stability`) và `scene_prompt` (≤ 600 ký tự, mô tả KHÔNG GIAN hậu cảnh). `local_studio` → job `media.variant` (1 credit); `cloud_provider` → job `media.variant.cloud` (2 credit, giá tạm — nợ #64). Worker Python xử lý CẢ HAI: nhánh cloud chỉ nhờ nhà cung cấp vẽ hậu cảnh trống, bó hoa dán nguyên khối từ Master Image, Subject Integrity là số ĐO; nhà cung cấp lỗi thì lùi về phông Studio cục bộ và ghi `cloud_fallback` vào asset + sự kiện job. `Idempotency-Key` bắt buộc. Đáp ứng: `{ job_id, status, engine, deduped, usage }` — kết quả đọc qua `GET /media/variants/:id` (nay trả thêm `source.engine`, `source.scene_index`, `source.cloud_fallback`). Trước 23/09 nhánh cloud chạy đồng bộ trong request (`executeCloudCreative`), không trừ credit, integrity gõ tay 0,98 — đã gỡ.

**Nhà cung cấp trước (PO 25/09/2026):** thân không nêu `engine` = `cloud_provider`; máy chủ ghi `payload.provider_order` (bên `provider_key` chọn cho lượt → thứ tự của tiệm → mặc định `fal → stability → imagen`), worker thử lần lượt, mọi bên lỗi mới lùi phông cục bộ. AUTHENTIC cũng dùng nhà cung cấp (chỉ dựng nền + ánh sáng).

**Hoàn credit lúc đọc (25/09/2026, trả nợ #127):** `GET /media/variants/:id` hoàn toàn phần khi job hỏng / huỷ / bị cổng toàn vẹn từ chối, và hoàn phần chênh `media.variant.cloud` − `media.variant` (1 credit) khi nhánh cloud lùi phông cục bộ (`source.cloud_fallback`). Idempotent — đọc bao nhiêu lần cũng chỉ hoàn một lần.

`I4`/`I5` là cặp chạy/duyệt tách rời của M04b (`media.variant.run`/`media.variant.approve`), dựng ở P16/P24 khi M04b chuyển hẳn vào `floraos-core` thay vì `SocialFlow` — xem `docs/dac-ta/02-function-catalog.md` mục 4 và `src/core/rbac/capability-catalog.ts`. Biến thể chỉ dựng được từ Master Image đã qua `I2`; cổng Subject Integrity đo trên bản dựng và chặn ghi `assets` khi lệch quá ngưỡng, cùng luật với `I2`/Identity Guard ở M04a.

## 9. Hàng đợi duyệt

> **CHƯA XÂY (soát 18/09).** Cả hai endpoint dưới đây đều chưa tồn tại trong mã. Việc duyệt hiện làm rời rạc qua từng endpoint `/…/:id/approve` của mỗi module. Xem **RS-7**.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/approvals` | **CHƯA XÂY** | Mọi thứ đang chờ duyệt, gộp từ nhiều module. Năng lực dự tính: `H3` · `H6` · `I2` · `I5` · `P4` · `O3` |
| POST | `/approvals/batch` | **CHƯA XÂY** | Duyệt hàng loạt, tối đa 50 mục |

Sáu loại đi qua hàng đợi này, mỗi loại một năng lực: kết quả phân tích (`H3`), dữ liệu bán hàng của sản phẩm (`H6`), Master Image (`I2`), biến thể marketing (`I5`, M04b — dựng trong `floraos-core` từ P24, không còn `P2` như dự tính ban đầu khi module này còn gắn `SocialFlow`), video (`P4`), nội dung đăng bài (`O3`). Hai loại cuối phát sinh ở engine ngoài và đi vào hàng đợi này qua đường đăng ký asset và số liệu ở mục 11 — cổng duyệt nằm ở core, không nằm ở engine.

`POST /approvals/batch` từ chối mọi mục là video và mọi mục có `result = WARNING`; hai loại đó chỉ duyệt được từng cái sau khi mở ra xem.

Trả về chỉ những mục người gọi có năng lực duyệt. Nếu công tắc `cho_phep_tu_duyet` của tổ chức đang tắt, bản ghi do chính người gọi tạo không xuất hiện trong danh sách này.

## 10. Mức dùng và kiểm toán

| Method | Path | Năng lực |
|---|---|---|
| GET | `/usage` | `G8` |
| GET | `/usage/summary` | `G8` |
| GET | `/usage/limits` | `G8` |
| PUT | `/usage/limits` | `U2` |
| GET | `/reports/orders` | `R20` |
| GET | `/reports/revenue` | `R20` |
| GET | `/reports/products` | `R20` |
| GET | `/reports/performance` | `R20` |
| GET | `/reports/cashflow` | `R20` |
| GET | `/subscription` | `D1` |
| POST | `/billing/sepay` | — (khoá `SEPAY_PLATFORM_API_KEY`) |
| GET | `/audit-logs` | `G9` |
| GET | `/audit-logs/platform-access` | `G9` |

`/audit-logs/platform-access` (ADR-013 D-I5, D-60, 06/11/2026): nhân viên nền tảng đã truy cập dữ liệu của tổ chức trong
phiên khi nào, để làm gì — `{ data: [{ id, created_at, operator_name, purpose, purpose_label }], next_cursor }`, mới nhất
trước, `?limit=1..100` (mặc định 25), `?cursor=`. Chỉ đọc. Mỗi handler Console vào `/platform/organizations/:id/*` và
`/platform/orgs-data/:orgId/*` ghi một dòng (`recordPlatformAccess`) trước khi đọc/ghi dữ liệu; mục đích suy từ thao tác
(`describePlatformAccess`), không bắt người vận hành nhập lý do. Tổ chức không tồn tại → không ghi, route vẫn 404.

`/usage/summary` trả số lượt theo `feature`, credit đã dùng, credit còn lại, chia theo chi nhánh nếu tổ chức là Chuỗi.

`/reports/*` (Đợt 5, checklist ALG 6.1, 6.2, 6.3, 6.5, 6.6; Điều hành và Kế toán): `?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month` (giờ Việt Nam, mặc định 30 ngày gần nhất, tối đa 366 ngày; sai → 400), theo đơn tạo trong kỳ và phạm vi chi nhánh của người xem (9.13). `orders`: tổng, hoàn tất (đã giao/hoàn tất), huỷ, giao trễ hẹn (sau giờ hẹn Điều phối, cuối khung giờ hẹn, hoặc cuối ngày giao), đang trễ, theo từng kỳ. `revenue`: dự kiến (đơn chưa huỷ) và thực thu (khoản thu đã xác nhận, trừ hoàn); `?detail=orders` trả danh sách đơn của kỳ (tối đa 200). `products`: xếp hạng theo số lượng và giá trị, tỷ trọng màu chủ đạo và phong cách. `performance`: doanh số theo Sale, sản lượng theo thợ (phân công đang hiệu lực), giao đúng giờ theo shipper (khớp thành viên qua số điện thoại). `cashflow`: theo hình thức thu; theo ngày, sổ thu chuyển khoản so với giao dịch ngân hàng nhận qua SePay (đã khớp, chưa khớp, lệch), danh sách giao dịch chưa khớp. `/usage/summary?period=YYYY-MM` (6.9): lọc theo tháng, kèm `monthly_limit`, `ai_limit` và `plan` (credit tặng mỗi tháng).

`/subscription` (checklist ALG 10.7): gói, kỳ hiện tại, trạng thái và hoá đơn của cửa hàng kèm mã VietQR (nội dung chuyển khoản = mã hoá đơn `TB…`). Gói `OVERDUE` (hoá đơn tới hạn chưa thu, PO Q9 không ân hạn) → mọi yêu cầu ghi của cửa hàng trả 402 `SUBSCRIPTION_OVERDUE`, yêu cầu đọc vẫn được. Hoá đơn kỳ sau sinh 7 ngày trước hết kỳ, nhắc `SUBSCRIPTION_RENEWAL_DUE` 7 ngày và 1 ngày trước hạn; quá hạn phát `SUBSCRIPTION_OVERDUE`; credit tặng theo gói cấp đầu tháng, phần tháng trước chưa dùng thu hồi (`EXPIRE`). Xét khi cửa hàng gửi yêu cầu, không cần lịch chạy nền. `POST /billing/sepay`: SePay báo giao dịch vào tài khoản nền tảng (`Authorization: Apikey …`; chưa cấu hình khoá → 404); khớp mã hoá đơn và đủ tiền → ghi đã thu, mã giao dịch SePay chống ghi trùng; không khớp để Console xác nhận tay.

`/usage/limits` (checklist ALG 10.3, 9.7): kỳ hiện tại (YYYY-MM giờ Việt Nam), `credit { used, limit }` theo hạn mức nền tảng đặt và `ai { used, limit }` theo trần cửa hàng tự đặt (`PUT { aiMonthlyLimit: number | null }`, Điều hành). Hai hạn mức chặn ngay khi trừ credit: vượt → 422 `QUOTA_EXCEEDED`, số dư không bị trừ. Dùng tới 80% phát `USAGE_LIMIT_NEAR`, số dư dưới 20% lần nạp gần nhất phát `CREDIT_LOW` (mỗi loại một lần mỗi kỳ). Tin SMS/ZNS gửi khách trừ credit theo quy đổi của nền tảng (mặc định 0); gửi lỗi hoàn lại, hết credit thì bỏ qua tin.

## 11. Integration API — máy gọi máy

Dành cho `LocalBudd` (M05, M06) và `SocialFlow` (M07). *(M04b đã chuyển về core ở P24, không còn là engine ngoài.)*

**Tám đường đang chạy thật** — đã xác minh 18/09 là có mặt ở cả hai phía: `LocalBudd/src/core/ports/FloraOsCoreClient.ts` gọi `products`, `products/:id/master-image`, `business-profile`, `brand-profile`, `capabilities/check`, `jobs`; `SocialFlow/backend/floraos_core.py` gọi `brand-profile`, `usage`. Bốn đường đánh dấu **CHƯA XÂY** dưới đây chỉ tồn tại trong đặc tả này.

```
Authorization: Bearer <token cấp theo tổ chức>
```

**Gỡ trường nội bộ (ARC-024, PO 11/11/2026).** Báo 11/11/2026, **từ 09/02/2027 00:00 UTC** máy chủ tự bỏ khỏi phản hồi (`src/modules/integration/domain/integration-field-sunset.ts`; OpenAPI đánh dấu `deprecated`): ảnh (`/integration/assets`) — `storage_key`, `thumb_key`, `provider`, `model`, `model_version`, `pipeline_version`, `parameters`, `prompt`, `input_sha256`, `output_sha256`, `cost_usd`, `created_by`, `approved_by`, `trashed_at`, `purge_after`, `legal_hold_until`; `master-image` (`master`, `ratios[]`) — `storage_key`, `thumb_key` (dùng `url`); `job` của `/integration/jobs` — `user_id`, `workspace_id`, `branch_id`, `request_id`, `job_group_id`, `run_after`, `error` (giữ `payload`, `output`, `failure_kind`); `/integration/usage` — `user_id`, `workspace_id`, `cost_usd`, `metadata`; `/integration/catalog-links*` — `created_by`, `revoked_by`, `trashed_at`, `purge_after`. Tên camelCase cũ (`masterImageUrl`, `driveLink`, `costCredit`) giữ tới `/v2`.

**OpenAPI (07/11/2026, audit API đợt 4).** Bản máy đọc được của mục này: `docs/spec/contracts/openapi/integration.openapi.json` (OpenAPI 3.1), sinh từ lược đồ zod ở `src/modules/integration/contracts/` — route dùng chung lược đồ thân, nên tài liệu không lệch mã; phản hồi khai `strictObject` và được kiểm trên CSDL thật. Sửa route `/integration/*` → sửa hợp đồng → `npm run gen:openapi`.

**Giới hạn tần suất (07/11/2026, audit API-09).** Mọi đường `/integration/*`: 600 lần/phút cho mỗi token (nhánh SSO: mỗi người dùng trong một tổ chức) → 429 kèm `Retry-After`, sau khi xác thực xong — token sai vẫn 401.

| Method | Path | Trả về |
|---|---|---|
| GET | `/integration/products` | Product Master của tổ chức |
| GET | `/integration/products/:id/master-image` | Master Image đã duyệt, kèm các tỉ lệ |
| GET | `/integration/business-profile` | |
| GET | `/integration/brand-profile` | |
| POST | `/integration/jobs` | Tạo job thay mặt tổ chức. **Thay đổi đã báo trước:** cùng `idempotency_key` mà thân khác → 422 `IDEMPOTENCY_KEY_REUSED` từ 09/02/2027 (trước đó trả job cũ) |
| POST | `/integration/usage` | Ghi mức dùng phát sinh ở engine ngoài |
| POST | `/integration/capabilities/check` | Hỏi một người có năng lực gì |
| GET | `/integration/learning-profile` | **CHƯA XÂY** — hồ sơ phong cách của tổ chức, để engine soạn nội dung đọc |
| POST | `/integration/assets/upload-url` | **CHƯA XÂY** — URL ký sẵn để engine ngoài tải byte lên; core sinh `storage_key`. Xem **RS-4** |
| POST | `/integration/assets` | Đăng ký một asset dẫn xuất đã hoàn tất |
| POST | `/integration/content-metrics` | Ghi số liệu hiệu quả của một nội dung đã đăng |
| GET | `/integration/ai-policy` | **CHƯA XÂY** — chính sách AI của tổ chức: năng lực được phép, mô hình đủ điều kiện, ngưỡng, sàn quyền riêng tư |
| POST | `/integration/ai-requests` | **CHƯA XÂY** — ghi số đo mỗi lời gọi mô hình: mô hình, chi phí, độ trễ, điểm chất lượng |

**Ba đường ghi, không nhiều hơn.** `POST /integration/assets` nhận creative và video đã hoàn tất, bắt buộc `parent_asset_id` trỏ tới một asset `APPROVED` của cùng tổ chức — thiếu hoặc trỏ sai trả 422, vì một dẫn xuất không truy được về Master Image đã duyệt là một dẫn xuất không ai biết nó vẽ đúng sản phẩm nào. Asset đăng ký vào với `approval_state = PENDING` và đi vào hàng chờ duyệt ở mục 9; engine ngoài không đặt được trạng thái duyệt.

`POST /integration/content-metrics` ghi vào `campaign_rollups`, mang cột nguồn và khoá tự nhiên theo `(organization_id, platform, external_post_id, ngày)` nên chạy lại không nhân đôi. Số liệu gốc vẫn thuộc engine; đây là bản dựng lại được để core nối với `orders`.

`POST /integration/usage` ghi mức dùng phát sinh ngoài core với `cost_credit = 0` — credit đã trừ ở `POST /integration/jobs`, và trừ lần hai là thu tiền hai lần.

### 11.1 Thân yêu cầu của bốn đường ghi

```http
POST /api/v1/integration/assets
{
  "parent_asset_id": "…",            // bắt buộc, phải là asset APPROVED cùng tổ chức
  "product_id": "…",
  "kind": "MARKETING",               // MARKETING · VIDEO · CATALOG · LANDING · SOCIAL
  "storage_key": null,               // ⚠ ĐẶC TẢ ≠ MÃ — xem RS-4
  "upload_token": "…",               // ⚠ ĐẶC TẢ ≠ MÃ — xem RS-4
  "mime_type": "image/png",
  "aspect_ratio": "4x5",
  "sha256": "…",
  "provider": "…", "model": "…", "model_version": "…",
  "pipeline_version": "…",
  "parameters": { … }, "prompt": "…",
  "generated_flags": { "generative_fill_used": false },   // không mặc định ngầm
  "cost_usd": 0.042
}
```
```json
{ "asset_id": "…", "version": 2, "approval_state": "PENDING" }
```

`generated_flags` thiếu thì trả **422**, không trả 200 với giá trị mặc định — `YC-A5` áp cho cả đường này. `parent_asset_id` trỏ tới asset chưa duyệt hoặc thuộc tổ chức khác trả **404**, không trả 403.

```http
POST /api/v1/integration/content-metrics
{
  "rows": [
    { "platform": "facebook", "external_post_id": "…", "metric_date": "2026-09-11",
      "product_id": "…", "campaign_ref": "…",
      "reach": 1820, "engagement": 96, "inbox": 7, "clicks": 34,
      "cost_usd": 0, "is_legacy": false }
  ]
}
```
```json
{ "accepted": 1, "updated": 0, "rejected": [] }
```

Khoá tự nhiên là `(organization_id, platform, external_post_id, metric_date)`; gửi lại cùng một hàng thì `updated` tăng, không nhân đôi. Trần 500 hàng mỗi lượt.

```http
POST /api/v1/integration/ai-requests
{
  "rows": [
    { "capability_code": "creative_variants", "model_key": "…",
      "attempt": 1, "escalated_from": null, "fallback_from": null,
      "job_id": null,
      "input_tokens": null, "output_tokens": null, "image_count": 3,
      "duration_seconds": 8.4, "gpu_seconds": null,
      "cost_usd": 0.061, "latency_ms": 8412,
      "quality_score": 0.93, "outcome": "ACCEPTED" }
  ]
}
```
```json
{ "accepted": 1 }
```

Bảng này chỉ ghi thêm và **không nhận prompt lẫn đầu ra** — gửi lên thì hai trường đó bị bỏ qua, cùng cách xử lý với `organization_id`. `capability_code` ngoài sổ đăng ký trả 400.

```http
GET /api/v1/integration/ai-policy
```
```json
{
  "capabilities": {
    "creative_variants": {
      "allowed_models": [
        { "key": "…", "measure_state": "san_xuat", "leaves_infra": true }
      ],
      "privacy_floor": "public",
      "accept_threshold": null,
      "measure_channels": ["product_integrity", "composition"]
    }
  },
  "generated_at": "2026-09-12T03:10:00Z",
  "cache_ttl_seconds": 900
}
```

Engine ngoài cache theo `cache_ttl_seconds`. Hết hạn mà không gọi được core thì **dùng bản cache cũ và không tự nới** — chính sách là một giới hạn, nên bản cũ chỉ có thể chặt hơn hoặc bằng, miễn là engine không tự thêm mô hình. Đây là chiều ngược với `POST /integration/jobs` ở mục 11: ở đó không gọi được core thì engine dừng việc tính phí, vì hạn mức là tiền của tổ chức và phải chặn thật.

`GET /integration/ai-policy` và `POST /integration/ai-requests` là đôi giữ nền AI của engine ngoài đứng cùng luật với core. Chính sách đọc được thì engine cache lại; không đọc được thì dùng bản cache gần nhất và **không tự nới** — một engine tự quyết mô hình nào được dùng là một engine có thể gửi ảnh khách tới một nhà cung cấp chưa ai soát. `POST /integration/ai-requests` không mang dữ liệu nghiệp vụ nào, chỉ mang số đo về chính lời gọi, nên nó là đường ghi duy nhất không đi qua cổng duyệt.

**Engine ngoài không bao giờ tự khai `organization_id`.** Nó nằm trong token, do core cấp và ký. Token có phạm vi năng lực riêng, hẹp hơn năng lực của người dùng.

`/integration/products/:id/master-image` chỉ trả ảnh có `approval_state = APPROVED`. Ảnh chờ duyệt không rò ra ngoài core.

## 12. Dữ liệu bán hàng của sản phẩm — M01b

> **Đổi tên 18/09.** Nhóm này từng được đặc tả dưới `/vision/copies`; route thật là **`/product-copies`** kể từ P14. Bảng dưới đã sửa theo mã.

| Method | Path | Năng lực | Gác ở đâu |
|---|---|---|---|
| POST | `/product-copies/generate` | `H5` | use-case |
| GET | `/product-copies` | `H5` | use-case (`listProductCopies`; sửa 08/11/2026 — đặc tả ghi "chưa gác" là cũ) |
| GET | `/product-copies/:id` | `H5` | use-case |
| PATCH | `/product-copies/:id` | `H5` | use-case |
| POST | `/product-copies/:id/approve` | `H6` | use-case |
| POST | `/product-copies/:id/reject` | `H6` | use-case |

Nhóm này kiểm quyền bằng `ctx.capabilities.has("…")` viết tay thay vì `requireCapability(ctx, "…")` như phần còn lại của hệ thống. Hai lối viết cho cùng một phép kiểm — xem **RS-9**.

```http
POST /api/v1/product-copies/generate
Idempotency-Key: 91c4…

{ "analysis_id": "…", "kenh": ["catalog", "facebook", "zalo"] }
```

`analysis_id` phải trỏ tới một lượt phân tích `APPROVED` của cùng tổ chức; lượt còn `PENDING` trả 422. Sinh câu chữ từ một kết quả chưa ai soát là đưa cái sai của máy đi thẳng ra kênh bán.

Cùng khuôn với M01: `raw` giữ bản máy sinh, `PATCH` ghi vào `edited`, duyệt ghi vào Product Master trong một giao dịch cùng với `audit_logs`. Phân khúc giá trong kết quả là một **nhãn bán hàng**, không phải giá chào — giá chào vẫn tính từ `/pricing-rules` và engine giá.

## 13. Catalog và liên kết QR — M06

> **Đổi định danh 18/09.** Đặc tả cũ dùng `:id`; route thật định danh bằng **`:slug`**. Năng lực thật là `J1`/`J2`, không phải `J7` (`J7` chưa vào danh mục). Bảng dưới đã sửa theo mã.
>
> **RS-3 (18/09): Core chốt làm chủ DUY NHẤT bảng `catalog_links`.** `LocalBudd` đã bỏ bảng riêng của nó cùng ngày, chuyển sang gọi các endpoint `/integration/catalog-links*` dưới đây (`src/core/ports/FloraOsCoreClient.ts`). Nhân lúc sửa, phát hiện `PATCH` (đổi tên/mô tả/bộ lọc) trước đó nằm NHẦM ở tệp route của `/catalog-links/:slug/revoke` nên thực ra chạy tại `PATCH /catalog-links/:slug/revoke`, không phải `PATCH /catalog-links/:slug` như tài liệu cũ ngỡ — không ai từng gọi tới; đã dời về đúng chỗ.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET · POST | `/catalog-links` | `J1` | Route phiên (cookie), dùng bởi giao diện core |
| GET | `/catalog-links/:slug` | **chưa gác** — có chủ đích, xem **RS-8** | Công khai, khách quét QR không đăng nhập |
| PATCH | `/catalog-links/:slug` | `J1` | Trước 18/09 nằm nhầm ở đường dẫn `/revoke` (xem trên) |
| POST | `/catalog-links/:slug/revoke` | `J2` | Thu hồi; không xoá bản ghi |
| GET · POST | `/integration/catalog-links` | `J1` (nhánh SSO) | Mới 18/09 (RS-3) — `LocalBudd` gọi thay mặt người dùng đang đăng nhập · GET `?include_revoked=` nhận `true/false/1/0/yes/no/on/off`, giá trị khác → 400; trước 07/11/2026 mọi chuỗi khác rỗng (kể cả `false`) đều thành `true` |
| PATCH | `/integration/catalog-links/:slug` | `J1` (nhánh SSO) | Mới 18/09 (RS-3) |
| POST | `/integration/catalog-links/:slug/revoke` | `J2` (nhánh SSO) | Mới 18/09 (RS-3) |
| GET | `/public/catalog/:slug` | — *(công khai)* | Storefront khách xem; ảnh ký HMAC; `customer` chỉ có tên/lời chào, không bao giờ có số điện thoại · Giới hạn 60 lần/phút/IP → 429 (PO 07/11/2026, audit API-09) |
| POST | `/public/catalog/:slug/lead` | — *(công khai)* | Bước 4 (30/10/2026): `{ name, phone, consent: true, message?, ref?, utm?, verificationToken?, website }` → bảng `leads` + khách CRM (tìm/tạo theo SĐT) + `customer_consents` PHONE_CALL. Tổ chức suy từ catalog; catalog thu hồi → 404. Chặn máy: 10 lần/10 phút/IP, ô bẫy `website`, Cloudflare Turnstile khi khai `TURNSTILE_SECRET_KEY`; mỗi SĐT 3 lead/giờ/tiệm → 429. `ref` = mã link động cùng tổ chức → nguồn `SHORT_LINK` |
| POST | `/public/catalog/:slug/order` | — (công khai) | Đơn hàng đa nguồn P3 — khách đặt hàng trên catalog/landing `{ productId, quantity, name, phone, address, deliveryDate?, timeSlot?, note?, verificationToken? }`; tổ chức suy từ catalog; nút Đặt hàng tắt cho nguồn → 404; giá tính lại ở máy chủ (mẫu chưa có giá → đơn chờ báo giá); qua `ingestOrder` nguồn `CATALOG`/`LANDING`, gắn lead mở cùng SĐT; ≤ 10 lần/10 phút/IP, 5 đơn/giờ/SĐT; trả `{ orderCode, totalVnd, needsQuote, payment }` |
| GET · POST | `/store-share-link` | `F1` · `F2` | Công cụ 11 (30/10/2026): xem / tạo link hồ sơ cửa hàng công khai. POST từ chối khi hồ sơ thiếu mục thiết yếu; đã có link đang hoạt động thì trả link đó |
| GET · POST | `/brand-library` | `F1` · `F2` | Công cụ 45 (30/10/2026): thư viện nhận diện thương hiệu của tổ chức; `?include_archived=true`. POST tạo mục + phiên bản 1; loại LOGO/IMAGE/TEMPLATE cần `asset_id` là ảnh JPG/PNG/WebP của chính tổ chức, loại còn lại cần `text_value` (COLOR chỉ nhận mã hex) |
| GET · PATCH | `/brand-library/:id` | `F1` · `F2` | Xem kèm các phiên bản; sửa tên/mô tả, `share_with_members`, `status` ACTIVE/ARCHIVED. Mục của tổ chức khác → 404. Ghi nhật ký kiểm toán |
| POST | `/brand-library/:id/versions` | `F2` | Thêm phiên bản mới (bản cũ giữ nguyên); mục đã lưu trữ → 400 |
| GET | `/brand-library/chain` | `F1` | Cửa hàng thành viên: mục chuỗi đã chia sẻ, đang dùng (chuỗi suy từ cạnh chính `organization_links.is_primary`, không nhận từ client); `data: null` khi không thuộc chuỗi |
| POST | `/store-share-link/revoke` | `F2` | Ngừng link đang hoạt động; trang `/ch/:slug` cũ báo đã ngừng. Không có link → 404 |
| GET | `/brand-kit` | `F1` | Mục Thương hiệu 3 bước (PO 08/11/2026): trạng thái tab (Hồ sơ cửa hàng → Bộ nhận diện → Landing page, bước sau `LOCKED` khi bước trước chưa xong), mục Hồ sơ còn thiếu, phương án đã sinh, giá "Tạo thêm" (`credit_pricing.brandExtraOptionCredit`) |
| POST | `/brand-kit/identity-options` | `F2` | `{ mode: initial\|extra\|refresh }`. `initial`: 3 phương án (Sang trọng / Tươi trẻ / Mộc mạc) miễn phí, sinh từ Hồ sơ (không nhận nội dung từ client); `refresh`: lượt 3 phương án mới miễn phí khi hồ sơ đã đổi; `extra`: 1 phương án, job tại chỗ trừ credit, bắt buộc `Idempotency-Key` (AI hỏng → phương án mẫu + hoàn credit). Hồ sơ chưa đủ → 400; đã có lượt đầu → 409 |
| POST | `/brand-kit/identity-options/:id/select` | `F2` | Chọn bộ nhận diện chính thức: ghi màu, phông chữ, khẩu hiệu, logo (PNG dựng từ SVG, lưu kho; giữ logo chủ tiệm tự tải) vào `brand_profiles`. Phương án tổ chức khác → 404 |
| POST | `/brand-kit/landing-options` | `J7` | Như trên cho Landing page chính thức; khoá khi chưa chọn bộ nhận diện (400) |
| POST | `/brand-kit/landing-options/:id/select` | `J1` | Chủ tiệm chọn = xuất bản trang chính thức `/c/:slug` (`filters.store_official = true`: sản phẩm chủ đạo, ảnh, video, giờ mở cửa, liên hệ đọc sống từ Hồ sơ); đổi phương án giữ nguyên link còn hiệu lực |
| GET | `/content-studio/products` | `L1` | Hành trình Tạo nội dung 4 bước (PO 08/11/2026): Kho sản phẩm (dùng lại `listProducts` — phạm vi chi nhánh, che giá) kèm cờ `has_copy` (Bài giới thiệu đã duyệt), `has_pitch` (Thẻ chào đã chốt). `?limit` 1–100, `?cursor` mờ → `{ data, next_cursor }` |
| GET | `/content-studio/products/:id` | `L1` | Sản phẩm đang làm: bản quét ảnh mới nhất (ưu tiên đã duyệt, kèm ảnh ký), Bài giới thiệu mới nhất, Thẻ chào đã lưu, lượt bài đăng đa kênh mới nhất (`latest_posts`: bài máy viết + bài đã duyệt, bỏ bản trong thùng rác), cờ duyệt từng bước (`card_approved`, `copy_approved`, `pitch_saved`, `approved_posts`). Tổ chức / chi nhánh khác → 404 |
| PUT | `/content-studio/products/:id/sales-pitch` | `L3` | `{ pitch }` snake_case (kiểm chặt, ≤ 32 KB). Chốt Thẻ chào sản phẩm (tư vấn bán hàng) → `products.attributes.sales_pitch` `{ data, finalized_at, finalized_by, version }`, giữ mọi khoá khác; ghi qua `updateProduct` (mẫu chính thức: chỉ `H3`); audit `product.sales_pitch.finalize`. Thẻ sản phẩm / Bài giới thiệu chưa duyệt → 409 |
| GET | `/content-studio/scans/:jobId` | `H1` | Các Thẻ sản phẩm (bản quét, mỗi ảnh một dòng, trần 20) của một lượt `POST /vision/analyses`. Lượt của tổ chức khác → danh sách rỗng |
| GET | `/social-publishing/channels` | `J5` | Bước 4 "Đăng tự động" (PO 08/11/2026): trạng thái kết nối Facebook, Instagram, Zalo, TikTok của tổ chức (`connected`, `status`, `display_name`, `expires_at`, `app_configured`) — không trả khoá |
| GET | `/social-publishing/posts` | `J5` | Bài đăng tự động của tổ chức, mới trước. `?status`, `?content_generation_id`, `?limit` 1–100, `?cursor` mờ → `{ data, next_cursor }` |
| POST | `/social-publishing/posts` | `J5` | `Idempotency-Key` BẮT BUỘC. `{ content_generation_id, channels[], mode: NOW\|AUTO\|AT, scheduled_at? }` — lên lịch bài ĐÃ DUYỆT ở Bước 3, mỗi kênh một bài. Kênh chưa kết nối → 409; vi phạm luật nền tảng (số ảnh, độ dài, hashtag) hoặc bài lộ mật khẩu/khoá → 400; lượt bài tổ chức khác → 404. AUTO = khung giờ vàng gần nhất (11:30 / 20:00 giờ VN), các bài cách nhau 10 phút. 201 `{ data: posts[] }`; gửi lại cùng khoá trả bài cũ |
| POST | `/social-publishing/posts/:id/cancel` | `J5` | Huỷ bài đang chờ (`QUEUED`); đã bắt đầu đăng → 409 |
| POST | `/social-publishing/posts/:id/retry` | `J5` | Thử lại bài `FAILED` — đăng ở lượt cron kế tiếp, cấp lại đủ 5 lượt |
| POST | `/social-publishing/channels/:channel/connect` | `W2` | Bắt đầu kết nối kênh (OAuth): `{ authorize_url }` tới trang đồng ý của Meta / Zalo / TikTok (Instagram dùng luồng Facebook). `state` mã hoá (`secret-box`) gắn tổ chức + người + hạn 10 phút; Zalo/TikTok kèm PKCE. Ứng dụng nền tảng chưa cấu hình → 409. Hướng dẫn đăng ký: `docs/kien-truc/HUONG_DAN_DANG_KY_UNG_DUNG_MXH.md` |
| GET | `/social-publishing/channels/:channel/callback` | `W2` | Nền tảng chuyển trình duyệt về (cùng phiên đăng nhập). Kiểm `state` (đúng tổ chức, đúng người, đúng kênh, còn hạn), đổi mã lấy khoá, lưu `integration_connections` (khoá mã hoá theo đầu nối `social_<kênh>`). Luôn 303 về `/cong-cu?muc=content&buoc=dang-tu-dong&ket_noi=ok\|chon-trang\|loi` — không đưa khoá lên URL |
| POST | `/social-publishing/channels/:channel/disconnect` | `W2` | Ngắt kết nối kênh, xoá khoá (giữ dòng để đối soát). 204 |
| GET | `/social-publishing/facebook-pages` | `W2` | Các Trang Facebook chờ chọn sau khi đồng ý (tài khoản quản lý nhiều Trang) — `{ id, name, has_instagram }`, không trả khoá |
| POST | `/social-publishing/facebook-pages` | `W2` | `{ page_id }` — kết nối Trang (kèm Instagram Business gắn với Trang) |
| GET · POST | `/short-links` | `J1` | Bước 4 — công cụ 12/13/25 (30/10/2026): link/QR động. `?kind=QR\|SALES_LINK`, cursor + `limit` ≤ 100. POST `{ kind, name, targetPath, placementLabel?, utmSource?, utmMedium?, utmCampaign?, expiresAt? }`; `targetPath` chỉ nhận đường dẫn nội bộ bắt đầu bằng `/` (chặn open redirect) |
| PATCH | `/short-links/:id` | `J1` | Đổi tên/đích/vị trí/UTM/hạn, `isActive`. Mã đã in giữ nguyên. Link tổ chức khác → 404 |
| GET | `/short-links/:id/stats` | `J1` | `?days=1..90` (mặc định 30): tổng lượt quét, khách riêng (băm theo ngày), số lead, theo thiết bị, theo ngày (giờ VN) |
| GET | `/leads` | `Q1` | Bước 4 — công cụ 21: khách để lại thông tin; `?status=NEW\|IN_PROGRESS\|WON\|LOST` (`CONTACTED` cũ → `IN_PROGRESS`, 31/10/2026), cursor + `limit` ≤ 100; kèm `counts` theo trạng thái |
| POST | `/leads` | `Q2` | Đơn hàng đa nguồn §3.1 — Sale tự thêm khách tiềm năng `{ name, phone, message?, reason: WALK_IN\|QUOTE_REQUEST\|CONTACT, nextFollowUpAt? }`; nguồn `MANUAL`, người phụ trách = người nhập; tổ chức từ phiên → 201 `{ lead: { id } }` |
| PATCH | `/leads/:id` | `Q3` | `{ status?, assigneeUserId? }` — người phụ trách phải là thành viên ACTIVE của tổ chức; lead tổ chức khác → 404; ghi `audit_logs` `lead.update` |

**Chưa có:** `GET /catalog-links/:slug/qr` (ảnh PNG mã QR để in) ở core — `LocalBudd` tự sinh QR phía route của nó (`qrcode`, trỏ về `/c/:slug` của chính nó), core cũng có `src/core/media/qr-engine.ts` sinh QR phía giao diện, không qua endpoint. Xem **RS-7**.

Liên kết thu hồi được nhưng không xoá được: một mã QR đã dán ngoài cửa hàng vẫn sẽ bị quét sau khi thu hồi, và bản ghi là chỗ duy nhất trả lời được lượt quét đó trỏ về đâu. Liên kết đã thu hồi trả trang "bộ sưu tập này đã đóng", không trả lỗi kỹ thuật.

**Còn lại sau RS-3, CHƯA quyết:** trang catalog vẫn có hai bản RENDER song song — core phục vụ `/c/:slug` + `GET /api/v1/public/catalog/:slug`, và `LocalBudd` phục vụ `/c/:slug` của riêng nó (nay đọc dữ liệu từ core thay vì bảng riêng). RS-3 chỉ chốt ai làm chủ DỮ LIỆU (`catalog_links`) — chưa chốt ai phục vụ TRANG cho khách quét QR khi cả hai cùng tồn tại. Không chặn gì hôm nay (mỗi bên vẫn chạy được độc lập), nhưng là một quyết định sản phẩm còn treo, khác diện RS-3.

## 14. Khách hàng — M09

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
> **Đổi tiền tố 18/09.** Đặc tả cũ dùng `/customers`; route thật nằm dưới **`/crm/`**. Bảng dưới đã sửa theo mã.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/crm/customers` | `Q1` · `Q2` | Sắp theo ngày đặc biệt gần nhất theo mặc định |
| GET | `/crm/customers/export` | `R13` (chỉ Điều hành; người khác cần Điều hành cấp quyền — PO 14/10/2026) | `?format` `?tier` `?search` → tệp danh sách khách hàng của tổ chức |
| POST | `/crm/customers` | `Q2` | |
| GET | `/crm/customers/:id` | `Q1` · `Q3` · `Q4` | |
| PATCH | `/crm/customers/:id` | `Q3` · `Q4` | |
| DELETE | `/crm/customers/:id` | `Q4` | Thay cho `POST /customers/:id/archive` của bản cũ |
| GET | `/crm/customers/:id/master-index` | `Q1` | Customer Master Index — SSOT một khách |
| POST | `/crm/customers/:id/occasions` | `Q6` | |
| GET | `/crm/customers/:id/orders` | `Q1` + `R1` | Đơn đã đặt của khách, mọi nguồn: đơn gắn khách hoặc đơn chưa gắn khách có SĐT người đặt trùng (Thẻ Chào, Điều phối); trong phạm vi chi nhánh; tối đa 50, mới nhất trước · khách tổ chức khác → 404 |
| POST | `/crm/customers/:id/consent` | `Q9` | Cơ sở đồng ý, có mốc thời gian |
| GET | `/crm/reminders/upcoming` | `Q7` | Quét dịp trước 14 ngày |
| POST | `/crm/customers/:id/data-requests/export` | `R13` | Khách yêu cầu xuất dữ liệu cá nhân (ADR-014 D-P5): gói JSON mọi bản ghi của khách, yêu cầu hoàn tất ngay · khách tổ chức khác → 404 · đặc tả 07 §55 |
| POST | `/crm/customers/:id/data-requests/erase` | `Q4` | Khách yêu cầu xoá: ẩn danh xuyên bảng ngay, giữ đơn / phiếu thu / hoá đơn VAT, thu hồi đồng ý nhận tin; `result` = số dòng theo bảng · khách tổ chức khác → 404 |
| POST | `/crm/customers/:id/data-requests/rectify` | `Q3` | Khách yêu cầu sửa: ghi nhận, hạn 72 giờ; sửa bằng `PATCH /crm/customers/:id` rồi đóng yêu cầu |
| GET | `/crm/data-requests` | `Q1` | `?status` `?customer_id` — mới nhất trước, tối đa 200; `overdue` = đang chờ và quá hạn |
| PATCH | `/crm/data-requests/:id` | `Q3` | Đóng yêu cầu đang chờ: `COMPLETED` hoặc `REJECTED` · tổ chức khác → 404 · đã đóng → 409 |

**Lệch nghĩa mã cần soát:** bản cũ gán `Q5` cho xuất danh sách và `Q6` cho dịp; mã thật gán `Q5` cho dịp và `Q6` cho đồng ý. Một trong hai sai — xem **RS-10**.

**Chưa có:** `GET /crm/customers/export` (`Q5`, mỗi lượt xuất ghi `audit_logs`), `/reminder-campaigns` (`Q7`), `/vouchers` (`Q8` — bảng `vouchers` đã có trong lược đồ, endpoint thì chưa). Xem **RS-7**.

Khi `POST /reminder-campaigns` được xây, nó phải từ chối (422) mọi khách hàng chưa có bản ghi đồng ý còn hiệu lực, và đáp ứng nói rõ bao nhiêu khách bị loại vì lý do đó. Lọc âm thầm sẽ để người vận hành tưởng chiến dịch đã chạm tới cả danh sách.

Nội dung nhắc mua sinh từ dịp và sản phẩm. Không endpoint nào gửi tên, số điện thoại hay địa chỉ khách hàng sang một nhà cung cấp AI; phần định danh ghép ở tầng gửi.

## 15. Đơn hàng và vận hành — M10

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/orders` | `R1` | Lọc theo ngày, trạng thái, chi nhánh, người được phân công · `?delivery_from=&delivery_to=` (YYYY-MM-DD, theo `delivery_window.date` hoặc giờ hẹn đơn Điều phối, giờ Việt Nam; ngày sai định dạng bị bỏ qua) · `?sale_id=` (Sale phụ trách, hoặc người tạo khi đơn chưa gán Sale) · `?limit=` 1–100, mặc định 50, ngoài khoảng/không phải số nguyên → 400 (audit API-03, 06/11/2026) · Phân trang con trỏ: `?cursor=` = `next_cursor` của trang trước (mờ; hỏng → 400), mới trước — phản hồi `{ data, next_cursor, meta: { total } }`, `total` đếm cả danh sách đang lọc (audit API-10, PO 09/11/2026; trước đó `{ orders, total }` chỉ trang đầu) |
| POST | `/orders` | `R2` | `customerId`, `branchId`, `items[].productId/variantId` của tổ chức khác → 404; đơn giá số nguyên ≥ 0, số lượng 1–999, `deliveryWindow.date` dạng `YYYY-MM-DD` (audit BL-13); dòng có `productId` với giá > 0 dưới giá sàn → 422 `BELOW_FLOOR` nếu người tạo không có `C10` (audit BL-07), vượt giá trần → 422 `ABOVE_CEILING` nếu không có `C9` (PO 07/11/2026, Q3); ngày giao trước hôm nay (giờ VN) hoặc SĐT người nhận không phải số Việt Nam → 400 (PO 07/11/2026, Q11–Q12); sản phẩm theo dõi tồn theo số lượng bị trừ tồn cùng giao dịch, không đủ → 409 (Q9) — huỷ đơn (`/orders/:id/cancel`, `/coordinator/orders/:id/cancel`) hoàn lại đúng một lần. Header `Idempotency-Key` (tuỳ chọn, ≤ 255 ký tự): gửi lại cùng khoá → trả đơn đã tạo, 201 + `Idempotent-Replayed: true`, không tạo đơn thứ hai (audit API-11, 07/11/2026); cùng khoá mà thân khác → 422 `IDEMPOTENCY_KEY_REUSED` (`details.order_id`), so bằng băm thân lưu ở `orders.idempotency_body_hash` (PO 11/11/2026; đơn cũ chưa có băm vẫn trả lại như trước) |
| GET · PATCH | `/orders/:id` | `R1` · `R3` | PATCH không đặt được `status` = `CONFIRMED`/`COMPLETED`/`CANCELLED` → 422 (audit BL-01): xác nhận đi qua thu tiền/duyệt giao trước, hoàn tất qua Điều phối, huỷ qua `POST /orders/:id/cancel` |
| POST | `/orders/:id/assign` | `R4` | Người nhận việc phải là thành viên đang hoạt động của tổ chức (khác → 422); giao lại thu hồi phân công cũ |
| GET | `/orders/my-work` | `R17` (`?scope=team`: `R4`) | Việc chế tác đang giao cho người đăng nhập, sắp theo giờ giao; công thức và ảnh mẫu, không có giá · `scope=team`: mọi việc trong phạm vi chi nhánh, kèm tên thợ |
| POST | `/orders/:id/my-work` | `R17` | `{ action: START \| FINISH }` — nhận việc / báo xong; việc không giao cho mình → 404; sai bước → 422 |
| GET | `/orders/:id/info-requests` | `R1` | Yêu cầu bổ sung thông tin của đơn; trước khi trả, đơn thiếu địa chỉ / SĐT người nhận / lời chúc (đơn có thiệp) tự sinh yêu cầu (hạn 2 giờ), đủ thông tin thì tự đóng `RECEIVED`, quá hạn → `OVERDUE` và nhắc người tạo (`ORDER_INFO_REQUEST_OVERDUE`) · cũng chạy sau `POST /orders`, `PATCH /orders/:id`, `POST /coordinator/orders` · tổ chức/chi nhánh khác → 404 |
| POST | `/orders/:id/info-requests` | `R3` | `{ field, label, reason, requestedFrom, dueAt?, channel? }` tạo yêu cầu tay; đơn đã kết thúc → 422 |
| POST | `/orders/:id/info-requests/:requestId` | `R3` | `{ outcome: RECEIVED \| CANCELLED, note? }` — huỷ bắt buộc lý do (400); yêu cầu đã đóng → 409 |
| GET | `/orders/info-requests` | `R1` | Mọi yêu cầu còn mở của tổ chức trong phạm vi chi nhánh, hạn gần nhất trước (việc "Thiếu thông tin" trong Hộp việc) |
| POST | `/orders/:id/cancel` | `R6` | Bắt buộc có lý do |
| GET | `/orders/:id/print` | `R7` | Phiếu đơn và phiếu sản xuất · trả thêm `florist[]` (mẫu, số lượng, phiên bản và số cành, công thức, ảnh mẫu — không giá) cho phiếu xưởng A6 `/in-phieu/:id` (checklist ALG 4.9) |
| GET | `/orders/:id/events` | `R1` | Nhật ký đổi trạng thái, nguồn đo SLA |

**Chưa có:** `POST /orders/:id/delivery` (`R5` — cập nhật khung giờ và trạng thái giao). Trạng thái giao hiện đổi qua `PATCH /orders/:id`. Xem **RS-7**.

`POST /orders/:id/cancel` gác `R6` **ở tầng use-case** (`cancel-order.ts:20`), không ở route — đúng luật nhưng khác lối viết của phần còn lại, xem **RS-9**.

Ba trục trạng thái tách rời — đơn, sản xuất, giao hàng — và không gộp thành một enum, cùng lý do với ba trục của job ở mục 7. Mỗi lượt đổi sinh một bản ghi `order_events`; SLA đo từ bản ghi đó, không nhập tay.

Giá trên đơn đọc từ engine giá. `POST /orders` từ chối một giá không truy được về quy tắc giá đang hiệu lực, trừ khi người gọi có đúng năng lực đè giá của nhóm `C`.

## 15b. Điều phối đơn hàng — Chức năng 12 (Control Tower)

Mọi route nhận `:id` là id HOẶC mã đơn (`FLR-YYMMDD-NNNN`); tổ chức khác → 404. Body sai → 400 `VALIDATION_FAILED`; luật nghiệp vụ không đạt → 422; chuyển bước sai luồng hoặc bị người khác cập nhật trước → 409. Mọi thao tác ghi `order_events` (trục đổi giá trị) và `audit_logs` trong cùng giao dịch. Hợp đồng zod + JSON Schema: `src/modules/coordinator/contracts/`, `docs/dac-ta/schemas/coordinator/`.

| Phương thức | Đường dẫn | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/coordinator/orders` | `R1` | `?stage=` `?limit=` (≤200). Rủi ro trễ tính lại lúc đọc (F09/F12) |
| POST | `/coordinator/orders` | `R2` | Mã đơn do máy chủ cấp `FLR-YYMMDD-NNNN`, tuần tự theo ngày Việt Nam; chuyển khoản ghi mã này (kể cả bỏ gạch) được tự khớp như mã `DH…`. `source` theo danh mục nguồn chung (`MANUAL · CHAT · CATALOG · LANDING · SHORT_LINK · CHANNEL · NETWORK · QUOTATION`, mặc định `MANUAL`), ghi cùng mã vào `orders.source`; mã cũ `ORDER_M10 · CHAT_M08 · CATALOG_M06` → 400. Đơn vào thẳng Điều phối (PO 07/11/2026, Q2); `sampleImageUrl` cấm `data:` — ảnh tải lên dùng `sampleAssetId` |
| GET | `/coordinator/orders/:id` | `R1` | |
| PATCH | `/coordinator/orders/:id/stage` | `R3` | Kiểm luồng + bằng chứng (đối tác / QC đạt / POD / hết sự cố); `→ COMPLETED` cần đã thu đủ như `/close` (audit BL-02) |
| PATCH | `/coordinator/orders/:id/custom-fields` | `R3` | ĐP-3.16 — sửa giá trị trường tự tạo (entity ORDER); trộn vào giá trị cũ, không thay nguyên khối |
| GET | `/coordinator/orders/:id/payments` | `R1` | ĐP-4a (PO D2) — sổ thu của một đơn |
| POST | `/coordinator/orders/:id/payments` | `R9`/`R10` | ĐP-4a (PO D2) — ghi một dòng sổ thu. `kind=DEPOSIT`/`BALANCE` đòi `R9`; `kind=REFUND` đòi `R10` (trần cứng điều hành). Người có `R11` ghi thì `orders.paid_vnd`/`balance_vnd` cập nhật cùng giao dịch; người không có `R11` ghi thì dòng ở trạng thái `PENDING`, chưa cộng vào số đã thu (checklist ALG 1.16). Chung luật `planPayment`/`planRefund` với sổ đơn: thu vượt phần còn phải thu, thu vào đơn đã huỷ, hoàn quá số đã thu → 422; `paid_vnd` đổi giữa lúc đọc và ghi → 409 (audit BL-05) |
| POST | `/coordinator/orders/:id/payments/:paymentId/decision` | `R11` | Checklist ALG 1.16 — Điều hành xác nhận (`approve: true`, cộng vào số đã thu) hoặc từ chối (`approve: false`, bắt buộc `note`) dòng sổ thu `PENDING`. Người tạo dòng không tự duyệt khi công tắc tự duyệt tắt |
| POST | `/coordinator/orders/:id/assign-partner` | `R4` | Đối tác cùng tổ chức, đang hoạt động, chưa vượt `capacity_daily` (trừ `overrideCapacity`) |
| POST | `/coordinator/orders/:id/production` | `R3` | `MARK_READY` bắt buộc ảnh thành phẩm (`assets` cùng tổ chức); `REPORT_MATERIAL_ISSUE` mở sự cố |
| POST | `/coordinator/orders/:id/qc` | `R3` | Người kiểm kết luận; không đạt bắt buộc lý do; `REJECTED` mở sự cố `QC_FAILURE` |
| POST | `/coordinator/orders/:id/delivery` | `R5` | Sự kiện giao; thành công bắt buộc ảnh POD hoặc tên người ký; thất bại mở sự cố |
| GET | `/delivery/my-runs` | `R18` | Đơn đang giao có số điện thoại shipper trùng số của người đăng nhập (cùng tổ chức, cùng phạm vi chi nhánh): người nhận, SĐT, địa chỉ, khung giờ, lời thiệp — không giá, không ghi chú nội bộ, không người đặt · `phoneMissing: true` khi tài khoản chưa có số |
| POST | `/delivery/my-runs/:id` | `R18` | `{ event, podAssetId?, recipientSignedName?, failureReason? }` — cùng luật giao của Điều phối (ảnh giao bắt buộc theo Cài đặt); đơn không giao cho mình → 404 |
| GET | `/coordinator/reminders` | `R1` | Mốc nhắc việc Điều phối đang bật của các đơn |
| POST | `/coordinator/reminders/acknowledge` | `R3` | `{ orderId, milestone, action, snoozeMinutes?, note? }`; đơn của tổ chức khác → 404 |
| GET · PUT | `/coordinator/settings/reminders` | `D1` (đọc) · `R12` (sửa) | Thời điểm nhắc việc cấp tổ chức (phút, 0–1440) (14/10/2026: sửa đòi `R12`) |
| GET · PUT | `/coordinator/templates/:id/reminders` | `R1` (đọc) · `R12` (sửa) | Ghi đè thời điểm nhắc theo mẫu hoa; mẫu của tổ chức khác → 404 |
| GET | `/orders/entry-actions` | `R1` | Đơn hàng đa nguồn §3.2 — nút Đặt hàng / Liên hệ trên trang khách: `{ settings, sources: [{ code, label, effective }] }` |
| PUT | `/orders/entry-actions` | `F2` | `{ default?: { order?, contact? }, bySource?: { [nguồn]: { order?, contact? } } }` — mỗi nguồn còn ít nhất một nút (422); ghi `audit_logs` `orders.entry_actions_updated` |
| GET | `/orders/lead-queue` | `Q1` | Đơn hàng đa nguồn §3.4 — hàng đợi "Khách tiềm năng": lead đang mở + phiên Thẻ chào chưa đặt (chỉ đọc), xếp quá hạn gọi lại → nóng → mới; phạm vi sale theo cài đặt "chỉ khách của mình" |
| POST | `/orders/:id/quote` | `R15` | Đơn hàng đa nguồn P3 — Sale báo giá đơn **ngoài Thẻ chào** (Thẻ chào giữ `R11`): `{ totalVnd, note? }`; chỉ đơn nháp chưa thu; đơn Thẻ chào/tổ chức khác → 404 · Giá dưới sàn → 422 `BELOW_FLOOR` (trừ `C10`); vượt trần → 422 `ABOVE_CEILING` (trừ `C9`, PO 07/11/2026) — trần chỉ so khi mọi dòng là sản phẩm có giá vốn |
| GET · PUT | `/orders/:id/vat` | `R1` · `R15` | PO 07/11/2026 (Q10) — VAT đơn **ngoài Thẻ chào** khi khách cần hoá đơn: PUT `{ enabled, rate: 8\|10, company_name?, tax_code?, company_address?, email? }`; máy chủ tính lại `total_vnd`/`balance_vnd` (giá trước thuế giữ nguyên), lưu bên mua vào `order_recipients`, audit `order.vat`. Chưa báo giá / đã huỷ / hoàn tất / tổng mới < đã thu → 409; đơn Thẻ chào hoặc tổ chức/chi nhánh khác → 404 |
| POST | `/orders/:id/deliver-before-pay` | `R2` | §5 — Sale xin "giao trước, thu sau" `{ reason }`: trong chính sách thu tiền của tiệm (COD/thu sau) · đơn hoả tốc · trong hạn mức tự quyết → `AUTO_APPROVED`, đơn sang Điều phối (`order_coordinations` INTAKE, `workflow = STANDARD`); ngoài → `PENDING` chờ Điều hành. Khách nợ quá hạn hoặc vượt `customerDebtCapVnd` → luôn `PENDING`, kể cả trong chính sách / hoả tốc (PO 07/11/2026, Q7). 201 `{ request, message }`; đã có yêu cầu mở → 409 |
| POST | `/orders/:id/payments` | `R11` (trần cứng Điều hành) | P3b — xác nhận tiền đơn **ngoài Thẻ chào** `{ amountVnd, method: BANK_TRANSFER\|CASH\|CARD\|E_WALLET\|COD, reference?, note? }`; lần thu đầu → `CONFIRMED` + sang Điều phối; vượt phần còn phải thu → 422; ghi đồng thời → 409; đơn Thẻ chào/tổ chức khác → 404. Chuyển khoản SePay còn "chưa khớp" sau bộ khớp Thẻ chào được bộ quét tự khớp theo mã `DH<yymmdd>-<4 số>` |
| GET | `/orders/workbench` | `R1` | P4 — đơn **ngoài Thẻ chào** cần xử lý (chưa vào Điều phối hoặc còn phải thu), ≤ 100: `stage` NEEDS_QUOTE · AWAITING_PAYMENT · AWAITING_APPROVAL · IN_COORDINATION · DELIVERED_UNPAID, yêu cầu giao trước mới nhất, `collectOverdue`; phạm vi sale theo "chỉ khách của mình" |
| GET | `/orders/coordination-queue` | `R1` | P4 — đơn **ngoài Thẻ chào** đang điều phối (chưa xong/huỷ), ≤ 100, việc gấp trước: bước (nhãn tiếng Việt), rủi ro, việc tiếp, ngày giao, còn nợ |
| GET | `/orders/approval-requests` | `R1` | `?status=PENDING\|APPROVED\|REJECTED\|AUTO_APPROVED&limit≤100` — yêu cầu duyệt theo đơn kèm số tiền đơn |
| POST | `/orders/approval-requests/:requestId/decision` | `R16` (trần cứng Điều hành) | `{ approve, note?, collectDueAt? }` — từ chối phải có lý do; duyệt → đơn sang Điều phối; `collectDueAt` ở quá khứ → 400 (audit BL-15); đã xử lý → 409; tổ chức khác → 404 |
| GET | `/orders/deliver-before-pay-settings` | `R1` | Hạn mức Sale tự quyết `{ allowSelfDecide, selfDecideMaxVnd, minCompletedOrders, collectDueDays, customerDebtCapVnd }` (mặc định bật · 1.000.000đ · 2 đơn · 3 ngày · không giới hạn công nợ) |
| PUT | `/orders/deliver-before-pay-settings` | `F2` | Sửa hạn mức trên; ghi `audit_logs` `orders.deliver_before_pay_settings_updated` |
| GET | `/orders/export` | `R13` (chỉ Điều hành; người khác cần Điều hành cấp quyền — PO 14/10/2026) | `?from_date` `?to_date` `?source=BROCHURE\|MANUAL\|CHAT` → tệp Excel đơn hàng của tổ chức |
| POST | `/coordinator/orders/:id/exceptions` | `R3` | Đưa đơn về `EXCEPTION`, nhớ bước cũ |
| POST | `/coordinator/exceptions/:id/resolve` | `R3` | Hết sự cố mở → đơn tự về bước cũ |
| POST | `/coordinator/orders/:id/close` | `R3` | Chỉ khi `DELIVERED` và không còn sự cố; chốt điểm + tiền công đối tác |
| POST | `/coordinator/orders/:id/cancel` | `R6` | Trần cứng điều hành; bắt buộc lý do; không huỷ đơn đã giao |
| GET | `/coordinator/partners` | `R1` · `F1` | `?active=1`: đối tác gia công (`R1`); không tham số: đối tác chuỗi (`F1`) |
| POST | `/coordinator/partners` | `R4` · `F2` | Đối tác gia công (`R4`): trùng mã trong tổ chức → 409. Cấp tài khoản đối tác chuỗi (thân có `partnerStoreName`/`contactEmail`, `F2`): không gửi `password` → sinh mật khẩu ngẫu nhiên, trả `temporaryPassword` đúng một lần (email đã có tài khoản thì giữ mật khẩu cũ, không trả); `password` gửi lên tối thiểu 10 ký tự |
| POST | `/coordinator/partners/link-existing` | `F2` | Chuỗi **mời** cửa hàng đã có tài khoản liên kết làm đối tác: tạo liên kết `PENDING` (không mở khoá gì) và báo cửa hàng (`CHAIN_LINK_INVITED`); cửa hàng đồng ý trong 7 ngày mới thành `ACTIVE` (UJ-10). Chỉ tổ chức loại Chuỗi (khác → 409); khớp **chính xác** slug hoặc email chủ tiệm; không tìm thấy hoặc tự mời → 404 cùng một câu; đang hợp tác/tạm ngưng → 409; lời mời cũ hoặc đã chấm dứt → gửi lời mời mới (cùng dòng, ADR-012 T-3b); trùng mã đối tác với cửa hàng khác → 409; phản hồi không chứa SĐT/email của tổ chức kia; không tự mở phòng chat (UJ-01) |
| PATCH | `/coordinator/partners/:id` | `R4` | Sửa hồ sơ, tạm ngưng/mở lại |
| GET | `/field-config` | `R1` | ĐP-3 — cấu hình trường hiệu lực cho tổ chức của người gọi (lớp mã + cấu hình nền tảng + ghi đè theo tổ chức + trường riêng của tổ chức), `?entity=ORDER\|PARTNER` |
| POST | `/field-config` | `D18` | Checklist ALG 1.9 — cửa hàng tạo trường riêng `{ entity, label, dataType, requirement?, visibility?, placeholder? }` (không gồm kiểu chọn từ danh mục); khoá máy sinh `cf_…`; tối đa 50 trường/thực thể/tổ chức. 201 |
| PUT | `/field-config` | `D18` | `{ key, label?, isEnabled?, requirement?, visibility? }` — trường riêng: sửa trực tiếp; trường nền tảng: ghi đè của chính tổ chức, không hạ mức yêu cầu, không ẩn trường bắt buộc, không mở trường chỉ nội bộ (400). Trường riêng của tổ chức khác → 404 |
| GET | `/field-config/settings` | `D18` | Danh sách cho màn Cài đặt → Trường dữ liệu: trường nền tảng kèm mức sàn (`floorRequirement`, `canHide`) và trường riêng (gồm trường đang ẩn), `?entity=ORDER\|PARTNER` |
| GET | `/custom-domains` | `D19` | Checklist ALG 10.8 — tên miền riêng của tổ chức người gọi: `hostname`, `status` (`PENDING`·`VERIFIED`·`LOCKED`), `statusText`, `certificateStatus`, `lastCheckedAt`, `lockedReason`, `records` (bản ghi TXT `_smeos-verify.<tên miền>` = `smeos-verify=<mã>` và CNAME về máy chủ hệ thống) |
| POST | `/custom-domains` | `D19` | `{ hostname }` — chuẩn hoá (chữ thường, punycode); từ chối IP, tên miền một nhãn, tên miền của hệ thống (400); tối đa 3 tên miền/tổ chức, tên miền đã có người gắn (409, không nêu tổ chức). 201, trạng thái chờ xác minh |
| POST | `/custom-domains/:id/verify` | `D19` | Kiểm bản ghi TXT (giới hạn 20 lần/phút/tổ chức). Đúng → `VERIFIED`, gửi Render gắn tên miền và cấp chứng chỉ HTTPS (`certificateStatus` `REQUESTED`; chưa cấu hình khoá Render → `MANUAL`); chưa đúng → `verified: false`. Tên miền đang khoá → 409; của tổ chức khác → 404 |
| DELETE | `/custom-domains/:id` | `D19` | Gỡ tên miền (gỡ khỏi Render nếu đã xác minh), ngừng phục vụ ngay. Đang khoá → 409; của tổ chức khác → 404 |
| GET | `/field-config/catalogs` | `R1` | ĐP-4a.1 — danh mục (§2.15) cho form nhập liệu tenant (T01…), `?keys=priority,serviceLevel,...` (bỏ trống trả hết). CHỈ giá trị đang `is_active`. Khác `/platform/catalogs` (đòi `N12`): route này chỉ đòi `R1` của tổ chức (gác từ 11/11/2026, trước đó chỉ kiểm phiên), không có thao tác ghi |

## 16. Số liệu và hồ sơ phong cách — M11

> **CHƯA XÂY (soát 18/09).** Không endpoint nào trong mục này tồn tại trong mã, và bảng `learning_profiles` cũng chưa có trong lược đồ. Dải năng lực `S1`–`S4` chưa vào danh mục. `src/lib/mock-data.ts` ghi `analytics-learning: chua_san_sang`, khớp với thực tế. Xem **RS-7**.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/analytics/content` | **CHƯA XÂY** `S1` | Reach, engagement, bài hiệu quả nhất |
| GET | `/analytics/products` | **CHƯA XÂY** `S1` | Sản phẩm bán tốt, nối từ `orders` |
| GET | `/analytics/campaigns` | **CHƯA XÂY** `S1` | Hiệu quả và ROI từng chiến dịch |
| GET | `/analytics/export` | **CHƯA XÂY** `S2` | |
| GET | `/learning-profile` | **CHƯA XÂY** `S3` | Hồ sơ phong cách kèm căn cứ |
| PUT | `/learning-profile` | **CHƯA XÂY** `S4` | Đè tham số; ghi `audit_logs` |

Mỗi chỉ số trả kèm `nguon` và `den_ngay`. Dữ liệu kế thừa từ trước khi tài khoản nền tảng được gán cho tổ chức trả trong một khối riêng, không cộng vào khối của tổ chức.

`GET /learning-profile` trả mỗi kết luận kèm số bản ghi đã dùng để rút ra nó. Hồ sơ chưa đạt ngưỡng dữ liệu tối thiểu trả `du_lieu_du: false` và không được dùng để đổi tham số soạn nội dung.

## 17. Hội thoại — M08

> **Đổi tiền tố 18/09.** Đặc tả cũ dùng `/conversations`; route thật nằm dưới **`/chat/`**. Bảng dưới đã sửa theo mã.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/chat/conversations` | `T1` · `T2` | `limit` 1–100, mặc định 50; sai → 400 |
| POST | `/chat/conversations` | `T2` | |
| GET | `/chat/conversations/:id/messages` | `T1` · `T2` | Thay cho `GET /conversations/:id` của bản cũ |
| POST | `/chat/conversations/:id/messages` | `T2` | |
| POST | `/chat/conversations/:id/create-order` | `T3` | Chuyển hội thoại thành đơn nháp — M10 |
| GET · POST | `/chat/channels` | GET: **chưa gác** — xem **RS-8** · POST: `T4` (kiểm ở use-case) | Cấu hình kênh. GET (danh sách kênh, khoá bí mật đã che) chưa gác mã năng lực; POST gọi `configure-chat-channel.ts`, use-case gác `T4` |
| POST | `/chat/public/widget` | — *(công khai)* | Khung chat AI trên trang công khai do công cụ SMEOS tạo. Thân: `slug`, `surface` (`catalog` · `landing_page` · `store_profile` · `sales_link` · `greeting_catalog` · `business_card`; `landing_page` tính kênh `LANDING_PAGE`, còn lại `STOREFRONT_CATALOG`), `visitorId`, `message`. Trang bị tắt trong `config.publicSurfaces` → 404 (chủ tiệm bật/tắt từng loại trang qua `POST /chat/channels` → `config.publicSurfaces`, màn Kênh tích hợp; trang bị tắt không vẽ khung chat — `PublicChatSlot`). Giới hạn mặc định 20 tin/khách và 60 tin/IP mỗi 10 phút, tách theo tiệm; nâng chỉ khi nền tảng duyệt (`config.publicChatLimits.approvedAt`, trần 200/600) → 429. Chỉ cùng nguồn gốc — chưa mở CORS cho website ngoài; lỗi 500 không trả chi tiết nội bộ |
| GET · POST | `/chat/public-limits` | POST: `T4` | Hạn mức chat AI trên trang công khai của tiệm phiên. GET: mức đang áp dụng (`current`) và yêu cầu chờ duyệt (`pending`). POST `{ perVisitor, perIp, note? }`: xin nâng — chỉ nhận mức chọn sẵn (50/150, 100/300, 200/600) và cao hơn mức hiện tại (400); đang có yêu cầu chờ → 409. Lưu ở `organizations.settings.pending_public_chat_limits`; Admin nền tảng duyệt qua `PATCH /platform/organizations/:id` |
| GET · POST | `/chat/webhooks/facebook` | — *(chữ ký nền tảng)* | |
| POST | `/chat/webhooks/zalo` | — *(chữ ký nền tảng)* | |

**Chưa có:** `POST /chat/conversations/:id/handoff` (`T4` — chuyển cho người thật) và `GET · PUT /chat/conversations/settings` (`T1`/`T3`). Xem **RS-7**.

Tin do trợ lý tự trả lời mang cờ `tu_dong: true` trong chính bản ghi tin nhắn, không chỉ trong nhật ký. Câu trả lời về giá đọc từ engine giá; đáp ứng mang `nguon_gia` trỏ về quy tắc giá đã dùng.

## 18. Chính sách AI, sổ chi phí và điểm chấm

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/ai-policy` | `U1` | Năng lực đang bật, mô hình đang dùng, ngưỡng, mức quyền riêng tư |
| PUT | `/ai-policy` | `U2` | Trần mà bộ định tuyến được chọn trong đó; ghi `audit_logs` |
| GET | `/ai-capabilities` | `U1` | Danh mục năng lực kèm trạng thái đo lường của từng mô hình |
| GET | `/ai-requests` | `U3` | Sổ chi phí và chất lượng từng lời gọi, lọc theo năng lực và khoảng thời gian |
| GET | `/ai-requests/summary` | `U3` | Tổng hợp theo năng lực và theo mô hình: chi phí, độ trễ, điểm, tỷ lệ phải leo thác |
| GET | `/ai-evaluations/:entity_type/:entity_id` | **CHƯA XÂY** `U4` | Điểm chấm của một đầu ra và lý do nó vào hàng chờ soát. Bảng `ai_evaluations` đã có; endpoint thì chưa |
| GET · POST | `/ai-requests/review` | `U3` | Hàng chờ soát đầu ra AI — **có trong mã, thiếu trong bản đặc tả cũ**. GET `limit` 1–5.000, mặc định 100; sai → 400 |

```http
PUT /api/v1/ai-policy
{
  "capabilities": {
    "product_vision":   { "engine": "local_cv", "privacy_floor": "shop" },
    "content_generation": { "quality": "cao", "cost_ceiling_credit": 2 }
  }
}
```

`PUT` là **trần, không phải lệnh chọn**: nó khai phạm vi mà bộ định tuyến được chọn trong đó. Mô hình chưa đo trên bộ ảnh vàng chỉ vào được phạm vi này khi người gọi nêu tên nó tường minh — bộ định tuyến không tự lấy. Tên năng lực hoặc tên mô hình ngoài sổ đăng ký trả 400; mô hình thiếu một trong bốn ô giấy phép trả 422 kèm tên ô còn trống.

Năng lực phân tích ảnh giữ endpoint riêng đã có (`GET · PUT /vision/engine`, `H1`/`H4`) vì nó có màn hình riêng và luật riêng về việc bày ba bộ máy kèm trạng thái đo lường. Hai đường không được lệch nhau: cả hai ghi cùng một chỗ trong cấu hình tổ chức, và `PUT /ai-policy` từ chối (409) khi thân yêu cầu đổi `product_vision` mà người gọi không có `H4`.

`GET /ai-requests` phân trang con trỏ, trần 5.000 hàng mỗi lượt. Nó không bao giờ trả nội dung prompt hay đầu ra — chỉ số đo. Prompt của một lượt sinh nằm ở metadata của asset, gác bằng năng lực đọc asset.

## 19. Video — M04c

> **Bổ sung 18/09.** M04c dựng xong ở P17 nhưng chưa từng có mục nào trong đặc tả này.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET · POST | `/video/jobs` | `I1` | Tạo và liệt kê job video |
| GET | `/video/jobs/:id` | `I1` | Kèm `final_video_view_url` — URL ký có hạn để phát video đã render (24/09/2026); `final_video_url` thô không mở được vì thiếu chữ ký |
| PATCH | `/video/jobs/:id/storyboard` | `I1` | Biên soạn phân cảnh, 2–15 cảnh |
| POST | `/video/jobs/:id/render` | `I1` | Thân tuỳ chọn (24/09/2026) 24/09/2026 — `{ scene_images?: [{ scene_index, asset_id }] }` lấp cảnh còn trống ảnh (chỉ asset của đúng tổ chức); không gửi thì máy chủ tự lấp bằng ảnh Khu vực D mới nhất cùng số cảnh / Master của sản phẩm. Vẫn trống → 422. Thêm 25/09/2026 (PO: nhà cung cấp trước): `video_provider?: veo\|kling\|runway\|luma\|local_cinematic` — bên chọn cho lượt đứng đầu, sau đó thứ tự tiệm (`creative_providers.video`) rồi mặc định; payload job mang `provider_order`; thu `video.render` + giá clip/cảnh của bên đứng đầu; worker sinh clip từng cảnh qua nhà cung cấp, ghép phụ đề/âm thanh ở FloraOS; mọi bên lỗi → Ken Burns cục bộ + ghi `provider_fallback_reason`, đọc job thì hoàn phần clip. `local_cinematic` = chỉ ghép cục bộ, không thứ tự nhà cung cấp |
| POST | `/video/jobs/:id/approve-script` | `P3` | Cổng 1 — duyệt kịch bản (kiểm ở use-case `approve-storyboard.ts`) |
| POST | `/video/jobs/:id/approve-video` | `P4` | Cổng 2 — duyệt video thành phẩm, trần cứng (kiểm ở use-case `approve-video-output.ts`) |

**Chưa có:** `GET /video/jobs/:id/events`. TRANG_THAI mục P17 mô tả một luồng SSE ở đường này, nhưng thư mục `src/app/api/v1/video/jobs/[id]/` chỉ có `route.ts`, `storyboard`, `render`, `approve-script`, `approve-video` — **không có `events`**. Tiến trình render hiện đọc bằng cách nào thì chưa rõ; cần soát lại trước khi ghi vào đặc tả. Xem **RS-7**.

**Soát lại 23/09/2026:** hai cổng duyệt video KHÔNG còn dùng chung `I2` — `P3` (`video.approve_script`) và `P4` (`video.approve_final`, trần cứng) đã có trong `capability-catalog.ts` và được kiểm ở use-case (route không lặp lại phép kiểm, RS-9). Mỗi cảnh của storyboard nay mang `motionEffect` tuỳ chọn (`ZOOM_IN | ZOOM_OUT | PAN_UP | PAN_RIGHT | STATIC`), lưu ở `video_scenes.motion_effect` và chuyển vào payload render; vắng thì worker tự xoay vòng như trước.

Khuôn video là enum `video_format`: `REEL_15S` · `TIKTOK_30S` · `STORY_15S` · `SLIDESHOW` · `PRODUCT_PAGE` · `AD_MOTION`. Trạng thái là enum `video_stage` chín giá trị, xem đặc tả 07.

## 20. Hạ tầng và nội bộ

> **Bổ sung 18/09.** Các nhóm route này có trong mã từ lâu nhưng chưa từng có mục trong đặc tả.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| POST | `/sso/refresh` | — | Làm mới JWT `smeos_sso` (cookie + thân `{ sso_token, expires_at }`) cho Unified Shell |
| GET · POST · PUT · PATCH · DELETE | `/proxy/:path` | *(phiên)* | Chuyển tiếp sang engine ngoài trong Unified Shell. Luôn đòi phiên của tổ chức (09/11/2026, audit API §33); lệnh ghi `api/accounts` của SocialFlow đòi thêm `J5`; lỗi mạng → 500 thông báo chung |
| GET · PUT | `/storage/:key` | — *(chữ ký URL)* | Đích của URL ký sẵn; `verifyStorageSignature` gác, hết hạn 15 phút |
| GET | `/integration-tokens` | `F9` | Cấp token cho engine ngoài |
| POST | `/integration-tokens` | `F9` | |
| POST | `/integration-tokens/:id/rotate` | `F9` | Token mới giữ thời hạn (số ngày) của token đang xoay — trước 11/11/2026 luôn ra 90 ngày |
| DELETE | `/integration-tokens/:id` | `F9` | |
| GET | `/template-overrides` | `F1` · `F2` | Hệ thống template SSOT |
| PUT | `/template-overrides` | `F2` | |
| DELETE | `/template-overrides/:templateKey/:fieldKey` | `F2` | |
| GET | `/occasions` | `F1` · `F2` | Sổ dịp dùng chung |
| POST | `/occasions` | `F2` | |
| PATCH | `/occasions/:id` | `F2` | |
| POST | `/content-guard/validate` | — | Từ điển từ cấm ngành hoa |
| POST | `/organizations/current/upgrade-request` | `F2` | Xin nâng hạng workspace |
| GET · PUT | `/organizations/current/governance-matrix` | `F1` · `F2` | Query `system` = ma trận quản trị theo tầng (`PROMOTIONS`, `COMMITMENTS`, `POLICIES`, `PAYMENTS`, `CRAFT_FEES`, `TEMPLATES`). GET → `{ tier, own, upper[] }` (khoá của Mẹ và chuỗi mà tổ chức là đối tác ACTIVE). PUT `{ decisions: { overrides: {key: bool}, locks: {key: {enabled}} } }` ghi `organizations.settings.governance_matrix.<system>`; ghi đè mục tầng trên đã khoá hoặc cửa hàng tự đặt khoá → 422. Ghi audit_logs (28/10/2026) |
| GET | `/products/master-index` | `L1` | Product Master Index — toàn tổ chức |
| GET | `/products/:id/master-index` | `L1` | Một sản phẩm |
| GET | `/assets` | `G1` | Liệt kê asset, lọc theo sản phẩm và `kind` |
| POST | `/assets/:id/approve` | `I2` | Duyệt asset dẫn xuất |
| GET | `/media/optimizations` | `I2` | Hàng chờ duyệt ảnh đã tối ưu M04a — chỉ người duyệt (PO 07/11/2026, audit API-12) |
| POST | `/jobs/batch` | mã "run" theo `module` (`MODULE_RUN_CAPABILITY`, mặc định từ chối — RS-8) | Tạo job cho một module với danh sách mã `AIC` chọn sẵn. Sửa dòng này 05/10/2026: route đã gác từ RS-8 18/09, đặc tả ghi "chưa gác" là cũ · Thân kiểm bằng zod (`capabilities` 1–50 mã); `Idempotency-Key` **bắt buộc** — thiếu → 400, máy chủ không tự sinh khoá (audit API-05, 06/11/2026) · Trả **202** `{ job_id, status, usage }` — job đã nhận, worker chạy sau (audit API-16, PO 09/11/2026; trước đó 200) |
| POST | `/media/variants/batch` | `I4` | |
| POST | `/media/background-removal` | — | **ĐÃ ĐÓNG ở P24**, luôn trả 409 kèm đường thay thế |
| GET | `/ai-capabilities` | `U1` | |

## 21. Console Vận hành Nền tảng (P25a)

**OpenAPI (07/11/2026, PO chọn).** Bản máy đọc được của mọi route `/platform/*` (70 operation): `docs/spec/contracts/openapi/platform.openapi.json` (OpenAPI 3.1, tệp sinh ra — `npm run gen:openapi`; nội bộ, không công bố). Nguồn ở `src/app/api/v1/platform/_contracts/`: route dùng chung lược đồ thân ở `requests.ts`; phản hồi khai `strictObject` và được kiểm trên CSDL thật (`tests/platform/platform-contract-*.test.ts`); `x-capability` của từng operation phải khớp cột năng lực bảng dưới (`tests/unit/platform/platform-openapi.test.ts`).

Năm route dưới đây thuộc console vận hành nền tảng (`docs/kien-truc/KE_HOACH_CONSOLE_VAN_HANH.md`), dùng cho người vận hành FloraOS chứ không phải thành viên một tổ chức. Đây là **ngoại lệ có chủ đích, có gác quyền** với Luật 2 ở mục 1 ("không endpoint nào trả dữ liệu xuyên tổ chức") — năm route này CỐ Ý trả dữ liệu của nhiều/mọi tổ chức cùng lúc.

Khác biệt với mọi route còn lại trong tài liệu này:
- Ngữ cảnh gác không phải `TenantContext` mà là `PlatformContext` (`requirePlatformContext`, `src/modules/platform/use-cases/resolve-platform-session.ts`) — giải từ bảng `platform_operators`, độc lập với `sessions.organization_id`.
- Mã năng lực gác là dải `N1`–`N8` (đặc tả 02 mục "Vận hành nền tảng — dải N"), TÁCH HẲN khỏi `capability_scope`/`SYSTEM_ROLES` của tenant (D-N6, chốt 19/09) — không xuất hiện trong `role_capabilities`/`capability_overrides`.
- Truy vấn xuyên tổ chức chỉ đi qua `src/modules/platform/infra/platform-query.ts` — điểm DUY NHẤT trong repo được phép truy vấn nhiều tổ chức cùng lúc (kế hoạch mục 4.4).
- Chưa đăng nhập → 401 `UNAUTHENTICATED`. Đã đăng nhập nhưng không có dòng `platform_operators` đang hoạt động, hoặc thiếu đúng mã N ở cột dưới → 403 `CAPABILITY_DENIED` — giống hệt một thành viên tổ chức thiếu năng lực, không phải "chưa xác thực".

P25a chỉ đọc (D-N5 áp dụng cho toàn bộ P25a, không riêng `/health`): không route nào trong nhóm này ghi dữ liệu. Ngoại lệ có mã riêng: `POST /platform/jobs/:id/action` (`N15`, E5.2) — `N5` vẫn chỉ đọc. Duyệt yêu cầu nâng cấp, nạp/hoàn credit, tạo tổ chức (`N2`, `N3`, `N7`) thuộc P25b/P25c, chưa có ở bản này.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/platform/organizations` | `N1` | Danh sách mọi tổ chức — tên, slug, loại, số dư credit, số thành viên |
| GET | `/platform/registrations` | `N13` | Tài khoản tự đăng ký đang chờ duyệt (cũ trước) — email, tên, tổ chức, đăng ký thường hay dùng thử, SĐT lead |
| POST | `/platform/registrations/:userId/decision` | `N13` | `{ decision: "APPROVE" \| "REJECT" }`. Chỉ quyết được tài khoản `PENDING` (đã quyết → 409, không có → 404). Duyệt dùng thử trả `temporaryPassword` đúng một lần, không lưu, không ghi nhật ký. Ghi `platform_audit_logs` (`platform.registration.approve`/`reject`) |
| POST | `/platform/tier-preview` | `N1` | `{ roleKey }` — xem trước tầng/vai (SaaS Mother, SaaS Ngành, ChainOS, StoreOS). Đặt cookie `smeos_tier_preview` (HttpOnly); chỉ đổi khuôn trải nghiệm, không đổi tổ chức hay quyền. Vai không có/đang phát triển → 400. Trả `entryHref` |
| DELETE | `/platform/tier-preview` | người vận hành | Xoá xem trước, về vai thật |
| GET | `/platform/organizations/:id` | `N1` | Chi tiết một tổ chức bất kỳ — không lọc theo tổ chức của người gọi |
| GET | `/platform/usage` | `N4` | Usage & chi phí gộp theo (tổ chức, tính năng), toàn hệ thống |
| GET | `/platform/health` | `N5` | Đếm job theo trạng thái + danh sách job treo (chỉ đọc — không đánh dấu FAILED, xem `scripts/scan-stuck-jobs.ts`) |
| GET | `/platform/jobs/failed` | `N5` | Hàng đợi lỗi (E5.2): tối đa 100 job `FAILED` mới nhất xuyên tổ chức — tổ chức, loại việc, `failureKind`, lỗi (cắt 300 ký tự), số lần thử. Không trả `payload`/`output` |
| POST | `/platform/jobs/:id/action` | `N15` | `{ action: "RETRY" \| "DISMISS" }`. RETRY: `FAILED` → `PENDING` lượt mới (`attempts` 0), đánh thức worker, nền tảng chịu chi phí (không trừ credit tiệm). DISMISS: → `CANCELLED`. Job không còn `FAILED` → 404. Ghi `platform_audit_logs` (`platform.job.retry`/`dismiss`) |
| GET | `/platform/marketplace/stores` | `N1` | Chợ đối tác (PO 31/10/2026): mọi hồ sơ khảo sát cửa hàng trong `partner_marketplace_stores`; query `search` (≤200), `field` (chỉ các trường trong `SEARCHABLE_FIELD_PATHS`, lạ → tìm mọi thông tin), `tier`, `district`. Trả `{ stores, total, tierCounts }`; ảnh theo thứ tự phiếu: đã trong kho → URL ký GET hạn 1 giờ, chưa tải → ảnh xem trước Drive công khai (`drive.google.com/thumbnail`). Hạng "Hạng Tăng trưởng" gộp vào "Hạng Tiêu Chuẩn" (PO 31/10/2026). SĐT, tên chủ/người liên hệ/pháp nhân, số nhà + tên đường (giữ quận suy ra), email, mã số thuế, link mạng xã hội/bản đồ được che một phần ở máy chủ (`partner-marketplace-mask.ts`, PO 01/11/2026) |
| POST | `/platform/marketplace/sync` | `N17` | Đọc Google Sheet khảo sát (`PARTNER_SURVEY_SHEET_ID`/`_GID`, tài khoản dịch vụ `GOOGLE_SERVICE_ACCOUNT_JSON`), upsert theo tên cửa hàng. Trả `{ added, updated, total, skipped }`. Chưa cấu hình / Google lỗi → 422. Ghi `platform_audit_logs` (`platform.marketplace.sync_sheet`) |
| POST | `/platform/marketplace/import-excel/preview` | `N17` | `multipart/form-data` trường `file`. Không ghi dữ liệu. → `{ data: { headers, samples, rowCount, mapping, source } }`: tiêu đề từng cột, giá trị mẫu (≤80 ký tự, dãy số dài che còn 3 số cuối), bảng ghép tự động 75 trường → chỉ số cột theo **tên tiêu đề** (`partner-marketplace-column-match.ts`; tệp giữ bố cục gốc thì trường chưa nhận ra lấy cột gốc, `source: "position"`) |
| POST | `/platform/marketplace/import-excel` | `N17` | `multipart/form-data` trường `file` (.xlsx/.xls/.csv, ≤10 MB, ≤5000 dòng, ≤200 cột) + `mapping` tuỳ chọn (JSON mảng 75 phần tử: chỉ số cột hoặc `null`). Thiếu `mapping` → tự ghép theo tên tiêu đề như `preview`. Thiếu cột Tên cửa hàng, một cột ghép cho nhiều trường hoặc cột ngoài tệp → 422, không ghi. Như `sync`; ghi `platform.marketplace.import_excel` |
| POST | `/platform/marketplace/sync-photos` | `N17` | Tải ảnh khảo sát từ Drive vào kho (`platform/partner-stores/<id>/<driveId>.<ext>`, kiểm nội dung, ≤15 MB/ảnh, ≤12 ảnh/cửa hàng), mỗi lượt tối đa 8 cửa hàng, lâu chưa xử lý nhất trước. Có tài khoản dịch vụ thì đọc qua Drive API, không có hoặc bị từ chối thì tải qua link công khai. Ảnh lỗi không đánh dấu — lượt sau thử lại. Trả `{ stores, downloaded, failed, remaining }`; `remaining` > 0 thì gọi tiếp. Ghi `platform.marketplace.sync_photos` |
| GET · POST | `/platform/marketplace/share-links` | `N17` | Link chia sẻ chợ đối tác (PO 01/11/2026). GET: tối đa 100 link mới nhất `{ links: [{ id, label, expiresAt, status: ACTIVE\|EXPIRED\|REVOKED, viewCount, lastViewedAt }] }`. POST `{ label (1–120), days (1–365) }` → 201 `{ link, token }`; token (32 byte base64url) chỉ trả MỘT lần, DB lưu SHA-256. Ghi `platform.marketplace.share_link_create` |
| DELETE | `/platform/marketplace/share-links/:id` | `N17` | Huỷ link ngay lập tức (idempotent). Không có → 404. Ghi `platform.marketplace.share_link_revoke` |
| DELETE | `/platform/marketplace/stores/:id` | `N18` | Xoá hẳn một hồ sơ chợ đối tác (chỉ superadmin). Không có / id sai dạng → 404. Ảnh đã tải vào kho không bị xoá (hàng đợi xoá tệp chỉ nhận tệp của tổ chức) — đối soát kho báo là tệp mồ côi. → `{ data: { id, shopName } }`. Ghi `platform.marketplace.store_delete` (`before`: tên, nguồn, số ảnh) |
| POST | `/platform/marketplace/stores/bulk-delete` | `N18` | Xoá hàng loạt (chỉ superadmin), một giao dịch. Body `{ ids }` (1–500 uuid, bỏ trùng; ngoài trần → 422) hoặc `{ all: true, expectedTotal }` — xoá toàn bộ khi `expectedTotal` khớp số hồ sơ hiện có, lệch → 409 không xoá gì. Ảnh trong kho giữ lại như xoá một hồ sơ. → `{ data: { deleted } }`. Ghi `platform.marketplace.store_bulk_delete` / `store_delete_all` (`before`: số hồ sơ, số ảnh, ≤50 tên) |
| GET | `/public/marketplace-share/:token` | công khai | Danh sách chợ đối tác qua link chia sẻ: `{ stores, total, expiresAt }`, luôn đã che một phần (như `/platform/marketplace/stores`). Không nhận bộ lọc (lọc ở trình duyệt — tránh dò ngược dữ liệu đã che). Token sai/hết hạn/đã huỷ → 404 như nhau. Giới hạn 60 lần/10 phút/IP; `Cache-Control: no-store`, `X-Robots-Tag: noindex` |
| GET | `/platform/audit-logs` | `N6` | Nhật ký xuyên tổ chức — hợp `audit_logs` mọi tổ chức và `platform_audit_logs` |

## 21b. Nền quản trị trường (ĐP-3, 26/09/2026)

Chín route dưới đây cũng là console vận hành nền tảng (`PlatformContext`, mã `N12`), theo đúng khuôn mục 21 — **có thao tác ghi** (trừ hai route đọc thêm ở cuối bảng, phục vụ Console UI 3.15), khác P25a (chỉ đọc). Đây là tuyến ghi ĐẦU TIÊN của Console Vận hành, dựng theo kế hoạch
`docs/kien-truc/KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md` mục 6. Mọi thao tác ghi ghi vào `platform_audit_logs` (`recordPlatformAuditLog`). Xem Đặc tả trường §16.2–§16.3 cho nguyên lý "lớp mã / lớp cấu hình" và mức sàn không cấu hình được.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/platform/fields` | `N12` | Liệt kê trường lõi + trường tự tạo, `?entity=ORDER\|PARTNER` |
| PATCH | `/platform/fields` | `N12` | Sửa cấu hình platform-wide của MỘT trường đã xây (nhãn, mô tả, mức yêu cầu, hiển thị, danh mục gắn theo). Mức sàn #2 chặn hạ mức yêu cầu của trường lõi xuống dưới lớp mã → 400 |
| POST | `/platform/fields` | `N12` | Tạo trường TỰ TẠO hoàn toàn mới (D13, Đặc tả trường §16.3). Khoá `cf_…` do máy sinh từ nhãn, không nhận từ client |
| POST | `/platform/fields/:key/deactivate` | `N12` | Chỉ TẮT — không xoá cứng. Trường lõi `REQUIRED` không tắt được → 400 |
| GET | `/platform/catalogs` | `N12` | Mọi danh mục (§2.15) kèm giá trị |
| POST | `/platform/catalogs/:key/values` | `N12` | Thêm giá trị mới. Danh mục CÓ HÀNH VI bắt buộc `behavior` là mã có thật trong `behaviors.ts`; danh mục ĐÓNG từ chối → 400 |
| PUT | `/platform/organizations/:id/field-overrides` | `N12` | Ghi đè CHỈ áp cho một tổ chức — trường (`target: "field"`) hoặc giá trị danh mục (`target: "catalogValue"`) |
| GET | `/platform/organizations/:id/field-preview` | `N12` | ĐP-3 3.15 — "tổ chức này sẽ thấy gì" sau khi cộng ghi đè, `?entity=ORDER\|PARTNER`. Dùng chung phép tính với `/field-config` (tenant), chỉ khác ngữ cảnh gọi. CHỈ ĐỌC |
| GET | `/platform/organizations/:id/credits` | `N1` | Checklist ALG 10.6 — số dư và 50 dòng gần nhất của sổ cái `credit_transactions` |
| POST | `/platform/organizations/:id/credits` | `N3` | `{ kind: TOPUP\|GIFT\|REFUND, amount, reason }` — nạp/tặng/hoàn có lý do (1–1.000.000 credit), ghi sổ cái và `platform_audit_logs`; tổ chức không có → 404 |
| PUT | `/platform/organizations/:id/usage-limit` | `N3` | Checklist ALG 10.3 — `{ monthlyLimit: number \| null }` hạn mức credit/tháng của tổ chức (áp kỳ hiện tại và các tháng sau), ghi `platform_audit_logs` |
| GET | `/platform/credit-pricing` | `N4` | PO Q10 — quy đổi credit: `smsCredit`, `znsCredit` (credit/tin, mặc định 0), `usdToVnd`, `creditValueVnd`, `smsCostVnd`, `znsCostVnd` (giá vốn tham chiếu mỗi tin), `defaultMonthlyLimit`, `messageOverdraftCredit` (mức âm tối đa cho tin nhắn gửi khách khi hết credit, mặc định 50; 0 = dừng gửi) |
| PUT | `/platform/credit-pricing` | `N3` | Sửa từng trường của quy đổi credit (lưu `platform_settings.credit_pricing`), ghi `platform_audit_logs` |
| GET | `/platform/margin` | `N4` | Checklist ALG 10.4 — `?period=YYYY-MM` (mặc định tháng hiện tại, giờ Việt Nam): theo tổ chức có phát sinh — credit đã dùng sau hoàn, doanh thu (× `creditValueVnd`), chi phí (AI `ai_requests.cost_usd` × `usdToVnd` + `provider_cost_entries.cost_vnd`), biên và tỷ lệ; kèm dòng tổng |
| POST | `/platform/organizations` | `N7` (+`N19` khi gán gói) | Checklist ALG 9.10 — `{ organizationName, ownerEmail, ownerName?, industry?, subscription?: { plan, cycle, priceVnd, includedCreditsMonthly, firstPeriodPaid? } }`: tổ chức, workspace vận hành, chủ tiệm vai Điều hành với mật khẩu tạm (buộc đổi lần đầu), gói thuê bao; 201 trả `temporaryPassword` một lần (không ghi nhật ký); thư đã có tài khoản → 409 |
| GET | `/platform/organizations/:id/subscription` | `N1` | Checklist ALG 10.7 — gói, kỳ hiện tại, trạng thái (`ACTIVE`·`OVERDUE`·`CANCELLED`), 12 hoá đơn gần nhất kèm thông tin VietQR khi đã khai tài khoản nhận tiền |
| PUT | `/platform/organizations/:id/subscription` | `N19` | `{ plan, cycle: MONTHLY\|YEARLY, priceVnd, includedCreditsMonthly, firstPeriodPaid? }` — gán lần đầu (kỳ bắt đầu ngay, hoá đơn kỳ đầu hạn trả ngay; chưa thu → chỉ xem) hoặc đổi gói (áp từ hoá đơn kỳ sau) |
| DELETE | `/platform/organizations/:id/subscription` | `N19` | Huỷ gói, huỷ hoá đơn còn chờ thu |
| POST | `/platform/subscription-invoices/:id/mark-paid` | `N19` | `{ note }` — Console xác nhận đã nhận tiền; hoá đơn kỳ sau → dời kỳ hiện tại; hết hoá đơn quá hạn → `ACTIVE`; đã thu rồi → 404 |
| GET | `/platform/billing-account` | `N1` | Tài khoản nhận tiền thuê bao của nền tảng (`platform_settings.platform_billing_account`) |
| PUT | `/platform/billing-account` | `N19` | `{ bankBin (6 số), bankName, accountNumber (6–20 số), accountHolder }` |
| GET | `/platform/organizations/:id/custom-domains` | `N1` | Checklist ALG 10.8 — tên miền riêng của tổ chức (cùng dạng `GET /custom-domains`); tổ chức không có → 404 |
| POST | `/platform/custom-domains/:id/lock` | `N20` | `{ locked: true, reason (5–300 ký tự) }` khoá — tên miền ngừng phục vụ ngay, cửa hàng không tự gỡ hay xác minh được; `{ locked: false }` mở lại về `PENDING` (cửa hàng xác minh lại). Ghi `platform_audit_logs` |
| GET | `/platform/overview` | `N1` | Checklist ALG 9.8 — số tổ chức theo trạng thái thuê bao (`active`, `overdue`, `cancelled`, `withoutSubscription`), doanh thu thuê bao đã thu 6 tháng gần nhất (giờ Việt Nam), `health` khi người xem có `N5` |
| GET | `/platform/behaviors` | `N12` | ĐP-3 3.15 — liệt kê mã hành vi có thật trong `field-platform/domain/behaviors.ts` cho một `behavior_kind` (`?kind=…`), để Console gợi ý khi thêm giá trị danh mục CÓ HÀNH VI. CHỈ ĐỌC, không thay luật kiểm ở `upsert-catalog-value.ts` |

## 22. Phân hệ Nghiên cứu Thị trường & Xu hướng (Market Intelligence Engine, Đợt A mở rộng)

Đợt A mở rộng theo `FloraOS-Intelligence-Engine_FINAL_v2.0.md` (đặc tả đầy đủ, mục 8–19: Product Intelligence) — xem ghi chú mở rộng D-MI5 tại project claude.ai (`ke-hoach-market-intelligence-dot-a-19-09-2026.md`).

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/market-intelligence/opportunities` | `V2` | Danh sách cơ hội nội dung đã cá nhân hóa cho tổ chức |
| POST | `/market-intelligence/research-runs` | `V1` | Kích hoạt lượt chạy nghiên cứu xu hướng thị trường — hỗ trợ tham số `channel` (mặc định chuỗi Google Trends → SerpApi; `youtube`/`tiktok` gọi riêng kênh; `omnichannel` gọi song song cả 3 nguồn để đối chiếu chéo, đúng cơ chế "cross-validation" ở mục 10 đặc tả v1.0 gốc). Kênh `facebook` đã bị GỠ 19/09/2026 — Facebook không có API công khai đo được mức thảo luận theo chủ đề, adapter trước đó chỉ suy diễn qua kết quả tìm kiếm Google (không phải số đo Facebook thật), nên đã xoá khỏi hệ thống thay vì tiếp tục trình bày như một kênh nghiên cứu (xem `TECHNICAL_DEBT.md`). Kênh `shopping` (hiển thị trên UI là "Google Shopping") **CHƯA XÂY** — chủ sản phẩm quyết định 19/09/2026 GIỮ lựa chọn này trên UI nhưng chưa có adapter thật; chọn kênh này hiện rơi xuống đúng chuỗi mặc định (Google Trends → SerpApi → Cached), không phải dữ liệu Google Shopping thật (nợ kỹ thuật #116) |
| GET | `/market-intelligence/research-runs` | `V1` | Lịch sử các lượt chạy nghiên cứu thị trường |
| GET | `/market-intelligence/health` | `V1` | Sức khỏe và trạng thái các nhà cung cấp dữ liệu xu hướng |
| POST | `/market-intelligence/product-intelligence` | `V1` | Product Intelligence (v2.0 mục 8–19): phân tích ảnh sản phẩm hoa (Vision AI), đối soát Trend Fit dựa trên tín hiệu thật từ `trend_signals` (nợ #115, đã trả 21/09/2026), cải tiến (KEEP/IMPROVE/TEST) và 10 chủ đề nội dung cụ thể. Mỗi lượt phân tích được LƯU LẠI vào `product_analysis_runs` (nợ #113, đã trả 21/09/2026). **CHƯA XÂY** (quyết định chủ sản phẩm 21/09/2026 — tạm hoãn, xem nợ #117): gợi ý định vị (Positioning, mục 15), phân tích riêng theo từng dịp dùng (Occasion Intelligence, mục 14), và bối cảnh cạnh tranh (Competitive Context, mục 16) |
| POST | `/market-intelligence/vision-extract` | `V1` | Bóc tách đặc trưng thị giác hoa tươi qua OpenAI Multimodal Vision. Từ 25/09/2026: `asset_id` BẮT BUỘC (ảnh đọc từ kho của đúng tổ chức, `image_url` bị bỏ qua); thu `product.vision_extract` = 1 credit qua `enqueueJob`, khoá `vision-extract:<asset_id>` (bấm lại không thu), hỏng → FAILED + hoàn; kết quả M01 đã có thì miễn phí (trả `reused: true`). Từ 06/10/2026: `reanalyze_key?` = người dùng đã xác nhận phân tích lại → bỏ kết quả cũ, khoá `vision-extract:<asset_id>:again:<key>`, gọi mô hình và thu 1 credit (cùng khoá = một lần bấm, không trừ hai lần). Trường mô hình không trả để trống/0 |
| GET | `/product-intelligence/:id` | `V2` | Xem chi tiết kết quả phân tích Product Intelligence đã lưu theo run ID (mã thật là `V2`, sửa đặc tả 23/09/2026) |

## 23. Phân hệ Creative Production Pipeline, Audio Studio & Gói chiến dịch (Creative Studio)

Kiến trúc: `docs/kien-truc/FLORAOS_CREATIVE_STUDIO_ARCHITECTURE.md`; dữ liệu vào/ra: `docs/dac-ta/FLORAOS_CREATIVE_STUDIO_IO_SPEC.md`. Đồng bộ lại theo mã 23/09/2026 (bản trước ghi năng lực `I4` — mã thật là `I1`).

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| POST | `/creative-production/plan` | `I1` | Lập kế hoạch cung truyện (Narrative Arc) từ Topic Brief |
| POST | `/creative-production/produce` | `I1` | Sinh nội dung đa kênh (`produceCreative`/`produceAuthentic`). `organizationId` lấy từ phiên, KHÔNG nhận từ body |
| POST | `/creative-production/package` | `I1` | Ước tính kế hoạch sản xuất & chi phí từ kết quả produce — tính thuần, KHÔNG lưu. Gói chiến dịch thật dùng `/creative-production/packages` |
| POST · GET | `/creative-production/packages` | `I1` · `G1` | Chặng 07 — tạo gói (DRAFT) neo vào Master Image đã duyệt; liệt kê theo `master_asset_id`. Thân nhận `video_job_ids[]` (mỗi khung một video, 24/09/2026) cùng `video_job_id` cũ (gộp, bỏ trùng, video chính đứng đầu); `PATCH /packages/:id` cũng nhận `video_job_ids` (thay trọn danh sách). View trả `video_job_ids[]`, `videos[]` |
| GET · PATCH | `/creative-production/packages/:id` | `G1` · `I1` | Đọc gói kèm URL ký của tài sản; sửa gói chưa duyệt (sửa là về DRAFT, xoá QA cũ) |
| POST | `/creative-production/packages/:id/qa` | `I1` | Chặng 08 — QA năm trục chạy phía máy chủ trên dữ liệu thật |
| POST | `/creative-production/packages/:id/approve` | `J5` | Chặng 09 — duyệt; ghi `audit_logs` cùng giao dịch; `QA_NEEDS_REVIEW` cần `acknowledge_warnings: true` |
| PUT | `/creative-production/packages/:id/launch` | `J5` | Chặng 10 — kế hoạch đăng + mã bài đã đăng (khớp `content_metrics.content_id`) |
| GET | `/creative-production/packages/:id/performance` | `R1` | Chặng 11–14 — đơn/doanh thu của sản phẩm kể từ ngày duyệt, hội thoại, số liệu kênh, mẫu thắng, đề xuất |
| POST | `/creative-production/scene-plans` | `I1` | 24/09/2026 — AI viết kịch bản bối cảnh cho MỘT chủ đề (feature `creative.scene_plan`, 1 credit, `AIC-18` qua cổng AI, chạy tại chỗ như `product.copy.generate`). `Idempotency-Key` BẮT BUỘC; trùng khoá trả kịch bản cũ không trừ credit. Thân: `mode`, `asset_id?`, `product_id?`, `platforms?` (v2: `tiktok\|instagram_reels\|facebook_reels\|youtube_shorts\|zalo_video\|youtube\|facebook_feed\|instagram_feed`, bỏ trống = TikTok + Reels 9:16, hoặc `"all"`), `outputs?` (`"all"` hoặc mảng `content\|audio\|image\|video`, bỏ trống = cả 4; video kéo theo image + audio — phạm vi sản xuất, IO Spec §5.0c), `product{name, category?, style?, colors[], components[], occasions[], target_audience?, price_range?}`, `topic{id, title, angle_category?, hook?, cta?, format?}`. Đáp ứng `{ job_id, status, error, plan, deduped, usage }`. AI hỏng → job `FAILED`, hoàn credit, 500 kèm lý do. **Thu gộp (25/09/2026, trả nợ #146):** có kênh đăng bài thì một lần thu `creative.scene_plan` + `content.generate` (1 + 2) trên job kịch bản, Content Engine chạy kèm không thu thêm; bước viết bài hỏng → hoàn 2, `usage` trả số đã trừ thật |
| GET | `/creative-production/scene-plans` | `I1` | Query `asset_id`, `topic_id`, `mode`. Tra kịch bản đã có theo khoá `scene-plan:<asset>:<topic>:<mode>` — KHÔNG tạo job, không trừ credit; chưa có thì `plan: null` |
| GET | `/creative-production/scene-plans/:id` | `I1` | Đọc kịch bản theo job id (chỉ feature `creative.scene_plan` của đúng tổ chức). Bản v1 đã lưu được nâng lên v2 khi đọc |
| PATCH | `/creative-production/scene-plans/:id` | `I1` | 24/09/2026 (v2) — sửa **kịch bản sản xuất tổng** tại chỗ, miễn phí, tăng `revision`: `platforms` (`"all"` hoặc mảng — đổi khung hình + khuôn video, bỏ bài của kênh không còn chọn), `outputs` (`"all"` hoặc mảng — đổi loại kết quả sản xuất), `text_overlay` bị bỏ qua (phụ đề = lời thoại), `scenes[{ scene_index, duration_seconds?, voice_script?, text_overlay?, transition?, motion_effect? }]`, `audio{ voice_id?, music_mood?, pacing?, quality_tier? }`, `video{ caption_style?, has_subtitle?, has_watermark?, end_card_text?, cover_scene_index? }`, `posts[{ channel, text, hashtags? }]` (từ cấm cứng → 400). Đổi lời thoại/nền tảng thì cân lại thời lượng các cảnh |
| GET · PUT | `/creative-production/content-drafts` | `I1` | 24/09/2026 — bài Khu vực B tự lưu theo `asset_id` + `topic_id` + `mode` (GET qua query, PUT qua body kèm `posts`, `topic_title?`); Chặng 07 đưa sẵn vào gói. Ảnh phải thuộc đúng tổ chức |
| POST | `/creative-production/scene-revisions` | `I1` | 24/09/2026 — Chặng 07 "Sửa cảnh": AI sửa MỘT cảnh của kịch bản bối cảnh theo `instruction` (feature `creative.scene_revise`, 1 credit, `AIC-18`, `Idempotency-Key` bắt buộc); có `scene_plan_id` thì đọc cảnh từ kho và ghi kịch bản đã sửa. Sinh lại ảnh là job `POST /media/variants` riêng |
| POST | `/creative-production/content-rewrites` | `I1` | 24/09/2026 — Chặng 07 "AI viết lại" MỘT bài theo `instruction` (feature `creative.content_rewrite`, 1 credit, `AIC-23`, `Idempotency-Key` bắt buộc); từ cấm ngành hoa/thương hiệu vi phạm cứng → loại lượt, hoàn credit |
| POST | `/creative-production/video-assembly` | `I1` | 24/09/2026 (Đợt 4) — dựng video từ bộ tài sản của kịch bản sản xuất tổng. Thân `{ scene_plan_id, plan? (chỉ kịch bản cơ bản rule:…), master_asset_id, audio_job_id?, title?, dry_run?, ratio? }` — `ratio` (`9:16\|4:5\|1:1\|16:9`, bỏ trống = khung chính): mỗi khung trong phạm vi một video; khung ngoài phạm vi → `problems: ratio_out_of_scope`; kịch bản nhiều khung thì chỉ dùng ảnh đúng khung. Đáp ứng `plan` thêm `ratios[]`. Ảnh = biến thể Khu vực D đúng `scene_plan_id` + `scene_index` trên Master (ưu tiên đúng khung + revision mới nhất); âm thanh = bản phối Khu vực C chỉ định hoặc bản COMPLETED mới nhất có `payload.scenePlanId` trùng; thời lượng cảnh = thời lượng thật của C. Thiếu ảnh/âm thanh, âm thanh của kịch bản khác hoặc chỉ có nhạc → `ready: false` + `problems[]` (không tạo job). Đủ → tạo `video_jobs` `DRAFT` gắn `scene_plan_id`, `audio_job_id`, `audio_storage_key`; render dùng nguyên bản phối C. Không trừ credit (render trừ `video.render`) |
| POST | `/audio/jobs` | `I1` | Tạo job `audio.generate`. `Idempotency-Key` BẮT BUỘC (từ 23/09/2026). Từ 24/09/2026 bốn `taskType` ra kết quả khác nhau thật: `VOICEOVER` chỉ giọng · `MUSIC_SELECT` chỉ nhạc (0 credit, không TTS) · `AUDIO_MIX` giọng + nhạc (sidechain ducking, -14 LUFS) · `VOICE_CLONE` giọng nhân bản READY (`voiceCloneId`, ElevenLabs, không lùi nhà cung cấp). `musicTrackId` = `trackId` hệ thống hoặc `org:<uuid>`. Credit trừ = bảng `audio-pricing-guard.ts` qua `enqueueJob({ costCredit })`. `providerKey` `google_cloud`/`local_fallback` → 422. 25/09/2026 (PO: nhà cung cấp trước): bỏ trống `providerKey` = thứ tự tiệm; `musicProvider?: elevenlabs_music\|library` — mặc định nhạc AI, bài thư viện là dự phòng, `library` = 0 credit phần nhạc |
| GET | `/audio/jobs/:id` | `I1` | Trạng thái + URL ký có hạn của bản phối và bản chỉ-giọng; `provider_used`/`provider_fallback` (nhà cung cấp thật đã đọc), `loudness_lufs`, thời lượng thật từng cảnh, `refunded`. Job `FAILED` tự hoàn credit ở lần đọc này (24/09/2026). 25/09/2026: `music_provider_used`/`music_fallback`/`music_fallback_reason`; nhạc lùi thư viện hoặc giọng lùi bên rẻ hơn → hoàn chênh |
| GET | `/audio/music-tracks` | `I1` | 24/09/2026 — thư viện nhạc: bài tiệm tải (`music_tracks`, mã `org:<uuid>`) + bài hệ thống (`music-catalog.ts`), kèm `license_type`, `license_source`, `license_verified`, `preview_url` |
| POST | `/audio/music-tracks` | `I1` | Multipart: `file` (MP3/WAV/M4A ≤ 20MB, nhận diện bằng byte đầu), `title`, `mood`, `license_type` (`owned\|royalty_free\|licensed\|creative_commons`), `license_source`, `license_note?`, `attest=true` (bắt buộc) |
| DELETE | `/audio/music-tracks/:id` | `I1` | Gỡ bài tiệm đã tải (đánh dấu `deleted_at`); bài tổ chức khác → 404 |
| GET | `/audio/music-tracks/system/:trackId` | `I1` | Phát tệp bài hệ thống để nghe thử |
| GET | `/audio/voice-clones` | `I1` | 24/09/2026 — giọng nhân bản của tổ chức (`voice_clones`); giọng `FAILED` tự hoàn credit ở lần đọc này |
| POST | `/audio/voice-clones` | `I1` | Multipart: `name`, `sample` (MP3/WAV/M4A 50KB–10MB, worker đòi ≥ 20 giây), `consent=true` (lưu nguyên văn câu cam kết). Tạo job `audio.voice_clone` (5 credit, giá tạm #64) → worker gửi ElevenLabs Instant Voice Clone. `Idempotency-Key` bắt buộc |
| GET | `/audio/voice-clones/:id` | `I1` | Trạng thái + URL ký nghe lại mẫu |
| DELETE | `/audio/voice-clones/:id` | `I1` | Gỡ giọng trên ElevenLabs rồi đánh dấu `DELETED` |
| GET · PUT | `/creative-production/providers` | `I1` · `U2` | 25/09/2026 (PO: nhà cung cấp trước, cục bộ chỉ là đường lùi) — danh mục nhà cung cấp theo loại `content` · `image_optimize` · `image_variant` · `video` · `voice` · `music` (`provider-catalog.ts`), thứ tự ưu tiên của tiệm, bên nào đã có khoá (`configured`), đường lùi cục bộ. PUT thân `{ kind, order[] }` ghi `organizations.settings.creative_providers[kind]` + `audit_logs` |
| POST | `/content-engine/generations` | `I1` | 25/09/2026 (P27) — chuỗi agent Strategist→Writer→Critic→Rewriter viết bài đa kênh, chạy tại chỗ (feature `content.generate`). `Idempotency-Key` BẮT BUỘC; trùng khoá trả bản ghi cũ, không trừ credit lần hai (lượt đầu còn chạy → 202 + `job_id`). Thân: `asset_id?`, `product_id?`, `analysis_run_id?`, `topic_id?`, `scene_plan_id?`, `channels`. Đáp ứng `{ job_id, generation_id, status, posts, overall_score, needs_review, deduped, usage }`. Ghi `content_generations` `DRAFT`. Brief: có `analysis_run_id` → báo cáo thị trường; không có → dữ liệu ĐÃ DUYỆT của sản phẩm (Thẻ chào → Bài giới thiệu → Thẻ sản phẩm, PO 08/11/2026), chưa duyệt gì → chỉ tên |
| GET | `/content-engine/generations` | `I1` | Query `asset_id?`, `topic_id?`, `scene_plan_id?`, `mode?` — bản mới nhất khớp bộ lọc, KHÔNG tạo job, không trừ credit; chưa có thì `generation: null` |
| GET | `/content-engine/generations/:id` | `I1` | Đọc một lượt sinh (brief, strategy, posts, điểm rubric, phiên bản prompt); tổ chức khác → 404 |
| POST | `/content-engine/generations/:id/approve` | `J5` | Duyệt tách khỏi sinh: `posts?` (bài đã sửa) → `approved_posts`, `status = APPROVED`, ghi `audit_logs` cùng giao dịch |

⚠ Audio, video và Creative Production dùng chung `I1` (`media.optimize`) — sai ngữ nghĩa RBAC, chờ chủ sản phẩm quyết có thêm mã riêng hay không (đụng con số 143 mã). Xem `TECHNICAL_DEBT.md` nợ #121.

## 23b. Thẻ Chào mẫu hoa — Swipe Brochure (`greeting-card`)

Trang công khai ngoài `/api/v1` (06/10/2026): **`/s/<mã>`** — link bộ sưu tập mang tên người sao chép, trả thẻ xem trước (tiêu đề, ảnh ghép) cho Facebook/Zalo; trình duyệt của khách tự chuyển sang **`/s/<mã>/mo`**, nơi mỗi khách được mở một phiên riêng (`greeting_sessions.sale_id` = người sao chép, sự kiện `SHARE_OPEN { shareLinkId, channel }`), nhớ qua cookie `fl_s_<mã>` 30 ngày để tải lại không tạo phiên mới, rồi chuyển 302 sang `/b/<mã gửi>`; giới hạn 30 lần/10 phút/IP; link thu hồi hoặc bộ sưu tập đã ẩn → 404.

Đồng bộ theo mã 05/10/2026 (đợt debug + nâng cấp thương mại). Năng lực gom tại `src/modules/greeting-card/domain/greeting-card-capabilities.ts` — dùng lại mã sẵn có, không thêm mã mới. Endpoint `/public/*` không cần đăng nhập: tổ chức suy ra từ mã gửi / catalog / khoá webhook ở server, KHÔNG nhận từ thân yêu cầu; đều qua giới hạn tần suất dùng chung (Redis, `REDIS_URL`). Danh sách trả `{ data, next_cursor }`, `?limit=1–100&cursor=`.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET · POST | `/greeting-card/catalogs` | `L1` · `R2` (+`F2` khi đặt chính sách tiệm theo bộ sưu tập) | Bộ sưu tập đang dùng (mặc định trang 100); `?status=active\|archived\|all`, `?created_by=<userId>`, `?days=<n>` (tạo trong n ngày). POST: `productIds` phải thuộc tổ chức (khác → 404); mã trùng → 409; ghi `audit_logs` `greeting_catalog.create` |
| GET · PATCH · DELETE | `/greeting-card/catalogs/:id` | `L1` · `R2` (+`F2` khi đổi chính sách tiệm) · `R2` | DELETE = ẩn (`is_active=false`); tổ chức khác → 404 · Ẩn (DELETE hoặc PATCH `isActive:false`) và khôi phục (PATCH `isActive:true`) chỉ cho người tạo, hoặc người có `L4` (Điều hành) với catalog của người khác — thiếu → 403; thay đổi và `audit_logs` (`greeting_catalog.delete` / `.restore`) ghi trong cùng transaction (07/10/2026); PATCH tên/mô tả/giao diện chỉ người tạo hoặc `L4`, khác → 403 (PO 16/10/2026; Điều phối như Sale) |
| POST · DELETE | `/greeting-card/catalogs/:id/products` | `R2` + người tạo hoặc `L4` | Thân `{ productId }`; sản phẩm tổ chức khác → 404; bộ sưu tập người khác tạo (Sale, Điều phối) → 403 (PO 16/10/2026) |
| GET · POST | `/greeting-card/send-links` | `R1` · `R2` | POST sinh mã gửi ngẫu nhiên duy nhất toàn hệ thống (`T01-XXXXXXXX`), hạn dùng KHÔNG còn do client gửi — lấy theo cài đặt của tiệm `organizations.settings.brochure_link_lifetime_hours` (1–720 giờ, mặc định 24; Điều hành sửa ở Cài đặt Thẻ chào qua `PATCH /organizations/current`), tính từ lúc tạo; trả `expiresAt`. GET kèm `link_state` ACTIVE/EXPIRED/REVOKED |
| POST | `/greeting-card/send-links/:id/revoke` | `R2` | Thu hồi link chưa có đơn (idempotent); đã có đơn → 409; link ngoài phạm vi xem (sale "chỉ khách của mình", link của sale khác) → 404 |
| PATCH | `/greeting-card/send-links/:id/customer` | `R2` | Ghi tên (bắt buộc, ≤ 100 ký tự) + SĐT di động VN (tuỳ chọn) của khách lên link chưa có đơn — thẻ hiện tên thật thay cho "Khách đang xem mẫu". Đã có đơn → 409; sale "chỉ khách của mình" sửa link của sale khác → 404; ghi audit `greeting_card.link.customer_update` |
| GET · PUT | `/greeting-card/display-settings` | `L1` · `R2` + `L4` | Trường thông tin hiển thị theo từng mẫu Thẻ chào (cấp cửa hàng, `organizations.settings.greetingCardDisplay`). PUT `{ templateId, fields[] }`; mã/tên/giá luôn hiện; khoá lạ bị bỏ; mẫu không tồn tại → 400. Gác quyền từ 06/10/2026 (trả nợ #170 phần Thẻ chào); PUT là cài đặt chung cả tiệm — Sale và Điều phối (không `L4`) → 403 (PO 16/10/2026) |
| GET | `/greeting-card/stats` | `R1` | `?days=7\|30\|90` — phễu gửi → mở → chọn → đặt → thu tiền + doanh thu theo sale · `paid` = số đơn đã thu ĐỦ, `revenueVnd` = tiền thật đã thu (`paid_vnd`, đơn chưa huỷ) — trước 06/10 đơn mới cọc tính là đã thu và cộng cả tổng đơn. Sale "chỉ khách của mình" chỉ thấy dòng của mình |
| GET | `/greeting-card/catalogs/:id/collage` | `L1` | Tải ảnh catalog PNG 1200×630 (ghép tối đa 4 mẫu JPG/PNG + tên, khoảng giá, tên tiệm) để đăng lên kênh; catalog tiệm khác/đã ẩn → 404. Cùng ảnh này làm ảnh xem trước (`og:image`) của `/g/:id` và `/bst/:orgSlug/:code` |
| GET | `/greeting-card/catalogs/:id/hearts` | `L1` | "Mẫu được thả tim nhiều nhất": `{ catalogId, totalHearts, rows: [{ productId, code, name, imageUrl, hearts, privateHearts, publicHearts }] }` xếp giảm dần. Cộng tim từ link gửi riêng (`PRODUCT_LIKED`/`PRODUCT_UNLIKED` của các phiên thuộc bộ sưu tập) và link công khai (`LIKE`/`UNLIKE`); mỗi khách tối đa 1 tim/mẫu, thao tác cuối quyết định; mẫu đã gỡ khỏi bộ sưu tập không hiện. Tổ chức khác → 404 (07/10/2026) |
| GET | `/greeting-card/stats/channels` | `R1` | `?days=7\|30\|90` — phễu link bộ sưu tập theo kênh chia sẻ (`?kenh=` zalo/facebook/instagram/tiktok/website/khac; lạ/trống = trực tiếp): khách xem → xem mẫu → mở form → đặt đơn, đếm khách không trùng · Link chung không thuộc riêng sale nào: sale "chỉ khách của mình" nhận `rows: []` |
| GET | `/greeting-card/orders` | `R1` | `?status=` (order_status), `?payment=OUTSTANDING\|PAID` (OUTSTANDING gồm cả đơn chờ báo giá — tổng 0); tiền trả dạng số · `?q=` (≤ 40 ký tự) tìm theo mã đơn, mã link hoặc ≥ 3 chữ số SĐT khách/người nhận; `?reported=1` chỉ đơn khách đã báo chuyển khoản (Điều hành 20/10, 08/10/2026) · `?delivered=1` (đi cùng `payment=OUTSTANDING`): báo cáo đơn đã giao còn nợ (15/10/2026) · `?delivery_from=&delivery_to=` (YYYY-MM-DD) · `?branch_id=` (người bị giới hạn chi nhánh vẫn chỉ thấy chi nhánh mình) · `?sale_id=` (Sale gửi link; Sale "chỉ khách của mình" luôn bị giới hạn về chính mình) |
| GET | `/greeting-card/coordinator-board` | `R1` | `?date=YYYY-MM-DD` (bỏ trống = mọi ngày). Bảng Điều phối: mọi đơn Thẻ chào đang làm + đơn xong/huỷ trong 24 giờ qua, xếp theo ngày + giờ bắt đầu khung giao; tối đa 1000 đơn → `{ data, truncated }`; vượt trần thì giữ các đơn có ngày + giờ giao gần nhất (16/10/2026). Áp phạm vi xem như `/orders` (08/10/2026). Mỗi đơn kèm `product` `{ productId, name, code, imageUrl, price, flowersSummary }` (SSOT `orderProductView`, cũng có trên `GET /greeting-card/orders`) (15/10/2026) |
| GET | `/greeting-card/coordinator-work` | `R1` | Trạng thái việc từng ĐƠN cho bảng Điều phối (bước, kẹt, `sla`) — cùng nguồn `loadTrackingDataset` với Theo dõi tiến độ nhưng bỏ link chưa có đơn; thay `tracking-pipeline` ở tab Điều phối, làm mới 30 giây (16/10/2026) |
| POST | `/greeting-card/orders/:id/confirm-payment` | `R11` | `amountVnd?` (bỏ trống = khoản đang chờ theo chính sách cọc). Khoá lạc quan trên `paid_vnd`, ghi `order_payments` (DEPOSIT/BALANCE) + `order_events` + `audit_logs`; đã thu đủ → 409; vượt phần còn lại → 422 · Sale chế độ "chỉ khách của mình" chỉ thao tác đơn của mình (khác → 404, 06/10/2026). Phiên link chỉ `COMPLETED` khi đã thu ĐỦ (đơn mới cọc vẫn hiện QR phần còn lại) | · **PO 08/10/2026: chỉ Điều hành (`R11`, trần cứng) — thay quyết định 06/10 dùng `R9`**
| POST | `/greeting-card/orders/:id/reject-reported-payment` | `R11` | `{ reason? }` (≤ 500 ký tự) — Điều hành cảnh báo "Chưa nhận được tiền" cho khoản Lần 1 khách đã báo/gửi bill: phiên về `ORDER_SUBMITTED`, bỏ ảnh bill, ghi `order_events` `PAYMENT_NOT_RECEIVED` + ghi chú đơn, gửi khách `PAYMENT_REMINDER`. Sổ thu đã có tiền / khách chưa báo / đơn huỷ → 409; tổ chức khác hoặc ngoài phạm vi xem → 404 | · PO 15/10/2026
| POST | `/greeting-card/orders/:id/quote` | `R11` | `{ totalVnd, reason? }` (lý do giá chốt ≤ 300 ký tự, lưu `pricing_rule_ref.quoteReason`, hiện cho Điều hành khi đối chiếu thanh toán) — báo giá trọn gói cho đơn đặt mẫu chưa niêm yết giá (tổng 0). Khoá lạc quan `total_vnd = 0`; đã có giá/đã huỷ → 409; số tiền sai → 422; tổ chức khác → 404; audit `greeting_card.order.quote` · Áp phạm vi xem như `confirm-payment`; báo giá xong gửi khách mốc `QUOTED` (ZNS/SMS) kèm số tiền phải trả | · Máy tự trừ ưu đãi "Giảm %" khách đã chọn lúc đặt trên giá nhập (`pricing_rule_ref.promotionDiscountVnd`, `quotedBeforePromotionVnd`) (08/10/2026)
| GET | `/greeting-card/orders/:id/vat` | `R1` | Hoá đơn VAT của đơn: `{ vatEnabled, vatRate, vatAmountVnd, subtotalVnd, totalVnd, paidVnd, balanceVnd, companyName, taxCode, companyAddress, email }` · Áp phạm vi xem như `confirm-payment`; tổ chức khác → 404 (15/10/2026) |
| PUT | `/greeting-card/orders/:id/vat` | `R11` | `{ enabled, rate: 8\|10 (mặc định 10), companyName?, taxCode?, companyAddress?, email? }` — máy chủ tính `vat_amount_vnd` = giá trước thuế × thuế suất, cập nhật `total_vnd`/`balance_vnd`; đổi thuế suất tính lại trên giá trước thuế. Khoá lạc quan theo `total_vnd`+`paid_vnd`; đơn huỷ/hoàn tất/chưa báo giá hoặc tổng mới < đã thu → 409; tổ chức khác → 404; audit `greeting_card.order.vat` (PO 15/10/2026). Duyệt giảm giá, phụ phí đổi lịch/khu vực, phí giao lại đều tính trên giá trước thuế rồi tính lại VAT |
| GET · PUT | `/greeting-card/sale-visibility` | `F2` | Quyền xem của sale (`organizations.settings.brochure_visibility = { mode, members: { userId: ALL\|OWN } }`). GET → `{ defaultMode, members[] }` (chỉ sale đang hoạt động có `R2` và không có `R4/R5/F2`); PUT `{ mode }` đổi mặc định, `{ userId, mode }` chọn riêng, `mode: null` bỏ chọn riêng; sale không thuộc tổ chức → 404. Thời gian chuẩn từng bước lưu ở `brochure_step_sla = { STEP_x: { enabled, minutes } }` qua `PATCH /organizations/current` |
| GET · POST | `/greeting-card/messages` | `R1` · gửi `R2` | Trao đổi nội bộ của một đơn/link. GET `?orderId=\|sessionId=` → `{ label, ownerSaleName, messages[] }`. POST `{ orderId\|sessionId, stepKey, to: { kind: ROLE, role } \| { kind: OWNER_SALE } \| { kind: USER, userId }, body ≤ 2000, replyToId? }` → 201; vai người gửi suy từ năng lực (F2 = Điều hành, R4/R5 = Điều phối, còn lại Sale), không nhận từ client; `replyToId` gửi thẳng về người đã nhắn; đơn ngoài phạm vi xem (tổ chức khác, sale "chỉ khách của mình") hoặc người nhận ngoài tổ chức → 404 |
| POST | `/greeting-card/messages/read` | `R1` | `{ messageIds[] ≤ 200 }` — đánh dấu đã đọc cho người đang đăng nhập; tin tổ chức khác bị bỏ qua |
| GET | `/greeting-card/messages/recipients` | `R1` | Lựa chọn "Gửi cho": 3 vai + thành viên đang hoạt động (trừ chính mình) |
| GET | `/greeting-card/inbox` | `R1` | Hộp việc của người đang đăng nhập: `{ role, actions[], threads[], updates[], counts }`. `actions` theo vai — kẹt quá thời gian chuẩn đúng phần mình (sale: chỉ đơn của mình); Điều hành thêm xác nhận tiền, báo giá, tiền vào chưa khớp; Điều phối thêm đơn chờ phân công; Điều hành thêm yêu cầu giảm giá chờ duyệt (`kind: DISCOUNT`, kèm `discount` để duyệt ngay). `threads` gom tin gửi cho mình theo đơn, có số chưa đọc. `updates` = đơn đổi bước trong 24 giờ |
| GET · POST | `/greeting-card/share-links` | `R1` · tạo `R2` | Link bộ sưu tập mang tên người bấm "Sao chép" (06/10/2026). POST `{ catalogId, channel? }` → 201 `{ code, path: "/s/<mã 10 ký tự>" }`, chủ link = người đang đăng nhập; bộ sưu tập tiệm khác/đã ẩn → 404. GET → link 30 ngày (sale "chỉ khách của mình" chỉ thấy link của mình) kèm `opens` (số khách mở) và `orders` |
| POST | `/greeting-card/send-links/:id/copied` | `R2` | `:id` = mã gửi của link riêng. Ghi mốc sao chép đầu tiên của link riêng (sự kiện `LINK_COPIED`, chép lại không đổi mốc) — giờ "khách chưa mở" tính từ mốc này; link chưa sao chép không bị báo kẹt. Link ngoài phạm vi xem → 404 |
| POST | `/greeting-card/orders/:id/discount-request` | `R2` | Sale xin giảm giá `{ percent? \| amountVnd?, reason }` → 201; gửi thẳng Điều hành (tin `kind = DISCOUNT_REQUEST`). Trần `organizations.settings.brochure_discount.max_percent` (mặc định và tối đa 50% — trần chung với ưu đãi/mã giảm giá, PO 07/11/2026; 0 = tắt) tính trên giá đơn trước mọi lần giảm; thêm trần chung (PO 07/11/2026): giảm tay cộng mã giảm giá, hạng khách, ưu đãi đã áp lúc đặt (`pricing_rule_ref`) không quá 50% tiền hàng — áp cả lúc xin lẫn lúc duyệt (`/discount-requests/:id/decision`); vượt trần / đơn chưa có giá → 400; đơn huỷ hoặc đang có yêu cầu chờ → 409; đơn ngoài phạm vi xem → 404 |
| POST | `/greeting-card/discount-requests/:id/decision` | `F2` | `{ approve, percent? \| amountVnd?, note }` — duyệt đúng mức xin, duyệt mức khác (vẫn trong trần) hoặc từ chối (bắt buộc ghi chú). Nguyên tử: yêu cầu phải còn chờ (409 nếu đã xử lý), tổng đơn chưa đổi; duyệt thì `total_vnd`/`balance_vnd` cập nhật, `pricing_rule_ref.manualDiscount = { baseTotalVnd, vnd, percent?, reason, note, approvedBy, approvedAt }` (duyệt lần sau thay lần trước), không được thấp hơn số đã thu (409). Sale nhận tin kết quả (`DISCOUNT_DECISION`); audit `greeting_card.discount.approve\|reject` |
| POST | `/greeting-card/orders/:id/cancel` | `R6` | `{ reason, confirmInTransit? }` — đơn đang giao (`DISPATCHED`/`DELIVERING`) phải gửi `confirmInTransit: true` sau khi hiện cảnh báo, thiếu → 409 (15/10/2026);; trả lại mã giảm giá; đơn đã giao/đã huỷ → 409; audit · Áp phạm vi xem; ngoài thao tác tay, bộ quét nền tự huỷ đơn quá hạn giữ khi tiệm bật `brochure_policy.auto_cancel_unpaid` (audit `system:hold-expiry`) |
| POST | `/greeting-card/orders/:id/refund` | `R10` | `{ amountVnd, reason }`; không vượt số đã thu (422); ghi REFUND + audit · Áp phạm vi xem |
| POST | `/greeting-card/orders/:id/assign-florist` | `R4` | Thứ tự xưởng + chính sách thu tiền (`brochure_policy`) chặn sai bước → 409 · Mọi tác vụ xưởng (phân công, ảnh thành phẩm, giao ship, ảnh người nhận) ghi `audit_logs` `greeting_card.order.<sự kiện>` |
| POST | `/greeting-card/orders/:id/product-photo` | `R3` | `{ assetIds }` (hoặc `{ assetId }` cũ): 1–5 ảnh JPG/PNG/WEBP + 0–2 video MP4/MOV/WEBM (≤ 50MB; ≤ 15 giây kiểm ở trình duyệt), một bản ghi QC cho cả bộ; asset phải thuộc tổ chức (khác → 404), sai giới hạn → 400 |
| POST | `/greeting-card/orders/:id/dispatch-shipping` | `R5` | Cần hoa READY (+ thu đủ nếu chính sách bật). Đơn giao không thành công (`FAILED`) giao lại được bằng chính route này |
| POST | `/greeting-card/orders/:id/recipient-photo` | `R5` | Cần đang giao; đóng đơn COMPLETED. Cùng luật ảnh/video như `product-photo`; trang theo dõi hiện thành mục "Ảnh người nhận" riêng |
| POST | `/greeting-card/orders/:id/delivery-failed` | `R5` | `{ reason: NO_ANSWER\|NOT_HOME\|WRONG_ADDRESS\|REFUSED\|OTHER, note? (≤ 300, bắt buộc ≥ 3 khi OTHER), chargeFee? }` — shipper không giao được. Chỉ khi đang giao (`DISPATCHED`/`DELIVERING`, khác → 409). Một giao dịch: `delivery_status = FAILED`, thêm bản ghi vào `delivery_window.failures` (tối đa 20), dòng `[Giao không thành công]` vào ghi chú nội bộ; `chargeFee` + tiệm cài `brochure_shipping.redelivery_fee_vnd` + đơn đã có giá → cộng phí vào `total_vnd`/`balance_vnd` và `pricing_rule_ref.redeliveryFeesVnd`. Sự kiện `order_events` `DELIVERY_FAILED`, audit `greeting_card.order.delivery_failed`, tin khách mốc `DELIVERY_FAILED`. Trang theo dõi trả `order.deliveryFailure` và mở lại "đổi thông tin đơn" (trừ lời nhắn thiệp) (08/10/2026) |
| GET | `/greeting-card/orders/:id/substitute` | `R3` | Đề xuất mẫu thay thế — dữ liệu cho hộp thoại: `{ current: { productId, name }, lockedReason, options: [{ productId, code, name, imageUrl, driveLink, priceVnd }], latest }`; `options` = mẫu còn bán trong bộ sưu tập gốc của đơn, trừ mẫu đang đặt. Tổ chức khác → 404 (08/10/2026) |
| POST | `/greeting-card/orders/:id/substitute` | `R3` | `{ reason (5–500), productIds (1–3) }` — tiệm không làm được mẫu khách chọn, đề xuất mẫu khác cùng bộ sưu tập (còn bán, khác mẫu đang đặt; sai → 400). Khoá khi hoa đã giao shipper / giao xong / huỷ (409); mỗi đơn chỉ một đề xuất chờ (409, khoá advisory theo đơn). Lưu `greeting_messages` `SUBSTITUTE_PROPOSAL` (payload: `status`, `reason`, `original`, `options` chụp tên/ảnh/giá, `proposedBy/At`) gửi sale phụ trách, audit `greeting_card.substitute.propose`, tin khách mốc `SUBSTITUTE_PROPOSED`. Tổng tiền không đổi (08/10/2026) |
| GET | `/greeting-card/orders/:id/flower-substitute` | `R3` | Đổi một loại hoa phụ (checklist ALG 5.14) — dữ liệu cho hộp thoại: `{ productName, lines: [{ index, flowerName, quantity, unit, color, role }], lockedReason, latest }`; `lines` = các dòng trong công thức đơn (`order_items.metadata.flowers`) trừ hoa chủ đạo. Tổ chức khác → 404 |
| POST | `/greeting-card/orders/:id/flower-substitute` | `R3` | `{ reason (5–500), lineIndex, replacementName (2–80), replacementColor?, photoAssetId }` — ảnh hoa thay thế phải thuộc đúng tổ chức và là tệp ảnh; dòng phải có trong công thức và không phải hoa chủ đạo (sai → 400). Khoá khi hoa đã giao shipper / giao xong / huỷ (409); mỗi đơn chỉ một đề xuất chờ, dùng chung khoá với đổi mẫu (409). Lưu `greeting_messages` `FLOWER_SUBSTITUTE_PROPOSAL`, audit `greeting_card.flower_substitute.propose`, tin khách mốc `SUBSTITUTE_PROPOSED`. Không gọi AI, không trừ credit. Tổng tiền không đổi |
| GET | `/greeting-card/tracking-pipeline` | `R1` | Bảng theo dõi (lọc theo quyền xem của sale); mỗi dòng có `stepStartedAt` (lúc vào bước hiện tại), `stuck` (`{ stepId, owner: SALE\|ADMIN\|COORDINATOR, overdueMinutes, message }` khi quá thời gian chuẩn `brochure_step_sla`, không thì `null`) , `saleId` và `channel` ("Link riêng của sale" hoặc kênh `?kenh=` của đơn đặt từ link bộ sưu tập, theo sự kiện ORDER). Đơn đã đặt chưa chuyển khoản hiện "Đã đặt đơn — chờ khách chuyển khoản". Link đã mở (`OPENED`) tính là bước "Chọn mẫu". Trao đổi nội bộ chuyển sang `/greeting-card/messages` (06/10/2026, bỏ ghi chú theo bước kiểu cũ) · Đọc MỌI đơn còn việc (chưa xong, chưa huỷ) + đơn hoàn tất 7 ngày + link chưa thu hồi/còn hạn có hoạt động 30 ngày; trần an toàn 2000 dòng có log cảnh báo (trước 06/10: chỉ 100 đơn + 50 link mới nhất) |
| GET | `/greeting-card/tracking` | `R1` | Lớp truy vấn dùng chung cho các view Theo dõi tiến độ. `view` = `list` (mặc định) · `kanban` · `calendar` (bắt buộc `from`,`to` ≤ 62 ngày) · `queue` (chỉ đơn quá hạn/sắp quá hạn) · `dashboard` (số liệu tổng hợp). Lọc chung: `q`, `category`, `steps` (CSV), `saleId`, `channel`, `type`, `sla` (`NONE\|ON_TRACK\|DUE_SOON\|OVERDUE\|ATTENTION`), `owner`, `deliveryFrom`, `deliveryTo`; sắp xếp `sort`/`dir`; phân trang `limit` (1–100, mặc định 20) + `cursor`. Phản hồi: `list`/`queue` → `{ view, data: [dòng], next_cursor, total }` (dạng danh sách phân trang chung); view khác → `{ data: <kết quả view> }`. Bước và trạng thái thời gian chuẩn suy ra ở máy chủ từ cùng tập `tracking-pipeline` (không lưu, không bản sao); phạm vi sale áp như `tracking-pipeline` (06/10/2026) |
| POST | `/greeting-card/cancellation-requests` | `R1` + vai nhắn nội bộ (Sale `R2` / Điều phối `R4`·`R5` / Điều hành `F2`) | `{ orderId, type: CANCEL_ONLY\|FULL_REFUND\|PARTIAL_REFUND, reason (3–1000), refundAmountVnd?, note? }` — đề xuất Hủy/Hoàn tiền, lưu là tin nhắn `CANCELLATION_REQUEST` gửi Điều hành + audit. Đơn khác tổ chức hoặc ngoài phạm vi xem (Sale "khách của mình") → 404; chỉ đơn Thẻ chào (08/10/2026) |
| GET | `/greeting-card/cancellation-requests` | `R6` hoặc `R10`; `R5` chỉ thấy đề xuất huỷ đơn đang giao | Đề xuất đang chờ duyệt (tối đa 200, cũ trước), kèm `delivery_status` của đơn (08/10/2026; 15/10/2026) |
| POST | `/greeting-card/cancellation-requests/:id/decision` | `R6` (hủy đơn) · `R10` (chỉ hoàn một phần) · đơn đang giao: thêm `R5` (không tự duyệt đề xuất của mình) | `{ approve, note?, actualRefundVnd? }`. Số hoàn do máy chủ tính: `CANCEL_ONLY` = 0, `FULL_REFUND` = đúng số đã thu, `PARTIAL_REFUND` = `actualRefundVnd` hoặc số đề xuất, không vượt số đã thu. Một giao dịch: ghi sổ thu `REFUND`, cập nhật `paid_vnd`/`balance_vnd`, hủy đơn khi cần, khóa đề xuất (đã xử lý → 409), báo kết quả cho người đề xuất, audit (08/10/2026). Đơn đã giao/hoàn tất không duyệt hủy được (409); hai lần duyệt hoàn tiền đồng thời → lần sau 409 (khoá lạc quan `paid_vnd`); hủy đơn trả lại mã giảm giá và báo khách mốc `CANCELLED` · **PO 15/10/2026:** duyệt KHÔNG ghi sổ hoàn — tạo việc "Cần hoàn tiền" (`followUp`), hoàn ở `follow-up`; đơn đang giao không tự duyệt khi quá hạn |
| POST | `/greeting-card/cancellation-requests/:id/follow-up` | `R6` · thêm `R10` khi còn tiền phải hoàn | `{ note? }` — Điều hành xác nhận đã xử lý đơn hệ thống tự huỷ (đề xuất từ chối nhận đơn của Điều phối quá hạn chưa duyệt). Khoản hoàn chỉ ghi vào sổ thu lúc này; bấm lặp → 409; tổ chức khác → 404 (14/10/2026) · Từ 15/10/2026 dùng cho MỌI khoản hoàn sau khi duyệt (không chỉ đơn tự huỷ) |
| POST | `/greeting-card/orders/:id/confirm-deposit` | `R4` + (`R11` hoặc chính sách cho Điều phối duyệt cọc) | Điều phối xác nhận tiền cọc (hoặc toàn phần) theo ảnh bill khách gửi; gắn ảnh bill làm chứng từ (14/10/2026). Người có `R11` (Điều hành) luôn duyệt được dù tiệm bật "chỉ Điều hành duyệt cọc"; cũng áp dụng khi Điều hành bấm Tiếp nhận đơn (16/10/2026) · Nhận `manualDispatch?`; với Chuỗi, xác nhận xong tự chọn cửa hàng như `accept` (trả `dispatch`) — cùng áp cho `confirm-payment`, SePay khớp tiền và tự duyệt sau 15 phút (22/10/2026) |
| POST | `/greeting-card/orders/:id/confirm-balance` | `R4` + chính sách | Điều phối xác nhận thanh toán Lần 2; cùng luật chặn thu sớm như Điều hành (hoa xong + khách duyệt ảnh, hoặc đã giao, hoặc khách đã báo chuyển khoản) (14/10/2026) |
| POST | `/greeting-card/orders/:id/accept` | `R4` | `{ note?, manualDispatch? }` — 1 Cửa hàng: Điều phối tiếp nhận đơn (→ Đã phân công, báo khách "đã nhận đơn"). **Chuỗi (PO 22/10/2026): "Xác nhận đã nhận tiền"** — chỉ ghi `COORDINATOR_PAYMENT_CONFIRMED`, không vào sản xuất, không báo khách; rồi chọn cửa hàng theo `chain_dispatch_policy.enabled` (bật = tự động phát lệnh, tắt = Điều phối chọn tay; `manualDispatch: true` = thủ công cho riêng đơn này). Trả thêm `dispatch: { mode: NOT_CHAIN\|MANUAL\|ALREADY_DISPATCHED\|AUTO, dispatched?, sentCount?, reason? }`. Đã ghi nhận tiền → 409. Khách nhận "đã nhận đơn" khi chi nhánh chốt làm |
| POST | `/greeting-card/orders/:id/reject` | `R4` | `{ reason }` (bắt buộc) — Điều phối từ chối nhận đơn → tạo đề xuất huỷ gửi Điều hành; quá hạn chưa duyệt thì hệ thống tự huỷ và giao việc hoàn tiền/liên hệ khách cho Điều hành (`/cancellation-requests/:id/follow-up`) |
| POST | `/greeting-card/tracking/dismiss` | `R1` (đề xuất) · có `R6` (Điều hành) thì bỏ trực tiếp | `{ id, type: ORDER\|SESSION, reasonId, reasonText, note? }` — bỏ hiển thị đơn/link CHƯA thu tiền, chưa vào khâu cắm. Đề xuất của Sale quá 5 phút chưa ai duyệt → bộ quét nền tự duyệt (ghi DB + lịch sử đơn + audit). Đang có đề xuất chờ → 409; tổ chức khác → 404 (14/10/2026); đơn/link ngoài phạm vi xem (sale "chỉ khách của mình") → 404 (16/10/2026) |
| POST | `/greeting-card/tracking/decide-dismiss` | `R6` (chỉ Điều hành) | `{ id, type, approve, note? }` — duyệt/từ chối đề xuất. Khách đã trả tiền hoặc đơn đổi trạng thái kể từ lúc đề xuất → 409, đơn giữ nguyên |
| POST | `/greeting-card/tracking/restore` | `R6` (chỉ Điều hành) | `{ id, type, reason? }` — chỉ khôi phục đơn/link đã BỎ HIỂN THỊ (đơn về trạng thái trước khi bỏ, link mở lại 7 ngày); đơn huỷ theo quy trình huỷ/hoàn → 409 |
| POST | `/greeting-card/change-requests/:id/decision` | `R3` | `{ approve, note? }` — duyệt/từ chối yêu cầu đổi thông tin đơn của khách (`ORDER_CHANGE_REQUEST`). Từ chối bắt buộc ghi lời nhắn ≥ 3 ký tự. Duyệt trong một giao dịch: đơn phải còn chưa cắm hoa (`production_status` `WAITING`/`ASSIGNED`, 409 nếu đã cắm/đã giao ship), giờ giao mới phải còn kịp (409), tổng đơn chưa đổi từ lúc đọc; ghi `delivery_window`, `delivery_address` (người nhận, SĐT, địa chỉ, `parts`, `zone`, `notes`, `mapUrl`), `card_message`. Đổi khu vực: phí TĂNG cộng phần chênh vào `total_vnd`/`balance_vnd` (+ `pricing_rule_ref.shippingChange`), phí GIẢM giữ nguyên tổng. Khoá yêu cầu (đã xử lý → 409), gửi `ORDER_CHANGE_DECISION` cho sale phụ trách, audit `greeting_card.order_change.approve\|reject`. Tổ chức khác → 404 (08/10/2026) |
| GET | `/greeting-card/tracking/timeline` | `R1` | Dòng thời gian của MỘT đơn (`orderId`) hoặc link (`sessionId`): `segments` (từng bước đã vào, thời gian ở bước so với thời gian chuẩn, `overMinutes`) dựng lại từ sự kiện theo đúng cách suy bước hiện có + sự kiện phân trang (`limit` ≤ 100, mặc định 50, `cursor`); phản hồi `{ orderId, sessionId, segments, data: [sự kiện], next_cursor, total }`. Ngoài phạm vi xem của sale → 404 (06/10/2026) |
| GET | `/greeting-card/integrations` | `R1` | Trạng thái webhook ngân hàng + kênh thông báo; KHÔNG trả khoá/bí mật |
| POST · DELETE | `/greeting-card/integrations/payment-webhook` | `F2` | POST sinh khoá SePay mới (trả MỘT lần, chỉ lưu băm SHA-256); DELETE tắt |
| PUT | `/greeting-card/integrations/notifications` | `F2` | `{ enabled, channel: ZNS\|ESMS, credentials?, templates? }` — credentials chỉ ghi, lưu AES-256-GCM |
| POST | `/greeting-card/integrations/notifications/test` | `F2` | `{ phone }` gửi một tin thử |
| GET | `/greeting-card/payment-events` | `R19` hoặc `R11` | Giao dịch ngân hàng nhận qua webhook (Kế toán chỉ xem), `?status=UNMATCHED…` · Sale "chỉ khách của mình" nhận danh sách rỗng |
| POST | `/greeting-card/payment-events/:id/handle` | `R11` | `{ note }` đánh dấu đã xử lý tay · Sale "chỉ khách của mình" → 404 |
| GET | `/public/brochure/:sendCode` | — | Trang khách: mẫu (giá theo Product Master, `null` = "Liên hệ" — vẫn đặt được, cửa hàng báo giá sau), size, khu vực giao, đơn + hướng dẫn chuyển khoản. Không lộ SĐT/id tổ chức. Link hết hạn/thu hồi/catalog ẩn (chưa có đơn) → 404 · CHỈ ĐỌC (06/10/2026): không còn ghi `OPEN` — máy quét xem trước Zalo/Facebook tải trang này. Mẫu tạm hết hàng theo `product_inventory` của chi nhánh sản phẩm vẫn trả ra với `available: false` (06/10/2026 — khách xem mẫu tương tự; chọn/đặt vẫn 409) · Chỉ chủ phiên (cookie `fl_b_<mã>`), thiếu → 404 |
| POST | `/public/brochure/:sendCode/claim` | — | Trình duyệt đầu tiên chạy trang nhận chủ phiên: đặt cookie HttpOnly `fl_b_<mã>` (HMAC `SESSION_SECRET`, 90 ngày), ghi `OWNER_CLAIMED` (khoá theo phiên) và báo đã mở như `/open`; `{ opened }`. Đã có chủ khác → 404. 30 lần/phút/IP. Từ 06/10/2026 mọi route `/public/brochure/:sendCode/*` khác chỉ nhận chủ phiên, thiếu cookie → 404 (xem `kien-truc/THE_CHAO_HANH_TRINH_KHACH.md`) |
| POST | `/public/brochure/:sendCode/unlock` | — | `{ phoneLast4 }` — mở lại link ĐÃ CÓ ĐƠN ở trình duyệt khác (Zalo → Safari, người nhà chuyển khoản hộ): đúng 4 số cuối SĐT người đặt → đặt cookie chủ phiên như `/claim` (ghi `OWNER_CLAIMED` nguồn `phone-verified`); sai số / phiên chưa có đơn → 404. 5 lần/15 phút mỗi IP × mã, 10 lần/ngày mỗi mã (08/10/2026) |
| POST | `/public/brochure/:sendCode/open` | — | Trình duyệt của khách báo đã mở link (gọi sau khi trang chạy JavaScript) → `CREATED → OPENED` + sự kiện `OPEN` đúng một lần; `{ opened }`. 30 lần/phút/IP. Trang khách nay dùng `/claim` |
| POST | `/public/brochure/:sendCode/event` | — | Chủ phiên báo một bước hành trình `{ event, productId? }` — `event` ∈ `collection_opened, product_viewed, product_liked, product_unliked, product_skipped, product_revisited, contact_zalo_clicked, contact_call_clicked, order_started, checkout_started, checkout_abandoned`; lưu `greeting_journey_events` tên viết hoa; `productId` lạ bị bỏ. 240 lần/10 phút/IP |
| POST | `/public/brochure/:sendCode/select` | — | Chỉ nhận `productId`; ảnh chụp mẫu dựng ở server |
| POST | `/public/greeting-catalog/:id/event` | — | `{ type: VIEW\|DETAIL\|FORM_OPEN\|LIKE\|UNLIKE, channel?, visitorId, productId? }` → 202; mã khách ngẫu nhiên trên máy, băm ở server (không lưu IP); mỗi khách × bước 1 lần/ngày (trừ LIKE/UNLIKE: ghi mọi lần, thao tác cuối quyết định); LIKE/UNLIKE bắt buộc `productId` thuộc bộ sưu tập (khác → 404) và không tính vào phễu kênh (07/10/2026); catalog ẩn → 404. Bước `ORDER` chỉ ghi ở server khi `POST /public/greeting-catalog/:id/order` thành công (thân đơn mang `tracking?`); lỗi ghi thống kê không làm hỏng đơn |
| POST | `/public/brochure/:sendCode/quote` | — | Báo giá `{ variantId?, quantity?, shippingZoneId?, voucherCode?, customerPhone?, selectedPromotionId?, deliveryDate? }` → `{ quote, errors, fullSlots }`. Ưu đãi do máy chủ tra lại trong bộ sưu tập, "Giảm %" trừ trên tổng đơn (`quote.promotionDiscountVnd`); `voucherCode` bị bỏ qua khi tiệm tắt mã giảm giá (`brochure_shipping.voucher_enabled`); `fullSlots` = nhãn khung giờ đã đủ đơn của `deliveryDate` (08/10/2026) `deliveryDate` trùng ngày lễ có phụ phí và bộ sưu tập bật `appliedPolicies.applyHolidaySurcharge` → `quote.holidaySurchargeVnd` + `holidayName`, cộng vào tổng sau ưu đãi (không bị mã giảm giá/ưu đãi trừ). Lúc đặt đơn: giờ chốt riêng của ngày lễ và số đơn tối đa ngày lễ (`brochure_holidays`, mặc định 500, đếm đơn chưa huỷ của cả tiệm giao ngày đó) — đủ → 400 `deliveryDate` (08/10/2026) · `paymentCode?` (mã thanh toán đặt cọc, KHÔNG giảm giá): máy chủ kiểm (B30, `HIEN_TRANG_THE_CHAO.md`) → `quote.paymentPlan { policy, depositPercent, source, paymentCode, campaignName, dueNowVnd, dueLaterVnd }`, `totalVnd` không đổi; mã sai → `errors.paymentCode`, policy giữ mặc định. Gửi đơn (`/order`) nhận cùng trường, kế hoạch chụp vào `pricing_rule_ref.paymentPlan`; hết lượt lúc tạo đơn → 400 `paymentCode`. Theo dõi công khai trả `order.payment` (đợt thanh toán, trạng thái, `balanceInstructions` QR phần còn lại khi hoa đã xong) (08/10/2026) · **Trần tổng chiết khấu (PO 07/11/2026):** mã giảm giá + chiết khấu hạng + ưu đãi "Giảm %" cộng lại không quá 50% tiền hàng và tiền hàng sau giảm không dưới giá sàn (giá vốn × hệ số Sàn); vượt thì cắt theo thứ tự ưu đãi → hạng → mã, `quote.discountCapped = true` |
| POST | `/public/brochure/:sendCode/order` | — | Tạo đơn (idempotent theo phiên, kể cả hai lần gửi đồng thời — lần thua nhận lại đúng đơn đã tạo); server báo giá lại, lựa chọn sai → 400 theo trường. Mẫu chưa niêm yết giá: đơn tổng 0, `quote.awaitingQuote = true`, không QR, không nhận mã giảm giá · Ô bẫy ẩn `website` có giá trị → 400; tối đa 5 đơn/giờ/SĐT người đặt → 429; mẫu hết hàng → 409 · **Khung giờ (08/10/2026):** `deliveryTimeSlot` là một khung 2 tiếng tiệm đang bật (`08:00 - 10:00` … `20:00 - 22:00`, cài ở `brochure_shipping.delivery_slots`) hoặc `Giờ cụ thể: HH:MM` (07:00–22:00, chỉ khi `allow_custom_time` ≠ false); khung tắt/không kịp chuẩn bị/nhãn lạ → 400 · **Ưu đãi & thỏa thuận (08/10/2026):** `selectedPromotionId?` — tối đa 01 ưu đãi, phải thuộc ưu đãi bộ sưu tập đang áp dụng (tiệm không cho chọn → máy chủ luôn lấy ưu đãi đầu tiên); bộ sưu tập có thỏa thuận thì bắt buộc `confirmedTerms: true`, thiếu → 400. Bản chụp ưu đãi + các thỏa thuận đã đồng ý lưu ở `orders.pricing_rule_ref.policies` | · 08/10/2026: tổng tiền đã trừ ưu đãi khách chọn và miễn phí giao khi tiệm bật `free_shipping_all`; khung giờ đủ đơn (`brochure_shipping.slot_capacity`, mặc định 100/khung, kiểm trong giao dịch có khoá) → 400 `deliveryTimeSlot` · Ưu đãi (PO 08/10/2026): có từ 2 ưu đãi đang áp dụng và cho khách chọn → bắt buộc `selectedPromotionId` (thiếu → 400 trường `selectedPromotionId`); báo giá chưa chọn tính không ưu đãi; ưu đãi Điều hành tạm tắt (`store_policies.promotions[].active = false`) không áp được · Sản phẩm theo dõi tồn theo số lượng: trừ tồn cùng giao dịch, không đủ → 409; huỷ / bỏ hiển thị đơn hoàn tồn, khôi phục đơn bỏ hiển thị trừ lại (không đủ → 409) (PO 07/11/2026, như đơn cổng chung Q9)
| POST | `/public/brochure/:sendCode/payment-notify` | — | Khách báo đã chuyển khoản (cần có đơn) |
| POST | `/public/brochure/:sendCode/payment-proof` | — (chủ phiên hoặc nhân viên tiệm) | `multipart: file, purpose=DEPOSIT\|BALANCE` — ảnh bill JPG/PNG/WebP ≤ 5MB (kiểm byte đầu tệp). Đơn đã huỷ / đã trả đủ → 409; đã nhận cọc thì ảnh luôn là Lần 2. AI đối soát bill chạy ngầm, kết quả chỉ để Điều hành tham khảo; tự duyệt chỉ khi tiệm bật và bill khớp. `payment-notify` nhận `proofAssetId` chỉ khi ảnh tải qua đúng link đó (14/10/2026) |
| POST | `/public/brochure/:sendCode/reorder` | — | Khách đặt thêm đơn từ link đã có đơn: tạo phiên mới (mã link + mã đơn mới) cùng sale, khách, bộ sưu tập; ghi sự kiện `REORDER`; trả `{ sendCode }` mới và cookie chủ phiên của phiên mới. Link chưa có đơn → 409. 10 lần/10 phút/IP |
| GET | `/public/brochure/:sendCode/history` | — | Nhóm đơn khách đặt từ cùng link (phiên gốc + các lần "Đặt thêm đơn", nối qua `REORDER.fromSendCode`, ≤ 30): `{ rootSendCode, members: [{ sendCode, createdAt, available, productName, order: { code, status, deliveryStatus, totalVnd, paidVnd, deliveryDate } \| null }] }`. Không trả SĐT/địa chỉ. Chỉ chủ phiên hoặc nhân viên tiệm (khác → 404). 60 lần/phút/IP |
| GET | `/public/brochure/tracking/:code` | — | Theo dõi theo mã đơn — chỉ đơn nguồn BROCHURE · Mặc định bản RÚT GỌN (PO 06/10/2026): tên người nhận viết tắt, chỉ phường + tỉnh, không lời nhắn thiệp, không ảnh người nhận, `order.verified = false`. `?link=<mã link của đơn>` kèm cookie chủ phiên của link đó trả đầy đủ (không có cookie → bản rút gọn). Không bao giờ trả SĐT |
| POST | `/public/brochure/tracking/:code` | — | `{ phoneLast4 }` — đúng 4 số cuối SĐT người đặt → bản đầy đủ; sai → 404 (không nói sai gì). 5 lần/15 phút/IP/mã đơn, và tối đa 10 lần/24 giờ/mã đơn tính chung mọi IP (07/10/2026 — chặn dò bằng cách đổi IP) |
| POST | `/public/brochure/tracking/:code/approve-photo` | — | `?link=<mã link của đơn>` bắt buộc, kèm cookie chủ phiên của đúng link đó; thiếu/sai → 404. Chỉ khi đã có ảnh thành phẩm (không → 409). Ghi QC `CUSTOMER_PHOTO_APPROVED` + sự kiện sản xuất, bấm lại không ghi trùng. 10 lần/phút/IP (08/10/2026) |
| POST | `/public/brochure/tracking/:code/change-request` | — | Người đặt xin đổi thông tin đơn: `{ deliveryDate?, deliveryTimeSlot?, recipientName?, recipientPhone?, addressParts?, shippingZoneId?, cardMessage?, deliveryNote?, mapUrl?, note?, phoneLast4? }` — chỉ gửi ô muốn đổi. Chứng minh là người đặt: `?link=<mã link của đơn>` + cookie chủ phiên, hoặc `phoneLast4` (dùng chung bộ đếm 5 lần/15 phút/IP và 10 lần/ngày/mã đơn với ô xác minh); sai → 404. Đơn đã cắm hoa/đã giao ship/huỷ → 409; không đổi gì hoặc dữ liệu sai (cùng luật form đặt hoa) → 400; đã có yêu cầu chờ → 409. Lưu `greeting_messages` `ORDER_CHANGE_REQUEST` (`sender_id = "customer"`, gửi Điều phối), không sửa đơn cho tới khi nhân viên duyệt. 10 lần/10 phút/IP. `GET`/`POST /public/brochure/tracking/:code` bản đầy đủ trả thêm `order.change = { current, shipping, lockedReason, pending, history }` (không có SĐT) (08/10/2026) |
| POST | `/public/brochure/tracking/:code/substitute-response` | — | Người đặt trả lời đề xuất đổi mẫu: `{ proposalId, choice: OPTION\|SHOP_DECIDES\|CANCEL, productId? (bắt buộc khi OPTION, phải thuộc các mẫu đề xuất), note? (≤ 300, bắt buộc khi CANCEL), phoneLast4? }`. Chứng minh như `change-request` (cùng bộ đếm); sai, đề xuất lạ hoặc đã trả lời → 404; hoa đã giao shipper → 409. Một giao dịch: chốt payload (`status = ANSWERED`, `choice`, `chosenProductId`, `customerNote`, `answeredAt` — bằng chứng khách đồng ý), dòng `[Đổi mẫu] …` vào ghi chú nội bộ; `OPTION` đổi `order_items` (`product_id`, `description`, `metadata` = bản chụp mẫu mới, giữ `price`, thêm `substitutedFrom`) và `greeting_sessions.product_snapshot`; tin `SUBSTITUTE_RESPONSE` gửi Điều phối. `CANCEL` không tự huỷ — tiệm dùng luồng đề xuất huỷ/hoàn tiền. 10 lần/10 phút/IP. Trang theo dõi bản đầy đủ trả `order.substitute = { pending, history }` (không mã nội bộ, không người đề xuất) (08/10/2026) |
| POST | `/public/brochure/tracking/:code/flower-substitute-response` | — | Người đặt trả lời đề xuất đổi hoa: `{ proposalId, choice: ACCEPT\|DECLINE, note? (≤ 300), phoneLast4? }`. Chứng minh như `substitute-response` (cùng bộ đếm); sai, đề xuất lạ hoặc đã trả lời → 404; hoa đã giao shipper → 409. Một giao dịch: chốt payload (`status = ANSWERED`, `choice`, `customerNote`, `answeredAt`), dòng `[Đổi hoa] …` vào ghi chú nội bộ; `ACCEPT` đổi đúng dòng hoa trong `order_items.metadata.flowers` (tên, màu; giữ số lượng, vai trò; thêm `substitutedFrom`), công thức đã đổi khác bản đề xuất → 409; tin `FLOWER_SUBSTITUTE_RESPONSE` gửi Điều phối. Trang theo dõi bản đầy đủ trả `order.flowerSubstitute = { pending, history }` kèm URL ký ảnh hoa thay thế |
| POST | `/public/greeting-catalog/:id/quote` | — | Như trên cho link bộ sưu tập công khai, kèm `productId` |
| POST | `/public/greeting-catalog/:id/order` | — | Đặt hoa từ link bộ sưu tập công khai · Cùng SĐT + mẫu + người nhận + ngày giao trong 10 phút → trả lại đơn vừa tạo (không tạo trùng); cùng ô bẫy, trần SĐT, chặn hết hàng như link riêng | · Cùng luật ưu đãi, miễn phí giao, trần khung giờ (kiểm trước khi tạo phiên) (08/10/2026)
| POST | `/public/greeting-catalog/:id/inquiry` | — | `{ productId, customerName, customerPhone, message, variantName?, website? }` → 201 `{ conversationId }`. Yêu cầu tư vấn mẫu "Liên hệ"/phiên bản theo ý khách (22/10/2026): tổ chức suy từ bộ sưu tập, mẫu ngoài bộ sưu tập → 404; khớp/tạo khách theo SĐT + hội thoại kênh `STOREFRONT_CATALOG`. 10 lượt/10 phút/IP, 5 yêu cầu/giờ/SĐT/tiệm (`RATE_LIMITED`), ô bẫy `website` |
| POST | `/public/brochure/:sendCode/inquiry` | — *(chủ phiên)* | Như `/public/greeting-catalog/:id/inquiry` cho link chào riêng: chỉ trình duyệt chủ phiên hoặc nhân viên (khác → 404); tổ chức và danh sách mẫu suy từ phiên của mã; hội thoại ghi kèm `sendCode` |
| GET | `/public/drive-thumbnail` | — | `?folder_id=` (Drive id `[A-Za-z0-9_-]{10,128}`, sai → 400) → `{ folder_id, file_id, thumbnail_url }` của file đầu tiên trong folder Drive công khai; dùng cho trang khách (màn nhập hàng loạt chuyển sang `POST /products/drive-thumbnails` từ 09/10/2026). 120 lần/phút/IP; cache trong tiến trình có trần (3000 mục, 6 giờ; kết quả rỗng chỉ nhớ 5 phút); gọi Drive timeout 5 giây (07/10/2026) |
| GET | `/public/drive-thumb-proxy` | — | `?folder_id=` như trên, hoặc `?file_id=` (link tệp `/file/d/<id>`, từ 09/10/2026) → trả thẳng ảnh thumbnail (trang khách Thẻ chào). Chỉ nhận `content-type: image/*`, tối đa 5 MB, `nosniff`; không có ảnh → 404. 120 lần/phút/IP (07/10/2026) |
| POST | `/public/payments/sepay` | — | Webhook SePay, `Authorization: Apikey <khoá>`; idempotent theo mã giao dịch; tự ghi thu theo mã đơn trong nội dung chuyển khoản |

## 24. Chưa có ở bản này

Endpoint mang khoá nhà cung cấp riêng của tổ chức. Quyết định D2 chốt nền tảng giữ khoá và tính credit, nên nhóm endpoint đó không tồn tại. Nếu D2 đổi về sau, nhóm này thêm vào dưới `/organizations/current/providers` mà không đụng tới endpoint nào đang có.

**Đã đánh dấu CHƯA XÂY trong chính các mục trên** (soát 18/09): mục 9 hàng đợi duyệt gộp · mục 16 toàn bộ M11 · bốn đường Integration ở mục 11 · `GET /crm/customers/export`, `/reminder-campaigns`, `/vouchers` ở mục 14 · `POST /orders/:id/delivery` ở mục 15 · `handoff` và `conversations/settings` ở mục 17 · `PATCH /catalog-links/:slug` và `/catalog-links/:slug/qr` ở mục 13 · `GET /ai-evaluations/…` ở mục 18. Gộp lại ở **RS-7** để anh Tony quyết cái nào còn trong kế hoạch, cái nào bỏ.

## 25. Bổ sung theo mã thật (05/10/2026)

> Các route dưới đây đã có trong mã nhưng chưa vào đặc tả (`npm run check:docs` bắt được). Ghi **đúng hiện trạng mã**, kể cả chỗ chưa đạt bốn luật ở mục 1 — **"chưa gác"** nghĩa là route chỉ gọi `requireTenantContext`, không kiểm mã năng lực ở route lẫn use-case: thành viên nào của tổ chức cũng gọi được. Chọn mã năng lực là quyết định của chủ sản phẩm — xem `TECHNICAL_DEBT.md` nợ #170, #171.

### 25.1 Content Engine — sinh nhanh tại chỗ

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| POST | `/content-engine/catalog-generate` | `J7` (PO 30/10/2026) | Writer→Critic qua `callCapability` (`content_generation`, `content_qa`) sinh badge/mô tả/CTA cho catalog. Nhận `productIds?` (≤ 50) để máy chủ tự đọc mô tả bán hàng đã duyệt (cần `H5`, thiếu thì bỏ qua). Chạy tại chỗ, **không trừ credit, không ghi `usage`, không có `Idempotency-Key`** |
| POST | `/content-engine/landing-generate` | `J7` (PO 30/10/2026) | Như trên cho landing page (hero/story/perks/faq/lead), lấy ngữ cảnh từ hồ sơ kinh doanh + thương hiệu |
| GET | `/shop-reviews` | `J1` | Danh sách đánh giá khách do chủ tiệm nhập (cả đang ẩn), mới nhất trước |
| POST | `/shop-reviews` | `J1` | Thêm đánh giá: `authorName` (1–60), `occasion?` (≤ 60), `rating` (1–5), `comment` (5–500), `isVisible?` |
| PATCH | `/shop-reviews/:id` | `J1` | Sửa nội dung (gửi đủ tên, sao, nhận xét) hoặc chỉ `isVisible`; tổ chức khác → 404 |
| DELETE | `/shop-reviews/:id` | `J1` | Xoá vĩnh viễn (giao diện hỏi xác nhận); tổ chức khác → 404 |
| POST | `/content-engine/rewrite` | một trong `F2`, `L2`, `L3` (PO 07/11/2026, nợ #170) | Viết lại MỘT câu ≤ 500 ký tự theo `field_type`/`style`, trả 3 gợi ý; parse lỗi thì trả gợi ý dựng sẵn (`fallback: true`) · Giới hạn 30 lần/10 phút mỗi người dùng và 200 lần/giờ mỗi tổ chức → 429 (audit API-02, 06/11/2026) · Trừ giá `content.rewrite` (1 credit) cho mỗi lượt AI trả gợi ý: giữ trước khi gọi AI, thiếu credit → 422 `QUOTA_EXCEEDED`; rơi về gợi ý dựng sẵn hoặc AI lỗi → hoàn lại; không gian trải nghiệm không trừ |

### 25.2–25.3 Thẻ chào (đã gộp)

Bảng hiện trạng 05/10/2026 của Thẻ chào (phía tiệm và phía khách) đã lỗi thời — mọi route đều đã gác mã năng lực và đã sửa các điểm nợ #171. Đặc tả đúng theo mã nằm ở **mục 23b** (gộp 06/10/2026).

### 25.3b Báo cáo vi phạm CSP (công khai)

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| POST | `/public/csp-report` | — *(công khai)* | Trình duyệt gửi báo cáo khi trang tải nguồn ngoài `Content-Security-Policy-Report-Only` (`next.config.ts`). Chỉ ghi log `csp.violation` (directive, nguồn bị vi phạm, đường dẫn trang không query); trả 204. 60 lần/phút/IP. Không chặn gì — nợ #175 |

### 25.4 Thùng rác kho dữ liệu (30 ngày)

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET · POST | `/storage/trash` | `G3` \| `L4` \| `A3` \| `B6` *(kiểm ở use-case)* | Liệt kê / chuyển vào thùng rác `{ id, type: RAW_ASSET \| APPROVED_ANALYSIS \| PRODUCT \| VIDEO \| CONTENT \| CATALOG \| GREETING_CATALOG \| LANDING }`. Chỉ vai Điều hành (một trong bốn mã). Mục đang được dùng (chứng từ, ảnh sản phẩm, chiến dịch, kênh bán…) → 409; catalog vào thùng rác thì thu hồi link, thẻ chào thì ẩn |
| POST | `/storage/trash/:id/restore` | như trên | Khôi phục `{ type }` |
| DELETE | `/storage/trash/:id` | như trên | Xoá vĩnh viễn, `?type=` bắt buộc · sản phẩm đã có đơn (dòng đơn hoặc lịch đặt) → 409, chỉ được lưu trữ · mục đang được dùng hoặc tổ chức legal hold → 409 · thẻ chào xoá kéo theo phiên khách, giữ đơn |
| GET | `/storage/library` | theo `type` *(kiểm ở use-case)*: `original`,`ai_image` → `G1`; `video`,`audio`,`content` → `I1`; `catalog`,`landing` → `J1`; `greeting_catalog` → `L1` | Kho dữ liệu v2. `?type=&scope=all\|hq\|<branchId>&q=&from=<ISO>&cursor=` → `{ items: [{ id, type, subtype, title, status, created_at, branch, thumbnail_url, drive_link, open_href }], next_cursor }`, 50/trang. Chi nhánh lấy theo người tạo (`memberships.branch_id`); nhân viên chi nhánh luôn chỉ thấy chi nhánh mình + trụ sở; id chi nhánh ngoài tổ chức → 404 |
| GET | `/storage/library/summary` | phiên | `?scope=` → `{ types, counts, is_chain, viewer_branch_id, branches }` — loại người xem có quyền, số mục mỗi loại theo phạm vi, chi nhánh của tổ chức; id chi nhánh ngoài tổ chức → 404 |


## 26. Bổ sung đợt smeOS đa ngành (17–21/10/2026)

Các route dưới đây được thêm từ mốc chuyển sang smeOS (`8c53b38`) nhưng chưa được ghi vào đặc tả. Mục này ghi theo mã thật sau đợt vá bảo mật ngày 21/10/2026. Năng lực là mã thật mà route kiểm. Với route công khai, cột năng lực ghi cơ chế gác thay cho mã.

### 26.1 Dùng thử và khả dụng theo ngành

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| POST | `/auth/instant-trial` | — *(công khai)* | Dùng thử không mật khẩu, kèm thu thập lead `{ name, phone, email, industry_key? }`. Tạo người dùng **mới**, tổ chức `EXPERIENCE` và dữ liệu mẫu theo ngành. Email đã có tài khoản → 409, không cấp phiên. Giới hạn 5 lần/giờ/IP. Từ 22/10/2026 **chờ superadmin duyệt**: trả `202`, không cấp phiên; lúc duyệt hệ thống sinh mật khẩu tạm để superadmin gửi cho khách. `industry_key` phải có trong danh mục ngành, `phone` đúng dạng số điện thoại, tên ≤ 120 ký tự → sai: 400 (rà soát cụm B) |
| POST | `/business-profile/mock-data` | `F2` (hoặc `H4`/`N1`/`N12`) | Nạp hồ sơ và sản phẩm mẫu theo ngành `{ industry_key? }`, ghi đè hồ sơ hiện có. **Chỉ tổ chức dùng thử (`EXPERIENCE`)** — tiệm thật → 403 (PO 21/10/2026) |
| GET | `/availability/board` | `L1` | `?month=YYYY-MM` — bảng khả dụng theo tháng (đặt phòng, khung giờ, tồn kho) |
| POST | `/availability/blocks` | `L3` | Chặn ngày thủ công `{ productId, checkInDate, checkOutDate, note? }` (ngày `YYYY-MM-DD`, ngày ra không tính) |
| DELETE | `/availability/blocks/:id` | `L3` | Bỏ chặn thủ công. Chỉ xoá được dòng không gắn đơn |
| POST | `/public/brochure/:sendCode/check-availability` | — *(chủ phiên Thẻ chào)* | Kiểm khả dụng sản phẩm trên link chào. 120 lần/phút/IP |
| POST | `/public/greeting-catalog/:id/check-availability` | — *(công khai)* | Kiểm khả dụng sản phẩm trên form đặt hàng của danh mục. 120 lần/phút/IP |

### 26.2 Thẻ chào — xác nhận đơn và điều phối chuỗi

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| POST · DELETE | `/greeting-card/orders/:id/confirm-order` | `R11` | Điều hành xác nhận (POST) hoặc từ chối đơn `{ reason }` (DELETE) — mô hình 1 cửa hàng. Từ chối tạo đề xuất huỷ (kèm hoàn tiền nếu có cọc) ở trạng thái chờ duyệt; khách chỉ nhận tin huỷ khi đề xuất được duyệt (`cancellation-requests/:id/decision`). Đơn còn đề xuất huỷ chờ duyệt → xác nhận đơn (và Điều phối nhận đơn) trả 409 (rà soát cụm G, 22/10/2026) |
| GET · POST | `/greeting-card/orders/:id/chain-dispatch` | `R4` | GET: danh sách chi nhánh đã sàng lọc và xếp hạng theo địa chỉ giao — toạ độ người nhận tra qua Goong (`GOONG_API_KEY`), đệm trong `order_coordinations.metadata.delivery_geo` theo địa chỉ chuẩn hoá ("không tìm thấy" thử lại sau 6 giờ); có toạ độ thì lọc theo bán kính chính sách, không thì `distanceKm: null`, `deliveryLocationResolved: false` và xếp hạng theo khu vực: `areaMatch` = `WARD` (cùng phường hoặc phường phục vụ) › `DISTRICT` › `PROVINCE` › `UNKNOWN`; chi nhánh khác tỉnh bị loại. POST: duyệt danh sách và gửi lời mời 1:1 cho từng chi nhánh, link kèm token chi nhánh (26.3). Mở vòng mời mới (giữ danh sách chi nhánh đã từ chối, không mời lại họ); đơn đã có chi nhánh nhận/chốt hoặc đơn đã huỷ/hoàn tất → 409. Phí gia công: GET trả `craftFee` (`suggestedVnd`, `lines`, `adjustPercent`, `finalVnd`); POST không gửi `subcontractPriceVnd` → chốt phí gợi ý theo `settings.craft_fee_policy`; gửi số ngoài ±`coordinatorAdjustPercent`% → 422 trừ khi người gửi có `R11` (ghi `overrideApprovedBy`); bản ghi lưu ở `subcontract_dispatch.craftFee`. Chỉ tổ chức mô hình Chuỗi (`organizations.type` = `CHAIN`/`FLOWER_NETWORK`, do Admin SaaS duyệt); 1 cửa hàng → 409 |
| GET | `/greeting-card/orders/:id/craft-fee` | `R4` | Phí gia công gợi ý của đơn theo phương án tiệm cài (6 cách tính, dùng chung mọi ngành; ngành khai nhãn và số khởi điểm): `{ feeLabel, suggestedVnd, lines, adjustPercent }`. Giá hàng luôn trước VAT, không gồm phí giao. Đơn của tổ chức khác → 404 |
| GET | `/greeting-card/chain-branches` | `R4` | Danh sách đối tác (chi nhánh / xưởng) của tổ chức: mã, tên, địa chỉ, SĐT, `isActive`, `telegramChatId`, `telegramLinked` (chat đã liên kết với tổ chức), `zalo`. Gồm cả chi nhánh không còn trong file Excel (nhập chỉ thêm / cập nhật) |
| PATCH | `/greeting-card/chain-branches/:branchCode` | `R4` | `{ isActive }` — bật / tạm dừng đối tác; tạm dừng → không được sàng lọc mời nhận đơn. Mã không thuộc tổ chức → 404; thiếu `isActive` → 400 |
| POST | `/greeting-card/chain-branches/bulk-import` | `R4` | Nhập danh sách chi nhánh vào `branches` có `accepts_dispatch` (trùng mã → cập nhật, giữ lịch sử phạt; ADR-012 T-4c). Tối đa 500 dòng, mã không trùng trong tệp, toạ độ/điểm KPI trong khoảng hợp lệ, SĐT và Telegram Chat ID đúng dạng; sai → 422. Chat ID nhập ở đây chỉ được dùng khi chat đó đã liên kết với tổ chức. Chi nhánh có địa chỉ mà thiếu vĩ độ/kinh độ được tự tra toạ độ qua Goong (tối đa 200 chi nhánh/lần); phản hồi có `geocoded`, `geocodeNotFound`, `geocodeSkipped`. Nhận thêm `ward`, `district`, `province` (hoặc `city` của file mẫu cũ), `serviceWards[]` (tối đa 50); ô vĩ độ/kinh độ trống → không lưu toạ độ. Tổ chức 1 cửa hàng → 409 |
| GET | `/greeting-card/integrations/zalo-dispatch` | `F2` | Trạng thái Zalo OA chung của nền tảng + mã liên kết (`ZL` + 8 ký tự, duy nhất toàn nền tảng, cột `branches.zalo_link_code`) của từng chi nhánh, có cờ đã liên kết |
| GET · PUT | `/greeting-card/integrations/staff-notifications` | `F2` | Đọc / sửa cấu hình kênh thông báo nhân viên trong phạm vi các kênh mà SaaS cho phép |
| PUT | `/greeting-card/integrations/staff-notifications/saas-policy` | *(phiên nền tảng)* `N2` | Người vận hành nền tảng cấp danh sách kênh cho `{ targetOrganizationId, allowedChannels }`. Không nhận phiên tenant |
| GET · POST · DELETE | `/greeting-card/integrations/telegram-dispatch` | `F2` | GET: trạng thái bot, `linkCode` của tổ chức, và các nhóm **đã gửi mã đó**. POST `{ chatId, message? }`: gửi thử, chỉ tới chat đã liên kết; chat khác (kể cả chat ID nhập cho chi nhánh) → 422. Chat đã nhắn mã được nhớ vào `settings.telegram_linked_chat_ids` (máy chủ ghi, tenant không sửa qua PATCH). Mọi tin của bot điều phối chung chỉ đi tới chat trong danh sách này. DELETE `?chatId=`: gỡ chat khỏi danh sách (chat không thuộc tổ chức → 404), ghi thời điểm gỡ vào `settings.telegram_unlinked_chats`; quét lại bỏ qua mã gửi trước lúc gỡ |

### 26.3 Thẻ Gia Công — Điều phối và link công khai cho chi nhánh

Link gửi cho chi nhánh có dạng `/subcontract/:orderCode?branch=<id>&t=<token>`. Token có dạng `<organizationId>.<hạn>.<HMAC(SESSION_SECRET)>`, ký cho đúng (tổ chức, mã đơn, chi nhánh), hạn chữ ký 120 ngày chỉ là trần an toàn (`subcontract-link-token.ts`). Mọi route công khai dưới đây kiểm token qua `loadSubcontractOrderForBranch`: tra đơn theo `(organization_id, code)`, chỉ chấp nhận đơn đang có phiên điều phối gia công, và chi nhánh phải còn quyền xem đơn ở `shared_order_access` (ADR-014 P-4, 07/11/2026: được mời ở vòng hiện tại, hoặc đang giữ/chốt đơn; chi nhánh khác nhận, hết vòng, huỷ nhận → mất quyền ngay; chi nhánh làm đơn còn 7 ngày sau khi đơn đóng). Token thiếu, sai, hết hạn, đơn không có phiên điều phối, hoặc chi nhánh không còn quyền đều trả cùng một 404. Trang gửi token bằng header `x-subcontract-token` (POST) hoặc `?t=` (GET).

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/public/subcontract/:orderCode` | — *(token chi nhánh)* | Thẻ Gia Công của chi nhánh. Chỉ chi nhánh đã nhận đơn thấy SĐT người nhận (từ khi đơn sẵn sàng giao), ảnh QC/giao hàng, shipper và yêu cầu bỏ qua; chi nhánh được mời khác chỉ thấy thông tin mời. 120 lần/phút/IP |
| POST | `/public/subcontract/:orderCode` | — *(token chi nhánh)* | `{ action: CLAIM \| CANCEL \| COMMIT \| DELETE_QC, branchId, photoUrl? }`. `DELETE_QC` chỉ dành cho chi nhánh đã nhận đơn, xoá đúng một ảnh khớp nguyên khoá, và chỉ khi ảnh chưa được duyệt (khác → 409). `COMMIT` lần hai không gửi lại tin (`alreadyCommitted`). `CANCEL`/`COMMIT` kiểm và ghi dưới khoá dòng. `CLAIM`: chỉ chi nhánh có trong lời mời vòng hiện tại (khác → 422); hai lượt nhận cùng lúc khoá dòng điều phối, chỉ một lượt thắng (lượt sau → 409). Thẻ mời Telegram lưu riêng theo chi nhánh (`inviteCards`): có chi nhánh nhận → thẻ các chi nhánh khác sửa thành "đã có chi nhánh khác nhận", gỡ nút; `CANCEL` trong hạn → thẻ các chi nhánh chưa từ chối trở về lời mời có nút "Nhận đơn ngay"; sang vòng mới/chuyển Điều phối → thẻ vòng cũ báo hết hạn. 30 lần/phút/IP |
| POST | `/public/subcontract/:orderCode/upload-qc` | — *(token, chi nhánh đã nhận)* | multipart `{ file, branchId }`. Ảnh thành phẩm ≤ 10MB (JPG/PNG/WebP), AI đối chiếu với ảnh mẫu. Chỉ khi đơn đã chốt, đang làm (`ASSIGNED`…`READY`) và chưa giao; khác → 409 |
| POST | `/public/subcontract/:orderCode/submit-shipper` | — *(token, chi nhánh đã nhận)* | `{ branchId, shipperName, shipperPhone, shipperNote? }`. Chỉ khi hoa `READY`, chưa giao, đơn chưa huỷ/hoàn tất; khác → 409. Đã có shipper → trả lại thông tin cũ |
| POST | `/public/subcontract/:orderCode/submit-delivery` | — *(token, chi nhánh đã nhận)* | multipart `{ file, branchId, note? }`. Ảnh giao hàng, AI kiểm; đạt thì đơn `DELIVERED/COMPLETED`. Chỉ sau bước shipper (`DELIVERING`), đơn chưa huỷ/hoàn tất; khác → 409 |
| POST | `/public/subcontract/:orderCode/request-bypass` | — *(token, chi nhánh đã nhận)* | `{ branchId, step, reason }`. Xin bỏ qua bằng chứng vì bất khả kháng, chờ Điều phối duyệt. Chỉ chi nhánh đã nhận đơn; công đoạn đang chờ duyệt hoặc đã duyệt → 409. Báo qua kênh điều phối của tổ chức (không rơi về nhóm chung); trả `coordinatorNotified` |
| POST | `/coordinator/orders/:id/approve-bypass` | `R3` | Điều phối duyệt hoặc từ chối yêu cầu bỏ qua bằng chứng. Chỉ yêu cầu đang `PENDING` (đã quyết → 409; duyệt đúp chỉ một lần thắng); duyệt mở bước tiếp theo khi đơn đang ở đúng bước và trừ 2 điểm KPI chi nhánh đúng một lần |
| POST | `/coordinator/orders/:id/approve-customer-photo` | `R3` | Điều phối duyệt ảnh thành phẩm thay khách: ghi `order_qc_records` `CUSTOMER_PHOTO_APPROVED` (cùng bản ghi khách tự duyệt trên trang theo dõi, `inspector_id` = người duyệt), bấm lại → `alreadyApproved: true`. Chưa có ảnh thành phẩm hoặc đơn đã huỷ → 409. Đơn gia công chuỗi: ảnh QC đạt được ghi thành ảnh thành phẩm (`assets` + `PRODUCT_PHOTO_UPLOADED`); nhập shipper (chi nhánh, Điều phối, duyệt bỏ qua) bị chặn 409 khi còn chờ khách theo chế độ duyệt ảnh của tiệm (PO 22/10/2026) |
| POST | `/coordinator/orders/:id/upload-qc-subcontract` | `R3` | Điều phối tải ảnh QC thay chi nhánh. Cùng điều kiện bước như `upload-qc` |
| POST | `/coordinator/orders/:id/set-shipper` | `R5` | Điều phối nhập thông tin shipper thay chi nhánh. Cùng điều kiện bước như `submit-shipper` |
| POST | `/coordinator/orders/:id/confirm-delivery` | `R5` | Điều phối xác nhận đã giao, kèm ảnh giao hàng nếu có. Hoa phải `READY`, đơn chưa huỷ/hoàn tất (được xác nhận cả khi chưa nhập shipper); khác → 409. Giao sau giờ hẹn (`delivery_window`) → tự trừ `lateDeliveryDeductionPercent`% phí gia công (mặc định 0%, mỗi đơn một lần; áp cả cho `submit-delivery` và duyệt bỏ qua ảnh giao hàng) |
| POST | `/coordinator/orders/:id/craft-fee-complaint` | `R3` | Điều phối ghi nhận khiếu nại `{ reason }` (5–500 ký tự) vào `craft_fee_complaints`; trừ `complaintDeductionPercent`% phí gia công một lần (mặc định 0% → chỉ ghi nhận). Đơn chưa có chi nhánh nhận → 409; đơn tổ chức khác → 404. Trả `{ deducted, payableVnd }` |
| POST | `/public/zalo-oa/webhook` | — *(chữ ký `X-ZEvent-Signature` = sha256(appId + thân + timestamp + OA secret key))* | Sự kiện Zalo OA chung. Tin `user_send_text` chứa mã liên kết → gắn `channels.zaloUserId` cho chi nhánh có mã (tổ chức suy từ mã). Sai chữ ký, sai `app_id` hoặc sự kiện lệch > 10 phút → 401. Lời mời gia công gửi qua OA khi chi nhánh không có Telegram; token OA niêm phong trong `platform_secrets`, làm mới dưới khoá dòng. 600 lần/phút/IP |
| POST | `/internal/chain-dispatch-sweep` | — *(cron, header `x-cron-secret`)* | Quét nhắc mốc M1–M4. Chỉ lấy phiên điều phối `OPEN`/`CLAIMED_GRACE`/`COMMITTED` của đơn chưa huỷ, chưa hoàn tất, chưa giao xong (lọc trong DB), duyệt hết theo trang 50 dòng (keyset theo `id`, tối đa 200 trang, ngân sách 90 giây — dưới `--max-time 120` của cron); lượt chồng lượt đang chạy bị bỏ qua nhờ khoá `pg_try_advisory_xact_lock` (phản hồi `skipped`). Phản hồi có `pages`, `complete`, `errorCount`; đơn còn `OPEN` đã hết hạn vòng nhận → mời vòng sau (không mời lại chi nhánh đã mời/đã từ chối) hoặc chuyển `ESCALATED` và báo `coordinator_channel.telegramChatId` khi hết vòng/hết ứng viên, do Render cron `smeos-cron-dispatch-sweep` gọi 5 phút/lần qua mạng nội bộ. Link trong tin nhắc dựng từ `NEXT_PUBLIC_APP_URL`. Production thiếu `CRON_SECRET` → luôn 401. `?forceStep=` chỉ có hiệu lực ngoài production. Phiên `CLAIMED_GRACE` đã hết `graceExpiresAt` mà chi nhánh không huỷ → hệ thống chốt `COMMITTED` dưới khoá dòng (cùng use-case với nút Chốt của chi nhánh, `commit-subcontract-claim.ts`), gửi tin bắt đầu làm một lần; phản hồi có `graceCommitted` (PO 22/10/2026). Giờ giao để tính mốc = cuối khung giờ (`parseDeliveryTimestampMs`, cùng hàm với thẻ chi nhánh). Cuối lượt (UJ-11, 07/11/2026): báo giá nháp/đã gửi quá ngày hiệu lực → `EXPIRED` (tối đa 500/lượt, phản hồi `quotationsExpired`); xét vòng đời gói cho tổ chức quá hạn/tới cửa sổ gia hạn/chưa nhận credit tháng (tối đa 200/lượt, cùng luật `checkSubscription`, phản hồi `subscriptions: { checked, failed }`); job video treo cũng giải phóng video kẹt `RENDERING` (UJ-03). `GET /quotations/:id` không còn ghi trạng thái hết hạn — chỉ hiển thị |
| GET | `/internal/health` | — *(cron, header `x-cron-secret`)* | Sức khoẻ chi tiết: độ trễ CSDL, Redis, job `PENDING`/`PROCESSING` quá 15 phút. `200` khi ổn, `503` khi `degraded`/`down` kèm `issues`. Cron `smeos-cron-dispatch-sweep` gọi sau mỗi lượt quét để Render báo lỗi. Không trả dữ liệu tenant. Sai/thiếu `x-cron-secret` → 401 theo envelope lỗi chung |

### 26.4 Console Vận hành Nền tảng

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/platform/nav-matrix` | *(phiên nền tảng)* | Ma trận điều hướng mặc định theo ngành và các ghi đè đang áp dụng |
| PUT | `/platform/nav-matrix` | `N12` | `{ overrides: { [industryKey]: navKey[] } }` — ẩn mục điều hướng theo ngành, áp cho mọi tổ chức của ngành đó. Ghi nhật ký kiểm toán nền tảng |
| GET | `/platform/ux-rollout-flags` | *(phiên nền tảng)* | Cờ rollout giao diện chuẩn Progressive Disclosure (03c E9): `{ keys, flags }` |
| PUT | `/platform/ux-rollout-flags` | `N12` | `{ flags: { [flagKey]: { mode: "off" \| "allowlist" \| "all", organizationIds } } }` — giá trị lạ thành `off`. Ghi nhật ký kiểm toán nền tảng |
| GET | `/platform/governance-matrix` | *(phiên nền tảng)* | Quyết định tầng Mẹ của ma trận quản trị |
| PUT | `/platform/governance-matrix` | `N12` | `{ decisions }` như trên, lưu `platform_settings` khoá `governance_matrix:<system>`, áp xuống mọi tổ chức. Ghi nhật ký kiểm toán nền tảng |
| PATCH | `/platform/organizations/:id` | `N2` *(kiểm ở use-case)* | Duyệt đổi mô hình tổ chức `{ target_type: SINGLE \| STORE \| CHAIN, note? }` (`FLOWER_NETWORK` gộp vào `CHAIN`, ADR-012 T-8b); xoá `settings.pending_model_change`. Đăng ký chọn "Chuỗi" chỉ tạo yêu cầu chờ duyệt này. `{ public_chat_limits_decision: "approve" \| "reject" }`: duyệt/từ chối yêu cầu nâng hạn mức chat công khai — duyệt ghi đúng mức đã xin (chỉ mức chọn sẵn, trần 200/600) vào `config.publicChatLimits` của kênh `STOREFRONT_CATALOG` và `LANDING_PAGE`; cả hai xoá `settings.pending_public_chat_limits`. Hiện ở màn `/van-hanh/phe-duyet`. `{ branch_scope_wave1: boolean }` (D-59, ADR-012 T-5): bật/tắt phạm vi chi nhánh đợt 1 — ghi `settings.branch_scope.wave1` + nhật ký `platform.branch_scope_wave_changed`; tổ chức không tự sửa khoá `branch_scope` qua `PATCH /organizations/current` |


## Thông báo đa tầng (27/10/2026)

Bảng `notification_*` (đặc tả 07 mục 33). Mã năng lực PO duyệt 28/10/2026 (audit AUD-002/003/004/009): đọc cấu hình cấp tổ chức `F1`, ghi `F2` (chỉ Điều hành); ghi cấu hình toàn sàn `N2`.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/notification/events` | — (phiên tenant) | Danh mục sự kiện hiển thị cho tầng `?tier=` (mặc định `STORE`), đã áp ma trận hiển thị của SaaS Mother |
| GET | `/notification/channels` | — (phiên tenant) | Trạng thái bật/tắt kênh toàn sàn (chỉ đọc) |
| GET | `/ux-rollout-flags` | — (phiên tenant) | Khoá các cờ rollout giao diện đang bật cho tổ chức của phiên `{ enabled: string[] }` — không trả danh sách tổ chức |
| GET | `/notification/inbox` | — (của chính mình) | Hộp thư của người dùng trong tổ chức hiện tại; `page` (≥ 1), `limit` (1–100, mặc định 20), `unreadOnly`; không phải số nguyên hoặc ngoài khoảng → 400 |
| PATCH | `/notification/inbox/:id/read` | — (của chính mình) | Đánh dấu đã đọc; tin của người/tổ chức khác → không đổi |
| POST | `/notification/inbox/mark-all-read` | — (của chính mình) | Đánh dấu đã đọc toàn bộ |
| GET | `/notification/stream` | — (của chính mình) | SSE tin mới; ping 25 giây. Hub trong bộ nhớ tiến trình (AUD-007) |
| GET · POST · DELETE | `/notification/push-subscriptions` | — (của chính mình) | Nhận Web Push trên trình duyệt này (checklist 4.30): `GET` trả khoá công khai VAPID khi tầng Mẹ đã bật kênh + số thiết bị của tôi (`?endpoint=` để biết trình duyệt này đã đăng ký chưa); `POST { endpoint, keys: { p256dh, auth } }` chỉ nhận endpoint https của dịch vụ đẩy thật (khác → 422), trần 30 lần / 10 phút / người; `DELETE { endpoint }` chỉ xoá thiết bị của chính mình |
| GET · PATCH | `/notification/preferences` | — (của chính mình) | Tuỳ chọn theo sự kiện × kênh; sự kiện bị khoá cứng trong phạm vi của tổ chức → 403 |
| GET · PATCH | `/notification/org-policy` | `F1` · `F2` | Chính sách tổ chức theo sự kiện × kênh × vai (`roleKey`, `*` = mọi vai) |
| GET · PATCH | `/notification/store-defaults` | `F1` · `F2` | Mặc định cửa hàng theo vai, có khung giờ |
| GET · POST · DELETE | `/notification/org-hard-locks` | `F1` · `F2` | Khoá cứng tầng `CHAIN`, phạm vi = tổ chức của phiên |
| GET · POST · DELETE | `/notification/store-hard-locks` | `F1` · `F2` | Khoá cứng tầng `STORE`, phạm vi = tổ chức của phiên |
| GET | `/platform/notification/events` | phiên nền tảng | Toàn bộ danh mục sự kiện |
| GET · PATCH | `/platform/notification/channels` | đọc: phiên nền tảng · ghi: `N2` | Bật/tắt kênh toàn sàn |
| GET · PUT | `/platform/notification/providers` | `N2` · `N2` | Sổ nhà cung cấp kênh SMS / Zalo / Web Push (checklist 4.30): đăng ký một lần cho cả hệ thống, lưu niêm phong trong `platform_secrets`; khoá bí mật không trả lại (`secretsSet`), ô bí mật để trống giữ khoá cũ, `provider: null` gỡ. Bật/tắt dùng kênh vẫn qua `/platform/notification/channels` |
| POST | `/platform/notification/providers/test` | `N2` | Gửi một tin thử: SMS / Zalo tới số điện thoại nhập vào; Web Push tới thiết bị chính người vận hành đã bật nhận tin; trả `{ success, error? }` (`NOT_CONFIGURED` khi chưa đăng ký) |
| GET · PATCH | `/platform/notification/visibility` | đọc: phiên nền tảng · ghi: `N2` | Ma trận hiển thị sự kiện theo tầng |
| GET · POST · DELETE | `/platform/notification/hard-locks` | đọc: phiên nền tảng · ghi: `N2` | Khoá cứng tầng `MOTHER` (`scope_id = "GLOBAL"`) |
| PATCH | `/coordinator/partners/:id/tools` | `F2` | Chuỗi mở khoá công cụ cho cửa hàng đối tác: `{ unlockedTools: string[] }` (mã `^[a-z0-9-]{1,64}$`, ≤ 200). `[]` = khoá hết, chưa cấu hình = mặc định. Chỉ ghi khoá `settings.unlocked_tools` bằng một câu lệnh. Quan hệ đối tác của chuỗi khác → 404 |

## 27. Đối tác chuỗi, chat nội bộ, dữ liệu chuỗi, ảnh sản phẩm (26–28/10/2026)

Mã năng lực gác ở route (audit PR #63, 28/10/2026 — trước đó nằm trong danh sách nợ #170). Tổ chức khác → 404.

| Phương thức | Đường dẫn | Năng lực | Ghi chú |
|---|---|---|---|
| POST | `/ad-banner-poster/copy` | `I1` | Sinh chữ cho banner quảng cáo — nhãn ưu đãi chỉ lấy từ ưu đãi tiệm đang bật (Hồ sơ tiệm), không tự đặt |
| GET | `/ad-banner-poster/copy` | `I1` | Danh sách tên ưu đãi tiệm đang bật — nguồn duy nhất cho ô "Ưu đãi của tiệm" trên poster |
| POST | `/ad-banner-poster/render` | `I1` | Dựng ảnh banner |
| GET · PUT | `/chain/collection-profile` | `F1` · `F2` | Hồ sơ thu thập dữ liệu chuỗi |
| POST | `/chain/collection-profile/preview` | `F1` | Xem trước theo hồ sơ |
| POST | `/chain/partner-stores` | `F2` | Tạo chi nhánh đối tác |
| GET | `/chain/stores-data` | `F1` | Tóm tắt dữ liệu các cửa hàng của chuỗi |
| GET | `/chain/stores-data/:id` | `F1` | Thư mục dữ liệu một cửa hàng; cửa hàng của tổ chức khác → 404 |
| POST | `/coordinator/orders/:id/dispatch-to-chat` | `R3` | Đẩy thẻ đơn sang chat với đối tác; chỉ đối tác ACTIVE của chính chuỗi (người nhận phải thuộc đối tác), khác → 404 |
| PATCH | `/coordinator/partners/:id/status` | `F2` | `{ status: ACTIVE\|SUSPENDED\|TERMINATED, reason }` — lý do bắt buộc; theo vòng đời (UJ-10): rút lời mời `PENDING → TERMINATED`, `ACTIVE ⇄ SUSPENDED`, chấm dứt; không kích hoạt thay cửa hàng, đã chấm dứt không mở lại (409); ghi `audit_logs`, báo cửa hàng (`CHAIN_LINK_STATUS_CHANGED`); chỉ chuỗi sở hữu quan hệ, khác → 404 |
| GET | `/chain/links` | `F2` | Phía cửa hàng: lời mời liên kết đang chờ (chưa quá 7 ngày) và chuỗi đang tham gia (UJ-10) |
| POST | `/chain/links/:id/accept` | `F2` | Cửa hàng đồng ý lời mời → `ACTIVE` (đặt lại cạnh chính); quá hạn → 409; liên kết của tổ chức khác → 404; báo chuỗi (`CHAIN_PARTNER_RESPONDED`) |
| POST | `/chain/links/:id/decline` | `F2` | Cửa hàng từ chối lời mời → `TERMINATED`; báo chuỗi |
| POST | `/chain/links/:id/leave` | `F2` | `{ reason }` — cửa hàng tự rời chuỗi → `TERMINATED`; ghi `audit_logs`, báo chuỗi |
| GET · POST | `/internal-chat/conversations` | `S1` | GET: phòng trong phạm vi tổ chức (và chi nhánh) hiện tại — phòng chuỗi mà tổ chức mình là bên kia hiện khi liên kết ACTIVE/SUSPENDED — kèm `counterpartName`, kèm `unreadCount` thật; `?type=` sai → 400. POST `{ partnerOrgId }` (chuỗi) · `{ chainOrgId }` (cửa hàng) · `{ branchId }` (chi nhánh của tổ chức mình): mở hoặc tạo lần đầu phòng của đúng cặp đó — liên kết phải ACTIVE/SUSPENDED, nhân viên gắn chi nhánh chỉ mở phòng chi nhánh mình, sai → 404. POST kiểu cũ: tạo/lấy hội thoại (`CHAIN_PARTNER` · `ORDER_THREAD`; `PLATFORM_TENANT` → 400); phòng 1-1 có sẵn thì dùng lại; `orderId` không thuộc tổ chức mình hoặc `targetUserId` ngoài tổ chức/đối tác liên kết → 404 |
| GET · POST | `/internal-chat/conversations/:id/messages` | `S1` | GET: trang tin **mới nhất** (`?limit=` 1–100, mặc định 50; `?before=<nextCursor>` lấy trang cũ hơn; trả `nextCursor`, hết = `null`); chỉ trang mới nhất mới đánh dấu đã đọc. POST: chỉ `{ content }` tin chữ ≤ 4 000 ký tự — trường khác (`actionPayload`, `attachments`, loại ≠ `TEXT`) → 400. Ngoài phạm vi phòng → 404; cửa hàng có liên kết tạm dừng chỉ đọc (gửi → 404) |
| POST | `/internal-chat/conversations/:id/images` | `S1` | multipart `files` (1–5 ảnh) + `caption`: kiểm byte thật (JPG/PNG/WebP, ≤ 10 MB/ảnh — quá → 413), cùng cổng quyền gửi như tin chữ (ngoài phòng / liên kết tạm dừng → 404), lưu `org/<tổ chức chủ phòng>/chat-<phòng>/…`, tạo một tin `IMAGE`; trả `{ data }` (201). Khi đọc phòng, `attachments` của tin ảnh là URL ký GET 1 giờ, chỉ cho khoá đúng thư mục phòng; giới hạn 20 lần/phút/người |
| PATCH | `/internal-chat/conversations/:id/mute` | `S1` | `{ muted }` — tắt / bật thông báo "tin nhắn mới" của phòng cho chính mình (ai đọc được phòng đều đổi được; ngoài phòng → 404). Thẻ mời nhận đơn gia công vẫn báo |
| PATCH · DELETE | `/internal-chat/messages/:id` | `S1` | Người gửi sửa (`{ content }`, ≤ 4 000 ký tự; tin chữ không rỗng) hoặc thu hồi tin chữ / ảnh của chính mình trong 24 giờ, cần quyền gửi vào phòng (liên kết tạm dừng → 404). Tin của người khác / ngoài phòng → 404; quá hạn, đã thu hồi, thẻ đơn, tin hệ thống → 409. Thu hồi = xoá mềm: phòng trả tin `isDeleted` không nội dung; ảnh (khoá đúng thư mục phòng) vào `storage_outbox` dưới tổ chức chủ phòng. Mỗi thay đổi ghi `audit_logs` (không ghi nội dung). Đọc phòng: tin đã sửa có `editedAt`, tin người xem còn đổi được có `canChange`; 30 lần/phút/người |
| GET | `/internal-chat/stream` | `S1` | SSE: `event: room` `{ conversationId }` khi phòng trong phạm vi tổ chức (và chi nhánh) của phiên có tin mới — không mang nội dung, trình duyệt đọc lại qua API; ping 25 giây, đóng sau 30 phút để trình duyệt nối lại; nhiều instance qua Redis pub/sub khi có `REDIS_URL` |
| GET | `/internal-chat/stats` | `S1` | `{ data: { days: 30, invites_in_chat, partner_claims, partner_stores } }` — 30 ngày của tổ chức người xem (chuỗi): lời mời đơn đăng vào Trao đổi nội bộ, đơn cửa hàng đối tác đã nhận, số cửa hàng đối tác trong vòng bắn đơn; không có cửa hàng đối tác → 0. Danh sách phòng (`GET /internal-chat/conversations`) phía chuỗi kèm `activeOrderCount` cho phòng cửa hàng đối tác |
| GET | `/internal-chat/unread` | `S1` | `{ data: { unread_count } }` — tổng tin chưa đọc của người xem trong tối đa 100 phòng gần nhất (số đếm cạnh mục menu "Trao đổi nội bộ") |
| POST | `/internal-chat/messages/:id/action` | `S1` + `S2` | Nhận / từ chối thẻ đơn (`rejectedReason` ≤ 500). Chỉ tổ chức `assignedPartnerOrgId`, không phải người gửi, thẻ còn `PENDING_ACCEPT`; sai quyền → 404, đã xử lý → 409. Gộp trạng thái vào thẻ, giữ mã đơn / giá / ảnh |
| GET | `/noi-bo/identity` | `F1` | Danh tính nội bộ của phiên, kèm tên + email thành viên (gác `F1` như `GET /members` từ 11/11/2026, trước đó mọi vai đọc được); lỗi không trả chi tiết/stack · Lỗi theo envelope chung: chưa đăng nhập/phiên bị thay → 401, không có tổ chức → 404 (trước 06/11/2026 mọi lỗi ra 500 `IDENTITY_ERROR` — audit API-04) |
| POST | `/organizations/current/language-unlock-request` | `F2` | Xin mở thêm ngôn ngữ |
| GET | `/platform/orgs-data` | `N1` | Trung tâm dữ liệu xuyên tổ chức |
| GET | `/platform/orgs-data/:id` | `N1` | |
| GET | `/platform/orgs-data/:id/records/:id` | `N1` | |
| GET | `/platform/orgs-data/:id/export` | `N1` | Tải ZIP (CSV + ảnh) |
| PUT | `/platform/orgs-data/:id/legal-hold` | `N14` | Đặt/gỡ legal hold cho cả tổ chức; thân `{ until: ISO \| null, reason }`; chặn mọi xoá vĩnh viễn của tổ chức (API, thùng rác, cron, hàng đợi xoá tệp, dọn bàn giao) |
| PUT | `/platform/orgs-data/:id/assets/:id/legal-hold` | `N14` | Đặt/gỡ legal hold cho một asset; thân `{ until: ISO \| null, reason }`; ghi nhật ký nền tảng (SDAGF D-04) |
| GET | `/platform/pending-approvals` | `N1` | Tài khoản chờ duyệt |
| GET · POST | `/product-image-set` | — *(công khai)* · `I1` | GET: danh sách gói ảnh (tĩnh, route không kiểm phiên — sửa 09/11/2026 theo mã, audit API §28); POST: tạo bộ ảnh |
| GET | `/product-image-set/:id` | `G1` | |
| GET · POST | `/product-photo` | — *(công khai)* · `I1` | GET: nền/tỉ lệ có sẵn (tĩnh, route không kiểm phiên — sửa 09/11/2026 theo mã, audit API §28); POST: tạo ảnh studio |
| GET | `/product-photo/:id` | `G1` | |
| POST | `/product-photo/:id/retry` | `I1` | |
| GET | `/store/collection-transparency` | `F1` | Dữ liệu chuỗi đang thu của cửa hàng |

## 28. Nhóm công cụ 6 — Tính giá và tối ưu lợi nhuận (29/10/2026)

Mọi route trả 422 "Ngành của cửa hàng chưa được hỗ trợ cho công cụ tính giá" khi ngành khai `costing: null` (trừ `/costing/profile`). Tài nguyên khác tổ chức → 404.

| Phương thức | Đường dẫn | Mã năng lực | Ghi chú |
|---|---|---|---|
| GET | `/costing/profile` | `L1` | `{ supported, industryKey, spec, config }` — hồ sơ tính giá của ngành ⊕ ghi đè của cửa hàng |
| GET | `/costing/materials` | `L5` | Nguyên liệu kèm `priceChange` (cảnh báo biến động); `?include_inactive=true` |
| POST | `/costing/materials` | `L6` | `{ name, unit, category_key, unit_cost_vnd?, supplier_name?, on_hand_qty? }` — có đơn giá thì ghi mốc lịch sử đầu |
| PATCH | `/costing/materials/:id` | `L6` | Sửa từng trường; đổi `unit_cost_vnd` ghi một dòng `material_price_history` |
| GET | `/costing/materials/:id/history` | `L5` | Lịch sử đơn giá, mới nhất trước |
| GET | `/costing/recipes/:productId` | `L1` | `{ product, recipe, draft }` — chưa có công thức thì `draft` đọc từ BOM AI qua bộ chuyển đổi của ngành |
| PUT | `/costing/recipes/:productId` | `L3` | `{ lines: [{ material_id, quantity }], waste_percent?, labor_minutes?, note? }` — thay toàn bộ, tăng phiên bản |
| GET | `/costing/products/:productId/cost` | `L5` | Giá vốn phân rã + `missingPrices` + kịch bản giá (chỉ khi đủ dữ liệu); `?competitor_vnd=` |
| GET | `/costing/needs` | `L5` | `?from=YYYY-MM-DD&to=YYYY-MM-DD` — dự toán mua cho đơn `CONFIRMED`/`PROCESSING` giao trong khoảng |
| POST | `/costing/needs/purchase` | `L6` | `{ items: [{ material_id, quantity, unit_cost_vnd? }] }` — "đã mua": cộng `on_hand_qty`; có giá mua thì cập nhật đơn giá + lịch sử nguồn `PURCHASE`. Nguyên liệu khác tổ chức → 404, không ghi gì |
| POST | `/costing/products/:productId/price` | `L3` | `{ price_vnd, scenario }` — áp giá bán (R3, giao diện bắt xác nhận) vào `attributes.price`; ghi `audit_logs` `product.price.apply` (giá cũ/mới, giá vốn lúc áp) cùng giao dịch |

`PUT /pricing-rules` nhận thêm 4 khoá của nhóm này: `labor_rate_per_hour`, `default_packaging_vnd` (VNĐ ≥ 0), `overhead_percent` [0,100], `price_change_alert_percent` [1,100].

## 29. Trung tâm Tích hợp (30/10/2026)

Kế hoạch: `docs/kien-truc/KE_HOACH_TRUNG_TAM_TICH_HOP.md`. Mọi route có phiên đọc `organization_id` từ `requireTenantContext`; kết nối/sự kiện của tổ chức khác trả 404. Không route nào trả bí mật.

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/integrations` | `W1` | Tổng quan, danh mục theo tầng và gói, kết nối hiện có |
| POST | `/integrations/connections` | `W2` | Kết nối bằng khoá `{ connectorKey, secret }`; máy chủ kiểm khoá với nhà cung cấp rồi mới lưu (đã mã hoá); 201 |
| DELETE | `/integrations/connections/:id` | `W2` | Ngắt kết nối, thu hồi phía nhà cung cấp nếu hỗ trợ, xoá khoá đã lưu |
| POST | `/integrations/connections/:id/rotate` | `W3` | Đổi khoá — kiểm khoá mới trước khi thay |
| POST | `/integrations/connections/:id/test` | `W3` | Kiểm tra kết nối ngay, cập nhật trạng thái |
| GET | `/integrations/connections/:id/events` | `W1` | Nhật ký sự kiện, lọc `status`, `limit` tối đa 100 |
| POST | `/integrations/events/:id/replay` | `W5` | Đưa sự kiện `FAILED`/`DEAD` về hàng chờ |
| GET | `/integrations/governance` | `W4` | Chuỗi xem chế độ đặt cho cửa hàng thành viên theo từng đầu nối khoá được, kèm khoá tầng trên (`lockedByUpper`). Không phải chuỗi → 404 |
| PUT | `/integrations/governance` | `W4` | `{ connectorKey, mode: FORBID \| INHERIT_ONLY \| ALLOW_OWN }`; phạm vi là chính chuỗi của phiên. Tầng trên đã khoá → 422 `violation: LOCKED_BY_UPPER`; cửa hàng → 422 `STORE_CANNOT_LOCK`; đầu nối chưa thực thi khoá → 422 `NOT_GOVERNABLE`. Báo cho cửa hàng thành viên, ghi audit |
| GET | `/platform/integrations/governance` | `N16` *(phiên vận hành)* | Tham số `scope` = `GLOBAL` hoặc `industry:<key>`; trả kèm danh sách ngành |
| PUT | `/platform/integrations/governance` | `N16` *(phiên vận hành)* | `{ scopeId, connectorKey, mode }`; ngành không đổi được khi Mẹ đã khoá (422). Ghi `platform_audit_logs` |
| GET | `/integrations/connections/:id/sales` | `W1` | Kết nối kênh bán: tin đăng (tối đa 100) và 50 đơn gần nhất. Kết nối không phải kênh bán hoặc của tổ chức khác → 404 |
| POST | `/integrations/connections/:id/sales/publish` | `W3` | `{ productIds }` 1–100. Sản phẩm thiếu dữ liệu (chưa mở bán/giá/ảnh) không đẩy lên kênh, ghi lý do; kênh từ chối → ghi lý do của kênh. Kết nối lỗi hoặc cấp trên khoá → 422. Ghi audit |
| POST | `/integrations/connections/:id/sales/unpublish` | `W3` | `{ productIds }` 1–100 — gỡ tin đã đăng. Ghi audit |
| POST | `/integrations/connections/:id/sales/availability` | `W3` | Đẩy còn/hết hàng (theo trạng thái mở bán — chưa có số tồn, nợ #95) cho mọi tin đã đăng, lô 100 |
| POST | `/public/integrations/:connector/:ref` | — *(chữ ký của đầu nối)* | Cổng webhook chung: giới hạn tần suất theo IP và theo `ref`, thân tối đa 256 KB, xác thực chữ ký → ghi nhật ký (chống trùng) → 200. Sai chữ ký/sai `ref`/kết nối đã ngắt đều trả cùng một 401 |
| POST | `/internal/integrations-sweep` | — *(cron, header `x-cron-secret`)* | Xử lý tối đa 100 sự kiện đến hạn (sự kiện `order.*` của kênh bán → lấy chi tiết đơn qua API rồi nhập vào Đơn hàng, chống trùng), kiểm sức khoẻ tối đa 50 kết nối và kéo đơn dự phòng cho tối đa 20 kết nối kênh bán mỗi lượt (mỗi kết nối tối đa 30 phút/lần). Gọi sau cùng trong cron `smeos-cron-dispatch-sweep` 5 phút/lần |

## 30. Marketing & Sales Center (PO 01/11/2026)

Kế hoạch: `docs/kien-truc/Nâng cấp tasks/SMEOS_Marketing_Sales_Center/03_KE_HOACH_TRIEN_KHAI.md`. Mọi route dưới đây giải tổ chức từ phiên; ID tham chiếu nhận từ body (khách, lead, sản phẩm, chiến dịch, nơi dùng tư liệu) phải thuộc cùng tổ chức, không thì 404. "`A` hoặc `B`" nghĩa là có một trong hai mã là đủ.

### 30.1 Nơi dùng tư liệu và chiến dịch

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/asset-usages` | `M1` | Lọc `source_type`+`source_id`, `destination`, `status`; `limit` ≤ 100 |
| POST | `/asset-usages` | `M2` | Kiểm CTA theo nơi dùng và nơi dùng theo loại tư liệu; kênh link/QR tạo short link; `campaignId` của tổ chức khác → 404 |
| PATCH | `/asset-usages/:id` | `M2` | Đổi tiêu đề, CTA, nơi dùng, cấu hình, trạng thái |
| GET | `/campaigns` | `M1` | Lọc `status`, `objective`; cursor + `limit` ≤ 100; kèm `counts` theo trạng thái |
| POST | `/campaigns` | `M3` | |
| GET | `/campaigns/:id` | `M1` | Kèm số liệu và danh sách nơi dùng gắn chiến dịch |
| PATCH | `/campaigns/:id` | `M3` | |
| GET | `/marketing-center/kpis` | `M1` hoặc `Q1` | `time_window` `7D`·`30D`·`90D`·`ALL` (mặc định `30D`); quy thuộc lần chạm đầu |
| POST | `/ad-banner-poster/save` | `G2` | Lưu banner PNG đã dựng vào thư viện kèm mã loại tư liệu; kiểm nội dung tệp (chữ ký PNG, ≤ 20 MB) trước khi ghi kho |

### 30.2 Báo giá

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/quotations` | `R15` hoặc `Q1` | Lọc `status`, `leadId`, `customerId`, `search`; cursor + `limit` ≤ 100; kèm `counts` |
| POST | `/quotations` | `R15` | Tạo báo giá nháp, mã nội bộ `BG-xxxx`, token công khai ngẫu nhiên 256 bit |
| GET | `/quotations/:id` | `R15` hoặc `Q1` | |
| PATCH | `/quotations/:id` | `R15` | Báo giá đã chuyển thành đơn không sửa được · nhận `shippingFee` và `items[].variantLabel`; tổng = tạm tính − ưu đãi + phí vận chuyển |
| POST | `/quotations/:id/send` | `R15` | Sang `SENT`; lead gắn kèm sang `QUOTATION_SENT` |
| GET | `/quotations/:id/revisions` | `R15` | Các phiên bản trước của báo giá, mới nhất trước: `{ version, snapshot, createdBy, createdAt }`; mỗi lần sửa nội dung (dòng, ưu đãi, phí vận chuyển, hạn, điều khoản, ghi chú) lưu ảnh chụp bản trước đó, đổi trạng thái không lưu · báo giá tổ chức khác → 404 |
| POST | `/quotations/:id/convert` | `R15` | Tạo đơn nguồn `QUOTATION` qua cổng nhận đơn chung; hai lệnh đồng thời chỉ một lệnh tạo đơn |
| GET | `/public/quotation/:token` | — *(token ngẫu nhiên trong URL)* | Không đăng nhập; giới hạn 60 lượt/phút; báo giá nháp → 404; không trả số điện thoại, ghi chú nội bộ, mã tổ chức |

### 30.3 Nhóm khách và chăm sóc

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/customer-segments` | `M4` hoặc `Q1` | Lọc `kind`, `search`; `limit` ≤ 100 |
| POST | `/customer-segments` | `M4` | Nhóm `DYNAMIC` theo điều kiện hoặc `STATIC` |
| GET | `/customer-segments/:id` | `M4` hoặc `Q1` | |
| PATCH · DELETE | `/customer-segments/:id` | `M4` | |
| GET | `/customer-segments/:id/customers` | `M4` hoặc `Q1` | Khách thoả điều kiện nhóm, phân trang |
| GET | `/customer-interactions` | `Q1` | Nhật ký tương tác toàn tổ chức; lọc `customer_id`, `channel`, `direction` |
| GET | `/customers/:id/interactions` | `Q1` | |
| POST | `/customers/:id/interactions` | `M4` hoặc `Q1` | Ghi tương tác thủ công (Zalo, gọi, SMS…); khách của tổ chức khác → 404. Sale chỉ có `Q1` được ghi tương tác với khách mình chăm sóc — thao tác hằng ngày của sale (PO 03/11/2026) |

### 30.4 In ấn

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| POST | `/print/preflight` | `M5` hoặc `Q1` | Kiểm quy cách theo preset (kích thước, DPI, vùng an toàn, cỡ mã QR); không ghi |
| GET | `/print/renditions` | `M5` hoặc `Q1` | Lọc `preset_code`, `status`, `source_type` |
| POST | `/print/renditions` | `M5` | `assetUsageId` của tổ chức khác → 404 |
| GET | `/print/renditions/:id` | `M5` hoặc `Q1` | |
| POST | `/print/renditions/:id/export` | `M5` | Xuất PDF; ghi audit xuất dữ liệu |

### 30.5 Bộ nhận diện thương hiệu

| Method | Path | Năng lực | Ghi chú |
|---|---|---|---|
| GET | `/organization/brand` | `F1` | |
| PUT · PATCH | `/organization/brand` | `F2` | |
