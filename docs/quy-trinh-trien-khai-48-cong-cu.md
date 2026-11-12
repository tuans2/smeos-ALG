# QUY TRÌNH CHUẨN PHÁT TRIỂN 48 CÔNG CỤ ALG
## (SOP: Tool Blueprint & Implementation Standard)

> **Tài liệu hướng dẫn mẫu (Gold Standard)** đúc kết từ việc triển khai thực tế **Công cụ 01 (Tạo ảnh sản phẩm chuyên nghiệp)**.  
> Mọi chức năng tiếp theo trong bộ 48 công cụ của hệ thống **bắt buộc tuân thủ 100%** theo khung quy trình 5 giai đoạn này.

---

## MỤC LỤC
1. [Nguyên Tắc Bất Biến (Core Tenets)](#1-nguyên-tắc-bất-biến-core-tenets)
2. [Giai Đoạn 1: Đọc & Phân Tích SSOT Đặc Tả 48 Công Cụ v3](#giai-đoạn-1-đọc--phân-tích-ssot-đặc-tả-48-công-cụ-v3)
3. [Giai Đoạn 2: Khảo Sát Hiện Trạng & Gap Analysis](#giai-đoạn-2-khảo-sát-hiện-trạng--gap-analysis)
4. [Giai Đoạn 3: Thiết Kế User Journey & Duyệt UI/UX Trước Khi Code](#giai-đoạn-3-thiết-kế-user-journey--duyệt-uiux-trước-khi-code)
5. [Giai Đoạn 4: Triển Khai Kỹ Thuật (Module-per-Tool Clean Architecture)](#giai-đoạn-4-triển-khai-kỹ-thuật-module-per-tool-clean-architecture)
6. [Giai Đoạn 5: Kiểm Thử, Fix Lint & Cập Nhật Toolkit Catalog](#giai-đoạn-5-kiểm-thử-fix-lint--cập-nhật-toolkit-catalog)
7. [Checklist Nghiệm Thu Nhanh (Pre-Handoff Checklist)](#7-checklist-nghiệm-thu-nhanh-pre-handoff-checklist)

---

## 1. NGUYÊN TẮC BẤT BIẾN (CORE TENETS)

| # | Nguyên Tắc | Quy Định Cốt Lõi |
|---|---|---|
| **T1** | **SSOT Tài Liệu** | SSOT gốc là [`ALG_48_cong_cu_v3.md`](nâng%20cấp%20chức%20năng%20cho%20cửa%20hàng/ALG_48_cong_cu_v3.md). Mọi tiêu chuẩn đầu ra, prompt mẫu, tiêu chí QC, hành động người dùng phải bám sát đặc tả này. |
| **T2** | **Provider Single-Call** | Mọi tác vụ AI mặc định gọi **MỘT LẦN DUY NHẤT** (Single-Call) tới AI Provider (Gemini, OpenAI, Fal, Photoroom...) với prompt đầy đủ. **Tuyệt đối cấm** dựng pipeline phức tạp nhiều bước cục bộ (như cắt ghép nối SAM2/rembg) trừ trường hợp fallback khẩn cấp khi mất mạng/hết credit. |
| **T3** | **Zero Friction UX (Mặc định tự động)** | Luôn có chế độ **Mặc định Tự động (AUTO ✨)**. Người dùng chỉ cần cung cấp đầu vào cơ bản (ảnh/văn bản/link) và bấm 1 nút là xong. Bảng tùy chọn preset nâng cao chỉ mở khi bấm mở rộng (Collapsible). |
| **T4** | **1 Tool = 1 Module Riêng** | Mỗi công cụ nằm trong 1 module độc lập dưới `src/modules/<tool-slug>/` theo chuẩn 4 lớp Clean Architecture: `domain/` → `use-cases/` → `infra/` → `adapters/`. |
| **T5** | **Bảo Vệ Đa Tenant & SRP** | `organization_id` luôn giải từ Server Session (cấm nhận từ client request body). Mọi file không vượt quá **350 dòng**. |

---

## GIAI ĐOẠN 1: ĐỌC & PHÂN TÍCH SSOT ĐẶC TẢ 48 CÔNG CỤ V3

Trước khi viết bất kỳ dòng mã nào, agent/developer phải mở và đọc đúng mục của công cụ trong file SSOT:
`docs/nâng cấp chức năng cho cửa hàng/ALG_48_cong_cu_v3.md`.

### Trích xuất 6 thông số bắt buộc:
1. **Bản chất công cụ**: Hướng người dùng cuối giải quyết bài toán kinh doanh nào?
2. **Luồng xử lý chuẩn**: Input là gì? AI xử lý gì? Output cuối cùng là gì?
3. **Tiêu chuẩn đầu ra (Output Standard)**: Các tiêu chí đánh giá chất lượng (tiêu chí bắt buộc vs tiêu chí chấm điểm).
4. **Cấu trúc Prompt**: Các chỉ thị nghiệp vụ cần gửi cho AI Provider để đảm bảo chất lượng thương mại.
5. **Cơ chế QC & Retry**: Ngưỡng điểm đạt (≥ 0.8), số lần thử lại tối đa (thường là 2 lần) và hướng dẫn gợi ý (retry hint).
6. **Hành động người dùng (Action Matrix)**: Duyệt, chỉnh lại, tải về, chuyển tiếp sang các công cụ khác trong bộ 48.

---

## GIAI ĐOẠN 2: KHẢO SÁT HIỆN TRẠNG & GAP ANALYSIS

Khảo sát hệ thống hiện tại để **tận dụng tối đa tài nguyên có sẵn**, tránh viết lại code trùng lặp.

### 4 Việc cần khảo sát:
1. **Kiểm tra Toolkit Catalog**: Mở `src/modules/toolkit/domain/toolkit-catalog.ts`, xem công cụ đang ở trạng thái nào (`FOUNDATION`, `PLANNED`, `IN_PROGRESS` hay `DONE`) và đường dẫn `href` hiện tại đang trỏ về đâu.
2. **Đối chiếu Route hiện có**: Kiểm tra xem trang mà `href` trỏ tới có thực sự làm đúng bản chất của công cụ trong tài liệu v3 không.
   - *Bài học Công cụ 01*: Catalog ban đầu trỏ vào `/tai-anh` (M01a Creative Studio phân tích ảnh), trong khi tài liệu v3 yêu cầu là Studio chỉnh ảnh bằng AI → Phát hiện Gap lớn để tạo module & route riêng `/cong-cu/anh-san-pham`.
3. **Kiểm tra Provider AI có sẵn**:
   - `workers/media_ai/providers/`: Đã có adapter OpenAI, Gemini (Imagen), Fal, Photoroom hay chưa?
   - `src/core/ports/`: Các cổng interface AI (`ImageProvider`, `VisionAnalyzer`, `StorageProvider`...).
4. **Lập tài liệu Phân tích khoảng cách (Gap Analysis)**:
   - Viết ngắn gọn bảng so sánh: *Tài liệu mô tả gì vs Code hiện tại có gì vs Cần xây mới những gì*.

---

## GIAI ĐOẠN 3: THIẾT KẾ USER JOURNEY & DUYỆT UI/UX TRƯỚC KHI CODE

> [!IMPORTANT]
> **BẮT BUỘC TRÌNH DUYỆT USER JOURNEY**: Trình bày rõ ràng kịch bản trải nghiệm người dùng (User Journey) và kiến trúc kỹ thuật để người dùng xác nhận trước khi bắt tay vào code.

### Cấu trúc chuẩn của một bản User Journey:
Bản User Journey phải tuân theo cấu trúc đã áp dụng thành công ở Công cụ 01 (5 bước):

1. **Khẳng định kiến trúc**: Minh họa bằng sơ đồ Mermaid luồng **Provider Single-Call** + cơ chế QC.
2. **Bước 1 — Tải đầu vào & Lựa chọn**:
   - Khối hướng dẫn chuẩn hóa [`FeatureGuidanceCard`](../src/components/templates/shared/feature-guidance-card.tsx) (viền đỏ pastel, mẹo thao tác nhanh).
   - Vùng nhập liệu trực quan (drag & drop ảnh / paste text / chọn catalog).
   - **Nút hành động chính (Primary Call-to-Action)**: Nổi bật, to, cam kết xử lý tự động ngay lập tức (vd: *"Tạo ảnh chuyên nghiệp ✨"*).
   - **Tùy chọn mở rộng (Collapsible)**: Thu gọn danh sách preset, mặc định luôn là `Tự động ✨`.
3. **Bước 2 — Trạng thái đang xử lý (In-Progress / Processing)**:
   - Hiển thị spinner/icon loading sinh động + ước lượng thời gian thực tế (10–20s).
   - Thông báo minh bạch hệ thống đang xử lý gì (bảo toàn dữ liệu gốc).
4. **Bước 3 — Hiển thị kết quả & Kiểm định QC**:
   - Chế độ so sánh Trước / Sau trực quan (Before / After Slider) hoặc bản nháp đối chiếu.
   - Bảng điểm kiểm định chất lượng (QC Report) 8 tiêu chí chuẩn hóa, hiển thị rõ ràng Đạt / Chưa đạt.
5. **Bước 4 — Hành động đầu ra (Outputs & Next Steps)**:
   - Nút tải về / Sao chép / Sử dụng ngay.
   - Cơ chế yêu cầu sửa lại (Retry) kèm ô nhập ghi chú điều chỉnh cho AI.
   - Nút chuyển tiếp mượt mà sang các công cụ liên quan tiếp theo trong bộ 48 (vd từ 01 → 02 tạo bộ ảnh → 03 thẻ chào → 13 bài viết bán hàng).

---

## GIAI ĐOẠN 4: TRIỂN KHAI KỸ THUẬT (MODULE-PER-TOOL CLEAN ARCHITECTURE)

Triển khai lần lượt theo thứ tự từ dưới lên (Domain → Use-Cases → API → UI):

### 4.1. Domain Layer (`src/modules/<tool-slug>/domain/`)
- `output-standard.ts`: Khai báo hằng số danh sách các tiêu chuẩn đầu ra chuẩn hóa (SSOT).
- `preset-catalog.ts`: Danh mục preset và các tùy chọn cấu hình sẵn.
- `prompt-builder.ts`: Hàm thuần dựng prompt Single-Call cho AI Provider.
- `<tool>-rules.ts`: Luật nghiệp vụ thuần (đánh giá QC `evaluateQc()`, kiểm tra điều kiện retry `canRetry()`).
- `<tool>-rules.test.ts`: **Bắt buộc viết Unit Test** kiểm tra luật với 100% test pass mà không cần kết nối DB.

### 4.2. Use-Cases Layer (`src/modules/<tool-slug>/use-cases/`)
- `create-<tool>-job.ts`: Validate đầu vào → Dựng prompt → Gọi `enqueueJob()` với `idempotencyKey` và `feature`.
- `get-<tool>-result.ts`: Lấy thông tin job từ DB, lấy ký số URL từ `storage.signedUrl(key, PREVIEW_EXPIRES_IN)`, tính toán bảng điểm QC.
- `retry-<tool>.ts`: Lấy lại ngữ cảnh lượt trước, thêm `retryHint` vào prompt và tạo job mới.

### 4.3. API Routes Layer (`src/app/api/v1/<tool-slug>/`)
- `route.ts`:
  - `POST`: Nhận request body, kiểm tra session tenant bằng `requireTenantContext(request)`, đọc `Idempotency-Key` header, gọi use-case tạo job.
  - `GET`: Trả về danh sách presets / options.
- `[id]/route.ts`:
  - `GET`: Trả kết quả trạng thái job, output URLs và bảng điểm QC.
- `[id]/retry/route.ts`:
  - `POST`: Nhận hint điều chỉnh và kích hoạt lượt chạy lại.

### 4.4. UI Components Layer (`src/components/<tool-slug>/`)
Chia nhỏ component để đảm bảo quy tắc **Single Responsibility Principle (SRP ≤ 350 dòng/file)**:
- `<tool>-upload-panel.tsx`: Vùng nhập liệu/tải lên và validation phía giao diện.
- `preset-selector.tsx`: Khối lựa chọn preset collapsible.
- `<tool>-comparison.tsx`: Trình xem so sánh đối chiếu trước/sau.
- `<tool>-result-viewer.tsx`: Khối xem kết quả, tải file và báo cáo QC.
- `<tool>-client.tsx`: Client Container tổng điều phối polling trạng thái và hiển thị layout.

### 4.5. Route Page (`src/app/(app)/cong-cu/<tool-slug>/page.tsx`)
- Server Component kiểm tra session: `const session = await resolveAppSession(cookieHeader)`.
- Nhúng metadata SEO chuẩn mực và render Client Container.

---

## GIAI ĐOẠN 5: KIỂM THỬ, FIX LINT & CẬP NHẬT TOOLKIT CATALOG

### 1. Quy chuẩn Upload tệp an toàn (Signed URL Proxy Pattern)
Khi người dùng tải tệp ảnh/tài liệu lên, **bắt buộc tuân thủ quy trình 3 bước**:
```typescript
import { uploadBrandAsset } from "@/components/profiles/upload-brand-asset"
const { assetId } = await uploadBrandAsset(file)
// 1. POST /api/v1/assets/upload-url (lấy URL ký số)
// 2. PUT <upload_url> (browser đẩy tệp qua server proxy để tránh lỗi CORS R2)
// 3. POST /api/v1/assets (ghi bản ghi vào database)
```

### 2. Kiểm tra Typecheck & Test Suite
Chạy kiểm tra tính toàn vẹn của mã nguồn:
```bash
# 1. Chạy test của module
npx vitest run src/modules/<tool-slug>/

# 2. Typecheck toàn dự án (không được có bất kỳ lỗi TS nào phát sinh từ module mới)
npx tsc --noEmit
```

### 3. Cập nhật Toolkit Catalog (SSOT cho Trang Chủ /cong-cu)
Mở [toolkit-catalog.ts](../src/modules/toolkit/domain/toolkit-catalog.ts), tìm đúng ID của công cụ và cập nhật:
```typescript
{
  id: <tool_id>,
  name: "...",
  description: "...",
  icon: "...",
  label: "BOTH",
  status: "DONE",            // Đổi từ FOUNDATION/PLANNED sang DONE
  progress: 100,            // 100%
  href: "/cong-cu/<tool-slug>", // Đường dẫn trang chính thức vừa tạo
  statusNote: "Công cụ <ID> — Provider Single-Call Studio",
}
```

---

## 7. CHECKLIST NGHIỆM THU NHANH (PRE-HANDOFF CHECKLIST)

Trước khi bàn giao bất kỳ chức năng nào cho người dùng nghiệm thu, hãy đối chiếu checklist sau:

- [ ] **Khớp 100% SSOT v3**: Đúng bản chất nghiệp vụ mô tả trong `ALG_48_cong_cu_v3.md`?
- [ ] **Provider Single-Call**: Dùng 1 lần gọi AI với prompt chuẩn, không lạm dụng pipeline nối nhiều bước cục bộ?
- [ ] **Mặc định tự động**: Khách chỉ cần tải lên và bấm nút 1 lần là nhận kết quả ngay?
- [ ] **Clean Architecture 4 lớp**: Đầy đủ `domain`, `use-cases`, `infra/api`, `components` riêng biệt?
- [ ] **Không hardcode & Zero Leak**: `organization_id` giải từ server session, không lộ secret?
- [ ] **Giới hạn số dòng**: Không có file nào vượt quá 350 dòng?
- [ ] **Unit Test xanh**: Toàn bộ unit test nghiệp vụ pass 100%?
- [ ] **Typecheck xanh**: `npx tsc --noEmit` không báo lỗi?
- [ ] **Catalog đồng bộ**: [toolkit-catalog.ts](../src/modules/toolkit/domain/toolkit-catalog.ts) đã đổi sang `status: "DONE"`, `progress: 100`, `href: "/cong-cu/..."`?
