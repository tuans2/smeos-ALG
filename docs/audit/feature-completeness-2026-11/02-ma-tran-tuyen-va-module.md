# Ma trận tuyến và module

> Sinh từ mã thật (`src/app/**/page.tsx`, `src/lib/feature-lock.ts`, `src/modules/*`) ngày 06/11/2026. Tổng hợp: [`README.md`](README.md).

## 1. Tuyến giao diện (114 trang)

"Dữ liệu thật" = trang hoặc component nó nhập (sâu 5 tầng) có gọi API/use-case/repository. "Khoá" theo `LOCKED_ROUTE_PREFIXES` (chỉ khi `NEXT_PUBLIC_APP_ENV=production`); "Không chạy" theo `UNAVAILABLE_ROUTE_PREFIXES` (mọi bản build production).

Ngoài bảng: 2 mục điều hướng trỏ tới trang **không tồn tại** — `/cong-cu/toi-uu-he-thong` ("Trợ lý tối ưu", L-01) và `/van-hanh/san-pham` ("Catalog toàn hệ thống", L-02).

| Nhóm | Tuyến | Trạng thái production | Dữ liệu | Ghi chú |
|---|---|---|---|---|
| Cửa hàng | / | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /audit | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /bang-gia | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /bang-gia/[id] | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /bao-cao | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /bao-gia | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /bo-may | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /cai-dat | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cai-dat-ai | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-camket | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-chinhsach | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-phigiacong | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-thanhtoan-datco | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/ma-tran-uudai | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/thanh-vien | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/thanh-vien/vai-tro | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cai-dat/thong-bao | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /catalog | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /cham-soc | ✅ Mở | Dữ liệu thật | 🐞 L-04: nhóm "Tất cả khách" gọi `GET /api/v1/customers` không tồn tại |
| Cửa hàng | /chat | ✅ Mở | Chuyển hướng |  |
| Cửa hàng | /cong-cu | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cong-cu/anh-san-pham | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cong-cu/bo-anh-san-pham | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /cong-cu/poster-banner | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /creative-studio | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /cua-hang | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /dieu-phoi | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /dieu-phoi/doi-tac | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật | 🐞 L-05: lưu công cụ mở cho đối tác gọi `PUT /api/v1/network/partners/:id/unlocked-tools` không tồn tại |
| Cửa hàng | /don-hang | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /du-lieu | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /duyet | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /gia | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /ho-so | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /ho-so/danh-thiep | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /ho-so/thu-vien-thuong-hieu | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /hoi-thoai | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /hoi-thoai/kenh-tich-hop | 🔒 Khoá (có guard URL) | Chuyển hướng |  |
| Cửa hàng | /in-an | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /job | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /job/[id] | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /ket-noi | ⛔ Không chạy trên production | Dữ liệu thật | Còn đi qua proxy SocialFlow — production không cấu hình |
| Cửa hàng | /khach-hang | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /kho-du-lieu | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /kho-templates | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /landing-page | ✅ Mở | Chuyển hướng |  |
| Cửa hàng | /lich-dang | ⛔ Không chạy trên production | Dữ liệu thật | Còn đi qua proxy SocialFlow — production không cấu hình |
| Cửa hàng | /market-intelligence | ⛔ Không chạy trên production | Dữ liệu thật | Worker nghiên cứu thị trường chưa triển khai trên Render |
| Cửa hàng | /muc-dung | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /noi-bo/ket-noi | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /noi-dung | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Cửa hàng | /quang-ba/chien-dich | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /san-pham | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /san-pham/[id] | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /san-pham/[id]/tinh-nang | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /san-pham/[id]/tinh-nang/product-copy/[copyId] | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /san-pham/kha-dung | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /san-pham/nhap-hang-loat | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /san-pham/tao-moi | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /so-lieu | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /tai-anh | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /the-chao | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /them | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /thu-hut-khach | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /tich-hop | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /tin-nhan | 🔒 Khoá sidebar — gõ URL vẫn vào | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia | ✅ Mở | Chuyển hướng |  |
| Cửa hàng | /tinh-gia/cong-thuc | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia/du-toan | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia/gia-ban | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia/gia-von | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /tinh-gia/nguyen-lieu | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /tri-thuc | 🔒 Khoá (có guard URL) | Không gọi dữ liệu | Nội dung tĩnh (`knowledge-base/knowledge-data.ts`), không đọc dữ liệu |
| Cửa hàng | /uu-dai | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /uu-dai/ma-giam-gia | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /vai-tro | ✅ Mở | Dữ liệu thật |  |
| Cửa hàng | /video | 🔒 Khoá (có guard URL) | Dữ liệu thật |  |
| Đăng nhập | /dang-nhap | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/cau-hinh | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/dang-ky | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/du-lieu | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/hang-doi-loi | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-camket | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-chinhsach | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-phigiacong | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-thanhtoan-datco | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/ma-tran-uudai | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/marketplace | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/muc-dung | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/nganh | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/nhat-ky | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/phe-duyet | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/quan-tri-ma-tran | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/suc-khoe | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/thong-bao | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/thu-vien-giao-dien | ✅ Mở | Không gọi dữ liệu | Thư viện giao diện tĩnh (nội bộ) |
| Console nền tảng | /van-hanh/thu-vien-man-hinh | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/tich-hop | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/to-chuc | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/to-chuc/[id] | ✅ Mở | Dữ liệu thật |  |
| Console nền tảng | /van-hanh/truong-du-lieu | ✅ Mở | Dữ liệu thật |  |
| Công khai | /b/[sendCode] | ✅ Mở | Chuyển hướng |  |
| Công khai | /bg/[token] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /bst/[orgSlug]/[catalogCode] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /c/[slug] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /ch/[slug] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /chia-se/cho-doi-tac/[token] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /chinh-sach-bao-mat | ✅ Mở | Không gọi dữ liệu |  |
| Công khai | /dang-ky-thanh-cong | ✅ Mở | Không gọi dữ liệu |  |
| Công khai | /g/[id] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /in-phieu/[id] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /s/[code] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /subcontract/[orderCode] | ✅ Mở | Dữ liệu thật |  |
| Công khai | /xem-truoc-trang | ✅ Mở | Dữ liệu thật |  |

## 2. Module backend (52 module)

Số tệp `.ts` (không tính test) theo tầng; "Test" = tệp `*.test.ts` trong module + tệp ở `tests/` nhập module; "API"/"UI" = số route/tệp `.tsx` nhập module.

| Module | domain | use-cases | infra | adapters | Test (module/tests) | API | UI | Nhận xét |
|---|--:|--:|--:|--:|--:|--:|--:|---|
| `acquisition` | 3 | 7 | 3 | 1 | 8/4 | 6 | 2 |  |
| `ad-banner-poster` | 8 | 3 | 0 | 1 | 5/0 | 3 | 8 | Không có ca test ở `tests/` |
| `ai-governance` | 1 | 4 | 0 | 0 | 2/0 | 6 | 0 |  |
| `assets` | 9 | 9 | 9 | 3 | 14/26 | 12 | 0 |  |
| `audio-studio` | 9 | 4 | 3 | 1 | 1/3 | 8 | 5 |  |
| `audit` | 1 | 3 | 3 | 0 | 2/5 | 8 | 0 |  |
| `availability` | 3 | 3 | 1 | 0 | 3/3 | 3 | 5 |  |
| `avi-gift-import` | 2 | 3 | 0 | 0 | 2/2 | 0 | 0 |  |
| `care-cards` | 1 | 0 | 0 | 0 | 1/0 | 0 | 5 | Chỉ domain + UI, không use-case/infra riêng (dùng API `crm`) |
| `catalog-links` | 4 | 6 | 3 | 0 | 4/5 | 7 | 18 |  |
| `catalog-studio` | 9 | 1 | 0 | 0 | 2/5 | 0 | 22 | Sinh catalog phía client; không có infra/API riêng; tuyến `/catalog` khoá |
| `chain-partnership` | 3 | 3 | 4 | 0 | 1/2 | 6 | 2 |  |
| `chat-assistant` | 12 | 13 | 5 | 3 | 6/13 | 8 | 11 |  |
| `content-engine` | 25 | 6 | 5 | 2 | 8/30 | 5 | 12 |  |
| `coordinator` | 19 | 19 | 8 | 7 | 6/8 | 22 | 10 | `connectors/crm-notification-connector.ts` trả `true` mà không làm gì — mã chết, không nơi nào gọi |
| `costing` | 9 | 2 | 1 | 1 | 4/0 | 9 | 7 |  |
| `creative-production` | 19 | 13 | 4 | 3 | 2/22 | 23 | 10 | `narrative-ai-adapter.ts` là stub, dùng luật thay AI |
| `crm` | 8 | 17 | 6 | 0 | 6/3 | 14 | 5 |  |
| `custom-domain` | 7 | 3 | 2 | 1 | 2/1 | 5 | 0 |  |
| `field-platform` | 20 | 20 | 6 | 1 | 17/2 | 16 | 11 |  |
| `greeting-card` | 106 | 101 | 53 | 17 | 114/111 | 110 | 167 |  |
| `integration-hub` | 9 | 15 | 7 | 5 | 8/6 | 18 | 10 |  |
| `integration` | 5 | 9 | 5 | 0 | 5/2 | 15 | 1 |  |
| `internal-chat` | 4 | 6 | 1 | 0 | 1/0 | 6 | 3 | Không có ca test ở `tests/` |
| `jobs` | 4 | 7 | 6 | 1 | 2/17 | 25 | 0 |  |
| `journey` | 12 | 3 | 1 | 1 | 10/1 | 2 | 11 |  |
| `landing-page` | 5 | 1 | 1 | 0 | 2/3 | 1 | 2 |  |
| `market-intelligence` | 13 | 5 | 2 | 9 | 1/12 | 6 | 22 | Related queries Google Trends chưa nối (`google-trends-adapter.ts:221`); worker chưa triển khai |
| `marketing-center` | 20 | 8 | 3 | 0 | 8/4 | 5 | 8 |  |
| `media` | 10 | 11 | 0 | 0 | 5/14 | 10 | 10 |  |
| `notification` | 14 | 10 | 12 | 9 | 7/4 | 15 | 2 | Kênh SMS/Zalo/Web Push cho nhân viên là stub |
| `orders` | 11 | 26 | 16 | 0 | 18/11 | 27 | 11 |  |
| `organization` | 35 | 34 | 22 | 0 | 23/49 | 387 | 89 |  |
| `platform` | 15 | 26 | 17 | 1 | 12/19 | 55 | 22 |  |
| `print` | 3 | 4 | 1 | 0 | 3/2 | 4 | 7 |  |
| `product-copies` | 6 | 5 | 3 | 1 | 7/2 | 7 | 0 |  |
| `product-image-set` | 4 | 2 | 0 | 0 | 1/0 | 2 | 4 |  |
| `product-photo-studio` | 4 | 3 | 0 | 0 | 1/0 | 3 | 4 |  |
| `products` | 30 | 27 | 11 | 1 | 31/63 | 29 | 38 |  |
| `profiles` | 12 | 9 | 8 | 0 | 8/6 | 15 | 16 |  |
| `promotions` | 2 | 2 | 5 | 0 | 2/2 | 3 | 2 |  |
| `proxy` | 1 | 1 | 1 | 0 | 2/0 | 1 | 0 | Proxy sang SocialFlow/LocalBudd — production chưa cấu hình |
| `reporting` | 5 | 1 | 1 | 0 | 0/2 | 5 | 0 | Không có unit test trong module; có ca tenant |
| `sales` | 3 | 7 | 4 | 1 | 3/3 | 6 | 4 |  |
| `shop-reviews` | 1 | 2 | 1 | 0 | 0/2 | 2 | 2 |  |
| `sso` | 1 | 0 | 1 | 0 | 2/1 | 3 | 0 |  |
| `storage` | 4 | 3 | 5 | 0 | 5/5 | 6 | 4 |  |
| `subscription` | 1 | 6 | 2 | 0 | 0/5 | 5 | 0 | Không có unit test trong module; có ca tenant |
| `templates` | 2 | 3 | 1 | 0 | 2/0 | 2 | 0 | Không có test |
| `toolkit` | 7 | 0 | 0 | 0 | 3/0 | 0 | 7 | Danh mục công cụ thuần dữ liệu |
| `usage` | 8 | 8 | 6 | 0 | 3/19 | 4 | 7 |  |
| `video-studio` | 6 | 7 | 2 | 0 | 3/2 | 6 | 6 |  |
