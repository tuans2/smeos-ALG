# ALG — Đặc tả UI/UX 10 chức năng lõi

**Tài liệu để phê duyệt.** Phạm vi: thiết kế màn hình và luồng người dùng cho 10 chức năng của bộ tính năng hoàn chỉnh. Không mô tả lại kiến trúc dữ liệu, mã năng lực hay lộ trình — các tài liệu đó đã chốt ở `PRD-floraos-core.md`, `target-architecture-v2.md` và `ai-orchestration.md`; tài liệu này chỉ trả lời một câu hỏi: **người dùng nhìn thấy gì, bấm gì, theo thứ tự nào.**

Mỗi chức năng là một trang riêng trong shell hợp nhất. Bấm vào một thẻ chức năng ở Trang chủ mở đúng trang đó; rời trang đó luôn quay về Trang chủ.

---

## 0. Nguyên tắc thiết kế dùng chung

Mười trang khác nhau về nội dung nhưng dùng chung một khung luồng và một khung thành phần. Khung này lặp lại để người dùng học một lần, dùng được cho cả mười chức năng.

### 0.1 Khung luồng chuẩn — 6 bước

```
① Nhập liệu  →  ② Kích hoạt AI  →  ③ Đang xử lý  →  ④ Thẻ kết quả (sửa được)  →  ⑤ Duyệt  →  ⑥ Lưu vào Kho + Quay về / Gợi ý bước kế
```

- **① Nhập liệu** — màn hình trắng, tối giản, chỉ hỏi đúng phần dữ liệu động (ảnh, lựa chọn sản phẩm, kênh, khoảng thời gian…). Không bắt khai báo lại thông tin đã có trong Hồ sơ thương hiệu/Product Master.
- **② Kích hoạt AI** — một nút hành động duy nhất, rõ ràng ("Phân tích", "Tạo biến thể", "Sinh nội dung"…). Không có nút phụ gây phân tán ở bước này.
- **③ Đang xử lý** — thanh tiến trình theo `stage` thật của job (không phải progress bar giả lập), có nút **Huỷ** khi job còn `PENDING`. Người dùng không bị khoá màn hình — có thể rời trang, hệ thống báo khi xong.
- **④ Thẻ kết quả** — đơn vị hiển thị trung tâm của toàn bộ hệ thống (chi tiết ở 0.2). Luôn sửa được, thêm được, bớt được trước khi duyệt.
- **⑤ Duyệt** — hành động tách biệt khỏi hành động sinh kết quả (đúng luật *Review → Approve*). Ai xem được thẻ không chắc đã duyệt được thẻ.
- **⑥ Lưu vào Kho** — ghi vào đúng bảng chính thức (Product Master, Thư viện tài sản, Thư viện nội dung…), sau đó quay về Trang chủ **hoặc** hệ thống gợi ý chức năng kế tiếp hợp lý (theo chuỗi sự kiện đã chốt: `product.analyzed` → gợi ý sinh dữ liệu bán hàng, tối ưu ảnh…), người dùng luôn là người bấm để đi tiếp — không có bước nào tự chạy hộ.

### 0.2 Khung Thẻ kết quả

Mọi thẻ kết quả trong cả 10 trang có cùng bốn vùng:

| Vùng | Nội dung |
|---|---|
| **Vùng minh hoạ** | Ảnh/video gốc và ảnh/video liên quan, xem cạnh nhau khi có bản trước/sau |
| **Vùng trường dữ liệu** | Toàn bộ trường AI đã phân tích/sinh ra, mỗi trường sửa trực tiếp tại chỗ (inline edit); trường dạng danh sách (thành phần, thẻ, hashtag…) có nút **+ Thêm dòng** và **✕ Bỏ dòng** trên từng phần tử |
| **Vùng chỉ báo chất lượng** | Điểm/độ tin cậy do máy chấm (không phải phán quyết cuối) — hiển thị dạng nhãn màu, không chặn thao tác, chỉ cảnh báo |
| **Vùng hành động** | **Lưu nháp** · **Từ chối** · **Duyệt** — ba nút cố định vị trí ở mọi thẻ kết quả trong toàn hệ thống |

Khi một lượt xử lý sinh nhiều thẻ (nhiều ảnh, nhiều biến thể, nhiều bài theo kênh), thẻ hiển thị dạng lưới; có nút **Duyệt tất cả** ở đầu danh sách nhưng vẫn duyệt/sửa/từ chối được từng thẻ riêng.

### 0.3 Ba trạng thái phán quyết trên một thẻ

| Trạng thái | Xuất hiện khi | Cho phép duyệt? |
|---|---|---|
| An toàn | Điểm chất lượng đạt ngưỡng | Có, không cảnh báo |
| Cảnh báo | Điểm dưới ngưỡng nhưng chưa bị chặn cứng | Có, kèm hộp xác nhận "Vẫn duyệt dù có cảnh báo" |
| Bị chặn | Cổng cứng từ chối (vd. Identity Guard `REJECTED`) | Không — thẻ ẩn nút Duyệt, chỉ còn **Chạy lại** hoặc **Bỏ qua** |

### 0.4 Nguyên tắc tách biệt trường dữ liệu nguyên tử (Atomic Disaggregated Fields)

Để tối ưu hóa trải nghiệm chỉnh sửa nhanh (inline editable) cho người dùng vận hành và nhân viên tư vấn bán hàng:
- **Tuyệt đối không gộp chung văn bản và số lượng/đơn vị vào cùng một chuỗi tự do**:
  - *Ví dụ sai:* Một ô text duy nhất chứa `"Hoa hồng Ohara đỏ (10 cành)"`.
  - *Chuẩn bắt buộc:* Tách thành các trường nguyên tử độc lập: Tên hoa (text), Số lượng (number input), Đơn vị tính (text), Màu sắc (text), Vai trò (dropdown hoa chính/hoa phụ/lá đệm).
- **Phân tách tương tự trên mọi khối dữ liệu**:
  - *Kích thước & Quy cách:* Chiều cao (number), Chiều rộng (number), Đơn vị tính (`cm`), Vật chứa (dropdown Giỏ/Bó/Bình/Hộp).
  - *Báo giá & Khuyến mãi:* Giá chào ưu đãi (number), Giá niêm yết cũ (number), Đơn vị (`VND`).
  - *Quà tặng & Cam kết:* Mảng danh sách các dòng độc lập, mỗi dòng có nút **✕ Xóa dòng** và nút **+ Thêm quà tặng / cam kết**.
- **Lợi ích UX:** Người dùng chỉ cần nhấp chuột vào đúng trường số hoặc chữ muốn sửa mà không làm hỏng cấu trúc câu; hệ thống trích xuất dữ liệu sạch cho các module tính giá vốn M02 và in ấn A6.

### 0.5 Tiêu chuẩn hóa thanh tác vụ của các Tab (Standardized Top-Right Action Header)

Để người dùng không bị mất phương hướng (confused) khi chuyển đổi giữa các tab, vị trí của các tính năng chung (Copy, Lưu nháp, Chốt duyệt, Chỉnh sửa, Xuất file...) được tiêu chuẩn hóa cố định trên toàn hệ thống:
- **Vị trí cố định duy nhất:** Toàn bộ cụm tác vụ của mỗi tab **bắt buộc nằm ở góc trên cùng bên phải (Top-Right Action Header) của tab đó**.
- **Tại sao KHÔNG nên thiết kế dạng Hamburger Menu 3 gạch ngang ở góc tab?**
  - Trong chuẩn UI/UX quốc tế, biểu tượng Hamburger Menu (`☰`) chỉ dùng cho *Điều hướng toàn cục của ứng dụng* (Global Mobile Navigation Drawer).
  - Đặt Hamburger Menu cho các tác vụ của từng tab sẽ tạo "vết ma sát" (friction), bắt nhân viên bán hàng phải click 2 lần (Mở menu → Chọn tác vụ) cho những hành động cực kỳ thường xuyên như Copy kịch bản Zalo hay Lưu nháp.
- **Mô hình kết hợp chuẩn SaaS hiện đại:**
  1. **Nút tác vụ chính 1-chạm (Primary Visible Buttons):** Hiển thị trực tiếp các nút hành động cốt lõi, tần suất cao ở góc trên bên phải (vd: *"Chốt duyệt & Xuất bản Final"*, *"Copy nhanh Zalo"*, *"Lưu nháp"*).
  2. **Menu tác vụ mở rộng (Action Overflow Menu `...` More Actions):** Đặt ngay bên cạnh các nút chính ở góc trên bên phải. Nhấn vào nút ba chấm `...` sẽ mở dropdown chứa các hành động phụ hoặc công cụ xuất file (Tải PNG Retina, Tải JPEG, Xuất PDF A6, Mở khóa chỉnh sửa, Xóa thẻ).
- **Quy tắc bất biến:** Mọi tab (từ Tab 1-2-3 của M01c, tới Creative Studio, Catalog, Số liệu) đều tuân thủ đúng vị trí góc trên bên phải này.

### 0.6 Trang chủ

Lưới 10 thẻ chức năng, mỗi thẻ mang: tên, icon, một dòng mô tả, và một chỉ báo nhỏ nếu có việc đang chờ (job đang chạy, mục chờ duyệt). Bấm thẻ → vào đúng trang chức năng đó ở đúng bước ①. Không có luồng nào tự động nhảy giữa các trang — mọi điều hướng đều do người dùng bấm, kể cả khi trang trước gợi ý bước kế tiếp.

---

## 1. Phân tích sản phẩm bằng AI

**Module:** M01 (nhận diện) + M01b (sinh dữ liệu bán hàng) + M01c (thẻ chào sản phẩm & kịch bản bán hàng) · **Trạng thái nền tảng:** M01 và M01b đã hoàn thiện; M01c tổng hợp dữ liệu M01a + M01b tạo thẻ chào khách hàng và kịch bản Zalo cho Sales.

Đây là chức năng lõi vì mọi chức năng khác đều đọc Product Master mà trang này ghi ra, đồng thời cung cấp ngay công cụ bán hàng thực chiến cho nhân viên kinh doanh.

### Luồng người dùng

```
Tải ảnh (1 hoặc nhiều)
   → Nhấn "Phân tích"
   → [Đang phân tích — job M01]
   → THẺ KẾT QUẢ 1 (M01a): đặc điểm nhận diện
   → Sửa / Thêm / Bớt
   → Duyệt (ghi Product Master)
        │
        ▼ hệ thống hiện nút gợi ý "Sinh nội dung bán hàng" (không tự chạy)
   → Nhấn "Sinh nội dung bán hàng"
   → [Đang soạn — job M01b, đọc đúng bản ghi vừa duyệt]
   → THẺ KẾT QUẢ 2 (M01b): nội dung bán hàng
   → Sửa / Thêm / Bớt
   → Duyệt (ghi phần bán hàng vào Product Master)
        │
        ▼ hệ thống hiện nút "Tạo Thẻ Chào Khách (M01c) →"
   → THẺ CHÀO SẢN PHẨM (M01c): thẻ báo giá trực quan + kịch bản tư vấn
   → Nhân viên Sales tùy chỉnh giá, kích thước, quà tặng kèm
   → Nhấn "Copy kịch bản Zalo" gửi khách / In hoặc lưu ảnh thẻ chào
   → Lưu vào Kho sản phẩm → Quay về Trang chủ
```

Ba thẻ kết quả tách biệt tương ứng 3 capability M01a, M01b, M01c. Người dùng có thể duyệt từng bước độc lập hoặc chọn sản phẩm bất kỳ từ Kho đã duyệt để tạo Thẻ chào M01c bất cứ lúc nào.

### Thẻ kết quả 1 — Đặc điểm nhận diện (M01a)

| Trường | Sửa được | Thêm/bớt |
|---|---|---|
| Danh sách loại hoa + số lượng từng loại | Có | Có (thêm dòng loại hoa, đổi số lượng) |
| Lá, phụ kiện đi kèm | Có | Có |
| Giấy gói, nơ | Có | Có |
| Màu sắc chủ đạo (tối đa 3 tone) | Có | Có |
| Hình dáng / vật chứa | Có | — |
| Ba tổng đếm (tổng số cành, số nụ, số cành hỏng) | Chỉ xem — máy cộng tự động từ danh sách phía trên | — |
| Độ tin cậy tổng thể | Chỉ xem | — |

Nút hành động: **Lưu nháp · Từ chối (đóng bản ghi, không chạm Product Master) · Duyệt (ghi Product Master)**.

### Thẻ kết quả 2 — Nội dung bán hàng (M01b)

| Trường | Sửa được | Thêm/bớt |
|---|---|---|
| Tên sản phẩm | Có | — |
| Mô tả bó hoa | Có (khung văn bản) | — |
| Thẻ phân loại | Có | Có |
| Tone màu dạng nhãn bán hàng | Có | Có |
| Phong cách thiết kế | Có (chọn từ danh sách + tự nhập) | — |
| Dịp phù hợp | Có | Có |
| Phân khúc giá gợi ý | Chỉ xem — là nhãn tham khảo, không phải giá chào (giá chào vẫn đọc từ M02) | — |

### Thẻ kết quả 3 — Thẻ Chào Sản Phẩm & Kịch bản tư vấn (M01c)

Dành riêng cho nhân viên tư vấn bán hàng (Sales Rep) để phản hồi khách nhanh qua Zalo, Messenger, Hotline:

| Khối thông tin | Chi tiết trường dữ liệu | Khả năng tùy chỉnh của Sales (100% Có Thể Sửa Trước Khi Chốt) |
|---|---|---|
| **Định danh & Thương hiệu** | Tên thương mại cuốn hút (M01b), Mã SKU, Phong cách, Dịp sử dụng (tag pills), Tên shop & Hotline | Có (Sửa tên, SKU, phong cách, thêm/xóa tag dịp, hotline) |
| **Thông điệp & Cảm xúc** | Đoạn văn mô tả cảm xúc, ý nghĩa loài hoa, lời chào khách hàng | Có (Biên tập tự do khung văn bản) |
| **Thông số cấu phần (BOM)** | Danh sách hoa chính (tên hoa, số lượng, đơn vị tính, màu sắc, vai trò), lá đệm, phụ kiện trang trí | Có (Thêm/xóa cành hoa, sửa số lượng cành, thêm/xóa lá đệm & phụ kiện) |
| **Kích thước & Quy cách** | Chiều cao × Chiều rộng (cm), Vật chứa (Bình/Giỏ/Bó/Hộp), Giấy gói & nơ | Có (Sửa số đo thực tế, vật chứa, chất liệu bao bì) |
| **Báo giá & Khuyến mãi** | Mức giá chào ưu đãi (VND), Giá niêm yết cũ (nếu có giảm giá), Phân khúc giá | Có (Sale nhập mức giá báo khách, giá gốc hiển thị gạch ngang) |
| **Quà tặng đính kèm** | Miễn phí thiệp/banner thiết kế riêng, gói dưỡng hoa tươi lâu Chrysal, ruy băng lụa | Có (Thêm, sửa, xóa từng quà tặng theo chính sách từng đơn) |
| **Cam kết chất lượng** | Hoa tươi 100%, chụp ảnh trước khi giao, giao hỏa tốc 60-90p, bảo hành đổi mới | Có (Thêm, sửa, xóa từng cam kết) |
| **Ghi chú & Ưu đãi riêng** | Lời dặn riêng hoặc ưu đãi chốt đơn nhanh (áp dụng giảm thêm...) | Có (Nhập lời dặn xuất hiện ngay trong kịch bản Zalo) |
| **Hành động & Trạng thái** | Nút **Chốt duyệt & Xuất bản Final** (Badge `FINAL`), Nút **Copy kịch bản Zalo** 1-chạm | Chốt duyệt lưu vào Kho; cho phép mở khóa sửa lại nếu cần |
| **Xuất ảnh & File đa định dạng** | • **Copy ảnh vào Zalo / Clipboard** (dán trực tiếp bằng Ctrl+V / Cmd+V)<br>• **Tải PNG** (ảnh Retina 2x sắc nét)<br>• **Tải JPEG** (ảnh nén 95% nhẹ)<br>• **Xuất PDF A6** (khổ in ấn chuẩn 105×148mm) | Có sẵn trên thanh công cụ xem trước Thẻ Chào |

#### Kiến trúc 3 Tab hiển thị độc lập cách ly nội dung (Single Tab Isolation)
Để giao diện đơn giản, tập trung và không gây phân tâm (confused) cho nhân viên tư vấn, Thẻ Chào Khách M01c phân chia thành 3 tab điều hướng độc lập. Người dùng nhấn vào tab nào thì **chỉ hiển thị duy nhất nội dung của tab đó**, tuyệt đối không chia đôi màn hình hay nhồi nhét nhiều khối nội dung cùng lúc:

- 📝 **Tab 1: Chỉnh sửa toàn bộ thông tin**: Hiển thị form trực quan chỉnh sửa 8 khối trường dữ liệu (Tên, SKU, Hotline, Phong cách, Dịp, Cảm xúc, Hoa chính & Phụ kiện BOM, Kích thước & Vật chứa, Báo giá & Khuyến mãi, Quà tặng, Cam kết, Ghi chú). Nút *"Chốt duyệt & Xuất bản Final"* cho phép khóa dữ liệu thành thẻ bán hàng chính thức (Badge FINAL) và lưu vào Kho.
- 🎴 **Tab 2: Thẻ chào khách (A6 Card View)**: Hiển thị visual preview chuẩn tỷ lệ thiệp A6 (105 × 148mm) sang trọng với ảnh hoa Master, tên thương mại, badge giá ưu đãi, cấu phần hoa, quy cách, quà tặng và hotline shop. Kèm thanh công cụ xuất file: *Copy ảnh vào Zalo (Clipboard)*, *Tải PNG*, *Tải JPEG*, *Xuất PDF A6*.
- 💬 **Tab 3: Kịch bản Zalo**: Hiển thị toàn văn kịch bản tư vấn khách hàng được biên soạn hoàn chỉnh với biểu tượng emoji sinh động, đầy đủ cấu phần hoa, giá chào, quà tặng, cam kết và lời chào mời. Trang bị nút *1-chạm sao chép kịch bản vào clipboard*.

### Kho Dữ Liệu Sản Phẩm — Tab Sidebar Chính & Trang Chuyên Biệt (`/kho-du-lieu`)

Để tối ưu không gian hiển thị, thanh Sidebar chính của hệ thống trang bị mục **"Kho Dữ liệu"** dẫn tới trang `/kho-du-lieu` độc lập với 3 phân vùng quản lý:

1. 📁 **Phân vùng 1: Ảnh gốc (Raw Photos)**:
   - Lưu trữ toàn bộ ảnh sản phẩm tải lên từ thiết bị của phiên làm việc và ảnh trong kho máy chủ của tổ chức (`GET /api/v1/assets`).
   - Hiển thị dạng lưới thẻ ảnh, thumbnail sắc nét, dung lượng, ngày tải.
   - Nút hành động: *"Phân tích ảnh này"* → đưa ảnh trực tiếp vào luồng phân tích AI M01a.
2. ⚡ **Phân vùng 2: Ảnh đã duyệt chờ sinh dữ liệu (M01a Approved)**:
   - Danh sách các lượt phân tích cấu phần hoa đã được duyệt (`approval_state = APPROVED`).
   - Hiển thị ảnh sản phẩm, tổng số cành hoa, danh sách hoa chính, phong cách thiết kế, ngày duyệt.
   - 2 nút hành động nhanh:
     - *"1. Sinh Copy (M01b)"* → chuyển sang Tab M01b để AI sinh câu từ thương mại.
     - *"2. Tạo Thẻ Chào (M01c)"* → chuyển sang Tab M01c để dựng thẻ chào & báo giá.
3. 🏆 **Phân vùng 3: Sale Pitch đã hoàn thành (Finalized & Published Pitches)**:
   - Lưu trữ toàn bộ các Thẻ Chào Sản Phẩm đã được nhân viên hoàn thiện và bấm **"Chốt duyệt & Xuất bản Final"**.
   - Hiển thị ảnh Master, Tên thương mại chào khách, Badge giá ưu đãi (VND), Kích thước chuẩn, Dịp tặng, Ngày xuất bản.
   - Các nút tiện ích tác vụ:
     - *"Xem Thẻ Chào"*: nạp lại vào Tab M01c để xem toàn bộ thông số, kịch bản, và xuất ảnh/PDF.
     - *"Copy nhanh Zalo"*: 1 chạm copy ngay kịch bản Zalo định dạng emoji hoàn chỉnh mà không cần mở lại form.
     - *"Xóa Thẻ Chào"*: dọn dẹp các thẻ không còn sử dụng.

### Trạng thái đặc biệt
- Tải nhiều ảnh cùng lúc → hệ thống hỏi trước khi phân tích: *"Đây có phải cùng một sản phẩm?"* — chọn **Có** thì một job cho cả lô; chọn **Không** thì tách thành các job riêng, mỗi ảnh ra một Thẻ kết quả 1 độc lập.
- Độ tin cậy dưới ngưỡng ở bất kỳ trường nào → trường đó tự bôi vàng trên thẻ, không chặn duyệt, chỉ nhắc người soát nhìn kỹ.
- Bộ máy phân tích (Đầy đủ/Gọn/Cục bộ) là cấu hình cấp tổ chức, không xuất hiện trên trang này — người dùng vận hành không cần biết bộ nào đang chạy.

---

## 2. AI Creative Studio

**Module:** M04a (tối ưu ảnh gốc → Master Image, cổng cứng Identity Guard) + M04b (biến thể marketing trên Master Image đã duyệt) · **Trạng thái nền tảng:** Identity Guard đã có; tăng cường ảnh thật, Smart Reframe và toàn bộ M04b chưa xây.

Trang có hai khu vực nối tiếp nhau theo đúng ranh giới đã chốt: **không biến thể nào được tạo trước khi có Master Image đã duyệt.**

### Khu vực A — Tối ưu ảnh gốc (bắt buộc trước)

```
Chọn sản phẩm (đã qua bước 1) → chọn ảnh gốc
   → Nhấn "Tối ưu ảnh"
   → [Đang xử lý: phân tích chất lượng → tách sản phẩm → tăng cường → dựng bố cục]
   → [Cổng máy] Identity Guard chấm: AN TOÀN / TỐT / CẢNH BÁO / TỪ CHỐI
   → THẺ KẾT QUẢ: Before/After + 4 tỉ lệ (1:1, 4:5, 9:16, 16:9)
   → Sửa nhẹ (sáng/tương phản nếu cần) — không sửa được bố cục AI đã dựng
   → Duyệt (nâng thành Master Image chính thức)
   → Lưu vào Kho ảnh sản phẩm
```

**Nếu Identity Guard trả TỪ CHỐI:** thẻ không có nút Duyệt, chỉ có **Chạy lại với ảnh khác** hoặc **Giữ ảnh gốc, bỏ qua tối ưu**. Tải ảnh về không thay cho việc duyệt — nút Tải luôn tách biệt khỏi nút Duyệt.

**Nếu sản phẩm đã có Master Image đã duyệt:** khu vực A thu gọn thành một dòng trạng thái "Đã có ảnh chính thức" kèm nút **Tối ưu lại** (tạo một lượt M04a mới, không ghi đè bản cũ).

### Khu vực B — Biến thể marketing (chỉ mở khi có Master Image đã duyệt)

```
Chọn Master Image đã duyệt
   → Chọn tổ hợp: nền (studio/phòng khách/khách sạn/lễ cưới…) × bố cục × tỉ lệ × chiến dịch
   → Chọn thao tác: Xoá nền · Đổi nền · Mở rộng khung · Retouch · Watermark · Tạo biến thể hàng loạt
   → Nhấn "Tạo"
   → [Đang sinh — không chạy lại tăng cường, không qua Identity Guard lần nữa]
   → LƯỚI THẺ KẾT QUẢ: mỗi biến thể một thẻ (ảnh, nền đã dùng, tỉ lệ, cờ generative_fill nếu có)
   → Chọn thẻ muốn giữ, bỏ thẻ không dùng
   → Duyệt (từng thẻ hoặc "Duyệt tất cả đã chọn")
   → Lưu vào Kho ảnh marketing → Quay về Trang chủ
```

### Thẻ kết quả — Biến thể

| Trường | Sửa được | Ghi chú |
|---|---|---|
| Ảnh biến thể | — | Xem full-size khi bấm |
| Nền đã dùng | Có (đổi sang nền khác, sinh lại riêng thẻ này) | |
| Tỉ lệ khung | Có (đổi, sinh lại) | |
| Watermark logo | Bật/tắt | |
| Cờ "đã dùng generative fill" | Chỉ xem | Luôn hiển thị rõ, không ẩn |
| Điểm toàn vẹn sản phẩm | Chỉ xem | Cảnh báo nếu thấp — biến thể không được phép đổi chính bó hoa |

**Ranh giới cứng hiển thị rõ trên giao diện:** một dòng ghi chú cố định phía trên khu vực B — *"Biến thể không thay đổi chính bó hoa. Muốn sửa ánh sáng hoặc hình dáng sản phẩm, quay lại Khu vực A."* — kèm nút nhảy thẳng lên Khu vực A.

---

## 3. AI Video Studio

**Module:** M04c · **Trạng thái nền tảng:** ✅ HOẠT ĐỘNG 100% Production & Commercial Ready (P17 hoàn tất 09/16). Hệ thống dựng video marketing hoa tươi hoàn chỉnh: 6 khuôn đa nền tảng, Storyboard linh hoạt 2–15 cảnh, Camera Motion Ken Burns điện ảnh, Provider cắm rút (Local Cinematic 0 credit + Standby Veo/HeyGen).

### Luồng người dùng

```
Chọn sản phẩm có Master Image đã duyệt
   → Chọn khuôn video: TikTok 15s/30s/45s · Reels 30s · Feed 1:1 · Landscape 16:9
   → Cấu hình: nhạc nền · giọng đọc Edge TTS · phụ đề 4 phong cách · CTA · logo
   → Xác nhận chi phí credit (VideoCreateModal)
   → Nhấn "Dựng kịch bản"
   → STORYBOARD EDITOR: 2–15 cảnh (thêm/xóa/sắp xếp)
     • Mỗi cảnh: ảnh nguồn, thời lượng tự cân bằng, Camera Motion (Zoom In/Out, Pan Up/Right, Static), phụ đề
     • Nút xóa cảnh [🗑️ Xóa cảnh] đỏ nổi bật
     • Menu Camera Motion Ken Burns luân phiên tự động
   → Duyệt kịch bản (Cổng 1 — P3)
   → Nhấn "Dựng video"
   → [Đang dựng — Worker FFmpeg Ken Burns ~0.45s/cảnh, SSE tiến trình 0%→100%]
   → THẺ KẾT QUẢ: trình phát video HTML5 + thời lượng + tỉ lệ + chi phí
   → Duyệt video (Cổng 2 — P4)
   → Lưu vào Kho video & Asset Store → Quay về Trang chủ
```

Hai cổng duyệt tách biệt: **duyệt kịch bản** (trước khi tốn chi phí dựng thật) và **duyệt video** (sau khi có kết quả cuối) — tránh dựng video tốn kém từ một kịch bản chưa ai xem qua.

### Thẻ kịch bản Storyboard

| Trường | Sửa được | Thêm/bớt |
|---|---|---|
| Danh sách cảnh (ảnh nguồn + thời lượng tự cân bằng) | Có | Có (thêm/xoá cảnh 2–15, khung đầu và khung cuối luôn khoá vào ảnh đã duyệt) |
| Camera Motion Ken Burns (Zoom In/Out, Pan Up/Right, Static) | Có (menu dropdown mỗi cảnh) | Mặc định luân phiên tự động |
| Nhạc nền | Có (đổi bản nhạc) | — |
| Phụ đề từng cảnh (4 phong cách: Modern Badge, Minimal, Highlight Box, Bottom Banner) | Có (sửa văn bản + chọn phong cách) | Có |
| Giọng đọc AI Edge TTS | Có (bật/tắt) | — |
| CTA cuối video | Có | — |

### Kiến trúc Provider cắm rút

| Phương án | Provider | Chi phí | Tốc độ | Kích hoạt |
|-----------|----------|---------|--------|-----------|
| **A (Mặc định)** | `LocalCinematicProvider` — FFmpeg Ken Burns zoompan | 0 credit | ~0.45s/cảnh | Mặc định hoạt động |
| **B (Standby)** | `GoogleVeoProvider` — AI generative video | 15-40 credit | Phụ thuộc API | `AI_VIDEO_PROVIDER=veo` trong `.env` |
| **B (Standby)** | `HeyGenProvider` — AI talking avatar | 15-40 credit | Phụ thuộc API | `AI_VIDEO_PROVIDER=heygen` trong `.env` |

### Trạng thái đặc biệt
- Khung đầu/khung cuối không cho phép đổi sang ảnh chưa duyệt — ô chọn ảnh chỉ liệt kê Master Image và biến thể đã duyệt từ trang 2.
- Nếu job dựng video lỗi kỹ thuật (không phải bị từ chối nội dung) → thẻ báo "Dựng thất bại — thử lại", không trừ vào hạn mức của tổ chức.

---

## 4. AI Content Engine

**Module:** M07 (phần sinh nội dung) · **Trạng thái nền tảng:** sinh được văn bản chung; chưa gắn với sản phẩm thật, chưa có Zalo OA.

### Luồng người dùng

```
Chọn sản phẩm (Product Master + ảnh đã duyệt)
   → Chọn kênh: Facebook · Instagram · TikTok · Zalo OA (chọn nhiều)
   → Chọn dịp/chủ đề (tuỳ chọn — để trống thì AI tự gợi ý theo mùa vụ)
   → Nhấn "Sinh nội dung"
   → [Đang soạn — một lượt cho mỗi kênh đã chọn]
   → LƯỚI THẺ KẾT QUẢ: mỗi kênh một thẻ
   → Sửa văn bản / hashtag / SEO / CTA trên từng thẻ
   → Duyệt từng thẻ hoặc "Duyệt tất cả"
   → Lưu vào Thư viện nội dung → Quay về Trang chủ
        │
        ▼ gợi ý "Lên lịch đăng ngay" — nhảy sang trang Social Publishing với nội dung vừa duyệt đã chọn sẵn
```

### Thẻ kết quả theo kênh

| Kênh | Trường |
|---|---|
| Facebook | Tiêu đề · nội dung bài · hashtag · ảnh/video đính kèm (chọn từ Kho) |
| Instagram | Caption · hashtag · ảnh đính kèm |
| TikTok | Kịch bản quay/voice-over · gợi ý nhạc · hashtag |
| Zalo OA | Nội dung chăm sóc khách (không quảng cáo trực tiếp) |
| Chung mọi kênh | Mô tả SEO · tiêu đề thay thế (A/B) · kịch bản livestream · tin nhắn bán hàng mẫu — hiển thị ở tab phụ "Nội dung dùng chung" |

Mỗi thẻ có chỉ báo **Đúng giọng thương hiệu** (đối chiếu hồ sơ thương hiệu) và **Đúng dữ kiện sản phẩm** (đối chiếu Product Master) — cảnh báo nếu nội dung nhắc sai tên hoa hoặc sai số lượng.

---

## 5. Social Publishing

**Module:** M07 (phần đăng bài) · **Trạng thái nền tảng:** đăng đa nền tảng, lịch đăng, duyệt trước khi đăng đã chạy thật; thư viện nội dung, tự duyệt theo thời hạn, đăng lại thông minh chưa có màn hình.

Trang này không mở đầu bằng "tải lên" — nó mở đầu bằng **chọn từ Thư viện nội dung** đã duyệt ở trang 4 (hoặc nội dung cũ được gợi ý đăng lại).

### Luồng người dùng

```
Thư viện nội dung (danh sách bài đã duyệt, chưa đăng)
   → Chọn một hoặc nhiều bài
   → Chọn nền tảng đăng + thời điểm (ngay / hẹn giờ)
   → Xem trước từng nền tảng (bản xem đúng khung hiển thị của Facebook/Instagram/TikTok/Zalo)
   → Sửa lần cuối nếu cần (không cần quay lại trang 4)
   → Nhấn "Xác nhận lịch đăng"
   → THẺ TRẠNG THÁI: mỗi bài một dòng — Đã lên lịch / Đang đăng / Đã đăng / Lỗi
   → (không có bước "Duyệt" riêng ở đây — nội dung đã qua cổng duyệt ở trang 4;
      trang này chỉ có cổng "Xác nhận lịch đăng")
```

### Ba khu vực phụ trên cùng trang

| Khu vực | Nội dung |
|---|---|
| **Lịch đăng** | Xem theo tuần/tháng, kéo-thả đổi giờ đăng, click một ô xem chi tiết bài |
| **Đăng lại thông minh** | Danh sách bài cũ được Analytics (trang 10) đánh dấu hiệu quả cao, nút "Đăng lại" mở lại đúng luồng xem trước → xác nhận |
| **Tự duyệt theo thời hạn** | Công tắc cấp tổ chức, **tắt theo mặc định**, chỉ ai có quyền Điều hành mới thấy công tắc này; bật lên hiển thị cảnh báo rõ: *"Bài chờ quá 24 giờ sẽ tự đăng. Đổi giá, khuyến mại, hoặc thông tin có tính pháp lý/y tế không bao giờ tự đăng dù bật công tắc này."* Mỗi lần bật/tắt ghi lại người thao tác. |

### Trạng thái đặc biệt
- Hết hạn 24h mà công tắc tự duyệt đang tắt → bài quay lại Thư viện nội dung ở trạng thái "Chờ duyệt lại", không tự đăng, có thông báo nhắc người phụ trách.
- Đăng thất bại (lỗi nền tảng) → dòng trạng thái chuyển "Lỗi", có nút Thử lại, không tính là đã dùng lượt đăng.

---

## 6. Catalog & Website

**Module:** M06 (catalog + QR) + M05 (landing page) · **Trạng thái nền tảng:** M05 đã chạy (LocalBudd); M06 catalog số và liên kết QR chưa có màn hình.

Trang có hai tab độc lập, không phải một luồng tuyến tính — vì catalog là dữ liệu sống (luôn đồng bộ sản phẩm đã duyệt) còn landing page là sản phẩm theo từng chiến dịch.

### Tab A — Catalog số

```
Mở tab Catalog (tự động liệt kê mọi sản phẩm đã duyệt — không cần "nhập liệu" thủ công)
   → Lọc/nhóm theo: danh mục, giá, dịp, màu sắc, loại hoa
   → Gộp một số sản phẩm thành "Bộ sưu tập" (kéo-thả vào nhóm)
   → Xem trước catalog dạng khách sẽ thấy
   → Duyệt xuất bản (catalog.publish)
   → Hệ thống sinh mã QR cho liên kết catalog
   → Lưu → màn hình hiện mã QR để tải/in
```

Catalog không có "Thẻ kết quả" theo nghĩa AI sinh ra — nó là view tổng hợp; hành động chính là **chọn đưa vào/gỡ khỏi catalog** và **duyệt xuất bản**, không phải sửa từng trường (trường sản phẩm sửa ở trang 1).

### Tab B — Landing page chiến dịch

```
Chọn dịp: 20/10 · Valentine · 8/3 · Ngày của Mẹ · Khai trương · Hoa cưới · (tự đặt tên chiến dịch khác)
   → Chọn sản phẩm đưa vào trang
   → Nhấn "Dựng trang"
   → [Đang dựng — AI sinh kế hoạch bố cục, hệ thống ghép từ khối đã duyệt sẵn]
   → THẺ KẾT QUẢ: bản xem trước toàn trang, từng khối có thể bấm để sửa (đổi ảnh, đổi thứ tự khối, sửa tiêu đề)
   → Duyệt xuất bản (landing.publish)
   → Lưu → nhận đường link + mã QR riêng cho chiến dịch → Quay về Trang chủ
```

### Trạng thái đặc biệt
- Landing page luôn dựng từ Hồ sơ thương hiệu — phong cách bị cấm (`forbidden_styles`) không bao giờ xuất hiện trong lựa chọn bố cục, kể cả khi người dùng thử đổi.
- Sản phẩm chưa được duyệt ở trang 1 không xuất hiện trong danh sách chọn của cả hai tab.

---

## 7. CRM & Khách hàng

**Module:** M09 · **Trạng thái nền tảng:** chưa xây — thiết kế đích, đặc biệt lưu ý ràng buộc dữ liệu cá nhân.

### Luồng người dùng

```
Danh sách khách hàng (nhập tay hoặc tự động từ đơn hàng ở trang 8)
   → Mở hồ sơ một khách hàng: lịch sử mua, ngày đặc biệt đã ghi nhận
   → Nhấn "Gợi ý chiến dịch nhắc mua" (AI quét toàn bộ khách hàng theo lô, không phải từng người)
   → [Đang phân tích — chỉ đọc dịp + lịch sử mua, KHÔNG gửi tên/số điện thoại/địa chỉ ra ngoài]
   → LƯỚI THẺ KẾT QUẢ: mỗi thẻ = một khách hàng cần nhắc, kèm dịp và lý do
   → Sửa nội dung nhắc / đổi kênh gửi (Zalo, SMS, gọi điện) / bỏ khách hàng không muốn nhắc
   → Duyệt từng thẻ hoặc theo lô
   → Lưu → lên lịch gửi (nối sang hàng chờ gửi) → Quay về Trang chủ
```

### Thẻ kết quả — Gợi ý nhắc mua

| Trường | Sửa được | Ghi chú |
|---|---|---|
| Tên khách hàng, dịp phát hiện | Có (sửa ngày dịp) | Phần định danh không đi qua AI — chỉ ghép ở bước hiển thị và bước gửi |
| Lý do gợi ý (vd. "năm ngoái mua hoa sinh nhật vợ ngày 18/10") | Chỉ xem | Diễn giải từ dữ liệu giao dịch nội bộ |
| Nội dung nhắc (soạn sẵn) | Có | Sinh từ dịp + sản phẩm, không chứa tên khách trong phần AI soạn |
| Kênh gửi | Có (chọn lại) | |
| Voucher đính kèm | Có (chọn từ danh sách voucher) | |

### Khu vực riêng — Đồng ý & quyền dữ liệu

Mỗi hồ sơ khách hàng có một khối cố định, tách khỏi phần lịch sử mua:

| Trường | Vai trò |
|---|---|
| Trạng thái đồng ý nhận nhắc | Bật/tắt, có ngày ghi nhận |
| Yêu cầu xoá dữ liệu | Nút riêng, thực thi ngay khi khách hàng (không chỉ cửa hàng) yêu cầu |

Khối này hiển thị ở mọi hồ sơ khách hàng bất kể có gợi ý nhắc mua hay không — đây là điều kiện đi kèm bắt buộc của toàn bộ trang, không phải một tính năng phụ.

---

## 8. Đơn hàng & Vận hành

**Module:** M10 · **Trạng thái nền tảng:** chưa xây trên core, nhưng có luồng chào giá/điều phối chạy thật ở hệ v1 làm nguồn tham chiếu.

Trang này khác tám trang kia ở một điểm: đơn vị trung tâm không phải "một AI job" mà là "một đơn hàng sống qua nhiều trạng thái". Vẫn theo khung 6 bước, nhưng bước ④–⑤ lặp lại mỗi khi đơn đổi trạng thái.

### Luồng người dùng

```
Tạo đơn: chọn khách hàng, chọn sản phẩm (từ Product Master), ngày giao, lời nhắn thiệp
   → Nhấn "Tạo phiếu chào giá"
   → THẺ PHIẾU CHÀO GIÁ: giá từng dòng, tổng tiền, xem trước bản in A6
   → Sửa giá/số lượng nếu cần
   → Duyệt (xác nhận đơn chính thức)
   → Lưu → đơn vào bảng điều phối
        │
        ▼
   Bảng điều phối (Kanban): Mới → Phân công thợ cắm → Đang làm → Đã giao
   → Kéo thẻ đơn sang cột kế, hoặc phân công thợ cắm trực tiếp trên thẻ
   → Đồng hồ SLA hiển thị trên từng thẻ (đếm ngược tới giờ giao)
   → Khi giao xong: đánh dấu "Đã giao" → đơn đóng
```

### Thẻ đơn hàng (trên bảng điều phối)

| Trường | Sửa được | Ghi chú |
|---|---|---|
| Khách hàng, sản phẩm, số lượng | Có (trước khi vào sản xuất) | Khoá sau khi bắt đầu sản xuất |
| Thợ cắm được phân công | Có | Kéo-thả gán người |
| Trạng thái sản xuất | Có (kéo cột) | |
| SLA còn lại | Chỉ xem | Đổi màu khi gần trễ / đã trễ |
| Lời nhắn thiệp | Có | In kèm phiếu đơn |

### Trạng thái đặc biệt
- Đơn quá giờ SLA mà chưa chuyển "Đã giao" → thẻ tự chuyển viền đỏ, nổi lên đầu cột, không tự động làm gì khác.
- In phiếu đơn là hành động độc lập (nút riêng trên thẻ), không gắn với bất kỳ cổng duyệt nào — in lại bao nhiêu lần cũng được.

---

## 9. AI Chat Assistant

**Module:** M08 · **Trạng thái nền tảng:** chưa có repo — thiết kế đích.

Trang này không theo khung 6 bước tuyến tính vì bản chất là giám sát một kênh đang chạy liên tục, không phải một lượt xử lý có điểm bắt đầu/kết thúc. Trang chia hai chế độ xem, chuyển bằng tab.

### Tab A — Hội thoại đang diễn ra

```
Danh sách hội thoại (khách đang chat) → chọn một hội thoại
   → Xem lịch sử chat, xem AI đang trả lời dựa trên catalog + giá đã duyệt của chính cửa hàng
   → Mỗi câu trả lời của AI có nhãn nhỏ "dẫn từ: [tên sản phẩm / trang giá]" — luôn trỏ về được bản ghi thật
   → Nút "Chuyển cho nhân viên" — luôn hiện, một bấm là AI dừng trả lời, người thật tiếp quản
   → Gắn cờ hội thoại cần xem lại (vd. AI trả lời không chắc)
```

Đây là màn giám sát, không có "Thẻ kết quả AI cần duyệt" — vì câu trả lời đã được gửi cho khách theo thời gian thực (đọc dữ liệu đã duyệt sẵn, không tự bịa). Cổng kiểm soát nằm ở **Tab B**, không nằm ở từng câu trả lời.

### Tab B — Cấu hình phạm vi trả lời

```
Chọn phạm vi AI được trả lời: giá · vùng giao hàng · mẫu tương tự · tồn kho theo tone màu · gợi ý theo ngân sách
   → Soạn/sửa câu trả lời mẫu cho các câu hỏi thường gặp
   → Đặt ngưỡng "AI không chắc → chuyển người" 
   → Nhấn "Lưu cấu hình"
   → THẺ XEM TRƯỚC: mô phỏng 3 câu hỏi mẫu, xem AI sẽ trả lời gì với cấu hình mới
   → Duyệt cấu hình (content.approve tương đương cho cấu hình hội thoại)
   → Lưu → áp dụng ngay cho hội thoại mới
```

### Trạng thái đặc biệt
- AI không trả lời được (không tìm thấy dữ liệu khớp) → tự động hiện nút "Chuyển cho nhân viên" kèm câu xin lỗi mặc định, không đoán mò.
- Không có cấu hình nào cho phép AI tự tính giá — mọi câu trả lời về giá luôn tra thẳng bảng giá đã duyệt.

---

## 10. Analytics & Learning

**Module:** M11 · **Trạng thái nền tảng:** số liệu cơ bản (reach, engagement, top post) đã có từ nền tảng đăng bài; conversion, ROI, vòng học chưa có.

### Luồng người dùng

```
Chọn khoảng thời gian / chiến dịch / sản phẩm muốn xem
   → Bảng chỉ số: Reach · Engagement · Số khách hỏi (Inbox) · Tỷ lệ chuyển đơn · Bài hiệu quả nhất · Sản phẩm bán tốt nhất · ROI chiến dịch
   → Nhấn "Diễn giải" trên một chỉ số bất thường
   → THẺ DIỄN GIẢI: AI nêu khả năng vì sao (vd. "Reach giảm vì đổi khung giờ đăng"), kèm số liệu dẫn chứng
   → (không cần duyệt — đây là thông tin tham khảo, không ghi đè dữ liệu nào)
```

### Khu vực riêng — Vòng học phong cách (chỉ xuất hiện sau ~20 bài có số liệu)

```
Thẻ đề xuất: "Hồ sơ phong cách của cửa hàng nên đổi [tham số] vì [số liệu dẫn chứng]"
   → Xem chi tiết: tham số cũ / tham số đề xuất, số liệu đứng sau đề xuất
   → Sửa giá trị đề xuất nếu muốn tinh chỉnh
   → Duyệt áp dụng (learning.profile.manage)
   → Lưu → hồ sơ phong cách cập nhật, ảnh hưởng tới lượt sinh nội dung/ảnh tiếp theo ở trang 1 và trang 4
   → Quay về Trang chủ
```

### Thẻ đề xuất học phong cách

| Trường | Sửa được | Ghi chú |
|---|---|---|
| Tham số đề xuất đổi | Có | Vd. khung giờ đăng, độ dài caption, tỉ lệ ảnh ưu tiên |
| Giá trị hiện tại → giá trị đề xuất | Chỉ xem giá trị hiện tại; sửa được giá trị đề xuất | |
| Số liệu dẫn chứng | Chỉ xem | Luôn truy được về đúng bài/chiến dịch đã sinh ra đề xuất |

### Trạng thái đặc biệt
- Dưới 20 bài có số liệu → khu vực Vòng học ẩn hoàn toàn, thay bằng dòng trạng thái "Cần thêm N bài đăng có số liệu để bắt đầu học phong cách."
- Mọi đề xuất học phong cách đã áp dụng lưu lại lịch sử — xem được đề xuất nào áp dụng lúc nào, dựa trên số liệu nào.

---

## Bảng tổng hợp — 10 trang và cổng duyệt

| # | Trang | Cổng duyệt chính | Nơi lưu chính thức | Gợi ý bước kế tiếp |
|---|---|---|---|---|
| 1 | Phân tích sản phẩm | Duyệt phân tích · Duyệt nội dung bán hàng | Product Master | Tối ưu ảnh (2) |
| 2 | AI Creative Studio | Duyệt Master Image · Duyệt biến thể | Thư viện ảnh sản phẩm | AI Video Studio (3), AI Content Engine (4) |
| 3 | AI Video Studio | Duyệt kịch bản · Duyệt video | Thư viện video | AI Content Engine (4) |
| 4 | AI Content Engine | Duyệt nội dung theo kênh | Thư viện nội dung | Social Publishing (5) |
| 5 | Social Publishing | Xác nhận lịch đăng | Lịch đăng | Analytics (10) |
| 6 | Catalog & Website | Duyệt xuất bản catalog/landing | Catalog, trang chiến dịch | — |
| 7 | CRM & Khách hàng | Duyệt nội dung nhắc mua | Hàng chờ gửi | Đơn hàng (8) |
| 8 | Đơn hàng & Vận hành | Duyệt phiếu chào giá | Đơn hàng | — |
| 9 | AI Chat Assistant | Duyệt cấu hình phạm vi trả lời | Cấu hình trợ lý | — |
| 10 | Analytics & Learning | Duyệt áp dụng đề xuất học | Hồ sơ phong cách | Phân tích sản phẩm (1), AI Content Engine (4) |

Không có mũi tên nào trong bảng trên là đường tự động — mỗi mũi tên là một nút bấm hiện ra sau khi lưu, người dùng chọn đi tiếp hay dừng ở Trang chủ.
