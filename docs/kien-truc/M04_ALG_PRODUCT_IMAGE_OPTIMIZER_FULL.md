# M04 — ALG Product Image Optimizer — FULL ARCHITECTURE (Kiến trúc đầy đủ, phân giai đoạn Hình ảnh → Video)

**Version:** V1.2 Full (không rút gọn — đồng bộ với Kiến trúc V2: repo core mới, quyết định D5-c và D6-1)
**Ngày:** 2026-09-09
**Module:** **M04 — Image Enhancement**, thuộc bộ 8 module của ALG
**Repo:** tách đôi — xem mục A ngay dưới đây
**Tài liệu cấp trên (bắt buộc tuân thủ):** `ALG_SAAS_TARGET_ARCHITECTURE_V2.md` · **Bản đồ thu hoạch:** `HARVEST_MANIFEST.md`
**Nguồn:** Gộp đồng bộ từ 2 file gốc —
  1. `ALG_AI_Product_Image_Optimizer_Architecture_V1_Canonical.md` (nguồn sự thật kỹ thuật)
  2. `ALG_AI_Product_Image_Optimizer_Coding_Agent_Guide.md` (quy trình thực thi cho AI Coding Agent)

**Đây là bản FULL, không phải bản MVP rút gọn.** Toàn bộ phạm vi gốc được giữ nguyên (Product Identity Guard đầy đủ, Provider Architecture, Batch, Training Data pipeline, Marketing Creative Engine...). Điểm duy nhất được tổ chức lại là **cách phân giai đoạn thực thi**, gom về đúng 2 khối lớn theo loại input, cho dễ lập kế hoạch:

```text
GIAI ĐOẠN 1 — HÌNH ẢNH (Image)     ← triển khai trước, đầy đủ (không cắt), gồm các bước 1A→1E gốc
GIAI ĐOẠN 2 — VIDEO                ← triển khai sau, khi Giai đoạn 1 đạt Acceptance Criteria
   (Marketing Creative Engine đi kèm như phần mở rộng sau khi cả 2 giai đoạn trên ổn định — xem mục 14)
```

**Cách đọc file này:** Phần I là kiến trúc gốc đầy đủ. Phần II là hướng dẫn vận hành cho Coding Agent, trỏ thẳng tới mục kiến trúc tương ứng thay vì lặp lại nội dung — tránh hai phần lệch nhau theo thời gian. Khi có mâu thuẫn giữa Phần I và Phần II, **Phần I (Kiến trúc) và đặc biệt Bảng 73 câu hỏi (mục 0.1 — Phụ lục tham chiếu, giữ nguyên vẹn) luôn thắng.**

---

## A. Phân bổ repo — M04 tách ba tại Master Image (quyết định 2026-09-09, mở rộng 2026-09-11)

**Phân bổ hiện hành, theo D8 và D10 của Kiến trúc V2 mục 17.** M04 tách **ba** đơn vị triển khai, ranh giới bàn giao vẫn là Master Image:

| Đơn vị | Repo | Phạm vi trong tài liệu này |
|---|---|---|
| **M04a** Product Image Optimization | `floraos-core` | Giai đoạn 1 (Hình ảnh, Phase 1A–1E) — mục 1–13, 15, 16 |
| **M04b** Marketing Creative | `SocialFlow` | Mở rộng — Marketing Creative Engine, phần cuối mục 14 |
| **M04c** Video Studio | `SocialFlow` | Giai đoạn 2 (Video) |

**Giai đoạn 2 chuyển sang `SocialFlow` thành M04c.** Bản 09/09 xếp video vào M04a trong core. Căn cứ chuyển: video là lớp dựng cảnh **phủ lên** Master Image và các tỉ lệ đã sinh — nó không sinh pixel mới trên chính bó hoa, nên nó không cần Identity Guard, tức không cần đứng cạnh M01. Đối lại, `SocialFlow` đã có `video_jobs`, adapter HeyGen/Veo và chi phí thật ghi sẵn, nên đây là EXTEND chứ không phải BUILD. Nội dung kỹ thuật của Giai đoạn 2 trong tài liệu này **giữ nguyên** và đọc như đặc tả của M04c.

Hai luật của M04c, thừa hưởng nguyên từ luật M04b: khung đầu và khung cuối của một video luôn là ảnh đã duyệt; mô hình video không nhận lệnh tạo hình sản phẩm.

Bảng dưới đây giữ lại cách chia đôi của bản 09/09 cho phần Hình ảnh và phần Creative:

| | **M04a — Product Image Optimization** | **M04b — Marketing Creative** |
|---|---|---|
| Repo | **`floraos-core`** | **`SocialFlow`** |
| Phạm vi trong tài liệu này | **Giai đoạn 1 (Hình ảnh, Phase 1A–1E)** + **Giai đoạn 2 (Video)** — mục 1–13, 15, 16 | **Mở rộng — Marketing Creative Engine (Phase 3)** — phần cuối mục 14 |
| Câu hỏi module trả lời | "Đây có phải ảnh trung thực, sạch, chuyên nghiệp của đúng sản phẩm thật không?" | "Ảnh này có bán được trên kênh này không?" |
| Thành phần | Quality Analyzer · Product Detection/Isolation · Enhancement · **Product Identity Guard** · Master Image + Smart Reframe · ghi Asset ↔ Product Master | Text overlay · logo / brand template · marketing background · biến thể theo kênh · đẩy sang M07 |

**Lý do tách:** Product Identity Guard (mục 5) phải gọi Vision Analysis **hai lần cho mỗi ảnh** (fingerprint trước enhancement, phân tích lại sau enhancement). Module Vision (M01) nằm trong `floraos-core`, nên đặt M04a cạnh nó tránh được hai lượt gọi mạng liên repo cho mỗi ảnh trong ngưỡng SLA 10–30s (Q64) với 100–500 người dùng đồng thời (Q63). Ngoài ra output của M04a là `assets` và `products` — core entity do `floraos-core` sở hữu (V2 mục 2.1). Ngược lại, phần Creative chỉ tiêu thụ một Master Image đã hoàn chỉnh, không cần chạm vào core data model.

**Ranh giới bất khả xâm phạm:** M04b **không bao giờ** chạy lại enhancement sản phẩm và **không bao giờ** thay đổi product identity. Nó chỉ chồng lớp lên trên một Master Image đã được duyệt. Bất kỳ thay đổi nào chạm vào chính sản phẩm đều thuộc M04a và phải đi qua Identity Guard.

```text
M04a (floraos-core)                           M04b (SocialFlow)
──────────────────────────                    ──────────────────────────
Ảnh gốc
   ↓
Quality / Detect / Isolate / Enhance
   ↓
PRODUCT IDENTITY GUARD  ◄─ hard gate
   ↓
MASTER IMAGE + ratios ──── Asset ────►        Text / logo / template
   ↓                   (Integration Layer)         ↓
Asset ↔ Product Master                        Creative theo kênh → M07
```

## B. Thang bậc tài liệu — tài liệu nào thắng khi mâu thuẫn

```text
CẤP 1 — HỆ THỐNG:  ALG_SAAS_TARGET_ARCHITECTURE_V2.md
   Thắng tuyệt đối về: phân bổ repo, multi-tenant (organization_id), RBAC,
   mô hình GenerationJob, Usage, Asset, Review & Approve, Experience/trial,
   thứ tự Phase tổng.
        ↓
CẤP 2 — MODULE:    tài liệu này (Phần I + Bảng 73 câu hỏi mục 0.1)
   Thắng về: nguyên tắc "Enhance, không regenerate", Product Identity Guard,
   pipeline ảnh, ngưỡng kỹ thuật, quyết định gốc của product owner.
        ↓
CẤP 3 — QUY TRÌNH: Phần II của tài liệu này
   Không bao giờ thắng về nội dung kỹ thuật.
```

**Quy tắc bắt buộc:** Bảng 73 câu hỏi vẫn là căn cứ cuối cùng **trong phạm vi module M04**. Nhưng nó **không ghi đè ràng buộc Cấp 1**. Khi phát hiện mâu thuẫn giữa Cấp 1 và Cấp 2 (ví dụ: Q52/Q68 về gói credit vs. bảng `Usage` dùng chung ở V2 mục 9 (Usage)), agent **dừng lại và báo product owner** — không tự chọn bên nào. Product owner sửa tài liệu Cấp 1 trước, rồi mới code.

---

# PHẦN I — KIẾN TRÚC CHUẨN (SOURCE OF TRUTH)

## 0. Ghi chú cho AI Coding Agent

Tài liệu này là **kiến trúc chuẩn (source of truth)** cho tính năng **ALG AI Product Image Optimizer** — một tính năng **mới, độc lập** với module AI Vision (Component Detection/Counting) đã có trước đó.

Khi thực thi:

- Đây là **module riêng biệt**, đặt trong `workers/media_ai/`, **không trộn lẫn** với `workers/vision/` (M01). *(Bản V1.1 ghi `python-service/app/media_ai/` theo bố cục repo cũ; `vision_legacy/` không tồn tại ở `floraos-core`.)* Có thể **tái sử dụng kết quả** của AI Vision (Product Detection, mục 3) nhưng không được đưa code Vision vào chung thư mục `media_ai/`.
- **Nguyên tắc số 1, bất khả xâm phạm: "Enhance the product, don't regenerate the product."** Mọi quyết định thiết kế mơ hồ phải nghiêng về phía bảo toàn product identity, không nghiêng về phía "ảnh đẹp hơn".
- Nguồn quyết định chi tiết nằm ở **Bảng 73 câu hỏi (mục 0.1)** — khi kiến trúc và bảng này mâu thuẫn, bảng 0.1 là căn cứ cuối cùng.
- Thực thi đúng thứ tự Phase 1A → 1E (mục 14). Không nhảy cóc. Phase 2 (Video) và Phase 3 (Creative Engine) **chưa được phép bắt đầu** cho đến khi Phase 1 đầy đủ qua Acceptance Criteria (mục 15).
- Thứ tự ưu tiên bắt buộc khi có đánh đổi kỹ thuật: **Accuracy > Quality > Cost > Speed > Simplicity**.

---

## 0.1. PHỤ LỤC THAM CHIẾU — Bảng 73 Câu Hỏi & Trả Lời (Decision Record — Bất biến)

> **Đây là phần tham chiếu (reference) cố định, lưu nguyên trạng, không chỉnh sửa khi cập nhật các phần khác của tài liệu.** Đây là quyết định gốc của product owner. Khi có mâu thuẫn giữa phần diễn giải kiến trúc phía dưới và bảng này, **bảng này là căn cứ quyết định cuối cùng**. Mọi thay đổi kiến trúc trong tương lai (kể cả việc thêm/bớt giai đoạn, đổi provider, đổi ngưỡng Guard) đều phải đối chiếu ngược lại bảng này trước.

### A. Product / Business Objective

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Mục tiêu | Product Photography chuẩn trước, Marketing Creative sau |
| 2 | Input | Image + Video về dài hạn, nhưng **Phase 1 chỉ Image** |
| 3 | Thiết bị chính | Điện thoại |
| 4 | Chất lượng input | Rất đa dạng — kể cả tối, nghiêng, nền lộn xộn |
| 5 | Background | Clean + Replace + AI quyết định |
| 6 | Background style | Tất cả các style |
| 7 | Xóa vật thể không liên quan | Có |
| 8 | AI thay đổi sản phẩm | **Tuyệt đối không** |
| 9 | Trung thực màu sản phẩm | Ưu tiên rất cao |
| 10 | Beautify sản phẩm | Chỉ enhancement nhẹ |
| 11 | Tự động isolate | Có |
| 12 | Tự động align | Có |
| 13 | Auto crop | Có + user chọn ratio |
| 14 | Output ratio | Nhiều lựa chọn |
| 15 | Một input → nhiều output | Có |
| 16 | Auto thumbnail | Có |
| 17 | AI marketing background | Feature riêng (Phase 3) |
| 18 | Text overlay | User + AI + AI suggest/approve |
| 19 | Logo/brand | User toggle |
| 20 | Marketing style | Một/vài style ở V1, mở rộng sau |
| 21 | Video optimization | Tất cả capability, nhưng **chuyển sang Phase 2** |

### B. Video Scope — Phase 2 (chỉ tham khảo, chưa triển khai)

| # | Câu hỏi | Trả lời |
|---|---|---|
| 22 | Video input length | <10s, 10–30s, 30–60s |
| 23 | Video output | Giữ nguyên, 10–15s, 15–30s |
| 24 | Auto best moments | Phase 2 |
| 25 | AI approach | Hybrid — preserve product + generate environment |
| 26 | UX | Product Optimizer trước, Creative sau |
| 27 | Before/After | Có |
| 28 | Giữ original | Có, bắt buộc |
| 29 | Priority | Accuracy → Quality → Cost → Speed → Simplicity |
| 30 | Processing | Hybrid real-time + async |
| 31 | Product Photography vs Marketing Creative | Cả hai, tách feature; Product Optimizer trước |

### C. Product Identity

| # | Câu hỏi | Trả lời |
|---|---|---|
| 32 | Preservation level | Visual identity preservation |
| 33 | Nếu uncertain | **Giảm enhancement + warning + reject/giữ original** |
| 34 | Version history | Original + Final |
| 35 | Product lighting | Được phép sửa nhẹ (Light) |
| 36 | New shadow | Có thể thêm |
| 37 | Reflection/highlight | Được phép sửa nhẹ (Light) |
| 38 | Depth of field | User choose |
| 39 | Thêm surrounding objects | Chỉ ở Creative Engine (Phase 3), không ở V1 |

**Nguyên tắc rút ra:** `Product = Immutable Identity` / `Environment = Editable`.

### D. Background

| # | Câu hỏi | Trả lời |
|---|---|---|
| 40 | User prompt | Preset + Prompt tự do |
| 41 | Background preset | Có |
| 42 | AI tự chọn background | Phase 2 |

### E. Image Quality

| # | Câu hỏi | Trả lời |
|---|---|---|
| 43 | Resolution | Original hoặc 4K |
| 44 | Upscale | Chỉ khi low resolution (conditional) |
| 45 | Deblur | Chỉ khi recoverable (conditional) |
| 46 | Ảnh quá kém | Yêu cầu chụp lại + có thể tạo AI và **đánh dấu rõ** |
| 47 | Flower color | Rất quan trọng, phải trung thực |
| 48 | Color Guard | Có |

### F. User Control

| # | Câu hỏi | Trả lời |
|---|---|---|
| 49 | Enhancement level | Natural / Balanced / Premium |
| 50 | AI Auto | Có |
| 51 | Individual enhancement toggle | Có, nhưng UI V1 đơn giản hơn |

### G. Batch

| # | Câu hỏi | Trả lời |
|---|---|---|
| 52 | Multiple upload | 1 / 3 / 5 / 10 ảnh, mức phí khác nhau |
| 53 | Chọn ảnh tốt nhất | Có |
| 54 | Batch optimization | Phase 2 |

### H. Marketing

| # | Câu hỏi | Trả lời |
|---|---|---|
| 55 | Marketing card | Phase 2/3 |
| 56 | Text source | User + AI + AI suggest/approve |
| 57 | Brand template | Có |

### I. Video — Phase 2

| # | Câu hỏi | Trả lời |
|---|---|---|
| 58 | Original audio | User choose |
| 59 | Background music | Có |
| 60 | Subtitle | Có |
| 61 | Video ratios | 9:16 / 1:1 / 16:9 |
| 62 | Frame enhancement | AI decide |

### J. SaaS Performance

| # | Câu hỏi | Trả lời |
|---|---|---|
| 63 | Concurrent users | 100–500 |
| 64 | Processing time | 10–30s, tùy loại xử lý |
| 65 | Progress bar | Có |
| 66 | Continue using webapp | Có |

### K. Cost

| # | Câu hỏi | Trả lời |
|---|---|---|
| 67 | Model strategy | **Hybrid** (OSS + Commercial + ALG tương lai) |
| 68 | Image cost | ~$0.01–$0.20/ảnh |
| 69 | Video cost | ~$0.05–$5/video, tùy mức |

### L. Data / Privacy

| # | Câu hỏi | Trả lời |
|---|---|---|
| 70 | Train ALG bằng dữ liệu user | Mặc định có (default), nhưng cần policy/consent minh bạch |
| 71 | Xóa dữ liệu | Khi user yêu cầu |
| 72 | Metadata | Phải lưu đầy đủ |

### M. UX

| # | Câu hỏi | Trả lời |
|---|---|---|
| 73 | V1 UX | Upload → Choose Style → AI Optimize → Before/After → Download |

### Hệ quả trực tiếp đến kiến trúc (quan trọng — đọc kỹ)

- **Q8 + Q33 + Q39** → bắt buộc phải có **Product Identity Guard** như một module chặn cứng (hard gate), không phải tính năng tùy chọn. Đây là module quan trọng nhất của toàn hệ thống.
- **Q2 + Q21 + Q26 + Q31** → Phase 1 chỉ xử lý Image. Toàn bộ Video/Marketing Creative Engine (Phase 2, 3) không được code cùng lúc, kể cả khi có vẻ "tiện làm luôn".
- **Q67** → kiến trúc Provider/Adapter là bắt buộc ngay từ đầu (giống nguyên tắc đã áp dụng cho AI Vision module), không phải "nice to have".
- **Q46** → nếu AI phải tạo lại phần ảnh bằng generative fill (vì ảnh quá kém), output đó **phải được đánh dấu rõ ràng** (metadata + UI), không được trộn lẫn với ảnh chỉ enhancement thông thường.
- **Q70** → mặc định dùng dữ liệu để train, nhưng bắt buộc có cơ chế consent/policy — đây là yêu cầu tuân thủ, không phải chi tiết kỹ thuật tùy chọn.

---

## 1. Mục tiêu

Biến ảnh sản phẩm chụp bằng điện thoại (chất lượng không đồng đều) thành ảnh sản phẩm sạch, đẹp, chuyên nghiệp, phù hợp marketing/e-commerce — **nhưng không được thay đổi sản phẩm thật**.

```text
5 hoa hồng đỏ → AI enhancement → vẫn phải là 5 hoa hồng đỏ
Không được: 5→7 hoa, đỏ→hồng, bó nhỏ→bó lớn
```

**Nguyên tắc số 1 (bất khả xâm phạm):**
> Enhance the product, don't regenerate the product.

AI được phép cải thiện: ánh sáng, độ rõ, noise, white balance, background, composition, crop, resolution.
AI **không được phép**: tự ý thay đổi product identity (số lượng, màu sắc, hình dạng, kích thước tương đối).

**Thứ tự ưu tiên:** `Accuracy > Quality > Cost > Speed > Simplicity`

---

## 2. Quan hệ với module AI Vision đã có

Đây là điểm khác biệt quan trọng nhất so với module AI Vision (Component Detection/Counting) đã thiết kế trước đó — **hai module phục vụ mục đích khác nhau nhưng có thể chia sẻ hạ tầng**:

| | AI Vision (đã có) | Product Image Optimizer (mới) |
|---|---|---|
| Mục đích | Phân tích, đếm, gắn nhãn thành phần | Cải thiện chất lượng ảnh, giữ nguyên sản phẩm |
| Output | JSON: components, count, bbox, OCR | Ảnh đã tối ưu (Master Image + nhiều tỷ lệ) |
| Vị trí code | `workers/vision/` | `workers/media_ai/` |
| Primary detector | Florence-2 + SAM2 | Có thể **tái sử dụng** Product Detection từ Vision module (Stage 3) |
| Quan hệ | Độc lập | Có thể **tiêu thụ output** của Vision module làm input cho Product Detection, tránh xây lại từ đầu |

**Nguyên tắc tích hợp:** `media_ai/` được phép **gọi qua cổng `VisionAnalyzer`** của `vision/` để lấy Product Detection/Segmentation nếu có sẵn, nhưng **không được import trực tiếp code nội bộ** của `vision/`. Nếu `vision/` chưa sẵn sàng hoặc chưa đạt benchmark, `media_ai/` phải có Detector/Segmenter riêng của mình (qua Provider Adapter, mục 8) — không bị block bởi tiến độ của module Vision.

---

## 3. Kiến trúc tổng thể

```text
                    USER
                     │
                     ▼
                NEXT.JS APP
                     │
                     ▼
                 FASTAPI API
                     │
              Create Optimization Job
                     │
                     ▼
                  QUEUE
                     │
                     ▼
              IMAGE WORKER
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
   Quality       Product AI    Background
   Analyzer      (Detect/       Processor
                  Isolate)
       │             │             │
       └─────────────┼─────────────┘
                     ▼
                 Enhancer
                     │
                     ▼
               Composition
                     │
                     ▼
           PRODUCT IDENTITY GUARD  ◄── Hard Gate, bắt buộc (Q8, Q33)
                     │
              ┌──────┴──────┐
              ▼             ▼
            PASS          FAIL
              │             │
              ▼             ▼
        MASTER IMAGE    ORIGINAL + WARNING
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
    1:1      4:5      9:16 ...
     │        │        │
     └────────┼────────┘
              ▼
       SUPABASE STORAGE
              │
              ▼
          POSTGRESQL
              │
              ▼
           NEXT.JS
              │
              ▼
       BEFORE / AFTER → DOWNLOAD
```

**Nguyên tắc Master Image (quan trọng, tiết kiệm chi phí/thời gian):** Enhancement chỉ chạy **một lần** để tạo Master Image, sau đó dùng **Smart Reframe** để sinh các tỷ lệ (1:1, 4:5, 9:16, 16:9) — không chạy lại AI enhancement cho từng tỷ lệ.

```text
Original → ONE Optimization → MASTER PRODUCT IMAGE → Smart Reframe → [1:1, 4:5, 9:16, 16:9]
```

---

## 4. Pipeline chi tiết

### Stage 1 — Upload
```text
User → Upload → Supabase Storage → Create MediaAsset → Create OptimizationJob
```
Original **bắt buộc giữ nguyên, không overwrite** (Q28, Q34).

### Stage 2 — Quality Analyzer
Phân tích: resolution, blur, noise, exposure, white balance, color, perspective, composition, background, product visibility.

```json
{
  "resolution": { "width": 3024, "height": 4032 },
  "blur_score": 0.18,
  "noise_score": 0.42,
  "exposure_score": 0.61,
  "background_score": 0.25,
  "product_visibility": 0.94
}
```

### Stage 3 — Product Detection
Phát hiện product, product components, product boundary. **Tái sử dụng Product Vision Analysis (module AI Vision đã xây)** nếu có sẵn qua interface — xem mục 2.

### Stage 4 — Product Isolation
```text
Original → Product Detection → Segmentation → Product Mask
```

### Stage 5 — Enhancement (Conditional Pipeline)
Quality Analyzer quyết định bước nào cần chạy — **không chạy tất cả mọi bước cho mọi ảnh**:

```text
Nếu Blur=low, Noise=high, Exposure=low, Color=good, Resolution=good:
Denoise → Exposure → White Balance
(Bỏ qua upscale/deblur vì không cần)
```

Lợi ích: giảm cost, giảm thời gian xử lý, giảm GPU usage, giảm artifact không mong muốn.

### Stage 6 — Background
V1 hỗ trợ 3 chế độ: `KEEP`, `CLEAN`, `REPLACE`.
Preset: White, Light Gray, Warm, Dark, Transparent.
Generative background nâng cao → để dành cho Phase 3 (Creative Engine).

### Stage 7 — Composition
```text
Product Mask → Bounding Box → Center/Align → Crop → Aspect Ratio → [Master, 1:1, 4:5, 9:16, 16:9]
```

### 4.5. StudioEnhancer Decoupled Micro-Pipeline & 3-Variant Visual System (Nâng cấp V1.3, 2026-09-14)

Giải quyết trọn vẹn bài toán thực tế của cửa hàng hoa: Ảnh chụp điện thoại tại xưởng thường bị lẫn tem nhãn/hotline, ánh sáng không đồng đều, phông nền lộn xộn, độ phân giải nhỏ, và các tỷ lệ hiển thị mạng xã hội (Reels 9:16, Feed 1:1, Story) thường làm cắt xén cánh hoa.

#### A. Micro-Pipeline 4 bước của StudioEnhancer
1. **Localized Watermark / Stamp Eraser (`watermark_remover.py`):**
   - Tự động nhận diện tem nhãn góc tròn và số điện thoại / chữ ký đóng dấu trên giấy gói hoa bằng phân tích độ tương phản cục bộ (`cv2.subtract(bg_gray, img_gray)`).
   - **Saturation Gate chống bệt màu hoa:** Ràng buộc `img_hsv[:, :, 1] < 45` và diện tích thành phần liên thông $8 \le area \le 600\text{ px}$ để tuyệt đối không inpaint nhầm vào các cánh hoa đỏ đậm (đồng tiền), cam, vàng, tím.
2. **AI Matting & Background Debris Filter (`rembg_segmenter.py` + `studio_enhancer.py`):**
   - Bóc tách chủ thể bằng Rembg U2Net.
   - **Connected Components Analysis:** Quét các khối liên thông trên kênh Alpha; loại bỏ triệt để các đốm cánh hoa rơi vãi hoặc mảnh vụn hậu cảnh lơ lửng ($area < max\_area \times 0.035$), chỉ giữ khối chủ thể chính (bó hoa + tay cầm).
3. **Edge Defringing / Color Decontamination (`defringe.py`):**
   - Lan truyền màu sắc thuần khiết từ vùng đặc ($alpha \ge 248$) ra các pixel biên bán trong suốt ($0 < alpha < 248$) bằng giải thuật Inpainting Telea, triệt tiêu hoàn toàn quầng viền ám màu rèm/tường cũ.
4. **Studio Backdrop & Optical Compositing (`studio_backdrop.py`):**
   - **Alpha Feathering:** Làm mềm viền quang học Sub-pixel $1.1\text{ px}$ chống cảm giác viền sắc dao cạo (sticker effect).
   - **Arm Fadeout:** Chuyển mượt gradient $6\%$ ở mép đáy cẳng tay, loại bỏ vết cắt cụt cứng.
   - **2-Tier Contact Shadow:** Kết hợp bóng tiếp xúc sát chân gốc (Ambient Occlusion, blur $5\text{ px}$) và bóng mềm hướng sáng Top-Left sang góc dưới phải (Directional Soft Shadow, blur $28\text{ px}$).
   - **Optical Light Wrap:** Tán xạ quang học $4\text{ px}$ tràn nhẹ ánh sáng từ phông studio vào viền giấy gói và cánh hoa ngoài cùng.
   - **Lanczos HD Upscaling & 4:4:4 Chroma:** Ảnh gốc $< 1200\text{ px}$ được nội suy siêu phân giải Lanczos lên $1280\text{ px}$ kết hợp Unsharp Mask vi phẫu; nén JPEG $95\%$ với `subsampling=0` (4:4:4 Chroma) chống nhòe sắc cạnh.

#### B. Hệ thống 3 Phương án So sánh Trực quan Bằng Mắt
Nhân viên cắm hoa và quản lý có thể quan sát và so sánh trực quan 4 tab:
- **P.Án 1: Studio Cao Cấp (`studio`):** Phông Studio Ambiance thanh lịch (Warm Gray / Off-white), bóng đổ 2 tầng và tràn sáng viền hoa.
- **P.Án 2: Ảnh Mộc Chân Thực (`lifestyle` / `lifestyle_clean`):** Giữ $100\%$ rèm cửa và ánh sáng phòng gốc, xóa sạch $100\%$ tem nhãn chữ ký. Tự nhiên tuyệt đối.
- **P.Án 3: Không Gian AI Chiều Sâu (`bokeh` / `boutique_bokeh`):** Xóa phông tiệm hoa $f/1.8$ với đốm sáng bokeh ấm áp, ánh sáng xiên nghệ thuật.
- **Ảnh Gốc Chụp Xưởng (`original`):** Đối chứng trực tiếp trước/sau.

#### C. Multi-Variant Smart Reframe (Bảo toàn chủ thể đa tỷ lệ)
- Khắc phục triệt để lỗi cắt xén bó hoa khi đổi tỷ lệ: Sinh đồng thời 4 tỷ lệ chuẩn ($1:1$, $4:5$, $9:16$, $16:9$) cho **cả 3 phương án** (Studio, Ảnh Mộc, Bokeh).
- Sử dụng **Studio Ambiance Canvas Extension** với Alpha Feathering $32\text{ px}$ khi tỷ lệ đích lệch xa tỷ lệ gốc (như Reels $9:16$ hoặc Banner $16:9$), giữ trọn vẹn $100\%$ bó hoa, nơ và tay cầm ở trung tâm thị giác.
- API và tầng use-case cấp Signed URL `variant_ratio_urls` và UI component `BeforeAfterPreviewCard` tự động chuyển đổi ảnh chuẩn xác theo từng phương án và tỷ lệ.

---

## 5. Product Identity Guard (Module quan trọng nhất)

Đây là **hard gate bắt buộc** sau enhancement, trực tiếp thực thi Q8 và Q33.

```text
Original
   │
   ▼
Vision Analysis → Product Fingerprint
   │                     │
   ▼                     │
Optimizer → Enhanced ────┤
                          ▼
                   Vision Analysis (lại)
                          │
                          ▼
                       Compare
```

So sánh: identity, color, geometry, components, count, shape.

```json
{
  "identity_score": 0.96,
  "color_score": 0.98,
  "geometry_score": 0.95,
  "component_consistency": 0.97,
  "status": "PASS"
}
```

**Product Fingerprint nên tái sử dụng chính JSON Contract của module AI Vision** (component list, canonical_component, count) làm căn cứ so sánh trước/sau — đây là điểm liên kết trực tiếp giữa hai module (mục 2).

### Quality Gate — 4 trạng thái (Q33 = E)

| Trạng thái | Ý nghĩa | Hành động |
|---|---|---|
| `SAFE` | Không phát hiện thay đổi đáng kể | Trả Master Image |
| `GOOD` | Enhancement tốt | Trả Master Image |
| `WARNING` | Có khả năng thay đổi sản phẩm | Giảm enhancement, cảnh báo user, vẫn cho xem kết quả |
| `REJECTED` | Không đạt Product Identity | **Giữ Original**, báo user, không trả ảnh đã enhance |

```text
Output rejected → Keep Original → User warning
```

### 5.1. Review & Approve — cổng thứ hai, KHÁC với Identity Guard (bổ sung V1.1)

V2 mục 10 (Review & Approval) quy định: *"AI-generated outputs must not automatically become final business data."* Luồng UX ở Q73 (`Upload → Choose Style → AI Optimize → Before/After → Download`) dừng ở Download — **thiếu bước đưa ảnh vào dữ liệu nghiệp vụ**. Bổ sung như sau.

**Hai cổng khác nhau, rất dễ nhầm là một:**

| | **Product Identity Guard** (mục 5) | **Review & Approve** (mục này) |
|---|---|---|
| Bản chất | Cổng **an toàn kỹ thuật** — máy chấm | Cổng **nghiệp vụ** — người chấm |
| Câu hỏi | "AI có làm sai lệch sản phẩm thật không?" | "Ảnh này có được dùng làm ảnh chính thức của sản phẩm không?" |
| Kết quả | `result`: SAFE/GOOD/WARNING/REJECTED | `approval.state`: pending/approved/rejected |
| PASS nghĩa là | Được phép cho người dùng **xem** | Được phép **ghi vào Product Master** |
| Ai quyết | Hệ thống | Người có quyền `media.approve` |

**Guard PASS không thay thế được Approve. Tải ảnh về không phải là phê duyệt.**

```text
Upload → Choose Style → AI Optimize
              ↓
     PRODUCT IDENTITY GUARD        (cổng 1 — an toàn)
              ↓ PASS
     Before / After → Download     ← người dùng xem, tải về tuỳ ý
              ↓
        REVIEW & APPROVE           (cổng 2 — nghiệp vụ, cần quyền media.approve)
              ↓
   Master Image trở thành Asset chính thức của Product
              ↓
   M05 Landing Page · M06 Catalog · M04b Creative · M07 Social đọc được
```

**Yêu cầu bắt buộc:**
- Master Image ở trạng thái `approval.state = "pending"` cho tới khi được duyệt; chỉ khi `approved` nó mới trở thành `Asset` chính thức gắn `product_id`.
- Lưu `approved_by` + `approved_at` trên `OptimizationOutput`.
- **Quyền chạy job (`media.optimize`) tách khỏi quyền duyệt (`media.approve`)** — trong mô hình Chain, Sale chạy tối ưu ảnh nhưng Điều hành mới là người duyệt ảnh chính thức của sản phẩm (Mục 13).
- Ảnh có `result = "WARNING"` vẫn được phép duyệt, nhưng UI **phải hiện cảnh báo** trước khi người dùng bấm duyệt.
- Ảnh có `result = "REJECTED"` **không được phép** đưa vào luồng duyệt.

---

## 6. Interface / Provider Architecture (bắt buộc, giống nguyên tắc module Vision)

Không để business logic phụ thuộc trực tiếp vào model cụ thể. Toàn bộ model/API phải nằm sau interface:

```python
from abc import ABC, abstractmethod

class ImageEnhancer(ABC):
    @abstractmethod
    def enhance(self, image: bytes, config: dict) -> bytes: ...

class Segmenter(ABC):
    @abstractmethod
    def segment(self, image: bytes) -> dict:
        """Trả về product mask."""
        ...

class BackgroundProcessor(ABC):
    @abstractmethod
    def process(self, image: bytes, mask: dict, config: dict) -> bytes: ...

class Upscaler(ABC):
    @abstractmethod
    def upscale(self, image: bytes, target_resolution: tuple) -> bytes: ...

class IdentityVerifier(ABC):
    @abstractmethod
    def compare(self, original_fingerprint: dict, enhanced_image: bytes) -> dict:
        """Trả về identity_score, color_score, geometry_score, component_consistency, status."""
        ...
```

**Provider cụ thể (đặt trong `providers/`):**

| Capability | Ví dụ Provider (chọn theo Technology Selection Matrix — mục 16) |
|---|---|
| Enhancement | `RealESRGANProvider`, `CommercialEnhancerProvider`, `FutureALGProvider` |
| Segmentation | Tái sử dụng SAM2 provider từ module Vision, hoặc provider riêng nếu cần khác biệt |
| Background | `OpenSourceBackgroundProvider`, `CommercialBackgroundProvider` |
| Upscale | `RealESRGANProvider` hoặc provider commercial riêng |
| Identity Verification | Dùng lại Vision Analysis của module M01 làm nền cho fingerprint — **chỉ qua provider đã đăng ký trong registry của M01** |

**Lợi ích (theo Q67 = Hybrid):**
```text
OSS Model → thay bằng → Commercial API → thay bằng → ALG Custom Model
```
mà không phải viết lại Product Optimizer.

> **Ràng buộc V1.2 — Identity Guard phải dùng CÙNG MỘT provider và CÙNG MỘT model version cho cả hai lần phân tích của một job**, ghi vào metadata asset (V2 mục 8). Fingerprint trước và sau enhancement tính bằng hai model khác nhau thì điểm so sánh mất ý nghĩa — đây mới là luật thật, và nó đúng với mọi provider. *(Bản V1.1 phát biểu luật này dưới dạng "không dùng GPT-4o mini, vì M01 quy tắc 4 chốt Florence-2 + SAM2". Quyết định D5-c ngày 09/09 (V2 mục 17.1) đã bỏ ràng buộc chốt cứng provider: cổng đặt ở mức Hợp đồng JSON, provider chọn bằng số đo trên bộ ảnh vàng. Guard **chỉ** được dùng provider đã đăng ký sau cổng `VisionAnalyzer` của M01.)*

---

## 7. Job Architecture & States

**Không** inference trực tiếp trong HTTP request:

```text
POST /optimization-jobs → job_id → Queue → Worker → AI → Storage → DB
Frontend: job_id → Progress → Result
```

**Job states — chuẩn hoá theo V2 mục 7 (Job) (cập nhật V1.1).** Ba trục **tách rời**, không gộp thành một enum, vì màn hình theo dõi job toàn hệ thống, logic retry và bộ tính usage chỉ đọc `status`:

```text
status   ← CHUẨN HỆ THỐNG, giống hệt ở mọi module
    PENDING → PROCESSING → COMPLETED / FAILED / CANCELLED

stage    ← CHI TIẾT RIÊNG M04a, chỉ để hiển thị tiến độ
    ANALYZING | DETECTING | ISOLATING | ENHANCING
  | BACKGROUND | COMPOSING | VERIFYING | GENERATING_OUTPUTS

result   ← PHÁN QUYẾT NGHIỆP VỤ của Product Identity Guard
    SAFE | GOOD | WARNING | REJECTED
```

**Ánh xạ từ tập trạng thái bản gốc:**

| Bản gốc | status | stage | result |
|---|---|---|---|
| `QUEUED` | `PENDING` | — | — |
| `ANALYZING` … `GENERATING_OUTPUTS` | `PROCESSING` | tên trạng thái tương ứng | — |
| `COMPLETED` | `COMPLETED` | — | `SAFE` hoặc `GOOD` |
| `WARNING` | `COMPLETED` | — | `WARNING` |
| `REJECTED` | `COMPLETED` | — | `REJECTED` |
| `FAILED` | `FAILED` | — | — |
| *(mới, bắt buộc bổ sung)* | `CANCELLED` | — | — |

**Điểm cực kỳ dễ sai — `REJECTED` KHÔNG phải job lỗi.** Khi Identity Guard từ chối, job đã chạy đúng và ra được phán quyết: `status = COMPLETED`, `result = REJECTED`. Nếu gộp vào `FAILED` thì logic retry sẽ chạy lại vô ích (chạy lại vẫn REJECTED, chỉ tốn GPU) và số liệu usage/billing sẽ sai. `FAILED` chỉ dành cho lỗi kỹ thuật: timeout, crash, provider trả lỗi.

**`CANCELLED` bắt buộc phải có:** người dùng huỷ được job còn ở `PENDING` — đây là yêu cầu của SaaS, bản gốc chưa có.

Frontend hiển thị dạng checklist tiến độ dựa trên `stage` (Analyzing ✓ / Detecting ✓ / Optimizing ● / Checking quality ○ ...), còn trạng thái tổng thể đọc từ `status`.

---

## 8. JSON / Data Contract

### Optimization Result Contract (bất biến sau khi freeze)

> **Cập nhật V1.1 — các field mới đều là bổ sung (additive), không đổi/xoá field cũ**, đúng nguyên tắc "chỉ thêm field". *(Chỗ dựa cũ là Mục 18 tài liệu V1; V2 đã **bãi bỏ** mục đó — chỗ dựa mới là V2 mục 1.2 luật 1 và mục 8 "asset gốc bất biến".)*

```json
{
  "job_id": "OPT-001",
  "organization_id": "ORG-001",
  "media_asset_id": "IMG-001",
  "product_id": null,
  "status": "completed",
  "stage": null,
  "result": "SAFE",
  "provider_used": {
    "enhancer": "realesrgan_v1",
    "segmenter": "sam2_shared_vision_v1",
    "background": "commercial_bg_v1"
  },
  "quality_analysis": {
    "resolution": { "width": 3024, "height": 4032 },
    "blur_score": 0.18,
    "noise_score": 0.42,
    "exposure_score": 0.61,
    "background_score": 0.25,
    "product_visibility": 0.94
  },
  "identity_guard": {
    "identity_score": 0.96,
    "color_score": 0.98,
    "geometry_score": 0.95,
    "component_consistency": 0.97,
    "status": "PASS"
  },
  "outputs": {
    "master": "media/{user_id}/{asset_id}/optimized/master.jpg",
    "ratios": {
      "1x1": "...", "4x5": "...", "9x16": "...", "16x9": "..."
    },
    "thumbnail": "..."
  },
  "approval": {
    "state": "pending",
    "approved_by": null,
    "approved_at": null
  },
  "flags": {
    "generative_fill_used": false,
    "requires_reshoot_warning": false
  }
}
```

`flags.generative_fill_used = true` là **bắt buộc** khi ảnh quá kém phải dùng AI tạo lại một phần (Q46) — không được để mặc định `false` một cách âm thầm.

**Giải thích các field bổ sung ở V1.1:**

| Field | Ý nghĩa |
|---|---|
| `organization_id` | Tenant sở hữu job. Bắt buộc, giải từ phía server (Mục 14) |
| `product_id` | Sản phẩm trong Product Master mà ảnh này thuộc về; `null` trong Experience mode |
| `stage` | Bước đang chạy, chỉ có giá trị khi `status = "processing"` |
| `result` | Phán quyết Identity Guard: `SAFE`/`GOOD`/`WARNING`/`REJECTED`. **Độc lập với `status`** |
| `approval` | Trạng thái duyệt nghiệp vụ (mục 5.1) — khác hoàn toàn với `result` của Guard |

---

## 9. Database Schema (Prisma — mô hình đề xuất)

> **Cập nhật V1.1 — bắt buộc theo V2 mục 4 và mục 5:** mọi bản ghi thuộc tenant phải gắn `organization_id`. Đây không phải tuỳ chọn và không có ngoại lệ, kể cả demo workspace. Đồng thời, hai bảng của bản gốc được **gộp vào thực thể dùng chung của hệ thống** thay vì duy trì bảng song song.

```text
MediaAsset
────────────
id, organization_id, user_id, product_id (nullable), original_path,
mime_type, width, height, created_at, deleted_at
       ▲                ▲
       │                └── nullable vì Experience mode có thể chưa có sản phẩm thật
       └── BẮT BUỘC, có index. Mọi truy vấn lọc theo trường này.

OptimizationJob
───────────────
id, organization_id, media_asset_id, product_id (nullable),
status, stage, result,              ← ba trục tách rời, xem mục 7
preset, provider, pipeline_version,
started_at, completed_at, error

OptimizationOutput
──────────────────
id, organization_id, job_id, type, path, width, height, format,
quality_score, identity_score, status,
approved_by (nullable), approved_at (nullable)    ← xem mục 5.1 Review & Approve
```

**Hai bảng của bản gốc được gộp vào thực thể hệ thống:**

| Bảng bản gốc | Thay bằng | Lý do |
|---|---|---|
| `OptimizationVersion` (original\|final, Q34) | **`assets.version`** (V2 mục 8 (Asset)) | Hệ thống đã có sẵn cơ chế version cho Asset. Duy trì bảng version thứ hai làm hai module cùng lưu lịch sử ảnh theo hai cách khác nhau, và M05/M06/M07 sẽ không đọc được. Yêu cầu Q34 (giữ Original + Final) được đáp ứng đầy đủ bằng `assets.version`. |
| `OptimizationUsage` (Q52, Q68) | **`Usage`** dùng chung (Mục 12), `feature = "media.optimize"` | Mục 12 quy định một bảng usage duy nhất cho toàn hệ thống: `organization_id, user_id, feature, job_id, quantity, status, created_at`. `credits_used` và `package_type` trở thành cột phụ/metadata trên bản ghi này, không phải bảng riêng. Nếu tách bảng thì không tính được hạn mức trial và không xuất được hoá đơn hợp nhất. |

**Master Image và các tỷ lệ được lưu như `Asset`** (Mục 15), với `assets.product_id` trỏ về Product Master và metadata bắt buộc theo V2 mục 8 (khối metadata bắt buộc) — đây là điểm nối để M05 (Landing Page), M06 (Catalog) bên `LocalBudd` và M04b/M07 bên `SocialFlow` lấy được ảnh. Nếu output chỉ nằm trong bảng riêng của module thì ảnh tối ưu xong sẽ là file mồ côi, không thuộc sản phẩm nào.

---

## 10. Storage Layout (Supabase)

> **Cập nhật V1.1 — V2 mục 5 (cách ly tenant):** *"Storage paths must be tenant-scoped."* Đường dẫn phải theo **tổ chức**, không theo người dùng.

```text
media/
  {organization_id}/             ← tenant scope, KHÔNG phải user_id
    {asset_id}/
      original/
        original.jpg              ← immutable, không overwrite
      optimized/
        master.jpg
        1x1.jpg
        4x5.jpg
        9x16.jpg
        16x9.jpg
      metadata/
        optimization.json
```

`user_id` vẫn được lưu **như một cột dữ liệu** (ai là người upload), nhưng không làm thành phần đường dẫn: người dùng có thể đổi vai trò, rời tổ chức hoặc bị xoá, còn quyền sở hữu dữ liệu thuộc về tổ chức. Dùng `user_id` làm path sẽ khiến ảnh của một tổ chức nằm rải rác theo từng nhân viên, và không thể áp policy truy cập ở cấp thư mục theo tenant.

---

## 11. Metadata bắt buộc lưu (Q72)

Phải lưu đầy đủ cho mỗi job: original reference, model + model version, pipeline version, parameters, prompt (nếu có), timestamp, input hash, output hash, quality score, identity score.

Lý do: debugging, reproducibility, billing, support, model comparison, tích lũy training data (mục 13).

---

## 12. Cấu trúc thư mục chuẩn

Cấu trúc dưới đây là của **M04a — Product Image Optimization, trong repo `floraos-core`** (xem mục A). Phần M04b (Marketing Creative, Phase 3) nằm ở repo `SocialFlow` và **không** dùng cấu trúc này.

```text
floraos-core/                     # repo mới (V2 mục 2)
│
├── src/                          # Next.js / TypeScript — core web + API /api/v1
├── prisma/                       # lược đồ dùng chung; models mục 9 đều có organization_id
│
└── workers/                      # Python — V2 mục 3.1
    ├── vision/                           # M01 — adapter sau cổng VisionAnalyzer
    │
    └── media_ai/                         # M04a — Product Image Optimizer
            │
            ├── analyzer/
            │   ├── image_quality.py
            │   ├── product_quality.py
            │   └── image_diagnostics.py
            │
            ├── image/
            │   ├── pipeline.py
            │   ├── enhancer.py
            │   ├── segmentation.py
            │   ├── background.py
            │   ├── composition.py
            │   ├── crop.py
            │   └── reframe.py
            │
            ├── guard/
            │   ├── identity.py            # Product Identity Guard — hard gate
            │   ├── color.py
            │   ├── geometry.py
            │   └── quality.py
            │
            ├── providers/
            │   ├── segmentation/
            │   ├── enhancement/
            │   ├── upscale/
            │   ├── background/
            │   └── vision_bridge/         # cầu nối gọi qua interface của vision/ (không import trực tiếp)
            │
            ├── jobs/
            │   ├── queue.py
            │   ├── worker.py
            │   └── states.py
            │
            └── schemas/
                ├── media.py
                ├── optimization.py
                └── result.py
```

---

## 13. Chiến lược Model & Training Data

**Q67 = Hybrid:**
```text
IMAGE OPTIMIZER → Provider API → [OSS | Commercial | ALG (tương lai)]
```

**Tier hóa theo chi phí (Q68):**
```text
STANDARD  → OSS / low GPU cost
PREMIUM   → better model
CREATIVE  → generative / expensive (chỉ khi thực sự cần, vd Q46)
```
Không dùng model đắt cho mọi ảnh mặc định.

**Training Data (Q70):**
```text
Production Assets → Training Dataset
```
Training record lưu: **`organization_id`**, Original, AI Output, User Correction (nếu có), Final Approved, Model Version, Pipeline Version.
**AI prediction và human correction phải lưu riêng** — nguyên tắc xuyên suốt giống module AI Vision, phục vụ mục tiêu dài hạn xây ALG Custom Vision/Image Model. Việc dùng dữ liệu để train mặc định bật (default C) **nhưng bắt buộc có cơ chế consent/policy minh bạch** trước khi go-live.

> **Cập nhật V1.1 — consent phải ở cấp TỔ CHỨC, không phải cấp người dùng.** Trong mô hình SaaS đa tổ chức, người upload ảnh không phải là bên có thẩm quyền quyết định dữ liệu của doanh nghiệp mình có được dùng để huấn luyện hay không. Yêu cầu bắt buộc:
>
> - Cờ consent lưu trên **`Organization`**, do Admin/Điều hành của tổ chức đó bật/tắt — không phải trên `User`.
> - Mỗi training record lưu `organization_id`, để khi tổ chức yêu cầu xoá dữ liệu (Q71) còn **truy vết và gỡ ra được** khỏi tập huấn luyện.
> - V2 mục 5 (cách ly tenant): *"Users cannot access another organization's assets."* Dùng ảnh của tổ chức A để huấn luyện model phục vụ tổ chức B là vùng xám cần chính sách rõ ràng bằng văn bản, đặc biệt với khách hàng B2B doanh nghiệp — nhóm khách hàng nhạy cảm nhất về vấn đề này.
> - **Quyết định cần product owner chốt:** consent mặc định **BẬT** (theo Q70) hay **TẮT** cho khách B2B? Q70 nói mặc định bật; với hợp đồng doanh nghiệp thì mặc định tắt an toàn hơn về mặt pháp lý.

---

## 14. Roadmap theo Giai đoạn (cho Coding Agent)

Toàn bộ phạm vi được giữ **đầy đủ, không cắt** — chỉ nhóm lại theo 2 giai đoạn thực thi lớn dựa trên loại input (Hình ảnh trước, Video sau), thay vì liệt kê rời rạc từng Phase như bản gốc.

```text
┌─────────────────────────────────────────────┐
│ GIAI ĐOẠN 1 — HÌNH ẢNH (Image)               │
│   Phase 1A → 1B → 1C → 1D → 1E (đầy đủ)      │
│   Bao gồm cả Batch + Training Data pipeline   │
└─────────────────────────────────────────────┘
                     │
                     ▼ (chỉ khi đạt Acceptance Criteria mục 15)
┌─────────────────────────────────────────────┐
│ GIAI ĐOẠN 2 — VIDEO                          │
│   Phase 2 (theo Bảng B, mục 0.1)             │
└─────────────────────────────────────────────┘
                     │
                     ▼ (chỉ khi cả 2 giai đoạn trên ổn định)
┌─────────────────────────────────────────────┐
│ MỞ RỘNG — Marketing Creative Engine          │
│   Phase 3, dùng Master Image làm input        │
└─────────────────────────────────────────────┘
```

Quy tắc chặn cứng (giữ nguyên từ bản gốc): **không nhảy giai đoạn**, không bắt đầu Giai đoạn 2 (Video) khi Giai đoạn 1 (Hình ảnh) chưa qua Acceptance Criteria mục 15; không bắt đầu phần Mở rộng khi Giai đoạn 1 và 2 chưa ổn định.

### 14.0. Ánh xạ Phase module ↔ Phase hệ thống (bổ sung V1.1 — BẮT BUỘC ĐỌC TRƯỚC KHI CODE)

Phase 1A–1E ở trên là **trục module**. Kiến trúc V2 có **trục hệ thống** riêng (mục 15, P0–P12). Task phải hợp lệ trên **cả hai trục**.

| Phase module M04 | Điều kiện tiên quyết ở `floraos-core` (V2 mục 15) | Repo |
|---|---|---|
| **Phase 1A** — Foundation (upload, schema, queue skeleton) | **P1 (Organization · Workspace · Membership · Branch · cách ly tenant) + P2 (RBAC) đã đạt Acceptance** | `floraos-core` |
| **Phase 1B** — Optimization Core | P1+P2 xong + **P3 (Asset · GenerationJob · Usage) + P4 (BusinessProfile) đã đạt Acceptance** | `floraos-core` |
| **Phase 1C** — Product Identity Guard | P3 xong + **P5 (M01) đã cung cấp JSON Contract ổn định qua cổng `VisionAnalyzer`** | `floraos-core` |
| **Phase 1D** — Output + Before/After UI | Phase 1C xong | `floraos-core` |
| **Phase 1E** — Batch + Credits/Usage | **P3** — Usage đi cùng GenerationJob, không còn là pha riêng ở cuối như bản V1 | `floraos-core` |
| **Giai đoạn 2** — Video | Giai đoạn 1 đạt Acceptance mục 15 | `floraos-core` |
| **Phase 3** — Marketing Creative Engine (M04b) | **P7 (Integration Layer)** + Giai đoạn 1 ổn định | **`SocialFlow`** |

> **Đổi so với V1.1:** bản cũ ánh xạ vào Phase 1/2/6/7 của tài liệu V1. V2 đánh số lại thành P0–P12; Usage gộp vào P3, Integration thành P7. Toàn bộ M04a nằm trong **P9** của lộ trình hệ thống, chạy song song được với P7 và P8.

> **Cảnh báo thứ tự — đây là lỗi tốn kém nhất nếu làm sai.** Phase 1A của bản gốc bắt đầu bằng *"Upload flow + `MediaAsset`, `OptimizationJob` schema"*. Nếu chạy trước khi P1 và P2 xong, agent sẽ sinh ra đúng bộ schema **không có `organization_id`** — rồi phải migration lại 3 bảng và đổi toàn bộ cấu trúc thư mục storage khi đã có dữ liệu thật. *(Bản V1.1 viện dẫn Mục 18 Current Code Preservation ở đây; V2 đã bãi bỏ mục đó. Chỗ dựa mới: V2 mục 1.2 luật 1 và mục 5.)*

---

### GIAI ĐOẠN 1 — HÌNH ẢNH (đầy đủ, Phase 1A → 1E)

### Phase 1A — Foundation
- [ ] Upload flow, Supabase Storage layout (mục 10).
- [ ] `MediaAsset`, `OptimizationJob` schema (Prisma).
- [ ] Job Queue + Worker skeleton (chưa cần AI thật).

**Acceptance:** Upload ảnh → tạo Job → Job chạy qua Queue → trạng thái cập nhật đúng theo mục 7, chưa cần xử lý ảnh thật.

### Phase 1B — Image Optimization Core
- [ ] Quality Analyzer (Stage 2).
- [ ] Product Detection — ưu tiên gọi qua `vision_bridge/` để tái sử dụng module Vision đã có; nếu chưa sẵn sàng, dùng Provider riêng tạm thời (không block tiến độ).
- [ ] Segmentation / Product Isolation (Stage 4).
- [ ] Background Cleanup (Stage 6 — KEEP/CLEAN/REPLACE + preset).
- [ ] Enhancement theo Conditional Pipeline (Stage 5) — chỉ chạy bước cần thiết theo Quality Analyzer.
- [ ] Composition + Master Image + Smart Reframe (mục 3, 4 Stage 7).

**Acceptance:** Từ 1 ảnh input → sinh được Master Image + các tỷ lệ, enhancement chỉ chạy một lần (không lặp lại theo từng ratio).

### Phase 1C — Safety (Product Identity Guard)
- [ ] Product Fingerprint (dựa trên Vision Analysis/JSON Contract của module Vision).
- [ ] Identity/Color/Geometry Guard (mục 5).
- [ ] Quality Gate 4 trạng thái: SAFE/GOOD/WARNING/REJECTED.
- [ ] Khi REJECTED → giữ Original, báo warning, không trả ảnh enhance.

**Acceptance:** Guard chặn được ít nhất một trường hợp test giả lập thay đổi sản phẩm (đổi màu/đổi số lượng) → trạng thái REJECTED, Original được giữ nguyên.

### Phase 1D — Output
- [ ] Master Image, 1:1, 4:5, 9:16, 16:9, Thumbnail.
- [ ] Before/After UI (mục 17 gốc — không xây editor phức tạp).
- [ ] Download.

**Acceptance:** UI chạy đúng luồng Upload → Choose Style → Processing (progress) → Before/After → Download, không có bước editor thủ công.

### Phase 1E — Business
- [ ] Batch upload (1/3/5/10 gói, theo mục 18 gốc — `OptimizationJob` chứa nhiều Asset, không viết logic riêng từng gói).
- [ ] Credits/Usage tracking (`OptimizationUsage`).
- [ ] Auto Best Image (nếu nhiều ảnh cùng sản phẩm — mục 19 gốc, tiêu chí: sharpness, exposure, product visibility, occlusion, composition, product confidence).

**Acceptance:** Người dùng upload gói nhiều ảnh → hệ thống tính đúng credit, xử lý qua cùng kiến trúc OptimizationJob, không có code path riêng biệt cho từng gói.

---

### GIAI ĐOẠN 2 — VIDEO (Phase 2, đầy đủ khi tới lượt triển khai)

Không bắt đầu cho đến khi Giai đoạn 1 (Hình ảnh) hoàn thành đầy đủ Acceptance Criteria (mục 15). Khi bắt đầu, tham chiếu **Bảng B (mục 0.1)** làm decision record — toàn bộ 10 câu hỏi Q22–Q31 đã có sẵn quyết định, không cần hỏi lại product owner trừ khi phát sinh case mới ngoài bảng.

Phạm vi Giai đoạn 2 (tóm tắt từ Bảng B, chi tiết đầy đủ ở mục 0.1):
- Input: video <10s / 10–30s / 30–60s; giữ nguyên độ dài hoặc rút gọn 10–15s / 15–30s.
- Cách tiếp cận: Hybrid — preserve product (giữ nguyên nguyên tắc Product Identity Guard áp dụng cho video) + generate environment.
- UX: Product Optimizer (ảnh) làm trước, Creative sau; Before/After bắt buộc; giữ original bắt buộc.
- Xử lý: Hybrid real-time + async; ưu tiên Accuracy → Quality → Cost → Speed → Simplicity (giống hệt nguyên tắc Giai đoạn 1).
- Audio: user chọn giữ âm thanh gốc hay không; hỗ trợ nhạc nền, subtitle.
- Output ratio: 9:16 / 1:1 / 16:9; frame enhancement do AI quyết định bước nào cần chạy (tương tự Conditional Pipeline ở Giai đoạn 1).

**Điểm kiến trúc cần làm rõ trước khi code Giai đoạn 2** (chưa có trong bản gốc, cần xác nhận khi tới thời điểm triển khai): Product Identity Guard cho video sẽ chạy theo frame hay theo sample định kỳ; pipeline video có tái sử dụng Job Architecture (mục 7) hay cần state machine riêng; Master Image + Smart Reframe có tương đương "Master Video" hay không.

### MỞ RỘNG — Marketing Creative Engine (Phase 3, chưa triển khai — chỉ tham khảo)
Input: Master Product Image (output trực tiếp của Giai đoạn 1). Không bắt đầu trước khi Giai đoạn 1 và Giai đoạn 2 ổn định.

---

## 15. Acceptance Criteria tổng thể V1

**Input**
- Upload ảnh điện thoại, hỗ trợ JPG/PNG/WebP.
- Original được lưu immutable.

**Optimization**
- Quality Analyzer, Product Detection, Product Isolation, Background Cleanup.
- Exposure correction, White Balance, Light enhancement, Noise reduction.
- Conditional upscale, Conditional deblur.
- Auto composition, user chọn aspect ratio.

**Product Safety**
- Product Identity Guard hoạt động như hard gate.
- Color Guard, Quality score.
- Warning và Reject hoạt động đúng khi cần.
- Original luôn được giữ, không bao giờ bị mất/ghi đè.

**Output**
- Master Image, nhiều tỷ lệ, Thumbnail, Before/After, Download.

**SaaS**
- Async job, Queue, Progress bar.
- User có thể tiếp tục dùng webapp trong lúc chờ xử lý.
- Usage tracking, kiến trúc gói 1/3/5/10 dùng chung `OptimizationJob`.

---

## 16. Bước tiếp theo bắt buộc trước khi code (Technology Selection Matrix)

Trước khi chọn repo/model cụ thể, phải hoàn thành ma trận lựa chọn công nghệ cho từng capability:

| Capability | OSS candidate | Commercial fallback | License | GPU requirement | Benchmark | **Tenant-isolation review** | Production-ready |
|---|---|---|---|---|---|---|---|
| Background removal | ? | ? | ? | ? | ? | ? | ? |
| Segmentation | (tái sử dụng SAM2 từ Vision module) | ? | ? | ? | ? | ? | ? |
| Enhancement | RealESRGAN? | ? | ? | ? | ? | ? | ? |
| Upscaling | ? | ? | ? | ? | ? | ? | ? |
| Deblur | ? | ? | ? | ? | ? | ? | ? |
| Quality Assessment | ? | ? | ? | ? | ? | ? | ? |
| Color Preservation | ? | ? | ? | ? | ? | ? | ? |
| Identity Verification | (tái sử dụng Vision Analysis của M01) | ? | ? | ? | ? | ? | ? |

**Cột `Tenant-isolation review` là bắt buộc (bổ sung V1.1, theo V2 mục 13.1).** Provider chạy trên worker và GPU dùng chung giữa các tổ chức, nên mỗi ứng viên phải được đánh giá: dữ liệu của tổ chức A có thể rò sang job của tổ chức B qua cache còn nóng, session lưu trạng thái, lịch sử prompt, hay chế độ mặc định dùng dữ liệu để huấn luyện phía nhà cung cấp hay không. Với provider thương mại, phải kiểm tra điều khoản data-retention và data-training của họ trước khi duyệt.

**Đây là bước bắt buộc phải hoàn thành và được product owner xác nhận trước khi Coding Agent bắt đầu Phase 1B** — không tự ý chọn model khi ma trận này còn trống.

---

## 17. Rủi ro chính

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| AI vô tình thay đổi product identity (số lượng, màu, hình dạng) | Critical | Product Identity Guard là hard gate bắt buộc, không tùy chọn |
| Generative fill dùng khi ảnh quá kém nhưng không đánh dấu rõ | High | Bắt buộc field `flags.generative_fill_used` trong JSON Contract |
| Enhancement chạy lặp lại cho từng aspect ratio, tốn cost/GPU | Medium | Kiến trúc Master Image + Smart Reframe (mục 3) |
| Model/provider ngừng hỗ trợ | Medium | Provider/Adapter Interface (mục 6), giống nguyên tắc module Vision |
| Trộn lẫn code với module AI Vision hoặc vision_legacy | High | Namespace riêng `workers/media_ai/`, chỉ gọi qua cổng `VisionAnalyzer`, không import chéo |
| Nhảy sang Phase 2/3 khi Phase 1 chưa ổn định | Medium | Chặn cứng theo thứ tự Phase ở mục 14 |
| Dữ liệu dùng train mà chưa có consent rõ ràng | High | Bắt buộc cơ chế policy/consent trước go-live (Q70) |
| Batch package viết logic riêng từng gói, khó bảo trì | Low | Dùng chung kiến trúc `OptimizationJob` chứa nhiều Asset |

---

## 18. Next Actions

0. **Xác nhận ALG Phase 1 (SaaS Foundation) đã đạt Acceptance** — có `Organization`, `Membership`, RBAC và tenant isolation chạy được. Đây là điều kiện chặn: không tạo bảng/route thật của M04 trước mốc này (mục 14.0).
1. Hoàn thành **Technology Selection Matrix** (mục 16), **bao gồm cột Tenant-isolation review** — bắt buộc trước, chưa code.
2. Freeze JSON/Data Contract (mục 8) và Database Schema (mục 9) — bản đã có `organization_id`, `product_id`, `stage`, `result`, `approval`.
3. Dựng skeleton thư mục `media_ai/` theo mục 12, trong repo `FloraOS`.
4. Xây `vision_bridge/` để xác nhận khả năng tái sử dụng Product Detection từ module Vision (không import trực tiếp).
5. Triển khai Phase 1A → 1B → 1C → 1D → 1E theo đúng thứ tự, qua Acceptance Criteria từng Phase trước khi sang Phase kế tiếp, và thoả điều kiện tiên quyết hệ thống ở mục 14.0.
6. Thiết kế cơ chế consent/policy **cấp Organization** cho Q70 song song với Phase 1A (không chặn tiến độ kỹ thuật, nhưng phải sẵn sàng trước go-live).
7. Thống nhất hợp đồng bàn giao **Master Image → `SocialFlow`** (M04b) trước khi tới Phase 3: Asset nào, đọc qua API nào, ai chịu trách nhiệm ratio nào.

---

# PHẦN II — HƯỚNG DẪN THỰC THI CHO AI CODING AGENT (đồng bộ với Phần I)

> Toàn bộ mục dưới đây **không lặp lại nội dung kỹ thuật của Phần I** — chỉ nói agent phải đọc mục nào, kiểm tra gì, và khi nào phải dừng lại hỏi. Đây là lớp "quy trình", Phần I là lớp "sự thật kỹ thuật".

## II.0. Nguyên tắc tổng quát

> **Phần I là nguồn sự thật duy nhất.** Bảng 73 câu hỏi (mục 0.1) là căn cứ quyết định cuối cùng khi có mâu thuẫn.
> Agent không được tự diễn giải lại nguyên tắc "Enhance the product, don't regenerate the product" để "cho tiện code".

Toàn bộ code mới nằm trong `workers/media_ai/` (mục 12), tách biệt với `workers/vision/`.

## II.1. Trước khi bắt đầu bất kỳ task nào

**Bước 1 — Đọc đúng phần liên quan:** luôn đọc mục 0 + 0.1; cộng thêm mục tương ứng phần sắp code (sửa Guard → mục 5; sửa Provider → mục 6; sửa Job → mục 7).

**Bước 2 — Xác định Phase hiện tại:** đối chiếu mục 14. Task phải khớp đúng Phase đang chạy. Tuyệt đối không động vào Phase 2/3 trừ khi Phase 1 đã qua Acceptance Criteria (mục 15) và người dùng xác nhận tường minh. Task có vẻ thuộc Phase 2/3 ("thêm nhạc nền", "tạo marketing card") mà Phase 1 chưa xong → dừng lại, báo người dùng.

**Bước 3 — Kiểm tra vùng cấm:**
- File nằm trong `vision/` hoặc `vision_legacy/`? → không sửa trực tiếp, chỉ qua `vision_bridge/`.
- Thay đổi có làm `original.jpg` bị ghi đè/mất? → tuyệt đối cấm (mục 10).
- Thay đổi có bỏ qua/làm suy yếu Product Identity Guard? → tuyệt đối cấm (mục 5).
- Technology Selection Matrix (mục 16) đã điền + được xác nhận cho capability đang đụng tới chưa? → chưa thì dừng, hỏi trước.
- **Thay đổi có tạo bảng, route, job hoặc đường dẫn storage mới mà KHÔNG có `organization_id`?** → **dừng lại** (Mục 4, 14 Kiến trúc ALG). Không có ngoại lệ, kể cả bảng tạm.
- **Thay đổi có tạo bảng usage/credit riêng cho M04?** → **dừng lại**. Dùng chung bảng `Usage` với `feature = "media.optimize"` (mục 9, Mục 12).
- **Thay đổi có ghi Master Image thẳng vào Product Master mà bỏ qua bước Approve?** → **dừng lại** (mục 5.1, V2 mục 10 (Review & Approval)).
- **Task đang làm có thuộc M04b (Marketing Creative: text overlay, logo, brand template, marketing background)?** → **dừng lại**: phần đó nằm ở repo `SocialFlow`, không phải repo này (mục A).

## II.2. Checklist đồng bộ theo loại thay đổi

| Loại thay đổi | File/thư mục | Đọc mục nào (Phần I) | Điểm bắt buộc kiểm tra |
|---|---|---|---|
| Product Identity Guard | `media_ai/guard/*.py` | Mục 5 | Guard chạy sau enhancement, trước khi trả Master Image, không có đường tắt; đúng 4 trạng thái SAFE/GOOD/WARNING/REJECTED; REJECTED → trả Original + flag warning; so đủ 4 tiêu chí identity/color/geometry/component; dùng `vision_bridge/` cho Product Fingerprint, không tự viết logic trùng Vision module |
| Provider | `media_ai/providers/*.py` | Mục 6, 16 | Implement đúng interface (`ImageEnhancer`, `Segmenter`, `BackgroundProcessor`, `Upscaler`, `IdentityVerifier`); provider phải nằm trong Technology Selection Matrix đã duyệt; orchestrator không import trực tiếp class provider cụ thể; `vision_bridge/` chỉ gọi API công khai của `vision/` |
| Pipeline | `media_ai/image/pipeline.py`, `enhancer.py`... | Mục 4 (Stage 5), Mục 3 | Conditional Pipeline — chỉ chạy bước cần theo Quality Analyzer; enhancement chạy đúng một lần cho Master Image, Smart Reframe cho các ratio; generative fill (Q46) bắt buộc set `flags.generative_fill_used = true` |
| JSON/Data Contract | `media_ai/schemas/*.py` | Mục 8 | Field hiện có giữ nguyên tên/kiểu; field mới optional/có default; có đủ `organization_id`, `product_id`, `stage`, `result`, `approval`; breaking change → dừng, hỏi |
| Database Schema | Prisma | Mục 9 | Không xóa bảng/field đã có; **mọi bảng có `organization_id`**; lịch sử Original/Final dùng `assets.version`, không tạo bảng version riêng; usage ghi vào bảng `Usage` chung |
| Job/Queue/Worker | `media_ai/jobs/*.py` | Mục 7, 14 (Phase 1E) | Không inference trực tiếp trong HTTP handler; dùng chuẩn `status`/`stage`/`result`, **`REJECTED` không phải `FAILED`**; hỗ trợ `CANCELLED`; worker mang `organization_id` trong payload; batch 1/3/5/10 dùng chung một `OptimizationJob` nhiều Asset |
| Storage | Supabase | Mục 10, 11 | Layout đúng mục 10 với **`{organization_id}`** làm scope, `original/` không bị ghi đè; metadata lưu đủ theo mục 11 + V2 mục 8 (khối metadata bắt buộc) Kiến trúc ALG |
| Review & Approve | `media_ai/schemas/`, API | Mục 5.1 | Master Image ở `approval.state = pending` cho tới khi duyệt; `media.optimize` tách khỏi `media.approve`; `REJECTED` không được vào luồng duyệt |
| Experience / Trial | API, `jobs/queue.py` | V2 mục 11.1 | Chạy được với mock data, không đòi hồ sơ doanh nghiệp đầy đủ; kiểm tra quota **trước khi** vào queue; không tự viết bộ đếm trial riêng |

## II.3. Quy tắc xử lý khi có mâu thuẫn hoặc thiếu thông tin

1. Có nói rõ trong Phần I / Bảng 73 câu hỏi → làm đúng theo đó.
2. Không nói rõ nhưng có nguyên tắc liên quan (Enhance don't regenerate; Product = Immutable, Environment = Editable) → suy luận theo nguyên tắc, luôn nghiêng về **bảo toàn sản phẩm thật**.
3. Không có căn cứ, ảnh hưởng kiến trúc lâu dài (đổi JSON Contract, đổi ngưỡng Identity Guard, chọn model ngoài Technology Selection Matrix, mở Phase 2/3 sớm) → **dừng lại, hỏi người dùng**.
4. Chi tiết kỹ thuật cục bộ không ảnh hưởng kiến trúc (tên biến, cách log, thứ tự gọi hàm nội bộ) → agent tự quyết theo best practice.

**Không được** lấy lý do "để pipeline nhanh hơn" hoặc "để đơn giản hóa MVP" làm căn cứ nới lỏng Product Identity Guard hay bỏ qua bước xác minh sản phẩm.

## II.4. Self-review trước khi báo "hoàn thành task"

```text
--- Cấp module (Phần I) ---
[ ] Code nằm đúng thư mục media_ai/ theo mục 12, không lẫn vào vision/ hoặc vision_legacy/?
[ ] Original image có được giữ nguyên, không bị overwrite ở bất kỳ bước nào?
[ ] Product Identity Guard có chạy bắt buộc, không có đường tắt bỏ qua?
[ ] Enhancement có chạy đúng một lần cho Master Image, không lặp lại theo từng ratio?
[ ] JSON output có đúng shape mục 8, có set đúng flags.generative_fill_used khi cần?
[ ] Provider mới (nếu có) có đúng interface mục 6, có nằm trong Technology Selection Matrix đã duyệt không?
[ ] Identity Guard có dùng cùng một provider + model version cho cả hai lần phân tích không?
[ ] Task này thuộc Phase nào (1A-1E)? Có đang làm vượt Phase cho phép không?
[ ] Nếu hoàn thành một Phase → đã đối chiếu Acceptance Criteria của Phase đó (mục 14 + 15) chưa?

--- Cấp hệ thống (Kiến trúc ALG) ---
[ ] Bảng/route/job/storage path mới có organization_id chưa? (Mục 4, 14)
[ ] Truy vấn đọc dữ liệu có lọc theo organization_id chưa? Có đường nào trả dữ liệu xuyên tổ chức không?
[ ] organization_id lấy từ phiên đăng nhập phía server, không phải từ client gửi lên?
[ ] Job dùng chuẩn status/stage/result? REJECTED có bị map nhầm thành FAILED không?
[ ] Có hỗ trợ CANCELLED cho job đang PENDING chưa?
[ ] Usage ghi vào bảng chung với feature = "media.optimize", không tạo bảng riêng?
[ ] Có kiểm tra trial/quota trước khi đưa job vào queue chưa? (Mục 5.1, 12)
[ ] Master Image có đi qua Approve trước khi thành Asset chính thức của Product? (mục 5.1, Mục 9)
[ ] Quyền media.optimize có bị gộp chung với media.approve không? (phải tách — Mục 13)
[ ] Output có được lưu như Asset gắn product_id + metadata theo V2 mục 8 (khối metadata bắt buộc) chưa?
[ ] Task có thuộc M04b (Creative) — tức đang code nhầm repo không? (mục A)
[ ] Task có nằm sau đúng Phase tiên quyết của ALG? Xem bảng ánh xạ mục 14.0.
```

## II.5. Định dạng báo cáo tiến độ

```text
Task: <mô tả ngắn>
Module: M04a — Product Image Optimization (repo FloraOS)
Phase module: <1A-1E, theo mục 14>
Phase hệ thống: <Phase 0-8 ALG — điều kiện tiên quyết ở mục 14.0 đã đạt chưa>
Mục tham chiếu: <số mục Phần I + số Mục Kiến trúc ALG đã áp dụng>
Thay đổi: <file/module đã tạo/sửa>
Không đụng: vision/, vision_legacy/ ✅ (trừ khi qua vision_bridge/)
Original image: immutable ✅
Identity Guard: không bị bỏ qua ✅
Tenant: mọi bảng/route/storage mới đều có organization_id ✅
Job: dùng chuẩn status/stage/result, REJECTED ≠ FAILED ✅
Usage: ghi feature = "media.optimize" vào bảng chung ✅ / không phát sinh usage
Approve: Master Image không ghi thẳng Product Master ✅
Contract: JSON Contract không đổi ✅ / có thêm field mới: <tên field>
Cần xác nhận thêm: <nếu có điểm mơ hồ, đặc biệt liên quan Technology Selection Matrix hoặc ngưỡng Guard>
```

## II.6. Khi phát hiện Phần I chưa tính đến trường hợp thực tế

Nếu trong lúc code phát hiện: ngưỡng Identity Guard không khả thi với model thực tế; một capability trong Technology Selection Matrix chưa có model OSS phù hợp; Conditional Pipeline (Stage 5) thiếu case xử lý thực tế →
Agent **không tự sửa Phần I hoặc tự hạ ngưỡng Guard**. Phải dừng lại, báo cáo vấn đề cụ thể kèm đề xuất, chờ product owner xác nhận.

## II.7. Tóm tắt quy tắc bất di bất dịch

1. Nguyên tắc số 1: **Enhance, không regenerate.** Mọi mơ hồ nghiêng về bảo toàn sản phẩm thật.
2. Product Identity Guard là **hard gate bắt buộc** — không bỏ qua, không nới lỏng ngưỡng khi chưa hỏi.
3. Original image **immutable tuyệt đối** — không bao giờ ghi đè.
4. Enhancement chạy **một lần** → Master Image → Smart Reframe cho các tỷ lệ, không lặp lại AI cho từng ratio.
5. Mọi model/provider phải qua interface (mục 6), nằm trong Technology Selection Matrix đã duyệt (mục 16).
6. `media_ai/` không import trực tiếp `vision/` hoặc `vision_legacy/` — chỉ qua `vision_bridge/`.
7. Không bắt đầu Phase 2 (Video) hoặc Phase 3 (Creative Engine) khi Phase 1 chưa qua Acceptance Criteria.
8. Generative fill (khi ảnh quá kém) phải được đánh dấu rõ trong output, không trộn lẫn với enhancement thông thường.
9. Mọi quyết định ảnh hưởng kiến trúc lâu dài → hỏi người dùng, không tự quyết.
10. Báo cáo tiến độ theo format mục II.5 sau mỗi task.

**Bổ sung từ Kiến trúc ALG (Cấp 1 — thắng tuyệt đối khi mâu thuẫn với 10 quy tắc trên):**

11. **Mọi bản ghi, route, job và đường dẫn storage đều gắn `organization_id`.** Storage scope theo tổ chức, không theo user. Không có ngoại lệ, kể cả demo workspace.
12. `organization_id` luôn giải từ phía server; **không bao giờ tin ID tổ chức do client gửi**.
13. Trạng thái job dùng chuẩn `status` / `stage` / `result`. **`REJECTED` là job COMPLETED có phán quyết từ chối, không phải `FAILED`.** Phải hỗ trợ `CANCELLED`.
14. Usage ghi vào bảng `Usage` dùng chung, `feature = "media.optimize"` — không tạo bảng usage/credit riêng.
15. Kiểm tra trial/quota **trước khi** đưa job vào queue, qua service dùng chung.
16. **Identity Guard PASS không phải là Approve.** Master Image chỉ thành Asset chính thức của Product sau khi người có quyền `media.approve` duyệt.
17. Quyền chạy job (`media.optimize`) **tách khỏi** quyền duyệt (`media.approve`).
18. Output lưu như `Asset` gắn `product_id`, kèm metadata bắt buộc theo V2 mục 8 (khối metadata bắt buộc) — không dùng bảng version riêng.
19. Consent dùng dữ liệu huấn luyện ở **cấp Organization**, không phải cấp user.
20. Không bắt đầu Phase 1A trước khi **ALG Phase 1 (SaaS Foundation)** đạt Acceptance — xem bảng ánh xạ mục 14.0.
21. Phần Marketing Creative (Phase 3 / M04b) thuộc repo **`SocialFlow`**, không code trong repo này.
22. Nếu Phần I hoặc Bảng 73 câu hỏi mâu thuẫn Kiến trúc ALG → **dừng, báo product owner**, không tự chọn bên nào.

---

---

## Tóm tắt thay đổi so với bản Master gốc

Bản FULL này **không cắt bất kỳ phạm vi kỹ thuật nào** (khác với bản MVP đã đề xuất trước đó — bản MVP không dùng nữa theo yêu cầu). Thay đổi duy nhất:

1. Roadmap (mục 14) được nhóm lại thành **2 giai đoạn thực thi lớn** — Hình ảnh (Phase 1A–1E đầy đủ) rồi tới Video (Phase 2 đầy đủ) — thay vì liệt kê rời rạc, để dễ lập kế hoạch nhân sự/thời gian theo loại input.
2. Marketing Creative Engine (Phase 3) giữ nguyên là phần **mở rộng sau cùng**, không thuộc 2 giai đoạn chính.
3. Bảng 73 câu hỏi (mục 0.1) được đánh dấu rõ là **Phụ lục tham chiếu bất biến** — dùng để tra cứu nhanh khi cần đối chiếu quyết định, không bị chỉnh sửa theo các lần cập nhật khác.
4. Phần II (hướng dẫn Coding Agent) giữ nguyên toàn bộ nội dung như bản Master, chỉ đổi cách gọi "Phase 1" → "Giai đoạn 1 — Hình ảnh" và "Phase 2" → "Giai đoạn 2 — Video" cho nhất quán thuật ngữ.

---

## Thay đổi ở V1.1 — đồng bộ với Kiến trúc ALG

Bản V1.1 **không cắt và không thêm phạm vi kỹ thuật nào**. Toàn bộ thay đổi là để tài liệu này khớp với tài liệu hệ thống — vì bản V1.0 được viết theo mô hình ứng dụng một người dùng, chưa phải mô hình SaaS đa tổ chức.

**Bản V1.2 (09/09) cũng không cắt phạm vi kỹ thuật nào.** Thay đổi gồm: repo đích `FloraOS` → `floraos-core`; tài liệu cấp trên → `ALG_SAAS_TARGET_ARCHITECTURE_V2.md`; ánh xạ Phase 1/2/6/7 → P0–P12 (Usage gộp vào P3); bỏ mọi viện dẫn Mục 18 đã bãi bỏ; bố cục `python-service/app/` → `workers/`; ràng buộc Identity Guard phát biểu lại theo quyết định D5-c; tên bảng sang `snake_case`.

**Bảng 73 câu hỏi (mục 0.1) được giữ nguyên vẹn, không sửa một chữ**, đúng như tài liệu tự tuyên bố là phụ lục tham chiếu bất biến.

| # | Thay đổi | Mục bị ảnh hưởng |
|---|---|---|
| 1 | Tách M04 thành M04a (`FloraOS`) / M04b (`SocialFlow`), ranh giới là Master Image | mục A (mới), 12, 14 |
| 2 | Thêm thang bậc tài liệu — Kiến trúc ALG là Cấp 1 | mục B (mới), II.0 |
| 3 | Thêm `organization_id` vào mọi bảng; thêm `product_id` | mục 9 |
| 4 | Gộp `OptimizationVersion` → `assets.version`; `OptimizationUsage` → `Usage` chung | mục 9 |
| 5 | Storage scope theo `{organization_id}` thay vì `{user_id}` | mục 10 |
| 6 | Chuẩn hoá job thành ba trục `status`/`stage`/`result`; `REJECTED` ≠ `FAILED`; thêm `CANCELLED` | mục 7 |
| 7 | JSON Contract bổ sung `organization_id`, `product_id`, `stage`, `result`, `approval` (additive) | mục 8 |
| 8 | Thêm cổng **Review & Approve** — tách khỏi Identity Guard | mục 5.1 (mới) |
| 9 | Identity Verification không dùng GPT-4o mini; cùng provider + model version cho cả hai lần phân tích | mục 6 |
| 10 | Consent dữ liệu huấn luyện nâng lên cấp Organization; training record lưu `organization_id` | mục 13 |
| 11 | Bảng ánh xạ Phase module ↔ Phase hệ thống | mục 14.0 (mới) |
| 12 | Thêm cột Tenant-isolation review vào Technology Selection Matrix | mục 16 |
| 13 | Bổ sung quy tắc 11–22 vào danh sách bất di bất dịch; cập nhật vùng cấm, checklist, self-review, format báo cáo | Phần II |

**Hai điểm được đưa NGƯỢC từ tài liệu này lên Kiến trúc ALG** (tức tài liệu module tốt hơn tài liệu hệ thống, và hệ thống đã tiếp thu): danh sách metadata bắt buộc ở mục 11 trở thành chuẩn chung cho mọi Asset do AI sinh ra (V2 mục 8 (khối metadata bắt buộc) Kiến trúc), và Technology Selection Matrix ở mục 16 trở thành yêu cầu bắt buộc cho mọi module dùng AI provider (Mục 11.1 Kiến trúc).

*(Hết bản FULL — hợp nhất từ 2 file gốc, không có nội dung kỹ thuật nào bị lược bỏ; chỉ tổ chức lại cách phân giai đoạn, làm rõ vai trò phụ lục của Bảng 73 câu hỏi, và đồng bộ với kiến trúc SaaS đa tổ chức của ALG.)*
