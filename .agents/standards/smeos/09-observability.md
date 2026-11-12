# ALG · 09 · Giám sát & truy vết (đối chiếu code 30/10/2026)

Áp dụng của [universal/09](../universal/09-observability.md). Ràng buộc gốc: D19 "không thêm hạ tầng" — log JSON ra `stdout`, không SDK. Thêm công cụ theo dõi lỗi/metrics/trace là **dependency + nhà cung cấp mới → PO duyệt**.

## 1. Đang có
| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| Logger có cấu trúc | `src/core/observability/log.ts` (`log.debug/info/warn/error`, ngữ cảnh `organizationId`, `workspaceId`, `userId`, `jobId`, `feature`) | Che khoá cấm (`password`, `secret`, `token`, `apiKey`…) |
| Hook lỗi server | `src/instrumentation.ts` (`onRequestError`) → `core/observability/request-error.ts` (`reportRequestError`) | Chỉ log, chưa gửi công cụ ngoài |
| Sức khoẻ | `/api/health` → `core/observability/system-health.ts` (DB, Redis; `SLOW_DATABASE_MS = 1000`), 503 khi DB lỗi, `no-store`; Render `healthCheckPath: /api/health` | Một endpoint cho cả liveness lẫn readiness |
| Sự kiện job | worker ghi `job_events` (`event`, `payload` JSON) | Theo dõi tiến trình từng job |
| Log nghiệp vụ có tên ổn định | vd. `landing_content.generated`, `rate_limit.redis_fallback`, `catalog_content.generated` | — |
| Sổ AI | gateway ghi mô hình, chi phí, kết quả (`ai-governance`) | Dữ liệu cho chi phí AI theo tenant |

## 2. Trạng thái
| Mục chuẩn | Trạng thái | Việc cần làm (xem ROADMAP E1) |
|---|---|---|
| Log JSON + che khoá | ✅ | — |
| `request_id` xuyên web → job → worker | ✅ `src/proxy.ts` gắn `x-request-id` (request + phản hồi); `handle()` chạy trong `request-context.ts` (AsyncLocalStorage) nên `log` tự thêm `requestId`; `generation_jobs.request_id`; worker in `job.claimed` (`workers/shared/job_trace.py`) | Route không bọc `handle()` chưa có `requestId` trong log |
| Không `console.*` trong mã sản phẩm | 🟡 còn tệp dùng `console.*`, khoá bằng `tests/unit/architecture/no-console-ratchet.test.ts` (chỉ giảm) | Dọn dần sang `log`, hạ BASELINE |
| Công cụ theo dõi lỗi | ✅ Sentry (PO Q1): cổng `core/observability/error-tracker.ts`, adapter `core/observability/adapters/sentry-error-tracker.ts` bật trong `instrumentation.ts` khi có `SENTRY_DSN`; bắt lỗi từ `handle()` và `onRequestError`; worker `shared/log_json.py` (`bat_sentry`). Lọc body/cookie/header/người dùng/breadcrumb/biến cục bộ; không đo hiệu năng | Lỗi phía trình duyệt chưa gửi (cần `instrumentation-client.ts`) |
| Metrics RED / hàng đợi / kênh / chi phí AI | 🟡 `/van-hanh/suc-khoe`: bộ xử lý nền + hàng đợi theo loại việc (đang chờ, chờ từ lúc, lỗi 24 giờ); `/van-hanh/muc-dung`: chi phí AI theo tổ chức. Kênh thông báo chưa có số liệu lưu (chỉ log `notification.dispatched`) | Bước 2: exporter/metrics khi có công cụ (E1.5) |
| Readiness tách liveness | ✅ `/api/health` (liveness, healthCheckPath Render) · `/api/health/ready` (CSDL + Redis trên production, `isReady`) | Đổi healthCheckPath sang `/ready` khi chạy nhiều instance — PO (`render.yaml`) |
| Worker heartbeat | ✅ worker đặt `application_name` `smeos-worker:<tên>`; `/api/v1/internal/health` đếm qua `pg_stat_activity` (`countLiveWorkers`), production thiếu worker → `worker_offline:<tên>` → cron đỏ | — |
| Log worker Python cùng định dạng | 🟡 `workers/shared/log_json.py`: mọi bản ghi `logging` thành JSON cùng trường web + ngữ cảnh job (`requestId`, `jobId`…), bật ở 3 worker; `print(...)` trong `media`/`video` chưa qua `logging` | Đổi dần `print` sang `logging.getLogger(...)` |
| SLO + cảnh báo + runbook | 🟡 SLO v1 (S1–S4) + truy vết `request_id` trong `docs/handover/OPERATIONS_RUNBOOK.md` §10–11; SLI từ `http.internal_error`, `notification.dispatched`, `generation_jobs`; mục tiêu PO duyệt 30/10/2026 | Đo tự động + cảnh báo theo ngân sách lỗi khi có công cụ (E1.5) |

## 3. Quy tắc cho agent (áp dụng ngay)
1. Dùng `log` của `core/observability/log.ts`; không thêm `console.*` mới.
2. Đặt `event` dạng `module.hanh_dong`, không nhúng giá trị động; truyền `organizationId`, `jobId` qua ngữ cảnh.
3. Không log nội dung khách, email, số điện thoại, prompt đầy đủ.
4. Lỗi cần theo dõi → để `handle()` bắt hoặc gọi `captureError()`; không import `@sentry/*` ngoài adapter; không đưa dữ liệu khách vào tag.
