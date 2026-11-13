---
id: SCR-STORE-in-phieu-id
tier: STORE
module: orders
route: /in-phieu/[id]
archetype: C
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — /in-phieu/[id] (`/in-phieu/[id]`)

**Mã màn:** `SCR-STORE-in-phieu-id` · **Tuyến:** `/in-phieu/[id]` · **Tầng:** `STORE` · **Bố cục:** `C` · **Tệp chính:** `src/app/in-phieu/[id]/page.tsx`

Đặc tả nghiệp vụ chi tiết: [`in-phieu.md`](./in-phieu.md). Tệp này là front-matter v2 cho `check:screen-contracts`; hiện trạng dưới đây đo bằng đọc mã ngày 05/11/2026, không phải kiểm chạy thật.

## Hiện trạng đo từ mã

| Mục | Hiện trạng |
|---|---|
| Đầu trang | qua thành phần con |
| Số `variant="primary"` trong trang và mọi thành phần nó dùng (gộp cả tab, hộp thoại — không phải số nút trên một màn) | 0 |
| Trạng thái đang tải | **chưa thấy trong mã** |
| Trạng thái rỗng (`EmptyState`) | **chưa thấy trong mã** |
| Trạng thái lỗi | có |
| Chặn quyền / không tìm thấy trong mã trang (layout và API có thể chặn thêm) | **chưa thấy trong mã** |

## Chưa kiểm
- Ảnh mốc 390×844 và 1280×800, quét axe, bàn phím, đọc màn hình: chưa có ca trong `tests/e2e/ux` cho tuyến này.
