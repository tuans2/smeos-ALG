# Screen Contract — Trang chủ Hành trình Quản trị Nền tảng (Platform Journey Home)

**Tuyến:** `/van-hanh` / `/` · **Tệp chính:** `src/components/dashboard/platform-journey-home.tsx` · **Cập nhật:** 30/09/2026 · **Thẻ:** J1–J7

## 1. Vai và mục đích
- Vai chính (03b): `platform_admin`
- Phạm vi: platform
- Việc chính: Khởi động công tác vận hành toàn hệ thống ALG (ChoiceGrid 10 tác vụ)
- Câu hỏi chính: "Bạn muốn làm gì với ALG hôm nay?"
- Mật độ: MEDIUM

## 2. Hiện trạng (audit)
- API: Session resolution máy chủ (`resolveAppSession` + `resolveRoleUx`)
- Khối: 1 ChoiceGrid 10 ô lựa chọn
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑
- lint:ux trước: R1=0 R2=0 R3=0 R5=0 R6=0 R7=0 R11=0

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tiêu đề "Bạn muốn làm gì với ALG?" | Khung nhìn đầu |
| L1 Hành động | 10 thẻ tác vụ (Báo cáo, Tổ chức, Người dùng, Gói dịch vụ, Năng lực, AI & Credit, Kết nối, Sức khỏe, Cài đặt, Kiểm toán) | Lưới thẻ chính |
| L2 Ngữ cảnh | Danh mục tính năng quản trị | Lớp mở rộng |
| L3 Chi tiết | Các trang chức năng tương ứng tại `/van-hanh/*` | Route chi tiết |

## 4. Hành động
- Chính (1): Chọn thẻ tác vụ quản trị để điều hướng tới route vận hành chi tiết

## 5. Content budget
nút nổi: 0/3 · khối chính: 1/5 · nhóm thông tin: 3/7

## 6. Trạng thái
- Thành công: Hiển thị 10 thẻ tác vụ vận hành nền tảng

## 7. Responsive
- 390px: 1 cột thẻ dọc
- 768px: 2 cột thẻ
- 1280px: 3-4 cột thẻ

## 8. Trợ năng
- Bàn phím: Tương thích hoàn toàn
- Tương phản: WCAG 2.2 AA

## 9. AI
- Quản trị mô hình và định mức AI toàn nền tảng

## 10. Dữ liệu và quyền
- Nguồn sự thật: `PLATFORM_JOURNEYS` trong `journey-catalog.ts`
- Quyền: Chỉ dành riêng cho `platform_operators`

## 11. Component
- Dùng lại: `ChoiceGrid`, `ActionCard`
- Tạo mới: `PlatformJourneyHome`

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Console-first | Journey-first | Xây dựng ChoiceGrid định hướng cho Platform Admin | Giúp quản trị viên tiếp cận đúng công việc tức thì | Đã PO duyệt 30/09 |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt 14/14 tiêu chí chuẩn |
