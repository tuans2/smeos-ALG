# HỆ THỐNG NỘI DUNG GIAO DIỆN (UI COPY DECK) — ALG PRODUCTION

> **Ngày khởi tạo**: 10/10/2026  
> **Cập nhật gần nhất**: 10/10/2026 (Phê duyệt bởi PO / Merchant Admin)  
> **Mục đích**: Bảng đối chiếu và chuẩn hóa 100% câu chữ hiển thị trên giao diện của các chức năng đang hoạt động (active) trên môi trường Production của ALG.  
> **Trạng thái**: Đã chuẩn hóa toàn diện & Khóa từ điển SSOT.

---

## 1. Danh sách các phân hệ Production được bóc tách nội dung

| # | Mã phân hệ | Tên màn hình / Mục sidebar | Tuyến đường (Route) | File tài liệu chi tiết |
|---|---|---|---|---|
| 1 | `HOME` | **Trang chủ** (Hành trình tác vụ) | `/` | [01-trang-chu.md](./01-trang-chu.md) |
| 2 | `ORDER` | **Đơn hàng & Kênh chào bán** | `/don-hang` | [02-don-hang.md](./02-don-hang.md) |
| 3 | `CARD` | **Thẻ chào mẫu hoa** | `/the-chao` | [03-the-chao.md](./03-the-chao.md) |
| 4 | `PRODUCT` | **Sản phẩm & Giá** | `/san-pham` | [04-san-pham-va-gia.md](./04-san-pham-va-gia.md) |
| 5 | `CREATE` | **Tạo mẫu hoa mới** | `/san-pham/tao-moi` | [05-tao-mau-hoa-moi.md](./05-tao-mau-hoa-moi.md) |
| 6 | `IMPORT` | **Nhập từ Excel & Ảnh** | `/san-pham/nhap-hang-loat` | [06-nhap-tu-excel.md](./06-nhap-tu-excel.md) |
| 7 | `SCAN` | **Quét ảnh hoa** | `/tai-anh` | [07-quet-anh-hoa.md](./07-quet-anh-hoa.md) |
| 8 | `MEDIA` | **Kho ảnh & nội dung** | `/kho-du-lieu` | [08-kho-du-lieu.md](./08-kho-du-lieu.md) |
| 9 | `PROFILE` | **Hồ sơ cửa hàng** | `/ho-so` | [09-ho-so-cua-hang.md](./09-ho-so-cua-hang.md) |
| 10 | `SETTING` | **Cài đặt & Thành viên** | `/cai-dat` | [10-cai-dat.md](./10-cai-dat.md) |
| 11 | `COMMON` | **Thông báo & Trạng thái** | Toàn hệ thống | [11-thong-bao-va-trang-thai.md](./11-thong-bao-va-trang-thai.md) |

---

## 2. Từ điển Thuật ngữ Chuẩn hóa (SSOT Terminology)

Bảng từ điển này là **Nguồn sự thật tối cao (Single Source of Truth)** được Chủ sản phẩm (PO) phê duyệt chính thức ngày 10/10/2026. Mọi câu chữ trên UI và tài liệu bắt buộc phải tuân thủ nghiêm ngặt:

| Khái niệm | Đang dùng rải rác | Thuật ngữ CHUẨN HÓA | Ghi chú quy chuẩn |
| :--- | :--- | :--- | :--- |
| **Phân hệ Lưu trữ** | Kho dữ liệu · Trung tâm lưu trữ | **Kho ảnh & nội dung** | Tên menu `/kho-du-lieu` và H1 |
| **Tab Thẻ chào** | Duyệt TT · Điều hành & Điều phối | **Điều hành**, **Điều phối** | Giữ theo chuẩn phân quyền RBAC & Role UX |
| **Đơn vị kinh doanh** | tiệm · shop · tiệm hoa | **cửa hàng** | "tiệm" chỉ dùng trong lời chào kịch bản gửi khách |
| **Dịp tặng hoa** | 4 dịp đơn lẻ | **Khai trương · Sinh nhật · Tình yêu · Chia buồn · 8/3 & 20/10 · 20/11 · Tốt nghiệp** | Đầy đủ 7 dịp cao điểm tại Việt Nam |
| **Đối tượng hoa** | Sản phẩm · Master Index · BOM | **Mẫu hoa** (đối tượng) · **Kho mẫu hoa** (tập hợp) | Bỏ hoàn toàn Master Index, BOM khỏi UI |
| **Thành phần cắm** | BOM · Công thức BOM · Cành hoa | **Thành phần hoa** | Gồm hoa chính, hoa phụ, lá đệm, phụ kiện |
| **Phiếu cho thợ** | Florist Ticket · Phiếu thợ | **Phiếu cắm hoa** | In cho thợ cắm hoa theo dõi |
| **Kịch bản bán lẻ** | Sale Pitch · Kịch bản Zalo | **Kịch bản tư vấn** | Soạn sẵn cho nhân viên bán hàng |
| **Thao tác tải lại** | Làm mới dữ liệu · Tải lại danh sách | **Làm mới** | 1 từ ngắn gọn, kèm icon |
| **Trạng thái đơn** | Mobile vs Kanban lệch nhau | **Mới tiếp nhận → Đang cắm hoa → Đang giao → Hoàn tất** | Thống nhất 100% giữa mobile và desktop |
| **Tiền tệ** | đ · VNĐ | **₫** (vd: `650.000 ₫`; nhãn: `(₫)`) | Chuẩn tiền tệ quốc gia |
| **Hành động xóa** | Đưa vào thùng rác · Xóa | **Chuyển vào thùng rác** (xóa tạm 30 ngày) · **Xóa vĩnh viễn** | Nêu rõ hệ quả và cách hoàn tác |

---

## 3. Quy ước Mã định danh phần tử (Copy ID)

Cấu trúc mã chuẩn hóa:
```text
[MÃ PHÂN HỆ]-[LOẠI THÀNH PHẦN]-[SỐ THỨ TỰ]
```

### Bảng ký hiệu loại thành phần:
* `HDR`: Tiêu đề chính, tiêu đề phụ, breadcrumb (`Header / Title / Subtitle`)
* `TAB`: Tên tab chức năng, nhãn phân luồng (`Tabs`)
* `BTN`: Nút bấm, liên kết tác vụ, hành động (`Button / Action / CTA`)
* `LBL`: Nhãn trường nhập liệu, tiêu đề nhóm (`Field Label / Section Label`)
* `PH`: Văn bản gợi ý mờ trong ô nhập (`Input Placeholder`)
* `HLP`: Chú thích hướng dẫn phụ dưới ô nhập liệu (`Helper Text`)
* `TH`: Tiêu đề cột trong bảng (`Table Header`)
* `BDG`: Huy hiệu, nhãn trạng thái (`Badge / Status Tag`)
* `GDC`: Khối hướng dẫn thao tác chuẩn (`Feature Guidance Card`)
* `EMP`: Trạng thái khi chưa có dữ liệu hoặc không có kết quả (`Empty State`)
* `MOD`: Tiêu đề, nội dung cảnh báo trong hộp thoại (`Modal / Dialog`)
* `MSG`: Thông báo nổi góc màn hình (`Toast / Success / Error Message`)
* `ERR`: Thông báo lỗi tại ô nhập liệu (`Field Validation Error`)
* `CFM`: Hộp thoại xác nhận hành động nguy hiểm (`Confirmation Modal`)

---

## 4. Quy chuẩn Văn phong, Định dạng & Microcopy

1. **Sentence case toàn diện**: 
   - Viết hoa chữ cái đầu câu: *Tạo đơn hàng mới*, *Quét ảnh hoa*, *Thành phần hoa*.
   - Tuyệt đối tránh Title Case lạm dụng (*Tạo Đơn Hàng Hoa Mới*) hoặc ALL CAPS (*HÀNH TRÌNH TÁC VỤ*).
2. **Ký tự bắt buộc và số thứ tự**:
   - Dấu bắt buộc `*` do Component tự render kèm `aria-required="true"`, không chèn `*` thô vào chuỗi.
   - Số thứ tự `1.`, `2.` do Component danh sách / step indicator tự sinh, không gõ cứng vào nhãn.
3. **Emoji & Icons**:
   - Chuyển toàn bộ emoji text (`📸`, `💡`, `✨`, `✂️`, `🛵`) sang thư viện icon SVG chuẩn (**Lucide React Icons**) để tránh lỗi vỡ font trên Android/iOS.
4. **Công thức thông báo lỗi 3 vế**:
   - `[Chuyện gì đã xảy ra]. [Vì sao xảy ra]. [Bạn có thể làm gì tiếp theo].`
   - *Ví dụ:* "Chưa tạo được đơn hàng. Kết nối bị gián đoạn nên đơn chưa được lưu. Hãy kiểm tra kết nối mạng và thử lại sau ít phút."
5. **Bảo toàn biến số động `{{...}}`**:
   - Luôn giữ nguyên tên biến trong ngoặc nhọn: `{{count}}`, `{{shopName}}`, `{{name}}`, `{{created}}`, `{{updated}}`.
