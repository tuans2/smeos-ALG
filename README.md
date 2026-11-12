# ALG

Nền tảng quản trị và vận hành doanh nghiệp vừa và nhỏ (SME OS).

```
src/       Next.js + TypeScript — core web và API /api/v1
workers/   Python — xử lý ảnh (M01, M04a)
prisma/    lược đồ dùng chung
```

Hai bên nối nhau qua bảng `generation_jobs` trên Postgres, không qua HTTP và không qua tiến trình con.

## Đọc trước khi làm bất cứ việc gì

| # | Tệp | Nội dung |
|---|---|---|
| 1 | `docs/kien-truc/TRANG_THAI.md` | Đang ở đâu, làm gì tiếp |
| 2 | `docs/kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md` | Kiến trúc đích, lộ trình P0–P12 |
| 3 | `docs/dac-ta/` | Bộ đặc tả 14 tệp — PRD, yêu cầu kỹ thuật, năng lực, UX, frontend, backend, API, cơ sở dữ liệu, tích hợp, dữ liệu mẫu, checklist |
| 4 | `docs/kien-truc/HARVEST_MANIFEST.md` | Thu hoạch gì từ repo nào, hạng REUSE/EXTEND/ADAPTER/BUILD |
| 5 | `AGENTS.md` | Quy ước, bản đồ mã, bẫy |

## Chạy tại máy

```bash
cp .env.example .env      # điền SESSION_SECRET
docker compose up -d
npm i
npx prisma generate
npm run db:deploy         # prisma migrate deploy
npx prisma db seed        # bốn vai hệ thống
npm run dev
```

Chuỗi kết nối nằm ở `prisma.config.ts` cho lệnh dòng lệnh và ở driver adapter cho `PrismaClient`; Prisma 7 không nhận `url` trong `schema.prisma`.

## Trạng thái

Cập nhật 21/10/2026. Nền tảng (P0–P12) đã xong; các module nghiệp vụ (sản phẩm, ảnh, video, catalog, CRM, đơn hàng, điều phối, thẻ chào, chat, nội dung, Console Vận hành) đã có mã và chạy đa ngành qua Industry Plugin. Trạng thái chi tiết và việc kế tiếp: `docs/kien-truc/TRANG_THAI.md` (mục 4–6, tra phần còn lại bằng `grep`). Cổng dev mặc định là 3200 (`npm run dev`).

## Ba repo còn lại

| Repo | Vai trò |
|---|---|
| `FloraOS` | v1, đóng băng tính năng, phục vụ AVI GIFT tới ngày cắt. Nguồn thu hoạch |
| `LocalBudd` | M05 Landing Page · M06 Catalog |
| `SocialFlow` | M04b Marketing Creative · M07 Content & Social Publishing |
