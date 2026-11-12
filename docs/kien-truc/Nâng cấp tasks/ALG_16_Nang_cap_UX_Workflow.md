# FloraOS – 16 Nội dung nâng cấp

> Tài liệu yêu cầu nâng cấp để triển khai bằng vibe coding. Thực hiện lần lượt theo thứ tự #1 → #16. Không tự mở rộng phạm vi. Trước khi code, kiểm tra implementation hiện tại và tận dụng các cơ chế đã có nếu phù hợp.

## #1 — Order Cancellation / Refund

Bổ sung workflow cho các tình huống:
- Hủy đơn
- Hoàn tiền
- Hoàn một phần
- Các trạng thái liên quan khác của Order/Payment

Cơ chế xử lý theo vai trò:

**Sale / Điều phối → Đề xuất → Notification → Điều hành phê duyệt → Thực hiện**

- Sale và Điều phối được phép đề xuất Hủy / Hoàn / Hoàn một phần dựa trên tình hình thực tế của Order.
- Đề xuất phải có lý do, số tiền đề xuất hoàn và ghi chú liên quan.
- Điều hành nhận notification và là người quyết định cuối cùng: **Approve / Reject**.
- Chỉ sau khi được duyệt mới thực hiện thay đổi Order/Payment.
- Lưu lịch sử: người đề xuất, thời điểm, nội dung, người phê duyệt/từ chối và kết quả.

## #2 — Ưu đãi, Cam kết & Thỏa thuận với khách hàng

Xây dựng cơ chế quản lý tập trung tại:

**Hồ sơ cửa hàng → Chính sách & Cam kết**

Sau đó tại:

**Bộ sưu tập → Cài đặt**

cho phép lựa chọn những **Ưu đãi, Cam kết và Thỏa thuận** áp dụng cho từng Bộ sưu tập.

### A. Ưu đãi

Cho phép cửa hàng tạo/cấu hình các ưu đãi để khách lựa chọn, ví dụ:

- **Miễn phí giao hoa** — Tặng phí giao hàng cho đơn hàng này.
- **Giảm 10%** — Giảm ngay 10% giá trị đơn hàng.
- **Tặng thiệp** — Tặng 01 thiệp chúc mừng kèm lời nhắn.
- **Tặng quà kèm hoa** — Tặng 01 món quà được cửa hàng lựa chọn.
- **Tặng thêm hoa** — Tặng thêm 03–05 cành hoa phù hợp với thiết kế.
- **Tặng phụ kiện** — Tặng 01 phụ kiện trang trí phù hợp với mẫu hoa.
- **Nâng cấp bó hoa** — Tặng thêm hoa để sản phẩm đầy đặn hơn.
- **Ưu đãi đơn tiếp theo** — Tặng voucher XX.000đ cho lần đặt tiếp theo.
- **Tặng điểm thành viên** — Tặng XX điểm vào tài khoản khách hàng.

Các giá trị như số cành, voucher, % giảm, số điểm... phải cấu hình được, không hard-code.

Nếu Collection cho phép khách lựa chọn ưu đãi, khách chỉ được chọn **01 ưu đãi** trong nhóm được áp dụng.

### B. CAM KẾT

Cam kết là những điều cửa hàng **chắc chắn thực hiện/cung cấp đúng theo tiêu chuẩn đã công bố**.

Ví dụ:

- **Đúng mẫu đã chọn** — Sản phẩm được thực hiện theo đúng mẫu, phong cách và thiết kế đã lựa chọn.
- **Đúng giá trị sản phẩm** — Sản phẩm được cung cấp đúng giá trị đã đặt.
- **Giao trong khung giờ đã chọn** — Giao hoa trong khung giờ khách lựa chọn.
- **Kiểm tra trước khi giao** — Sản phẩm được kiểm tra chất lượng trước khi bàn giao.
- **Gửi ảnh sản phẩm** — Gửi hình ảnh sản phẩm hoàn thiện để khách xem trước khi giao.
- **Hỗ trợ khách hàng** — Tiếp nhận và hỗ trợ phản hồi theo chính sách cửa hàng.

### C. THỎA THUẬN VỚI KHÁCH HÀNG

Thỏa thuận là những tình huống **có thể xảy ra trong quá trình thực hiện đơn hàng** mà khách cần được thông báo trước và xác nhận đã hiểu.

Ví dụ:

- **Hoa có thể được thay thế** — Một số loại hoa có thể được thay thế nếu không có sẵn hoặc không đạt tiêu chuẩn tại thời điểm thực hiện.
- **Màu sắc có thể sai khác nhẹ** — Màu sắc thực tế có thể có sai khác nhẹ do đặc tính tự nhiên của hoa và điều kiện hiển thị.
- **Sản phẩm có thể khác mẫu** — Sản phẩm thực tế có thể có khác biệt tự nhiên so với hình ảnh mẫu nhưng vẫn giữ phong cách và tổng thể thiết kế.
- **Hoa theo mùa** — Một số loại hoa hoặc phụ kiện có thể thay đổi tùy mùa vụ và nguồn cung.
- **Thay thế hoa chính** — Nếu cần thay hoa chính, cửa hàng ưu tiên loại hoa tương đương hoặc cao hơn về giá trị.
- **Thời gian giao có thể thay đổi** — Có thể thay đổi trong trường hợp bất khả kháng hoặc không thể liên hệ người nhận.
- **Hủy/hoàn tiền** — Áp dụng theo trạng thái xử lý thực tế của đơn hàng.

Bộ mặc định đang dùng (PO chốt 08/10/2026 — 6 Cam kết, 7 Thỏa thuận; thay "Hoa theo mùa" bằng "Thay đổi thông tin đơn hàng") là `DEFAULT_COMMITMENTS` / `DEFAULT_AGREEMENTS` trong `src/modules/greeting-card/domain/store-policy.ts`. Đây chỉ là mặc định: mỗi tiệm được sửa, thêm, xóa hoặc khôi phục trong Hồ sơ tiệm.

Mỗi mục cần có:
- **Version hiển thị cho khách:** ngắn gọn, rõ ràng, mang tính marketing/trust-building.
- **Giải thích/quy định nội bộ:** chi tiết hơn trong khu vực quản trị.

### D. Review Order

Trước khi đặt hàng, hiển thị riêng:
- **Ưu đãi của bạn**
- **Cam kết của cửa hàng**
- **Thỏa thuận với khách hàng**

Khách phải xác nhận:

> Tôi đã đọc và hiểu các Thỏa thuận với khách hàng áp dụng cho đơn hàng này.

Lưu lại nội dung/version khách đã xác nhận cùng Order.

**Nguyên tắc:**
- Ưu đãi = Khách được nhận gì.
- Cam kết = Cửa hàng chắc chắn cung cấp gì.
- Thỏa thuận = Điều gì có thể xảy ra và khách đã được thông báo trước.

## #3 — Customer Approval cho ảnh sản phẩm hoàn thiện

Trong Customer Tracking, khi Điều phối upload ảnh sản phẩm hoàn thiện, khách phải có cơ chế xác nhận:

> **Xác nhận hình ảnh sản phẩm**

Trong khung chờ xác nhận phải **hiển thị trực tiếp đồng hồ đếm ngược**.

- Countdown mặc định: **10 phút**.
- Bắt đầu ngay khi ảnh được upload và hiển thị cho khách.
- Khách bấm xác nhận → hoàn tất ngay.
- Không xác nhận → hết 10 phút tự động coi là đã xác nhận.
- Thời gian countdown cấu hình được trong **Collection Settings**.
- Khi ảnh được upload: notification cho khách và Sale.
- Sale nhận notification để biết cần nhắc khách xác nhận.
- Chuẩn bị sẵn cơ chế gửi message vào chat khi kết nối API sau này.

Hiển thị rõ:

> **Tự động xác nhận sau khi đồng hồ kết thúc.**

## #4 — Simplify Collection View

Trong:

**Thẻ Chào mẫu hoa → Bộ sưu tập → Xem**

bỏ phần hiển thị:

> Tất cả thời gian / Trong 3 ngày qua

để giao diện gọn và bớt rối.

## #5 — Order Terms & Customer Confirmation

Trong **Review Order trước khi đặt**, bổ sung các điều khoản/thỏa thuận quan trọng, lấy từ **Chính sách & Cam kết** của Hồ sơ cửa hàng và cấu hình của Collection.

Ví dụ:
- Hoa thực tế có thể khác mẫu do mùa vụ, nguồn nguyên liệu và điều kiện sản xuất.
- Hoa chính có thể được thay thế theo Thỏa thuận đã chọn.
- Màu sắc/kích thước/bố cục có thể có sai khác tự nhiên.
- Các điều kiện về giao hàng, hủy/hoàn và sản phẩm.

Khách phải xác nhận đã đọc và hiểu trước khi đặt hàng.

## #6 — User Guide + Knowledge Base

Bổ sung icon/nút:

> **Hướng dẫn sử dụng link đặt hoa**

Tạo tài liệu hướng dẫn đầy đủ cho:
- Điều hành
- Sale
- Điều phối
- Các vai trò liên quan

Cập nhật nội dung hướng dẫn vào **Knowledge Base của chatbot `floraos-core`**.

## #7 — Responsible Employee trong Tiến độ toàn tiệm

Trong:

**Thẻ Chào mẫu hoa → Tiến độ toàn tiệm**

hiện đang hiển thị:

> Chủ tiệm hoa Mộc Lan

Thay bằng:

> **Mã nhân viên phụ trách đơn hàng**

Đây chính là nhân viên đã **copy link và gửi link cho khách**.

Hiển thị đúng employee/responsible ID tương ứng với Order.

## #8 — Address Autocomplete / Cascading Address

Trong **link gửi khách + form đặt hàng**, nâng cấp phần nhập địa chỉ.

Không bắt khách tự nhập từng cấp.

Sử dụng:

**Address Autocomplete + Cascading Address Selection**

Luồng:

**Tỉnh/Thành phố → Phường/Xã → Địa chỉ cụ thể**

Khi khách nhập/chọn địa chỉ, hệ thống tự động xác định các thành phần địa chỉ phù hợp.

Yêu cầu:
- Nhập nhanh và dễ.
- Giảm lỗi địa chỉ.
- Có thể chỉnh sửa thủ công.
- Lưu dữ liệu địa chỉ có cấu trúc.
- Có thể sử dụng cho Delivery và Customer Database sau này.

Đồng thời sửa lỗi UI hiện tại đang hiển thị:

> Province

thành tiếng Việt thống nhất.

## #9 — Processing Time / SLA cho Order

Nâng cấp Bảng Theo dõi tiến độ đơn hàng để mỗi bước có **thời gian dự kiến thực hiện**.

Thời gian phải được **tính ngược từ Delivery Time Window**, dựa trên **Tiêu chuẩn thời gian xử lý** được cấu hình trong Settings.

Không hard-code thời gian trong UI/code.

Ví dụ:

Khách nhận hoa:

> 10:00–11:00

Hệ thống có thể tự tính:
- Cắm hoa: 07:30–08:30
- QC: 08:30–08:45
- Đóng gói: 08:45–09:05
- Bàn giao/Giao: 09:05–10:00

Đây chỉ là ví dụ; thời gian thực tế phải lấy từ cấu hình.

Progress Tracker phải thể hiện:
- On Track
- At Risk
- Overdue
- Completed

Admin có thể thay đổi thời lượng từng bước tại:

**Settings → Tiêu chuẩn thời gian xử lý**

**Lưu ý:** #9 và #16 dùng chung một cơ chế Processing Timeline/SLA, không xây hai hệ thống tính thời gian độc lập.

## #10 — Delivery Time Window

Trong Form đặt hàng, bổ sung **khung giờ giao hoa** để khách lựa chọn.

Ví dụ:
- 08:00–10:00
- 10:00–12:00
- 14:00–16:00
- 18:00–20:00

Các khung giờ phải cấu hình được.

Delivery Time Window là đầu vào để tính **Processing Timeline/SLA**.

## #11 — Customer Link: chỉ giữ Zalo

Trong link gửi khách:
- Bỏ nút **Gọi**.
- Chỉ giữ **Zalo**.
- Bổ sung **QR Code kết nối Zalo**.

QR Code lấy từ:

**Hồ sơ cửa hàng**.

## #12 — Customer Tracking: Expected Timeline

Nâng cấp Progress Tracker trong link gửi khách.

### Tiếp nhận

Hiển thị **thời điểm thực tế** khách hoàn thành thanh toán và hệ thống tạo/gửi trang Theo dõi tiến độ.

Không dùng thời gian dự kiến cho bước này.

### Các bước tiếp theo

Hiển thị **khoảng thời gian dự kiến** của từng bước.

Tự động tính ngược từ Delivery Time Window dựa trên Processing Time Standards trong Settings.

Ví dụ:

> Delivery: 10:00–11:00

Hệ thống tự tính:

> Cắm hoa: 07:30–08:30  
> QC: 08:30–08:45  
> Đóng gói: 08:45–09:05  
> Bàn giao/Giao: 09:05–10:00

Giữ giao diện Progress Tracker hiện tại và bổ sung thời gian ngay dưới tên từng bước.

Đồng thời thể hiện:

**On Track / At Risk / Overdue / Completed**

Admin có thể thay đổi thời lượng tại:

**Settings → Tiêu chuẩn thời gian xử lý.**

## #13 — Skip Product / Handover Photos

Cho phép **Điều phối bỏ qua bước upload ảnh** trong trường hợp khẩn cấp.

Ngay dưới:

> **Ảnh sản phẩm hoàn thiện**

bổ sung:

> **Bỏ qua ảnh sản phẩm hoàn thiện**

Khi chọn, Điều phối có thể chuyển thẳng sang bước giao hàng.

Thực hiện cơ chế tương tự cho:

> **Ảnh bàn giao sản phẩm**

Mục đích: xử lý trường hợp không kịp chụp ảnh nhưng vẫn phải giao đúng giờ.

Việc skip phải được ghi nhận rõ là:

> **Skipped**

Không coi như ảnh đã được upload.

## #14 — Coordinator Kanban View + Multiple Views

Trong:

**Thẻ Chào mẫu hoa → tab Điều phối**

thay cách hiển thị hiện tại bằng **Kanban View**.

Thiết kế theo:

> **Order = Business Object**

và hỗ trợ nhiều View:

### View 1 — Kanban
- Chờ xử lý
- Đã phân công
- Đang cắm
- Đã hoàn thành
- Đang giao
- Đã giao

### View 2 — Table
Dùng để xử lý số lượng lớn Order.

### View 3 — Timeline
Theo dõi timeline của từng Order.

### View 4 — Customer Tracking
Chỉ dành cho Customer.

### View 5 — Exception / Attention
Chỉ hiển thị Order:
- Quá SLA
- Sắp quá hạn
- Chưa phân công
- Chưa chụp ảnh
- Chưa giao shipper
- Giao trễ

Tất cả View phải dùng **cùng một Order Business Object/data source**.

## #15 — Customer-facing Terminology

Trong link gửi khách hiện có nhiều thông tin mang tính Internal/Ops như:

> “Ở bước này...”  
> “Còn 1 ngày...”  
> “Cần bạn: Phân công thợ cắm hoa...”  
> “Cần bạn: Hối tiến độ...”

Không hiển thị các thuật ngữ vận hành nội bộ cho Customer.

Ví dụ:

### Internal/Ops

> Cần bạn: Phân công thợ cắm hoa — quá 1 ngày

### Customer

> 🌸 **Đang chuẩn bị hoa**  
> Cửa hàng đang chuẩn bị bó hoa của bạn.

Hoặc:

> 🌸 **Đang cắm hoa**  
> Thợ hoa đang hoàn thiện sản phẩm.

Nguyên tắc:

> **Một Business Object → nhiều Views → mỗi View sử dụng ngôn ngữ phù hợp với Role.**

Customer chỉ thấy thông tin cần thiết để hiểu đơn hàng đang ở đâu và tiếp theo sẽ xảy ra điều gì.

## #16 — Desktop Layout Optimization

Rà soát và tối ưu desktop layout, đặc biệt:
- Customer Order
- Customer Tracking
- Internal/Ops Order screens

Hiện tại vùng nội dung hơi hẹp và có nhiều khoảng trắng hai bên.

### Customer-facing

Tận dụng không gian desktop tốt hơn nhưng vẫn giữ:
- Thoáng
- Dễ đọc
- Visual hierarchy tốt

Không để content quá nhỏ giữa màn hình.

### Internal/Ops

Tăng information density để Operator xử lý được nhiều thông tin/Order hơn trên một màn hình.

Đặc biệt:
- Status
- SLA
- Action

phải dễ nhìn và dễ scan.

Không đơn giản phóng to mọi thành phần; cần tối ưu container/grid/layout để sử dụng không gian desktop hiệu quả hơn.

---

## Nguyên tắc triển khai chung

- Thực hiện theo thứ tự **#1 → #16**.
- Trước mỗi thay đổi, kiểm tra implementation hiện tại.
- Nếu hệ thống đã có cơ chế tương ứng, **tái sử dụng/nâng cấp**, không tạo cơ chế trùng lặp.
- Không phá vỡ các chức năng đang hoạt động.
- Không hard-code các giá trị cần cấu hình.
- Không tự mở rộng phạm vi.
- Sau mỗi mục, kiểm tra flow liên quan và báo cáo ngắn gọn:
  - Đã thay đổi gì.
  - Các màn hình/component liên quan.
  - Cách đã kiểm tra.
  - Vấn đề còn tồn tại nếu có.
- Dừng lại sau mỗi mục và chờ yêu cầu tiếp theo.
