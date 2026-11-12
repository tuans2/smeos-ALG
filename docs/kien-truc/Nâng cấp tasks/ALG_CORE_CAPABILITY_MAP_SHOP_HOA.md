# ALG CORE — CAPABILITY MAP CHỨC NĂNG CHO SHOP HOA

> **Mã:** `ALG-CAPABILITY-MAP-STORE-01`  
> **Phiên bản:** `1.0`  
> **Ngày:** 30/09/2026  
> **Mục đích:** Danh mục chức năng chuẩn để thiết kế UX, xây Journey, AI Workflow và làm cơ sở cho AI coding agent.

## 1. Nguyên tắc

Đây là **bản đồ năng lực sản phẩm**, không phải danh sách xác nhận tất cả chức năng đã có trong mã nguồn.

Mỗi chức năng phải được đối chiếu với code trước khi đánh dấu trạng thái.

Trạng thái:
- `ĐÃ CÓ`: Có bằng chứng rõ trong mã nguồn.
- `ĐANG CÓ`: Đã có một phần.
- `CHƯA CÓ`: Chưa có bằng chứng triển khai.
- `CẦN XÁC MINH`: Chưa đủ thông tin.

## 2. Mười nhóm chức năng chính

1. Sản phẩm
2. Bán hàng
3. Hình ảnh
4. Video
5. Nội dung
6. Marketing
7. Kênh bán hàng & hiện diện số
8. Khách hàng & CRM
9. Đơn hàng
10. Báo cáo & phân tích

Ba lớp xuyên suốt:
11. Combo chức năng
12. AI Workflow
13. FloraOS đề xuất

---

# 3. SẢN PHẨM

**Mục tiêu:** Biến ảnh, ý tưởng hoặc dữ liệu thô thành sản phẩm có thông tin đầy đủ và có thể bán.

| ID | Chức năng | Input chính | Output chính |
|---|---|---|---|
| SP-01 | Phân tích ảnh sản phẩm | Ảnh | Thông tin sản phẩm |
| SP-02 | Nhận diện loại hoa | Ảnh | Loại hoa |
| SP-03 | Nhận diện phụ kiện | Ảnh | Phụ kiện |
| SP-04 | Đếm số lượng thành phần | Ảnh | Thành phần + số lượng |
| SP-05 | Phân tích cấu trúc bó hoa | Ảnh | Cấu trúc |
| SP-06 | Tách thành phần sản phẩm | Ảnh | Danh sách thành phần |
| SP-07 | Tạo tên sản phẩm | Dữ liệu sản phẩm | Tên |
| SP-08 | Tạo mô tả sản phẩm | Dữ liệu sản phẩm | Mô tả |
| SP-09 | Tạo thông tin sản phẩm | Dữ liệu phân tích | Hồ sơ sản phẩm |
| SP-10 | Tạo sản phẩm mới | Thông tin sản phẩm | Sản phẩm |
| SP-11 | Chỉnh sửa sản phẩm | Sản phẩm | Sản phẩm cập nhật |
| SP-12 | Phân loại sản phẩm | Sản phẩm | Danh mục |
| SP-13 | Gắn sản phẩm vào danh mục | Sản phẩm + danh mục | Sản phẩm được phân loại |
| SP-14 | Tạo biến thể sản phẩm | Sản phẩm gốc | Biến thể |
| SP-15 | Định giá sản phẩm | Sản phẩm + chi phí | Giá |
| SP-16 | Phân tích giá sản phẩm | Dữ liệu giá | Phân tích |
| SP-17 | Gợi ý giá bán | Sản phẩm + dữ liệu | Giá đề xuất |
| SP-18 | Tìm sản phẩm tương tự | Sản phẩm/ảnh | Sản phẩm tương tự |
| SP-19 | Tìm sản phẩm theo nhu cầu khách | Nhu cầu | Sản phẩm phù hợp |

---

# 4. BÁN HÀNG

**Mục tiêu:** Đi từ nhu cầu khách đến báo giá và đơn hàng.

| ID | Chức năng |
|---|---|
| BH-01 | Tạo báo giá |
| BH-02 | Tạo báo giá từ ảnh sản phẩm |
| BH-03 | Tạo báo giá từ yêu cầu khách |
| BH-04 | Tìm sản phẩm phù hợp ngân sách |
| BH-05 | Gợi ý sản phẩm phù hợp nhu cầu |
| BH-06 | Gợi ý sản phẩm thay thế |
| BH-07 | Tư vấn sản phẩm |
| BH-08 | Tạo nội dung tư vấn bán hàng |
| BH-09 | Chatbot bán hàng |
| BH-10 | Trả lời câu hỏi khách hàng |
| BH-11 | Thu thập nhu cầu khách |
| BH-12 | Theo dõi khách hàng |
| BH-13 | Follow-up khách hàng |
| BH-14 | Tạo đơn hàng |
| BH-15 | Chuyển báo giá thành đơn hàng |
| BH-16 | Chuyển yêu cầu sang điều phối |

---

# 5. HÌNH ẢNH

| ID | Chức năng |
|---|---|
| HA-01 | Tạo hình ảnh sản phẩm |
| HA-02 | Tạo hình ảnh biến thể |
| HA-03 | Tạo ảnh sản phẩm trên nền mới |
| HA-04 | Tạo ảnh theo bối cảnh |
| HA-05 | Tạo ảnh quảng cáo |
| HA-06 | Tạo ảnh Facebook |
| HA-07 | Tạo ảnh Instagram |
| HA-08 | Tạo ảnh website |
| HA-09 | Tạo ảnh catalog |
| HA-10 | Tạo ảnh theo kích thước nền tảng |
| HA-11 | Chỉnh sửa hình ảnh |
| HA-12 | Tạo nhiều phiên bản hình ảnh |
| HA-13 | Tạo hình ảnh từ ảnh sản phẩm gốc |
| HA-14 | Tạo hình ảnh theo phong cách |
| HA-15 | Tạo hình ảnh theo mục tiêu bán hàng |

**Nguyên tắc:** Giữ đặc điểm cốt lõi của sản phẩm gốc nếu người dùng không yêu cầu thay đổi.

---

# 6. VIDEO

| ID | Chức năng |
|---|---|
| VD-01 | Tạo video từ ảnh sản phẩm |
| VD-02 | Tạo video từ nhiều ảnh |
| VD-03 | Tạo video sản phẩm |
| VD-04 | Tạo video bán hàng |
| VD-05 | Tạo video TikTok |
| VD-06 | Tạo video Reels |
| VD-07 | Tạo video Facebook |
| VD-08 | Tạo video quảng cáo |
| VD-09 | Tạo video giới thiệu sản phẩm |
| VD-10 | Tạo video theo mẫu |
| VD-11 | Tạo kịch bản video |
| VD-12 | Tạo lời thoại |
| VD-13 | Tạo phụ đề |
| VD-14 | Tạo nhiều phiên bản video |
| VD-15 | Chỉnh sửa video |
| VD-16 | Tạo video từ nội dung có sẵn |

---

# 7. NỘI DUNG

| ID | Chức năng |
|---|---|
| ND-01 | Viết bài Facebook |
| ND-02 | Viết bài Instagram |
| ND-03 | Viết nội dung website |
| ND-04 | Viết mô tả sản phẩm |
| ND-05 | Viết nội dung quảng cáo |
| ND-06 | Viết nội dung bán hàng |
| ND-07 | Viết tiêu đề |
| ND-08 | Viết nội dung ngắn |
| ND-09 | Viết nội dung dài |
| ND-10 | Viết kịch bản video |
| ND-11 | Viết nội dung theo hình ảnh |
| ND-12 | Viết nội dung theo sản phẩm |
| ND-13 | Viết nội dung theo khách hàng |
| ND-14 | Viết nội dung theo dịp |
| ND-15 | Tạo nhiều phiên bản nội dung |
| ND-16 | Viết lại nội dung |
| ND-17 | Rút gọn nội dung |
| ND-18 | Mở rộng nội dung |

---

# 8. MARKETING

| ID | Chức năng |
|---|---|
| MK-01 | Lập kế hoạch nội dung |
| MK-02 | Tạo lịch đăng bài |
| MK-03 | Tạo chiến dịch marketing |
| MK-04 | Tạo chiến dịch quảng cáo |
| MK-05 | Tạo nội dung chiến dịch |
| MK-06 | Tạo hình ảnh chiến dịch |
| MK-07 | Tạo video chiến dịch |
| MK-08 | Tạo quảng cáo |
| MK-09 | Tạo nhiều phiên bản quảng cáo |
| MK-10 | Phân tích hiệu quả quảng cáo |
| MK-11 | Đề xuất nội dung tiếp theo |
| MK-12 | Tự động đăng bài |
| MK-13 | Đăng lên nhiều nền tảng |
| MK-14 | Quản lý lịch đăng |
| MK-15 | Tái sử dụng nội dung |
| MK-16 | Tái sử dụng sản phẩm cho nhiều chiến dịch |

---

# 9. KÊNH BÁN HÀNG & HIỆN DIỆN SỐ

| ID | Chức năng |
|---|---|
| KB-01 | Tạo landing page |
| KB-02 | Tạo trang sản phẩm |
| KB-03 | Tạo catalog |
| KB-04 | Tạo catalog từ sản phẩm |
| KB-05 | Cập nhật catalog |
| KB-06 | Quản lý danh mục |
| KB-07 | Quản lý nội dung website |
| KB-08 | Đồng bộ sản phẩm lên kênh bán |
| KB-09 | Quản lý nội dung các kênh |
| KB-10 | Xuất bản sản phẩm |
| KB-11 | Đăng sản phẩm |
| KB-12 | Đăng bài |
| KB-13 | Quản lý nền tảng đã kết nối |

---

# 10. KHÁCH HÀNG & CRM

| ID | Chức năng |
|---|---|
| CRM-01 | Tạo hồ sơ khách hàng |
| CRM-02 | Lưu thông tin khách hàng |
| CRM-03 | Phân loại khách hàng |
| CRM-04 | Phân tích khách hàng |
| CRM-05 | Phân tích lịch sử mua hàng |
| CRM-06 | Phân nhóm khách hàng |
| CRM-07 | Tìm khách hàng |
| CRM-08 | Theo dõi khách hàng |
| CRM-09 | Nhắc follow-up |
| CRM-10 | Chăm sóc khách hàng |
| CRM-11 | Tạo nội dung chăm sóc |
| CRM-12 | Gợi ý sản phẩm cho khách |
| CRM-13 | Gợi ý thời điểm chăm sóc |
| CRM-14 | Chatbot chăm sóc khách hàng |
| CRM-15 | Theo dõi trạng thái khách hàng |

---

# 11. ĐƠN HÀNG

| ID | Chức năng |
|---|---|
| DH-01 | Tạo đơn hàng |
| DH-02 | Tạo đơn từ báo giá |
| DH-03 | Tạo đơn từ cuộc trò chuyện |
| DH-04 | Tạo đơn từ chatbot |
| DH-05 | Xem đơn hàng |
| DH-06 | Chỉnh sửa đơn hàng |
| DH-07 | Theo dõi trạng thái đơn |
| DH-08 | Theo dõi tiến trình đơn |
| DH-09 | Lưu thông tin giao hàng |
| DH-10 | Gửi thông tin đơn cho khách |
| DH-11 | Chuyển đơn sang điều phối |
| DH-12 | Xử lý ngoại lệ đơn hàng |

---

# 12. BÁO CÁO & PHÂN TÍCH

| ID | Chức năng |
|---|---|
| BC-01 | Báo cáo bán hàng |
| BC-02 | Báo cáo doanh thu |
| BC-03 | Báo cáo sản phẩm |
| BC-04 | Báo cáo khách hàng |
| BC-05 | Báo cáo marketing |
| BC-06 | Báo cáo nội dung |
| BC-07 | Báo cáo quảng cáo |
| BC-08 | Báo cáo hiệu quả từng kênh |
| BC-09 | Báo cáo sản phẩm bán chạy |
| BC-10 | Báo cáo sản phẩm chưa hiệu quả |
| BC-11 | Báo cáo khách hàng |
| BC-12 | Báo cáo AI Usage |
| BC-13 | Báo cáo Credit |
| BC-14 | Phân tích xu hướng |
| BC-15 | Phân tích hiệu quả |
| BC-16 | Gợi ý hành động tiếp theo |

Báo cáo phải được mở theo journey, không bắt người dùng xem một dashboard cố định.

---

# 13. COMBO CHỨC NĂNG

## CB-01 — Ra mắt sản phẩm

```text
Phân tích sản phẩm
↓
Tạo tên
↓
Tạo mô tả
↓
Định giá
↓
Tạo hình ảnh
↓
Tạo video
↓
Viết bài
↓
Đăng bán
```

## CB-02 — Bán sản phẩm

```text
Chọn sản phẩm
↓
Tạo nội dung bán hàng
↓
Tạo hình ảnh
↓
Tạo video
↓
Tạo quảng cáo
↓
Xuất bản
```

## CB-03 — Tạo nội dung

```text
Chọn sản phẩm
↓
Tạo bài viết
↓
Tạo hình ảnh
↓
Tạo video
↓
Lập lịch
↓
Đăng
```

## CB-04 — Tư vấn và chốt đơn

```text
Nhận yêu cầu
↓
Phân tích nhu cầu
↓
Tìm sản phẩm
↓
Tư vấn
↓
Tạo báo giá
↓
Follow-up
↓
Tạo đơn
```

## CB-05 — Tạo catalog

```text
Chọn sản phẩm
↓
Phân loại
↓
Tạo mô tả
↓
Tạo hình ảnh
↓
Tạo catalog
↓
Xuất bản
```

---

# 14. AI WORKFLOW

## WF-01 — Từ ảnh đến sản phẩm

```text
Upload ảnh
↓
Phân tích ảnh
↓
Nhận diện hoa
↓
Nhận diện phụ kiện
↓
Đếm thành phần
↓
Tạo tên
↓
Tạo mô tả
↓
Định giá
↓
Tạo sản phẩm
```

## WF-02 — Từ ảnh đến nội dung

```text
Upload ảnh
↓
Phân tích sản phẩm
↓
Tạo nội dung
↓
Tạo hình ảnh
↓
Tạo video
↓
Đăng bài
```

## WF-03 — Từ ảnh đến bán hàng

```text
Upload ảnh
↓
Phân tích sản phẩm
↓
Tạo sản phẩm
↓
Định giá
↓
Tạo báo giá
↓
Tạo nội dung
↓
Đăng bán
```

## WF-04 — Từ yêu cầu khách đến đơn hàng

```text
Yêu cầu khách
↓
Phân tích nhu cầu
↓
Tìm sản phẩm
↓
Gợi ý sản phẩm
↓
Tạo báo giá
↓
Gửi khách
↓
Follow-up
↓
Tạo đơn
```

## WF-05 — Tạo chiến dịch sản phẩm

```text
Chọn sản phẩm
↓
Xác định mục tiêu
↓
Tạo nội dung
↓
Tạo hình ảnh
↓
Tạo video
↓
Tạo quảng cáo
↓
Xuất bản
↓
Theo dõi kết quả
```

---

# 15. ALG ĐỀ XUẤT

FloraOS có thể đề xuất hành động dựa trên:

- Dữ liệu người dùng vừa nhập.
- Sản phẩm.
- Khách hàng.
- Kết quả vừa tạo.
- Lịch sử thao tác.
- Trạng thái công việc.
- Các chức năng có thể thực hiện tiếp.

Ví dụ:

```text
Bạn vừa tải lên một sản phẩm mới.

FloraOS đề xuất:

✓ Phân tích sản phẩm
✓ Tạo tên và mô tả
✓ Tạo hình ảnh
✓ Tạo video
✓ Viết bài
→ Đăng lên Facebook và Instagram
```

Người dùng có thể:
- Chạy toàn bộ.
- Xem quy trình.
- Chỉnh sửa.
- Bỏ bước.
- Dừng.
- Thực hiện từng bước.

---

# 16. KẾT QUẢ & HÀNH ĐỘNG TIẾP THEO

Các loại kết quả:

- Sản phẩm.
- Hình ảnh.
- Video.
- Bài viết.
- Báo giá.
- Catalog.
- Landing page.
- Quảng cáo.
- Khách hàng.
- Đơn hàng.
- Workflow.

Mỗi kết quả nên hỗ trợ:

```text
Lưu
Chỉnh sửa
Tạo lại
Tạo tiếp
Đăng
Gửi
Tạo báo giá
Tạo đơn
Dùng làm input
```

---

# 17. NGUYÊN TẮC LIÊN KẾT

Các chức năng không được thiết kế như công cụ rời rạc.

Ví dụ:

```text
Ảnh sản phẩm
↓
Phân tích sản phẩm
↓
Sản phẩm
↓
Báo giá
↓
Hình ảnh
↓
Video
↓
Nội dung
↓
Marketing
↓
Khách hàng
↓
Đơn hàng
```

Một chức năng phải có khả năng tạo dữ liệu cho chức năng khác khi phù hợp.

---

# 18. CẤU TRÚC TRÊN STORE ADMIN

Trang chủ chỉ hiển thị nhóm chức năng:

```text
SẢN PHẨM
BÁN HÀNG
HÌNH ẢNH
VIDEO
NỘI DUNG
MARKETING
KÊNH BÁN HÀNG
KHÁCH HÀNG
ĐƠN HÀNG
BÁO CÁO

⚡ COMBO
🤖 ALG ĐỀ XUẤT
```

Khi người dùng chọn nhóm, hệ thống mới hiển thị các chức năng bên trong.

---

# 19. HỢP ĐỒNG CHỨC NĂNG CHO AI AGENT

Mỗi chức năng cần được quản lý với các trường:

```text
ID
Tên
Nhóm
Mục tiêu
Scope
Input
Output
Dependencies
Next Actions
AI Support
Workflow Support
Capability Required
Trạng thái triển khai
```

Ví dụ:

```text
ID:
SP-01

Tên:
Phân tích ảnh sản phẩm

Nhóm:
Sản phẩm

Input:
Ảnh sản phẩm

Output:
- Loại hoa
- Phụ kiện
- Thành phần
- Số lượng
- Mô tả

Next Actions:
- Tạo sản phẩm
- Tạo báo giá
- Tạo hình ảnh
- Tạo video
- Tạo nội dung

AI Support:
Có

Workflow Support:
Có

Capability:
Cần xác định theo hệ thống quyền hiện tại

Trạng thái:
CẦN XÁC MINH
```

---

# 20. NGUYÊN TẮC KHÔNG ĐƯỢC VI PHẠM

1. Không biến danh sách chức năng thành một menu khổng lồ.
2. Không bắt người dùng hiểu agent hoặc mô hình AI.
3. Không tạo khu vực AI riêng nếu AI có thể nằm trực tiếp trong journey.
4. Không kết thúc workflow tại kết quả.
5. Luôn có hành động tiếp theo.
6. Không tự mở quyền bằng UX.
7. Không đánh dấu chức năng đã có nếu chưa kiểm tra code.
8. Không tạo workflow cố định nếu workflow phụ thuộc vào dữ liệu thực tế.
9. Cho phép người dùng kiểm tra và chỉnh workflow trước khi chạy khi hành động có tác động lớn.
10. Giữ đặc điểm sản phẩm gốc khi tạo hình ảnh hoặc video nếu người dùng không yêu cầu thay đổi.

---

# 21. MỤC TIÊU CUỐI CÙNG

FloraOS không chỉ cung cấp nhiều chức năng cho shop hoa.

FloraOS phải kết nối các chức năng thành một hệ thống có khả năng dẫn dắt công việc.

```text
USER CÓ NHU CẦU
↓
ALG HIỂU NHU CẦU
↓
CHỌN CHỨC NĂNG / COMBO / AI WORKFLOW
↓
NHẬP DỮ LIỆU
↓
AI THỰC HIỆN
↓
KẾT QUẢ
↓
ALG ĐỀ XUẤT VIỆC TIẾP THEO
↓
KẾT QUẢ MỚI
↓
HOÀN THÀNH MỤC TIÊU
```

> **Mục tiêu cuối cùng: FloraOS trở thành hệ thống AI giúp shop hoa thực hiện công việc từ đầu đến cuối, thay vì chỉ cung cấp một tập hợp công cụ rời rạc.**
