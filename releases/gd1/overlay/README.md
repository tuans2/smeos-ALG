# smeOS — bản giao Giai đoạn 1

Nền tảng quản trị và vận hành cho doanh nghiệp vừa và nhỏ, gồm ba tầng: Nền tảng (SaaS Mother), Chuỗi (ChainOS) và Cửa hàng (StoreOS), với 123 chức năng trong `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx`.

```
src/       Next.js + TypeScript — giao diện web và API /api/v1
workers/   Python — nhận diện ảnh (vision) và xử lý ảnh (media_ai)
prisma/    lược đồ cơ sở dữ liệu, migration, dữ liệu khởi tạo
```

Web và worker nối nhau qua bảng `generation_jobs` trên Postgres.

## Tài liệu

| Thư mục | Nội dung |
|---|---|
| `docs/tai-lieu-ky-thuat/` | Kiến trúc, cách ly dữ liệu và phân quyền, quy trình kiểm thử, vận hành; mô tả từng nhóm chức năng |
| `docs/huong-dan-su-dung/` | Hướng dẫn sử dụng theo 10 nhóm chức năng |
| `docs/nghiem-thu/` | Checklist và kịch bản nghiệm thu 123 chức năng |
| `docs/handover/OPERATIONS_RUNBOOK.md` | Sổ tay vận hành |
| `docs/design-system/`, `docs/dac-ta/` | Hệ thống thiết kế, Screen Contract và mẫu giao diện |

## Chạy tại máy

```bash
cp .env.example .env      # điền SESSION_SECRET, INTEGRATION_TOKEN_SECRET, SSO_SESSION_SECRET
docker compose up -d
npm ci
npx prisma generate
npm run db:deploy
npm run db:seed
npm run seed:field-registry   # danh mục trường dữ liệu nền tảng (đơn hàng, đối tác)
npm run dev               # http://localhost:3200
```

Worker: `npm run worker:vision`, `npm run worker:media` (cần Python 3.11+, `pip install -r workers/requirements.txt`).

Người vận hành nền tảng đầu tiên (Console `/van-hanh`):

1. Mở `/dang-nhap?che-do=dang-ky`, đăng ký tài khoản của người vận hành (tài khoản ở trạng thái chờ duyệt).
2. Chạy `npm run gan-van-hanh-nen-tang -- --email=<email vừa đăng ký>`: cấp đủ mã vận hành và duyệt tài khoản.
3. Đăng nhập rồi vào `/van-hanh`. Các cửa hàng sau đó tạo ở Console → Tổ chức, hoặc duyệt ở Console → Đăng ký.

## Kiểm tra trước khi đưa mã lên

```bash
npm run typecheck && npm run lint:ratchet
npm test
npm run build
cd workers && python -m pytest tests -q
```

`npm run test:tenant` và `npm run test:platform` xoá sạch dữ liệu và chỉ chạy trên cơ sở dữ liệu có tên kết thúc bằng `_test`.

## CI và triển khai

- `.github/workflows/ci.yml`: typecheck, ESLint, đối chiếu tài liệu đặc tả với mã, kiểm kiến trúc và giao diện, unit test, chuẩn đa ngành, test cách ly tổ chức và nền tảng, build, worker, E2E, quét bí mật, `npm audit`.
- `render.yaml`: Render Blueprint gồm web, worker `media_ai`, worker `vision`, cron 5 phút, Redis và Postgres. Render chỉ deploy commit trên `main` khi CI xanh.
- Không đặt `NEXT_PUBLIC_APP_ENV=production`: biến này bật khoá "Sắp ra mắt" dành cho bản đầy đủ.
- Khoá `PII_ENCRYPTION_KEY` tự tạo và sao lưu trước khi nhận dữ liệu khách thật (sổ tay vận hành §14).
- Thêm `.github/CODEOWNERS` với tài khoản GitHub của người duyệt cho các vùng hệ thống thiết kế (`src/styles/tokens/`, `src/components/ui/`, `src/components/layout/`, `docs/design-system/`).
