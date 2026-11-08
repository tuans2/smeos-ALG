# Sổ tay vận hành smeOS (bàn giao)

Bản nháp bàn giao 28/10/2026 — soạn từ mã nguồn (`render.yaml`, `package.json`, `.env.example`, `CLAUDE.md`) và kết quả audit (`docs/audit/`). Mục đánh dấu **[CẦN XÁC NHẬN]** chưa có bằng chứng trong repo; chủ sản phẩm điền trước khi giao cho khách.

## 1. Thành phần hệ thống (Render, vùng Singapore)

| Dịch vụ | Loại | Vai trò | Lệnh chạy |
|---|---|---|---|
| `smeos-web` | web (Node 22, Next.js 16) | Ứng dụng + API `/api/v1/*` | build: `npm ci --include=dev && npx prisma generate && npm run db:deploy && npm run db:seed && npm run build`; start: `npm run start` |
| `smeos-worker-media` | worker (Python) | Xử lý ảnh/biến thể sản phẩm | `python -m media_ai.jobs.worker` |
| `smeos-worker-video` | worker (Python) | Dựng video | `python -m media_ai.video.video_worker` |
| `smeos-worker-vision` | worker (Python) | Phân tích ảnh sản phẩm | xem `render.yaml` |
| `smeos-cron-dispatch-sweep` | cron, mỗi 5 phút | Nhắc việc điều phối chuỗi + kiểm sức khoẻ | gọi `POST /api/v1/internal/chain-dispatch-sweep` rồi `GET /api/v1/internal/health` (header `x-cron-secret`) |
| `smeos-postgres` | PostgreSQL 16 (`basic-256mb`) | Dữ liệu chính, mọi bảng tenant có `organization_id` | — |
| `smeos-redis` | Key Value 256 MB | Bộ đếm giới hạn tần suất dùng chung | chỉ mạng nội bộ Render |

Kiểm tra sức khoẻ: Render gọi `GET /api/health` (tiến trình + CSDL). `GET /api/health/ready` thêm điều kiện Redis trên production — dùng khi chạy nhiều instance. Cron kiểm `GET /api/v1/internal/health` mỗi 5 phút (CSDL, Redis, job tồn đọng, worker còn sống); không khoẻ → 503 → lượt cron thất bại → Render báo lỗi.

## 2. Biến môi trường

Danh sách đầy đủ và giải thích: `.env.example`; giá trị thật chỉ nằm trong Render (đều `sync: false`, không có trong repo).

Bốn biến bắt buộc để app khởi động (`src/lib/env.ts`) do blueprint tự cấp, **không phải nhập tay**: `DATABASE_URL` (`fromDatabase`), `SESSION_SECRET`, `SSO_SESSION_SECRET`, `INTEGRATION_TOKEN_SECRET` (`generateValue`). `CRON_SECRET` cũng `generateValue` ở `smeos-web`; cron lấy lại đúng giá trị đó qua `fromService.envVarKey` nên hai dịch vụ luôn khớp. Mọi khoá `sync: false` còn lại là tuỳ chọn: thiếu thì tính năng tương ứng tắt, blueprint vẫn sync và app vẫn chạy. Link công khai rơi về `RENDER_EXTERNAL_URL` do Render tự cấp; chỉ khi gắn tên miền riêng mới thêm `NEXT_PUBLIC_APP_URL` trên Render.

| Nhóm | Biến | Thiếu thì sao |
|---|---|---|
| Bắt buộc khởi động | `DATABASE_URL`, `SESSION_SECRET`, `INTEGRATION_TOKEN_SECRET`, `SSO_SESSION_SECRET` | ứng dụng dừng ngay lúc khởi động (`src/lib/env.ts`) |
| Cron | `CRON_SECRET` | endpoint nội bộ đóng hẳn trên production |
| AI | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`… | cổng AI báo `HET_DUONG_DU_PHONG` khi không còn nhà cung cấp nào dùng được |
| Lưu trữ | `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION` | không tải/xem được ảnh |
| Chat Facebook | `FB_APP_SECRET`, `FB_WEBHOOK_VERIFY_TOKEN` | **webhook từ chối mọi sự kiện (401/403)** — cố ý, xem §5 |
| Zalo OA nền tảng | `ZALO_OA_APP_ID`, `ZALO_OA_APP_SECRET`, `ZALO_OA_REFRESH_TOKEN`, `ZALO_OA_WEBHOOK_SECRET` | không mời/nhắc chi nhánh qua Zalo |
| Theo dõi lỗi | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` — đặt ở **cả** `smeos-web` và 3 worker | không gửi lỗi lên Sentry, chỉ còn log JSON |
| Dữ liệu mẫu | `SEED_DEV_DATA` = `"false"` trên production | để `"true"` sẽ nạp tài khoản demo có mật khẩu cố định — **không bật trên production** |
| Cách ly CSDL | `DB_RLS_MODE` = `off` · `audit` · `enforce` — đặt ở `smeos-web` và 3 worker (blueprint: `audit`) | thiếu = `off`: không đặt ngữ cảnh tổ chức, RLS không chặn; xem §12 |
| Mã hoá dữ liệu cá nhân | `PII_ENCRYPTION_KEY` — 32 byte base64, **chỉ** ở `smeos-web`, người vận hành tự tạo và sao lưu (§14) | trước P-5c: chưa mã hoá, log `pii.encryption_disabled`; từ P-5c bắt buộc — thiếu thì ghi/đọc dữ liệu cá nhân báo `PiiKeyRequiredError` |
| Tên miền riêng | `RENDER_API_KEY` (bí mật, `sync: false`), `RENDER_SERVICE_ID` (mã dịch vụ `smeos-web`, dạng `srv-…`), `CUSTOM_DOMAIN_TARGET` (máy chủ cửa hàng trỏ CNAME về, mặc định lấy từ `RENDER_EXTERNAL_URL`) — chỉ ở `smeos-web` | thiếu khoá: cửa hàng vẫn xác minh được, tên miền ghi `MANUAL`, vận hành thêm tay; xem §13 |

Zalo OA của **từng tiệm** (chat bán hàng) không dùng biến môi trường: tiệm nhập OA ID, App ID, Secret Key, Access Token trong *Hội thoại → Kênh tích hợp*.

## 3. Triển khai bản mới

1. Mở PR vào `main`; CI (`.github/workflows/ci.yml`) phải xanh: typecheck, lint ratchet, UX lint, unit, tenant, platform, build, E2E, worker pytest, gitleaks, `npm audit` (high), ratchet thuật ngữ ngành (job `industry-terms`).
2. Merge → CI chạy lại trên `main`. `render.yaml` đặt `autoDeployTrigger: checksPass` cho cả 5 dịch vụ, nên Render **chờ check CI của commit đó xanh rồi mới deploy** (web + 3 worker + cron). Không có job `deploy` trong CI, không có deploy hook, không có secret `RENDER_DEPLOY_HOOK_*` (PO 05/11/2026). Deploy tay khẩn cấp: nút *Manual Deploy* trên Render.
   Cổng "chỉ phát hành bản đã qua kiểm" (P0-02, D-14) do **chính Render** thực thi. Hai điều cần nhớ: (a) commit trên `main` không sinh check nào thì Render **không** deploy — hỏng theo hướng an toàn; (b) đổi tên hoặc xoá một trong 5 job CI là nới cổng production, không chỉ là sửa CI. Ruleset `main` (*Settings → Rules → Rulesets*: bắt buộc PR + 5 check, chặn push trực tiếp/force push) vẫn nên bật, nhưng giờ là lớp phòng vệ thứ hai.
   **Sau lần sync blueprint đầu:** mở *Render → mỗi dịch vụ → Settings → Build & Deploy → Auto-Deploy* và xác nhận giá trị đúng là *After CI Checks Pass*. Có báo cáo (bên thứ ba, chưa kiểm chứng) rằng dashboard đôi khi hiện Auto-Deploy *off* dù `render.yaml` khai `checksPass`.
3. Render build `smeos-web`. Bước build chạy `npm run db:deploy` (`prisma migrate deploy`) **trước** `build`; migration lỗi → build dừng, bản cũ vẫn chạy.
4. Sau khi deploy: kiểm `/api/health`, đăng nhập một tài khoản Điều hành, mở trang chủ và một đơn hàng.

Migration chỉ đi tiến. Migration mới phải idempotent hoặc an toàn khi chạy lại (mẫu: `prisma/migrations/20261028000000_notification_org_index_and_names`).

## 4. Quay lui và khôi phục

- Lỗi mã (không đổi dữ liệu): *Render → smeos-web → Deploys → Rollback* về bản trước.
- Lỗi do migration: không có lệnh "down". Quay lui = khôi phục CSDL từ bản sao lưu rồi rollback mã. **[CẦN XÁC NHẬN]** gói `basic-256mb` có sao lưu tự động/PITR bao lâu; ai có quyền khôi phục; đã thử khôi phục lần nào chưa.
- Dữ liệu từng tổ chức: SaaS Mother tải bản ZIP (CSV + ảnh) ở *Vận hành → Trung tâm dữ liệu* (năng lực `N1`).

## 5. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân hay gặp | Cách xử lý |
|---|---|---|
| Tin Messenger không về, log 401 ở `/api/v1/chat/webhooks/facebook` | thiếu/sai `FB_APP_SECRET` | đặt App Secret của Facebook App trong Render, redeploy |
| Đăng ký webhook Facebook báo lỗi verify | thiếu `FB_WEBHOOK_VERIFY_TOKEN` hoặc khác giá trị nhập ở Facebook Developers | đặt cùng một giá trị ở hai nơi |
| Tin Zalo của một tiệm không về, 401 ở `/api/v1/chat/webhooks/zalo` | tiệm chưa nhập App ID / Secret Key, hoặc nhập sai | tiệm nhập lại trong *Kênh tích hợp* |
| Nút AI báo lỗi, log `HET_DUONG_DU_PHONG` | hết hạn mức hoặc sai khoá của mọi nhà cung cấp AI | kiểm khoá + hạn mức nhà cung cấp |
| Nhắc việc điều phối không chạy | cron lỗi hoặc `CRON_SECRET` lệch giữa cron và web | xem log `smeos-cron-dispatch-sweep` |
| `/internal/health` báo `worker_offline:<tên>` | worker `smeos-worker-<tên>` dừng hoặc mất kết nối CSDL (worker đặt `application_name` `smeos-worker:<tên>`, đếm qua `pg_stat_activity`) | xem log worker trên Render, khởi động lại; job đang chờ sẽ được nhận lại, job treo > 15 phút tự `FAILED` |
| Đối tác chuỗi mới không đăng nhập được | Điều hành chưa chuyển mật khẩu ban đầu (chỉ hiện một lần khi tạo) | tạo lại hoặc dùng luồng đặt lại mật khẩu |

## 6. Bảo mật đã có (bằng chứng: `docs/audit/04`, `07`)

Cách ly tenant (`organization_id` lấy từ phiên, tổ chức khác → 404; 113 bộ thử cách ly chạy trên Postgres thật); phân quyền theo mã năng lực, route mới bắt buộc khai báo; mật khẩu bcrypt; webhook ký số (Facebook, Zalo, cron); giới hạn tần suất đăng nhập/đăng ký; quét bí mật toàn lịch sử (gitleaks) và `npm audit` trong CI.

## 7. Giới hạn đã biết khi bàn giao

- Ma trận Ưu đãi / Cam kết / Chính sách áp vào trang khách, báo giá, đặt đơn; ma trận Thanh toán / Phí gia công / Mẫu mới lưu và khoá cấp dưới, chưa đổi cách tính tiền (nợ #185).
- Thông báo tự gửi cho 6 sự kiện đơn hàng; sự kiện chuỗi/nền tảng chưa nối (nợ #185).
- Mở khoá công cụ chi nhánh đã chặn ở máy chủ (403) và ở trang.
- 95 tệp mã > 350 dòng (nợ kỹ thuật có từ trước, không ảnh hưởng chức năng).
- Ảnh mẫu kiểm thử giao diện `/vai-tro` cần chụp lại trên CI.
- Chưa làm: kiểm tải (load test), diễn tập khôi phục CSDL.

## 8. Cam kết hỗ trợ **[CẦN XÁC NHẬN — điền theo hợp đồng]**

| Mục | Giá trị |
|---|---|
| Thời gian hỗ trợ | |
| Mức độ sự cố và thời gian phản hồi (P1/P2/P3) | |
| Kênh báo sự cố | |
| Người nhận cảnh báo Render / CI | |
| Bàn giao quyền truy cập (Render, GitHub, nhà cung cấp AI, lưu trữ, Facebook App, Zalo OA) | |

## 9. Xuất mã nguồn bàn giao

Tệp dành riêng cho quy trình phát triển (`CLAUDE.md`, `.claude/`, `.agents/`, `AGENTS.md`) được đánh dấu `export-ignore` trong `.gitattributes`. Bản giao khách tạo bằng:

```bash
git archive --format=zip -o smeos-handover.zip main
```

Trên máy dev có `.agents/` riêng: chạy `npm run dev:link-skills` một lần để tạo lại `.claude/skills`.

## 10. SLO v1 (30/10/2026 — ROADMAP E1.7)

Đo trên **28 ngày trượt**. Ngân sách lỗi = 100% − mục tiêu; tiêu quá nửa ngân sách trong 7 ngày → dừng tính năng mới, ưu tiên sửa độ tin cậy. Mục tiêu v1 đặt theo hạ tầng hiện tại (1 instance web gói `starter`) và được xem lại sau 4 tuần có số thật. PO duyệt mục tiêu 30/10/2026.

| # | Hành trình | SLI (tốt / tổng) | Mục tiêu | Nguồn đo |
|---|---|---|---|---|
| S1 | Tạo đơn hàng | `POST /api/v1/orders` không lỗi máy chủ | 99,5% | log `http.internal_error` với `path` = `/api/v1/orders`, `method` = `POST` (lỗi) · số dòng `orders` tạo trong kỳ (thành công) |
| S2 | Trang khách `/c/[slug]` | lượt mở trang không lỗi máy chủ | 99,5% | log `http.unhandled_error` với `routePath` = `/c/[slug]`; tổng lượt từ số liệu HTTP của Render. **[CẦN XÁC NHẬN]** công cụ kiểm từ bên ngoài (uptime) — thêm nhà cung cấp, PO duyệt |
| S3 | Phân tích ảnh sản phẩm | job `vision.analyze` kết thúc `COMPLETED` (bỏ `CANCELLED`) | 97% | bảng `generation_jobs` (truy vấn dưới) |
| S3b | Độ trễ phân tích ảnh | job hoàn tất trong 2 phút kể từ khi tạo | 95% | như S3 |
| S4 | Gửi thông báo | người nhận gửi được / người nhận | 99% | log `notification.dispatched` (`recipients`, `sent`, `failed`, theo `eventKey`) |

Lỗi do người dùng (4xx: sai dữ liệu, thiếu quyền, hết hạn mức) **không** tính vào SLI.

```sql
-- S3 / S3b — chạy trên bản sao đọc hoặc lúc vắng tải
SELECT count(*) FILTER (WHERE status = 'COMPLETED')::float
         / NULLIF(count(*) FILTER (WHERE status IN ('COMPLETED','FAILED')), 0) AS ti_le_thanh_cong,
       count(*) FILTER (WHERE status = 'COMPLETED' AND completed_at - created_at <= interval '2 minutes')::float
         / NULLIF(count(*) FILTER (WHERE status = 'COMPLETED'), 0) AS ti_le_duoi_2_phut
  FROM generation_jobs
 WHERE feature = 'vision.analyze' AND created_at >= now() - interval '28 days';
```

**Cảnh báo hiện có** (theo dõi lỗi: Sentry khi có `SENTRY_DSN`; chưa có công cụ metrics):

| Tín hiệu | Kích hoạt | Xử lý |
|---|---|---|
| Lượt cron `smeos-cron-dispatch-sweep` thất bại | `/internal/health` 503: CSDL, Redis, job tồn đọng > 15 phút, `worker_offline:*` | §5 và `docs/kien-truc/VAN_HANH_SU_CO_VA_SAO_LUU.md` §3 |
| Render health check đỏ | `/api/health` 503 | Render tự khởi động lại; kéo dài → CSDL |
| Sentry: lỗi mới / tăng đột biến | lỗi 500 trong route (`http.internal_error`), lỗi không ai bắt (`http.unhandled_error`), `log.error`/`log.exception` ở worker; tag `requestId`, `jobId`, `path` | mở theo `requestId` → §11. Cài một lần: tạo dự án Sentry, bật cảnh báo "issue mới" gửi email người trực |
| Xem tay hằng tuần | truy vấn S3; đếm `http.internal_error`, `notification.dispatched` có `failed > 0` trong log Render | ghi số vào bảng theo dõi SLO, so ngân sách lỗi |

## 11. Truy vết một sự cố bằng mã yêu cầu

Mọi phản hồi web có header `x-request-id` (sinh ở `src/proxy.ts`, giữ mã hợp lệ do Render gửi). Mọi dòng log trong cùng request mang `requestId`; job tạo trong request lưu `generation_jobs.request_id`; worker ghi `job.claimed` và mọi dòng log của job đó với cùng `requestId` (`workers/shared/log_json.py`).

1. Lấy mã: người dùng/hỗ trợ đọc `x-request-id` trong tab Network của trình duyệt, hoặc từ dòng log lỗi (`requestId`).
2. Log web: lọc log `smeos-web` theo mã đó → thấy `http.internal_error`/sự kiện nghiệp vụ, `jobId` nếu có.
3. Job: `SELECT id, feature, status, error FROM generation_jobs WHERE request_id = '<mã>';`
4. Log worker: lọc log `smeos-worker-*` theo cùng mã → `job.claimed` rồi các dòng xử lý.

Không dán log có dữ liệu khách vào ticket; log đã lọc khoá nhạy cảm nhưng `message` của worker có thể chứa mô tả sản phẩm.

## 12. Row Level Security theo tổ chức (ADR-013, checklist ALG 1.18)

Mọi bảng có `organization_id` (117 bảng, danh sách sinh từ `src/core/tenancy/generated/tenant-table-registry.ts`) có chính
sách `tenant_isolation` (migration `20261106020000_row_level_security`). Pool kết nối của web (`src/core/tenancy/infra/rls-pool.ts`)
và worker (`workers/shared/rls.py`) đặt `app.org_id` theo tổ chức của request/job; CSDL chỉ trả và chỉ cho ghi dòng của tổ chức đó.

| Chế độ `DB_RLS_MODE` | CSDL | Ứng dụng |
|---|---|---|
| `off` | Chính sách cho qua mọi dòng | Không đặt ngữ cảnh |
| `audit` (mặc định của blueprint) | Chính sách cho qua mọi dòng | Đặt ngữ cảnh; ghi log `db.rls.unscoped_query` khi request chưa gắn tổ chức chạm bảng thuộc tổ chức (`kind=pending`) hoặc truy vấn chạy ngoài request (`kind=unclassified`), kèm bảng và đường dẫn |
| `enforce` | Truy vấn sai tổ chức trả 0 dòng; ghi sai tổ chức bị từ chối | Như `audit` |

**Chuyển sang `enforce`:** khi 14 ngày liền không có log `db.rls.unscoped_query` `kind=pending` trên production. Đặt
`DB_RLS_MODE=enforce` ở `smeos-web` và 3 worker cùng lúc (Render → Environment), deploy lại. Theo dõi lỗi 404/rỗng dữ liệu 24 giờ đầu.

**Tắt khẩn cấp:** đặt lại `audit` (hoặc `off`) và deploy — không cần migration, có hiệu lực ngay khi tiến trình khởi động lại.

**Tài khoản CSDL theo vai (ADR-013 D-I1):** chạy `scripts/db/create-roles.sql` một lần bằng tài khoản chủ sở hữu, đặt mật khẩu
từng vai (`ALTER ROLE … PASSWORD`), rồi thay `DATABASE_URL` của từng dịch vụ trên Render (khoá `sync: false`):
`smeos-web` → `smeos_app`, 3 worker → `smeos_worker`, script vận hành và bộ quét ngoài app → `smeos_system` (bỏ qua RLS),
báo cáo/điều tra → `smeos_readonly` (luôn chặn theo tổ chức). Bước migration (pre-deploy) giữ tài khoản chủ sở hữu. Trước khi thay
cho web, kiểm trên bản khôi phục: `npm run test:tenant` với `DATABASE_URL` của `smeos_app`.

**Nhật ký bất biến (ADR-013 D-I4, migration `20261106130000_append_only_logs`):** `audit_logs`, `platform_audit_logs`,
`order_events`, `job_events`, `usage` không sửa được; xoá (kể cả xoá đơn hàng kéo theo `order_events`) chỉ được trong giao
dịch đã đặt lý do purge — trong mã dùng `setPurgeReason(tx, …)` (`src/core/tenancy/infra/purge-reason.ts`), trong psql dùng
`BEGIN; SELECT set_config('app.purge_reason', 'tenant_offboarding', true); …; COMMIT;`. `create-roles.sql` thu quyền
UPDATE/DELETE của `smeos_app`/`smeos_worker` trên năm bảng này. Script dọn tenant (`handover-clean-tenant.ts`,
`clean-siin-store-orders.ts`) đã đặt lý do; script mới xoá đơn hàng hay job phải làm như vậy.

Bảng mới có `organization_id`: chạy `node scripts/gen-rls-policies.mjs` để sinh SQL chính sách vào migration của bảng đó —
test `tests/unit/architecture/rls-policies.test.ts` đỏ nếu thiếu.

## 13. Tên miền riêng của cửa hàng (checklist ALG 10.8)

Cửa hàng (vai Điều hành) gắn tên miền ở Cài đặt → Tên miền riêng, thêm hai bản ghi DNS: TXT `_smeos-verify.<tên miền>` =
`smeos-verify=<mã>` (chứng minh sở hữu) và CNAME `<tên miền>` → máy chủ của hệ thống. Bấm "Kiểm tra" → hệ thống đọc TXT; đúng thì
tên miền chuyển "Đang hoạt động" và gọi API Render gắn tên miền vào `smeos-web`. Render tự cấp chứng chỉ HTTPS khi CNAME trỏ đúng.

`src/proxy.ts` trên tên miền đã xác minh chỉ mở trang danh mục (`/c`, `/bst`, `/g`), Thẻ Chào (`/b`, `/s`), trang cửa hàng (`/ch`,
trang chủ `/` chuyển tới trang cửa hàng đang chia sẻ) và API; dữ liệu phải thuộc đúng tổ chức sở hữu tên miền, còn lại 404. Tên miền
chưa xác minh hoặc bị khoá → 404. Lỗi tra cứu CSDL → 503.

**Cấu hình một lần:** Render → Account Settings → API Keys tạo khoá; đặt `RENDER_API_KEY` và `RENDER_SERVICE_ID` cho `smeos-web`,
deploy lại. Thiếu khoá: trạng thái chứng chỉ ghi `MANUAL` — vận hành vào Render → `smeos-web` → Settings → Custom Domains thêm
đúng tên miền đã xác minh (danh sách ở Console → tổ chức → Tên miền riêng). `FAILED`: kiểm khoá API còn hiệu lực rồi thêm tay như trên.

**Khoá tên miền** (giả mạo, khiếu nại thương hiệu): Console → tổ chức → Tên miền riêng → ghi lý do → "Khoá" (`N20`). Tên miền ngừng
phục vụ ngay ở instance đang xử lý, các instance khác trong tối đa 60 giây. Cửa hàng không tự gỡ hay xác minh lại được. "Mở lại" →
tên miền về "Chờ xác minh", cửa hàng bấm "Kiểm tra" lại.

## 14. Khoá mã hoá dữ liệu cá nhân — `PII_ENCRYPTION_KEY` (ADR-014 P-5, 07/11/2026)

Số điện thoại, email, địa chỉ, ghi chú của khách cuối (khách hàng, lead, link Thẻ chào, người nhận và hoá đơn VAT của đơn, SĐT
shipper) được mã hoá ở tầng ứng dụng. Khoá chủ chỉ nằm ở biến môi trường; mỗi tổ chức có khoá dữ liệu riêng lưu trong
`tenant_data_keys` dạng đã bọc bằng khoá chủ.

**Mất khoá chủ = mất toàn bộ dữ liệu đã mã hoá, không khôi phục được.** Lộ khoá chủ cùng bản sao CSDL = lộ dữ liệu.

1. Tạo khoá trên máy tin cậy: `openssl rand -base64 32` (44 ký tự). Không dán vào chat, ticket, log.
2. Lưu khoá vào kho bí mật của công ty (ít nhất hai người giữ quyền mở) **trước** khi đặt lên Render.
3. Render → `smeos-web` → Environment → `PII_ENCRYPTION_KEY` = khoá vừa tạo → Save (dịch vụ khởi động lại). Không đặt ở worker:
   worker không giải mã.
4. Sau khi web chạy lại: Render → `smeos-web` → Shell → `npm run pii:backfill`. Lệnh mã hoá theo lô 500 dòng mỗi bảng tới khi in
   `xong`; chỉ in số dòng. Phần phát sinh sau đó do lượt quét nền 5 phút (`/internal/chain-dispatch-sweep`, trường `piiEncrypted`).
5. Kiểm: log không còn `pii.encryption_disabled`; trên bản sao CSDL, `SELECT count(*) FROM customers WHERE phone_enc IS NULL` = 0.
6. Không đổi khoá chủ khi chưa có quy trình xoay khoá (bọc lại `tenant_data_keys`): đổi biến là các khoá dữ liệu đã bọc không mở
   được nữa.

Dựng lại môi trường từ bản sao lưu CSDL: phải đặt **đúng** khoá chủ cũ. Blueprint cố ý không `generateValue` biến này.

**Trước khi merge P-5c** (migration `20261108090000_pii_encryption_contract` — cột chỉ còn bản mã, khoá thành bắt buộc):

1. Đã làm bước 1–5 ở trên và lần chạy `npm run pii:backfill` cuối cùng in `xong: 0 dòng`.
2. Chạy kiểm chỉ đọc trên CSDL production (chỉ ra số, không ra dữ liệu); cả hai phải bằng 0:
   - `SELECT count(*) FROM customers WHERE phone_enc IS NULL OR phone_hash IS NULL;`
   - `SELECT count(*) FROM (SELECT 1 FROM customers WHERE phone_hash IS NOT NULL GROUP BY organization_id, phone_hash HAVING count(*) > 1) d;`
   Số thứ hai khác 0 = có khách trùng số (viết khác nhau, vd `0912…` và `+84912…`) trong cùng tổ chức: gộp hồ sơ trên màn hình
   Khách hàng trước.
3. Sao lưu CSDL ngay trước deploy (§3) — sau P-5c bản sao lưu cũ là nơi duy nhất còn chữ rõ; xoá nó theo chính sách lưu giữ.

Migration tự kiểm lại hai điều trên; thiếu thì dừng, không đổi gì, deploy báo lỗi và bản cũ vẫn chạy. Sửa xong:
`npx prisma migrate resolve --rolled-back 20261108090000_pii_encryption_contract` (Render Shell) rồi deploy lại.

**Sau khi P-5c chạy:** `npm run pii:backfill` một lần — tách SĐT khách lẻ của đơn điều phối khỏi `metadata` sang cột bản mã và mã
hoá dòng bản cũ ghi trong lúc deploy. Từ đây thiếu `PII_ENCRYPTION_KEY` thì mọi thao tác ghi/đọc dữ liệu cá nhân báo lỗi
`PiiKeyRequiredError`. Quay lại bản trước (Rollback trên Render) vẫn được: cột `*_enc` còn bản sao bản mã tới P-5d.

