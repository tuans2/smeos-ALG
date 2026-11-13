# 04 — Vận hành và triển khai

Sổ tay vận hành đầy đủ (biến môi trường, sự cố thường gặp, quay lui, khôi phục) là `docs/handover/OPERATIONS_RUNBOOK.md`. Tài liệu
này tóm lược những điểm đội kỹ thuật cần nắm khi phát hành bản mới.

## 1. Dịch vụ trên Render (`render.yaml`, vùng Singapore)

| Dịch vụ | Vai trò |
|---|---|
| `smeos-web` | Ứng dụng Next.js + API `/api/v1/*`; pre-deploy chạy `npm run db:deploy && npm run db:seed` |
| `smeos-worker-media` | Ảnh, biến thể sản phẩm, nội dung (`python -m media_ai.jobs.worker`) |
| `smeos-worker-video` | Dựng video (`python -m media_ai.video.video_worker`) |
| `smeos-worker-vision` | Nhận diện ảnh sản phẩm (`python -m vision.jobs.worker`) |
| `smeos-cron-dispatch-sweep` | Mỗi 5 phút gọi `api/internal/chain-dispatch-sweep`, `api/internal/health`, `api/internal/integrations-sweep` với `x-cron-secret` |
| `smeos-postgres`, `smeos-redis` | CSDL chính, bộ đếm giới hạn tần suất |

## 2. Phát hành bản mới

1. Merge vào `main` khi CI xanh. Render tự deploy `smeos-web` và các worker.
2. Pre-deploy áp migration (`prisma migrate deploy`) rồi seed idempotent: vai hệ thống nhận mã năng lực mới, sổ đăng ký AI, sổ
   quyết định. Migration lỗi → deploy dừng, bản cũ tiếp tục chạy.
3. Migration dữ liệu (ví dụ cấp mã nền tảng mới) chạy cùng bước này, viết để chạy lại an toàn (`ON CONFLICT DO NOTHING`).
4. Sau deploy: kiểm `GET /api/v1/internal/health`, log lỗi, và log `db.rls.unscoped_query` (chế độ `audit`).

## 3. Biến môi trường

Bảng đầy đủ: runbook §2. Khai báo kiểu và mặc định: `src/lib/env.ts`; mẫu cho máy cục bộ: `.env.example`. Biến bí mật trên Render
đặt `sync: false`. Không đưa giá trị bí mật vào mã, log hay commit.

## 4. Việc chạy nền định kỳ

| Việc | Nơi khởi động |
|---|---|
| Thẻ Chào: nhắc giao, hết hạn link, thông báo nhân viên (`gc/use-cases/background-sweep.ts`); gợi lại khách tiềm năng; khớp giao dịch ngân hàng với đơn; đối soát sổ thu | Bốn bộ quét trong `src/instrumentation.ts`, chạy quyền hệ thống |
| Nhắc điều phối chuỗi, sức khoẻ, đồng bộ tích hợp | Cron Render → `api/internal/*` |
| Job treo, hàng đợi lỗi | `src/modules/jobs/use-cases/scan-stuck-jobs.ts`; Console → Hàng đợi lỗi (`N15`) |
| Đối soát số tiền đơn với sổ thu | `src/modules/orders/use-cases/reconcile-order-payments.ts`, mỗi 6 giờ (đặc tả 07 §39) |

## 5. Cấu hình đang chờ trên production

| Việc | Hướng dẫn | Ảnh hưởng khi chưa làm |
|---|---|---|
| Đặt `RENDER_API_KEY`, `RENDER_SERVICE_ID` cho `smeos-web` | Runbook §13 | Tên miền riêng đã xác minh phải thêm tay trên Render |
| Tạo vai CSDL và đổi chuỗi kết nối từng dịch vụ | Runbook §12, `scripts/db/create-roles.sql` | Ứng dụng vẫn chạy bằng tài khoản chủ sở hữu CSDL |
| Chuyển `DB_RLS_MODE=enforce` | Runbook §12 (sau 14 ngày liền không còn log `kind=pending`) | CSDL chưa tự chặn truy vấn sai tổ chức; cách ly vẫn giữ ở tầng ứng dụng |
| Đặt `SEPAY_PLATFORM_API_KEY` | Runbook §2 | Hoá đơn thuê bao xác nhận tay ở Console |

## 6. Giám sát

- Log JSON có `requestId` (`src/core/observability/`); người dùng báo mã yêu cầu ở phản hồi lỗi để tra ngược (runbook §11).
- Lỗi gửi Sentry khi có `SENTRY_DSN` ở cả web và worker.
- Console → Sức khoẻ (`N5`), Nhật ký kiểm toán (`N6`), Hàng đợi lỗi (`N15`).
