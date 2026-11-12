# ĐẶC TẢ CHI TIẾT USER JOURNEY 13 CHỨC NĂNG QUẢN TRỊ CỬA HÀNG (FLORAOS STORE JOURNEYS)

> **Mã tài liệu:** `DOC-03-STORE-13-USER-JOURNEYS`  
> **Cấp thẩm quyền:** Level 3 (Feature & Journey Specification)  
> **Nguồn sự thật Codebase (SSOT):**  
> - Định nghĩa dữ liệu: `src/modules/journey/domain/journey-catalog.ts` (`STORE_JOURNEYS`)  
> - Mô hình kiểu dữ liệu: `src/modules/journey/domain/journey-model.ts`  
> - Máy trạng thái hành trình: `src/modules/journey/domain/journey-state.ts`  
> - Điều hướng & Giao diện: `src/components/dashboard/store-journey-home.tsx` & `src/components/journey/choice-grid.tsx`  
> - Khung giao diện hành trình: `src/components/journey/journey-shell.tsx`, `workflow-preview.tsx`  
> - Trợ lý hội thoại toàn cục: `src/components/chat/alg-global-copilot.tsx`  
> **Vai trò người dùng mục tiêu:** `store_admin` (Chủ tiệm hoa), `store_manager` (Quản lý cửa hàng), `dieu_hanh` (Điều hành)  
> **Phiên bản:** 2.1 (Bổ sung phân tích chuyên sâu Ý nghĩa, Giá trị nghiệp vụ & Vai trò cốt lõi của 13 chức năng) — Ngày ban hành: 02/10/2026 (20:25)

---

## I. TỔNG QUAN VÀ NGUYÊN TẮC HÀNH TRÌNH (JOURNEY-FIRST)

Hệ thống FloraOS áp dụng triệt để kiến trúc **Hành trình trước (Journey-First UX Architecture - J1 đến J7)**. Khi chủ tiệm hoặc nhân viên quản lý đăng nhập vào hệ thống, thay vì đối mặt với một bảng điều khiển số liệu kỹ thuật phức tạp (Dashboard-first) gây quá tải nhận thức, màn hình khởi đầu luôn là câu hỏi định hướng:
> **"BẠN MUỐN LÀM GÌ CHO CỬA HÀNG?"**  
> *Chọn một tác vụ để bắt đầu hành trình làm việc có định hướng cho cửa hàng hoa.*

13 chức năng hành trình của cửa hàng được tổ chức thành các nhóm phân loại trực quan:
1. **Tất cả (13)**: Toàn bộ danh mục tác vụ sẵn sàng phục vụ cửa hàng.
2. **Tác vụ đơn (11)**: Các hành trình thực hiện một mục tiêu cụ thể, chuyển tiếp trực tiếp vào không gian làm việc chuyên sâu hoặc hỗ trợ 1–2 bước xác nhận.
3. **Gói quy trình (1)**: Combo 14 bước tự động tạo và đăng bài khép kín từ khâu phân tích ảnh hoa đến mở bán đa kênh.
4. **Trợ lý ảo (1)**: Trợ lý Chatbot (FloraOS Copilot) túc trực 24/7 giải đáp nghiệp vụ và tư vấn lộ trình.

---

## II. CHI TIẾT 13 HÀNH TRÌNH NGƯỜI DÙNG: Ý NGHĨA, GIÁ TRỊ VÀ VAI TRÒ CỐT LÕI

---

### 1. Xem báo cáo (`view-store-overview`)
- **Tên hiển thị:** **Xem báo cáo**
- **Mã hành trình (`id`):** `view-store-overview`
- **Mô tả ngắn:** Nắm bắt doanh thu, đơn hàng, khách hàng và hiệu suất hoạt động hôm nay.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `BarChart3`
- **Tuyến chuyển tiếp (`primaryHref`):** `/so-lieu` (hoặc bọc trực tiếp qua `StoreGrowthCenter` trong Chế độ Chuyên gia)

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Cung cấp bức tranh tài chính và vận hành thời gian thực toàn diện cho tiệm hoa: doanh số theo giờ, số lượng đơn hoa cần cắm, tình trạng đơn đang giao và cảnh báo hao hụt nguyên phụ liệu.
- **Giá trị kinh doanh:** Giúp chủ tiệm kiểm soát dòng tiền, hạn chế tối đa rủi ro tồn ứ hoa tươi (ngành có đặc thù khấu hao theo ngày) và nắm bắt tức thì hiệu quả kinh doanh của các chiến dịch bán hàng.
- **Vai trò cốt lõi:** Đóng vai trò là **"Trung tâm chỉ huy tăng trưởng (Growth Center)"** của cửa hàng, định hướng cho chủ tiệm biết chính xác việc cần làm tiếp theo để tối ưu hóa năng suất và doanh thu.

#### 🚶 Hành trình người dùng (User Journey):
1. **Khởi đầu (Trigger):** Người dùng nhấp chọn thẻ *"Xem báo cáo"* từ lưới lựa chọn trên trang chủ.
2. **Bước 1 — Bảng tổng quan tăng trưởng (`view-growth-dashboard`):**
   - Hệ thống tải dữ liệu tổng hợp theo thời gian thực (doanh thu ngày, số đơn cần cắm, số đơn đang giao, cảnh báo tồn hoa).
   - Không yêu cầu đầu vào từ người dùng (`inputType: "NONE"`).
   - Hỗ trợ công tắc chuyển đổi linh hoạt giữa *Chế độ hành trình* và *Chế độ chuyên gia*.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - Đơn hàng cần xử lý gấp ➔ Gợi ý chuyển sang *Tiếp nhận & Xử lý đơn hàng ( Giành cho Điện Hoa)*.
   - Doanh thu thấp hơn mục tiêu ➔ Gợi ý chuyển sang *Cập nhật xu hướng thị trường* hoặc *Tạo video cho sản phẩm*.

---

### 2. Cập nhật xu hướng thị trường (`market-intelligence-explore`)
- **Tên hiển thị:** **Cập nhật xu hướng thị trường**
- **Mã hành trình (`id`):** `market-intelligence-explore`
- **Mô tả ngắn:** Theo dõi mẫu hoa thịnh hành trên mạng xã hội và nhu cầu tìm kiếm của khách.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `TrendingUp`
- **Tuyến chuyển tiếp (`primaryHref`):** `/market-intelligence`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Kết nối tiệm hoa với "nhịp đập" thời trang hoa tươi trong nước và quốc tế qua radar trí tuệ thị trường (Market Intelligence), tổng hợp dữ liệu tìm kiếm và video viral từ TikTok, Instagram và YouTube.
- **Giá trị kinh doanh:** Giải quyết bài toán "đi sau thời đại" của nhiều tiệm hoa truyền thống; giúp chủ tiệm biết trước loài hoa nào sắp hot, phong cách cắm nào đang thịnh hành (Tối giản Hàn Quốc, Tone Pastel ngọt ngào, Cổ điển Châu Âu...) trước thềm các dịp lễ lớn (20/10, Valentine, 8/3).
- **Vai trò cốt lõi:** Đóng vai trò là **"Cố vấn chiến lược sản phẩm"**, giúp tiệm hoa nhập đúng hoa, cắm đúng gu khách hàng hiện đại, gia tăng năng lực cạnh tranh và biên lợi nhuận.

#### 🚶 Hành trình người dùng (User Journey):
1. **Khởi đầu (Trigger):** Người dùng nhấp chọn thẻ trên trang chủ.
2. **Điều hướng (Navigation):** Hệ thống chuyển thẳng người dùng vào không gian làm việc Thị trường `/market-intelligence`.
3. **Khám phá bảng vàng xu hướng (`view-trends`):**
   - Người dùng xem radar xu hướng: loại hoa đang "hot", phong cách cắm hoa trending, dẫn chứng video kép thực tế.
   - Lọc theo dịp lễ sắp đến để đón đầu nhu cầu tiêu dùng.
4. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - Chọn mẫu hoa xu hướng ➔ Bấm nút *"Tạo nội dung cho mẫu này"* chuyển ngay sang *Viết nội dung bài đăng cho các nền tảng* hoặc *Tạo ảnh marketing cho sản phẩm*.

---

### 3. Tạo Thẻ sản phẩm từ ảnh (`analyze-product-photo`)
- **Tên hiển thị:** **Tạo Thẻ sản phẩm từ ảnh**
- **Mã hành trình (`id`):** `analyze-product-photo`
- **Mô tả ngắn:** Nhận diện loài hoa, phong cách cắm, ước tính chi phí và tạo thông số sản phẩm.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `Camera`
- **Tuyến chuyển tiếp (`primaryHref`):** `/san-pham`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Ứng dụng Vision AI phân tích thị giác để "giải mã" ảnh chụp bó hoa thật thành các thông số nguyên tử: phân loại loài hoa (hoa chính, hoa phụ, hoa lá đệm), màu sắc, kích thước, và số lượng cành ước tính.
- **Giá trị kinh doanh:** Tiết kiệm hàng giờ nhập liệu thủ công; số hóa kho mẫu hoa của tiệm một cách khoa học; hỗ trợ tính toán giá vốn nguyên liệu (COGS) minh bạch, chính xác từng cành hoa.
- **Vai trò cốt lõi:** Là **"Cổng số hóa nguyên liệu & chuẩn mực hóa sản phẩm"**, biến mọi ý tưởng cắm hoa thực tế thành tài sản dữ liệu của cửa hàng, làm nền tảng cho báo giá và catalog.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Tải ảnh sản phẩm (`upload-product-photo`):**
   - Người dùng tải lên ảnh chụp thật của bó hoa, giỏ hoa hoặc kệ hoa (`inputType: "IMAGE_UPLOAD"`).
   - Hệ thống kích hoạt mô hình Vision AI bóc tách đa tầng tự động.
2. **Bước 2 — Xem kết quả phân tích & lưu (`review-analysis`):**
   - Hiển thị bảng bóc tách nguyên tử: tên hoa, số lượng cành, đơn vị tính, ước tính giá vốn và công thợ.
   - Người dùng có thể nhấp chuột chỉnh sửa trực tiếp từng dòng dữ liệu và bấm xác nhận lưu sản phẩm.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - *"Tạo Thẻ báo giá sản phẩm"* ➔ Chuyển thông số sang Hành trình Báo giá.
   - *"Tạo ảnh marketing cho sản phẩm"* ➔ Chuyển ảnh sang Creative Studio.

---

### 4. Tạo Thẻ báo giá sản phẩm (`create-product-quote`)
- **Tên hiển thị:** **Tạo Thẻ báo giá sản phẩm**
- **Mã hành trình (`id`):** `create-product-quote`
- **Mô tả ngắn:** Lên bảng báo giá hoa chi tiết với hình ảnh, thông số cành hoa và thành tiền.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `Receipt`
- **Tuyến chuyển tiếp (`primaryHref`):** `/bao-gia`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Tự động hóa quá trình lập phiếu báo giá hoa tươi chuyên nghiệp; tính toán minh bạch chi phí hoa, phụ liệu bọc gói, thiệp chúc mừng, công thợ và phí vận chuyển hẹn giờ.
- **Giá trị kinh doanh:** Rút ngắn thời gian phản hồi khách hỏi giá từ 15–30 phút xuống còn dưới 60 giây; nâng cao tỷ lệ chốt đơn nhờ phiếu báo giá thẩm mỹ cao (A6, PDF, link xem trực tuyến); triệt tiêu thất thoát giá do nhân viên báo giá tùy tiện.
- **Vai trò cốt lõi:** Là **"Công cụ đòn bẩy chốt đơn & minh bạch giá"**, tạo dựng niềm tin tuyệt đối với khách hàng khó tính và khách hàng doanh nghiệp cần hóa đơn, chứng từ rõ ràng.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Chọn hoặc nhập sản phẩm (`select-product-for-quote`):**
   - Người dùng chọn sản phẩm có sẵn từ kho dữ liệu hoặc nhập nhanh một mẫu hoa mới (`inputType: "PRODUCT_SELECT"`).
2. **Bước 2 — Hoàn thiện và gửi báo giá (`generate-quote`):**
   - Hệ thống tự động tính ra giá bán đề xuất, điền thông số cành, chi phí và thông điệp thiệp mừng.
   - Xuất bản phiếu báo giá đa định dạng (ảnh nét cao, link trực tuyến, hoặc in phiếu báo giá A6/PDF).
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - Khách chốt đơn ➔ Nhấp *"Chuyển thành đơn hàng mới"* (tự động điền dữ liệu sang Hành trình Đơn hàng).

---

### 5. Viết nội dung bài đăng cho các nền tảng (`create-marketing-copy`)
- **Tên hiển thị:** **Viết nội dung bài đăng cho các nền tảng**
- **Mã hành trình (`id`):** `create-marketing-copy`
- **Mô tả ngắn:** Soạn bài đăng Facebook, Zalo, Instagram thu hút và kích thích đặt hàng.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `FileText`
- **Tuyến chuyển tiếp (`primaryHref`):** `/creative-studio`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Ứng dụng mô hình ngôn ngữ chuyên sâu ngành hoa (Florist Content AI) để sáng tạo thông điệp bán hàng giàu cảm xúc, hợp ngữ cảnh (tình yêu, cảm ơn, xin lỗi, mừng thọ, chúc mừng khai trương).
- **Giá trị kinh doanh:** Xóa bỏ hoàn toàn tình trạng "bí chữ" của thợ hoa và chủ tiệm; duy trì tần suất xuất hiện thường xuyên trên mạng xã hội; tự động gắn các lời kêu gọi hành động (Call To Action - CTA) kích thích người đọc nhắn tin đặt hoa ngay.
- **Vai trò cốt lõi:** Đóng vai trò là **"Copywriter chuyên nghiệp 24/7 của tiệm hoa"**, biến những cành hoa tĩnh lặng thành câu chuyện chạm đến trái tim người mua.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Chọn góc tiếp cận và cảm xúc (`choose-content-angle`):**
   - Chọn kênh phát hành (FB, Zalo, IG) và văn phong (Ngọt ngào tình cảm, Sang trọng tinh tế, Hóm hỉnh Gen Z, Doanh nghiệp trang trọng) (`inputType: "CONFIG_SELECT"`).
2. **Bước 2 — Hoàn chỉnh nội dung bài viết (`generate-copy`):**
   - AI sinh tiêu đề giật tít thu hút, câu chuyện hoa truyền cảm hứng, báo giá minh bạch và bộ hashtag chuẩn xu hướng.
   - Người dùng tinh chỉnh câu từ trực tiếp trên bộ soạn thảo và sao chép 1 chạm.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - *"Tạo ảnh marketing cho sản phẩm"* ➔ Kích hoạt chặng ảnh studio tương ứng.

---

### 6. Tạo âm thanh cho nội dung đăng các nền tảng (`create-audio-voiceover`)
- **Tên hiển thị:** **Tạo âm thanh cho nội dung đăng các nền tảng**
- **Mã hành trình (`id`):** `create-audio-voiceover`
- **Mô tả ngắn:** Sinh giọng đọc AI truyền cảm, lời bình và chọn nhạc nền phong cách cho hoa.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `Volume2`
- **Tuyến chuyển tiếp (`primaryHref`):** `/creative-studio`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Chuyển hóa văn bản ý nghĩa hoa thành giọng đọc lồng tiếng (Voiceover AI) truyền cảm đa vùng miền (Bắc/Trung/Nam) kết hợp tự động hòa âm với nhạc nền acoustic, piano êm dịu, không lo vi phạm bản quyền âm nhạc.
- **Giá trị kinh doanh:** Giúp nội dung của tiệm hoa trở nên sống động trên các nền tảng nghe nhìn (TikTok, Reels, Podcast ngắn); kích hoạt giác quan thính giác của người mua, tăng gấp đôi thời gian giữ chân người xem video.
- **Vai trò cốt lõi:** Là **"Phòng thu âm thanh số tự động"**, biến những thông điệp hoa tươi thành những lời tự tình giàu cảm xúc, chạm sâu vào tâm thức khách hàng.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Chọn kịch bản thuyết minh (`select-audio-script`):**
   - Chọn đoạn văn bản lời dẫn hoặc nhập câu chuyện ý nghĩa của bó hoa. Chọn tông giọng phù hợp (`inputType: "CONFIG_SELECT"`).
2. **Bước 2 — Xuất file âm thanh & nhạc nền (`render-audio-voice`):**
   - Hệ thống kết xuất file âm thanh chất lượng cao, phối trộn tự động với nhạc nền êm dịu.
   - Người dùng nghe thử và tải file âm thanh.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - *"Ghép âm thanh vào video giới thiệu sản phẩm"* ➔ Chuyển sang Tạo video cho sản phẩm.

---

### 7. Tạo ảnh marketing cho sản phẩm (`create-marketing-image`)
- **Tên hiển thị:** **Tạo ảnh marketing cho sản phẩm**
- **Mã hành trình (`id`):** `create-marketing-image`
- **Mô tả ngắn:** Tách nền chuyên nghiệp, ghép bối cảnh phong cách sống sang trọng.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `Image`
- **Tuyến chuyển tiếp (`primaryHref`):** `/creative-studio`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Sử dụng thuật toán bóc tách nền chuẩn xác đến từng milimet cánh hoa mỏng mảnh và lá xanh, sau đó tự động phối ghép vào các bối cảnh đời sống cao cấp (bàn ăn sang trọng, căn hộ ngập tràn nắng, sảnh khách sạn, lễ cưới).
- **Giá trị kinh doanh:** Tiết kiệm hàng chục triệu đồng chi phí thuê studio chụp ảnh và thợ ảnh chuyên nghiệp; biến bức ảnh chụp bằng điện thoại tại sàn tiệm hoa bừa bộn thành ấn phẩm quảng cáo sang trọng bậc nhất.
- **Vai trò cốt lõi:** Là **"Studio nhiếp ảnh ảo (Virtual Photo Studio)"**, nâng tầm định vị thương hiệu tiệm hoa lên phân khúc cao cấp, kích thích quyết định mua hàng ngay từ ánh nhìn đầu tiên.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Chọn ảnh mẫu sản phẩm (`choose-product-photo`):**
   - Tải ảnh chụp thô tại tiệm (`inputType: "IMAGE_UPLOAD"`). Hệ thống bóc tách nền sạch sẽ.
2. **Bước 2 — Chọn bối cảnh và kết xuất (`render-background`):**
   - Lựa chọn bối cảnh phong cách sống phù hợp với phân khúc giá của bó hoa.
   - AI tự động cân bằng sáng và bóng đổ tự nhiên bảo toàn màu hoa thật.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - *"Tải ảnh sắc nét về máy"* hoặc *"Tạo landing page và catalog"*.

---

### 8. Tạo video cho sản phẩm (`create-product-video`)
- **Tên hiển thị:** **Tạo video cho sản phẩm**
- **Mã hành trình (`id`):** `create-product-video`
- **Mô tả ngắn:** Dựng video giới thiệu chuyển động mượt mà kèm kịch bản thuyết minh.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `Video`
- **Tuyến chuyển tiếp (`primaryHref`):** `/creative-studio`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Tự động tạo dựng video chuyển động điện ảnh (Cinematic Motion) khung hình dọc 9:16 từ ảnh sản phẩm, tích hợp phụ đề chạy chữ sinh động, hiệu ứng chuyển cảnh mượt mà và lời thuyết minh lôi cuốn.
- **Giá trị kinh doanh:** Tiếp cận trực tiếp xu hướng tiêu thụ video ngắn — kênh bán hàng có tỉ lệ chuyển đổi cao nhất hiện nay; giải quyết triệt để sự thiếu thốn về kỹ năng quay dựng phim của nhân viên tiệm hoa.
- **Vai trò cốt lõi:** Là **"Đạo diễn dựng phim tự động"**, sản xuất hàng loạt video ngắn sẵn sàng đăng tải lên TikTok, Instagram Reels và YouTube Shorts trong tích tắc.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Chọn mạch câu chuyện video (`select-video-storyboard`):**
   - Chọn mẫu chuyển động (Zoom cận cảnh chi tiết, Xoay vòng 360 độ, Lướt nhanh sôi động) (`inputType: "CONFIG_SELECT"`).
2. **Bước 2 — Kết xuất video độ nét cao (`render-video`):**
   - Dựng video dọc 9:16 chuẩn nét kèm phụ đề động và âm thanh đồng bộ.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - *"Đăng ngay lên kênh mạng xã hội"* hoặc *"Gắn link vào tin nhắn gửi khách"*.

---

### 9. Tạo landing page và catalog (`create-catalog-collection`)
- **Tên hiển thị:** **Tạo landing page và catalog**
- **Mã hành trình (`id`):** `create-catalog-collection`
- **Mô tả ngắn:** Đóng gói landing page và album mẫu hoa theo chủ đề mùa, sự kiện.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `BookOpen`
- **Tuyến chuyển tiếp (`primaryHref`):** `/catalog`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Đóng gói các bộ sưu tập mẫu hoa theo chủ đề (Hoa sinh nhật, Hoa khai trương tài lộc, Hoa cưới tinh khôi, Hoa chia buồn) thành một trang Landing Page di động tải nhanh, chuẩn SEO kèm mã QR định danh của tiệm.
- **Giá trị kinh doanh:** Tạo ra không gian trưng bày trực tuyến 24/7; khách hàng quét mã QR tại quầy tiệm hoặc mở link qua tin nhắn có thể duyệt album, xem giá minh bạch và đặt mua ngay mà không cần nhân viên đứng tư vấn trực tiếp.
- **Vai trò cốt lõi:** Đóng vai trò là **"Showroom trưng bày số & Kênh bán lẻ tự phục vụ (Self-service Showroom)"**, nâng cao trải nghiệm mua sắm hiện đại cho khách hàng.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Tuyển chọn danh sách hoa (`curate-products`):**
   - Chọn các sản phẩm phù hợp theo chủ đề từ kho dữ liệu (`inputType: "PRODUCT_SELECT"`).
2. **Bước 2 — Phát hành link xem trực tuyến (`publish-catalog`):**
   - Hệ thống tự sinh trang Landing page & Catalog di động chuẩn SEO kèm mã QR định danh của tiệm.
   - Khách xem album hoa, đọc thông điệp và nhấp đặt đơn nhanh qua Zalo/Hotline.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - *"In mã QR đặt tại quầy tiệm"* hoặc *"Gửi link bộ sưu tập cho tệp khách thân thiết"*.

---

### 10. Tiếp nhận & Xử lý đơn hàng ( Giành cho Điện Hoa) (`create-order`)
- **Tên hiển thị:** **Tiếp nhận & Xử lý đơn hàng ( Giành cho Điện Hoa)**
- **Mã hành trình (`id`):** `create-order`
- **Mô tả ngắn:** Nhập thông tin người nhận, mẫu hoa, thời gian giao và in phiếu giao việc.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `ShoppingCart`
- **Tuyến chuyển tiếp (`primaryHref`):** `/don-hang`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Số hóa quy trình tiếp nhận đơn hàng hoa tươi: ghi nhận thông tin người đặt, người nhận, địa chỉ chính xác, khung giờ cam kết giao hoa, lời đề tặng trên banner/thiệp mừng, và in phiếu giao việc tức thì cho thợ cắm hoa.
- **Giá trị kinh doanh:** Ngăn chặn tuyệt đối các sự cố nghiêm trọng trong nghề hoa: giao trễ giờ sự kiện, viết sai tên người nhận trên thiệp chia buồn/chúc mừng, thợ cắm sai tone màu yêu cầu; hỗ trợ điều phối mạng lưới thợ cắm và shipper vệ tinh.
- **Vai trò cốt lõi:** Là **"Trục xương sống vận hành đơn hàng (Order Fulfillment Spine)"**, đảm bảo tiêu chuẩn chất lượng dịch vụ (SLA) và uy tín sống còn của thương hiệu tiệm hoa và điện hoa.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Nhập thông tin đơn hàng (`input-order-details`):**
   - Giao diện tiếp nhận thông tin người đặt, người nhận, địa chỉ, khung giờ giao hoa, mẫu hoa và nội dung thiệp/banner (`inputType: "ORDER_INPUT"`).
   - Chọn hình thức thanh toán (chuyển khoản, tiền mặt khi nhận).
2. **Bước 2 — In phiếu giao việc & điều phối:**
   - Tự động in phiếu giao việc cho thợ cắm hoa tại quầy kèm ảnh mẫu sản phẩm.
   - Đưa đơn vào luồng giám sát tiến độ thực hiện và điều phối mạng lưới điện hoa.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - Chuyển thợ cắm hoa xác nhận bắt đầu ➔ Khi cắm xong chụp ảnh kiểm định chất lượng gửi khách duyệt.

---

### 11. CRM _ Hệ thống Chăm Sóc khách hàng (`manage-customers`)
- **Tên hiển thị:** **CRM _ Hệ thống Chăm Sóc khách hàng**
- **Mã hành trình (`id`):** `manage-customers`
- **Mô tả ngắn:** Tra cứu lịch sử đặt hoa, dịp kỷ niệm, ngày sinh nhật và chăm sóc khách thân thiết.
- **Phân loại & Huy hiệu:** `category: "SINGLE"` | Biểu tượng: `Users`
- **Tuyến chuyển tiếp (`primaryHref`):** `/khach-hang`

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Quản lý cơ sở dữ liệu khách hàng tập trung; lưu vết lịch sử đặt hoa, ngân sách chi tiêu định kỳ, gu thẩm mỹ yêu thích và tự động ghi nhớ các ngày kỷ niệm trọng đại (sinh nhật vợ/chồng, kỷ niệm ngày cưới, sinh nhật sếp/đối tác).
- **Giá trị kinh doanh:** Biến khách hàng vãng lai thành khách hàng trung thành trọn đời (Customer Lifetime Value); hệ thống tự động nhắc hẹn trước 3–7 ngày để chủ tiệm chủ động nhắn tin chăm sóc và chốt đơn đặt trước mà không tốn chi phí quảng cáo mới.
- **Vai trò cốt lõi:** Là **"Cỗ máy duy trì mối quan hệ & tạo doanh thu định kỳ (Retention & Loyalty Engine)"**, xây dựng nền móng khách hàng thân thiết bền vững cho tiệm hoa.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Danh sách hồ sơ khách hàng (`browse-customer-profiles`):**
   - Xem toàn bộ danh sách khách hàng phân hạng theo doanh thu tích lũy (VIP, Thân thiết, Mới) (`inputType: "NONE"`).
   - Nhắc nhở thông minh: Danh sách các khách hàng có ngày kỷ niệm trong tuần tới.
2. **Bước 2 — Chăm sóc cá nhân hóa:**
   - Xem lại lịch sử các đơn hàng đã đặt và gu hoa ưa thích của từng khách hàng.
   - Gửi thiệp chúc mừng hoặc gợi ý mẫu hoa tri ân phù hợp.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - *"Tạo đơn hàng đặt trước cho dịp kỷ niệm"* ➔ Chuyển nhanh sang Tiếp nhận & Xử lý đơn hàng.

---

### 12. Combo 14 bước Tự động tạo và đăng bài. (`launch-product-combo`)
- **Tên hiển thị:** **Combo 14 bước Tự động tạo và đăng bài.**
- **Mã hành trình (`id`):** `launch-product-combo`
- **Mô tả ngắn:** Quy trình khép kín: Phân tích → Báo giá → Studio ảnh & video → Bài viết → Đăng đa kênh.
- **Phân loại & Huy hiệu:** `category: "COMBO"` | Huy hiệu: `"Gói quy trình"` | Biểu tượng: `Rocket`
- **Đặc trưng tương tác:** Kích hoạt modal xem trước quy trình liên hoàn (`WorkflowPreview`), sau đó dẫn dắt người dùng qua từng chặng trong `JourneyShell`.

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Chuẩn hóa toàn bộ Hành trình Đưa sản phẩm ra thị trường (Product-to-Market Journey 14 chặng khép kín): chỉ từ một bức ảnh chụp hoa thô duy nhất, chuỗi AI tự động phân tích bóc tách cành, tạo báo giá, tách nền dựng cảnh studio, viết bài tiếp thị, dựng video ngắn và lên lịch mở bán đa kênh.
- **Giá trị kinh doanh:** Cắt giảm 95% thời gian và nhân lực cho công tác tiếp thị sản phẩm mới; đưa sản phẩm mới lên sàn chỉ trong 3–5 phút thay vì mất 2–3 ngày như quy trình truyền thống.
- **Vai trò cốt lõi:** Đóng vai trò là **"Dây chuyền tự động hóa tiếp thị toàn diện (Autonomous Product Launch Pipeline)"**, vũ khí cạnh tranh mạnh nhất giúp tiệm hoa dẫn đầu thị trường về tốc độ ra mắt mẫu mới.

#### 🚶 Hành trình người dùng (User Journey):
1. **Chặng 1 — Ảnh mẫu ban đầu (`combo-step-photo`):**
   - Người dùng đưa vào ảnh chụp hoa thật tại tiệm (`inputType: "IMAGE_UPLOAD"`). AI phân tích bóc tách cấu trúc và ước tính chi phí.
2. **Chặng 2 — Định giá & báo giá (`combo-step-quote`):**
   - Kế thừa kết quả bóc tách từ Chặng 1 để tự động thiết lập bảng báo giá và định giá bán lẻ cạnh tranh.
3. **Chặng 3 — Hình ảnh studio (`combo-step-image`):**
   - Kế thừa ảnh sạch từ Chặng 1, tự động kết xuất ảnh phong cách sống sang trọng.
4. **Chặng 4 — Nội dung tiếp thị (`combo-step-content`):**
   - Tự động viết nội dung tiếp thị bán hàng dựa trên câu chuyện của loài hoa và mức giá từ Chặng 2 (Bước tùy chọn `isOptional: true`).
5. **Chặng 5 — Video giới thiệu (`combo-step-video`):**
   - Sinh kịch bản và kết xuất video ngắn 9:16 giới thiệu vẻ đẹp của mẫu hoa (Bước tùy chọn `isOptional: true`).
6. **Chặng 6 — Mở bán đa kênh (`combo-step-publish`):**
   - Lưu sản phẩm chính thức vào danh mục, cập nhật lên Catalog trực tuyến và tải gói tài nguyên tiếp thị về máy.
7. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - *"Đăng bài ngay lên Fanpage"* hoặc *"Tạo mã QR trưng bày tại cửa hàng"*.

---

### 13. Chatbot (`floraos-copilot-chat`)
- **Tên hiển thị:** **Chatbot**
- **Mã hành trình (`id`):** `floraos-copilot-chat`
- **Mô tả ngắn:** Trợ lý thông minh FloraOS Copilot hỗ trợ 24/7 giải đáp nghiệp vụ và thao tác.
- **Phân loại & Huy hiệu:** `category: "AI_SUGGEST"` | Huy hiệu: `"Trợ lý 24/7"` | Biểu tượng: `Bot`
- **Phương thức kích hoạt:** Kích hoạt trực tiếp khung hội thoại trợ lý ảo toàn cục (`AlgGlobalCopilot`) thông qua sự kiện `floraos:open-copilot` hoặc phím tắt `⌘K`.

#### 🎯 Ý nghĩa & Giá trị nghiệp vụ:
- **Ý nghĩa:** Tích hợp Trợ lý Trí tuệ nhân tạo toàn cục (FloraOS In-App Copilot) với nền tảng Cơ sở tri thức ngành hoa (SaaS Knowledge Base), nắm vững mọi kỹ thuật cắm hoa, cách dưỡng hoa tươi lâu, bảng màu phối hoa và hướng dẫn sử dụng phần mềm.
- **Giá trị kinh doanh:** Giảm tải gánh nặng đào tạo nhân viên mới cho chủ tiệm; thợ hoa hoặc nhân viên bán hàng có thể hỏi đáp giải quyết tình huống khó ngay tại quầy; nâng cao tính tự chủ và năng suất của toàn bộ đội ngũ.
- **Vai trò cốt lõi:** Là **"Cố vấn chuyên môn & Trợ lý điều hành túc trực 24/7"**, người bạn đồng hành giải quyết mọi vướng mắc nghiệp vụ trong nháy mắt.

#### 🚶 Hành trình người dùng (User Journey):
1. **Bước 1 — Mở phiên trò chuyện (`copilot-chat-session`):**
   - Người dùng nhấp chọn thẻ tác vụ trên trang chủ hoặc nhấn phím tắt `⌘K`.
   - Cửa sổ Copilot thông minh trượt ra từ góc phải màn hình, sẵn sàng tiếp nhận câu hỏi bằng ngôn ngữ tự nhiên (`inputType: "TEXT_INPUT"`).
2. **Bước 2 — Hỏi đáp nghiệp vụ & Hướng dẫn thao tác:**
   - Người dùng có thể đặt câu hỏi về mọi nghiệp vụ tiệm hoa: *"Cách phối màu hoa tone pastel mùa cưới?", "Quy trình xử lý hoa hồng bị héo cánh?", "Hướng dẫn in phiếu giao việc A6 cho thợ cắm hoa"...*
   - Copilot tra cứu cơ sở tri thức ngành hoa (SaaS Knowledge Base), đưa ra câu trả lời súc tích kèm nút bấm hành động trực tiếp (Direct Action Shortcuts) để chuyển thẳng tới tính năng cần dùng.
3. **Hành động đề xuất tiếp theo (Next Best Actions):**
   - Copilot đề xuất hành động ngữ cảnh: *"Mở Báo giá sản phẩm"*, *"Tạo đơn hàng nhanh"* hoặc *"Mở màn hình hướng dẫn chi tiết"*.

---

## III. BẢNG MA TRẬN ĐỒNG BỘ GIỮA CODEBASE VÀ TÀI LIỆU

| STT | Tên chức năng chuẩn hóa | Mã hành trình (`id`) | Vai trò cốt lõi | Phân loại | Huy hiệu | Biểu tượng | Tuyến điều hướng / Kích hoạt | File thực thi giao diện |
|:---:|---|---|---|:---:|:---:|:---:|:---:|---|
| **1** | **Xem báo cáo** | `view-store-overview` | Trung tâm chỉ huy tăng trưởng doanh thu & vận hành | `SINGLE` | — | `BarChart3` | `/so-lieu` | `store-journey-home.tsx` + `store-growth-center.tsx` |
| **2** | **Cập nhật xu hướng thị trường** | `market-intelligence-explore` | Cố vấn đón đầu mẫu hoa và thị hiếu tiêu dùng | `SINGLE` | — | `TrendingUp` | `/market-intelligence` | `market-intelligence/page.tsx` |
| **3** | **Tạo Thẻ sản phẩm từ ảnh** | `analyze-product-photo` | Số hóa hoa tươi & bóc tách cấu trúc giá vốn | `SINGLE` | — | `Camera` | `/san-pham` | `san-pham/page.tsx` |
| **4** | **Tạo Thẻ báo giá sản phẩm** | `create-product-quote` | Đòn bẩy chốt đơn & minh bạch giá bán | `SINGLE` | — | `Receipt` | `/bao-gia` | `bao-gia/page.tsx` |
| **5** | **Viết nội dung bài đăng cho các nền tảng** | `create-marketing-copy` | Chuyên viên sáng tạo nội dung đa kênh 24/7 | `SINGLE` | — | `FileText` | `/creative-studio` | `creative-studio/page.tsx` |
| **6** | **Tạo âm thanh cho nội dung đăng các nền tảng** | `create-audio-voiceover` | Phòng thu âm thanh & giọng đọc truyền cảm | `SINGLE` | — | `Volume2` | `/creative-studio` | `creative-studio/page.tsx` |
| **7** | **Tạo ảnh marketing cho sản phẩm** | `create-marketing-image` | Studio nhiếp ảnh bối cảnh sống ảo cao cấp | `SINGLE` | — | `Image` | `/creative-studio` | `creative-studio/page.tsx` |
| **8** | **Tạo video cho sản phẩm** | `create-product-video` | Đạo diễn dựng video ngắn chuyển động TikTok/Reels | `SINGLE` | — | `Video` | `/creative-studio` | `creative-studio/page.tsx` |
| **9** | **Tạo landing page và catalog** | `create-catalog-collection` | Showroom số hóa & Kênh bán lẻ tự phục vụ | `SINGLE` | — | `BookOpen` | `/catalog` | `catalog/page.tsx` |
| **10** | **Tiếp nhận & Xử lý đơn hàng ( Giành cho Điện Hoa)** | `create-order` | Xương sống tiếp nhận đơn & điều phối điện hoa | `SINGLE` | — | `ShoppingCart` | `/don-hang` | `don-hang/page.tsx` |
| **11** | **CRM _ Hệ thống Chăm Sóc khách hàng** | `manage-customers` | Cỗ máy duy trì quan hệ & nhắc hẹn kỷ niệm | `SINGLE` | — | `Users` | `/khach-hang` | `khach-hang/page.tsx` |
| **12** | **Combo 14 bước Tự động tạo và đăng bài.** | `launch-product-combo` | Dây chuyền tự động hóa đưa sản phẩm ra thị trường | `COMBO` | Gói quy trình | `Rocket` | *Quy trình nội bộ* | `workflow-preview.tsx` + `journey-shell.tsx` |
| **13** | **Chatbot** | `floraos-copilot-chat` | Cố vấn chuyên môn & Trợ lý ảo toàn cục 24/7 | `AI_SUGGEST` | Trợ lý 24/7 | `Bot` | *Khung Copilot 24/7 (⌘K)* | `alg-global-copilot.tsx` |

---

## IV. TIÊU CHÍ NGHIỆM THU VÀ TUÂN THỦ (ACCEPTANCE & COMPLIANCE)

1. **Tuân thủ quy chuẩn UX Lint R8 (0 mã kỹ thuật):** 100% nhãn, mục tiêu, mô tả và bước hành trình sử dụng ngôn từ tiếng Việt tự nhiên, phù hợp với thói quen của chủ tiệm và thợ hoa. Tuyệt đối không xuất hiện các mã nội bộ (như M01a, M02, RBAC, API...) trên giao diện người dùng.
2. **Nguyên tắc "Bọc, không xóa bỏ" (WRAP, không REPLACE - J7):** Các bảng điều khiển chuyên gia (`StoreGrowthCenter`) không bị xóa mà được bọc thành một điểm đến sâu trong hành trình, hoặc truy cập nhanh thông qua nút chuyển đổi *"Chế độ chuyên gia"* (lưu trạng thái tại `localStorage: floraos_expert_mode_store`).
3. **Bảo toàn dữ liệu (Data Integrity):** Khi người dùng chuyển đổi qua lại giữa các bước hoặc giữa Chế độ chuyên gia và Chế độ hành trình tác vụ, toàn bộ dữ liệu đang nhập dở và kết quả xử lý của các bước trước đó được giữ nguyên vẹn.
