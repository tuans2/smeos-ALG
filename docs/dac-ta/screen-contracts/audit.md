---
id: SCR-STORE-audit
tier: STORE
module: audit
route: /audit
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

# Screen Contract — Nhật Ký Kiểm Toán Tổ Chức

**Tuyến:** `/audit` · **Tệp chính:** `src/app/(app)/audit/page.tsx`, `src/components/audit/platform-access-tab.tsx` · **Cập nhật:** 07/11/2026 (tab truy cập của nền tảng, D-60) · **Thẻ:** T5.D8

## 1. Vai và mục đích
- Vai chính (03b): `operations_manager`, `store_manager` · Vai phụ: `platform_admin`
- Phạm vi: organization
- Việc chính: Tra cứu lịch sử thay đổi bất biến (audit trail) của các thực thể quan trọng (cấu hình AI, bộ máy, duyệt ảnh, thành viên) trong tổ chức.
- Câu hỏi chính: Ai đã thực hiện thao tác gì, vào thời điểm nào, dữ liệu trước và sau khi đổi khác nhau ra sao? Nhân viên nền tảng đã mở dữ liệu của tổ chức khi nào, để làm gì (tab thứ hai, D-60)?
- Mật độ: EXPERT (bảng dữ liệu kỹ thuật, modal xem JSON đối chiếu before/after).

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/audit-logs` → Danh sách bản ghi kiểm toán của tổ chức (cần quyền `G9`)
  - `GET /api/v1/audit-logs/platform-access` → Các lượt nhân viên nền tảng truy cập dữ liệu tổ chức (`G9`, ADR-013 D-I5, D-60)
- Tab (03c §5b — hai nhóm dữ liệu ngang hàng): "Thao tác trong tổ chức" (mặc định, nội dung cũ) · "Truy cập của nền tảng" (danh sách chỉ đọc: mục đích bằng chữ, người vận hành, thời điểm; "Xem thêm" theo trang). Ô tìm kiếm và nút "Làm mới" ở hàng tiêu đề chỉ hiện ở tab thứ nhất; tab thứ hai có nút "Làm mới" riêng.
- Khối: 3 khối (Hướng dẫn K1 `FeatureGuidanceCard`, Thanh tìm kiếm lọc thao tác, Bảng danh sách nhật ký & Modal Base-UI xem chi tiết)
- Nút primary: Không có nút primary (trang tra cứu giám sát)
- Phân quyền: Gác quyền `G9`
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Thời điểm, tên hành động, loại thực thể | Cột bảng kiểm toán |
| L1 Hành động | Nút Chi tiết (mở modal đối chiếu), Nút Làm mới | Tác vụ trên hàng & Top Header |
| L2 Ngữ cảnh | Hướng dẫn K1, người thực hiện (User ID), IP | FeatureGuidanceCard & Box thông tin |
| L3 Chi tiết | Đối chiếu JSON Before vs After | Base-UI Dialog |

## 4. Hành động
- Chính (0): View-only, không có nút primary.
- Phụ (2): `Làm mới` (`variant: "outline"`), `Chi tiết` (`variant: "ghost"`).

## 5. Content budget
- Nút nổi: 1 nút làm mới trên header.
- Khối chính: Bảng danh sách gọn gàng, thanh lọc tìm kiếm mượt mà.

## 6. Trạng thái
- Tải: `SkeletonBlock` 5 dòng.
- Không quyền: Màn hình khóa với icon `Lock` và giải thích rõ cần mã năng lực `G9`.
- Rỗng: Thông báo chưa có sự kiện kiểm toán hoặc không tìm thấy kết quả.
- Lỗi: Alert box màu đỏ nổi bật. Tab "Truy cập của nền tảng": `InlineError` có nút tải lại; rỗng: `EmptyState` "Chưa có lượt truy cập nào"; tải: `SkeletonBlock` 4 dòng.

## 7. Responsive
- 390px: Bảng chuyển sang chế độ thẻ di động (Mobile Card View) hiển thị thời gian, hành động và nút xem chi tiết.
- 768px: Bảng desktop đầy đủ cột.
- 1280px+: Giới hạn chiều rộng tối đa `max-w-6xl` căn giữa.

## 8. Trợ năng
- Bảng biểu: Sử dụng `<caption>`, `<th scope="col">`, `<th scope="row">`.
- Modal: Dùng `Dialog` Base-UI hỗ trợ ESC, focus-trap và phím Tab.
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.

## 9. AI
- Ghi nhận các sự kiện liên quan đến cấu hình AI, thay đổi bộ máy nhận diện và sàn bảo mật.

## 10. Dữ liệu và quyền
- Nguồn sự thật: Bảng `audit_logs` (lưu trữ bất biến append-only).
- Quyền: `G9` (xem nhật ký kiểm toán).

## 11. Component
- Dùng lại: `Button`, `Badge`, `Dialog`, `SkeletonBlock`, `FeatureGuidanceCard`.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Tuyến `/audit` đang `COMING_SOON` | Triển khai màn hình thật | Nối endpoint `GET /api/v1/audit-logs` gác `G9` | Cung cấp khả năng giám sát tuân thủ cho Điều hành (T5.D8) | `audit/page.tsx` |
| Xem dữ liệu payload JSON | Đối chiếu trước sau trực quan | Dùng `Dialog` Base-UI chia 2 cột Before / After | Giúp Điều hành dễ dàng nhận biết sự thay đổi | `audit/page.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
