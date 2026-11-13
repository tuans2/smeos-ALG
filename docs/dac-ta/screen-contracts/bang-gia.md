---
id: SCR-STORE-bang-gia
tier: STORE
module: promotions
route: /bang-gia
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

# Screen Contract — Bảng giá sản phẩm

**Tuyến:** `/bang-gia`, `/bang-gia/:id` · **Tệp chính:** `src/components/promotions/price-lists-client.tsx`, `price-list-document.tsx` · **Cập nhật:** 30/10/2026 · **Thẻ:** công cụ #65

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh` · Vai phụ: `sale`, `marketing` (xem `L1`), sửa cần `L3`
- Phạm vi: organization
- Việc chính: tạo bảng giá từ giá đang bán để gửi khách hoặc in.
- Câu hỏi chính: "Bảng giá nào đang dùng và in ra trông thế nào?"
- Mật độ: LOW
- Archetype: B Danh sách · C Chi tiết (trang xem/in)

## 2. Hiện trạng
- API: `GET · POST /api/v1/price-lists` → `L1` · `L3`; `GET · PUT · PATCH · DELETE /price-lists/:id` → `L1` · `L3`
- Nút primary: 1 (Tạo bảng giá / In hoặc lưu PDF) · FeatureGuidanceCard: 1 · Modal: tạo/sửa, xác nhận xoá (`ConfirmDialog`)
- Trạng thái: tải ☑ rỗng ☑ lỗi ☑ không quyền (ẩn nút sửa khi thiếu `L3`) ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí |
|---|---|---|
| L0 | Tên bảng giá, trạng thái, phạm vi loại sản phẩm | khung nhìn đầu |
| L1 | Tạo bảng giá · Xem và in · công tắc Đang dùng | khung nhìn đầu |
| L2 | Sửa · Xoá | trên thẻ |
| L4 | Tiêu đề in, ghi chú, thời hạn, hiện giá cao điểm, in kèm ưu đãi | `Disclosure` trong biểu mẫu |

## 6. Trạng thái
tải: khung xương · rỗng: "Chưa có bảng giá nào" + nút tạo · lỗi: InlineError + Thử lại · trang in không có sản phẩm: EmptyState dẫn về Quản lý sản phẩm · bảng giá đang tắt/hết hạn: nhãn trạng thái trên trang in

## 7. Responsive
390px: danh sách xếp dọc, bảng giá một cột · in: ẩn điều hướng (`print:hidden`), nhóm không bị cắt giữa trang (`break-inside-avoid`)

## 10. Dữ liệu và quyền
nguồn sự thật: giá từ `products.attributes.pricing` (không lưu giá thứ hai); cấu hình ở `pricing_rules` khoá `price_list:<id>` (chèn-chỉ); ưu đãi in kèm từ `listActiveShopPromotions`; tên loại mã cũ (BOUQUET…) đổi sang tiếng Việt · năng lực: `L1` xem, `L3` sửa

## 11. Component
dùng lại: `Dialog`, `Disclosure`, `ConfirmDialog`, `EmptyState`, `InlineError`, `FeatureGuidanceCard`, `Skeleton` · tạo mới: `ActiveSwitch`, `PromotionsHubNav`
