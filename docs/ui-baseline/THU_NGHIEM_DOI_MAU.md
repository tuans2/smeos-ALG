# Thử nghiệm phương án B: đổi lớp màu không có token sang token sẵn có (BẢN NHÁP)

Dành cho PO quyết câu 3 trong `CAU_HOI_CHO_PO.md`. Làm trên **nhánh cục bộ tạm**, không đẩy lên remote, đã huỷ sau khi lấy kết quả. Nhánh `claude/fervent-pascal-ilhcgb` không bị đổi. Bản vá đầy đủ (3.441 dòng) giữ ngoài repo; áp lại được bằng cách chạy lại ánh xạ dưới đây.

## 1. Ánh xạ đã áp dụng (chỉ tiền tố `bg-` và `text-`, giữ biến thể `hover:`/`/độ-trong-suốt`)

| Tên không có token | → Token sẵn có | Giá trị | Số chỗ đổi |
|---|---|---|---:|
| `surface-muted` | `surface-alt` | #F5ECE4 | 240 |
| `primary-subtle`, `primary-bg` | `primary-muted` | #F5E6EA | 47 |
| `surface-raised`, `surface-elevated` | `surface` | #FFFFFF | 25 |
| `primary-hover` | `primary-dark` | #57202F | 7 |
| `warning-subtle` / `success-subtle` / `danger-subtle` | `warning-bg` / `success-bg` / `danger-bg` | nền nhạt | 10 |
| `danger-dark` / `success-dark` | `danger-text` / `success-text` | chữ đậm | 8 |
| `surface-subtle` | `surface-alt` | #F5ECE4 | 1 |

Tổng 338 chỗ trong 171 tệp, số dòng mã không đổi. **Không đổi** `surface-dark`, `secondary-foreground`, `secondary-bg` (chưa rõ ý định, cần chủ module).

## 2. Kết quả kỹ thuật

- `typecheck` đạt; `npm test` 787/788 tệp (2 test `public-url` đỏ do `.env` local như trước); `lint:ux`: 366 → **31** vi phạm (338 R24 biến mất, còn 3 chỗ chưa ánh xạ).
- Axe trên 5 màn thử (Kết nối nội bộ, Đơn hàng, Thẻ chào, Kênh tích hợp, Số liệu; 2 khổ): **0 → 0** lỗi mới ngoài lỗi shell. Mới đo 5 màn; chưa đo 130 tệp còn lại.

## 3. Kết quả hình ảnh (26 cặp ảnh trước/sau: 5 màn + 7 tab Thẻ chào + hộp Tạo đơn, 1440 và 390px)

Độ lệch điểm ảnh lớn nhất: Thẻ chào tab "Gửi nhanh" 22% (nhiễu: ảnh trước đang ở trạng thái "Đang tải danh sách sản phẩm…", sau đã tải xong), Kết nối nội bộ 12–17%, Thẻ chào tab "Theo dõi đơn" 17%, "Quản lý" và "Điều hành" 5%, Đơn hàng 2–3%, Số liệu <0,1%.

Đã xem trực tiếp 2 ảnh ghép:
- **Kết nối nội bộ:** các ô trước đây trong suốt nay có nền: thẻ mã kết nối nền hồng nhạt, thẻ ID/UUID nền be, ghi chú nền xanh nhạt. Tạo phân cấp rõ hơn, không có chữ khó đọc.
- **Thẻ chào "Gửi nhanh":** ô sản phẩm và khung chọn có nền be nhạt thay vì trong suốt; bố cục không đổi (chênh chiều cao do trạng thái đang tải, không do màu).

Các ảnh khác (Đơn hàng, Số liệu, các tab còn lại) **chưa được mở xem**; phần lệch nhỏ.

## 4. Đánh giá

- Về kỹ thuật phương án B an toàn: đổi tên lớp, không thêm token, không phải PO duyệt token, kiểm tra đều đạt.
- Về hình thức: làm **hiện ra nền ở hàng trăm chỗ vốn đang trong suốt**. Ở hai màn đã xem trông hợp lý và tăng phân cấp, nhưng đây là thay đổi diện mạo trên 171 tệp nên cần PO xem ảnh trước khi duyệt.
- Phạm vi chưa kiểm: các tab và hộp thoại trong Thẻ chào (nơi dùng nhiều nhất, 209 chỗ ở `components/greeting-card`) chỉ chụp 7 tab mặc định; nhiều trạng thái bên trong chưa chụp.

## 5. Đề xuất

Nếu PO chọn B: áp thành một đợt riêng theo thư mục (greeting-card trước), mỗi lô một commit, chụp lại các màn thuộc lô và chạy axe; sau khi xong cập nhật baseline lint về 31 và coi 3 chỗ còn lại là việc cần chủ module. Nếu chọn A hoặc C: nêu rõ để tôi chuẩn bị tương ứng.
