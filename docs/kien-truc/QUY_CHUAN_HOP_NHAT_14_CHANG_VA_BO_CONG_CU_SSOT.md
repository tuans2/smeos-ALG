# QUY CHUẨN HỢP NHẤT HỆ THỐNG 14 CHẶNG VÀO NỀN TẢNG BỘ CÔNG CỤ ALG
## Đặc Tả Hợp Nhất Kiến Trúc Tác Nghiệp: Atomic Toolkit & Auto-Campaign Workflow Engine

> **Mã văn bản:** `DOC-ARCH-UNIFICATION-TOOLKIT-001`  
> **Cấp thẩm quyền:** Level 2 — Architectural SSOT  
> **Ngày phê chuẩn:** 27/10/2026  
> **Branch thực thi:** `Hopnhat_chucnang-congcu`  
> **Dựa trên quyết định của PO:** Hợp nhất triệt để hai hệ thống chạy song song (14 Chặng Product-to-Market & Bộ 48 Công cụ), lấy Danh sách Công cụ làm nền tảng cốt lõi.

---

## 1. BỐI CẢNH VÀ QUYẾT ĐỊNH CỐT LÕI

Trước đây, hệ thống tồn tại 2 khái niệm có sự giao thoa lớn về mặt tính năng và giá trị mang lại cho người dùng:
1. **Hệ thống 14 chặng (Product-to-Market Journey / Creative Studio):** Mô hình đường ống tuyến tính (Pipeline) đi từ *Ảnh thô $\rightarrow$ Hiểu sản phẩm $\rightarrow$ Xu hướng $\rightarrow$ Ý tưởng $\rightarrow$ Sáng tạo $\rightarrow$ Đóng gói $\rightarrow$ QA $\rightarrow$ Duyệt $\rightarrow$ Đăng bán $\rightarrow$ Bán hàng $\rightarrow$ Đo lường $\rightarrow$ Học $\rightarrow$ Hành động kế tiếp*.
2. **Hệ thống 48 công cụ tác nghiệp ALG:** Mô hình các khối nguyên tử độc lập (Modular Atomic Tools) phục vụ toàn diện các bài toán từ Sáng tạo, Bán hàng, Định mức giá vốn, Vận hành, đến Quản trị Chuỗi.

### Quyết định phê chuẩn của PO (27/10/2026):
1. **Chức năng 03 (Discover / Trend Research):** Chuyển thành **1 module công cụ mới độc lập** trong Thư viện Công cụ (Công cụ Nghiên cứu Thị trường & Xu hướng theo mùa vụ).
2. **Chức năng 13 (Learn / Pattern Recognition):** Chuyển thành **1 module công cụ mới độc lập** có chức năng học và đề xuất cải tiến cho User về việc sử dụng toàn bộ các công cụ trong hệ thống.
3. **Chức năng 14 (Next Best Action):** Phát triển thành **Thành phần dùng chung (Universal NextAction Component)** tích hợp ở tất cả các công cụ: mỗi khi hoàn thành một công cụ, hệ thống sẽ tự động đề xuất bước hành động tiếp theo.
4. **Chuỗi 14 chặng:** Đóng gói thành **1 module Workflow Chế tác Tự động từ A-Z** (Công cụ đặc biệt trong danh mục công cụ), tận dụng toàn bộ pipeline tự động hoá sẵn có (`planProduction()`, `TopicProductionBrief`, `creative-handoff`).

---

## 2. KIẾN TRÚC HỢP NHẤT TOÀN DIỆN

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               🏛️ NỀN TẢNG CỐT LÕI: THƯ VIỆN CÔNG CỤ TÁC NGHIỆP ALG                   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │  ⚡ CÔNG CỤ ĐẶC BIỆT: WORKFLOW CHẾ TÁC TỰ ĐỘNG TỪ A-Z (AUTO-CAMPAIGN ENGINE)   │   │
│   │  - Nhận 1 ảnh thô -> Tự động chạy trọn gói: Bóc tách BOM -> Tạo ảnh Studio     │   │
│   │    -> Viết bài 4 kênh -> Dựng video ngắn -> Ghép Thẻ chào / Link bán hàng      │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
│   ┌─────────────────────────────┬─────────────────────────────┬────────────────────┐   │
│   │  NHÓM 1: AI & NỘI DUNG      │  NHÓM 2: TRANG & HIỆN DIỆN  │  NHÓM 3: BÁN HÀNG  │   │
│   │  - Tạo ảnh Studio (01)      │  - Landing Page (08)        │  - Link bán (13)   │   │
│   │  - Bộ ảnh bối cảnh (02)     │  - Catalog Showroom (09)    │  - Báo giá lẻ (15) │   │
│   │  - Thẻ chào bán hàng (03)   │  - Hồ sơ cửa hàng (11)      │  - Thanh toán (20) │   │
│   │  - Viết bài đa kênh (04)    │  - QR Code thông minh (12)  │  - Form đặt (17)   │   │
│   │  - Video ngắn bán hàng (06) │                             │                    │   │
│   ├─────────────────────────────┼─────────────────────────────┼────────────────────┤   │
│   │  NHÓM 4: THU HÚT KHÁCH      │  NHÓM 5: CHĂM SÓC KHÁCH     │  NHÓM 6: GIÁ & LÃI │   │
│   │  - ✨ TOOL MỚI: NGHIÊN CỨU  │  - Kịch bản chăm sóc (26)   │  - Định mức (31)   │   │
│   │    THỊ TRƯỜNG & TREND (03)  │  - Lịch nhắc dịp lễ (28)    │  - Bảng giá NL (32)│   │
│   │  - Thu lead ưu đãi (21)     │  - Khách thân thiết (29)    │  - Tính giá vốn(33)│   │
│   │  - Chiến dịch mùa vụ (22)   │  - Bán chéo / Bán thêm (30) │  - Lợi nhuận (34)  │   │
│   ├─────────────────────────────┴─────────────────────────────┴────────────────────┤   │
│   │  NHÓM 7: CHẾ TÁC & VẬN HÀNH (36-41) | NHÓM 8: QUẢN TRỊ MẠNG LƯỚI CHUỖI (42-48)  │   │
│   ├────────────────────────────────────────────────────────────────────────────────┤   │
│   │  🌟 NHÓM MỚI: TỐI ƯU & HỌC MÁY HỆ THỐNG                                         │   │
│   │  - TOOL MỚI: TRỢ LÝ HỌC & ĐỀ XUẤT CẢI TIẾN TÁC NGHIỆP (LEARNING & OPTIMIZER)   │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
│   ══════════════════════════════════════════════════════════════════════════════════   │
│   🔗 THÀNH PHẦN GỢI Ý TOÀN CỤC: [ NEXT BEST ACTION COMPONENT ]                          │
│   (Gắn ở cuối trang kết quả của MỌI công cụ: Điều hướng thông minh sang bước kế tiếp)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT 4 TRỤ CỘT THỰC THI

### 3.1 Trụ Cột 1: Module Công Cụ Mới — Nghiên cứu Thị trường & Cơ hội Mùa vụ (Market Intelligence Tool)
- **Mã định danh:** `TOOL-MARKET-TRENDS` (bổ sung vào danh mục công cụ).
- **Vị trí UI:** Nhóm Công cụ Thu hút & Khám phá cơ hội thị trường (`/cong-cu/thi-truong`).
- **Input:** Ngành hàng (`industryKey`), khu vực địa lý, thời điểm/dịp lễ sắp tới (Valentine, 8/3, 20/10, Tết...).
- **Process:** Phân tích nhu cầu tìm kiếm, phong cách thiết kế đang thịnh hành, phân khúc ngân sách khách hàng quan tâm nhiều nhất.
- **Outputs:** Báo cáo cơ hội kinh doanh dạng thẻ trực quan kèm danh sách các góc nội dung/sản phẩm gợi ý nên làm ngay.
- **Actions:** Bấm chọn 1 cơ hội $\rightarrow$ Chuyển thẳng sang Công cụ tạo sản phẩm/viết bài tương ứng kèm từ khóa đã chọn.

### 3.2 Trụ Cột 2: Module Công Cụ Mới — Học Máy & Đề xuất Cải tiến Toàn Hệ Thống (System Learning & Optimizer)
- **Mã định danh:** `TOOL-LEARNING-OPTIMIZER` (bổ sung vào danh mục công cụ).
- **Vị trí UI:** Nhóm Tối ưu & Hiệu quả kinh doanh (`/cong-cu/toi-uu-he-thong`).
- **Input:** Lịch sử hoạt động của cửa hàng (dữ liệu bài viết đã đăng, lượt xem link catalog, tỷ lệ chốt thẻ chào, công cụ ít/nhiều sử dụng).
- **Process:** Nhận diện điểm nghẽn tác nghiệp (ví dụ: tạo nhiều ảnh nhưng không gắn link bán hàng; đăng bài không kèm báo giá; bỏ quên công cụ tính giá vốn).
- **Outputs:** Bảng khuyến nghị tối ưu hóa thực tế cho chủ tiệm:
  - *"Bạn đã tạo 15 ảnh sản phẩm tuần này nhưng chỉ có 2 link bán hàng. Hãy dùng Công cụ 13 để tăng tỷ lệ chốt đơn."*
  - *"Các bài viết theo văn phong Kể chuyện (Storytelling) đang có lượt tương tác cao gấp 3 lần văn phong Trực diện."*
- **Actions:** Áp dụng ngay giải pháp đề xuất bằng 1 click.

### 3.3 Trụ Cột 3: Chuẩn Hóa Universal Next Action Component (Chức năng 14)
- **Tên Component:** `NextActionRecommendationCard` (`src/components/toolkit/next-action-card.tsx`).
- **Quy tắc Kiến trúc:**
  - Bắt buộc tích hợp vào khối chân trang (Footer Actions) của kết quả mọi công cụ.
  - Sử dụng ma trận gợi ý ngữ cảnh (`NEXT_ACTION_MATRIX`):
    - Hoàn thành **Tạo ảnh sản phẩm (01)** $\rightarrow$ Gợi ý: Tạo thẻ chào (03), Viết bài đăng (04), hoặc Tạo link bán (13).
    - Hoàn thành **Viết bài bán hàng (04)** $\rightarrow$ Gợi ý: Lên lịch đăng đa kênh (22) hoặc Tạo video ngắn (06).
    - Hoàn thành **Tính giá vốn (33)** $\rightarrow$ Gợi ý: Đề xuất giá bán & lợi nhuận (34) hoặc In thẻ giá A6 (Kho mẫu).
    - Hoàn thành **Tạo báo giá (15)** $\rightarrow$ Gợi ý: Gửi link duyệt & đặt cọc (20).

### 3.4 Trụ Cột 4: Module Workflow Chế tác Tự Động Từ A-Z (Auto-Campaign Workflow Engine)
- **Bản chất:** Giữ lại toàn bộ sức mạnh phối hợp của 14 chặng nhưng định vị là **"Chế độ Tự Động Trọn Gói" (One-Click Campaign Generator)**.
- **Đường dẫn:** `/cong-cu/che-tac-tu-dong` (hoặc `/creative-studio` đóng vai trò là Auto Workflow Studio).
- **Cơ chế vận hành:**
  1. Người dùng tải 1 ảnh mẫu sản phẩm thô.
  2. Bấm nút: **"⚡ Chế tác Trọn gói từ A-Z"**.
  3. Hệ thống tự động kích hoạt use-case orchestrator `planProduction()` đã có sẵn:
     - Tự động bóc tách thành phần BOM (AI Vision).
     - Tự động sinh ảnh Studio nền đẹp (Image Variant).
     - Tự động viết Caption 4 kênh MXH (Facebook, Instagram, TikTok, Zalo).
     - Tự động dựng Storyboard Video ngắn & Voiceover.
     - Tự động đóng gói thành Thẻ chào A6 & Link bán hàng 1-chạm.
  4. Trả về bảng điều khiển nghiệm thu: User chỉ cần duyệt hoặc xuất bản ngay.

---

## 4. KẾ HOẠCH BÀN GIAO & TÍCH HỢP

1. **Cập nhật SSOT Navigation 4 Tầng:** Đồng bộ hóa mục `01 · CÔNG CỤ` trên Sidebar, đưa Workflow Tự Động A-Z và các công cụ mới vào menu điều hướng chuẩn.
2. **Cập nhật Toolkit Catalog SSOT:** Điều chỉnh danh mục tại `src/modules/toolkit/domain/toolkit-catalog.ts` để hiển thị đầy đủ các công cụ mới và phân loại rõ ràng.
3. **Phát triển UI Component `NextActionCard`:** Cung cấp component chuẩn hóa để các màn hình công cụ import và sử dụng ngay lập tức.
