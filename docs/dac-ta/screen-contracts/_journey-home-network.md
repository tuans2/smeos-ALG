# Screen Contract — Trang chủ Hành trình Quản trị Mạng lưới Điện hoa (Network Journey Home)

> **Lối vào tuyến khoá (12/11/2026, audit N-05):** khi `NEXT_PUBLIC_APP_ENV=production` bật khoá "Sắp ra mắt", lối vào tuyến khoá bị ẩn thay vì dẫn tới màn khoá (`isHrefOpen`, `src/lib/feature-lock.ts`). Thẻ hành trình có `primaryHref` trỏ tới tuyến khoá (Điều phối, Khách hàng) bị ẩn; nút "Tháp điều phối" và "Mở bảng điều phối" của `FlowerNetworkCommandCenter` ẩn khi `/dieu-phoi` khoá. Khoá tắt (staging, bản giao GD1) giữ nguyên.

**Tuyến:** `/` · **Tệp chính:** `src/components/dashboard/network-journey-home.tsx` · **Cập nhật:** 30/09/2026 · **Thẻ:** J1–J7

## 1. Vai và mục đích
- Vai chính (03b): `flower_network_admin`
- Phạm vi: platform / flower_network
- Việc chính: Khởi động công tác điều hành mạng lưới hoa (ChoiceGrid 8 tác vụ)
- Câu hỏi chính: "Bạn muốn làm gì cho hoạt động điện hoa hôm nay?"
- Mật độ: MEDIUM

## 2. Hiện trạng (audit)
- API: Session resolution máy chủ (`resolveAppSession` + `resolveRoleUx`)
- Khối: 1 ChoiceGrid + toggle Chế độ chuyên gia (`FlowerNetworkCommandCenter`)
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑
- lint:ux trước: R1=0 R2=0 R3=0 R5=0 R6=0 R7=0 R11=0

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tiêu đề "Bạn muốn làm gì cho hoạt động điện hoa?", nút chuyển chế độ chuyên gia | Khung nhìn đầu |
| L1 Hành động | 8 thẻ tác vụ (Báo cáo mạng lưới, Sản phẩm, Bán hàng, Điều phối, Đối tác, CRM, Marketing, Tài chính) | Lưới thẻ chính |
| L2 Ngữ cảnh | Trung tâm điều hành mạng lưới FlowerNetworkCommandCenter (khi chọn Báo cáo) | Workspace hành trình |
| L3 Chi tiết | Bảng điều phối đơn hàng (`/dieu-phoi`) | Điều hướng trực tiếp |

## 4. Hành động
- Chính (1): Chọn thẻ tác vụ điện hoa
- Phụ: Chuyển sang Chế độ chuyên gia

## 5. Content budget
nút nổi: 1/3 · khối chính: 2/5 · nhóm thông tin: 3/7

## 6. Trạng thái
- Tải: Khung xương trang chủ
- Rỗng: Thông báo không tìm thấy tác vụ phù hợp khi tìm kiếm
- Thành công: Hiển thị lưới thẻ hoặc màn hình điều phối

## 7. Responsive
- 390px: 1 cột thẻ dọc
- 768px: 2 cột thẻ
- 1280px: 4 cột thẻ

## 8. Trợ năng
- Bàn phím: Tab / Enter tương thích đầy đủ
- Tương phản: WCAG 2.2 AA

## 9. AI
- Gợi ý: Hỗ trợ điều phối đơn thông minh theo SLA đối tác

## 10. Dữ liệu và quyền
- Nguồn sự thật: `NETWORK_JOURNEYS` trong `journey-catalog.ts`
- Thẻ "Chi nhánh Mạng lưới" (`NetworkPartnerListCard`): mỗi đối tác có nút **Bảng kê** mở `PartnerStatementModal` — `GET /api/v1/coordinator/partners/:id/statement`, lập sổ `POST …/settlements`, đối soát / ghi đã thanh toán `POST /api/v1/coordinator/partner-settlements/:id/reconcile|pay`, mã `R19` (Điều hành, Kế toán). Danh sách đơn ẩn sau nút "Xem N đơn" (Progressive Disclosure). Màn "Quản lý" đối tác (`PartnerManagementModal`) tải danh bạ xưởng gia công `GET /api/v1/coordinator/partners?active=0` (`R1`, cả xưởng tạm ngưng — trước 12/11/2026 gọi nhầm danh sách đối tác chuỗi) và mỗi thẻ xưởng cũng có nút **Bảng kê**. Nút chỉ hiện khi người xem có `R19`; vai Điều phối (chủ nhân trang này) không có mã đó — lối vào chính là tab "Tiền công đối tác" ở `/bao-cao`

## 11. Component
- Dùng lại: `ChoiceGrid`, `ActionCard`, `JourneyShell`, `FlowerNetworkCommandCenter`
- Tạo mới: `NetworkJourneyHome`, `NetworkPartnerListCard`, `PartnerStatementModal` (thay `PartnerSettlementModal` chạy bằng dữ liệu mẫu — đã xoá)

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Control Tower direct | Journey Home wrapper | Thêm ChoiceGrid bọc trước | Phân định rõ tác vụ điều phối vs quản trị mạng lưới | Đã PO duyệt 30/09 |
| "Sổ đối soát" đối tác chạy bằng 3 dòng mẫu, "Đã thanh toán" chỉ đổi state trình duyệt | Bảng kê + sổ quyết toán thật | Tiền công một nguồn (phí gia công sau khấu trừ / giá thoả thuận), sổ `partner_settlements` Chờ đối soát → Đã đối soát → Đã thanh toán | Người dùng tưởng đã chốt quyết toán | PO 12/11/2026, audit BL-22 |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt 14/14 tiêu chí chuẩn |
