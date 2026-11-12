# ĐẶC TẢ CHI TIẾT 13 HÀNH TRÌNH TÁC VỤ CHO QUẢN TRỊ CỬA HÀNG (STORE ADMIN)
## ALG STORE USER JOURNEY SPECIFICATION — PHIÊN BẢN V5.4 (SSOT CHÍNH THỨC)

> **Mã tài liệu:** `DOC-03-STORE-13-USER-JOURNEYS`  
> **Phiên bản:** V5.4 (Khóa Sổ Hoàn Thiện SSOT — Phản Ánh Quyết Định PO 02/10/2026)  
> **Trạng thái:** CHÍNH THỨC (SSOT) — Được Chủ sản phẩm phê duyệt ngày 02/10/2026  
> **Cấp độ kiến trúc:** Level 2 (Tầng 1–4: Nghiệp vụ & Trải nghiệm Người dùng) + Reference Layer (Tầng 5: Năng lực Hệ thống & Ánh xạ Kỹ thuật)  
> **Mã nguồn đồng bộ:** `src/modules/journey/domain/journey-catalog.ts` (`STORE_JOURNEYS`), `src/components/dashboard/store-journey-home.tsx`  
> **Tài liệu tham chiếu:** `docs/00-DOCUMENTATION-REGISTRY.yaml`, `docs/dac-ta/screen-contracts/_journey-home-store.md`, `docs/ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md`

---

## I. MỤC ĐÍCH VÀ NGUYÊN TẮC THIẾT KẾ 5 TẦNG

Tài liệu này là **Nguồn sự thật duy nhất (Single Source of Truth - SSOT)** đặc tả các Hành trình Tác vụ (User Journeys) của người dùng Quản trị Cửa hàng (Store Admin / Chủ tiệm hoa) và phân định phạm vi với Quản trị Điện Hoa (Điện Hoa Admin) trên nền tảng ALG.

Mọi chức năng được chuẩn hóa nhất quán theo **Mô hình Phân tách 5 Tầng Trải nghiệm & Năng lực (5-Tier Journey Framework)**, bảo đảm ranh giới tuyệt đối giữa Ngôn ngữ Người dùng (Tầng 1–4) và Năng lực Hệ thống (Tầng 5):

```text
              ALG USER JOURNEY FRAMEWORK
       ┌────────────────────────────────────────────────────────┐
       │     TRẢI NGHIỆM NGƯỜI DÙNG — LEVEL 2 (USER UX)         │
       │                                                        │
       │  TẦNG 1: Tên chức năng   ➔ Tôi muốn làm gì?            │
       │  TẦNG 2: Lợi ích        ➔ Vì sao tôi làm?             │
       │  TẦNG 3: Tác vụ         ➔ Tôi làm như thế nào?        │
       │  TẦNG 4: Kết quả        ➔ Tôi nhận được gì?           │
       │     ├─ Thứ tạo ra (Output)                             │
       │     └─ Ứng dụng thực tế (Use Case)                    │
       └───────────────────────────┬────────────────────────────┘
                                   │ (Ánh xạ chuẩn hóa)
                                   ↓
       ┌────────────────────────────────────────────────────────┐
       │   NĂNG LỰC HỆ THỐNG — REFERENCE LAYER (SYSTEM SPEC)    │
       │                                                        │
       │  TẦNG 5: Năng lực máy   ➔ ALG thực hiện ra sao    │
       │                         để tạo ra kết quả đó?          │
       └────────────────────────────────────────────────────────┘
```

### Nguyên tắc bất di bất dịch của Phiên bản V5.4:
1. **Tầng 1 (Tên chức năng):** Dùng 100% ngôn ngữ dân dã, quen thuộc của chủ tiệm hoa.
2. **Tầng 2 (Lợi ích thao tác):** Trả lời duy nhất một câu hỏi: *"Chức năng này giúp chủ tiệm làm việc gì dễ hơn, nhanh hơn hoặc ít thao tác hơn?"*. Tuyệt đối không hứa hẹn kết quả kinh doanh kỳ vọng ("không lo ế hoa", "chốt đơn nhanh", "thu hút nhiều lượt xem", "tạo thu nhập đều đặn").
3. **Tầng 3 ↔ Tầng 4 (Tính tương hỗ hành động - kết quả):** Mọi hành động thao tác ở Tầng 3 bắt buộc phải dẫn đến một kết quả có thể quan sát và sử dụng được ở Tầng 4. Tầng 4 phân tách rõ ràng giữa **Thứ hệ thống tạo ra (Output)** và **Ứng dụng thực tế (Use Case)**.
4. **Không đưa thuật ngữ kỹ thuật vào Tầng 1–4:** Tầng 1–4 không chứa thuật ngữ kỹ thuật hoặc thuật ngữ kiến trúc hệ thống (`M01`, `API`, `PostgreSQL`, `14 bước`, `Full HD`, `⌘K`, `Worker`, `RSC`), ngoại trừ tên các nền tảng mạng xã hội thông dụng mà người dùng thực tế thao tác (`Facebook`, `Zalo`, `TikTok`, `Instagram`).
5. **Tầng 5 phản ánh 100% thực tế Codebase (Zero Phantom Components):** Chỉ sử dụng các Component, API Routes, Database Models và Workers đang thực sự tồn tại trong kho mã nguồn FloraOS.
6. **Phân định phạm vi hiển thị rõ ràng:** Tách bạch ranh giới giữa chức năng của Store Admin (Cửa hàng hoa bán lẻ) và Điện Hoa Admin (Công ty Điện Hoa điều phối mạng lưới).
7. **Bảo tồn Trợ lý vận hành nội bộ:** ALG Copilot tiếp tục là trợ lý nội bộ phục vụ nhân viên tiệm hoa, không bị xóa bỏ khi Journey 13 chuyển giao cho Customer-facing Chatbot.

---

## II. BẢNG TỔNG HỢP 13 HÀNH TRÌNH TÁC VỤ QUẢN TRỊ CỬA HÀNG

| STT | Tên chức năng (Tầng 1) | Lợi ích thao tác (Tầng 2) | Tác vụ chính (Tầng 3) | Kết quả tạo ra (Tầng 4) | Năng lực hệ thống thực tế (Tầng 5) |
|:---:|---|---|---|---|---|
| **01** | **Xem báo cáo** | Nắm bắt toàn diện doanh thu, đơn hàng, mức độ sử dụng ALG và số lượng tư liệu đã tạo trong kỳ | Chọn mốc thời gian ➔ Xem bán hàng & đơn hàng ➔ Xem mức sử dụng ALG ➔ Xem kho tư liệu ➔ Tải ảnh báo cáo hoặc in | Báo cáo 4 nhóm: Báo cáo kinh doanh, Sử dụng ALG, Kho tư liệu và Tổng quan tạo lập | Component `StoreGrowthCenter`, API `/api/v1/orders/summary`, `/api/v1/usage`, CSDL `orders` |
| **02** | **Xem mẫu hoa đang được yêu thích** | Biết các kiểu hoa, màu sắc và mức giá đang được quan tâm nhiều trên mạng xã hội để chuẩn bị mẫu cắm | Chọn dịp lễ hoặc loài hoa ➔ Xem danh sách mẫu hoa thịnh hành ➔ Xem video chi tiết ➔ Chọn mẫu để lấy ý tưởng | Danh sách mẫu hoa thịnh hành kèm video minh họa thực tế được chọn lọc | Component `MarketIntelligenceHome`, API `/api/v1/market-intelligence/opportunities`, CSDL `topics` |
| **03** | **Tạo Thẻ sản phẩm từ ảnh** | Tạo thông tin sản phẩm từ ảnh chụp hoa thật tại tiệm mà không cần tự gõ tên từng loài hoa và tính giá vốn | Tải ảnh chụp bó hoa ➔ Kiểm tra loại hoa & phụ liệu ➔ Chỉnh giá bán ➔ Bấm lưu sản phẩm | Thẻ sản phẩm mới có ảnh, tên hoa, danh mục thành phần chi tiết và giá niêm yết | Component `SmartInputDropzone`, API `/api/v1/vision/analyze`, Python Vision Worker |
| **04** | **Tạo Thẻ báo giá sản phẩm** | Tạo bảng báo giá hoa chuyên nghiệp gồm 2 phân hệ: Báo giá cho đối tác Shop (Điện hoa) và Tạo bộ báo giá cho khách mua hoa (Store) | Chọn mẫu hoa / Lọc nhu cầu khách ➔ Chọn mẫu thẻ báo giá ➔ Tải ảnh báo giá gửi đối tác hoặc khách hàng | Thẻ báo giá đối tác sản xuất hoặc Bộ thẻ báo giá đa sản phẩm gửi khách mua | Component `ProductQuoteBuilder`, API `/api/v1/pricing-rules`, Template Engine |
| **05** | **Viết nội dung bài đăng cho các nền tảng** | Có sẵn các đoạn bài viết giới thiệu hoa và lời chúc mừng theo dịp để đăng mạng xã hội mà không mất công nghĩ chữ | Chọn mẫu hoa ➔ Chọn dịp tặng và giọng văn ➔ Chọn đoạn bài viết ưng ý ➔ Bấm sao chép | Đoạn văn bài đăng có tiêu đề, lời chúc theo dịp và thông tin tiệm đã sao chép | Component `CopywritingStudio`, API `/api/v1/creative-production/content-drafts` |
| **06** | **Tạo giọng đọc cho bài đăng** | Chuyển bài viết giới thiệu hoa thành giọng đọc diễn cảm kèm nhạc nền nhẹ nhàng mà không cần tự thu âm | Chọn đoạn lời bình ➔ Chọn giọng đọc nam/nữ ➔ Nghe thử ➔ Xuất tệp âm thanh | Tệp âm thanh giọng đọc hoàn chỉnh kèm nhạc nền lưu trong kho tư liệu | Component `AudioVoiceoverStudio`, API `/api/v1/audio/synthesize`, Audio Gateway |
| **07** | **Tạo ảnh quảng cáo từ ảnh gốc** | Tách nền và ghép hoa chụp tại tiệm vào các không gian bối cảnh gọn gàng, trang nhã mà không cần dựng góc chụp | Tải ảnh hoa tại tiệm ➔ Chọn bối cảnh trang nhã ➔ Nhấn tạo ảnh ➔ Chọn ảnh ưng ý để tải về | Bộ ảnh hoa đã thay bối cảnh mới lưu trong kho tư liệu của tiệm (ảnh vuông, dọc) | Component `MarketingImageStudio`, API `/api/v1/creative-production/scene-plans`, Python Media Worker |
| **08** | **Tạo video chuyển động từ ảnh hoa** | Biến bức ảnh hoa tĩnh thành video ngắn có chuyển động lia góc nhẹ nhàng và ánh sáng lấp lánh để đăng mạng xã hội | Chọn ảnh hoa ➔ Chọn góc chuyển động và nhạc nền ➔ Bấm tạo video ➔ Tải video về máy | Tệp video ngắn mô phỏng chuyển động góc nhìn từ ảnh hoa gốc lưu trong kho tư liệu | Component `ProductVideoMakerStudio`, API `/api/v1/creative-production/video-assembly`, Python Video Worker |
| **09** | **Tạo trang giới thiệu và bán hoa** | Tạo một trang web đơn giản hiển thị danh sách các mẫu hoa của tiệm kèm giá và nút gọi đặt hoa | Chọn phong cách trang ➔ Chọn các mẫu hoa trưng bày ➔ Nhập lời giới thiệu ➔ Nhận đường link | Trang web giới thiệu tiệm hoa đang hoạt động kèm mã QR chia sẻ cho khách | Component `CatalogCollectionStudio`, API `/api/v1/catalog-links`, CSDL `catalog_links` |
| **10** | **Tiếp nhận & Xử lý đơn hàng (Dành cho Điện Hoa)**<br>*(Scope: Điện Hoa Admin Only)* | Lưu trữ thông tin đơn giao hoa và in phiếu cắm hoa cho thợ, phiếu giao hoa cho người chuyển phát | Nhập thông tin khách & người nhận ➔ Chọn mẫu hoa & lời thiệp ➔ Chọn giờ giao ➔ In phiếu | Đơn hàng lưu trên hệ thống kèm 2 phiếu in: phiếu cắm hoa và phiếu giao hàng | Component `OrderFulfillmentWorkspace`, API `/api/v1/orders`, CSDL `orders` |
| **11** | **Quản lý khách hàng** | Quản lý tập trung toàn bộ dữ liệu khách hàng, lịch sử mua hàng, sở thích và hỗ trợ chăm sóc, gợi ý bán lại | Tìm/xem hồ sơ khách ➔ Xem lịch sử mua & sở thích ➔ Xem lịch nhắc ngày kỷ niệm ➔ Chọn lời chúc và sản phẩm gợi ý gửi khách | Hồ sơ khách hàng tập trung, lịch sử giao dịch, lịch nhắc chăm sóc, gợi ý tin nhắn và danh sách phân nhóm | Component `CustomerCRMWorkspace`, API `/api/v1/crm/customers`, `/api/v1/crm/reminders` |
| **12** | **Tạo bộ nội dung bán hoa tự động** | Thực hiện trọn gói từ một ảnh chụp: định giá, tạo ảnh bối cảnh, viết bài và video để tiết kiệm tối đa thời gian | Tải một ảnh hoa gốc ➔ Xem bảng kết quả tổng hợp ➔ Bấm lưu toàn bộ gói tư liệu sản phẩm | Trọn bộ tư liệu sản phẩm hoàn chỉnh: thẻ sản phẩm, ảnh bối cảnh, bài viết, video đã lưu | Component `ComboProductLaunchWorkspace`, API `/api/v1/creative-production/produce` |
| **13** | **Tư vấn và nhận đơn tự động**<br>*(Customer-facing AI Chatbot)* | Tự động trò chuyện, tư vấn mẫu hoa theo ngân sách, sở thích, so sánh sản phẩm và tiếp nhận đơn hàng của khách 24/7 qua Web/Zalo/Messenger | Khách hỏi nhu cầu ➔ Chatbot gợi ý mẫu hoa & báo giá ➔ Khách chọn mẫu & cung cấp thông tin giao hoa ➔ Chatbot tạo đơn hàng | Đối với khách: danh sách mẫu hoa phù hợp & xác nhận đơn; Đối với tiệm: lead khách hàng, thông tin đặt hoa và đơn hàng tự động | Component `CustomerServiceChatbot`, API `/api/v1/chat/conversations`, `/api/v1/chat/webhooks` |

---

## III. CHI TIẾT 13 HÀNH TRÌNH TÁC VỤ (5 TẦNG CHUẨN HÓA)

```
========================================================================================
HÀNH TRÌNH 01: XEM BÁO CÁO
========================================================================================
```

### Tầng 1: Tên chức năng
**Xem báo cáo**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm nhanh chóng nắm bắt bức tranh toàn cảnh về hoạt động của cửa hàng mà không cần cộng sổ tay hay kiểm đếm thủ công:
1. **Tình hình kinh doanh:** Doanh thu thực nhận, số lượng đơn hoàn thành và đơn đang xử lý.
2. **Sản phẩm bán chạy:** Biết mẫu hoa nào được khách chuộng nhất để dự trù nguyên liệu nhập về.
3. **Mức độ sử dụng ALG:** Nắm rõ trong kỳ tiệm đã tạo ra bao nhiêu sản phẩm, bài viết, ảnh quảng cáo, video và báo giá.
4. **Kho tư liệu hiện có:** Kiểm kê số lượng tài nguyên số đang có sẵn trong hệ thống để tái sử dụng.

### Tầng 3: Tác vụ
`Chọn mốc thời gian (hôm nay / tuần này / tháng này) ➔ Xem tình hình bán hàng & đơn hàng ➔ Xem danh sách sản phẩm bán chạy ➔ Xem mức độ sử dụng ALG ➔ Xem kho tư liệu ➔ Tải ảnh báo cáo hoặc in ra giấy`

*Các tùy chọn thao tác nhỏ:*
- **Xem báo cáo bán hàng:** Theo dõi doanh số bán lẻ, số đơn hoàn thành và số đơn đang thực hiện.
- **Xem báo cáo sử dụng hệ thống:** Đếm số lượng nội dung đã tạo (sản phẩm, hình ảnh, bài viết, video, báo giá).
- **Kiểm kê kho tư liệu:** Xem tổng số lượng mẫu hoa và tài sản truyền thông đang lưu trữ trong cửa hàng.

### Tầng 4: Kết quả
Báo cáo hoàn chỉnh gồm **4 nhóm thông tin chính**:
- **A. Báo cáo kinh doanh:** Tổng doanh thu, số lượng đơn hàng, số đơn hoàn thành, số đơn đang xử lý và danh sách sản phẩm bán chạy.
- **B. Báo cáo sử dụng ALG:** Thống kê số lượng chức năng đã dùng trong kỳ (số sản phẩm đã tạo, số bài viết, hình ảnh, video, giọng đọc, báo giá, landing page, catalog đã tạo ra).
- **C. Báo cáo kho tư liệu:** Thống kê số lượng tư liệu đang lưu trong hệ thống (tổng số sản phẩm trong kho, số lượng ảnh, video, bài viết và báo giá sẵn sàng dùng).
- **D. Tổng quan tạo lập:** Bảng tóm tắt trực quan giúp chủ tiệm trả lời câu hỏi: *"Trong khoảng thời gian này, cửa hàng đã tạo ra những gì bằng ALG?"* (Ví dụ: 126 sản phẩm, 342 bài viết, 218 hình ảnh, 76 video, 153 báo giá).
- **Ứng dụng thực tế (Use Case):** Dùng để tổng kết ca làm việc, đối soát tài chính, đánh giá năng suất sáng tạo của nhân viên tiệm hoa, hoặc tải ảnh/in giấy lưu trữ hàng tuần/tháng.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `view-store-overview`
- **Giao diện (UI Components):** `StoreGrowthCenter` (`src/components/dashboard/store-growth-center.tsx`), `StoreJourneyHome` (`src/components/dashboard/store-journey-home.tsx`)
- **Tuyến API thực tế:** `GET /api/v1/orders/summary`, `GET /api/v1/usage`, `GET /api/v1/products`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `orders`, `order_items`, `products`, `media_assets` (truy vấn lọc theo `organization_id`, áp dụng select cột chính xác để tối ưu hiệu năng)
- **Cơ chế xử lý:** Tổng hợp số liệu qua Server Component, trả về kết quả đã gom nhóm mà không chạy vòng lặp lồng nhau.

---

```
========================================================================================
HÀNH TRÌNH 02: XEM MẪU HOA ĐANG ĐƯỢC YÊU THÍCH
========================================================================================
```

### Tầng 1: Tên chức năng
**Xem mẫu hoa đang được yêu thích**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm nhanh chóng biết được các kiểu cắm hoa, tông màu và khoảng giá đang được nhiều khách hàng tìm kiếm và quan tâm trên mạng xã hội, giúp tiệm chủ động chuẩn bị mẫu cắm phù hợp theo từng thời điểm.

### Tầng 3: Tác vụ
`Chọn dịp lễ hoặc loại hoa quan tâm ➔ Xem danh sách các mẫu hoa thịnh hành ➔ Xem video chi tiết dáng hoa ➔ Chọn mẫu để lấy ý tưởng cắm hoa hoặc viết bài`

*Các tùy chọn thao tác nhỏ:*
- **Lọc theo dịp tặng:** Chọn xem mẫu hoa sinh nhật, hoa khai trương, tốt nghiệp hoặc hoa kỷ niệm.
- **Xem dẫn chứng video thực tế:** Mở xem video ngắn quay cận cảnh bình hoa, giỏ hoa từ các nguồn tham khảo để quan sát cách phối màu và kết cấu cành.
- **Lấy ý tưởng mẫu hoa:** Bấm chọn mẫu hoa để tham khảo danh sách loại hoa và tông màu tương ứng.

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Danh mục các mẫu hoa thịnh hành được hệ thống chọn lọc kèm ảnh minh họa, video dẫn chứng thực tế, khoảng giá gợi ý và danh sách loài hoa thường dùng.
- **Ứng dụng thực tế (Use Case):** Thợ cắm hoa dùng làm mẫu tham khảo trực quan khi cắm hoa tại quầy hoặc làm ý tưởng để tạo nội dung ở các chức năng tiếp theo.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `market-intelligence-explore`
- **Giao diện (UI Components):** `MarketIntelligenceHome` (`src/components/market-intelligence/product-topics-list.tsx`), `video-evidence-catalog.ts`
- **Tuyến API thực tế:** `GET /api/v1/market-intelligence/opportunities`, `GET /api/v1/market-intelligence/topics`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `topics`, `topic_signals`, `topic_scores`, `market_opportunities` (và trạng thái lọc lưu tại `localStorage`)
- **Cơ chế xử lý:** Các adapter `tiktok-trend-adapter.ts` và `youtube-trend-adapter.ts` tổng hợp dữ liệu xu hướng, chuẩn hóa tiêu đề sạch qua hàm `formatCleanHook()` và hiển thị thẻ video dẫn chứng kép.

---

```
========================================================================================
HÀNH TRÌNH 03: TẠO THẺ SẢN PHẨM TỪ ẢNH
========================================================================================
```

### Tầng 1: Tên chức năng
**Tạo Thẻ sản phẩm từ ảnh**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm tạo thông tin sản phẩm mới từ một bức ảnh chụp hoa thật tại tiệm mà không cần tự tay gõ tên từng bông hoa, đếm số cành hay tính toán giá vốn và giá bán thủ công.

### Tầng 3: Tác vụ
`Tải ảnh chụp bó hoa hoặc giỏ hoa vừa cắm ➔ Kiểm tra danh mục loại hoa và số lượng cành ➔ Đặt giá bán mong muốn ➔ Bấm lưu sản phẩm vào danh mục`

*Các tùy chọn thao tác nhỏ:*
- **Nhận diện thành phần hoa:** Hệ thống bóc tách các loại hoa chính, hoa đệm, lá phụ và số lượng cành ước tính.
- **Chỉnh sửa từng thông số:** Nhấp chuột sửa trực tiếp tên hoa, số lượng cành, kích thước sản phẩm hoặc ghi chú bảo quản.
- **Thiết lập giá bán:** Nhập tỷ lệ lợi nhuận mong muốn để hệ thống gợi ý mức giá bán phù hợp dựa trên chi phí thành phần.

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Bản ghi thẻ sản phẩm mới trong danh mục hàng hóa của tiệm, bao gồm ảnh đại diện đã làm rõ nét, tên thương mại, bảng chi tiết từng loại hoa kèm số lượng cành và giá bán niêm yết.
- **Ứng dụng thực tế (Use Case):** Dùng để hiển thị trong bảng giá gửi khách, đưa vào album sản phẩm của tiệm hoặc chọn nhanh khi tạo đơn hàng mới.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `analyze-product-photo`
- **Giao diện (UI Components):** `SmartInputDropzone` (`src/components/journey/smart-input-dropzone.tsx`), `ReviewEditor` (`src/components/journey/review-editor.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/vision/analyze`, `POST /api/v1/products`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `products`, `product_variants`, `media_assets`
- **Cơ chế xử lý:** `Python Vision Worker` (`workers/vision/`) phân tích hình ảnh, nhận diện loài hoa và cấu trúc thành phần, trả về dữ liệu dạng trường nguyên tử có thể chỉnh sửa trực tiếp.

---

```
========================================================================================
HÀNH TRÌNH 04: TẠO THẺ BÁO GIÁ SẢN PHẨM
========================================================================================
```

### Tầng 1: Tên chức năng
**Tạo Thẻ báo giá sản phẩm**

### Tầng 2: Lợi ích thao tác
Cung cấp giải pháp báo giá linh hoạt với 2 phân hệ và 2 nguồn mẫu hoa tiện lợi (hiển thị đầy đủ trên cả Cửa hàng hoa và Điện hoa tại thời điểm hiện tại):
1. **Phân hệ 1 — Gửi khách mua hoa (Store Admin):** Giúp cửa hàng tạo nhanh một **bộ lựa chọn sản phẩm phù hợp** (3–5 mẫu trong tầm giá và dịp tặng) để gửi khách chọn mẫu qua Zalo/tin nhắn.
2. **Phân hệ 2 — Báo giá cho đối tác Shop (Điện Hoa):** Giúp tạo phiếu báo giá gia công cho Shop cắm hoa đối tác trong mạng lưới điện hoa, ghi rõ chi phí nhận cắm, yêu cầu mẫu và hạn chót giao hàng.

**Hai nguồn mẫu hoa áp dụng đồng bộ cho cả 2 phân hệ:**
- **📸 Ảnh sản phẩm mới (Tải ảnh lên):** User tải ảnh bó hoa mới chụp lên ➔ Hệ thống tự động phân tích loài hoa, bóc tách số cành, gợi ý giá bán ➔ Đưa ngay vào thẻ báo giá gửi khách hoặc phiếu gia công.
- **🏪 Ảnh từ kho Sản phẩm:** User lọc và chọn trực tiếp từ danh mục hoa có sẵn của tiệm theo ngân sách, dịp tặng và loại hoa.

---

### PHÂN HỆ IV-A: BÁO GIÁ CHO ĐỐI TÁC SHOP (ĐIỆN HOA)
- **Phạm vi hiển thị:** Hiển thị trực quan qua tab Báo giá đối tác Shop.
- **Hai phương thức chọn mẫu:**
  1. *Ảnh sản phẩm mới:* Tải ảnh mẫu hoa khách yêu cầu để hệ thống nhận diện thành phần hoa và tự động điền thông số cắm.
  2. *Ảnh từ kho sản phẩm:* Bấm chọn nhanh các mẫu hoa đã có sẵn trong kho tiệm.
- **Tác vụ:** `Chọn nguồn mẫu (Ảnh mới hoặc Kho hoa) ➔ Nhập giá trả cho đối tác & phí ship hỗ trợ ➔ Hẹn hạn chót cắm ➔ Bấm xuất phiếu báo giá gửi Shop`
- **Kết quả (Output):** Thẻ báo giá gia công cho đối tác hiển thị ảnh sản phẩm, chi tiết thành phần hoa, số cành, kích thước, mức giá đối tác được nhận, tổng tiền và hạn chót hoàn thành.
- **Ứng dụng thực tế (Use Case):** Gửi cho chủ tiệm hoa đối tác nhận đơn để họ nắm chính xác quy cách cắm và chi phí thanh toán.

---

### PHÂN HỆ IV-B: BÁO GIÁ CHO KHÁCH MUA HOA (STORE ADMIN)
- **Phạm vi hiển thị:** Hiển thị trực quan qua tab Gửi khách mua hoa.
- **Hai phương thức chọn mẫu:**
  1. *Ảnh sản phẩm mới:* Tải ảnh bó hoa vừa cắm tại quầy ➔ Hệ thống phân tích nhận diện hoa và gợi ý giá ➔ Bấm thêm vào bộ báo giá khách hàng.
  2. *Ảnh từ kho sản phẩm:* Lọc theo ngân sách (Dưới 500K, 500K–700K, 700K–1M, Trên 1M) và loại hoa (Bó hoa, Giỏ hoa, Hộp hoa, Bình hoa) từ kho hoa thật.
- **Tác vụ:** `Chọn nguồn hoa (Tải ảnh mới hoặc Chọn từ kho) ➔ Chọn các mẫu ưng ý đưa vào bộ thẻ ➔ Xem trước thẻ báo giá A6 ➔ Bấm sao chép nội dung hoặc tải ảnh gửi khách qua Zalo`
- **Kết quả (Output):** Bộ thẻ báo giá sản phẩm trang nhã (chuẩn A6) có ảnh rõ nét, tên hoa, giá bán, thành phần chính và hotline của tiệm.
- **Ứng dụng thực tế (Use Case):** Gửi trực tiếp qua Zalo, Messenger cho khách hàng xem và chọn mẫu, làm cơ sở chốt đơn nhanh chóng.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `create-product-quote`
- **Giao diện (UI Components):** `ProductQuoteBuilder` (`src/components/templates/shared/feature-guidance-card.tsx`), `ResultWorkspace` (`src/components/journey/result-workspace.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/pricing-rules`, `GET /api/v1/products`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `products`, `product_variants`
- **Cơ chế xử lý:** Template Engine kết hợp dữ liệu sản phẩm với mẫu hiển thị đã được định nghĩa sẵn, nội suy biến và kết xuất ra hình ảnh báo giá hoàn chỉnh.

---

```
========================================================================================
HÀNH TRÌNH 05: VIẾT NỘI DUNG BÀI ĐĂNG CHO CÁC NỀN TẢNG
========================================================================================
```

### Tầng 1: Tên chức năng
**Viết nội dung bài đăng cho các nền tảng**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm chuẩn bị nhanh các bài viết giới thiệu hoa kèm lời chúc mừng tinh tế theo từng dịp để đăng lên mạng xã hội mà không mất thời gian tự nghĩ câu từ.

### Tầng 3: Tác vụ
`Chọn ảnh mẫu hoa ➔ Chọn dịp tặng và giọng điệu mong muốn ➔ Xem các bài viết gợi ý ➔ Chỉnh sửa vài câu theo ý muốn ➔ Bấm sao chép nội dung`

*Các tùy chọn thao tác nhỏ:*
- **Chọn dịp tặng hoa:** Viết lời chúc mừng sinh nhật, khai trương cửa hàng, ngày kỷ niệm, ngày Nhà giáo hoặc hoa chia buồn.
- **Chọn giọng điệu:** Chọn giọng nhẹ nhàng tình cảm, giọng lịch thiệp trang trọng hoặc giọng tươi vui gần gũi.
- **Gắn thông tin tiệm hoa:** Tự động chèn số điện thoại đặt hoa, địa chỉ tiệm và lưu ý về thời gian giao hoa vào cuối bài viết.

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Đoạn văn bản hoàn chỉnh gồm tiêu đề, thông điệp ý nghĩa về loài hoa, lời chúc phù hợp theo dịp và thông tin liên hệ đặt hoa, đã được lưu vào bộ nhớ tạm để sẵn sàng dán.
- **Ứng dụng thực tế (Use Case):** Dán trực tiếp vào bài đăng trên trang Facebook, nhóm Zalo bán hàng hoặc bài đăng ảnh Instagram của tiệm.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `create-marketing-copy`
- **Giao diện (UI Components):** `ReviewEditor` (`src/components/journey/review-editor.tsx`), `PublishPanel` (`src/components/journey/publish-panel.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/creative-production/content-drafts`, `POST /api/v1/content-engine`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `products`, `jobs`
- **Cơ chế xử lý:** Cổng sinh nội dung trung tâm (`src/core/ports/`) điều phối tạo nội dung dựa trên thông tin thành phần hoa và ngữ cảnh dịp tặng được chọn, bảo đảm văn phong tiếng Việt tự nhiên.

---

```
========================================================================================
HÀNH TRÌNH 06: TẠO GIỌNG ĐỌC CHO BÀI ĐĂNG
========================================================================================
```

### Tầng 1: Tên chức năng
**Tạo giọng đọc cho bài đăng**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm chuyển các câu văn giới thiệu hoa thành giọng đọc diễn cảm kèm nhạc nền nhẹ nhàng mà không cần chủ tiệm phải tự thu âm bằng giọng của mình hoặc mất công tìm bài nhạc phù hợp.

### Tầng 3: Tác vụ
`Chọn đoạn văn bản giới thiệu hoa ➔ Chọn giọng đọc nam hoặc nữ ➔ Chọn giai điệu nhạc nền ➔ Bấm nghe thử ➔ Xuất tệp âm thanh hoàn chỉnh`

*Các tùy chọn thao tác nhỏ:*
- **Chọn giọng đọc:** Lựa chọn giọng miền Bắc hoặc miền Nam với chất giọng ấm áp, tự nhiên.
- **Chọn nhạc đệm:** Chọn tiếng đàn piano, guitar acoustic hoặc nhạc không lời nhẹ nhàng phù hợp với hoa tươi.
- **Nghe thử trước khi xuất:** Nghe thử đoạn 15 giây để kiểm tra độ hòa hợp giữa giọng đọc và nhạc nền trước khi tải về.

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Tệp âm thanh định dạng chuẩn kết hợp hài hòa giữa giọng đọc diễn cảm và nhạc đệm êm dịu, được lưu trong kho tư liệu của cửa hàng.
- **Ứng dụng thực tế (Use Case):** Dùng để lồng vào video quay hoa ở Hành trình 08 hoặc ghép vào các bài đăng video ngắn trên Facebook Reels, TikTok, Instagram Reels.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `create-audio-voiceover`
- **Giao diện (UI Components):** `WorkflowPreview` (`src/components/journey/workflow-preview.tsx`), `ResultWorkspace` (`src/components/journey/result-workspace.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/audio`, `POST /api/v1/creative-production/produce`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `media_assets`, `jobs`
- **Cơ chế xử lý:** Cổng âm thanh kết nối các dịch vụ tổng hợp giọng nói tiếng Việt, tự động cân bằng âm lượng giữa lời thuyết minh và tệp nhạc nền.

---

```
========================================================================================
HÀNH TRÌNH 07: TẠO ẢNH QUẢNG CÁO TỪ ẢNH GỐC
========================================================================================
```

### Tầng 1: Tên chức năng
**Tạo ảnh quảng cáo từ ảnh gốc**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm tách hoa khỏi nền chụp lộn xộn tại tiệm (vướng sàn nhà, kéo cắm hoa, dây ruy-băng) và ghép vào các khung cảnh gọn gàng, trang nhã mà không cần chuẩn bị góc chụp studio cầu kỳ.

### Tầng 3: Tác vụ
`Tải ảnh chụp hoa tại tiệm ➔ Chọn mẫu bối cảnh mong muốn ➔ Bấm tạo ảnh ➔ Chọn bức ảnh ưng ý nhất ➔ Lưu vào kho tư liệu hoặc tải về máy`

*Các tùy chọn thao tác nhỏ:*
- **Tách nền giữ nguyên hoa:** Tách bỏ phông nền phía sau, giữ trọn vẹn từng cánh hoa, nhụy hoa và lá phụ.
- **Chọn kiểu không gian:** Đặt bình hoa trên bàn gỗ mộc, bậu cửa sổ ngập nắng, bàn ăn tiệc cưới hoặc phòng khách trang nhã.
- **Chọn tỷ lệ ảnh:** Xuất ảnh theo tỷ lệ vuông (đăng Facebook, Zalo) hoặc tỷ lệ dọc (đăng tin ngắn).

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Bộ ảnh quảng cáo gồm các ảnh đã được thay bối cảnh mới và cân chỉnh ánh sáng, được lưu trong kho tư liệu của tiệm với các kích thước ảnh vuông và ảnh dọc.
- **Ứng dụng thực tế (Use Case):** Dùng làm ảnh bìa album, đăng bài giới thiệu hoa trên Facebook, Zalo hoặc làm ảnh đại diện sản phẩm trên website.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `create-marketing-image`
- **Giao diện (UI Components):** `SmartInputDropzone` (`src/components/journey/smart-input-dropzone.tsx`), `ResultWorkspace` (`src/components/journey/result-workspace.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/creative-production/scene-plans`, `POST /api/v1/creative-production/produce`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `media_assets`, `jobs`
- **Cơ chế xử lý:** `Python Media AI Worker` (`workers/media_ai/`) thực hiện tách nền và dựng bối cảnh, bảo đảm kiểm định giữ nguyên cấu trúc bó hoa gốc qua cổng Perceptual Integrity.

---

```
========================================================================================
HÀNH TRÌNH 08: TẠO VIDEO CHUYỂN ĐỘNG TỪ ẢNH HOA
========================================================================================
```

### Tầng 1: Tên chức năng
**Tạo video chuyển động từ ảnh hoa**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm biến bức ảnh hoa tĩnh thành một đoạn video ngắn có chuyển động lia góc nhẹ nhàng và ánh sáng lấp lánh để đăng lên mạng xã hội mà không cần máy quay chuyên nghiệp.

### Tầng 3: Tác vụ
`Chọn ảnh hoa mẫu ➔ Chọn kiểu chuyển động (lia gần / xoay nhẹ / lướt ngang) ➔ Chọn nhạc nền ➔ Bấm tạo video ➔ Tải video về máy`

*Các tùy chọn thao tác nhỏ:*
- **Chọn góc chuyển động:** Chọn kiểu lia ống kính từ xa lại gần, lướt ngang qua các bông hoa hoặc xoay nhẹ quanh bình hoa.
- **Hiệu ứng ánh sáng nhẹ:** Thêm vệt nắng sớm hoặc ánh sáng ấm áp để làm rõ màu sắc cánh hoa.
- **Ghép âm thanh:** Chọn ghép đoạn giọng đọc và nhạc nền đã tạo ở Hành trình 06 vào video.

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Tệp video ngắn mô phỏng chuyển động góc nhìn từ bức ảnh hoa gốc kèm nhạc nền êm dịu, được lưu trong kho tư liệu của tiệm.
- **Ứng dụng thực tế (Use Case):** Đăng lên các nền tảng video ngắn (Facebook Reels, TikTok, Instagram Reels) hoặc gửi qua tin nhắn cho khách hàng muốn xem hoa thực tế.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `create-product-video`
- **Giao diện (UI Components):** `WorkflowPreview` (`src/components/journey/workflow-preview.tsx`), `ResultWorkspace` (`src/components/journey/result-workspace.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/creative-production/video-assembly`, `GET /api/v1/video`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `media_assets`, `jobs`
- **Cơ chế xử lý:** `Python Video Worker` (`workers/media_ai/video/video_worker.py`) tiếp nhận yêu cầu dựng video theo kịch bản chuyển động, đóng gói tệp video định dạng chuẩn cho thiết bị di động.

---

```
========================================================================================
HÀNH TRÌNH 09: TẠO TRANG GIỚI THIỆU VÀ BÁN HOA
========================================================================================
```

### Tầng 1: Tên chức năng
**Tạo trang giới thiệu và bán hoa**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm tạo một trang web đơn giản hiển thị đầy đủ thông tin cửa hàng kèm danh mục các mẫu hoa và nút gọi điện đặt hàng, để gửi một đường link duy nhất cho khách xem thay vì phải gửi từng bức ảnh lẻ qua tin nhắn.

### Tầng 3: Tác vụ
`Chọn phong cách trang web ➔ Tích chọn các mẫu hoa muốn trưng bày ➔ Nhập lời giới thiệu và thông tin liên hệ của tiệm ➔ Bấm xuất bản ➔ Nhận đường link và mã QR`

*Các tùy chọn thao tác nhỏ:*
- **Tạo danh mục theo chủ đề:** Gom các mẫu hoa theo dịp (hoa ngày 20/10, hoa khai trương, hoa tốt nghiệp hoặc hoa cưới).
- **Cài đặt nút gọi nhanh:** Khách xem mẫu có thể bấm nút gọi hotline hoặc nút nhắn tin Zalo của tiệm ngay trên trang.
- **Tải mã QR:** Tải hình ảnh mã QR của trang web để in ra để tại quầy thanh toán cho khách quét xem thêm mẫu.

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Đường link trang web giới thiệu hoa đang hoạt động trực tuyến kèm mã QR chia sẻ, hiển thị đẹp mắt trên màn hình điện thoại di động của khách hàng.
- **Ứng dụng thực tế (Use Case):** Gắn vào phần giới thiệu trên trang Facebook/Zalo của tiệm hoặc gửi trực tiếp cho khách quen khi họ cần xem danh mục hoa để chọn mẫu.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `create-catalog-collection`
- **Giao diện (UI Components):** `PublishPanel` (`src/components/journey/publish-panel.tsx`), `ResultWorkspace` (`src/components/journey/result-workspace.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/catalog-links`, `GET /api/v1/catalog-links`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `catalog_links`, `products`
- **Cơ chế xử lý:** Module Landing Page Clean Architecture tổng hợp danh sách mẫu hoa và xuất bản liên kết công khai độc lập, bảo đảm tốc độ hiển thị nhanh trên điện thoại.

---

```
========================================================================================
HÀNH TRÌNH 10: TIẾP NHẬN & XỬ LÝ ĐƠN HÀNG (DÀNH CHO ĐIỆN HOA)
========================================================================================
```

### Tầng 1: Tên chức năng
**Tiếp nhận & Xử lý đơn hàng (Dành cho Điện Hoa)**

> **LƯU Ý PHÂN QUYỀN KIẾN TRÚC:** Hành trình này thuộc phạm vi **Điện Hoa Admin Only**. Được thiết kế chuyên biệt cho Chuyên viên Điều phối của Công ty Điện Hoa để tiếp nhận đơn và phân bổ cho các Shop đối tác trong mạng lưới. Không hiển thị trên Dashboard của Store Admin bán lẻ thông thường.

### Tầng 2: Lợi ích thao tác
Giúp chuyên viên điều phối điện hoa quản lý thông tin mạng lưới đơn hàng tập trung: lưu đầy đủ thông tin người gửi, người nhận, thời gian giao hoa, lời chúc mừng, chỉ định shop cắm và in ngay phiếu cắm hoa cho xưởng, phiếu giao hoa cho người chuyển phát.

### Tầng 3: Tác vụ
`Nhập thông tin người đặt và người nhận ➔ Chọn mẫu hoa và nhập nội dung thiệp mừng ➔ Hẹn giờ giao hoa ➔ Bấm lưu đơn ➔ Bấm in phiếu cắm hoa và phiếu giao hàng`

*Các tùy chọn thao tác nhỏ:*
- **Nhập nhanh từ đoạn chat:** Dán thông tin khách nhắn vào ô để hệ thống tự điền tên, số điện thoại và địa chỉ giao hàng.
- **In phiếu cắm hoa cho thợ:** Phiếu ghi rõ mẫu hoa cần cắm, tông màu, ghi chú đặc biệt của khách và thời hạn phải cắm xong.
- **In phiếu giao hàng:** Phiếu ghi rõ tên người nhận, địa chỉ giao, số điện thoại liên hệ và nội dung thiệp in sẵn để đính kèm lên hoa.

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Hồ sơ đơn hàng mới được lưu trên hệ thống kèm 2 phiếu in chuẩn hóa: phiếu cắm hoa cho thợ tại xưởng và phiếu giao hàng kèm lời thiệp cho nhân viên giao hoa.
- **Ứng dụng thực tế (Use Case):** Shop đối tác hoặc thợ cắm hoa cầm phiếu để cắm đúng mẫu; nhân viên giao hàng cầm phiếu để liên hệ người nhận đúng giờ hẹn.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `create-order`
- **Giao diện (UI Components):** `JourneyShell` (`src/components/journey/journey-shell.tsx`), `ReviewEditor` (`src/components/journey/review-editor.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/orders`, `GET /api/v1/orders`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `orders`, `order_items`, `customers`
- **Cơ chế xử lý:** Tầng Use-case xử lý giao dịch đơn hàng, tự động liên kết hồ sơ khách hàng và kết xuất biểu mẫu in phiếu cắm hoa, phiếu giao hàng đạt chuẩn A6.

---

```
========================================================================================
HÀNH TRÌNH 11: QUẢN LÝ KHÁCH HÀNG
========================================================================================
```

### Tầng 1: Tên chức năng
**Quản lý khách hàng**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm quản lý tập trung toàn bộ dữ liệu khách hàng thân thiết: nắm rõ khách đã từng mua hoa gì, hay mua vào dịp nào, thích hoa màu gì, nhắc nhớ các ngày kỷ niệm quan trọng (sinh nhật, ngày cưới) và tự động chuẩn bị nội dung tin nhắn để chủ động chăm sóc, bán lại.

### Tầng 3: Nhóm tác vụ
Quy trình tác vụ được cấu trúc thành **7 nhóm nghiệp vụ CRM cốt lõi**:
1. **Quản lý hồ sơ khách hàng:** Thêm khách mới, chỉnh sửa thông tin, tìm kiếm nhanh và ghi chú đặc điểm của khách.
2. **Xem lịch sử mua hàng:** Tra cứu danh sách các đơn đã đặt, mẫu hoa đã mua, giá trị đơn và tần suất mua hoa.
3. **Quản lý sở thích:** Lưu loài hoa yêu thích, tông màu chuộng, khoảng giá thường chi và dịp hay đặt hoa.
4. **Quản lý ngày quan trọng:** Lưu ngày sinh nhật của khách, ngày sinh nhật vợ/chồng, ngày kỷ niệm cưới hoặc ngày thành lập công ty.
5. **Phân nhóm khách hàng:** Phân loại theo nhóm (Khách mới, Khách thân thiết VIP, Khách mua định kỳ, Khách lâu chưa quay lại).
6. **Chăm sóc khách hàng:** Nhận thông báo nhắc ngày kỷ niệm sắp tới trong 3–7 ngày, chọn lời chúc viết sẵn và gửi tin nhắn.
7. **Gợi ý bán lại:** Dựa trên sở thích và lịch sử mua để tự động gợi ý mẫu hoa mới và khoảng giá phù hợp cho dịp sắp tới của khách.

### Tầng 4: Kết quả
- **A. Hồ sơ khách hàng:** Bản ghi hồ sơ khách hàng tập trung lưu thông tin liên lạc, lịch sử đơn hàng, sở thích hoa, ngày kỷ niệm và phân nhóm.
- **B. Lịch sử giao dịch:** Bảng kê đầy đủ các đơn hàng và mẫu hoa khách đã mua theo thời gian.
- **C. Lịch chăm sóc:** Danh sách các khách hàng có ngày kỷ niệm sắp diễn ra trong tuần được sắp xếp ưu tiên.
- **D. Gợi ý chăm sóc:** Đoạn tin nhắn chúc mừng cá nhân hóa kèm mẫu hoa gợi ý phù hợp với sở thích của khách.
- **E. Danh sách phân nhóm:** Bảng lọc khách hàng theo từng phân khúc phục vụ chiến dịch gửi tin nhắn ưu đãi của tiệm.
- **Ứng dụng thực tế (Use Case):** Chủ tiệm và nhân viên dùng để gọi điện hoặc nhắn tin Zalo chăm sóc khách quen trước ngày lễ/kỷ niệm, tư vấn đúng mẫu hoa khách thích.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `manage-customers`
- **Giao diện (UI Components):** `CustomerCRMWorkspace` (`src/components/journey/journey-shell.tsx`), `NextActions` (`src/components/journey/next-actions.tsx`)
- **Tuyến API thực tế:** `GET /api/v1/crm/customers`, `GET /api/v1/crm/reminders`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `customers`, `reminders`, `orders`
- **Cơ chế xử lý:** Hệ thống truy vấn các mốc nhắc hẹn trong bảng `reminders`, đối chiếu lịch sử đơn hàng để trả về danh sách ưu tiên chăm sóc khách hàng theo ngày.

---

```
========================================================================================
HÀNH TRÌNH 12: TẠO BỘ NỘI DUNG BÁN HOA TỰ ĐỘNG
========================================================================================
```

### Tầng 1: Tên chức năng
**Tạo bộ nội dung bán hoa tự động**

### Tầng 2: Lợi ích thao tác
Giúp chủ tiệm hoàn thiện trọn gói các công việc chuẩn bị cho một sản phẩm mới chỉ từ một bức ảnh chụp hoa tại tiệm: hệ thống sẽ lần lượt định giá, tạo ảnh bối cảnh, viết bài và chuẩn bị video để tiết kiệm tối đa thời gian thao tác.

### Tầng 3: Tác vụ
`Tải một bức ảnh hoa gốc ➔ Xem bảng kết quả tổng hợp (giá bán, ảnh bối cảnh, bài viết, video) ➔ Bấm lưu toàn bộ gói tư liệu sản phẩm`

*Hai chế độ thực hiện:*
- **⚡ Để hệ thống tự làm trọn gói (Khuyên dùng):** Đưa ảnh vào ➔ hệ thống tự động hoàn thiện tất cả các khâu ➔ xem lại kết quả hoàn chỉnh trong một màn hình duy nhất.
- **🛠️ Tự tay chọn từng bước:** Đi tuần tự từng bước từ tính giá ➔ chọn bối cảnh ảnh ➔ duyệt bài viết ➔ xuất video nếu muốn tự tay chỉnh sửa chi tiết từng phần.

### Tầng 4: Kết quả
- **Thứ hệ thống tạo ra (Output):** Gói tư liệu sản phẩm hoàn chỉnh được lưu đồng bộ trong hệ thống gồm: thẻ sản phẩm với bảng giá, bộ ảnh hoa ghép bối cảnh mới, bài viết giới thiệu theo dịp và video chuyển động.
- **Ứng dụng thực tế (Use Case):** Dùng để đăng bán lên mạng xã hội hoặc gửi cho khách hàng tham khảo.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `launch-product-combo`
- **Giao diện (UI Components):** `ActionContractWrapper` (`src/components/journey/action-contract-wrapper.tsx`), `WorkflowPreview` (`src/components/journey/workflow-preview.tsx`), `ResultWorkspace` (`src/components/journey/result-workspace.tsx`)
- **Tuyến API thực tế:** `POST /api/v1/creative-production/produce`, `POST /api/v1/creative-production/package`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `products`, `media_assets`, `jobs`
- **Cơ chế xử lý:** Bộ điều phối quy trình chạy chuỗi năng lực liên hoàn theo thứ tự: Phân tích thị giác ➔ Định giá ➔ Dựng bối cảnh ➔ Soạn bài viết ➔ Dựng video. Dữ liệu được bảo toàn trạng thái an toàn qua từng bước.

---

```
========================================================================================
HÀNH TRÌNH 13: TƯ VẤN VÀ NHẬN ĐƠN TỰ ĐỘNG
========================================================================================
```

### Tầng 1: Tên chức năng
**Tư vấn và nhận đơn tự động**

> **BẢN CHẤT NGHIỆP VỤ:** Đây là **Customer-facing AI Chatbot** phục vụ trực tiếp cho khách mua hoa của cửa hàng (triển khai tại Landing Page tiệm hoa, Zalo OA, Facebook Messenger). Khác biệt hoàn toàn với trợ lý vận hành nội bộ ALG Copilot.

### Tầng 2: Lợi ích thao tác
Giúp cửa hàng hoa luôn có một nhân viên tư vấn trực 24/7 trên các kênh chat: tự động chào hỏi khách, hiểu nhu cầu tặng hoa, tìm đúng mẫu hoa trong kho theo ngân sách, gửi ảnh báo giá và tiếp nhận đầy đủ thông tin giao hoa để tạo đơn hàng ngay cả khi chủ tiệm đang bận cắm hoa hoặc ngoài giờ làm việc.

### Tầng 3: Nhóm nghiệp vụ khách hàng
Quy trình trò chuyện khép kín giữa khách và Chatbot gồm **8 bước nghiệp vụ**:
1. **Lắng nghe nhu cầu:** Khách hỏi (Ví dụ: *"Shop có giỏ hoa sinh nhật tặng mẹ dưới 700K không?"*).
2. **Tìm kiếm theo tiêu chí:** Chatbot lọc kho sản phẩm thật theo dịp (sinh nhật), đối tượng (mẹ), ngân sách (dưới 700K).
3. **Hiển thị sản phẩm:** Chatbot trả về 3 mẫu hoa phù hợp nhất kèm ảnh rõ đẹp, tên hoa, giá bán và mô tả ngắn.
4. **So sánh và tư vấn:** Khách yêu cầu so sánh (Ví dụ: *"Cho mình xem mẫu nào tông màu hồng"*), Chatbot lọc lại mẫu hoa màu hồng.
5. **Hỏi gợi mở:** Khi khách chưa rõ nhu cầu, Chatbot hỏi khéo: *"Anh/chị tặng dịp gì?", "Ngân sách dự kiến khoảng bao nhiêu?"* để thu hẹp lựa chọn.
6. **Tiếp nhận thông tin đặt hoa:** Sau khi khách chốt mẫu, Chatbot lần lượt xin thông tin: tên người đặt, số điện thoại, tên người nhận, địa chỉ giao, thời gian giao và nội dung thiệp chúc mừng.
7. **Tạo đơn hàng tự động:** Chatbot tổng hợp toàn bộ thông tin và tạo bản ghi đơn hàng mới trên hệ thống ALG.
8. **Chuyển nhân viên khi cần:** Nếu khách có yêu cầu cắm mẫu hoa đặc biệt hoặc tình huống phức tạp, Chatbot chuyển tiếp cuộc hội thoại cho nhân viên tiệm tiếp quản.

### Tầng 4: Kết quả
- **Đối với khách mua hoa:** Nhận được phản hồi tức thì, danh sách mẫu hoa phù hợp đúng ngân sách, giá bán rõ ràng, được tư vấn chu đáo và nhận được tin nhắn xác nhận đơn hàng kèm mã đơn.
- **Đối với chủ tiệm hoa:** Nhận được thông tin khách hàng mới (Lead), lịch sử cuộc trò chuyện tư vấn và một đơn hàng mới đã được điền sẵn đầy đủ thông tin người nhận, lời thiệp và thời gian giao hoa.
- **Ứng dụng thực tế (Use Case):** Nhúng vào trang web bán hoa của tiệm, kết nối fanpage Facebook hoặc Zalo OA để nhận đơn tự động suốt ngày đêm.

### Tầng 5: Năng lực hệ thống thực tế (System Capability)
- **Mã hành trình:** `customer-service-chatbot`
- **Giao diện (UI Components):** `ChatbotChannelSettingsModal`, `ChatbotLivePreviewWidget`
- **Tuyến API thực tế:** `POST /api/v1/chat/conversations`, `POST /api/v1/chat/webhooks`, `GET /api/v1/chat/channels`
- **Cơ sở dữ liệu (Prisma Models):** Bảng `conversations`, `orders`, `products`, `customers`
- **Cơ chế xử lý:** Cổng hội thoại thông minh kết nối qua Webhook đa nền tảng, tích hợp trực tiếp với API truy vấn sản phẩm và API tạo đơn hàng của ALG.

---

## IV. BẢO TỒN VỊ TRÍ KIẾN TRÚC CỦA ALG COPILOT (TRỢ LÝ VẬN HÀNH NỘI BỘ)

Chức năng **ALG Copilot (Trợ lý vận hành nội bộ)** phục vụ nhân viên tiệm hoa tiếp tục được duy trì như một **Năng lực Hỗ trợ Toàn cục (Global Ambient Assistant)** trong hệ thống ALG:
- **Vị trí hiển thị:** Nút trợ lý nổi góc phải màn hình, menu Trợ giúp trên thanh điều hướng, hoặc phím tắt nhanh.
- **Nhiệm vụ:** Giải đáp thắc mắc về cách sử dụng phần mềm, hướng dẫn quy trình cắm hoa, tra cứu tính năng và mở nhanh các màn hình làm việc.
- **Tách biệt kiến trúc:** Không nằm trong danh mục 12 hành trình tác vụ bán hàng chính của Store Admin để tránh gây nhầm lẫn với Chatbot bán hàng cho khách ngoài (Journey 13).

---

## V. ĐỐI CHIẾU VÀ ĐỒNG BỘ MÃ NGUỒN THỰC TẾ (TRACEABILITY MATRIX V5.4)

| STT | Tên chức năng dân dã (V5.4) | ID Hành trình Codebase | Phạm vi phân quyền | UI Component thực tế | API Route thực tế | Database Models thực tế |
|:---:|---|---|---|---|---|---|
| 01 | Xem báo cáo | `view-store-overview` | Store + Điện Hoa | `StoreGrowthCenter`, `StoreJourneyHome` | `/api/v1/orders/summary`, `/api/v1/usage` | `orders`, `order_items`, `products` |
| 02 | Xem mẫu hoa đang được yêu thích | `market-intelligence-explore` | Store + Điện Hoa | `MarketIntelligenceHome`, `video-evidence-catalog.ts` | `/api/v1/market-intelligence/opportunities` | `topics`, `market_opportunities` |
| 03 | Tạo Thẻ sản phẩm từ ảnh | `analyze-product-photo` | Store + Điện Hoa | `SmartInputDropzone`, `ReviewEditor` | `/api/v1/vision/analyze`, `/api/v1/products` | `products`, `product_variants`, `media_assets` |
| 04 | Tạo Thẻ báo giá sản phẩm | `create-product-quote` | Store (Khách) / Điện Hoa (Shop + Khách) | `ProductQuoteBuilder`, `ResultWorkspace` | `/api/v1/pricing-rules`, `/api/v1/products` | `products`, `product_variants` |
| 05 | Viết nội dung bài đăng cho các nền tảng | `create-marketing-copy` | Store + Điện Hoa | `ReviewEditor`, `PublishPanel` | `/api/v1/creative-production/content-drafts` | `products`, `jobs` |
| 06 | Tạo giọng đọc cho bài đăng | `create-audio-voiceover` | Store + Điện Hoa | `WorkflowPreview`, `ResultWorkspace` | `/api/v1/audio`, `/api/v1/creative-production/produce` | `media_assets`, `jobs` |
| 07 | Tạo ảnh quảng cáo từ ảnh gốc | `create-marketing-image` | Store + Điện Hoa | `SmartInputDropzone`, `ResultWorkspace` | `/api/v1/creative-production/scene-plans` | `media_assets`, `jobs` |
| 08 | Tạo video chuyển động từ ảnh hoa | `create-product-video` | Store + Điện Hoa | `WorkflowPreview`, `ResultWorkspace` | `/api/v1/creative-production/video-assembly` | `media_assets`, `jobs` |
| 09 | Tạo trang giới thiệu và bán hoa | `create-catalog-collection` | Store + Điện Hoa | `PublishPanel`, `ResultWorkspace` | `/api/v1/catalog-links` | `catalog_links`, `products` |
| 10 | Tiếp nhận & Xử lý đơn hàng (Dành cho Điện Hoa) | `create-order` | **Điện Hoa Admin Only** | `JourneyShell`, `ReviewEditor` | `/api/v1/orders` | `orders`, `order_items`, `customers` |
| 11 | Quản lý khách hàng | `manage-customers` | Store + Điện Hoa | `CustomerCRMWorkspace`, `NextActions` | `/api/v1/crm/customers`, `/api/v1/crm/reminders` | `customers`, `reminders`, `orders` |
| 12 | Tạo bộ nội dung bán hoa tự động | `launch-product-combo` | Store + Điện Hoa | `ActionContractWrapper`, `WorkflowPreview` | `/api/v1/creative-production/produce` | `products`, `media_assets`, `jobs` |
| 13 | Tư vấn và nhận đơn tự động | `customer-service-chatbot` | Store + Điện Hoa | `ChatbotChannelSettingsModal`, `ChatbotLivePreviewWidget` | `/api/v1/chat/conversations`, `/api/v1/chat/webhooks` | `conversations`, `orders`, `products` |

---

## VI. TIÊU CHÍ NGHIỆM THU VÀ BẢO TRÌ (ACCEPTANCE CRITERIA V5.4)

1. **Journey 01:** Có đầy đủ 4 nhóm báo cáo (Kinh doanh, Sử dụng ALG, Kho tư liệu, Tổng quan tạo lập).
2. **Journey 02:** Giữ nguyên 100% nội dung V5.3.
3. **Journey 03:** Giữ nguyên 100% nội dung V5.3.
4. **Journey 04:** Phân tách rõ 2 loại báo giá (Đối tác Shop cho Điện hoa; Khách mua hoa từ Product Library thật cho Store + Điện hoa).
5. **Journey 05–09:** Giữ nguyên 100% nội dung V5.3.
6. **Journey 10:** Giữ nguyên quy trình nghiệp vụ nhưng phân định rõ phạm vi hiển thị: `Scope: Điện Hoa Admin Only`.
7. **Journey 11:** Đổi tên thành "Quản lý khách hàng" và mở rộng thành 7 nhóm tác vụ CRM & 5 nhóm Output.
8. **Journey 12:** Giữ nguyên 100% nội dung V5.3.
9. **Journey 13:** Chuyển đổi thành Customer-facing AI Chatbot ("Tư vấn và nhận đơn tự động").
10. **ALG Copilot:** Giữ nguyên trợ lý vận hành nội bộ, độc lập với Customer Chatbot.
11. **Ranh giới phân quyền:** Store Admin và Điện Hoa Admin không hiển thị lẫn lộn chức năng đặc thù của nhau.
12. **Không Phantom Capability:** 100% Component, API, CSDL trong Tầng 5 phản ánh mã nguồn thực tế.
13. **Chính tả:** Chuẩn hóa 100% từ ngữ, đặc biệt `Dành cho Điện Hoa` (không dùng `Giành`).
14. **Đồng bộ mã nguồn:** ID, `goal` và `description` trong `src/modules/journey/domain/journey-catalog.ts` khớp 100% với tài liệu này.
15. **Kiểm chuẩn chất lượng:** Vượt qua lệnh `npx tsc --noEmit` (0 lỗi) và `npm run lint:ux -- --check` (0 vi phạm).

---
*Tài liệu này là Nguồn sự thật duy nhất (SSOT) cho toàn bộ Hành trình Quản trị Cửa hàng của ALG. Mọi sửa đổi phải được đăng ký qua `docs/00-DOCUMENTATION-REGISTRY.yaml` và được Chủ sản phẩm phê duyệt.*
