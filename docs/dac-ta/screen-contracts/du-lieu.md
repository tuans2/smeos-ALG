---
id: SCR-CHAIN-du-lieu
tier: CHAIN
module: chain-data
route: /du-lieu
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Trung tâm Dữ liệu Chuỗi (ChainDataHub) tích hợp báo cáo đa chi nhánh
  - Thống kê doanh số, hiệu suất đối tác, tỷ lệ hoàn thành đơn và đối soát
  - Tích hợp bộ lọc thời gian và xuất báo cáo dữ liệu sạch
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Trung Tâm Dữ Liệu Chuỗi (Chain Data Hub)

**Mã màn:** `SCR-CHAIN-du-lieu` · **Tuyến:** `/du-lieu` · **Tầng:** `CHAIN` · **Bố cục (Archetype):** `B` (Báo cáo dữ liệu)

## 1. Vai & Mục đích
- **Vai chính (03b):** `chain_coordinator` / `chain_owner` / `business_analyst`.
- **Phạm vi dữ liệu:** `chain` (Dữ liệu tổng hợp toàn mạng lưới chi nhánh và đối tác).
- **Mục tiêu chính:** Phân tích dữ liệu chuỗi, đối soát doanh thu chi nhánh, kiểm soát chi phí gia công và đo lường SLA giao hàng.
- **Câu hỏi cốt lõi:** "Doanh thu và hiệu suất vận hành của các chi nhánh trong tuần/tháng qua thế nào?"
- **Mật độ thông tin (Density):** `compact`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` tiêu đề "Trung Tâm Dữ Liệu Chuỗi", bộ chọn khoảng thời gian.
- **Vùng làm việc:** `ChainDataHub` hiển thị bảng biểu số liệu và biểu đồ phân bổ.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Tổng sản lượng đơn, doanh thu gộp, tỷ lệ giao đúng hạn, tổng phí gia công.
  2. L1 (Hành động): Nút xuất dữ liệu Excel / CSV, lọc theo chi nhánh.
  3. L2 (Bổ trợ): Bảng xếp hạng chi nhánh tiêu biểu, danh sách cảnh báo SLA.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Xuất báo cáo đối soát".
- **Hành động phụ (Secondary):** "Lọc nâng cao", "Làm mới dữ liệu".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** `SkeletonBlock lines={6}` hiển thị trong thời gian tải dữ liệu chuỗi.
2. **Rỗng (Empty):** `EmptyState kind="none"` khi chưa có đơn nào trong khoảng thời gian đã chọn.
3. **Lỗi (Error):** Lỗi kết nối CSDL phân tích chuỗi.
4. **Không có quyền (Forbidden):** Yêu cầu quyền điều phối chuỗi.
5. **Dữ liệu một phần (Partial):** Hiển thị số liệu của các chi nhánh đã đồng bộ.
6. **Thành công (Success):** Toàn bộ bảng số liệu phân tích tải hoàn chỉnh.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Biểu đồ số liệu hỗ trợ mô tả bằng văn bản cho người dùng trình đọc màn hình.
- Bảng số liệu hỗ trợ cuộn ngang linh hoạt.
