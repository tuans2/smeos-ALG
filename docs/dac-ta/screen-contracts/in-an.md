---
id: SCR-STORE-in-an
tier: STORE
module: print
route: /in-an
archetype: E
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Ấn phẩm & In ấn chất lượng cao (Print & Preflight Workspace)

**Tuyến:** `/in-an` · **Tệp chính:** `src/app/(app)/in-an/page.tsx`, `src/components/marketing-center/print/` · **Cập nhật:** 01/11/2026 (PO 01/11/2026, PR-6) · **Thẻ:** Module 06 Ấn phẩm & Vật phẩm tại quầy · **Asset:** #58–#67 (10 ấn phẩm kết nối workspace chuẩn nhà in)

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh`, `dieu_phoi`, `marketing` · Vai phụ: `sale`
- Quyền năng lực: `M5` (`print.rendition.export` — tạo bản ghi và xuất PDF in ấn), `Q1` (đọc lịch sử bản in)
- Phạm vi: organization (cách ly tenant tuyệt đối)
- Việc chính: chọn ấn phẩm hoặc khổ in thành phẩm, tùy biến nội dung và vật liệu giấy/bạt, chạy kiểm quy cách in (preflight) tự động phát hiện lỗi tràn lề, DPI và mã QR, xem trước trực quan lưới xén thành phẩm, và xuất file PDF chuẩn in ấn độ phân giải cao kèm dấu chữ thập định vị dao xén.
- Câu hỏi chính: "Ấn phẩm này có đạt chuẩn để gửi nhà in không, lề xén và mã QR có bị lỗi không?"
- Mật độ: MEDIUM
- Archetype: C Biểu mẫu tạo / Xem trước trực tiếp · B Danh sách bản in đã xuất

## 2. Luồng nghiệp vụ
1. **Bước 1 — Khổ in & Chất liệu:**
   - 8 Preset chuẩn: A4, A5, A6, Danh thiếp 90×54, Standee 60×160, Bảng để bàn 100×150, Thẻ treo 50×90, Tem nhãn vuông 50×50.
   - Chất liệu đề xuất: Giấy Couche 300gsm, Ford 250gsm, Kraft nâu 280gsm, Decal nhựa chống nước, Bạt PP/Hiflex.
   - Chọn số lượng bản in dự kiến (10, 50, 100, 200, 500, 1000 bản hoặc số tùy chỉnh).
2. **Bước 2 — Nội dung ấn phẩm:**
   - Tiêu đề chính, thông điệp phụ / lời chúc, liên kết mã QR và tên cửa hàng.
3. **Bước 3 — Kiểm tra quy cách (Preflight) & Xem trước:**
   - Động cơ Preflight Engine kiểm tra 4 tiêu chí cốt lõi:
     - Tràn lề (Bleed): chừa mép xén chuẩn +3mm (hoặc +5mm cho Standee, +2mm cho Tem).
     - Vùng an toàn (Safe Zone): lùi 3mm bên trong đường xén thành phẩm để tránh phạm chữ.
     - Độ phân giải: tối thiểu 300 DPI (Standee tối thiểu 150 DPI).
     - Kích thước mã QR: tối thiểu 20mm (Standee tối thiểu 60mm).
   - Hiển thị rõ danh sách lỗi chặn (bắt buộc sửa) và cảnh báo kỹ thuật (hệ màu CMYK).
   - Khung xem trước trực quan (`PrintPreviewCanvas`) thể hiện rõ 3 đường: Mép tràn lề (đỏ đứt nét), Đường xén thành phẩm (xám đậm) và Vùng an toàn chữ (xanh ngọc chấm bi) cùng dấu xén 4 góc.
4. **Bước 4 — Xuất file PDF nhà in:**
   - Khởi tạo bản ghi `print_renditions` lưu thông số kỹ thuật.
   - Gọi động cơ kết xuất PDF dựa trên `jspdf` có dấu canh xén (trim marks) và tràn lề chuẩn xác.
   - Tự động tải file PDF về máy người dùng và cho phép tải lại bất kỳ lúc nào từ tab "Lịch sử ấn phẩm".

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí |
|---|---|---|
| L0 | Tiêu đề trang, nút quay lại công cụ, tab chuyển đổi (Tạo bản in / Lịch sử ấn phẩm) | Header dính |
| L1 | Thanh tiến trình 4 bước (Stepper) | Đầu vùng làm việc |
| L2 | Bộ chọn khổ in & chất liệu (Bước 1) / Form nội dung (Bước 2) / Bảng Preflight & Preview (Bước 3) / Kết quả xuất PDF (Bước 4) | Thân trang |
| L3 | Danh sách bản in đã lưu trong CSDL kèm nút tải lại | Tab Lịch sử |

## 4. Dữ liệu và quyền
- Bảng CSDL: `print_renditions` (kết nối `organizations`).
- Quyền: `M5` (`print.rendition.export`), `Q1` (`read`).
- Chốt chặn: Vùng cấm Catalog & Thẻ chào đóng băng 100% — tập danh mục in (#60) đọc dữ liệu công khai và kết xuất PDF mới độc lập qua `exportPrintPdfUseCase`, không chạm vào `catalog-pdf-export-button.tsx`.
