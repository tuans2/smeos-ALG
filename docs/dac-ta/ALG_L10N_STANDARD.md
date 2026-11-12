# ALG — L10N (LOCALIZATION) STANDARD
> **Mã định danh:** `DOC-ARCH-L10N-001`  
> **Cấp thẩm quyền:** Level 2 — Architectural SSOT  
> **Áp dụng cho:** Tất cả các thị trường và ngôn ngữ được hỗ trợ trên ALG.

---

## 1. THỊ TRƯỜNG & LOCALE MỤC TIÊU

| Locale | Thị Trường | Ngôn Ngữ | Múi Giờ Mặc Định | Tiền Tệ | Ký Hiệu Tiền | Định Dạng Số | Định Dạng Ngày |
|---|---|---|---|---|---|---|---|
| `vi-VN` (`vi`) | Việt Nam (Chính) | Tiếng Việt | `Asia/Ho_Chi_Minh` (GMT+7) | `VND` | `đ` hoặc `₫` | `1.234.567,89` (Chấm phân cách ngàn, phẩy thập phân) | `DD/MM/YYYY` (ví dụ: `28/10/2026`) |
| `en-US` (`en`) | Quốc Tế (Mở rộng) | English | `UTC` hoặc `Asia/Ho_Chi_Minh` | `USD` / `VND` | `$` / `VND` | `1,234,567.89` (Phẩy phân cách ngàn, chấm thập phân) | `MM/DD/YYYY` hoặc `YYYY-MM-DD` |

---

## 2. NGUYÊN TẮC BẢN ĐỊA HÓA CỐT LÕI

1. **Bản địa hóa ≠ Dịch từng từ (Word-for-Word Translation)**:
   - Bản dịch phải tự nhiên, phản ánh đúng văn hóa kinh doanh và thói quen thao tác của người dùng SME.
   - Ví dụ: `Submit` dịch theo ngữ cảnh là `"Lưu thông tin"`, `"Gửi duyệt"`, hoặc `"Xác nhận đơn"`, thay vì dịch máy móc `"Nộp"`.
2. **Bảo toàn dữ liệu nghiệp vụ (Data Immutability)**:
   - Tuyệt đối không thay đổi giá trị số học, logic tính thuế VAT, chiết khấu, hoặc lưu vết kế toán trong database theo định dạng hiển thị của locale.
   - Tiền tệ trong database luôn là số nguyên (hoặc `Decimal` chính xác); ngày tháng luôn là ISO 8601 UTC string.
3. **Phân biệt Nội dung Cố định và Nội dung do Người dùng tạo (UGC)**:
   - Nội dung giao diện cố định (Fixed UI Chrome): 100% được bản địa hóa qua catalog.
   - Nội dung người dùng tạo (Tên sản phẩm, mô tả sản phẩm, ghi chú đơn hàng của khách): Giữ nguyên ngôn ngữ gốc do người dùng nhập, không tự ý dịch tự động gây sai lệch đơn hàng.

---

## 3. THIẾT KẾ CO GIÃN ĐỘ DÀI VĂN BẢN (TEXT EXPANSION & RESPONSIVE LAYOUT)

Độ dài văn bản giữa Tiếng Việt và Tiếng Anh thường có độ chênh lệch từ **20% đến 40%**:
- **Nút bấm & Nhãn ngắn**: Tiếng Anh thường ngắn hơn Tiếng Việt (Ví dụ: `Save` vs `Lưu thay đổi`, `Cancel` vs `Hủy bỏ`).
- **Mô tả & Hướng dẫn**: Tiếng Anh có thể dài hơn hoặc ngược lại tùy cấu trúc câu.
- **Quy tắc thiết kế giao diện**:
  1. Tránh đặt chiều rộng cố định (`fixed width`, ví dụ `w-[120px]`) cho các nút bấm chứa chữ; ưu tiên `w-auto px-4 min-w-[80px]`.
  2. Bắt buộc dùng `truncate`, `line-clamp-1`, `line-clamp-2` kèm `title` hoặc tooltip cho các tiêu đề bảng dữ liệu (Table headers) và thẻ danh mục.
  3. Đảm bảo giao diện mobile (375px - 414px) không bị vỡ dòng hoặc tràn màn hình (horizontal overflow) khi đổi qua lại giữa `vi` và `en`.

---

## 4. QUY TẮC HIỂN THỊ ĐỊA CHỈ & ĐƠN VỊ ĐO LƯỜNG

1. **Địa chỉ hành chính**:
   - Thị trường Việt Nam: Tuân thủ cấu trúc 3 cấp hành chính Việt Nam: `[Số nhà/Đường], [Phường/Xã], [Quận/Huyện], [Tỉnh/Thành phố]`.
   - Quốc tế: Hỗ trợ cấu trúc linh hoạt gồm `Street Address, City, State/Province, Postal Code, Country`.
2. **Đơn vị đo lường**:
   - Sử dụng Hệ mét chuẩn quốc tế (SI): `cm`, `m`, `g`, `kg`.
   - Ngành hoa & thủ công: Sử dụng các đơn vị chuyên ngành kế thừa từ Plugin Ngành (`bó`, `cành`, `giỏ`, `hộp`, `kệ`, `bình`).

