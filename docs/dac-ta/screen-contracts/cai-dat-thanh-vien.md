---
id: SCR-STORE-cai-dat-thanh-vien
tier: STORE
module: cai-dat
route: /cai-dat/thanh-vien
archetype: F
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Cài Đặt Tiệm & Cấu Hình Hoạt Động (`/cai-dat/thanh-vien`)

**Mã màn:** `SCR-STORE-cai-dat-thanh-vien` · **Tuyến:** `/cai-dat/thanh-vien` · **Tầng:** `STORE` · **Bố cục:** `F` · **Tệp chính:** `src/app/(app)/cai-dat/thanh-vien/page.tsx`

Đặc tả nghiệp vụ chi tiết: [`cai-dat.md`](./cai-dat.md). Tệp này là front-matter v2 cho `check:screen-contracts`; hiện trạng dưới đây đo bằng đọc mã ngày 05/11/2026, không phải kiểm chạy thật.

## Hiện trạng đo từ mã

| Mục | Hiện trạng |
|---|---|
| Đầu trang | PageHeader |
| Số `variant="primary"` trong trang và mọi thành phần nó dùng (gộp cả tab, hộp thoại — không phải số nút trên một màn) | 5 (thêm nút gửi trong hộp thoại mời, UJ-14) |
| Trạng thái đang tải | có |
| Trạng thái rỗng (`EmptyState`) | **chưa thấy trong mã** |
| Trạng thái lỗi | có |
| Chặn quyền / không tìm thấy trong mã trang (layout và API có thể chặn thêm) | có |

## Điều hướng

- Mục menu "Đội ngũ & phân quyền" (Quản trị tiệm; chuỗi: Thiết lập chuỗi), quyền `F1`.
- Nút "Vai trò & quyền" ở đầu trang (chỉ khi có `F5`) mở `/cai-dat/thanh-vien/vai-tro` (checklist ALG 1.13).
- Nút phụ "Mời người đã có tài khoản" (cùng quyền với "Thêm nhân viên") mở hộp thoại mời — người được mời nhận ở mục "Tổ chức của tôi" trong menu tài khoản, hạn 14 ngày (audit hành trình UJ-14, 07/11/2026). Email chưa có tài khoản → API trả lời chỉ sang "Thêm nhân viên".

## Chưa kiểm
- Ảnh mốc 390×844 và 1280×800, quét axe, bàn phím, đọc màn hình: chưa có ca trong `tests/e2e/ux` cho tuyến này.
