# Ma trận tuyến và module

> Lần 2: sinh lại từ mã thật (`src/app/**/page.tsx`, `src/lib/feature-lock.ts`, `src/lib/delivery/gd1.routes.json`, `src/modules/*`) trên `main` @ `631c4921` (12/11/2026). Lần 1: 06/11/2026 @ `d8dd00d`. Tổng hợp: [`README.md`](README.md).

## 1. Tuyến giao diện (114 trang)

Danh sách 114 trang không đổi so với lần 1. "Dữ liệu thật" nghĩa là trang, hoặc component trang nhập (sâu tới 5 tầng), có gọi API/use-case/repository; cột này giữ kết quả lần 1 vì không trang nào được thêm hay xoá.

- Cột "smeOS production": "Khoá" theo `LOCKED_ROUTE_PREFIXES` (chỉ áp khi `NEXT_PUBLIC_APP_ENV=production`); "Không chạy" theo `UNAVAILABLE_ROUTE_PREFIXES` (áp ở mọi bản build production).
- Cột "Bản giao GD1": theo `gd1.routes.json`. Trang không giao trả 404 khi bật chế độ giai đoạn, và bị cắt khỏi bản giao.

Từ 12/11/2026 mọi tuyến khoá đều có guard URL (L-03 đã sửa; `tests/unit/architecture/locked-route-guard.test.ts`). Cả hai mục điều hướng trỏ tới trang không tồn tại ở lần 1 (L-01, L-02) đã được gỡ ngày 07/11 (`ebd7a6ea`). `tests/unit/architecture/nav-href-exists.test.ts` chặn lỗi này tái phát.

| Nhóm | Tuyến | smeOS production | Bản giao GD1 | Dữ liệu | Ghi chú |
|---|---|---|---|---|---|
| Cửa hàng | / | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /audit | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /bang-gia | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /bang-gia/[id] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /bao-cao | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /bao-gia | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /bo-may | 🔒 Khoá (có guard URL) | — Không giao (Tri thức, bộ máy AI, mục phụ) | Dữ liệu thật |  |
| Cửa hàng | /cai-dat | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat-ai | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-camket | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-chinhsach | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-phigiacong | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-thanhtoan-datco | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-uudai | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/thanh-vien | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/thanh-vien/vai-tro | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/thong-bao | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /catalog | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cham-soc | ✅ Mở | — Không giao (Nghiên cứu thị trường và thu hút khách) | Dữ liệu thật | L-04 đã sửa 12/11: thêm `GET /api/v1/customers` cho nhóm "Tất cả khách" |
| Cửa hàng | /chat | ✅ Mở | — Không giao (Hội thoại đa kênh và kết nối ứng dụng ngoài) | Chuyển hướng |  |
| Cửa hàng | /cong-cu | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /cong-cu/anh-san-pham | ✅ Mở | — Không giao (Sáng tạo ảnh, video, nội dung) | Dữ liệu thật |  |
| Cửa hàng | /cong-cu/bo-anh-san-pham | ✅ Mở | — Không giao (Sáng tạo ảnh, video, nội dung) | Dữ liệu thật |  |
| Cửa hàng | /cong-cu/poster-banner | ✅ Mở | — Không giao (Sáng tạo ảnh, video, nội dung) | Dữ liệu thật |  |
| Cửa hàng | /creative-studio | 🔒 Khoá (có guard URL) | — Không giao (Sáng tạo ảnh, video, nội dung) | Dữ liệu thật |  |
| Cửa hàng | /cua-hang | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /dieu-phoi | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /dieu-phoi/doi-tac | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật | L-05 đã sửa 11/11 (`36abda77`): hộp thoại gọi `PATCH /api/v1/coordinator/partners/:id/tools` |
| Cửa hàng | /don-hang | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /du-lieu | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /duyet | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /gia | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /ho-so | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /ho-so/danh-thiep | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /ho-so/thu-vien-thuong-hieu | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /hoi-thoai | 🔒 Khoá (có guard URL) | — Không giao (Hội thoại đa kênh và kết nối ứng dụng ngoài) | Dữ liệu thật |  |
| Cửa hàng | /hoi-thoai/kenh-tich-hop | 🔒 Khoá (có guard URL) | — Không giao (Hội thoại đa kênh và kết nối ứng dụng ngoài) | Chuyển hướng |  |
| Cửa hàng | /in-an | ✅ Mở | — Không giao (Sáng tạo ảnh, video, nội dung) | Dữ liệu thật |  |
| Cửa hàng | /job | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /job/[id] | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /ket-noi | ⛔ Không chạy trên production | — Không giao (Hội thoại đa kênh và kết nối ứng dụng ngoài) | Dữ liệu thật | Còn đi qua proxy SocialFlow — production không cấu hình |
| Cửa hàng | /khach-hang | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /kho-du-lieu | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /kho-templates | 🔒 Khoá (có guard URL) | — Không giao (Sáng tạo ảnh, video, nội dung) | Dữ liệu thật |  |
| Cửa hàng | /landing-page | ✅ Mở | ✅ Giao | Chuyển hướng |  |
| Cửa hàng | /lich-dang | ⛔ Không chạy trên production | — Không giao (Nghiên cứu thị trường và thu hút khách) | Dữ liệu thật | Còn đi qua proxy SocialFlow — production không cấu hình |
| Cửa hàng | /market-intelligence | ⛔ Không chạy trên production | — Không giao (Nghiên cứu thị trường và thu hút khách) | Dữ liệu thật | Worker nghiên cứu thị trường chưa triển khai trên Render |
| Cửa hàng | /muc-dung | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /noi-bo/ket-noi | 🔒 Khoá (có guard URL) | — Không giao (Hội thoại đa kênh và kết nối ứng dụng ngoài) | Dữ liệu thật |  |
| Cửa hàng | /noi-dung | 🔒 Khoá (có guard URL) | — Không giao (Sáng tạo ảnh, video, nội dung) | Dữ liệu thật |  |
| Cửa hàng | /quang-ba/chien-dich | ✅ Mở | — Không giao (Nghiên cứu thị trường và thu hút khách) | Dữ liệu thật |  |
| Cửa hàng | /san-pham | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /san-pham/[id] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /san-pham/[id]/tinh-nang | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /san-pham/[id]/tinh-nang/product-copy/[copyId] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /san-pham/kha-dung | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /san-pham/nhap-hang-loat | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /san-pham/tao-moi | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /so-lieu | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /tai-anh | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /the-chao | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /them | ✅ Mở | — Không giao (Tri thức, bộ máy AI, mục phụ) | Dữ liệu thật |  |
| Cửa hàng | /thu-hut-khach | ✅ Mở | — Không giao (Nghiên cứu thị trường và thu hút khách) | Dữ liệu thật |  |
| Cửa hàng | /tich-hop | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /tin-nhan | 🔒 Khoá (có guard URL) | ✅ Giao | Dữ liệu thật | Có guard URL từ lần rà 2 (lần 1: chỉ khoá sidebar) |
| Cửa hàng | /tinh-gia | ✅ Mở | ✅ Giao | Chuyển hướng |  |
| Cửa hàng | /tinh-gia/cong-thuc | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia/du-toan | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia/gia-ban | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia/gia-von | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia/nguyen-lieu | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /tri-thuc | 🔒 Khoá (có guard URL) | — Không giao (Tri thức, bộ máy AI, mục phụ) | Không gọi dữ liệu | Nội dung tĩnh (`knowledge-base/knowledge-data.ts`), không đọc dữ liệu |
| Cửa hàng | /uu-dai | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /uu-dai/ma-giam-gia | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /vai-tro | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Cửa hàng | /video | 🔒 Khoá (có guard URL) | — Không giao (Sáng tạo ảnh, video, nội dung) | Dữ liệu thật |  |
| Đăng nhập | /dang-nhap | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/cau-hinh | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/dang-ky | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/du-lieu | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/hang-doi-loi | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-camket | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-chinhsach | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-phigiacong | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-thanhtoan-datco | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-uudai | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/marketplace | ✅ Mở | — Không giao (Công cụ nội bộ của đội phát triển và chợ đối tác) | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/muc-dung | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/nganh | ✅ Mở | — Không giao (Tầng SaaS Ngành) | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/nhat-ky | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/phe-duyet | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/quan-tri-ma-tran | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/suc-khoe | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/thong-bao | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/thu-vien-giao-dien | ✅ Mở | — Không giao (Công cụ nội bộ của đội phát triển và chợ đối tác) | Không gọi dữ liệu | Thư viện giao diện tĩnh (nội bộ) |
| Console nền tảng | /van-hanh/thu-vien-man-hinh | ✅ Mở | — Không giao (Công cụ nội bộ của đội phát triển và chợ đối tác) | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/tich-hop | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/to-chuc | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/to-chuc/[id] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/truong-du-lieu | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /b/[sendCode] | ✅ Mở | ✅ Giao | Chuyển hướng |  |
| Công khai | /bg/[token] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /bst/[orgSlug]/[catalogCode] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /c/[slug] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /ch/[slug] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /chia-se/cho-doi-tac/[token] | ✅ Mở | — Không giao (Công cụ nội bộ của đội phát triển và chợ đối tác) | Dữ liệu thật |  |
| Công khai | /chinh-sach-bao-mat | ✅ Mở | ✅ Giao | Không gọi dữ liệu |  |
| Công khai | /dang-ky-thanh-cong | ✅ Mở | ✅ Giao | Không gọi dữ liệu |  |
| Công khai | /g/[id] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /in-phieu/[id] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /s/[code] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /subcontract/[orderCode] | ✅ Mở | ✅ Giao | Dữ liệu thật |  |
| Công khai | /xem-truoc-trang | ✅ Mở | ✅ Giao | Dữ liệu thật |  |

## 2. Module backend (55 module)

Đếm số tệp `.ts` theo tầng, không tính test. "Test" ghi dạng a/b: a = số tệp `*.test.ts` trong module, b = số tệp ở `tests/` nhập module. "API" = số route nhập module; "UI" = số tệp `.tsx` nhập module. Lần 1 có 52 module. Có 3 module mới: `brand-kit`, `content-studio`, `social-publishing`.

| Module | domain | use-cases | infra | adapters | Test (module/tests) | API | UI | Nhận xét |
|--|--:|--:|--:|--:|--:|--:|--:|---|
| `acquisition` | 3 | 8 | 3 | 1 | 9/6 | 7 | 3 |  |
| `ad-banner-poster` | 8 | 3 | 0 | 2 | 6/0 | 3 | 8 | Không có ca test ở `tests/` |
| `ai-governance` | 1 | 4 | 0 | 0 | 2/0 | 5 | 0 |  |
| `assets` | 9 | 9 | 9 | 3 | 14/38 | 14 | 0 |  |
| `audio-studio` | 9 | 4 | 3 | 1 | 1/4 | 8 | 5 |  |
| `audit` | 2 | 5 | 4 | 0 | 3/4 | 22 | 0 |  |
| `availability` | 3 | 3 | 1 | 0 | 3/3 | 3 | 5 |  |
| `avi-gift-import` | 2 | 3 | 0 | 0 | 2/2 | 0 | 0 |  |
| `brand-kit` | 11 | 6 | 2 | 2 | 4/1 | 5 | 12 | Mới sau lần 1 (mục Thương hiệu 3 bước, PR #3) |
| `care-cards` | 1 | 0 | 0 | 0 | 1/0 | 0 | 5 | Chỉ domain + UI, không use-case/infra riêng (dùng API `crm`) |
| `catalog-links` | 5 | 7 | 3 | 0 | 5/8 | 7 | 19 |  |
| `catalog-studio` | 9 | 1 | 0 | 0 | 2/5 | 0 | 22 | Sinh catalog phía client; không có infra/API riêng; tuyến `/catalog` khoá |
| `chain-partnership` | 4 | 5 | 5 | 0 | 2/3 | 10 | 2 |  |
| `chat-assistant` | 10 | 11 | 5 | 2 | 6/13 | 8 | 11 |  |
| `content-engine` | 27 | 7 | 5 | 2 | 10/33 | 6 | 12 |  |
| `content-studio` | 2 | 2 | 1 | 0 | 2/1 | 4 | 1 | Mới sau lần 1 (Tạo nội dung 4 bước, PR #11/#12) |
| `coordinator` | 21 | 21 | 10 | 1 | 8/14 | 22 | 10 | `connectors/crm-notification-connector.ts` trả `true` mà không làm gì — mã chết, không nơi nào gọi |
| `costing` | 9 | 2 | 1 | 0 | 5/0 | 9 | 7 |  |
| `creative-production` | 19 | 13 | 4 | 3 | 2/21 | 22 | 10 | `narrative-ai-adapter.ts` là stub, dùng luật thay AI |
| `crm` | 10 | 20 | 10 | 0 | 9/11 | 17 | 7 |  |
| `custom-domain` | 1 | 3 | 2 | 1 | 2/1 | 5 | 0 |  |
| `field-platform` | 20 | 20 | 6 | 1 | 17/2 | 16 | 11 |  |
| `greeting-card` | 108 | 101 | 55 | 17 | 117/126 | 110 | 163 |  |
| `integration` | 6 | 9 | 5 | 0 | 5/5 | 15 | 1 |  |
| `integration-hub` | 9 | 14 | 7 | 5 | 8/8 | 18 | 10 |  |
| `internal-chat` | 14 | 15 | 11 | 0 | 10/1 | 11 | 6 | 9 tệp `tests/tenant/internal-chat-*` (test chạy qua route, không nhập module trực tiếp) |
| `jobs` | 5 | 7 | 7 | 1 | 3/18 | 26 | 2 |  |
| `journey` | 12 | 3 | 1 | 1 | 10/3 | 2 | 12 |  |
| `landing-page` | 5 | 1 | 1 | 0 | 2/3 | 1 | 3 |  |
| `market-intelligence` | 13 | 5 | 2 | 9 | 1/12 | 6 | 22 | Related queries Google Trends chưa nối (`google-trends-adapter.ts:221`); worker chưa triển khai |
| `marketing-center` | 20 | 8 | 3 | 0 | 8/4 | 5 | 9 |  |
| `media` | 10 | 11 | 0 | 0 | 5/15 | 10 | 10 |  |
| `notification` | 18 | 12 | 15 | 2 | 12/6 | 18 | 2 | SMS/Zalo gửi thật khi tầng Mẹ đăng ký nhà cung cấp (thiếu thì `NOT_CONFIGURED`); Web Push tự viết theo RFC 8291/VAPID |
| `orders` | 20 | 29 | 23 | 0 | 22/34 | 30 | 14 |  |
| `organization` | 40 | 38 | 28 | 0 | 24/53 | 389 | 92 |  |
| `platform` | 16 | 28 | 17 | 1 | 13/28 | 54 | 22 |  |
| `print` | 3 | 4 | 1 | 0 | 3/2 | 4 | 7 |  |
| `product-copies` | 6 | 5 | 3 | 1 | 7/3 | 7 | 0 |  |
| `product-image-set` | 4 | 2 | 0 | 0 | 1/0 | 2 | 4 |  |
| `product-photo-studio` | 4 | 3 | 0 | 0 | 1/0 | 3 | 4 |  |
| `products` | 34 | 27 | 11 | 1 | 33/82 | 28 | 41 |  |
| `profiles` | 12 | 9 | 8 | 0 | 8/7 | 15 | 17 |  |
| `promotions` | 2 | 2 | 5 | 0 | 2/2 | 3 | 2 |  |
| `proxy` | 1 | 1 | 1 | 0 | 2/0 | 1 | 0 | Proxy sang SocialFlow/LocalBudd — production chưa cấu hình |
| `reporting` | 6 | 1 | 1 | 0 | 0/3 | 5 | 2 | Không có unit test trong module; có ca tenant |
| `sales` | 4 | 8 | 5 | 1 | 4/6 | 7 | 4 |  |
| `shop-reviews` | 1 | 2 | 1 | 0 | 0/2 | 2 | 2 |  |
| `social-publishing` | 3 | 6 | 3 | 9 | 2/3 | 9 | 0 | Mới sau lần 1 (đăng bài tự động trong smeOS, D-46) |
| `sso` | 1 | 0 | 1 | 0 | 2/0 | 3 | 0 |  |
| `storage` | 4 | 3 | 5 | 0 | 5/6 | 6 | 4 |  |
| `subscription` | 1 | 7 | 3 | 0 | 1/8 | 6 | 0 |  |
| `templates` | 2 | 3 | 1 | 0 | 2/0 | 2 | 0 | Không có ca test ở `tests/` |
| `toolkit` | 10 | 0 | 0 | 0 | 4/2 | 0 | 10 | Danh mục công cụ thuần dữ liệu |
| `usage` | 9 | 8 | 6 | 0 | 3/20 | 4 | 10 |  |
| `video-studio` | 6 | 9 | 3 | 0 | 4/5 | 6 | 6 |  |
