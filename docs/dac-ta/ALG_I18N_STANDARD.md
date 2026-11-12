# ALG — I18N (INTERNATIONALIZATION) STANDARD
> **Mã định danh:** `DOC-ARCH-I18N-001`  
> **Cấp thẩm quyền:** Level 2 — Architectural SSOT  
> **Áp dụng cho:** Toàn bộ Frontend (RSC, Client Components), Backend (API Routes, Use-Cases) và Notification Services của ALG.

---

## 0. TRẠNG THÁI TRIỂN KHAI (đối chiếu code 30/10/2026)

| Mục | Trạng thái | Bằng chứng / cưỡng chế |
|---|---|---|
| §2 Catalog vi/en theo phân hệ | ✅ Đã có | `src/lib/i18n/locales/{vi,en}/` |
| §3.1 Nội suy `{var}` | ✅ Đã có | `interpolate()` — `server.ts` |
| §3.2 Số nhiều `tp()` | 🟡 **Lộ trình — chưa có hàm** | Không dùng `tp()` cho tới khi được thêm |
| §4 Fallback locale → vi → nhãn thân thiện (production) | ✅ Đã có | `translate()`, `missingKeyLabel()` — `i18n-integrity.test.ts` |
| §4 Đối xứng vi/en mọi cấp khóa | ✅ Đã có | `i18n-integrity.test.ts` |
| §5 Formatter SSOT, múi giờ GMT+7 | ✅ Đã có · 🟡 áp dụng một phần | Ratchet `tests/unit/architecture/i18n-direct-intl-ratchet.test.ts` (baseline 172 file, chỉ được giảm) |
| §6 Mã lỗi API `{ code, message }` | 🟡 **Lộ trình — 0 route áp dụng** | Route mới nên theo; không refactor route cũ khi chưa có lệnh |
| §1.1 `domain/` không phụ thuộc i18n | 🔴 **Đang vi phạm — 9 file `domain/` import `@/lib/i18n`** | Nợ kỹ thuật; không thêm import mới vào `domain/` — truyền chuỗi/formatter từ use-case hoặc UI |

> Agent: chỉ coi là "chuẩn đang chạy" những mục ✅. Mục 🟡/🔴 là đích đến, không phải thực tế.

---

## 1. MỤC TIÊU & NGUYÊN TẮC CỐT LÕI

1. **Clean Separation of Concerns**: Tách biệt hoàn toàn Business Logic với chuỗi hiển thị giao diện. Tuyệt đối không import thư viện giao diện hoặc i18n context vào tầng `domain/`.
2. **Single Source of Truth (SSOT)**: Mọi chuỗi văn bản cố định trên UI phải được quản lý tập trung trong Translation Catalog (`src/lib/i18n/locales/`).
3. **Zero UI Disruption**: Hệ thống i18n không được làm lộ translation key (như `common.errors.unknown`) lên màn hình khi xảy ra lỗi fallback.
4. **Type-Safety**: Khóa bản dịch (Translation Keys) phải được kiểm tra chặt chẽ bởi TypeScript compiler với đệ quy dot-notation typesafe.
5. **Multi-Tier & Dynamic Industry Awareness**: Kết hợp hài hòa giữa từ điển tĩnh đa ngôn ngữ và từ điển động theo ngành (`IndustryPluginContract.terminology`) và 4 tầng kiến trúc (`getTierTerminology`).

---

## 2. QUY ƯỚC TRANSLATION KEY & CATALOG STRUCTURE

### 2.1. Cấu trúc thư mục Catalog (`src/lib/i18n/locales/`)

```
src/lib/i18n/locales/
├── vi/                      # Locale gốc mặc định (SSOT Tiếng Việt)
│   ├── index.ts             # Tổng hợp viDictionary
│   ├── common.ts            # Từ vựng dùng chung: actions, states, modal, pagination, validation
│   ├── layout.ts            # Navigation, header, sidebar, user-menu, footer, shortcuts
│   ├── home.ts              # Màn hình bắt đầu 4 tầng, greeting, selection grid
│   ├── orders.ts            # Quản lý đơn hàng, quy trình xử lý, chi tiết, trạng thái
│   ├── products.ts          # Danh mục sản phẩm, biến thể, bảng giá, kho
│   ├── greeting-card.ts     # Phân hệ Thẻ chào, Brochure khách, đặt hàng, thanh toán
│   ├── notifications.ts     # Thông báo hệ thống, push, SMS, Telegram/Zalo templates
│   ├── platform.ts          # Quản trị Tầng 1 (Console, Tenant, Cổng AI, Giấy phép)
│   ├── settings.ts          # Cài đặt cửa hàng, chính sách, thành viên, vai trò
│   ├── storage.ts           # Kho lưu trữ file, rác, bộ nhớ
│   └── toolkit.ts           # 51 công cụ nghiệp vụ vận hành
└── en/                      # Locale Tiếng Anh (Cấu trúc đối xứng 100% với vi/)
    ├── index.ts
    ├── common.ts
    └── ...
```

### 2.2. Quy ước đặt Translation Key (Dot-Notation)
Mỗi khóa dịch tuân theo quy tắc: `<module>.<feature>.<element_type>.<identifier>`
- `<module>`: Tên phân hệ nghiệp vụ (`common`, `orders`, `products`, `layout`, v.v.).
- `<feature>`: Khu vực tính năng (`header`, `form`, `table`, `modal`, `actions`, `errors`).
- `<element_type>`: Loại phần tử (`label`, `title`, `placeholder`, `helper`, `confirm`, `badge`).
- `<identifier>`: Tên mô tả ngữ cảnh (`create`, `empty_state`, `delivery_date`).

*Ví dụ:*
- `orders.list.actions.create` -> "Tạo đơn hàng" / "Create Order"
- `common.validation.required` -> "{field} không được để trống" / "{field} is required"
- `layout.sidebar.toolkit_shortcuts` -> "Lối tắt công cụ" / "Toolkit Shortcuts"

---

## 3. CƠ CHẾ NỘI SUY (INTERPOLATION) & XỬ LÝ SỐ NHIỀU (PLURALIZATION)

### 3.1. Interpolation Engine
- Sử dụng cú pháp token `{variableName}`.
- Không được ném lỗi runtime nếu thiếu param; tự động giữ nguyên token hoặc fallback chuỗi rỗng:
```typescript
interpolate("Chào mừng {userName} quay trở lại!", { userName: "Tuấn" })
// => "Chào mừng Tuấn quay trở lại!"
```

### 3.2. Pluralization Engine (Quy tắc số nhiều)
Tiếng Việt không biến đổi hình thái từ theo số lượng, nhưng tiếng Anh và các ngôn ngữ mở rộng có dạng `one`, `other` (hoặc `zero`, `few`, `many`).
- Thiết kế hỗ trợ sub-keys theo chuẩn `Intl.PluralRules`:
```typescript
// Trong orders.ts:
itemCount: {
  one: "{count} sản phẩm",
  other: "{count} sản phẩm"
}
// Trong tiếng Anh:
itemCount: {
  one: "{count} item",
  other: "{count} items"
}
```
- Helper `tp(key, count, params)` tự động truy xuất `Intl.PluralRules(locale).select(count)`.

---

## 4. CHÍNH SÁCH MISSING KEY & AN TOÀN FALLBACK

1. **Thứ tự Fallback**:
   - Bước 1: Tra cứu trong từ điển ngôn ngữ hiện tại (vd `en`).
   - Bước 2: Nếu không thấy (hoặc chuỗi rỗng), fallback về từ điển gốc Tiếng Việt (`vi`).
   - Bước 3: Nếu trong `vi` vẫn không có:
     - Trong môi trường `production`: Trả về phần nhãn cuối cùng của key (sau khi viết hoa chữ cái đầu và thay dấu chấm bằng khoảng trắng) hoặc chuỗi thân thiện, **tuyệt đối không hiển thị mã `module.feature.key` thô**.
     - Trong môi trường `development` / `test`: trả nguyên key (dev kèm `console.warn("[i18n] Missing translation key …")`) để developer phát hiện ngay lập tức.
   - Chuỗi rỗng `""` được coi là thiếu và fallback về `vi`.
2. **Kiểm thử tự động đối xứng (Symmetry Test)**:
   - File test `src/lib/i18n/__tests__/i18n.test.ts` bắt buộc kiểm tra 100% key (mọi cấp, xem `i18n-integrity.test.ts`) của `viDictionary` phải tồn tại tương ứng trong `enDictionary` (Zero Missing Keys).

---

## 5. FORMATTER SSOT (DATE, TIME, NUMBER, CURRENCY)

Tất cả các định dạng số học và thời gian phải đi qua thư viện Formatter tập trung tại `src/lib/i18n/formatters.ts`, tuyệt đối cấm gọi `new Intl.NumberFormat()` hoặc `toLocaleDateString()` trực tiếp trong components:

```typescript
// src/lib/i18n/formatters.ts
export function formatCurrency(amount: number, locale: SupportedLocale = "vi", currency = "VND"): string
export function formatDate(date: Date | string | number, locale: SupportedLocale = "vi", options?: Intl.DateTimeFormatOptions): string
export function formatTime(date: Date | string | number, locale: SupportedLocale = "vi"): string
export function formatNumber(value: number, locale: SupportedLocale = "vi", options?: Intl.NumberFormatOptions): string
```
- Múi giờ mặc định cho toàn bộ thao tác ngày giờ là `Asia/Ho_Chi_Minh` (GMT+7).
- Dữ liệu lưu trong DB luôn là ISO UTC (`toISOString()`), chỉ định dạng khi render ra UI.

---

## 6. RANH GIỚI FRONTEND, BACKEND & API ERROR HANDLING

1. **Frontend**:
   - Sử dụng hook `const { t, dict, locale, ti } = useI18n()` trong Client Components.
   - Sử dụng `translate(locale, key, params)` hoặc `getDictionary(locale)` trong React Server Components.
2. **Backend & API Error Contracts**:
   - Cấm trả chuỗi lỗi tiếng Việt thuần túy trong field `error: string`.
   - Chuẩn hóa cấu trúc API Response lỗi:
   ```json
   {
     "success": false,
     "error": {
       "code": "ORDER_NOT_FOUND",
       "message": "Không tìm thấy đơn hàng yêu cầu.",
       "details": {}
     }
   }
   ```
   - Client Component bắt `error.code` và map vào từ điển: `t(apiErrors[code])` kèm fallback về `error.message`.

