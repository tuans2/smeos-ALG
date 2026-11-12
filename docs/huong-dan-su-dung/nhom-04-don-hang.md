# Nhóm 4 — Đơn hàng

32 chức năng, từ nhận đơn tới thu đủ tiền. Đơn đến từ hai nguồn:

- **Đơn Thẻ Chào** — khách tự đặt qua link. Xử lý ở **Thẻ chào sản phẩm** với các tab **Bán hàng**, **Điều hành**, **Điều phối**,
  **Theo dõi đơn**.
- **Đơn nguồn khác** — nhân viên tạo tay, từ báo giá, catalog. Xử lý ở **Đơn hàng** với các tab theo vai: **Khách tiềm năng**,
  **Sale chăm sóc**, **Phê duyệt**, **Điều phối**, **Tất cả**.

Mỗi đơn có ba trạng thái chạy song song: **xử lý** (nhận, xác nhận, hoàn tất, huỷ), **sản xuất** (chờ, đang làm, xong), **giao hàng**
(chưa giao, đang giao, đã giao, giao không được).

---

## Nhận và tạo đơn

### 4.1 Tạo đơn tay

**Ai dùng:** Sale, Điều phối, Điều hành.
**Mở ở:** Đơn hàng → nút **Tạo đơn** ở góc trên.

1. **Sản phẩm và phụ kiện:** chọn mẫu có sẵn trong kho hoặc nhập trực tiếp; số lượng, đơn giá. Xem **Tạm tính**.
2. **Người nhận**, **Số điện thoại người nhận**, địa chỉ đủ 4 cấp (số nhà, phường, quận, tỉnh).
3. **Ngày hẹn giao**, **Khung giờ giao** (Sáng sớm 07:30–09:30, Sáng 09:30–11:30, Chiều 13:30–15:30, Chiều muộn 15:30–17:30,
   Tối 18:00–20:00, hoặc Giao gấp trong 60 phút).
4. **Lời nhắn trên thiệp**, **Ghi chú cho thợ**. Lưu.

### 4.2 Đơn khách tự đặt trên Thẻ Chào

**Ai dùng:** tự động.

Khách đặt trên link Thẻ Chào hoặc catalog → đơn mới hiện ngay ở tab **Điều hành** và **Theo dõi đơn**, gắn với Sale đã gửi link.
Cửa hàng quá hạn thanh toán thuê bao thì link tạm ngưng nhận đơn; khách được mời liên hệ trực tiếp.

### 4.3 Tìm và lọc đơn

1. Ô tìm kiếm: tên khách, mã đơn, số điện thoại.
2. **Lọc nâng cao:** khoảng ngày giao (**Giao từ ngày – Giao đến ngày**), **Chi nhánh**, **Nhân viên bán**, trạng thái, thanh toán.
3. Bấm một đơn để mở chi tiết: thông tin nhận hàng, sản phẩm, thời gian và trạng thái, tổng tiền, lời nhắn thiệp.

### 4.4 Ba loại trạng thái

Mỗi đơn hiện đồng thời trạng thái xử lý, sản xuất, giao hàng. Mọi lần đổi trạng thái được ghi lại (ai, lúc nào, từ gì sang gì) trong
lịch sử đơn (4.8).

### 4.5 Khung giờ giao, sức chứa và màn Shipper

- Cửa hàng đặt số đơn tối đa mỗi khung giờ; khung đã đủ thì khách không chọn được.
- **Shipper:** trang chủ là **Đơn cần giao** — chỉ thấy người nhận, số điện thoại, địa chỉ, khung giờ, lời thiệp.
  1. Đến nơi, giao hàng, chụp **ảnh giao** và báo giao xong.
  2. Không giao được: chọn báo giao không được, nhập **Lý do giao không được**.
- Đơn được gắn cho Shipper theo **số điện thoại** Điều phối ghi khi điều xe. Shipper cần có số điện thoại trong tài khoản (Điều hành
  nhập ở màn Đội ngũ & phân quyền).

**Lưu ý:** shipper thuê ngoài không có tài khoản thì chỉ ghi tên và số điện thoại vào đơn.

### 4.6 Đổi thông tin đơn

1. Trong chi tiết đơn, gửi yêu cầu đổi (địa chỉ, giờ giao, lời thiệp…) kèm lý do.
2. Hệ thống lưu giá trị cũ và mới, người đổi, thời điểm.

### 4.7 Huỷ đơn và hoàn tiền

**Ai dùng:** nhân viên gửi yêu cầu; chỉ Điều hành duyệt.

1. Gửi yêu cầu huỷ kèm lý do.
2. Điều hành mở tab **Điều hành** (Thẻ chào) hoặc **Phê duyệt** (Đơn hàng), duyệt huỷ.
3. Khách đã trả tiền: Điều hành ghi **hoàn tiền** (4.27).

### 4.8 Lịch sử đơn

**Mở ở:** chi tiết đơn → tab **Lịch sử đơn hàng**. Mọi sự kiện theo thời gian; nút sao chép để gửi khi giải quyết khiếu nại.

## Sản xuất

### 4.9 In phiếu xưởng A6 và băng rôn

1. Trong chi tiết đơn bấm **In phiếu A6**.
2. Trang in mở riêng: **phiếu xưởng khổ A6** (ảnh mẫu, phiên bản, số cành, công thức có ô đánh dấu, lời thiệp) hoặc **băng rôn A4
   ngang**. Dùng lệnh in của trình duyệt.

### 4.10 Xuất danh sách đơn ra Excel

**Ai dùng:** Điều hành, Kế toán (người có quyền xuất dữ liệu).

Bấm nút xuất Excel ở màn **Đơn hàng** (hoặc Thẻ chào sản phẩm, trang chủ Kế toán) → tệp gồm 4 trang: Đơn hàng, Chi tiết sản phẩm, Sổ thu tiền, Thẻ Chào. Bạn chỉ xuất được đơn trong phạm
vi của mình (Sale thấy đơn của mình, nhân viên chi nhánh thấy đơn chi nhánh). Mỗi lần xuất được ghi lại.

### 4.11 Các đơn khác của cùng khách

**Mở ở:** Khách hàng → mở khách → tab **Đơn đã đặt** — **Sắp ra mắt** trên bản chính thức.

Hiện cả đơn gắn khách và đơn cùng số điện thoại người đặt. Bấm một đơn để mở chi tiết.

### 4.12 Bảng điều phối và rủi ro trễ giờ

**Mở ở:** Vận hành → **Sản xuất & điều phối** — **Sắp ra mắt** trên bản chính thức. Trong lúc chờ, dùng tab **Điều phối** của Thẻ chào
và Đơn hàng.

Đơn được xếp 4 mức rủi ro theo số phút còn lại tới giờ giao; đơn nguy cơ trễ lên đầu.

### 4.13 Phân công thợ và việc của thợ

1. Điều phối mở đơn, chọn thợ và phân công. Giao lại cho thợ khác thì phân công cũ tự huỷ.
2. **Thợ chế tác** mở trang chủ **Việc của tôi**: việc sắp theo giờ giao, có công thức và ảnh mẫu, không hiện giá.
3. Thợ bấm nhận việc, làm xong bấm báo xong.

**Lưu ý:** đơn Thẻ Chào hiện giao thợ bằng ghi chú trong đơn, chưa vào **Việc của tôi**.

### 4.14 Đơn thiếu thông tin

- Hệ thống tự phát hiện đơn thiếu địa chỉ, số điện thoại người nhận, lời chúc (khi có thiệp) và tạo việc **Thiếu thông tin** trong Hộp
  việc; bổ sung đủ thì việc tự đóng; quá hạn thì nhắc.
- Trong chi tiết đơn, khối **Thông tin cần bổ sung**: bấm **Thêm yêu cầu**, ghi thông tin còn thiếu và hỏi ai; khi có thông tin bấm
  **Đã nhận**; không cần nữa thì huỷ kèm lý do.

### 4.15 Kiểm tra chất lượng (QC)

1. Thợ chụp ảnh thành phẩm và tải lên đơn.
2. Người kiểm tra đối chiếu với mẫu, chọn đạt hoặc làm lại.
3. Với đơn Thẻ Chào, khách được duyệt ảnh thành phẩm (5.13).

### 4.16 AI chấm ảnh thành phẩm

Khi tải ảnh QC, AI so ảnh với mẫu gốc, cho điểm tin cậy và kết luận gợi ý. Người kiểm tra quyết định cuối; AI lỗi thì kiểm tay như
bình thường.

## Giao hàng

### 4.17 Bàn giao shipper và giao lại

1. Điều phối chọn shipper (ghi tên và số điện thoại), chuyển đơn sang đang giao.
2. Giao không được: Hộp việc hiện việc **Giao không thành công — Hẹn giao lại** (hoặc **Liên hệ lại người nhận**); hẹn lại giờ giao rồi điều xe lần nữa.

### 4.18 Ảnh giao bắt buộc

Báo giao xong cần ảnh chụp lúc giao tận tay. Ảnh hiện cho khách trên trang theo dõi. Điều hành tắt được yêu cầu này trong Cài đặt
tiệm → tab **8. Thẻ Chào & quy trình**.

### 4.19 Đối tác gia công ngoài

Đối tác nhận đơn qua **link riêng** (không cần tài khoản): xem đơn, đếm ngược giờ giao, nhận đơn, tải ảnh QC, báo shipper, báo giao
xong. Mỗi đơn chỉ một đối tác nhận được.

### 4.20 Cổng chi nhánh

Tài khoản **Cửa hàng nhận gia công** mở **Đơn nhận từ mạng lưới** (`/cua-hang`): chỉ thấy đơn chuỗi giao cho chi nhánh mình.

### 4.21 Số đơn tối đa theo khung giờ và ngày lễ

**Mở ở:** Cài đặt tiệm → tab **8. Thẻ Chào & quy trình**.

1. **Khu vực, phí giao & giờ nhận đơn:** giờ nhận đơn, thời gian chuẩn bị tối thiểu.
2. **Ngày lễ:** bấm **Thêm ngày lễ**, nhập tên (ví dụ Valentine), ngày, **Phụ phí**, **Tối đa** số đơn, giờ chốt đơn giao trong ngày.
   Bấm **Lưu ngày lễ**.

## Thanh toán

### 4.22 Đặt cọc và phần còn lại

**Mở ở:** Cài đặt tiệm → tab **4. Đặt cọc & giá**.

Đặt % cọc mặc định và mức cọc theo ngày giao / giá trị đơn. Khách thấy số tiền cọc ngay khi đặt; phần còn lại thu sau.

### 4.23 Mã VietQR

Trang khách hiện mã VietQR đã điền sẵn số tiền và mã đơn trong nội dung chuyển khoản. Tài khoản nhận tiền khai ở Cài đặt tiệm →
tab **3. Nhận thanh toán**.

### 4.24 Khách tải ảnh chuyển khoản

Khách bấm báo đã chuyển và tải ảnh biên lai. AI đọc ảnh, gợi ý số tiền; đơn hiện **Khách báo đã chuyển** ở tab **Điều hành**.

### 4.25 Xác nhận tiền về

**Ai dùng:** chỉ Điều hành.

1. Tab **Điều hành** (Thẻ chào) → khối **Việc chờ bạn quyết**.
2. Kiểm tài khoản ngân hàng, bấm xác nhận đã nhận tiền → đơn chuyển sang sản xuất, khách được báo.
3. Chưa nhận được tiền: chọn **Chưa nhận được tiền khách báo chuyển?**, ghi lý do (chuyển thiếu, sai tài khoản…) — trang khách quay
   lại chờ chuyển khoản.

### 4.26 Thu phần còn lại

1. Giao xong mà còn nợ: đơn ở trạng thái chờ thu đủ, chưa hoàn tất.
2. Nhận đủ tiền: bấm xác nhận thu đợt 2 → đơn hoàn tất.
3. **Giao trước, thu sau:** Sale gửi yêu cầu kèm lý do (ví dụ khách quen); Điều hành duyệt ở tab **Phê duyệt**. Điều hành đặt hạn mức
   Sale tự quyết, số đơn hoàn tất tối thiểu của khách và hạn thu sau khi duyệt.

### 4.27 Hoàn tiền khi huỷ

**Ai dùng:** chỉ Điều hành. Trong đơn đã huỷ, ghi khoản hoàn (số tiền, cách hoàn, ghi chú). Khoản hoàn trừ vào thực thu ở báo cáo.

### 4.28 Đối soát tự động với ngân hàng

Khi cửa hàng kết nối ngân hàng (màn **Tích hợp**), tiền khách chuyển có mã đơn được khớp tự động. Giao dịch chưa khớp hiện ở trang chủ
**Kế toán** (Giao dịch ngân hàng chưa khớp đơn) để xử lý tay.

## Báo tin

### 4.29 Trang theo dõi của khách

Khách mở link theo dõi thấy tiến độ đơn, ảnh thành phẩm, ảnh giao; trang tự làm mới mỗi 15 giây.

### 4.30 Báo tin cho nhân viên

**Mở ở:** Cài đặt tiệm → tab **8. Thẻ Chào & quy trình** → **Thông báo kênh điều phối & Telegram**.

Chọn sự kiện cần báo (đơn mới, khách báo chuyển tiền, sắp trễ…) và kênh (trong ứng dụng, Telegram). Kết nối nhóm Telegram theo hướng
dẫn trên màn.

### 4.31 Tin Zalo / SMS cho khách

Hệ thống tự gửi tin cho khách ở các mốc của đơn (đã nhận, đang giao, đã giao…). Mỗi tin trừ credit. Hết credit, tin vẫn được gửi trong
mức âm cho phép và Điều hành được báo; vượt mức thì ngừng gửi tới khi nạp thêm (xem nhóm 10).

### 4.32 Nhắc trước giờ giao

Hệ thống nhắc Điều phối trước giờ giao (mặc định 120 và 60 phút). Người có quyền cấu hình nhắc việc chỉnh mốc nhắc (ví dụ 60 và 30 phút) ở Cài đặt tiệm → tab **9. AI & kênh** → khối chính sách nhắc việc điều phối.

Khi tới mốc, hệ thống gửi tin "Nhắc lịch giao" tới người điều phối và quản lý cửa hàng (hộp thông báo trong ứng dụng; Telegram, Zalo nếu kênh đã bật), bấm vào tin mở trang Điều phối. Mỗi mốc của mỗi đơn chỉ gửi một lần; mốc đã xác nhận ở thanh nhắc thì không gửi. Ai không muốn nhận có thể tắt sự kiện "Nhắc lịch giao" trong tuỳ chọn thông báo của mình.
