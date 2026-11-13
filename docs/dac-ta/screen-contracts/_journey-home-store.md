---
id: SCR-STORE-trang-chu
tier: STORE
module: dashboard
route: /
archetype: A
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 <h1> đúng 20px (text-display)
  - Khởi động công việc theo định hướng hành trình tác vụ (ChoiceGrid)
  - Đầy đủ 6 trạng thái UI
  - Chuyển đổi mượt mà giữa hành trình và bảng điều khiển chuyên gia
---

# Screen Contract — Trang chủ Hành trình Quản trị Cửa hàng (Store Journey Home)

**Tuyến:** `/` · **Tệp chính:** `src/components/dashboard/store-journey-home.tsx` · **Cập nhật:** 30/09/2026 · **Thẻ:** J1–J7

## 1. Vai và mục đích
- Vai chính (03b): `store_admin` · Vai phụ: `store_manager`, `dieu_hanh`
- Phạm vi: organization
- Việc chính: Khởi động công việc theo định hướng hành trình tác vụ (ChoiceGrid 12 tác vụ)
- Câu hỏi chính: "Bạn muốn làm gì cho cửa hàng hôm nay?"
- Mật độ: MEDIUM (thẻ tác vụ trực quan, rõ ràng, phân loại lọc danh mục)

## 2. Hiện trạng (audit)
- API: Session resolution máy chủ (`resolveAppSession` + `resolveRoleUx`)
- Khối: 1 ChoiceGrid chính + toggle Chế độ chuyên gia (`StoreGrowthCenter`) + WorkflowPreview
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑
- lint:ux trước: R1=0 R2=0 R3=0 R5=0 R6=0 R7=0 R11=0

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tiêu đề "Bạn muốn làm gì cho cửa hàng?", thanh lọc tác vụ, nút chuyển chế độ chuyên gia | Khung nhìn đầu |
| L1 Hành động | 13 thẻ tác vụ (Xem báo cáo, Mẫu hoa yêu thích, Thẻ sản phẩm, Báo giá, Viết bài, Giọng đọc, Ảnh quảng cáo, Video chuyển động, Bán hoa, Đơn hàng, Quản lý khách hàng, Bộ nội dung tự động, Tư vấn & nhận đơn) | Lưới thẻ chính |
| L2 Ngữ cảnh | Xem trước quy trình (WorkflowPreview) cho tác vụ Combo | Modal / Lớp xem trước |
| L3 Chi tiết | Không gian làm việc từng bước (JourneyShell) | Workspace hành trình |
| L4 Nâng cao | Chế độ chuyên gia (Bảng điều khiển tăng trưởng cửa hàng StoreGrowthCenter) | Chế độ mở rộng |

## 4. Hành động
- Chính (1): Chọn thẻ tác vụ mong muốn để bắt đầu hành trình
- Phụ (≤ 2): Lọc tác vụ (Tất cả, Tác vụ đơn, Gói quy trình, Trợ lý ảo), Tìm kiếm
- Menu `…`: Chuyển sang Chế độ chuyên gia

## 5. Content budget
nút nổi: 1/3 · khối chính: 2/5 · nhóm thông tin: 4/7

## 6. Trạng thái
- Tải: Khung xương trang chủ
- Rỗng: Thông báo không tìm thấy tác vụ phù hợp khi tìm kiếm
- Thành công: Hiển thị lưới thẻ hoặc bước hành trình tương ứng

## 7. Responsive
- 390px: 1 cột thẻ dọc
- 768px: 2 cột thẻ
- 1280px: 3-4 cột thẻ lưới đa năng

## 8. Trợ năng
- Bàn phím: Tab di chuyển tuần tự qua các thẻ tác vụ, Enter để kích hoạt
- Focus: Viền focus hiển thị rõ ràng đạt WCAG 2.2 AA
- Nhãn: 100% tiếng Việt tự nhiên, không mã kỹ thuật

## 9. AI
- Gợi ý: Gợi ý hành trình từ ảnh hoa tải lên
- Cần duyệt: Bắt buộc người dùng chọn và xác nhận trước khi chạy

## 10. Dữ liệu và quyền
- Nguồn sự thật: `STORE_JOURNEYS` trong `journey-catalog.ts`
- Quyền: Kiểm tra theo mã năng lực và gói dịch vụ

## 11. Component
- Dùng lại: `ChoiceGrid`, `ActionCard`, `JourneyShell`, `WorkflowPreview`, `StoreGrowthCenter`
- Tạo mới: `StoreJourneyHome`

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Dashboard-first | Journey-first | Thêm ChoiceGrid bọc trước dashboard | Tránh quá tải thông tin cho chủ tiệm hoa | Đã PO duyệt 30/09 |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt 14/14 tiêu chí chuẩn |
