---
id: SCR-STORE-tich-hop-tai-lieu-api
tier: STORE
module: integrations
route: /tich-hop/tai-lieu-api
archetype: F
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 <h1> "Tài liệu API cho đối tác", nút quay lại Trung tâm Tích hợp
  - Chỉ người có quyền quản lý khoá ứng dụng (F9) xem được; không quyền thì báo lý do bằng câu tiếng Việt
  - Hướng dẫn "Bắt đầu nhanh" mở sẵn, các mục và từng endpoint mở khi cần (Disclosure)
  - Danh sách endpoint/trường sinh từ OpenAPI của mã, không viết tay
  - Trường sắp gỡ có nhãn "Sắp gỡ" và câu ngày gỡ luôn hiện
  - Không cuộn ngang ở 390px; không vi phạm axe-core critical/serious
---

# Screen Contract — Tài liệu API cho đối tác

**Mã màn:** `SCR-STORE-tich-hop-tai-lieu-api` · **Tuyến:** `/tich-hop/tai-lieu-api` · **Tầng:** `STORE` · **Bố cục (Archetype):** `F` (trang con của Cài đặt / Kết nối)

Nguồn: kế hoạch ARC-024 phần B (PO duyệt 11/11/2026 — Q1 xem sau đăng nhập, Q2 trang tự dựng không thêm thư viện), `docs/audit/api-architecture-audit/01_API_ARCHITECTURE_AUDIT.md` §41.

## 1. Vai & Mục đích
- **Vai chính (03b):** `owner` (Điều hành) — người cấp khoá ứng dụng cho đối tác/kỹ thuật viên của đối tác.
- **Phạm vi dữ liệu:** `organization` (không đọc dữ liệu nghiệp vụ; chỉ kiểm quyền `F9`).
- **Mục tiêu chính:** Đưa cho đối tác đủ thông tin để nối ứng dụng với cửa hàng qua Integration API: cách xác thực, giới hạn, lỗi, thay đổi sắp tới, và tham chiếu từng endpoint.
- **Câu hỏi cốt lõi:** "Ứng dụng bên ngoài gọi API thế nào, và sắp có thay đổi gì phải sửa?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` (tiêu đề, một dòng mô tả, nút quay lại `/tich-hop`). Không có hành động cấp trang.
- **Vùng làm việc:** cột hẹp `max-w-4xl` theo Archetype F.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Thông báo thay đổi có hiệu lực từ 09/02/2027 (luôn hiện, UX-017); mục "Bắt đầu nhanh" mở sẵn.
  2. L1 (Đọc theo nhu cầu): Các mục hướng dẫn — Xác thực, Giới hạn tần suất, Chống gửi trùng, Lỗi, Phân trang, Thay đổi và gỡ bỏ — mỗi mục một `Disclosure`.
  3. L2 (Tra cứu): Tham chiếu theo nhóm; mỗi endpoint một `Disclosure` gồm mô tả, xác thực, tham số truy vấn, thân yêu cầu, phản hồi (trường con một cấp), lỗi có thể gặp.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** không có — trang chỉ đọc.
- **Lối vào:** liên kết "Xem tài liệu API" trong khối Khoá ứng dụng của `/tich-hop` (ẩn khi bật chế độ giai đoạn bàn giao mà trang không thuộc giai đoạn).

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** trang dựng ở máy chủ; nội dung đến cùng HTML, không có trạng thái tải riêng.
2. **Rỗng (Empty):** không áp dụng — tham chiếu sinh từ mã luôn có đủ endpoint (test `partner-api-reference.test.ts`).
3. **Lỗi (Error):** lỗi kiểm quyền được ghi log và xử lý như không có quyền (không lộ chi tiết).
4. **Không có quyền (Forbidden):** `EntitlementGate` — "Tài khoản của bạn chưa được quản lý khoá ứng dụng, nên chưa xem được tài liệu API." Không hiện mã quyền.
5. **Dữ liệu một phần (Partial):** không áp dụng.
6. **Thành công (Success):** thông báo thay đổi + hướng dẫn + tham chiếu đầy đủ.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- **Màn hình di động (390px):** trường hiển thị dạng danh sách (không bảng) để không cuộn ngang; khối mã tự xuống dòng.
- **Màn hình lớn (1280px):** cùng bố cục, cột hẹp.
- **Bàn phím & Đọc màn hình:** `Disclosure` có `aria-expanded`/`aria-controls`; mỗi khu có tiêu đề `h2`/`h3`; nhãn "Sắp gỡ" đi kèm câu giải thích bằng chữ, không chỉ dựa vào màu.
