# Nhóm 3 — Báo giá

13 chức năng: quy tắc giá, giá vốn, giá sàn, ưu đãi, phí chế tác, giảm giá, soạn và gửi báo giá.

---

## 3.1 Quy tắc giá

**Ai dùng:** Điều hành.
**Mở ở:** Kho & nguyên liệu → **Tính giá** (`/gia`) — **Sắp ra mắt** trên bản chính thức.

1. Khối **Cấu hình quy tắc giá của tổ chức**: hệ số Sàn và Trần (nhân với giá vốn), tỷ lệ giá tối ưu, thưởng theo hạng đối tác xưởng.
2. Khối **Ưu đãi hạng khách & giờ cao điểm**: % giảm cho từng hạng khách (tối đa 50%); bấm **Thêm giờ cao điểm**, nhập giờ bắt đầu,
   giờ kết thúc, phụ phí.
3. Lưu. Khách đặt trên Thẻ Chào được nhận diện theo số điện thoại; mỗi khoản giảm/phụ phí hiện thành dòng riêng trên báo giá.

## 3.2 Tính giá tự động khi khách đặt

**Ai dùng:** Điều hành (cài đặt); khách (thấy kết quả).
**Mở ở:** Cài đặt tiệm → tab **8. Thẻ Chào & quy trình** → **Khu vực, phí giao & giờ nhận đơn**.

1. Khai từng khu vực giao, phí giao, thời gian chuẩn bị tối thiểu, giờ nhận đơn. Lưu.
2. Khi khách đặt, báo giá tự cộng: tiền hàng, phí giao theo khu vực, phụ phí ngày lễ, trừ mã giảm và ưu đãi.

**Lưu ý:** chưa khai khu vực thì khách thấy "phí giao cửa hàng báo sau".

## 3.3 Giá vốn

**Ai dùng:** Điều hành, Quản lý sản phẩm.
**Mở ở:** Kho & nguyên liệu → **Tính giá** → **Giá vốn** (`/tinh-gia/gia-von`).

1. Khai đơn giá nguyên liệu ở **Nguyên liệu**.
2. Mẫu có công thức thì giá vốn tự tính: nguyên liệu × đơn giá + bao bì + công thợ.

## 3.4 Chặn giá dưới sàn

**Ai dùng:** mọi người lập giá; chỉ Điều hành vượt sàn được.

- Giá sàn = giá vốn × hệ số Sàn. Báo giá, đơn hay mức giảm làm giá thấp hơn sàn bị từ chối, kèm thông báo.
- Điều hành được đặt giá dưới sàn khi cần (ví dụ khách quen); thao tác được ghi lại.
- Máy tính giá ở màn Tính giá cảnh báo trước khi chốt.

## 3.5 Ưu đãi và mã giảm giá

**Ai dùng:** Điều hành, Marketing.
**Mở ở:** Công cụ → **Ưu đãi và giảm giá** (`/uu-dai`), tab **Mã giảm giá**.

1. Tạo lô mã: tên lô, kiểu giảm (% hoặc số tiền), giá trị, hạn dùng, số lượt. Lưu.
2. Gửi mã cho khách; khách nhập mã khi đặt trên Thẻ Chào. Mã sai hoặc hết hạn bị từ chối.
3. Miễn phí giao: đặt ở phần phí giao (3.2) hoặc chương trình ưu đãi.

## 3.6 Phí chế tác theo kiểu dáng, ngày lễ, VAT

**Ai dùng:** Điều hành.
**Mở ở:** Cài đặt tiệm → tab **8. Thẻ Chào & quy trình** → phí chế tác theo kiểu dáng; từng mẫu: chi tiết sản phẩm → khối phí chế tác.

1. Sửa đơn giá phí chế tác của 6 kiểu dáng và **hệ số ngày lễ** (mặc định ×1,5). Lưu.
2. Gắn kiểu dáng cho mẫu khi tạo hoặc sửa mẫu.
3. Ngày lễ, phí chế tác tự tăng theo hệ số; giá hiện cho khách đã gồm phí này.
4. VAT: trong chi tiết đơn Thẻ Chào, tab thông tin khách/đơn, bật xuất hoá đơn và chọn 8% hoặc 10%; tổng tiền đơn tính lại kèm VAT.

## 3.7 Xin và duyệt giảm giá sâu

**Ai dùng:** Sale (xin), Điều hành (duyệt).
**Mở ở:** Thẻ chào sản phẩm → khung trao đổi của đơn → chế độ **Xin giảm giá**; Điều hành quyết định ở khối **Quyết định giảm giá** trong cùng khung trao đổi.

1. Điều hành đặt **Giảm giá tối đa mỗi đơn** ở Cài đặt tiệm → tab 8 (đặt 0 để tắt việc xin giảm).
2. Sale mở khung trao đổi của đơn, chọn **Xin giảm giá**, nhập **Mức xin giảm** (% hoặc số tiền) và **Lý do xin giảm**, gửi.
3. Điều hành mở yêu cầu, chọn duyệt như xin, duyệt mức khác hoặc từ chối, kèm ghi chú cho Sale. Duyệt xong tổng tiền đơn cập nhật ngay.

**Lưu ý:** không tự duyệt yêu cầu của mình; mức làm giá dưới sàn chỉ Điều hành duyệt được.

## 3.8 Soạn báo giá

**Ai dùng:** Sale, Điều hành.
**Mở ở:** Công cụ → **Báo giá nhanh** (`/bao-gia`), tab **Gửi khách mua** (hoặc **Báo giá đối tác** cho xưởng).

1. Chọn mẫu từ kho; với từng dòng chọn phiên bản, số lượng.
2. Nhập phí vận chuyển, ưu đãi, hạn hiệu lực (3, 7, 14, 30 ngày), điều khoản / ghi chú.
3. Xem khối **Xem trước báo giá**: tiền hàng, giảm giá, ưu đãi, phí vận chuyển, tổng cộng.
4. Lưu nháp hoặc gửi báo giá để có link chia sẻ.

## 3.9 Danh sách báo giá

**Mở ở:** `/bao-gia` → tab **Danh sách báo giá**.

Mỗi báo giá có mã dạng `BG-0001`, trạng thái, hạn hiệu lực. Báo giá quá hạn tự chuyển hết hạn.

## 3.10 Sửa báo giá và lịch sử sửa

1. Mở báo giá trong danh sách, sửa dòng hoặc giá; tổng tự tính lại.
2. Mỗi lần sửa, bản trước được lưu. Mở **Lịch sử sửa** để xem ai sửa, lúc nào, nội dung và tổng của bản trước.

## 3.11 Gửi báo giá cho khách

1. Ở danh sách, bấm sao chép **Link gửi** và gửi khách qua Zalo/Messenger.
2. Khách mở link thấy ảnh mẫu, phiên bản, thành phần, phí vận chuyển, tổng — không thấy giá vốn hay ghi chú nội bộ.
3. Cần gửi file: bấm tải **PNG** hoặc **PDF A6**.

## 3.12 Chuyển báo giá thành đơn

Khách chốt: ở dòng báo giá bấm **Tạo đơn**. Đơn mới mang đủ dòng hàng, phí, khách của báo giá; bấm **Xem đơn hàng** để mở.

## 3.13 Báo giá tự động trên Thẻ Chào

**Ai dùng:** khách mua — tự động.

Khách chọn mẫu, phiên bản, ngày giao, khu vực trên Thẻ Chào; hệ thống tính ngay tổng tiền và số tiền đặt cọc cần chuyển. Cửa hàng
không cần thao tác.
