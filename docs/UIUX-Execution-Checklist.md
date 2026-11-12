# Checklist thực thi & tích hợp UI/UX — 10 chức năng lõi ALG

> [!NOTE]
> **NGUỒN SỰ THẬT DUY NHẤT (OSOT) CHO TIẾN ĐỘ THỰC THI & TÍCH HỢP UI/UX**  
> Tệp này là tài liệu hợp nhất chính thức giữa **Checklist tính năng giao diện** và **Checklist tích hợp Backend API** cho toàn bộ 10 chức năng lõi ALG (thay thế và chuẩn hóa từ `UIUX-Feature-Checklist.md` và `UIUX-Integrate-Checklist.md`).  
> **Đặc tả thiết kế & tương tác chi tiết:** [`docs/ALG-UIUX-10-chuc-nang.md`](ALG-UIUX-10-chuc-nang.md).  
> **Lộ trình kiến trúc tổng thể:** [`docs/kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md`](kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md#15-kế-hoạch-thực-thi-tổng-thể).

**Quy ước trạng thái tính năng:**
- ✅ **Đã code & kết nối** — Giao diện hoàn thiện, gọi API thật hoặc xử lý trọn vẹn, có error handling.
- 🔧 **Cần hoàn thiện** — Backend đã có sẵn trên core/proxy, UI cần hoàn tất tích hợp API hoặc mapping dữ liệu.
- ❌ **Chờ backend** — Chờ API từ các pha tương ứng của Tuyến B (P16–P23).

---

## 1. Bảng tổng quan 10 chức năng lõi

| # | Chức năng | Đường dẫn UI | Module | Backend Core | Tính năng UI | Trạng thái tích hợp |
|---|-----------|--------------|--------|--------------|--------------|----------------------|
| 1 | Phân tích sản phẩm AI | `/tai-anh`, `/kho-du-lieu` | M01/M01b/M01c | ✅ `vision/analyses`, `product-copies` | 28/29 Đã code | ✅ Đã kết nối API thật |
| 2 | AI Creative Studio | `/creative-studio` | M04a/M04b | ✅ `media/optimizations`, `media/background-removal` | 14/14 Đã code | ✅ Đã kết nối API thật & Commercial Ready |
| 3 | AI Video Studio | `/video` | M04c | ✅ `video/jobs`, `workers/media_ai/video` | 14/14 Đã code | ✅ Đã kết nối API thật & Commercial Ready |
| 4 | AI Content Engine | `/noi-dung` | M07 | ❌ Chờ P18 | 0/10 Chờ backend | ❌ Chờ P18 backend |
| 5 | Social Publishing | `/lich-dang` | M07 | ❌ Chờ P18 | 0/10 Chờ backend | ❌ Chờ P18 backend |
| 6 | Catalog & Website | `/catalog` | M06/M05 | ✅ `products`, `catalog-links` | 7/13 Đã code | 🔧 Cần hoàn thiện |
| 7 | CRM & Khách hàng | `/khach-hang` | M09 | ❌ Chờ P21 | 0/11 Chờ backend | ❌ Chờ P21 backend |
| 8 | Đơn hàng & Vận hành | `/don-hang` | M10 | ❌ Chờ P22 | 0/13 Chờ backend | ❌ Chờ P22 backend |
| 9 | AI Chat Assistant | `/hoi-thoai` | M08 | ❌ Chờ P23 | 0/12 Chờ backend | ❌ Chờ P23 backend |
| 10 | Analytics & Learning | `/so-lieu` | M11 | ✅ `usage`, `ai-governance` | 7/12 Đã code | 🔧 Cần hoàn thiện |
| | **Tổng cộng** | | | | **70/128 (55%)** | **5 màn hình sẵn sàng backend** |

---

## #1 — Phân tích sản phẩm AI (M01/M01b/M01c)
**Đường dẫn:** `src/app/(app)/tai-anh/page.tsx` & `src/app/(app)/kho-du-lieu/page.tsx`  
**Backend:** Đã có đầy đủ trên core (`src/modules/products/`, `src/modules/product-copies/`, `src/modules/assets/`).

### A. Checklist tính năng UI/UX

#### Luồng chính: M01a — Tải ảnh & Phân tích cấu phần hoa
| # | Tính năng | Trạng thái | Ghi chú kỹ thuật |
|---|-----------|------------|------------------|
| 1.1 | Tải ảnh (1 hoặc nhiều) từ thiết bị | ✅ Đã code | Dropzone, asset upload preview |
| 1.2 | Nút "Phân tích" tạo job M01 | ✅ Đã code | `POST /api/v1/vision/analyses` + `Idempotency-Key` |
| 1.3 | Thanh tiến trình theo stage thật | ✅ Đã code | Polling `GET /vision/analyses/:id` hoặc SSE |
| 1.4 | Nút Huỷ khi job PENDING | ✅ Đã code | Cancel job handling |
| 1.5 | **Thẻ kết quả 1 (M01a)**: đặc điểm nhận diện | ✅ Đã code | Danh sách hoa, màu sắc, số cành, kiểu dáng |
| 1.6 | Sửa/Thêm/Bớt trường Thẻ 1 | ✅ Đã code | `PATCH /analyses/:id` ghi vào `edited` |
| 1.7 | **Duyệt** Thẻ 1 → ghi Product Master | ✅ Đã code | `POST /analyses/:id/approve` (H3) |
| 1.8 | **Từ chối** Thẻ 1 (đóng, không chạm PM) | ✅ Đã code | `POST /analyses/:id/reject` (H3) |
| 1.9 | Lưu nháp Thẻ 1 | ✅ Đã code | `PATCH` với payload edited fields |
| 1.10 | Độ tin cậy trường dưới ngưỡng bôi vàng | ✅ Đã code | Cảnh báo thị giác không chặn duyệt |
| 1.11 | Tải nhiều ảnh → hỏi "cùng sản phẩm?" | 🔧 Cần hoàn thiện | Đã có logic UI, cần hoàn thiện luồng lô |

#### Luồng thương mại: M01b — Sinh dữ liệu bán hàng
| # | Tính năng | Trạng thái | Ghi chú kỹ thuật |
|---|-----------|------------|------------------|
| 1.12 | Gợi ý "Sinh nội dung bán hàng" sau duyệt Thẻ 1 | ✅ Đã code | Nút CTA chuyển tiếp gọi `POST /product-copies/generate` |
| 1.13 | **Thẻ kết quả 2 (M01b)**: nội dung bán hàng | ✅ Đã code | `generateProductCopyApi` → `mapProductCopyToFields2` |
| 1.14 | Sửa/Thêm/Bớt trường Thẻ 2 | ✅ Đã code | Tên thương mại, mô tả, dịp, phong cách, phân khúc giá |
| 1.15 | Duyệt Thẻ 2 → ghi Product Master | ✅ Đã code | `POST /product-copies/:id/approve` (H6) |
| 1.16 | Lưu vào Kho sản phẩm → Quay về | ✅ Đã code | Chuyển tiếp trạng thái lưu trữ |

#### Luồng mở rộng: M01c — Thẻ Chào Khách Bán Hàng & Kịch Bản Tư Vấn
| # | Tính năng | Trạng thái | Ghi chú kỹ thuật |
|---|-----------|------------|------------------|
| 1.17 | **Thẻ kết quả 3 (M01c)**: Tổng hợp M01a + M01b | ✅ Đã code | Component `SalesPitchCard` + `sales-pitch-template.ts` |
| 1.18 | **Chỉnh sửa 100% 8 khối trường dữ liệu** | ✅ Đã code | Tên, SKU, Shop, Hotline, Phong cách, Dịp, Cảm xúc, Cấu phần BOM, Kích thước, Báo giá, Quà tặng, Cam kết, Ghi chú |
| 1.19 | **Chốt duyệt & Xuất bản Final** (Badge `FINAL`) | ✅ Đã code | Khóa form, lưu vào kho, hỗ trợ mở khóa sửa lại nếu cần |
| 1.20 | **Kiến trúc 3 Tab hiển thị độc lập cách ly** | ✅ Đã code | Tab 1: Chỉnh sửa, Tab 2: Thẻ chào khách A6, Tab 3: Kịch bản Zalo (chỉ hiện 1 tab duy nhất, không chia đôi) |
| 1.21 | **Kịch bản Zalo định dạng emoji** + 1-chạm sao chép | ✅ Đã code | Format chuẩn Sales Rep, nút copy clipboard kèm toast |
| 1.22 | **Thẻ trực quan A6 Card View Preview** | ✅ Đã code | Mockup tỷ lệ 105×148mm sang trọng với ảnh hoa, giá, quà |
| 1.23 | **Bộ công cụ xuất file đa định dạng** | ✅ Đã code | Copy ảnh vào Zalo (`navigator.clipboard.write`), Tải PNG Retina 2x, Tải JPEG 95%, Xuất PDF A6 (`jspdf`) |

#### Kho Dữ Liệu Sản Phẩm (`/kho-du-lieu`) & Sidebar DesktopNav
| # | Tính năng | Trạng thái | Ghi chú kỹ thuật |
|---|-----------|------------|------------------|
| 1.24 | **Mục "Kho Dữ liệu" trên thanh Sidebar chính** | ✅ Đã code | `DesktopNav` icon `Folder` trỏ sang `/kho-du-lieu` |
| 1.25 | **Kho phân vùng 1: Ảnh gốc (Raw Photos)** | ✅ Đã code | Lưới ảnh thiết bị & server, nút "Phân tích ảnh này" |
| 1.26 | **Kho phân vùng 2: Ảnh đã duyệt (M01a Approved)** | ✅ Đã code | Thẻ cấu phần đã duyệt, nút "Sinh Copy" & "Tạo Thẻ Chào" |
| 1.27 | **Kho phân vùng 3: Sale Pitch đã hoàn thành (Final)** | ✅ Đã code | Danh sách Thẻ chào hoàn thiện, nút "Xem", "Copy Zalo", "Xóa" |
| 1.28 | **Điều hướng 2 chiều qua URL query params** | ✅ Đã code | Nhảy mượt mà giữa `/kho-du-lieu` và `/tai-anh` theo tab/id |
| 1.29 | **Chuẩn hóa khối hướng dẫn thao tác (Feature Guidance Callout)** | ✅ Đã code | `<FeatureGuidanceCard />` (`border-dashed border-red-300`, `bg-red-50/70`, badge đỏ, tips bar). Áp dụng toàn bộ M01a/M01b/M01c & quy chuẩn toàn hệ thống |

### B. Backend APIs & Kết nối
| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|------------|
| `/api/v1/products` | GET | L1 | Lấy danh sách sản phẩm | ✅ Đã có |
| `/api/v1/assets` | GET/POST | G1 | Quản lý & tải ảnh gốc | ✅ Đã có |
| `/api/v1/vision/analyses` | POST | H1 | Tạo job phân tích (bắt buộc `Idempotency-Key`) | ✅ Đã có |
| `/api/v1/vision/analyses/:id` | GET/PATCH | H1/H2 | Lấy kết quả & lưu nháp `edited` | ✅ Đã có |
| `/api/v1/vision/analyses/:id/approve` | POST | H3 | Duyệt Thẻ 1 ghi Product Master | ✅ Đã có |
| `/api/v1/vision/analyses/:id/reject` | POST | H3 | Từ chối Thẻ 1 | ✅ Đã có |
| `/api/v1/product-copies/generate` | POST | H5 | Sinh nội dung bán hàng M01b | ✅ Đã có |
| `/api/v1/product-copies/:id` | GET/PATCH | H5 | Lấy & sửa Thẻ 2 M01b | ✅ Đã có |
| `/api/v1/product-copies/:id/approve` | POST | H6 | Duyệt Thẻ 2 ghi Product Master | ✅ Đã có |
| `/api/v1/product-copies/:id/reject` | POST | H6 | Từ chối Thẻ 2 | ✅ Đã có |
| `/api/v1/jobs/:id/events` | GET (SSE) | G4 | Theo dõi tiến trình phân tích | ✅ Đã có |

---

## #2 — AI Creative Studio (M04a/M04b)
**Đường dẫn:** `src/app/(app)/creative-studio/page.tsx`  
**Backend:** Đã hoàn thiện M04a (`src/modules/media/`) + Engine AI Bóc tách phông M04b (`/api/v1/media/background-removal`, `process_m04b_variants.py` & `src/lib/variant-compositor.ts`).

### A. Checklist tính năng UI/UX
- **Khu vực A (Tối ưu ảnh gốc — M04a):**
  - [x] Chọn sản phẩm & chọn ảnh gốc từ kho asset (`GET /api/v1/assets`)
  - [x] Nút "Tối ưu ảnh" tạo job M04a (`POST /api/v1/media/optimizations`)
  - [x] Thanh tiến trình theo stage: ANALYZING → ENHANCING → REFRAME → OUTPUTS
  - [x] **Identity Guard**: Phân loại AN TOÀN / TỐT / CẢNH BÁO / TỪ CHỐI (REJECTED ẩn nút Duyệt)
  - [x] Thẻ Before/After và xem 4 tỷ lệ (1:1, 4:5, 9:16, 16:9)
  - [x] Sửa nhẹ độ sáng / độ tương phản (Tự động trong AI enhancer pipeline)
  - [x] **Duyệt Master Image** (Trần cứng `dieu_hanh`, capability `I2`)
  - [x] Tải ảnh đã tối ưu về máy (`GET /media/optimizations/:id/download` — `I3`)
  - [x] Thu gọn Area A khi đã có Master Image đã duyệt (Accordion collapse)
- **Khu vực B (Biến thể marketing — M04b):**
  - [x] Chọn Master Image đã duyệt làm phôi gốc (Card Master Picker)
  - [x] AI Background Removal nội bộ Core (`POST /api/v1/media/background-removal`, mô hình Bria-RMBG/U2-Net)
  - [x] Hoàn thiện mapping 3 biến thể Marketing: PNG trong suốt, Preset bối cảnh, Đa kênh Watermark
  - [x] Lưới chọn biến thể marketing theo nền (6 Presets: Gỗ Bắc Âu, Studio Trắng, Tiệc Cưới Bokeh, Phòng Khách, Khách Sạn) × tỉ lệ (1:1, 4:5, 9:16) kèm Watermark
  - [x] **Bảo toàn 100% cuống cành hoa**: Tắt Arm Fadeout xóa đáy nhầm, bảo vệ Stem Corridor (20%–80%)
  - [x] **Global Image Zoom Modal**: Phóng to toàn màn hình soi chi tiết đường cắt và cánh hoa
  - [x] Tải về 1-chạm (One-click Download PNG/JPEG)

### B. Backend APIs & Kết nối
| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|------------|
| `/api/v1/media/optimizations` | POST | I1 | Tạo job M04a (kèm `Idempotency-Key`) | ✅ Đã có |
| `/api/v1/media/optimizations/:id` | GET | I1 | Kiểm tra trạng thái tối ưu | ✅ Đã có |
| `/api/v1/media/optimizations/:id/approve` | POST | I2 | Duyệt Master Image (trần `dieu_hanh`) | ✅ Đã có |
| `/api/v1/media/optimizations/:id/download` | GET | I3 | Lấy URL tải ảnh Master | ✅ Đã có |
| `/api/v1/media/background-removal` | POST | I1 | Bóc tách nền AI Deep Learning (Bria-RMBG/U2-Net) & Studio Compositor | ✅ Đã có |
| `/api/v1/proxy/api/m04b/background-removal` | POST | (proxy) | Xóa nền AI qua SocialFlow (dự phòng) | ✅ Đã có |

---

## #3 — AI Video Studio (M04c)
**Đường dẫn:** `src/app/(app)/video/page.tsx`  
**Backend:** Đã hoàn thiện toàn diện trên Core (`src/modules/video-studio/`) + Video Render Worker daemon (`workers/media_ai/video/`).

### A. Checklist tính năng UI/UX
- [x] Chọn sản phẩm có Master Image đã duyệt (`GET /api/v1/products`)
- [x] Chọn khuôn video chuẩn thương mại 6 định dạng (TikTok 15s/30s/45s 9:16, Reels 30s 9:16, Feed 15s/30s 1:1, Landscape 30s 16:9)
- [x] Cấu hình âm thanh & visual: Nhạc nền, giọng đọc AI Edge TTS, 4 phong cách phụ đề (Modern Badge, Minimal, Highlight Box, Bottom Banner), logo watermark
- [x] Modal xác nhận chi phí tín dụng (Credit Cost Confirmation) trước khi tạo job (`VideoCreateModal`)
- [x] Biên soạn kịch bản Storyboard trực quan & linh hoạt 2–15 cảnh (`StoryboardEditor`)
- [x] **Tự động cân bằng thời lượng (Auto-balancing Scene Duration)** khi thêm/bớt phân cảnh
- [x] **Nút xóa cảnh nổi bật (`[🗑️ Xóa cảnh]`)** màu đỏ rõ ràng, thao tác mượt mà
- [x] **Menu Camera Motion Ken Burns điện ảnh**: Zoom In, Zoom Out, Pan Up, Pan Right, Static luân phiên
- [x] Khóa chặt khung đầu & khung cuối vào Master Image / biến thể đã duyệt (`YC-M4`)
- [x] **Cổng duyệt 1: Duyệt kịch bản** (`POST /api/v1/video/jobs/:id/approve-script` — `P3`) trước khi render
- [x] **Dựng video non-blocking** qua Worker song song (`POST /api/v1/video/jobs/:id/deploy` — `P1`)
- [x] Theo dõi tiến trình render thời gian thực qua Server-Sent Events (`GET /api/v1/video/jobs/:id/events` — `G4`)
- [x] Trình phát video kết quả (HTML5 Player) kèm thông số kỹ thuật (tỉ lệ, thời lượng, dung lượng, credit)
- [x] **Cổng duyệt 2: Duyệt video thành phẩm** (`POST /api/v1/video/jobs/:id/approve-video` — `P4`)
- [x] Tải xuống video thành phẩm trực tiếp 1-chạm & lưu vào Thư viện Asset (`POST /api/v1/integration/assets`)
- [x] Xử lý lỗi & nút "Thử lại": Render lỗi không trừ hạn mức, có thể bấm Re-render ngay

### B. Backend APIs & Kết nối
| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|------------|
| `/api/v1/video/jobs` | POST | P1 | Tạo video job mới (kèm Idempotency-Key) | ✅ Đã có |
| `/api/v1/video/jobs` | GET | P1 | Lấy danh sách video jobs của tổ chức | ✅ Đã có |
| `/api/v1/video/jobs/:id` | GET | P1 | Chi tiết video job & kịch bản storyboard | ✅ Đã có |
| `/api/v1/video/jobs/:id` | PATCH | P1 | Cập nhật kịch bản (scenes, audio, subtitle) | ✅ Đã có |
| `/api/v1/video/jobs/:id/approve-script` | POST | P3 | Duyệt kịch bản trước khi render | ✅ Đã có |
| `/api/v1/video/jobs/:id/deploy` | POST | P1 | Đưa job vào hàng đợi render worker | ✅ Đã có |
| `/api/v1/video/jobs/:id/approve-video` | POST | P4 | Duyệt video thành phẩm chính thức | ✅ Đã có |
| `/api/v1/video/jobs/:id/events` | GET (SSE) | G4 | Luồng SSE trạng thái & tiến trình render | ✅ Đã có |
| `/api/v1/integration/assets` | POST | I3 | Lưu video thành phẩm vào Asset Store | ✅ Đã có |

---

## #6 — Catalog & Website (M06/M05)
**Đường dẫn:** `src/app/(app)/catalog/page.tsx`  
**Backend:** Đã có M06 trên core (`src/modules/catalog-links/`), M05 builder trên LocalBudd (qua proxy).

### A. Checklist tính năng UI/UX
- [x] Lưới sản phẩm đã duyệt từ Product Master (`GET /api/v1/products`)
- [x] Tab Quản lý Catalog Links: Danh sách bộ sưu tập đã xuất bản
- [x] Tạo link chia sẻ catalog mới (`POST /api/v1/catalog-links`) kèm bộ lọc dịp/màu/giá
- [x] Xem trước trang Catalog public (`/c/[slug]`)
- [x] Hiển thị mã QR code dẫn tới link catalog (`QRCode` component)
- [x] Thu hồi link catalog đã chia sẻ (`POST /catalog-links/:slug/revoke` — `J2`)
- [ ] Tab Landing page: Tích hợp builder M05 gọi qua proxy LocalBudd

### B. Backend APIs & Kết nối
| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|------------|
| `/api/v1/products` | GET | L1 | Lấy danh sách sản phẩm `status=ACTIVE` | ✅ Đã có |
| `/api/v1/catalog-links` | GET/POST | J1 | Lấy & tạo danh sách catalog link | ✅ Đã có |
| `/api/v1/catalog-links/:slug` | GET/PATCH | — / J1 | Xem public & cập nhật catalog | ✅ Đã có |
| `/api/v1/catalog-links/:slug/revoke` | POST | J2 | Thu hồi link catalog | ✅ Đã có |
| `/api/v1/proxy/api/v1/catalog-links` | GET | (proxy) | Proxy dữ liệu sang LocalBudd | ✅ Đã có |

---

## #10 — Analytics & Learning (M11)
**Đường dẫn:** `src/app/(app)/so-lieu/page.tsx`  
**Backend:** Đã có `src/modules/usage/`, `src/modules/audit/`, `src/modules/ai-governance/`.

### A. Checklist tính năng UI/UX
- [x] Thống kê sử dụng AI & Credit (`GET /api/v1/usage/summary`)
- [x] Lưới nhật ký lời gọi AI (`GET /api/v1/ai-requests`)
- [x] Lịch sử kiểm toán hệ thống (`GET /api/v1/audit-logs`)
- [x] Bảng cấu hình Chính sách AI của tổ chức (`GET/PUT /api/v1/ai-policy`)
- [ ] Map động 7 chỉ số kinh doanh từ API (Reach, Engagement, Inbox, CVR, Top post, Best product, ROI)
- [ ] Bộ lọc số liệu theo khoảng thời gian / chiến dịch
- [ ] Vòng học phong cách (chỉ hiển thị khi tổ chức có từ 20 bài viết có số liệu trở lên)

### B. Backend APIs & Kết nối
| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|------------|
| `/api/v1/usage/summary` | GET | G8 | Tóm tắt credit, chi phí, lượt gọi theo tính năng | ✅ Đã có |
| `/api/v1/ai-requests` | GET | U3 | Lịch sử request AI & kết quả kiểm duyệt | ✅ Đã có |
| `/api/v1/ai-policy` | GET/PUT | U1/U2 | Đọc & cấu hình chính sách AI tổ chức | ✅ Đã có |
| `/api/v1/audit-logs` | GET | G9 | Nhật ký kiểm toán hành động nghiệp vụ | ✅ Đã có |

---

## Các màn hình chờ Backend Tuyến B (P17–P23)

| Chức năng | Đường dẫn UI | Pha backend chờ | Mô tả phụ thuộc |
|-----------|--------------|-----------------|-----------------|
| **#4 AI Content Engine** | `/noi-dung` | **P18 (M07)** | Chờ bộ sinh bài viết đa kênh ngành hoa & template bài đăng |
| **#5 Social Publishing** | `/lich-dang` | **P18 (M07)** | Chờ cơ chế xác thực kênh xã hội & hàng đợi xuất bản tự động |
| **#7 CRM & Khách hàng** | `/khach-hang` | **P21 (M09)** | Chờ 4 bảng khách hàng, thẻ phân loại và cơ chế nhắc mua lại chu kỳ |
| **#8 Đơn hàng & Vận hành** | `/don-hang` | **P22 (M10)** | Chờ 4 bảng đơn hàng, pipeline xử lý đơn & tính toán giá vốn |
| **#9 AI Chat Assistant** | `/hoi-thoai` | **P23 (M08)** | Chờ 2 bảng hội thoại, streaming SSE và kết nối với tri thức cửa hàng |
