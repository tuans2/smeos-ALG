---
id: SCR-MOTHER-van-hanh-truong-du-lieu
tier: MOTHER
module: van-hanh
route: /van-hanh/truong-du-lieu
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

# Screen Contract — Trường dữ liệu (`/van-hanh/truong-du-lieu`)

> **Nơi nhập giá trị trường tự tạo (12/11/2026, audit L-09):** `ORDER` — form tiếp nhận đơn điều phối, chi tiết đơn (`PATCH /api/v1/coordinator/orders/:id/custom-fields`); `PARTNER` — form tạo đối tác gia công (`POST /api/v1/coordinator/partners`, sửa qua `PATCH /api/v1/coordinator/partners/:id`, trộn vào giá trị cũ).

**Mã màn:** `SCR-MOTHER-van-hanh-truong-du-lieu` · **Tuyến:** `/van-hanh/truong-du-lieu` · **Tầng:** `MOTHER` · **Bố cục:** `B` · **Tệp chính:** `src/app/(platform)/van-hanh/truong-du-lieu/page.tsx`

Đặc tả nghiệp vụ chi tiết: [`van-hanh.md`](./van-hanh.md). Tệp này là front-matter v2 cho `check:screen-contracts`; hiện trạng dưới đây đo bằng đọc mã ngày 05/11/2026, không phải kiểm chạy thật.

## Hiện trạng đo từ mã

| Mục | Hiện trạng |
|---|---|
| Đầu trang | PageHeader |
| Số `variant="primary"` trong trang và mọi thành phần nó dùng (gộp cả tab, hộp thoại — không phải số nút trên một màn) | 0 |
| Trạng thái đang tải | có |
| Trạng thái rỗng (`EmptyState`) | **chưa thấy trong mã** |
| Trạng thái lỗi | có |
| Chặn quyền / không tìm thấy trong mã trang (layout và API có thể chặn thêm) | **chưa thấy trong mã** |

## Chưa kiểm
- Ảnh mốc 390×844 và 1280×800, quét axe, bàn phím, đọc màn hình: chưa có ca trong `tests/e2e/ux` cho tuyến này.
