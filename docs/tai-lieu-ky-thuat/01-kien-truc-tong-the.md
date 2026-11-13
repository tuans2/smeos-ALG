# 01 — Kiến trúc tổng thể

## 1. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Web và API | Next.js 16 (App Router), React, TypeScript, chạy trên Node.js 22 |
| CSDL | PostgreSQL 16, Prisma 7 với `@prisma/adapter-pg` (pool `pg`) |
| Tác vụ nền | Worker Python trong `workers/` (ảnh, video, nhận diện) và worker TypeScript cho xu hướng thị trường |
| Bộ nhớ đệm, giới hạn tần suất | Redis (`REDIS_URL`); thiếu thì đếm trong bộ nhớ từng instance |
| Lưu trữ tệp | Kho kiểu S3 qua cổng `StorageProvider` (`STORAGE_*`) |
| AI | Mọi lời gọi qua `callCapability` ở `src/core/ai/gateway.ts` |
| Hạ tầng | Render: 1 dịch vụ web, 3 worker, 1 cron, Postgres, Redis (`render.yaml`) |

Next.js 16 khác bản cũ ở nhiều API (ví dụ `src/proxy.ts` thay cho middleware và chạy trên Node.js). Tra tài liệu đi kèm ở
`node_modules/next/dist/docs/` trước khi dùng API lạ.

## 2. Cấu trúc thư mục

```
src/
  app/               Giao diện (App Router) và API
    (app)/           Màn hình của cửa hàng (cần đăng nhập)
    (platform)/      Console vận hành nền tảng /van-hanh
    (auth)/          Đăng nhập, đăng ký
    api/v1/          API REST — mỗi route.ts gọi đúng một use-case
    b/ g/ s/ c/ bst/ ch/ bg/ subcontract/ in-phieu/   Trang công khai và trang in
  components/        Component giao diện theo phân hệ; ui/ là thư viện dùng chung
  core/              Hạ tầng dùng chung: http, rbac, tenancy, ai, platform, observability, security…
  modules/<phân hệ>/ 53 phân hệ nghiệp vụ, mỗi phân hệ chia tầng (mục 3)
  lib/               Tiện ích: env, i18n, session phía client, public-url
  proxy.ts           Chạy trước mọi request: mã yêu cầu, định tuyến tên miền riêng
prisma/
  schema.prisma      149 bảng; migrations/ là nguồn triển khai duy nhất cho production
workers/             Worker Python: vision/, media_ai/, shared/ (RLS, lưu trữ, log)
tests/
  unit/              Test kiến trúc và luật thuần (chạy trong npm test)
  tenant/            Test cách ly tổ chức trên CSDL thật (TRUNCATE mọi bảng)
  platform/          Test Console nền tảng trên CSDL thật
  e2e/               Playwright — luồng UX theo vai
scripts/             Sinh mã (sổ bảng tenant, chính sách RLS), kiểm tài liệu, ratchet, vai CSDL
docs/                Đặc tả, ADR, runbook, hợp đồng màn hình, hai bộ tài liệu này
```

## 3. Tầng trong một phân hệ

```
src/modules/<phân hệ>/
  domain/      Luật nghiệp vụ thuần TypeScript. Không import Prisma, không gọi mạng.
  use-cases/   Điều phối một thao tác: kiểm quyền, gọi domain, gọi repository, ghi nhật ký.
  infra/       Repository Prisma, truy vấn SQL, đọc DNS… Chỉ tầng này được dùng Prisma.
  adapters/    SDK/API của nhà cung cấp bên ngoài (Render, Zalo, eSMS, VietQR, Google…).
```

Ranh giới được kiểm tự động (`npm run lint:ratchet`, test kiến trúc trong `tests/unit/architecture/`): `domain/` không import
infra, Prisma chỉ ở `infra/`, SDK nhà cung cấp chỉ ở `adapters/`, không gọi thẳng nhà cung cấp AI (`no-direct-ai-provider.test.ts`).

Ví dụ phân hệ đầy đủ tầng: `src/modules/custom-domain/` (domain chuẩn hoá tên miền và phân loại đường dẫn; use-case quản lý và
định tuyến; infra repository và đọc DNS; adapter API Render).

## 4. Luồng một request API

1. `src/proxy.ts` gắn `x-request-id`; với tên miền riêng của cửa hàng thì quyết định cho đi tiếp hay trả 404
   (`src/modules/custom-domain/use-cases/resolve-custom-domain.ts`).
2. Route `api/.../route.ts` bọc trong `handle()` (`src/core/http/response.ts`): mở ngữ cảnh mã yêu cầu và ngữ cảnh CSDL
   (`src/core/tenancy/db-context.ts`), chuyển lỗi `AppError` thành mã HTTP, ghi nhật ký truy cập bị chặn và thao tác ghi thành công
   (`src/core/http/request-audit.ts`).
3. Route gọi `requireTenantContext(request)` (`org/use-cases/resolve-session.ts`): đọc phiên từ cookie, lấy `organization_id`,
   vai, quyền, chi nhánh **từ bản ghi phiên phía máy chủ**; gắn tổ chức vào ngữ cảnh CSDL cho Row Level Security.
   Console nền tảng dùng `requirePlatformContext` (`src/modules/platform/use-cases/resolve-platform-session.ts`).
4. Route kiểm đầu vào bằng `zod`, gọi đúng một use-case.
5. Use-case gọi `requireCapability(ctx, "<mã>")`, dùng luật domain, gọi repository với `organizationId` lấy từ ngữ cảnh.
6. Trả `jsonResponse({ data })`; lỗi có mã ổn định: `NOT_FOUND` (404), `CAPABILITY_DENIED` (403), `VALIDATION_FAILED` (400),
   `CONFLICT` (409), `QUOTA_EXCEEDED` (422), `SUBSCRIPTION_OVERDUE` (402), `RATE_LIMITED` (429) — `src/core/http/errors.ts`.

Mọi route mới phải có gác quyền; route không gác phải nằm trong danh sách có lý do ở
`tests/unit/architecture/route-capability-guard.test.ts`.

## 5. Tác vụ nền (job)

- Web tạo job bằng `src/modules/jobs/use-cases/enqueue-job.ts` vào bảng `jobs` (kèm `organization_id`, loại job, đầu vào).
  Credit trừ lúc tạo job; job hỏng được hoàn (`src/modules/usage/use-cases/refund-job.ts`).
- Worker Python nhận job bằng `SELECT … FOR UPDATE SKIP LOCKED`, chạy trong ngữ cảnh tổ chức của dòng job
  (`workers/shared/rls.py`), ghi kết quả và sự kiện job.
- Theo dõi, huỷ, chạy lại: `api/jobs/[id]/{cancel,retry,events}`; job treo được quét bởi
  `src/modules/jobs/use-cases/scan-stuck-jobs.ts`; hàng đợi lỗi xử lý ở Console (`N15`).
- Bộ quét định kỳ trong tiến trình web khởi động ở `src/instrumentation.ts` (nhắc giao, thu nốt, đối soát…), chạy với quyền hệ
  thống. Cron Render `smeos-cron-dispatch-sweep` gọi các route nội bộ `api/internal/*` có `x-cron-secret`.

## 6. AI

- Lời gọi AI duy nhất: `callCapability` (`src/core/ai/gateway.ts`). Gateway chọn mô hình theo chính sách của tổ chức, kiểm sàn
  riêng tư, trần chi phí mỗi lượt, ghi `ai_requests` (kể cả `cost_usd`), và giới hạn số lần thử.
- Mỗi lượt AI tính phí trừ credit và chịu hạn mức tháng (`src/modules/usage/`); vượt hạn mức trả 422 `QUOTA_EXCEEDED`.
- Hành trình ảnh 14 chặng (tải ảnh → nhận diện → … → duyệt → xuất bản): `src/modules/journey/`, quy tắc trong
  `.claude/skills/creative-studio/`. Thay đổi chạm tới tính năng người dùng tải ảnh phải xác định rõ những chặng nào chạy.

## 7. Lưu trữ tệp

Cổng `StorageProvider`, khoá tệp dạng `org/<organization_id>/…`, URL ký có hạn theo phương thức, kiểm nội dung khi tải lên,
thùng rác 30 ngày, giữ dữ liệu theo yêu cầu pháp lý. Mã ở `src/modules/storage/`, `src/modules/assets/`; quy tắc trong skill
`storage`. Trang công khai chỉ nhận URL ký của tài sản thuộc đúng tổ chức sở hữu dữ liệu.

## 8. Thông báo

Hệ thống thông báo 4 tầng (nền tảng → ngành → chuỗi → cửa hàng): danh mục sự kiện, chính sách kích hoạt kênh, khoá cứng theo phạm
vi, kênh trong ứng dụng, email, Telegram; SMS/ZNS cho khách qua adapter eSMS và Zalo ZNS. Mã ở `src/modules/notification/`,
`gc/use-cases/notify-staff.ts`, `gc/use-cases/notify-customer.ts`. Tin gửi khách trừ credit; hết credit vẫn gửi trong mức thấu
chi Console đặt.

## 9. Giao diện

- Thư viện component `src/components/ui/`; biểu tượng import trực tiếp từ `@/components/ui/icon-set/<tên>`.
- Chỉ dùng token ngữ nghĩa (`text-text-muted`, `bg-surface`…), mỗi màn một nút chính, hộp xác nhận bằng `useConfirmDialog`.
  `npm run lint:ux -- --check` chặn vi phạm mới.
- Chữ trên giao diện là tiếng Việt tự nhiên, không hiện mã kỹ thuật. Từ điển dùng chung `src/lib/i18n/locales/`.
- Menu sinh từ `src/components/layout/nav/` (cửa hàng `nav-store-entries.ts`, chuỗi `nav-chain.ts`, Console `nav-mother.ts`); mỗi
  mục mang mã năng lực, ẩn khi người dùng không có quyền.
- Hệ thống thiết kế: `docs/design-system/README.md`. Nguyên tắc hiển thị dần: `docs/dac-ta/ux-patterns/OPERATING_PRINCIPLES.md`.
