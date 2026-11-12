---
id: SCR-STORE-kho-templates
tier: STORE
module: products
route: /kho-templates
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

# Screen Contract — Kho Templates Hệ Thống

**Tuyến:** `/kho-templates` · **Tệp chính:** `src/app/(app)/kho-templates/page.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.C6

## 1. Vai và mục đích
- Vai chính (03b): `store_manager`, `marketing_specialist`, `product_manager` (mọi vai có tài khoản đều truy cập được).
- Phạm vi: organization
- Việc chính: Tra cứu và xem trước trực quan các khối giao diện template đang chạy thật trong hệ thống được phân loại theo 11 nhóm chức năng nghiệp vụ.
- Câu hỏi chính: Hệ thống có những mẫu giao diện nào cho nghiệp vụ của tôi và mẫu đó hiển thị như thế nào trên thực tế?
- Mật độ: HIGH (danh mục tra cứu tổng thể gồm 50+ templates, thanh tìm kiếm thời gian thực).

## 2. Hiện trạng (audit)
- API: Trang chỉ đọc dữ liệu tĩnh từ `TEMPLATE_PREVIEW_REGISTRY` và SSOT; không gọi endpoint backend.
- Khối: 2 khối chính (Thanh tìm kiếm & Hướng dẫn K1, Danh mục 11 nhóm chức năng template).
- Nút primary: Các nút "Mở màn hình" (`Link` dẫn sang tuyến chạy thật tương ứng).
- FeatureGuidanceCard: 1 card duy nhất theo chuẩn K1 ("Thư viện tra cứu trực quan — không chỉnh sửa tại đây").
- Modal: `TemplatePreviewModal` (chuẩn Base-UI Dialog).
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên chức năng nghiệp vụ, mã phân hệ (M01-M11), tổng số templates | Đầu mỗi nhóm chức năng |
| L1 Hành động | Nút "Mở màn hình" dẫn sang tuyến nghiệp vụ thật | Góc phải mỗi nhóm chức năng |
| L2 Ngữ cảnh | Khối hướng dẫn K1, mục đích và vai trò của từng template | FeatureGuidanceCard & thẻ con |
| L3 Chi tiết | Xem trước mẫu giao diện thật (Popup modal hoặc Drawer) | TemplatePreviewModal |
| L4 Nâng cao | Tên file mã nguồn (`.tsx`) và loại template (Guidance, Kết quả, Xem trước) | Thẻ card template |

## 4. Hành động
- Chính (1): `Mở màn hình` (`Link` primary variant sang trang nghiệp vụ tương ứng).
- Phụ: `Xem trước mẫu` (mở Dialog Base-UI hiển thị mock-up giao diện trực quan).
- Menu `…`: Không có.

## 5. Content budget
- Khối chính: 11 khối chức năng nghiệp vụ.
- Thanh tìm kiếm: Lọc tức thì theo từ khóa tên file, chức năng và mô tả.

## 6. Trạng thái
- Rỗng: Khung border đứt nét báo khi không tìm thấy template nào khớp với từ khóa tìm kiếm.
- Thành công: Danh sách các thẻ template hiển thị đầy đủ kèm chỉ báo "Xem trước mẫu".

## 7. Responsive
- 390px: Lưới 1 cột, tìm kiếm toàn chiều rộng, modal xem trước co giãn theo chiều dọc.
- 768px: Lưới 2 cột.
- 1280px+: Lưới 3 cột cân đối.

## 8. Trợ năng
- Bàn phím: Tìm kiếm nhập liệu ngay, phím Tab duyệt qua các thẻ template, phím Escape đóng modal xem trước.
- Focus: `focus-visible:outline-2 focus-visible:outline-primary`.
- Nhãn: Toàn bộ nút có text rõ nghĩa. Các thẻ xem trước dùng `type="button"`.

## 9. AI
- Không áp dụng trực tiếp tại màn này (đây là thư viện giao diện tham chiếu).

## 10. Dữ liệu và quyền
- Nguồn sự thật: `docs/kien-truc/ALG_TEMPLATE_SYSTEM_SSOT.md` và mã nguồn trong `src/components/templates/`.
- Quyền: Mở cho mọi người dùng đã đăng nhập (không hạn chế theo RBAC).

## 11. Component
- Dùng lại: `Dialog`, `Button`, `FeatureGuidanceCard`.
- Mở rộng: `TemplatePreviewModal` (Base-UI Dialog).
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Modal xem trước template dùng overlay tự chế | Chuẩn hóa Base-UI Dialog | Nâng cấp sang `<Dialog>` Base-UI | Đồng bộ UX-006, hỗ trợ focus-trap và ESC chuẩn | `template-preview-modal.tsx` |
| Nhiều hướng dẫn có thể trùng lặp | Chuẩn hóa K1 duy nhất 1 card | Duy trì đúng 1 `FeatureGuidanceCard` ở đầu trang | Tuân thủ K1 và tránh spam thông tin | `kho-templates/page.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
