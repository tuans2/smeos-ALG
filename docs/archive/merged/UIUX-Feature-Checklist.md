# Checklist tính năng — 10 chức năng UI/UX

> [!NOTE]
> **ĐÃ ĐƯỢC HỢP NHẤT VÀO TÀI LIỆU CHUẨN (OSOT)**  
> Tệp này đã được hợp nhất cùng `UIUX-Integrate-Checklist.md` vào **[`docs/UIUX-Execution-Checklist.md`](../../UIUX-Execution-Checklist.md)**.  
> Vui lòng theo dõi và cập nhật tiến độ thực thi UI & API tại tài liệu hợp nhất để đảm bảo tính duy nhất của dữ liệu.

**Cơ sở:** `docs/ALG-UIUX-10-chuc-nang.md` — đặc tả UI/UX 10 chức năng lõi.
**Mục đích:** Rà soát từng tính năng, xác định trạng thái (Đã code / Cần code / Chờ backend), và tiếp tục triển khai theo thứ tự ưu tiên.

**Quy ước trạng thái:**
- ✅ **Đã code** — UI có thật, gọi API thật, xử lý error (401/403/409/502)
- 🔧 **Cần code** — backend đã có, UI cần hoàn thiện (mock → API thật, hoặc UI components thiếu)
- ❌ **Chờ backend** — tính năng cần API chưa tồn tại (P17–P23)
- 📐 **Chờ thiết kế** — tính năng cần đặc tả chi tiết hơn trước khi code

---

## Tổng quan

| # | Chức năng | Module | Tổng tính năng | Đã code | Cần code | Chờ backend |
|---|-----------|--------|---------------|---------|----------|-------------|
| 1 | Phân tích sản phẩm AI | M01/M01b/M01c | 28 | 27 | 1 | 0 |
| 2 | AI Creative Studio | M04a/M04b | 14 | 8 | 4 | 2 |
| 3 | AI Video Studio | M04c | 14 | 14 | 0 | 0 |
| 4 | AI Content Engine | M07 | 10 | 0 | 0 | 10 |
| 5 | Social Publishing | M07 | 10 | 0 | 0 | 10 |
| 6 | Catalog & Website | M06/M05 | 13 | 11 | 0 | 2 |
| 7 | CRM & Khách hàng | M09 | 11 | 0 | 0 | 11 |
| 8 | Đơn hàng & Vận hành | M10 | 13 | 0 | 0 | 13 |
| 9 | AI Chat Assistant | M08 | 12 | 0 | 0 | 12 |
| 10 | Analytics & Learning | M11 | 12 | 7 | 2 | 3 |
| | **Tổng** | | **132** | **67** | **7** | **58** |

---

## #1 — Phân tích sản phẩm AI (M01/M01b) — `tai-anh` ✅ ĐÃ CODE (9/11)

### Luồng chính: Tải ảnh → Phân tích → Sửa → Duyệt → Lưu

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 1.1 | Tải ảnh (1 hoặc nhiều) | ✅ Đã code | UI có, assets listing thật |
| 1.2 | Nhấn "Phân tích" tạo job M01 | ✅ Đã code | POST /api/v1/vision/analyses + Idempotency-Key |
| 1.3 | Thanh tiến trình theo stage thật | ✅ Đã code | Polling GET /vision/analyses/:id |
| 1.4 | Nút Huỷ khi job PENDING | ✅ Đã code | (cần verify) |
| 1.5 | **Thẻ kết quả 1**: đặc điểm nhận diện | ✅ Đã code | Fields thật từ M01 result |
| 1.6 | Sửa/Thêm/Bớt trường Thẻ 1 | ✅ Đã code | PATCH /analyses/:id {edited} |
| 1.7 | **Duyệt** Thẻ 1 → ghi Product Master | ✅ Đã code | POST /analyses/:id/approve |
| 1.8 | **Từ chối** Thẻ 1 (đóng, không chạm PM) | ✅ Đã code | POST /analyses/:id/reject |
| 1.9 | Lưu nháp Thẻ 1 | ✅ Đã code | PATCH với edited fields |
| 1.10 | Độ tin cậy trường → bôi vàng cảnh báo | ✅ Đã code | UI có, không chặn |
| 1.11 | Tải nhiều ảnh → hỏi "cùng sản phẩm?" | 🔧 Cần code | UI có logic, cần verify flow |

### Luồng phụ: M01b — Sinh nội dung bán hàng

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 1.12 | Gợi ý "Sinh nội dung bán hàng" sau duyệt Thẻ 1 | ✅ Đã code | Nút gợi ý hiện sau duyệt, gọi POST /product-copies/generate |
| 1.13 | Sinh nội dung bán hàng (M01b) → Thẻ kết quả 2 | ✅ Đã code | `generateProductCopyApi` → `mapProductCopyToFields2` |
| 1.14 | Sửa/Thêm/Bớt Thẻ 2 (tên, mô tả, thẻ phân loại, tone, phong cách, dịp) | ✅ Đã code | `handleFieldChange2/Add2/Remove2`, PATCH /product-copies/:id |
| 1.15 | Duyệt Thẻ 2 → ghi phần bán hàng vào Product Master | ✅ Đã code | `handleApprove2` → POST /product-copies/:id/approve (H6) |
| 1.16 | Lưu vào Kho sản phẩm → Quay về Trang chủ | ✅ Đã code | Sau approve, `goSaved()` |

### Luồng mở rộng: M01c — Thẻ Chào Sản Phẩm & Kịch bản tư vấn Sales

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 1.17 | **Thẻ kết quả 3 (M01c)**: Tổng hợp dữ liệu M01a + M01b | ✅ Đã code | Component `SalesPitchCard` + `sales-pitch-template.ts` |
| 1.18 | **Chỉnh sửa toàn bộ thông tin (8 khối trường)** trước khi xuất bản | ✅ Đã code | Tên, SKU, Hotline, Phong cách, Dịp, Cảm xúc, Cấu phần BOM, Kích thước, Báo giá, Quà tặng, Cam kết, Ghi chú |
| 1.19 | **Chốt duyệt & Xuất bản Final** (Badge `FINAL`) | ✅ Đã code | Khóa form, chuyển badge FINAL, hỗ trợ mở khóa sửa lại nếu cần |
| 1.20 | **Kiến trúc 3 Tab độc lập cách ly hiển thị** (Single Tab Isolation) | ✅ Đã code | Tab 1: Chỉnh sửa, Tab 2: Thẻ chào khách, Tab 3: Kịch bản Zalo (chỉ hiển thị 1 tab duy nhất, không chia đôi) |
| 1.21 | **Kịch bản Zalo** định dạng emoji + 1-chạm sao chép | ✅ Đã code | Format chuẩn Sales Rep, nút copy clipboard kèm toast thông báo |
| 1.22 | **Thẻ trực quan A6 Card Preview** | ✅ Đã code | Mockup thẻ thiệp A6 (105×148mm) sắc nét với ảnh hoa, giá, quà tặng |
| 1.23 | **Bộ công cụ xuất đa định dạng**: Copy Zalo, PNG, JPEG, PDF A6 | ✅ Đã code | ClipboardItem binary PNG, html-to-image (PNG 2x, JPEG 95%), jsPDF (A6) |

### Kho Dữ Liệu Sản Phẩm (`/kho-du-lieu`) & Sidebar DesktopNav

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 1.24 | **Mục "Kho Dữ liệu" trên thanh Sidebar chính** | ✅ Đã code | `DesktopNav` icon `Folder` trỏ tới `/kho-du-lieu` |
| 1.25 | **Kho phân vùng 1: Ảnh gốc (Raw Photos)** | ✅ Đã code | Lưới ảnh thiết bị & server, nút "Phân tích ảnh này" nối sang `/tai-anh` |
| 1.26 | **Kho phân vùng 2: Ảnh đã duyệt (M01a Approved)** | ✅ Đã code | Thẻ cấu phần đã duyệt, nút "Sinh Copy (M01b)" & "Tạo Thẻ Chào (M01c)" |
| 1.27 | **Kho phân vùng 3: Sale Pitch đã hoàn thành (Final)** | ✅ Đã code | Danh sách Thẻ chào hoàn thiện, nút "Xem Thẻ Chào", "Copy nhanh Zalo", "Xóa" |
| 1.28 | **Điều hướng 2 chiều qua URL query params** | ✅ Đã code | Nhảy mượt mà giữa `/kho-du-lieu` và `/tai-anh` theo tab/id |

---

## #2 — AI Creative Studio (M04a/M04b) — `creative-studio` ✅ ĐÃ CODE (8/14)

### Khu vực A — Tối ưu ảnh gốc (bắt buộc trước)

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 2.1 | Chọn sản phẩm (đã qua bước 1) | ✅ Đã code | GET /api/v1/products |
| 2.2 | Chọn ảnh gốc | ✅ Đã code | GET /api/v1/assets |
| 2.3 | Nhấn "Tối ưu ảnh" tạo job M04a | ✅ Đã code | POST /api/v1/media/optimizations + Idempotency-Key |
| 2.4 | Thanh tiến trình (phân tích → tách → tăng cường → bố cục) | ✅ Đã code | Polling |
| 2.5 | **Identity Guard**: AN TOÀI / TỐT / CẢNH BÁO / TỪ CHỐI | ✅ Đã code | Xử lý REJECTED → ẩn Duyệt |
| 2.6 | Thẻ Before/After + 4 tỉ lệ (1:1, 4:5, 9:16, 16:9) | ✅ Đã code | |
| 2.7 | Sửa nhẹ (sáng/tương phản) | 🔧 Cần code | UI có, verify mapping |
| 2.8 | **Duyệt** Master Image (trần cứng dieu_hanh) | ✅ Đã code | POST /optimizations/:id/approve |
| 2.9 | Lưu vào Kho ảnh sản phẩm | ✅ Đã code | |
| 2.10 | **Tải ảnh** đã tối ưu về máy | ✅ Đã code | GET /optimizations/:id/download (I3) |
| 2.11 | Identity Guard TỪ CHỐI → Chạy lại / Bỏ qua | ✅ Đã code | Ẩn Duyệt, hiện Chạy lại |
| 2.12 | Đã có Master Image → thu gọn Area A + nút "Tối ưu lại" | 🔧 Cần code | UI có, cần verify |

### Khu vực B — Biến thể marketing (sau khi có Master Image)

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 2.13 | Chọn Master Image đã duyệt | 🔧 Cần code | UI có, nguồn mock |
| 2.14 | Chọn nền × bố cục × tỉ lệ × chiến dịch | ❌ Chờ backend | VARIANTS mock |
| 2.15 | Thao tác: Xoá nền · Đổi nền · Mở rộng khung · Retouch · Watermark · Biến thể hàng loạt | ❌ Chờ backend | |
| 2.16 | Lưới thẻ kết quả (ảnh, nền, tỉ lệ, generative_fill) | ❌ Chờ backend | Mock |
| 2.17 | Chọn thẻ muốn giữ, bỏ thẻ không dùng | ❌ Chờ backend | |
| 2.18 | **Duyệt** từng thẻ hoặc "Duyệt tất cả" | ❌ Chờ backend | |
| 2.19 | Lưu vào Kho ảnh marketing | ❌ Chờ backend | |
| 2.20 | Proxy M04b background-removal | ✅ Proxy có | Mapping kết quả cần hoàn thiện |
| 2.21 | Ranh giới cứng: "Biến thể không thay đổi chính bó hoa" | 🔧 Cần code | UI có, verify |

---

## #3 — AI Video Studio (M04c) — `video` ✅ ĐÃ CODE & TÍCH HỢP TOÀN DIỆN (14/14)

**Đã hoàn thành P17 (09/16).** Hạ tầng job, video render worker song song, Storyboard linh hoạt 2–15 cảnh, auto-balancing duration, Camera Motion Ken Burns (5 motions luân phiên), 4 phong cách phụ đề, Edge TTS ducking nhạc nền, 2 cổng duyệt độc lập, kiến trúc Provider cắm rút (Option A Local Cinematic 0 credit + Option B Standby Veo/HeyGen qua .env).

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 3.1 | Chọn sản phẩm có Master Image đã duyệt | ✅ Đã code | Dropdown sản phẩm kèm ảnh đại diện Master Image |
| 3.2 | Chọn khuôn video (6 khuôn: Reel 30s, TikTok 15s/30s/45s, Story, Feed 1:1, Landscape 16:9) | ✅ Đã code | `VIDEO_FORMAT_SPECS` đầy đủ thông số tỉ lệ và thời lượng |
| 3.3 | Cấu hình: nhạc nền, giọng đọc, phụ đề (4 styles), CTA, logo | ✅ Đã code | Edge TTS tiếng Việt, 4 phong cách phụ đề, nhạc nền đa dạng |
| 3.4 | Nhấn "Dựng kịch bản" tạo video job | ✅ Đã code | `POST /api/v1/video/jobs` kèm `VideoCreateModal` xác nhận chi phí |
| 3.5 | Thẻ kịch bản: danh sách cảnh (ảnh, thời lượng, chuyển động, phụ đề) | ✅ Đã code | `StoryboardEditor` trực quan, hiển thị timeline từng phân cảnh |
| 3.6 | Sửa thứ tự cảnh / đổi ảnh nguồn / sửa phụ đề / chọn Camera Motion | ✅ Đã code | Menu Camera Motion (Zoom In/Out, Pan Up/Right, Static), tự động cân bằng thời lượng (auto-balance duration), nút xóa cảnh đỏ nổi bật (`[🗑️ Xóa cảnh]`), linh hoạt 2–15 cảnh |
| 3.7 | **Duyệt kịch bản** (trước khi tốn chi phí) | ✅ Đã code | `POST /api/v1/video/jobs/:id/approve-script` gác quyền `P3` |
| 3.8 | Nhấn "Dựng video" (non-blocking qua worker) | ✅ Đã code | `POST /api/v1/video/jobs/:id/deploy` đẩy job sang worker render |
| 3.9 | Thẻ kết quả: trình phát + thời lượng + tỉ lệ + chi phí ước tính | ✅ Đã code | Trình phát video HTML5 xem trước kèm thông số render |
| 3.10 | **Duyệt video** (sau kết quả cuối) | ✅ Đã code | `POST /api/v1/video/jobs/:id/approve-video` gác quyền `P4` |
| 3.11 | Lưu vào Kho video & Asset Store | ✅ Đã code | Tải video MP4 và lưu bản ghi vào `POST /api/v1/integration/assets` |
| 3.12 | Hai cổng duyệt tách rời (kịch bản ≠ video) | ✅ Đã code | `approve-script` tách biệt với `approve-video`, kiểm soát chi phí |
| 3.13 | Khung đầu/cuối khoá vào ảnh đã duyệt | ✅ Đã code | Ràng buộc nghiệp vụ `YC-M4` khóa chặt vào Master Image |
| 3.14 | Job dựng video lỗi → "Dựng thất bại — thử lại", không trừ hạn mức | ✅ Đã code | Nút "Thử lại" kích hoạt re-render mà không mất hạn mức |

---

## #4 — AI Content Engine (M07 phần sinh) — `noi-dung` ❌ CHƯA CODE (0/10)

**Chờ P18.** Sinh văn bản chung đã có, chưa gắn sản phẩm thật, chưa Zalo OA.

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 4.1 | Chọn sản phẩm (Product Master + ảnh đã duyệt) | ❌ | |
| 4.2 | Chọn kênh: Facebook, Instagram, TikTok, Zalo OA | ❌ | |
| 4.3 | Chọn dịp/chủ đề (tùy chọn, AI tự gợi ý nếu để trống) | ❌ | |
| 4.4 | Nhấn "Sinh nội dung" — một lượt mỗi kênh | ❌ | |
| 4.5 | Thẻ kết quả riêng từng kênh: | ❌ | |
| 4.5a | — Facebook: tiêu đề · nội dung · hashtag · ảnh/video | ❌ | |
| 4.5b | — Instagram: Caption · hashtag · ảnh | ❌ | |
| 4.5c | — TikTok: Kịch bản quay · voice-over · nhạc · hashtag | ❌ | |
| 4.5d | — Zalo OA: Nội dung chăm sóc khách | ❌ | |
| 4.5e | — Chung: SEO · A/B · livestream · tin nhắn mẫu | ❌ | |
| 4.6 | Sửa văn bản / hashtag / SEO / CTA từng thẻ | ❌ | |
| 4.7 | **Duyệt** từng thẻ hoặc "Duyệt tất cả" | ❌ | |
| 4.8 | Lưu vào Thư viện nội dung | ❌ | |
| 4.9 | Chỉ báo Đúng giọng thương hiệu / Đúng dữ kiện sản phẩm | ❌ | |
| 4.10 | Gợi ý "Lên lịch đăng ngay" → Social Publishing | ❌ | |

---

## #5 — Social Publishing (M07 phần đăng) — `lich-dang` ❌ CHƯA CODE (0/10)

**Chờ P18.** Đăng đa nền tảng, lịch đăng, duyệt trước đã chạy thật ở hệ v1; chưa có màn hình.

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 5.1 | Mở đầu bằng chọn từ Thư viện nội dung đã duyệt | ❌ | |
| 5.2 | Chọn nền tảng đăng + thời điểm (ngay/hẹn giờ) | ❌ | |
| 5.3 | Xem trước từng nền tảng (Facebook/Instagram/TikTok/Zalo) | ❌ | |
| 5.4 | Sửa lần cuối (không cần quay lại trang 4) | ❌ | |
| 5.5 | **Xác nhận lịch đăng** (không có bước Duyệt riêng) | ❌ | |
| 5.6 | Thẻ trạng thái: Đã lên lịch / Đang đăng / Đã đăng / Lỗi | ❌ | |
| 5.7 | **Lịch đăng** theo tuần/tháng, drag-drop, click xem chi tiết | ❌ | |
| 5.8 | **Đăng lại thông minh** (Analytics gợi ý hiệu quả cao) | ❌ | |
| 5.9 | **Tự duyệt theo thời hạn** (công tắc, tắt mặc định, dieu_hanh) | ❌ | |
| 5.10 | Hết hạn 24h, tự duyệt tắt → quay lại "Chờ duyệt lại" | ❌ | |
| 5.11 | Đăng thất bại → "Lỗi" + Thử lại, không tính lượt đăng | ❌ | |

---

## #6 — Catalog & Website (M06/M05) — `catalog` ✅ ĐÃ CODE (11/13)

**Tab A — Catalog số:**

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 6.1 | Mở tab Catalog — tự động liệt kê sản phẩm đã duyệt | ✅ Đã code | GET /api/v1/products (lọc ACTIVE) |
| 6.2 | Lọc/nhóm theo dịp, màu, bộ sưu tập, giá | ✅ Đã code | Select dropdowns từ `/filter-options` proxy, query params thực |
| 6.3 | Gộp sản phẩm thành "Bộ sưu tập" (drag-drop) | 🔧 Cần code | UI có, backend P19 |
| 6.4 | Xem trước catalog dạng khách sẽ thấy | ✅ Đã code | Mở `/c/[slug]` thật qua proxy |
| 6.5 | **Duyệt xuất bản** (catalog.publish) | ✅ Đã code | POST /api/v1/catalog-links |
| 6.6 | Sinh mã QR cho liên kết catalog | ✅ Đã code | Proxy GET `/qr` → blob download |
| 6.7 | Lưu → mã QR để tải/in | ✅ Đã code | File PNG 300px tải về máy |

**Tab B — Landing page chiến dịch: (Proxy qua LocalBudd — M05 backend sẵn sàng)**

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 6.8 | Chọn dịp (20/10, Valentine, 8/3, Ngày của Mẹ, Khai trương, Hoa cưới) | ✅ Đã code | Radio buttons, proxy tạo project LocalBudd |
| 6.9 | Chọn sản phẩm đưa vào trang | ✅ Đã code | Checkbox từ danh sách filtered products |
| 6.10 | Nhấn "Dựng trang Landing" → tạo job LocalBudd | ✅ Đã code | Proxy POST `/generate/landing` + poll cron |
| 6.11 | Xem trước trang (sau khi xong) | ✅ Đã code | Link `/projects/[id]/preview` LocalBudd |
| 6.12 | Chỉnh sửa khối (layout archetype) | 🔧 Cần code | Proxy sang LocalBudd pages/layouts API |
| 6.13 | **Duyệt xuất bản** (landing.publish) | 🔧 Cần code | Proxy POST `/pages/[id]/approve` |
| 6.14 | Lưu → link + QR riêng chiến dịch | 🔧 Cần code | Proxy GET `/pages/[id]/export` |
| 6.15 | Forbidden styles không bao giờ xuất hiện | 🔧 Cần code | Phụ thuộc M05 Brand Profile |

---

## #7 — CRM & Khách hàng (M09) — `khach-hang` ❌ CHƯA CODE (0/11)

**Chờ P21.** Thiết kế đích, lưu ý ràng buộc dữ liệu cá nhân.

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 7.1 | Danh sách khách hàng (nhập tay/tự động từ đơn hàng) | ❌ | MOCK_CUSTOMERS |
| 7.2 | Mở hồ sơ: lịch sử mua, ngày đặc biệt đã ghi nhận | ❌ | |
| 7.3 | **Gợi ý chiến dịch nhắc mua** (AI quét theo lô) | ❌ | Mock runCampaign |
| 7.4 | AI KHÔNG gửi tên/số ĐT/địa chỉ ra ngoài | ❌ | Luật riêng tư (D15) |
| 7.5 | Thẻ kết quả: mỗi thẻ = khách cần nhắc + dịp + lý do | ❌ | |
| 7.6 | Sửa nội dung nhắc / đổi kênh (Zalo/SMS/điện) / bỏ khách | ❌ | |
| 7.7 | **Duyệt** từng thẻ hoặc theo lô | ❌ | |
| 7.8 | Lưu → lên lịch gửi (nối hàng chờ gửi) | ❌ | |
| 7.9 | **Đồng ý nhận nhắc** (bật/tắt, có ngày ghi nhận) | ❌ | Khối riêng |
| 7.10 | **Yêu cầu xoá dữ liệu** (nút riêng, thực thi ngay) | ❌ | Khối riêng |
| 7.11 | Khối đồng ý hiện ở mọi hồ sơ (điều kiện bắt buộc) | ❌ | |

---

## #8 — Đơn hàng & Vận hành (M10) — `don-hang` ❌ CHƯA CODE (0/13)

**Chờ P22.** Chưa xây trên core, có luồng tham chiếu ở hệ v1.

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 8.1 | Tạo đơn: chọn khách hàng | ❌ | MOCK_ORDERS |
| 8.2 | Tạo đơn: chọn sản phẩm (từ Product Master) | ❌ | |
| 8.3 | Tạo đơn: chọn ngày giao, lời nhắn thiệp | ❌ | |
| 8.4 | Nhấn "Tạo phiếu chào giá" | ❌ | |
| 8.5 | Thẻ phiếu chào giá: giá từng dòng, tổng tiền, xem trước A6 | ❌ | |
| 8.6 | Sửa giá/số lượng | ❌ | |
| 8.7 | **Duyệt** (xác nhận đơn chính thức) | ❌ | |
| 8.8 | Lưu → đơn vào bảng điều phối | ❌ | |
| 8.9 | **Bảng điều phối Kanban**: Mới → Phân công → Đang làm → Đã giao | ❌ | |
| 8.10 | Kéo thẻ đơn sang cột kế | ❌ | |
| 8.11 | Phân công thợ cắm trực tiếp | ❌ | |
| 8.12 | **Đồng hồ SLA** trên thẻ (đếm ngược) | ❌ | |
| 8.13 | Đánh dấu "Đã giao" → đơn đóng | ❌ | |
| 8.14 | In phiếu đơn (nút riêng, không gắn duyệt) | ❌ | |
| 8.15 | Đơn quá SLA → thẻ viền đỏ, nổi đầu cột | ❌ | |

---

## #9 — AI Chat Assistant (M08) — `hoi-thoai` ❌ CHƯA CODE (0/12)

**Chờ P23.** Chưa có repo. Thiết kế đích.

**Tab A — Hội thoại đang diễn ra:**

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 9.1 | Danh sách hội thoại (khách đang chat) | ❌ | MOCK_CONVS |
| 9.2 | Chọn hội thoại → xem lịch sử chat | ❌ | |
| 9.3 | Xem AI trả lời dựa trên catalog + giá đã duyệt | ❌ | |
| 9.4 | Nhãn "dẫn từ: [tên sản phẩm/trang giá]" | ❌ | |
| 9.5 | Nút "Chuyển cho nhân viên" (luôn hiện) | ❌ | |
| 9.6 | Gắn cờ hội thoại cần xem lại | ❌ | |
| 9.7 | AI không trả lời được → nút chuyển + câu xin lỗi | ❌ | |

**Tab B — Cấu hình phạm vi trả lời:**

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 9.8 | Chọn phạm vi: giá, vùng giao, mẫu tương tự, tồn kho, ngân sách | ❌ | |
| 9.9 | Soạn/sửa câu trả lời mẫu FAQ | ❌ | |
| 9.10 | Đặt ngưỡng "AI không chắc → chuyển người" | ❌ | |
| 9.11 | Xem trước mô phỏng 3 câu hỏi | ❌ | |
| 9.12 | **Duyệt cấu hình** → Lưu → áp dụng | ❌ | |

---

## #10 — Analytics & Learning (M11) — `so-lieu` ✅ ĐÃ CODE (7/12)

**Bảng chỉ số:**

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 10.1 | Chọn khoảng thời gian / chiến dịch / sản phẩm | ✅ Đã code | UI có |
| 10.2 | **Reach** | ✅ Đã code | GET /usage/summary |
| 10.3 | **Engagement** | ✅ Đã code | |
| 10.4 | **Số khách hỏi (Inbox)** | ✅ Đã code | |
| 10.5 | **Tỷ lệ chuyển đơn** | ✅ Đã code | Tính từ usage |
| 10.6 | **Bài hiệu quả nhất** | ✅ Đã code | |
| 10.7 | **Sản phẩm bán tốt nhất** | ✅ Đã code | |
| 10.8 | **ROI chiến dịch** | ✅ Đã code | Tính phía UI, không endpoint riêng |
| 10.9 | Nhấn "Diễn giải" chỉ số bất thường → Thẻ diễn giải | ✅ Đã code | GET /ai-requests |
| 10.10 | Thẻ diễn giải: AI nêu lý do + số liệu dẫn chứng | ✅ Đã code | |
| 10.11 | (Không cần duyệt — thông tin tham khảo) | ✅ Đã code | |

**Vòng học phong cách:**

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 10.12 | Hiện khi ≥ 20 bài có số liệu, ẩn khi < 20 | 🔧 Cần code | UI có, không API đếm |
| 10.13 | Thẻ đề xuất: "Nên đổi [tham số] vì [số liệu]" | ❌ Chờ backend | LEARNING_FIELDS cứng |
| 10.14 | Xem chi tiết: tham số cũ/đề xuất, số liệu đứng sau | ❌ Chờ backend | |
| 10.15 | Sửa giá trị đề xuất | ❌ Chờ backend | |
| 10.16 | **Duyệt áp dụng** (learning.profile.manage, trần cứng) | 🔧 Cần code | API có, UI mock |
| 10.17 | Lưu → ảnh hưởng tới trang 1 và 4 | ❌ Chờ backend | |
| 10.18 | Lịch sử áp dụng (đề xuất nào, lúc nào, dựa trên số liệu nào) | ❌ Chờ backend | |
| 10.19 | Quay về Trang chủ | ✅ Đã code | |

---

## Thứ tự triển khai ưu tiên (đề xuất)

### Giai đoạn 1 — Hoàn thiện 4 trang đã code (hiện tại)

| Ưu tiên | Chức năng | Tính năng cần làm | Ước lượng |
|---------|-----------|-------------------|-----------|
| 1 | #1 tai-anh | 1.11 (nhiều ảnh), 1.13–1.16 (M01b) | Cần backend M01b |
| 2 | #2 creative-studio | 2.7, 2.11–2.12 (Area A), 2.13–2.21 (Area B) | Cần M04b backend |
| 3 | #6 catalog | 6.2–6.7 (Tab A), 6.10–6.15 (Tab B) | Cần M05 builder |
| 4 | #10 so-lieu | 10.12, 10.13–10.18 (Vòng học) | Cần learning backend |

### Giai đoạn 2 — Tuyến B (P17–P23)

| Pha | Chức năng | Module | Tính năng | Trạng thái |
|-----|-----------|--------|-----------|------------|
| P17 | #3 AI Video Studio | M04c | 3.1–3.14 (14 tính năng) | ✅ Đã hoàn thành (09/16) |
| P18 | #4 AI Content Engine | M07 | 4.1–4.10 (10 tính năng) | ⏳ Chờ backend SocialFlow |
| P18 | #5 Social Publishing | M07 | 5.1–5.11 (11 tính năng) | ⏳ Chờ backend SocialFlow |
| P21 | #7 CRM | M09 | 7.1–7.11 (11 tính năng) | ⏳ Chờ backend |
| P22 | #8 Đơn hàng | M10 | 8.1–8.15 (15 tính năng) | ⏳ Chờ backend |
| P23 | #9 Chat Assistant | M08 | 9.1–9.12 (12 tính năng) | ⏳ Chờ backend |

---

## Các trang đã tích hợp sẵn (không cần làm trong 10 chức năng)

| Trang | File | Backend đã nối |
|-------|------|----------------|
| Sản phẩm | `src/app/(app)/san-pham/page.tsx` | GET /api/v1/products |
| Hàng chờ duyệt | `src/app/(app)/duyet/page.tsx` | GET/POST vision/analyses, media/optimizations, product-copies |
| Admin Dashboard | `src/components/dashboard/admin-dashboard.tsx` | GET /jobs, /products, /usage/summary |
| Creative Studio proxy | `src/components/creative/creative-studio.tsx` | POST /proxy/api/m04b/background-removal |
