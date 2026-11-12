---
id: SCR-STORE-don-hang
tier: STORE
module: orders
route: /don-hang
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 <h1> đúng 20px (text-display)
  - Tối đa 1 nút chính (primary button) theo K2
  - Quản lý đơn hàng đa nguồn theo vai (Lead, Sale, Duyệt, Điều phối, Tất cả)
  - Đầy đủ 6 trạng thái UI
  - Chuyển đổi linh hoạt giữa Kanban (desktop) và danh sách lọc (mobile)
---

# Screen Contract — Quản lý Đơn hàng & Vận hành Xưởng (`/don-hang`)

**Tuyến:** `/don-hang` · **Tệp chính:** `src/app/(app)/don-hang/page.tsx` · **Cập nhật:** 31/10/2026 (mục Đơn hàng theo vai — Đơn hàng đa nguồn P4) · **Thẻ:** T5.B2

## 0. Cập nhật 31/10/2026 — mục Đơn hàng theo vai (Đơn hàng đa nguồn P4)
SSOT: `docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §6. Archetype: bảng làm việc nhiều khu (tab nhóm nút `aria-pressed`, không `role="tab"`).

| Tab | Hiện khi | Nội dung | Thẻ chào |
|---|---|---|---|
| Khách tiềm năng | `Q1` | `LeadQueueTab` — `GET /orders/lead-queue`; nút "Mở để chăm" sang `/thu-hut-khach` hoặc `/the-chao?tab=sales` | Phiên chưa đặt — chỉ xem |
| Sale chăm sóc | `R2` | "Đơn từ nguồn khác": `WorkbenchList mode="sale"` (Báo giá `R15`, Giao trước thu sau `R2`) · "Thẻ chào": `SalesBrochureTab` | Nhúng nguyên vẹn |
| Phê duyệt | `R11` hoặc `R16` | "Chờ duyệt giao trước, thu sau" (`R16`) + "Hạn mức Sale tự quyết" (thu gọn, `F2`) · "Xác nhận tiền — đơn nguồn khác" (`R11`) · "Thẻ chào": `AdminBrochurePaymentTab` (`R11`) | Nhúng nguyên vẹn |
| Điều phối | `R4` hoặc `R5` | "Thẻ chào": `CoordinatorBrochureTab` · "Đơn nguồn khác": `CoordinationQueueList` (`GET /orders/coordination-queue`) + lối sang Tháp điều phối | Nhúng nguyên vẹn |
| Tất cả | luôn | `AllOrdersTab` — kanban 4 cột / lọc trên điện thoại (tách nguyên từ trang cũ) | — |

- Mở mặc định theo vai (`role-tabs.ts`): Điều hành → Phê duyệt · Điều phối → Điều phối · Sale → Khách tiềm năng; `?tab=` đè nếu người xem có tab đó.
- Thay 3 tab cũ "Tất cả đơn hàng" / "Link đặt hoa" / "Duyệt thanh toán". Header (nút chính "Tạo đơn") giữ nguyên.
- Trạng thái mỗi khu: khung xương khi tải · `InlineError` có thử lại · `EmptyState` · dòng `role="status"` báo kết quả thao tác.
- Chưa kiểm: `npm run ux:audit` 390/1280px (cần dev server + database `_test`), bàn phím, đọc màn hình.

## 1. Vai và mục đích
- **Vai chính (03b):** `florist`, `store_manager`, `sales`, `delivery_lead`.
- **Phạm vi:** organization (điều phối sản xuất cắm hoa và giao vận đơn hàng).
- **Việc chính:** Theo dõi luồng đơn hàng từ khi tiếp nhận → phân công cắm hoa → đóng gói vận chuyển → giao hàng hoàn tất.
- **Câu hỏi chính:** "Đơn nào cần tôi làm tiếp?" → **Nút chính:** "Tạo đơn mới".
- **Mật độ:** MEDIUM-HIGH (Kanban 4 cột trên desktop, danh sách có tab trạng thái trên mobile).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/orders` → `R1` (`order.read`)
  - `POST /api/v1/orders` → `R2` (`order.create`)
  - `GET /api/v1/orders/:id` → `R1`
  - `PATCH /api/v1/orders/:id` → `R3` (`order.update`)
- **Khối chính:**
  - Header chuẩn: 1 nút chính "Tạo đơn mới", 2 nút phụ "Làm mới", "Trang chủ".
  - Feature guidance card: `OrderGuidanceCard`.
  - Bộ lọc & tìm kiếm nhanh: ô input tìm kiếm theo mã đơn, tên người nhận, SĐT.
  - Lọc nâng cao (`OrderAdvancedFilters`, checklist ALG 4.3) ở tab Tất cả đơn và bảng Thẻ Chào của Điều hành: khoảng ngày giao, nhân viên bán (hiện khi có `F1`), chi nhánh (hiện khi tổ chức có từ 2 chi nhánh và có `F6`).
  - Chi tiết đơn có khối "Thông tin cần bổ sung" (checklist ALG 4.14) và nút In mở `/in-phieu/[id]` (phiếu xưởng A6, băng rôn).
  - Vùng hiển thị đơn hàng: 4 cột Kanban trên Desktop (`lg:`), Danh sách phân tab trạng thái trên Mobile (< `lg:`).
- **Trạng thái:** Tải (`loading`), Rỗng (`EmptyState` kèm nút hành động "Tạo đơn mới"), Modals (`CreateOrderModal`, `OrderDetailModal`).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header trang, Nút chính "Tạo đơn mới", Thanh tìm kiếm & bộ lọc | Đỉnh trang |
| L1 Luồng công việc | 4 trạng thái: 1. Mới tiếp nhận, 2. Đang cắm hoa, 3. Vận chuyển, 4. Hoàn tất / Đã giao | 4 cột Kanban hoặc Tab chọn lọc trên mobile |
| L2 Thẻ đơn hàng | Mã đơn, người nhận, địa chỉ, món hoa chính, thiệp chúc mừng, tổng tiền VND | Trong từng cột / danh sách |
| L3 Chi tiết & SLA | Modal chi tiết đơn, BOM danh mục hoa, tiến độ SLA | Mở qua `OrderDetailModal` |

## 4. Hành động
- **Chính:** "Tạo đơn mới" (`variant="primary"`).
- **Phụ:** "Làm mới" (`variant="outline"`), "Trang chủ" (`variant="ghost"`).
- **Tương tác thẻ:** Mỗi thẻ đơn hàng là một `<button type="button">` có `min-h-11`, nhấp để mở `OrderDetailModal`.

## 5. Responsive
- **390px (Mobile):** Tự động chuyển đổi từ bảng Kanban 4 cột thành thanh Tab viên thuốc chọn trạng thái (`Tất cả`, `Mới`, `Đang cắm`, `Vận chuyển`, `Hoàn tất`) kèm số lượng đơn, hiển thị dạng danh sách thẻ dọc chạm thao tác dễ dàng bằng một tay.
- **1280px (Desktop):** Lưới Kanban 4 cột (`lg:grid lg:grid-cols-4`) trực quan, hỗ trợ điều phối toàn diện xưởng hoa.

## 6. Trợ năng
- Toàn bộ thẻ đơn hàng là thẻ `<button type="button">` có `min-h-11`, `focus-visible:outline-2 focus-visible:outline-primary`.
- Không sử dụng màu sắc đơn độc để biểu thị trạng thái (kết hợp nhãn chữ và số đếm rõ ràng).
- Biểu tượng trang trí có `aria-hidden="true"`.

## 7. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho Florist, Store Manager, Sales |
| Việc | PASS | Trả lời "Đơn nào cần tôi làm tiếp?" |
| IA | PASS | Khung Kanban 4 cột -> Chi tiết đơn |
| Mật độ | PASS | 390px tab lọc, 1280px 4 cột |
| Thứ bậc | PASS | Tiêu đề -> Tìm kiếm -> Bảng điều phối |
| CTA | PASS | Tạo đơn mới là nút chính duy nhất |
| Luồng | PASS | /don-hang -> Chi tiết đơn modal -> Cập nhật |
| Trạng thái | PASS | Tải, rỗng có nút đi tiếp, chi tiết |
| Responsive | PASS | 390px dạng tab lọc, 1280px 4 cột hoàn hảo |
| Trợ năng | PASS | Button đạt touch target ≥ 44px, focus visible |
| Dữ liệu | PASS | Kết nối API Orders thật |
| Quyền | PASS | Gating theo R1, R2, R3 |
| Nhất quán | PASS | 100% token Semantic, font token chuẩn |

## Thay đổi Đợt 4 (12/11/2026)

- Hàng nút đầu trang cho xuống dòng, chữ trong nút không gãy (VD-03 ở 390px). Huy hiệu biên lai chưa có kết quả AI ghi "Có ảnh bill" thay cho "Đang đọc bill" (D4-14).
