---
id: SCR-STORE-ket-noi
tier: STORE
module: organization
route: /ket-noi
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

# Screen Contract — Kết Nối Nền Tảng Mạng Xã Hội

**Tuyến:** `/ket-noi` · **Tệp chính:** `src/app/(app)/ket-noi/page.tsx` + `src/components/channel-connections/use-channel-accounts.ts` · **Cập nhật:** 30/10/2026 · **Thẻ:** T5.D2

> **Trạng thái production (01/11/2026, P0-06):** khoá "Sắp ra mắt" ở mọi bản build production (`UNAVAILABLE_ROUTE_PREFIXES`, `src/lib/feature-lock.ts`) — màn này còn gửi tài khoản MXH sang SocialFlow, production không cấu hình SocialFlow. Mở lại khi kết nối OAuth trong ALG xong (Workstream S, `docs/audit/architecture-audit/17_SOCIALFLOW_REPLACEMENT_PLAN.md` S-06, S-13).

## 1. Vai và mục đích
- Vai chính (03b): `store_manager`, `marketing_specialist` · Vai phụ: `social_media_manager`
- Phạm vi: organization
- Việc chính: Đăng ký tài khoản, xác thực và duy trì phiên đăng nhập tự động trên các nền tảng mạng xã hội (Facebook, Instagram, LinkedIn, TikTok, Zalo OA) để phục vụ xuất bản bài viết tự động.
- Câu hỏi chính: Tài khoản mạng xã hội nào của tiệm đã sẵn sàng xuất bản, tài khoản nào hết hạn phiên cần kết nối/đăng nhập lại?
- Mật độ: MEDIUM (lưới thẻ danh mục 5 nền tảng mạng xã hội rõ ràng, thông số trạng thái trực quan).

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/proxy/api/accounts?client=SOCIALFLOW` → Tải danh sách tài khoản đã kết nối
  - `POST /api/v1/proxy/api/accounts?client=SOCIALFLOW` → Lưu thông tin tài khoản và kích hoạt đăng nhập
  - `POST /api/v1/proxy/api/accounts/[id]/login?client=SOCIALFLOW` → Mở phiên đăng nhập Playwright tự động
  - `POST /api/v1/proxy/api/accounts/[id]/check?client=SOCIALFLOW` → Kiểm tra tính hợp lệ của phiên
  - `DELETE /api/v1/proxy/api/accounts/[id]?client=SOCIALFLOW` → Ngắt kết nối tài khoản
  - Thao tác ghi (POST/DELETE) cần năng lực **J5** — core kiểm trước khi chuyển tiếp (`proxyCapabilityFor`, `src/modules/proxy/domain/proxy-rules.ts`); đọc danh sách không cần thêm (30/10/2026)
- Khối: 3 khối chính (Header & Tổng quan số tài khoản đã kích hoạt, Hướng dẫn K1 `FeatureGuidanceCard`, Lưới thẻ 5 nền tảng mạng xã hội)
- Nút primary: Nút "Bảng lịch đăng" ở header (`variant: "primary"`), nút "Lưu & Kết nối ngay" trong modal
- FeatureGuidanceCard: 1 card duy nhất theo chuẩn K1
- Modal: `ConnectAccountModal` (chuẩn Base-UI Dialog)
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Trạng thái kết nối bằng chữ + màu (Sẵn sàng đăng, Cần đăng nhập lại, Chưa kết nối), tên tài khoản | Thẻ từng nền tảng |
| L1 Hành động | Đăng nhập ngay / Kết nối tài khoản / Bảng lịch đăng | Nút tác vụ chính trên thẻ & Top Header |
| L2 Ngữ cảnh | Hướng dẫn K1 (không tên kỹ thuật), cảnh báo kênh cần đăng nhập lại / quá 30 ngày chưa đăng nhập lại, thời gian đăng nhập gần nhất | FeatureGuidanceCard & Box chi tiết |
| L3 Chi tiết | Form nhập tên đăng nhập, mật khẩu, Fanpage ID, Access Token | ConnectAccountModal |
| L4 Nâng cao | Kiểm tra phiên, Cập nhật mật khẩu mới, Ngắt kết nối | Menu tác vụ phụ trên thẻ |

## 4. Hành động
- Chính (1): `Bảng lịch đăng` (`variant: "primary"` ở header), `Đăng nhập ngay` (khi phiên hết hạn).
- Phụ (≤ 2):
  - `Làm mới` (`variant: "outline"`).
  - `Kiểm tra phiên` (`variant: "outline"`).
  - `Cập nhật` / `Ngắt kết nối` (`variant: "ghost"`).
- Menu `…`: Không giấu nút chính vào menu ẩn.

## 5. Content budget
- Nút nổi: 1 nút primary + tối đa 2 nút phụ cho mỗi thẻ tài khoản.
- Khối chính: 3 khối (Header, Hướng dẫn K1, Lưới thẻ nền tảng).
- Nguyên tắc trạng thái: Trạng thái kết nối bắt buộc thể hiện bằng chữ tiếng Việt rõ nghĩa kèm huy hiệu màu sắc đạt chuẩn WCAG (Sẵn sàng đăng = xanh lá, Cần đăng nhập lại = đỏ, Chưa kết nối = xám).

## 6. Trạng thái
- Tải: Spinner hiển thị nhẹ khi đồng bộ danh sách tài khoản.
- Chưa kết nối: Huy hiệu "Chưa kết nối" màu xám trung tính, nút kêu gọi "Kết nối tài khoản".
- Hết hạn phiên: Huy hiệu "Cần đăng nhập lại" màu đỏ kèm icon đồng hồ cảnh báo và nút nổi bật "Đăng nhập ngay".
- Sẵn sàng: Huy hiệu "Sẵn sàng đăng" màu xanh lá kèm tích xanh, hiển thị thời điểm đăng nhập gần nhất.
- Lỗi: Thông báo màu đỏ (`role="alert"`) khi đăng nhập hoặc kiểm tra phiên thất bại, kèm tên nền tảng.
- Không tải được danh sách: `InlineError` có "Tải lại" — không coi như "chưa kết nối" (30/10/2026).
- Không quyền J5: dòng "chế độ chỉ đọc"; máy chủ trả 403, thông báo hướng dẫn xin quyền.
- Phiên cũ: quá `STALE_AFTER_DAYS` (30) ngày chưa đăng nhập lại → cảnh báo vàng, nhắc "Kiểm tra" trước khi lên lịch (`src/modules/integration/domain/channel-session-health.ts`).
- Ngắt kết nối: `ConfirmDialog` tone danger (R3), thay `window.confirm`.

## 7. Responsive
- 390px: Lưới 1 cột, form modal co giãn vừa màn hình mobile.
- 768px: Lưới 2 cột cân đối.
- 1280px+: Lưới 2 cột rộng rãi, tối đa chiều rộng `max-w-4xl`.

## 8. Trợ năng
- Bàn phím: Modal hỗ trợ phím Tab đầy đủ, ESC đóng modal.
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` trên toàn bộ nút và input.
- Nhãn: Toàn bộ nút có text rõ nghĩa. Input có label rõ ràng.

## 9. AI
- Không áp dụng trực tiếp tại màn này (đây là tầng kết nối hạ tầng mạng xã hội).

## 10. Dữ liệu và quyền
- Nguồn sự thật: Bảng `social_accounts` (qua proxy SocialFlow).
- Trường dùng: `platform`, `username`, `is_logged_in`, `last_login`, `page_id`.
- Quyền: xem — mọi vai vào được trang; kết nối/đăng nhập/ngắt — năng lực J5 (`social.publish`).

## 11. Component
- Dùng lại: `Button`, `Card`, `Badge`, `Dialog`, `FeatureGuidanceCard`.
- Mở rộng: `ConnectAccountModal` (Base-UI Dialog), `PlatformAccountCard`.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Modal kết nối dùng `div` cố định tự chế | Chuẩn hóa Base-UI Dialog | Nâng cấp sang `<Dialog>` Base-UI | Đồng bộ UX-006, hỗ trợ backdrop, ESC, focus-trap | `connect-account-modal.tsx` |
| Header chứa mã "SocialFlow M07" | Không lộ mã kỹ thuật | Đổi sang "Tích hợp Đa nền tảng Mạng xã hội" | Quy ước UX không lộ mã nội bộ | `ket-noi/page.tsx` |
| Lỗi tải danh sách bị nuốt, hiện như "chưa kết nối" | Báo lỗi rõ, cho thử lại | `InlineError` + `loadState` | Không đánh lừa trạng thái (UX-017) | `use-channel-accounts.ts` |
| Ai đăng nhập cũng kết nối/ngắt được kênh của tiệm | Gác theo mã năng lực | J5 ở proxy cho thao tác ghi `api/accounts` | Non-negotiable #3 (capability) | `proxy-rules.ts`, `proxy-rules.test.ts` |
| Hướng dẫn lộ "SocialFlow", "Playwright", "AES-256" | Chữ tự nhiên | Viết lại K1 | Non-negotiable #6 | `ket-noi/page.tsx` |
| Trạng thái kết nối | Thể hiện bằng chữ + màu chuẩn WCAG | Duy trì Badge chữ tiếng Việt + icon + tone màu | Tuân thủ luật trạng thái không dùng màu đơn độc | `platform-account-card.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
