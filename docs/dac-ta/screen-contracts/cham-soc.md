---
id: SCR-STORE-cham-soc
tier: STORE
module: care-cards
route: /cham-soc
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

# Screen Contract — Chăm sóc khách hàng (Customer Care)

**Tuyến:** `/cham-soc` · **Tệp chính:** `src/app/(app)/cham-soc/page.tsx`, `src/components/marketing-center/care/`, `src/components/care-cards/` · **Cập nhật:** 01/11/2026 (PO 01/11/2026, PR-5) · **Thẻ:** Module 05 Chăm sóc · **Asset:** #48, #49, #50, #51, #52, #55 (Đã nâng lên Sẵn)

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh`, `marketing` · Vai phụ: `sale`, `dieu_phoi`
- Quyền năng lực: `M4` (`crm.segment.manage` — tạo và quản lý nhóm khách, ghi nhận chăm sóc), `Q1` (`crm.customer.read` — xem danh sách và nhật ký)
- Phạm vi: organization (cách ly tenant)
- Việc chính: chọn phân nhóm khách hàng theo RFM và điều kiện đồng ý kênh, chọn mục tiêu chăm sóc (sau mua, sinh nhật, quay lại, bảo quản), tùy biến thiệp trang trọng và gửi thủ công từng khách kèm ghi nhận tương tác.
- Câu hỏi chính: "Hôm nay cần chăm sóc những ai, gửi lời nhắn gì và đã ghi nhận tương tác chưa?"
- Mật độ: MEDIUM
- Archetype: C Biểu mẫu tạo / Xem trước trực tiếp · B Danh sách gửi & nhật ký tương tác

## 2. Luồng nghiệp vụ
1. **Bước 1 — Chọn mục tiêu chăm sóc:**
   - Sau mua hàng (`AFTER_PURCHASE`): thiệp cảm ơn #49.
   - Sinh nhật & Dịp đặc biệt (`BIRTHDAY`): thiệp chúc mừng sinh nhật #50 kèm lời chúc và voucher.
   - Mời quay lại (`WIN_BACK`): thẻ quà tặng điện tử #52 cho khách lâu chưa ghé.
   - Kỷ niệm đồng hành (`ANNIVERSARY`): thiệp tri ân #51.
   - Hướng dẫn bảo quản (`CARE_GUIDE`): thẻ hướng dẫn #55 giúp giữ sản phẩm bền đẹp.
2. **Bước 2 — Chọn phân nhóm khách hàng:**
   - Chọn từ các nhóm khách hàng động hoặc tĩnh trong hệ thống (`customer_segments`), hoặc chọn toàn bộ khách.
   - Hỗ trợ tạo nhóm mới ngay tại chỗ qua modal với các tiêu chí: phân hạng RFM (VIP, Gold, Silver, Bronze, New), ngưỡng chi tiêu, số đơn, dịp kỷ niệm sắp tới và kênh đồng ý nhận tin.
   - Bộ đánh giá tự động loại bỏ các khách hàng chưa cấp quyền hoặc đã thu hồi quyền tiếp thị (`customer_consents`).
3. **Bước 3 — Tùy chỉnh thiệp & lời nhắn:**
   - Xem trước trực tiếp tấm thiệp (`CareCardPreview`) với phong cách trang nhã, màu sắc chủ đạo, thương hiệu tiệm và thông tin cá nhân hóa.
   - Tùy chỉnh tiêu đề, lời nhắn, chữ ký và mã quà tặng (nếu có).
   - Nút "Sao chép lời nhắn" hỗ trợ lấy nội dung văn bản đầy đủ kèm thông tin ưu đãi.
4. **Bước 4 — Gửi thủ công & Ghi nhận tương tác:**
   - Danh sách khách hàng thoả mãn điều kiện hiển thị rõ tên, số điện thoại, hạng khách và trạng thái gửi.
   - Nút "Sao chép tin" (tự động điền tên riêng từng khách).
   - Nút "Mở Zalo" (`zalo.me/...`) và "Gọi" (`tel:...`) để nhân viên chủ động liên hệ.
   - Nút "Đánh dấu đã gửi": gọi API ghi nhận bản ghi vào `customer_interactions` và hiển thị badge "Đã gửi" tức thì.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí |
|---|---|---|
| L0 | Tiêu đề trang, nút quay lại công cụ, tab chuyển đổi (Gửi chăm sóc / Nhật ký tương tác) | Header dính |
| L1 | Chọn mục tiêu chăm sóc (5 mục tiêu) & Chọn phân nhóm khách | Hàng trên (Bước 1 & Bước 2) |
| L2 | Trình thiết kế thiệp chăm sóc và xem trước trực tiếp | Khối giữa (Bước 3) |
| L3 | Danh sách khách hàng, thao tác gửi và nút "Đánh dấu đã gửi" | Khối dưới (Bước 4) |

## 4. Dữ liệu và quyền
- Bảng CSDL: `customer_segments`, `customer_interactions`, `customers`, `customer_consents`.
- API danh sách khách: nhóm "Tất cả khách" đọc `GET /api/v1/customers` (con trỏ, `M4` hoặc `Q1` — audit L-04, 12/11/2026); nhóm cụ thể đọc `GET /api/v1/customer-segments/:id/customers`.
- Quyền: `M4` (quản lý phân nhóm và ghi nhận chăm sóc), `Q1` (đọc thông tin khách hàng và nhật ký).
- Chốt chặn: Khách không đồng ý nhận tin qua kênh điện tử sẽ không xuất hiện trong danh sách gửi của kênh đó.
