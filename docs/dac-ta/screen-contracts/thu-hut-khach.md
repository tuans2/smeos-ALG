---
id: SCR-STORE-thu-hut-khach
tier: STORE
module: acquisition
route: /thu-hut-khach
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

# Screen Contract — Thu hút khách hàng

**Tuyến:** `/thu-hut-khach` (`?tab=leads`) · **Tệp chính:** `src/app/(app)/thu-hut-khach/page.tsx` → `src/components/acquisition/acquisition-client.tsx` · **Cập nhật:** 01/11/2026 (PO PR-3: pipeline lead 10 trạng thái, progressive disclosure 4 nhóm) · **Thẻ:** Bước 4 (công cụ 12, 13, 21, 25)

## 1. Vai và mục đích
- Vai chính (03b): `store_manager`, `marketing_specialist` · Vai phụ: `sale`, `crm`
- Phạm vi: organization
- Việc chính: Tạo mã QR/link cho từng nơi quảng bá và gọi lại khách đã để lại thông tin.
- Câu hỏi chính: Khách đến từ đâu, ai đang chờ cửa hàng gọi lại?
- Mật độ: MEDIUM
- Archetype (`ux-patterns/page-archetypes.md`): B Danh sách

## 2. Hiện trạng (audit)
- API:
  - `GET|POST /api/v1/short-links` → J1 · `PATCH /api/v1/short-links/[id]` → J1 · `GET /api/v1/short-links/[id]/stats` → J1
  - `GET /api/v1/leads` → Q1 · `PATCH /api/v1/leads/[id]` → Q3 (ghi `audit_logs` `lead.update`)
  - Công khai: `GET /r/[code]` (chuyển hướng + ghi lượt quét, giới hạn 60/phút/IP) · `POST /api/v1/public/catalog/[slug]/lead` (10/10 phút/IP, ô bẫy, Turnstile khi bật)
- Khối: 3 (K1, K2 tab, danh sách) · Nút primary: 1 ("Tạo mã mới" ở tab Mã QR và link) · FeatureGuidanceCard: 1 · Modal: `ConfirmDialog` khi tắt link
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☐ (403 hiện `InlineError`) một phần ☐ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên mã, lượt quét, số khách để lại thông tin; tên + SĐT + trạng thái khách | Hàng danh sách |
| L1 Hành động | Tạo mã mới · Chép link · Tải QR có logo · Đổi trạng thái khách (pipeline 10 bước qua 4 nhóm Progressive Disclosure) | Thanh tab + hàng |
| L2 Ngữ cảnh | Nguồn (mã/vị trí), chiến dịch, thời điểm | Dòng phụ của hàng |
| L3 Chi tiết | Thống kê theo ngày/thiết bị | Mở tại chỗ ("Thống kê") |
| L4 Nâng cao | Vị trí đặt, tên chiến dịch, hạn dùng; bản in SVG | `Disclosure` trong form tạo |

## 4. Hành động
- Chính (1): Tạo mã mới → form tạo hiện trên đầu danh sách.
- Phụ (≤ 2): Chép link, Tải QR có logo (mỗi hàng); Thống kê, Tải bản in, Tắt/Bật lại.
- Menu `…`: không.

## 5. Content budget
nút nổi: 1/3 · khối chính: 3/5

## 6. Trạng thái
tải: `SkeletonBlock` · rỗng: `EmptyState` "Chưa có mã QR hay link nào" + nút tạo; "Chưa có khách để lại thông tin" · lỗi: `InlineError` có "Tải lại" · không quyền: 403 → `InlineError` · thành công: mã mới lên đầu danh sách. Link tắt/hết hạn: huy hiệu "Đang tắt"/"Đã hết hạn"; khách quét thấy "Link này không còn được sử dụng."

## 7. Responsive
390px: hàng xếp dọc, nút quấn dòng · 768px+: hàng hai cột (thông tin | số liệu) · 1280px: `max-w-5xl`.

## 8. Trợ năng
bàn phím: nút lọc/khoảng thời gian dùng `aria-pressed`; "Thống kê" có `aria-expanded` · nhãn: mọi ô nhập có `<label>` · vùng thông báo: `InlineError` `role="alert"` · axe: sạch 18/18 (MEUX_DEEP_AUDIT, mục Bước 4).

## 9. AI
không áp dụng.

## 10. Dữ liệu và quyền
nguồn sự thật: `short_links`, `link_events`, `leads` (+ `customers`, `customer_consents` PHONE_CALL) · năng lực: J1 (mã/link), Q1/Q3 (khách). Không lưu IP thô: `link_events.visitor_hash` băm theo ngày.

## 11. Component
dùng lại: `FeatureGuidanceCard`, `TabActionHeader`, `EmptyState`, `InlineError`, `SkeletonBlock`, `Disclosure`, `ConfirmDialog`, `Badge`, `Button`, `Input` · tạo mới: `ShortLinkRow`, `ShortLinkStatsPanel`, `ShortLinkCreateForm`, `LeadsTab` (nghiệp vụ riêng, không có sẵn), `TurnstileWidget` (đầu nối, chỉ hiện khi khai khoá).

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Lead lưu trong `catalog_links.filters` (JSON), mất khi gửi đồng thời | Bảng `leads` + CRM | Use-case `captureCatalogLead` | Toàn vẹn dữ liệu, ND 13/2023 | `tests/tenant/acquisition-isolation.test.ts` |
| QR tĩnh, không thống kê | QR động `/r/<mã>` | `short_links` + `link_events` | In một lần, đổi đích sau; đo theo vị trí | `short-link-rules.test.ts` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Quyền · Dữ liệu · Trạng thái | PASS | tenant test + unit test |
| Responsive · Trợ năng (axe) | PASS | `ux:audit -- thu-hut-khach` 18/18 (390 + 1280px); bàn phím, zoom, trình đọc màn hình chưa kiểm |
