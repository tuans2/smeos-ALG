---
id: SCR-STORE-tinh-gia
tier: STORE
module: tinh-gia
route: /tinh-gia
archetype: A
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Giá vốn & định giá (Nhóm công cụ 6, #31–#35)

**Tuyến:** `/tinh-gia/{nguyen-lieu,cong-thuc,gia-von,gia-ban,du-toan}` · **Tệp chính:** `src/app/(app)/tinh-gia/layout.tsx`, `src/components/costing/*` · **Cập nhật:** 29/10/2026 · **Kế hoạch:** `docs/archive/historical/ui-ux-2026-10/NHOM6_TINH_GIA_KE_HOACH.md`

## 1. Vai và mục đích
- Vai chính: chủ tiệm, quản lý sản phẩm · Phạm vi: organization · Mật độ: MEDIUM
- Việc chính: biết mỗi mẫu tốn bao nhiêu, nên bán giá nào và cần mua gì cho đơn sắp giao
- Câu hỏi chính: "Mẫu này bán giá đó có lãi không?"

## 2. Hiện trạng (audit)
- API: §28 đặc tả 06 (`/api/v1/costing/*`) — `L1` xem hồ sơ/công thức, `L3` lưu công thức + áp giá, `L5` xem giá vốn/nguyên liệu/dự toán, `L6` sửa nguyên liệu + ghi đã mua
- Đa ngành: đặc điểm ngành từ `IndustryPluginContract.costing` (`industry-costing-spec.ts`); ngành khai `costing: null` → `EntitlementGate` giải thích chưa hỗ trợ. Ngành hoa là chuẩn đầu tiên
- Trước: chỉ có `/gia` (giá vốn nhập tay); #31/#35 chưa có; #32 chỉ là giá trong BOM

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí |
|---|---|---|
| L0 | Tab theo thứ tự dữ liệu; mỗi tab một con số/danh sách chính (giá vốn, 3 mức giá, danh sách cần mua) | khung nhìn đầu |
| L1 | Lưu nguyên liệu / Lưu công thức / Áp giá / Đánh dấu đã mua | ngay dưới dữ liệu |
| L2 | Lịch sử giá, chi tiết từng nguyên liệu trong giá vốn | mở khi bấm (`Disclosure`, nút `aria-expanded`) |
| L3 | Nhà cung cấp + tồn kho; hao hụt riêng, số phút, ghi chú; giá đối thủ | "Tùy chỉnh thêm" đóng mặc định, có tóm tắt khi đã nhập |
| SYS | Ghép tên không dấu BOM AI ↔ nguyên liệu, hao hụt theo nhóm của ngành, làm tròn giá, sàn/trần `pricing_rules`, ghi `audit_logs` | không hiện mã kỹ thuật |

## 15. Progressive disclosure & rủi ro (03c)
Pattern: UX-P01, UX-P03, UX-P05, UX-P07, UX-P12
| Trường/nút | Tầng | Rủi ro | Xác minh |
|---|---|---|---|
| Thêm/sửa đơn giá nguyên liệu | L1 | R1 (có lịch sử, sửa lại được) | `costing-isolation.test.ts` |
| Ngừng dùng nguyên liệu | L1 | R2 → `ConfirmDialog` (dùng lại được) | E2E `a11y-done-tools.spec.ts` |
| Lưu công thức (bản nháp từ ảnh chỉ là gợi ý) | L1 | R1 (tăng phiên bản) | `costing.test.ts`, tenant |
| Áp giá bán | L1 | R3 → `ConfirmDialog` nêu giá cũ/mới, phạm vi đơn mới; ghi `product.price.apply` | tenant (áp giá) |
| Đánh dấu đã mua | L1 | R2 → `ConfirmDialog`; cộng tồn, giá mua vào lịch sử `PURCHASE` | tenant (đã mua) |
| Giá vốn thiếu dữ liệu | L0 | — không đoán số; nêu đúng thiếu gì + liên kết bổ sung | `costing.test.ts` |
Chi phí: không dùng AI, không tốn credit · ngoại lệ: không.
