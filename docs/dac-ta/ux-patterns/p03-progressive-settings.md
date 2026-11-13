# Pattern UX-P03 — Progressive Settings

## Mục tiêu
Giữ màn chính gọn, vẫn cho người cần tinh chỉnh tìm được thiết lập nâng cao.

## Quy tắc
- Nhóm cơ bản (L0–L2) hiển thị; nhóm nâng cao (L3–L4) trong `Disclosure`, đóng mặc định.
- Nhãn nói rõ bên trong có gì ("Tùy chỉnh phong cách và tỷ lệ"), không dùng "Khác".
- Đóng/mở không mất giá trị đã nhập; khi đóng mà có giá trị khác mặc định → hiện tóm tắt ("Đã tùy chỉnh 2 mục").
- Thiết lập làm đổi chi phí, thời gian hoặc đầu ra đáng kể phải báo ngay cạnh trường.
- Không giấu thông tin thuộc UX-017.

## Verification
- Mở/đóng bằng bàn phím, `aria-expanded` đúng.
- Giữ giá trị sau đóng/mở và sau lỗi gửi.
- Mobile 390px không tràn ngang.
