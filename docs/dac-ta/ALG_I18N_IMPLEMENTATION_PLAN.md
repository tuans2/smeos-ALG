# ALG — I18N, L10N & UX WRITING IMPLEMENTATION PLAN
> **Mã định danh:** `DOC-PLAN-I18N-001`  
> **Cấp thẩm quyền:** Level 2 — Architectural Implementation Plan  
> **Phương châm:** Chia nhỏ, an toàn, dễ rollback, zero breaking changes, không phá hỏng API hợp đồng.

---

## 1. TỔNG QUAN CÁC GIAI ĐOẠN TRIỂN KHAI

```
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: Củng cố Nền tảng Kỹ thuật i18n & Formatters SSOT               │
│ - Tạo formatters.ts (date, time, number, currency)                     │
│ - Tích hợp Intl.PluralRules vào server.ts & context.tsx                │
│ - Cảnh báo missing key dev-mode & symmetry test kiểm tra vi/en         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 2: Chuẩn hóa API Error Responses & Client Exception Bridge        │
│ - Tạo danh mục mã lỗi chuẩn Core (src/core/errors/error-codes.ts)       │
│ - Tạo helper xử lý lỗi response type-safe                              │
│ - Bổ sung catalog bản dịch mã lỗi vào common.ts (vi/en)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 3: Triển khai theo từng Cụm Màn hình Ưu tiên (Phased Rollout)     │
│ - Đợt 1: Layout, Navigation, User Menu, Toolkit Shortcuts (Hoàn thành) │
│ - Đợt 2: Quản lý Đơn hàng & Báo giá (/don-hang, /bao-gia, components)  │
│ - Đợt 3: Tháp Điều phối & Nhắc việc (/dieu-phoi, coordinator)          │
│ - Đợt 4: Quản lý Sản phẩm, Kho, Khách hàng & Cài đặt hệ thống         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 4: Rà soát UX Writing, Khử Tech Jargon & Test Hồi quy Toàn diện   │
│ - Kiểm tra Ratchet Lint, Typecheck, Unit Test, E2E UX & A11y           │
│ - Bàn giao & Tài liệu hóa mở rộng ngôn ngữ tiếp theo (ja, ko, zh)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CHI TIẾT CÁC HẠNG MỤC TRIỂN KHAI

### Hạng mục 1: Nâng cấp Động cơ i18n & Formatter SSOT
- **Phạm vi**: `src/lib/i18n/formatters.ts`, `src/lib/i18n/server.ts`, `src/lib/i18n/context.tsx`, `src/lib/i18n/__tests__/i18n.test.ts`.
- **Nhiệm vụ**:
  1. Viết bộ `formatCurrency`, `formatDate`, `formatTime`, `formatNumber` dựa trên `Intl` với locale động từ i18n context.
  2. Bổ sung hỗ trợ số nhiều `tp(key, count, params)` vào `translate` và `useI18n()`.
  3. Bổ sung cảnh báo dev-mode khi missing key.
- **Rủi ro**: Rất thấp (hàm mới độc lập, test unit phủ 100%).
- **Cách kiểm thử**: Chạy `npm test src/lib/i18n`.

### Hạng mục 2: Chuẩn hóa API Error Codes Backend
- **Phạm vi**: `src/core/errors/error-codes.ts`, `src/lib/api-response.ts`.
- **Nhiệm vụ**:
  1. Định nghĩa enum mã lỗi chuẩn: `VALIDATION_FAILED`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_SERVER_ERROR`, `TENANT_MISMATCH`, v.v.
  2. Xây dựng helper chuẩn hóa `apiError(code, message, status)`.
  3. Cập nhật translation catalog `common.apiErrors` cho cả `vi` và `en`.
- **Rủi ro**: Trung bình. Đảm bảo response JSON vẫn giữ field `error: string` để tương thích ngược cho client hiện tại.
- **Cách kiểm thử**: Chạy test bộ API routes hiện có.

### Hạng mục 3: Chuẩn hóa Giao diện Cụm Đơn Hàng & Điều Phối (Batch 1)
- **Phạm vi**: `src/app/(app)/don-hang/`, `src/app/(app)/dieu-phoi/`, các components trong `src/components/coordinator/` và `src/components/orders/`.
- **Nhiệm vụ**:
  1. Đưa các nhãn, trạng thái, modal, bảng điều khiển và thông báo vào `orders.ts` và `common.ts`.
  2. Thay thế các chuỗi hiển thị hardcode bằng `{t('orders...')}` hoặc `{dict.orders...}`.
  3. Thay thế các lệnh gọi format tiền thủ công bằng `formatCurrency()`.
  4. Khử các từ lóng kỹ thuật (`M0..M5`, `Control Tower`) theo Master Glossary.
- **Rủi ro**: Thấp (chỉ tác động lớp hiển thị UI, không can thiệp logic xử lý đơn).
- **Cách kiểm thử**: `npx tsc --noEmit` và `npm run test:e2e:ux`.

### Hạng mục 4: Chuẩn hóa Giao diện Cụm Sản Phẩm & Cài Đặt (Batch 2)
- **Phạm vi**: `src/app/(app)/san-pham/`, `src/app/(app)/cai-dat/`, `src/components/products/`, `src/components/settings/`.
- **Nhiệm vụ**:
  1. Đưa các nhãn form, bảng giá, kho, ma trận cài đặt vào `products.ts` và `settings.ts`.
  2. Thay thế từ `BOM` bằng `Định lượng nguyên vật liệu`.
- **Rủi ro**: Thấp.
- **Cách kiểm thử**: `npx tsc --noEmit`.

---

## 3. CHECKLIST NGHIỆM THU TỪNG BƯỚC

- [ ] **Kiểm tra Type-safety**: `npx tsc --noEmit` đạt 0 lỗi.
- [ ] **Kiểm tra Unit Test**: Toàn bộ test trong `src/lib/i18n` và các module liên quan vượt qua 100%.
- [ ] **Kiểm tra Symmetry**: Không có key nào tồn tại trong `locales/vi/` mà thiếu trong `locales/en/`.
- [ ] **Kiểm tra Fallback**: Chuyển sang locale `en` không gây crash ứng dụng hay bung mã key thô.
- [ ] **Kiểm tra Responsive**: Kiểm tra UI trên mobile viewport (375px) không bị vỡ giao diện với nhãn tiếng Anh.

