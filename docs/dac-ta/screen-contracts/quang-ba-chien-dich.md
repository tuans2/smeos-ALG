---
id: SCR-STORE-quang-ba-chien-dich
tier: STORE
module: marketing-center
route: /quang-ba/chien-dich
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

# Screen Contract — Chiến dịch quảng bá | ALG (`/quang-ba/chien-dich`)

**Mã màn:** `SCR-STORE-quang-ba-chien-dich` · **Tuyến:** `/quang-ba/chien-dich` · **Tầng:** `STORE` · **Bố cục:** `B` · **Tệp chính:** `src/app/(app)/quang-ba/chien-dich/page.tsx`

Đặc tả nghiệp vụ chi tiết: [`chien-dich.md`](./chien-dich.md). Tệp này là front-matter v2 cho `check:screen-contracts`; hiện trạng dưới đây đo bằng đọc mã ngày 05/11/2026, không phải kiểm chạy thật.

## Hiện trạng đo từ mã

| Mục | Hiện trạng |
|---|---|
| Đầu trang | qua thành phần con |
| Số `variant="primary"` trong trang và mọi thành phần nó dùng (gộp cả tab, hộp thoại — không phải số nút trên một màn) | 3 |
| Trạng thái đang tải | có |
| Trạng thái rỗng (`EmptyState`) | có |
| Trạng thái lỗi | có |
| Chặn quyền / không tìm thấy trong mã trang (layout và API có thể chặn thêm) | **chưa thấy trong mã** |

## Chưa kiểm
- Ảnh mốc 390×844 và 1280×800, quét axe, bàn phím, đọc màn hình: chưa có ca trong `tests/e2e/ux` cho tuyến này.
