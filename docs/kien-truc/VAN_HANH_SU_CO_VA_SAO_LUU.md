# Vận hành — Sao lưu, quan trắc và xử lý sự cố

> Trạng thái `CANONICAL` · chủ sở hữu: Platform Lead · cập nhật 22/10/2026.
> Nền tảng: Render (vùng Singapore), theo `render.yaml`. Số liệu về Render lấy từ tài liệu
> chính thức của Render ngày 22/10/2026; kiểm lại trước khi cam kết với khách.

## 1. Sao lưu và khôi phục

| Cơ chế | Có gì | Giữ bao lâu |
|---|---|---|
| PITR của Render (`smeos-postgres`, gói `basic-256mb`) | Khôi phục về một thời điểm bất kỳ, cách hiện tại ≥ 10 phút | 3 ngày (workspace Hobby) · 7 ngày (Pro trở lên) |
| Export logic (*Recovery → Create export*) | Tệp `.dir.tar.gz` tải về được | 7 ngày trên Render; tự tải về để giữ lâu hơn |
| `scripts/handover-backup-engine.ts` | Snapshot JSON dữ liệu giao dịch **một tenant** trước khi dọn | Theo nơi lưu tệp |
| `npm run tenant:transfer` (ADR-016 D-S3) | Xuất / nhập **toàn bộ** dữ liệu một tenant theo sổ bảng, có phiên bản schema + checksum — runbook §17 | Theo nơi lưu tệp |

**Mục tiêu đề xuất** (cần PO chốt với khách):

- **RPO ≤ 15 phút:** PITR liên tục.
- **RTO ≤ 2 giờ:** tạo instance khôi phục, kiểm tra, rồi đổi `DATABASE_URL`.
- **Export hằng tuần** tải về kho ngoài Render, giữ 90 ngày.

**Khôi phục (PITR):**
1. Render → `smeos-postgres` → *Recovery* → chọn thời điểm → Render tạo **instance mới**; bản cũ
   giữ nguyên.
2. Kiểm tra instance mới. Nối bằng `psql` chỉ đọc, đếm đơn và xem đơn mới nhất của 1–2 tiệm.
3. Đổi `DATABASE_URL` của `smeos-web` và 3 worker sang instance mới, deploy lại. `npm run db:deploy`
   thấy migration nền đã có nên chỉ chạy migration còn thiếu.
4. Ghi biên bản: thời điểm khôi phục, khoảng dữ liệu mất, tiệm bị ảnh hưởng.
5. **Diễn tập mỗi quý** trên một instance tạm, rồi xoá nó. Chưa diễn tập lần nào thì chưa được
   coi RTO là đã chứng minh.

**Diễn tập PITR (ADR-015 D-O3, O-7) — làm theo, ghi biên bản ngay dưới:**

1. Ghi giờ bắt đầu. Render → `smeos-postgres` → *Recovery* → mốc 1 giờ trước → instance tạm.
2. Trên Render shell (biến `DATABASE_URL` tạm trỏ instance tạm): `npm run db:verify` → lưu bản in.
3. Trên production: `npm run db:verify` → so với bước 2 (số dòng chỉ được thấp hơn bằng lượng ghi trong 1 giờ; schema trùng;
   `đơn lệch sổ thu` không tăng).
4. Diễn tập khôi phục riêng một tổ chức thử (runbook §17, S-4) từ instance tạm, đo thời gian.
5. Ghi giờ xong → RTO; xoá instance tạm. Mục tiêu RTO ≤ 1 giờ (toàn CSDL), ≤ 4 giờ (một tổ chức).

| Ngày | Người làm | Mốc khôi phục | RTO toàn CSDL | RTO một tổ chức | `db:verify` khớp | Ghi chú |
|---|---|---|---|---|---|---|
| *(chưa diễn tập)* | | | | | | |

Ảnh và video không nằm trong Postgres mà ở kho đối tượng (`STORAGE_*`). Bật versioning hoặc sao
chép chéo vùng ở nhà cung cấp kho.

**Vòng đời kho tệp (SDAGF, `docs/audit/sdagf-2026-10`):**

- Cron `/internal/chain-dispatch-sweep` (5 phút) xoá vĩnh viễn ảnh quá hạn thùng rác (`purge_after`),
  bỏ qua ảnh đang legal hold, và xử lý hàng đợi `storage_outbox`.
- Xoá tệp thật chỉ chạy khi `STORAGE_DELETE_PAYLOADS=enabled`. **Chỉ bật sau khi kho đã có bản sao**
  (D-06); trước đó hàng đợi vẫn được ghi, bật cờ là cron xử lý dồn. Việc thất bại 5 lần dừng lại ở
  `storage_outbox` (`attempts`, `last_error`) để xem tay.
- Đối soát registry ↔ kho, **chỉ đọc**: `npm run storage:reconcile` (thêm `-- --json` cho toàn bộ
  báo cáo). Chạy hằng tuần và trước mỗi lần bàn giao; tệp mồ côi và bản ghi thiếu tệp ghi vào biên bản.

### 1.1 Ngân sách kết nối CSDL (ADR-015 D-O5, bước O-2)

| Dịch vụ | Kết nối tối đa | Nguồn |
|---|---|---|
| `smeos-web` (pool Prisma) | `DATABASE_POOL_MAX`, mặc định 10 | `src/core/tenancy/infra/prisma.ts` |
| Worker nghiên cứu thị trường trong web (LISTEN) | 1 | `src/modules/market-intelligence/infra/worker.ts` |
| `smeos-worker-media`, `-video`, `-vision` | 1 mỗi worker (`psycopg.connect`) | `workers/*/jobs/worker.py`, `workers/media_ai/video/video_worker.py` |
| `pre-deploy` / `db:deploy` | 1, chỉ lúc deploy | `scripts/db-deploy.mjs` |
| **Tổng lúc chạy, 1 instance web** | **≈ 15** | |

Luật: tổng ≤ 70% giới hạn kết nối của gói CSDL. Chạy nhiều instance web (D-17) → nhân dòng web theo số
instance, hoặc thêm PgBouncer (ADR-015 D-O5). Xem kết nối theo dịch vụ:
`SELECT application_name, count(*) FROM pg_stat_activity GROUP BY 1;`

## 2. Quan trắc

Mọi log máy chủ là một dòng JSON (`src/core/observability/log.ts`): `ts`, `level`, `event` và
ngữ cảnh. Khoá nhạy cảm (`password`, `token`, `cookie`, `phone`, `address`…) bị lọc trước khi ghi.

| Tín hiệu | Nguồn | Hành động |
|---|---|---|
| `/api/health` → 503 | Render health check (công khai, chỉ `status`) | Render tự khởi động lại; kéo dài thì xem mục 3 |
| `GET /api/v1/internal/health` → 503 | Cron `smeos-cron-dispatch-sweep` gọi sau mỗi lượt quét (5 phút) | Lượt cron thất bại → Render gửi thông báo |
| `event: "http.unhandled_error"` | `onRequestError` trong `src/instrumentation.ts` | Lọc theo `routePath`; có `digest` thì đối chiếu lỗi phía trình duyệt |
| `event: "health.degraded"` | Route sức khoẻ chi tiết | Đọc `issues` (bảng dưới) |
| `event: "redis.error"` | `src/core/cache/redis-client.ts` | Giới hạn tần suất rơi về bộ nhớ từng instance |
| `event: "availability.booking_conflict"` | Đặt phòng trùng bị chặn | Bình thường nếu lẻ tẻ; dồn dập là có người dò |

`issues` của `/internal/health`: `database_unreachable`, `database_slow` (> 1 giây), `redis_down`,
`redis_not_configured` (chỉ production), `jobs_pending_too_long`, `jobs_processing_too_long`
(> 15 phút), `jobs_unreadable`, `worker_offline:<tên>` (production, worker không còn kết nối CSDL), `workers_unreadable`.

**Cài đặt cần làm một lần:**
1. Render → *Integrations → Notifications*: đích email (và Slack nếu có), mức *Only failure
   notifications*. Mức này bao gồm build/deploy lỗi và lượt cron lỗi.
2. Gọi thử bằng tay:
   `curl -i https://<app>/api/v1/internal/health -H "x-cron-secret: <CRON_SECRET>"`.
   Không bao giờ dán `CRON_SECRET` vào ticket hay chat.
3. Muốn lưu log quá thời hạn của Render: bật *Log Streams* sang một kho log (Better Stack,
   Datadog…). Việc này thêm nhà cung cấp, cần PO duyệt.

## 3. Sự cố thường gặp

| Hiện tượng | Kiểm tra | Xử lý |
|---|---|---|
| App không lên sau deploy | Log build | Build lỗi thì Render giữ bản cũ. Lỗi ở `db-deploy` → `VAN_HANH_CAP_NHAT_CSDL.md` mục 6 |
| `database_unreachable` | Trạng thái `smeos-postgres` trên Render | Chờ Render; quá RTO → PITR (mục 1) |
| `jobs_processing_too_long` | Log worker media/vision/video | Khởi động lại worker; `npm run quet-job-treo` đánh dấu job treo là `FAILED` |
| Nhắc mốc M1–M4 không chạy | Log `smeos-cron-dispatch-sweep` | 401: `CRON_SECRET` ở web và cron khác nhau |
| Ảnh QC/giao hàng chờ duyệt tay hàng loạt | `ai_requests`, khoá `OPENAI_API_KEY` | AI lỗi nên ảnh không tự qua (H6). Điều phối duyệt tay trong lúc sửa |
| Link Thẻ Gia Công báo không tìm thấy | Link có `&t=` không, đã quá 14 ngày chưa | Điều phối gửi lại link |

## 4. Xoay khoá bí mật

| Biến | Đổi thì ảnh hưởng gì |
|---|---|
| `SESSION_SECRET` | **Mọi người bị đăng xuất.** Link gia công, link ký ảnh và mã liên kết Telegram cũ hết hiệu lực. Mỗi nhóm Telegram phải gửi mã mới |
| `SSO_SESSION_SECRET` | Phiên SSO với app anh em hết hiệu lực; phải đổi cùng lúc ở các app đó |
| `INTEGRATION_TOKEN_SECRET` | Token tích hợp đã cấp không còn tra được; phải cấp lại |
| `CRON_SECRET` | Đặt **cùng giá trị** ở `smeos-web` và `smeos-cron-dispatch-sweep` trong một lượt |
| Khoá nhà cung cấp AI/kho | Đổi ở nhà cung cấp trước, cập nhật Render, rồi thu hồi khoá cũ |

Chạy lúc vắng khách, báo trước cho tiệm khi đổi `SESSION_SECRET`.

## 5. Thử tải quy mô mục tiêu (ADR-015 D-O7, bước O-9)

Chạy trên **CSDL khôi phục PITR** (cùng lượt diễn tập O-7 hoặc một bản riêng), không bao giờ trên production: công cụ
từ chối mọi CSDL không tên `*_restore` / `*_load` / `*_test` (hoặc đúng tên trong `LOAD_TEST_DATABASE`). Dữ liệu sinh
ra không có dữ liệu cá nhân thật; xoá CSDL tạm sau khi xong.

1. Khôi phục PITR ra CSDL tạm, đặt tên `…_restore` (§1). Trỏ `DATABASE_URL` của máy chạy thử (Render shell của một dịch
   vụ tạm, hoặc máy vận hành) tới CSDL đó, `DB_RLS_MODE` như production. Chạy `npm run db:verify` để chắc bản khôi phục lành.
2. `npm run load:seed` — 1 chuỗi × 200 chi nhánh × 500 đơn/ngày × 12 tháng + 300 tiệm lẻ × 20 đơn/ngày (≈ 2,4 triệu đơn).
   Thử nhanh trước bằng `-- --scale 0.02`. Sinh xong ghi `scripts/load-test/.seed.json`.
3. `npm run load:run` (mặc định 200 lần × 10 luồng mỗi kịch bản; tăng bằng `-- --samples 500 --concurrency 20`). Đo
   p50/p95/p99 của: đặt đơn (chuỗi, tiệm lẻ), danh sách đơn (chuỗi, tiệm lẻ), hàng điều phối chuỗi, báo cáo doanh thu 30
   ngày. Mục tiêu D-O1: p95 ≤ 200 ms, báo cáo ≤ 2 s, **0 lỗi**. Kết quả in ra và ghi `scripts/load-test/.result.md`.
   Log JSON của ứng dụng lẫn trong đầu ra: lọc bằng `2>&1 | grep -v '^{'`.
4. Dán bảng kết quả vào biên bản dưới; kịch bản không đạt → mở việc sửa, ghi kế hoạch vào cột "Xử lý". O-9 chỉ đánh dấu
   xong khi mọi kịch bản đạt hoặc có kế hoạch sửa được PO duyệt (ADR-015 §4).

Đo ở tầng use-case trong ngữ cảnh tổ chức (`withTenantDb`, cùng đường RLS với request): không gồm mạng, phiên đăng nhập,
dựng trang. Thời gian request thật = số này + phần HTTP; sau go-live đối chiếu với số liệu HTTP của Render và
`pg_stat_statements` (O-3), theo SLO §10 của `docs/handover/OPERATIONS_RUNBOOK.md`.

**Chạy thử công cụ 12/11/2026** (Postgres 16 cục bộ, quy mô 0,01, 100 lần × 10 luồng — chỉ để kiểm công cụ, không phải
biên bản O-9): danh sách đơn chuỗi p95 97 ms, tiệm lẻ 44 ms, điều phối 10 ms, báo cáo 51 ms. **Đặt đơn của chuỗi: 70/100
lỗi** "Đang có nhiều đơn tạo cùng lúc — vui lòng thử lại." (tiệm lẻ 1/100): mã đơn lấy từ số đơn trong ngày + thử lại
tối đa 3 lần (`createWithFreshCode`, `src/modules/orders/use-cases/create-order.ts`), 10 đơn cùng lúc trong một tổ chức
trùng mã quá 3 lần. Chặn go-live cho khách chuỗi — xem `docs/handover/GO_LIVE_CHECKLIST.md` mục B.

| Ngày | CSDL (mốc PITR) | Quy mô | Lần × luồng | Kịch bản không đạt | Xử lý | Người chạy |
|---|---|---|---|---|---|---|
| | | | | | | |
