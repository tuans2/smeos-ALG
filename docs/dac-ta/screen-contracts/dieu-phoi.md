---
id: SCR-CHAIN-dieu-phoi
tier: CHAIN
module: coordinator
route: /dieu-phoi
archetype: B
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Hiển thị Control Tower điều phối đơn hàng và brochure order
  - Hỗ trợ phân bổ đơn về các chi nhánh hoặc xưởng vệ tinh
  - Thanh nhắc nghiệp vụ điều phối (M0..M5) phản hồi trạng thái thực tế
---

# Screen Contract — Trung Tâm Điều Phối Đơn Hàng (`/dieu-phoi`)

> **Trạng thái production (12/11/2026, audit L-03):** tuyến thuộc tiền tố khoá `/dieu-phoi` trong `LOCKED_ROUTE_PREFIXES` (`src/lib/feature-lock.ts`). `src/app/(app)/dieu-phoi/layout.tsx` bọc `FeatureLockedGuard`, nên khi `NEXT_PUBLIC_APP_ENV=production` cả URL gõ thẳng cũng hiện màn "Sắp ra mắt" (trước đây chỉ làm mờ mục sidebar). Bản giao GD1 không đặt biến này nên không bị khoá.

**Tuyến:** `/dieu-phoi` · **Tệp chính:** `src/app/(app)/dieu-phoi/page.tsx` · **Cập nhật:** 02/11/2026 · **Thẻ:** M4-02

## 1. Vai và mục đích
- **Vai chính:** `coordinator`, `operations_manager`, `store_manager`
- **Phạm vi:** chain (toàn mạng lưới chuỗi và chi nhánh)
- **Việc chính:** Điều phối phân bổ đơn hàng, theo dõi tiến độ gia công và giao hàng, can thiệp khi có tắc nghẽn hoặc trễ hạn.
- **Archetype:** B (Danh sách / ListLayout).

## 2. Hiện trạng & API
- **API:**
  - `GET /api/v1/coordinator/orders`
  - `POST /api/v1/coordinator/dispatch`
  - `GET /api/v1/greeting-card/coordinator-board`
- **Quyền:** Điều phối `R3`, `R4`, `R5`.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Thanh nhắc nghiệp vụ (CoordinatorReminderBar), Đơn cần xử lý gấp | Đỉnh trang |
| L1 Hành động | Tiếp nhận đơn mới, Phân bổ đơn, Đổi chi nhánh gia công | PageHeader & Thẻ đơn |
| L2 Ngữ cảnh | Tab chuyển đổi Control Tower vs Brochure Orders | Tab switcher |
| L3 Chi tiết | Bảng chi tiết trạng thái, shipper, tiến độ gia công | Lưới thẻ đơn / Modal |

## 4. Trạng thái
- **Tải:** Skeleton loading cho bảng điều phối.
- **Rỗng:** Thông báo không có đơn hàng nào cần điều phối lúc này.
- **Lỗi:** Thông báo lỗi kèm nút thử lại.
