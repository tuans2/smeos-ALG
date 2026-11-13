---
id: SCR-CHAIN-dieu-phoi-doi-tac
tier: CHAIN
module: chain-partnership
route: /dieu-phoi/doi-tac
archetype: B
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Hiển thị danh bạ chi nhánh, xưởng gia công vệ tinh trong chuỗi
  - Tìm kiếm và lọc theo tên, mã đối tác, người liên hệ
  - Hỗ trợ cấp tài khoản, cấp lại mật khẩu và cấu hình ma trận công cụ
---

# Screen Contract — Danh Bạ Chi Nhánh & Đối Tác Chuỗi (`/dieu-phoi/doi-tac`)

> **Trạng thái production (12/11/2026, audit L-03):** tuyến thuộc tiền tố khoá `/dieu-phoi` trong `LOCKED_ROUTE_PREFIXES` (`src/lib/feature-lock.ts`). `src/app/(app)/dieu-phoi/layout.tsx` bọc `FeatureLockedGuard`, nên khi `NEXT_PUBLIC_APP_ENV=production` cả URL gõ thẳng cũng hiện màn "Sắp ra mắt" (trước đây chỉ làm mờ mục sidebar). Bản giao GD1 không đặt biến này nên không bị khoá.

**Tuyến:** `/dieu-phoi/doi-tac` · **Tệp chính:** `src/app/(app)/dieu-phoi/doi-tac/page.tsx` · **Cập nhật:** 02/11/2026 · **Thẻ:** M4-02

## 1. Vai và mục đích
- **Vai chính:** `coordinator`, `operations_manager`, `chain_admin`
- **Phạm vi:** chain (mạng lưới chi nhánh & xưởng gia công)
- **Việc chính:** Quản lý danh bạ các chi nhánh thành viên và xưởng gia công, cấp thông tin đăng nhập và phân quyền ma trận công cụ.
- **Archetype:** B (Danh sách / ListLayout).

## 2. Hiện trạng & API
- **API:**
  - `GET /api/v1/chain-partnerships`
  - `POST /api/v1/chain-partnerships`
  - `PATCH /api/v1/chain-partnerships/:id`
- **Quyền:** Quản lý đối tác chuỗi `R3`/`R4`.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Danh sách chi nhánh, mã đối tác, địa chỉ, hotline | Lưới thẻ chi nhánh |
| L1 Hành động | Thêm đối tác, Phân quyền công cụ, Đổi mật khẩu | PageHeader & Nút trên thẻ |
| L2 Ngữ cảnh | Thanh tìm kiếm chi nhánh, tổng số đối tác | Thanh công cụ |
| L3 Chi tiết | Ma trận phân quyền công cụ (PartnerToolMatrixModal) | Modal popup |

## 4. Trạng thái
- **Tải:** Skeleton placeholder khi tải danh bạ.
- **Rỗng:** Thông báo chưa có chi nhánh kèm nút "Thêm đối tác".
- **Thành công:** Lưới thẻ đối tác tương tác.
