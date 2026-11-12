---
id: SCR-STORE-job
tier: STORE
module: job
route: /job
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Danh sách & Chi tiết Job (`/job`, `/job/[id]`)

> **Trạng thái production (12/11/2026, audit L-03):** tuyến thuộc tiền tố khoá `/job` trong `LOCKED_ROUTE_PREFIXES` (`src/lib/feature-lock.ts`). `src/app/(app)/job/layout.tsx` bọc `FeatureLockedGuard`, nên khi `NEXT_PUBLIC_APP_ENV=production` cả URL gõ thẳng cũng hiện màn "Sắp ra mắt" (trước đây chỉ làm mờ mục sidebar). Bản giao GD1 không đặt biến này nên không bị khoá.

**Tuyến:** `/job`, `/job/[id]` · **Tệp chính:** `src/app/(app)/job/page.tsx`, `src/app/(app)/job/[id]/page.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T5.A6

## 1. Vai và mục đích
- **Vai chính (03b):** Tất cả các vai (`store_manager`, `florist`, `content_creator`, `marketer`, v.v.).
- **Phạm vi:** organization (theo dõi trạng thái và tiến trình các tác vụ bất đồng bộ AI chạy ngầm).
- **Việc chính:**
  - `/job`: Xem toàn cảnh danh sách các tác vụ nền, phát hiện ngay tác vụ lỗi để can thiệp.
  - `/job/[id]`: Theo dõi checklist từng bước đang chạy, đọc giải thích nguyên nhân lỗi bằng tiếng Việt, huỷ tác vụ đang chờ hoặc chạy lại tác vụ bị lỗi.
- **Câu hỏi chính:** "Tác vụ AI của tôi đã xử lý xong chưa, có lỗi ở bước nào không?"
- **Mật độ:** MEDIUM (Phân nhóm danh sách rõ ràng, checklist trực quan).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/jobs?limit=50` → `G4` (`job.read`)
  - `GET /api/v1/jobs/:id` → `G4` (`job.read`)
  - `POST /api/v1/jobs/:id/cancel` → `G4` (`job.read`)
  - `POST /api/v1/jobs/:id/retry` → `G4` (`job.read`)
- **Tập trung nhãn tính năng:** Dùng chung SSOT `NHAN_TINH_NANG` (`src/lib/feature-labels.ts`).
- **Trạng thái:** Tải (`SkeletonBlock`), Rỗng (`EmptyState` kèm nút hành động dẫn tới `/tai-anh`), Lỗi tải (`InlineError`), Tiến trình checklist (`FlowSteps`).

## 3. Thứ bậc thông tin
| Tuyến | Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|---|
| `/job` | L0 Thiết yếu | Nhóm "Lỗi cần can thiệp" (nổi bật trên cùng với viền cảnh báo) | Đỉnh danh sách |
| `/job` | L1 Đang chạy | Nhóm "Đang xử lý" (biểu tượng xoay kèm giai đoạn) | Giữa danh sách |
| `/job` | L2 Hoàn tất | Nhóm "Đã hoàn tất" (kèm kết quả tóm tắt) | Cuối danh sách |
| `/job/[id]` | L0 Thiết yếu | Thẻ thông báo sự cố + Nút "Chạy lại tác vụ" (Primary) | Đỉnh trang khi job FAILED |
| `/job/[id]` | L1 Tiến trình | Checklist `FlowSteps` hiển thị từng bước và trạng thái thực | Giữa trang |
| `/job/[id]` | L2 Chi tiết | Thông số vận hành: trạng thái, giai đoạn, kết quả, mốc thời gian | Dưới checklist |

## 4. Hành động
- **Tại `/job`:**
  - Nhấp vào bất kỳ dòng job nào (toàn bộ card là link có `min-h-11`) để chuyển sang `/job/[id]`.
  - Khi danh sách rỗng: nút hành động "Tải ảnh để phân tích".
- **Tại `/job/[id]`:**
  - Nút quay lại danh sách job ở Header (`min-h-11`).
  - Job lỗi (`FAILED`): Nút chính "Chạy lại tác vụ" (`variant="primary"`) nổi bật.
  - Job đang chờ (`PENDING`): Nút phụ "Huỷ tác vụ" (`variant="secondary"`).
  - Nhật ký kỹ thuật chi tiết (`logs` trong `FlowSteps`): Mặc định thu gọn (`showLog={false}`) và chỉ mở khi người dùng chủ động bấm.

## 5. Responsive
- **390px (Mobile):** Các dòng thẻ đạt chuẩn `min-h-11` (≥ 44px), hiển thị gọn gàng 1 cột.
- **768px (Tablet):** Căn giữa tối đa 768px (`max-w-3xl`).
- **1280px (Desktop):** Khung nhìn thoáng đãng, các thông số căn lề chuẩn mực.

## 6. Trợ năng
- Toàn bộ dòng danh sách và nút tương tác đạt `min-h-11`, có `focus-visible:outline-2 focus-visible:outline-primary`.
- Các biểu tượng trạng thái có màu ngữ nghĩa chuẩn (`text-danger`, `text-primary`, `text-secondary`, `text-text-muted`) và `aria-hidden="true"`.
- Tiêu đề nhóm sử dụng thẻ `<h2>` kèm `aria-labelledby` chuẩn Semantic HTML.

## 7. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Dùng chung cho tất cả các vai |
| Việc | PASS | Giám sát và can thiệp tiến trình AI |
| IA | PASS | Lỗi (trên) -> Đang chạy -> Đã xong |
| Mật độ | PASS | Nhóm rõ ràng, không lẫn lộn |
| Thứ bậc | PASS | Thẻ lỗi đỉnh trang, checklist theo bước |
| CTA | PASS | Chạy lại (Primary) cho job lỗi |
| Luồng | PASS | /job -> /job/[id] -> thao tác -> cập nhật |
| Trạng thái | PASS | Đủ tải / rỗng / lỗi / checklist |
| Responsive | PASS | Chuẩn xác từ 390px mobile đến desktop |
| Trợ năng | PASS | Touch target ≥ 44px, focus visible |
| Dữ liệu | PASS | Kết nối API Jobs thật |
| Quyền | PASS | Gating theo G4 job.read |
| Nhất quán | PASS | Dùng 100% token Semantic, SSOT NHAN_TINH_NANG |
