# 02 — Danh mục năng lực

Từ vựng quyền của toàn hệ thống. Tài liệu phân quyền, bảng công tắc trên màn hình và phép kiểm ở máy chủ gọi cùng một mã, nên đọc tài liệu và đọc màn hình là cùng một việc.

Bảng ở mục 3 **sinh từ `FloraOS/floraos-web/src/lib/maChucNang.ts`** (246 dòng). Không tệp nào khác trong bộ tài liệu được chép lại bảng này; chúng dẫn chiếu tới đây.

## 1. Ba lớp cắt

```
mặc định theo vai  →  bảng công tắc của tổ chức  →  TRẦN CỨNG (cắt sau cùng)
```

Trần cứng cắt **sau** bảng công tắc. Không đường nào từ giao diện hay cơ sở dữ liệu mở được một năng lực đã bị trần cứng chặn. 18 trong 76 mã có trần cứng.

Thứ tự này là thứ tự thi hành, không phải thứ tự trình bày. Đảo lại là mở toang hệ thống.

## 2. Ba mở rộng so với bản của FloraOS

**Phạm vi.** Quyền không còn là cặp `(vai, mã)` mà là bộ ba `(vai, mã, phạm vi)`, phạm vi thuộc `{organization, branch}`. Sale thấy chi nhánh mình; Điều hành thấy toàn tổ chức.

**Vai là bản ghi.** Bỏ `enum Role`. Vai tối thiểu: Experience User · Điều hành · Sale · Điều phối. Tổ chức thêm vai riêng được.

**Điều hành là tập cha.** Điều hành có mọi năng lực của Sale và Điều phối, để kiểm soát, giám sát và tự xử lý được bất kỳ việc nào. Hệ quả: Điều hành duyệt được chính việc mình vừa làm. Hai điều bắt buộc đi kèm:

- Mọi hành động duyệt ghi `audit_logs` với người thực hiện, thời điểm, và bản ghi được duyệt.
- Công tắc cấp tổ chức `cho_phep_tu_duyet`. Bật thì Điều hành duyệt việc của chính mình; tắt thì bản ghi do chính người đó tạo không hiện trong hàng đợi duyệt của người đó.

**Mã và tên gọi.** Mỗi năng lực có hai định danh: mã chữ cái (`B5`) và tên đọc được (`vision.analyze`). Mã chữ cái là định danh chính, giữ nguyên để `maChucNang.test.ts` chuyển sang không phải sửa một dòng. Tên đọc được là trường thêm, dùng trong mã nguồn và tài liệu. Năng lực mới có cả hai.

## 3. Bảng 76 mã thu hoạch

76 mã, 18 mã có trần cứng, năm nhóm. Sinh từ mã nguồn.

### Truy cập và tài khoản

| Mã | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|
| `A1` | Đăng nhập bằng tài khoản nội bộ | Điều hành · Điều phối · Sale | — |
| `A2` | Đổi mật khẩu đăng nhập của chính mình | Điều hành · Điều phối · Sale | — |
| `A3` | Tạo tài khoản nội bộ | Điều hành | Điều hành |
| `A4` | Đổi vai của một tài khoản | Điều hành | Điều hành |
| `A5` | Bật tắt trạng thái hoạt động của tài khoản | Điều hành | Điều hành |
| `A6` | Đặt và đổi mật khẩu quản trị của kho | Điều hành | Điều hành |
| `A7` | Đặt lại mật khẩu đăng nhập của người khác | Điều hành | Điều hành |

### Phân tích ảnh

| Mã | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|
| `B1` | Tải ảnh sản phẩm lên kho | Điều hành · Điều phối | — |
| `B2` | Xem danh sách ảnh, bỏ từng ảnh trước khi chạy | Điều hành · Điều phối | — |
| `B3` | Soát điều kiện trước khi chạy | Điều hành · Điều phối | — |
| `B4` | Xem ước phí lượt chạy | Điều hành · Điều phối | — |
| `B5` | Phân tích một ảnh mỗi lượt | Điều hành · Điều phối | — |
| `B6` | Phân tích nhiều ảnh trong một lượt | Điều hành | — |
| `B7` | Phân tích cả một thư mục ảnh | Điều hành | — |
| `B8` | Phân tích cả kho ảnh | Điều hành | — |
| `B9` | Dừng lượt chạy của chính mình | Điều hành · Điều phối | — |
| `B10` | Dừng lượt chạy của người khác | Điều hành · Điều phối | — |
| `B11` | Xem nhật ký lượt chạy của chính mình | Điều hành · Điều phối | — |
| `B12` | Xem nhật ký mọi lượt chạy | Điều hành · Điều phối | — |
| `B13` | Mở khoá lượt chạy treo | Điều hành | — |
| `B14` | Quét lại chỉ mục ảnh | Điều hành · Điều phối | — |
| `B15` | Nạp 02_KET-QUA.xlsx vào giao diện | Điều hành · Điều phối | — |
| `B16` | Tải tệp Excel kết quả về máy | Điều hành · Điều phối | — |

### Tạo thẻ và chào giá

| Mã | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|
| `C1` | Xem bảng giá chào của sản phẩm đang chọn | Điều hành · Điều phối · Sale | — |
| `C2` | Chuyển một mã sang Điều phối dựng thẻ | Điều hành · Điều phối · Sale | — |
| `C3` | Mở tab Tạo thẻ | Điều hành · Điều phối | — |
| `C4` | Chọn sản phẩm, nạp dữ liệu vào biểu mẫu | Điều hành · Điều phối | — |
| `C5` | Điền biểu mẫu, địa chỉ ba cấp, khung giờ giao | Điều hành · Điều phối | — |
| `C6` | Xem bảng kiểm giá thời gian thực | Điều hành · Điều phối | — |
| `C7` | Nhập tay đè trường tự động, trừ Giá vốn | Điều hành · Điều phối | — |
| `C8` | Nhập tay đè Giá vốn | Điều hành · Điều phối | — |
| `C9` | Đặt giá chào chốt vượt Trần | Điều hành · Điều phối | — |
| `C10` | Đặt giá chào chốt dưới Sàn | Điều hành | Điều hành |
| `C11` | Xem trước thẻ | Điều hành · Điều phối | — |
| `C12` | Xuất PNG và PDF A6 | Điều hành · Điều phối | — |
| `C13` | Copy kịch bản Zalo | Điều hành · Điều phối | — |
| `C14` | Xem sổ xuất thẻ của chính mình | Điều hành · Điều phối | — |
| `C15` | Xem sổ xuất thẻ toàn công ty | Điều hành · Điều phối | — |
| `C16` | Tải exports_log.csv về máy | Điều hành · Điều phối | — |
| `C17` | Xem ảnh sản phẩm để tư vấn khách | Điều hành · Điều phối · Sale | — |
| `C18` | Xem danh bạ đối tác và lịch sử bắn đơn | Điều hành · Điều phối | — |
| `C19` | Bắn đơn cho đối tác | Điều hành · Điều phối | — |
| `C20` | Chốt đối tác nhận hoặc từ chối | Điều hành · Điều phối | — |
| `C21` | Đóng một việc chờ dựng thẻ | Điều hành · Điều phối | — |
| `C22` | Trả một việc chờ về cho Sales | Điều hành · Điều phối | — |
| `C23` | Xem bảng điều phối trong ngày | Điều hành · Điều phối | — |
| `C24` | Xem danh sách mã toàn kho | Điều hành · Điều phối · Sale | — |
| `C25` | Xem bảng thành phần nguyên liệu của một mã | Điều hành · Điều phối · Sale | — |
| `C26` | Xem dữ liệu máy đọc được từ ảnh | Điều hành · Điều phối · Sale | — |
| `C27` | Xem giá dành cho Đối tác Shop | Điều hành · Điều phối | Điều hành · Điều phối |
| `C28` | Xoá vĩnh viễn một việc chờ | Điều hành | Điều hành |

### Cấu hình nghiệp vụ

| Mã | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|
| `D1` | Mở màn Cài đặt và đọc toàn bộ tham số | Điều hành · Điều phối | — |
| `D2` | Sửa hạng đối tác và tỷ lệ thưởng | Điều hành · Điều phối | — |
| `D3` | Sửa nhóm phụ phí và mức phụ phí | Điều hành · Điều phối | — |
| `D4` | Sửa nhãn ưu tiên và ma trận ưu tiên | Điều hành · Điều phối | — |
| `D5` | Sửa danh mục lựa chọn | Điều hành · Điều phối | — |
| `D6` | Sửa danh sách linh động | Điều hành · Điều phối | — |
| `D7` | Sửa kỳ thanh toán | Điều hành · Điều phối | — |
| `D8` | Sửa thư mục ảnh | Điều hành · Điều phối | — |
| `D9` | Sửa chú giải trường | Điều hành · Điều phối | — |
| `D10` | Sửa tham số chi phí theo vai | Điều hành | Điều hành |
| `D11` | Xuất cấu hình ra tệp | Điều hành · Điều phối | — |
| `D12` | Nhập cấu hình từ tệp | Điều hành | — |
| `D13` | Khôi phục cấu hình mặc định | Điều hành | — |
| `D14` | Cập nhật giá toàn bộ | Điều hành · Điều phối | — |
| `D15` | Soát kỹ hệ thống | Điều hành · Điều phối | — |
| `D16` | Sửa định mức tiền công theo độ khó | Điều hành | Điều hành |
| `D17` | Đặt tham số giá của chiều tính từ giá sản xuất | Điều hành | Điều hành |
| `D18` | Tạo trường dữ liệu riêng và ẩn trường tuỳ chọn của cửa hàng | Điều hành | Điều hành |
| `D19` | Gắn và gỡ tên miền riêng của cửa hàng (checklist ALG 10.8) | Điều hành | Điều hành |

### Hệ thống

| Mã | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|
| `E1` | Mở màn Điều hành | Điều hành | Điều hành |
| `E2` | Xem trạng thái kho và mã API dạng ✓/✕ | Điều hành · Điều phối · Sale | — |
| `E3` | Xem bản che mã API | Điều hành | Điều hành |
| `E4` | Dán mã API mới hoặc xoá mã API | Điều hành | Điều hành |
| `E5` | Đổi mô hình AI | Điều hành | Điều hành |
| `E6` | Khai đường dẫn kho dùng chung | Điều hành | Điều hành |
| `E7` | Dò kho tự động | Điều hành | Điều hành |
| `E8` | Xem và dọn ảnh mồ côi trong kho (F8) | Điều hành | Điều hành |

## 4. Năng lực mới của core

Các nhóm dưới đây không tồn tại ở FloraOS v1. Chúng nhận nhóm chữ cái mới, tiếp nối quy ước sẵn có. Dải `N` thuộc vận hành nền tảng và mang phạm vi `PLATFORM` — nó nằm ở `../kien-truc/DASHBOARD_VAN_HANH_NEN_TANG.md` mục 4, không nằm ở đây, vì nó không phải năng lực của một tổ chức.

**Mã vào danh mục theo pha của module nó gác, không vào trước.** Bảng dưới nói mã nào đã có trong `capability-catalog.ts` và mã nào vào ở pha nào — đọc bảng này trước khi kiểm một mã trong mã nguồn, để không ai tìm một mã chưa tới lúc tồn tại:

| Dải | Trạng thái |
|---|---|
| `F1`–`F9` · `G1`–`G9` · `H1`–`H4` · `I1`–`I5` · `J1`–`J6` · `K1`–`K2` · `L1`–`L6` · `U1`–`U4` | Đã có trong mã |
| `H5` · `H6` | Vào ở P14 (M01b) |
| `P1`–`P5` | Vào ở P17 (M04c) — `P16` (M04b) dùng `I4`/`I5` thay vì dải `P`, xem mục "Tối ưu ảnh và biến thể marketing" dưới đây |
| `O1`–`O7` | Vào ở P18 (M07) |
| `J7` | Vào ở P19 (M06) |
| `S1`–`S4` | Vào ở P20 (M11) |
| `Q1`–`Q8` | Vào ở P21 (M09) |
| `R1`–`R8` | Vào ở P22 (M10) |
| `T1`–`T4` | Vào ở P23 (M08) |
| `V1`–`V3` | Nghiên cứu thị trường & Xu hướng (Market Intelligence Engine, Đợt A) |

### Tổ chức và thành viên — nhóm F

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `F1` | `org.read` | Xem hồ sơ tổ chức | Điều hành · Điều phối · Sale | — |
| `F2` | `org.update` | Sửa hồ sơ tổ chức | Điều hành | Điều hành |
| `F3` | `member.invite` | Mời thành viên vào tổ chức | Điều hành | Điều hành |
| `F4` | `member.remove` | Gỡ thành viên khỏi tổ chức | Điều hành | Điều hành |
| `F5` | `role.manage` | Tạo và sửa vai, gán năng lực cho vai | Điều hành | Điều hành |
| `F6` | `branch.read` | Xem danh sách chi nhánh | Điều hành · Điều phối · Sale | — |
| `F7` | `branch.manage` | Tạo, sửa, đóng chi nhánh | Điều hành | Điều hành |
| `F8` | `workspace.manage` | Tạo và cấu hình workspace | Điều hành | Điều hành |
| `F9` | `integration.token.manage` | Tạo, thu hồi và xoay token máy gọi máy của tổ chức | Điều hành | Điều hành |

### Asset và job — nhóm G

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `G1` | `asset.read` | Xem asset của tổ chức | Điều hành · Điều phối · Sale | — |
| `G2` | `asset.upload` | Tải asset lên | Điều hành · Điều phối · Sale | — |
| `G3` | `asset.delete` | Xoá asset | Điều hành | Điều hành |
| `G4` | `job.read` | Xem job của chính mình | Điều hành · Điều phối · Sale | — |
| `G5` | `job.read.all` | Xem job của toàn tổ chức | Điều hành | — |
| `G6` | `job.cancel` | Huỷ job đang chờ | Điều hành · Điều phối · Sale | — |
| `G7` | `job.retry` | Chạy lại job thất bại | Điều hành · Điều phối | — |
| `G8` | `usage.read` | Xem mức dùng và hạn mức | Điều hành | — |
| `G9` | `audit.read` | Đọc nhật ký kiểm toán | Điều hành | Điều hành |

### Vision — nhóm H

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `H1` | `vision.analyze` | Chạy phân tích ảnh sản phẩm | Điều hành · Điều phối · Sale | — |
| `H2` | `vision.result.edit` | Sửa kết quả phân tích trước khi duyệt | Điều hành · Điều phối | — |
| `H3` | `product.approve` | Ra phán quyết trên kết quả phân tích — duyệt ghi Product Master, từ chối đóng bản ghi lại | Điều hành | Điều hành |
| `H4` | `vision.engine.manage` | Chọn bộ máy phân tích ảnh dùng cho cả tổ chức | Điều hành | Điều hành |
| `H5` | `product.copy.generate` | Sinh tên, mô tả, thẻ, dịp và phân khúc giá từ một lượt phân tích đã duyệt | Điều hành · Điều phối · Sale | — |
| `H6` | `product.copy.approve` | Ghi phần dữ liệu bán hàng đã sinh vào Product Master | Điều hành | Điều hành |

### Tối ưu ảnh và biến thể marketing — nhóm I

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `I1` | `media.optimize` | Chạy job tối ưu ảnh (M04a) | Điều hành · Điều phối · Sale | — |
| `I2` | `media.approve` | Nâng Master Image thành ảnh chính thức của sản phẩm (M04a) | Điều hành | Điều hành |
| `I3` | `media.download` | Tải ảnh đã tối ưu về máy (M04a và M04b) | Điều hành · Điều phối · Sale | — |
| `I4` | `media.variant.run` | Dựng biến thể marketing từ Master Image đã duyệt (M04b, P16/P24) | Điều hành · Điều phối · Sale | — |
| `I5` | `media.variant.approve` | Duyệt một biến thể marketing thành ảnh dùng được (M04b, P16/P24) | Điều hành | Điều hành |

`I4`/`I5` là cặp chạy/duyệt tách rời của M04b (`SPLIT_CAPABILITY_PAIRS` ở `capability-catalog.ts`), không phải mã của M04a dù cùng nhóm chữ `I`. Trước P24, `I4` từng dự định là `media.preset.manage` (đặt thư viện nền cấp tổ chức — nợ #77) khi M04b còn gắn `SocialFlow`; khi M04b chuyển hẳn vào `floraos-core`, mã `I4` đã dùng cho cặp chạy/duyệt biến thể thay vì năng lực đó. `media.preset.manage` khi được xây (nợ #77) cần một mã mới, không phải `I4`.

### Kênh bán — nhóm J

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `J1` | `catalog.create` | Tạo catalog | Điều hành · Điều phối | — |
| `J2` | `catalog.publish` | Xuất bản catalog | Điều hành | — |
| `J3` | `landing.create` | Tạo landing page | Điều hành · Điều phối | — |
| `J4` | `landing.publish` | Xuất bản landing page | Điều hành | — |
| `J5` | `social.publish` | Đăng bài lên mạng xã hội | Điều hành | — |
| `J6` | `chat.manage` | Mở và cấu hình kênh hội thoại khách hàng | Điều hành · Điều phối | — |
| `J7` | `catalog.qr.manage` | Tạo, đổi và thu hồi liên kết catalog kèm mã QR | Điều hành · Điều phối | — |

`J6` là năng lực cấp kênh — mở kênh, nối tài khoản, đặt cấu hình. Năng lực thao tác trong một hội thoại cụ thể nằm ở nhóm `T`.

### Marketing, chăm sóc khách và in ấn — nhóm M

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `M1` | `marketing.usage.read` | Xem nơi dùng của tư liệu và thống kê quy thuộc | Điều hành · Điều phối · Sale · Marketing | — |
| `M2` | `marketing.usage.manage` | Tạo và cấu hình nơi dùng cho tư liệu (liên kết, QR) | Điều hành · Marketing | — |
| `M3` | `marketing.campaign.manage` | Tạo và quản lý chiến dịch quảng bá, kích hoạt và đo lường | Điều hành · Marketing | — |
| `M4` | `crm.segment.manage` | Quản lý nhóm khách và chăm sóc khách hàng | Điều hành · Marketing | — |
| `M5` | `print.rendition.export` | Kiểm quy cách và xuất ấn phẩm in ấn | Điều hành · Điều phối · Marketing | — |

Nhóm M vào cùng Marketing & Sales Center (PO 01/11/2026, `docs/kien-truc/Nâng cấp tasks/ALG_Marketing_Sales_Center/03_KE_HOACH_TRIEN_KHAI.md`).

### Sản phẩm và giá — nhóm L

76 mã thu hoạch bao phủ màn hình của FloraOS v1, nơi sản phẩm và giá gắn chặt vào luồng dựng thẻ chào giá. Core tách chúng thành năng lực riêng.

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `L1` | `product.read` | Xem sản phẩm trong Product Master | Điều hành · Điều phối · Sale | — |
| `L2` | `product.create` | Thêm sản phẩm mới | Điều hành · Điều phối · Sale | — |
| `L3` | `product.update` | Sửa thông tin sản phẩm | Điều hành · Điều phối · Sale | — |
| `L4` | `product.archive` | Ngừng kinh doanh một sản phẩm | Điều hành | Điều hành |
| `L5` | `pricing.read` | Xem quy tắc giá của tổ chức; đọc/ghi giá vốn sản phẩm (`cost_price_vnd`, 30/10/2026) | Điều hành · Điều phối | — |
| `L6` | `pricing.manage` | Sửa quy tắc giá của tổ chức | Điều hành | Điều hành |

`product.approve` không nằm ở nhóm này — nó là `H3`, vì duyệt sản phẩm chính là duyệt kết quả phân tích ghi vào Product Master.

**Mẫu đề xuất và mẫu chính thức (PO 23/10/2026, giai đoạn 1).** `L2`/`L3` không đủ để đụng vào danh mục chính thức — `H3` mới đủ:

- Người không có `H3` tạo mẫu → mẫu dùng được ngay, mang nhãn đề xuất (`attributes.proposal`, chỉ máy chủ ghi) và Điều hành nhận thông báo `PRODUCT_PROPOSED`. Điều hành duyệt qua `POST /products/:id/approve` (`H3`, ghi `audit_logs`).
- Người không có `H3` chỉ sửa nội dung mẫu đề xuất **của chính mình** đang chờ duyệt. Trên mẫu chính thức họ chỉ đổi được trạng thái bán (Đang bán ↔ Bản nháp, tức tạm ẩn khi hết hoa) và cấu hình khả dụng; ngừng kinh doanh vẫn cần `L4`.
- Nhập Excel (`POST /products/batch-import`) cần thêm `H3`. Xoá/khôi phục sản phẩm trong thùng rác cần `L4`.

**Duyệt và từ chối dùng chung `H3`.** Năng lực ở đây là *ra phán quyết trên kết quả AI*, và phán quyết gồm cả hai chiều. Tách thành hai mã sẽ dựng được một vai duyệt được mà không bỏ được — thứ không có nghĩa trong vận hành, và nó đẩy người soát về phía duyệt cho xong khi gặp một kết quả sai.

**`H4` tách khỏi `H1`** vì hai việc khác hẳn nhau về hệ quả. `H1` chạy một lượt phân tích, sai thì bỏ lượt đó. `H4` đổi bộ máy cho MỌI lượt phân tích về sau của cả tổ chức, và hệ quả của nó chỉ lộ ra sau hàng trăm bản ghi. Trần cứng Điều hành vì vậy, và mỗi lần đổi ghi `audit_logs`.

### Trải nghiệm — nhóm K

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `K1` | `experience.use` | Dùng workspace trải nghiệm trong hạn mức | Experience User | — |
| `K2` | `experience.convert` | Chuyển workspace trải nghiệm thành tổ chức thật | Experience User · Điều hành | — |

### Nội dung và đăng bài — nhóm O

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `O1` | `content.generate` | Sinh nội dung cho một sản phẩm trên một kênh | Điều hành · Điều phối · Sale | — |
| `O2` | `content.edit` | Sửa nội dung trước khi duyệt | Điều hành · Điều phối | — |
| `O3` | `content.approve` | Duyệt hoặc bỏ một nội dung trước khi nó vào lịch đăng | Điều hành | Điều hành |
| `O4` | `content.schedule` | Đặt lịch đăng, hẹn giờ, đổi và bỏ mục trong lịch | Điều hành · Điều phối | — |
| `O5` | `channel.connect` | Nối và ngắt tài khoản nền tảng của tổ chức | Điều hành | Điều hành |
| `O6` | `content.library.manage` | Quản lý thư viện nội dung, đăng lại nội dung cũ | Điều hành · Điều phối | — |
| `O7` | `content.autoapprove.manage` | Bật tắt công tắc tự duyệt nội dung theo thời hạn của tổ chức | Điều hành | Điều hành |

`O7` là công tắc duy nhất trong toàn danh mục cho phép một đầu ra AI đi ra ngoài mà không có người bấm duyệt, nên nó bị bó ba lớp: chỉ áp cho nội dung đăng bài, tắt theo mặc định, và mỗi lượt tự duyệt ghi `audit_logs` với người bật công tắc là người chịu trách nhiệm. Tắt công tắc thì hết thời hạn nội dung quay về hàng chờ, không tự đăng.

### Ảnh và video marketing — nhóm P

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `P1` | `creative.compose` | Soạn biến thể marketing trên một Master Image đã duyệt | Điều hành · Điều phối · Sale | — |
| `P2` | `creative.approve` | Duyệt một biến thể marketing trước khi nó ra kênh | Điều hành | Điều hành |
| `P3` | `video.generate` | Chạy job sinh video từ ảnh đã duyệt | Điều hành · Điều phối · Sale | — |
| `P4` | `video.approve` | Duyệt một video trước khi nó ra kênh | Điều hành | Điều hành |
| `P5` | `brand.watermark.manage` | Đặt logo, vị trí và độ mờ watermark cho cả tổ chức | Điều hành | Điều hành |

Nhóm `P` không có mã nào cho phép sửa chính sản phẩm. Mọi thay đổi chạm vào bó hoa đi qua `I1` và Identity Guard, kể cả khi người dùng bấm nút trong màn soạn biến thể.

### Khách hàng và nhắc mua lại — nhóm Q

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `Q1` | `customer.read` | Xem hồ sơ khách hàng và lịch sử mua | Điều hành · Điều phối · Sale | — |
| `Q2` | `customer.create` | Thêm khách hàng | Điều hành · Điều phối · Sale | — |
| `Q3` | `customer.update` | Sửa hồ sơ khách hàng | Điều hành · Điều phối · Sale | — |
| `Q4` | `customer.archive` | Ngừng theo dõi một hồ sơ khách hàng | Điều hành | Điều hành |
| `Q5` | `customer.export` | Xuất danh sách khách hàng ra tệp | Điều hành | Điều hành |
| `Q6` | `occasion.manage` | Quản lý ngày đặc biệt của khách hàng | Điều hành · Điều phối · Sale | — |
| `Q7` | `reminder.campaign.manage` | Tạo và dừng chiến dịch nhắc mua lại | Điều hành | — |
| `Q8` | `voucher.manage` | Tạo, sửa, thu hồi voucher | Điều hành | Điều hành |

`Q5` có trần cứng vì xuất danh sách khách hàng là lấy toàn bộ dữ liệu cá nhân ra khỏi hệ thống trong một lần bấm. Xoá theo yêu cầu của chính khách hàng cuối không phải một năng lực của tổ chức — nó là một luồng riêng, không mở được bằng bất kỳ mã nào ở đây.

### Đơn hàng và vận hành — nhóm R

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `R1` | `order.read` | Xem đơn hàng | Điều hành · Điều phối · Sale · Thợ cắm | — |
| `R2` | `order.create` | Tạo đơn hàng | Điều hành · Điều phối · Sale | — |
| `R3` | `order.update` | Sửa đơn và cập nhật trạng thái sản xuất | Điều hành · Điều phối · Thợ cắm | — |
| `R4` | `order.assign` | Phân công thợ cắm cho một đơn | Điều hành · Điều phối | — |
| `R5` | `delivery.manage` | Theo dõi và cập nhật giao hàng, đặt khung giờ | Điều hành · Điều phối | — |
| `R6` | `order.cancel` | Huỷ một đơn hàng | Điều hành | Điều hành |
| `R7` | `order.print` | In phiếu đơn và phiếu sản xuất | Điều hành · Điều phối · Thợ cắm | — |
| `R8` | `order.card_message.manage` | Quản lý lời nhắn thiệp của đơn | Điều hành · Điều phối · Sale | — |

Nhóm `R` là phần đơn hàng của core. Luồng chào giá và bảng điều phối trong ngày giữ nguyên từ vựng thu hoạch `C1`–`C28`; hai nhóm không trùng nhau — `C` là dựng thẻ và chào giá, `R` là đơn đã nhận và việc sản xuất.

### Phân tích hiệu quả và học — nhóm S

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `S1` | `analytics.read` | Xem số liệu hiệu quả nội dung, sản phẩm, chiến dịch | Điều hành · Điều phối | — |
| `S2` | `analytics.export` | Xuất số liệu ra tệp | Điều hành | — |
| `S3` | `learning.profile.read` | Xem hồ sơ phong cách của tổ chức và căn cứ của nó | Điều hành · Điều phối | — |
| `S4` | `learning.profile.manage` | Đặt lại hoặc đè tham số của hồ sơ phong cách | Điều hành | Điều hành |

`S4` có trần cứng vì hồ sơ phong cách đổi đầu vào của mọi lượt sinh nội dung về sau của cả tổ chức — cùng loại hệ quả với `H4`, và cũng chỉ lộ ra sau hàng chục bản ghi.

### Trợ lý hội thoại — nhóm T

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `T1` | `conversation.read` | Xem hội thoại khách hàng | Điều hành · Điều phối · Sale | — |
| `T2` | `conversation.reply` | Trả lời khách trong một hội thoại | Điều hành · Điều phối · Sale | — |
| `T3` | `conversation.ai.manage` | Bật tắt trả lời tự động và đặt giới hạn của nó | Điều hành | Điều hành |
| `T4` | `conversation.handoff` | Nhận hoặc chuyển một hội thoại cho người khác | Điều hành · Điều phối · Sale | — |

### Chính sách AI của tổ chức — nhóm U

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `U1` | `ai.policy.read` | Xem chính sách AI của tổ chức: năng lực đang bật, mô hình đang dùng, mức quyền riêng tư, ngưỡng | Điều hành · Điều phối | — |
| `U2` | `ai.policy.manage` | Đặt chính sách AI của tổ chức — trần mà bộ định tuyến được chọn trong đó | Điều hành | Điều hành |
| `U3` | `ai.request.read` | Đọc sổ chi phí và chất lượng từng lời gọi mô hình | Điều hành | Điều hành |
| `U4` | `ai.eval.read` | Xem điểm chấm của một đầu ra AI và lý do nó bị đưa vào hàng chờ soát | Điều hành · Điều phối | — |

`H4` là trường hợp riêng của `U2` cho đúng năng lực phân tích ảnh, và nó giữ nguyên — nó đã có trong mã, đã có màn hình, và đã có luật riêng về việc bày ba bộ máy kèm trạng thái đo lường. `U2` là cùng loại quyết định cho các năng lực còn lại: đổi mô hình của một năng lực đổi chất lượng mọi lượt chạy về sau của cả tổ chức, nên nó có trần cứng Điều hành và mỗi lần đổi ghi `audit_logs`.

Sổ đăng ký mô hình và sổ đăng ký giấy phép **không** thuộc dải này. Chúng là dữ liệu cấp nền tảng, gác bằng dải `N` — một tổ chức không tự thêm mô hình vào hệ thống, vì ô giấy phép và ô lãnh thổ của một mô hình không phải quyết định của một cửa hàng hoa. Ba mã `N9`–`N11` (sổ mô hình, sổ ngưỡng, chi phí theo mô hình) chưa xây — thuộc tuyến AI-1, xem mục dưới.

### Nghiên cứu thị trường & Xu hướng — nhóm V (Market Intelligence Engine, Đợt A)

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `V1` | `market_intel.research.run` | Kích hoạt lượt nghiên cứu thị trường thủ công | Điều hành · Điều phối | — |
| `V2` | `market_intel.opportunity.read` | Xem gợi ý cơ hội nội dung theo xu hướng | Điều hành · Điều phối · Sale | — |
| `V3` | `market_intel.config.manage` | Quản lý cấu hình nguồn và trọng số xu hướng | Điều hành | Điều hành |

`V3` có trần cứng Điều hành: việc thay đổi cấu hình nguồn dữ liệu hoặc trọng số chấm điểm xu hướng sẽ ảnh hưởng đến chất lượng phân tích của toàn bộ tổ chức về sau.

### Trung tâm Tích hợp — nhóm W (Integration Hub, 30/10/2026)

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `W1` | `integration.view` | Xem danh mục tích hợp và trạng thái kết nối | Điều hành · Điều phối | — |
| `W2` | `integration.connect` | Kết nối hoặc ngắt kết nối dịch vụ bên ngoài | Điều hành | Điều hành |
| `W3` | `integration.configure` | Sửa cấu hình và xoay khoá của kết nối | Điều hành | Điều hành |
| `W4` | `integration.govern` | Khoá hoặc cấp sẵn tích hợp cho tầng dưới | Điều hành | Điều hành |
| `W5` | `integration.events.replay` | Xử lý lại sự kiện tích hợp bị lỗi | Điều hành · Điều phối | — |

`W2`–`W4` có trần cứng Điều hành: kết nối cấp cho bên ngoài quyền thay mặt tổ chức (nhắn khách, nhận tiền, đăng sản phẩm). Kế hoạch: `docs/kien-truc/KE_HOACH_TRUNG_TAM_TICH_HOP.md`.

### Trao đổi nội bộ — nhóm S (PO duyệt D2, 09/11/2026)

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `S1` | `internal_chat.use` | Dùng trao đổi nội bộ với chuỗi, chi nhánh và cửa hàng đối tác | Mọi vai nhân sự | — |
| `S2` | `internal_chat.order.fulfil` | Nhận và cập nhật đơn gia công được giao trong trao đổi nội bộ | Điều hành · Điều phối · Cửa hàng · Thợ cắm | — |

Phạm vi phòng do tổ chức (và chi nhánh) của người dùng quyết, không do danh sách mời: người của chuỗi thấy mọi phòng của chuỗi (nhân viên gắn chi nhánh chỉ thấy phòng chi nhánh mình), người của cửa hàng đối tác thấy phòng chung với chuỗi khi liên kết còn ACTIVE (tạm dừng: chỉ đọc). Kế hoạch: `docs/plan/hoan-thien-chat-noi-bo.md`.

### Vận hành nền tảng — dải N (P25)

Từ vựng này **TÁCH HẲN** khỏi bảng ở mục 4 (D-N6, chốt 19/09): không nằm
trong `capability-catalog.ts`, không dùng `capability_scope`, không có
"trần cứng" theo `SystemRoleKey` — người vận hành nền tảng không phải một
vai của tenant. Nguồn: `src/core/platform/platform-capability-catalog.ts`.
Gán thẳng từng mã cho một người vận hành qua `platform_role_capabilities`,
không qua vai. Cấp lần đầu bằng script chạy tay
`scripts/gan-van-hanh-nen-tang.ts` (D-N2) — không có UI tự gán.

| Mã | Tên đọc được | Năng lực | Mặc định | Trần cứng |
|---|---|---|---|---|
| `N1` | `platform.organizations.read` | Danh sách và chi tiết mọi tổ chức, xuyên tenant | — (gán thẳng) | — |
| `N2` | `platform.upgrade_requests.manage` | Duyệt/từ chối hàng đợi `organization.upgrade_requested` | — (gán thẳng) | — |
| `N3` | `platform.credit.manage` | Nạp/hoàn credit cho một tổ chức | — (gán thẳng) | — |
| `N4` | `platform.usage.read` | Usage và chi phí tổng hợp toàn hệ thống | — (gán thẳng) | — |
| `N5` | `platform.health.read` | Sức khoẻ hệ thống — đếm job theo trạng thái, job treo, kho tệp. CHỈ ĐỌC (D-N5, không có hành động khởi động lại) | — (gán thẳng) | — |
| `N6` | `platform.audit.read` | Nhật ký xuyên tổ chức — hợp `audit_logs` và `platform_audit_logs` | — (gán thẳng) | — |
| `N7` | `platform.organizations.create` | Tạo tổ chức mới — gói `organizations` + `workspaces` + thành viên điều hành đầu tiên | — (gán thẳng) | — |
| `N8` | `platform.integration_tokens.manage` | Token tích hợp theo tổ chức, bọc use-case `integration/` đã có (`F9`) | — (gán thẳng) | — |
| `N15` | `platform.jobs.manage` | Hàng đợi lỗi (ROADMAP E5.2, 30/10/2026): chạy lại hoặc gác lại job `FAILED`, ghi nhật ký nền tảng. Tách khỏi `N5` để `N5` vẫn chỉ đọc (D-N5) | — (gán thẳng) | — |
| `N16` | `platform.integrations.govern` | Trung tâm Tích hợp GĐ3 (31/10/2026): khoá/cấp sẵn tích hợp cho toàn nền tảng (`GLOBAL`) hoặc một ngành (`industry:<key>`), ghi nhật ký nền tảng | — (gán thẳng) | — |
| `N17` | `platform.marketplace.manage` | Chợ đối tác (PO 31/10/2026): đồng bộ Google Sheet khảo sát, nhập Excel, tải ảnh khảo sát từ Drive vào kho; tạo/huỷ link chia sẻ xem không cần đăng nhập (PO 01/11/2026); ghi nhật ký nền tảng. Xem danh sách dùng `N1` | — (gán thẳng) | — |
| `N18` | `platform.marketplace.delete` | Xoá hồ sơ cửa hàng khỏi chợ đối tác — từng hồ sơ, theo lựa chọn hoặc toàn bộ (PO 03/11/2026) — **chỉ superadmin nền tảng**, tách khỏi `N17` để người đồng bộ/nhập dữ liệu không xoá được. Ghi nhật ký nền tảng. Migration `20261103090000_grant_marketplace_delete_to_superadmin` cấp cho người vận hành đang giữ đủ 14 mã trước đó; superadmin mới nhận qua `gan-van-hanh-nen-tang` (mặc định gán đủ mã) | — (gán thẳng) | — |
| `N20` | `platform.custom_domains.manage` | Tên miền riêng (checklist ALG 10.8, PO 06/11/2026): khoá tên miền của một tổ chức kèm lý do (ngừng phục vụ ngay, cửa hàng không tự gỡ) hoặc mở lại về chờ xác minh; ghi nhật ký nền tảng. Xem danh sách dùng `N1`. Migration `20261106040100_grant_custom_domains_to_superadmin` cấp cho người vận hành đang giữ đủ 16 mã trước đó | — (gán thẳng) | — |

Cột "Mặc định"/"Trần cứng" ghi "— (gán thẳng)" vì không có khái niệm vai ở
đây: `platform_operators` + `platform_role_capabilities` không đi qua
`role_capabilities`/`capability_overrides`/`permission-resolver.ts` của
tenant — ba lớp đó không áp dụng cho dải N. Kiểm quyền qua
`requirePlatformCapability(pctx, code)`, đối xứng với
`requireCapability(ctx, code)` của tenant nhưng nhận `PlatformContext`
(kiểu khác `TenantContext`, không có `organizationId`) — hai hàm không thể
gọi nhầm nhau, `tsc` chặn ở biên dịch.

## 5. Cặp năng lực tách rời — không bao giờ gói chung

| Chạy | Duyệt | Vì sao tách |
|---|---|---|
| `H1` `vision.analyze` | `H3` `product.approve` | Trong mô hình Chuỗi, Sale chạy phân tích nhưng Điều hành quyết dữ liệu nào vào Product Master |
| `H1` `vision.analyze` | `H4` `vision.engine.manage` | Chạy một lượt phân tích khác hẳn việc đổi bộ máy cho mọi lượt của cả tổ chức |
| `I1` `media.optimize` | `I2` `media.approve` | Tải ảnh về không phải là phê duyệt. Chỉ ảnh đã duyệt mới thành asset chính thức của sản phẩm |
| `J1` `catalog.create` | `J2` `catalog.publish` | Soạn và phát hành ra ngoài là hai mức trách nhiệm |
| `J3` `landing.create` | `J4` `landing.publish` | Như trên |
| `H5` `product.copy.generate` | `H6` `product.copy.approve` | Câu chữ bán hàng là đầu ra AI, và nó ghi vào Product Master — cùng mức trách nhiệm với số lượng và thành phần |
| `P1` `creative.compose` | `P2` `creative.approve` | Biến thể ra kênh công khai; soạn và phát hành là hai mức trách nhiệm |
| `P3` `video.generate` | `P4` `video.approve` | Như trên, cộng thêm chi phí mỗi lượt cao hơn một bậc |
| `O1` `content.generate` | `O3` `content.approve` | Câu chữ đăng dưới tên thương hiệu; người sinh không phải người chịu trách nhiệm phát hành |

Gói chung bất kỳ cặp nào ở trên là lỗi chặn ở review. **Một loại đầu ra AI mới luôn mang theo đúng một cặp của nó** — thêm engine sinh nội dung mà không thêm cặp là cách nhanh nhất để Luật 3 mất hiệu lực trên đúng phần dữ liệu đi ra ngoài công khai.

## 6. Cách kiểm quyền

Kiểm ở **tầng repository**, không ở route. Route quên kiểm là chuyện thường gặp; repository quên kiểm là lỗ hổng.

Endpoint không bao giờ hỏi "người này có phải Điều hành không". Nó hỏi "người này có `I2` không". Hard-code theo vai giao diện là lỗi chặn ở review.

## 7. Nguồn của bảng

Bảng ở mục 3 sinh từ `FloraOS/floraos-web/src/lib/maChucNang.ts`. Ba con số đã đối chiếu với mã nguồn và xác nhận ngày 09/09: **76 mã**, **18 mã có trần cứng**, dải nhóm E là **E1–E8**.

Bảng ở mục 4 đối chiếu với `floraos-core/src/core/rbac/capability-catalog.ts` và `capability-catalog.test.ts`. Tổng số mã và tổng số mã có trần cứng **chỉ đọc từ hai tệp đó**; không tài liệu nào trong bộ này giữ hai con số ấy dưới dạng hằng số, vì mỗi lần thêm một mã là một lần hai con số trong tài liệu lệch khỏi mã.

Giá trị tại 09/12: **119 mã, 34 mã có trần cứng** — sau khi `U1`–`U4` vào ở đợt AI-1. Các mốc trước: 113 ngay sau P2, 114 / 31 sau `F9` ở P7, 115 / 32 sau `H4` theo D5-d. Con số nào cũng đúng tại mốc của nó; `capability-catalog.test.ts` là chỗ duy nhất khẳng định con số hiện hành.

Bốn mươi ba mã của `H5`, `H6`, `J7`, các dải `O`, `P`, `Q`, `R`, `S`, `T` và dải `U` vào danh mục theo đúng pha của module chúng gác, không vào trước. (`I4`/`I5` đã vào ở P16/P24 cùng M04b, không còn trong danh sách chờ này.) Danh mục đích khi cả Tuyến B và Tuyến C xong: **159 mã, 48 trần cứng**. Mỗi lần thêm, đối chiếu lại bằng `capability-catalog.test.ts` chứ không cộng tay.

Khi bảng năng lực trong mã đổi, sinh lại bảng này chứ không sửa tay.
