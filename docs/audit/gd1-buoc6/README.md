# Dựng bản cắt GD1 từ môi trường trắng và chạy kịch bản nghiệm thu — 11/11/2026

Thực hiện Bước 6 của [kế hoạch bàn giao](../../plan/BANGIAO_GD1_123_CHUC_NANG.md) trên ứng viên `gd1-rc-2026-11-11-2` (`4d1fb65d`). Kết quả từng bước ghi trong [bản checklist đã điền](ket-qua-nghiem-thu-ban-cat-2026-11-11.xlsx) (cột Kết quả, Người chạy, Ngày, Ghi chú); ảnh bằng chứng ở thư mục [`anh/`](anh/).

## 1. Kết luận

- Bản cắt **dựng và chạy được** từ môi trường trắng: build production, migrate 0 lỗi, web + worker `vision` + worker `media_ai` chạy; 5.087/5.132 tệp giống hệt mã smeOS cùng mốc.
- Bản cắt **chưa đạt để giao**: 141 bước — **55 Đạt, 17 Không đạt**, 12 chờ môi trường thật (khoá AI, Zalo ZNS/SMS, SePay), **57 chưa chạy** (Luồng F, G, H, I phần lớn, J-07/09/11–14, S-01/02/04/06–10, B-11, B-15, D-17, E-13).
- Ba lỗi chặn việc dựng máy theo tài liệu giao: không tạo được người vận hành đầu tiên, `.env.example` làm app và worker không khởi động, README thiếu bước nạp danh mục trường (mục 4, lỗi 1–4).

## 2. Môi trường

| Hạng mục | Thực tế |
|---|---|
| Mã | `npm run release:cut -- gd1 gd1-rc-2026-11-11-2 <thư mục>`, chạy với biến môi trường như CI để sinh lại tệp OpenAPI |
| Hạ tầng | Postgres 16.15 (cổng 5433), Redis, `next build` + `next start` (cổng 3200), worker `vision` và `media_ai` (Python 3.13) |
| Cấu hình | `.env` từ `.env.example`, bí mật ngẫu nhiên; `ALLOW_LOCAL_STORAGE=true`; không đặt `NEXT_PUBLIC_APP_ENV` |
| Không có | Khoá AI, Zalo ZNS/SMS, SePay, Telegram, SMTP, tên miền thật |
| Dữ liệu | 1 người vận hành; cửa hàng A, B, chuỗi C tạo từ Console; 7 nhân viên cửa hàng A; 10 sản phẩm; 5 nguyên liệu |
| Cách chạy | Trình duyệt Playwright (máy tính 1366 px và giả lập iPhone 13) cho bước giao diện; gọi đúng API mà giao diện gọi cho bước nghiệp vụ |

## 3. Cổng kiểm trên bản cắt

| Cổng | Kết quả |
|---|---|
| `npm run typecheck` | Xanh |
| `npm test` | 699/699 tệp, 4.195 test đạt, 2 bỏ qua |
| `npm run test:platform` | 18/18 tệp |
| `npm run test:tenant` | 265/266 tệp. `retry-recharge-credit` đỏ vì CSDL thử dựng bằng `prisma migrate deploy` (trigger chỉ-thêm của `usage`); CI dựng bằng `db push` và đạt |
| `pytest` worker | Xanh |
| Kiểm rò rỉ (`handover-check`) | Sạch, 5.133 tệp |
| Quét 74 trang bằng tài khoản Điều hành | 2 lỗi: liên kết chết `/noi-bo/ket-noi` (lỗi 5); `/chinh-sach-bao-mat` 404 khi chưa bật `NEXT_PUBLIC_PRIVACY_NOTICE_ENABLED` |

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
| 14 | Báo giá Thẻ Chào thiếu khu vực giao và phí giao theo khu vực, phụ phí ngày lễ, phí chế tác ngày lễ; mã trong lô mã giảm giá không áp | Trang `/b/[sendCode]`, API `quote` | D-09, C-10 |
| 15 | Giới hạn số đơn ngày lễ không áp: ngày khai tối đa 2 đơn nhận 4 đơn | Đặt đơn Thẻ Chào | D-12 |
| 16 | Đề xuất thay hoa luôn rỗng với đơn Thẻ Chào: mã đọc `metadata.flowers[].flowerName`, ảnh chụp mẫu chỉ có `flowersSummary`, form sản phẩm lưu `bom.flowers[].name` | `src/modules/greeting-card/domain/flower-substitute.ts:52` | E-11, E-12 |
| 17 | Phiếu xưởng A6 thiếu ảnh mẫu, phiên bản, số cành, công thức có ô đánh dấu; in cả ghi chú đối soát tiền | `/in-phieu/[id]` | E-07 |
| 18 | Sale không đổi được giờ giao (thiếu `R3`); lịch sử đơn chỉ ghi đổi trạng thái, không giữ giá trị cũ/mới của giờ giao | `PATCH /api/v1/orders/:id` | E-14 |
| 19 | Thiết bị bị thay phiên không có câu báo lý do; trang duyệt ảnh của khách không có nút góp ý; tab Nhận thanh toán không hiện mã VietQR mẫu | — | A-02, E-10, A-15 |
| 20 | Giao diện: thanh tab Cài đặt tiệm bị ép trong cột hẹp; nhiều ô ở Hồ sơ cửa hàng không có tên truy cập (Hotline, Email, Địa chỉ, Website, Fanpage); nhãn tiêu chí đè dòng dưới ở danh sách sẵn sàng; vai "Experience User" tên tiếng Anh; `/san-pham` có hai vùng `main` | — | A-03, B-08 |

Chưa kết luận, cần kiểm tiếp: mẫu khai giá theo phiên bản (Nhỏ/Vừa/Lớn) hiện "Liên hệ" trên link khách khi bảng giá ghi qua API; đơn Thẻ Chào chưa có đường vào danh sách "Đơn cần giao" của Shipper (danh sách đọc `order_coordinations`).

## 5. Đã đạt

Console: đăng ký và duyệt cửa hàng, tạo tổ chức kèm gói và mật khẩu tạm một lần, sổ credit, quy đổi credit, thu phí thuê bao. Phân quyền: bắt đổi mật khẩu tạm, một phiên mỗi tài khoản, trang chủ theo vai, vai tuỳ chỉnh không vượt trần cứng, chặn tự đổi vai, gỡ nhân viên mất quyền ngay, nhật ký có IP và thiết bị. Sản phẩm và giá: mã tự sinh, chặn trùng mã, giá theo phiên bản, duyệt đề xuất hai bước, giá vốn khớp tính tay, báo giá có lịch sử sửa, link báo giá tải PNG/PDF A6, tạo đơn từ báo giá, lô mã giảm giá. Thẻ Chào: bộ sưu tập, link riêng, ảnh ghép có QR, theo dõi khách mở link, ngày khoá, đặt đơn có VietQR đúng số tiền cọc, thu hồi và hết hạn link, phân quyền xem khách theo Sale. Thanh toán và sản xuất: chỉ Điều hành xác nhận tiền, từ chối và báo lại, giao thợ, thợ không thấy giá, xin giảm giá có trần và duyệt hai bước.

## 6. Kết quả từng bước

| Bước | Chức năng | Kết quả | Ghi chú |
|---|---|---|---|
| A-01 | 1.2, 1.4 | Đạt | Sau đăng nhập hiện hộp đổi mật khẩu (true); nhấn Esc vẫn còn (true); đổi xong hộp đóng (true), vào / |
| A-02 | 1.2 | Không đạt (đạt một phần) | Thiết bị 2 đăng nhập cùng tài khoản (200); thiết bị 1 tải lại trang → bị đưa về trang Đăng nhập (phiên cũ bị thu hồi), nhưng KHÔNG có câu báo "phiên đã được thay" (ảnh A-02) |
| A-03 | 1.5, 9.2, 9.3 | Đạt | Giao diện: điền tên, mô tả, thông điệp thương hiệu, khách mục tiêu, SĐT, địa chỉ ở Cài đặt tiệm → Lưu; tải lại vẫn giữ. Logo tải lên (PUT 200, đăng ký 201) và màu #821E3C lưu ở hồ sơ thương hiệu (200), đọc lại khớp. Ghi chú: kịch bản ghi "tab 2" nhưng thanh tab không có mục 2 — logo/màu nằm ở Hồ sơ cửa hàng (/ho-so) |
| A-04 | 1.10, 1.12 | Đạt | Tạo 7 tài khoản (dieu_phoi:201, sale:201, sale:201, tho_cam:201, shipper:201, ke_toan:201, product_manager:201); mỗi tài khoản trả mật khẩu tạm 1 lần (true), danh sách không trả lại mật khẩu (true); danh sách có 8 người kể cả chủ tiệm, vai: dieu_hanh,dieu_phoi,sale,sale,tho_cam,shipper,ke_toan,product_manager |
| A-05 | 1.4, 1.12 | Đạt | Đăng nhập lần đầu bị buộc đổi mật khẩu; trang chủ là hàng việc của thợ: "Chưa có việc nào — Khi Điều phối giao đơn cho bạn, việc sẽ hiện ở đây"; không có số tiền/giá trên trang (ảnh A-05-trang-chu) |
| A-06 | 1.12 | Đạt | Đăng nhập lần đầu bị buộc đổi mật khẩu (true); trang chủ đúng (Bỏ qua tới nội dung / Tiệm hoa A / StoreOS • Sản phẩm) |
| A-07 | 1.12 | Đạt | Đăng nhập lần đầu bị buộc đổi mật khẩu; trang chủ Kế toán: khối Giao dịch ngân hàng chưa khớp đơn, lối tắt Đơn hàng và sổ thu, Số liệu kinh doanh, Mức dùng, Xuất Excel (ảnh A-07-trang-chu) |
| A-08 | 1.14 | Không đạt | Menu Sale có Đơn hàng, Thẻ chào nhưng VẪN có nhóm Quản trị tiệm: Hồ sơ cửa hàng, Cài đặt tiệm, Đội ngũ & phân quyền, Ma trận quản trị (ảnh A-08b). Nguyên nhân: vai Sale mặc định có mã F1 (xem thành viên) |
| A-09 | 1.13 | Đạt | Tạo vai 201; bật 3 quyền (Xem đơn, Sửa đơn, …) 200 → vai có ["C1","R1","R3"]; thử bật Xác nhận tiền (R11, trần cứng) bị từ chối 403; màn Vai trò & quyền không liệt kê quyền trần cứng (xác nhận tiền, huỷ đơn, hoàn tiền, giá dưới sàn) |
| A-10 | 1.11, 1.13 | Đạt | Đổi vai Sale Hai → Trưởng ca 200; tải lại, menu đổi (2708→779 ký tự; mất Thẻ chào: false) |
| A-11 | 1.11, 9.12 | Đạt | Điều hành tự đổi vai mình → 422 UNPROCESSABLE_ENTITY "Không tự đổi vai của chính tài khoản bạn" |
| A-12 | 1.11, 1.3 | Đạt | Gỡ Sale Hai 204; Sale Hai tải lại → /dang-nhap; đăng nhập lại → 200  — phiên sau đăng nhập lại không thuộc tổ chức nào: organization null, 0 quyền, /orders /members /products đều 409 |
| A-13 | 1.3 | Đạt | Menu tài khoản có nút Đăng xuất (true); sau đăng xuất bấm Quay lại → /dang-nhap |
| A-14 | 1.7 | Không đạt (đạt một phần) | Cửa hàng tạo từ Console KHÔNG có danh sách dịp mặc định (0 dịp; cửa hàng tự đăng ký có 7) nên phải tự thêm dịp để tắt. Thêm dịp "Ngày Nhà giáo" giọng Trang trọng 201; tắt "Dịp không dùng" 200; danh sách dịp đọc lại có dịp mới, "Dịp không dùng" ở trạng thái tắt. Lựa chọn dịp trong form tạo sản phẩm: kiểm tiếp ở B-01 |
| A-15 | 1.8, 4.22 | Không đạt (đạt một phần) | Lưu tài khoản nhận tiền 200, cọc 30% 200; đọc lại giữ đủ hai khoá (không ghi đè nhau). Mã VietQR mẫu trên tab 3: không thấy phần tử QR |
| A-16 | 1.8, 3.2 | Đạt | 2 khu vực (Nội thành 30.000đ, Ngoại thành 60.000đ), giờ chốt nhận đơn trong ngày 17h → 200; đọc lại đúng. Áp vào báo giá: kiểm ở D-09 |
| A-17 | 1.8, 4.21 | Đạt | Ngày lễ 2026-11-13 (2 ngày tới), phụ phí 50.000đ, tối đa 2 đơn → 200; đọc lại đúng. Áp dụng: kiểm ở D-09, D-12 |
| A-18 | 1.9 | Đạt | Thêm trường "Mã nhân viên giới thiệu" 201; ẩn trường không bắt buộc "Đơn có thiệp/băng rôn" 200; thử tắt trường bắt buộc "Tên người mua" → 400 VALIDATION_FAILED; màn tab 11 có nhãn Luôn hiện. Hiện ở form đơn: kiểm ở G-01 |
| A-19 | 1.17 | Đạt | Nhật ký lọc theo Điều hành, hôm nay: 48 dòng, loại: api.mutation, field.shop.override, field.shop.create, member.remove, member.role.change, security.access_denied, member.account.create, user.password.change; có IP 48/48, thiết bị 48/48, trước/sau 4/48 |
| B-01 | 2.1, 2.5 | Không đạt | Vai Quản lý sản phẩm mặc định KHÔNG lưu được (thiếu quyền tải ảnh G2, form báo "Không thể khởi tạo đường dẫn tải ảnh lên"). Chạy lại bằng Điều hành: tạo được, mã AUTO-AA385597, trạng thái ACTIVE (form mặc định ""), ảnh không. 3 dòng công thức mẫu điền sẵn trong form (Hồng Ecuador, Cúc Trắng Fiji, Lá xanh) BỊ LƯU vào sản phẩm. Lựa chọn dịp: không thấy Ngày Nhà giáo, không hiện dịp đã tắt |
| B-02 | 2.1 | Đạt | Tạo sản phẩm mã trùng AUTO-AA385597 → 409 "Mã sản phẩm "AUTO-AA385597" đã tồn tại trong tổ chức" |
| B-03 | 2.4 | Đạt | Giá theo phiên bản Nhỏ/Vừa/Lớn (giá thường, cao điểm, số cành) lưu 200; mở lại: Nhỏ 450000/550000/7 cành; Vừa 650000/780000/12 cành; Lớn 900000/1100000/20 cành |
| B-04 | 2.6 | Đạt một phần (chờ môi trường thật) | API nhập lô: 10 dòng có 1 dòng thiếu tên → cả lô bị từ chối 400 (không nhập phần hợp lệ); bỏ dòng thiếu tên gửi lại → nhập 8 mẫu, dòng trùng mã bị bỏ qua. Màn xem trước đánh dấu 2 dòng lỗi: chưa kiểm trên giao diện. Vai Quản lý sản phẩm mặc định không có quyền nhập lô (thiếu H3 → 403) |
| B-05 | 2.9 | Chờ thử thật | Tạo câu chuyện sản phẩm cần kết quả nhận diện đã duyệt + nhà cung cấp AI; chưa có khoá AI |
| B-06 | 2.9 | Chờ thử thật | Phụ thuộc B-05 (nội dung đã duyệt) |
| B-07 | 2.3, 7.3 | Đạt | Mở bán (Đang bán) mẫu chưa có nội dung bán hàng đã duyệt → 200; danh mục và trang chủ Quản lý SP liệt kê tiêu chí còn thiếu từng mẫu (Thiếu ảnh chính thức, Chưa có giá/BOM, Chưa có bài viết bán hàng được duyệt). Lỗi hiển thị: nhãn tiêu chí xuống dòng đè lên tên mẫu dòng dưới (ảnh B-08) |
| B-08 | 7.3 | Đạt | Trang chủ Quản lý SP: Tổng sản phẩm 10, Cần hoàn thiện 10, Sẵn sàng bán 0, Điểm sẵn sàng TB 30% — khớp 10 sản phẩm trong danh mục |
| B-09 | 2.3 | Đạt | Thao tác hàng loạt Tạm ngưng 3 mẫu 200 → PAUSED,PAUSED,PAUSED; đổi 1 mẫu sang Đang bán 200. Ẩn trên link khách: kiểm ở D-05 |
| B-10 | 2.7, 9.11, 9.12 | Đạt | Sale gửi đề xuất đổi giá phiên bản Vừa 650.000→700.000 → 201; Sale tự duyệt → 403; trang sản phẩm hiện đề xuất chờ duyệt; Điều hành duyệt → 200; giá phiên bản Vừa sau duyệt: 700000 |
| B-11 | 2.2 | Chưa chạy |  |
| B-12 | 2.8 | Đạt | Thêm ngày không nhận đơn 2026-11-12 vào cấu hình khả dụng của mẫu B01 → 200; đọc lại có ngày này. Phía khách: D-08 |
| B-13 | 7.1 | Chờ thử thật | Tải ảnh, tạo tác vụ nhận diện → 201, trừ 1 credit, worker vision nhận việc ngay; tác vụ FAILED vì chưa có khoá OpenAI (engine openai_structured). Cần khoá AI thật để kiểm kết quả nhận diện và tạo sản phẩm. Vai Quản lý SP mặc định không có quyền tải ảnh/nhận diện (G2, H1) |
| B-14 | 7.2, 2.1 | Chờ thử thật | Bộ nội dung từ 1 ảnh cần nhà cung cấp AI; chưa có khoá AI |
| B-15 | 2.3, 9.4 | Chưa chạy |  |
| C-01 | 3.3 | Đạt | 5 nguyên liệu có đơn giá; công thức B01: 10 hồng×25.000 + 5 cúc×12.000 + 8 lá×3.000 + 1 giấy×8.000 + 2m ruy băng×5.000 = 352.000đ — hệ thống tính đúng 352.000đ. Giá vốn tổng 426.250đ = nguyên liệu + hao hụt 35.500 + chi phí chung 38.750; tiền công 0 vì chưa khai đơn giá công/giờ (hệ thống báo thiếu) |
| C-02 | 3.1 | Đạt một phần (chờ môi trường thật) | Hệ số Sàn 1,2 / Trần 3 lưu 200. Giảm hạng Vàng 10% và phụ phí khung giờ cao điểm: chưa xác định được khoá lưu trên màn /gia — cần người kiểm giao diện |
| C-03 | 3.4 | Không đạt (đạt một phần) | Theo đúng trang Chuẩn bị (chỉ khai đơn giá nguyên liệu) Sale tạo và gửi được báo giá 400.000đ (BG-0002) — giá sàn chỉ áp khi giá vốn đủ, mà mẫu chưa gắn độ phức tạp chế tác thì tiền công thiếu → sàn = 0, không chặn, không cảnh báo. Gắn độ phức tạp "Vừa" (200; giá vốn 591250đ, đủ: true, sàn ≈ 710000đ): Sale lập lại → 422 "Giá 400.000 ₫ thấp hơn giá sàn 710.000 ₫ — cần Điều hành duyệt" |
| C-04 | 3.4, 1.16 | Đạt | Điều hành lập cùng báo giá dưới sàn → 201; nhật ký ghi thao tác (dòng api.mutation POST /api/v1/quotations kèm người, IP, thiết bị): có |
| C-05 | 3.8, 3.9 | Đạt | Báo giá 2 mẫu (Lớn 900.000 ×1, Nhỏ 300.000 ×2), ưu đãi 50.000, phí ship 30.000, hạn 7 ngày → tạo 201, gửi 200; tổng 1480000 (tính tay 1480000); mã BG-0003 |
| C-06 | 3.10 | Đạt | Sửa giá dòng 1 hai lần (880.000 rồi 860.000) → 200/200; tổng mới 1440000; lịch sử sửa 2 bản: [{"version":2,"snapshot":{"items":[{"qty":1,"name":"Bó hồng nghiệm thu B01","note":null,"unitPrice":880000,"totalPrice":880000,"variantLabel":"Lớn"},{"qty":2,"name":"Mẫu nhập 5","note":null,"unitPrice |
| C-07 | 3.11 | Đạt | Link /bg/… mở trên điện thoại 200; có Bó hồng, Lớn, 1.440.000, 30.000; lộ giá vốn/ghi chú nội bộ: false; tải: bao-gia-BG-0003.png, bao-gia-BG-0003.pdf |
| C-08 | 3.12 | Đạt | Chốt báo giá BG-0003 rồi Tạo đơn → đơn DH261111-0001, nguồn QUOTATION, tổng 1.440.000đ = tiền hàng 1.460.000 − ưu đãi 50.000 + phí giao 30.000, khớp báo giá |
| C-09 | 3.5 | Đạt | Tạo lô 5 mã giảm 10%, hạn 7 ngày → 201; mã: NT-2RSQCD8V, NT-FN65FUTU, NT-GJWJHR5C, NT-JBJ3BWU8, NT-NNXDWYWQ |
| C-10 | 3.6 | Không đạt | Đơn giá kiểu dáng BOUQUET 100.000đ và hệ số ngày lễ 1,5 lưu được; nhưng báo giá ngày lễ (D-09, cả API quote của máy chủ) không cộng phí chế tác ngày lễ (kỳ vọng +50.000đ) |
| C-11 | 3.7 | Đạt | Giảm tối đa 15%/đơn lưu được; áp dụng: yêu cầu giảm 20% → 400 Dữ liệu gửi lên không hợp lệ |
| D-01 | 5.1 | Đạt | Sale tạo bộ sưu tập Tiêu chuẩn mã "thu-nghiem" với 6 mẫu (1 mẫu Tạm ngưng) → 201; bộ sưu tập có 6 mẫu |
| D-02 | 5.5, 5.15 | Đạt | Bật Giá tiền, Thông tin giảm giá, Mã cảm ơn 10% → 200; đọc lại: {"required":["code","name"],"fields":[{"key":"flowers","label":"Thành phần hoa"},{"key":"color","label":"Màu chủ đạo"},{"key":"style","label":"Phong cách"},{"key":"dimensions","label":"Kích thước"},{" |
| D-03 | 5.2 | Đạt | Gửi nhanh cho "Chị Lan" → 201; link riêng /b/T01-5KVX66AM; danh sách gửi có dòng khách mới: true |
| D-04 | 5.2, 5.4 | Đạt | Link mang tên Sale /s/87KX30XFD3; ảnh catalog PNG 1200×630: logo, tên bộ sưu tập, khoảng giá, 4 mẫu + "+1", mã QR "Quét để xem", nút Xem mẫu và đặt hoa; mẫu Tạm ngưng không có trong ảnh. Ảnh xem trước khi dán link vào Zalo: cần người thử trên Zalo thật |
| D-05 | 5.9, 2.3 | Không đạt | Khách mở link, nhập tên, vuốt qua 6 thẻ: Bó hồng B01, Mẫu nhập 6, 5, 3, 2 và Mẫu nhập 10 — Mẫu nhập 10 đang Tạm ngưng (PAUSED) VẪN hiện cho khách kèm giá 600.000đ (ảnh D-05-mau-6); màn chào ghi "6 mẫu đang chờ bạn". Bộ kiểm khả dụng khi đặt có chặn mẫu tạm ngưng. Lọc màu/khoảng giá và thả tim: kiểm bổ sung. Thả tim 2 mẫu: ghi nhận đúng (tổng 2 tim ở báo cáo tim của bộ sưu tập). Lọc theo màu và khoảng giá: màn xem mẫu trên điện thoại KHÔNG có điều khiển lọc (chỉ có Mẫu trước/Mẫu sau, Thả tim, Xem chi tiết, Đặt mẫu này) |
| D-06 | 5.6 | Đạt | Ngay sau khi khách mở link, bảng theo dõi (kanban) của Sale 1 có dòng Chị Lan ở bước STEP_1_OPENED (Đã mở), tên Sale Một |
| D-07 | 5.11 | Đạt | Khách Chị Hoa gửi "Mẫu này có màu tím không ạ?" cho Mẫu nhập 6 → 201; cửa hàng nhận khách tiềm năng có nội dung "Mẫu: Mẫu nhập 6 (NT-105) — Khách: Chị Hoa · 0909222333 — câu hỏi" |
| D-08 | 2.8 | Đạt | Mẫu B01, chọn ngày giao 2026-11-12 (đã khoá ở B-12) → báo "Mẫu này không nhận đơn giao ngày đã chọn — vui lòng chọn ngày khác hoặc mẫu khác" |
| D-09 | 3.13, 3.2, 3.5, 3.6, 1.8 | Không đạt | Mẫu nhập 6 (400.000đ, gắn kiểu dáng có phí chế tác), ngày lễ 13/11 (phụ phí 50.000, tối đa 2 đơn), ưu đãi Giảm 10%. Bảng xem lại: Tạm tính 400.000, Ưu đãi −40.000, Tổng 360.000, Cọc 30% 108.000, Còn lại 252.000. THIẾU: phí giao khu vực (form không có chọn khu vực Nội/Ngoại thành, ghi "Cửa hàng báo sau"), phụ phí ngày lễ, phí chế tác ngày lễ; mã giảm giá lô C-09 nhập vào ô Mã ưu đãi không thấy được áp |
| D-10 | 5.10, 4.2, 4.23 | Đạt | Điền người đặt, người nhận, địa chỉ, lời thiệp, đồng ý 7 thỏa thuận → Xác nhận đặt hoa: đặt thành công, mã đơn DH261111-J933NYSG; hiện VietQR (img.vietqr.io) đúng ngân hàng 970436, STK, số tiền 108.000đ = cọc 30%, nội dung chuyển khoản = mã đơn |
| D-11 | 4.2, 5.2 | Đạt | Đơn DH261111-J933NYSG (360.000đ, nguồn BROCHURE_QUOTE) hiện trong Thẻ chào → Theo dõi đơn của Sale 1 và của Điều hành; phiên gửi gắn Sale 1 (sale1.a), trạng thái ORDER_SUBMITTED |
| D-12 | 4.21 | Không đạt | Ngày lễ 13/11 khai tối đa 2 đơn. Ba khách khác nhau đặt cùng ngày: đơn 1 DH261111-J933NYSG, đơn 2 DH261111-MSWQYFJ1, đơn 3 DH261111-7SJ8X4DH (và một lượt chạy lại tạo DH261111-PW0JEGTX) — tất cả được nhận; trang đặt vẫn báo "Sản phẩm khả dụng" cho ngày lễ đã đủ đơn |
| D-13 | 5.5 | Đạt một phần (chờ môi trường thật) | Tắt Giá tiền; khách mở link mới: không thấy số tiền, hiện "Liên hệ báo giá". Đặt được và đơn ở "Chờ báo giá": chưa kiểm |
| D-14 | 5.3 | Đạt | Thu hồi link của Chị Ngọc → 200; khách mở lại: "Tiệm hoa A Nghiệm Thu / Mã QR / Zalo / Bộ sưu tập này không còn mở / Link có thể đã hết hạn hoặc cửa hàng đã cập nhật mẫu mới. Liên hệ Tiệm hoa A Nghiệm Thu để " |
| D-15 | 5.3 | Đạt | Đặt thời hạn link 1 giờ → link mới có hạn đúng 1 giờ sau khi tạo; lùi hạn về quá khứ (đồng hồ thử) → khách mở: "Tiệm hoa A Nghiệm Thu / Mã QR / Zalo / Link đã hết hạn / Link xem bộ sưu tập này đã hết thời gian sử dụng. Vui lòng liên hệ Tiệm hoa A Nghiệm Thu để n" |
| D-16 | 5.8 | Đạt | Đặt Sale 1 chỉ xem khách của mình 200; người khác (Điều hành) gửi link cho "Khách của Điều hành" 201; Sale 1 thấy khách đó: false, vẫn thấy khách mình (Chị Lan): true; Điều hành thấy tất cả: true |
| D-17 | 5.7 | Chưa chạy |  |
| E-01 | 4.24 | Đạt một phần (chờ môi trường thật) | Khách tải ảnh biên lai (payment-proof 200) và bấm Tôi đã chuyển khoản → trang khách "Đã báo chuyển khoản thành công"; danh sách đơn khách báo đã chuyển của Điều hành có DH261111-J933NYSG: true. AI gợi ý số tiền từ ảnh biên lai: cần khoá AI thật. Lưu ý: trang khách ghi "hệ thống tự động duyệt sau 15' khi có ảnh bill" dù cài đặt tự duyệt mặc định TẮT |
| E-02 | 1.16, 4.25 | Đạt | Sale 1 xác nhận tiền về → 403 Thiếu năng lực R11; đường xác nhận cọc (confirm-deposit, mã R4) → 403 Thiếu năng lực R4 |
| E-03 | 4.25 | Đạt | Điều hành chọn Chưa nhận được tiền, lý do "Chưa thấy tiền về tài khoản" → 200; trang khách quay lại chờ chuyển khoản, hiện lại mã QR: true; lịch sử đơn có sự việc: true |
| E-04 | 4.25, 4.31 | Đạt một phần (chờ môi trường thật) | Khách báo chuyển lại (payment-proof 200,payment-notify 200); Điều hành xác nhận đã nhận 108.000đ → 200; đơn: đã thu 108000, trạng thái CONFIRMED/WAITING; trang khách: "Tiếp nhận". Tin ZNS/SMS cho khách: cần nhà cung cấp thật |
| E-05 | 4.13 | Đạt | Điều phối phân công Thợ chế tác cho đơn tay → 200 ; trang Việc của tôi của thợ có đơn: true |
| E-06 | 4.13, 4.4 | Đạt | Việc của thợ (API của trang Việc của tôi): có đơn, có trường giá: false; Nhận việc 200 → ARRANGING; Báo xong 200 → READY |
| E-07 | 4.9 | Không đạt | Trang /in-phieu của đơn Thẻ Chào DH261111-J933NYSG và đơn tay DH261111-0007: có mã đơn, giờ giao, người nhận, tên mẫu × số lượng, lời thiệp, nút Xem băng rôn. THIẾU: ảnh mẫu, phiên bản, số cành, công thức có ô đánh dấu. Phiếu xưởng in cả ghi chú đối soát tiền ("Điều hành: chưa nhận được tiền — Chưa thấy tiền về tài khoản") |
| E-08 | 4.15, 4.16 | Chờ thử thật | Nhận đơn 409, giao thợ 200, tải ảnh thành phẩm 200; điểm tin cậy và kết luận gợi ý của AI so với mẫu gốc cần khoá AI thật |
| E-09 | 3.7, 9.11, 9.12 | Đạt | Sale xin giảm 20% (trần 15%) → 400 Dữ liệu gửi lên không hợp lệ; xin 10% → 201; Sale tự duyệt → 403 Thiếu năng lực F2; Điều hành duyệt → 200 ; tổng đơn 360000 → 324000 |
| E-10 | 5.13 | Không đạt (đạt một phần) | Sau khi cửa hàng tải ảnh thành phẩm, trang theo dõi của khách hiện ảnh và nút "Xác nhận ảnh và tiếp tục thanh toán"; bấm → approve-photo 200 "Đã xác nhận hình ảnh sản phẩm thành công", chuyển sang thanh toán phần còn lại 252.000đ. KHÔNG có nút góp ý trên trang khách. Hết 10 phút tự coi là đồng ý: chưa kiểm (cần đồng hồ thử) |
| E-11 | 5.14 | Không đạt | Đơn Thẻ Chào DH261111-ASM3413B của mẫu có công thức 3 dòng: danh sách thành phần để đề xuất thay luôn rỗng (lines: []) — mã đọc metadata.flowers[].flowerName của dòng đơn, nhưng ảnh chụp mẫu lúc khách chọn chỉ có flowersSummary, còn form sản phẩm lưu công thức dạng bom.flowers[].name. Mọi đề xuất (chủ đạo, phụ, đề xuất thứ 2) đều trả 400 |
| E-12 | 5.14 | Không đạt | Không tạo được đề xuất ở E-11 nên trang theo dõi của khách không có yêu cầu để đồng ý |
| E-13 | 4.14 | Chưa chạy |  |
| E-14 | 4.6 | Không đạt | Sale 1 đổi giờ giao → 403 (thiếu quyền Sửa đơn R3, vai Sale mặc định không có). Thử bằng Điều phối → 200; lịch sử giữ giá trị cũ/mới: chưa thấy trong chi tiết đơn |
| F-01 | 4.17, 4.5 | Chưa chạy |  |
| F-02 | 4.5 | Chưa chạy |  |
| F-03 | 4.18 | Chưa chạy |  |
| F-04 | 4.18, 4.29, 5.12 | Chưa chạy |  |
| F-05 | 4.17 | Chưa chạy |  |
| F-06 | 4.32 | Chưa chạy |  |
| F-07 | 4.30 | Chưa chạy |  |
| F-08 | 4.29, 5.12 | Chưa chạy |  |
| F-09 | 4.26 | Chưa chạy |  |
| F-10 | 4.26, 9.11 | Chưa chạy |  |
| F-11 | 5.15 | Chưa chạy |  |
| F-12 | 4.31 | Chưa chạy |  |
| G-01 | 4.1 | Đạt một phần (chờ môi trường thật) | Đơn tay bỏ trống phường → 201 ; đủ 4 cấp địa chỉ → 201  |
| G-02 | 4.3 | Chưa chạy |  |
| G-03 | 4.4, 4.8, 6.7 | Chưa chạy |  |
| G-04 | 4.7, 1.16 | Chưa chạy |  |
| G-05 | 4.7, 4.27 | Chưa chạy |  |
| G-06 | 4.10, 6.8 | Chưa chạy |  |
| G-07 | 4.11 | Chưa chạy |  |
| G-08 | 4.12 | Chưa chạy |  |
| G-09 | 4.19 | Chưa chạy |  |
| G-10 | 4.20 | Chưa chạy |  |
| G-11 | 4.28 | Chưa chạy |  |
| H-01 | 6.1 | Chưa chạy |  |
| H-02 | 6.2 | Chưa chạy |  |
| H-03 | 6.3 | Chưa chạy |  |
| H-04 | 6.4 | Chưa chạy |  |
| H-05 | 6.5 | Chưa chạy |  |
| H-06 | 6.6 | Chưa chạy |  |
| H-07 | 6.9, 10.1 | Chưa chạy |  |
| I-01 | 9.1 | Chưa chạy |  |
| I-02 | 9.4 | Chưa chạy |  |
| I-03 | 9.5 | Chưa chạy |  |
| I-04 | 9.6 | Chưa chạy |  |
| I-05 | 9.7, 10.3, 10.5 | Chưa chạy |  |
| I-06 | 9.7 | Chưa chạy |  |
| I-07 | 9.13 | Chưa chạy |  |
| I-08 | 1.6 | Chưa chạy |  |
| I-09 | 9.14 | Chưa chạy |  |
| I-10 | 8.1 | Chưa chạy |  |
| J-01 | 9.9 | Đạt | Đăng ký trả 202 "Đăng ký đã được ghi nhận và đang chờ quản trị viên duyệt. Bạn sẽ đăng nhập được ngay sau khi được duyệt."; đăng nhập trước duyệt trả 403 (ACCOUNT_PENDING) |
| J-02 | 9.9 | Đạt | Màn Console liệt kê đăng ký (có hồ sơ); duyệt 200; đăng nhập sau duyệt 200 |
| J-03 | 9.10, 10.7 | Đạt | Tạo A (gói Starter tháng 299.000đ, 50 credit tặng) 201; B, C 201. Mật khẩu tạm trả 1 lần, không có lại ở danh sách tổ chức; nhật ký nền tảng (200) không chứa mật khẩu. Thuê bao: {"subscription":{"id":"c90d2644-5cc8-4989-ae76-57e899566d54","organization_id":"61c4e3d9-14b6-418d-98ae-9920f60f246e","plan":"STARTER","cycle":"MONTHLY","price_ |
| J-04 | 9.8 | Đạt | Tổng quan: 5 tổ chức (1 đang có thuê bao hoạt động, 4 chưa có gói, 0 quá hạn) khớp dữ liệu thử; doanh thu thuê bao 6 tháng, tháng 11 = 299.000đ khớp hoá đơn vừa thu; sức khoẻ: worker vision và media đang kết nối |
| J-05 | 10.6, 10.3 | Đạt | Nạp 100 (200), Tặng 20 (200), Hoàn 5 (200), hạn mức tháng 200 (200). Số dư trước 0 → sau 125; 3 dòng sổ |
| J-06 | 10.3 | Đạt | Lưu quy đổi 200; đọc lại: {"smsCredit":1,"znsCredit":1,"usdToVnd":25000,"creditValueVnd":1000,"smsCostVnd":0,"znsCostVnd":0,"defaultMonthlyLimit":null,"messageOverdraftCredit":10,"brandExtraOptionCredit":1} |
| J-07 | 10.3, 10.5 | Chưa chạy |  |
| J-08 | 10.2 | Không đạt (đạt một phần) | Tác vụ AI hỏng (thiếu khoá) trừ 1 credit; KHÔNG tự hoàn — chỉ hoàn khi chạy tay npm run hoan-credit (REFUND +1, diện loi-ky-thuat, số dư về 175). render.yaml của bản giao không có lịch chạy tiến trình hoàn credit |
| J-09 | 10.4 | Chưa chạy |  |
| J-10 | 10.7 | Đạt | Console khai tài khoản nhận tiền thuê bao (200); hoá đơn kỳ đầu TBQYB2L55H 299.000đ PENDING → xác nhận đã thu → PAID; phía cửa hàng (Sổ quỹ & thu chi) thấy gói Starter tháng, trạng thái ACTIVE, hoá đơn PAID |
| J-11 | 10.7 | Chưa chạy |  |
| J-12 | 10.8 | Chưa chạy |  |
| J-13 | 10.8 | Chưa chạy |  |
| J-14 | 10.8 | Chưa chạy |  |
| S-01 | 1.1, 1.19 | Chưa chạy |  |
| S-02 | 1.1, 1.19, 1.18 | Chưa chạy |  |
| S-03 | 1.14, 1.15 | Không đạt | Sale mở thẳng /cai-dat, /cai-dat/thanh-vien, /cai-dat/thanh-vien/vai-tro đều 200, thấy đủ danh sách nhân viên kèm email (ảnh S-03_cai-dat_thanh-vien). Thao tác ghi bị chặn đúng: PUT hồ sơ 403, đọc cấu hình trường 403. Ghi nhật ký: kiểm ở S-10 |
| S-04 | 1.16 | Chưa chạy |  |
| S-05 | 1.13, 1.16 | Đạt | Điều hành gửi một lệnh bật quyền cho vai Trưởng ca gồm Xem đơn (R1) + Xác nhận tiền chuyển khoản (R11, trần cứng Điều hành) → 403; quyền của vai sau lệnh vẫn là C1, R1, R3 — không ghi thay đổi nào |
| S-06 | 1.16 | Chưa chạy |  |
| S-07 | 9.12 | Chưa chạy |  |
| S-08 | 9.13, 1.19 | Chưa chạy |  |
| S-09 | 1.4 | Chưa chạy |  |
| S-10 | 1.15, 1.17 | Chưa chạy |  |
| S-11 | 1.18 | Đạt một phần (chờ môi trường thật) | 265/266 tệp xanh. Tệp đỏ retry-recharge-credit: CSDL thử dựng bằng prisma migrate deploy có trigger chỉ-thêm của bảng usage (ADR-013), bước chuẩn bị của test sửa thẳng dòng usage; CI dựng bằng db push nên đạt. Cùng mốc trên CI "Bản giao GD1" xanh toàn bộ |

## 7. Việc tiếp theo

1. Sửa lỗi 1–4 rồi dựng lại từ môi trường trắng chỉ theo README.
2. Sửa lỗi 6–18, chạy lại các bước Không đạt.
3. Chạy 57 bước chưa chạy, ưu tiên Luồng F (giao hàng), G (đơn nguồn khác, chuỗi, SePay), H (báo cáo), S (cách ly và quyền).
4. Dựng staging có khoá thật để chạy các bước AI, Zalo ZNS/SMS, SePay, Telegram, tên miền riêng.
