# SỔ TAY KIẾN TRÚC & QUY CHUẨN TEMPLATE HỆ THỐNG ALG (SSOT)
## (ALG Standardized Template System — Single Source of Truth)

> **Mã tài liệu:** `ALG-SSOT-TEMPLATES-V1`  
> **Phiên bản:** 1.1 (Production Standard — đồng bộ lại với code thật 17/09/2026, P-Fix-5)  
> **Cập nhật:** 17/09/2026 (bản 14/09 để lại nhiều chỗ lệch với code thật — xem chi tiết trong từng mục "thêm 17/09, P-Fix-5")  
> **Phạm vi áp dụng:** Toàn bộ mã nguồn `src/components/templates/`, `src/core/templates/` và tất cả các màn hình giao diện của ALG.  
> **Mục đích:** Tài liệu duy nhất chứa toàn bộ cấu trúc, thông số kỹ thuật (Props, Token, Layout), hướng dẫn tra cứu, chỉnh sửa và nâng cấp mọi template trong toàn hệ thống.

---

## MỤC LỤC

1. [Triết lý Thiết kế & Bộ Quy chuẩn Bắt buộc](#1-triết-lý-thiết-kế--bộ-quy-chuẩn-bắt-buộc)
2. [Cấu trúc Thư mục Tổng thể & Bản đồ 10 Chức năng](#2-cấu-trúc-thư-mục-tổng-thể--bản-đồ-10-chức-năng)
3. [Đặc tả Chi tiết Từng Template Theo 10 Chức Năng](#3-đặc-tả-chi-tiết-từng-template-theo-10-chức-năng)
   - [Chức năng 1: Phân tích Ảnh Sản phẩm (Product Analysis M01)](#chức-năng-1-phân-tích-ảnh-sản-phẩm-product-analysis-m01)
   - [Chức năng 2: Studio Sáng tạo Ảnh (Creative Studio M04)](#chức-năng-2-studio-sáng-tạo-ảnh-creative-studio-m04)
   - [Chức năng 3: Studio Video Ngắn (Video Studio M05)](#chức-năng-3-studio-video-ngắn-video-studio-m05)
   - [Chức năng 4: Cỗ máy Nội dung Đa kênh (Content Engine M07 — SocialFlow)](#chức-năng-4-cỗ-máy-nội-dung-đa-kênh-content-engine-m07--socialflow)
   - [Chức năng 5: Đăng bài Mạng xã hội (Social Publishing M07)](#chức-năng-5-đăng-bài-mạng-xã-hội-social-publishing-m07)
   - [Chức năng 6: Danh mục & Báo giá Thông minh (Catalog & Pricing M02/M03)](#chức-năng-6-danh-mục--báo-giá-thông-minh-catalog--pricing-m02m03)
   - [Chức năng 7: Khách hàng & Chăm sóc Tự động (CRM & Retention M08)](#chức-năng-7-khách-hàng--chăm-sóc-tự-động-crm--retention-m08)
   - [Chức năng 8: Đơn hàng & Lệnh Xưởng hoa (Orders & Florist M09)](#chức-năng-8-đơn-hàng--lệnh-xưởng-hoa-orders--florist-m09)
   - [Chức năng 9: Trợ lý AI Chat Đa kênh (Chat Assistant M10)](#chức-năng-9-trợ-lý-ai-chat-đa-kênh-chat-assistant-m10)
   - [Chức năng 10: Báo cáo Vận hành & Giám sát AI (Analytics & Governance M11)](#chức-năng-10-báo-cáo-vận-hành--giám-sát-ai-analytics--governance-m11)
   - [Chức năng 11: Kết nối Nền tảng (Platform Connections)](#chức-năng-11-kết-nối-nền-tảng-platform-connections)
   - [Chức năng 12: Điều phối Đơn hàng (Coordinator Operations)](#chức-năng-12-điều-phối-đơn-hàng-coordinator-operations)
4. [Hệ Thống Trộn Biến Cốt Lõi & Bảng Ánh Xạ Cơ Sở Dữ Liệu (Database Schema Mapping Matrix)](#4-hệ-thống-trộn-biến-cốt-lõi-interpolation-engine--token-catalog)
   - [4.1. Danh mục Token Biến Chuẩn](#41-danh-mục-token-biến-chuẩn-standard-token-catalog)
   - [4.2. Khung Ngữ Cảnh Dữ Liệu InterpolationContext](#42-khung-ngữ-cảnh-dữ-liệu-interpolationcontext)
   - [4.3. Bảng Đối Soát Ánh Xạ Cơ Sở Dữ Liệu](#43-bảng-đối-soát-ánh-xạ-cơ-sở-dữ-liệu-database-schema-mapping-matrix)
   - [4.4. Nguyên Tắc Trộn Biến An Toàn](#44-nguyên-tắc-trộn-biến-an-toàn-fault-tolerance--redos-protection)
5. [Cẩm Nang Vận Hành: Tìm kiếm, Chỉnh sửa & Tạo mới Template](#5-cẩm-nang-vận-hành-tìm-kiếm-chỉnh-sửa--tạo-mới-template)
6. [Quy trình Kiểm thử & Nghiệm thu (Verification Protocol)](#6-quy-trình-kiểm-thử--nghiệm-thu-verification-protocol)

---

## 1. TRIẾT LÝ THIẾT KẾ & BỘ QUY CHUẨN BẮT BUỘC

Toàn bộ hệ thống Template của ALG tuân thủ nghiêm ngặt 5 quy chuẩn cốt lõi. Mọi thay đổi vi phạm các quy chuẩn này đều bị từ chối trong quá trình kiểm duyệt:

### 1.1. Chuẩn Khối Hướng Dẫn Thao Tác (Feature Guidance Callout)
Mọi Tab chức năng khi mở ra đều phải có khối hướng dẫn mở đầu đạt chuẩn viền đỏ đứt nét:
- **Khung viền**: `border-2 border-dashed border-red-300`
- **Nền**: `bg-red-50/70` hoặc `bg-red-50/80` (chống mỏi mắt, chuẩn WCAG AAA)
- **Huy hiệu (Pill Badge)**: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold tracking-wider uppercase`
- **Thanh mẹo (Bottom Tips Bar)**: `border-t border-dashed border-red-200/90` với các icon mẹo (`📸/💡/⚡/✨/🎯`) chữ `text-[11.5px] font-medium text-red-700`
- **Component dùng chung**: Bắt buộc dùng `<FeatureGuidanceCard />` từ `@/components/templates/shared/feature-guidance-card`.
- **Thu gọn thông minh (Smart Collapsible — 25/09)**:
  - **Lần đầu truy cập**: Hiển thị nội dung đầy đủ (viền đỏ, badge, tiêu đề, mô tả, thanh mẹo). Đánh dấu "đã xem" vào `localStorage` (key `floraos_guidance_seen_<id>`).
  - **Lần sau trở đi**: Tự động thu gọn thành nút compact **"📖 XEM HƯỚNG DẪN"** (viền đứt nhạt `border-red-200/80`, nền `bg-red-50/40`, hover sáng lên).
  - **Click "Xem hướng dẫn"**: Mở lại nội dung đầy đủ + nút **"↑ Thu gọn"** ở góc trên phải.
  - **Prop `guidanceId`**: Tùy chọn — nếu bỏ trống, tự sinh ID ổn định từ `title` (kebab-case bỏ dấu tiếng Việt). Không cần sửa các file consumer hiện tại.
  - **SSR-safe**: Mặc định expanded khi render server → client đồng bộ lại sau hydration (tránh mismatch).

### 1.2. Chuẩn Tác Vụ Góc Trên Bên Phải (Top-Right Action Header)
- Mọi tab đều phải thống nhất cụm nút tác vụ ở **Góc trên cùng bên phải** qua `<TabActionHeader />`.
- Tách bạch 2 khối: Nút tác vụ chính 1-chạm (Copy, Lưu nháp, Duyệt) và Menu mở rộng `...` (Tải PNG, PDF A6, Mở khóa sửa).

### 1.3. Chuẩn Phân Rã Trường Nguyên Tử (Atomic Disaggregated Fields)
- **Tuyệt đối không gộp chung văn bản**: Cấm lưu trữ `"Hồng đỏ 10 cành"` thành 1 ô text tự do.
- **Bắt buộc phân rã**: Tên hoa (`text`), số lượng (`number`), đơn vị (`text`), màu sắc (`text`), vai trò (`select: main | secondary | filler | foliage | wrap`).
- Cho phép người dùng nhấp đúp vào từng trường số liệu để chỉnh sửa mà không làm hỏng cấu trúc dữ liệu.

### 1.4. Nguyên Tắc SRP & Giới Hạn 350 Dòng Code
- 1 file = 1 lý do duy nhất để thay đổi.
- Kích thước tối đa của mỗi file template là **350 dòng**. Nếu vượt quá, bắt buộc phải phân tách thành các component con hoặc hook.

### 1.5. Cách Ly Hạ Tầng (Zero Infrastructure Leaks)
- Các file trong `src/components/templates/` và `src/core/templates/` thuần túy là UI Component và Domain Logic.
- **Tuyệt đối không import PrismaClient, DB Connection hay SDK nhà cung cấp AI ngoài** vào thư mục templates.

---

## 2. CẤU TRÚC THƯ MỤC TỔNG THỂ & BẢN ĐỒ 10 CHỨC NĂNG

Toàn bộ hệ thống templates nằm tại `src/components/templates/`, chia theo **11 Thư mục Chức năng** (chức năng 11, `platform-connections/`, bổ sung 17/09 sau khi rà soát code thật phát hiện thư mục này tồn tại nhưng chưa từng được liệt kê):

```text
src/
├── core/
│   └── templates/                         # Lớp Xử lý Dữ liệu & Trộn biến (Clean Domain)
│       ├── domain/
│       │   ├── template-types.ts          # Types & Schemas của hệ thống template
│       │   ├── variable-catalog.ts        # Bộ giải mã biến token chuẩn ({{product.name}}...)
│       │   └── interpolation-engine.ts    # Động cơ thay thế biến an toàn (an toàn Regex)
│       └── golden-templates.ts            # Kho System Golden Templates mặc định
│
└── components/
    └── templates/                         # Lớp Trực quan & Giao diện người dùng
        ├── shared/                        # 0. Khung dùng chung
        │   └── feature-guidance-card.tsx  # Khung hướng dẫn viền đỏ đứt nét chuẩn, thu gọn thông minh (localStorage)
        │
        ├── product-analysis/              # 1. Phân tích ảnh sản phẩm (M01a/b/c)
        ├── creative-studio/               # 2. Studio Sáng tạo Ảnh (M04a/b)
        ├── video-studio/                  # 3. Studio Video Ngắn (M05)
        ├── content-engine/                # 4. Máy Nội dung Đa kênh (M06)
        ├── social-publishing/             # 5. Đăng bài Mạng xã hội (M07)
        ├── catalog/                       # 6. Danh mục & Báo giá (M02/M03)
        ├── crm/                           # 7. Khách hàng & Chăm sóc (M08)
        ├── orders/                        # 8. Đơn hàng & Xưởng hoa (M09)
        ├── chat-assistant/                # 9. Trợ lý AI Chat Đa kênh (M10)
        ├── analytics/                     # 10. Báo cáo & Giám sát AI (M11)
        ├── platform-connections/          # 11. Kết nối Nền tảng (bổ sung 17/09, P-Fix-5)
        ├── coordinator/                   # 12. Điều phối Đơn hàng (Coordinator Operations)
        └── index.ts                       # Barrel export toàn bộ hệ thống
```

---

## 3. ĐẶC TẢ CHI TIẾT TỪNG TEMPLATE THEO 10 CHỨC NĂNG

### Chức năng 1: Phân tích Ảnh Sản phẩm (Product Analysis M01)
> **Đường dẫn thư mục:** `src/components/templates/product-analysis/`  
> **Màn hình sử dụng:** `/tai-anh?tab=m01a`, `/tai-anh?tab=m01b`, `/tai-anh?tab=m01c`

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `m01a-guidance-card.tsx` | Guidance | Hướng dẫn tải ảnh chụp hoa & nhận diện cành hoa | Không có props (Preset tĩnh chuẩn) |
| `m01b-guidance-card.tsx` | Guidance | Hướng dẫn sinh tên thương mại & mô tả SEO | Không có props (Preset tĩnh chuẩn) |
| `m01c-guidance-card.tsx` | Guidance | Hướng dẫn tạo thẻ chào khách A6 & Zalo Script | Không có props (Preset tĩnh chuẩn) |
| `analysis-result-card.tsx` | BOM / Result | Thẻ kết quả phân tích cấu phần hoa M01a, độ tin cậy AI, danh sách cành hoa nguyên tử, duyệt/từ chối | `fields`, `imageUrl`, `judgment`, `confidence`, `onApprove`, `onSaveDraft`, `onFieldChange`... |
| `commercial-content-card.tsx` | Content | Thẻ nội dung bán hàng M01b (tên gợi ý, câu chuyện hoa, phân khúc giá, nút kho đã duyệt) | `fields`, `imageUrl`, `qualityScore`, `onBackToLibrary`, `onApprove`, `onSaveDraft`... |
| `sales-pitch-card-a6.tsx` | Visual Pitch | Thẻ chào khách chuẩn A6 (105x148mm) tối ưu in ấn và chia sẻ ảnh kèm bảng giá, quà tặng | `data: SalesPitchData`, `onExportA6`, `onShare` |
| `zalo-script-box.tsx` | Advisory | Hộp kịch bản tư vấn Zalo 1-chạm copy kèm icon sinh động và cấu phần chi tiết | `data: SalesPitchData`, `onCopyZalo` |

---

### Chức năng 2: Studio Sáng tạo Ảnh (Creative Studio M04)
> **Đường dẫn thư mục:** `src/components/templates/creative-studio/`  
> **Màn hình sử dụng:** `/sang-tao` (hoặc các màn hình tối ưu media AI)

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `creative-guidance-card.tsx` | Guidance | Hướng dẫn tách nền xưởng hoa và ghép bối cảnh studio | Không có props | (ngoài SSOT) — không có trong bản giao
| `before-after-preview-card.tsx` | Preview | Thẻ so sánh trực quan ảnh gốc chụp xưởng và ảnh đã tối ưu AI | `originalImageUrl`, `enhancedImageUrl`, `aspectRatio`, `onDownload` | (ngoài SSOT) — không có trong bản giao
| `studio-variant-card.tsx` | Variant Selector | Thẻ chọn phối cảnh (Bàn tiệc cưới, phòng khách, cầm tay) | `variants: StudioVariantItem[]`, `selectedId`, `onSelectVariant` | (ngoài SSOT) — không có trong bản giao
| `studio-scene-selector.tsx` | Scene Preset Selector | Chọn 1 trong 5 phông nền dựng sẵn (Xám ấm Hàn Quốc, Trắng kem TMĐT, Mộc chân thực, Gỗ ấm Vintage, Bokeh) | `value`, `onChange`, `disabled?` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `enhancer-provider-selector.tsx` | Provider Selector | Chọn nhà cung cấp tách nền/nâng cấp ảnh AI trong 5 lựa chọn (Studio Pipeline, OpenAI, Local Real-ESRGAN, Gemini, Replicate) | `value`, `onChange`, `disabled?` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `optimization-mode-selector.tsx` | Mode Selector | Chuyển giữa chế độ "Tự động" và "Tuỳ chỉnh", chọn từng năng lực tối ưu cụ thể theo nhà cung cấp đang chọn | `mode`, `onModeChange`, `selectedCapabilities`, `onCapabilitiesChange`, `selectedProvider` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `applied-changes-breakdown.tsx` | Result Summary | Liệt kê các thay đổi AI đã áp dụng lên ảnh (tách nền, xoá watermark, nâng nét, cân sáng, tạo đa tỷ lệ) | `appliedChanges?`, `mode?`, `providerName?` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `visual-storytelling-controls.tsx` | Visual Controls | Bộ điều khiển kể chuyện thị giác (Góc chụp camera, Tương tác người mẫu/cầm hoa, Chế độ kịch bản 5 nhịp) | `cameraAngle`, `onCameraAngleChange`, `humanInteraction`, `onHumanInteractionChange`, `storylineMode`, `onStorylineModeChange`, `disabled?` | (ngoài SSOT) — không có trong bản giao

---

### Chức năng 3: Studio Video Ngắn (Video Studio M04c/M05)
> **Đường dẫn thư mục:** hai lớp tách biệt, KHÔNG gộp chung — xem cột "Thư mục thật" bên dưới. `src/components/templates/video-studio/` là các Card thuần hiển thị (SSOT quản); `src/components/video-studio/` là các trang/modal điều khiển luồng nghiệp vụ (ngoài phạm vi SSOT, nhưng liệt kê ở đây để không ai đi tìm nhầm chỗ — cập nhật 17/09, P-Fix-5).  
> **Màn hình sử dụng:** `/video`  
> **Trạng thái hệ thống:** **Hoạt động** 🟢 (Nghiệm thu hoàn tất P17)

| File Template | Thư mục thật | Loại | Mục đích & Trách nhiệm | Tính năng & Quy chuẩn cốt lõi |
|---|---|---|---|---|
| `video-guidance-card.tsx` | `templates/video-studio/` | Guidance | Hướng dẫn tạo video ngắn dọc chuẩn TikTok/Reels/Shorts | Không có props (Preset tĩnh chuẩn) | (ngoài SSOT) — không có trong bản giao
| `storyboard-script-card.tsx` | `templates/video-studio/` | Script Card | Thẻ hiển thị kịch bản phân cảnh (số cảnh, thời lượng, lời thoại, tông nhạc) kèm nút sao chép/tạo lại | `scenes: StoryboardScene[]`, `title`, `totalDurationSeconds`, `musicTrackName`, `onCopyScript`, `onRegenerate` | (ngoài SSOT) — không có trong bản giao
| `video-player-card.tsx` | `templates/video-studio/` | Player Mockup | Khung chiếu video dọc 9:16 kèm phụ đề bán hàng và tải MP4 | Hiển thị video thành phẩm Full HD 30fps, poster preview, nút tải MP4 và chia sẻ | (ngoài SSOT) — không có trong bản giao
| `storyboard-editor.tsx` | `components/video-studio/` (ngoài SSOT) | Storyboard Editor | Biên soạn phân cảnh chi tiết phân rã trường nguyên tử | Hỗ trợ 2–15 phân cảnh; Tự động cân bằng thời lượng theo khuôn video; Nút `🗑️ Xóa cảnh` đỏ nổi bật; Menu Camera Motion độc lập |
| `video-create-modal.tsx` | `components/video-studio/` (ngoài SSOT) | Creation Modal | Hộp thoại khởi tạo dự án video marketing 1-chạm | Chọn 6 khuôn video, tỉ lệ 9:16/1:1/16:9, nhạc nền, giọng đọc TTS, 4 phong cách phụ đề |
| `video-job-list.tsx` | `components/video-studio/` (ngoài SSOT) | Job Queue & History | Danh sách tác vụ video và bộ lọc trạng thái | Lọc theo stage (DRAFT, SCRIPT_READY, RENDERING, RENDER_COMPLETED), hiển thị huy hiệu credit |
| `video-rendering-progress.tsx` | `components/video-studio/` (ngoài SSOT) | Progress Tracker | Thanh tiến trình dựng video 4 bước (tải tài nguyên → lọc chuyển cảnh → mã hoá → ghép nhạc/phụ đề) kèm đếm giờ thực và nút thử lại khi lỗi | `videoJobId`, `generationJobId?`, `onCompleted`, `onFailed`, `onRetry?` |

#### 🎬 Quy chuẩn Chuyển động Điện ảnh (Cinematic Motion Specifications)
1. **Camera Motion Engine (FFmpeg Ken Burns)**:
   - `ZOOM_IN`: Camera thu phóng chậm rãi vào chi tiết hoa (`zoom: 1.0 -> 1.25`).
   - `ZOOM_OUT`: Camera lùi góc nhìn mở rộng từ chi tiết ra trọn bó hoa (`zoom: 1.25 -> 1.0`).
   - `PAN_UP`: Máy quay lướt dọc từ chân cành lên đỉnh hoa đang nở rộ.
   - `PAN_RIGHT`: Lia máy ngang từ trái qua phải ngắm trọn dải màu hoa tươi.
   - `STATIC`: Giữ góc nhìn tĩnh khi cần nhấn mạnh thông số/văn bản.
   - **Tự động luân phiên**: Khi thêm phân cảnh mới, hệ thống tự động gán luân phiên 4 góc quay kết hợp `xfade=fade` mượt mà ở 30fps.
2. **Kiến trúc Nhà cung cấp (Pluggable Provider Architecture)**:
   - **Phương án A (`LocalCinematicProvider`)**: Hoạt động mặc định, chạy offline bằng FFmpeg, chi phí 0 credit, tốc độ ~0.45s/cảnh.
   - **Phương án B Standby (`GoogleVeoProvider` & `HeyGenProvider`)**: Thu hoạch từ SocialFlow, sẵn sàng kích hoạt bất cứ lúc nào qua `.env` (`AI_VIDEO_PROVIDER=veo` hoặc `heygen`) mà không cần thay đổi code.
3. **Phụ đề & Âm thanh đồng bộ 100%**:
   - Chữ phụ đề trên video khớp từng từ với kịch bản giọng đọc AI (`voiceScript`).
   - 4 phong cách hiển thị: `MODERN_BADGE` (hộp mờ pill đen), `MINIMAL_ELEGANT` (chữ bóng đổ mềm), `HIGHLIGHT_BOX` (hộp vàng Gen Z), `BOTTOM_BANNER` (dải băng tin tức), hoặc `NONE` (tắt).

---

### Chức năng 4: Cỗ máy Nội dung Đa kênh (Content Engine M07 — SocialFlow)
> **Đường dẫn thư mục:** `src/components/templates/content-engine/`  
> **Màn hình sử dụng:** `/noi-dung`  
> **Kiến trúc phân bổ:** UI Client nằm ở `floraos-core`, backend AI Content Engine nằm ở **`SocialFlow`** (gọi qua proxy `/api/v1/proxy/api/m07/*?client=SOCIALFLOW` kèm SSO JWT). *Lưu ý: M06 là Catalog & QR thuộc `LocalBudd`, không phải Content Engine.*

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `content-guidance-card.tsx` | Guidance | Hướng dẫn tạo bài viết tiếp thị đa kênh & đa góc độ | Không có props |
| `multichannel-post-card.tsx` | Post Template | Thẻ bài đăng chia tab Facebook, TikTok, Instagram, Zalo kèm sao chép | `posts: MultichannelPostItem[]`, `productName`, `onSchedulePost` |
| `angle-selector-card.tsx` | Strategy Selector| Chọn góc tiếp cận bài viết: Cảm xúc, Kỹ thuật tay nghề hay Ưu đãi chốt đơn | `selectedAngle: "emotional" \| "technical" \| "promotional"`, `onSelectAngle` |
| `model-selector-card.tsx` | Model Selector | Chọn mô hình AI sinh nội dung trong 3 lựa chọn (Qwen local, GPT-4o, Gemini Flash), hiển thị độ trễ & chi phí ước tính | `selectedProvider`, `onSelectProvider`, `disabled?`, `selectedChannelsCount?`, `onGenerate?` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* |
| `social-post-preview.tsx` | Feed Mockup | Mô phỏng giao diện bài đăng thật trên Facebook/Instagram/TikTok/Zalo theo từng nền tảng | `post: MultichannelPostItem`, `productName?`, `productImageUrl?`, `shopName?` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* |
| `linkedin-post-preview.tsx` | Feed Mockup | Mô phỏng giao diện bài đăng B2B trên LinkedIn Feed (quà tặng doanh nghiệp), dùng chung props với `social-post-preview.tsx` | `SocialPostPreviewProps` (kế thừa) *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* |

---

### Chức năng 5: Đăng bài Mạng xã hội (Social Publishing M07)
> **Đường dẫn thư mục:** `src/components/templates/social-publishing/`  
> **Màn hình sử dụng:** `/lich-dang`

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `publishing-guidance-card.tsx` | Guidance | Hướng dẫn lập lịch xuất bản và các khung giờ vàng tương tác | Không có props | (ngoài SSOT) — không có trong bản giao
| `schedule-calendar-card.tsx` | Calendar | Thẻ lịch trình phân phối nội dung, giờ phát và trạng thái bài | `posts: ScheduledPostItem[]`, `dateLabel` | (ngoài SSOT) — không có trong bản giao
| `channel-status-card.tsx` | Integration | Thẻ kiểm tra trạng thái kết nối token Fanpage / Zalo OA | `channels: ConnectedChannel[]`, `onReconnect` | (ngoài SSOT) — không có trong bản giao
| `schedule-queue-tab.tsx` | Queue Tab | Tab duyệt hàng đợi bài chờ đăng, chọn hàng loạt, lên lịch, chuyển sang Content Engine | `calendarPosts`, `selectedIds`, `selectedPost`, `actionLoading`, `notice`, `formatTime`, `onSelectPost`, `onToggleCheck`, `onToggleSelectAll`, `onRetryPost`, `onOpenScheduleModal`, `onGoToContentEngine` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `schedule-post-item-card.tsx` | List Item | Một dòng bài trong hàng đợi lịch đăng, kèm checkbox chọn và nút thử lại | `item: PlatformFeedPost`, `isChecked`, `isActive`, `onSelect`, `onToggleCheck`, `onRetry`, `formatTime` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `platform-feed-preview.tsx` | Feed Mockup | Xem trước bài đăng thật trên nền tảng đã chọn, tự phân rã nội dung thành Headline/Body/Hashtag/CTA | `post: PlatformFeedPost \| null`, `shopName?`, `fallbackImageUrl?` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `schedule-confirm-modal.tsx` | Confirm Modal | Modal xác nhận thời điểm đăng (Ngay/Giờ trưa/Giờ tối/Tuỳ chỉnh) cho các bài đã chọn | `isOpen`, `onClose`, `onConfirm`, `selectedPosts: PlatformFeedPost[]`, `isLoading?` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `post-status-report-card.tsx` | Status Report | Thẻ báo cáo trạng thái một bài đã đăng/lên lịch/lỗi, kèm chỉ số tương tác và nút đăng lại/dời lịch | `post`, `onRetry?`, `onPublishNow?`, `onReschedule?` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `auto-approve-panel.tsx` | Settings Toggle | Bật/tắt tự động duyệt bài trước khi xuất bản | `autoApprove: boolean`, `onToggle: () => void` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao
| `smart-repost-tab.tsx` | Suggestion Tab | Gợi ý đăng lại các bài đã xuất bản thành công có hiệu quả cao | `posts: PlatformFeedPost[]`, `formatTime`, `onSelectForRepost` *(thêm 17/09, P-Fix-5 — thiếu trong bản gốc)* | (ngoài SSOT) — không có trong bản giao

---

### Chức năng 6: Danh mục & Báo giá Thông minh (Catalog & Pricing M02/M03)
> **Đường dẫn thư mục:** hai lớp tách biệt (sửa 17/09, P-Fix-5 — bản trước gộp nhầm cả 6 dòng dưới vào `templates/catalog/`, thực tế 3 dòng đầu mới ở đó). `templates/catalog/` là các Card thuần hiển thị chuẩn SSOT; `src/components/catalog/` (kèm `landing-templates/` con) là trang Storefront/Landing công khai và các modal điều khiển luồng — ngoài phạm vi quản lý trực tiếp của SSOT nhưng liệt kê ở đây để không ai đi tìm nhầm chỗ.  
> **Màn hình sử dụng:** `/catalog`

| File Template | Thư mục thật | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|---|
| `catalog-guidance-card.tsx` | `templates/catalog/` | Guidance | Hướng dẫn thiết lập giá động và chia sẻ link catalog trực tuyến | Không có props (Preset tĩnh chuẩn) |
| `product-detail-card.tsx` | `templates/catalog/` | Catalog Card | Thẻ chi tiết sản phẩm catalog chuẩn Mobile, kèm nút tạo đơn & chia sẻ | `code`, `name`, `imageUrl`, `category`, `price`, `stemCount`, `occasions` | (ngoài SSOT) — không có trong bản giao
| `quote-summary-card.tsx` | `templates/catalog/` | Pricing BOM | Thẻ bảng tính giá cấu thành (hoa, lá, công thợ, bao bì, biên LN) | `items: CostBreakdownItem[]`, `laborCost`, `wrappingCost`, `suggestedPrice` | (ngoài SSOT) — không có trong bản giao
| `public/public-hero.tsx` | `components/catalog/public/` (ngoài SSOT) | Hero trang khách | Phần đầu trang tràn màn hình bằng ảnh thật, tiêu đề AI, màu theo phong cách catalog; dùng chung landing 08 & catalog 09 (thay `landing-template-hero.tsx`, 30/10/2026) | `headline`, `subHeadline`, `imageUrl`, `style` |
| `catalog-product-list-view.tsx` | `components/catalog/` (ngoài SSOT) | Lưới sản phẩm trang khách | Lưới 2 cột di động / 3 cột máy tính, ảnh 4:5, nút đặt Zalo có số tiệm; dùng chung landing & catalog (thay `landing-template-products.tsx`, 30/10/2026) | `products`, `style`, `shop` |
| `landing-template-lead.tsx` | `components/catalog/landing-templates/` (ngoài SSOT) | Lead Voucher | Khối bắt lead / voucher ưu đãi đặt sớm 10%, form số điện thoại Zalo và 3 cam kết vàng | `archetypeId`, `occasionTitle` |
| `catalog-storefront.tsx` | `components/catalog/` (ngoài SSOT) | Storefront | Giao diện E-Catalog & Landing Page công khai cho khách hàng cuối, hỗ trợ tìm kiếm, lọc dịp, responsive Mobile/Desktop | `initialData: PublicCatalogResult` |
| `share-catalog-modal.tsx` | `components/catalog/` (ngoài SSOT) | Social Share | Modal chia sẻ đa kênh Facebook, Zalo, sao chép caption bán hàng mẫu | `slug`, `name`, `description`, `onClose` |
| `product-detail-modal.tsx` | `components/catalog/` (ngoài SSOT) | Product Modal | Modal xem chi tiết sản phẩm chuẩn Mobile, cấu phần cành hoa và nút đặt nhanh Zalo | `product: PublicCatalogProduct`, `shop`, `onClose` |

*(`components/catalog/` còn có `catalog-link-widgets.tsx`, `catalog-management-tab.tsx`, `landing-campaign-*.tsx` — các màn quản trị/thiết lập chiến dịch phía chủ shop, không phải Card hiển thị cho khách, nằm ngoài phạm vi liệt kê chi tiết của SSOT này.)*

---

### Chức năng 7: Khách hàng & Chăm sóc Tự động (CRM & Retention M08)
> **Đường dẫn thư mục:** `src/components/templates/crm/`  
> **Màn hình sử dụng:** `/khach-hang`

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `crm-guidance-card.tsx` | Guidance | Hướng dẫn quản lý sở thích khách hàng và ngày kỷ niệm | Không có props | (ngoài SSOT) — không có trong bản giao
| `customer-profile-card.tsx` | CRM Profile | Thẻ hồ sơ khách hàng VIP: Gu màu sắc, loại hoa ưa thích, lịch sử mua | `name`, `phone`, `tier`, `totalOrders`, `totalSpent`, `preferredColors`... | (ngoài SSOT) — không có trong bản giao
| `event-reminder-card.tsx` | Retention Alert | Thẻ nhắc ngày sinh nhật / kỷ niệm sắp tới kèm nút nhắn Zalo chăm sóc | `reminders: EventReminderItem[]`, `onSendZaloCare` | (ngoài SSOT) — không có trong bản giao

---

### Chức năng 8: Đơn hàng & Lệnh Xưởng hoa (Orders & Florist M09)
> **Đường dẫn thư mục:** `src/components/templates/orders/`  
> **Màn hình sử dụng:** `/don-hang`

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `order-guidance-card.tsx` | Guidance | Hướng dẫn quy trình xử lý đơn hàng và bàn giao lệnh xưởng | Không có props |
| `florist-ticket-card.tsx` | Florist Ticket | Phiếu lệnh cắm hoa cho thợ (định lượng hoa bắt buộc, ảnh mẫu, hạn giao) | `orderCode`, `productName`, `sampleImageUrl`, `items`, `wrapStyle`, `onPrint` |
| `delivery-receipt-card.tsx` | Print A6 | Phiếu giao hàng A6 cho shipper kèm thiệp chúc mừng in hoa mỹ | `orderCode`, `recipientName`, `deliveryAddress`, `cardMessage`, `totalAmount` |

---

### Chức năng 9: Trợ lý AI Chat Đa kênh (Chat Assistant M10)
> **Đường dẫn thư mục:** `src/components/templates/chat-assistant/`  
> **Màn hình sử dụng:** `/hoi-thoai`

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `chat-guidance-card.tsx` | Guidance | Hướng dẫn trợ lý AI tự động tư vấn mẫu hoa và chốt đơn 24/7 | Không có props | (ngoài SSOT) — không có trong bản giao
| `chat-thread-card.tsx` | Chat Stream | Khung hiển thị hội thoại khách - AI kèm thẻ gợi ý sản phẩm và nhập liệu | `customerName`, `channel`, `messages: ChatMessage[]`, `onSendMessage` | (ngoài SSOT) — không có trong bản giao
| `human-takeover-banner.tsx` | Incident Alert | Banner cảnh báo nhân viên can thiệp xử lý khi khách khiếu nại | `reason`, `customerName`, `onAcceptTakeover`, `onDismiss` | (ngoài SSOT) — không có trong bản giao

---

### Chức năng 10: Báo cáo Vận hành & Giám sát AI (Analytics & Governance M11)
> **Đường dẫn thư mục:** `src/components/templates/analytics/`  
> **Màn hình sử dụng:** `/bao-cao`

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `analytics-guidance-card.tsx`| Guidance | Hướng dẫn giám sát chỉ số kinh doanh và kiểm soát ngân sách AI | Không có props | (ngoài SSOT) — không có trong bản giao
| `kpi-summary-card.tsx` | KPI Dashboard | Thẻ tóm tắt 4 chỉ số vàng: Doanh thu, Đơn hàng, Tỷ lệ chuyển đổi, AOV | `revenue`, `orders`, `conversionRate`, `avgOrderValue`, `periodLabel` | (ngoài SSOT) — không có trong bản giao
| `ai-credit-usage-card.tsx` | Aegis Governance| Thẻ giám sát hạn mức tín dụng AI, cảnh báo vượt 80% hạn mức tháng | `usedTokens`, `totalTokens`, `costSpent`, `budgetLimit`, `capabilities` | (ngoài SSOT) — không có trong bản giao

---

### Chức năng 11: Kết nối Nền tảng (Platform Connections)
> **Đường dẫn thư mục:** `src/components/templates/platform-connections/`  
> **Màn hình sử dụng:** `/ket-noi`  
> **Ghi chú (thêm 17/09, P-Fix-5):** thư mục này tồn tại thật và đúng cấu trúc chuẩn SSOT (nằm dưới `templates/`, có `index.ts` barrel) nhưng chưa từng được liệt kê như một chức năng trong 10 chức năng gốc của tài liệu này — rà soát code thật phát hiện. Bổ sung chính thức làm chức năng thứ 11 thay vì tách module riêng, vì nó đã tuân thủ đúng mọi quy chuẩn ở Mục 1 (SRP, dưới 350 dòng, không import Prisma).

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `platform-account-card.tsx` | Connection Card | Thẻ hiển thị 1 tài khoản nền tảng (Facebook/TikTok/Zalo...) — trạng thái đăng nhập, lần đăng nhập gần nhất, nút kết nối/kiểm tra/sửa/ngắt kết nối | `platform: PlatformConfig`, `account?`, `loadingAction?`, `onConnect`, `onLogin`, `onCheck`, `onEdit?`, `onDisconnect` | (ngoài SSOT) — không có trong bản giao
| `connect-account-modal.tsx` | Auth Modal | Modal nhập thông tin đăng nhập/token để kết nối một nền tảng mới | `platformId`, `platformName`, `initialUsername?`, `isOpen`, `isLoading`, `onClose`, `onSave` | (ngoài SSOT) — không có trong bản giao

---

### Chức năng 12: Điều phối Đơn hàng (Coordinator Operations)
> **Đường dẫn thư mục:** `src/components/templates/coordinator/`  
> **Màn hình sử dụng:** `/dieu-phoi`  
> **Ghi chú:** Chức năng thứ 12 hoạt động độc lập, quản lý tháp điều phối đơn hàng, phân công đối tác xưởng ngoài, AI QC kiểm định chất lượng đối chiếu Master Index và chứng từ giao hàng POD.

| File Template | Loại | Mục đích & Trách nhiệm | Props cốt lõi |
|---|---|---|---|
| `sales-order-intake-modal.tsx` | Order Intake Form (T01) | Modal tiếp nhận đơn từ Sales: chọn mẫu từ Product Master Index, BOM nguyên tử, ảnh mẫu tải qua `assets` (không base64), giờ hẹn thật `deliveryTargetAt`; lỗi máy chủ hiện tại form | `isOpen`, `onClose`, `onSubmit(body: CreateOrderRequest) => Promise<void>` |
| `sales-order-intake-customer-section.tsx` | Order Intake Form — phần (T01) | Phần 1 của modal nhận đơn: chọn nhanh mẫu, khách (tìm trong Customer Master Index), người nhận, địa chỉ 5 tầng, giờ hẹn | `form` (từ `useSalesOrderIntakeForm`) |
| `sales-order-intake-product-section.tsx` | Order Intake Form — phần (T01) | Phần 2 (đầu): ảnh mẫu tải qua `assets`, tên/giá sản phẩm, tiền cọc | `form` |
| `sales-order-intake-bom-section.tsx` | Order Intake Form — phần (T01) | Phần 2 (cuối): bảng cành hoa nguyên tử; lá/gói/phụ kiện của mẫu (chỉ đọc) | `form` |
| `sales-order-intake-details-section.tsx` | Order Intake Form — phần (T01) | Phần 2.5–4: phân loại & ưu tiên, lời nhắn/thiệp, trường tự tạo, kiểm tra đủ thông tin đầu vào | `form` |
| `sales-order-intake-card.tsx` | Order Intake Card (T01) | Thẻ tóm tắt thông tin tiếp nhận đơn hàng từ Sales (kênh bán, người nhận, lời chúc, định mức) | `orderCode`, `channel`, `salesAgentName`, `customerName`, `recipientName`, `cardMessage`, `recipeTitle`, `totalAmount` |
| `partner-product-card.tsx` | Partner Product Card (T02) | Thẻ sản phẩm gửi đối tác xưởng: ảnh mẫu, BOM, giá công, giao hàng, thiệp; Copy/Gửi Zalo | `orderCode`, `productTitle`, `sampleImageUrl`, `flowers`, `partnerPayoutVnd`, `deliveryAddress`, `cardMessage` |
| `partner-product-card-bom.tsx` | Partner Product Card — phần (T02) | Phần con của `partner-product-card.tsx` (tách khi áp nhận diện ALG): bảng nguyên phụ liệu (hoa chính, lá, giấy gói, phụ kiện) | — |
| `coordinator-order-brief-card.tsx` | Order Brief (T02) | Thẻ tóm tắt thông số đơn, rủi ro SLA và hành động tiếp theo cho Điều phối viên | `orderCode`, `stageLabel`, `riskLevel`, `recipientName`, `deliveryAddress`, `nextAction` |
| `missing-info-request-card.tsx` | Missing Info Card (T03) | Phiếu yêu cầu Sales bổ sung thông tin đơn hàng còn thiếu (địa chỉ, số điện thoại, lời chúc) | `orderCode`, `missingFields`, `customerName`, `urgency`, `deadlineTime`, `onSendReminder` | (ngoài SSOT) — không có trong bản giao
| `partner-assignment-modal.tsx` | Assignment Modal (T06) | Modal phân công đối tác từ bảng `partners` của tổ chức (thêm đối tác tại chỗ, kiểm công suất ngày ở máy chủ). Không hiện điểm ghép AI khi chưa có ghép AI (nợ #141) | `isOpen`, `orderCode`, `recipeTitle`, `deliveryAddress`, `currentPartnerId?`, `onAssign(partnerId, notes, overrideCapacity)`, `onClose` |
| `partner-production-card.tsx` | Production Card (T07) | Phiếu cắm hoa xưởng/thợ hiển thị công thức hoa nguyên tử (BOM) từ Master Index, giấu giá vốn | `orderCode`, `recipeTitle`, `flowers`, `foliage`, `wrapping`, `cardMessage`, `onMarkReady` | (ngoài SSOT) — không có trong bản giao
| `production-update-modal.tsx` | Production Modal (T10/T11) | Modal cập nhật tiến độ, báo cắm xong (bắt buộc ảnh thành phẩm thật tải qua `assets`), báo thiếu vật liệu (mở sự cố) | `isOpen`, `orderCode`, `recipeTitle`, `currentProgressPercent`, `onSubmitUpdate(params) => Promise<void>`, `onClose` |
| `order-planning-modal.tsx` | Order Planning Modal (T02/T04/T05) | Modal lập kế hoạch P2: giờ cắm xong/giờ lấy hàng + chỉ đạo; rủi ro chỉ HIỂN THỊ (máy chủ tính) | `isOpen`, `order`, `onClose`, `onConfirmPlan(nextAction) => Promise<void>` |
| `ai-qc-inspection-modal.tsx` | QC Inspection Modal (T14/T15) | Modal QC P5 do người kiểm: so ảnh mẫu/ảnh thành phẩm, danh mục kiểm, kết luận Đạt / Làm lại / Loại. Chấm AI chưa bật (nợ #140) — không hiện điểm giả | `isOpen`, `order`, `onClose`, `onSubmit(decision, notes, checklist) => Promise<void>` |
| `delivery-dispatch-modal.tsx` | Delivery Dispatch Modal (T18–T21, F12) | Modal giao hàng P6 theo sự kiện: lấy hàng → đang giao → giao thành công (ảnh POD qua `assets` hoặc tên người ký) / giao thất bại (mở sự cố) | `isOpen`, `order`, `onClose`, `onSubmit(DeliveryEventInput) => Promise<void>` |
| `order-closure-modal.tsx` | Order Closure Modal (T25/T26) | Modal nghiệm thu P7: SLA tính từ giờ hẹn/giờ giao thật, điều kiện đóng đơn từ dữ liệu thật, chấm đối tác + tiền công | `isOpen`, `order`, `onClose`, `onSubmit({ partnerRating?, partnerPayoutVnd?, notes? }) => Promise<void>` |
| `ai-qc-report-card.tsx` | AI QC (T14/T15) | Phiếu kiểm định chất lượng đối chiếu ảnh thành phẩm của thợ với Master Index và tiêu chuẩn tiệm | `orderCode`, `qcStatus`, `aiScore`, `aiCritique`, `finishedImageUrls`, `checklist` |
| `delivery-pod-card.tsx` | POD Receipt (T21) | Phiếu giao hàng và bằng chứng người nhận ký nhận (Proof of Delivery) | `orderCode`, `shipperName`, `recipientName`, `isDelivered`, `podImageUrl` |
| `exception-resolution-card.tsx` | Exception Card (T22) | Thẻ ghi nhận và xử lý sự cố phát sinh (hết hoa, đổi mẫu, trễ shipper) | `orderCode`, `exceptionCode`, `type`, `severity`, `description`, `resolutionPlan` |
| `order-closure-learning-card.tsx` | Closure & SLA Card (T25/T26/T27) | Thẻ nghiệm thu đơn, đánh giá SLA, giải ngân thợ/xưởng và trích xuất bài học vận hành | `orderCode`, `customerRating`, `completionTime`, `slaMet`, `payoutAmount`, `learningNotes` | (ngoài SSOT) — không có trong bản giao
| `payment-ledger-modal.tsx` | Ledger Modal (T17/F14) | Modal sổ thu của đơn: tổng tiền, đã thu, còn phải thu + lịch sử dòng thu (cọc/thu nốt/hoàn), ghi thêm dòng thu mới | `isOpen`, `order`, `onClose`, `onRecorded` |
| `florist-job-card.tsx` | Florist Job Card | Thẻ gia công cắm hoa gửi thợ/xưởng: ảnh mẫu, giá gia công gợi ý 50% (cho phép sửa), nguyên phụ liệu BOM, thiệp, che SĐT khách (PII), hạn cắm xong, Copy ảnh Clipboard & Copy text Zalo | `orderCode`, `recipeTitle`, `unitPriceVnd`, `targetReadyTime`, `sampleImageUrl`, `flowers`, `onConfirmAcceptance`, `onCancelOrder` |
| `florist-job-bom.tsx` | Florist Job BOM | Phần con của `florist-job-card.tsx` (tách 14/10/2026 cho đúng giới hạn 350 dòng): bảng nguyên phụ liệu (hoa chính, lá, giấy gói, phụ kiện) + hàm định dạng địa chỉ, che số điện thoại | — |
| `florist-job-card-recipient.tsx` | Florist Job Card — phần | Phần con của `florist-job-card.tsx` (tách khi áp nhận diện ALG): khối giao nhận (che SĐT khách — PII), lưu ý kỹ thuật, trường tự tạo | — |
| `florist-job-card-spec.tsx` | Florist Job Card — phần | Phần con của `florist-job-card.tsx`: khung ảnh mẫu có chú thích kích thước và bảng các bước cắm tham khảo; chỉ hiện khi có dữ liệu thật (`dimensions`/`assemblySteps`) | — |
| `confirm-craft-acceptance-modal.tsx` | Confirmation Modal | Modal xác nhận nhận đơn và chốt giá gia công cuối cùng ghi nhận chi phí đơn hàng, tự động tính tỷ lệ % giá bán và cảnh báo biên lợi nhuận > 60% | `open`, `onOpenChange`, `orderCode`, `unitPriceVnd`, `suggestedCraftFeeVnd`, `partners`, `onConfirm` |
| `cancel-florist-order-modal.tsx` | Cancellation Modal | Modal hủy không nhận đơn gia công kèm 5 Quick-Tags lý do chọn nhanh + ghi chú lưu vết kiểm toán | `open`, `onOpenChange`, `orderCode`, `recipeTitle`, `onConfirmCancel` |

---

## 4. HỆ THỐNG TRỘN BIẾN CỐT LÕI (INTERPOLATION ENGINE & TOKEN CATALOG)

Động cơ trộn biến nằm độc lập tại:
- `src/core/templates/domain/interpolation-engine.ts`
- `src/core/templates/domain/variable-catalog.ts`

### 4.1. Danh mục Token Biến Chuẩn (Standard Token Catalog)

| Biến Token | Ý nghĩa dữ liệu | Ví dụ kết quả sau khi nạp |
|---|---|---|
| `{{product.name}}` | Tên sản phẩm chính thức | Bó Hoa Nắng Mai Tươi Sáng |
| `{{product.sku}}` | Mã SKU định danh | SP-2026-0914 |
| `{{product.style}}` | Phong cách cắm/bó hoa | Bó tròn Hàn Quốc hiện đại |
| `{{flower.summary_list}}` | Tóm tắt cấu phần các loại hoa | 10 Hồng Ohara, 5 Cúc Tana, Lá bạc |
| `{{flower.main_tones}}` | Tone màu chủ đạo | Hồng pastel, Trắng kem |
| `{{flower.wrapping}}` | Phong cách giấy gói & nơ | Giấy lụa chống thấm hồng cam, nơ voan |
| `{{pricing.selling_price_vnd}}` | Giá bán thực tế định dạng VNĐ | 450.000đ |
| `{{pricing.original_price_vnd}}` | Giá niêm yết trước giảm | 550.000đ |
| `{{pricing.discount_percent}}` | Tỷ lệ giảm giá | 18% |
| `{{pricing.segment}}` | Phân khúc thị trường | Tiêu chuẩn |
| `{{service.gifts_bullets}}` | Quà tặng kèm theo dạng gạch đầu dòng | • Tặng kèm thiệp thiết kế riêng\n• Miễn phí in banner |
| `{{service.commitments_bullets}}` | Cam kết chất lượng dịch vụ | • Hoa tươi trên 3 ngày\n• Chụp ảnh nghiệm thu trước khi giao |
| `{{shop.name}}` | Tên thương hiệu tiệm hoa | Flora Tiệm Hoa Tươi |
| `{{shop.hotline}}` | Số hotline liên hệ | 0988.123.456 |
| `{{shop.address}}` | Địa chỉ showroom | 123 Đường Hoa, Quận 1, TP.HCM |
| `{{shop.zalo_link}}` | Link Zalo OA | https://zalo.me/florashop |

---

### 4.2. Khung Ngữ Cảnh Dữ Liệu InterpolationContext

Dữ liệu nạp vào Template Engine được chuẩn hóa qua giao diện `InterpolationContext` (`src/core/templates/domain/template-types.ts`):

```typescript
export interface InterpolationContext {
  product?: {
    name?: string
    sku?: string
    style?: string
    category?: string
    description?: string
  }
  flower?: {
    summaryList?: string
    mainTones?: string
    facing?: string
    wrapping?: string
    totalStems?: number
    items?: Array<{ name: string; quantity: number; color?: string; role?: string }>
  }
  pricing?: {
    sellingPrice?: number
    sellingPriceVnd?: string
    originalPrice?: number
    originalPriceVnd?: string
    discountPercent?: number
    segment?: string
  }
  service?: {
    giftsList?: string[]
    giftsBullets?: string
    commitmentsList?: string[]
    commitmentsBullets?: string
  }
  shop?: {
    name?: string
    hotline?: string
    address?: string
    zaloLink?: string
    brandTone?: string
  }
}
```

---

### 4.3. Bảng Đối Soát Ánh Xạ Cơ Sở Dữ Liệu (Database Schema Mapping Matrix)

Hệ thống Template được đồng bộ hóa **100% hai chiều** với lược đồ cơ sở dữ liệu Prisma (`prisma/schema.prisma`):

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             DATABASE ENTITIES (Prisma)                           │
│  products · product_analyses · product_copies · business_profiles · brand_profiles │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼ (Domain Mappers & Resolvers)
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       TOKEN CATALOG & TEMPLATE PROPS                             │
│   {{product.*}} · {{flower.*}} · {{pricing.*}} · {{service.*}} · {{shop.*}}      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼ (UI Projections)
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         STANDARDIZED TEMPLATE COMPONENTS                         │
│  AnalysisResultCard · CommercialContentCard · SalesPitchCardA6 · ZaloScriptBox... │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Chi tiết bảng ánh xạ tường minh từng trường dữ liệu:

| Bảng CSDL (Prisma Model) | Trường CSDL (DB Field) | Biến Token / Props Template | Component Template Sử dụng | Ghi chú Đồng bộ |
|---|---|---|---|---|
| `products` | `code` | `{{product.sku}}` / `code` | `<AnalysisResultCard>`, `<ProductDetailCard>` | Mã định danh duy nhất trong tổ chức (`@@unique([organization_id, code])`). |
| `products` | `name` | `{{product.name}}` / `productName` | Mọi Card của 10 chức năng | Tên sản phẩm chính thức trong Product Master. |
| `products` | `category` | `{{product.category}}` / `category` | `<ProductDetailCard>`, `<CatalogGuidanceCard>` | Phân loại hoa (Bó hoa, Giỏ hoa, Kệ hoa, Bình hoa). |
| `products` | `shape` | `{{product.style}}` / `wrapStyle` | `<FloristTicketCard>`, `<SalesPitchCardA6>` | Kiểu dáng thiết kế (Bó tròn, Tam giác, Thác đổ...). |
| `products` | `facing` | `{{flower.facing}}` | `<SalesPitchCardA6>`, `<FloristTicketCard>` | Hướng nhìn mặt hoa: `ONE_SIDED` (1 mặt) hoặc `ALL_AROUND` (360 độ). |
| `products` | `attributes.price_vnd` | `{{pricing.selling_price_vnd}}` | `<SalesPitchCardA6>`, `<ProductDetailCard>`, `<VideoPlayerCard>` | Giá bán chính thức tính theo VNĐ. |
| `products` | `attributes.original_price_vnd`| `{{pricing.original_price_vnd}}` | `<SalesPitchCardA6>`, `<ProductDetailCard>` | Giá niêm yết gốc phục vụ tính chiết khấu khuyến mãi. |
| `product_analyses` | `raw.components[]` / `edited.components[]` | `{{flower.summary_list}}` / `fields` (Atomic) | `<AnalysisResultCard>`, `<FloristTicketCard>` | Phân rã nguyên tử: `name`, `quantity`, `unit`, `color`, `role`. |
| `product_analyses` | `raw.visual_elements.primary_colors` | `{{flower.main_tones}}` | `<AnalysisResultCard>`, `<SalesPitchCardA6>` | Bảng màu nhận diện thị giác máy tính AI M01a. |
| `product_analyses` | `raw.visual_elements.wrap_style` | `{{flower.wrapping}}` | `<AnalysisResultCard>`, `<FloristTicketCard>` | Phong cách giấy gói & nơ được AI phân tích. |
| `product_analyses` | `raw.quality.stem_count` | `{{flower.total_stems}}` / `stemCount` | `<AnalysisResultCard>`, `<ProductDetailCard>` | Tổng số cành hoa và lá trang trí. |
| `product_analyses` | `approval_state` | `judgment` / `status` | `<AnalysisResultCard>` | Trạng thái phê duyệt: `PENDING`, `APPROVED`, `REJECTED`. |
| `product_copies` | `raw.suggested_name` / `edited.suggested_name` | `fields["Tên sản phẩm"]` | `<CommercialContentCard>` | Tên thương mại do AI gợi ý dựa theo phong cách shop. |
| `product_copies` | `raw.suggested_description` | `fields["Mô tả"]` | `<CommercialContentCard>`, `<MultichannelPostCard>` | Đoạn văn cảm xúc bán hàng và câu chuyện sản phẩm. |
| `product_copies` | `raw.suggested_tags` | `fields["Thẻ phân loại"]` | `<CommercialContentCard>`, `<MultichannelPostCard>` | Danh sách từ khóa SEO và hashtag bán lẻ. |
| `product_copies` | `raw.suggested_price_segment` | `{{pricing.segment}}` | `<CommercialContentCard>` | Định vị phân khúc giá: Tiết kiệm, Tiêu chuẩn, Cao cấp. |
| `business_profiles` | `display_name` | `{{shop.name}}` | `<SalesPitchCardA6>`, `<DeliveryReceiptCard>`, `<ZaloScriptBox>` | Tên hiển thị tiệm hoa của tenant (đúng luật Tenant Isolation). |
| `business_profiles` | `phone` | `{{shop.hotline}}` | `<SalesPitchCardA6>`, `<CustomerProfileCard>` | Số hotline liên hệ đặt hoa của tiệm. |
| `business_profiles` | `address` | `{{shop.address}}` | `<DeliveryReceiptCard>` | Địa chỉ showroom hoặc xưởng gia công. |
| `business_profiles` | `social_links.zalo` | `{{shop.zalo_link}}` | `<ZaloScriptBox>`, `<CustomerProfileCard>` | Đường dẫn tài khoản Zalo OA / cá nhân của tiệm. |
| `brand_profiles` | `tone_of_voice` | Tone config | `<ContentGuidanceCard>`, `<MultichannelPostCard>` | Giọng văn thương hiệu: Thân thiện, Sang trọng, Trẻ trung... |
| `brand_profiles` | `primary_color` | UI Styling | Toàn bộ Templates | Tông màu chủ đạo thương hiệu áp dụng khi render Template A6. |
| `pricing_rules` | `key` (`san`, `tran`, `muc_thu`, `lam_tron`) | Engine Math | `<QuoteSummaryCard>`, `quotePrice()` | Công thức kiểm soát giá sàn/trần và biên lợi nhuận R3/R4/R5. |
| `occasions` | `code`, `name` | `occasions[]` | `<SalesPitchCardA6>`, `<ProductDetailCard>`, `<EventReminderCard>` | Bảng tra cứu dịp tặng chuẩn hóa (sinh nhật, khai trương, kỷ niệm...). |
| `catalog_links` | `slug` | `shareUrl` | `<ProductDetailCard>` | Slug chia sẻ danh mục trực tuyến ra kênh khách hàng ngoài. |

### 4.4. Nguyên tắc Trộn Biến An Toàn (Fault Tolerance & ReDoS Protection)
1. **Fallback an toàn**: Nếu biến không tồn tại trong context, parser tự động trả về chuỗi rỗng hoặc giá trị fallback khai báo sẵn, tuyệt đối không quăng ngoại lệ (throw error) gây sập ứng dụng.
2. **Chống Regex DoS (ReDoS Protection)**: Engine biên dịch an toàn, không sử dụng regex lồng nhau đệ quy.
3. **Purity & Isolation**: Toàn bộ logic giải mã token hoàn toàn độc lập với Prisma ORM, chạy được cả trên Edge runtime, Node.js lẫn trình duyệt.

---

## 5. CẨM NANG VẬN HÀNH: TÌM KIẾM, CHỈNH SỬA & TẠO MỚI TEMPLATE

### 5.1. Quy trình 3 Bước Định vị Nhanh Template Cần Sửa
Khi gặp lỗi hoặc nhận yêu cầu thay đổi giao diện ở bất kỳ tab nào:
1. **Bước 1: Xác định Chức năng**  
   - Xem tính năng đó thuộc phân hệ nào trong 10 phân hệ (vd: Phân tích ảnh ➔ `product-analysis`, Lịch đăng ➔ `social-publishing`).
2. **Bước 2: Mở thư mục tương ứng trong `src/components/templates/<feature>/`**  
   - Đọc file `index.ts` của thư mục đó để thấy ngay danh sách các template.
3. **Bước 3: Mở file component cụ thể**  
   - Tất cả các props đều được định nghĩa rõ ràng ở đầu file (`interface <ComponentName>Props`).

### 5.2. Hướng dẫn Chỉnh sửa Template Hiện có
- **Sửa text hướng dẫn hoặc mẹo**: Mở file `<feature>-guidance-card.tsx` tương ứng, cập nhật mảng `tips: [...]` hoặc `description`.
- **Thêm trường dữ liệu hiển thị**: Mở interface props của template, bổ sung trường dữ liệu (ví dụ thêm `expiryDate?: string`), sau đó chèn vào JSX và chạy `npm test` để kiểm tra tương thích.
- **Tuân thủ giới hạn 350 dòng**: Nếu component phình to, tách phần hiển thị con ra thành sub-component (vd: `SceneRow`, `MetricItem`).

### 5.3. Hướng dẫn Tạo Mới Template Cho Một Chức Năng Mới
Khi hệ thống có thêm tính năng mới:
1. Tạo thư mục `src/components/templates/<new-feature>/`.
2. Tạo file hướng dẫn `<new-feature>-guidance-card.tsx` sử dụng `<FeatureGuidanceCard />`.
3. Tạo các file output card phục vụ chức năng đó (kế thừa các quy chuẩn viền, nút bấm, badge).
4. Tạo `src/components/templates/<new-feature>/index.ts` export toàn bộ.
5. Re-export trong `src/components/templates/index.ts`.
6. Cập nhật tài liệu SSOT này.

---

## 6. QUY TRÌNH KIỂM THỬ & NGHIỆM THU (VERIFICATION PROTOCOL)

Trước khi commit bất kỳ thay đổi nào liên quan đến template:

1. **Kiểm tra Unit Test**:
   ```bash
   npm test
   ```
   *Bắt buộc 100% tests passed. **521/521 test xanh trên 69 tệp test** (anh Tony chạy đúng lệnh `npm test` trên máy thật, 18/09, cùng đợt xác minh nợ #105 — `tests/tenant/**` không tính vào đây vì cần database riêng `_test`, chạy bằng `npm run test:tenant` riêng, xem `tests/helpers/database.ts`). Con số này đổi liên tục theo mỗi đợt thêm tính năng (17/09 từng là 485/485/67 tệp, trước đó "309/309" ngày 14/09 đã lỗi thời từ lâu) — khi đọc tài liệu này, ưu tiên chạy lại `npm test` thật thay vì tin số ghi cứng ở đây, số chỉ có giá trị tại đúng thời điểm ghi. Nợ #100 trong `TECHNICAL_DEBT.md` — đã trả.*

2. **Kiểm tra TypeScript & Clean Code**:
   ```bash
   npx tsc --noEmit
   ```
   *Không phát sinh bất kỳ lỗi gãy type nào trong toàn bộ thư mục `src/components/templates/`.*

3. **Kiểm tra Trực quan Giao diện**:
   - Truy cập `http://localhost:3100/tai-anh?tab=m01a`, `m01b`, `m01c`.
   - Kiểm tra khối hướng dẫn có viền đỏ đứt nét `border-dashed border-red-300`, nền hồng dịu `bg-red-50/70`, badge đỏ và tips gạch đầu dòng rõ ràng.
   - Nút hành động chuẩn hóa nằm ở góc trên bên phải.

---

## 7. LỊCH SỬ HOÀN THIỆN TEMPLATE SYSTEM (HỢP NHẤT TỪ KE_HOACH_HOAN_THIEN_TEMPLATE_SYSTEM.MD)

Đợt hoàn thiện quy chuẩn Template System và Product Master Index ngày 17–18/09/2026 (P-Fix-0 $\rightarrow$ P-Fix-6) đã nghiệm thu hoàn tất:
- **P-Fix-0 & P-Fix-1 (Vá dữ liệu thương mại):** Hợp nhất occasion (#92) và xử lý giá bán lẻ (#87 — không lưu giá tĩnh, giá qua `quotePrice()`).
- **P-Fix-2 (Atomic BOM):** Khôi phục cấu trúc `FoliageBomItem[]`, `AccessoryBomItem[]`, `WrappingLayer[]` (#88), bổ sung `budCount`, `damagedCount`, `tierCount` (#90), chuẩn hóa vai trò hoa (#89).
- **P-Fix-3 (Trường đặc thù ngành hoa):** Tồn kho theo chi nhánh (mẫu bó sẵn), độ tươi cấp tổ chức.
- **P-Fix-4 & P-Fix-5 (Template Component Harmonization):** Chuẩn hóa 5 họ template, `<FeatureGuidanceCard />` và xuất khẩu sạch.
- **P-Fix-6 (Chống tái lệch tài liệu ↔ code):** Cổng tự động `scripts/check-template-ssot.ts` bảo vệ CI vĩnh viễn.
