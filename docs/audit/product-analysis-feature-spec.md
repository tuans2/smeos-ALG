# Đặc tả Tính năng "Phân tích ảnh sản phẩm (M01)" — Hiện trạng (Baseline Audit)

> **Mục đích**: Reverse-engineer 100% tính năng Phân tích ảnh sản phẩm từ mã nguồn TypeScript (Next.js), Python Worker, CSDL Postgres/Prisma và tài liệu thực tế của `floraos-core`.
> **Phạm vi**: 
> - Web Client: [`src/app/(app)/tai-anh/page.tsx`](../../src/app/%28app%29/tai-anh/page.tsx), [`src/components/templates/product-analysis/`](../../src/components/templates/product-analysis), [`src/components/result/result-card.tsx`](../../src/components/result/result-card.tsx), [`src/components/sales/sales-pitch-card.tsx`](../../src/components/sales/sales-pitch-card.tsx), [`src/components/storage/account-storage-hub.tsx`](../../src/components/storage/account-storage-hub.tsx).
> - API Routes: [`src/app/api/v1/vision/`](../../src/app/api/v1/vision) (6 routes) & [`src/app/api/v1/product-copies/`](../../src/app/api/v1/product-copies) (5 routes).
> - Domain & Use-Cases: [`src/modules/products/`](../../src/modules/products) (57 files bao gồm domain rules, BOM mapping, pricing, readiness, exports).
> - AI Worker: [`workers/vision/`](../../workers/vision) (29 files: `jobs/worker.py`, contracts `Schema.json`, SAM2 + Florence-2 CV, OpenAI Structured/Direct providers, color & count engine).
> - Cơ sở dữ liệu: `product_analyses`, `product_copies`, `products`, `product_variants`, `product_images`, `generation_jobs`, `job_events`, `ai_requests`.
> **Tiêu chuẩn phân loại**: ✅ Implemented · ⚠️ Partial · ❌ Missing · 🪦 Dead Code · ❓ Unclear

---

## 1. Tổng quan kiến trúc & Ranh giới Hệ thống

### 1.1 Mô tả nghiệp vụ cốt lõi
Phân tích ảnh sản phẩm (**Module M01 / Feature `vision.analyze`**) là cánh cổng nhập liệu thông minh (Smart Ingestion) của ALG:
1. **M01a — Nhận diện cấu phần hoa (Vision AI)**: Biến một bức ảnh chụp hoa thật (chụp tại shop hoặc tải lên) thành cấu trúc dữ liệu nguyên tử (Atomic Disaggregated Fields) gồm: Định lượng cành hoa (**BOM - Bill of Materials**), phân loại dáng/mặt hoa/vật chứa, phân tích bảng màu quang học (**Palette Accounting**), phát hiện chữ trên thiệp (**Card OCR**), kiểm định chất lượng/nụ hoa/cành hỏng, và tính điểm tin cậy (**Confidence score**).
2. **M01b — Sinh dữ liệu thương mại & Nội dung bán hàng (Product Copy / Marketing AI)**: Từ kết quả phân tích cấu phần hoa đã duyệt ở M01a, kết hợp với Hồ sơ thương hiệu (**Learning Profile**) của tiệm để tự động sinh: Tên thương mại gợi ý, Slogan/Tagline, Mô tả cảm xúc/ý nghĩa loài hoa, USP (Điểm bán hàng nổi bật), Thẻ phân loại/SEO, Dịp tặng, Chân dung khách hàng mục tiêu, Phân khúc giá và Dải giá đề xuất.
3. **M01c — Thẻ chào hàng & Kịch bản tư vấn Zalo (Sales Pitch & Instant Outreach)**: Chuyển đổi dữ liệu M01a + M01b thành: Thẻ chào hàng trực quan chuẩn A6 (sẵn sàng tải ảnh hoặc gửi nhanh), Bộ kịch bản tư vấn Zalo 1-chạm (3 biến thể: Tự nhiên, Tinh tế, Chốt nhanh), Bộ phối hoa thay thế theo ngân sách khách hàng (Budget Matching Engine), và bàn giao trực tiếp sang Creative Studio (14 chặng sáng tạo nội dung).

### 1.2 Kiến trúc phân tầng Clean Architecture & Phân bổ Công nghệ

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   Next.js App Router (Client & Server)                          │
│  UI: /tai-anh (4 Tab: m01a, m01b, m01c, storage) + Templates product-analysis   │
│  API Routes: /api/v1/vision/analyses/* + /api/v1/product-copies/*               │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Enqueue job + Reserve credits
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      Postgres Shared Database (State Store)                     │
│  - generation_jobs (status: PENDING/PROCESSING/COMPLETED/FAILED)                │
│  - job_events (SSE append-only log)                                             │
│  - product_analyses (raw bất biến + edited người sửa + approval_state)           │
│  - product_copies (raw marketing + edited + approval_state)                     │
│  - products & product_variants (Product Master SSOT)                            │
└────────────────────────────────────────▲─────────────────────────────────────────┘
                                         │ SELECT FOR UPDATE SKIP LOCKED
                                         │ LISTEN/NOTIFY floraos_job_vision_analyze
┌────────────────────────────────────────┴─────────────────────────────────────────┐
│                      Python Vision Worker (Background AI)                        │
│  - Orchestrator: workers/vision/jobs/worker.py                                   │
│  - Engines: OpenAI Structured (Default) / OpenAI Direct / Local CV (SAM2+Flo-2) │
│  - Color Engine (Delta-E/CIEDE2000), Count Engine, Dictionary (Species Catalog)  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Tầng | Thư mục mã nguồn | Số file | Vai trò & Quy ước thiết kế | Trạng thái |
|---|---|---|---|---|
| **Domain** | [`src/modules/products/domain/`](../../src/modules/products/domain) | 18 file | Pure TypeScript, 0 import Prisma. Chứa luật duyệt/sửa (`product-analysis-rules.ts`), Schema mapper 100% trường (`analysis-schema-mapper.ts`), Sales Pitch builder (`sales-pitch-template.ts`), Budget Matcher (`budget-flower-matcher.ts`), Pricing rules, Readiness scoring. | ✅ Implemented |
| **Use-Cases** | [`src/modules/products/use-cases/`](../../src/modules/products/use-cases) | 16 file | Điều phối luồng: `request-analysis`, `get-analysis`, `edit-analysis`, `approve-analysis`, `reject-analysis`, `export-analyses`, `manage-vision-engine`, `list-pending-analyses`, `list-approved-analyses`. | ✅ Implemented |
| **Infra** | [`src/modules/products/infra/`](../../src/modules/products/infra) | 6 file | Tương tác Postgres qua Prisma Client: `ProductAnalysisRepository`, `ProductRepository`, `PricingRuleRepository`. | ✅ Implemented |
| **Adapters** | [`src/modules/products/adapters/`](../../src/modules/products/adapters) | 1 file | Port & Adapters cho tích hợp ngoài. | ✅ Implemented |
| **Python Worker** | [`workers/vision/`](../../workers/vision) | 29 file | `worker.py` (claim job, emit SSE, tải asset từ R2/Disk, chạy inference, ghi kết quả, trừ/tính chi phí `ai_requests`). 3 Engine: `openai_structured`, `openai_direct`, `local_cv`. | ✅ Implemented |
| **UI Components** | [`src/components/templates/product-analysis/`](../../src/components/templates/product-analysis) + [`tai-anh/`](../../src/app/%28app%29/tai-anh) | 15+ file | Màn hình tác vụ `/tai-anh`, Guidance Card M01a/b/c, AnalysisResultCard, CommercialContentCard, SalesPitchCardA6, ZaloScriptBox, StorageHub. | ✅ Implemented |

---

## 2. Mô hình Dữ liệu Chi tiết (Data Model & Schema SSOT)

### 2.1 Bảng `product_analyses` (Kết quả phân tích thị giác)
Lưu trữ kết quả dự đoán của mô hình AI cho từng ảnh sản phẩm.
- **Ràng buộc khóa chính & Độc nhất**: `id` (UUID), `unique([job_id, asset_id])` đảm bảo chạy lại job lô không bao giờ nhân đôi hàng chờ duyệt.
- **Tenant Scope**: `organization_id` (Bắt buộc, Cascade delete).
- **Liên kết**: `product_id` (Có thể NULL khi phân tích ảnh đơn chưa gán sản phẩm, gán khi duyệt), `asset_id` (FK tới `assets`), `job_id` (FK tới `generation_jobs`).
- **Truy vết Mô hình AI**:
  - `provider`: Tên provider (vd: `openai_structured`, `openai_direct`, `local_cv`).
  - `model`: Phiên bản model (vd: `gpt-4o-2024-08-06`, `sam2.1_hiera_small`).
  - `model_version`: Chuỗi định danh model cụ thể.
  - `contract_name`: Cố định `"PhanTichSanPhamHoa"`.
  - `contract_version`: Hiện tại là `"2"` (Thêm `phong_cach`, `dip_su_dung` vào `identity`).
- **Dữ liệu phân tích (Cặp Raw/Edited tách biệt - YC-R3)**:
  - `raw` (JSONB): Dự đoán nguyên bản của máy. Bất biến 100%, không bao giờ bị ghi đè.
  - `edited` (JSONB, Nullable): Bản sửa của người dùng. Khi người dùng bấm lưu sửa đổi trên UI, toàn bộ payload sửa đổi được lưu ở đây. Mọi tính năng đọc phía sau (`resolveEffectiveAnalysis`) luôn ưu tiên `edited ?? raw`.
- **Trạng thái phê duyệt**:
  - `approval_state`: Enum `approval_state` (`PENDING`, `APPROVED`, `REJECTED`). Mặc định `PENDING`.
  - `approved_by`: User ID của người duyệt (phải có quyền `H3`).
  - `approved_at`: Timestamp phê duyệt.
- **Index**: `[organization_id]`, `[organization_id, product_id]`, `[job_id]`.

### 2.2 Bảng `product_copies` (Nội dung bán hàng & Marketing)
Sinh ra ở chặng M01b dựa trên `product_analyses` đã `APPROVED`.
- **Ràng buộc**: `id` (UUID), `unique([analysis_id])` (1 phân tích đã duyệt chỉ sinh tối đa 1 bản sao chép bán hàng).
- **Tenant Scope**: `organization_id` (Bắt buộc).
- **Dữ liệu**:
  - `raw` (JSONB): Chứa `suggested_name`, `short_headline`, `suggested_description`, `flower_meaning_story`, `key_selling_points`, `suggested_tags`, `suggested_occasions`, `suggested_price_segment`, `suggested_price_range`, `target_audience`.
  - `edited` (JSONB, Nullable): Bản chỉnh sửa của nhân viên marketing/sale.
  - `approval_state`: `PENDING` | `APPROVED` | `REJECTED`.
  - `approved_by` & `approved_at`: Thông tin người phê duyệt (`H6`).
  - `reject_reason`: Cột riêng biệt lưu lý do từ chối (không nhét vào `edited`).
  - `profile_version`: Phiên bản hồ sơ phong cách tiệm đã áp dụng khi sinh bài viết.
  - `job_id`, `model_key`, `provider`, `cost_usd`, `latency_ms`: Truy vết chi phí và độ trễ LLM.

### 2.3 Bảng `products` & `product_variants` (Product Master SSOT)
Khi phân tích được duyệt (`approveAnalysis` - H3):
- Nếu `product_id` đã có sẵn: Cập nhật các trường danh mục và `attributes` (BOM, checklist, colors, confidence).
- Nếu `product_id` là NULL: Tự động khởi tạo bản ghi `products` mới với mã code phát sinh `draftProductCode()` (prefix `PRD-` hoặc mã định dạng shop), tên mặc định `draftProductName()`, danh mục `category`, `shape`, `facing`, `container`, và toàn bộ định mức `attributes`.

### 2.4 Hợp đồng Dữ liệu AI Vision (`Schema.json` SSOT)
Hợp đồng JSON Schema nghiêm ngặt (`strict: true`) mà worker bắt buộc trả về:
1. `palette_accounting`: Mảng cụm màu quang học đo được (`cluster_index`, `thuoc_ve`, `nhom` [red, pink, white, yellow, orange, purple, blue, green, pastel, brown, other], `confidence`).
2. `checklist`: 10 cấu phần chuẩn (`hoa_chu_dao`, `hoa_phu`, `hoa_lap_day`, `la_nen`, `la_diem_nhan`, `vat_lieu_goi`, `day_buoc`, `ruy_bang`, `thiep_bien_chu`, `phu_kien_trang_tri`). Mỗi mục có `co_mat` (boolean) và `confidence`.
3. `identity`: Nhận dạng tổng quan:
   - `category`: `BO_HOA` (Bó hoa), `GIO_HOA` (Giỏ hoa), `BINH_HOA` (Bình hoa), `HOP_HOA` (Hộp hoa), `KE_HOA` (Kệ hoa khai trương), `VONG_HOA` (Vòng hoa tang), `CAI_AO` (Hoa cài áo), `VONG_DOI_DAU` (Vòng đội đầu), `KHAC`.
   - `shape`: `TRON` (Tròn), `DUNG` (Dáng đứng/tam giác), `RANG_TOA` (Rẻ quạt), `THAC_DO` (Thác đổ), `TU_DO` (Tự do/hiện đại).
   - `facing`: `MOT_MAT` (1 mặt), `HAI_MAT` (2 mặt), `TRON_360` (Tròn 360 độ).
   - `container`: `GIAY_GOI` (Giấy gói), `GIO_TRE` (Giỏ tre), `GIO_GO` (Giỏ gỗ), `BINH_GOM` (Bình gốm), `BINH_THUY_TINH` (Bình thủy tinh), `HOP_GIAY` (Hộp giấy), `KHAC`.
   - `phong_cach`: Phong cách thiết kế (Hiện đại, Vintage, Hàn Quốc, Cổ điển Châu Âu...).
   - `dip_su_dung`: Dịp đề xuất (Sinh nhật, Khai trương, Chúc mừng, Tình yêu, Cưới hỏi, Chia buồn...).
4. `bom`: Định mức vật tư cấu thành:
   - `flowers`: Mảng chi tiết từng loại hoa (`name`, `nhom_hoa`, `quantity`, `dvt_dem`, `role`, `mau`, `color`, `shade`, `so_nu`, `so_hong`, `confidence`, `bien_the`, `chieu_dai_cm`, `duoc_thay_the`, `thu_tu_uu_tien_thay_the`).
   - `foliage`: Mảng lá và cành phụ đệm.
   - `accessories`: Phụ kiện trang trí (nơ, dây, xốp, phụ kiện đi kèm).
   - `wrapping`: Giấy gói, vải voan, lưới, ruy băng.
   - `card_printed_text`: Văn bản OCR trích xuất từ thiệp chúc mừng đính kèm sản phẩm.
   - `materials_note`: Ghi chú lưu ý kỹ thuật bó hoa.
5. `confidence`: Điểm tin cậy thị giác tổng thể (thang điểm 0–100).
6. `san_xuat`: Thông số cắm hoa thực tế (`so_tang_lop`, `chieu_cao_uoc_tinh_cm`, `chieu_rong_uoc_tinh_cm`, `do_kho_ky_thuat`).

---

## 3. Bản đồ Năng lực Phân quyền (RBAC & Capabilities)

ALG áp dụng mô hình 3 lớp cắt (Mặc định → Cấu hình tổ chức → **Trần cứng cắt sau cùng**). Phân hệ Phân tích ảnh sản phẩm được bảo vệ nghiêm ngặt bởi nhóm mã năng lực `H`:

| Mã năng lực | Tên kỹ thuật | Nhãn hiển thị | Vai trò mặc định | Trần cứng (Hard Cap) | Hành động API gác cổng |
|---|---|---|---|---|---|
| **`H1`** | `vision.analyze` | Chạy phân tích ảnh sản phẩm | Điều hành, Điều phối, Sale, Marketing | Không có | `POST /api/v1/vision/analyses`, `GET /api/v1/vision/analyses/:id`, `GET /api/v1/vision/engine` |
| **`H2`** | `vision.result.edit` | Sửa kết quả phân tích trước khi duyệt | Điều hành, Điều phối, Marketing | Không có | `PATCH /api/v1/vision/analyses/:id` |
| **`H3`** | `product.approve` | Duyệt kết quả, ghi vào Product Master | Điều hành | **Chỉ Điều hành (`dieu_hanh`)** | `POST /api/v1/vision/analyses/:id/approve`, `POST /api/v1/vision/analyses/:id/reject`, `GET /api/v1/vision/analyses` (PENDING), `GET /api/v1/vision/analyses/export` |
| **`H4`** | `vision.engine.manage` | Chọn bộ máy AI cho cả tổ chức | Điều hành | **Chỉ Điều hành (`dieu_hanh`)** | `PUT /api/v1/vision/engine` |
| **`H5`** | `product_copy.generate` | Tạo dữ liệu bán hàng từ phân tích đã duyệt | Điều hành, Điều phối, Marketing | Không có | `POST /api/v1/product-copies/generate`, `GET /api/v1/vision/analyses?approval_state=APPROVED` |
| **`H6`** | `product_copy.approve` | Duyệt dữ liệu bán hàng, ghi Product Master | Điều hành | **Chỉ Điều hành (`dieu_hanh`)** | `POST /api/v1/product-copies/:id/approve`, `POST /api/v1/product-copies/:id/reject` |

> [!IMPORTANT]
> **Nguyên tắc Phân quyền Cốt lõi**:
> - Cặp `H1` (chạy) ↔ `H3` (duyệt): Nhân viên Sale và Điều phối được phép tạo lượt phân tích ảnh và kiểm tra độ tin cậy, nhưng **chỉ có chủ tiệm/Điều hành (`dieu_hanh`) mới có quyền duyệt (`H3`)** để đưa dữ liệu vào danh mục sản phẩm chính thức (Product Master).
> - Cặp `H5` (sinh copy) ↔ `H6` (duyệt copy): Tương tự, Marketing có thể sinh và sửa nội dung, nhưng duyệt chốt nội dung bán hàng là trần cứng của Điều hành.

---

## 4. Chi tiết Các Luồng Xử lý & User Flows

### 4.1 Luồng M01a — Tải ảnh & Phân tích Cấu phần Hoa
Giao diện quản lý tập trung tại tab `m01a` trên màn hình `/tai-anh`:

```
[Chọn ảnh: Thiết bị / Kho] ──► [Tải lên R2/Local] ──► [Kiểm tra Credit]
                                                           │
                                                           ▼
[SSE Tiến trình] ◄── [LISTEN/NOTIFY] ◄── [POST /api/v1/vision/analyses]
       │
       ▼
[Worker claim job (SKIP LOCKED)] ──► [Chạy Engine AI (OpenAI / Local CV)]
       │
       ▼
[Trích xuất BOM + Palette + OCR] ──► [Ghi product_analyses (raw)] ──► [Job COMPLETED]
       │
       ▼
[UI: Hiển thị AnalysisResultCard] ──► [Chỉnh sửa nguyên tử (onFieldChange)]
       │
       ├──► [Lưu nháp / PATCH edited] (H2)
       ├──► [Từ chối / POST reject] (H3)
       └──► [Phê duyệt / POST approve] (H3) ──► Ghi Product Master ──► Tự động chuyển M01b
```

1. **Khởi tạo & Chọn nguồn ảnh**:
   - Tải từ thiết bị: Hỗ trợ kéo thả vào `Card` hoặc bấm chọn tệp (JPEG, PNG, WebP), cho phép chọn tối đa 10 ảnh cùng lúc. Xem trước thumbnail ngay lập tức (`localPhotos`).
   - Chọn từ Kho ảnh có sẵn (`AccountStorageHub`): Nhân viên có thể mở drawer Kho để tái sử dụng ảnh chụp thô đã tải lên trước đó mà chưa phân tích.
2. **Kích hoạt Phân tích**:
   - Client sinh `Idempotency-Key` (UUIDv4) gửi kèm header yêu cầu `POST /api/v1/vision/analyses`.
   - Backend xác thực quyền `H1`, kiểm tra số dư credit tổ chức (Usage Reserve), tạo bản ghi `generation_jobs` với `feature = "vision.analyze"`, phát lệnh `NOTIFY floraos_job_vision_analyze`.
3. **Tiến trình Xử lý (SSE & Worker)**:
   - Worker Python bắt sự kiện hoặc quét `SKIP LOCKED`, đổi job sang `PROCESSING`.
   - Phát sự kiện SSE `stage: "DETECTING"` → `log: "phân tích xong"` → `done: "COMPLETED"`.
   - Nếu điểm tin cậy `confidence < 70`, job hoàn thành với kết quả `LOW_CONFIDENCE`; nếu $\ge 70$, hoàn thành với `OK`.
4. **Hiển thị Kết quả Phân tích (`AnalysisResultCard`)**:
   - Sử dụng mapper thuần `mapAnalysisFromSchema`: Hiển thị 100% các trường trong `Schema.json` thành các mục cấu trúc nguyên tử.
   - **Tách biệt trường nguyên tử (Atomic Fields)**: Tên hoa, số lượng cành, đơn vị đo, màu sắc, vai trò, số nụ, cành hỏng được render thành các ô chỉnh sửa độc lập. Người dùng có thể sửa số lượng, đổi tên loài hoa, thêm bớt cành hoa mà không làm vỡ JSON.
   - Thẻ hiển thị điểm tin cậy thị giác, huy hiệu trạng thái (An toàn / Cảnh báo / Bị chặn / Đã lưu nháp).
5. **Thao tác Phê duyệt & Chuyển trạng thái**:
   - **Lưu sửa đổi (`PATCH /vision/analyses/:id`)**: Kiểm tra nghiêm ngặt `isValidAnalysisEdit`. Cấm gửi bản sửa thiếu khóa cấp 1 để tránh làm rỗng dữ liệu Product Master.
   - **Từ chối (`POST /vision/analyses/:id/reject`)**: Chuyển trạng thái sang `REJECTED`, ghi nhận `ly_do` vào `audit_logs`.
   - **Duyệt (`POST /vision/analyses/:id/approve`)**: Thực thi trong **một transaction duy nhất**: Cập nhật hoặc tạo mới bản ghi `products` trong Product Master $\rightarrow$ Cập nhật `product_analyses.approval_state = APPROVED` $\rightarrow$ Ghi nhật ký kiểm toán `audit_logs` $\rightarrow$ Tự động chuyển giao diện sang Tab M01b.

---

### 4.2 Luồng M01b — Sinh Dữ liệu Thương mại & Bán hàng (Product Copy)
Truy cập tại tab `m01b` trên màn hình `/tai-anh`:

1. **Bộ chọn Phân tích đã duyệt (`ApprovedAnalysesSelector`)**:
   - Tự động nạp danh sách các phân tích ảnh đã được duyệt (`GET /api/v1/vision/analyses?approval_state=APPROVED`).
   - Cho phép lọc theo mã sản phẩm hoặc tìm kiếm theo danh mục hoa.
2. **Cấu hình Phong cách & Ngữ cảnh Thương mại**:
   - Đọc hồ sơ thương hiệu (`useTenantProfile` / `learning_profiles`): Định vị tone giọng tiệm hoa (Sang trọng, Thân thiện, Tinh tế, Trẻ trung), câu slogan thương hiệu (`brandCtaPhrase`).
   - Cung cấp ô nhập "Ghi chú & Ngữ cảnh bổ sung" (vd: *Bó hoa phong cách pastel tặng sinh nhật bạn gái 25 tuổi, cần phong cách ngọt ngào lãng mạn*).
3. **Kích hoạt Sinh bài viết (`POST /api/v1/product-copies/generate`)**:
   - Hệ thống phối hợp giữa BOM cấu phần hoa M01a + Hồ sơ thương hiệu + Ngữ cảnh nhập tay.
   - AI Gateway sinh nội dung có cấu trúc:
     - Tên sản phẩm thương mại cuốn hút (vd: *Nàng Thơ Ban Mai*, *Vũ Khúc Hồng Pastel*).
     - Tagline / Slogan ngắn.
     - Mô tả sản phẩm giàu cảm xúc và câu chuyện ý nghĩa loài hoa.
     - Danh sách USP nổi bật (3–5 điểm bán hàng độc nhất).
     - Thẻ phân loại SEO & Dịp tặng phù hợp.
     - Phân khúc giá và Dải giá đề xuất (kết nối trực tiếp mô hình M02 Pricing Rules).
4. **Hiển thị & Tinh chỉnh (`CommercialContentCard`)**:
   - Người dùng có thể sửa trực tiếp từng trường nội dung (Tên, USP, Story, Thẻ).
   - Nút tác vụ chuẩn hóa: Lưu nháp, Duyệt nội dung (`POST /api/v1/product-copies/:id/approve` - H6), hoặc Tạo lại với ngữ cảnh mới.
   - Khi duyệt thành công: Dữ liệu thương mại được đồng bộ vào Product Master và tự động mở khóa Tab M01c.

---

### 4.3 Luồng M01c — Thẻ Chào Hàng A6, Kịch bản Zalo & Bán hàng Tức thì
Truy cập tại tab `m01c` trên màn hình `/tai-anh`:

1. **Thẻ Chào Hàng Trực Quan A6 (`SalesPitchCardA6` / `SalesPitchCard`)**:
   - Thiết kế chuẩn tỷ lệ in ấn và hiển thị di động A6 (105 x 148mm hoặc card di động hiện đại).
   - Bố cục gồm 5 khối thông tin cốt lõi:
     - Khối Header: Logo tiệm, hotline, slogan thương hiệu.
     - Khối Ảnh: Ảnh mẫu hoa sắc nét đã qua cân bằng sáng/tối ưu.
     - Khối Định lượng & Kích thước: Bảng tóm tắt các loài hoa chính và kích thước ước tính.
     - Khối Giá & Ưu đãi: Giá niêm yết, phân khúc giá, quà tặng kèm (thiệp, banner, freeship).
     - Khối Cam kết: 3 cam kết chuẩn của shop (Hoa tươi 100%, Giống mẫu 95%, Giao đúng giờ).
   - Xuất file & Chia sẻ: Hỗ trợ xuất ảnh PNG/JPEG chất lượng cao hoặc in nhanh PDF A6 để nhân viên đính kèm vào hộp hoa hoặc gửi khách duyệt mẫu.
2. **Kịch bản Tư vấn Zalo 1-chạm (`ZaloScriptBox`)**:
   - Cung cấp sẵn 3 biến thể kịch bản hội thoại tư vấn được cá nhân hóa theo thông tin mẫu hoa:
     - **Kịch bản Tự nhiên / Thân mật**: Lời chào thân thiện, khen ngợi gu thẩm mỹ của khách, báo giá nhẹ nhàng.
     - **Kịch bản Tinh tế / Sang trọng**: Đi sâu vào ý nghĩa câu chuyện loài hoa, nhấn mạnh nguồn gốc hoa cao cấp, dịch vụ thiệp viết tay độc bản.
     - **Kịch bản Chốt nhanh / Bận rộn**: Đi thẳng vào giá, thời gian hoàn thành (trong 60–90 phút), cam kết chụp ảnh thành phẩm trước khi giao.
   - Nút "Copy 1-chạm" kèm hiệu ứng toast xác nhận tức thì, nhân viên chỉ cần dán thẳng vào Zalo/Messenger của khách.
3. **Bộ Phối Hoa Thay Thế theo Ngân sách (`BudgetMatchingModal`)**:
   - Khi khách ưng mẫu hoa nhưng chê giá cao hoặc có ngân sách cố định:
   - Thuật toán `budget-flower-matcher.ts` tự động tính toán các phương án thay thế vật tư (thay hoa nhập bằng hoa nội địa cùng tone màu, giảm số lượng cành hoa đệm, giữ nguyên hoa chủ đạo) để co giãn giá về đúng mức ngân sách yêu cầu mà vẫn giữ nguyên 90% diện mạo bó hoa.
4. **Chuyển giao Sáng tạo (Handoff to Creative Studio)**:
   - Nút hành động "Chuyển sang Creative Studio": Tự động đóng gói `analysis_id`, `product_id`, `asset_id` qua `buildHandoffSearchParams()` và điều hướng sang `/creative-studio` để chạy chuỗi 14 chặng sáng tạo (tách nền, ghép bối cảnh, tạo video ngắn, viết bài mạng xã hội đa kênh).

---

## 5. Động cơ Phân tích Thị giác Python (Worker Engines & Algorithms)

Hệ thống hỗ trợ 3 bộ máy phân tích được đăng ký tập trung tại [`registry.py`](../../workers/vision/providers/registry.py):

| Engine Key | Tên bộ máy | Công nghệ sử dụng | Mức độ sẵn sàng | Đặc điểm kỹ thuật & Thác dự phòng |
|---|---|---|---|---|
| `openai_structured` | **Đầy đủ (Mặc định)** | OpenAI GPT-4o / GPT-4o-mini qua Structured Outputs (JSON Schema bắt buộc) | ✅ **Sản xuất (Production)** | Tuân thủ tuyệt đối `Schema.json`. Có cơ chế gọi 2 lượt nếu điểm tin cậy thấp. Tính toán chi phí chính xác và ghi nhận `ai_requests`. |
| `openai_direct` | **Gọn (Direct)** | OpenAI GPT-4o Prompting trực tiếp (PromptGon.md) | ✅ **Sản xuất (Dự phòng)** | Chi phí thấp hơn, độ trễ nhanh hơn. Dùng làm phương án dự phòng khi bộ Đầy đủ gặp sự cố hạn mức hoặc quá tải. |
| `local_cv` | **Cục bộ (Local CV)** | SAM2.1 Hiera Small (Segmentation) + Florence-2 Large (Object Recognition & Labeling) | ⚠️ **Thực nghiệm (Experimental)** | Chạy 100% trên GPU máy chủ, không mất phí API bên thứ ba. Mã nguồn đã hoàn thiện lớp bọc (`local_cv_segmenter.py`, `local_cv_labeler.py`), nhưng đòi hỏi cài đặt `requirements-local-cv.txt` và nạp checkpoint nặng. |

### Các Thuật toán Thị giác Bổ trợ trong Worker
- **Color Engine (`color_engine.py`)**: Sử dụng không gian màu CIE Lab và công thức chênh lệch màu quang học **CIEDE2000 ($\Delta E$)** để phân cụm màu hoa thành các tone màu chuẩn (đỏ, hồng, trắng, vàng, cam, tím, xanh, pastel...).
- **Species Dictionary (`tu_dien.py` & `species_catalog.json`)**: Bảng tra cứu danh mục hơn 300 loài hoa và lá phổ biến tại thị trường Việt Nam (Hồng Ohara, Hồng Juliet, Cẩm tú cầu, Cát tường, Baby, Lan hồ điệp, Cúc mẫu đơn...). Tự động chuẩn hóa tên gọi tiếng Việt có dấu và phân nhóm thực vật.
- **Count & Density Engine (`count_engine.py` / `dem_tong.py`)**: Đếm số lượng bông hoa dựa trên phân vùng điểm ảnh (bounding boxes / mask contours), ước tính độ nở của hoa và nhận diện hoa dập/hỏng.

---

## 6. Danh mục API Endpoints Hoàn chỉnh

### 6.1 Nhóm API Phân tích Thị giác (`/api/v1/vision/`)

| Method | Endpoint | Quyền (RBAC) | Yêu cầu Đầu vào / Headers | Kết quả Đầu ra (Response) | Mô tả & Trạng thái |
|---|---|---|---|---|---|
| `POST` | `/api/v1/vision/analyses` | `H1` | Header: `Idempotency-Key` (bắt buộc). Body: `{ asset_ids: string[], product_id?: string }` | 201 Created: `{ job_id, status, engine, usage: { cost_credit, balance_after } }` | Tạo job phân tích ảnh mới vào hàng đợi. ✅ |
| `GET` | `/api/v1/vision/analyses` | `H3` hoặc `H5` | Query: `approval_state` (`PENDING` hoặc `APPROVED`), `limit` (max 100), `cursor` | 200 OK: `{ items: AnalysisDetail[], nextCursor: string \| null }` | Danh sách hàng chờ duyệt (cần `H3`) hoặc danh sách đã duyệt cho M01b (cần `H5`). ✅ |
| `GET` | `/api/v1/vision/analyses/:id` | `H1` | Param: `id` (Analysis UUID) | 200 OK: `AnalysisDetail` (kèm thông tin asset URL ký tạm thời, raw, edited, state) | Lấy chi tiết một bản phân tích ảnh. ✅ |
| `PATCH` | `/api/v1/vision/analyses/:id` | `H2` | Param: `id`. Body: `{ edited: Record<string, unknown> }` | 200 OK: `AnalysisDetail` | Chỉnh sửa nội dung phân tích trước khi duyệt. Kiểm tra nghiêm ngặt không được thiếu khóa. Không sửa được khi đã `APPROVED`. ✅ |
| `POST` | `/api/v1/vision/analyses/:id/approve` | `H3` (Trần cứng) | Param: `id` | 200 OK: `AnalysisDetail` | Duyệt kết quả: Ghi Product Master, đổi trạng thái sang `APPROVED`, ghi audit log. Trả 409 nếu đã duyệt. ✅ |
| `POST` | `/api/v1/vision/analyses/:id/reject` | `H3` (Trần cứng) | Param: `id`. Body: `{ ly_do?: string }` | 200 OK: `AnalysisDetail` | Từ chối kết quả: Đổi trạng thái sang `REJECTED`, ghi lý do vào audit log. Chỉ từ chối được bản `PENDING`. ✅ |
| `GET` | `/api/v1/vision/analyses/export` | `H3` (Trần cứng) | Query: `states` (PENDING,APPROVED...), `from`, `to` | 200 OK: `text/csv; charset=utf-8` (File đính kèm mở bằng Excel) | Xuất báo cáo đối soát toàn bộ kết quả phân tích ảnh của tổ chức ra CSV. ✅ |
| `GET` | `/api/v1/vision/engine` | `H1` | Không có | 200 OK: `{ bo_may: string, danh_sach: string[] }` | Xem bộ máy AI đang được cấu hình cho tổ chức. ✅ |
| `PUT` | `/api/v1/vision/engine` | `H4` (Trần cứng) | Body: `{ bo_may: "openai_structured" \| "openai_direct" \| "local_cv" }` | 200 OK: `{ bo_may: string }` | Thay đổi bộ máy AI áp dụng cho các job mới của tổ chức. ✅ |

### 6.2 Nhóm API Dữ liệu Bán hàng (`/api/v1/product-copies/`)

| Method | Endpoint | Quyền (RBAC) | Yêu cầu Đầu vào | Kết quả Đầu ra | Mô tả & Trạng thái |
|---|---|---|---|---|---|
| `POST` | `/api/v1/product-copies/generate` | `H5` | Body: `{ analysis_id: string, additional_context?: string }` | 201 Created: `{ id, raw, approval_state }` | Sinh nội dung bán hàng từ bản phân tích đã duyệt kết hợp Profile tiệm. ✅ |
| `GET` | `/api/v1/product-copies` | `H5` | Query: `analysis_id`, `approval_state`, `limit`, `cursor` | 200 OK: `{ items: ProductCopyDetail[], nextCursor }` | Danh sách các bản copy bán hàng. ✅ |
| `GET` | `/api/v1/product-copies/:id` | `H5` | Param: `id` | 200 OK: `ProductCopyDetail` | Lấy chi tiết bản copy. ✅ |
| `PATCH` | `/api/v1/product-copies/:id` | `H5` | Param: `id`. Body: `{ edited: Record<string, unknown> }` | 200 OK: `ProductCopyDetail` | Chỉnh sửa bài viết bán hàng trước khi duyệt. ✅ |
| `POST` | `/api/v1/product-copies/:id/approve` | `H6` (Trần cứng) | Param: `id` | 200 OK: `ProductCopyDetail` | Duyệt nội dung bán hàng, cập nhật Product Master, ghi audit log. ✅ |
| `POST` | `/api/v1/product-copies/:id/reject` | `H6` (Trần cứng) | Param: `id`. Body: `{ reject_reason?: string }` | 200 OK: `ProductCopyDetail` | Từ chối nội dung bán hàng kèm lý do. ✅ |

---

## 7. Đánh giá Trạng thái Hiện tại (Feature Status Matrix)

| Thành phần / Chức năng | Trạng thái | Mã nguồn dẫn chứng | Đánh giá chi tiết |
|---|---|---|---|
| **Kéo thả / Tải ảnh lên từ thiết bị** | ✅ Implemented | `src/app/(app)/tai-anh/page.tsx:1262` | Tải tối đa 10 ảnh, validate định dạng ảnh, preview cục bộ tức thì. |
| **Tái dùng ảnh từ Kho ảnh Shop** | ✅ Implemented | `account-storage-hub.tsx` | Nối trực tiếp Kho ảnh (`assets`) vào luồng phân tích mà không cần tải lại. |
| **Bảo vệ Trùng lặp (Idempotency)** | ✅ Implemented | `route.ts:27`, `idempotency.ts` | Bắt buộc `Idempotency-Key` header, chống trừ credit 2 lần khi double-click. |
| **Worker Queue & SSE Realtime** | ✅ Implemented | `worker.py`, `job_events` | SKIP LOCKED, LISTEN/NOTIFY, phát tiến trình SSE qua các chặng DETECTING -> COMPLETED. |
| **BOM Mapping 100% Trường Nguyên tử** | ✅ Implemented | `analysis-schema-mapper.ts` | Đầy đủ loại hoa, số lượng, cành hỏng, nụ, màu sắc, OCR chữ trên thiệp. |
| **Chỉnh sửa Dữ liệu Nguyên tử trên UI** | ✅ Implemented | `result-card.tsx`, `analysis-result-card.tsx` | Sửa từng dòng hoa, thêm/xóa loại hoa, lưu bản sửa độc lập (`edited`). |
| **Validation Chống Mất Dữ liệu** | ✅ Implemented | `product-analysis-rules.ts:65` | Kiểm tra `isValidAnalysisEdit`, cấm bản sửa thiếu khóa cấp 1 của AI. |
| **Duyệt ghi Product Master Transaction** | ✅ Implemented | `approve-analysis.ts:50` | Ghi Product Master + Đổi trạng thái + Ghi Audit Log trong 1 giao dịch an toàn. |
| **Sinh Nội dung Bán hàng M01b** | ✅ Implemented | `product-copies/generate`, `CommercialContentCard` | Kết hợp Learning Profile sinh Tên, Slogan, USP, Story, Thẻ SEO, Giá đề xuất. |
| **Thẻ Chào Hàng A6 Trực quan** | ✅ Implemented | `sales-pitch-card-a6.tsx`, `sales-pitch-card.tsx` | Hiển thị chuẩn A6, bảng định lượng hoa, xuất ảnh, in ấn trực tiếp. |
| **Kịch bản Tư vấn Zalo 1-chạm** | ✅ Implemented | `zalo-script-box.tsx`, `sales-scripts-catalog.ts` | 3 biến thể kịch bản hội thoại cá nhân hóa kèm nút Copy 1-chạm. |
| **Phối Hoa Đổi Ngân sách (Budget Matcher)**| ✅ Implemented | `budget-matching-modal.tsx`, `budget-flower-matcher.ts` | Thuật toán co giãn giá và thay thế vật tư theo ngân sách khách hàng. |
| **Xuất Báo cáo Đối soát CSV** | ✅ Implemented | `export-analyses.ts`, `route.ts: export` | Xuất toàn bộ dữ liệu phân tích và lịch sử duyệt ra file CSV tương thích Excel. |
| **Động cơ Phân tích Cục bộ (Local CV)** | ⚠️ Partial | `local_cv.py`, `local_cv_segmenter.py` | Mã nguồn SAM2 + Florence-2 đã hoàn thành lớp bọc nhưng chưa benchmark thực tế trên production. |
| **Tự động Gợi ý Giá từ Công thức M02** | ⚠️ Partial | `pricing-rules.ts`, `sales-pitch-template.ts` | Đã có công thức tính giá theo cành nhưng phụ thuộc vào việc tiệm đã nhập bảng giá hoa tươi trong M02. |
| **Xử lý Hàng đợi Job khi Lỗi Đột ngột** | ✅ Implemented | `worker.py:292` | Cơ chế ghi nhận lỗi `FAILED`, retry an toàn với `_da_phan_tich` bỏ qua các ảnh đã xong. |

---

## 8. Các Rủi ro Kỹ thuật, Giới hạn & Điểm cần Nâng cấp (Gap to Enterprise)

Dưới đây là các phát hiện thực tế từ quá trình rà soát mã nguồn làm cơ sở nâng cấp lên chuẩn **Enterprise Commercial-Ready**:

1. **Kích thước File Giao diện Quá Lớn (Vi phạm Giới hạn SRP 350 dòng)**:
   - File [`src/app/(app)/tai-anh/page.tsx`](../../src/app/%28app%29/tai-anh/page.tsx) hiện tại dài tới **1,878 dòng**. File này đang gánh quá nhiều trách nhiệm: quản lý state của cả 4 tab, gọi API, xử lý upload, chuyển đổi phase, quản lý modal budget matching, selector phân tích đã duyệt...
   - *Hướng giải quyết*: Cần phân rã triệt để thành các sub-components độc lập: `M01aWorkspace.tsx`, `M01bWorkspace.tsx`, `M01cWorkspace.tsx`, `useAnalysisFlow.ts`, `useProductCopyFlow.ts`.
2. **Khả năng Phục hồi Kết nối SSE khi Mất Mạng Tạm thời**:
   - Khi tiến trình xử lý AI kéo dài (10–25 giây), nếu kết nối mạng của thiết bị di động chập chờn, kết nối SSE có thể bị đứt khiến UI kẹt ở trạng thái "Đang phân tích".
   - *Hướng giải quyết*: Bổ sung cơ chế Polling dự phòng (Heartbeat fallback) kiểm tra trạng thái job qua `GET /api/v1/jobs/:id` nếu sau 15 giây không nhận được event SSE mới.
3. **Môi trường Triển khai Mô hình Local CV (SAM2 / GPU)**:
   - `local_cv` đòi hỏi GPU tối thiểu 8GB VRAM và bộ dependencies Python nặng (`torch`, `sam2`, `transformers`). Trên môi trường server chuẩn của các shop nhỏ hoặc máy phát triển không có GPU rời, việc bật nhầm engine này sẽ báo lỗi `NotImplementedError`.
   - *Hướng giải quyết*: Cần thêm API tự kiểm tra năng lực phần cứng (`hardware-healthcheck`) để ẩn tùy chọn `local_cv` trên UI nếu máy chủ không đủ điều kiện.
4. **Tối ưu Băng thông với Ảnh Kích thước Lớn (High-Resolution Uploads)**:
   - Các shop hoa thường chụp bằng iPhone/Samsung đời mới có dung lượng ảnh 8MB–15MB. Việc tải trực tiếp ảnh dung lượng lớn lên cloud storage làm tăng thời gian chờ và chi phí băng thông.
   - *Hướng giải quyết*: Bổ sung bước nén ảnh thông minh phía client (Canvas/Web Worker resize về kích thước tối đa 2048px, nén WebP chất lượng 85%) trước khi đưa vào hàng đợi phân tích.
5. **Đồng bộ Định mức Vật tư vào Quản lý Tồn kho Tức thì (Live Inventory Deduction)**:
   - Hiện tại dữ liệu BOM được ghi vào Product Master (`products.attributes.bom`), nhưng chưa tự động liên kết với module Tồn kho (`product_inventory`) để cảnh báo khi số lượng hoa hồng trong kho không đủ để cắm mẫu hoa này.
   - *Hướng giải quyết*: Bổ sung bước kiểm tra tồn kho dự kiến ngay tại Tab M01c (Báo cho thợ hoa biết kho còn bao nhiêu cành để cắm).
