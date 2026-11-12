# ALG CORE — CAPABILITY MAP ĐIỆN HOA ADMIN

## 1. Mục tiêu

Capability Map này xác định các khả năng FloraOS Core cần hỗ trợ cho **Điện hoa Admin** theo đúng quy trình nghiệp vụ Điều phối.

Điện hoa Admin là **Business Operating System cho hoạt động điện hoa và mạng Đối tác**.

Capability không được tổ chức như một tập hợp module rời rạc.

Capability phải phục vụ hành trình thực tế của một đơn hàng:

```text
NHẬN ĐƠN
↓
KIỂM TRA & LẬP KẾ HOẠCH
↓
TÌM & XÁC NHẬN ĐỐI TÁC
↓
THEO DÕI ĐỐI TÁC GIA CÔNG
↓
KIỂM TRA & QC
↓
ĐIỀU PHỐI GIAO HÀNG
↓
HOÀN TẤT ĐƠN
```

Nếu có vấn đề ở bất kỳ chặng nào, đơn hàng chuyển sang luồng:

```text
PHÁT HIỆN
↓
ĐÁNH GIÁ
↓
NGĂN CHẶN
↓
XỬ LÝ / CHUYỂN CẤP
↓
GHI NHẬN
↓
KHÔI PHỤC LUỒNG / THAY THẾ
```

Sổ tay nghiệp vụ xác định 7 chặng chính của một đơn hàng và một luồng xử lý phát sinh P8. fileciteturn4file0L9-L15

---

# 2. Nguyên tắc Capability Map

1. Capability phải bám theo **quy trình nghiệp vụ thực tế**.
2. Không bắt Điều phối viên hiểu cấu trúc kỹ thuật của FloraOS.
3. Không biến Capability Map thành một menu khổng lồ.
4. AI nằm trong từng bước nghiệp vụ phù hợp.
5. Kết quả của bước trước phải trở thành dữ liệu đầu vào cho bước sau.
6. Mỗi kết quả phải có **Next Actions**.
7. Không tự suy đoán khi dữ liệu đầu vào còn thiếu.
8. Không tự thay đổi sản phẩm, chi phí, thời gian hoặc cam kết quan trọng nếu chưa được xác nhận.
9. Không coi “đã báo” là “đã xử lý”.
10. Chỉ coi công việc hoàn thành khi có kết quả hoặc bằng chứng cần thiết.
11. Luôn theo dõi trạng thái, bước tiếp theo, người phụ trách, rủi ro và deadline.
12. Không đánh dấu capability đã triển khai nếu chưa kiểm tra code.
13. UX không cấp quyền. Capability và RBAC mới quyết định khả năng thực thi.
14. P8 — Xử lý phát sinh là luồng xuyên suốt, không phải một module độc lập đứng cuối quy trình.

Các nguyên tắc trên phù hợp với yêu cầu vận hành trong Sổ tay: mỗi đơn phải có trạng thái rõ, bước tiếp theo rõ, người phụ trách rõ và rủi ro/deadline được kiểm soát trước. fileciteturn4file0L106-L121

---

# 3. Mô hình nghiệp vụ tổng thể

```text
SALE
↓
P1. NHẬN ĐƠN
↓
P2. KIỂM TRA & LẬP KẾ HOẠCH
↓
    Phân tích đơn hàng
    ↓
    Xác định yêu cầu sản phẩm
    ↓
    Xác định yêu cầu gia công
    ↓
    Xác định yêu cầu Đối tác
    ↓
    Xác định yêu cầu giao hàng
    ↓
    Đánh giá rủi ro
    ↓
    Kế hoạch đơn hàng
↓
P3. TÌM & XÁC NHẬN ĐỐI TÁC
↓
    Chọn ứng viên
    ↓
    Gửi brief / yêu cầu gia công
    ↓
    Nhận xác nhận
    ↓
    Xác nhận giá / chi phí
    ↓
    Xác nhận thời gian
    ↓
    Khóa Đối tác
↓
P4. THEO DÕI ĐỐI TÁC GIA CÔNG
↓
P5. KIỂM TRA & QC
↓
P6. ĐIỀU PHỐI GIAO HÀNG
↓
P7. HOÀN TẤT ĐƠN
```

Quy trình này bám theo P1–P7 trong Sổ tay Điều phối. fileciteturn4file0L16-L33 fileciteturn4file0L34-L46 fileciteturn4file0L48-L66 fileciteturn4file0L67-L83

---

# 4. P1 — NHẬN ĐƠN

## Mục tiêu

Nhận được một đơn hàng **đủ thông tin để có thể triển khai**.

Sổ tay yêu cầu kiểm tra Order ID, Order Brief và các thông tin về sản phẩm, số lượng, hình ảnh tham chiếu, người nhận, địa chỉ, thời gian giao, thiệp/lời nhắn, ngân sách/chi phí đã duyệt và yêu cầu đặc biệt. fileciteturn4file0L16-L23

## Capability

### P1-01 — Nhận bàn giao đơn từ Sales

**Mục tiêu:** Tiếp nhận đơn từ Sales.

**Input:**
- Order ID
- Order Brief
- Thông tin khách
- Yêu cầu đơn hàng

**Output:**
- Đơn hàng được tiếp nhận.

**Next Actions:**
- Kiểm tra đơn
- Yêu cầu bổ sung thông tin

---

### P1-02 — Kiểm tra tính đầy đủ của đơn

Kiểm tra:
- Sản phẩm
- Số lượng
- Hình ảnh/tham chiếu
- Người nhận
- Địa chỉ
- Thời gian giao
- Thiệp/lời nhắn
- Ngân sách/chi phí
- Yêu cầu đặc biệt

**Output:**
- Đơn đủ thông tin
- Hoặc danh sách thông tin còn thiếu.

---

### P1-03 — Phát hiện thông tin thiếu

**AI Support:** Có thể hỗ trợ kiểm tra tính đầy đủ.

**Nguyên tắc:** Không tự suy đoán.

**Next Actions:**
- Gửi yêu cầu bổ sung cho Sales
- Theo dõi phản hồi
- Kiểm tra lại

---

### P1-04 — Xác nhận đơn sẵn sàng lập kế hoạch

**Output:**
`SẴN SÀNG LẬP KẾ HOẠCH`

**Hoàn thành khi:** Có thể trả lời rõ:
- Làm gì
- Làm cho ai
- Ở đâu
- Khi nào
- Yêu cầu gì

---

# 5. P2 — KIỂM TRA & LẬP KẾ HOẠCH

## Mục tiêu

Biến yêu cầu của khách hàng thành **yêu cầu mà Đối tác có thể thực hiện**.

Đây là bước đặc biệt quan trọng vì nó tạo ra **Order Plan** trước khi tìm Đối tác. Sổ tay xác định 4 nhóm cần phân tích: sản phẩm, Đối tác, giao hàng và rủi ro. fileciteturn4file0L24-L33

## 5.1 Phân tích đơn hàng

### P2-01 — Phân tích Order Brief

**Mục tiêu:** Hiểu chính xác đơn hàng trước khi lập kế hoạch.

**Input:**
- Order Brief
- Hình ảnh tham chiếu
- Yêu cầu khách
- Thời gian
- Ngân sách

**Output:**
- Yêu cầu đơn hàng đã được cấu trúc.

**AI Support:** Có.

---

### P2-02 — Phân tích sản phẩm cần thực hiện

Xác định:
- Loại sản phẩm
- Kích thước
- Số lượng
- Phong cách
- Màu sắc
- Hình ảnh tham chiếu
- Vật liệu/thành phần
- Đóng gói
- Thiệp/lời nhắn

**AI Support:** Có.

---

### P2-03 — Phân tích hình ảnh tham chiếu

Phân tích:
- Thành phần hoa
- Phụ kiện
- Màu sắc
- Kiểu dáng
- Bố cục
- Kích thước tương đối
- Đặc điểm cần giữ

**AI Support:** Có.

---

### P2-04 — Xác định yêu cầu gia công

Chuyển yêu cầu sản phẩm thành yêu cầu thực hiện cho Đối tác.

Bao gồm:
- Sản phẩm cần làm
- Thành phần cần có
- Tiêu chuẩn thực hiện
- Hình ảnh tham chiếu
- Số lượng
- Kích thước
- Đóng gói
- Thiệp/lời nhắn
- Yêu cầu đặc biệt

**Output:** Brief gia công.

---

## 5.2 Phân tích yêu cầu Đối tác

### P2-05 — Xác định năng lực Đối tác cần có

Xác định:
- Đối tác phải làm được sản phẩm gì
- Khu vực nào
- Có thể đáp ứng thời gian không
- Có đủ capacity không

---

### P2-06 — Xác định tiêu chí lựa chọn Đối tác

Tiêu chí gồm:
- Phù hợp sản phẩm
- Đúng khu vực
- Đáp ứng thời gian
- Capacity
- Chất lượng
- Lịch sử/SLA
- Chi phí

Đây là thứ tự ưu tiên được nêu trong P3 của Sổ tay. fileciteturn4file0L34-L45

---

## 5.3 Phân tích yêu cầu giao hàng

### P2-07 — Xác định yêu cầu giao hàng

Xác định:
- Địa chỉ
- Người nhận
- Số điện thoại
- Thời gian giao
- Ghi chú giao hàng
- Yêu cầu đặc biệt

---

## 5.4 Phân tích rủi ro

### P2-08 — Phát hiện rủi ro đơn hàng

Kiểm tra:
- Đơn hàng gấp
- Hình ảnh tham chiếu khó
- Yêu cầu đặc biệt
- Khả năng thiếu nguyên vật liệu
- Deadline sát

**AI Support:** Có.

---

### P2-09 — Đánh giá mức độ rủi ro

Phân loại:
- Bình thường
- Cần theo dõi
- Rủi ro cao

**Next Actions:**
- Điều chỉnh kế hoạch
- Ghi nhận rủi ro
- Chuyển cấp nếu cần

---

## 5.5 Chào giá / chi phí gia công

### P2-10 — Xác định chi phí gia công dự kiến

**Mục tiêu:** Xác định cơ sở chi phí cần dùng khi làm việc với Đối tác.

**Input:**
- Cấu hình sản phẩm
- Thành phần
- Số lượng
- Yêu cầu gia công
- Thời gian
- Khu vực

**Output:**
- Chi phí gia công dự kiến hoặc thông tin cần xác minh.

**Lưu ý:** Capability này chỉ được coi là tính giá tự động nếu hệ thống thực tế có dữ liệu và công thức phù hợp.

---

### P2-11 — Tạo chào giá / yêu cầu giá gia công cho Đối tác

**Mục tiêu:** Chuyển Order Plan thành yêu cầu thương mại rõ ràng để Đối tác phản hồi.

**Input:**
- Order Plan
- Brief gia công
- Yêu cầu thời gian
- Yêu cầu chất lượng
- Chi phí áp dụng/dự kiến

**Output:**
- Yêu cầu chào giá gia công gửi Đối tác.

**Next Actions:**
- Chọn Đối tác
- Gửi brief
- Nhận báo giá
- So sánh báo giá

**AI Support:** Có thể hỗ trợ tạo brief và chào giá.

---

## 5.6 Tạo Order Plan

### P2-12 — Tạo Kế hoạch đơn hàng

**Output:**
- Yêu cầu sản phẩm
- Yêu cầu gia công
- Yêu cầu Đối tác
- Yêu cầu giao hàng
- Chi phí
- Rủi ro
- Deadline
- Tiêu chí lựa chọn Đối tác

**Hoàn thành khi:** Có một **Order Plan rõ ràng để tiến hành tìm Đối tác**. fileciteturn4file0L24-L33

---

# 6. P3 — TÌM & XÁC NHẬN ĐỐI TÁC

## Mục tiêu

Chọn được Đối tác phù hợp và Đối tác xác nhận nhận đơn. fileciteturn4file0L34-L46

### P3-01 — Tìm Đối tác theo sản phẩm

Tìm Đối tác có khả năng thực hiện sản phẩm.

---

### P3-02 — Tìm Đối tác theo khu vực

Lọc theo khu vực thực hiện/giao hàng.

---

### P3-03 — Tìm Đối tác theo thời gian

Kiểm tra khả năng hoàn thành đúng deadline.

---

### P3-04 — Kiểm tra capacity Đối tác

Kiểm tra khả năng nhận thêm đơn.

---

### P3-05 — Kiểm tra chất lượng Đối tác

Kiểm tra:
- Chất lượng
- Lịch sử
- Tỷ lệ lỗi
- Khả năng đáp ứng

---

### P3-06 — Kiểm tra lịch sử/SLA Đối tác

Kiểm tra hiệu suất thực tế.

---

### P3-07 — Kiểm tra chi phí Đối tác

Kiểm tra giá/chi phí phù hợp.

---

### P3-08 — Gợi ý ứng viên Đối tác

FloraOS phân tích:
- Sản phẩm
- Khu vực
- Thời gian
- Capacity
- Chất lượng
- SLA
- Chi phí

**Output:** Danh sách ứng viên.

**AI Support:** Có.

---

### P3-09 — Gửi brief gia công cho Đối tác

Brief gồm:
- Mã đơn
- Sản phẩm
- Hình ảnh tham chiếu
- Số lượng
- Yêu cầu thực hiện
- Deadline
- Yêu cầu đặc biệt
- Chi phí áp dụng

Các trường thông tin này được quy định trong Sổ tay. fileciteturn4file0L37-L43

---

### P3-10 — Thu thập xác nhận từ Đối tác

Hỏi và ghi nhận:
- Có nhận đơn không
- Có làm được không
- Giá/chi phí
- Khi nào xong
- Có vấn đề gì không

---

### P3-11 — So sánh phản hồi Đối tác

So sánh:
- Giá
- Thời gian
- Khả năng đáp ứng
- Chất lượng
- SLA
- Rủi ro

**AI Support:** Có thể hỗ trợ so sánh.

---

### P3-12 — Chọn Đối tác

**Output:** Đối tác được lựa chọn.

---

### P3-13 — Khóa Đối tác

Khi Đối tác xác nhận:
`ĐỐI TÁC ĐÃ XÁC NHẬN`

Nếu Đối tác từ chối:
- Ghi nhận lý do
- Chọn ứng viên tiếp theo

Đây là đúng trình tự P3 trong Sổ tay. fileciteturn4file0L39-L46

---

# 7. P4 — THEO DÕI ĐỐI TÁC GIA CÔNG

## Mục tiêu

Bảo đảm Đối tác làm đúng và không trễ deadline. fileciteturn4file0L48-L56

### P4-01 — Xác nhận Đối tác bắt đầu

Kiểm tra:
- Đã bắt đầu chưa
- Thời điểm bắt đầu

---

### P4-02 — Theo dõi tiến độ gia công

Theo dõi:
- Đang làm đến đâu
- Vấn đề phát sinh
- Thay đổi
- Thời gian hoàn thành dự kiến

---

### P4-03 — Theo dõi deadline

Theo dõi:
- Thời gian còn lại
- Nguy cơ trễ
- Thời gian hoàn thành dự kiến

**AI/Automation Support:** Có.

---

### P4-04 — Cảnh báo nguy cơ trễ

FloraOS phát hiện đơn có nguy cơ không đạt deadline.

**Next Actions:**
- Liên hệ Đối tác
- Đánh giá ảnh hưởng
- Tìm phương án
- Chuyển cấp nếu cần

---

### P4-05 — Xác nhận Đối tác hoàn thành

Ghi nhận:
- Đã hoàn thành
- Thời gian hoàn thành
- Bằng chứng

---

### P4-06 — Thu thập bằng chứng sản phẩm

Ví dụ:
- Ảnh sản phẩm
- Bằng chứng hoàn thành

**Output:** `SẴN SÀNG QC`

---

# 8. P5 — KIỂM TRA & QC

## Mục tiêu

Bảo đảm sản phẩm thực tế phù hợp với yêu cầu đơn hàng. fileciteturn4file0L57-L66

### P5-01 — Kiểm tra sản phẩm

Kiểm tra:
- Đúng sản phẩm
- Đúng số lượng
- Đúng hình ảnh tham chiếu
- Đúng màu sắc/phong cách
- Chất lượng
- Đóng gói
- Thiệp/lời nhắn
- Lỗi rõ ràng

---

### P5-02 — QC bằng hình ảnh

Đối chiếu:
- Hình ảnh yêu cầu
- Hình ảnh sản phẩm thực tế

**AI Support:** Có thể hỗ trợ.

---

### P5-03 — Xác định kết quả QC

Các kết quả:

```text
PASS
REWORK
REPLACE / ESCALATE
```

---

### P5-04 — Yêu cầu Rework

Nếu sản phẩm có thể sửa:
- Gửi yêu cầu sửa
- Theo dõi Đối tác sửa
- Kiểm tra lại

---

### P5-05 — Replace / Escalate

Nếu không thể sửa hoặc sai nghiêm trọng:
- Kích hoạt P8
- Thay thế
- Chuyển cấp

---

### P5-06 — Xác nhận QC PASSED

**Output:** Được phép chuyển sang giao hàng.

---

# 9. P6 — ĐIỀU PHỐI GIAO HÀNG

## Mục tiêu

Đưa sản phẩm đến đúng người, đúng nơi, đúng thời gian. fileciteturn4file0L67-L76

### P6-01 — Kiểm tra trước khi lấy hàng

Kiểm tra:
- Sản phẩm sẵn sàng
- Địa chỉ
- Người nhận
- Số điện thoại
- Thời gian giao
- Ghi chú

---

### P6-02 — Phối hợp Pickup

Phối hợp:
- Đối tác
- Đơn vị giao hàng

---

### P6-03 — Theo dõi trạng thái giao hàng

Luồng:

```text
SẴN SÀNG
→ PICKUP
→ ĐANG GIAO
→ ĐÃ GIAO
```

---

### P6-04 — Cảnh báo nguy cơ giao trễ

Nếu có nguy cơ trễ:
- Phát hiện
- Đánh giá
- Xử lý ngay

Không chờ đến deadline mới xử lý. fileciteturn4file0L69-L76

---

### P6-05 — Thu thập POD

Thu thập:
- Bằng chứng giao hàng
- Xác nhận người nhận
- Thông tin cần thiết theo quy định

---

### P6-06 — Xác nhận giao hàng thành công

**Output:** `ĐÃ GIAO`

---

# 10. P7 — HOÀN TẤT ĐƠN

## Mục tiêu

Đóng đơn sạch và lưu lại dữ liệu cần thiết. fileciteturn4file0L77-L83

### P7-01 — Kiểm tra điều kiện đóng đơn

Kiểm tra:
- Đã giao
- Có POD
- Đối tác đã được ghi nhận
- Chi phí/dữ liệu đã cập nhật
- Thời gian thực tế đã ghi nhận
- Phát sinh đã ghi nhận
- Hiệu suất Đối tác đã cập nhật

---

### P7-02 — Cập nhật hiệu suất Đối tác

Ghi nhận:
- Thời gian
- SLA
- Kết quả
- Chất lượng
- Vấn đề nếu có

---

### P7-03 — Đóng đơn

**Output:**

`COMPLETED`

---

### P7-04 — Lưu dữ liệu phục vụ báo cáo

Dữ liệu đơn sau hoàn tất được dùng cho:
- Báo cáo
- Phân tích
- Đánh giá Đối tác
- SLA
- Chất lượng
- Chi phí

---

# 11. P8 — XỬ LÝ PHÁT SINH

P8 là **luồng xuyên suốt**, có thể được kích hoạt ở P1–P7.

Sổ tay quy định 6 bước xử lý:

```text
PHÁT HIỆN
↓
ĐÁNH GIÁ
↓
NGĂN CHẶN
↓
XỬ LÝ / CHUYỂN CẤP
↓
GHI NHẬN
↓
KHÔI PHỤC LUỒNG / THAY THẾ
```

fileciteturn4file0L84-L105

## P8-01 — Phát hiện phát sinh

Xác định:
- Có chuyện gì
- Đang xảy ra ở chặng nào
- Ai đang phụ trách

---

## P8-02 — Đánh giá ảnh hưởng

Đánh giá ảnh hưởng đến:
- Sản phẩm
- Chi phí
- Thời gian
- Chất lượng
- Giao hàng
- Khách hàng

---

## P8-03 — Ngăn chặn

Thực hiện hành động ngay để vấn đề không xấu thêm.

---

## P8-04 — Xử lý hoặc chuyển cấp

Quyết định:
- Điều phối tự xử lý
- Hoặc chuyển Leader/người có thẩm quyền

---

## P8-05 — Ghi nhận phát sinh

Ghi nhận:
- Vấn đề
- Nguyên nhân
- Người xử lý
- Cách xử lý
- Kết quả

---

## P8-06 — Khôi phục luồng hoặc thay thế

Đưa đơn trở lại luồng bình thường hoặc chuyển sang phương án thay thế.

---

## P8-07 — Thiếu thông tin

Không tự suy đoán.

**Next Actions:**
- Dừng bước liên quan
- Hỏi Sales/người phụ trách
- Cập nhật thông tin
- Tiếp tục luồng

---

## P8-08 — Đối tác từ chối

**Next Actions:**
- Ghi nhận lý do
- Chọn Đối tác khác
- Chuyển cấp nếu không có Đối tác phù hợp

---

## P8-09 — Đối tác có nguy cơ trễ

**Next Actions:**
- Đánh giá ảnh hưởng
- Tìm phương án
- Thay Đối tác nếu cần
- Chuyển cấp nếu cần

---

## P8-10 — Sản phẩm không đạt QC

**Next Actions:**
- Rework nếu có thể
- Replace nếu cần
- Chuyển cấp nếu cần

---

## P8-11 — Giao hàng gặp vấn đề

Xác định vấn đề thuộc:
- Pickup
- Địa chỉ
- Người nhận
- Thời gian

Sau đó phối hợp bên liên quan và theo dõi đến khi có kết quả.

---

## P8-12 — Khách hàng / Sales thay đổi yêu cầu

Kiểm tra ảnh hưởng đến:
- Sản xuất
- Chi phí
- Thời gian

Chỉ triển khai sau khi thay đổi được xác nhận theo quy định. fileciteturn4file0L90-L105

---

# 12. Báo cáo & quản trị vận hành

Các capability báo cáo được xây dựng **trên dữ liệu tạo ra từ P1–P8**, không tách khỏi quy trình nghiệp vụ.

## BC-01 — Báo cáo đơn hàng

Theo dõi:
- Số đơn
- Trạng thái
- Giá trị
- Thời gian
- Kết quả

---

## BC-02 — Báo cáo tiến độ

Theo dõi:
- Đơn đang chờ
- Đơn đang gia công
- Đơn chờ QC
- Đơn đang giao
- Đơn có nguy cơ trễ

---

## BC-03 — Báo cáo Đối tác

Theo dõi:
- Số đơn
- Tỷ lệ nhận
- Tỷ lệ hoàn thành
- Chất lượng
- SLA
- Tỷ lệ lỗi
- Chi phí

---

## BC-04 — Báo cáo SLA

Theo dõi:
- Đúng hạn
- Trễ
- Nguy cơ trễ
- Theo Đối tác
- Theo khu vực
- Theo loại đơn

---

## BC-05 — Báo cáo QC

Theo dõi:
- PASS
- REWORK
- REPLACE
- Lỗi theo loại
- Lỗi theo Đối tác
- Lỗi theo sản phẩm

---

## BC-06 — Báo cáo phát sinh

Phân loại theo 5 nhóm chuẩn:

1. Thông tin
2. Đối tác
3. Sản xuất
4. Giao hàng
5. Khách hàng/thương mại

Một tình huống có thể thuộc nhiều nhóm cùng lúc. fileciteturn4file0L103-L105

---

## BC-07 — Phân tích nguyên nhân

Phân tích:
- Loại lỗi
- Nguyên nhân
- Đối tác
- Sản phẩm
- Khu vực
- Thời điểm
- Ảnh hưởng

**AI Support:** Có.

---

## BC-08 — Đề xuất hành động cải thiện

FloraOS có thể đề xuất:
- Điều chỉnh lựa chọn Đối tác
- Điều chỉnh SLA
- Điều chỉnh quy trình
- Bổ sung thông tin bắt buộc
- Cải thiện brief
- Cải thiện QC

**AI Support:** Có.

---

# 13. Quản lý Đối tác

Quản lý Đối tác phải phục vụ trực tiếp cho P2, P3, P4, P5 và P7.

## DT-01 — Hồ sơ Đối tác

Thông tin:
- Khu vực
- Sản phẩm
- Năng lực
- Capacity
- Giá
- SLA
- Chất lượng
- Lịch sử

---

## DT-02 — Quản lý năng lực

Theo dõi:
- Sản phẩm có thể làm
- Khu vực
- Capacity
- Khung thời gian
- Khả năng nhận đơn

---

## DT-03 — Quản lý giá / chi phí gia công

Theo dõi:
- Giá
- Chi phí
- Điều kiện
- Thời hạn

---

## DT-04 — Quản lý SLA

Theo dõi:
- Thời gian phản hồi
- Thời gian xác nhận
- Thời gian gia công
- Thời gian giao

---

## DT-05 — Đánh giá chất lượng

Theo dõi:
- QC
- Rework
- Replace
- Khiếu nại
- Lỗi

---

## DT-06 — Phân tích hiệu suất

Phân tích:
- Đơn
- Doanh thu
- Tỷ lệ nhận
- Tỷ lệ từ chối
- SLA
- Chất lượng
- Chi phí

---

# 14. CRM & CSKH

Nhóm này phục vụ các điểm tiếp xúc giữa Điện hoa Admin, Sales và khách hàng.

## CRM-01 — Hồ sơ khách hàng

## CRM-02 — Lịch sử đơn hàng

## CRM-03 — Theo dõi yêu cầu khách

## CRM-04 — Theo dõi thay đổi yêu cầu

## CRM-05 — Chăm sóc sau giao hàng

## CRM-06 — Tiếp nhận phản hồi

## CRM-07 — Quản lý khiếu nại

## CRM-08 — Phân tích nguyên nhân khiếu nại

## CRM-09 — Theo dõi kết quả xử lý

Các capability này phải liên kết với P8 khi vấn đề ảnh hưởng đến đơn hàng.

---

# 15. Marketing

Marketing là nhóm hỗ trợ kinh doanh của Điện hoa Admin, không phải một phần bắt buộc của luồng Điều phối.

## MK-01 — Tạo nội dung sản phẩm

## MK-02 — Tạo hình ảnh sản phẩm

## MK-03 — Tạo video sản phẩm

## MK-04 — Tạo nội dung theo dịp

## MK-05 — Tạo chiến dịch

## MK-06 — Phân tích hiệu quả marketing

---

# 16. Tài chính

Tài chính phục vụ trực tiếp cho P2, P3 và P7.

## TC-01 — Quản lý chi phí đơn hàng

## TC-02 — Quản lý chi phí gia công

## TC-03 — Đối soát Đối tác

## TC-04 — Đối soát đơn hàng

## TC-05 — Phân tích giá / chi phí

## TC-06 — Báo cáo doanh thu

## TC-07 — Báo cáo chi phí

## TC-08 — Phân tích lợi nhuận

---

# 17. Combo chức năng theo nghiệp vụ

## CB-01 — Từ đơn Sales đến Order Plan

```text
Nhận đơn
→ Kiểm tra thông tin
→ Phân tích sản phẩm
→ Phân tích yêu cầu gia công
→ Xác định yêu cầu Đối tác
→ Xác định giao hàng
→ Đánh giá rủi ro
→ Tạo Order Plan
```

---

## CB-02 — Từ Order Plan đến Đối tác

```text
Order Plan
→ Tìm ứng viên
→ Kiểm tra năng lực
→ Kiểm tra khu vực
→ Kiểm tra thời gian
→ Kiểm tra capacity
→ Kiểm tra chất lượng
→ Kiểm tra SLA
→ Kiểm tra chi phí
→ Gửi brief
→ Nhận xác nhận
→ So sánh
→ Chọn Đối tác
→ Khóa Đối tác
```

---

## CB-03 — Từ Đối tác đến QC

```text
Đối tác đã xác nhận
→ Xác nhận bắt đầu
→ Theo dõi gia công
→ Theo dõi deadline
→ Xác nhận hoàn thành
→ Thu thập bằng chứng
→ QC
→ PASS / REWORK / REPLACE
```

---

## CB-04 — Từ QC đến hoàn tất

```text
QC PASSED
→ Kiểm tra giao hàng
→ Pickup
→ Theo dõi giao
→ POD
→ Cập nhật hiệu suất
→ Đóng đơn
→ COMPLETED
```

---

## CB-05 — Xử lý đơn có nguy cơ trễ

```text
Phát hiện nguy cơ
→ Đánh giá ảnh hưởng
→ Ngăn chặn
→ Tìm phương án
→ Thay Đối tác / điều chỉnh
→ Theo dõi lại
→ Khôi phục luồng
```

---

# 18. AI Workflow

## WF-01 — Phân tích đơn hàng tự động

```text
Order Brief
→ Phân tích yêu cầu
→ Phân tích hình ảnh
→ Xác định sản phẩm
→ Xác định thành phần
→ Xác định yêu cầu gia công
→ Xác định yêu cầu giao hàng
→ Phát hiện rủi ro
→ Tạo Order Plan
```

**Người dùng kiểm tra trước khi chuyển P3.**

---

## WF-02 — Tạo brief gia công

```text
Order Plan
→ Chuẩn hóa yêu cầu
→ Tạo brief
→ Tạo yêu cầu giá/chi phí
→ Người dùng kiểm tra
→ Gửi Đối tác
```

---

## WF-03 — Gợi ý Đối tác

```text
Order Plan
→ Phân tích yêu cầu
→ Tìm ứng viên
→ Kiểm tra năng lực
→ Kiểm tra khu vực
→ Kiểm tra capacity
→ Kiểm tra SLA
→ Kiểm tra chất lượng
→ Kiểm tra chi phí
→ Đề xuất danh sách
→ Người dùng chọn
```

---

## WF-04 — Theo dõi nguy cơ trễ

```text
Đơn đang gia công
→ Theo dõi tiến độ
→ Theo dõi deadline
→ Phát hiện nguy cơ
→ Đánh giá ảnh hưởng
→ Đề xuất xử lý
→ Người dùng xác nhận
→ Thực hiện
→ Kiểm tra lại
```

---

## WF-05 — Hỗ trợ QC bằng hình ảnh

```text
Hình ảnh yêu cầu
+
Hình ảnh sản phẩm thực tế
↓
AI đối chiếu
↓
Phát hiện điểm khác biệt
↓
Người dùng kiểm tra
↓
PASS / REWORK / REPLACE
```

---

## WF-06 — Xử lý phát sinh

```text
Phát hiện
→ Đánh giá
→ Ngăn chặn
→ Xử lý / Chuyển cấp
→ Ghi nhận
→ Khôi phục / Thay thế
```

---

# 19. Các loại kết quả

Các capability của Điện hoa Admin có thể tạo ra:

- Đơn hàng
- Order Brief
- Order Plan
- Brief gia công
- Yêu cầu chào giá gia công
- Báo giá / chi phí gia công
- Danh sách Đối tác ứng viên
- Đối tác được xác nhận
- Tiến độ gia công
- Bằng chứng sản phẩm
- Kết quả QC
- Yêu cầu Rework
- Yêu cầu Replace
- Trạng thái giao hàng
- POD
- Hồ sơ phát sinh
- Báo cáo
- Phân tích
- Đề xuất hành động

Mỗi kết quả cần có Next Actions phù hợp.

---

# 20. Capability Contract

Mỗi capability phải có cấu trúc:

```text
ID
Tên
Chặng nghiệp vụ
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

## P2-02 — Phân tích sản phẩm cần thực hiện

**Chặng:** P2 — Kiểm tra & lập kế hoạch

**Mục tiêu:** Chuyển yêu cầu sản phẩm của khách thành cấu trúc có thể dùng để lập kế hoạch gia công.

**Input:**
- Order Brief
- Hình ảnh tham chiếu
- Yêu cầu khách

**Output:**
- Loại sản phẩm
- Kích thước
- Số lượng
- Phong cách
- Màu sắc
- Thành phần
- Đóng gói
- Thiệp/lời nhắn

**Dependencies:**
- Order Brief
- Hình ảnh
- Dữ liệu sản phẩm

**Next Actions:**
- Xác định yêu cầu gia công
- Xác định tiêu chí Đối tác
- Tạo Order Plan

**AI Support:** Có.

**Workflow Support:** Có.

**Capability Required:** Xác định theo hệ thống quyền thực tế.

**Trạng thái triển khai:** CẦN XÁC MINH.

---

# 21. Trạng thái triển khai

Không được tự giả định capability đã có trong code.

Chỉ sử dụng:

- `CÓ — ĐÃ XÁC MINH`
- `CÓ MỘT PHẦN — ĐÃ XÁC MINH`
- `CHƯA CÓ — ĐÃ XÁC MINH`
- `CẦN XÁC MINH`
- `ĐỀ XUẤT`

Capability Map này xác định **hệ thống cần có khả năng gì**.

Việc xác định đã triển khai đến đâu phải được kiểm tra bằng code và hệ thống thực tế.

---

# 22. Mô hình UX của Điện hoa Admin

Trang chủ không nên hiển thị toàn bộ capability.

Trang chủ nên bắt đầu bằng:

> **Bạn muốn làm gì cho hoạt động điện hoa?**

Các lựa chọn chính:

```text
Báo cáo toàn hệ thống
Quản lý sản phẩm
Bán hàng
Điều phối
Quản lý đối tác
CRM & CSKH
Marketing
Tài chính
```

Khi chọn **Điều phối**, FloraOS phải dẫn người dùng theo đúng journey:

```text
Đơn cần xử lý
↓
P1. Nhận đơn
↓
P2. Kiểm tra & lập kế hoạch
↓
P3. Tìm & xác nhận Đối tác
↓
P4. Theo dõi gia công
↓
P5. QC
↓
P6. Giao hàng
↓
P7. Hoàn tất
```

Không nên mở một màn hình bắt Điều phối viên phải tự tìm từng module.

---

# 23. Trạng thái đơn hàng và tư duy vận hành

Mỗi đơn hàng phải luôn trả lời được 5 câu hỏi:

```text
1. Đơn đang ở đâu?
2. Tiếp theo cần làm gì?
3. Ai đang giữ bóng?
4. Có nguy cơ gì?
5. Khi nào phải xong?
```

Đây là mô hình tư duy được quy định trực tiếp trong Sổ tay Điều phối. fileciteturn4file0L118-L122

---

# 24. Chuỗi nghiệp vụ chuẩn cuối cùng

```text
SALE
↓
P1 — NHẬN ĐƠN
↓
Đơn đủ thông tin
↓
P2 — KIỂM TRA & LẬP KẾ HOẠCH
↓
Phân tích đơn
↓
Phân tích sản phẩm
↓
Xác định yêu cầu gia công
↓
Xác định yêu cầu Đối tác
↓
Xác định yêu cầu giao hàng
↓
Đánh giá rủi ro
↓
Xác định chi phí / yêu cầu chào giá
↓
TẠO ORDER PLAN
↓
P3 — TÌM & XÁC NHẬN ĐỐI TÁC
↓
Tìm ứng viên
↓
Gửi brief
↓
Nhận giá / xác nhận
↓
So sánh
↓
Chọn Đối tác
↓
Khóa Đối tác
↓
P4 — THEO DÕI GIA CÔNG
↓
Theo dõi tiến độ
↓
Theo dõi deadline
↓
Xác nhận hoàn thành
↓
Bằng chứng
↓
P5 — QC
↓
PASS
│
├── REWORK → P4/P5
│
└── REPLACE / ESCALATE → P8
↓
P6 — GIAO HÀNG
↓
Pickup
↓
Đang giao
↓
POD
↓
P7 — HOÀN TẤT
↓
Cập nhật dữ liệu
↓
Cập nhật hiệu suất Đối tác
↓
COMPLETED
```

---

# 25. Nguyên tắc cuối cùng

**Điều phối không bắt đầu bằng việc tìm shop.**

Điều phối bắt đầu bằng việc **hiểu đúng đơn hàng và biến yêu cầu của khách thành một Kế hoạch đơn hàng mà Đối tác có thể thực hiện**.

Sau đó mới:

```text
TÌM ĐÚNG ĐỐI TÁC
→
LÀM ĐÚNG
→
KIỂM TRA ĐÚNG
→
GIAO ĐÚNG
→
ĐÓNG ĐÚNG
```

Câu nhớ nghiệp vụ:

> **Nhận đúng — Hiểu đúng — Chọn đúng — Làm đúng — Kiểm tra đúng — Giao đúng — Đóng đúng.**

Câu nhớ này được nêu trong Sổ tay Điều phối. fileciteturn4file0L145-L148
