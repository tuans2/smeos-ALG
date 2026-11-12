# Dựng bản cắt GD1 từ môi trường trắng và chạy kịch bản nghiệm thu — 11–12/11/2026

Thực hiện Bước 6 của [kế hoạch bàn giao](../../plan/BANGIAO_GD1_123_CHUC_NANG.md). Ứng viên bàn giao: `gd1-rc-2026-11-12-3` (`c342b1a9`). Kết quả từng bước ghi trong [bản checklist đã điền](ket-qua-nghiem-thu-ban-cat-2026-11-12.xlsx) (cột Kết quả, Người chạy, Ngày, Ghi chú); ảnh bằng chứng ở thư mục [`anh/`](anh/).

## 1. Kết luận

- Bản cắt **dựng và chạy được** từ môi trường trắng chỉ theo README: `cp .env.example .env`, cài đặt, migrate, seed, build production, tạo người vận hành đầu tiên bằng `gan-van-hanh-nen-tang`; web + worker `vision` + worker `media_ai` chạy.
- 141 bước nghiệm thu: **118 Đạt**, 4 Đạt một phần, 19 chờ môi trường thật (9 bước đã đạt phần không cần nhà cung cấp, 10 bước cần khoá AI, Zalo ZNS/SMS, SePay, Telegram hoặc ứng dụng liên kết), **0 Không đạt**.
- 25 lỗi phát hiện qua ba lượt chạy đều đã xử lý trên mã smeOS (mục 4); cổng kiểm trên bản cắt xanh (mục 3); bộ kiểm rò rỉ sạch.
- Bản cắt **đủ điều kiện đưa lên repo riêng của ALG**. Các bước chờ môi trường thật chạy trên staging của ALG sau khi có khoá nhà cung cấp.

## 2. Môi trường

| Hạng mục | Thực tế |
|---|---|
| Mã | `npm run release:cut -- gd1 gd1-rc-2026-11-12-3 <thư mục>`, chạy với biến môi trường như CI để sinh lại tệp OpenAPI. Ba lượt: `gd1-rc-2026-11-11-2`, `gd1-rc-2026-11-12`, `gd1-rc-2026-11-12-3` |
| Hạ tầng | Postgres 16.15 (cổng 5433), Redis, `next build` + `next start` (cổng 3200), worker `vision` và `media_ai` (Python 3.13) |
| Cấu hình | `.env` từ `.env.example`, bí mật ngẫu nhiên; `ALLOW_LOCAL_STORAGE=true`; không đặt `NEXT_PUBLIC_APP_ENV` |
| Không có | Khoá AI, Zalo ZNS/SMS, SePay, Telegram, SMTP, DNS và tên miền thật, ứng dụng liên kết |
| Dữ liệu | CSDL trắng cho bước dựng máy; dữ liệu nghiệm thu tích luỹ qua các lượt (nâng cấp bằng `db:deploy` + `db:seed`): 1 người vận hành; cửa hàng A, B, D và chuỗi C (2 chi nhánh) tạo từ Console; 7 nhân viên cửa hàng A; sản phẩm, nguyên liệu, bộ sưu tập, hơn 40 đơn |
| Cách chạy | Trình duyệt Playwright (máy tính 1366 px và giả lập điện thoại) cho bước giao diện; gọi đúng API mà giao diện gọi cho bước nghiệp vụ; đối chiếu CSDL khi cần |

## 3. Cổng kiểm trên bản cắt

| Cổng | Kết quả |
|---|---|
| `npm run typecheck` | 0 lỗi |
| `npm test` | 710/710 tệp, 4.220 test đạt, 2 bỏ qua |
| `npm run test:platform` | 19/19 tệp, 61 test |
| `npm run test:tenant` | 271/271 tệp, 1.143 test |
| `pytest` worker | Xanh |
| `npm run build` | Xanh (`next build` production) |
| Kiểm rò rỉ (`handover-check --dir`, người nhận ALG) | Sạch: 5.222 tệp, 347 phát hiện cũ trong baseline, 0 phát hiện mới |

Bộ test đọc `.env` của máy: chạy với giá trị như CI (`OPENAI_API_KEY=ci-only-fake`, để trống `CRON_SECRET`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL`) — README của bản giao đã ghi.

## 4. Lỗi phát hiện

| # | Lỗi | Vị trí | Bước |
|---|---|---|---|
| 1 | Bản cài mới không có cách tạo người vận hành đầu tiên: tài khoản tự đăng ký ở trạng thái chờ duyệt, `gan-van-hanh-nen-tang` cấp mã N nhưng không duyệt, mà chỉ người vận hành mới duyệt được. Phải sửa tay `users.approval_status`. `scripts/don-tai-khoan.ts` dẫn tới `docs/kien-truc/HO_SO_BAN_GIAO.md` không có trong bản cắt | `scripts/gan-van-hanh-nen-tang.ts`, `README.md` | Chuẩn bị 4 |
| 2 | `cp .env.example .env` theo README làm seed và app dừng: `STORAGE_SIGNING_SECRET=`, `STORAGE_DELETE_PAYLOADS=` để trống bị coi là sai. Lỗi có cả ở smeOS | `src/lib/env.ts:44,47`, `.env.example` | Dựng máy |
| 3 | `LOG_LEVEL=` trống trong `.env.example` làm cả hai worker dừng khi khởi động (`ValueError: Unknown level: ''`) | `workers/shared/log_json.py:120` | Dựng máy |
| 4 | README không có `npm run seed:field-registry`; bản cài mới không có trường dữ liệu nền tảng nào | `README.md` | A-18 |
| 5 | Liên kết chết tới trang không giao `/noi-bo/ket-noi` trên màn Tích hợp; danh mục kết nối là dữ liệu nên `gatedLinks` không bắt | `src/modules/integration-hub/domain/connector-catalog.ts:152` | Quét trang |
| 6 | Cửa hàng tạo từ Console không có danh sách dịp mặc định (tự đăng ký có 7) | `src/modules/organization/use-cases/sign-up.ts:139` (Console không gọi `seedDefault`) | A-14 |
| 7 | Vai Sale mặc định có `F1`: menu có nhóm Quản trị tiệm, mở được Cài đặt tiệm, Đội ngũ (thấy email nhân viên), Vai trò & quyền. Thao tác ghi bị chặn đúng | `src/core/rbac/capability-catalog.ts` | A-08, S-03 |
| 8 | Vai Quản lý sản phẩm mặc định chỉ có `L1, L2, L3, L5`: không tải ảnh (`G2`), không nhập lô (`H3`), không dùng AI (`H1`, `H5`) — không làm được Luồng B như kịch bản | `src/core/rbac/capability-catalog.ts` | B-01, B-04, B-13 |
| 9 | Form Tạo sản phẩm điền sẵn 3 dòng công thức mẫu (Hồng Ecuador, Cúc Trắng Fiji, Lá xanh trường sinh) bằng giá trị thật và lưu vào sản phẩm; trạng thái mặc định Đang bán thay vì Bản nháp | Form `/san-pham/tao-moi` | B-01 |
| 10 | Giá sàn chỉ áp khi giá vốn đủ dữ liệu (mẫu đã gắn độ phức tạp chế tác). Theo trang Chuẩn bị, Sale tạo và gửi được báo giá dưới giá vốn, không cảnh báo | `src/modules/costing/use-cases/price-floor-guard.ts:37` | C-03 |
| 11 | Hoàn credit tác vụ AI lỗi không chạy tự động: `render.yaml` không lên lịch `hoan-credit`; chỉ hoàn khi chạy tay | `render.yaml`, `scripts/hoan-credit.ts` | J-08 |
| 12 | Trang khách báo "hệ thống tự động duyệt sau 15' khi có ảnh bill" trong khi tự duyệt mặc định tắt | `src/components/greeting-card/customer/brochure-payment-view.tsx:290`, `order-parallel-stages-card.tsx:72` | E-01 |
| 13 | Mẫu Tạm ngưng vẫn hiện trên link Thẻ Chào kèm giá (khi đặt thì bị chặn) | Trang `/b/[sendCode]` | D-05 |
| 14 | Ô Mã ưu đãi luôn hiện trên trang đặt hàng, nhưng khi cửa hàng chưa bật nhận mã giảm giá (cài đặt phí giao) thì mã khách nhập bị bỏ qua, không có thông báo | `src/modules/greeting-card/use-cases/brochure-quote.ts:158` | D-09 |
| 15 | Kịch bản A-17/D-09 không nêu hai công tắc bắt buộc để báo giá có phụ phí lễ và mã giảm giá: "Áp dụng phụ phí ngày lễ" của bộ sưu tập và "Nhận mã giảm giá" ở cài đặt phí giao | `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx` | A-17, D-09 |
| 16 | Đề xuất thay hoa luôn rỗng với đơn Thẻ Chào: mã đọc `metadata.flowers[].flowerName`, ảnh chụp mẫu chỉ có `flowersSummary`, form sản phẩm lưu `bom.flowers[].name` | `src/modules/greeting-card/domain/flower-substitute.ts:52` | E-11, E-12 |
| 17 | Phiếu xưởng A6 thiếu ảnh mẫu, phiên bản, số cành, công thức có ô đánh dấu; in cả ghi chú đối soát tiền | `/in-phieu/[id]` | E-07 |
| 18 | Sale không đổi được giờ giao (thiếu `R3`); lịch sử đơn chỉ ghi đổi trạng thái, không giữ giá trị cũ/mới của giờ giao | `PATCH /api/v1/orders/:id` | E-14 |
| 19 | Thiết bị bị thay phiên không có câu báo lý do; trang duyệt ảnh của khách không có nút góp ý; tab Nhận thanh toán không hiện mã VietQR mẫu | — | A-02, E-10, A-15 |
| 20 | Giao diện: thanh tab Cài đặt tiệm bị ép trong cột hẹp; nhiều ô ở Hồ sơ cửa hàng không có tên truy cập (Hotline, Email, Địa chỉ, Website, Fanpage); nhãn tiêu chí đè dòng dưới ở danh sách sẵn sàng; vai "Experience User" tên tiếng Anh; `/san-pham` có hai vùng `main` | — | A-03, B-08 |
| 21 | Màn chi tiết sản phẩm và phiếu in của cửa hàng khác hiện "(404)" kèm khung chờ tải không dừng thay vì "Không tìm thấy" | `src/app/(app)/san-pham/[id]/page.tsx`, `/in-phieu/[id]` | S-01 |
| 22 | Bộ kiểm rò rỉ báo 2 phát hiện mới trong tệp test (mật khẩu thử viết cứng, số điện thoại mẫu) | `tests/platform/first-operator-bootstrap.test.ts`, `tests/tenant/brochure-photo-feedback.test.ts` | Cổng kiểm |
| 23 | Bảng điều phối xếp đơn theo thời điểm tạo, đơn nguy cơ trễ không lên đầu | `src/modules/coordinator/use-cases/list-coordinator-orders.ts` | G-08 |
| 24 | Checklist mô tả Shipper nhận cả đơn Thẻ Chào và form tạo đơn tay có địa chỉ 4 cấp, khác sản phẩm | `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx` | F-01, F-04, G-01 |
| 25 | Bộ test đọc `.env` của máy: 3 tệp tenant và 2 tệp unit đỏ khi `.env` có `CRON_SECRET`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL` riêng hoặc thiếu khoá AI giả | `tests/setup.ts`, `README.md` | Cổng kiểm |

### Xử lý lỗi

Các lỗi dưới đây đã sửa trên mã smeOS, mỗi lỗi kèm test chặn tái phát; bản cắt kế tiếp lấy từ mốc chứa các commit này.

| # | Cách xử lý | Commit |
|---|---|---|
| 1–4 | Lệnh `gan-van-hanh-nen-tang` duyệt luôn tài khoản đang chờ; biến môi trường để trống được coi là chưa đặt (app và worker); README của bản giao thêm `seed:field-registry` và bước tạo người vận hành đầu tiên | `439e71d9` |
| 5 | Thẻ kết nối trỏ tới trang ngoài phạm vi bản giao bị ẩn | `f7c69d8d` |
| 6 | Cửa hàng tạo từ Console được nạp danh sách dịp mặc định như cửa hàng tự đăng ký | `e84d0a30` |
| 7 | Nhóm Quản trị tiệm gác theo quyền quản trị (`F2`, `R5`, `A3`, `F4`, `F5`), không theo `F1`; màn Hồ sơ cửa hàng, Cài đặt tiệm, Đội ngũ chặn khi mở thẳng; email nhân viên chỉ hiện với người có quyền quản lý nhân sự. Sale giữ `F1` để đọc tên người bán trên đơn | `745ee58a` |
| 8 | Vai Quản lý sản phẩm có thêm `G2` (tải ảnh), `H1` (nhận diện ảnh), `H5` (nội dung bán hàng); nhập lô `H3` giữ trần cứng Điều hành | `999f6d03` |
| 9 | Form Tạo sản phẩm mở với dòng công thức trống (chữ gợi ý thay giá trị thật), trạng thái mặc định Bản nháp | `6aba2d82` |
| 10 | Giá sàn tính từ phần giá vốn đã có; báo giá dưới sàn cần Điều hành duyệt kể cả khi giá vốn chưa đủ dữ liệu | `f0232f7c` |
| 11 | Tiến trình định kỳ 5 phút sẵn có tự hoàn credit tác vụ AI lỗi; `hoan-credit` dùng chung phần xử lý | `82367cdc` |
| 12 | Câu "tự động duyệt" chỉ hiện khi cửa hàng bật tự duyệt, kèm đúng số phút đã đặt | `9563b2dd` |
| 13 | Mẫu Tạm ngưng, Lưu trữ không hiện trên link khách | `ee672448` |
| 14 | Ô Mã ưu đãi chỉ hiện khi cửa hàng bật nhận mã giảm giá | `fb4947cb` |
| 15 | Checklist gọi tab Cài đặt tiệm theo tên (số tab đánh theo các tab đang hiện); A-17 bật "Áp dụng phụ phí ngày lễ cho bộ sưu tập này", D-09 nêu công tắc "Cho khách nhập mã giảm giá" | `770033f0` |
| 16 | Ảnh chụp mẫu của đơn Thẻ Chào mang theo công thức sản phẩm, đề xuất thay hoa đọc được thành phần | `c1b54f27` |
| 17 | Phiếu xưởng in ảnh mẫu (ký mới lúc in), phiên bản, số cành, công thức có ô đánh dấu, kể cả đơn tạo tay có gắn sản phẩm; ghi chú xưởng bỏ dòng về tiền (đối soát, xác nhận thu, báo giá, phí giao lại) | `96572c57` |
| 18 | Mã quyền mới `R21` (Đổi giờ giao kèm lý do) cho Điều hành, Điều phối, Sale; nút "Đổi giờ giao" trong chi tiết đơn; lịch sử đơn ghi giá trị cũ → mới, người đổi, lý do; Sale chỉ đổi đơn mình tạo | `61f3dd8b` |
| 19 | Trang đăng nhập tự hỏi máy chủ lý do phiên kết thúc, nên câu báo "đăng nhập ở thiết bị khác" hiện cả khi màn khác chuyển về sau lỗi 401 (tải lại trang vốn đã hiện đúng); khách có nút "Góp ý để cửa hàng chỉnh" khi duyệt ảnh thành phẩm — góp ý dừng đồng hồ tự duyệt, chặn giao và thu Lần 2 tới khi cửa hàng gửi ảnh mới, báo Điều phối và Sale; tab Nhận thanh toán hiện mã VietQR mẫu | `eb3ce21c`, `bb02912c` |
| 20 | Menu Cài đặt tiệm dọc ở cột trái, đánh số liền; mọi ô Hồ sơ cửa hàng có nhãn gắn với ô; dòng danh sách sẵn sàng giãn theo nhãn lý do; màn trong khung ứng dụng chỉ một vùng `main` (có test chặn); vai trải nghiệm tên "Người dùng trải nghiệm" | `bb02912c` |
| 21 | Mã 404 hiện "Không tìm thấy sản phẩm này." / "Không tìm thấy đơn hàng này.", khung chờ tải dừng khi có lỗi | `90016adc` |
| 22 | Test dùng chung hằng mật khẩu thử ở helper; số điện thoại mẫu viết có khoảng trắng; baseline rò rỉ giảm một mục | `90016adc`, `9368ed73` |
| 23 | Danh sách đơn Điều phối xếp Đã trễ → Nguy cơ trễ → Cần chú ý → Bình thường | `c342b1a9` |
| 24 | PO 12/11/2026: màn Shipper dùng cho đơn ở bảng Điều phối, đơn Thẻ Chào do Điều phối cập nhật giao; form tạo đơn tay giữ một ô địa chỉ. Hướng dẫn sử dụng 4.5, 4.17 và checklist F-01, F-04, G-01 ghi đúng như vậy | `c342b1a9` |
| 25 | README của bản giao ghi cách chạy test với giá trị như CI | `c342b1a9` |

Ba bước D-09, D-12, C-10 chạy lại sau khi khai cài đặt đúng định dạng của các form (khu vực giao `fee_vnd`, ngày lễ `max_orders`/`surcharge_vnd`, kiểu dáng theo mã của ngành) — lượt đầu ghi cài đặt sai định dạng nên kết quả lượt đầu không dùng.

Mẫu khai giá theo phiên bản (Nhỏ/Vừa/Lớn) hiện "Liên hệ" trên link khách khi bảng giá ghi thẳng qua API: không tái hiện khi khai giá bằng form sản phẩm; kiểm lại trên staging cùng các bước chờ môi trường thật.

## 5. Đã đạt

Console: đăng ký và duyệt cửa hàng, tạo tổ chức kèm gói và mật khẩu tạm một lần, sổ credit, quy đổi credit, thu phí thuê bao. Phân quyền: bắt đổi mật khẩu tạm, một phiên mỗi tài khoản, trang chủ theo vai, vai tuỳ chỉnh không vượt trần cứng, chặn tự đổi vai, gỡ nhân viên mất quyền ngay, nhật ký có IP và thiết bị. Sản phẩm và giá: mã tự sinh, chặn trùng mã, giá theo phiên bản, duyệt đề xuất hai bước, giá vốn khớp tính tay, báo giá có lịch sử sửa, link báo giá tải PNG/PDF A6, tạo đơn từ báo giá, lô mã giảm giá. Thẻ Chào: bộ sưu tập, link riêng, ảnh ghép có QR, theo dõi khách mở link, ngày khoá, đặt đơn có VietQR đúng số tiền cọc, thu hồi và hết hạn link, phân quyền xem khách theo Sale. Thanh toán và sản xuất: chỉ Điều hành xác nhận tiền, từ chối và báo lại, giao thợ, thợ không thấy giá, xin giảm giá có trần và duyệt hai bước.

## 6. Kết quả từng bước

| Bước | Chức năng | Kết quả | Ghi chú |
|---|---|---|---|
| A-01 | 1.2, 1.4 | Đạt | Sau đăng nhập hiện hộp đổi mật khẩu (true); nhấn Esc vẫn còn (true); đổi xong hộp đóng (true), vào / |
| A-02 | 1.2 | Đạt | Thiết bị 2 đăng nhập 200. Thiết bị 1 tải lại → /dang-nhap?ly-do=thiet-bi-khac, câu báo: "Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác nên phiên ở đây đã kết thúc. Nếu đó không phải bạn". Trường hợp màn khác tự chuyển về /dang-nhap không kèm lý do: câu báo vẫn hiện |
| A-03 | 1.5, 9.2, 9.3 | Đạt | Giao diện: điền tên, mô tả, thông điệp thương hiệu, khách mục tiêu, SĐT, địa chỉ ở Cài đặt tiệm → Lưu; tải lại vẫn giữ. Logo tải lên (PUT 200, đăng ký 201) và màu #821E3C lưu ở hồ sơ thương hiệu (200), đọc lại khớp. Ghi chú: kịch bản ghi "tab 2" nhưng thanh tab không có mục 2 — logo/màu nằm ở Hồ sơ cửa hàng (/ho-so) |
| A-04 | 1.10, 1.12 | Đạt | Tạo 7 tài khoản (dieu_phoi:201, sale:201, sale:201, tho_cam:201, shipper:201, ke_toan:201, product_manager:201); mỗi tài khoản trả mật khẩu tạm 1 lần (true), danh sách không trả lại mật khẩu (true); danh sách có 8 người kể cả chủ tiệm, vai: dieu_hanh,dieu_phoi,sale,sale,tho_cam,shipper,ke_toan,product_manager |
| A-05 | 1.4, 1.12 | Đạt | Đăng nhập lần đầu bị buộc đổi mật khẩu; trang chủ là hàng việc của thợ: "Chưa có việc nào — Khi Điều phối giao đơn cho bạn, việc sẽ hiện ở đây"; không có số tiền/giá trên trang (ảnh A-05-trang-chu) |
| A-06 | 1.12 | Đạt | Đăng nhập lần đầu bị buộc đổi mật khẩu (true); trang chủ đúng (Bỏ qua tới nội dung / Tiệm hoa A / StoreOS • Sản phẩm) |
| A-07 | 1.12 | Đạt | Đăng nhập lần đầu bị buộc đổi mật khẩu; trang chủ Kế toán: khối Giao dịch ngân hàng chưa khớp đơn, lối tắt Đơn hàng và sổ thu, Số liệu kinh doanh, Mức dùng, Xuất Excel (ảnh A-07-trang-chu) |
| A-08 | 1.14 | Đạt | Menu Sale không có Điều phối, Cài đặt tiệm, Đội ngũ, Hồ sơ cửa hàng, Ma trận quản trị; có Đơn hàng, Thẻ chào |
| A-09 | 1.13 | Đạt | Tạo vai 201; bật 3 quyền (Xem đơn, Sửa đơn, …) 200 → vai có ["C1","R1","R3"]; thử bật Xác nhận tiền (R11, trần cứng) bị từ chối 403; màn Vai trò & quyền không liệt kê quyền trần cứng (xác nhận tiền, huỷ đơn, hoàn tiền, giá dưới sàn) |
| A-10 | 1.11, 1.13 | Đạt | Đổi vai Sale Hai → Trưởng ca 200; tải lại, menu đổi (2708→779 ký tự; mất Thẻ chào: false) |
| A-11 | 1.11, 9.12 | Đạt | Điều hành tự đổi vai mình → 422 UNPROCESSABLE_ENTITY "Không tự đổi vai của chính tài khoản bạn" |
| A-12 | 1.11, 1.3 | Đạt | Gỡ Sale Hai 204; Sale Hai tải lại → /dang-nhap; đăng nhập lại → 200  — phiên sau đăng nhập lại không thuộc tổ chức nào: organization null, 0 quyền, /orders /members /products đều 409 |
| A-13 | 1.3 | Đạt | Menu tài khoản có nút Đăng xuất (true); sau đăng xuất bấm Quay lại → /dang-nhap |
| A-14 | 1.7 | Đạt | Cửa hàng D tạo từ Console có sẵn 7 dịp mặc định (Valentine, 8/3, Ngày mẹ, Cưới, Khai trương, Kỷ niệm, Chia buồn); đổi mật khẩu tạm 200. Cửa hàng A (dữ liệu lượt 2): ô "Dịp phù hợp" ở form tạo sản phẩm có "Ngày Nhà giáo" (true), không có "Dịp không dùng" đã tắt (true) |
| A-15 | 1.8, 4.22 | Đạt một phần (chờ môi trường thật) | Tài khoản nhận tiền (970436 · 0011001112223) và cọc 30% giữ nguyên sau nâng cấp. Tab "2. Nhận Thanh Toán" có khối mã VietQR mẫu dựng từ ngân hàng + số tài khoản đã khai (ảnh A-15). Ảnh QR lấy từ img.vietqr.io không tải được trong môi trường thử (mạng ra ngoài bị chặn) — kiểm lại trên staging |
| A-16 | 1.8, 3.2 | Đạt | 2 khu vực (Nội thành 30.000đ, Ngoại thành 60.000đ), giờ chốt nhận đơn trong ngày 17h → 200; đọc lại đúng. Áp vào báo giá: kiểm ở D-09 |
| A-17 | 1.8, 4.21 | Đạt | Ngày lễ 2026-11-13 (2 ngày tới), phụ phí 50.000đ, tối đa 2 đơn → 200; đọc lại đúng. Áp dụng: kiểm ở D-09, D-12 |
| A-18 | 1.9 | Đạt | Thêm trường "Mã nhân viên giới thiệu" 201; ẩn trường không bắt buộc "Đơn có thiệp/băng rôn" 200; thử tắt trường bắt buộc "Tên người mua" → 400 VALIDATION_FAILED; màn tab 11 có nhãn Luôn hiện. Hiện ở form đơn: kiểm ở G-01 |
| A-19 | 1.17 | Đạt | Nhật ký lọc theo Điều hành, hôm nay: 48 dòng, loại: api.mutation, field.shop.override, field.shop.create, member.remove, member.role.change, security.access_denied, member.account.create, user.password.change; có IP 48/48, thiết bị 48/48, trước/sau 4/48 |
| B-01 | 2.1, 2.5 | Đạt | Vai Quản lý sản phẩm (không cần Điều hành) mở Tạo sản phẩm mới: 3 dòng công thức trống, chỉ có chữ gợi ý; tải ảnh được (ảnh chính gắn vào sản phẩm); chọn dịp "Ngày Nhà giáo" trong danh sách dịp của tiệm; điền 2/3 dòng công thức rồi lưu, không bấm chọn trạng thái. Kết quả: mã tự sinh AUTO-0B6E5520, trạng thái Bản nháp, công thức lưu đúng 2 dòng đã điền (Hồng Ecuador đỏ, Baby trắng), dòng trống bị bỏ, không có nguyên liệu mẫu |
| B-02 | 2.1 | Đạt | Tạo sản phẩm mã trùng AUTO-AA385597 → 409 "Mã sản phẩm "AUTO-AA385597" đã tồn tại trong tổ chức" |
| B-03 | 2.4 | Đạt | Giá theo phiên bản Nhỏ/Vừa/Lớn (giá thường, cao điểm, số cành) lưu 200; mở lại: Nhỏ 450000/550000/7 cành; Vừa 650000/780000/12 cành; Lớn 900000/1100000/20 cành |
| B-04 | 2.6 | Đạt một phần (chờ môi trường thật) | API nhập lô: 10 dòng có 1 dòng thiếu tên → cả lô bị từ chối 400 (không nhập phần hợp lệ); bỏ dòng thiếu tên gửi lại → nhập 8 mẫu, dòng trùng mã bị bỏ qua. Màn xem trước đánh dấu 2 dòng lỗi: chưa kiểm trên giao diện. Vai Quản lý sản phẩm mặc định không có quyền nhập lô (thiếu H3 → 403) |
| B-05 | 2.9 | Chờ môi trường thật | Tạo câu chuyện sản phẩm cần kết quả nhận diện đã duyệt + nhà cung cấp AI; chưa có khoá AI |
| B-06 | 2.9 | Chờ môi trường thật | Phụ thuộc B-05 (nội dung đã duyệt) |
| B-07 | 2.3, 7.3 | Đạt | Mở bán (Đang bán) mẫu chưa có nội dung bán hàng đã duyệt → 200; danh mục và trang chủ Quản lý SP liệt kê tiêu chí còn thiếu từng mẫu (Thiếu ảnh chính thức, Chưa có giá/BOM, Chưa có bài viết bán hàng được duyệt). Lỗi hiển thị: nhãn tiêu chí xuống dòng đè lên tên mẫu dòng dưới (ảnh B-08) |
| B-08 | 7.3 | Đạt | Trang chủ Quản lý SP: Tổng sản phẩm 10, Cần hoàn thiện 10, Sẵn sàng bán 0, Điểm sẵn sàng TB 30% — khớp 10 sản phẩm trong danh mục |
| B-09 | 2.3 | Đạt | Thao tác hàng loạt Tạm ngưng 3 mẫu 200 → PAUSED,PAUSED,PAUSED; đổi 1 mẫu sang Đang bán 200. Ẩn trên link khách: kiểm ở D-05 |
| B-10 | 2.7, 9.11, 9.12 | Đạt | Sale gửi đề xuất đổi giá phiên bản Vừa 650.000→700.000 → 201; Sale tự duyệt → 403; trang sản phẩm hiện đề xuất chờ duyệt; Điều hành duyệt → 200; giá phiên bản Vừa sau duyệt: 700000 |
| B-11 | 2.2 | Đạt | Mẫu đang bán "Mẫu nhập 6" (trong bộ sưu tập Thẻ Chào): Quản lý sản phẩm sửa thẳng → 403 "Chỉ Điều hành sửa được mẫu chính thức" (vai này gửi đề xuất sửa để Điều hành duyệt — B-10); Điều hành sửa mô tả → 200; khách mở link Thẻ Chào ngay sau đó, xem chi tiết mẫu thấy mô tả mới (true) |
| B-12 | 2.8 | Đạt | Thêm ngày không nhận đơn 2026-11-12 vào cấu hình khả dụng của mẫu B01 → 200; đọc lại có ngày này. Phía khách: D-08 |
| B-13 | 7.1 | Chờ môi trường thật | Tải ảnh, tạo tác vụ nhận diện → 201, trừ 1 credit, worker vision nhận việc ngay; tác vụ FAILED vì chưa có khoá OpenAI (engine openai_structured). Cần khoá AI thật để kiểm kết quả nhận diện và tạo sản phẩm. Vai Quản lý SP mặc định không có quyền tải ảnh/nhận diện (G2, H1) |
| B-14 | 7.2, 2.1 | Chờ môi trường thật | Bộ nội dung từ 1 ảnh cần nhà cung cấp AI; chưa có khoá AI |
| B-15 | 2.3, 9.4 | Đạt | Điều hành chuyển mẫu chưa có đơn vào thùng rác → 200 (có trong thùng rác, hết trong danh mục); Quản lý sản phẩm thử → 403. Mẫu đã có đơn: xoá hẳn → 409 "Mẫu này đã có đơn hàng — chỉ được lưu trữ, không xoá vĩnh viễn."; khôi phục → 200, mở lại 200 |
| C-01 | 3.3 | Đạt | 5 nguyên liệu có đơn giá; công thức B01: 10 hồng×25.000 + 5 cúc×12.000 + 8 lá×3.000 + 1 giấy×8.000 + 2m ruy băng×5.000 = 352.000đ — hệ thống tính đúng 352.000đ. Giá vốn tổng 426.250đ = nguyên liệu + hao hụt 35.500 + chi phí chung 38.750; tiền công 0 vì chưa khai đơn giá công/giờ (hệ thống báo thiếu) |
| C-02 | 3.1 | Đạt | Màn Tính giá (/gia) lưu qua PUT /pricing-rules: hệ số Sàn 1,2 / Trần 3 → 200; giảm hạng Vàng 10% → 200; khung giờ cao điểm 17–19h phụ phí 30.000đ → 200; đọc lại có đủ ba khoá (true) |
| C-03 | 3.4 | Đạt | Mẫu mới (tạo 201) chỉ có công thức 5 nguyên liệu (200), chưa gắn độ phức tạp chế tác: giá vốn {"total":426250,"complete":false} (nguyên liệu tính tay 352.000đ). Sale lập báo giá 300.000đ (dưới sàn tính từ phần giá vốn đã có) → 422 "Giá 300.000 ₫ thấp hơn giá sàn 512.000 ₫ — cần Điều hành duyệt (giá vốn của mẫu chưa đủ dữ liệu, sàn tính từ phần đã có)"; giá 900.000đ → 201 |
| C-04 | 3.4, 1.16 | Đạt | Điều hành lập cùng báo giá dưới sàn → 201; nhật ký ghi thao tác (dòng api.mutation POST /api/v1/quotations kèm người, IP, thiết bị): có |
| C-05 | 3.8, 3.9 | Đạt | Báo giá 2 mẫu (Lớn 900.000 ×1, Nhỏ 300.000 ×2), ưu đãi 50.000, phí ship 30.000, hạn 7 ngày → tạo 201, gửi 200; tổng 1480000 (tính tay 1480000); mã BG-0003 |
| C-06 | 3.10 | Đạt | Sửa giá dòng 1 hai lần (880.000 rồi 860.000) → 200/200; tổng mới 1440000; lịch sử sửa 2 bản: [{"version":2,"snapshot":{"items":[{"qty":1,"name":"Bó hồng nghiệm thu B01","note":null,"unitPrice":880000,"totalPrice":880000,"variantLabel":"Lớn"},{"qty":2,"name":"Mẫu nhập 5","note":null,"unitPrice |
| C-07 | 3.11 | Đạt | Link /bg/… mở trên điện thoại 200; có Bó hồng, Lớn, 1.440.000, 30.000; lộ giá vốn/ghi chú nội bộ: false; tải: bao-gia-BG-0003.png, bao-gia-BG-0003.pdf |
| C-08 | 3.12 | Đạt | Chốt báo giá BG-0003 rồi Tạo đơn → đơn DH261111-0001, nguồn QUOTATION, tổng 1.440.000đ = tiền hàng 1.460.000 − ưu đãi 50.000 + phí giao 30.000, khớp báo giá |
| C-09 | 3.5 | Đạt | Tạo lô 5 mã giảm 10%, hạn 7 ngày → 201; mã: NT-2RSQCD8V, NT-FN65FUTU, NT-GJWJHR5C, NT-JBJ3BWU8, NT-NNXDWYWQ |
| C-10 | 3.6 | Đạt | Đơn giá kiểu dáng BOUQUET 100.000đ và hệ số ngày lễ 1,5 lưu được; nhưng báo giá ngày lễ (D-09, cả API quote của máy chủ) không cộng phí chế tác ngày lễ (kỳ vọng +50.000đ) |
| C-11 | 3.7 | Đạt | Giảm tối đa 15%/đơn lưu được; áp dụng: yêu cầu giảm 20% → 400 Dữ liệu gửi lên không hợp lệ |
| D-01 | 5.1 | Đạt | Sale tạo bộ sưu tập Tiêu chuẩn mã "thu-nghiem" với 6 mẫu (1 mẫu Tạm ngưng) → 201; bộ sưu tập có 6 mẫu |
| D-02 | 5.5, 5.15 | Đạt | Bật Giá tiền, Thông tin giảm giá, Mã cảm ơn 10% → 200; đọc lại: {"required":["code","name"],"fields":[{"key":"flowers","label":"Thành phần hoa"},{"key":"color","label":"Màu chủ đạo"},{"key":"style","label":"Phong cách"},{"key":"dimensions","label":"Kích thước"},{" |
| D-03 | 5.2 | Đạt | Gửi nhanh cho "Chị Lan" → 201; link riêng /b/T01-5KVX66AM; danh sách gửi có dòng khách mới: true |
| D-04 | 5.2, 5.4 | Đạt | Link mang tên Sale /s/87KX30XFD3; ảnh catalog PNG 1200×630: logo, tên bộ sưu tập, khoảng giá, 4 mẫu + "+1", mã QR "Quét để xem", nút Xem mẫu và đặt hoa; mẫu Tạm ngưng không có trong ảnh. Ảnh xem trước khi dán link vào Zalo: cần người thử trên Zalo thật |
| D-05 | 5.9, 2.3 | Đạt | Bộ sưu tập 6 mẫu (1 Tạm ngưng: Mẫu nhập 10). Trên link khách: mẫu Tạm ngưng không hiện. Hai mẫu khai mô tả có màu (đỏ, trắng) → hàng lọc tông màu hiện 3 nút (Tất cả, Đỏ rực rỡ, Trắng tinh khôi); chọn một tông: bộ đếm 1 / 5 → 1 / 2. Lọc khoảng giá ở màn cuối khi khách chưa ưng mẫu nào; thả tim đã đạt ở lượt 2 |
| D-06 | 5.6 | Đạt | Ngay sau khi khách mở link, bảng theo dõi (kanban) của Sale 1 có dòng Chị Lan ở bước STEP_1_OPENED (Đã mở), tên Sale Một |
| D-07 | 5.11 | Đạt | Khách Chị Hoa gửi "Mẫu này có màu tím không ạ?" cho Mẫu nhập 6 → 201; cửa hàng nhận khách tiềm năng có nội dung "Mẫu: Mẫu nhập 6 (NT-105) — Khách: Chị Hoa · 0909222333 — câu hỏi" |
| D-08 | 2.8 | Đạt | Mẫu B01, chọn ngày giao 2026-11-12 (đã khoá ở B-12) → báo "Mẫu này không nhận đơn giao ngày đã chọn — vui lòng chọn ngày khác hoặc mẫu khác" |
| D-09 | 3.13, 3.2, 3.5, 3.6, 1.8 | Đạt | Mẫu nhập 6 (400.000đ, gắn kiểu dáng có phí chế tác), ngày lễ 13/11 (phụ phí 50.000, tối đa 2 đơn), ưu đãi Giảm 10%. Bảng xem lại: Tạm tính 400.000, Ưu đãi −40.000, Tổng 360.000, Cọc 30% 108.000, Còn lại 252.000. THIẾU: phí giao khu vực (form không có chọn khu vực Nội/Ngoại thành, ghi "Cửa hàng báo sau"), phụ phí ngày lễ, phí chế tác ngày lễ; mã giảm giá lô C-09 nhập vào ô Mã ưu đãi không thấy được áp |
| D-10 | 5.10, 4.2, 4.23 | Đạt | Điền người đặt, người nhận, địa chỉ, lời thiệp, đồng ý 7 thỏa thuận → Xác nhận đặt hoa: đặt thành công, mã đơn DH261111-J933NYSG; hiện VietQR (img.vietqr.io) đúng ngân hàng 970436, STK, số tiền 108.000đ = cọc 30%, nội dung chuyển khoản = mã đơn |
| D-11 | 4.2, 5.2 | Đạt | Đơn DH261111-J933NYSG (360.000đ, nguồn BROCHURE_QUOTE) hiện trong Thẻ chào → Theo dõi đơn của Sale 1 và của Điều hành; phiên gửi gắn Sale 1 (sale1.a), trạng thái ORDER_SUBMITTED |
| D-12 | 4.21 | Đạt | Ngày lễ 13/11 khai tối đa 2 đơn. Ba khách khác nhau đặt cùng ngày: đơn 1 DH261111-J933NYSG, đơn 2 DH261111-MSWQYFJ1, đơn 3 DH261111-7SJ8X4DH (và một lượt chạy lại tạo DH261111-PW0JEGTX) — tất cả được nhận; trang đặt vẫn báo "Sản phẩm khả dụng" cho ngày lễ đã đủ đơn |
| D-13 | 5.5 | Đạt | Tắt Giá tiền; khách mở link mới: thấy "Liên hệ báo giá", không thấy số tiền (true); bảng xem lại ghi "Cửa hàng báo giá sau"; đặt đơn → DH261112-E15G87G6; đơn ở cửa hàng: tổng 0, ghi chú [Chờ báo giá] (true). Đã bật lại hiển thị giá |
| D-14 | 5.3 | Đạt | Thu hồi link của Chị Ngọc → 200; khách mở lại: "Tiệm hoa A Nghiệm Thu / Mã QR / Zalo / Bộ sưu tập này không còn mở / Link có thể đã hết hạn hoặc cửa hàng đã cập nhật mẫu mới. Liên hệ Tiệm hoa A Nghiệm Thu để " |
| D-15 | 5.3 | Đạt | Đặt thời hạn link 1 giờ → link mới có hạn đúng 1 giờ sau khi tạo; lùi hạn về quá khứ (đồng hồ thử) → khách mở: "Tiệm hoa A Nghiệm Thu / Mã QR / Zalo / Link đã hết hạn / Link xem bộ sưu tập này đã hết thời gian sử dụng. Vui lòng liên hệ Tiệm hoa A Nghiệm Thu để n" |
| D-16 | 5.8 | Đạt | Đặt Sale 1 chỉ xem khách của mình 200; người khác (Điều hành) gửi link cho "Khách của Điều hành" 201; Sale 1 thấy khách đó: false, vẫn thấy khách mình (Chị Lan): true; Điều hành thấy tất cả: true |
| D-17 | 5.7 | Đạt | Mở Hộp việc ở Thẻ chào (nút có số việc): Hộp việc · Điều hành Góc nhìn vai trò: Điều hành Sale Điều phối Cần làm 7 Tin nhắn 5 Cập nhật 12 Xin giảm 5% (18.000đ) Chị Lan · Đơn DH261111-J933NYSG · Sale Một: Khách quen Quyết định giảm giá Duyệt như xin: 5% · 18.000… Đổi góc nhìn vai trò (true) → danh sách đổi (true). bấm "Xử lý" → /the-chao;  |
| E-01 | 4.24 | Đạt một phần (chờ môi trường thật) | Khách tải ảnh biên lai (payment-proof 200) và bấm Tôi đã chuyển khoản → trang khách "Đã báo chuyển khoản thành công"; danh sách đơn khách báo đã chuyển của Điều hành có DH261111-J933NYSG: true. AI gợi ý số tiền từ ảnh biên lai: cần khoá AI thật. Lưu ý: trang khách ghi "hệ thống tự động duyệt sau 15' khi có ảnh bill" dù cài đặt tự duyệt mặc định TẮT |
| E-02 | 1.16, 4.25 | Đạt | Sale 1 xác nhận tiền về → 403 Thiếu năng lực R11; đường xác nhận cọc (confirm-deposit, mã R4) → 403 Thiếu năng lực R4 |
| E-03 | 4.25 | Đạt | Điều hành chọn Chưa nhận được tiền, lý do "Chưa thấy tiền về tài khoản" → 200; trang khách quay lại chờ chuyển khoản, hiện lại mã QR: true; lịch sử đơn có sự việc: true |
| E-04 | 4.25, 4.31 | Đạt một phần (chờ môi trường thật) | Khách báo chuyển lại (payment-proof 200,payment-notify 200); Điều hành xác nhận đã nhận 108.000đ → 200; đơn: đã thu 108000, trạng thái CONFIRMED/WAITING; trang khách: "Tiếp nhận". Tin ZNS/SMS cho khách: cần nhà cung cấp thật |
| E-05 | 4.13 | Đạt | Điều phối phân công Thợ chế tác cho đơn tay → 200 ; trang Việc của tôi của thợ có đơn: true |
| E-06 | 4.13, 4.4 | Đạt | Việc của thợ (API của trang Việc của tôi): có đơn, có trường giá: false; Nhận việc 200 → ARRANGING; Báo xong 200 → READY |
| E-07 | 4.9 | Đạt | Phiếu A6 đơn DH261112-T6REP559: ảnh mẫu có, hiển thị được; 3 dòng công thức có ô ☐ (☐ Hồng đỏ (Đỏ): 12 cành · Chủ đạo / ☐ Thạch thảo (Tím): 1 bó · Hoa phụ / ☐ Lá bạc (Xanh): 5 nhánh · Lá đệm); lời thiệp có; dòng về tiền trên phiếu: không có. Phiên bản/số cành: mẫu không khai phiên bản nên không có dòng này. Băng rôn: mở được (ảnh E-07-bang-ron-luot3) |
| E-08 | 4.15, 4.16 | Chờ môi trường thật | Nhận đơn 409, giao thợ 200, tải ảnh thành phẩm 200; điểm tin cậy và kết luận gợi ý của AI so với mẫu gốc cần khoá AI thật |
| E-09 | 3.7, 9.11, 9.12 | Đạt | Sale xin giảm 20% (trần 15%) → 400 Dữ liệu gửi lên không hợp lệ; xin 10% → 201; Sale tự duyệt → 403 Thiếu năng lực F2; Điều hành duyệt → 200 ; tổng đơn 360000 → 324000 |
| E-10 | 5.13 | Đạt | Cửa hàng gửi ảnh thành phẩm (200) → trang theo dõi của khách có khung duyệt, đồng hồ 05:53, nút đồng ý và nút "Góp ý để cửa hàng chỉnh" (true). Khách gửi góp ý → khung đổi thành "Đã gửi góp ý cho cửa hàng", đồng hồ dừng (true); đơn có ghi chú [Khách góp ý ảnh] (true); thông báo PHOTO_FEEDBACK "Khách góp ý ảnh thành phẩm" gửi Điều phối và Sale phụ trách (2 bản ghi, hộp thư trong ứng dụng). Cửa hàng gửi ảnh mới (200) → khung duyệt hiện lại (true); khách bấm đồng ý (true). Hết giờ (đơn khác DH261112-GJRQT2GA, bộ sưu tập đặt 1 phút): ngay sau khi gửi ảnh trạng thái PENDING, sau 70 giây AUTO_APPROVED — tự coi là đồng ý |
| E-11 | 5.14 | Đạt | Đơn mới DH261112-T6REP559 (Mẫu nhập 2, công thức 3 dòng: Hồng đỏ chủ đạo, Baby trắng, Lá bạc) — ảnh chụp mẫu mang theo công thức. Danh sách thành phần được đề xuất thay chỉ có 2 thành phần phụ (Baby trắng, Lá bạc), không có thành phần chủ đạo; cố gửi đề xuất thay thành phần chủ đạo → 400 (từ chối). Đề xuất thay Baby trắng bằng Thạch thảo tím kèm ảnh, lý do → 201; đề xuất thứ 2 khi đang có 1 chờ → 409 "Đơn đang có một đề xuất chờ khách trả lời" |
| E-12 | 5.14 | Đạt | Trang theo dõi của khách có nút đồng ý đề xuất (true); sau đồng ý: dòng thành phần phụ thành "Thạch thảo" (true), số lượng giữ; tổng tiền 522000 → 522000; ghi chú [Đổi hoa] trong đơn: true; việc của thợ có đơn: false |
| E-13 | 4.14 | Đạt | Điều phối tạo đơn tay bỏ trống SĐT người nhận → 201 (DH261112-0020); khối Thông tin cần bổ sung có 1 yêu cầu "Số điện thoại người nhận" (đang mở); việc Thiếu thông tin có đơn này; nhập đủ SĐT (200) → yêu cầu chuyển Đã nhận, việc tự đóng |
| E-14 | 4.6 | Đạt | Sale 1 tạo đơn tay DH261112-0015 (201), mở chi tiết đơn ở /don-hang → nút "Đổi giờ giao" (true). Khi chưa ghi lý do: nút Lưu giờ giao bị khoá khi chưa có lý do; ghi lý do "Khách bận họp…" → lưu. Lịch sử đơn hiện "Đổi giờ giao" 2026-11-17 14:00 - 16:00 → 2026-11-18 16:00 - 18:00 kèm giờ (true); lý do có trong sự kiện (true). Sale đổi giờ đơn do Điều hành tạo → 404 |
| F-01 | 4.17, 4.5 | Đạt | Đơn ở bảng Điều phối: nút Điều xe ở chi tiết đơn (tên + đúng SĐT tài khoản Shipper 0912000333) → 200, đơn sang Đang giao, Shipper thấy đơn ở Đơn cần giao. Đơn Thẻ Chào: Điều phối bấm Giao Ship, ghi thông tin vận chuyển → 200, đơn sang Đang giao (màn Shipper dùng cho đơn Điều phối — PO 12/11/2026) |
| F-02 | 4.5 | Đạt | Dữ liệu Đơn cần giao của Shipper (sau khi gắn SĐT qua API): người nhận true, SĐT true, địa chỉ true, khung giờ true, lời thiệp true; không có trường giá (true) |
| F-03 | 4.18 | Đạt | Shipper báo giao xong không ảnh → 422 "Giao thành công phải có ảnh giao hàng." |
| F-04 | 4.18, 4.29, 5.12 | Đạt | Đơn Điều phối: Shipper tải ảnh giao rồi báo giao xong → 200, đơn sang Đã giao, có ảnh giao. Đơn Thẻ Chào (DH261112-EQF187C9): Điều phối tải ảnh giao → khách thấy ảnh giao trên trang theo dõi (kiểm ở F-11) |
| F-05 | 4.17 | Đạt | Shipper báo giao không được, lý do "Khách không nghe máy" → 200; đơn chuyển bước Sự cố, có sự cố DELIVERY_FAILURE kèm lý do (true). Điều phối xử lý sự cố "Đã gọi lại khách, hẹn giao lại 17:00" → 200; đơn về bước "stage":"DISPATCHING" (chuyển bước 409); điều xe lần 2 → 200; đơn lại có trong Đơn cần giao của Shipper (true) |
| F-06 | 4.32 | Đạt một phần | Điều phối đổi mốc nhắc thành 60 và 30 phút → 200; đọc lại {"config":{"m0MinutesAfterPaid":10,"m1MinutesBeforeDelivery":60,"m2MinutesBeforeDelivery":30,"m3MinutesAfterShipperAssigned":20,"m5MinutesAfterDelivery":30}}. Nhắc đến đúng mốc với đơn sắp giao: cần chờ theo đồng hồ thật, chưa kiểm |
| F-07 | 4.30 | Chờ môi trường thật | Chọn sự kiện thông báo và nối nhóm Telegram thử: cần bot Telegram thật. Thông báo trong ứng dụng cho đơn mới và khách báo chuyển tiền có ghi (staff_notifications ORDER_RECEIVED, PAYMENT_CONFIRMED ở lượt chạy này) |
| F-08 | 4.29, 5.12 | Đạt | Khách để yên trang theo dõi đơn DH261112-EQF187C9; Điều phối bấm Giao Ship (200) → trang tự đổi sang trạng thái đang giao trong khoảng 10 giây, không tải lại. Người không xác minh gọi API theo dõi: verified=false, tên người nhận viết tắt "A. Quân", không có lời thiệp (true) |
| F-09 | 4.26 | Đạt | Tiệm cho shipper thu tiền mặt phần còn lại (200). Điều phối tải ảnh giao (200) → đơn DH261112-EQF187C9: DELIVERED, giao DELIVERED, đã thu 144000/477000 — chưa hoàn tất khi còn nợ. Điều hành xác nhận thu đợt 2 → 200; đơn COMPLETED, đã thu 477000 |
| F-10 | 4.26, 9.11 | Đạt | Đặt trần công nợ mỗi khách 100.000đ (200) để yêu cầu phải chờ Điều hành; Sale tạo đơn tay 600.000đ (201), gửi yêu cầu giao trước, thu sau kèm lý do → 201, trạng thái PENDING; yêu cầu có trong danh sách Phê duyệt của Điều hành (true); Sale tự duyệt → 403 CAPABILITY_DENIED; Điều hành duyệt, hạn thu 3 ngày → 200; yêu cầu APPROVED, hạn thu 15/11 (3 ngày). Với cài đặt hiện có của tiệm (chính sách thu tiền cho giao trước), yêu cầu trước đó được tự duyệt ngay (AUTO_APPROVED, basis POLICY). Đã trả cài đặt về như cũ |
| F-11 | 5.15 | Đạt | Trang theo dõi sau hoàn tất: lời cảm ơn (true); ảnh giao hiện cho khách (true); khối "Quà cảm ơn cho lần đặt sau": mã CAMON-… giảm 10%, dùng một lần, gắn với SĐT đã đặt; nút đặt thêm (true) → form đặt mới điền sẵn thông tin người đặt (true) |
| F-12 | 4.31 | Chờ môi trường thật | Đối chiếu tin ZNS/SMS khách nhận ở các mốc đơn và credit trừ mỗi tin: cần nhà cung cấp ZNS/SMS thật |
| G-01 | 4.1 | Đạt | Sale tạo đơn tay ở Đơn hàng → Tạo đơn: chọn sản phẩm từ kho, người nhận, SĐT, địa chỉ một ô, ngày, khung giờ, lời thiệp → 201. Thiếu trường bắt buộc (SĐT người nhận không gửi) → 400. Form giữ một ô địa chỉ (PO 12/11/2026) |
| G-02 | 4.3 | Đạt | Lọc nâng cao (đúng tham số màn Tất cả gửi): ngày giao 15–20/11 + nhân viên bán Sale 1 → 5 đơn, đều trong khoảng ngày (true) và của Sale 1 (true); thêm trạng thái Đã xác nhận → 0 đơn đều CONFIRMED. Lọc chi nhánh: cửa hàng A có 1 chi nhánh nên ô chi nhánh ẩn (kiểm ở I-07) |
| G-03 | 4.4, 4.8, 6.7 | Đạt một phần | Đơn DH261112-T6REP559: ba trạng thái riêng — xử lý CONFIRMED, sản xuất READY, giao PENDING. Lịch sử đơn hàng (API của tab Lịch sử): 12 mốc (Tạo link, Khách mở link, Khách chọn mẫu, Khách gửi đơn, Ghi nhận tiền, Ghi nhận tiền lần đầu), có thời điểm (true). Nút sao chép trên sơ đồ lịch sử: chưa bấm thử trên trình duyệt |
| G-04 | 4.7, 1.16 | Đạt | Sale 1 huỷ trực tiếp đơn Thẻ Chào đã thu cọc DH261111-J933NYSG → 403 CAPABILITY_DENIED; gửi đề xuất huỷ + hoàn 50.000đ kèm lý do → 201 |
| G-05 | 4.7, 4.27 | Đạt | Sale đề xuất huỷ + hoàn cọc đơn DH261111-J933NYSG (201); Điều hành duyệt → 200, đơn CANCELLED, khoản hoàn 108.000đ vào mục Cần hoàn tiền của Hộp việc; đánh dấu đã hoàn → 200. Báo cáo doanh thu: đã hoàn 149000 → 257000, thực thu ròng 862000 → 754000 |
| G-06 | 4.10, 6.8 | Đạt | Kế toán xuất Excel đơn tháng 11 → 200; tệp có 4 trang: Đơn hàng (30 dòng), Chi tiết SP (31), Sổ thu tiền (5), Bộ sưu tập riêng (9) — trang thứ tư mang tên "Bộ sưu tập riêng" (tên hiển thị của Thẻ Chào). Nhật ký thao tác có dòng data.export |
| G-07 | 4.11 | Đạt | Sale 1 mở Khách hàng, tìm "Lan" → 1 khách; khách Chị Lan có 1 đơn Thẻ Chào cùng SĐT (DH261111-J933NYSG) |
| G-08 | 4.12 | Đạt | Bản cắt gd1-rc-2026-11-12-3: tạo 4 đơn Điều phối có giờ giao còn 170, 70, 20 phút và đã quá 10 phút (201,201,201,201). Bảng điều phối 23 đơn, 4 mức rủi ro {"CRITICAL":9,"AT_RISK":1,"ATTENTION":1,"NORMAL":12}; thứ tự đúng Đã trễ → Nguy cơ trễ → Cần chú ý → Bình thường (true); đầu bảng: CRITICAL, CRITICAL, CRITICAL, CRITICAL, CRITICAL, CRITICAL, CRITICAL |
| G-09 | 4.19 | Đạt một phần | Chuỗi C: đơn DH261112-N86VQ4KK tự mời chi nhánh CN1 nhận gia công (giá gia công 250.000đ, có hạn nhận). Mở link Thẻ Gia Công (không cần tài khoản) → 200: có đếm ngược/hạn (true), không có giá bán cho khách (true); link thiếu mã ký → 404; link đổi sang chi nhánh khác → 404. Nhận đơn → 200, cam kết → 200; chi nhánh thứ 2 nhận → 404; bước shipper khi chưa có ảnh QC → 409 "Đơn hàng chưa đến bước giao (cần ảnh thành phẩm được duyệt) hoặc đã có shipper."; trạng thái sau: . Tải ảnh QC, báo shipper, báo giao trên link: chưa chạy hết trên trình duyệt (có test tenant subcontract) |
| G-10 | 4.20 | Đạt | Gắn tài khoản Cửa hàng nhận gia công vào chi nhánh CN1 → 200; đăng nhập, Đơn nhận từ mạng lưới → 200, chi nhánh Chi nhánh 1, 1 đơn (DH261112-N86VQ4KK) |
| G-11 | 4.28 | Chờ môi trường thật | Giao dịch thử qua SePay (có mã đơn tự khớp, không mã vào danh sách chưa khớp): cần tài khoản SePay thật gửi webhook |
| H-01 | 6.1 | Đạt | Báo cáo theo kỳ → Đơn hàng, 11–12/11, nhóm theo ngày (màn /bao-cao và API /reports/orders 200): Tổng đơn 27, Hoàn tất 1 (3,7%), Huỷ 0, Giao trễ hẹn 0, Đang trễ 0 — khớp đếm trực tiếp trong CSDL (27 đơn tạo từ 11/11, 0 huỷ, 1 hoàn tất). Bảng theo ngày có đủ kỳ |
| H-02 | 6.2 | Đạt | Kế toán xem Doanh thu 11–12/11 (/reports/revenue 200): dự kiến 23.392.000đ, thực thu 891.000đ, đã hoàn 0, thực thu ròng 891.000đ = tiền đã xác nhận (891.000đ) − hoàn (0) theo sổ thu order_payments |
| H-03 | 6.3 | Đạt | Báo cáo Sản phẩm: bán nhiều nhất Giỏ hoa khai trương ×12, Mẫu nhập 5 ×4, Mẫu nhập 6 ×3; theo màu []; theo phong cách [{"label":"BO_CAM_TAY","quantity":3,"sharePercent":100}] |
| H-04 | 6.4 | Đạt | Dashboard Theo dõi đơn 30 ngày: tracking-pipeline {"data":[{"id":"81caee89-a49d-477d-b4d9-d542cd521529","type":"ORDER","orderId":"81caee89-a49d-477d-b4d9-d542cd521529","sessionId":"aee5553c-d3b6-4d2a-a2df-0838c5c87c17","orderCode":"DH261111-J933NYSG","sendCode":"T01-PXNFGTMW","catalogName":"Bộ sưu tập thử ngh |
| H-05 | 6.5 | Đạt | Hiệu suất: Sale Điều phối A 12 đơn/14400000; Sale Một 8 đơn/6240000; Thành viên đã rời 8 đơn/3628000; Chủ tiệm A 1 đơn/500000; thợ [{"userId":"6bd58445-a4cd-4615-8dc0-256e2e4a291a","name":"Thợ chế tác A","assigned":5,"done":1}]; shipper [{"key":"9dc5fc1f-a655-42fd-a8ee-ccf5b7fbb4d1","name":"Shipper A","delivered":1,"onTime":1,"onTimeRate":100}] |
| H-06 | 6.6 | Đạt một phần (chờ môi trường thật) | Dòng tiền theo hình thức thu: Chuyển khoản / VietQR thu 891000 hoàn 257000; Tiền mặt thu 120000 hoàn 0; đối chiếu ngân hàng theo ngày {"date":"2026-11-11","ledgerTransferVnd":257000,"bankMatchedVnd":0,"bankUnmatchedVnd":0,"bankIgnoredVnd":0,"unmatchedCount":0,"differenceVnd":257000} — chưa có giao dịch ngân hàng (SePay cần môi trường thật, xem G-11) |
| H-07 | 6.9, 10.1 | Đạt | Mức dùng tháng: {"by_feature":[{"feature":"vision.analyze","quantity":2,"cost_credit":2}],"credit_used":2,"credit_balance":175}; hạn mức {"period":"2026-11","credit":{"used":0,"limit":200},"ai":{"used":0,"limit":null}} |
| I-01 | 9.1 | Đạt | Sale nhắn Điều phối trên đơn DH261111-PW0JEGTX → 201; Điều phối thấy tin, trả lời 201, đánh dấu đã đọc 200; Sale thấy câu trả lời; thử xoá tin: DELETE → 404/405 (không có đường xoá) |
| I-02 | 9.4 | Đạt | Khôi phục mẫu ở B-15 → 200, mở lại được (200); xoá hẳn một mẫu khác trong thùng rác → 200, sau đó mở → 404 |
| I-03 | 9.5 | Đạt | Cấp khoá tích hợp → 201, khoá đầy đủ chỉ có trong phản hồi cấp (danh sách không chứa: true); xoay vòng → 201, khoá mới khác khoá cũ (true); thu hồi → 200; trạng thái sau: "revoked_at":"2026-11-12T09:31:18.333Z "revoked_at":null "revoked_at":"2026-11-12T09:31:11.710Z; Sale mở danh sách khoá → 403. Hiệu lực khoá cũ sau xoay/thu hồi: có test tenant (integration-tokens) |
| I-04 | 9.6 | Đạt | Danh sách tác vụ AI: 2 (vision.analyze:FAILED, vision.analyze:FAILED); chạy lại tác vụ lỗi → 200 |
| I-05 | 9.7, 10.3, 10.5 | Đạt một phần (chờ môi trường thật) | Đặt trần credit AI mỗi tháng = 5 → 200; đọc lại {"data":{"period":"2026-11","credit":{"used":1,"limit":200},"ai":{"used":1,"limit":5}}}; đã trả về không trần (200). Báo 80% và tạm dừng khi chạm trần: cần tác vụ AI chạy thật (khoá AI) |
| I-06 | 9.7 | Đạt | Chính sách AI của cửa hàng: {"capabilities":[{"capability_code":"AIC-01","capability_name":"product_vision","module":"M01","kind":"generative","needs_approval":true,"allowed_models":[{"key":"claude_opus","display_name":"Claude Opus 5","measure_state":"THU_NGHIEM","leaves_infra":true,"cos |
| I-07 | 9.13 | Đạt | Chuỗi C: tạo 2 chi nhánh, gán Sale CN1 vào chi nhánh 1, Sale CN2 vào chi nhánh 2. Sale CN1 tạo đơn (201) → đơn gắn chi nhánh 1 (true); danh sách của Sale CN1: 1 đơn, đều của chi nhánh 1 (true); mở đơn chi nhánh 2 → 404; Điều hành chuỗi thấy 2 đơn của cả hai chi nhánh |
| I-08 | 1.6 | Đạt một phần | Nhập 2 chi nhánh có phường phục vụ, toạ độ (lệnh màn nhập gửi sau khi đọc Excel) → 200 {"data":{"created":2,"updated":0,"total":2,"geocoded":0,"geocodeNotFound":0,"geocodeSkipped":0,"errors":[]}}; nhập lại CN2 → cập nhật, không tạo trùng (200; tổng 2 chi nhánh: CN1:Chi nhánh 1, CN2:Chi nhánh 2 (đổi tên)); lô có dòng thiếu dữ liệu → 400 (báo lỗi theo dòng: ["branches",1,"branchName"]). Bước đọc tệp Excel trên trình duyệt chưa bấm thử |
| I-09 | 9.14 | Chờ môi trường thật | Đăng nhập một lần sang ứng dụng liên kết: cần ứng dụng liên kết chạy thật để mở. Cấp, xoay vòng, thu hồi khoá liên kết đã đạt ở I-03; phiên liên kết 15 phút có test (sso) |
| I-10 | 8.1 | Đạt một phần (chờ môi trường thật) | Tạo landing/catalog công khai (tự soạn nội dung) → 201, địa chỉ /c/landing-20-11-thu-nghiem-xyl6b mở 200, có thẻ ảnh xem trước og:image/og:title (true); khách đặt trên trang → 201, đơn DH261112-0024 có ở màn Đơn hàng với nguồn "source":"CATALOG". AI soạn nội dung landing: cần khoá AI thật |
| J-01 | 9.9 | Đạt | Đăng ký trả 202 "Đăng ký đã được ghi nhận và đang chờ quản trị viên duyệt. Bạn sẽ đăng nhập được ngay sau khi được duyệt."; đăng nhập trước duyệt trả 403 (ACCOUNT_PENDING) |
| J-02 | 9.9 | Đạt | Màn Console liệt kê đăng ký (có hồ sơ); duyệt 200; đăng nhập sau duyệt 200 |
| J-03 | 9.10, 10.7 | Đạt | Tạo A (gói Starter tháng 299.000đ, 50 credit tặng) 201; B, C 201. Mật khẩu tạm trả 1 lần, không có lại ở danh sách tổ chức; nhật ký nền tảng (200) không chứa mật khẩu. Thuê bao: {"subscription":{"id":"c90d2644-5cc8-4989-ae76-57e899566d54","organization_id":"61c4e3d9-14b6-418d-98ae-9920f60f246e","plan":"STARTER","cycle":"MONTHLY","price_ |
| J-04 | 9.8 | Đạt | Tổng quan: 5 tổ chức (1 đang có thuê bao hoạt động, 4 chưa có gói, 0 quá hạn) khớp dữ liệu thử; doanh thu thuê bao 6 tháng, tháng 11 = 299.000đ khớp hoá đơn vừa thu; sức khoẻ: worker vision và media đang kết nối |
| J-05 | 10.6, 10.3 | Đạt | Nạp 100 (200), Tặng 20 (200), Hoàn 5 (200), hạn mức tháng 200 (200). Số dư trước 0 → sau 125; 3 dòng sổ |
| J-06 | 10.3 | Đạt | Lưu quy đổi 200; đọc lại: {"smsCredit":1,"znsCredit":1,"usdToVnd":25000,"creditValueVnd":1000,"smsCostVnd":0,"znsCostVnd":0,"defaultMonthlyLimit":null,"messageOverdraftCredit":10,"brandExtraOptionCredit":1} |
| J-07 | 10.3, 10.5 | Chờ môi trường thật | Gửi tin khách khi số dư credit về 0 (âm tối đa 10, báo Điều hành, vượt mức ngừng gửi): cần nhà cung cấp ZNS/SMS thật để có tin gửi đi. Mức âm tối đa 10 đã lưu ở J-06 |
| J-08 | 10.2 | Đạt | Tác vụ nhận diện ảnh tạo lúc 06:00:24 (201) → worker báo lỗi (thiếu khoá AI), job FAILED, sổ usage trừ 1 credit (ENQUEUED). Lượt quét định kỳ POST /api/v1/internal/integrations-sweep (đúng lệnh cron 5 phút trong render.yaml, có x-cron-secret) lúc 06:02:25 → 200, ghi dòng REFUNDED cho job, trả lại 1 credit. Gọi lượt quét lần nữa → credits {refundedJobs: 0, refundedCredit: 0} (không hoàn trùng). Không chạy tay hoan-credit |
| J-09 | 10.4 | Đạt | Console biên lợi nhuận tháng 2026-11 → 200; dòng cửa hàng A: {"organizationId":"61c4e3d9-14b6-418d-98ae-9920f60f246e","organizationName":"Tiệm hoa A","creditUsed":0,"aiCostUsd":0,"messageCostVnd":0,"revenueVnd":0,"costVnd":0,"marginVnd":0,"marginPercent":null}. Màn /van-hanh/muc-dung: Mức dùng & Chi phí Phạm vi: SuperAdmin Nền tảng Tổng Credit 2 Lượt gọi AI 4 Tổ chức hoạt động 1 Quy đổi credit Mọi dịch vụ trừ chung một số dư credit. Hạn mức r |
| J-10 | 10.7 | Đạt | Console khai tài khoản nhận tiền thuê bao (200); hoá đơn kỳ đầu TBQYB2L55H 299.000đ PENDING → xác nhận đã thu → PAID; phía cửa hàng (Sổ quỹ & thu chi) thấy gói Starter tháng, trạng thái ACTIVE, hoá đơn PAID |
| J-11 | 10.7 | Đạt | Giả lập hoá đơn quá hạn bằng gói Pro tháng chưa thu kỳ đầu (trạng thái OVERDUE ngay). Cửa hàng D khi quá hạn: tạo sản phẩm → 402 "Gói dịch vụ quá hạn thanh toán — tài khoản đang ở chế độ chỉ xem. Thanh toán hoá đơn để mở lại.", xem danh sách vẫn 200; Console xác nhận thu → tạo sản phẩm 201. Cửa hàng B khi quá hạn: khách mở link Thẻ Chào vẫn xem được mẫu, bấm Xác nhận đặt hoa → không tạo đơn, trang báo "Cửa hàng đang tạm ngưng nhận đơn trực tuyến. Vui lòng liên hệ trực tiếp cửa hàng để đặt hàng." (ảnh J-11-dat-don-khi-qua-han); Console xác nhận thu → mở lại |
| J-12 | 10.8 | Đạt một phần (chờ môi trường thật) | Thêm tên miền hoa-a-thu.example.vn → 201; hướng dẫn DNS: _smeos-verify.hoa-a-thu.example.vn. Kiểm tra khi chưa có bản ghi TXT → 200 {"verified":false,"message":"Chưa thấy bản ghi TXT đúng mã xác minh. Bản ghi mới thêm có thể mất tới vài giờ để có hiệu lực — vui lòng kiểm . Có TXT → Đang hoạt động: cần DNS thật |
| J-13 | 10.8 | Đạt một phần (chờ môi trường thật) | Không có DNS thật: giả lập bước xác minh bằng cách đặt trạng thái VERIFIED cho hoa-a-thu.example.vn trong CSDL thử, rồi gửi yêu cầu kèm Host của tên miền. Kết quả: bộ sưu tập /g/<A> 200, link khách /b/<link của A> 200; link của cửa hàng B /b/T01-… 404; /dang-nhap 404 (trên máy chủ nền tảng 200); /san-pham 404. Trang chủ / → 404 vì cửa hàng A chưa xuất bản trang cửa hàng /ch (có trang thì chuyển về /ch/<mã>). Cần kiểm lại với DNS và chứng chỉ thật |
| J-14 | 10.8 | Đạt | Console khoá tên miền kèm lý do → 200; cửa hàng thử gỡ → 409 "Tên miền đang bị khoá nên chưa gỡ được. Vui lòng liên hệ hỗ trợ của hệ thống."; Console mở lại → 200, trạng thái sau mở: "status":"PENDING". Khi khoá, tên miền ngừng mở trang: /g/<A> qua tên miền riêng chuyển từ 200 sang 404 sau ~10 giây (bộ đệm phía proxy, tối đa 60 giây) |
| S-01 | 1.1, 1.19 | Đạt | Cửa hàng B dán đường dẫn của cửa hàng A (bản cắt gd1-rc-2026-11-12-2): sản phẩm: "Không tìm thấy sản phẩm này.", khung chờ tải còn 0; phiếu đơn: "Không tìm thấy đơn hàng này.". Báo giá không có đường dẫn chi tiết riêng; API đơn, sản phẩm, báo giá của A trả 404 (S-02) |
| S-02 | 1.1, 1.19, 1.18 | Đạt | Cửa hàng B gọi API bằng mã của A: đơn: A 200, B 404; sản phẩm: A 200, B 404; báo giá: A 200, B 404; đơn Thẻ Chào: A 404, B 404; phiếu in: A 200, B 404 |
| S-03 | 1.14, 1.15 | Đạt | Sale mở thẳng /cai-dat và /cai-dat/thanh-vien: chặn, hiện "Bạn chưa có quyền mở trang này"; /cai-dat/thanh-vien/vai-tro: hiện "Chỉ Điều hành quản lý vai trò", không có danh sách hay nút sửa. API danh sách thành viên trả tên, không trả email; sửa hồ sơ cửa hàng 403. Ghi nhật ký truy cập bị chặn: kiểm ở S-10. Ghi nhận thêm: trang Thương hiệu /ho-so (ngoài phạm vi bước) Sale xem được, lưu bị từ chối 403 |
| S-04 | 1.16 | Đạt | Sale 1: xác nhận tiền đơn Thẻ Chào 403 CAPABILITY_DENIED; xác nhận tiền đơn tay 403 CAPABILITY_DENIED; huỷ đơn 403 CAPABILITY_DENIED; hoàn tiền đơn Thẻ Chào 403 CAPABILITY_DENIED; ghi khoản hoàn ở sổ thu 403 CAPABILITY_DENIED; báo giá 100.000đ dưới sàn 422 UNPROCESSABLE_ENTITY "Giá 100.000 ₫ thấp hơn giá sàn 512.000 ₫ — cần Điều hành duy" |
| S-05 | 1.13, 1.16 | Đạt | Điều hành gửi một lệnh bật quyền cho vai Trưởng ca gồm Xem đơn (R1) + Xác nhận tiền chuyển khoản (R11, trần cứng Điều hành) → 403; quyền của vai sau lệnh vẫn là C1, R1, R3 — không ghi thay đổi nào |
| S-06 | 1.16 | Đạt | Sale ghi khoản thu tiền mặt 120.000đ → 201, trạng thái PENDING; Sale tự xác nhận → 403 CAPABILITY_DENIED; Điều hành xác nhận → 200, trạng thái sau CONFIRMED |
| S-07 | 9.12 | Đạt | Sale tự duyệt yêu cầu giao trước thu sau của mình → 403 CAPABILITY_DENIED; Sale xin giảm 5% trên đơn Thẻ Chào của mình (201) rồi tự duyệt → 403 CAPABILITY_DENIED; tự duyệt đề xuất sửa mẫu: chặn (B-10, lượt 2) |
| S-08 | 9.13, 1.19 | Đạt | Nhân viên chi nhánh 1 mở đơn của chi nhánh 2 bằng mã đơn → 404 "Không tìm thấy đơn hàng"; đơn của chi nhánh mình 200. Phiếu in trả 403 cho cả đơn của mình lẫn đơn chi nhánh khác vì vai Sale không có quyền in (R7) — không lộ đơn có tồn tại hay không |
| S-09 | 1.4 | Đạt | Chủ cửa hàng B đăng nhập bằng mật khẩu tạm (200); trước khi đổi: GET /api/v1/orders 403 PASSWORD_CHANGE_REQUIRED; GET /api/v1/products 403 PASSWORD_CHANGE_REQUIRED; POST /api/v1/orders 403 PASSWORD_CHANGE_REQUIRED; /auth/me vẫn trả 200 để hiện hộp đổi mật khẩu. Đổi mật khẩu 200 → GET /api/v1/orders 200 |
| S-10 | 1.15, 1.17 | Đạt | Nhật ký thao tác: 100 dòng gần nhất, 15 dòng truy cập bị chặn; ví dụ {"id":"4a7d619a-5ef0-4c07-8c14-dec0f56868e7","organization_id":"61c4e3d9-14b6-418d-98ae-9920f60f246e","user_id":"58a7b3ed-9664-420a-9f1b-21167baf255a","action":"security.access_denied","entity_type":"http_request","entity_id":"/api/v1/integration-tokens","before":null,"after":{"method":"GET","reason":"Thiếu năng lực F9","capabil |
| S-11 | 1.18 | Đạt | `npm run test:tenant` trên bản cắt `gd1-rc-2026-11-12-3`, CSDL `smeos_test`, biến môi trường như CI: 271/271 tệp, 1.143 test xanh |

## 7. Việc tiếp theo

1. Tạo repo riêng của ALG, đẩy bản cắt `gd1-rc-2026-11-12-3` lên làm commit đầu tiên, bật CI của bản giao.
2. Dựng staging của ALG có khoá thật (AI, Zalo ZNS/SMS, SePay, Telegram, DNS) và chạy 19 bước chờ môi trường thật: A-15, B-04, B-05, B-06, B-13, B-14, E-01, E-04, E-08, F-07, F-12, G-11, H-06, I-05, I-09, I-10, J-07, J-12, J-13.
3. Chạy nốt phần còn lại của 4 bước Đạt một phần trên trình duyệt ở staging: F-06, G-03, G-09, I-08.
4. Diễn tập khôi phục dữ liệu, thử tải, rà giấy phép thư viện bên thứ ba theo kế hoạch bàn giao.
