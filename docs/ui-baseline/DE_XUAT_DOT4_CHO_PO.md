# Đề xuất Đợt 4 — chờ phê duyệt (CHƯA THỰC HIỆN)

Ngày 12/11/2026, nhánh `claude/fervent-pascal-ilhcgb`. Căn cứ: `KE_HOACH_NANG_CAP_UI.md` mục Đợt 4, `BANG_LECH_CHUAN_DESIGN_SYSTEM.md`, các phát hiện ghi trong `BAO_CAO_*` và `luong-upload-anh/README.md`.
Mỗi mục: một commit có test, chụp lại màn ảnh hưởng ở 390 và 1280px. Cỡ: S (nhỏ) / M / L — ước lượng tương đối, không phải số ngày.

## A. Soát sâu (Đợt 4 theo kế hoạch gốc)

| Mã | Việc | Cách làm | Cỡ | UX khoá / cần PO | Duyệt |
|---|---|---|---|---|---|
| D4-01 | Soát ảnh từng màn chính theo mã IA/VH/ID/PD/CU/ST (`visual-review.md` §1): Thẻ chào, Đơn hàng, Sản phẩm, Cài đặt, trang khách | Đọc ảnh kho mới (sau ALG), lập bảng lỗi theo mã, sửa lỗi không khoá | L | Lỗi chạm UX khoá sẽ tách ra hỏi lại | ☐ |
| D4-02 | Kiểm bàn phím: thứ tự Tab, viền focus, Esc đóng hộp thoại, bẫy focus | Script Playwright đi Tab qua 12 màn đại diện, ghi lỗi; sửa ở component dùng chung | M | Không | ☐ |
| D4-03 | Zoom 200% và khổ 320px (WCAG 1.4.10 reflow) | Chụp 12 màn ở 320px và 1280px×zoom 200%, đo cuộn ngang và chữ bị cắt | M | Không | ☐ |
| D4-04 | Cây truy cập (thay cho trình đọc màn hình thật) | Chụp cây accessibility của Playwright cho 12 màn; soát tên, vai, thứ tự tiêu đề. **Không có NVDA/VoiceOver trong máy chủ** — kiểm bằng người thật cần làm riêng | M | Không | ☐ |
| D4-05 | Các preset còn lại sau khi ALG thành mặc định | Chụp 6 màn với Mộc Lan / Modern Slate / Pure Swiss, chạy axe tương phản | S | Không | ☐ |
| D4-06 | Đối chiếu Screen Contract và archetype (107 hợp đồng) với màn thật sau các đợt | Cập nhật hợp đồng của màn đã đổi bố cục trong cùng commit | M | Không | ☐ |

## B. Lệch chuẩn còn tồn

| Mã | Việc | Hiện trạng | Cỡ | UX khoá / cần PO | Duyệt |
|---|---|---|---|---|---|
| D4-07 | Vùng bấm nhỏ (DS-10): nút chữ cao 15–20px ở Tri thức (8), Công cụ (5), Vận hành (4) | Phân loại liên kết trong dòng chữ (được miễn) và nút độc lập; nâng nút độc lập lên ≥ 24px (44px cảm ứng) | M | Không | ☐ |
| D4-08 | Thanh trượt: 11 `<input type="range">` (lint R18) | **Cần chọn:** A. tạo `Slider` chuẩn bọc `@base-ui/react` (đã có sẵn, không thêm phụ thuộc) — thêm component mới; B. giữ, miễn trừ R18 có lý do | M | **Có** — component mới cần PO | ☐ A ☐ B |
| D4-09 | 4 thẻ tương tác tự dựng (`role="button"`/`radio`): Bộ máy, trung tâm mạng hoa, lịch đăng, trình phát video | Có phần tử tương tác lồng bên trong; phải thiết kế lại cấu trúc (thẻ + nút hành động riêng) | M | **Có** — đổi cách tương tác | ☐ |
| D4-10 | Nhãn truy cập không chứa chữ nhìn thấy: "Menu tài khoản" (hiện chữ viết tắt tên), "Xem bảng thông số…" trên thẻ sản phẩm | Đưa chữ nhìn thấy vào nhãn | S | "Menu tài khoản" thuộc shell | ☐ |
| D4-11 | Mã bước "(T01)…(T06)" hiện trong tiêu đề bước điều phối | Nằm trong hợp đồng sinh JSON schema; đổi tiêu đề + sinh lại schema | S | Không | ☐ |

## C. Lỗi phát hiện trong quá trình làm (ngoài phạm vi trước đây)

| Mã | Việc | Nơi | Cỡ | Cần PO | Duyệt |
|---|---|---|---|---|---|
| D4-12 | Trang theo dõi của khách ở 390px: hai khung giờ trên thanh tiến độ đè chữ; bong bóng chat che tên ngân hàng | `/b/<mã>` | S | Không | ☐ |
| D4-13 | Nút tròn không có chữ/icon hiển thị ở đầu Thẻ chào (giữa "Hướng dẫn" và "Gửi nhanh", có huy hiệu số) | `/the-chao` | S | Đầu trang Thẻ chào là UX khoá K2 | ☐ |
| D4-14 | Khối "Thẩm định AI" ở hộp phê duyệt biên lai không thoát trạng thái "Đang đọc dữ liệu biên lai…" khi AI lỗi | Điều hành → phê duyệt thanh toán | S | Không | ☐ |
| D4-15 | Trang Dữ liệu nền tảng hiện số bản ghi âm ("-1", "-32 bản ghi") | `/van-hanh/du-lieu` | S | Không | ☐ |
| D4-16 | Lỗi 500 khi khoá giải mã dữ liệu cá nhân chưa nạp vào bộ nhớ (sau khởi động lại server) | API đơn hàng | M | **Có** — tầng bảo mật dữ liệu | ☐ |
| D4-17 | Hợp đồng `coordinator` lệch mã từ trước (`assemblySteps`), `check:schemas:coordinator` đỏ trên HEAD | `docs/dac-ta/schemas/coordinator` | S | Không | ☐ |
| D4-18 | Màu nhóm của ô biểu tượng (`--color-tone-*`) và màu biểu đồ (`--color-chart-*`) vẫn bảng màu cũ (tím, cam, xanh dương) | Toàn hệ thống | M | **Có** — chọn bảng màu nhóm/biểu đồ từ brand kit ALG (đề xuất: dựng từ 5 màu phụ, kiểm tương phản icon trắng ≥ 3:1) | ☐ |

## D. Cổng kiểm còn nợ (làm kèm, không cần duyệt nội dung)

- Sinh lại ảnh chuẩn e2e (`test:e2e:ux`) sau đổi màu ALG — phải sinh trên CI (khác phông chữ máy).
- Chạy `test:e2e:ux`, CI trên GitHub với tên DB mới, test worker Python (cần cài `requirements` đầy đủ).

## Cách trả lời
Đánh dấu ☐ các mục đồng ý (D4-08 chọn A hoặc B), hoặc trả lời "duyệt tất cả theo khuyến nghị". Khuyến nghị: duyệt A, B (D4-08 chọn A), C trừ D4-16 tách thành việc riêng của tầng bảo mật.
