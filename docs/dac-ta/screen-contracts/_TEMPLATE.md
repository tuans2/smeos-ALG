# Screen Contract — <tên màn>

**Tuyến:** `<route>` · **Tệp chính:** `<đường dẫn>` · **Cập nhật:** <ngày> · **Thẻ:** <T?.?>

## 1. Vai và mục đích
- Vai chính (03b): <khoá> · Vai phụ: <…>
- Phạm vi: organization | branch | platform
- Việc chính: <một câu>
- Câu hỏi chính: <một câu hỏi>
- Mật độ: LOW | MEDIUM | HIGH | EXPERT (lý do)
- Archetype (`ux-patterns/page-archetypes.md`): A Dashboard | B Danh sách | C Chi tiết | D Biểu mẫu | E Builder | F Cài đặt

## 2. Hiện trạng (audit)
- API: <METHOD /api/v1/… → mã năng lực (route.ts:dòng)>
- Khối: <n> · Nút primary: <n> · FeatureGuidanceCard: <n> · Modal: <danh sách>
- Trạng thái có sẵn: tải ☐ rỗng ☐ lỗi ☐ không quyền ☐ một phần ☐ thành công ☐
- lint:ux trước: R1=… R2=… R3=… R5=… R6=… R7=… R11=…

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | | khung nhìn đầu |
| L1 Hành động | | khung nhìn đầu |
| L2 Ngữ cảnh | | mở rộng tại chỗ |
| L3 Chi tiết | | trang chi tiết / drawer |
| L4 Nâng cao | | "Xem thêm" / chỉ platform_admin |

## 4. Hành động
- Chính (1): <nhãn> → <kết quả>
- Phụ (≤ 2): <…>
- Menu `…`: <…>

## 5. Content budget
nút nổi: <n>/3 · khối chính: <n>/5 · nhóm thông tin (trang chi tiết): <n>/7 · lý do vượt (nếu có)

## 6. Trạng thái (mô tả cụ thể nội dung hiển thị)
tải: … · rỗng: … · lỗi: … · không quyền: … · một phần: … · thành công: …

## 7. Responsive
390px: … · 768px: … · 1280px: …

## 8. Trợ năng
bàn phím: … · focus: … · nhãn: … · vùng thông báo: … · axe: <kết quả>

## 9. AI
gợi ý: … · tự động: không · cần duyệt: …

## 10. Dữ liệu và quyền
nguồn sự thật: … · trường dùng: … · năng lực: …

## 11. Component
dùng lại: … · mở rộng: … · tạo mới (kèm lý do 03a §30): …

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS/WARNING/FAIL | |

## 14. Kết quả
lint:ux sau: … · nợ mở: … · ảnh mốc: …

## 15. Progressive disclosure & rủi ro (03c)
Pattern dùng (`docs/dac-ta/ux-patterns/`): UX-P…
| Trường/nút/thông tin | Tầng (L0–L4/SYS) | Lý do | Điều kiện hiện | Rủi ro R1–R3 | Cách xác minh |
|---|---|---|---|---|---|
Trường theo ngữ cảnh (03c §5c, nếu có):
| Trường/nhóm | Hiện khi | Khóa khi | Mặc định | Khi điều kiện đổi (giữ/xóa có cảnh báo/hỏi) |
|---|---|---|---|---|
Chi phí AI (UX-019): … · quyền/gói (UX-018): … · ngoại lệ: … · review thị giác (`visual-review.md`): …
