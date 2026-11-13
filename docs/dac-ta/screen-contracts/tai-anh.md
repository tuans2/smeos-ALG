---
id: SCR-STORE-tai-anh
tier: STORE
module: storage
route: /tai-anh
archetype: D
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Quét & Dữ liệu sản phẩm AI (`/tai-anh`)

**Tuyến:** `/tai-anh` · **Tệp chính:** `src/app/(app)/tai-anh/page.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T5.A4

## 1. Vai và mục đích
- **Vai chính (03b):** `florist`, `store_manager`, `content_creator`, `marketer`.
- **Phạm vi:** organization (phân tích mẫu hoa mới, sinh dữ liệu bán hàng và thẻ chào hàng).
- **Việc chính:** Tải ảnh mẫu hoa lên để AI nhận diện cấu phần (loài hoa, số lượng cành, phối màu, phong cách), sinh nội dung bán hàng thương mại, tạo thẻ chào hàng và lưu trữ vào kho sản phẩm.
- **Câu hỏi chính:** "Mẫu hoa này gồm những loài hoa và phụ liệu gì, và nội dung chào bán phù hợp là gì?"
- **Mật độ:** MEDIUM-HIGH (Luồng tác nghiệp chuyên sâu theo từng tab).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `POST /api/v1/vision/analyses` → `H1` (`vision.analyze`)
  - `GET /api/v1/jobs/:id` → `G4` (`job.read`)
  - `POST /api/v1/vision/analyses/:id/approve` → `H3` (`vision.approve`)
  - `POST /api/v1/vision/analyses/:id/generate-copy` → `H5` (`copy.generate`)
  - `POST /api/v1/vision/analyses/:id/approve-copy` → `H6` (`copy.approve`)
  - `GET /api/v1/vision/analyses?status=APPROVED` → `H3`
- **Các Tab:**
  - Tab 1: **Nhận diện ảnh** (nhận diện mẫu hoa mới qua ảnh tải lên hoặc kho ảnh sẵn).
  - Tab 2: **Nội dung bán hàng** (sinh dữ liệu bán hàng AI từ các mẫu đã duyệt).
  - Tab 3: **Thẻ chào hàng** (tạo thẻ chào khách hàng đa kênh Sales Pitch).
  - Tab 4: **Kho lưu trữ** (quản lý ảnh thô và mẫu phân tích đã duyệt).
- **Trạng thái:** Tải (`SkeletonBlock`), Đang chạy (`FlowSteps` checklist đóng/mở log), Rỗng (`EmptyState`), Lỗi (`phase === "error"` hiển thị rõ bước lỗi và nút "Chạy lại").

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header trang, Thanh chuyển Tab chuẩn hóa `TabActionHeader` | Đỉnh trang |
| L0 Tóm tắt kết quả | Tên sản phẩm, loại hoa, số cành chính, bảng màu và phong cách | Đầu thẻ kết quả phân tích |
| L1 Hành động | Cặp nút "Duyệt" (Primary) và "Không đạt" (Outline) đặt cạnh nhau; nút "Chạy lại" khi lỗi | Chân thẻ kết quả |
| L2 Chi tiết cấu phần | Chi tiết lá đệm, phụ kiện nơ, vật liệu gói, chữ thiệp OCR, cấu trúc tầng lớp | Nằm sau nút "Xem chi tiết cấu phần ({N} trường khác)" |
| L3 Chuyển tiếp | Chuyển sang Sáng tạo nội dung (Creative Studio Chặng 05–14) | Dưới thẻ kết quả sau khi duyệt |

## 4. Hành động
- **Chính:**
  - Tab 1: "Tải ảnh" / "Bắt đầu phân tích" → "Duyệt" (Primary).
  - Tab 2: "Tiếp tục sinh nội dung" → "Duyệt nội dung" (Primary).
  - Tab 3: "Chốt thẻ chào hàng" (Primary).
- **Phụ:**
  - "Không đạt" (Outline) ngay cạnh nút "Duyệt".
  - "Lưu nháp" (Ghost) để lưu tạm cấu phần đang chỉnh sửa.
  - "Xem chi tiết cấu phần" / "Thu gọn cấu phần chi tiết".
  - "Kho ảnh có sẵn" (Secondary).
- **Quy tắc K2:** Mỗi view tab đảm bảo tối đa 1 nút chính, các tác vụ phụ dùng `outline` hoặc `secondary`.

## 5. Quy tắc nghiệp vụ bắt buộc
- **Bảo toàn hành trình 14 bước:** Không can thiệp hoặc thay đổi state machine của hành trình sản phẩm ra thị trường (AGENTS.md).
- **Atomic Disaggregated Fields:** Toàn bộ dữ liệu cấu phần hoa, số lượng cành, đơn vị tính, màu sắc, chữ thiệp chúc mừng OCR được phân tách độc lập và cho phép chỉnh sửa trực tiếp.
- **Tiến trình xử lý minh bạch:** Component `FlowSteps` hiển thị checklist 4 bước (Nhận diện cấu phần → Đếm hoa → Bảng màu → Phong cách); log kỹ thuật mặc định thu gọn (`showLog={false}`) và chỉ mở khi người dùng chủ động bấm.

## 6. Responsive
- **390px (Mobile):** Vùng thả ảnh có diện tích lớn, các nút tương tác đạt `min-h-11` (≥ 44px), toàn bộ thao tác duyệt và chỉnh sửa thực hiện thuận tiện bằng một tay.
- **768px (Tablet):** Trình bày dạng card căn giữa tối đa 768px (`max-w-3xl`).
- **1280px (Desktop):** Khung nhìn rộng thoáng tối đa 1024px (`max-w-5xl`), ảnh mẫu và các trường cấu phần hiển thị trực quan.

## 7. Trợ năng
- Toàn bộ nút hành động và nút thu gọn/mở rộng chi tiết có `min-h-11`, `focus-visible:outline-2 focus-visible:outline-primary`.
- Khi duyệt thành công, phát thông báo hỗ trợ thiết bị trợ năng.
- Các biểu tượng trang trí có `aria-hidden="true"`.

## 8. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho Florist, Store Manager, Content Creator |
| Việc | PASS | Nhận diện hoa, sinh copy, tạo thẻ chào hàng |
| IA | PASS | 4 tab nghiệp vụ rõ ràng, bỏ hoàn toàn mã kỹ thuật |
| Mật độ | PASS | L0 tóm tắt trước, L2 chi tiết sau toggle |
| Thứ bậc | PASS | Tab header -> Nội dung chặng -> Tác vụ duyệt |
| CTA | PASS | Duyệt và Không đạt đặt cạnh nhau, max 1 primary |
| Luồng | PASS | Bảo toàn 100% state machine 14 bước |
| Trạng thái | PASS | Tải, tiến trình checklist, kết quả, lỗi rõ bước |
| Responsive | PASS | Hoàn hảo ở 390px mobile và 1280px desktop |
| Trợ năng | PASS | Đạt chuẩn touch target ≥ 44px, focus visible |
| Dữ liệu | PASS | Kết nối API Vision và Copywriting thực tế |
| Quyền | PASS | Gating theo năng lực H1, H2, H3, H5, H6 |
| Nhất quán | PASS | Dùng 100% token Semantic và font token |

## 15. Progressive disclosure & rủi ro (03c) — 29/10/2026
Thẻ chào sản phẩm (`/tai-anh?tab=m01c`, đợt A-2). Pattern: UX-P01, UX-P04 (khoá job gắn tổ chức `job-storage-key.ts` đã có). Thay đổi: hộp xoá vĩnh viễn trong Kho (`storage-trash-tab.tsx`) chuyển sang `ConfirmDialog` (R3). axe 390px: 0 lỗi (`tests/e2e/ux/a11y-done-tools.spec.ts`). Rủi ro: tải ảnh R1, tạo thẻ R2, xoá vĩnh viễn R3.
