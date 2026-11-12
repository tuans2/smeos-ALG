# ALG · 10 · Mở rộng ngang & độ tin cậy (đối chiếu code 30/10/2026)

Áp dụng của [universal/10](../universal/10-scalability.md). Hạ tầng (`render.yaml`): 1 web `smeos-web` + 3 worker (`media`, `video`, `vision`) gói `starter`, Postgres `basic-256mb`, Redis, cron `smeos-cron-dispatch-sweep`.

## 1. Trạng thái trong bộ nhớ tiến trình
| Vị trí | Dùng cho | Đánh giá |
|---|---|---|
| `core/http/rate-limit.ts` | Redis (Lua `INCR`+`PEXPIRE`) + **fallback Map** khi Redis sập (log `rate_limit.redis_fallback`) | ✅ đúng chuẩn |
| `notification/adapters/notification-sse-adapter.ts` | `userListeners: Map` — hub SSE | 🔴 **sai khi > 1 instance**: sự kiện chỉ tới người đang nối vào đúng instance (nợ #185 b) |
| `core/http/circuit-breaker.ts` | `states: Map` theo nhà cung cấp | 🟡 chấp nhận được (mỗi instance tự ngắt), ghi chú lại |
| `core/ai/adapters/multi-llm-provider.ts` | cache instance provider | ✅ chỉ đọc |
| `core/rbac/permission-resolver.ts`, `field-platform/use-cases/*` | Map cục bộ trong hàm | ✅ không dùng chung |

## 2. Hàng đợi & job
| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| `FOR UPDATE SKIP LOCKED` | ✅ | `jobs/infra/generation-job-repository.ts` (`claimNext`) |
| `NOTIFY` trong cùng transaction tạo job | ✅ | `jobs/infra/transaction.ts`, `enqueue-job.ts` |
| Hạn mức + ghi usage khi enqueue | ✅ | `enqueue-job.ts` |
| Job treo → `FAILED` sau 15 phút | ✅ | `markStuckAsFailed` (YC-J10) |
| Hoàn credit job lỗi | ✅ | `listRefundable` / `refundJob` |
| Chạy lại | ✅ tự thử lại lỗi tạm thời (hết giờ, mất kết nối, 429/5xx): `workers/shared/job_failure.py` → `PENDING` + `run_after` (30 s × 2ⁿ, trần 10 phút, ngẫu nhiên ×0,5–1), tối đa 3 lần; còn lại `FAILED` + `failure_kind` (`RETRYABLE`/`NEEDS_ACTION`). Video và nhân bản giọng chỉ phân loại, không tự thử lại (bảng trạng thái riêng). Chạy lại thủ công (YC-J3) = lượt mới, `attempts` về 0 | `workers/shared/job_failure.py`, `generation-job-repository.ts` (`claimNext`, `retryIfFailed`) |
| Dead-letter + màn xem/chạy lại | ✅ `/van-hanh/hang-doi-loi`: job `FAILED` xuyên tổ chức, Chạy lại / Gác lại (`N15`, nhật ký nền tảng) | `platform-dead-letter-repository.ts`, `manage-failed-jobs.ts` |
| Outbox xoá payload, trần 5 lần | ✅ | `storage_outbox`, `MAX_OUTBOX_ATTEMPTS` |
| Sự kiện đến xử lý một lần | ✅ `idempotency_keys` (tổ chức, phạm vi, khoá) — webhook Facebook/Zalo; dọn sau 30 ngày | `src/core/idempotency/infra/idempotency-repository.ts` |

## 3. Cơ sở dữ liệu & hiệu năng
| Mục | Trạng thái |
|---|---|
| Index `organization_id` cho bảng tenant | ✅ (CLAUDE.md #2, `b62e5d5`) |
| Gom truy vấn cấu hình phân tầng cho luồng công khai | ✅ `getPolicyGovernanceUpper` (2 truy vấn) |
| Thông báo ~36 truy vấn/lần (6 kênh × 6) | 🔴 nợ #183 — gom resolve một lần cho mọi kênh |
| Pool kết nối | 🟡 `PrismaPg({ connectionString })` mặc định (`core/tenancy/infra/prisma.ts`), chưa giới hạn theo instance |
| Cache cấu hình đọc nhiều | 🔴 chưa có (0 chỗ dùng `unstable_cache`/`"use cache"`/Redis cache) |
| Migration expand/contract | 🟡 chưa thành quy ước; 20 migration |
| Kiểm tải, chạy thử 2 instance | 🔴 chưa làm (nợ #183) |

## 4. Quy tắc cho agent (áp dụng ngay)
1. Không thêm trạng thái dùng chung trong bộ nhớ tiến trình. Cần đếm/khoá/đẩy sự kiện → Redis (`core/cache/redis-client.ts`, `getRedis()`), kèm đường lui khi Redis sập.
2. Việc nặng (AI, media, xuất tệp lớn) → `enqueue-job.ts`, không chạy trong request.
3. Webhook, thanh toán, tạo job từ client → idempotent.
4. Danh sách mới có thể lớn → phân trang con trỏ; truy vấn trong vòng lặp → gom.
5. Đổi cột đang dùng → expand/contract qua nhiều migration; đổi schema vẫn phải hỏi PO.
6. Nâng gói Render, thêm instance, thêm pooler → hỏi PO (đổi `render.yaml`).
