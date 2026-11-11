---
id: SCR-MOTHER-van-hanh-thong-bao
tier: MOTHER
module: notification
route: /van-hanh/thong-bao
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

# Screen Contract — Bảng Điều Khiển Vận Hành Nền Tảng (SaaS Mother) (`/van-hanh/thong-bao`)

**Mã màn:** `SCR-MOTHER-van-hanh-thong-bao` · **Tuyến:** `/van-hanh/thong-bao` · **Tầng:** `MOTHER` · **Bố cục:** `F` · **Tệp chính:** `src/app/(platform)/van-hanh/thong-bao/page.tsx`

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

## Khối "Kênh liên lạc" (11/11/2026, checklist 4.30)

Dưới thẻ hướng dẫn, trên bộ lọc ma trận: mỗi kênh SMS / Zalo / Thông báo trên trình duyệt một thẻ.
- L0 luôn thấy: tên kênh, trạng thái bằng lời (Chưa kết nối · Đã kết nối, đang tắt · Đang dùng · Đã lưu khoá, chưa gửi được), công tắc "Dùng cho cả hệ thống". Công tắc khoá khi chưa kết nối hoặc kênh chưa gửi được, kèm câu nói rõ điều kiện (UX-017).
- `Disclosure` "Thông số <nhà cung cấp>": ô theo sổ nhà cung cấp; ô khoá kiểu mật khẩu, không bao giờ hiện giá trị đã lưu ("Đã lưu, bỏ trống để giữ"); "Lưu thông số"; "Gỡ kết nối" qua `ConfirmDialog` (R3); "Gửi thử" tới số nhập vào khi kênh đã kết nối.
- Tải: khung xương; lỗi: `InlineError` có thử lại; không quyền `N2`: API trả 403, khối hiện lỗi.
- API: `GET/PUT /api/v1/platform/notification/providers`, `POST /api/v1/platform/notification/providers/test`, `PATCH /api/v1/platform/notification/channels`.
- Audit: `scripts/ux-audit/scenarios/van-hanh-thong-bao.mjs`, 390/1280px, axe sạch (`docs/design-system/audit-log.md`, KLL-01…04).

## Chưa kiểm
- Ảnh mốc 390×844 và 1280×800 trong `tests/e2e/ux`: chưa có ca cho tuyến này (khối Kênh liên lạc đã chụp và quét axe bằng `ux:audit`). Bàn phím, đọc màn hình: chưa kiểm.
