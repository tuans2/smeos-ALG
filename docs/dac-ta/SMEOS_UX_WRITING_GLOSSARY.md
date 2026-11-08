# SMEOS — UX WRITING STANDARD (giọng điệu & mẫu câu)
> **Mã định danh:** `DOC-ARCH-UX-WRITING-001`  
> **Cấp thẩm quyền:** Level 3 — SUPPORTING. **Thuật ngữ (từ dùng / từ cấm, động từ thao tác) không định nghĩa ở đây** — bảng duy nhất là [`ux-patterns/glossary.md`](ux-patterns/glossary.md), lint R16 thực thi.  
> **Áp dụng cho:** Tất cả các màn hình, thông báo, dialog và tương tác người dùng trên toàn hệ sinh thái SMEOS.

---

## 1. TIÊU CHUẨN GIỌNG ĐIỆU (VOICE & TONE)

| Tiêu chí | Nguyên tắc | Diễn giải |
|---|---|---|
| **Chính xác (Accurate)** | Trực diện, đúng bản chất nghiệp vụ | Gọi đúng tên đối tượng và hành động, không dùng từ ngữ trừu tượng. |
| **Súc tích (Concise)** | Ngắn gọn nhưng trọn nghĩa | Loại bỏ từ nối rườm rà. Tập trung vào lợi ích hoặc kết quả của thao tác. |
| **Đồng cảm & Hỗ trợ (Supportive)** | Tận tình, luôn có lối thoát khi gặp sự cố | Không đổ lỗi cho người dùng; luôn chỉ dẫn bước tiếp theo rõ ràng. |
| **Không Jargon Kỹ thuật (Zero Tech Jargon)** | Thuần túy ngôn ngữ kinh doanh | Tuyệt đối không để lộ các thuật ngữ lập trình vào mắt người dùng cuối. |

---

## 2–3. THUẬT NGỮ (đã gộp)

Bảng khử từ lóng kỹ thuật và Master Glossary trước đây ở mục này đã gộp vào [`ux-patterns/glossary.md`](ux-patterns/glossary.md) ngày 07/11/2026. Chỗ mâu thuẫn được xử lý theo mã: `Job` → **tác vụ** (không dùng "Tiến trình xử lý"). Nhãn trạng thái đơn hàng lấy từ `src/lib/i18n/locales/vi/*.ts`.

---

## 4. QUY TẮC SOẠN THẢO THÔNG BÁO & TRẠNG THÁI (MESSAGING BLUEPRINTS)

### 4.1. Thông báo Thành công (Success Messages)
- **Cấu trúc**: `Đã {hành động} {đối tượng} thành công.`
- *Nên*: "Đã tạo đơn hàng thành công."
- *Không nên*: "Thực thể đơn hàng đã được khởi tạo thành công." hoặc "Thành công!"

### 4.2. Thông báo Lỗi & Khắc phục (Error Messages)
- **Cấu trúc 3 thành phần**:
  1. Điều gì vừa xảy ra (Nguyên nhân trực tiếp nếu biết).
  2. Lý do ngắn gọn (nếu có).
  3. Hành động khắc phục ngay lập tức.
- *Nên*: "Không thể lưu đơn hàng do mất kết nối mạng. Vui lòng kiểm tra lại đường truyền và thử lại."
- *Không nên*: "Lỗi xử lý yêu cầu (Error 500)." hoặc "Đã có lỗi xảy ra."

### 4.3. Trạng thái Trống (Empty States)
- **Cấu trúc 3 thành phần**:
  1. Tiêu đề: `Chưa có {đối tượng} nào`
  2. Mô tả: Giải thích ngắn gọn cách tạo ra đối tượng đó.
  3. Nút hành động kêu gọi (CTA): `Tạo {đối tượng} đầu tiên`
- *Nên*: 
  - Tiêu đề: "Chưa có đơn hàng nào"
  - Mô tả: "Các đơn hàng từ khách hoặc mạng lưới sẽ xuất hiện tại đây khi phát sinh giao dịch."
  - CTA: "Tạo đơn hàng mới"
- *Không nên*: "Không có dữ liệu." hoặc "Danh sách trống."

### 4.4. Hộp thoại Xác nhận Nguy hiểm (Confirmation Dialogs)
- **Tiêu đề**: Nêu rõ hành động nguy hiểm: `Xóa sản phẩm này?`
- **Nội dung**: Nêu rõ hậu quả không thể phục hồi: `Hành động này không thể hoàn tác. Sản phẩm sẽ bị gỡ khỏi toàn bộ danh mục bán.`
- **Nhãn nút**:
  - Hủy: `Giữ lại` hoặc `Hủy bỏ`
  - Chấp nhận: `Xóa vĩnh viễn` (nút màu đỏ `danger`)

