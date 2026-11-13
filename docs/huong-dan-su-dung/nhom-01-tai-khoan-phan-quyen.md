# Nhóm 1 — Tài khoản, cửa hàng & phân quyền

19 chức năng: đăng nhập, thông tin cửa hàng, nhân sự, vai trò, bảo mật dữ liệu.

---

## 1.1 Mỗi cửa hàng một không gian dữ liệu riêng

**Dùng để:** bảo đảm nhân sự chỉ thấy dữ liệu của cửa hàng mình.
**Ai dùng:** mọi tài khoản — hệ thống tự áp, không cần thao tác.

- Đơn, khách, sản phẩm, báo giá của cửa hàng khác không bao giờ hiện với bạn. Mở một đường dẫn của cửa hàng khác, hệ thống báo
  "Không tìm thấy".

## 1.2 Đăng nhập

**Ai dùng:** mọi tài khoản.

1. Mở trang **Đăng nhập**, nhập email và mật khẩu, bấm đăng nhập.
2. Trang chủ mở theo vai của bạn.

**Lưu ý:** mỗi tài khoản chỉ dùng ở một nơi. Đăng nhập trên thiết bị mới thì thiết bị cũ tự đăng xuất và báo phiên đã được thay.
Mỗi nhân viên dùng một tài khoản riêng, không dùng chung.

## 1.3 Đăng xuất

**Ai dùng:** mọi tài khoản.

1. Mở menu tài khoản ở góc màn hình, chọn **Đăng xuất**.
2. Phiên hết hiệu lực ngay; mở lại trang cần đăng nhập lại.

## 1.4 Đổi mật khẩu tạm lần đầu

**Ai dùng:** nhân viên vừa được cấp tài khoản, chủ cửa hàng vừa được đội vận hành tạo cửa hàng.

1. Đăng nhập bằng mật khẩu tạm được giao.
2. Hộp **đổi mật khẩu** hiện ngay và không đóng được. Nhập mật khẩu mới, xác nhận.
3. Sau khi đổi, bạn dùng hệ thống bình thường.

**Lưu ý:** chưa đổi mật khẩu thì chưa thao tác được gì khác ngoài đăng xuất.

## 1.5 Thông tin cửa hàng và logo

**Ai dùng:** Điều hành (sửa); nhân sự có quyền xem hồ sơ (xem).
**Mở ở:** Quản trị tiệm → **Hồ sơ cửa hàng** (Cài đặt, tab **1. Thông tin tiệm**) và tab **2. Thương hiệu**.

1. Tab **Thông tin tiệm**: điền tên, số điện thoại, địa chỉ, mô tả, thông điệp thương hiệu, khách mục tiêu. Lưu.
2. Tab **Thương hiệu**: tải logo, chọn màu nhận diện. Lưu.

**Lưu ý:** logo và thông tin này hiện trên Thẻ Chào, báo giá, trang khách và được AI dùng khi viết nội dung.

## 1.6 Chi nhánh và khu vực phục vụ

**Ai dùng:** Điều hành của chuỗi.
**Mở ở:** Sản phẩm → **Nhập từ Excel & ảnh**, phần nhập chi nhánh.

1. Chuẩn bị tệp Excel danh sách chi nhánh: tên, địa chỉ, phường, quận, tỉnh, các phường phục vụ, toạ độ (nếu có).
2. Tải tệp lên, xem trước, sửa dòng báo lỗi, rồi lưu.
3. Chi nhánh đã có thì cập nhật; chi nhánh mới thì tạo thêm.

**Lưu ý:** hệ thống dùng khu vực phục vụ để gợi ý chi nhánh gần người nhận khi điều phối đơn trong chuỗi. Chi nhánh khai theo lô từ
Excel; chưa có form thêm từng chi nhánh.

## 1.7 Danh mục dịp tặng

**Ai dùng:** Điều hành.
**Mở ở:** Cài đặt tiệm → tab **4. Đặt cọc & giá** → khối **Danh mục dịp của cửa hàng**.

1. Danh mục có sẵn các dịp chuẩn của ngành.
2. Thêm dịp: nhập mã, tên dịp (ví dụ "Ngày Nhà giáo"), giọng điệu (ví dụ "Trang trọng, chia buồn"), bấm **Thêm**.
3. Sửa tên, giọng điệu hoặc tắt dịp không dùng.

**Lưu ý:** dịp dùng để gắn cho mẫu, lọc Thẻ Chào và chỉnh giọng tin nhắn tự động.

## 1.8 Chính sách cửa hàng

**Ai dùng:** Điều hành.
**Mở ở:** Cài đặt tiệm.

| Nội dung | Tab |
|---|---|
| Tài khoản ngân hàng nhận tiền, mã VietQR | **3. Nhận thanh toán** |
| % đặt cọc, mức cọc, khoảng giá | **4. Đặt cọc & giá** |
| Phụ phí ngày lễ, số đơn tối đa ngày lễ, số đơn tối đa mỗi khung giờ | **8. Thẻ Chào & quy trình** |
| Ưu đãi, cam kết, thoả thuận đặt hàng | **5. Ưu đãi**, **6. Cam kết**, **7. Thoả thuận** |

Lưu từng phần sau khi sửa. Chính sách áp ngay cho báo giá và đơn mới.

## 1.9 Trường dữ liệu riêng của cửa hàng

**Ai dùng:** chỉ Điều hành.
**Mở ở:** Cài đặt tiệm → tab **11. Trường dữ liệu**.

1. Chọn **Đơn hàng** hoặc **Đối tác**.
2. Đổi tên trường: sửa ô tên, bấm **Lưu tên**.
3. Ẩn/hiện trường không bắt buộc bằng công tắc. Trường bắt buộc của hệ thống hiện "Luôn hiện", không tắt được.
4. Thêm trường riêng: nhập tên, chọn kiểu (Chữ ngắn, Đoạn văn, Số, Số tiền, Ngày, Số điện thoại), bật **Bắt buộc nhập** nếu cần,
   bấm **Thêm trường**.

## 1.10 Thêm nhân viên

**Ai dùng:** Điều hành.
**Mở ở:** Quản trị tiệm → **Đội ngũ & phân quyền** (chuỗi: Thiết lập chuỗi → Đội ngũ & phân quyền).

1. Bấm **Thêm thành viên**.
2. Điền **Họ tên nhân viên**, **Email đăng nhập** (chỉ dùng để đăng nhập, không cần là email thật nhưng mỗi người một email),
   **Vai trò**, chi nhánh (nếu nhân viên chỉ làm ở một chi nhánh), **Số điện thoại** (bắt buộc với Shipper để nhận đơn giao).
3. Bấm tạo. Hệ thống hiện **mật khẩu tạm** một lần duy nhất — chép gửi nhân viên, nhắc đổi mật khẩu khi vào lần đầu.
4. Quên mật khẩu: ở dòng nhân viên, bấm **Đặt lại mật khẩu** để cấp mật khẩu tạm mới.

## 1.11 Đổi vai trò / gỡ nhân viên

**Ai dùng:** Điều hành.
**Mở ở:** Quản trị tiệm → **Đội ngũ & phân quyền**.

1. Ở dòng nhân viên, bấm **Phân vai**.
2. Chọn vai mới và chi nhánh, bấm **Lưu**. Quyền mới có hiệu lực ngay ở thao tác kế tiếp của nhân viên.
3. Nhân viên nghỉ việc: trong hộp đó bấm **Gỡ nhân viên** — toàn bộ quyền truy cập cửa hàng bị thu hồi ngay.

**Lưu ý:** bạn không tự đổi vai hay tự gỡ tài khoản của chính mình.

## 1.12 Sáu vai trò mặc định

**Ai dùng:** Điều hành khi phân vai.

Hệ thống có sẵn Điều hành, Điều phối, Sale, Thợ chế tác, Shipper, Kế toán (và các vai mở rộng ở mục 2 của
[README](README.md)). Mỗi vai có quyền mặc định và trang chủ riêng:

| Vai | Trang chủ |
|---|---|
| Thợ chế tác | **Việc của tôi** — việc được giao, sắp theo giờ giao, có công thức và ảnh mẫu, không hiện giá |
| Shipper | **Đơn cần giao** — người nhận, số điện thoại, địa chỉ, khung giờ, lời thiệp |
| Kế toán | **Đối soát thu chi** — giao dịch ngân hàng chưa khớp đơn, xuất đơn ra Excel |

## 1.13 Vai trò tuỳ chỉnh

**Ai dùng:** Điều hành.

**Mở ở:** Quản trị tiệm → **Đội ngũ & phân quyền** → nút **Vai trò & quyền**.

1. Nhập tên vai (ví dụ "Trưởng ca"), bấm **Tạo vai trò**. Vai mới chưa có quyền nào.
2. Chọn vai ở cột trái. Cột phải hiện các nhóm quyền (Đơn hàng & vận hành, Sản phẩm & giá, Khách hàng…) kèm số quyền đang bật.
3. Mở một nhóm, bật/tắt từng quyền.
4. Bấm **Lưu quyền**. Nhân viên mang vai này nhận quyền mới ở thao tác kế tiếp.
5. Gán vai cho nhân viên bằng **Phân vai** (1.11).

**Lưu ý:** các việc chỉ dành cho Điều hành (xác nhận tiền, huỷ đơn, hoàn tiền, duyệt giá dưới sàn, tạo vai…) không hiện trong danh
sách và không giao được cho vai riêng.

## 1.14 Menu theo quyền

**Ai dùng:** mọi tài khoản — tự động.

Menu chỉ hiện mục vai của bạn dùng được. Ví dụ Sale không thấy mục điều phối; Thợ chế tác không thấy giá. Mục hiện mờ với nhãn
**Sắp ra mắt** là màn đang tạm khoá (xem [README mục 4](README.md#4-màn-đang-ở-trạng-thái-sắp-ra-mắt)).

## 1.15 Chặn thao tác vượt quyền

**Ai dùng:** mọi tài khoản — tự động.

Thao tác ngoài quyền bị từ chối kèm thông báo không đủ quyền. Hệ thống ghi lại người, thời điểm, thao tác, địa chỉ IP và thiết bị
để Điều hành tra soát.

## 1.16 Quyền nhạy cảm chỉ dành cho Điều hành

**Ai dùng:** Điều hành.

Các việc sau chỉ Điều hành làm được, kể cả khi vai khác được bật thêm quyền: **xác nhận tiền về**, **huỷ đơn**, **hoàn tiền**,
**duyệt giá dưới sàn**, **tạo vai**, **quản lý mọi chi nhánh**.

Sale hoặc Điều phối ghi một khoản thu thì khoản đó ở trạng thái **chờ xác nhận**; Điều hành xác nhận hoặc từ chối trong chi tiết đơn.

## 1.17 Nhật ký thao tác

**Ai dùng:** Điều hành.
**Mở ở:** Quản trị tiệm → **Nhật ký thao tác** — **Sắp ra mắt** trên bản chính thức.

1. Mở **Nhật ký kiểm toán**.
2. Lọc theo hành động, đối tượng, người thao tác, khoảng ngày.
3. Bấm **Chi tiết** để xem giá trị trước/sau, IP và thiết bị.

## 1.18 Dữ liệu được khoá theo cửa hàng ngay trong cơ sở dữ liệu

**Ai dùng:** tự động. Lớp bảo vệ thêm của hệ thống: kể cả khi có sai sót trong phần mềm, cơ sở dữ liệu vẫn chỉ trả dữ liệu của
đúng cửa hàng. Không cần thao tác.

## 1.19 Truy cập chéo trả "Không tìm thấy"

**Ai dùng:** tự động. Đường dẫn tới dữ liệu của cửa hàng khác, hoặc của chi nhánh khác khi bạn chỉ được giao một chi nhánh, luôn
trả "Không tìm thấy" — không tiết lộ dữ liệu đó có tồn tại hay không.
