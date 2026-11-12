---
name: copywriting-governance
description: >-
  Quy chuẩn và quy trình toàn diện về quản trị nội dung UI, kiểm soát ngôn từ thương mại
  và xây dựng kiến trúc Đa ngôn ngữ (i18n) đạt chuẩn SSOT cấp độ 2 cho ALG và các
  dự án SaaS. Kích hoạt khi agent rà soát, viết mới hoặc chuẩn hóa câu chữ giao diện,
  loại bỏ jargon kỹ thuật (BOM, Master Index, PII, mã R8), thiết lập từ điển tập trung
  (src/lib/i18n/locales/), hoặc tích hợp i18n hook useI18n() vào components.
---

> **Cập nhật 30/10/2026 — đọc trước.** Đối chiếu code + trạng thái: `.agents/standards/smeos/04-i18n.md`; nguyên tắc chung: `.agents/standards/universal/04-i18n.md`; SSOT: `docs/dac-ta/ALG_I18N_STANDARD.md` §0.
> - Định dạng chỉ qua `src/lib/i18n/formatters.ts` (`formatCurrency` vi → `"350.000 ₫"`); ratchet `tests/unit/architecture/i18n-direct-intl-ratchet.test.ts`.
> - Thêm khóa vào **cả** `vi` và `en` — `i18n-integrity.test.ts` so mọi cấp khóa.
> - **Chưa có, không dùng:** `tp()` số nhiều; mã lỗi API `{ code, message }`.
> - Không thêm import `@/lib/i18n` vào `domain/` (nợ #192).


# UI Copywriting Governance & Full i18n SSOT Architecture (Cấp độ 2)

> **Mục đích**: Hướng dẫn chuẩn hóa ngôn từ thương mại, xóa bỏ biệt ngữ kỹ thuật và thiết lập Kiến trúc Đa ngôn ngữ (Full i18n Architecture) theo nguyên tắc **Single Source of Truth (SSOT) — "Sửa một chỗ, cập nhật toàn bộ hệ thống"**. Áp dụng cho ALG và có thể tái sử dụng cho bất kỳ dự án SaaS nào trên Antigravity IDE.

---

## 1. Tôn Chỉ Ngôn Từ & Văn Phong SaaS (Tone of Voice & Jargon Elimination)

Mọi văn bản hiển thị trên giao diện người dùng (UI) bắt buộc phải tuân thủ 4 nguyên tắc cốt lõi:

1. **Nói ngôn ngữ của Khách hàng, không nói ngôn ngữ của Lập trình viên**:
   - Giao diện dành cho người vận hành thực tế (chủ tiệm hoa, thợ cắm hoa, nhân viên bán hàng).
   - Tuyệt đối không để lộ thuật ngữ kỹ thuật, từ viết tắt nội bộ hoặc khái niệm cơ sở dữ liệu lên mắt người dùng.
2. **Bộ lọc cấm Jargon Kỹ thuật (Enforced by UX Lint R12)**:
   - ❌ **CẤM**: `BOM`, `Master Index`, `PII`, `Sale Pitch`, `Atomic Disaggregated`, `Vision Engine`, `Entity`, `Payload`.
   - ✅ **THAY BẰNG**: `Công thức cành hoa`, `Định lượng chi tiết`, `Danh mục mẫu`, `Bảo mật thông tin khách hàng`, `Kịch bản tư vấn`.
3. **Cấm hiển thị mã định danh kỹ thuật (Enforced by UX Lint R8)**:
   - Tuyệt đối không hiển thị mã phân hệ hay sprint như `M01a`, `M09`, `Khu vực D`, `SSOT`, `P0`, `Chặng 02` lên nhãn, tiêu đề, tooltip hoặc badge.
4. **Việt hóa tự nhiên, chuẩn chính tả & Định dạng số học**:
   - Sử dụng Sentence case cho tiêu đề (viết hoa chữ cái đầu câu, không viết hoa từng từ kiểu Title Case tiếng Anh, không lạm dụng ALL CAPS).
   - Đơn vị tiền tệ chuẩn Việt Nam: dùng ký hiệu `₫` phía sau số (vd: `500.000 ₫`, không viết `500k`, `500.000 đ`).
   - Dùng liên từ `"và"` thay vì ký tự `&` trong câu văn mô tả hoặc tiêu đề chính thức.

---

## 2. Quy trình 4 Bước Kiểm Kê Nội Dung (Copywriting Inventory SOP)

Khi tiếp nhận một hệ thống hiện hữu cần chuẩn hóa câu từ:

### Bước 1: Khảo sát & Phân cụm màn hình (Clustering)
Chia toàn bộ hệ thống thành các phân cụm màn hình nghiệp vụ rõ ràng (ví dụ: Trang chủ, Đơn hàng, Sản phẩm, Kho lưu trữ, Hồ sơ, Cài đặt, Thông báo).

### Bước 2: Lập bảng Kiểm kê (Inventory Matrix)
Tạo file markdown kiểm kê cho từng cụm (vd: `docs/copywriting-inventory/01-trang-chu.md`) theo cấu trúc bảng chuẩn hóa:

```markdown
| Mã Copy | Loại | Vị trí hiển thị | Nội dung HIỆN TẠI trên UI | Nội dung BẠN CHUẨN HÓA (Mới) | Ghi chú ngữ cảnh |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ORD-HDR-01` | `HDR` | Tiêu đề chính trang | `Đơn Hàng & Kênh Chào Bán` | `Đơn hàng` | Tiêu đề lớn H1 |
| `ORD-BTN-01` | `BTN` | Nút chính góc phải | `Tạo đơn mới` | `Tạo đơn mới` | Kèm icon Plus |
| `ORD-GDC-01` | `BDG` | Huy hiệu hướng dẫn | `HƯỚNG DẪN QUẢN LÝ ĐƠN HÀNG M09` | `HƯỚNG DẪN XỬ LÝ ĐƠN HÀNG` | Xóa mã M09 theo R8 |
```

*Quy ước mã Loại*: `HDR` (Tiêu đề/Mô tả), `BTN` (Nút bấm), `TAB` (Thẻ chuyển tab), `LBL` (Nhãn trường), `PH` (Gợi ý placeholder), `BDG` (Huy hiệu), `MSG` (Thông báo Toast), `ERR` (Lỗi validation), `CFM` (Modal xác nhận).

---

## 3. Kiến Trúc Cấp Độ 2: Full i18n SSOT Dictionary Engine

Đây là tiêu chuẩn cao nhất cho SaaS quy mô thương mại. Hệ thống được thiết kế **Zero-Dependency (Không cần cài thư viện ngoài)**, hỗ trợ 100% cả React Server Components (RSC) và Client Components, bảo đảm an toàn kiểm tra kiểu (Type-safe đệ quy).

### Cấu trúc Module chuẩn (`src/lib/i18n/`):
```text
src/lib/i18n/
├── types.ts                    # DeepString<T>, TranslationKey (dot-notation), InterpolationParams
├── server.ts                   # getDictionary(), translate(), interpolate() cho RSC & Backend
├── context.tsx                 # I18nProvider, useI18n() hook cho Client Components
├── index.ts                    # Re-export API duy nhất
└── locales/
    ├── vi/                     # BỘ TỪ ĐIỂN CHUẨN GỐC (TIẾNG VIỆT SSOT)
    │   ├── common.ts           # Thuật ngữ, nút bấm, phân trang, trạng thái chung
    │   ├── home.ts             # Trang chủ & Hành trình (Journey)
    │   ├── orders.ts           # Đơn hàng & Điều phối
    │   ├── products.ts         # Sản phẩm, Tạo mẫu, Nhập Excel, Scan ảnh
    │   ├── profile.ts          # Hồ sơ doanh nghiệp & Nhận diện
    │   ├── settings.ts         # Cài đặt hệ thống & Thành viên
    │   ├── notifications.ts    # Toast, Validation errors, Destructive Modals
    │   └── index.ts            # viDictionary bundling toàn bộ namespaces
    └── en/                     # MẪU NGÔN NGỮ MỞ RỘNG (TIẾNG ANH ĐỐI CHIẾU 1:1)
        └── index.ts            # enDictionary đối chiếu cấu trúc hoàn chỉnh
```

---

## 4. Đặc Tả Triển Khai Kỹ Thuật (Implementation Blueprint)

### A. Hệ thống Kiểu Dữ Liệu An Toàn (`types.ts`)
Sử dụng đệ quy `DeepString<T>` để vừa ép kiểu chuỗi string cho mọi ngôn ngữ, vừa tự động sinh khóa dot-notation type-safe:

```typescript
import type { viDictionary } from "./locales/vi"

export type SupportedLocale = "vi" | "en"
export const DEFAULT_LOCALE: SupportedLocale = "vi"
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ["vi", "en"] as const

export type DeepString<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string
}

export type I18nDictionary = DeepString<typeof viDictionary>
export type InterpolationParams = Record<string, string | number>

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

export type TranslationKey = NestedKeyOf<typeof viDictionary>
```

### B. Hàm Dịch & Giải Biến Nội Suy (`server.ts`)
Hỗ trợ cả Server Components và xử lý an toàn khi thiếu khóa (fallback về tiếng Việt):

```typescript
export function interpolate(text: string, params?: InterpolationParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`
  })
}

export function translate(
  locale: SupportedLocale = "vi",
  key: TranslationKey,
  params?: InterpolationParams
): string {
  const dict = getDictionary(locale)
  const segments = key.split(".")
  let current: unknown = dict

  for (const segment of segments) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      // Fallback về viDictionary nếu ngôn ngữ phụ chưa dịch
      return fallbackTranslate(segments, params, key)
    }
  }

  return typeof current === "string" ? interpolate(current, params) : key
}
```

### C. Client Hook & Context (`context.tsx`)
```typescript
"use client"
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: TranslationKey, params?: InterpolationParams) => translate(DEFAULT_LOCALE, key, params),
      dict: getDictionary(DEFAULT_LOCALE),
    }
  }
  return context
}
```

---

## 5. Quy Chuẩn Sử Dụng Trong Components (Usage Patterns)

### Cách 1: Sử dụng trong Client Components (`"use client"`)
```tsx
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

export function OrderHeader({ totalOrders }: { totalOrders: number }) {
  const { t, dict } = useI18n()

  return (
    <div>
      {/* 1. Gọi trực tiếp qua cây từ điển */}
      <h1>{dict.orders.header.title}</h1>
      
      {/* 2. Gọi qua hàm t() với khóa dot-notation và biến nội suy */}
      <p>{t("orders.filters.totalCount", { count: totalOrders })}</p>
      
      {/* 3. Tác vụ dùng chung */}
      <Button>{dict.common.actions.confirm}</Button>
    </div>
  )
}
```

### Cách 2: Sử dụng trong React Server Components (RSC)
```tsx
import { getDictionary, translate } from "@/lib/i18n/server"

export default async function Page() {
  const dict = getDictionary("vi")
  
  return (
    <main>
      <h1>{dict.home.header.title}</h1>
      <p>{translate("vi", "home.filters.all", { count: 12 })}</p>
    </main>
  )
}
```

---

## 6. Hàng Rào Kiểm Chuẩn Tự Động (Automated UX Lint R12)

Trong file script kiểm chuẩn giao diện (vd: `scripts/ux-lint/rules.ts`), bắt buộc duy trì rule **R12 — Technical Jargon Detector**:

```typescript
export const TECHNICAL_JARGON_PATTERNS = [
  /\bBOM\b/,
  /\bMaster Index\b/i,
  /\bPII\b/,
  /\bSale Pitch\b/i,
  /\bAtomic Disaggregated\b/i,
  /\bVision Engine\b/i,
]

// Chặn đứng vi phạm trong CI/CD:
// npm run lint:ux -- --check
```

---

## 7. Quy Trình Nghiệm Thu & Bàn Giao 4 Cổng (Pre-Handoff Checklist)

Trước khi bàn giao bất kỳ đợt nâng cấp nội dung nào, Agent bắt buộc phải xác nhận 4 cổng:

- [ ] **Cổng 1 (Type-Safety)**: Chạy `npx tsc --noEmit` đạt 0 lỗi type. Không còn bất kỳ thuộc tính undefined nào trong từ điển.
- [ ] **Cổng 2 (Jargon & UX Lint)**: Chạy `npm run lint:ux` đạt 0 vi phạm R12 (không còn từ kỹ thuật trên UI) và không tăng vi phạm R8/R1.
- [ ] **Cổng 3 (Unit & Engine Tests)**: Chạy `npx vitest run src/lib/i18n` (kiểm tra dịch, nội suy, fallback) và `npm test` xanh 100%.
- [ ] **Cổng 4 (Git Hygiene)**: Lưu commit rõ ràng trên nhánh làm việc cục bộ, tuân thủ nguyên tắc bảo mật và không tự ý push khi chưa có lệnh.
