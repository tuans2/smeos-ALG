# BẢN ĐỒ NỘI DUNG UI — 01. TRANG CHỦ (`/`)

> **Màn hình**: Trang chủ Cửa hàng (Hành trình tác vụ & ChoiceGrid)  
> **Tuyến đường**: `/`  
> **Mã phân hệ**: `HOME`  
> **Trạng thái**: Đã chuẩn hóa 100% theo Từ điển SSOT.

---

## 1. Khối Tiêu đề & Thanh điều hướng trên cùng (Header & Bar)

| Mã Copy | Loại | Vị trí hiển thị | Nội dung HIỆN TẠI trên UI | Nội dung BẠN CHUẨN HÓA (Mới) | Ghi chú ngữ cảnh |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HOME-HDR-01` | `HDR` | Huy hiệu nhỏ trên tiêu đề | `HÀNH TRÌNH TÁC VỤ THÔNG MINH` | `Bắt đầu nhanh` | Viên thuốc nhỏ phía trên `H1`, bỏ ALL CAPS |
| `HOME-HDR-02` | `HDR` | Tiêu đề chính `H1` | `BẠN MUỐN LÀM GÌ CHO CỬA HÀNG?` | `Hôm nay bạn muốn làm gì cho cửa hàng?` | Câu hỏi định hướng trọng tâm (Sentence case) |
| `HOME-HDR-03` | `HDR` | Mô tả phụ dưới `H1` | `Chọn một tác vụ để bắt đầu hành trình làm việc có định hướng cho cửa hàng hoa` | `Chọn một công việc bên dưới để bắt đầu.` | Định hướng ngắn gọn, tránh lặp ý |
| `HOME-BTN-01` | `BTN` | Góc trên bên phải | `Chế độ chuyên gia` | `Xem bảng số liệu` | Nút chuyển sang Dashboard số liệu trực tiếp |
| `HOME-BTN-02` | `BTN` | Thanh chuyển đổi Chế độ chuyên gia | `Chuyển sang Chế độ hành trình tác vụ` | `Về trang chọn công việc` | Hiện khi đang bật Chế độ chuyên gia |
| `HOME-HDR-04` | `HDR` | Banner thông báo Chế độ chuyên gia | `Bạn đang ở Chế độ chuyên gia (Bảng điều khiển trực tiếp)` | `Bạn đang xem bảng số liệu trực tiếp.` | Dòng nhắc nhở trên đầu Dashboard |

---

## 2. Thanh lọc danh mục & Tìm kiếm (Filter & Search)

| Mã Copy | Loại | Vị trí hiển thị | Nội dung HIỆN TẠI trên UI | Nội dung BẠN CHUẨN HÓA (Mới) | Ghi chú ngữ cảnh |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HOME-TAB-01` | `TAB` | Tab 1 | `Tất cả ({{count}})` | `Tất cả ({{count}})` | Hiển thị tổng số công việc |
| `HOME-TAB-02` | `TAB` | Tab 2 | `Tác vụ đơn` | `Việc đơn lẻ` | Bỏ từ jargon "tác vụ" |
| `HOME-TAB-03` | `TAB` | Tab 3 | `Gói quy trình` | `Quy trình trọn gói` | Lọc các combo đa bước |
| `HOME-TAB-04` | `TAB` | Tab 4 | `Trợ lý ảo` | `Trợ lý AI` | Thống nhất "Trợ lý AI" theo từ điển |
| `HOME-PH-01` | `PH` | Ô tìm kiếm tác vụ | `Tìm tác vụ mong muốn...` | `Tìm công việc…` | Gợi ý tìm kiếm nhanh |
| `HOME-EMP-01` | `EMP` | Khi tìm kiếm không có kết quả | `Không tìm thấy tác vụ phù hợp với từ khóa “{{searchQuery}}”.` | `Không có kết quả cho “{{searchQuery}}”. Hãy thử từ khóa khác.` | Hướng dẫn hành động tiếp theo |

---

## 3. Thẻ tiêu điểm trọng tâm (Featured Spotlight Card — Thẻ Chào Mẫu Hoa)

| Mã Copy | Loại | Vị trí hiển thị | Nội dung HIỆN TẠI trên UI | Nội dung BẠN CHUẨN HÓA (Mới) | Ghi chú ngữ cảnh |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HOME-FBDG-01`| `BDG` | Huy hiệu trên cùng bên trái | `TÍNH NĂNG TRỌNG TÂM` | `Nổi bật` | Huy hiệu màu cam nhẹ nhàng |
| `HOME-FBDG-02`| `BDG` | Trạng thái sẵn sàng | `Sẵn sàng phục vụ` | `Sẵn sàng sử dụng` | Trạng thái hệ thống |
| `HOME-FHDR-01`| `HDR` | Tiêu đề thẻ tiêu điểm | `Thẻ Chào mẫu hoa` | `Thẻ chào mẫu hoa` | Chuẩn hóa Sentence case |
| `HOME-FDES-01`| `HDR` | Mô tả chi tiết thẻ tiêu điểm | `Tạo bộ sưu tập hoa, gửi link cho khách lướt chọn mẫu, theo dõi thanh toán và điều phối cắm hoa giao đến tay người nhận` | `Gửi bộ sưu tập hoa cho khách chọn mẫu, đặt hàng và thanh toán ngay trên điện thoại.` | Cô đọng dưới 90 ký tự |
| `HOME-FTIP-01`| `LBL` | Điểm nổi bật 1 | `Gửi link chọn mẫu qua Zalo` | `Gửi link qua Zalo` | Lợi ích cho nhân viên bán hàng |
| `HOME-FTIP-02`| `LBL` | Điểm nổi bật 2 | `Khách tự chọn & gửi lời chúc` | `Khách tự chọn mẫu và gửi lời chúc` | Dùng "và" thay cho ký tự `&` |
| `HOME-FTIP-03`| `LBL` | Điểm nổi bật 3 | `Tự động nhận đơn & điều phối` | `Đơn vào hệ thống và giao việc cho thợ` | Rõ nghĩa nghiệp vụ xưởng hoa |
| `HOME-FBTN-01`| `BTN` | Nút kêu gọi hành động (CTA) | `Mở Thẻ Chào & Tạo Link` | `Tạo link đặt hoa` | 1 động từ hành động rõ ràng |
| `HOME-FSUB-01`| `LBL` | Dòng ghi chú dưới nút CTA | `Khuyên dùng mỗi ngày cho tiệm` | `Nên dùng mỗi ngày cho cửa hàng` | Thống nhất danh xưng "cửa hàng" |

---

## 4. Lưới thẻ chức năng (Action Cards — 13 Thẻ còn lại)

> **Cập nhật 30/10/2026 (PO duyệt phong cách "Thoáng – Ít chữ – Icon lớn"):** tên thẻ rút gọn ≤ 5 từ, mô tả nằm trong dấu "?". Tên hiện hành: Xem báo cáo · Xu hướng thị trường · Sản phẩm từ ảnh · Tạo báo giá · Viết bài đăng · Giọng đọc · Ảnh quảng cáo · Video sản phẩm · Trang bán hàng · Xử lý đơn hàng · Quản lý khách hàng · Ra mắt sản phẩm mới · Hỏi trợ lý ALG. Nguồn: `src/modules/journey/domain/journey-catalog.ts` (test `journey-short-goals.test.ts`); thuật ngữ theo ngành chỉ đổi ở mô tả. Cột "HIỆN TẠI" bên dưới là lịch sử.

| Mã Copy | Loại | Tên thẻ (Goal) | Nội dung HIỆN TẠI trên UI | Nội dung BẠN CHUẨN HÓA (Mới) | Trạng thái Production |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HOME-CRD-01T`| `HDR` | Báo cáo | `Xem báo cáo` | `Xem báo cáo` | Đang mở |
| `HOME-CRD-01D`| `HDR` | Mô tả | `Nắm bắt doanh thu, đơn hàng, mức độ sử dụng ALG và kho tư liệu đã tạo` | `Xem doanh thu, số đơn hàng và hoạt động trên ALG của cửa hàng.` | Đang mở |
| `HOME-CRD-02T`| `HDR` | Xu hướng | `Xem mẫu hoa đang được yêu thích` | `Xem mẫu hoa được ưa chuộng` | Sắp ra mắt |
| `HOME-CRD-02D`| `HDR` | Mô tả | `Biết khách đang chuộng kiểu hoa, màu sắc và mức giá nào để tiệm cắm bán theo` | `Biết khách thích kiểu hoa, màu sắc và mức giá nào để chuẩn bị hàng.` | Sắp ra mắt |
| `HOME-CRD-03T`| `HDR` | Quét ảnh | `Tạo Thẻ sản phẩm từ ảnh` | `Tạo mẫu hoa từ ảnh chụp` | **Đang mở** (Mở khóa P0) |
| `HOME-CRD-03D`| `HDR` | Mô tả | `Chụp ảnh hoa tại tiệm để tự động phân tích loại hoa, ước tính chi phí và tạo mẫu bán` | `Chụp ảnh hoa, AI nhận diện các loại hoa và tạo sẵn mẫu hoa để bán.` | **Đang mở** (Mở khóa P0) |
| `HOME-CRD-04T`| `HDR` | Báo giá | `Tạo Thẻ báo giá sản phẩm` | `Tạo báo giá` | Sắp ra mắt |
| `HOME-CRD-04D`| `HDR` | Mô tả | `Tạo bộ báo giá hoa theo nhu cầu khách mua hoa hoặc thẻ báo giá cho đối tác shop` | `Soạn báo giá hoa cho khách mua hoặc cho đối tác của cửa hàng.` | Sắp ra mắt |
| `HOME-CRD-05T`| `HDR` | Viết bài | `Viết nội dung bài đăng cho các nền tảng` | `Viết bài đăng` | Sắp ra mắt |
| `HOME-CRD-05D`| `HDR` | Mô tả | `Soạn bài viết Facebook, Instagram, TikTok đúng giọng điệu của tiệm kèm gợi ý hashtag` | `Soạn bài cho Facebook, Instagram, TikTok đúng giọng văn của cửa hàng, kèm gợi ý hashtag.` | Sắp ra mắt |
| `HOME-CRD-06T`| `HDR` | Giọng đọc | `Tạo giọng đọc cho bài đăng` | `Tạo giọng đọc cho bài đăng` | Sắp ra mắt |
| `HOME-CRD-06D`| `HDR` | Mô tả | `Chuyển bài viết thành giọng đọc truyền cảm để ghép vào video giới thiệu mẫu hoa` | `Chuyển bài viết thành giọng đọc để ghép vào video giới thiệu mẫu hoa.` | Sắp ra mắt |
| `HOME-CRD-07T`| `HDR` | Ảnh mẫu | `Tạo ảnh quảng cáo từ ảnh gốc` | `Tạo ảnh quảng cáo từ ảnh gốc` | Sắp ra mắt |
| `HOME-CRD-07D`| `HDR` | Mô tả | `Tách nền, phối cảnh studio sang trọng hoặc đặt hoa vào không gian tiệc/sự kiện thực tế` | `Tách nền và đặt hoa vào không gian studio hoặc sự kiện để có ảnh quảng cáo đẹp hơn.` | Sắp ra mắt |
| `HOME-CRD-08T`| `HDR` | Video | `Tạo video chuyển động từ ảnh hoa` | `Tạo video từ ảnh hoa` | Sắp ra mắt |
| `HOME-CRD-08D`| `HDR` | Mô tả | `Tạo video ngắn chuyển động mượt mà từ ảnh chụp bó hoa để đăng Story/Reels/TikTok` | `Biến ảnh bó hoa thành video ngắn để đăng Story, Reels, TikTok.` | Sắp ra mắt |
| `HOME-CRD-09T`| `HDR` | Trang bán | `Tạo trang giới thiệu và bán hoa` | `Tạo trang giới thiệu và bán hoa` | Sắp ra mắt |
| `HOME-CRD-09D`| `HDR` | Mô tả | `Tạo trang web giới thiệu bộ sưu tập hoa kèm mã QR để in gắn lên thiệp hoặc quầy thu ngân` | `Tạo trang web bộ sưu tập hoa kèm mã QR để in lên thiệp hoặc đặt ở quầy.` | Sắp ra mắt |
| `HOME-CRD-10T`| `HDR` | Đơn hàng | `Tiếp nhận & Xử lý đơn hàng (Dành cho Điện Hoa)`| `Xử lý đơn hàng` | **Đang mở** (Mở khóa P0) |
| `HOME-CRD-10D`| `HDR` | Mô tả | `Theo dõi đơn từ lúc chốt, phân công thợ cắm đến khi giao tận tay người nhận` | `Theo dõi đơn từ lúc chốt, giao việc cho thợ cắm đến khi hoa tới tay người nhận.` | **Đang mở** (Mở khóa P0) |
| `HOME-CRD-11T`| `HDR` | Khách hàng | `Quản lý khách hàng` | `Quản lý khách hàng` | Sắp ra mắt |
| `HOME-CRD-11D`| `HDR` | Mô tả | `Lưu sở thích hoa, ngày sinh nhật, dịp kỷ niệm và lịch sử đặt hoa của từng khách quen` | `Lưu sở thích, ngày sinh nhật, ngày kỷ niệm và lịch sử đặt hoa của khách quen.` | Sắp ra mắt |
| `HOME-CRD-12T`| `HDR` | Combo | `Ra mắt mẫu hoa mới` | `Ra mắt mẫu hoa mới` | Sắp ra mắt |
| `HOME-CRD-12D`| `HDR` | Mô tả | `Từ 1 ảnh chụp hoa: Phân tích thành phần → Tạo thẻ sản phẩm → Viết bài → Ghép ảnh quảng cáo` | `Từ một ảnh chụp: nhận diện hoa, tạo mẫu hoa, viết bài và làm ảnh quảng cáo.` | Sắp ra mắt |
| `HOME-CRD-13T`| `HDR` | Chatbot | `Trợ lý ALG Chat` | `Hỏi trợ lý ALG` | Sắp ra mắt |
| `HOME-CRD-13D`| `HDR` | Mô tả | `Trợ lý ảo thông minh trả lời câu hỏi và hướng dẫn bạn vận hành tiệm hoa hiệu quả` | `Trợ lý AI giải đáp thắc mắc và hướng dẫn bạn dùng ALG.` | Sắp ra mắt |

---

## 5. Nhãn chân thẻ & Trạng thái khóa (Card Footer & Badges)

| Mã Copy | Loại | Vị trí hiển thị | Nội dung HIỆN TẠI trên UI | Nội dung BẠN CHUẨN HÓA (Mới) | Ghi chú ngữ cảnh |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HOME-CBTN-01`| `BTN` | Thẻ đang mở | `Bắt đầu ngay` | `Bắt đầu ngay` | Nhãn nút trên thẻ mở |
| `HOME-CBTN-02`| `BDG` | Thẻ bị khóa | `Sắp ra mắt` | `Sắp ra mắt` | Huy hiệu trên các thẻ khóa |
| `HOME-CBTN-03`| `LBL` | Thẻ combo | `{{count}} bước liền mạch` | `{{count}} bước` | Ví dụ: `4 bước` |
| `HOME-CBTN-04`| `BTN` | Thẻ AI Chat | `Trò chuyện ngay` | `Trò chuyện ngay` | Nhãn nút thẻ trợ lý AI |
