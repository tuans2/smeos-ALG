# TÀI LIỆU HƯỚNG DẪN SỬ DỤNG HỆ THỐNG FLORAOS

**Tên tài liệu:** Tài liệu Hướng dẫn Sử dụng Hệ thống FloraOS (Bản Dự Thảo Trình Duyệt)  
**Phân hệ áp dụng:** Toàn bộ 10 chức năng vận hành cửa hàng hoa  
**Phiên bản hệ thống:** `[CẦN XÁC MINH]` *(Không tự đặt phiên bản khi chưa có thông tin chính thức)*  
**Ngày cập nhật:** `[CẦN XÁC MINH]` *(Thời gian khởi tạo dự thảo: 09/10/2026)*  
**Đối tượng sử dụng:** Quản lý cửa hàng, Nhân viên bán hàng, Thợ cắm hoa, Nhân viên giao hàng  

---

## MỤC LỤC

1. [Tổng quan Hệ thống & Quy định chung](#1-tong-quan-he-thong--quy-dinh-chung)
2. [Chức năng 01: Trang Chủ (`/`)](#chuc-nang-01-trang-chu-)
3. [Chức năng 02: Quản Lý Đơn Hàng & Kênh Chào Bán (`/don-hang`)](#chuc-nang-02-quan-ly-don-hang--kenh-chao-ban-don-hang)
4. [Chức năng 03: Thẻ Chào Mẫu Hoa (`/the-chao`)](#chuc-nang-03-the-chao-mau-hoa-the-chao)
5. [Chức năng 04: Sản Phẩm & Giá (`/san-pham`)](#chuc-nang-04-san-pham--gia-san-pham)
6. [Chức năng 05: Tạo Mẫu Hoa Mới (`/san-pham/tao-moi`)](#chuc-nang-05-tao-mau-hoa-moi-san-phamtao-moi)
7. [Chức năng 06: Nhập từ Excel & Ảnh (`/san-pham/nhap-hang-loat`)](#chuc-nang-06-nhap-tu-excel--anh-san-phamnhap-hang-loat)
8. [Chức năng 07: Quét Ảnh Hoa - Phân Tích AI (`/tai-anh`)](#chuc-nang-07-quet-anh-hoa---phan-tich-ai-tai-anh)
9. [Chức năng 08: Kho Dữ Liệu Sản Phẩm (`/kho-du-lieu`)](#chuc-nang-08-kho-du-lieu-san-pham-kho-du-lieu)
10. [Chức năng 09: Hồ Sơ Cửa Hàng (`/ho-so`)](#chuc-nang-09-ho-so-cua-hang-ho-so)
11. [Chức năng 10: Cài Đặt & Quản Lý Thành Viên (`/cai-dat`)](#chuc-nang-10-cai-dat--quan-ly-thanh-vien-cai-dat)
12. [Chức năng 11: Khách Hàng — Yêu Cầu Về Dữ Liệu Cá Nhân (`/khach-hang`)](#chuc-nang-11-khach-hang--yeu-cau-ve-du-lieu-ca-nhan-khach-hang)
13. [Phụ lục: Danh sách nội dung cần xác minh thực tế](#phu-luc-danh-sach-noi-dung-can-xac-minh-thuc-te)

---

## 1. TỔNG QUAN HỆ THỐNG & QUY ĐỊNH CHUNG

Hệ thống FloraOS được thiết kế chuyên biệt cho vận hành cửa hàng hoa tươi theo mô hình **O2O (Online to Offline)**. Tài liệu này chuẩn hóa quy trình thao tác cho nhân viên, đảm bảo tính đồng bộ, chính xác và bảo mật dữ liệu kinh doanh.

* **Thống nhất thuật ngữ**:
  * **BOM (Bill of Materials)**: Công thức thành phần hoa phân rã chi tiết từng cành, bông, nhánh.
  * **Brochure / Thẻ chào**: Link di động catalog mẫu hoa kèm mã VietQR đặt cọc gửi cho khách.
  * **Kanban**: Bảng quản lý tiến độ đơn hàng 4 cột thời gian thực.
  * **Credit AI**: Hạn mức tín dụng tiêu dùng cho các tác vụ trí tuệ nhân tạo.

---

## CHÚC NĂNG 01: TRANG CHỦ (`/`)

### 1. Chức năng dùng để làm gì?
Trang chủ (đường dẫn `/`) là trung tâm điều hướng chính của tiệm hoa. Giúp nhân viên và quản lý làm việc có định hướng ngay khi mở ứng dụng. Trang chủ cung cấp **2 chế độ hiển thị**:
* **Chế độ Lưới Hành Trình Tác Vụ (ChoiceGrid - Mặc định)**: Trình bày các thẻ công việc giúp nhân viên chọn đúng việc cần làm.
* **Chế độ Chuyên Gia (StoreGrowthCenter)**: Bảng điều khiển vận hành trực tiếp dành cho quản lý theo dõi tình hình cửa hàng, xử lý việc tồn đọng/cần can thiệp, theo dõi tiến trình AI, hạn mức Tín dụng AI và sản phẩm mới.

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Tất cả nhân viên cửa hàng có tài khoản đăng nhập hợp lệ (**Quản lý cửa hàng**, **Nhân viên bán hàng**, **Thợ cắm hoa**). *(Tài khoản Mạng lưới đối tác NETWORK hoặc Điều phối sẽ tự động chuyển hướng sang giao diện riêng)*.
* **Thời điểm sử dụng**: Đầu ca làm việc; khi bắt đầu tạo thẻ chào gửi khách; hoặc khi quản lý kiểm tra các công việc tồn đọng.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

#### A. Thao tác ở Chế độ Lưới Hành Trình Tác Vụ (Mặc định)
* **Bước 1: Truy cập Trang chủ**
  * *Thao tác*: Đăng nhập và mở đường dẫn gốc `/`.
  * *Kết quả*: Màn hình hiển thị tiêu đề *"BẠN MUỐN LÀM GÌ CHO CỬA HÀNG?"* cùng danh sách thẻ công việc.
* **Bước 2: Tìm kiếm hoặc lọc thẻ công việc**
  * *Thao tác*: Nhấp các nút lọc (**"Tất cả (14)"**, **"Tác vụ đơn"**, **"Gói quy trình"**, **"Trợ lý ảo"**) hoặc gõ từ khóa vào ô **"Tìm tác vụ mong muốn..."**.
  * *Kết quả*: Danh sách thẻ công việc tự động lọc theo phân loại hoặc từ khóa.
* **Bước 3: Chọn tác vụ chính**
  * *Thao tác*: Nhấp **"Bắt đầu ngay"** trên thẻ nổi bật **"Thẻ Chào mẫu hoa"**.
  * *Kết quả*: Màn hình chuyển hướng ngay sang trang `/the-chao`. *(13 thẻ còn lại bị làm mờ và gắn nhãn "Sắp ra mắt")*.

#### B. Thao tác ở Chế độ Chuyên Gia
* **Bước 1: Chuyển sang Chế độ Chuyên gia**
  * *Thao tác*: Nhấp nút **"Chế độ chuyên gia"** (icon `SlidersHorizontal`) ở góc trên bên phải.
  * *Kết quả*: Màn hình chuyển sang Bảng điều khiển trực tiếp. Trạng thái được lưu tự động (`floraos_expert_mode_store`).
* **Bước 2: Xử lý khối Cần Can Thiệp**
  * *Thao tác*: Nhấp vào dòng **Job lỗi** (xem mã lỗi AI), **Kết quả chờ duyệt** (chuyển sang `/duyet`), hoặc **Đơn nháp chưa chốt** (chuyển sang `/don-hang`).
  * *Kết quả*: Hệ thống tự động chuyển hướng hoặc cuộn mượt đến vị trí xử lý.
* **Bước 3: Quay lại Chế độ Hành trình**
  * *Thao tác*: Nhấp nút **"Chuyển sang Chế độ hành trình tác vụ"** trên banner đầu trang.
  * *Kết quả*: Quay trở lại giao diện Lưới Hành Trình Tác Vụ.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Đầu ca, nhân viên bán hàng mở `/`, bấm **"Bắt đầu ngay"** tại thẻ *Thẻ Chào mẫu hoa* để tạo link tư vấn cho khách Zalo. Quản lý nhấp *Chế độ chuyên gia* kiểm tra 3 đơn nháp chưa chốt để giục khách cọc tiền.
* **Lưu ý quan trọng**: Trên Production, hiện chỉ có 1 thẻ hành trình duy nhất mở khóa là *"Thẻ Chào mẫu hoa"*, 13 thẻ còn lại gắn nhãn *"Sắp ra mắt"*.
* **[CẦN XÁC MINH]**: Thao tác chi tiết khi bấm vào khối *"Đòn bẩy Tăng trưởng Doanh số"* và nút tắt *"Xu hướng thị trường"* chưa có đầy đủ tên nút bấm trong tài liệu nguồn.

### 6. Các chức năng liên quan
* **Thẻ Chào mẫu hoa (`/the-chao`)**, **Đơn Hàng (`/don-hang`)**, **Duyệt kết quả (`/duyet`)**, **Sản Phẩm & Giá (`/san-pham`)**.

---

## CHÚC NĂNG 02: QUẢN LÝ ĐƠN HÀNG & KÊNH CHÀO BÁN (`/don-hang`)

### 1. Chức năng dùng để làm gì?
Trang **Đơn Hàng & Kênh Chào Bán** (`/don-hang`) là trung tâm xử lý doanh thu và điều phối sản xuất, giao nhận. Gồm 3 tab:
1. **Tab 1: Tất cả đơn hàng (Kanban)**: Quản lý tiến độ 4 cột.
2. **Tab 2: Thẻ Chào & Link Chào Khách (Sale)**: Quản lý các brochure giới thiệu mẫu hoa đã gửi.
3. **Tab 3: Duyệt TT Thẻ Chào (Điều hành)**: Dành riêng cho Chủ tiệm/Kế toán duyệt cọc chuyển khoản qua brochure.

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Nhân viên Bán hàng (`sales`), Thợ cắm hoa (`florist`), Shipper/Điều hành, Chủ tiệm/Kế toán (Quyền R11), Quản trị viên (Quyền R1).
* **Thời điểm sử dụng**: Khi khách nhắn tin đặt hoa; khi khách cọc tiền qua link Thẻ chào; xuyên suốt ca làm việc để giao nhận đơn.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

#### A. Quản lý tiến độ trên Bảng Kanban (Tab 1)
* **Bước 1: Truy cập trang Đơn hàng**
  * *Thao tác*: Nhấp chọn **"Đơn hàng"** trên Sidebar (hoặc mở `/don-hang`).
  * *Kết quả*: Màn hình hiển thị bảng Kanban 4 cột: *(1) Mới & Chờ cọc*, *(2) Đang cắm hoa*, *(3) Sẵn sàng & Giao hàng*, *(4) Hoàn tất & Đã hủy*.
* **Bước 2: Tìm kiếm và xem chi tiết đơn**
  * *Thao tác*: Gõ mã đơn, SĐT hoặc tên khách vào ô Tìm kiếm. Nhấp trực tiếp vào thẻ đơn hàng.
  * *Kết quả*: Hộp thoại chi tiết đơn mở ra với 3 tab: *Tổng quan* (thông tin người nhận, thiệp, SLA), *Phiếu Thợ cắm hoa* (BOM, ghi chú), *Phiếu Giao hàng* (in cho Shipper).
* **Bước 3: Chuyển trạng thái đơn**
  * *Thao tác*: Nhấp các nút chuyển trạng thái để gán thợ, đổi sang "Đã cắm xong" hoặc nhấp **"Hủy đơn hàng"**.
  * *Kết quả*: Đơn hàng tự động chuyển sang cột tiến độ tương ứng.

#### B. Tạo đơn siêu tốc từ đoạn chat Zalo/Facebook (Nút "Tạo từ chat")
* **Bước 1**: Nhấp nút **"Tạo từ chat"** ở góc trên bên phải. -> *Kết quả*: Hộp thoại trích xuất mở ra.
* **Bước 2**: Dán tin nhắn chốt đơn của khách Zalo vào ô nội dung. -> *Kết quả*: AI bóc tách điền sẵn Tên, SĐT, Địa chỉ, Ngày giờ giao, Nội dung thiệp, Sản phẩm.
* **Bước 3**: Kiểm tra 5 giây và nhấp **"Tạo đơn"**. -> *Kết quả*: Đơn hàng mới xuất hiện ở cột *Mới & Chờ cọc*.

#### C. Duyệt tiền cọc chuyển khoản (Tab 3 - Quyền R11)
* **Bước 1**: Nhấp chọn **Tab 3: Duyệt TT Thẻ Chào (Điều hành)**. -> *Kết quả*: Hiển thị các đơn hàng khách đã quét mã VietQR cọc tiền.
* **Bước 2**: Kiểm tra app ngân hàng báo có, nhấp **"Xác nhận đã nhận tiền"**. -> *Kết quả*: Đơn chuyển từ DRAFT sang CONFIRMED và tự động nhảy sang cột *Đang cắm hoa*.
* **Shipper thu tiền mặt** (Hồ sơ cửa hàng → Chính sách, mặc định TẮT): khi tắt, khách luôn chuyển khoản phần còn lại (Lần 2); Điều hành xác nhận tiền bất cứ lúc nào, xác nhận xong mới giao ship. Khi bật, đơn đặt cọc được giao ship, shipper thu tiền mặt phần còn lại và tiệm ghi nhận sau khi giao xong.
* **AI đọc ảnh bill chuyển khoản** (Hồ sơ cửa hàng → Chính sách, mặc định TẮT để không tốn phí AI): khi bật, AI (GPT-4o) tự đọc tài khoản nhận, số tiền, mã giao dịch trên bill khách gửi và đánh dấu bill khớp / lệch / nghi trùng. Ảnh bill được gửi sang dịch vụ AI bên ngoài (OpenAI). Khi tắt, người duyệt tự xem ảnh bill. "Tự động duyệt thanh toán khi có ảnh bill" chỉ hoạt động khi đã bật mục này.
* **Xuất Excel** đơn hàng / khách hàng: chỉ Điều hành. Nhân viên khác cần xuất thì xin Điều hành cấp quyền "Xuất dữ liệu ra Excel" ở màn phân quyền thành viên.
* **Ảnh bill khách tải lên**: Khách phải tải ảnh chuyển khoản trước khi bấm *"Tôi đã chuyển khoản"* (trừ khi tiệm tắt yêu cầu ảnh bill). Ảnh hiện ngay trên đơn để đối chiếu. Mặc định **tiệm tự duyệt** — hệ thống không tự ghi nhận tiền. Chỉ khi tiệm bật *"Tự động duyệt thanh toán khi có ảnh chụp bill"* ở Hồ sơ cửa hàng, hệ thống mới tự xác nhận sau số phút đã chọn, và chỉ với bill đọc được, đúng tài khoản tiệm, đúng số tiền; bill lệch hoặc không đọc được luôn chờ người duyệt.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Khách chốt Zalo giỏ hoa 650k, Sale bấm *Tạo từ chat* dán tin nhắn là xong đơn. Khách đặt qua Brochure cọc 500k qua VietQR, Quản lý vào Tab 3 bấm *Xác nhận đã nhận tiền* để đẩy xuống xưởng cắm hoa.
* **Lưu ý quan trọng**: Chỉ tài khoản có năng lực R11 (Chủ tiệm/Kế toán) mới bấm được nút *Xác nhận đã nhận tiền*. Chỉ tài khoản R1 mới bấm được nút *Xuất Excel*.
* **[CẦN XÁC MINH]**: Thao tác chi tiết nút bấm gán tên thợ cắm hoa trực tiếp trên thẻ Kanban chưa được ghi chi tiết tên nhãn trong nguồn.

### 6. Các chức năng liên quan
* **Thẻ Chào (`/the-chao`)**, **Sản Phẩm & Giá (`/san-pham`)**, **Hồ Sơ Cửa Hàng (`/ho-so`)**.

---

## CHÚC NĂNG 03: THẺ CHÀO MẪU HOA (`/the-chao`)

### 1. Chức năng dùng để làm gì?
Trang **Thẻ Chào Mẫu Hoa** (`/the-chao`) là kênh bán hàng di động và brochure trực tuyến. Giúp tiệm hoa tạo link catalog mẫu hoa sang trọng gửi cho khách qua Zalo/Facebook chỉ trong 30 giây. Cung cấp 2 chế độ: **Gửi nhanh** (Wizard 3 bước) và **Quản lý** (5 tab chuyên sâu).

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Sale (R2), Quản lý danh mục (L1), Chủ tiệm/Điều hành (R11), Điều phối/Thợ cắm hoa (R3/R4/R5), Quản trị viên (R1).
* **Thời điểm sử dụng**: Khi khách nhắn tin xin mẫu hoa và báo giá; khi cần duyệt tiền cọc hoặc xử lý yêu cầu hủy cọc từ khách.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

#### A. Chế độ "Gửi nhanh" (JourneyWizard — Trải nghiệm Tiêu điểm Khối & Đa ngành)
* **Khối 1: Chọn Bộ sưu tập & Danh mục sản phẩm**:
  * Nhấp chọn bộ sưu tập mong muốn (hoặc tạo bộ sưu tập mới). Danh sách sản phẩm (hoa, phòng homestay, trang phục thời trang...) tự động thích ứng với cấu hình ngành của cửa hàng.
  * Nhân viên có thể linh hoạt chọn sản phẩm, thay đổi số lượng, hoặc cấu hình hiển thị chi tiết (giá, đơn vị tính, tiện ích/chất liệu/thành phần).
* **Khối 2: Chọn Giao diện khách xem**:
  * Lựa chọn template trình diễn ấn phẩm trực tuyến phù hợp phong cách (Thanh lịch, Sang trọng, Hiện đại...).
  * Bản xem trước tự động hiển thị sản phẩm mẫu theo đúng chuyên ngành của cửa hàng (Homestay hiển thị phòng & tiện ích, Thời trang hiển thị bộ sưu tập quần áo...).
* **Khối 3: Gửi riêng cho khách & Link dùng chung**:
  * **Nhánh gửi riêng**: Nhập tên khách hàng và ghi chú cá nhân hóa -> Bấm **"Tạo link"** -> Sinh đường link kèm mã VietQR cá nhân hóa gửi Zalo/Facebook.
  * **Nhánh link dùng chung**: Sao chép trực tiếp đường link công khai của bộ sưu tập kèm mã QR dùng chung dán lên Fanpage/Website.
* *Cơ chế Tiêu điểm khối (Active Block Spotlight)*: Khi nhấp vào thao tác ở khối nào, khối đó sẽ tự động sáng rõ và nổi bật lên, trong khi các khối còn lại mờ nhẹ để nhân viên tập trung tối đa mà không bị xao nhãng.

#### B. Chế độ "Quản lý" (5 Tab chuyên sâu)
* **Bước 1**: Nhấp chọn nút **"Quản lý"** (icon `LayoutList`).
* **Bước 2**: Chọn tab tương ứng:
  * *Tab 1: Bộ sưu tập (`catalog` - L1)*: Quản lý danh mục mẫu hoa, giá bán dịp lễ, và ghi đè chính sách cho từng bộ sưu tập.
  * *Tab 2: Theo dõi tiến độ (`tracking` - R1)*: Giám sát phễu chuyển đổi từ gửi link đến cọc, hiển thị chi tiết các mốc song song (Duyệt cọc, Thợ cắm, Ảnh QC, Chờ thanh toán lần 2, Giao ship).
  * *Tab 3: Bán hàng (`sales` - R2)*: Xem danh sách các phiên gửi link, lượt khách xem và tương tác của khách.
  * *Tab 4: Điều hành (`payment` - R11)*: Duyệt tiền cọc/thanh toán, xác nhận thanh toán lần 2, và phê duyệt các đề xuất hủy/hoàn tiền từ Điều phối. Khi Điều hành bấm **"Xác nhận đã nhận tiền"** (hoặc sau 15' hệ thống tự động đối soát bill hợp lệ), khách hàng lập tức nhận thông báo *"Chuyển khoản thành công"* (kèm cam kết Điều phối tiếp nhận trong 30' hoặc hoàn tiền 100%).
  * *Tab 5: Điều phối (`coordinator` - R4)*: Thẩm định khả năng cung ứng của xưởng và điều phối sản xuất:
    * **Thẩm định nhận đơn (Tiếp nhận / Từ chối)**: Với mọi đơn đã thanh toán hoặc có cọc, Điều phối có 2 nút hành động quan trọng:
      * **"Nhận đơn"**: Xác nhận xưởng đủ nguyên liệu và năng lực sản xuất; chuyển đơn sang trạng thái sẵn sàng cắm hoa và gửi thông báo cho khách.
      * **"Từ chối nhận đơn"**: Khi xưởng hết hoa, quá tải hoặc ngoài khu vực giao. Điều phối nhập lý do từ chối -> Hệ thống tạo Đề xuất Hủy & Hoàn tiền 100% gửi lên Điều hành phê duyệt.
      * **Cơ chế SLA Tự Động Hủy Đơn (Auto-Cancel on Timeout)**: Nếu Điều hành không phản hồi đề xuất từ chối của Điều phối trong khung thời gian quy định (mặc định 15 phút, có thể cấu hình từ 5 đến 120 phút tại Cài đặt tiệm), hệ thống quét nền sẽ **tự động hủy đơn** và báo khách. Hệ thống **không tự chuyển tiền**: đơn hiện trong Hộp việc của Điều hành với dòng *"Đơn tự huỷ — cần hoàn …đ cho khách"* tới khi Điều hành chuyển khoản hoàn và bấm **"Đã hoàn tiền cho khách"** (đơn chưa thu tiền: bấm **"Đã xử lý xong"** sau khi báo khách). Lúc bấm, khoản hoàn mới được ghi vào sổ thu. Lịch sử đơn và nhật ký hệ thống ghi rõ đơn do hệ thống tự huỷ.
    * **Xác nhận thanh toán Lần 2 & Kích hoạt Giao Ship**:
      * Đối với đơn đặt cọc, sau khi cắm hoa hoàn tất, khách hàng chuyển khoản phần tiền còn lại (Lần 2).
      * Khi khách gửi ảnh chuyển khoản lần 2, hệ thống tự động gửi **Thông báo Hộp việc khẩn cấp (Urgency cao)** và gắn **Badge cảnh báo màu đỏ** trên Thẻ đơn đồng thời cho cả Điều hành và Điều phối.
      * Nút **"Xác nhận đã nhận tiền (Lần 2)"** xuất hiện trên Thẻ đơn trong Tab Điều phối và Tab Theo dõi. Sau khi bấm xác nhận, nút **"Giao Ship"** lập tức được mở khóa (unblock) để giao hàng ngay.
      * Điều hành có thể phân quyền linh hoạt qua chính sách `balance_payment_trigger_policy`: *Cho phép thêm Điều phối xác nhận lần 2* (mặc định) hoặc *Chỉ Điều hành mới được duyệt tiền*.
    * **Chính sách 3 Lớp Bắt buộc Ảnh (Ảnh thành phẩm & Ảnh người nhận)**:
      * Điều hành có thể cấu hình tại Cài đặt Cửa hàng (`/ho-so` hoặc `/the-chao` -> Cài đặt) và từng Bộ sưu tập:
        * `Không bắt buộc ảnh thành phẩm (QC)`: Bỏ qua bước chờ ảnh QC, không chặn giao hàng khi chưa có ảnh hoa.
        * `Không bắt buộc ảnh người nhận`: Bỏ qua bước chờ ảnh giao nhận, cho phép hoàn tất đơn hàng trực tiếp.
      * **Tính năng linh hoạt cho thợ & shipper**: Dù đã thiết lập *Không bắt buộc*, trên thẻ đơn của Điều phối **vẫn luôn hiển thị nút Tải ảnh/Chụp ảnh** để Điều phối, thợ cắm hoa hoặc tài xế có thể chủ động tải ảnh lưu hồ sơ hoặc gửi khách khi cần thiết.

  * **Cơ chế kích hoạt bước tiếp theo (Theo dõi tiến độ)**: Điều hành có toàn quyền thiết lập ở 2 cấp độ:
    1. *Cài đặt Cửa hàng (`/the-chao` -> Quản lý -> Cài đặt hoặc `/ho-so` -> Chính sách & Cam kết)*: Thiết lập cơ chế mặc định cho toàn tiệm với 2 lựa chọn: (a) *Cho phép thêm Điều phối xác nhận Nhận đơn* (linh hoạt: Điều hành duyệt tiền HOẶC Điều phối nhận đơn đều kích hoạt mở theo dõi tiến độ cho khách); hoặc (b) *Chỉ Điều hành xác nhận đã thanh toán* (chặt chẽ: Bắt buộc Điều hành phải xác nhận đã nhận tiền/cọc thì mới kích hoạt bước tiếp theo).
    2. *Cài đặt Bộ sưu tập (`Tab 1: Bộ sưu tập` -> Chọn BST -> Chính sách & Cam kết)*: Cho phép từng bộ sưu tập linh hoạt kế thừa từ cài đặt cửa hàng (mặc định) hoặc ghi đè riêng (`Chỉ Điều hành xác nhận thanh toán` hoặc `Cho phép thêm Điều phối nhận đơn`).

#### C. Hộp việc Thông minh (InboxButton)
* **Thao tác**: Nhấp icon **Hộp việc** trên Header -> Nhấp vào thông báo cọc mới, ảnh chuyển khoản lần 2, đề xuất hủy đơn hoặc đổi giờ giao.
* **Kết quả**: Màn hình tự động chuyển đúng tab và cuộn mượt đến thẻ đơn cần xử lý.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**:
  1. *Khách cọc đơn tiệm quá tải*: Khách chọn mẫu 2 triệu, cọc 600k. Đơn chuyển sang Tab 5 Điều phối. Do hết hoa mẫu này, Điều phối bấm **"Từ chối nhận đơn"** kèm lý do *"Hết hoa lan hồ điệp tím"*. Đơn chuyển sang chờ Điều hành duyệt hoàn tiền. Nếu Điều hành đang bận không online trong 15 phút, hệ thống tự động hủy đơn và báo khách; Hộp việc của Điều hành hiện *"Đơn tự huỷ — cần hoàn 600.000đ cho khách"*. Điều hành chuyển khoản hoàn rồi bấm **"Đã hoàn tiền cho khách"** để ghi sổ.
  2. *Thanh toán lần 2 để giao hàng*: Đơn cọc 50%, thợ cắm xong hoa gửi ảnh lên link khách. Khách xem ảnh ưng ý và chuyển nốt 50% còn lại rồi tải bill chuyển khoản. Thẻ đơn trên Tab Điều phối sáng badge đỏ *"Đã có bill CK lần 2"*. Điều phối bấm **"Xác nhận đã nhận tiền (Lần 2)"**, nút **"Giao Ship"** mở sáng, Điều phối gán tài xế xuất giao ngay lập tức mà không cần chờ kế toán duyệt.
* **Lưu ý quan trọng**:
  * Kiểm tra thanh **ShopProfileReadiness** trên Header. Nếu thiếu tài khoản ngân hàng nhận cọc, thanh sẽ phát cảnh báo.
  * Thông báo cọc mới cập nhật tự động mỗi 20 giây.
  * Nút **Xác nhận Nhận đơn** và **Từ chối nhận đơn** chỉ hiển thị khi có Điều phối/Điều hành và đơn hàng đã có cọc hoặc ảnh bill hợp lệ.
  * Thời gian chờ duyệt hủy tự động mặc định là **15 phút**, có thể điều chỉnh từ **5 đến 120 phút** trong Cài đặt tiệm.

### 6. Các chức năng liên quan
* **Đơn Hàng (`/don-hang`)**, **Sản Phẩm & Giá (`/san-pham`)**, **Hồ Sơ Cửa Hàng (`/ho-so`)**.

---

## CHÚC NĂNG 04: SẢN PHẨM & GIÁ (`/san-pham`)

### 1. Chức năng dùng để làm gì?
Trang **Sản Phẩm & Giá** (`/san-pham`) là kho lưu trữ toàn bộ mẫu hoa và bảng giá niêm yết của tiệm. Giúp tra cứu mẫu hoa tức thì theo dịp lễ, danh mục, khoảng giá và quản lý trạng thái xuất bản (*ACTIVE*, *DRAFT*, *ARCHIVED*).

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Toàn bộ nhân viên (xem, tra cứu); Quản lý danh mục (L1) & Điều hành (thêm, sửa, xóa vào thùng rác).
* **Thời điểm sử dụng**: Khi tư vấn báo giá cho khách; khi đưa tablet cho khách chọn mẫu tại quầy; khi cập nhật giá trước đợt lễ.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

#### A. Tra cứu và lọc mẫu hoa
* **Bước 1**: Nhấp chọn **"Sản phẩm"** trên Sidebar (hoặc mở `/san-pham`). -> *Kết quả*: Mở kho sản phẩm.
* **Bước 2**: Gõ tên hoặc mã hoa (`#code`) vào ô Tìm kiếm. -> *Kết quả*: Lọc danh sách tức thì (có debounce).
* **Bước 3**: Chọn Bộ lọc Danh mục, Bộ lọc Dịp lễ (*Sinh nhật*, *Khai trương*...), Bộ lọc Khoảng giá (*500k - 1 triệu*...). -> *Kết quả*: Hiển thị chính xác mẫu hoa theo yêu cầu.

#### B. Chuyển Dạng Lưới / Dạng Bảng & Phân trang
* **Thao tác**: Nhấp công tắc chuyển sang **Dạng Lưới** (xem ảnh thẻ) hoặc **Dạng Bảng** (xem danh sách chi tiết nhiều cột). Cuộn xuống bấm **"Tải thêm"** để xem trang tiếp.
* **Kết quả**: Hiển thị linh hoạt danh sách mẫu hoa không làm đơ trang (`Cursor-based Pagination`).

#### C. Xem chi tiết sản phẩm (`/san-pham/[id]`)
* **Thao tác**: Nhấp vào bất kỳ thẻ mẫu hoa nào.
* **Kết quả**: Chuyển sang trang chi tiết xem định dạng cắm (`category`, `shape`, `facing`, `container`) và công thức BOM.

#### D. Thao tác nâng cao trên Header
* Nhấp **"Nhập Excel & Ảnh"** -> sang `/san-pham/nhap-hang-loat`.
* Nhấp **"Phân tích AI"** -> sang `/tai-anh`.
* Nhấp **"Thêm sản phẩm"** -> sang `/san-pham/tao-moi`.
* Nhấp icon **Thùng rác** trên thẻ sản phẩm (chỉ dành cho `isExecutive`) -> Mở `TrashConfirmModal` để chuyển vào kho lưu trữ tạm.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Khách hỏi giỏ hoa khai trương tầm 1 triệu. Sale chọn Dịp *Khai trương* + Giá *500k - 1 triệu*, hệ thống lọc ra các mẫu chuẩn trong 3 giây để báo giá.
* **Lưu ý quan trọng**: Nút xóa vào Thùng rác chỉ hiển thị cho tài khoản Điều hành (`isExecutive` / G3 / L4) để chống xóa nhầm.
* **[CẦN XÁC MINH]**: Thao tác chi tiết bên trong cửa sổ `TrashConfirmModal` chưa có đầy đủ văn bản nút bấm trong tài liệu nguồn.

### 6. Các chức năng liên quan
* **Tạo mẫu hoa mới (`/san-pham/tao-moi`)**, **Nhập Excel (`/san-pham/nhap-hang-loat`)**, **Quét ảnh hoa (`/tai-anh`)**, **Thẻ Chào (`/the-chao`)**.

---

## CHÚC NĂNG 05: TẠO MẪU HOA MỚI (`/san-pham/tao-moi`)

### 1. Chức năng dùng để làm gì?
Trang **Tạo Mẫu Hoa Mới** (`/san-pham/tao-moi`) giúp khởi tạo thông tin mẫu hoa, tải ảnh đại diện và thiết lập **công thức thành phần hoa (BOM)** chuẩn phân rã nguyên tử. Giúp chuẩn hóa sản phẩm cắm ra giống 95% mẫu gốc và tính giá vốn chính xác.

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Thợ cắm hoa chính (`florist`), Quản lý danh mục (L1), Quản trị cửa hàng (`store_manager`).
* **Thời điểm sử dụng**: Ngay khi thợ cắm xong giỏ hoa mới tại tiệm; hoặc khi chuẩn bị bộ sưu tập mẫu hoa mới cho dịp lễ.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

Giao diện gồm **2 cột làm việc**:

#### A. Cột trái: Tải ảnh & Xem trước (1/3 độ rộng)
* **Bước 1**: Nhấp **"Thêm sản phẩm"** trên trang `/san-pham` (hoặc mở `/san-pham/tao-moi`). -> *Kết quả*: Hệ thống tự sinh mã `FL-xxxx` (vd: `FL-4821`).
* **Bước 2**: Kéo thả ảnh hoa vào ô tải ảnh. -> *Kết quả*: Tải file lên storage và hiển thị xem trước sắc nét.
* **Bước 3**: Chọn trạng thái *Đang bán (ACTIVE)* hoặc *Bản nháp (DRAFT)*.

#### B. Cột phải: Thông số & Công thức hoa BOM (2/3 độ rộng)
* **Bước 1: Nhập thông tin cơ bản**: Tên mẫu hoa (bắt buộc), Mã hoa, Danh mục (1/7 mục), Dáng cắm (1/6 dáng), Hướng nhìn (1/3 hướng), Bình/giấy gói, Tông màu, Giá bán VNĐ.
* **Bước 2: Nhập công thức phân rã Atomic BOM**:
  * Nhập ô *Tên hoa* (vd: Hồng đỏ Ecuador).
  * Nhập ô *Số lượng* (vd: 10).
  * Nhập ô *Đơn vị* (cành/bông/nhánh).
  * Nhập ô *Màu sắc* (vd: Đỏ nhung).
  * Chọn *Vai trò* (Chủ đạo / Phụ / Điểm nhấn / Lấp đầy).
* **Bước 3: Nhập câu chuyện/mô tả mẫu hoa**.
* **Bước 4: Nhấp "Lưu & Xuất bản"**. -> *Kết quả*: Kiểm tra bắt buộc (*Tên, Giá, Ảnh*). Nếu đủ, lưu vào CSDL và chuyển về kho sản phẩm.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Thợ cắm xong giỏ hoa mới, mở điện thoại tải ảnh lên, nhập tên *"Giỏ Hoa Ban Mai"*, giá 850k, khai báo BOM (5 Hướng dương, 8 Hồng vàng, 3 Baby, 5 Lá bạc). Bấm *Lưu & Xuất bản* là Sale có mẫu bán ngay.
* **Lưu ý quan trọng**: Bắt buộc nhập phân rã từng ô BOM, tuyệt đối không nhập gộp chuỗi tự do (như *"Hồng 10 cành, baby 3 nhánh"*).
* **[CẦN XÁC MINH]**: Tên nhãn nút bấm "Thêm dòng thành phần hoa" chưa được ghi chi tiết tên văn bản trong nguồn.

### 6. Các chức năng liên quan
* **Sản Phẩm & Giá (`/san-pham`)**, **Thẻ Chào (`/the-chao`)**, **Kho Dữ Liệu (`/kho-du-lieu`)**.

---

## CHÚC NĂNG 06: NHẬP TỪ EXCEL & ẢNH (`/san-pham/nhap-hang-loat`)

### 1. Chức năng dùng để làm gì?
Trang **Nhập từ Excel & Ảnh** (`/san-pham/nhap-hang-loat`) giúp nạp dữ liệu sản phẩm hàng loạt. Giúp đưa hàng trăm mẫu hoa lên hệ thống trong 1-2 phút và tự động ghép nối ảnh với sản phẩm nhờ thuật toán khớp tên file.

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Quản lý danh mục (L1) hoặc Quản trị viên cửa hàng (`store_manager`).
* **Thời điểm sử dụng**: Khi tiệm mới gia nhập FloraOS cần nạp danh mục hoa cũ; hoặc khi cập nhật bảng giá hàng loạt trước mùa lễ.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

Quy trình 4 giai đoạn:
* **Bước 1: Tải file mẫu Excel chuẩn**: Nhấp nút tải file `/templates/smeOS_Template_Master_Kho_San_Pham.xlsx` trên Header. -> *Kết quả*: Tải file mẫu về máy.
* **Bước 2: Điền dữ liệu vào Excel**: Nhập mã hoa, tên hoa, giá, danh mục, và tên file ảnh (vd: `BO-01.jpg`).
* **Bước 3: Tải file Excel và Ảnh lên (Kéo Thả Kép)**: Thả file Excel vào Dropzone 1, chọn tất cả ảnh thả vào Dropzone 2. -> *Kết quả*: Hệ thống tự động ghép ảnh.
* **Bước 4: Xem trước và Nạp dữ liệu**: Kiểm tra bảng thống kê `importStats` (số dòng `MATCHED`, `NO_IMAGE`, `ERROR`), nhấp **"Bắt đầu nhập dữ liệu"**. -> *Kết quả*: Thanh tiến độ hiển thị phần trăm nạp; sau khi xong toàn bộ sản phẩm xuất hiện tại kho `/san-pham`.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Tiệm nạp 200 mẫu hoa cũ. Quản lý điền Excel, đặt tên ảnh trùng mã hoa (`BO-01.jpg`), thả file Excel và 200 ảnh vào 2 ô dropzone. Hệ thống ghép xanh 100%, bấm *Bắt đầu nhập dữ liệu* là xong toàn bộ.
* **Lưu ý quan trọng**: Đặt tên file ảnh trùng cột "Tên file ảnh" hoặc trùng Mã hoa (SKU) để tự động ghép 100%. Nếu lỡ tay tải lại trang, dữ liệu xem trước được khôi phục tự động (`import-session-storage`).
* **[CẦN XÁC MINH]**: Tên nhãn hiển thị chính xác của nút bấm "Bắt đầu nhập dữ liệu" chưa được ghi chi tiết văn bản trong nguồn.

### 6. Các chức năng liên quan
* **Sản Phẩm & Giá (`/san-pham`)**, **Thẻ Chào (`/the-chao`)**.

---

## CHÚC NĂNG 07: QUÉT ÁNH HOA - PHÂN TÍCH AI (`/tai-anh`)

### 1. Chức năng dùng để làm gì?
Trang **Quét Ảnh Hoa** (`/tai-anh`) ứng dụng Trí tuệ Nhân tạo Computer Vision. Giúp tự động bóc tách loài hoa, đếm cành, viết bài mô tả thương mại cảm xúc, và tạo kịch bản chat Zalo tư vấn chốt đơn 1 chạm.

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Thợ cắm hoa (`florist`), Nhân viên bán hàng (`sales`), Quản lý danh mục.
* **Thời điểm sử dụng**: Khi cắm xong mẫu hoa mới hoặc nhập giống hoa lạ; khi Sale cần kịch bản Zalo chốt đơn nhanh.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

Quy trình 3 chặng tuần tự trên `FlowSteps`:

#### A. Chặng 1: Nhận diện & Bóc tách Thị giác (M01a)
* **Thao tác**: Chụp hoặc tải ảnh hoa lên.
* **Kết quả**: Thẻ `AnalysisResultCard` hiển thị loài hoa, số cành, màu sắc, dáng cắm, đánh giá chất lượng ảnh. Nhấp vào để chỉnh sửa tại chỗ (In-place Editing) rồi bấm duyệt.

#### B. Chặng 2: Sinh Nội Dung Thương Mại (M01b)
* **Thao tác**: Nhấp chuyển sang Bước 2 trên thanh `FlowSteps`.
* **Kết quả**: Thẻ `CommercialContentCard` tự động xuất tên thương mại (vd: *"Vũ Khúc Nắng Mai"*), bài mô tả cảm xúc, thẻ dịp tặng và điểm bán hàng độc nhất (KSP).

#### C. Chặng 3: Kịch Bản Tư Vấn Zalo & Báo Giá (M01c)
* **Thao tác**: Nhấp chuyển sang Bước 3, xem kịch bản đã tự động đồng bộ tên tiệm, hotline, quà tặng. Nhấp **"Sao chép kịch bản Zalo"** (Copy 1 chạm).
* **Kết quả**: Sao chép tin nhắn Zalo kèm khoảng giá gợi ý để dán ngay cho khách.

#### D. Tái sử dụng mẫu hoa cũ (ApprovedAnalysesSelector)
* **Thao tác**: Chọn mẫu hoa trong danh sách 50 ảnh từng duyệt trong quá khứ.
* **Kết quả**: Tải lại dữ liệu cũ để sinh kịch bản bán hàng mới không tốn lượt quét.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Tiệm nhập giống hồng ngoại mới. Thợ chụp ảnh tải lên `/tai-anh`. AI nhận diện loài hoa, đếm cành, đặt tên *"Hơi Thở Paris"*, viết bài Facebook và kịch bản Zalo chỉ trong 10 giây.
* **Lưu ý quan trọng**: Mỗi lượt quét tiêu tốn Credit AI. Hệ thống có cơ chế `Idempotency Key` chống phân tích trùng khi bấm liên tiếp.
* **[CẦN XÁC MINH]**: Tên nhãn nút bấm "Duyệt bản phân tích" chưa được ghi văn bản cụ thể trong nguồn.

### 6. Các chức năng liên quan
* **Sản Phẩm & Giá (`/san-pham`)**, **Kho Dữ Liệu (`/kho-du-lieu`)**.

---

## CHÚC NĂNG 08: KHO DỮ LIỆU SẢN PHẨM (`/kho-du-lieu`)

### 1. Chức năng dùng để làm gì?
Trang **Kho Dữ Liệu** (`/kho-du-lieu`) là trung tâm lưu trữ tài sản số của tiệm hoa trên đám mây. Giúp quản lý 3 phân vùng chuẩn + 1 phân vùng Thùng rác 30 ngày (`AccountStorageHub`):
1. **1. Ảnh Gốc (`raw`)**: Lưu ảnh chụp thô chưa quét AI.
2. **2. Ảnh Đã Duyệt (M01a) (`approved`)**: Lưu kết quả AI đã duyệt (ảnh, mã hoa, dáng cắm, BOM).
3. **3. Sale Pitch Hoàn Thành (`finalized`)**: Lưu bộ kịch bản Zalo và thẻ báo giá hoàn chỉnh.
4. **4. Thùng Rác (30 ngày) (`trash`)**: Quản lý tài nguyên bị xóa tạm (chỉ dành cho Quản lý/Điều hành).

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Toàn bộ nhân viên (tra cứu, copy kịch bản); Quản lý/Điều hành (`isExecutive`) (phê duyệt, dọn dẹp thùng rác); Quản trị viên (`store_manager`) (xóa vĩnh viễn).
* **Thời điểm sử dụng**: Khi tìm lại nội dung tư vấn mẫu hoa cũ; khi đẩy ảnh thô sang quét AI; khi dọn dẹp kho ảnh.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

#### A. Tra cứu và thao tác trên 3 Phân vùng
* **Bước 1**: Nhấp **"Kho Dữ Liệu"** trên Sidebar (hoặc mở `/kho-du-lieu`).
* **Bước 2**: Gõ từ khóa vào ô **Search Box** để tìm kiếm thời gian thực.
* **Bước 3**: Chọn Tab làm việc:
  * *Tab 1 (Ảnh gốc)*: Bấm **"Đưa vào phân tích AI"** -> Chuyển sang `/tai-anh`.
  * *Tab 2 (Ảnh đã duyệt)*: Bấm **"Tạo kịch bản bán hàng (M01c)"** -> Sinh kịch bản chốt đơn.
  * *Tab 3 (Sale Pitch)*: Bấm **"Sao chép kịch bản Zalo"** (Copy 1 chạm) -> Dán ngay vào Zalo cho khách.

#### B. Tải ảnh mới & Quản lý Thùng rác
* Nhấp **"+ Tải ảnh mới"** ở góc trên bên phải -> Chuyển sang `/tai-anh`.
* On thẻ tài nguyên, nhấp chuyển vào Thùng rác (qua `TrashConfirmModal`).
* Mở **Tab 4: Thùng Rác (30 ngày)** (chỉ hiển thị cho `isExecutive`), nhấp **"Khôi phục"** hoặc **"Xóa vĩnh viễn"**.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Khách hỏi mẫu hoa bán tuần trước. Sale vào Tab 3 gõ tên hoa, bấm *Sao chép kịch bản Zalo* dán gửi khách. Quản lý vào Tab 1 chọn ảnh mờ chuyển vào Thùng rác để dọn kho.
* **Lưu ý quan trọng**: Thao tác xóa của nhân viên chỉ chuyển vào Thùng rác 30 ngày. Bắt buộc tài khoản `store_manager` mới xóa vĩnh viễn được.
* **[CẦN XÁC MINH]**: Tên nhãn nút "Khôi phục" và "Xóa vĩnh viễn" chưa có văn bản cụ thể trong nguồn.

### 6. Các chức năng liên quan
* **Quét ảnh hoa (`/tai-anh`)**, **Sản Phẩm & Giá (`/san-pham`)**, **Thẻ Chào (`/the-chao`)**.

---

## CHÚC NĂNG 09: HỒ SƠ CỬA HÀNG (`/ho-so`)

### 1. Chức năng dùng để làm gì?
Trang **Hồ Sơ Cửa Hàng** (`/ho-so`) định hình toàn bộ "bộ mặt thương hiệu" và tài khoản VietQR nhận cọc của tiệm hoa. **Tự động đồng bộ** hotline, địa chỉ, logo, tài khoản ngân hàng sang Header Thẻ chào, Phiếu in A6/Hóa đơn và Lời chào AI. Cung cấp 2 chế độ: **Hành trình** (cho tiệm mới) và **Chuyên gia** (5 tab).

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Tất cả nhân viên (xem thông tin); Chủ tiệm / Quản trị viên cấp cao nhất (`store_admin` / `dieu_hanh`) (chỉnh sửa).
* **Thời điểm sử dụng**: Khi mới khởi tạo tài khoản tiệm; khi thay đổi hotline, địa chỉ, ngân hàng; khi điều chỉnh tỷ lệ cọc (50% hoặc 100%) trước đợt lễ.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

Thao tác tại 5 Tab Chuyên gia:
* **Tab 1: Hồ sơ kinh doanh (`business`)**: Nhập tên tiệm, hotline, địa chỉ, số tài khoản VietQR Napas 247. -> *Kết quả*: VietQR tự động ghép chính xác số tài khoản và tiền cọc.
* **Tab 2: Nhận diện thương hiệu (`brand`)**: Nhập bảng màu ngũ hành 5 màu Hex, upload Logo (Avatar, Header, Favicon), Slogan và Phong cách hoa. -> *Kết quả*: Đồng bộ nhận diện thương hiệu trên link gửi khách.
* **Tab 3: Tài nguyên thương hiệu (`assets`)**: Upload khung ảnh thiệp chúc mừng, phông nền in ấn, mẫu băng rôn khai trương độc quyền.
* **Tab 4: Chính sách & Cam kết (`sales`)**: Cấu hình 6 phân khu (*Ưu đãi cam kết `StorePoliciesSection`*, *Chính sách thanh toán*, *Mức cọc theo bậc*, *Thời hạn tự hủy đơn*, *Quà tặng mặc định*, *Câu chào Zalo*). -> *Kết quả*: Tự động áp dụng mức cọc và thời hạn giữ đơn trên toàn hệ thống.
* **Tab 5: Dịp lễ & Giọng văn (`occasions`)**: Chọn các dịp lễ phục vụ và giọng văn AI mặc định (*Thân thiện*, *Trang trọng*, *Tươi vui*).
* **Hoàn tất**: Nhấp nút **"Lưu hồ sơ"** (hoặc **"Lưu thay đổi"**). -> *Kết quả*: Hệ thống kiểm tra `ShopProfileReadiness` và tự động đồng bộ thông tin toàn hệ thống.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Chủ tiệm mới điền tên tiệm *"Flora Boutique"*, hotline, tài khoản ngân hàng Techcombank, bấm *Lưu hồ sơ*. Mọi link gửi khách lập tức hiển thị thương hiệu chính chủ. Trước 20/10, vào Tab 4 chỉnh mức cọc lên 100% để chống bom hoa.
* **Lưu ý quan trọng**: Chỉ tài khoản `store_admin` / `dieu_hanh` mới có quyền sửa thông tin ngân hàng và chính sách. Hệ thống sẽ phát thanh cảnh báo nếu thiếu tài khoản nhận cọc.
* **[CẦN XÁC MINH]**: Tên nhãn nút lưu chính xác ở từng tab chưa được ghi riêng biệt trong nguồn.

### 6. Các chức năng liên quan
* **Thẻ Chào (`/the-chao`)**, **Đơn Hàng (`/don-hang`)**, **Cài Đặt (`/cai-dat`)**.

---

## CHÚC NĂNG 10: CÀI ĐẶT & QUẢN LÝ THÀNH VIÊN (`/cai-dat`)

### 1. Chức năng dùng để làm gì?
Phân hệ **Cài Đặt & Quản Lý Thành Viên** (`/cai-dat` và `/cai-dat/thanh-vien`) là trung tâm quản trị hệ thống và phân quyền nhân sự cao nhất. Giúp cấp tài khoản dùng ngay cho nhân viên mới trong 10 giây (không cần email xác nhận) và thu hồi quyền truy cập tức thì khi nhân viên nghỉ việc.

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Chủ tiệm / Điều hành (Quyền A3 - tạo nhân viên), Quản trị hệ thống (F2/H4 - sửa thông tin vận hành), Chủ tiệm/Quản lý cấp cao (F5 - đổi vai trò, F4 - khóa/xóa nhân viên).
* **Thời điểm sử dụng**: Khi tuyển nhân viên mới; khi chuyển chi nhánh/nâng quyền nhân sự; khi nhân viên nghỉ việc cần thu hồi quyền truy cập.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác

#### A. Trang Cài Đặt Chung (`/cai-dat`)
* **Bước 1**: Nhấp chọn **"Cài Đặt"** trên Sidebar (hoặc mở `/cai-dat`).
* **Bước 2**: Nhập Tên tiệm hiển thị, Hotline, Địa chỉ, Khung giờ mở cửa (mặc định 07:30 - 21:30), bấm **Lưu cài đặt** (F2/H4).
* **Bước 3**: Nhấp vào 1 trong 5 thẻ liên kết chuyên sâu: *Hồ sơ & Thương hiệu* (`/ho-so`), *Chính sách AI* (sắp ra mắt), *Kênh MXH* (sắp ra mắt), *Bộ máy phân tích* (sắp ra mắt), *Đội ngũ & Phân quyền* (`/cai-dat/thanh-vien`).

#### B. Phân hệ Quản Lý Thành Viên (`/cai-dat/thanh-vien`)
* **Bước 1**: Nhấp thẻ **"Đội Ngũ & Phân Quyền"** (hoặc mở `/cai-dat/thanh-vien`).
* **Bước 2: Thêm nhân viên mới (`AddStaffDialog` - Quyền A3)**:
  * Nhấp nút **"+ Thêm nhân viên"**.
  * Nhập Họ tên, Email đăng nhập, Mật khẩu khởi tạo, Gán Chi nhánh làm việc.
  * Chọn Vai trò chuẩn (`roleId`): *Store Manager* (Quản lý), *Sales* (Bán hàng), *Florist* (Thợ cắm hoa).
  * Nhấp **"Tạo tài khoản"**. -> *Kết quả*: Nhân viên đăng nhập được ngay lập tức trên máy tính/điện thoại.
* **Bước 3: Đổi vai trò hoặc Tạm khóa/Xóa nhân viên (Quyền F5 / F4)**:
  * On Bảng danh sách `MemberTable`, nhấp menu 3 chấm tại dòng nhân viên -> Chọn **"Đổi vai trò"** (`ChangeRoleDialog`) hoặc chọn **"Tạm khóa tài khoản"** / **"Xóa thành viên"**.
  * *Kết quả*: Cập nhật quyền mới hoặc hủy bỏ tức khắc toàn bộ phiên đăng nhập của nhân viên nghỉ việc trên server.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Tuyển Sale mới Nguyễn Thu Hà, Chủ tiệm mở `/cai-dat/thanh-vien` bấm *+ Thêm nhân viên*, điền email `ha.sales@tiemhoa.vn`, pass `HoaTuoi@2026`, gán vai trò *Sales*. Thu Hà đăng nhập làm việc ngay. Nhân viên nghỉ việc, Chủ tiệm bấm *Tạm khóa tài khoản* là cắt quyền truy cập ngay tức khắc.
* **Lưu ý quan trọng**: Hệ thống tự động ẩn nút "Tạm khóa" và "Xóa" trên chính tài khoản của người đang đăng nhập (`currentUserId`), chống chủ tiệm tự khóa tài khoản của mình.
* **[CẦN XÁC MINH]**: Tên nhãn nút bấm trong hộp thoại `AddStaffDialog` chưa có văn bản cụ thể trong nguồn.

### 6. Các chức năng liên quan
* **Hồ Sơ Cửa Hàng (`/ho-so`)**, Tác động phân quyền hiển thị trên toàn bộ các trang hệ thống.

---

## CHỨC NĂNG 11: KHÁCH HÀNG — YÊU CẦU VỀ DỮ LIỆU CÁ NHÂN (`/khach-hang`)

### 1. Chức năng dùng để làm gì?
Khách có quyền xin **bản sao**, xin **sửa** hoặc xin **xoá** dữ liệu cá nhân của mình (tên, số điện thoại, địa chỉ, dịp kỷ niệm, tin nhắn…). Khu **"Yêu cầu về dữ liệu"** trong hồ sơ khách giúp tiệm làm đúng ba việc đó và ghi lại từng yêu cầu, hạn xử lý **72 giờ**.

### 2. Ai sử dụng và khi nào?
* **Người sử dụng**: Điều hành và nhân viên được giao quyền. Nút **Xuất dữ liệu** chỉ hiện với người có quyền xuất dữ liệu ra tệp; nút **Xoá dữ liệu** chỉ hiện với người có quyền xoá khách; **Ghi nhận yêu cầu sửa** cho người sửa được hồ sơ khách.
* **Thời điểm sử dụng**: Khi khách nhắn, gọi hoặc đến tiệm đề nghị xem lại, sửa hoặc xoá thông tin của mình.

### 3. Hướng dẫn thao tác từng bước & 4. Kết quả sau mỗi thao tác
* **Bước 1**: Mở **Khách hàng** trên Sidebar, tìm khách, bấm **"Hồ sơ Master"** ở dòng của khách → hộp hồ sơ mở ra.
* **Bước 2**: Chọn tab **"Quyền riêng tư"**, kéo xuống khu **"Yêu cầu về dữ liệu"** → thấy ba nút và danh sách yêu cầu cũ (loại, trạng thái *Đang chờ / Đã xử lý / Từ chối*, ngày nhận, hạn).
* **Khách xin bản sao**: bấm **"Xuất dữ liệu"** → bấm **"Tải JSON"** hoặc **"Tải CSV"** (mở được bằng Excel) để gửi cho khách. *Kết quả*: tệp chứa hồ sơ, dịp kỷ niệm, đồng ý nhận tin, đơn hàng kèm người nhận và hoá đơn, tin nhắn, báo giá của khách; yêu cầu ghi là **Đã xử lý**.
* **Khách xin sửa**: bấm **"Ghi nhận yêu cầu sửa"**, ghi khách muốn sửa gì, bấm **"Ghi nhận"** → yêu cầu **Đang chờ**. Sửa thông tin ở tab **Hồ sơ**, quay lại bấm **"Đã sửa xong"** (hoặc **"Từ chối"** nếu không sửa được). *Kết quả*: yêu cầu chuyển sang **Đã xử lý** / **Từ chối**.
* **Khách xin xoá**: bấm **"Xoá dữ liệu"**, đọc kỹ thông báo, gõ **XOÁ** rồi bấm **"Xoá dữ liệu"**. *Kết quả*: tên khách thành "Khách đã xoá", số điện thoại, email, địa chỉ, ghi chú, dịp kỷ niệm và tin nhắn bị xoá; khách không còn nhận tin nhắn nhắc hẹn hay ưu đãi.

### 5. Tình huống thực tế và lưu ý quan trọng
* **Tình huống thực tế**: Khách nhắn Zalo "Tiệm xoá giúp em số điện thoại và địa chỉ nhé". Nhân viên mở hồ sơ khách → tab Quyền riêng tư → **Xoá dữ liệu** → gõ XOÁ → xác nhận. Đơn cũ của khách vẫn còn trong sổ đơn để đối chiếu doanh thu.
* **Lưu ý quan trọng**: Xoá **không hoàn tác được**. Đơn hàng, phiếu thu và thông tin hoá đơn VAT **vẫn được giữ** để đối chiếu sổ sách. Chi nhánh làm đơn gia công cũng chỉ còn thấy thông tin đã xoá.
* **Hạn 72 giờ**: yêu cầu đang chờ quá hạn hiện nhãn **"Quá hạn"** — xử lý sớm.

### 6. Các chức năng liên quan
* **Cài Đặt & Quản Lý Thành Viên (`/cai-dat/thanh-vien`)**: Điều hành giao quyền xuất / xoá dữ liệu khách cho nhân viên.
* **Quản Lý Đơn Hàng (`/don-hang`)**: đơn của khách đã xoá vẫn hiện, không còn tên và số điện thoại người nhận.

---

## PHỤ LỤC: DANH SÁCH NỘI DUNG CẦN XÁC MINH TRỰC TIẾP TRÊN GIAO DIỆN THỰC TẾ

| STT | Phân hệ / Chức năng | Nội dung cần kiểm tra & xác minh thực tế | Lý do cần xác minh |
| :--- | :--- | :--- | :--- |
| 1 | **Trang Chủ (`/`)** | Tên nhãn nút bấm và đường dẫn chuyển hướng khi bấm vào khối *"Đòn bẩy Tăng trưởng Doanh số"* và nút tắt *"Xu hướng thị trường"*. | Tài liệu nguồn chưa ghi nhận tên nút bấm và luồng thao tác chi tiết. |
| 2 | **Đơn Hàng (`/don-hang`)** | Nhãn nút bấm để gán tên thợ cắm hoa hoặc chọn Shipper trực tiếp trên thẻ Kanban (ngoài cửa sổ Chi tiết đơn). | Cần kiểm tra xem có hỗ trợ kéo thả thẻ hoặc nút menu thao tác nhanh trên thẻ không. |
| 3 | **Thẻ Chào (`/the-chao`)** | Văn bản hiển thị chính xác của nút bấm "Tạo link" ở Bước 3 chế độ Gửi nhanh và nút bấm chọn thợ cắm hoa ở Tab 5 (Điều phối). | Cần xác minh nhãn tiếng Việt thực tế trên màn hình. |
| 4 | **Sản Phẩm & Giá (`/san-pham`)** | Giao diện và các nút thao tác bên trong hộp thoại xác nhận Thùng rác (`TrashConfirmModal`). | Cần xác minh văn bản hiển thị nút Khôi phục/Xóa vĩnh viễn trên modal. |
| 5 | **Tạo Mẫu Hoa Mới (`/san-pham/tao-moi`)** | Tên nhãn nút bấm "Thêm dòng thành phần hoa" và "Xóa dòng" trong bảng Atomic BOM. | Cần xác minh icon hoặc nhãn chữ hiển thị trên bảng BOM. |
| 6 | **Nhập từ Excel (`/san-pham/nhap-hang-loat`)** | Tên văn bản chính xác của nút "Bắt đầu nhập dữ liệu" và vị trí nút Quay lại trên Header. | Cần xác minh tên nhãn hiển thị chính xác trên giao diện thực tế. |
| 7 | **Quét Ảnh Hoa (`/tai-anh`)** | Nhãn hiển thị của nút "Duyệt bản phân tích" và nút "Lưu thành sản phẩm". | Cần xác minh văn bản nút chuyển từ kết quả AI sang CSDL sản phẩm. |
| 8 | **Kho Dữ Liệu (`/kho-du-lieu`)** | Nhãn hiển thị chính xác của nút "Khôi phục" và "Xóa vĩnh viễn" bên trong Tab Thùng rác. | Cần xác minh văn bản nút bấm cho vai trò `store_manager`. |
| 9 | **Hồ Sơ Cửa Hàng (`/ho-so`)** | Vị trí và tên nhãn nút bấm "Lưu hồ sơ" / "Lưu thay đổi" tại từng tab cấu hình. | Cần xác minh xem nút lưu nằm cố định ở footer hay ở cuối từng tab. |
| 10 | **Cài Đặt (`/cai-dat`)** | Nhãn hiển thị của nút bấm "Tạo tài khoản" / "Xác nhận" trong hộp thoại `AddStaffDialog`. | Cần xác minh văn bản nút bấm khởi tạo tài khoản nhân viên. |

---
*Tài liệu trình duyệt hoàn tất. Sẵn sàng phát hành cho nhân viên cửa hàng sau khi đối soát các điểm xác minh giao diện.*
