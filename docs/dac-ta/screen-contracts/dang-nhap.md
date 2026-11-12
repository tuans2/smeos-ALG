---
id: SCR-AUTH-dang-nhap
tier: AUTH
module: auth
route: /dang-nhap
archetype: D
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề thương hiệu smeOS nổi bật, đúng tỷ lệ thị giác
  - Chuyển đổi mượt mà giữa 3 chế độ: Đăng nhập, Đăng ký và Dùng thử
  - Tối đa 1 nút hành động chính (Primary CTA) trên mỗi biểu mẫu theo K2
  - Báo lỗi xác thực rõ ràng, thân thiện, bảo mật thông tin (không lộ cấu trúc CSDL)
  - Vùng chạm phím bấm tối thiểu 44×44px khi thao tác cảm ứng
  - Đầy đủ 6 trạng thái UI và tuân thủ WCAG 2.2 AA
---

# Screen Contract — Xác Thực & Đăng Nhập Hệ Thống

**Mã màn:** `SCR-AUTH-dang-nhap` · **Tuyến:** `/dang-nhap` · **Tầng:** `AUTH` · **Bố cục (Archetype):** `D` (Biểu mẫu)

## 1. Vai & Mục đích
- **Vai chính (03b):** Mọi người dùng (`owner`, `store_manager`, `staff`, `coordinator`, `partner`, `platform_admin`) và khách mới đăng ký.
- **Phạm vi dữ liệu:** `auth` (xác thực danh tính và khởi tạo phiên làm việc).
- **Mục tiêu chính:** Đăng nhập vào không gian làm việc hoặc đăng ký tài khoản / dùng thử SME mới.
- **Câu hỏi cốt lõi:** "Làm sao để tôi đăng nhập vào tiệm hoặc đăng ký trải nghiệm ngay?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** Logo thương hiệu hoa smeOS, tiêu đề hệ thống và mô tả định vị đa ngành.
- **Vùng làm việc:** Hộp biểu mẫu tập trung (`max-w-sm` cho đăng nhập, `max-w-xl` cho đăng ký/dùng thử) nằm giữa màn hình.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Bộ chọn 3 chế độ: Đăng nhập · Đăng ký mới · Dùng thử.
  2. L1 (Hành động): Biểu mẫu nhập liệu (email/tên đăng nhập, mật khẩu, thông tin doanh nghiệp).
  3. L2 (Bổ trợ): Cảnh báo đăng nhập thiết bị khác, liên kết quên mật khẩu, bản quyền hệ thống.
     Cảnh báo thiết bị khác (checklist ALG 1.2) hiện khi có `?ly-do=thiet-bi-khac`, hoặc khi màn khác tự chuyển về đây sau lỗi 401: trang hỏi `GET /auth/session-status` một lần, phiên trong cookie bị thay bởi lần đăng nhập mới (`SESSION_SUPERSEDED`) thì hiện cùng câu báo.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Đăng nhập" / "Đăng ký không gian" / "Gửi yêu cầu dùng thử" tuỳ chế độ đang chọn.
- **Hành động phụ (Secondary):** Nút chuyển đổi nhanh chế độ bên dưới biểu mẫu.

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Nút chính hiển thị trạng thái chờ xử lý (spinner) và vô hiệu hoá trường nhập liệu để tránh submit đúp.
2. **Rỗng (Empty):** Các ô nhập liệu có placeholder gợi ý trung lập, không có giá trị mặc định nhạy cảm.
3. **Lỗi (Error):** Hộp thông báo lỗi màu đỏ (`border-danger/30 bg-danger/10 text-danger`) với lời giải thích dễ hiểu, bảo mật.
4. **Không có quyền (Forbidden):** Hiển thị khi tài khoản bị khoá hoặc từ chối cấp quyền truy cập.
5. **Dữ liệu một phần (Partial):** Báo lỗi mất kết nối mạng nếu request xác thực timeout.
6. **Thành công (Success):** Chuyển hướng ngay lập tức vào trang chủ theo vai tương ứng (`/` hoặc trang chủ role UX).

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Hỗ trợ đầy đủ điều hướng bằng bàn phím (Tab, Shift+Tab, Enter để submit).
- Nhãn label liên kết chặt chẽ với input qua `htmlFor` và `id`.
- Hoạt hoạ chuyển đổi tuân thủ `prefers-reduced-motion`.
- Responsive tối ưu từ màn hình 320px đến màn hình 4K.
