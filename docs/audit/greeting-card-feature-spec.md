# Đặc tả Tính năng "Thẻ chào mẫu hoa" — Hiện trạng (Baseline Audit)

> **Mục đích**: Reverse-engineer 100% tính năng từ mã nguồn + tài liệu thực tế.
> **Phạm vi**: Module `src/modules/greeting-card/` + `src/components/greeting-card/` + 30+ API route + 12 bảng CSDL + 20 mẫu template.
> **Tiêu chuẩn phân loại**: ✅ Implemented · ⚠️ Partial · ❌ Missing · 🪦 Dead Code · ❓ Unclear

---

## 1. Tổng quan kiến trúc

### 1.1 Mô tả nghiệp vụ
"Thẻ chào mẫu hoa" là kênh bán hàng trực tuyến dạng **Swipe Brochure**: nhân viên sale gửi khách một link chứa bộ sưu tập hoa tươi, khách lướt chọn mẫu trên điện thoại, đặt hoa, chuyển khoản QR và theo dõi đơn — tất cả không cần cài app.

### 1.2 Clean Architecture 4 tầng ✅

| Tầng | Thư mục | Số file | Ghi chú |
|---|---|---|---|
| **Domain** | [`domain/`](../../src/modules/greeting-card/domain) | 31 file + 17 test | Pure TypeScript, không import Prisma |
| **Use-Cases** | [`use-cases/`](../../src/modules/greeting-card/use-cases) | 33 file + tests | Orchestration nghiệp vụ |
| **Infra** | [`infra/`](../../src/modules/greeting-card/infra) | 14 repository | Prisma queries |
| **Adapters** | [`adapters/`](../../src/modules/greeting-card/adapters) | 3 file | VietQR, Zalo ZNS, eSMS |

### 1.3 Mô hình dữ liệu (12 bảng)

| Bảng | Vai trò | Tenant-scoped |
|---|---|---|
| `greeting_catalogs` | Bộ sưu tập mẫu hoa (STANDARD / CLIENT) | ✅ `organization_id` |
| `greeting_catalog_products` | Sản phẩm gán vào catalog (FK → `products`) | ✅ |
| `greeting_sessions` | Phiên tương tác của khách (1 session : 1 send code) | ✅ |
| `greeting_journey_events` | Sự kiện hành trình: OPEN, SWIPE, SELECT, ORDER… | ✅ |
| `greeting_integrations` | Tích hợp webhook ngân hàng + kênh thông báo (1:1 org) | ✅ `unique(organization_id)` |
| `greeting_payment_events` | Giao dịch ngân hàng nhận từ webhook | ✅ `unique(org, provider, external_id)` |
| `greeting_notifications` | Nhật ký tin đã gửi cho khách (ZNS/SMS) | ✅ `unique(org, order, event_key)` |
| `greeting_share_links` | Link bộ sưu tập nhân viên sao chép (truy vết) | ✅ |
| `greeting_messages` | Tin nhắn nội bộ theo đơn/link | ✅ |
| `greeting_message_reads` | Trạng thái đã đọc tin nhắn (cross-device) | ✅ `unique(message, user)` |
| `greeting_catalog_events` | Phễu link bộ sưu tập theo kênh (visitor_hash) | ✅ |
| `orders` + `order_items` + `payments` | Đơn hàng chính (tái dùng module Orders) | ✅ |

---

## 2. User Flows & Capabilities

### 2.1 Luồng Nhân viên Sale (Nội bộ ALG)

#### Flow A: Gửi nhanh 3 bước (Journey Wizard) ✅
[`journey-wizard.tsx`](../../src/components/greeting-card/journey/journey-wizard.tsx)
1. **Chọn/tạo bộ sưu tập** → Chọn mẫu template → Chọn sản phẩm từ Product Master
2. **Nhập thông tin khách** → Tên, SĐT (tuỳ chọn), ghi chú
3. **Sinh link & sao chép** → Link `/b/<sendCode>` sẵn sàng gửi qua Zalo/Facebook

#### Flow B: Quản lý chi tiết (5 tab) ✅
[`page.tsx`](../../src/app/%28app%29/the-chao/page.tsx)

| Tab | Component | Mô tả |
|---|---|---|
| **Bộ sưu tập** | [`catalog-list-tab.tsx`](../../src/components/greeting-card/catalog/catalog-list-tab.tsx) + [`catalog-detail-panel.tsx`](../../src/components/greeting-card/catalog/catalog-detail-panel.tsx) | CRUD catalog, gán sản phẩm, chọn template, xem trước |
| **Theo dõi tiến độ** | [`brochure-order-tracking-tab.tsx`](../../src/components/greeting-card/tracking/brochure-order-tracking-tab.tsx) | Pipeline 9 bước, lọc category/sale/kênh, phát hiện đơn kẹt |
| **Bán hàng** | [`sales-brochure-tab.tsx`](../../src/components/greeting-card/sales/sales-brochure-tab.tsx) | Danh sách link đã gửi, phễu bán hàng, phễu theo kênh |
| **Điều hành** | [`admin-brochure-payment-tab.tsx`](../../src/components/greeting-card/admin/admin-brochure-payment-tab.tsx) | Xác nhận thanh toán, báo giá, cài đặt chính sách |
| **Điều phối** | [`coordinator-brochure-tab.tsx`](../../src/components/greeting-card/coordinator/coordinator-brochure-tab.tsx) | Phân công thợ, ảnh thành phẩm, giao ship, ảnh người nhận |

### 2.2 Luồng Khách hàng (Trang công khai)

#### Flow C: Link gửi riêng (`/b/<sendCode>`) ✅
[`page.tsx`](../../src/app/b/[sendCode]/page.tsx) → [`brochure-customer-experience.tsx`](../../src/components/greeting-card/customer/brochure-customer-experience.tsx)
1. **Mở link** → Lướt/vuốt mẫu hoa (Swipe Brochure engine)
2. **Chọn mẫu** → Bấm "Đặt ngay" trên thẻ sản phẩm
3. **Chọn tuỳ chọn** → Size/biến thể, số lượng, khu vực giao, mã giảm giá → Báo giá tức thì
4. **Nhập thông tin đơn** → Form đặt hoa (người gửi, người nhận, địa chỉ 5 ô, ngày/giờ giao, thiệp)
5. **Xem lại đơn** → Tóm tắt đơn + xác nhận
6. **Thanh toán** → QR chuyển khoản VietQR + đếm ngược giữ đơn + nút "Tôi đã chuyển khoản"
7. **Theo dõi đơn** → 4 bước tiến trình (Nhận đơn → Cắm hoa → Giao hoa → Hoàn tất)
8. **Đặt thêm** → Nút đặt đơn mới từ cùng bộ sưu tập

#### Flow D: Link bộ sưu tập công khai (`/bst/<orgSlug>/<catalogCode>`) ✅
- Bộ sưu tập SEO-friendly, chia sẻ trên mạng xã hội
- OpenGraph image sinh động

#### Flow E: Link chia sẻ có truy vết (`/s/<code>`) ✅
[`page.tsx`](../../src/app/s/[code]/page.tsx)
- Nhân viên bấm "Sao chép" → sinh link `/s/<code>` → redirect `/s/<code>/mo` → mở phiên riêng tính cho nhân viên đó
- Gắn kênh `?kenh=zalo|facebook|instagram|tiktok|website|khac`

---

## 3. Business Logic & Rules (Domain Layer)

### 3.1 Mã gửi (Send Code) ✅
[`greeting-card-rules.ts`](../../src/modules/greeting-card/domain/greeting-card-rules.ts)
- Format: `<PREFIX>-<8 ký tự ngẫu nhiên>` (Crockford base32 — bỏ I, L, O, U)
- Prefix: 2–6 ký tự, mặc định `T01`
- Regex: `^[A-Z0-9]{2,6}-[A-Z0-9]{3,12}$` (tương thích mã cũ)
- **Business value**: Link không đoán được, tránh cross-shop collision

### 3.2 Máy trạng thái phiên (Session State Machine) ✅
```
CREATED → OPENED → BROWSING ⇄ SELECTED → ORDER_SUBMITTED → PAYMENT_REPORTED → COMPLETED
```
- `BROWSING ⇄ SELECTED`: khách đổi mẫu được
- `SELECTED → BROWSING`: chọn lại mẫu khác
- Self-transition `BROWSING → BROWSING` cho phép (swipe nhiều lần)

### 3.3 Hết hạn & Thu hồi link ✅
[`greeting-card-rules.ts#L250-L274`](../../src/modules/greeting-card/domain/greeting-card-rules.ts#L250-L274)
- Mặc định **30 ngày**, tối đa **365 ngày**
- Thu hồi link (`revokedAt`) = vô hiệu ngay
- **Link đã có đơn luôn mở được** (khách cần xem thanh toán/theo dõi) — dù hết hạn hay bị thu hồi

### 3.4 Giá sản phẩm ✅
[`brochure-commerce-rules.ts`](../../src/modules/greeting-card/domain/brochure-commerce-rules.ts)
- Ưu tiên: `attributes.price` → `attributes.price_vnd` → biến thể đầu `attributes.price`
- **Không bịa giá mặc định** (bản cũ gán cứng 500.000đ — đã sửa)
- `null` = "Liên hệ" trên giao diện, đơn được nhận với tổng 0, cửa hàng báo giá sau

### 3.5 Biến thể / Size ✅
[`brochure-pricing.ts`](../../src/modules/greeting-card/domain/brochure-pricing.ts)
- Giá biến thể: `variant.attributes.price` nếu có, hoặc `base × multiplier`
- Biến thể không suy ra được giá → bị bỏ (không bán online)
- Số lượng: 1–20

### 3.6 Phí giao theo khu vực ✅
[`brochure-pricing.ts#L48-L91`](../../src/modules/greeting-card/domain/brochure-pricing.ts#L48-L91)
- Tối đa 30 khu vực giao
- Miễn phí giao khi tạm tính (sau giảm giá) vượt mức cấu hình
- Giờ chốt giao trong ngày (`sameDayCutoffHour`)
- Thời gian chuẩn bị (`prepHours`)

### 3.7 Mã giảm giá (Voucher) ✅
[`brochure-pricing.ts#L93-L128`](../../src/modules/greeting-card/domain/brochure-pricing.ts#L93-L128)
- Hai loại: `PERCENTAGE` / `FIXED_AMOUNT`
- Trần giảm tối đa (`maxDiscountVnd`)
- Đơn tối thiểu (`minOrderVnd`)
- Hết hạn, đã dùng, dành riêng một khách — tất cả có blocker
- **Business value**: Công cụ marketing cá nhân hoá

### 3.8 Xin giảm giá theo đơn (Discount Request) ✅
[`discount-request.ts`](../../src/modules/greeting-card/domain/discount-request.ts)
- Sale xin (theo % hoặc số tiền cụ thể), Điều hành duyệt/từ chối
- Trần mặc định **25%** (cấu hình được)
- Mức duyệt có thể sửa khác mức xin
- Kèm ghi chú lý do
- Trạng thái: `PENDING → APPROVED / REJECTED`

### 3.9 Chính sách thanh toán ✅
[`brochure-payment-policy.ts`](../../src/modules/greeting-card/domain/brochure-payment-policy.ts)

| Chính sách | Mặc định | Mô tả |
|---|---|---|
| `depositPercent` | 0 (trả đủ) | 1–99% = cọc; 0 = trả đủ ngay |
| `requirePaidBeforeProduction` | `false` | Bắt thu cọc/thanh toán trước khi cắm hoa |
| `requireFullBeforeDispatch` | `false` | Bắt thu đủ trước khi giao |
| `holdMinutes` | _(không bật)_ | 5–1440 phút giữ đơn chờ CK (đếm ngược) |
| `MAX_QUOTE_VND` | 1 tỷ | Giới hạn trần báo giá |

- **Payment Gate**: Chặn tác vụ xưởng nếu vi phạm chính sách
- **Huỷ đơn**: chỉ khi chưa giao xong/chưa huỷ trước đó

### 3.10 Tính tiền & Báo giá (Quote Engine) ✅
[`brochure-pricing.ts#L130-L189`](../../src/modules/greeting-card/domain/brochure-pricing.ts#L130-L189)
```
Tổng = (đơn giá × số lượng) − giảm giá + phí giao
```
- Phí giao miễn khi tổng sau giảm giá ≥ mức cấu hình
- Mẫu chưa niêm yết giá → `awaitingQuote: true`, tổng 0, cửa hàng báo giá sau
- Cùng hàm `computeQuote()` dùng cho cả báo giá preview và tạo đơn → **số liệu không lệch**

### 3.11 Đối chiếu chuyển khoản tự động ✅
[`bank-transfer-matching.ts`](../../src/modules/greeting-card/domain/bank-transfer-matching.ts)
- Dò mã đơn `DHyymmdd-XXXXXXXX` trong nội dung CK (regex nới lỏng: chịu khoảng trắng, thiếu gạch ngang)
- Chuyển thừa → chỉ ghi đúng phần còn phải thu + cảnh báo hoàn
- Đơn đã huỷ / đã thu đủ → `UNMATCHED`

### 3.12 Quy trình điều phối xưởng ✅
[`brochure-commerce-rules.ts#L62-L97`](../../src/modules/greeting-card/domain/brochure-commerce-rules.ts#L62-L97)

4 tác vụ tuần tự (có blocker nếu sai thứ tự):
1. **Phân công thợ** → Chỉ khi hoa chưa cắm xong
2. **Ảnh thành phẩm** → Chỉ khi chưa giao ship
3. **Giao ship** → Cần ảnh thành phẩm; bị chặn nếu chưa thu đủ tiền (theo chính sách)
4. **Ảnh người nhận** → Cần giao ship trước

### 3.13 Pipeline theo dõi 9 bước ✅
[`tracking-pipeline-types.ts`](../../src/modules/greeting-card/domain/tracking-pipeline-types.ts)

| Bước | Tiêu đề | Vai trách nhiệm |
|---|---|---|
| STEP_1 | Khách mở link chào | Khách / Sale |
| STEP_2 | Đang lướt chọn mẫu hoa | Khách / Sale |
| STEP_3 | Đang nhập Form | Khách / Sale |
| STEP_4 | Đã gửi đơn & Báo CK | Khách |
| STEP_5 | Xác nhận tiền về | Điều hành / Kế toán |
| STEP_6 | Xưởng đang cắm hoa | Điều phối / Thợ hoa |
| STEP_7 | Hoa hoàn thiện & Duyệt mẫu | Thợ hoa / Điều phối |
| STEP_8 | Đang giao hoa | Shipper / Điều phối |
| STEP_9 | Giao thành công & Hoàn tất | Toàn bộ |

### 3.14 SLA & Phát hiện đơn kẹt ✅
[`step-sla.ts`](../../src/modules/greeting-card/domain/step-sla.ts)
- Mỗi bước có thời gian chuẩn (cấu hình được, mặc định 5–120 phút)
- Quá thời gian → đơn "kẹt" + gợi ý hành động + báo cho vai phụ trách
- Hiển thị `quá X phút / X giờ / X ngày`
- Tối đa 7 ngày SLA

### 3.15 Lịch giao & Khung giờ ✅
[`delivery-schedule.ts`](../../src/modules/greeting-card/domain/delivery-schedule.ts)
- 4 khung giờ: Sáng (8–12h), Chiều (13–17h), Tối (18–21h), Giờ cụ thể
- Giờ chốt giao trong ngày → hôm nay hết slot → tự chuyển ngày mai
- Thời gian chuẩn bị (`prepHours`) → loại khung giờ không kịp

### 3.16 Địa chỉ giao 5 ô ✅
[`delivery-address.ts`](../../src/modules/greeting-card/domain/delivery-address.ts)
- 5 ô: Số nhà → Đường → Phường/Xã → Quận/Huyện (tuỳ chọn, VN bỏ cấp 01/07/2025) → Tỉnh/TP
- Máy chủ tự ghép dòng đầy đủ, không tin client

---

## 4. Hệ thống Template (Mẫu Thẻ Chào)

### 4.1 Registry ✅
[`greeting-template-catalog.ts`](../../src/modules/greeting-card/domain/greeting-template-catalog.ts) — 20 mẫu, 2 nhóm:

#### 12 Swipe Styles (cốt lõi)
| # | ID | Tên | Phong cách |
|---|---|---|---|
| 01 | `editorial-luxury` | Editorial Luxury | Sang trọng, tạp chí **(mặc định)** |
| 02 | `minimal-clean` | Minimal Clean | Tối giản, hiện đại |
| 03 | `cinematic-dark` | Cinematic Dark | Điện ảnh, ấn tượng |
| 04 | `romantic-pastel` | Romantic Pastel | Lãng mạn, pastel |
| 05 | `botanical-frame` | Botanical Frame | Thiên nhiên, tinh tế |
| 06 | `glassmorphism` | Glassmorphism | Hiện đại, trong suốt |
| 07 | `real-life-shop` | Real Life Shop | Ảnh tiệm thực tế |
| 08 | `real-life-daylight` | Real Life Daylight | Ánh sáng tự nhiên |
| 09 | `real-life-in-store` | Real Life In Store | Trong cửa hàng |
| 10 | `real-life-handheld` | Real Life Handheld | Cầm tay, casual |
| 11 | `lifestyle-context` | Lifestyle Context | Không gian sống |
| 12 | `mixed-media` | Mixed Media | Kết hợp thật + vẽ tay |

#### 8 Interactive Decks (Legacy / Exploratory)
| ID | Tên | Trạng thái |
|---|---|---|
| `enterprise-luxury` | Enterprise Luxury Deck | ⚠️ Có định nghĩa, renderer tồn tại |
| `swipe-classic` | Classic Swipe Brochure | ⚠️ Có định nghĩa |
| `lookbook-grid` | Commercial Lookbook Grid | ⚠️ Có renderer [`lookbook-grid-deck.tsx`](../../src/components/greeting-card/customer/templates/lookbook-grid-deck.tsx) |
| `editorial-story` | Editorial Magazine & Story | ⚠️ Có renderer [`editorial-story-deck.tsx`](../../src/components/greeting-card/customer/templates/editorial-story-deck.tsx) |
| `video-reels` | Video-First Reels | ⚠️ Có renderer [`video-reels-deck.tsx`](../../src/components/greeting-card/customer/templates/video-reels-deck.tsx) |
| `occasion-budget-quiz` | Smart Matcher | ⚠️ Có renderer [`occasion-budget-deck.tsx`](../../src/components/greeting-card/customer/templates/occasion-budget-deck.tsx) |
| `event-moodboard` | Color Moodboard | ⚠️ Có renderer [`color-moodboard-deck.tsx`](../../src/components/greeting-card/customer/templates/color-moodboard-deck.tsx) |
| `split-compare` | Split-Screen Lens | ⚠️ Có renderer [`split-compare-deck.tsx`](../../src/components/greeting-card/customer/templates/split-compare-deck.tsx) |

### 4.2 Cấu hình hiển thị trường thông tin ✅
[`display-fields.ts`](../../src/modules/greeting-card/domain/display-fields.ts)
- **Luôn hiển thị** (không tắt được): `code`, `name`, `price`
- **Tuỳ chọn** (7 trường): flowers, color, style, dimensions, wrapStyle, category, description
- Cấu hình theo template, lưu `organizations.settings.greetingCardDisplay`

### 4.3 Template Selector ✅
[`template-selector-split-pane.tsx`](../../src/components/greeting-card/customer/templates/template-selector-split-pane.tsx) — Cho phép cửa hàng xem trước và chọn mẫu.

---

## 5. Tích hợp bên ngoài

### 5.1 VietQR (Thanh toán chuyển khoản) ✅
[`vietqr-helper.ts`](../../src/modules/greeting-card/adapters/vietqr-helper.ts)
- Sinh mã QR qua `img.vietqr.io` (tiêu chuẩn Napas)
- Hỗ trợ cọc/trả đủ/phần còn lại theo chính sách tiệm
- Tài khoản nhận tiền từ `organizations.settings.brochure_payment`

### 5.2 Zalo ZNS (Thông báo khách) ✅
[`zalo-zns-adapter.ts`](../../src/modules/greeting-card/adapters/zalo-zns-adapter.ts)
- Gửi tin theo mẫu đã duyệt trên Zalo Official Account
- Access token tự làm mới (refresh token dùng một lần)
- Có circuit breaker (`withCircuitBreaker("zalo-zns")`)
- Credentials mã hoá AES-256-GCM, không bao giờ trả ra client

### 5.3 eSMS (SMS Brandname) ✅
[`esms-adapter.ts`](../../src/modules/greeting-card/adapters/esms-adapter.ts)
- SMS không dấu (tiết kiệm phí, tránh lỗi mã hoá)
- Giữ dưới 160 ký tự khi có thể
- Có circuit breaker

### 5.4 SePay (Webhook đối soát ngân hàng) ✅
[`payment-webhook.ts`](../../src/modules/greeting-card/use-cases/payment-webhook.ts)
- Xác thực webhook bằng SHA-256 hash (key chỉ lưu băm, hint 4 ký tự cuối)
- Tự dò mã đơn trong nội dung CK → ghi thu tự động
- Idempotent: `unique(org, provider, external_id)` → không ghi thu hai lần

### 5.5 Thông báo khách theo mốc đơn ✅
[`customer-notifications.ts`](../../src/modules/greeting-card/domain/customer-notifications.ts)

7 sự kiện thông báo:
| Event | Nhãn |
|---|---|
| `ORDER_RECEIVED` | Đã nhận đơn |
| `DEPOSIT_RECEIVED` | Đã nhận tiền cọc |
| `PAYMENT_COMPLETED` | Đã thanh toán đủ |
| `READY` | Hoa đã cắm xong |
| `DISPATCHED` | Đang giao hoa |
| `DELIVERED` | Giao thành công |
| `CANCELLED` | Đơn bị huỷ |

- `unique(org, order, event_key)` → một mốc chỉ gửi một lần
- SĐT che (`84912***678`) khi lưu nhật ký

---

## 6. RBAC & Permissions

### 6.1 Capability Map ✅
[`greeting-card-capabilities.ts`](../../src/modules/greeting-card/domain/greeting-card-capabilities.ts)

| Mã | Quyền | Gác cổng |
|---|---|---|
| `L1` | Xem bộ sưu tập | `product.read` |
| `R2` | Tạo/sửa BST, sinh link | `order.create` |
| `R1` | Xem đơn, bảng theo dõi, nhắn nội bộ | `order.read` |
| `R9` | Xác nhận đã nhận tiền | `order.payment.record` |
| `R4` | Phân công florist | `order.assign` |
| `R3` | Chụp ảnh thành phẩm | `order.update` |
| `R5` | Giao ship, ảnh người nhận | `delivery.manage` |
| `R6` | Huỷ đơn (trần cứng điều hành) | `order.cancel` |
| `F2` | Cấu hình tích hợp | `org.update` |
| `R10` | Hoàn tiền (trần cứng điều hành) | `order.payment.refund` |

### 6.2 Phạm vi xem đơn (Visibility) ✅
[`order-visibility.ts`](../../src/modules/greeting-card/domain/order-visibility.ts)
- Mode `ALL` (mặc định): mọi sale thấy mọi đơn
- Mode `OWN`: sale chỉ thấy link/đơn mình gửi
- Điều hành chọn riêng cho từng sale
- Người có `R4/R5/F2` (điều phối, giao hàng, điều hành) luôn thấy tất cả

### 6.3 Vai Tin nhắn nội bộ ✅
[`internal-message.ts`](../../src/modules/greeting-card/domain/internal-message.ts)
- Vai chính: `ADMIN` (F2) > `COORDINATOR` (R4/R5) > `SALE` (R2)
- Gửi cho vai hoặc gửi cho người cụ thể
- `OWNER_SALE` = sale phụ trách đơn (server tự tìm)

---

## 7. API Endpoints

### 7.1 Internal API (30+ routes, yêu cầu đăng nhập)
```
/api/v1/greeting-card/
├── catalogs/                    GET (list), POST (create)
│   └── [id]/                    GET, PATCH, DELETE
│       ├── products/            GET, POST, DELETE
│       └── collage/             POST
├── send-links/                  GET (list), POST (create)
│   └── [id]/
│       ├── copied/              POST (đánh dấu đã sao chép)
│       └── revoke/              POST (thu hồi link)
├── share-links/                 POST (sao chép link BST)
├── orders/                      GET (list)
│   └── [id]/
│       ├── confirm-payment/     POST
│       ├── quote/               POST (báo giá mẫu chưa niêm yết)
│       ├── cancel/              POST
│       ├── refund/              POST
│       ├── assign-florist/      POST
│       ├── product-photo/       POST
│       ├── dispatch-shipping/   POST
│       ├── recipient-photo/     POST
│       └── discount-request/    POST
├── discount-requests/[id]/decision/  POST
├── tracking-pipeline/           GET
├── payment-events/              GET (list)
│   └── [id]/handle/             POST (xử lý thủ công)
├── messages/                    GET, POST
│   ├── read/                    POST (đánh dấu đã đọc)
│   └── recipients/              GET (danh sách người gửi)
├── inbox/                       GET
├── stats/                       GET (phễu bán hàng)
│   └── channels/                GET (phễu theo kênh)
├── sale-visibility/             GET, POST
├── display-settings/            GET, POST
├── integrations/                GET, POST
│   ├── payment-webhook/         POST (cài SePay)
│   └── notifications/           GET, POST
│       └── test/                POST (gửi tin thử)
```

### 7.2 Public API (không cần đăng nhập)
```
/api/v1/public/
├── brochure/[sendCode]/         GET (load phiên)
│   ├── select/                  POST (chọn mẫu)
│   ├── quote/                   POST (báo giá)
│   ├── order/                   POST (đặt hoa)
│   ├── payment-notify/          POST (khách báo đã CK)
│   └── reorder/                 POST (đặt thêm)
├── brochure/tracking/[code]/    GET (theo dõi đơn)
├── greeting-catalog/[id]/       
│   ├── quote/                   POST
│   ├── order/                   POST
│   └── event/                   POST (ghi sự kiện phễu)
└── payments/sepay/              POST (webhook SePay)
```

### 7.3 Trang công khai (SSR)
```
/b/[sendCode]           → Link riêng sale (Swipe Brochure)
/bst/[orgSlug]/[code]   → Link BST công khai (SEO)
/g/[id]                 → Link BST cũ
/s/[code]               → Link chia sẻ có truy vết → redirect /s/[code]/mo
```

---

## 8. UI Components (Phía cửa hàng)

### 8.1 Tổng kê

| Nhóm | Số component | Thư mục |
|---|---|---|
| Admin (Điều hành) | 16 file | [`admin/`](../../src/components/greeting-card/admin) |
| Catalog (Bộ sưu tập) | 5 file | [`catalog/`](../../src/components/greeting-card/catalog) |
| Coordinator (Điều phối) | 5 file | [`coordinator/`](../../src/components/greeting-card/coordinator) |
| Customer (Trang khách) | 19 file + templates | [`customer/`](../../src/components/greeting-card/customer) |
| Inbox (Hộp việc) | 6 file | [`inbox/`](../../src/components/greeting-card/inbox) |
| Journey (Gửi nhanh) | 12 file | [`journey/`](../../src/components/greeting-card/journey) |
| Sales (Bán hàng) | 6 file | [`sales/`](../../src/components/greeting-card/sales) |
| Share (Chia sẻ) | 2 file | [`share/`](../../src/components/greeting-card/share) |
| Tracking (Theo dõi) | 5 file | [`tracking/`](../../src/components/greeting-card/tracking) |
| Work (Danh sách việc) | 3 file | [`work/`](../../src/components/greeting-card/work) |

### 8.2 Cài đặt Điều hành (Admin Settings) ✅
[`admin/`](../../src/components/greeting-card/admin)

| Setting | Component | Mô tả |
|---|---|---|
| Tài khoản ngân hàng | `brochure-payment-settings.tsx` | Cấu hình tài khoản nhận tiền |
| Chính sách thanh toán | `brochure-policy-settings.tsx` | Cọc %, yêu cầu thu trước cắm/giao |
| Phí giao khu vực | `brochure-shipping-settings.tsx` | Khu vực giao + mức miễn phí |
| Thông báo khách | `brochure-notify-settings.tsx` | Zalo ZNS / eSMS |
| Webhook ngân hàng | `brochure-bank-sync-settings.tsx` | SePay |
| Thời gian chuẩn | `brochure-step-sla-settings.tsx` | SLA từng bước |
| Phạm vi xem đơn | `brochure-visibility-settings.tsx` | ALL / OWN |
| Người phụ trách mặc định | `brochure-default-owner-settings.tsx` | Link cũ không qua nút Sao chép |
| Trần giảm giá | `brochure-discount-settings.tsx` | % tối đa Sale được xin |

---

## 9. Hệ thống Hộp việc (Inbox) ✅
[`inbox.ts`](../../src/modules/greeting-card/domain/inbox.ts)

6 loại hành động, sắp xếp theo urgency:

| Loại | Vai | Urgency |
|---|---|---|
| `STUCK` | Vai phụ trách bước kẹt | 1000 + phút quá hạn |
| `QUOTE` | Admin | 500 |
| `CONFIRM_PAYMENT` | Admin | 400 |
| `ASSIGN` | Coordinator | 300 |
| `UNMATCHED_PAYMENTS` | Admin | _(từ payment events)_ |
| `DISCOUNT` | Admin | _(từ discount requests)_ |

- Inbox → mở đúng tab → cuộn tới đúng thẻ đơn (scroll + highlight)
- Cập nhật 24h gần nhất theo vai

---

## 10. Analytics & Phễu bán hàng

### 10.1 Phễu theo Sale ✅
[`sales-funnel.ts`](../../src/modules/greeting-card/domain/sales-funnel.ts)
```
Gửi → Mở → Chọn mẫu → Đặt → Thu tiền → Doanh thu
```
- Tỷ lệ %: openRate, orderRate, paidRate
- Sắp theo doanh thu giảm dần
- Link công khai = "Link bộ sưu tập công khai"

### 10.2 Phễu theo kênh chia sẻ ✅
[`catalog-channel.ts`](../../src/modules/greeting-card/domain/catalog-channel.ts)
```
VIEW → DETAIL → FORM_OPEN → ORDER
```
- 6 kênh: Zalo, Facebook, Instagram, TikTok, Website, Khác
- `truc-tiep` cho kênh lạ/trống
- Unique visitor (hash ngẫu nhiên client-side, không IP/SĐT)

---

## 11. Security

| Điểm | Trạng thái | Chi tiết |
|---|---|---|
| Tenant isolation | ✅ | Mọi bảng có `organization_id`, lọc ở infra |
| Input validation | ✅ | Zod schema ([`public-order-schema.ts`](../../src/modules/greeting-card/contracts/public-order-schema.ts)) + domain validation |
| Giá server-side | ✅ | Giá tính ở server, không nhận giá từ client |
| Webhook auth | ✅ | SHA-256 hash, key chỉ lưu băm |
| Credentials encryption | ✅ | AES-256-GCM cho Zalo/eSMS, không trả ra client |
| Phone masking | ✅ | Che SĐT trong nhật ký thông báo |
| Public view filtering | ✅ | `PublicBrochureSessionView` loại bỏ SĐT, org_id, sale_id |
| Send code unpredictable | ✅ | 8 ký tự ngẫu nhiên Crockford base32 |
| Rate limiting | ❌ | Không có rate limiting trên public API |
| CSRF protection | ❓ | Chưa xác minh — phụ thuộc middleware chung |
| Bot detection | ❌ | Không có captcha/challenge trên form đặt hoa |

---

## 12. Testing

### 12.1 Domain Tests (Pure unit) ✅
[`domain/__tests__/`](../../src/modules/greeting-card/domain/__tests__) — **17 test file**:
- `greeting-card-rules.test.ts` (5.9KB)
- `brochure-pricing.test.ts` (4.1KB)
- `brochure-payment-policy.test.ts` (3.2KB)
- `brochure-commerce-rules.test.ts` (2.8KB)
- `step-sla-visibility.test.ts` (2.6KB)
- `worklist.test.ts` (2.7KB)
- `greeting-template-registry.test.ts` (2.4KB)
- `payment-check.test.ts` (2.3KB)
- `link-expiry-and-funnel.test.ts` (2.1KB)
- `tracking-filters.test.ts`, `tracking-pipeline.test.ts`
- `link-ownership.test.ts`, `internal-message.test.ts`
- `bank-transfer-matching.test.ts`, `catalog-channel.test.ts`
- `customer-notifications.test.ts`, `discount-request.test.ts`

### 12.2 Tenant Isolation Tests ✅
12 test file trong [`tests/tenant/`](../../tests/tenant):
- `greeting-card.test.ts` — Core flow
- `greeting-card-checkout.test.ts`
- `greeting-card-payments.test.ts`
- `greeting-card-quote.test.ts`
- `greeting-card-bank-sync.test.ts`
- `greeting-card-messages.test.ts`
- `greeting-card-notifications.test.ts`
- `greeting-card-hardening.test.ts`
- `greeting-card-reorder-photos.test.ts`
- `greeting-card-share-links.test.ts`
- `greeting-catalog-products-events.test.ts`

### 12.3 E2E Tests ⚠️
- [`tests/e2e/brochure-swipe.spec.ts`](../../tests/e2e/brochure-swipe.spec.ts) — 1 file, chưa rõ phạm vi

---

## 13. Feature Flags ✅
[`feature-flags.ts`](../../src/modules/greeting-card/feature-flags.ts)
- `GREETING_CARD_ENABLED` env var — mặc định **bật**
- Chỉ gọi server-side

---

## 14. Gaps & Enterprise-Readiness Assessment

### 14.1 Gaps — Missing / Cần nâng cấp

| # | Hạng mục | Trạng thái | Chi tiết | Mức độ |
|---|---|---|---|---|
| G1 | **Rate Limiting trên Public API** | ❌ Missing | Không có rate limiting trên `/api/v1/public/brochure/*` và `/api/v1/public/greeting-catalog/*`. Dễ bị DDoS / spam order | 🔴 Critical |
| G2 | **Bot/Spam Protection** | ❌ Missing | Form đặt hoa công khai không có captcha/challenge. Có thể bị spam đơn hàng giả | 🔴 Critical |
| G3 | **Audit Trail** | ❌ Missing | Không có bảng audit log riêng. Ai sửa gì, khi nào? Đặc biệt quan trọng cho xác nhận thanh toán, huỷ đơn, hoàn tiền | 🔴 Critical (Enterprise) |
| G4 | **Hoàn tiền (Refund)** | ⚠️ Partial | Có API route `orders/[id]/refund` + capability `R10`, nhưng logic hoàn tiền tự động (qua bank API) chưa triển khai | 🟡 Important |
| G5 | **Multi-currency** | ❌ Missing | Hardcode VND toàn bộ. Tên hàm đều có `Vnd`, `toLocaleString("vi-VN")` | 🟡 Future |
| G6 | **Multi-language** | ❌ Missing | Toàn bộ error messages, UI labels, SMS content bằng tiếng Việt hardcode | 🟡 Future |
| G7 | **Inventory Check** | ❌ Missing | Không kiểm tồn kho khi đặt hoa. Đơn chấp nhận bất kể sản phẩm có sẵn không | 🟡 Important |
| G8 | **Reporting & Export** | ❌ Missing | Không có xuất CSV/Excel cho đơn hàng, phễu bán hàng, doanh thu | 🟡 Important |
| G9 | **Email Notification** | ❌ Missing | Chỉ có Zalo ZNS và SMS. Không có email confirmation/receipt | 🟢 Nice-to-have |
| G10 | **Scheduled Sending** | ❌ Missing | Không hẹn giờ gửi link — chỉ tạo link ngay | 🟢 Nice-to-have |
| G11 | **Batch Link Generation** | ❌ Missing | Chỉ tạo từng link. Không hỗ trợ import danh sách khách → sinh link hàng loạt | 🟡 Important |
| G12 | **Customer CRM** | ❌ Missing | Không liên kết khách hàng qua nhiều đơn. `customer_phone` lưu ở session, không normalised vào bảng customers | 🟡 Important |
| G13 | **Template Live Preview khi chọn** | ⚠️ Partial | Có `template-selector-split-pane.tsx` (18KB) nhưng xem trước sử dụng mock data, không phải dữ liệu sản phẩm thật của tiệm | 🟢 Nice-to-have |
| G14 | **Interactive Decks (8 mẫu exploratory)** | ⚠️ Partial | Có renderer và định nghĩa nhưng thiếu swipe engine hoàn chỉnh — có thể là dead code hoặc prototype | 🟢 Future |
| G15 | **Caching Strategy** | ❌ Missing | Không có caching layer cho public catalog pages. Mỗi request đều query DB | 🟡 Important (Performance) |
| G16 | **Pagination trên Tracking Pipeline** | ⚠️ Partial | `get-tracking-pipeline.ts` (12.6KB) load toàn bộ pipeline items rồi lọc client-side | 🟡 Important (Performance) |
| G17 | **Webhook Retry & DLQ** | ❌ Missing | Webhook SePay xử lý một lần, không có retry queue hay dead-letter queue | 🟡 Important |
| G18 | **Payment Gateway đa dạng** | ⚠️ Partial | Chỉ có SePay (bank transfer matching). Chưa có Momo, ZaloPay, VNPAY, COD | 🟡 Important |
| G19 | **Customer Tracking Page SEO** | ⚠️ Partial | Trang tracking có link `/api/v1/public/brochure/tracking/[code]` nhưng không có trang SSR riêng cho SEO | 🟢 Nice-to-have |
| G20 | **Media Upload cho Điều phối** | ✅ Implemented | Giới hạn: 1–5 ảnh, 0–2 video (max 15s), ảnh max 10MB, video max 50MB. Nhưng **lưu trữ media ở đâu chưa rõ** — cần kiểm thêm | ❓ Unclear |
| G21 | **Collage / Ảnh ghép bộ sưu tập** | ⚠️ Partial | Có API route `catalogs/[id]/collage` nhưng chưa kiểm tra logic bên trong | 🟢 Nice-to-have |
| G22 | **A/B Testing Template** | ❌ Missing | Không có cơ chế A/B test template nào ra khách thật | 🟢 Future |
| G23 | **Observability / Logging** | ❌ Missing | Không thấy structured logging trong module — chỉ dựa vào lỗi HTTP | 🟡 Important (Enterprise) |
| G24 | **OpenTelemetry / Tracing** | ❌ Missing | Không có distributed tracing cho luồng public → order → payment | 🟢 Future |
| G25 | **Graceful Degradation** | ⚠️ Partial | Circuit breaker cho Zalo/eSMS, nhưng không có fallback khi VietQR down | 🟡 Important |

### 14.2 Điểm mạnh đáng ghi nhận

| # | Điểm mạnh | Chi tiết |
|---|---|---|
| S1 | **Domain purity** | 31 domain file hoàn toàn pure TypeScript, không import Prisma |
| S2 | **Domain test coverage** | 17 domain test file + 12 tenant isolation test file |
| S3 | **Payment policy flexibility** | Cọc %, yêu cầu thu trước cắm/giao, giữ đơn đếm ngược — rất sát thực tế tiệm hoa |
| S4 | **Pipeline SLA + đơn kẹt** | Phát hiện tự động đơn chậm tiến độ, gợi ý hành động, theo vai |
| S5 | **Truy vết link → sale** | Mỗi link sao chép có owner, phiên khách tính cho đúng sale |
| S6 | **Security credentials** | AES-256-GCM cho Zalo/eSMS, SHA-256 cho webhook key, phone masking |
| S7 | **20 template phong cách** | Nhiều lựa chọn thị giác — dù 8 mẫu interactive chưa production-ready |
| S8 | **Giá server-side** | Không bao giờ tin giá client → tránh gian lận |
| S9 | **Inbox theo vai** | Gom việc cần làm vào một chỗ theo vai (Admin/Sale/Coordinator) |
| S10 | **Discount workflow** | Sale xin → Admin duyệt với trần cấu hình, có audit trail cơ bản |
| S11 | **Feature flag** | Có thể tắt toàn bộ tính năng qua env var |
| S12 | **Delivery schedule** | Giờ chốt + thời gian chuẩn bị → tự loại slot không kịp |

---

## 15. File Count Summary

| Loại | Số lượng |
|---|---|
| Domain files | 31 |
| Domain tests | 17 |
| Use-case files | 33 |
| Infra repositories | 14 |
| Adapters | 3 |
| Contracts | 2 |
| UI Components (tổng) | ~80+ |
| API Routes (internal) | ~30 |
| API Routes (public) | ~10 |
| SSR Pages | 5 |
| Tenant tests | 12 |
| E2E tests | 1 |
| **Tổng file ước tính** | **~200+** |

---

## 16. Kết luận: Mức độ sẵn sàng thương mại

> **Đánh giá tổng thể: ⚠️ Đủ dùng cho SMB, cần bổ sung đáng kể cho Enterprise.**

### Đã đạt (Core Product) ✅
- Luồng bán hàng end-to-end (Sale tạo link → Khách chọn → Đặt → Thanh toán → Cắm hoa → Giao → Hoàn tất)
- Multi-tenant isolation + RBAC capability-based
- Thanh toán QR + đối soát tự động
- Thông báo khách (Zalo ZNS + SMS)
- Pipeline theo dõi 9 bước + SLA + inbox theo vai
- 12 template swipe chất lượng cao
- Discount workflow (Sale xin → Admin duyệt)
- Domain logic tách biệt, test coverage tốt

### Cần ưu tiên cho Enterprise ❌
1. **Rate limiting + Bot protection** (Security)
2. **Audit trail** (Compliance)
3. **Reporting & Export** (Operations)
4. **Caching + Pagination tối ưu** (Performance)
5. **Webhook retry + DLQ** (Reliability)
6. **Inventory check** (Business accuracy)
7. **Customer CRM linkage** (Growth)
8. **Observability** (DevOps)
