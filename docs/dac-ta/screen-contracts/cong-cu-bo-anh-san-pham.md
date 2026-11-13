---
id: SCR-STORE-cong-cu-bo-anh-san-pham
tier: STORE
module: product-image-set
route: /cong-cu/bo-anh-san-pham
archetype: E
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Tạo bộ ảnh sản phẩm đa kênh

**Tuyến:** `/cong-cu/bo-anh-san-pham` · **Tệp chính:** `src/components/product-image-set/product-image-set-flow.tsx` (cờ `ux_pd_bo_anh_san_pham`; tắt cờ → `product-image-set-client.tsx`) · **Cập nhật:** 29/10/2026 · **Thẻ:** PD đợt A-1

## 1. Vai và mục đích
- Vai chính: chủ tiệm, marketing · Phạm vi: organization · Mật độ: LOW
- Việc chính: từ một ảnh, nhận đủ bộ ảnh nhiều tỉ lệ cho các kênh bán
- Câu hỏi chính: "Bộ ảnh của tôi đã đủ để đăng mọi kênh chưa?"

## 2. Hiện trạng (audit)
- API: `POST /api/v1/product-image-set` → `I1` · `GET /api/v1/product-image-set/:id` → `G1`
- Lỗi đã sửa: client đọc `data.jobId`/`data.status` trong khi API trả `{ job_id }` và kết quả phẳng → không bao giờ ra kết quả (sửa cả bản cũ qua `generation-job-logic.ts`)
- Trước: nhãn "Công cụ 02", "Set Consistency"; `alert()` báo "đã lưu"; vòng hỏi không giới hạn

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí |
|---|---|---|
| L0 | Vùng tải ảnh, trạng thái, bộ ảnh kết quả | khung nhìn đầu |
| L1 | "Tạo bộ ảnh" + chi phí credit | dưới ảnh đã chọn |
| L2 | Điểm nhất quán cả bộ, QC từng ảnh | trong khung kết quả |
| L3 | Chọn gói bộ ảnh, ghi chú cho AI | "Gói bộ ảnh thương mại" (đóng mặc định) |
| SYS | Tải lên, tạo job, idempotency, hỏi ≤ 5 phút, nhớ job theo tổ chức | qua `TaskStatus` |

## 15. Progressive disclosure & rủi ro (03c)
Pattern: UX-P01, UX-P03, UX-P04, UX-P05, UX-P06, UX-P12 · hook dùng chung `useGenerationJob`
| Trường/nút | Tầng | Rủi ro | Xác minh |
|---|---|---|---|
| Tải ảnh | L0 | R1 | E2E `a11y-done-tools.spec.ts` |
| Tạo bộ ảnh | L1 | R2 (credit) | `generation-job-logic.test.ts` |
| Gói bộ ảnh / ghi chú | L3 | R1 | `aria-expanded` |
Chi phí: báo tối đa 3 credit ("dự kiến") · ngoại lệ: không.
