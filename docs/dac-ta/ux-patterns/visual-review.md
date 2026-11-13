# Review thị giác, audit thủ công & so sánh tham chiếu

Level 3 SUPPORTING · thực thi 03a §35 + 03c §7b · Hợp nhất từ MEUX kit 06 + 10 (PO duyệt 29/10/2026).
Đây là checklist có cấu trúc, **không phải thang điểm khoa học đã kiểm chứng**. Một lỗi nghiêm trọng về trợ năng, mất dữ liệu hoặc nghiệp vụ không được bù bằng điểm thẩm mỹ.

## 1. Mã audit thủ công → nơi quy định

| Mã | Câu hỏi | Quy định gốc | Tự động? |
|---|---|---|---|
| IA-01 | Nhận ra việc chính nhanh không? | 03a UX-001/002 | Không |
| VH-01 | Tiêu đề / nội dung / hành động chính-phụ phân cấp rõ? | 03a UX-007 | Không |
| ID-01 | Copy lặp (tiêu đề, mô tả, badge, trợ giúp)? | 03a UX-008, §43 | Không |
| ID-02 / VD-02 | Card/viền/bóng/nền dư, container lồng nhau? | 03a §41, `page-archetypes.md` §2 | Không |
| PD-01 | Tùy chọn ít dùng luôn chiếm chỗ / vùng mở rộng khó tìm? | 03c §5, UX-P03 | Một phần (R15) |
| CU-01 | Trường hợp lệ với chế độ hiện tại; đổi chế độ không mất dữ liệu? | 03c §5c (UX-027) | Không |
| AC-01 | Nhãn, bàn phím, focus, tương phản, tên truy cập, liên kết lỗi, zoom | 03a §32 | Một phần (R5–R7, axe) |
| CO-01 | Component trùng, style riêng, token hard-code | 03a §30–31 | Có (R1–R3, R12) |
| ST-01 | Đủ loading / rỗng / lỗi / khóa / thành công / không quyền | 03a §24–27 | Một phần (R9–R10) |
| ACPT-01 | Hành động phá hủy có phân cấp + xác nhận + nói hậu quả | 03c §3 (UX-015) | Một phần (R13) |
| RESP-01 | Tràn ngang, thanh dính, lớp phủ, form dài trên 390px | 03a §28 | Một phần (E2E 390px) |
| VD-01 | Shell, header, workspace nhất quán với module cùng loại | `page-archetypes.md` §1 | Không |
| VD-03 | Hành động chính dễ thấy, không bị nút phụ tranh | 03a UX-010, K2 | Cảnh báo (R4) |
| VD-04 | Bố cục hợp archetype A–F | `page-archetypes.md` §3 | Không |
| VD-05 | So với ảnh tham chiếu (nếu có) theo §3 bên dưới | — | Không |

## 2. Mức độ (audit thủ công) và quy đổi

| Mức | Nghĩa | Quy đổi sang đầu ra 03a §35 |
|---|---|---|
| P0 | An toàn, bảo mật, mất dữ liệu, phá hủy không bảo vệ, chặn luồng cốt lõi | BLOCKED |
| P1 | Khó hoàn thành việc chính, ẩn thông tin quan trọng, lỗi trợ năng lớn | FAIL |
| P2 | Nhiễu thị giác đáng kể, lặp nội dung, thêm bước thừa | WARNING |
| P3 | Chi tiết thẩm mỹ nhỏ | PASS (ghi chú) |

Lint tự động (R1–R16) giữ nguyên đầu ra và cơ chế ratchet; P0–P3 chỉ dùng cho finding thủ công.

**Mẫu finding:** ID · Trang/component + viewport · Mã · Bằng chứng (ảnh/đoạn mã) · Tác động · Mức P0–P3 · Đề xuất · Phạm vi ảnh hưởng · Cách xác minh sau sửa · Ngoại lệ (`exceptions.md`).

## 3. So sánh trước/sau hoặc với ảnh tham chiếu

Chuẩn bị: cùng viewport (390px và 1280px), zoom, trạng thái, dữ liệu mẫu, vai. Không so trang khác nhiệm vụ như thể phải giống nhau. Ảnh tham chiếu (vd. SePay) chỉ để học bố cục/phân cấp — không chép thương hiệu, logo, pixel.

Chấm mỗi chiều 0 (không đạt) · 1 (một phần) · 2 (tốt) · N/A (kèm lý do):

| Chiều | Câu hỏi |
|---|---|
| Rõ việc | Hiểu trang để làm gì trong vài giây? |
| Phân cấp | Tiêu đề, nội dung chính, hành động rõ thứ bậc? |
| Mật độ | Nhiều thông tin hữu ích mà không quá tải? |
| Nhiễu | Không thừa card, viền, màu, icon, mô tả? |
| Điều hướng | Shell/header nhất quán với module tương tự? |
| Hành động chính | Dễ tìm, dễ hiểu? |
| Theo ngữ cảnh | Lựa chọn hợp chế độ/trạng thái hiện tại? |
| Tìm thấy | Tùy chọn nâng cao dễ tìm mà không chiếm chỗ? |
| Trợ năng | Bàn phím, focus, nhãn, tương phản, ngữ nghĩa? |
| Responsive | Dùng được ở viewport hỗ trợ? |
| Toàn vẹn nghiệp vụ | Tác vụ, quyền, thông tin nghiệp vụ còn đủ? |

Không chỉ cộng tổng điểm. Chưa có hạ tầng screenshot diff: không tự thêm dependency — đề xuất riêng cho PO.
