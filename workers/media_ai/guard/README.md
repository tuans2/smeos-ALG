# Product Identity Guard

Cổng cứng bắt buộc sau tăng cường. Không phải tính năng tuỳ chọn.

Nguyên tắc chi phối M04a: **tăng cường sản phẩm, không tái sinh sản phẩm.** Số lượng, màu, hình dáng, tỉ lệ tương đối là bất biến; chỉ ánh sáng, độ nét, nhiễu, cân bằng trắng, nền và bố cục được đổi.

Guard so vân tay sản phẩm trước và sau tăng cường bằng chính hợp đồng phân tích của M01, và **phải dùng cùng một provider, cùng một model version cho cả hai lần**, ghi vào metadata asset.

| Phán quyết | Hành động |
|---|---|
| `SAFE` | Trả Master Image |
| `GOOD` | Trả Master Image |
| `WARNING` | Giảm tăng cường, cảnh báo người dùng, vẫn cho xem kết quả |
| `REJECTED` | Giữ ảnh gốc, báo người dùng, **không** trả ảnh đã tăng cường |

`REJECTED` là `status = COMPLETED` với `result = REJECTED`. Không phải `FAILED`.

Guard là cổng an toàn kỹ thuật do máy chấm. Nó **không** thay thế Review & Approve — cổng nghiệp vụ do người có quyền `media.approve` chấm. Tải ảnh về không phải là phê duyệt.
