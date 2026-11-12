# Mục 1: Trang Chủ (/) — Bảng Điều Khiển & Hành Trình Tác Vụ

> **Đường dẫn**: `/`
> **Nhóm Sidebar**: Không thuộc nhóm (Mục gốc đầu tiên)
> **Trạng thái Production**: ✅ **Đang hoạt động**
> **Tài liệu SSOT liên quan**: `docs/dac-ta/03b-role-ux.md`, `docs/ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md`

---

## 1. Cấu trúc trang (Page Structure)

Trang chủ là trung tâm điều hướng chính của cửa hàng. Trên Production, hệ thống áp dụng **Kiến trúc Journey-First (Hành trình trước)** kết hợp **Phân luồng theo vai (Role UX)**:

### 1.1. Chế độ mặc định: Lưới Hành Trình Tác Vụ (`ChoiceGrid`)
- **Khung tiêu đề chuẩn**:
  - Huy hiệu định danh: `HÀNH TRÌNH TÁC VỤ THÔNG MINH` (`Sparkles`).
  - Câu hỏi mục tiêu lớn: *"BẠN MUỐN LÀM GÌ CHO CỬA HÀNG?"*.
  - Mô tả: *"Chọn một tác vụ để bắt đầu hành trình làm việc có định hướng cho cửa hàng hoa"*.
  - Nút chuyển **"Chế độ chuyên gia"** (`SlidersHorizontal`) và Menu người dùng (`UserMenu`).
- **Thanh tìm kiếm & Bộ lọc danh mục tác vụ**:
  - 4 nút lọc phân loại: **Tất cả (14)**, **Tác vụ đơn** (11 thẻ), **Gói quy trình** (1 thẻ combo), **Trợ lý ảo** (1 thẻ AI).
  - Ô tìm kiếm thời gian thực: Placeholder *"Tìm tác vụ mong muốn..."*, tự động lọc theo tiêu đề mục tiêu và mô tả nghiệp vụ.
- **Thẻ Tiêu Điểm Nổi Bật (`FeaturedSpotlightCard`)**:
  - Dành riêng cho **Thẻ Chào mẫu hoa (`greeting-card-hub`)** — tính năng trọng tâm duy nhất mở trên Production (`UNLOCKED_STORE_JOURNEY_IDS`).
  - Hiển thị nổi bật ở vị trí Spotlight phía trên lưới thẻ, có hình ảnh minh họa, huy hiệu *"Tính năng trọng tâm"*, và nút *"Bắt đầu ngay"* điều hướng sang `/the-chao`.
- **Lưới thẻ hành trình (`ChoiceGrid` / `ActionCard`)**:
  - Hiển thị 13 thẻ hành trình còn lại trong lưới responsive (1 cột mobile, 2 cột tablet, 3-4 cột desktop).
  - Trên môi trường **Production**, 13 thẻ này bị khóa (`isJourneyLocked(journey.id) === true`), hiển thị làm mờ (`opacity-60`) và gắn nhãn *"Sắp ra mắt"*.
- **Lưu trữ trạng thái**: Nút chuyển đổi sang Chế độ chuyên gia lưu trạng thái vào `localStorage` theo khóa `floraos_expert_mode_store`.

### 1.2. Chế độ Chuyên gia: Trung tâm Tăng trưởng Cửa hàng (`StoreGrowthCenter`)
Khi kích hoạt Chế độ chuyên gia, trang chủ hiển thị Bảng điều khiển vận hành thời gian thực:
- **Thanh trạng thái đầu trang**: Banner thông báo *"Bạn đang ở Chế độ chuyên gia (Bảng điều khiển trực tiếp)"* kèm nút *"Chuyển sang Chế độ hành trình tác vụ"*.
- **Header**: Tên cửa hàng (`orgName`), Huy hiệu vai trò (`Quản trị cửa hàng` / `Role UX`), Câu hỏi định hướng ngày làm việc, Nút tắt *"Xu hướng thị trường"*, và Menu người dùng.
- **Cột trái (Nghiệp vụ & Can thiệp - 2/3 độ rộng)**:
  - Khối **Cần can thiệp (`StoreManagerActionItemsCard`)**: Điểm nóng vận hành gồm Job AI lỗi, Kết quả chờ duyệt, Đơn hàng nháp chưa chốt.
  - Khối **Đòn bẩy Tăng trưởng Doanh số**: Lối tắt đến Nghiên cứu thị trường và Creative Studio AI.
  - Khối **Tiến trình AI đang thực hiện**: Danh sách job ngầm đang chạy (Processing/Pending).
- **Cột phải (Tài nguyên & Danh mục - 1/3 độ rộng)**:
  - Khối **Hạn mức Tín dụng AI (`UsageSummary`)**: Mức tiêu thụ credit AI trong kỳ và số dư khả dụng.
  - Khối **Sản phẩm mới cập nhật**: 5 sản phẩm gần nhất kèm trạng thái (Đang bán / Nháp / Lưu trữ).

---

## 2. Tính năng chi tiết từng thành phần

### 2.1. Lưới Hành Trình (`ChoiceGrid`)
| Thành phần | Loại UI | Mô tả chi tiết | Hành động khi nhấp |
|---|---|---|---|
| **Thẻ Tiêu điểm Spotlight** | FeaturedSpotlightCard | Thẻ "Thẻ Chào mẫu hoa" hiển thị độc quyền trên cùng | Nhấp nút "Bắt đầu ngay" → điều hướng sang `/the-chao` |
| **Thanh lọc phân loại** | Pill Buttons | 4 nút: Tất cả (14), Tác vụ đơn, Gói quy trình, Trợ lý ảo | Lọc tức thì danh sách thẻ theo phân loại |
| **Ô tìm kiếm tác vụ** | Input with Search Icon | Tìm kiếm theo tên mục tiêu hoặc nội dung mô tả | Lọc động danh sách thẻ theo từ khóa |
| **Các thẻ "Sắp ra mắt"** | ActionCard (Locked) | 13 thẻ bị làm mờ (opacity-60), gắn badge "Sắp ra mắt" | Bị vô hiệu hóa (`disabled`), không kích hoạt hành động |
| **Nút "Chế độ chuyên gia"** | Button Outline | Biểu tượng SlidersHorizontal, góc trên bên phải | Kích hoạt `StoreGrowthCenter` trực tiếp |

### 2.2. Khối Cần Can Thiệp (`StoreManagerActionItemsCard`)
| Chỉ số / Hàng | Mức độ cảnh báo | Ý nghĩa nghiệp vụ | Hành vi tương tác |
|---|---|---|---|
| **Job lỗi** | Nguy cấp (`text-danger`) | Các tác vụ AI (quét ảnh, dựng kịch bản) bị lỗi worker | Nhấp để cuộn xuống danh sách Job để xem mã lỗi |
| **Kết quả chờ duyệt** | Cảnh báo (`text-primary`) | Mẫu hoa hoặc nội dung AI sinh xong đang chờ chủ tiệm duyệt | Điều hướng sang trang duyệt (`/duyet`) |
| **Đơn nháp chưa chốt** | Bình thường | Đơn hàng khách gửi từ Thẻ chào hoặc nhân viên tạo nháp chưa chốt cọc | Mở nhanh danh sách đơn nháp |

### 2.3. Khối Quản lý Tín dụng AI & Sản phẩm
- **Thanh tiến độ Credit AI**: Đo lường tổng dung lượng credit đã sử dụng so với số dư gói dịch vụ SaaS. Cảnh báo khi tiệm gần hết hạn mức AI.
- **Top 5 Sản phẩm gần nhất**: Xem nhanh mã hoa (`code`), tên hoa (`name`), danh mục (`category`), và trạng thái xuất bản (`DRAFT` / `ACTIVE` / `ARCHIVED`).

---

## 3. Luồng nghiệp vụ & Tình huống sử dụng thực tế

### Tình huống 1: Đầu ngày làm việc của Chủ tiệm / Nhân viên bán hàng
1. Nhân viên mở FloraOS tại `/`.
2. Hệ thống chào đón bằng câu hỏi định hướng: *"Bạn muốn làm gì cho cửa hàng?"*.
3. Nhân viên chọn thẻ **"Thẻ Chào mẫu hoa"** để vào ngay màn hình soạn mẫu hoa gửi tư vấn cho khách đang nhắn tin trên Zalo/Facebook.

### Tình huống 2: Quản lý cửa hàng theo dõi vận hành qua Chế độ Chuyên gia
1. Quản lý nhấn *"Chuyển sang Chế độ chuyên gia"*.
2. Nhìn vào thẻ **Cần can thiệp**:
   - Nếu thấy có **Đơn nháp chưa chốt (3)**: Nhấp vào để kiểm tra thông tin cọc của khách gửi qua Brochure.
   - Nếu thấy **Kết quả chờ duyệt (2)**: Nhấp để duyệt ảnh hoa đã xử lý tách nền/dựng cảnh.
3. Theo dõi số dư Credit AI để chủ động nâng cấp gói nếu cửa hàng sắp chạy chiến dịch lễ lớn.

---

## 4. Lợi ích cho Cửa hàng Hoa

- **Giảm tải nhận thức (Cognitive Load)**: Thay vì đối mặt với hàng chục bảng biểu và menu kỹ thuật rối rắm, nhân viên được hướng dẫn làm việc theo đúng mục tiêu kinh doanh cụ thể.
- **Không bỏ sót sự cố**: Khối "Cần can thiệp" gom toàn bộ đơn tồn đọng và lỗi kỹ thuật vào 1 chỗ, giúp chủ tiệm giải quyết tắc nghẽn trong vòng 30 giây.
- **Linh hoạt cho 2 nhóm người dùng**: Nhân viên mới dùng Lưới Hành trình trực quan; Quản lý lâu năm dùng Chế độ Chuyên gia với dữ liệu thời gian thực.

---

## 5. Quyền truy cập & Phân quyền (RBAC)

- **Đường dẫn**: `/` (Yêu cầu đăng nhập hợp lệ).
- **Vai trò áp dụng**: Mọi tài khoản nhân viên tiệm hoa (`store_manager`, `sales`, `florist`).
- **Phân luồng tự động theo Session**:
  - Tài khoản tiệm hoa đơn lẻ (`ORGANIZATION`): Hiển thị `StoreJourneyHome` hoặc `StoreGrowthCenter`.
  - Tài khoản mạng lưới đối tác (`NETWORK`): Tự chuyển hướng sang `NetworkJourneyHome`.
  - Quản trị viên sàn / Điều phối: Tự chuyển hướng về màn `/dieu-phoi` hoặc `/van-hanh`.

---

## 6. Mối liên kết với các mục khác trong hệ thống

- 🔗 **Liên kết đến Thẻ Chào (`/the-chao`)**: Thẻ hành trình chính mở trên Production.
- 🔗 **Liên kết đến Đơn Hàng (`/don-hang`)**: Nhấp vào đơn nháp cần can thiệp để mở chi tiết đơn hàng.
- 🔗 **Liên kết đến Sản Phẩm & Giá (`/san-pham`)**: Danh sách 5 sản phẩm gần nhất dẫn sang trang quản trị danh mục.
- 🔗 **Liên kết đến Duyệt kết quả (`/duyet`)**: Xử lý các job AI cần xác nhận.

---

## 7. Trạng thái hoàn thiện & Hạn chế trên Production

- **Trạng thái**: Hoàn thiện 100% về kiến trúc Journey và cơ chế chuyển đổi chế độ chuyên gia.
- **Hạn chế Production**:
  - 13/14 thẻ hành trình hiện đang gắn nhãn *"Sắp ra mắt"* theo chính sách rollout từng giai đoạn của FloraOS Production (tập trung tối đa cho tính năng Thẻ Chào A6 và Bán hàng).
  - Khối biểu đồ doanh thu chi tiết được ẩn ở chế độ hành trình để tối ưu tốc độ tải trang.
