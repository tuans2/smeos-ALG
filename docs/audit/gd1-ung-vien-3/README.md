# Ứng viên 3 của bản giao GD1 — cắt, dựng từ môi trường trắng và chạy kịch bản nghiệm thu — 12/11/2026

Thực hiện Bước 5–6 của [kế hoạch bàn giao](../../plan/BANGIAO_GD1_123_CHUC_NANG.md) trên mốc `67c9ebed` (`main` sau PR #61), nối tiếp [lượt trên ứng viên 2](../gd1-buoc6/README.md). Kết quả từng bước: [checklist đã điền](ket-qua-nghiem-thu-ung-vien-3-2026-11-12.xlsx); ảnh: [`anh/`](anh/).

## 1. Kết luận

- Bản cắt tại `67c9ebed` **dựng được và qua mọi cổng tự động** từ thư mục trắng, sau khi sửa một lỗi chặn cài đặt (mục 4, lỗi 1).
- **Chưa gắn tag**: lỗi 1 được sửa trên nhánh `claude/laughing-edison-dl8062`, nên ứng viên 3 phải lấy từ mốc `main` có commit đó.
- Kịch bản nghiệm thu: **64/141 bước đã chạy** — 44 Đạt, 18 Đạt một phần, 1 Không đạt (J-09), 1 chưa kết luận (F-11). 77 bước còn lại xem mục 6.
- 14 bước Không đạt của ứng viên 2: 12 nay Đạt, E-07 Đạt một phần, J-08 chưa chạy lại.

## 2. Môi trường

| Hạng mục | Thực tế |
|---|---|
| Mã | `npm run release:cut -- gd1 HEAD <thư mục>` tại `67c9ebed`, biến môi trường như workflow `release-gd1.yml` |
| Bản cắt | 5.408 tệp, 90 trang, 491 API; bỏ 112 test, trong đó 56 dòng `[xem lại]` |
| Hạ tầng | Postgres 16 cổng 5433 (tài khoản và CSDL `alg` như `docker-compose.yml`; máy chạy không có Docker), Redis, Node 22, Python 3.13 |
| Cấu hình | `.env` chép từ `.env.example` + 3 khoá bí mật; riêng bản chạy kịch bản thêm `ALLOW_LOCAL_STORAGE=true`, `CRON_SECRET`, `PII_ENCRYPTION_KEY`, `REDIS_URL` |
| Không có | Khoá AI, Zalo ZNS/SMS, SePay, Telegram, SMTP, tên miền thật; worker không chạy trong lượt kịch bản |
| Cách chạy | Gọi đúng API mà giao diện gọi, mỗi vai một phiên; Playwright (1366 px và iPhone 13) cho bước giao diện |

## 3. Cổng kiểm trên bản cắt dựng sạch

| Cổng | Kết quả |
|---|---|
| Kiểm rò rỉ (`handover-check`, baseline) | Sạch, 5.408 tệp, 349 mục baseline; công cụ báo 4 mục baseline đã giảm, nên hạ |
| `npm run release:routes -- --check` | Xanh |
| `db:deploy`, `db:seed`, `seed:field-registry` + `check:field-registry` | Xanh |
| `npm run typecheck` | Xanh |
| `npm run lint:ratchet` | Xanh (53 lỗi cũ) |
| `npm run lint:ux -- --check` | Xanh |
| `check:docs`, `check:template-ssot`, `check:industry` | Xanh |
| `npm test` | 763/763 tệp, 4.532 test đạt, 2 bỏ qua |
| `npm run test:platform` | 20/20 tệp, 63 test |
| `npm run test:tenant` | 294/294 tệp, 1.234 test (CSDL thử dựng bằng `prisma db push` như CI) |
| `npm run build` | Xanh |
| `pytest` worker | Xanh |
| Quét 73 trang tĩnh trong phạm vi bằng tài khoản Điều hành | 1 trang 404: `/chinh-sach-bao-mat` khi chưa bật `NEXT_PUBLIC_PRIVACY_NOTICE_ENABLED` (đã biết); không còn tên thương hiệu cũ trên màn hình |
| Gitleaks trên bản cắt | Không chạy được tại máy (không tải được công cụ); workflow `release-gd1` quét trên PR |
| E2E `tests/e2e/ux` trên bản cắt | Chưa chạy trong lượt này |

## 4. Lỗi và điểm cần quyết định

| # | Mức | Nội dung | Vị trí | Trạng thái |
|---|---|---|---|---|
| 1 | Chặn cài đặt | `.env.example` của bản giao trỏ `postgresql://smeos:smeos@…/smeos` trong khi `docker-compose.yml` tạo tài khoản và CSDL `alg`: `npm run db:deploy` theo README bị từ chối đăng nhập | `releases/gd1/overlay/.env.example` | Đã sửa, có test (`src/lib/env-example.test.ts`) |
| 2 | Tài liệu | README bản giao lặp hai đoạn "người vận hành đầu tiên" | `releases/gd1/overlay/README.md` | Đã sửa |
| 3 | Cần xem | Biên lợi nhuận tháng trả 0 dòng dù cửa hàng A đã thu hoá đơn thuê bao 299.000đ (J-09). Lượt chạy chưa có tác vụ AI/tin nhắn | `GET /api/v1/platform/margin` | Chưa sửa |
| 4 | Cần xem | Đơn tay được Điều hành duyệt "giao trước, thu sau" hoặc được xác nhận khoản thu tiền mặt qua màn Điều phối vẫn ở trạng thái Nháp; lịch sử ghi `DRAFT → DRAFT`. Thông báo của hệ thống lại nói đơn tự xác nhận khi được duyệt giao trước | `src/modules/orders/infra/coordination-handoff.ts` | Chưa sửa |
| 5 | Cần xem | Đơn chỉ vào "Đơn cần giao" của Shipper khi đi hết luồng Điều phối và đã gán đối tác/xưởng; giao thợ nội bộ (`/orders/:id/assign`) không đủ để sang bước chế tác. Đơn Thẻ Chào không vào danh sách của Shipper (mục chưa kết luận của ứng viên 2) | `src/modules/coordinator/domain/stage-transitions.ts`, `use-cases/shipper-runs.ts` | Cần PO xác nhận đúng thiết kế hay không |
| 6 | Cần xem | Báo cáo hiệu suất gán đơn khách tự đặt qua link cho "Thành viên đã rời" | `GET /api/v1/reports/performance` | Chưa sửa |
| 7 | Cần xem | API tạo đơn tay nhận địa chỉ thiếu phường (G-01); thông báo lỗi trên form chưa kiểm | `POST /api/v1/orders` | Chưa sửa |
| 8 | Cần xem | Màn tên miền riêng chỉ đưa bản ghi TXT; kịch bản J-12 nêu TXT và CNAME | `POST /api/v1/custom-domains` | Cần đối chiếu kịch bản |
| 9 | Ghi nhận | Vai Sale vẫn thấy nhóm "Quản trị tiệm" với 6 mục Ma trận (chỉ xem, lưu bị 403) và mở được `/ho-so` (lưu bị 403) | menu theo mã `F1` | Cần PO quyết |
| 10 | Ghi nhận | Cửa hàng tạo từ Console kèm gói chưa thu kỳ đầu ở chế độ chỉ xem ngay (402) cho tới khi Console xác nhận thu | `subscription-guard.ts` | Đúng mã hiện tại; nên ghi vào hướng dẫn |
| 11 | Tên cũ | Checklist nghiệm thu giao cho ALG còn chữ "smeOS" (tiêu đề, bước I-09); `render.yaml` và CI của lớp phủ đặt tên dịch vụ `smeos-*`; mã liên kết Telegram `SMEOS-…`, `sdk/smeos-chat.js`, nguồn UTM mặc định `smeos`, `@cuahang_smeos`; loại khoá API `SOCIALFLOW`/`LOCALBUDD` | nhiều tệp | Chưa sửa (ngoài phạm vi lượt này) |

## 5. Bước Không đạt của ứng viên 2 — kết quả chạy lại

| Bước | Kết quả | Ghi chú |
|---|---|---|
| A-02 | Đạt | Thiết bị 1 về `/dang-nhap?ly-do=thiet-bi-khac`, có câu báo đăng nhập ở thiết bị khác |
| A-08, S-03 | Đạt | Sale không còn Hồ sơ cửa hàng, Cài đặt tiệm, Đội ngũ; mở thẳng bị chặn; không lộ email; nhật ký ghi lượt bị chặn |
| A-14 | Đạt | Cửa hàng tạo từ Console có 7 dịp mặc định |
| A-15 | Đạt | Tab Nhận thanh toán hiện mã VietQR mẫu |
| B-01 | Đạt | Vai Quản lý sản phẩm có G2, H1, H5; mặc định Bản nháp; form không còn nguyên liệu mẫu |
| C-03 | Đạt | Sale lập báo giá dưới sàn → 422, cần Điều hành duyệt |
| D-05 | Đạt | Mẫu Tạm ngưng không hiện trên link khách |
| E-07 | Đạt một phần | Có công thức kèm ô đánh dấu, không còn dòng về tiền; ảnh mẫu và phiên bản chưa kiểm (mẫu thử không có) |
| E-10 | Đạt | Khách gửi góp ý ảnh thành phẩm, cửa hàng gửi ảnh mới, khách xác nhận |
| E-11, E-12 | Đạt | Danh sách thành phần có dữ liệu; khách đồng ý đề xuất thay hoa |
| E-14 | Đạt | Sale đổi giờ giao đơn mình tạo kèm lý do; lịch sử giữ giá trị cũ → mới |
| J-08 | Chưa chạy | Cần worker và một tác vụ AI lỗi |

Trang khách chờ chuyển khoản không còn câu "tự động duyệt" và không còn ô mã ưu đãi khi cửa hàng chưa bật (lỗi 12, 14 của ứng viên 2).

## 6. Bước chưa chạy trong lượt này (77)

- **Đã Đạt ở ứng viên 2, chưa chạy lại:** phần lớn luồng A, B, C, D, E và J-01–J-03 — cần chạy lại trên ứng viên cuối.
- **Chờ môi trường thật:** B-05, B-06, B-13, B-14, E-08, F-07, F-12, G-11, I-04, I-05, I-10, J-07, J-08, J-13 (khoá AI, Zalo ZNS/SMS, SePay, Telegram, tên miền thật).
- **Chưa làm:** B-11, D-17, E-13, G-08, G-09, G-10, I-09.

## 7. Việc tiếp theo

1. Đưa commit sửa lỗi 1–2 vào `main`, gắn tag ứng viên 3 trên mốc đó, chạy workflow "Bản giao GD1" bằng tay (đủ cách ly tổ chức, E2E, gitleaks).
2. PO quyết các mục 3–11 ở bảng lỗi.
3. Chạy các bước còn lại ở mục 6; dựng staging có khoá thật cho nhóm chờ môi trường.
4. Duyệt 56 dòng `[xem lại]` trong báo cáo cắt (`docs/plan/HUONG_DAN_DIEM_DUYET_BUOC5.md`).
