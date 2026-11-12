---
id: SCR-STORE-tri-thuc
tier: STORE
module: knowledge-base
route: /tri-thuc
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

# Screen Contract — Cẩm Nang Tri Thức & Quy Chuẩn Nhập Liệu

**Tuyến:** `/tri-thuc` · **Tệp chính:** `src/app/(app)/tri-thuc/page.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.D5

## 1. Vai và mục đích
- Vai chính (03b): Mọi vai trò (`store_manager`, `florist`, `sales_specialist`, `operations_manager`)
- Phạm vi: organization / system
- Việc chính: Tra cứu quy chuẩn nhập liệu nguyên tử (Atomic Disaggregated Data), đối chiếu cách làm chuẩn vs lỗi sai thường gặp, và điều hướng nhanh đến phân hệ tương ứng.
- Câu hỏi chính: Các trường dữ liệu nguyên tử nào là bắt buộc cho từng phân hệ, cách nhập liệu chuẩn ra sao, tiến độ dữ liệu onboarding của cửa hàng đạt bao nhiêu?
- Mật độ: MEDIUM (thẻ thông tin rõ ràng, bảng trường nguyên tử thu gọn/mở rộng được).

## 2. Hiện trạng (audit)
- Dữ liệu: `KNOWLEDGE_MODULES` (SSOT tĩnh định nghĩa 7 phân hệ cốt lõi ALG)
- Khối: 5 khối chính:
  1. Header chuẩn Top-Right Action (K2: 1 primary "Mở ALG Copilot" + 1 secondary "Kênh hội thoại đa kênh")
  2. Banner hướng dẫn chuẩn K1 (`FeatureGuidanceCard` duy nhất)
  3. Thước đo tiến độ dữ liệu cửa hàng (`OnboardingProgressBar`)
  4. Thanh tìm kiếm & bộ lọc phân hệ
  5. Danh sách thẻ phân hệ `KnowledgeModuleCard` (chứa bảng dữ liệu nguyên tử + so sánh đúng/sai + nút hành động 1-chạm)
- Nút primary: Đúng 1 nút "Mở ALG Copilot" ở header
- FeatureGuidanceCard: Đúng 1 card duy nhất theo chuẩn K1 (đã loại bỏ card lặp lại trong các thẻ con)
- Trạng thái có sẵn: tải ☑ rỗng ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên phân hệ, huy hiệu phân hệ, thanh tìm kiếm | Header trang & Header từng thẻ |
| L1 Hành động | Mở ALG Copilot, Nút điều hướng đến phân hệ | Header trang & Chân thẻ |
| L2 Ngữ cảnh | Banner K1, Tiến độ onboarding, So sánh cách làm chuẩn vs sai lầm | FeatureGuidanceCard & Box Good/Bad practice |
| L3 Chi tiết | Bảng danh sách trường dữ liệu nguyên tử (kiểu dữ liệu, mô tả, ví dụ SSOT) | Bảng có thể thu gọn/mở rộng trong thẻ |

## 4. Hành động
- Chính (1): `Mở ALG Copilot (⌘K)` (`variant: "primary"`).
- Phụ (≤ 2):
  - `Kênh hội thoại đa kênh` (`variant: "outline"`).
  - `👉 [Hành động phân hệ]` (`variant: "primary"`, trên từng thẻ phân hệ).
  - `Thu gọn / Xem chi tiết` (toggle bảng trường).
- Menu `…`: Không cần thiết.

## 5. Content budget
- Nút nổi: Đúng 1 nút primary lớn trên header.
- Khối chính: Bố cục dọc mượt mà, phân loại rõ ràng theo từng phân hệ.
- Quy chuẩn K1: Đảm bảo toàn bộ trang chỉ hiển thị duy nhất 1 `FeatureGuidanceCard`.

## 6. Trạng thái
- Rỗng: Khi tìm kiếm không khớp, hiển thị khối nét đứt với icon `HelpCircle` và hướng dẫn đổi từ khóa.
- Xem chi tiết: Bảng trường dữ liệu nguyên tử mở mặc định nhưng người dùng có thể bấm thu gọn.

## 7. Responsive
- 390px: Thanh bộ lọc cuộn ngang, bảng trường dữ liệu hỗ trợ cuộn ngang không vỡ layout.
- 768px: Bố cục lưới so sánh 2 cột (Cách chuẩn vs Sai lầm).
- 1280px+: Tối đa `max-w-7xl` căn giữa sang trọng.

## 8. Trợ năng
- Bàn phím: Các nút lọc là thẻ `<button type="button">`, nút Copilot kích hoạt phím tắt ⌘K.
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- Bảng biểu: `<table>` có cấu trúc `<thead/tbody>`, các trường bắt buộc có dấu `*` và `span` trợ năng.

## 9. AI
- Kết nối trực tiếp với ALG Copilot qua sự kiện toàn cục `floraos:open-copilot`, tự động gửi câu hỏi mẫu cho từng phân hệ.

## 10. Dữ liệu và quyền
- Nguồn sự thật: Catalog `KNOWLEDGE_MODULES` (`src/components/knowledge-base/knowledge-data.ts`).
- Quyền: Toàn bộ nhân viên và chủ tiệm đều có thể tra cứu cẩm nang.

## 11. Component
- Dùng lại: `Button`, `Badge`, `FeatureGuidanceCard`.
- Mở rộng: `KnowledgeModuleCard`, `OnboardingProgressBar`.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Mỗi card module đều nhúng `FeatureGuidanceCard` | Tuân thủ luật K1 (tối đa 1 card/màn) | Thay bằng Header thông thường trong Card con, chỉ giữ 1 card ở đầu trang | Tránh spam visual và giảm mỏi mắt cho người dùng | `knowledge-module-card.tsx` |
| Button dùng class `bg-red-600` | Token ngữ nghĩa hệ thống | Dùng `variant="primary"` | Nhất quán design system | `knowledge-module-card.tsx` |
| Mã phân hệ lộ thô "M01 Vision, M02 Giá..." | Tránh lộ mã kỹ thuật | Đổi nhãn thành "Nhận diện ảnh, Cấu hình giá..." | Tuân thủ UX Rule nhãn thân thiện | `tri-thuc/page.tsx` |
| Nút "Hỏi ALG Copilot về phân hệ này" cao 15px | Vùng bấm ≥ 24px (44px cảm ứng) | `TEXT_BUTTON_HIT_AREA` | Đợt 4, D4-07 | `knowledge-module-card.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
