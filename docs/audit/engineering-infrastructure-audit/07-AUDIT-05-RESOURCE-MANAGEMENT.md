# 07 — AUDIT 05: Resource Management

> Chỉ đọc. Không đổi hạ tầng, không chạy tải vào production, không thao tác CSDL.
> **Không có metrics production** trong phạm vi truy cập — mọi nhận định production dựa trên cấu hình và mã; con số năng lực không được bịa.
> Thông số gói Render (Starter = 512 MB RAM / 0,5 CPU) lấy theo bảng giá công bố của Render, **cần xác nhận trên dashboard**.

## 1. Resource architecture

| Dịch vụ | Gói | Tiến trình | Giới hạn bộ nhớ khai báo | Nguồn |
|---|---|---|---|---|
| `smeos-web` | starter | `next start` + 5 scheduler nền trong tiến trình | `NODE_OPTIONS=--max-old-space-size=2048` | `render.yaml:30,64-65`, `src/instrumentation.ts:22-36` |
| `smeos-worker-media` | starter | Python, `rembg`/`onnxruntime`/`opencv`/`scipy`, 1 conn LISTEN | — | `render.yaml:172-179`, `workers/requirements.txt` |
| `smeos-worker-video` | starter | Python, `ffmpeg` | — | `render.yaml:225-232` |
| `smeos-worker-vision` | starter | Python | — | `render.yaml:266-273` |
| `smeos-cron-dispatch-sweep` | cron (*/5) | `curl` 3 endpoint, timeout 120/20/60 s | — | `render.yaml:308-322` |
| `smeos-redis` | Key Value 256 MB, `allkeys-lru` | rate-limit dùng chung | — | `render.yaml:343-348` |
| `smeos-postgres` | `basic-256mb`, PG 16 | — | max_connections **chưa xác minh** | `render.yaml:353-358` |

Kết nối CSDL: web `pg.Pool` `max = DATABASE_POOL_MAX` mặc định **10** (`src/lib/env.ts:22`, `src/core/tenancy/infra/prisma.ts:41`), `application_name` theo dịch vụ;
mỗi worker Python 1 kết nối dài hạn `autocommit` (`media_ai/jobs/worker.py:493`, `vision/jobs/worker.py:502`, `media_ai/video/video_worker.py:233`), backoff khi lỗi.
Không có PgBouncer. Trong lúc deploy, bản cũ + bản mới web cùng sống ⇒ tối đa ~20 kết nối web + 3 worker + cron/seed.

## 2. Development resource baseline (máy đo 4 vCPU / 15 GB)

| Hoạt động | Thời gian | Bộ nhớ |
|---|---|---|
| `npm ci` | 27 s | — |
| `tsc --noEmit` cold | 62–64 s | heap 2,9–3,1 GB, RSS 3,2 GB · **OOM với heap mặc định** |
| `tsc` cold có typed routes | 243 s | heap 3,86 GB, RSS 3,97 GB |
| `tsc` warm | 8,5 s | RSS 1,86 GB |
| `next build` (bỏ kiểm kiểu) | 52 s | RSS đỉnh 5,15 GB |
| `next build` (có kiểm kiểu) | 304 s | RSS đỉnh 4,49 GB |
| `.next` | 739 MB (cache 478 MB) | — |
| `npm run dev:core` | web + 3 worker Python + MI worker đồng thời — chưa đo | — |

Hệ quả DX: máy dev ≤ 8 GB RAM khó chạy song song IDE (tsserver cùng chương trình ~3–3,9 GB) + `next dev` + worker (suy luận từ số đo, chưa đo trên máy 8 GB).

## 3. CI/CD resource baseline

- Runner chuẩn repo private ≈ 7 GB RAM / 2 vCPU (commit `6162c8a`: "The runner has about 7 GB of RAM"). Job `web`/`e2e-ux` đặt heap 4 GB.
- Bước đắt nhất về bộ nhớ: kiểm kiểu trong `next build` (3,86 GB heap / RSS ~4,5 GB) — chạy **2 lần** mỗi run (CI-04). Headroom heap 6 % (TC-02).
- Bước đắt nhất về thời gian: `test:tenant` 19,8 m tuần tự, I/O Postgres cao (TRUNCATE lặp).
- Đĩa/cache: chỉ cache npm; mỗi run tải lại Playwright Chromium, pip, `apt ffmpeg`; không cache `.next/cache` (478 MB) hay tsbuildinfo.
- Tiêu thụ: ≈ 59 runner-phút / sự kiện push/PR (CI + CodeQL); 40 run CI trong 9,5 giờ ngày 07/11. Quota phút **không xác minh được** (API trả 0).

## 4. Production resource assessment

| ID | Mức | Phát hiện | Bằng chứng | Tác động |
|---|---|---|---|---|
| **RES-01** | HIGH | Trần heap V8 của web (**2048 MB**) lớn gấp ~4 lần RAM gói Starter (512 MB). V8 không thu gom sớm vì "còn room" theo trần heap ⇒ container bị OOM-kill trước khi GC phản ứng; 5 scheduler nền (`setInterval`, `src/instrumentation.ts:22-36`) cùng chạy trong tiến trình phục vụ request. Biến này cũng áp cho build trên Render. | `render.yaml:30,64-65` | Restart đột ngột, mất request đang xử lý; không có metrics để thấy (RES-02). |
| **RES-02** | HIGH | Quan trắc tối thiểu: blueprint **không khai `SENTRY_DSN`** cho bất kỳ dịch vụ nào ⇒ theo dõi lỗi tắt trừ khi người vận hành tự thêm (`OPERATIONS_RUNBOOK.md:33`). Không APM, không metrics ứng dụng ("chưa có công cụ metrics", `OPERATIONS_RUNBOOK.md:127`), không giám sát CSDL/kết nối, không cảnh báo RAM/CPU được cấu hình như mã. Chỉ có health check + log JSON + metrics mặc định của Render (không xác minh việc sử dụng). | `render.yaml`, runbook | Sự cố tài nguyên (OOM, cạn kết nối, job treo) chỉ phát hiện khi người dùng báo. |
| **RES-03** | MEDIUM | Worker media dùng `rembg`/`onnxruntime` (nạp model lười, giữ session trong tiến trình — `media_ai/providers/segmentation/rembg_segmenter.py:38-51`) + `opencv` + `scipy` trên gói 512 MB. Không có số đo RAM thực. Comment mã ghi nhận tình trạng "máy quá tải… rembg/onnxruntime bị kẹt" (`media_ai/jobs/variant_worker.py:453,473`). | mã + `render.yaml` | Rủi ro OOM-kill giữa job; `MAX_LAN_THU = 3` (`shared/job_failure.py:21`) giới hạn retry — tốt. |
| **RES-04** | MEDIUM | Ngân sách kết nối CSDL không được tài liệu hoá/đo: pool web 10 (không đặt trong `render.yaml`), giới hạn kết nối của `basic-256mb` chưa xác minh, không có `pg_stat_activity` dashboard dù đã đặt `application_name` (ADR-015 D-O5). | `env.ts:22`, `render.yaml` | Khi scale web > 1 instance hoặc thêm worker, có thể cạn kết nối mà không có cảnh báo. |
| RES-05 | LOW | Scheduler nền "một lần mỗi tiến trình", không khoá phân tán (advisory lock) ⇒ chạy trùng khi scale web > 1 instance. Có chống chồng lượt trong tiến trình và `unref`. | `background-sweep-scheduler.ts:9,18-32`, `reconciliation-scheduler.ts:6-34` | Hiện 1 instance ⇒ chưa xảy ra; chặn scale-out an toàn. |
| RES-06 | LOW | Artifact build lớn (739 MB `.next`) và cache Turbopack 478 MB không được tận dụng ở CI. | đo | Tốn thời gian build lặp lại. |
| RES-07 | INFO | Không có công cụ/kịch bản load test (không thấy k6/artillery/autocannon/locust). Không có số năng lực (RPS, người dùng đồng thời). | grep | Khoảng trống đo lường — xem §7. |
| RES-08 | INFO | Worker `market-intelligence` (TS) không có dịch vụ Render; tuyến `/market-intelligence` bị khoá có chủ đích (D-20b, `src/lib/feature-lock.ts:71,75`). Không phải lỗi. | `render.yaml`, feature-lock | Khi mở tính năng phải thêm dịch vụ + ngân sách kết nối. |

## 5. Database resource assessment

- **Connection lifecycle**: singleton Prisma Client; production không gắn vào `globalThis` nhưng module là singleton (`prisma.ts:77-81`). Pool đặt biến phiên RLS mỗi lần lấy kết nối, chỉ khi ngữ cảnh đổi (`rls-pool.ts:93-114`) — chi phí thêm 1 câu lệnh/khi đổi tổ chức.
- **RLS ở chế độ `audit`** (`render.yaml:46-47`): mỗi truy vấn qua kết nối được bọc để regex tìm bảng tenant (`rls-pool.ts:27-35,78-83`) — CPU thêm trên mọi truy vấn; log có hạn mức (10 phút/khoá, xoá khi > 5000 khoá). Chưa đo chi phí.
- **Query efficiency / N+1 / index thiếu**: audit này **không** chạy phân tích truy vấn (không có DB production, không `pg_stat_statements`). Lược đồ có quy tắc `@@index([organization_id])` cho mọi bảng tenant (CLAUDE.md #2). Không báo lỗi N+1 nào vì không có bằng chứng.
- **Giao dịch dài**: không đo. Cron sweep giới hạn thời gian bằng `--max-time` (120/20/60 s).
- Tài nguyên `basic-256mb` (256 MB RAM cho Postgres) với 151 bảng: shared_buffers nhỏ; cần số đo cache hit ratio trước khi kết luận.

## 6. Resource bottleneck & scalability risk

| Trục tăng trưởng | Nút thắt đã thấy | Bằng chứng | Dự báo (định tính) |
|---|---|---|---|
| Kích thước mã / số module | Heap tsc + typed routes | 3,86/4,0 GB | Hết headroom ở lượt tăng mã kế tiếp (đã OOM 2 lần 07/11 ở trần 2 GB) |
| Số model Prisma | Generated client 22,9 MB, `organizations` 121 quan hệ | đo | Tăng tuyến tính sàn heap + kích thước bundle server |
| Số test tenant | `test:tenant` tuần tự 19,8 m | CI | Tăng tuyến tính theo số ca × số bảng TRUNCATE |
| Người dùng đồng thời / request | 1 instance Starter, heap > RAM, scheduler trong tiến trình | `render.yaml` | Chưa đo — cần load test |
| Kích thước CSDL | `basic-256mb` | `render.yaml` | Chưa đo |
| Khối lượng job AI | 1 worker/loại, 512 MB, xử lý tuần tự | `render.yaml`, mã | Chưa đo; RAM là rủi ro đầu tiên |

## 7. Monitoring gap analysis

| Năng lực | Hiện trạng | Khoảng trống |
|---|---|---|
| APM | không có | thời gian phản hồi, throughput theo route |
| Error monitoring | Sentry có mã, **tắt mặc định** (không có DSN trong blueprint) | DSN + cảnh báo issue mới |
| CPU/RAM | metrics mặc định Render (chưa xác minh dùng) | ngưỡng cảnh báo RAM > 80 % gói |
| CSDL | không | kết nối theo `application_name`, truy vấn chậm, kích thước, cache hit |
| Build performance | không theo dõi | thời gian/heap typecheck & build theo thời gian |
| Resource alerts | cron trả 503 khi `/internal/health` lỗi → Render báo (`render.yaml:307`) | cảnh báo RAM/OOM/restart |
| Log retention | log JSON → Render; thời hạn lưu theo gói (chưa xác minh) | chính sách lưu trữ ghi thành văn bản |
| Dashboard | không | 1 dashboard vận hành tối thiểu |

## 8. Resource optimization roadmap (tóm tắt — chi tiết trong `10-REMEDIATION-ROADMAP.md`)

1. Đặt heap web khớp RAM gói (vd. ~75 % RAM) **hoặc** nâng gói — quyết định chi phí của PO (RES-01).
2. Bật Sentry (DSN cho web + 3 worker) và cảnh báo RAM/restart trên Render (RES-02).
3. Đo RAM thật của 3 worker trong 1 tuần; chọn gói theo số đo (RES-03).
4. Ghi ngân sách kết nối: `DATABASE_POOL_MAX` tường minh, giới hạn kết nối gói Postgres, cảnh báo ở 80 % (RES-04).
5. Advisory lock cho scheduler trước khi scale web > 1 (RES-05).
6. Load test trên staging (không phải production) với kịch bản 5 hành trình chính; ghi baseline RPS/p95/RAM.

## 9. Acceptance criteria

| Tiêu chí | Ngưỡng |
|---|---|
| Bộ nhớ web | `--max-old-space-size` ≤ 75 % RAM gói đang dùng; RSS p95 ≤ 80 % RAM gói trong 7 ngày |
| Bộ nhớ worker | RSS đỉnh của job lớn nhất đã đo ≤ 80 % RAM gói; 0 OOM-kill trong 14 ngày |
| CPU | CPU trung bình ≤ 70 % gói giờ cao điểm (đo 7 ngày) |
| Build CI | Heap đỉnh ≤ 75 % trần đặt; RSS đỉnh ≤ 75 % RAM runner |
| Kết nối CSDL | Tổng `max` của mọi pool + worker + dư cho deploy chồng ≤ 80 % `max_connections`; cảnh báo ở 80 % |
| Ổn định | 0 restart ngoài kế hoạch / 7 ngày; health check xanh ≥ 99,5 % |
| Quan trắc | Sentry bật trên 4 dịch vụ; ≥ 1 cảnh báo cho: lỗi mới, RAM > 80 %, restart, cron thất bại |
| Mở rộng | Load test staging có báo cáo (RPS, p95, lỗi %, RAM) trước khi bán cho khách thứ N (PO đặt N) |
