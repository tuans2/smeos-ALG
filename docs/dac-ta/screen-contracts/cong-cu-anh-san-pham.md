---
id: SCR-STORE-cong-cu-anh-san-pham
tier: STORE
module: product-photo-studio
route: /cong-cu/anh-san-pham
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

# Screen Contract — Tạo ảnh sản phẩm chuyên nghiệp

**Tuyến:** `/cong-cu/anh-san-pham` · **Tệp chính:** `src/components/product-photo-studio/product-photo-studio-flow.tsx` (cờ `ux_pd_anh_san_pham`; tắt cờ → `product-photo-studio-client.tsx`) · **Cập nhật:** 29/10/2026 · **Thẻ:** PD Giai đoạn 3 (pilot)

## 1. Vai và mục đích
- Vai chính (03b): chủ tiệm, nhân viên marketing · Phạm vi: organization
- Việc chính: biến ảnh chụp điện thoại thành ảnh studio
- Câu hỏi chính: "Ảnh của tôi đã thành ảnh đẹp dùng được chưa?"
- Mật độ: LOW

## 2. Hiện trạng (audit)
- API: `POST /api/v1/product-photo` → `I1` · `GET /api/v1/product-photo/:id` → `G1` · `GET /api/v1/usage/summary` → `G8` (không có quyền thì không hiện số dư)
- Lỗi đã sửa: client đọc `data.jobId`/`data.status` nhưng API trả `{ job_id }` và kết quả phẳng → công cụ không bao giờ ra kết quả (sửa cả bản cũ qua `product-photo-flow-logic.ts`)
- Trước pilot: nhãn "Công cụ 01", "AI Provider"; `alert()` báo "đã lưu"; vòng hỏi trạng thái không giới hạn, không dừng khi rời trang; không khôi phục khi tải lại; không báo chi phí
- axe trước (390px): A15 — tương phản `FeatureGuidanceCard` 2,98:1 (đã sửa PD5)

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Vùng tải ảnh, trạng thái tác vụ, ảnh kết quả | khung nhìn đầu |
| L1 Hành động | "Tạo ảnh sản phẩm" + chi phí credit dự kiến & số còn lại | ngay dưới ảnh đã chọn |
| L2 Ngữ cảnh | Đánh giá chất lượng (QC), so sánh trước/sau | trong khung kết quả |
| L3 Chi tiết | Phông nền, tỉ lệ khung, ghi chú cho AI | "Tùy chọn phông nền & tỉ lệ khung hình" (đóng mặc định) |
| SYS | Tải lên kho, tạo job, idempotency, hỏi trạng thái ≤ 5 phút, nhớ job theo tổ chức | chỉ thể hiện qua `TaskStatus` |

## 4. Hành động
- Chính (1): "Tạo ảnh sản phẩm" → tạo tác vụ nền
- Phụ: "Tải về", "Sử dụng ảnh này", "Tạo ảnh khác", "Thử lại" (khi lỗi thử lại được)

## 6. Trạng thái
`idle` → `submitting` → `queued` → `running` → `succeeded` | `failed` (thử lại được / cần làm việc khác — ví dụ quá 5 phút chưa xong). Không có phần trăm (backend không báo tiến độ).

## 7. Responsive
390px: nút chính và chi phí xếp dọc, nút cao 56px.

## 15. Progressive disclosure & rủi ro (03c)
Pattern dùng: UX-P01, UX-P03, UX-P04, UX-P05, UX-P06, UX-P12
| Trường/nút/thông tin | Tầng | Lý do | Điều kiện hiện | Rủi ro | Cách xác minh |
|---|---|---|---|---|---|
| Vùng tải ảnh | L0 | Bắt đầu việc | luôn | R1 | E2E |
| Tạo ảnh sản phẩm | L1 | Hành động chính | đã chọn ảnh | R2 (tốn credit) | unit `product-photo-flow-logic.test.ts` |
| Chi phí credit | L1 | UX-019 | đã chọn ảnh | — | `CostPreview` test |
| Phông nền / tỉ lệ / ghi chú | L3 | Mặc định tự động đủ cho phần lớn ca | mở "Tùy chọn…" | R1 | `aria-expanded` |
| Thử lại | L1 | Phục hồi | lỗi thử lại được | R2 | `TaskStatus` test |

Chi phí AI (UX-019): báo mức tối đa 3 credit (bộ máy đám mây) — "dự kiến" · quyền/gói (UX-018): khoá công cụ theo gói do server trả `ENTITLEMENT_REQUIRED` · ngoại lệ: không.
