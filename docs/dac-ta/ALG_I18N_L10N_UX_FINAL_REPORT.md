# ALG — BÁO CÁO TỔNG KẾT & BÀN GIAO CHUẨN HÓA I18N, L10N VÀ UX WRITING
*Hoàn thành theo Master Prompt 6 giai đoạn — Phiên bản 1.0 (Production-Grade)*

---

## 1. TỔNG QUAN KẾT QUẢ TRIỂN KHAI

Toàn bộ hệ thống nền tảng **ALG** đã trải qua 6 giai đoạn rà soát và chuẩn hóa toàn diện theo 3 lớp:
1. **Internationalization (i18n)**: Xây dựng động cơ đa ngôn ngữ thuần (zero external runtime dependencies), tự động đối chiếu cấu trúc đối xứng giữa các ngôn ngữ, hỗ trợ fallback an toàn và nội suy tham số biến (`interpolate`).
2. **Localization (l10n)**: Thiết lập bộ định dạng chuẩn SSOT duy nhất (`src/lib/i18n/formatters.ts`) xử lý triệt để tiền tệ (`formatCurrency`), số nguyên/thập phân (`formatNumber`), ngày giờ (`formatDate`, `formatTime`, `formatDateTime`) theo múi giờ chuẩn `Asia/Ho_Chi_Minh` và locale người dùng.
3. **UX Writing**: Loại bỏ hoàn toàn các thuật ngữ kỹ thuật trừu tượng (`BOM`, `Control Tower`, `M0..M5`, `Tenant`, `Payload`, `Null/Undefined`) trên toàn bộ bề mặt giao diện người dùng, thay thế bằng thuật ngữ nghiệp vụ thân thiện với chủ cửa hàng và nhân sự vận hành.

---

## 2. CÁC GIAI ĐOẠN ĐÃ THỰC HIỆN

| Giai đoạn | Nội dung thực hiện | Trạng thái |
|---|---|---|
| **Giai đoạn 1** | **Audit hiện trạng**: Rà soát 10 điểm kỹ thuật trong codebase, phát hiện các chuỗi viết trực tiếp, định dạng tiền tệ tự chế (`+ " đ"`, `Intl.NumberFormat` rải rác) và các từ lóng kỹ thuật. | ✅ Đạt 100% |
| **Giai đoạn 2** | **Bộ tài liệu đặc tả tiêu chuẩn**: Ban hành 4 văn bản đặc tả chi tiết tại `docs/dac-ta/`: `ALG_I18N_STANDARD.md`, `ALG_L10N_STANDARD.md`, `ALG_UX_WRITING_GLOSSARY.md`, và `ALG_I18N_IMPLEMENTATION_PLAN.md`. | ✅ Đạt 100% |
| **Giai đoạn 3** | **Cập nhật Rules & Kiến trúc AGENTS**: Mở rộng `.agents/AGENT_RULES.md` (§8 Tiêu chuẩn i18n, l10n và UX Writing) và cập nhật `AGENTS.md` để đảm bảo các session tiếp theo luôn tuân thủ nghiêm ngặt. | ✅ Đạt 100% |
| **Giai đoạn 4** | **Nâng cấp Động cơ cốt lõi (Core Engine)**: Xây dựng `formatters.ts`, tích hợp vào `I18nContext`, cảnh báo dev-mode khi thiếu translation key, viết unit test đạt 9/9 passed. | ✅ Đạt 100% |
| **Batch 1** | Chuẩn hóa Điều phối đơn hàng (`/dieu-phoi`): Thay "Control Tower" thành "Bàn điều phối đơn", kết nối catalog `orders.coordinator.*`. | ✅ Đạt 100% |
| **Batch 2** | Chuẩn hóa Cụm Đơn hàng & Thay thế toàn bộ Formatter tiền tệ/ngày giờ trên Dashboard, Catalog, Availability, Domain modules (`price-guard`, `partner-settlement`, `trend-fit`,...). | ✅ Đạt 100% |
| **Batch 3** | Chuẩn hóa Cụm Sản phẩm (`/san-pham`, `product-card`, `product-table-view`, `product-detail-cards`): Loại bỏ nhãn BOM, đưa vào từ điển `products.*`. | ✅ Đạt 100% |
| **Batch 4** | Chuẩn hóa Cài đặt & Vận hành Nền tảng (`/cai-dat`, `/van-hanh/*`): 10 tab cài đặt cửa hàng và các bảng điều khiển hệ thống SaaS Mother. | ✅ Đạt 100% |

---

## 3. DANH SÁCH COMMITS TRÊN NHÁNH `Toiuu_hienthi_mobile`

1. [`29f51806`](https://github.com/antranhub22/smeOS/commit/29f51806) — `feat(i18n): core engine formatters, docs specification & dieu-phoi page migration`
2. [`2d3fb56e`](https://github.com/antranhub22/smeOS/commit/2d3fb56e) — `feat(i18n): batch 2 — migrate orders, catalog, dashboard & domain formatters to SSOT`
3. [`40b24688`](https://github.com/antranhub22/smeOS/commit/40b24688) — `feat(i18n): batch 3 — products cluster formatter SSOT & catalog i18n expansion`
4. [`b6d7ef99`](https://github.com/antranhub22/smeOS/commit/b6d7ef99) — `feat(i18n): batch 4 — settings tabs & platform console i18n and formatters SSOT`

---

## 4. BẢO TRÌ VÀ NGUYÊN TẮC PHÁT TRIỂN TIẾP THEO

Khi bổ sung tính năng mới hoặc chỉnh sửa giao diện, mọi kỹ sư và agent cần tuân thủ 5 nguyên tắc sau:

1. **Tuyệt đối không tự tạo hàm định dạng**:
   - Sử dụng: `import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/i18n/formatters"`
   - Bị cấm: `new Intl.NumberFormat()`, `.toLocaleDateString()`, `+ " đ"`.

2. **Quy tắc đối xứng Từ điển (Symmetry Invariant)**:
   - Khi thêm bất kỳ key nào vào `src/lib/i18n/locales/vi/`, **bắt buộc** phải thêm key tương ứng vào `src/lib/i18n/locales/en/`.
   - Kiểm tra bằng lệnh: `npm test src/lib/i18n` (bắt buộc 100% pass).

3. **Domain Layer Cleanliness**:
   - Tầng Domain (`src/modules/*/domain/`) được phép import hàm thuần từ `formatters.ts`.
   - Tuyệt đối **không** được import React hooks (`useI18n`) hoặc context vào tầng domain.

4. **UX Writing — Ngôn ngữ lấy nghiệp vụ làm trung tâm**:
   - Sử dụng từ ngữ mộc mạc, rõ ràng: "Đang lưu...", "Chưa có đơn hàng nào", "Thành phần & Nguyên liệu".
   - Tránh tuyệt đối các từ ngữ kỹ thuật hoặc biệt ngữ nội bộ hệ thống.

5. **Pre-commit Gate**:
   - Hệ thống pre-commit hook luôn tự động chạy `npm run check:industry` kiểm tra cả 5 trụ cột (Registry, Unit tests, Typecheck 0 lỗi compile, Terminology Ratchet, AI Prompts & Schemas).
