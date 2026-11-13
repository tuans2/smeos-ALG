---
id: SCR-STORE-cai-dat-ai
tier: STORE
module: creative-studio
route: /cai-dat-ai
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

# Screen Contract — Chính Sách & Cài Đặt Năng Lực AI

**Tuyến:** `/cai-dat-ai` · **Tệp chính:** `src/app/(app)/cai-dat-ai/page.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.D3

## 1. Vai và mục đích
- Vai chính (03b): `store_manager`, `operations_manager` · Vai phụ: `platform_admin`
- Phạm vi: organization (chỉ áp dụng trong nội bộ tổ chức hiện tại, không ảnh hưởng tổ chức khác)
- Việc chính: Quản trị sàn bảo vệ dữ liệu khách hàng (PII), trần chi phí credit theo từng phân hệ và thứ tự ưu tiên các nhà cung cấp AI (nội dung, ảnh, video, giọng đọc, nhạc) cho Creative Studio.
- Câu hỏi chính: Năng lực AI nào đang được kích hoạt, mức sàn bảo mật ra sao, thứ tự ưu tiên nhà cung cấp của tiệm được cấu hình thế nào?
- Mật độ: EXPERT (được phép theo 03a UX-005 vì phục vụ quản trị kỹ thuật năng lực AI của tiệm).

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/ai-policy` → Tải danh mục năng lực AI và sàn bảo mật của tổ chức
  - `PUT /api/v1/ai-policy` → Cập nhật sàn bảo mật / trần credit (cần quyền `U2`)
  - `GET /api/v1/creative-production/providers` → Tải danh mục nhà cung cấp và thứ tự ưu tiên của tiệm
  - `PUT /api/v1/creative-production/providers` → Cập nhật thứ tự nhà cung cấp (cần quyền `U2`)
- Khối: 4 khối (Hướng dẫn K1 `FeatureGuidanceCard`, Thông báo trạng thái, Thứ tự nhà cung cấp Creative Studio `ProviderOrderSettings`, Danh mục năng lực AI & sàn bảo mật)
- Nút primary: Tối đa 1 nút "Lưu thứ tự" khi có thay đổi trong `ProviderOrderSettings`
- FeatureGuidanceCard: 1 card duy nhất theo chuẩn K1
- Phân quyền: Gác quyền chuẩn RBAC: `U1` để xem, `U2` để chỉnh sửa/lưu
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên năng lực AI, mã capability, sàn bảo mật (PUBLIC / SHOP / SENSITIVE) | Thẻ năng lực trong danh mục |
| L1 Hành động | Đổi sàn bảo mật (U2), Lưu thứ tự nhà cung cấp (U2), Tải lại | Các nút tác vụ tương ứng |
| L2 Ngữ cảnh | Hướng dẫn K1, phạm vi tổ chức hiện tại, nhà cung cấp được ưu tiên | FeatureGuidanceCard & Box giải thích |
| L3 Chi tiết | Danh sách nhà cung cấp được phép, trần credit, ghi chú dự phòng cục bộ | Nội dung chi tiết trong từng phân loại |

## 4. Hành động
- Chính (1): `Lưu thứ tự` (`variant: "primary"`, chỉ sáng khi có thay đổi thứ tự nhà cung cấp).
- Phụ (≤ 2):
  - `Tải lại` (`variant: "outline"`).
  - `Đổi sàn bảo mật` (`variant: "outline"`).
  - `Lên` / `Xuống` để sắp xếp thứ tự nhà cung cấp.
- Menu `…`: Không cần thiết vì số lượng tác vụ quản trị rõ ràng.

## 5. Content budget
- Nút nổi: Không lạm dụng nút primary; chỉ xuất hiện khi có trạng thái thay đổi cần lưu (dirty state).
- Khối chính: 4 khối trực quan, phân tách ranh giới rõ ràng.
- Ghi chú phạm vi: Nêu rõ "Phạm vi áp dụng chỉ trong tổ chức hiện tại".

## 6. Trạng thái
- Tải: `SkeletonBlock` chuẩn hóa thay cho text thô.
- Không quyền: Màn hình khóa với icon `Lock` và giải thích rõ cần mã năng lực `U1`.
- Không có dữ liệu: Khối nét đứt thông báo chưa có cấu hình năng lực.
- Lỗi/Thành công: Alert box nổi bật với màu WCAG và icon tương ứng.

## 7. Responsive
- 390px: Bố cục 1 cột dọc, các nút sắp xếp thu gọn.
- 768px+: Bố cục lưới 2 cột cho danh sách nhà cung cấp `ProviderOrderSettings`.
- 1280px+: Giới hạn chiều rộng tối đa `max-w-5xl` để giữ độ tập trung mắt.

## 8. Trợ năng
- Bàn phím: Các nút điều hướng lên/xuống có `aria-label="Lên"` và `aria-label="Xuống"`.
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- Nhãn: Toàn bộ nút có text hoặc nhãn aria rõ nghĩa.

## 9. AI
- Là màn hình quản trị cấu hình AI: thể hiện rõ ràng các tầng bảo mật (Luật YC-K1: PII luôn bị khóa SENSITIVE), trần chi phí credit và cơ chế dự phòng cục bộ khi các bên ngoài lỗi.

## 10. Dữ liệu và quyền
- Nguồn sự thật: Bảng `ai_policies` và `provider_catalog`.
- Quyền: `U1` (xem cấu hình AI), `U2` (hiệu chỉnh trần và thứ tự nhà cung cấp).

## 11. Component
- Dùng lại: `Button`, `Badge`, `SkeletonBlock`, `FeatureGuidanceCard`, `ProviderOrderSettings`, `InfoTip`.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Text "Đang tải dữ liệu chính sách AI..." | Chuẩn hóa SkeletonBlock | Dùng `<SkeletonBlock lines={4} />` | Tuân thủ UX-006 trạng thái tải | `cai-dat-ai/page.tsx` |
| Chưa nhấn mạnh phạm vi tổ chức | Tuân thủ 03a IA-005 | Thêm chú thích "Phạm vi áp dụng chỉ trong tổ chức hiện tại" | Tránh hiểu lầm cấu hình ảnh hưởng toàn hệ thống SaaS | `cai-dat-ai/page.tsx` |
| Sàn bảo mật SENSITIVE | Khóa cứng không cho đổi | Duy trì badge cảnh báo `Lock` và vô hiệu hóa nút đổi | Tuân thủ tuyệt đối Luật YC-K1 và sàn quyền riêng tư | `cai-dat-ai/page.tsx` |
| Dòng "Mô hình" in tên model (Claude, Gemini…) | OPERATING §2: không tên model trên màn hình | Hiện mô tả tiếng Việt theo khoá từ `provider-catalog` (`model-label.ts`); tên model chỉ trong `InfoTip` | T3-6 phương án A, quyết định 11/11/2026 (chờ PO xác nhận trước khi gộp) | `cai-dat-ai/page.tsx`, `model-label.ts` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
