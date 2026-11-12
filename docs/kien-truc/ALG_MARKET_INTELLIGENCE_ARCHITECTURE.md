# ĐẶC TẢ KIẾN TRÚC & KỸ THUẬT: ALG MARKET & PRODUCT INTELLIGENCE ENGINE

> **Mục tiêu tài liệu:** Thiết lập tài liệu Chuẩn Duy Nhất (Single Source of Truth - SSOT) về toàn bộ kiến trúc, ranh giới module, quy chuẩn dữ liệu, hệ thống dẫn chứng video kép (Dual Video Evidence Engine), và nguyên tắc chống tràn từ khóa thô (Anti-Keyword-Dumping Rule) của phân hệ **Market Intelligence & Product Intelligence** trong FloraOS-core.

---

## 1. Tổng Quan & Vai Trò Trong Hệ Sinh Thái ALG

Phân hệ **ALG Intelligence Engine** không phải là một dashboard theo dõi xu hướng tĩnh (Google Trends Dashboard thông thường), mà là một động cơ chuyển hóa thông tin thành hành động:

```
EVIDENCE (Dẫn chứng thực tế)
       ↓
SIGNALS (Tín hiệu thị trường & mạng xã hội)
       ↓
TRENDS (Xu hướng theo chu kỳ vòng đời)
       ↓
OPPORTUNITIES (Cơ hội thương mại xếp hạng)
       ↓
TOPICS & HOOKS (Kịch bản nội dung được tinh chỉnh)
       ↓
ACTIONS (Handoff 1-chạm sang AI Video Studio / Content Engine)
```

Hệ thống cung cấp hai chế độ tiếp cận tương hỗ:

1. **Market Intelligence (Nghiên cứu thị trường chủ động)**:
   - Trả lời câu hỏi: *"Thị trường hoa hiện tại đang biến động ra sao, xu hướng nào đang bứt phá, và tiệm nên làm nội dung gì ngay lúc này?"*
   - Cung cấp 4 góc nhìn chiến lược:
     - **Cơ hội quan trọng (`IMPORTANT`)**: Các cơ hội điểm cao (Score ≥ 60) có tiềm năng thương mại lớn.
     - **Xu hướng bứt phá (`RISING`)**: Các trào lưu đang trong pha tăng trưởng mạnh (`SURGING`), tương tác cao.
     - **Chủ đề nên làm (`TOPICS`)**: Thư viện kịch bản, câu mở đầu (Hooks) giật tít để quay video ngắn.
     - **Mùa vụ & Dịp tới (`OCCASIONS`)**: Đón đầu các ngày lễ (20/10, 8/3, tốt nghiệp, sinh nhật...).

2. **Product Intelligence (Định vị & thẩm định sản phẩm có sẵn)**:
   - Trả lời câu hỏi: *"Tiệm đã có mẫu hoa này, làm sao để biết nó có hợp thời không, bán cho ai, định vị ra sao và quay video gì?"*
   - Nạp 1–3 ảnh sản phẩm thực tế → Bóc tách đặc tính → Đối chiếu với Shared Market Intelligence Core → Chấm điểm `Trend Fit`, `Audience Fit`, `Content Fit` và đề xuất 10 góc tiếp thị.

---

## 2. Các Nguyên Tắc Thiết Kế Bất Biến (Architectural Invariants)

Bất kỳ thay đổi mã nguồn nào trong phân hệ Market Intelligence bắt buộc phải tuân thủ 6 nguyên tắc cốt lõi:

### 2.1. Chuẩn Dẫn Chứng Video Kép & Xem Video Trực Tiếp Tại Chỗ (Dual-Platform Video Evidence & In-Place Video Player)
- **Quy tắc bắt buộc**: Mỗi cơ hội hoặc xu hướng hiển thị trên giao diện không được dùng ảnh minh họa chung chung không nguồn gốc. Thay vào đó, bắt buộc phải hiển thị **cặp thumbnail dẫn chứng video thực tế từ 2 nền tảng**:
  1. **TikTok**: Video định dạng dọc (9:16), có nhãn nền tảng `TikTok` đen neon, nút Play overlay, tên kênh người sáng tạo thực tế (vd: `@hoatuoituongan`, `@queenflowers`, `@tiemhoanangxuan`...), và số liệu tương tác thật (`42.6k tim`, `28.4k tim`...).
  2. **YouTube**: Video định dạng ngang (16:9), có nhãn nền tảng `YT` đỏ, nút Play overlay, và tên kênh YouTube tương ứng.
- **Tương tác trực tiếp & Trình phát Video tại chỗ (In-Place Video Preview)**:
  - Cả hai thumbnail đều là các phần tử tương tác độc lập (`cursor-pointer`), bắt sự kiện riêng biệt (`e.stopPropagation()`).
  - **Bảng Vàng Quán Quân Chu Kỳ (`TopChampionsBlock`)**: Khi người dùng nhấp chuột vào hình ảnh/video thumbnail, hệ thống **hiển thị và phát luôn video trực tiếp tại chỗ** thông qua component chuyên dụng [`VideoPreviewModal`](../../src/components/market-intelligence/video-preview-modal.tsx) (nhúng iframe YouTube HD, `autoplay=1`, không tải lại trang, không chuyển tab ngoài gây đứt đoạn trải nghiệm).
  - Modal hỗ trợ phím `Escape`, nút `X`, hoặc click ra vùng tối ngoài backdrop để đóng; đồng thời cung cấp link mở rộng sang YouTube/TikTok nếu cần.
  - Khi nhấp vào vùng nội dung hoặc nút **"Chi tiết →"**, hệ thống giữ nguyên hành vi mở Drawer kịch bản & câu chuyện thị trường.
- **Triển khai SSOT**: Quản lý tập trung tại [`video-evidence-catalog.ts`](../../src/components/market-intelligence/video-evidence-catalog.ts), các mẫu video tuần mới nhất tại [`video-catalog-presets.ts`](../../src/modules/market-intelligence/domain/video-catalog-presets.ts), và trích xuất qua `getDualOpportunityEvidencePreview(item)`.


### 2.2. Quy Tắc Nghiêm Ngặt Chống Tràn Từ Khóa Thô (Strict Anti-Keyword-Dumping Rule)
- **Vấn đề cần triệt tiêu**: Trong quá trình thu thập tín hiệu tìm kiếm (Google Trends, TikTok Search), chuỗi từ khóa đầu vào thường gồm 5–10 cụm từ nối nhau bằng dấu phẩy (vd: `Hoa 20/10, Bó hoa tốt nghiệp hướng dương, Hoa cưới mùa thu, Hoa cưới tone cam cháy...`).
- **Luật bất biến**:
  1. **Tuyệt đối CẤM** render chuỗi từ khóa nối phẩy lên bất kỳ huy hiệu tag (`<Tag />`) hoặc thẻ nào trên UI.
  2. **Tuyệt đối CẤM** chèn chuỗi từ khóa thô vào trong tiêu đề cơ hội hoặc câu trích dẫn kịch bản (quotes/hooks).
  3. **Bộ lọc làm sạch (Sanitization Pipeline)**:
     - **Tiêu đề**: Đi qua `getOpportunityHeadline(item)` tại [`opportunity-illustration.ts`](../../src/components/market-intelligence/opportunity-illustration.ts) để chuẩn hóa thành câu tiêu đề marketing tinh tế (vd: *"BST Hoa 20/10 thanh lịch dẫn đầu xu hướng năm nay"*).
     - **Kịch bản (Hooks)**: Đi qua `formatCleanHook(hook)` để tạo thành câu thoại kịch bản tự nhiên, mượt mà và ấm áp chuẩn phong cách tiệm hoa cao cấp.
     - **Cơ sở dữ liệu (`topics`)**: Cơ sở dữ liệu phải được làm sạch, không lưu trữ các bản ghi chủ đề là chuỗi nối phẩy của nhiều từ khóa. Nếu phát hiện dữ liệu thô, phải tự động chuẩn hóa hoặc sáp nhập về chủ đề gốc.

### 2.3. Quy Chuẩn Bóc Tách Thị Giác Cấu Trúc Hoa Thật & Phụ Liệu (Multimodal Vision AI & Atomic Accessories OCR)
- **Vấn đề cần triệt tiêu**: Tránh tuyệt đối việc trả về dữ liệu mẫu cố định (hardcoded data) như "Hoa hồng kem dâu" cho mọi hình ảnh tải lên, hoặc chỉ nhận diện hoa chính mà bỏ sót lá đệm, thiệp chúc mừng, nơ ruy băng và giấy gói.
- **Luật bất biến**:
  1. **Multimodal Vision Thật**: Hệ thống bắt buộc phải quan sát trực tiếp dữ liệu nhị phân của bức ảnh thông qua mô hình đa phương thức (qua cổng AI — `product-vision-ai-adapter.ts` + `product-vision-prompt.ts`; nhà cung cấp theo thứ tự ưu tiên của tiệm: Claude / OpenAI / Gemini — 25/09/2026).
  2. **Xử lý Ảnh Base64 Data URL**: Tại Frontend ([`product-upload-card.tsx`](../../src/components/market-intelligence/product-upload-card.tsx)), khi người dùng kéo thả file, `FileReader` lập tức chuyển đổi thành Base64 Data URL (`data:image/...;base64,...`) để truyền an toàn sang server, khắc phục giới hạn không thể fetch `blob:` URL cục bộ của trình duyệt.
  3. **Đồng Bộ Hai Chiều Props ↔ State**: Giao diện xác nhận ([`product-confirmation-card.tsx`](../../src/components/market-intelligence/product-confirmation-card.tsx)) bắt buộc có hook phản ứng đồng bộ lại state nội bộ khi dữ liệu Vision AI trả về, bảo đảm người dùng luôn thấy đúng kết quả phân tích theo ảnh vừa tải lên.
  4. **Tách Biệt Nguyên Tử (Atomic Disaggregated Fields) Cho Hoa & Phụ Liệu**:
     - **Hoa chính & hoa phụ**: Tên hoa, số lượng, đơn vị, màu sắc, vai trò (`dominant`/`supporting`).
     - **Lá & cành đệm (Foliage)**: Phân tách riêng khỏi hoa, bóc tách tên lá (Eucalyptus, lá chanh, lá đuôi chồn...), số cành, màu sắc, vai trò đệm.
     - **Thiệp & Biển chúc mừng (Card & Banner OCR)**: AI Vision quét chữ in/viết trên thiệp/banner (`printedText`), phân loại thiệp (thiệp gập, tag mini, biển mica, banner) làm căn cứ phân loại mục đích sử dụng (sinh nhật, kỷ niệm, 20/10, khai trương...).
     - **Nơ & Ruy băng**: Bóc tách chất liệu (satin, voan, thừng...), màu sắc, kiểu dáng thắt.
     - **Giấy gói & Bao bì**: Bóc tách lớp gói, chất liệu giấy (Kraft, lụa mờ...), màu sắc giấy.
     - **Phụ kiện decor**: Quản lý nguyên tử đèn led, gấu bông, topper... có nút Thêm / Sửa / Xóa từng dòng qua component [`ProductPackagingCard`](../../src/components/market-intelligence/product-packaging-card.tsx).
  5. **Đồng bộ hóa toàn hệ thống**: Dữ liệu bóc tách được đồng bộ thống nhất giữa Chặng 02 Product Intelligence (`/thi-truong`), Tab M01a & Thẻ Chào Zalo (`/tai-anh`), và các tầng Domain Model.

### 2.4. Nghiên Cứu Tập Trung 1 Lần & Cá Nhân Hóa Theo Tenant (Shared Intelligence Core)
- Hệ thống nghiên cứu thị trường tập trung cấp nền tảng (Shared Intelligence), không để từng cửa hàng hoa phải chạy lại toàn bộ quy trình thu thập dữ liệu nặng nề.
- Dữ liệu xu hướng chung được phân phối và **cá nhân hóa theo từng tenant** dựa trên:
  - Danh mục sản phẩm hiện có của tiệm.
  - Vị trí địa lý và phân khúc khách hàng của tiệm.
  - Lịch trình quét thị trường tự động (Scheduled Pulse) do tiệm thiết lập.

### 2.5. Cách Ly Dữ Liệu Đa Tenant Tuyệt Đối (Strict Tenant Isolation)
- Cấu hình lịch quét thị trường (`TenantScheduleSettings`), tiêu chí quản trị SaaS (`SaaSAdminCriteria`) và kết quả thẩm định ảnh sản phẩm (`ProductIntelligenceAnalysis`) luôn gắn chặt với `organization_id` giải từ phiên máy chủ.
- Kiểm tra tính cách ly đa tenant qua bộ kiểm thử tự động tại `tests/tenant/`.

### 2.6. Handoff 1-Chạm Sang Quy Trình Sản Xuất (One-Click Production Handoff)
- Market Intelligence không dừng lại ở mức xem báo cáo:
  - Nút **"Sao chép"**: Copy nhanh kịch bản đã làm sạch vào clipboard để gửi Zalo hoặc dán vào bài đăng Facebook.
  - Nút **"Tạo Video"**: Deep link trực tiếp sang phân hệ AI Video Studio (`/video?prompt=...`), tự động điền kịch bản và chủ đề vào Storyboard Creator để render video marketing 9:16 chuẩn TikTok/Reels ngay tức thì.
  - Nút **"Tạo ảnh biến thể"**: Deep link sang M04b Studio Biến Thể Ảnh (`/tai-anh?topic=...&source=...`) mang theo Asset ID ảnh gốc để sinh ảnh phông nền, watermark.

### 2.7. Tuân Thủ Ranh Giới Kiến Trúc Sạch (Clean Architecture & SRP)
- Kích thước mọi file thành phần phải nghiêm ngặt `< 350 dòng`.
- Phân tách rõ ràng:
  - `domain/`: Định nghĩa kiểu dữ liệu thuần, ma trận vòng đời sóng (`trend-lifecycle.ts`), thuật toán chấm điểm cơ hội (`scoring.ts`), phân loại thị trường (`market-taxonomy.ts`). Cấm import Prisma hoặc React.
  - `use-cases/`: Điều phối luồng nghiệp vụ.
  - `infra/`: Kết nối cơ sở dữ liệu và adapter bên ngoài (Google Trends, TikTok Scraper, Social Signals).
  - `components/`: UI components chuyên biệt, độc lập trách nhiệm (Single Responsibility Principle).

---

## 3. Cấu Trúc Thư Mục & Phân Hệ Thành Phần

```
src/
├── modules/market-intelligence/
│   ├── domain/                               # Tầng nghiệp vụ thuần TypeScript (0 DB, 0 React)
│   │   ├── trend-lifecycle.ts                # Chu kỳ sóng (EMERGING, SURGING, PEAK, EVERGREEN)
│   │   ├── trend-timeframe.ts                # Phân bổ khung thời gian & logic Quán quân chu kỳ (WEEK, MONTH, QUARTER, HALF_YEAR, YEAR)
│   │   ├── video-catalog-presets.ts          # Mẫu video dẫn chứng thời sự tuần mới nhất & thuật toán deterministic hash
│   │   ├── scoring.ts                        # Công thức tính điểm cơ hội (Opportunity Score 0-100)
│   │   ├── market-taxonomy.ts                # Bảng danh mục ngành hoa, dịp lễ, phong cách, tone màu
│   │   ├── tenant-schedule-settings.ts       # Cấu hình chu kỳ quét Pulse theo tenant
│   │   └── product-trend-fit.ts              # Thuật toán so khớp ảnh sản phẩm với xu hướng
│   ├── use-cases/                            # Tầng điều phối nghiệp vụ
│   └── infra/                                # Tầng hạ tầng, adapters và repository
│
├── components/market-intelligence/            # Tầng giao diện người dùng chuyên biệt
│   ├── top-champions-block.tsx               # Bảng Vàng Xu Hướng: Quán Quân Chu Kỳ (Click thumbnail xem video, click chi tiết mở drawer)
│   ├── video-preview-modal.tsx               # Trình phát video trực tiếp tại chỗ (YouTube embed HD, autoplay, responsive modal)
│   ├── brief-important-view.tsx              # Tab 1: Cơ hội quan trọng (Dual Video Evidence + Clean Badges)
│   ├── brief-rising-view.tsx                 # Tab 2: Xu hướng bứt phá (Dual Video Evidence + Momentum)
│   ├── brief-topics-view.tsx                 # Tab 3: Chủ đề nên làm (Thư viện kịch bản + Clean Hooks)
│   ├── brief-occasions-view.tsx              # Tab 4: Mùa vụ & Dịp tới (Upcoming Occasions)
│   ├── opportunity-card.tsx                  # Thẻ cơ hội dạng lưới (Grid View Card)
│   ├── opportunity-detail-drawer.tsx         # Drawer xem toàn diện chi tiết cơ hội và video player
│   ├── video-evidence-catalog.ts             # Từ điển SSOT chứa dữ liệu dẫn chứng video thật (TikTok & YT)
│   ├── opportunity-illustration.ts           # Adapter trích xuất evidence kép và làm sạch headline
│   ├── scheduled-pulse-panel.tsx             # Panel thông tin lịch quét tự động định kỳ
│   ├── saas-admin-criteria-modal.tsx         # Modal quản trị tiêu chí quét ngành hoa cấp SaaS
│   ├── product-intelligence-tab.tsx          # Tab thẩm định sản phẩm có sẵn (Upload 1-3 ảnh)
│   └── settings/
│       └── settings-schedule-tab.tsx         # Tab cài đặt chu kỳ quét thị trường của tiệm
│
└── app/
    ├── (app)/market-intelligence/page.tsx    # Trang chính phân hệ Market Intelligence
    └── api/v1/market-intelligence/
        ├── product-intelligence/route.ts     # API phân tích độ khớp sản phẩm
        └── ...
```

---

## 4. Hệ Thống Dẫn Chứng Video Kép (Dual Video Evidence)

### 4.1. Hợp Đồng Dữ Liệu Dẫn Chứng (`OpportunityEvidencePreview`)

```typescript
export interface VideoEvidenceItem {
  platform: "tiktok" | "youtube";
  thumbnailUrl: string;
  videoUrl: string;
  title: string;
  author: string;
  views: number;
  metrics: string; // VD: "42.6k tim", "8.2k xem"
  alt: string;
}

export interface OpportunityEvidencePreview {
  tiktok: VideoEvidenceItem;
  youtube: VideoEvidenceItem;
  headline: string;
  sourceKeyword: string;
}
```

### 4.2. Từ Điển Dẫn Chứng Chuẩn SSOT (`video-evidence-catalog.ts` & `video-catalog-presets.ts`)
- Lưu trữ bộ sưu tập dẫn chứng video hoa tươi thực tế đã được xác minh (luôn cập nhật thời gian thực trong tuần, loại bỏ video cũ năm trước):
  - **Chủ đề Ngày 20/10 / Phụ Nữ Việt Nam**: Kênh `@liamchannel` (TikTok) và video mẫu cắm giỏ hoa tặng mẹ ý nghĩa tuần này (YouTube).
  - **Chủ đề Hoa Cưới Tone Cam Cháy / Mùa Thu**: Kênh `@queenflowers` (TikTok) và hướng dẫn mẫu hoa cưới cầm tay cô dâu tone màu hot trend (YouTube).
  - **Chủ đề Bó Hoa Tốt Nghiệp Hướng Dương**: Video trao hoa lễ tốt nghiệp (TikTok) và video thiết kế bó hoa hướng dương chúc mừng tân cử nhân (YouTube).
  - **Chủ đề Khai Trương / Tài Lộc Doanh Nghiệp**: Kênh `@hoatuoituongan` (TikTok) và bí quyết cắm kệ hoa tươi khai trương rực rỡ (YouTube).
  - **Chủ đề Giỏ Hoa Tặng Mẹ / Sinh Nhật**: Video giỏ hoa cúc mẫu đơn và hoa hồng kem pastel.

### 4.3. Trình Phát Video Trực Tiếp Tại Chỗ (`VideoPreviewModal`)
- **Tệp nguồn**: [`src/components/market-intelligence/video-preview-modal.tsx`](../../src/components/market-intelligence/video-preview-modal.tsx) (182 dòng, SRP chuẩn mực).
- **Trích xuất Video ID đa năng (`extractYouTubeVideoId`)**:
  - Tự động nhận diện và trích xuất YouTube Video ID từ mọi định dạng: `watch?v=`, `youtu.be/`, `embed/`, `shorts/`, hoặc cả đường dẫn CDN thumbnail `i.ytimg.com/vi/ID/...`.
- **Trải nghiệm phát video**:
  - Nhúng trình phát YouTube bảo mật không cookie `youtube-nocookie.com/embed/{id}?autoplay=1&rel=0` tỷ lệ 16:9, hình ảnh và âm thanh chất lượng cao.
  - Tự động phát ngay lập tức khi mở (`autoplay=1`).
  - Hỗ trợ đóng nhanh: Phím `Escape`, nút `X`, hoặc click ra vùng tối ngoài backdrop.
  - Cung cấp liên kết dự phòng trực tiếp sang YouTube hoặc TikTok nếu người dùng muốn mở ứng dụng ngoài.

---

## 5. Quy Chuẩn Làm Sạch Dữ Liệu & Chống Tràn Từ Khóa

```
DỮ LIỆU CRAWL / GENERATOR THÔ:
"Hoa 20/10, Bó hoa tốt nghiệp hướng dương, Hoa cưới mùa thu, Hoa cưới tone cam cháy..."
                       │
                       ▼
          [BỘ LỌC LÀM SẠCH ALG]
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
getOpportunityHeadline()        formatCleanHook()
        │                             │
        ▼                             ▼
"BST Hoa 20/10 thanh lịch        "Bật mí bí quyết chọn Hoa 20/10
dẫn đầu xu hướng năm nay"        chuẩn gu & đong đầy tình cảm..."
        │                             │
        └──────────────┬──────────────┘
                       ▼
           GIAO DIỆN NGƯỜI DÙNG:
- Không còn tag chứa 10 từ khóa nối phẩy.
- Thẻ phân loại tinh gọn: ⚡ Bắt trend, 🎨 Hướng dẫn, 🎁 Quà tặng.
- Huy hiệu tương tác thực tế: ⚡ 42.6k tim • TikTok.
- Cặp thumbnail video TikTok + YouTube rõ ràng, chân thực.
```

### 5.2. Chuỗi Bóc Tách Sản Phẩm & Lựa Chọn Tiến Trình (Pipeline Handshake & Progressive Selection)

Quy trình bóc tách ảnh sản phẩm hoa tươi tuân thủ triệt để nguyên lý: **"Output của bước trước là Perfect Input của bước sau"**, bảo đảm người dùng chủ động chọn lựa tại từng chặng:

```
[BƯỚC 1: BRING - Tải ảnh / Chọn Catalog]
   │ Người dùng kéo thả ảnh hoa hoặc chọn mẫu từ Catalog tiệm
   │ Frontend chuyển ảnh thành Base64 Data URL (data:image/...;base64,...)
   ▼ Bấm: "Bóc tách Cấu trúc Hoa (Vision AI) →"
[BƯỚC 2: UNDERSTAND - Kết quả Vision AI & Lựa Chọn Hướng Nghiên Cứu]
   │ OpenAI Multimodal Vision (gpt-4o-mini) bóc tách cấu trúc nguyên tử: loài hoa, số cành, bảng màu, kiểu cắm, bao gói, nơ, dịp tặng
   │ Người dùng có thể sửa trực tiếp từng thông số mà không làm vỡ cấu trúc dữ liệu
   │ 🎯 KHỐI CHỌN HƯỚNG: Domain Synthesizer sinh các cụm từ khóa nghiên cứu sát sườn (primaryKeywords, flowerColorQuery...)
   │ Người dùng tick chọn các hướng muốn AI tập trung đối soát
   ▼ Bấm: "Tiến hành Khám phá Trend Fit (Bước 3) →"
[BƯỚC 3: DISCOVER - Kết quả Trend Fit & Khuyến Nghị 3 Vùng]
   │ Ma trận đối soát Product Trend Fit Matrix phân tích mức độ ăn khớp với tín hiệu thị trường
   │ Đánh giá 3 chỉ số: Trend Fit Score, Audience Fit Score, Content Fit Score
   │ Phân bổ khuyến nghị 3 vùng: KEEP (Điểm mạnh), IMPROVE (Cải tiến), TEST (Thử nghiệm)
   ▼ Cuộn mượt mà xuống danh sách chủ đề
[BƯỚC 4: IDEATE - 10 Chủ Đề Nội Dung Kèm Dẫn Chứng Video Kép]
   │ Bộ lọc góc tiếp cận: Sản phẩm, Bí quyết, Gỡ rối quà tặng, Chạm cảm xúc, Bắt trend
   │ 10 Thẻ chủ đề hiển thị Dẫn chứng Video Kép chuẩn repo: TikTok 9:16 + YouTube 16:9 (nhấp chuột mở video thật)
   │ 🎯 NGƯỜI DÙNG CLICK "CHỌN CHỦ ĐỀ NÀY":
   │ Viền nổi bật (border-2 border-rose-500) và kích hoạt Banner định hướng chiến dịch
   ▼
[BƯỚC 5: CHOOSE / HANDOFF - Bàn Giao 1-Chạm Sang Studio]
   │ 🎬 "Dựng video với chủ đề này": Deep link sang M04c AI Video Studio (/video?prompt=...&hook=...&style=...)
   │ 🖼️ "Tạo ảnh biến thể": Deep link sang M04b Studio Biến Thể Ảnh (/tai-anh?topic=...&source=...)
```

---

## 6. Ma Trận Vòng Đời Xu Hướng & Chấm Điểm Cơ Hội

### 6.1. Bốn Pha Vòng Đời Xu Hướng (`TrendLifecycleStage`)
1. **`EMERGING` (Mới chớm)**: Tốc độ tăng trưởng tìm kiếm cao (> 50%), tương tác video bắt đầu bùng nổ, mức độ cạnh tranh thị trường thấp. Phù hợp cho tiệm đi đầu đón sóng.
2. **`SURGING` (Đang tăng mạnh)**: Độ quan tâm tăng phi mã (> 100%), video viral xuất hiện dày đặc, nhu cầu đặt hoa tăng đột biến. Phù hợp làm video TikTok/Reels để hút tương tác.
3. **`PEAK` (Đỉnh điểm)**: Lưu lượng tìm kiếm đạt mức cao nhất, cạnh tranh khốc liệt. Phù hợp tung các chương trình khuyến mãi chốt đơn nhanh.
4. **`EVERGREEN` (Bền vững / Ổn định)**: Nhu cầu ổn định quanh năm (hoa sinh nhật, hoa khai trương tone đỏ/vàng).

### 6.2. Công Thức Chấm Điểm Cơ Hội (`Opportunity Score`)

$$\text{Score} = w_s \cdot S_{\text{search}} + w_v \cdot S_{\text{viral}} + w_c \cdot S_{\text{commercial}} + w_t \cdot S_{\text{trend\_fit}}$$

- $S_{\text{search}}$: Điểm tăng trưởng lưu lượng tìm kiếm từ Google Trends (0–100).
- $S_{\text{viral}}$: Điểm tương tác từ lượt xem/thả tim video TikTok & YouTube (0–100).
- $S_{\text{commercial}}$: Tính thương mại và khả năng sinh lời thực tế của sản phẩm hoa (0–100).
- $S_{\text{trend\_fit}}$: Mức độ tương thích với năng lực và kho hoa của tiệm (0–100).
- **Ngưỡng hiển thị**: Cơ hội có điểm $\ge 60$ được đưa vào danh sách **"Cơ hội quan trọng"** (`brief-important-view.tsx`).

---

## 7. Quy Trình Kiểm Thử & Nghiệm Thu (Quality Gate)

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Bắt buộc thoát mã 0, không có lỗi kiểu.*

2. **Unit Tests Tầng Domain & Pipeline Handshake**:
   ```bash
   npx vitest run tests/unit/market-intelligence/
   ```
   *Bao phủ 8 bộ kiểm thử: `product-pipeline-handshake.test.ts`, `synthesize-product-queries.test.ts`, `trend-fit.test.ts`, `trend-lifecycle.test.ts`, `scoring.test.ts`, `market-taxonomy.test.ts`, `tenant-schedule-settings.test.ts`, `google-trends-adapter.test.ts` (32/32 test xanh 100%).*

3. **Tenant Isolation Verification**:
   ```bash
   npm run test:tenant
   ```
   *Bảo đảm cách ly dữ liệu giữa các tổ chức tuyệt đối (27/27 tệp, 206/206 test xanh).*

4. **Kiểm Soát Giới Hạn File (SRP Limit)**:
   ```bash
   wc -l src/components/market-intelligence/*.tsx
   ```
   *Mọi file giao diện và logic đều phải dưới 350 dòng.*
