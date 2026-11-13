---
id: SCR-STORE-lich-dang
tier: STORE
module: lich-dang
route: /lich-dang
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

# Screen Contract — Lịch Đăng Bài & Xuất Bản Đa Kênh

**Tuyến:** `/lich-dang` · **Tệp chính:** `src/app/(app)/lich-dang/page.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.C5

## 1. Vai và mục đích
- Vai chính (03b): `marketing_specialist`, `social_media_manager` · Vai phụ: `store_manager`
- Phạm vi: organization
- Việc chính: Quản lý lịch phát sóng, theo dõi hàng đợi bài đăng, xử lý các bài lỗi và lên lịch xuất bản tự động lên các kênh mạng xã hội theo khung giờ vàng.
- Câu hỏi chính: Hôm nay tiệm đăng gì, bài nào bị lỗi cần thử lại ngay, và lịch phát sóng đã được phủ kín các khung giờ vàng chưa?
- Mật độ: MEDIUM (giao diện phân bổ theo 4 tab chuyên biệt: Lịch tổng hợp, Hàng đợi, Đăng lại thông minh, Tự duyệt).

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/proxy/api/m07/posts?client=SOCIALFLOW` → Lấy danh sách bài viết
  - `POST /api/v1/proxy/api/m07/posts/batch-schedule` → Lên lịch hàng loạt bài viết
  - `POST /api/v1/proxy/api/m07/posts/[id]/retry` → Thử lại bài viết lỗi
  - `POST /api/v1/proxy/api/m07/posts/[id]/publish` → Xuất bản ngay tức thì
- Khối: 3 khối chính (Hướng dẫn K1 `PublishingGuidanceCard`, Lịch theo khung giờ / Hàng đợi, Báo cáo & Xem trước nền tảng thực tế)
- Nút primary: 1 (`Lên lịch bài` ở Top Action Header)
- FeatureGuidanceCard: 1 card duy nhất theo chuẩn K1 (`PublishingGuidanceCard`)
- Modal: `ScheduleConfirmModal` (chuẩn Base-UI Dialog, nút chọn khung giờ dùng `<button type="button" aria-pressed={...}>` theo T1.7)
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Danh sách bài lỗi cần xử lý ngay (03a UX-012), khung giờ đăng bài hôm nay | Đỉnh danh sách & Lịch tổng hợp |
| L1 Hành động | Lên lịch bài / Thử lại bài lỗi / Xuất bản ngay | Top Action Header & PostStatusReportCard |
| L2 Ngữ cảnh | Hướng dẫn khung giờ vàng K1, thông báo trạng thái kết nối tài khoản | PublishingGuidanceCard & banner trạng thái |
| L3 Chi tiết | Xem trước giao diện thực tế (Facebook, Insta, TikTok, Zalo), nội dung chi tiết bài viết | PlatformFeedPreview |
| L4 Nâng cao | Tự động duyệt bài, cấu hình đăng lại thông minh các bài tương tác cao | Tab Đăng lại thông minh & Tự duyệt |

## 4. Hành động
- Chính (1): `Lên lịch bài` (`variant: "default"` ở Top Action Header).
- Phụ (≤ 2):
  - `Làm mới` (`variant: "outline"`).
  - `Quay về Trang chủ` (`variant: "ghost"`).
  - Tác vụ con: `Thử lại bài viết` (khi gặp lỗi), `Xuất bản ngay`.
- Menu `…`: Không giấu nút chính vào menu ẩn.

## 5. Content budget
- Nút nổi trực tiếp: 1 nút primary + 2 nút outline/ghost.
- Khối chính: 3 khối (Hướng dẫn K1, Bộ lịch / Hàng đợi, Xem trước & Báo cáo).
- Nhóm thông tin: Trạng thái xuất bản (Bản nháp, Đã lên lịch, Đã xuất bản, Lỗi).

## 6. Trạng thái
- Tải: Spinner hiển thị nhẹ nhàng khi đồng bộ bài viết từ CSDL.
- Rỗng: Empty state hiển thị khi chưa có bài viết nào trong hàng đợi kèm nút chuyển sang Content Engine.
- Lỗi (03a UX-012): Các bài lỗi xuất bản được tự động ghim lên đầu danh sách với huy hiệu màu đỏ và nút "Thử lại" trực tiếp.
- Thành công: Thông báo toast màu xanh lá cây dịu mắt khi lên lịch hoặc xuất bản thành công.

## 7. Responsive
- 390px: Thanh tab cuộn ngang, Lịch khung giờ xếp dọc, khung xem trước thu gọn vừa màn hình mobile.
- 768px: Bố cục 1 cột tối ưu cuộn.
- 1280px+: Bố cục rộng rãi, khung xem trước hiển thị song song với báo cáo bài viết.

## 8. Trợ năng
- Bàn phím: Modal và các nút chọn khung giờ hỗ trợ Tab, Escape để đóng modal.
- Focus: `focus-visible:outline-2 focus-visible:outline-primary` trên toàn bộ nút.
- Nhãn: Toàn bộ nút có text rõ nghĩa. Các nút chọn khung giờ dùng `aria-pressed` theo T1.7.
- Vùng thông báo: Thông báo trạng thái thao tác qua toast rõ ràng.

## 9. AI
- Gợi ý: Gợi ý các khung giờ vàng tối ưu tương tác (8h30 sáng, 11h30 trưa, 19h30 tối).
- Tự động: Tự động đưa bài vào hàng đợi xuất bản và tự duyệt khi bật cấu hình.
- Cần duyệt: Nhân viên tiệm xác nhận thời điểm phát bài qua modal lên lịch.

## 10. Dữ liệu và quyền
- Nguồn sự thật: CSDL SocialFlow qua Core Proxy `/api/v1/proxy/api/m07/posts`.
- Trường dùng: `id`, `title`, `content`, `platform`, `channel_label`, `status`, `scheduled_time`, `error_message`, `media_paths`.
- Năng lực: `social.view`, `social.schedule`, `social.publish`.

## 11. Component
- Dùng lại: `Button`, `Card`, `Badge`, `Dialog`.
- Mở rộng: `ScheduleConfirmModal` (Base-UI Dialog), `ScheduleCalendarCard`, `ScheduleQueueTab`.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Modal lên lịch dùng `div` cố định tự chế | Chuẩn hóa Base-UI Dialog | Nâng cấp sang `<Dialog>` Base-UI | Đồng bộ UX-006, hỗ trợ backdrop, ESC, focus trap | `schedule-confirm-modal.tsx` |
| Thẻ chọn khung giờ dùng `button` thiếu `aria-pressed` | Chuẩn trợ năng T1.7 | Thêm `aria-pressed={mode === "..."}` | Tuân thủ T1.7 Clickable Cards | `schedule-confirm-modal.tsx` |
| Bài lỗi nằm rải rác theo thứ tự thời gian | Ưu tiên xử lý lỗi theo 03a UX-012 | Tự động sắp xếp đưa bài có status lỗi lên đầu | Giúp nhân viên phát hiện và khắc phục sự cố ngay | `lich-dang/page.tsx` |
| Header chứa mã "M07 (PHẦN ĐĂNG)" | Không lộ mã kỹ thuật | Đổi sang "Xuất bản & Lịch đăng bài" | Quy ước UX không lộ mã nội bộ | `lich-dang/page.tsx` |
| Thẻ bài đăng `role="button"` không xử lý phím, lồng nút "Phát ngay" | Chọn được bằng bàn phím, không nút lồng nút | Tiêu đề là nút phủ toàn thẻ; "Phát ngay" lớp trên | Đợt 4, D4-09 | `schedule-calendar-card.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
