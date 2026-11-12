# Checklist tích hợp UI ↔ Backend — 10 chức năng UI/UX

> [!NOTE]
> **ĐÃ ĐƯỢC HỢP NHẤT VÀO TÀI LIỆU CHUẨN (OSOT)**  
> Tệp này đã được hợp nhất cùng `UIUX-Feature-Checklist.md` vào **[`docs/UIUX-Execution-Checklist.md`](../../UIUX-Execution-Checklist.md)**.  
> Vui lòng theo dõi và cập nhật tiến độ thực thi UI & API tại tài liệu hợp nhất để đảm bảo tính duy nhất của dữ liệu.

**Mục đích:** Nối từng trang UI trong `docs/ALG-UIUX-10-chuc-nang.md` với API thật ở `src/app/api/v1/`.

**Nguyên tắc:**
- Không mock trong UI khi backend đã có — gọi API thật, xử lý 401/403/409/502
- Mỗi trang phải đọc `organization_id` từ session, không nhận từ body/query
- Mỗi trang phải kiểm năng lực (`useSession().can(code)`) trước khi hiện nút hành động
- Job chạy server → UI polling SSE `GET /jobs/:id/events` hoặc `GET /api/v1/jobs/:id`

---

## Tổng quan — 10 trang và trạng thái tích hợp

| # | Trang | Module | Backend đã có? | Trạng thái |
|---|-------|--------|---------------|------------|
| 1 | Phân tích sản phẩm AI | M01 | ✅ vision/analyses | **Cần tích hợp** (mock) |
| 2 | AI Creative Studio | M04a/M04b | ✅ media/optimizations + background-removal | ✅ **Đã tích hợp hoàn thiện (Commercial Ready)** |
| 3 | AI Video Studio | M04c | ✅ video/jobs + render worker | ✅ **Đã tích hợp hoàn thiện (Commercial Ready)** |
| 4 | AI Content Engine | M07 | ❌ (P18 chưa xây) | Chờ backend |
| 5 | Social Publishing | M07 | ❌ (P18 chưa xây) | Chờ backend |
| 6 | Catalog & Website | M06 | ✅ products + catalog-links | **Cần tích hợp** (mock) |
| 7 | CRM & Khách hàng | M09 | ❌ (P21 chưa xây) | Chờ backend |
| 8 | Đơn hàng & Vận hành | M10 | ❌ (P22 chưa xây) | Chờ backend |
| 9 | AI Chat Assistant | M08 | ❌ (P23 chưa xây) | Chờ backend |
| 10 | Analytics & Learning | M11 | ✅ usage + ai-governance | **Cần tích hợp** (hardcoded) |

**3 trang cần tích hợp tiếp** (có backend): #1 tai-anh, #6 catalog, #10 so-lieu

---

## #1 — Phân tích sản phẩm AI (`src/app/(app)/tai-anh/page.tsx`)

### Backend APIs cần nối

| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|-----------|
| `/api/v1/products` | GET | L1 | Lấy danh sách sản phẩm để chọn | ✅ Đã có |
| `/api/v1/assets` | GET | G1 | Lấy ảnh để phân tích | ✅ Đã có |
| `/api/v1/vision/analyses` | POST | H1 | Tạo job phân tích (bắt buộc `Idempotency-Key`) | ✅ Đã có |
| `/api/v1/vision/analyses/:id` | GET | H1 | Lấy trạng thái kết quả phân tích | ✅ Đã có |
| `/api/v1/vision/analyses/:id` | PATCH | H2 | Lưu nháp (ghi vào `edited`) | ✅ Đã có |
| `/api/v1/vision/analyses/:id/approve` | POST | H3 | Duyệt (ghi Product Master + audit) | ✅ Đã có |
| `/api/v1/vision/analyses/:id/reject` | POST | H3 | Từ chối | ✅ Đã có |
| `/api/v1/jobs/:id/events` | GET (SSE) | G4 | Theo dõi tiến trình job thật | ✅ Đã có |

### Checklist từng bước

- [ ] **Bước 1:** Thêm `useSession()` vào tai-anh page để lấy `organization_id` và `capabilities`
- [ ] **Bước 2:** Thay `MOCK_PHOTOS` bằng listing thật: `GET /api/v1/assets` (lọc theo tổ chức)
- [ ] **Bước 3:** Thêm upload flow → `POST /api/v1/assets` (asset con) → lấy `asset_id`
- [ ] **Bước 4:** Thay `simulateJob()` bằng `POST /api/v1/vision/analyses` với `{asset_ids, product_id}` + `Idempotency-Key` header
- [ ] **Bước 5:** Thay polling `simulateJob()` bằng polling `GET /api/v1/vision/analyses/:id` (kiểm `status` + `stage`) hoặc SSE `/api/v1/jobs/:id/events`
- [ ] **Bước 6:** Khi job `COMPLETED`, lấy kết quả từ `GET /api/v1/vision/analyses/:id` → map sang `ResultField[]` (phân tích nhận diện → Thẻ 1)
- [ ] **Bước 7:** Kết nối `handleSaveDraft1` → `PATCH /api/v1/vision/analyses/:id` với `{edited: {...}}`
- [ ] **Bước 8:** Kết nối `handleApprove1` → `POST /api/v1/vision/analyses/:id/approve` (xử lý 409 đã duyệt, 403 thiếu năng lực)
- [ ] **Bước 9:** Kết nối `handleReject1` → `POST /api/v1/vision/analyses/:id/reject`
- [x] **Bước 10:** Gợi ý M01b → kiểm Product Master đã có bản ghi duyệt → chuyển sang kết quả bán hàng (M01b đã hoàn thiện, kết nối API đầy đủ)
- [x] **Bước 10b:** Thêm capability M01c (Thẻ chào sản phẩm & kịch bản tư vấn Sales) tổng hợp M01a + M01b:
  - Cho phép biên tập 100% 8 khối trường thông tin trước khi xuất bản.
  - Nút "Chốt duyệt & Xuất bản Final" (Badge FINAL, lưu vào Kho).
  - Kiến trúc 3 Tab độc lập cách ly nội dung: Tab 1: Chỉnh sửa toàn bộ thông tin, Tab 2: Thẻ chào khách (A6 Card), Tab 3: Kịch bản Zalo (chỉ hiển thị nội dung tab đang chọn).
  - Bộ công cụ xuất đa định dạng: Copy ảnh vào Zalo / Clipboard, Tải PNG 2x, Tải JPEG 95%, Xuất PDF A6 qua jsPDF.
- [x] **Bước 10c:** Tích hợp Kho Dữ Liệu Sản Phẩm độc lập (`/kho-du-lieu`) trên Sidebar chính DesktopNav với 3 phân vùng quản lý (Ảnh gốc, Ảnh đã duyệt chờ sinh dữ liệu, Sale Pitch đã hoàn thành) và điều hướng 2 chiều sang `/tai-anh`.
- [ ] **Bước 11:** Thêm handling cho: 401 (redirect login), 403 (hiện "không có quyền"), 409 (đã duyệt), 502 (core vắng)
- [ ] **Bước 12:** Xóa comment "MOCK DATA — thay bằng API thật" khi hoàn tất

### Lưu ý đặc biệt
- `POST /vision/analyses` bắt buộc `Idempotency-Key` header → dùng `crypto.randomUUID()`
- Năng lực `H1` (tạo), `H2` (sửa), `H3` (duyệt/từ chối) — kiểm `useSession().can()` ở UI
- Thẻ kết quả 2 (M01b) đã có backend — `POST /api/v1/product-copies/generate` (H5), `GET/PATCH /api/v1/product-copies/:id` (H5), `POST /api/v1/product-copies/:id/approve` (H6), `POST /api/v1/product-copies/:id/reject` (H6). Đã nối đầy đủ handler trong `tai-anh/page.tsx`: `handleFieldChange2/Add2/Remove2`, `handleSaveDraft2`, `handleApprove2`, `handleReject2`, `goResult2` → `generateProductCopyApi`. Fields mapper: `mapProductCopyToFields2`.
- Thẻ kết quả 3 (M01c) hoàn thiện trọn vẹn: Component `SalesPitchCard` (`src/components/sales/sales-pitch-card.tsx`), domain model `sales-pitch-template.ts`, kịch bản chào khách Zalo 1-chạm copy, tích hợp bộ chọn sản phẩm đã duyệt `ApprovedAnalysesSelector`. Hỗ trợ 3 tab hiển thị độc lập, xuất đa định dạng PNG/JPEG/PDF A6/Clipboard, và kết nối với Kho Dữ Liệu 3 phân vùng.

---

## #2 — AI Creative Studio (`src/app/(app)/creative-studio/page.tsx`)

### Backend APIs cần nối

| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|-----------|
| `/api/v1/products` | GET | L1 | Lấy sản phẩm để chọn ảnh gốc | ✅ Đã kết nối |
| `/api/v1/assets` | GET | G1 | Lấy ảnh gốc từ kho asset thật | ✅ Đã kết nối |
| `/api/v1/media/optimizations` | POST | I1 | Tạo job tối ưu ảnh M04a (kèm `Idempotency-Key`) | ✅ Đã kết nối |
| `/api/v1/media/optimizations/:id` | GET | I1 | Lấy trạng thái & kết quả tối ưu | ✅ Đã kết nối |
| `/api/v1/media/optimizations/:id/approve` | POST | I2 | Duyệt Master Image (trần cứng `dieu_hanh`) | ✅ Đã kết nối |
| `/api/v1/media/optimizations/:id/download` | GET | I3 | Tải ảnh đã tối ưu | ✅ Đã kết nối |
| `/api/v1/media/background-removal` | POST | I1 | Bóc tách nền AI Deep Learning (Bria-RMBG/U2-Net) nội bộ Core | ✅ Đã kết nối |
| `/api/v1/proxy/api/m04b/background-removal` | POST | (proxy) | Xoá nền qua SocialFlow (dự phòng) | ✅ Đã có |
| `/api/v1/product-copies` | GET | H6 | Lấy dữ liệu bán hàng đã duyệt | ✅ Đã có |

### Checklist từng bước (Đã hoàn thiện 100%)

- [x] **Bước 1:** Thêm `useSession()` để kiểm năng lực `I1` (tối ưu), `I2` (duyệt), `I3` (tải)
- [x] **Bước 2:** Thay `MOCK_PHOTOS` Area A bằng listing thật: `GET /api/v1/assets` (ảnh ORIGINAL đã upload)
- [x] **Bước 3:** Kết nối "Tối ưu ảnh" → `POST /api/v1/media/optimizations` với `{asset_id}` + `Idempotency-Key`
- [x] **Bước 4:** Polling `GET /api/v1/media/optimizations/:id` theo dõi tiến trình stage thật
- [x] **Bước 5:** Khi COMPLETED, kết nối `handleApproveA` → `POST /api/v1/media/optimizations/:id/approve` (xử lý Identity Guard REJECTED → ẩn nút Duyệt, hiện Chạy lại/Bỏ qua)
- [x] **Bước 6:** Kết nối download Master Image → `GET /api/v1/media/optimizations/:id/download` (trả signed URL)
- [x] **Bước 7:** Area B — biến thể marketing: gọi trực tiếp engine AI Core `POST /api/v1/media/background-removal` (kết hợp Client Compositor Fallback an toàn)
- [x] **Bước 8:** Sinh 3 biến thể Marketing chuẩn: PNG trong suốt, Phông Studio Preset (6 bộ), Đa kênh Watermark Logo tiệm hoa
- [x] **Bước 9:** **Bảo toàn 100% cuống cành hoa**: Tắt Arm Fadeout xóa đáy nhầm, bảo vệ Stem Corridor (20%–80%)
- [x] **Bước 10:** Tích hợp **Global Image Zoom Modal** (`GlobalImageZoom`): Phóng to toàn màn hình soi chi tiết chất lượng ảnh
- [x] **Bước 11:** Tải về 1-chạm (One-click Download PNG/JPEG)

### Lưu ý đặc biệt
- `I2` có trần cứng `dieu_hanh` — UI không hiện nút Duyệt cho vai không đủ quyền
- Identity Guard REJECTED: thẻ ẩn nút Duyệt, chỉ còn Chạy lại hoặc Bỏ qua (theo đặc tả UIUX 0.3)
- Biến thể không gọi lại enhancer — UI tự động thu gọn Area A khi đã có Master Image đã duyệt để nhân viên tập trung sáng tạo ở Area B
- Đã nghiệm thu 321/321 vitest xanh, 60/60 pytest xanh, 123/123 test:tenant xanh.

---

## #6 — Catalog & Website (`src/app/(app)/catalog/page.tsx`)

### Backend APIs cần nối

| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|-----------|
| `/api/v1/products` | GET | L1 | Lấy sản phẩm đã duyệt (thay MOCK_PRODUCTS) | ✅ Đã có |
| `/api/v1/catalog-links` | GET | J1 | Lấy danh sách catalog | ✅ Đã có |
| `/api/v1/catalog-links` | POST | J1 | Tạo catalog link | ✅ Đã có |
| `/api/v1/catalog-links/:slug` | GET | — | Xem trước catalog (public) | ✅ Đã có |
| `/api/v1/catalog-links/:slug` | PATCH | J1 | Cập nhật catalog | ✅ Đã có |
| `/api/v1/catalog-links/:slug/revoke` | POST | J2 | Thu hồi catalog | ✅ Đã có |
| `/api/v1/product-copies` | GET | H6 | Dữ liệu bán hàng | ✅ Đã có |
| `/api/v1/proxy/api/v1/catalog-links` | GET | (proxy) | LocalBudd đọc catalog | ✅ Đã có |

### Checklist từng bước

- [ ] **Bước 1:** Thay `MOCK_PRODUCTS` bằng `GET /api/v1/products?limit=50` (lọc `status=ACTIVE` qua route, hoặc filter client)
- [ ] **Bước 2:** Thêm tab Catalog: `GET /api/v1/catalog-links?include_revoked=true` → hiện danh sách catalog link
- [ ] **Bước 3:** "Duyệt xuất bản" → `POST /api/v1/catalog-links` với `{slug, name, description, filters}`
- [ ] **Bước 4:** "Xem trước catalog" → `GET /api/v1/catalog-links/:slug` hoặc proxy `/api/v1/proxy/api/v1/catalog-links/:slug?client=LOCALBUDD`
- [ ] **Bước 5:** QR code: gọi `GET /api/v1/catalog-links/:slug` lấy URL, hiện QR (UI component QRCode)
- [ ] **Bước 6:** Tab Landing: danh sách sản phẩm lấy từ `GET /api/v1/products` (đã thay ở Bước 1)
- [ ] **Bước 7:** "Dựng trang" → placeholder (M05 builder đã chạy ở LocalBudd, gọi qua proxy)
- [ ] **Bước 8:** Revoke: `POST /api/v1/catalog-links/:slug/revoke`
- [ ] **Bước 9:** Thêm handling: 401/403/409/502, J1/J2 capability check
- [ ] **Bước 10:** Lọc danh sách sản phẩm theo `status=ACTIVE` (sản phẩm chưa duyệt không xuất hiện — theo UIUX 6)

### Lưu ý đặc biệt
- `GET /catalog-links/:slug` public (không auth) — UI public page `/c/[slug]` khác với dashboard page
- Catalog không có "Thẻ kết quả AI" — là view tổng hợp, hành động chính là chọn/gỡ và duyệt xuất bản
- Product Master phải có `status=APPROVED` mới xuất hiện trong danh sách chọn

---

## #10 — Analytics & Learning (`src/app/(app)/so-lieu/page.tsx`)

### Backend APIs cần nối

| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|-----------|
| `/api/v1/usage/summary` | GET | G8 | Metrics: reach, engagement, credit | ✅ Đã có |
| `/api/v1/usage` | GET | G8 | Lịch sử usage chi tiết | ✅ Đã có |
| `/api/v1/audit-logs` | GET | G9 | Nhật ký kiểm toán (cho learning) | ✅ Đã có |
| `/api/v1/ai-requests` | GET | U3 | Lời gọi AI (cho diễn giải) | ✅ Đã có |
| `/api/v1/ai-capabilities` | GET | U1 | Danh mục năng lực + mô hình | ✅ Đã có |
| `/api/v1/ai-policy` | GET | U1 | Chính sách AI tổ chức | ✅ Đã có |
| `/api/v1/ai-policy` | PUT | U2 | Cập nhật chính sách AI | ✅ Đã có |
| `/api/v1/jobs` | GET | G4 | Lịch sử job (cho số liệu) | ✅ Đã có |

### Checklist từng bước

- [ ] **Bước 1:** Thay METRICS cứng bằng `GET /api/v1/usage/summary` → map `by_feature` sang 7 chỉ số (reach, engagement, inbox, conversion, top post, best product, ROI)
- [ ] **Bước 2:** Thêm filter: khoảng thời gian, chiến dịch, sản phẩm (hiện tại chỉ buttons — cần gắn vào query params cho usage/audit APIs)
- [ ] **Bước 3:** "Diễn giải chỉ số bất thường" → `GET /api/v1/ai-requests` (lọc theo feature/time) → AI phân tích xu hướng từ dữ liệu thật
- [ ] **Bước 4:** Thay LEARNING_FIELDS cứng bằng `GET /api/v1/audit-logs` (lọc theo `learning.profile` action) → đọc tham số cũ/đề xuất
- [ ] **Bước 5:** "Duyệt áp dụng" → `PUT /api/v1/ai-policy` với capability_code tương ứng
- [ ] **Bước 6:** Lấy danh sách năng lực từ `GET /api/v1/ai-capabilities` để hiện capability picker
- [ ] **Bước 7:** Thêm "Vòng học phong cách" — kiểm điều kiện: ~20 bài có số liệu (count từ `GET /api/v1/usage` hoặc `GET /api/v1/audit-logs`)
- [ ] **Bước 8:** Thêm handling: 401/403/409/502, G8/G9/U1/U2/U3 capability check
- [ ] **Bước 9:** Xóa hardcoded METRICS và LEARNING_FIELDS khi hoàn tất

### Lưu ý đặc biệt
- Không có endpoint ROI riêng — tính từ `usage` + `orders` ở backend, UI chỉ hiển thị
- Vòng học ẩn khi < 20 bài — kiểm ở UI bằng count từ API
- "Diễn giải" là tham khảo — không ghi đè dữ liệu (UIUX 10, bước ④)

---

## #5 — Social Publishing (`src/app/(app)/lich-dang/page.tsx`)

### Backend APIs cần nối (khi M07 có)

| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|-----------|
| `/api/v1/content/posts` | GET | O5 | Thư viện nội dung đã duyệt | ❌ Chưa có |
| `/api/v1/content/posts` | POST | O5 | Tạo lịch đăng | ❌ Chưa có |
| `/api/v1/content/posts/:id/publish` | POST | O6 | Xác nhận lịch đăng | ❌ Chưa có |
| `/api/v1/content/schedule` | GET | O6 | Lịch đăng | ❌ Chưa có |

**Chờ P18 (M07 nội dung) xây dựng.** UI page đã có nhưng không có backend để nối.

---

## #3 — AI Video Studio (`src/app/(app)/video/page.tsx`)

**Đã tích hợp hoàn thiện 100% Commercial Ready (09/16).** Đã kết nối đầy đủ hệ thống API core và Worker daemon render song song:

### Backend APIs đã nối

| Endpoint | Method | Capability | Mục đích | Trạng thái |
|----------|--------|-----------|----------|------------|
| `/api/v1/products` | GET | L1 | Lấy danh sách sản phẩm có Master Image | ✅ Đã nối |
| `/api/v1/video/jobs` | POST | P1 | Tạo video job mới (kèm Idempotency-Key) | ✅ Đã nối |
| `/api/v1/video/jobs` | GET | P1 | Lấy danh sách video jobs theo tổ chức | ✅ Đã nối |
| `/api/v1/video/jobs/:id` | GET | P1 | Lấy chi tiết kịch bản phân cảnh Storyboard | ✅ Đã nối |
| `/api/v1/video/jobs/:id` | PATCH | P1 | Cập nhật kịch bản (cảnh, âm thanh, phụ đề, Camera Motion) | ✅ Đã nối |
| `/api/v1/video/jobs/:id/approve-script` | POST | P3 | Cổng duyệt 1: Duyệt kịch bản trước khi render | ✅ Đã nối |
| `/api/v1/video/jobs/:id/deploy` | POST | P1 | Bắt đầu dựng video (đẩy job vào hàng đợi worker) | ✅ Đã nối |
| `/api/v1/video/jobs/:id/approve-video` | POST | P4 | Cổng duyệt 2: Duyệt video thành phẩm chính thức | ✅ Đã nối |
| `/api/v1/video/jobs/:id/events` | GET (SSE) | G4 | Theo dõi tiến trình render thời gian thực | ✅ Đã nối |
| `/api/v1/integration/assets` | POST | I3 | Đăng ký video thành phẩm vào Asset Store | ✅ Đã nối |

### Kiến trúc & Điểm nổi bật
- **Storyboard linh hoạt 2–15 cảnh**: Tự động cân bằng thời lượng (auto-balance duration) khi thêm/bớt cảnh; nút xóa cảnh `[🗑️ Xóa cảnh]` đỏ viền rõ ràng.
- **Menu Camera Motion Ken Burns điện ảnh**: 5 chuyển động độc lập (Zoom In, Zoom Out, Pan Up, Pan Right, Static) luân phiên.
- **Kiến trúc Provider cắm rút**: Phương án A `LocalCinematicProvider` (0 credit, ~0.45s/cảnh) mặc định + Phương án B Standby `GoogleVeoProvider` & `HeyGenProvider` (kích hoạt qua `.env`).
- **Phụ đề & Âm thanh**: 4 phong cách phụ đề, Edge TTS tiếng Việt, Audio Ducking nhạc nền tự động.
- **Khóa khung đầu & cuối**: Tuân thủ nghiêm ngặt `YC-M4` khóa vào ảnh Master Image đã duyệt.

---

## #4 — AI Content Engine (`src/app/(app)/noi-dung/page.tsx`)

**Chờ P18 (M07) tích hợp.** Backend engine thực thi nằm ở **`SocialFlow`** (pipeline 6-agent: `creator.py`, `PLATFORM_PROMPTS`, `brand_config`). Kế hoạch kết nối tương tự Creative Studio (M04b): sử dụng Server-side Proxy `/api/v1/proxy/api/m07/generate?client=SOCIALFLOW` kèm SSO JWT, gọi sang SocialFlow để sinh nội dung đa kênh dựa trên Product Master + BrandProfile.


---

## #7 — CRM & Khách hàng (`src/app/(app)/khach-hang/page.tsx`)

**Chờ P21 (M09) xây dựng.** Không có backend API nào cho CRM.

---

## #8 — Đơn hàng & Vận hành (`src/app/(app)/don-hang/page.tsx`)

**Chờ P22 (M10) xây dựng.** Không có backend API nào cho orders.

---

## #9 — AI Chat Assistant (`src/app/(app)/hoi-thoai/page.tsx`)

**Chờ P23 (M08) xây dựng.** Không có backend API nào cho chat.

---

## Thứ tự triển khai ưu tiên

1. **tai-anh (#1)** — entry point chính, nhiều user nhất, gateway cho M01b
2. **creative-studio (#2)** — nhiều user nhất sau #1, có proxy sẵn
3. **catalog (#6)** — đơn giản nhất, chỉ CRUD
4. **so-lieu (#10)** — toàn dữ liệu cứng cần thay

---

## Các trang đã tích hợp sẵn (không cần làm)

| Trang | File | Backend đã nối |
|-------|------|----------------|
| Sản phẩm | `src/app/(app)/san-pham/page.tsx` | GET /api/v1/products ✅ |
| Hàng chờ duyệt | `src/app/(app)/duyet/page.tsx` | GET/POST vision/analyses, media/optimizations, product-copies ✅ |
| Admin Dashboard | `src/components/dashboard/admin-dashboard.tsx` | GET /jobs, /products, /usage/summary ✅ |
| Creative Studio (proxy) | `src/components/creative/creative-studio.tsx` | POST /proxy/api/m04b/background-removal ✅ |
