---
id: SCR-STORE-cai-dat-thanh-vien-vai-tro
tier: STORE
module: cai-dat
route: /cai-dat/thanh-vien/vai-tro
archetype: F
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Vai trò & quyền (`/cai-dat/thanh-vien/vai-tro`)

**Mã màn:** `SCR-STORE-cai-dat-thanh-vien-vai-tro` · **Tuyến:** `/cai-dat/thanh-vien/vai-tro` · **Tầng:** `STORE` · **Bố cục:** `F` ·
**Tệp chính:** `src/app/(app)/cai-dat/thanh-vien/vai-tro/page.tsx`, `src/components/organization/custom-roles-manager.tsx`

Checklist ALG 1.13. Mở từ nút "Vai trò & quyền" ở màn Đội ngũ & phân quyền (chỉ hiện khi có `F5`).

## Vai và mục đích

Điều hành tạo vai trò riêng của cửa hàng và chọn việc vai đó được làm. Vai mới khởi đầu không có quyền.

## Thứ bậc thông tin

1. Đầu trang: nút quay lại Đội ngũ, tiêu đề, mô tả.
2. Ô "Tên vai trò" + nút "Tạo vai trò".
3. Cột trái: danh sách vai riêng (tên, số quyền); dòng liệt kê vai có sẵn của hệ thống (chỉ đọc).
4. Cột phải khi chọn một vai: nút chính "Lưu quyền (n thay đổi)"; ghi chú các việc chỉ dành cho Điều hành; danh sách nhóm quyền thu
   gọn (tên nhóm, số quyền đang bật / tổng), mở một nhóm hiện công tắc từng quyền theo nhãn tiếng Việt.

## Dữ liệu và quyền

`GET /api/v1/roles` (`F1`), `POST /api/v1/roles` (`F5`), `PATCH /api/v1/roles/:id/capabilities` (`F5`). Quyền có trần cứng không hiện
trong danh sách (`src/modules/organization/domain/custom-role-editor.ts`); máy chủ từ chối cả yêu cầu nếu có mã vượt trần. Không có
quyền `F5` → trạng thái không quyền.

## Trạng thái

Đang tải (khung xương), lỗi tải (thông báo + thử lại bằng tải lại trang), chưa có vai riêng ("Chưa có vai trò riêng."), chưa chọn vai.

## Chưa kiểm

Ảnh mốc 390×844 và 1280×800, quét axe, bàn phím: chưa có ca trong `tests/e2e/ux` cho tuyến này.
