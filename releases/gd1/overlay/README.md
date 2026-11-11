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
npm run dev               # http://localhost:3200
```

Worker: `npm run worker:vision`, `npm run worker:media` (cần Python 3.11+, `pip install -r workers/requirements.txt`).

## Kiểm tra trước khi đưa mã lên

```bash
npm run typecheck && npm run lint:ratchet
npm test
npm run build
cd workers && python -m pytest tests -q
```

`npm run test:tenant` và `npm run test:platform` xoá sạch dữ liệu và chỉ chạy trên cơ sở dữ liệu có tên kết thúc bằng `_test`.
