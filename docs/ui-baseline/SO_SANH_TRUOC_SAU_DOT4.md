# So sánh trước/sau Đợt 4

Ngày 12/11/2026, nhánh `claude/fervent-pascal-ilhcgb`. "Trước" = kho ảnh sau khi đổi ALG (`SO_SANH_TRUOC_SAU_ALG.md`); "sau" = kho chụp lại toàn bộ sau Đợt 4. Cùng bộ script, cùng tài khoản, server dev và DB local, khổ 1440 và 390. Ảnh ghép các màn đổi trong Đợt 4: `so-sanh-dot4/` (trái: trước, phải: sau).

## 1. Độ phủ kho ảnh

| | Trước (ALG) | Sau (Đợt 4) |
|---|---:|---:|
| Ảnh chụp được | 949 | 949 |
| Cặp so được | — | 949 |
| Ảnh thiếu / mới | — | 0 / 0 |
| Lỗi JavaScript ghi khi chụp | 1.287 | 1.267 |

28 cặp lệch chiều cao > 15%. Đã xem từng trường hợp lớn: tất cả do **dữ liệu** (nhật ký truy cập dài thêm sau các lượt đăng nhập của bộ chụp; link chờ khách hết hạn nên cột "Đang chờ khách" 2 → 0; số thẻ Bán hàng 35 → 39), không phải vỡ bố cục.

Trong lúc chụp, dev server bị hệ thống tắt do thiếu bộ nhớ (chạy cùng lúc với `test:tenant`). Các bước chụp sau thời điểm đó và bước chụp tab Điều hành (trùng lúc server biên dịch lại) đã chụp lại toàn bộ trên server đã nạp sẵn; không ảnh nào trong kho là khung xương đang tải.

## 2. Kiểm tự động (axe, cuộn ngang) — 109 màn × 2 khổ (390, 1280)

| Nhóm | Critical | Serious | Tương phản màu | Tràn ngang 390px |
|---|---|---|---|---|
| Điều hành (73 màn) | 0 → 0 | 104 → 27 → **0** | 6 → **0** | 1 → **0** |
| Console nền tảng (24) | 0 → 0 | 26 → **0** | 0 → 0 | 0 → 0 |
| Trang khách (12) | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |

27 lỗi serious còn lại sau lần đo đầu đều là `label-content-name-mismatch` ở 5 nút (ảnh thẻ sản phẩm khi "Chưa có ảnh", nút số điện thoại thành viên, hai nút xuất dữ liệu, nút cài đặt mốc nhắc) — đã sửa trong commit 4b37541b và đo lại trên 5 màn liên quan ở cả hai khổ: 0.

Axe sạch không có nghĩa là đạt WCAG (OPERATING §4): vẫn cần kiểm bằng trình đọc màn hình thật và trên thiết bị thật.

## 3. Thay đổi nhìn thấy trong ảnh ghép
- **Bộ máy phân tích ảnh:** dấu chọn là nút radio chuẩn (D4-09), bố cục giữ nguyên.
- **Thẻ chào:** nút chuông thông báo ở đầu trang hiện icon (trước là ô tròn trống, D4-13).
- **Sản phẩm:** ảnh lỗi hiện ô "Chưa có ảnh"; nhãn trạng thái không đè chữ.
- **Đơn hàng 390px:** hàng nút đầu trang xuống hàng gọn; nút thu tiền không gãy chữ.
- **Dữ liệu nền tảng:** "Khoảng N bản ghi" thay cho số đọc như số âm.
- **Điều phối:** không còn mã kỹ thuật "(T01)…", "P1 •" trong tiêu đề bước.
- **Ô biểu tượng (Công cụ, Console):** màu nhóm theo bảng ALG (D4-18).
