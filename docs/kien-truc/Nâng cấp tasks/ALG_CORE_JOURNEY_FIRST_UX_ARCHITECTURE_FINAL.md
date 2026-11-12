# ALG CORE — KIẾN TRÚC LAYOUT VÀ JOURNEY-FIRST UX

> **Mã tài liệu:** `ALG-UX-ARCHITECTURE-3-ROLES-FINAL`  
> **Phiên bản:** `1.0`  
> **Ngày:** 30/09/2026  
> **Phạm vi:** `Platform Admin` · `Store Admin` · `Điện hoa Admin`  
> **Mục đích:** Tài liệu đặc tả kiến trúc giao diện để AI coding agent thực thi.

---

# 1. MỤC TIÊU

FloraOS Core sử dụng một triết lý UX thống nhất cho cả 3 role:

> **Không bắt người dùng đi tìm chức năng. Người dùng chọn điều họ muốn làm. FloraOS dẫn họ đi qua đúng journey.**

Ba role có phạm vi và mục tiêu nghiệp vụ khác nhau.

Cách người dùng bắt đầu công việc và cách hệ thống dẫn dắt họ phải nhất quán.

Ba role là:

1. `Platform Admin` — quản trị sản phẩm SaaS FloraOS.
2. `Store Admin` — làm việc và tăng trưởng cho một cửa hàng.
3. `Điện hoa Admin` — điều hành hoạt động kinh doanh trên mạng lưới đối tác shop.

---

# 2. NGUYÊN TẮC KIẾN TRÚC BẤT BIẾN

## 2.1. Journey-first

Trang chủ của mỗi role phải trả lời:

> **“Bạn muốn làm gì?”**

Không lấy danh sách module làm trung tâm.

Không bắt người dùng phải hiểu cấu trúc kỹ thuật của hệ thống.

Không yêu cầu người dùng mở nhiều màn hình để hoàn thành một công việc.

---

## 2.2. Progressive Disclosure

Chỉ hiển thị lựa chọn phù hợp với bước hiện tại.

Mô hình:

```text
Mục tiêu
  ↓
Lựa chọn
  ↓
Workspace
  ↓
Báo cáo / Chức năng / Dữ liệu
  ↓
Thao tác
  ↓
Kết quả
  ↓
Việc tiếp theo
```

Không hiển thị toàn bộ hệ thống ngay từ đầu.

---

## 2.3. Kết quả không phải điểm kết thúc

Mỗi kết quả phải có các hành động tiếp theo.

Ví dụ:

```text
Phân tích sản phẩm
        ↓
Kết quả
        ↓
Tạo báo giá
Tạo hình ảnh
Tạo video
Tạo nội dung
Đăng bán
```

Một kết quả có thể trở thành dữ liệu đầu vào cho chức năng tiếp theo.

---

## 2.4. AI nằm trong hành trình

AI không được thiết kế thành một khu vực riêng mà người dùng phải tự tìm.

AI phải xuất hiện ngay trong các công việc.

Ví dụ:

```text
Upload ảnh
    ↓
Phân tích sản phẩm
    ↓
AI đề xuất:
- Tạo mô tả
- Tạo hình ảnh
- Tạo video
- Tạo bài đăng
- Đăng bán
```

---

## 2.5. UX không thay đổi quyền

`role_ux` chỉ quyết định:

- Trang chủ.
- Thứ tự thông tin.
- Điều hướng.
- Journey.
- Hành vi trợ lý AI.

`role_ux` không được tự mở quyền.

Quyền thực tế vẫn phải được kiểm soát bằng `RBAC` và `capabilities` ở giao diện và phía máy chủ.

Nguyên tắc này kế thừa trực tiếp từ kiến trúc Role UX hiện tại của FloraOS. fileciteturn0file0L17-L26

---

# 3. MÔ HÌNH UX CHUNG CHO 3 ROLE

Cả 3 role dùng cùng một mô hình:

```text
                 ALG JOURNEY-FIRST UX
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
 PLATFORM ADMIN       STORE ADMIN       ĐIỆN HOA ADMIN
        │                  │                  │
        ▼                  ▼                  ▼
  Mục tiêu quản trị    Mục tiêu cửa hàng   Mục tiêu mạng lưới
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                    USER CHỌN VIỆC
                           ↓
                 ALG MỞ LỰA CHỌN
                           ↓
                      WORKSPACE
                           ↓
                    USER JOURNEY
                           ↓
                       KẾT QUẢ
                           ↓
                    VIỆC TIẾP THEO
```

Khác biệt giữa 3 role nằm ở:

- Phạm vi dữ liệu.
- Mục tiêu nghiệp vụ.
- Các lựa chọn ban đầu.
- Các chức năng.
- Quy trình.
- Quyền hạn.

Không khác biệt ở triết lý UX.

---

# 4. SHELL GIAO DIỆN CHUNG

Mỗi role có một shell riêng để thể hiện đúng phạm vi.

Nhưng cấu trúc trải nghiệm phải thống nhất.

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo / Tên hệ thống | Phạm vi | Tìm kiếm | Thông báo | User │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    JOURNEY WORKSPACE                         │
│                                                              │
│  ← Quay lại                                                  │
│                                                              │
│  Mục tiêu hiện tại                                           │
│  ↓                                                           │
│  Các lựa chọn                                                │
│  ↓                                                           │
│  Dữ liệu / Chức năng                                         │
│  ↓                                                           │
│  Đang thực hiện                                              │
│  ↓                                                           │
│  Kết quả                                                     │
│  ↓                                                           │
│  Việc tiếp theo                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Thanh điều hướng có thể tồn tại để hỗ trợ truy cập nhanh.

Nhưng thanh điều hướng không được trở thành cách sử dụng chính.

---

# 5. PLATFORM ADMIN

## 5.1. Vai trò

`Platform Admin` quản trị **sản phẩm SaaS FloraOS**.

Không phải quản trị một cửa hàng.

Không phải quản trị hoạt động điện hoa.

Platform Admin phải quản lý được:

- Tổ chức.
- Người dùng.
- Gói dịch vụ.
- Tính năng.
- AI và Credit.
- Tích hợp.
- Báo cáo.
- Hệ thống.
- Bảo mật.
- Chính sách.
- Cấu hình.

Tài liệu hiện tại xác định Platform Admin thuộc phạm vi `PLATFORM` và quản trị xuyên tổ chức. fileciteturn0file0L17-L26

---

## 5.2. Câu hỏi trang chủ

> **Bạn muốn làm gì với FloraOS?**

---

## 5.3. Trang chủ

```text
┌──────────────────────────────────────────────────────────────┐
│                 BẠN MUỐN LÀM GÌ?                             │
│                                                              │
│  📊 Xem báo cáo              🏢 Quản lý tổ chức              │
│  👤 Quản lý người dùng       💳 Quản lý gói dịch vụ         │
│  🧩 Quản lý tính năng        🤖 AI & Credit                  │
│  🔌 Quản lý tích hợp         ❤️ Sức khỏe hệ thống            │
│  ⚙️ Cài đặt hệ thống         🛡️ Quản trị & bảo mật           │
└──────────────────────────────────────────────────────────────┘
```

Đây là điểm khởi đầu.

Không hiển thị hàng loạt bảng dữ liệu kỹ thuật trên màn hình đầu nếu user chưa chọn mục tiêu.

---

## 5.4. Journey ví dụ: Xem báo cáo

User chọn:

> **Xem báo cáo**

Hệ thống mở:

```text
BÁO CÁO
│
├── Báo cáo nền tảng
├── Báo cáo người dùng
├── Báo cáo tổ chức
├── Báo cáo mức sử dụng
├── Báo cáo AI & Credit
├── Báo cáo doanh thu
└── Báo cáo tăng trưởng
```

User chọn:

> **Báo cáo AI & Credit**

Hệ thống tiếp tục:

```text
Chọn thời gian
      ↓
Chọn phạm vi
      ↓
Chọn tổ chức
      ↓
Chọn tính năng
      ↓
Xem báo cáo
      ↓
Drill-down
      ↓
Phân tích
      ↓
Hành động tiếp theo
```

Hành động tiếp theo có thể là:

- Xem tổ chức.
- Xem tính năng.
- Kiểm tra cấu hình.
- Kiểm tra mức dùng.
- Điều chỉnh hạn mức.

---

## 5.5. Journey ví dụ: Cài đặt hệ thống

```text
Cài đặt hệ thống
      ↓
Chọn nhóm cấu hình
      ↓
Xem cấu hình hiện tại
      ↓
Chọn cấu hình cần thay đổi
      ↓
Thay đổi
      ↓
Xem trước tác động
      ↓
Xác nhận
      ↓
Áp dụng
      ↓
Kiểm tra kết quả
```

Không đưa tất cả cấu hình vào một trang dài.

---

## 5.6. Journey ví dụ: Sức khỏe hệ thống

```text
Sức khỏe hệ thống
      ↓
Tổng quan trạng thái
      ↓
Chọn thành phần
      ↓
API / Worker / AI / Job / Tích hợp
      ↓
Xem lỗi
      ↓
Xem chi tiết
      ↓
Xử lý
      ↓
Kiểm tra lại
```

---

# 6. STORE ADMIN

## 6.1. Vai trò

`Store Admin` làm việc với **một cửa hàng**.

Mục tiêu chính là giúp chủ shop hoàn thành công việc nhanh nhất.

Không thiết kế theo mô hình ERP hoặc POS truyền thống.

Không đặt KPI và dashboard làm trung tâm.

---

# 7. BA CÁCH BẮT ĐẦU CỦA STORE ADMIN

Store Admin có 3 cách bắt đầu.

## 7.1. Chức năng đơn

Ví dụ:

- Phân tích sản phẩm.
- Tạo báo giá.
- Tạo hình ảnh.
- Tạo video.
- Viết bài.
- Tạo catalog.
- Tạo landing page.
- Tạo quảng cáo.
- Tìm sản phẩm.
- Tạo đơn hàng.

---

## 7.2. Combo chức năng

Ví dụ:

> **Ra mắt sản phẩm**

```text
Phân tích sản phẩm
      ↓
Tạo tên và mô tả
      ↓
Tạo hình ảnh
      ↓
Tạo video
      ↓
Viết bài
      ↓
Đăng lên nền tảng
```

User có thể:

- Chạy toàn bộ.
- Bỏ bước.
- Chỉnh sửa.
- Xem từng bước.

---

## 7.3. Chuỗi AI tự đề xuất

Đây là cơ chế AI-native quan trọng.

Ví dụ user chỉ upload một ảnh sản phẩm.

FloraOS nhận diện dữ liệu đầu vào và đề xuất:

```text
Ảnh sản phẩm
      ↓
Phân tích sản phẩm
      ↓
Tạo mô tả
      ↓
Tạo hình ảnh biến thể
      ↓
Tạo video
      ↓
Tạo bài đăng
      ↓
Đăng lên nền tảng đã chọn
```

User chọn:

> **Chạy toàn bộ**

hoặc:

> **Xem và chỉnh sửa**

---

# 8. STORE ACTION WORKSPACE

Mọi chức năng phải dùng một mẫu hành trình thống nhất:

```text
CHỌN CHỨC NĂNG
      ↓
NHẬP / UPLOAD DỮ LIỆU
      ↓
XÁC NHẬN
      ↓
TIẾN HÀNH
      ↓
AI ĐANG THỰC HIỆN
      ↓
KẾT QUẢ
      ↓
VIỆC TIẾP THEO
```

Ví dụ:

```text
Ảnh sản phẩm
      ↓
Phân tích
      ↓
Kết quả
      ↓
┌──────────────────────────────┐
│ Lưu sản phẩm                 │
│ Tạo báo giá                  │
│ Tạo hình ảnh                 │
│ Tạo video                    │
│ Tạo nội dung                 │
│ Đăng bán                     │
└──────────────────────────────┘
```

---

# 9. ĐIỆN HOA ADMIN

## 9.1. Vai trò

`Điện hoa Admin` điều hành **mạng lưới đối tác shop**.

Đây không phải là `Chain Admin` theo mô hình nhiều chi nhánh cũ.

Phạm vi là:

```text
Toàn mạng lưới
   ↓
Khu vực
   ↓
Đối tác
   ↓
Sản phẩm
   ↓
Đơn hàng
```

Tài liệu cũ mô tả Chain Admin theo Central Operations + Branches. Kiến trúc này không được dùng làm mô hình chính cho Điện hoa Admin mới. fileciteturn0file0L117-L160

---

# 10. CÂU HỎI TRANG CHỦ

> **Bạn muốn làm gì cho hoạt động điện hoa?**

---

# 11. LỰA CHỌN BAN ĐẦU

```text
┌──────────────────────────────────────────────────────────────┐
│                 BẠN MUỐN LÀM GÌ?                             │
│                                                              │
│  📊 Báo cáo toàn hệ thống                                    │
│  🌸 Quản lý sản phẩm                                         │
│  💰 Bán hàng                                                 │
│  🚚 Điều phối                                                │
│  🤝 Quản lý đối tác                                          │
│  👥 CRM & CSKH                                               │
│  📣 Marketing                                                │
│  💵 Tài chính                                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 12. JOURNEY BÁN HÀNG

User chọn:

> **Bán hàng**

Hệ thống mở Sales Workspace.

```text
BÁN HÀNG
│
├── 📊 Báo cáo bán hàng
│
├── 🔎 Tìm sản phẩm
│
├── 🌸 Phân tích sản phẩm
│
├── 💰 Tạo báo giá
│
├── 💬 Tư vấn khách hàng
│
├── 🧾 Tạo đơn hàng
│
└── 👤 Chăm sóc / Follow-up
```

User chọn:

> **Tạo báo giá**

Journey:

```text
Chọn khách hàng
      ↓
Tìm sản phẩm
      ↓
Chọn sản phẩm
      ↓
Nhập yêu cầu
      ↓
Tạo báo giá
      ↓
Kiểm tra
      ↓
Gửi khách
      ↓
Theo dõi phản hồi
      ↓
Tạo đơn hàng
      ↓
Chuyển Điều phối
```

---

# 13. JOURNEY ĐIỀU PHỐI

User chọn:

> **Điều phối**

Hệ thống mở:

```text
ĐIỀU PHỐI
│
├── 📊 Báo cáo điều phối
├── 🔎 Tìm shop phù hợp
├── 📍 Tìm theo khu vực
├── 🌸 Tìm theo sản phẩm
├── 🏪 Tìm theo năng lực
├── ⭐ Tìm theo chất lượng
├── ⏱️ Tìm theo SLA
├── 🚚 Phân bổ đơn
├── 🔄 Điều chuyển đơn
└── ⚠️ Xử lý ngoại lệ
```

Journey ví dụ:

```text
Đơn hàng
      ↓
Kiểm tra thông tin
      ↓
Kiểm tra sản phẩm
      ↓
Tìm shop phù hợp
      ↓
Kiểm tra năng lực
      ↓
Kiểm tra chất lượng
      ↓
Kiểm tra SLA
      ↓
Chọn shop
      ↓
Giao đơn
      ↓
Theo dõi
      ↓
Xác nhận hoàn tất
```

---

# 14. JOURNEY QUẢN LÝ SẢN PHẨM

User chọn:

> **Quản lý sản phẩm**

Hệ thống có thể mở:

```text
QUẢN LÝ SẢN PHẨM
│
├── 📊 Báo cáo sản phẩm
├── 🔎 Tìm sản phẩm
├── 🌸 Phân tích sản phẩm
├── 💰 Phân tích giá
├── 📝 Tạo mô tả
├── 🖼️ Tạo hình ảnh
├── 🎬 Tạo video
├── 📚 Quản lý danh mục
└── 🤖 AI đề xuất sản phẩm
```

---

# 15. JOURNEY QUẢN LÝ ĐỐI TÁC

User chọn:

> **Quản lý đối tác**

Hệ thống mở:

```text
QUẢN LÝ ĐỐI TÁC
│
├── 📊 Báo cáo đối tác
├── 🔎 Tìm đối tác
├── 👤 Hồ sơ đối tác
├── 🌸 Năng lực sản phẩm
├── 📍 Khu vực phục vụ
├── 💰 Giá
├── ⏱️ SLA
├── ⭐ Chất lượng
├── 📈 Hiệu suất
└── 🚚 Phân bổ đơn
```

Mọi thông tin phải dẫn được tới hành động tiếp theo.

---

# 16. HỆ THỐNG WORKSPACE

Mỗi lựa chọn cấp cao phải tạo một Workspace phù hợp.

Cấu trúc chung:

```text
WORKSPACE
│
├── Tổng quan
│
├── Báo cáo
│
├── Chức năng
│
├── Dữ liệu liên quan
│
└── Việc cần làm
```

Không nhất thiết phải hiển thị cả 5 khu vực cùng lúc.

Hệ thống phải ưu tiên theo journey hiện tại.

---

# 17. JOURNEY ENGINE

Ba role nên dùng cùng một mô hình dữ liệu cho journey.

Một journey gồm:

```text
Journey
├── Mục tiêu
├── Bước hiện tại
├── Lựa chọn
├── Input
├── Điều kiện
├── Hành động
├── Trạng thái
├── Output
└── Next Actions
```

Ví dụ:

```text
goal = "Tạo báo giá"

step_1 = chọn khách hàng
step_2 = tìm sản phẩm
step_3 = nhập yêu cầu
step_4 = tạo báo giá
step_5 = kiểm tra
step_6 = gửi khách
step_7 = follow-up
step_8 = tạo đơn
```

---

# 18. TRẠNG THÁI JOURNEY

Mỗi bước phải có trạng thái rõ ràng.

```text
LOCKED
↓
AVAILABLE
↓
INPUT_REQUIRED
↓
READY
↓
PROCESSING
↓
COMPLETED
↓
FAILED
↓
RETRY
```

UI phải phản ánh trạng thái.

Không cho user thực hiện bước chưa đủ điều kiện.

---

# 19. ACTION CONTRACT

Mọi chức năng phải tuân thủ cùng một hợp đồng:

### Bước 1 — Chọn

User chọn chức năng hoặc workflow.

### Bước 2 — Input

User cung cấp dữ liệu.

Có thể là:

- Ảnh.
- Video.
- Tài liệu.
- Văn bản.
- Sản phẩm.
- Khách hàng.
- Đơn hàng.
- Cấu hình.

### Bước 3 — Xác nhận

User kiểm tra input.

### Bước 4 — Tiến hành

User bấm:

> **Tiến hành**

### Bước 5 — Xử lý

Hệ thống hiển thị tiến trình.

### Bước 6 — Kết quả

Hiển thị output.

### Bước 7 — Việc tiếp theo

Hiển thị các hành động có thể thực hiện.

---

# 20. AI WORKFLOW CONTRACT

AI Workflow phải có:

```text
Trigger
  ↓
Input
  ↓
Step 1
  ↓
Step 2
  ↓
Step 3
  ↓
...
  ↓
Output
  ↓
Next Actions
```

AI có thể tự đề xuất workflow khi có đủ ngữ cảnh.

Ví dụ:

```text
Input:
Ảnh sản phẩm mới

AI đề xuất:
1. Phân tích sản phẩm
2. Tạo mô tả
3. Tạo hình ảnh
4. Tạo video
5. Viết bài
6. Đăng bài
```

User vẫn phải có quyền:

- Chạy toàn bộ.
- Xem trước.
- Chỉnh sửa.
- Bỏ bước.
- Dừng workflow.

---

# 21. ĐIỀU HƯỚNG

Điều hướng không bị loại bỏ.

Nhưng điều hướng là lớp hỗ trợ.

Mô hình ưu tiên:

```text
HOME
 ↓
MỤC TIÊU
 ↓
WORKSPACE
 ↓
JOURNEY
```

Không phải:

```text
SIDEBAR
 ↓
MODULE
 ↓
SUBMODULE
 ↓
SCREEN
 ↓
FUNCTION
```

Sidebar chỉ dùng để:

- Quay về trang chủ.
- Truy cập nhanh.
- Xem kết quả.
- Mở khu vực thường dùng.
- Cài đặt.

---

# 22. ANTI-PATTERN

AI coding agent không được triển khai các kiểu sau nếu không có lý do rõ ràng.

## 22.1. Dashboard-first

Không biến trang chủ thành một bảng KPI lớn.

## 22.2. Module-first

Không bắt user chọn module kỹ thuật trước khi biết họ muốn làm gì.

## 22.3. Menu-first

Không tạo sidebar dài rồi xem đó là UX chính.

## 22.4. AI-isolated

Không tạo một mục “AI” riêng cho toàn bộ AI.

AI phải nằm trong các chức năng và journey.

## 22.5. Result-dead-end

Không để kết quả kết thúc workflow mà không có hành động tiếp theo.

## 22.6. Technical-first

Không hiển thị agent, model, API, worker hoặc pipeline kỹ thuật cho user cuối nếu không cần.

## 22.7. Permission leakage

Không để UX mở quyền mà `capabilities` không cho phép.

---

# 23. ACCEPTANCE CRITERIA CHUNG

## 23.1. Platform Admin

- [ ] Trang đầu hỏi user muốn làm gì.
- [ ] Có lựa chọn Báo cáo.
- [ ] Có lựa chọn Quản lý tổ chức.
- [ ] Có lựa chọn Người dùng.
- [ ] Có lựa chọn Gói dịch vụ.
- [ ] Có lựa chọn Tính năng.
- [ ] Có lựa chọn AI & Credit.
- [ ] Có lựa chọn Tích hợp.
- [ ] Có lựa chọn Cài đặt.
- [ ] Có lựa chọn Sức khỏe hệ thống.
- [ ] Sau mỗi lựa chọn, hệ thống mở đúng journey.
- [ ] Báo cáo có thể drill-down.
- [ ] Cấu hình có bước kiểm tra và xác nhận.
- [ ] Không biến trang đầu thành dashboard KPI.

## 23.2. Store Admin

- [ ] Trang đầu hỏi user muốn làm gì.
- [ ] Có chức năng đơn.
- [ ] Có Combo.
- [ ] Có AI Workflow đề xuất.
- [ ] Có upload/input.
- [ ] Có nút Tiến hành.
- [ ] Có trạng thái xử lý.
- [ ] Có kết quả.
- [ ] Có Next Actions.
- [ ] Output có thể trở thành input cho chức năng tiếp theo.
- [ ] User có thể chạy workflow nhiều bước.
- [ ] User có thể xem và chỉnh workflow trước khi chạy.

## 23.3. Điện hoa Admin

- [ ] Trang đầu hỏi user muốn làm gì.
- [ ] Có Báo cáo.
- [ ] Có Quản lý sản phẩm.
- [ ] Có Bán hàng.
- [ ] Có Điều phối.
- [ ] Có Quản lý đối tác.
- [ ] Có CRM & CSKH.
- [ ] Có Marketing.
- [ ] Có Tài chính nếu phạm vi sản phẩm bao gồm.
- [ ] Chọn Bán hàng phải mở Sales Workspace.
- [ ] Sales Workspace có báo cáo và chức năng liên quan.
- [ ] Chọn Điều phối phải mở Coordination Workspace.
- [ ] Có journey từ đơn hàng đến giao shop.
- [ ] Có tìm shop theo khu vực, sản phẩm, năng lực, chất lượng và SLA.
- [ ] Không triển khai theo mô hình Chain Admin nhiều chi nhánh cũ.

---

# 24. KIẾN TRÚC THÀNH PHẦN ĐỀ XUẤT

AI coding agent nên tổ chức các thành phần theo hướng tái sử dụng.

```text
Journey Engine
├── JourneyShell
├── JourneyHeader
├── JourneyStep
├── JourneyProgress
├── ChoiceGrid
├── ActionCard
├── InputPanel
├── ProcessingPanel
├── ResultPanel
├── NextActions
└── WorkflowPreview
```

Các thành phần nghiệp vụ nằm phía trên:

```text
Platform
├── PlatformHome
├── ReportWorkspace
├── OrganizationWorkspace
├── SystemSettingsWorkspace
└── SystemHealthWorkspace

Store
├── StoreHome
├── FunctionWorkspace
├── ComboWorkspace
├── AIWorkflowWorkspace
└── ResultWorkspace

Điện hoa
├── NetworkHome
├── SalesWorkspace
├── CoordinationWorkspace
├── ProductWorkspace
├── PartnerWorkspace
├── CRMWorkspace
└── MarketingWorkspace
```

Không tạo ba bộ Journey Engine khác nhau nếu logic có thể dùng chung.

---

# 25. NGUYÊN TẮC RESPONSIVE

Journey phải hoạt động tốt trên:

- Máy tính.
- Máy tính bảng.
- Điện thoại nếu màn hình nghiệp vụ hỗ trợ.

Trên màn hình nhỏ:

```text
Mục tiêu
 ↓
Lựa chọn
 ↓
Input
 ↓
Tiến hành
 ↓
Tiến trình
 ↓
Kết quả
 ↓
Next Actions
```

Không cố giữ layout nhiều cột nếu làm mất sự rõ ràng của journey.

---

# 26. NGUYÊN TẮC NGÔN NGỮ

Giao diện người dùng phải sử dụng **100% tiếng Việt**.

Không dùng thuật ngữ kỹ thuật nếu người dùng không cần biết.

Ví dụ:

Không ưu tiên:

> `Workflow Processing Pipeline`

Nên dùng:

> **Quy trình đang thực hiện**

Không ưu tiên:

> `Next Action`

Nên hiển thị:

> **Bạn có thể làm tiếp**

Tên code có thể giữ nguyên trong mã nguồn.

---

# 27. KẾT LUẬN KIẾN TRÚC

FloraOS Core phải có một triết lý UX chung:

> **USER CHỌN ĐIỀU MUỐN LÀM → ALG MỞ ĐÚNG LỰA CHỌN → USER TIẾN THEO JOURNEY → NHẬN KẾT QUẢ → ALG ĐỀ XUẤT VIỆC TIẾP THEO.**

Ba role chỉ khác nhau ở phạm vi:

```text
PLATFORM ADMIN
Quản trị FloraOS
        ↓
"Bạn muốn làm gì với FloraOS?"

STORE ADMIN
Làm việc cho một cửa hàng
        ↓
"Bạn muốn làm gì cho cửa hàng?"

ĐIỆN HOA ADMIN
Điều hành mạng lưới điện hoa
        ↓
"Bạn muốn làm gì cho hoạt động điện hoa?"
```

Đây là **kiến trúc UX chuẩn cho FloraOS Core**.

Mục tiêu cuối cùng không phải là xây một hệ thống có nhiều màn hình.

Mục tiêu là xây một hệ thống biết:

> **Người dùng muốn làm gì → cần dữ liệu gì → cần chức năng gì → đang ở bước nào → kết quả là gì → việc tiếp theo là gì.**

FloraOS phải dẫn người dùng đi qua công việc thay vì bắt người dùng tự tìm đường trong phần mềm.
