# ALG — Coordinator Playbook
## Hướng dẫn thực hiện công việc Điều phối v1.0

> **Mục đích:** Đây là tài liệu để đào tạo và giúp Điều phối viên thực hiện công việc hằng ngày.
>
> **Nguyên tắc:** Không cần nhớ toàn bộ hệ thống. Chỉ cần biết **đơn đang ở đâu → cần làm gì → khi nào được coi là xong → nếu có vấn đề thì làm gì**.
>
> **Nguồn chuẩn:** Playbook này được rút gọn trực tiếp từ `ALG_COORDINATOR_OPERATIONS_SYSTEM.md`. Nếu có mâu thuẫn, System Documentation là nguồn chuẩn.


> **IMPLEMENTATION CONTEXT — EXISTING SYSTEM EXTENSION**  
> Tài liệu này mô tả chức năng **Coordinator Operations** là một capability/module bổ sung vào **hệ thống ALG hiện có**, không phải một sản phẩm hoặc repository độc lập. Khi triển khai, AI Agent phải inspect repository hiện tại, tái sử dụng architecture, authentication, tenant model, database conventions, components, APIs, services và infrastructure đang có; không tạo một repo mới và không dựng lại các capability đã tồn tại.  
>  
> **Repository hiện tại là nguồn sự thật cho implementation detail.** Tài liệu này là canonical specification cho capability Coordinator. Nếu specification xung đột với behavior production hiện có, phải ưu tiên backward compatibility và ghi nhận gap/decision trước khi thay đổi behavior hiện hữu.  

---

# 0. Bức tranh lớn

Một đơn hàng đi qua 7 chặng:

```text
01 NHẬN ĐƠN
   ↓
02 KIỂM TRA & LẬP KẾ HOẠCH
   ↓
03 TÌM & XÁC NHẬN SHOP
   ↓
04 THEO DÕI SHOP GIA CÔNG
   ↓
05 KIỂM TRA & QC
   ↓
06 ĐIỀU PHỐI GIAO HÀNG
   ↓
07 HOÀN TẤT ĐƠN
```

Nếu có vấn đề ở bất kỳ chặng nào:

```text
→ 08 XỬ LÝ PHÁT SINH
```

### Mục tiêu cuối cùng

> **Đúng yêu cầu — Đúng shop — Đúng chất lượng — Đúng thời gian — Đúng giao nhận.**

---

# 1. NHẬN ĐƠN

## Mục tiêu

Nhận được một đơn đủ thông tin để có thể triển khai.

## Làm gì?

### Bước 1 — Nhận bàn giao từ Sales

Kiểm tra Order ID và Order Brief.

### Bước 2 — Kiểm tra thông tin

☐ Sản phẩm  
☐ Số lượng  
☐ Hình/reference  
☐ Thông tin người nhận  
☐ Địa chỉ  
☐ Thời gian giao  
☐ Nội dung thiệp/message  
☐ Budget/chi phí được duyệt  
☐ Yêu cầu đặc biệt

### Bước 3 — Nếu thiếu thông tin

Không tự đoán.

→ Hỏi Sales/người phụ trách đơn.

### Bước 4 — Nếu thông tin đầy đủ

Chuyển đơn sang:

**READY FOR PLANNING**

## Hoàn thành khi

Bạn có thể trả lời rõ:

> **Làm gì? Làm cho ai? Ở đâu? Khi nào? Yêu cầu gì?**

---

# 2. KIỂM TRA & LẬP KẾ HOẠCH

## Mục tiêu

Biến yêu cầu của khách thành yêu cầu mà Shop có thể thực hiện.

## Kiểm tra 4 nhóm

### A. Sản phẩm

- Làm sản phẩm gì?
- Size/quantity?
- Style/màu?
- Reference?
- Vật liệu/thành phần?
- Packaging/card?

### B. Shop

- Shop phải có khả năng gì?
- Ở khu vực nào?
- Có thể làm đúng thời gian không?
- Có đủ capacity không?

### C. Giao hàng

- Địa chỉ?
- Người nhận?
- Thời gian?
- Yêu cầu đặc biệt?

### D. Rủi ro

- Đơn gấp?
- Reference khó?
- Yêu cầu đặc biệt?
- Có khả năng thiếu nguyên liệu?
- Có deadline sát?

## Hoàn thành khi

Bạn có một **Order Plan** rõ ràng để đi tìm Shop.

---

# 3. TÌM & XÁC NHẬN SHOP

## Mục tiêu

Chọn được Shop phù hợp và Shop xác nhận nhận đơn.

## Ưu tiên khi tìm Shop

1. Phù hợp sản phẩm
2. Đúng khu vực
3. Có khả năng đáp ứng thời gian
4. Có capacity
5. Chất lượng phù hợp
6. Lịch sử/SLA phù hợp
7. Chi phí phù hợp

## Bước 1 — Chọn ứng viên

Tìm Shop trong Partner Network.

## Bước 2 — Gửi brief

Gửi:

- Order ID
- Sản phẩm
- Reference
- Số lượng
- Yêu cầu thực hiện
- Deadline
- Yêu cầu đặc biệt
- Thông tin chi phí áp dụng

## Bước 3 — Hỏi Shop xác nhận

Cần có đủ:

☐ Nhận đơn?  
☐ Làm được?  
☐ Giá/chi phí?  
☐ Khi nào xong?  
☐ Có vấn đề gì không?

## Bước 4 — Lock Shop

Khi Shop xác nhận:

**PARTNER CONFIRMED**

→ Update hệ thống.

## Nếu Shop từ chối

Không tranh luận kéo dài.

→ Ghi nhận lý do  
→ Chọn ứng viên tiếp theo.

## Hoàn thành khi

> **Một Shop đã xác nhận nhận đơn + cam kết thời gian + không còn điểm chưa rõ.**

---

# 4. THEO DÕI SHOP GIA CÔNG

## Mục tiêu

Đảm bảo Shop làm đúng và không trễ deadline.

## Bước 1 — Xác nhận bắt đầu

Biết rõ:

> Shop đã bắt đầu chưa?

## Bước 2 — Theo dõi tiến độ

Theo dõi:

- Đang làm đến đâu?
- Có vấn đề gì?
- Có thay đổi gì?
- ETA có thay đổi không?

## Bước 3 — Theo dõi deadline

Luôn biết:

> **Còn bao lâu đến giờ giao?**

Không đợi đến lúc trễ mới xử lý.

## Bước 4 — Khi Shop hoàn thành

Yêu cầu evidence theo quy định, ví dụ ảnh sản phẩm.

Chuyển:

**READY FOR QC**

## Hoàn thành khi

Shop báo hoàn thành và đã có đủ evidence để QC.

---

# 5. KIỂM TRA & QC

## Mục tiêu

Đảm bảo sản phẩm thực tế phù hợp với yêu cầu đơn.

## Kiểm tra

☐ Đúng sản phẩm  
☐ Đúng số lượng  
☐ Đúng reference/định hướng  
☐ Đúng màu/style nếu có yêu cầu  
☐ Chất lượng đạt yêu cầu  
☐ Đúng packaging  
☐ Đúng card/message  
☐ Không có lỗi rõ ràng

## Có 3 kết quả

### PASS

→ Cho phép giao.

### REWORK

Sản phẩm có thể sửa.

→ Gửi yêu cầu sửa  
→ Shop sửa  
→ Kiểm tra lại.

### REPLACE / ESCALATE

Không thể sửa hoặc sai nghiêm trọng.

→ Kích hoạt xử lý phát sinh.

## Hoàn thành khi

**QC PASSED**

---

# 6. ĐIỀU PHỐI GIAO HÀNG

## Mục tiêu

Sản phẩm đến đúng người, đúng nơi, đúng thời gian.

## Trước khi pickup

Kiểm tra:

☐ Sản phẩm ready  
☐ Địa chỉ  
☐ Người nhận  
☐ Số điện thoại  
☐ Thời gian giao  
☐ Ghi chú giao hàng

## Pickup

Phối hợp Shop + Delivery.

## Trong lúc giao

Theo dõi:

**READY → PICKUP → IN DELIVERY → DELIVERED**

Nếu có nguy cơ trễ:

→ Xử lý ngay, không chờ đến deadline.

## Sau khi giao

Lấy delivery confirmation/POD theo quy định.

## Hoàn thành khi

> **Đã xác nhận giao thành công.**

---

# 7. HOÀN TẤT ĐƠN

## Mục tiêu

Đóng đơn sạch và lưu lại dữ liệu cần thiết.

## Checklist

☐ Đã giao  
☐ Có POD/evidence  
☐ Partner đã ghi nhận  
☐ Chi phí/dữ liệu cần thiết đã cập nhật  
☐ Thời gian thực tế đã ghi nhận  
☐ Issue nếu có đã ghi nhận  
☐ Partner performance đã được cập nhật

Sau đó:

**COMPLETED**

---

# 8. XỬ LÝ PHÁT SINH

Khi có vấn đề, không xử lý theo cảm tính.

Dùng 6 bước:

```text
1. DETECT
   Có chuyện gì?

2. ASSESS
   Ảnh hưởng gì đến đơn?

3. CONTAIN
   Làm gì ngay để không xấu thêm?

4. RESOLVE / ESCALATE
   Tự xử lý hay cần Leader?

5. RECORD
   Ghi nhận vấn đề và cách xử lý.

6. RESUME
   Đưa đơn trở lại luồng bình thường.
```

## 8.1 Thiếu thông tin

→ Dừng bước triển khai liên quan  
→ Hỏi Sales/order owner  
→ Không tự đoán.

## 8.2 Shop từ chối

→ Ghi nhận lý do  
→ Chọn Shop khác  
→ Nếu không có Shop phù hợp → Escalate.

## 8.3 Shop có nguy cơ trễ

→ Xác định mức độ ảnh hưởng  
→ Tìm phương án recovery  
→ Nếu không đảm bảo → Escalate / thay Shop theo quy định.

## 8.4 Sản phẩm không đạt QC

→ Rework nếu có thể  
→ Nếu không thể → Replace/Escalate.

## 8.5 Giao hàng gặp vấn đề

→ Xác định vấn đề: pickup / địa chỉ / người nhận / thời gian  
→ Phối hợp bên liên quan  
→ Theo dõi đến khi có kết quả.

## 8.6 Khách/Sales thay đổi yêu cầu

→ Xác định thay đổi  
→ Kiểm tra ảnh hưởng đến sản xuất, chi phí, thời gian  
→ Chỉ triển khai sau khi thay đổi được xác nhận theo quy định.

---

# 9. Quy tắc làm việc hằng ngày

## Rule 1 — Không để đơn "không có chủ"

Mỗi đơn phải có:
- Status rõ ràng
- Next action rõ ràng
- Owner rõ ràng

## Rule 2 — Không chờ đến deadline

Điều phối phải quản lý **rủi ro trước deadline**, không chỉ phản ứng khi đã trễ.

## Rule 3 — Không truyền đạt mơ hồ

Brief cho Shop phải đủ rõ để Shop có thể thực hiện mà không phải đoán.

## Rule 4 — Không tự ý thay đổi cam kết

Nếu thay đổi sản phẩm, chi phí, thời gian hoặc yêu cầu quan trọng → xác nhận theo quy định.

## Rule 5 — Mọi vấn đề phải được ghi nhận

Nếu một vấn đề có thể xảy ra lần nữa, dữ liệu phải được lưu lại.

## Rule 6 — "Đã báo" không có nghĩa là "đã xử lý"

Chỉ coi việc hoàn thành khi có **evidence/result**.

---

# 10. Daily Coordinator Mental Model

Mỗi khi mở danh sách đơn, hãy hỏi 5 câu:

### 1. Đơn đang ở đâu?

`Status`

### 2. Đơn tiếp theo cần làm gì?

`Next Action`

### 3. Ai đang giữ bóng?

`Owner`

### 4. Có nguy cơ gì?

`Risk`

### 5. Khi nào phải xong?

`Deadline`

Nếu 5 câu này đều rõ, bạn đang kiểm soát được đơn.

---

# 11. Quick Reference

| Chặng | Tôi cần làm gì? | Khi nào xong? |
|---|---|---|
| 01 Nhận đơn | Kiểm tra Sales handover | Đơn đủ thông tin |
| 02 Lập kế hoạch | Xác định production + delivery requirement | Có Order Plan |
| 03 Tìm Shop | Chọn và confirm Shop | Partner Confirmed |
| 04 Theo dõi | Theo dõi production | Product Ready |
| 05 QC | Kiểm tra và xử lý lỗi | QC Passed |
| 06 Giao hàng | Điều phối đến người nhận | Delivered |
| 07 Hoàn tất | Đóng dữ liệu + performance | Completed |
| 08 Phát sinh | Detect → Assess → Resolve → Record | Đơn trở lại luồng |

---

# 12. Mapping với System Documentation

| Playbook | Canonical System |
|---|---|
| 01. Nhận đơn | WS01 Receive Order |
| 02. Kiểm tra & lập kế hoạch | WS02 Plan Order |
| 03. Tìm & xác nhận Shop | WS03 Assign Partner |
| 04. Theo dõi Shop gia công | WS04 Execute Order |
| 05. Kiểm tra & QC | WS05 Control & QC |
| 06. Điều phối giao hàng | WS06 Deliver Order |
| 07. Hoàn tất đơn | WS07 Close & Learn |
| 08. Xử lý phát sinh | L6 Exception Architecture |

**Playbook không được tạo ra một Workstream, Stage hoặc Step mới nằm ngoài System Documentation nếu chưa được phê duyệt và cập nhật vào System Documentation.**

---

# 13. Câu nhớ cho Điều phối

> **Nhận đúng → Hiểu đúng → Chọn đúng → Làm đúng → Kiểm tra đúng → Giao đúng → Đóng đúng.**

Đó là toàn bộ logic công việc của Điều phối ALG.
