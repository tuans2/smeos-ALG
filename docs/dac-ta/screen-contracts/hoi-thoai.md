---
id: SCR-STORE-hoi-thoai
tier: STORE
module: organization
route: /hoi-thoai
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

# Screen Contract — AI Chat Assistant & Hội Thoại Bán Hàng (`/hoi-thoai`, `/hoi-thoai/kenh-tich-hop`)

**Tuyến:** `/hoi-thoai`, `/hoi-thoai/kenh-tich-hop` · **Tệp chính:** `src/app/(app)/hoi-thoai/page.tsx`, `kenh-tich-hop/page.tsx`, `channel-config-modal.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T5.B4

## 1. Vai và mục đích
- **Vai chính (03b):** `sales`, `store_manager`, `marketer`.
- **Phạm vi:** organization (đàm thoại tư vấn bán hàng đa kênh bằng AI và chốt đơn 1-chạm).
- **Việc chính:** Tiếp nhận và trả lời khách hàng trên đa kênh (Web, Facebook, Zalo), theo dõi gợi ý mẫu hoa từ AI và đẩy đơn hàng nháp trực tiếp sang xưởng sản xuất.
- **Câu hỏi chính:** "Hội thoại nào đang chờ trả lời?" → **Nút chính:** "Cuộc trò chuyện mới".
- **Mật độ:** MEDIUM (2 cột danh sách hội thoại + khung chat tin nhắn).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/chat/conversations` → `chat.read`
  - `POST /api/v1/chat/conversations` → `chat.create`
  - `GET /api/v1/chat/conversations/:id/messages` → `chat.read`
  - `POST /api/v1/chat/conversations/:id/messages` → `chat.send`
  - `POST /api/v1/chat/quick-order` → `order.create`
  - `GET /api/v1/chat/channels` → `channel.read`
  - `PATCH /api/v1/chat/channels/:channel` → `channel.update`
- **Khối chính:**
  - Header: Nút chính "Cuộc trò chuyện mới", Nút phụ "Tích Hợp Đa Kênh".
  - FeatureGuidanceCard chuẩn hóa (tối đa 1 khối, 3 tips, không spam).
  - Cột trái: Danh sách hội thoại kèm kênh (Web / Zalo) và thời gian.
  - Cột phải: Khung tin nhắn đàm thoại, gợi ý mẫu hoa và nút "Chốt đơn mẫu này".
  - Modal: `ChannelConfigModal` (dùng `Dialog` chuẩn ALG).
- **Trạng thái:** Tải (`loading`), Rỗng (`EmptyState`), Lỗi.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header trang, Nút chính "Cuộc trò chuyện mới", Cột danh sách hội thoại | Đỉnh trang & Cột trái |
| L1 Đàm thoại | Luồng tin nhắn giữa khách và AI trợ lý | Khung chat chính |
| L2 Mẫu hoa gợi ý | Thẻ mẫu hoa: ảnh đại diện, BOM cành hoa, giá tiền, nút 1-chạm chốt đơn | Tin nhắn phản hồi của AI |
| L3 Thông báo kết quả | Banner thông báo tạo đơn thành công kèm link mở bảng Đơn hàng | Đỉnh khu vực nội dung chính |

## 4. Hành động
- **Chính:** "Cuộc trò chuyện mới" (`variant="primary"`).
- **Phụ:** "Tích Hợp Đa Kênh" (`variant="outline"`).
- **Tương tác dòng:**
  - Nhấp vào một hội thoại trong danh sách để nạp tin nhắn.
  - Trên mobile (390px): Tự động chuyển toàn màn hình chat, có nút "Quay lại danh sách hội thoại" ở đầu view.
  - Nút "Chốt đơn mẫu này": Tạo ngay đơn hàng nháp sang xưởng hoa.

## 5. Responsive
- **390px (Mobile):** Khi người dùng nhấp chọn một hội thoại, danh sách bên trái được ẩn (`hidden md:flex`), toàn bộ khung nhìn dành riêng cho cửa sổ chat đàm thoại (`col-span-2 flex`), kèm nút "Quay lại danh sách" đạt chuẩn `min-h-11`.
- **1280px (Desktop):** Lưới 3 cột (`md:grid md:grid-cols-3`): 1 cột danh sách hội thoại + 2 cột cửa sổ chat hiển thị song song.

## 6. Trợ năng
- Toàn bộ nút và thẻ đàm thoại có touch target ≥ 44px (`min-h-11`), `focus-visible:outline-2 focus-visible:outline-primary`.
- Modal cấu hình kênh tích hợp chuyển sang component `Dialog` chuẩn có quản lý focus trap và phím Escape.
- Biểu tượng trang trí có `aria-hidden="true"`.

## 7. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho Sales, Store Manager, Marketer |
| Việc | PASS | Trả lời "Hội thoại nào đang chờ trả lời?" |
| IA | PASS | Danh sách hội thoại -> Cửa sổ chat -> Gợi ý chốt đơn |
| Mật độ | PASS | 1 FeatureGuidanceCard duy nhất (K1) |
| Thứ bậc | PASS | Danh sách -> Khung chat -> Gợi ý sản phẩm |
| CTA | PASS | Cuộc trò chuyện mới là nút chính duy nhất |
| Luồng | PASS | /hoi-thoai -> Chat AI -> 1-chạm chốt đơn -> /don-hang |
| Trạng thái | PASS | Tải, rỗng, thông báo chốt đơn thành công |
| Responsive | PASS | 390px mở toàn màn hình, desktop 2 cột |
| Trợ năng | PASS | Dialog chuẩn A11y, touch target ≥ 44px |
| Dữ liệu | PASS | Kết nối API Chat Headless AI thật |
| Quyền | PASS | Gating theo chat.read, order.create |
| Nhất quán | PASS | 100% token Semantic, font token chuẩn |
