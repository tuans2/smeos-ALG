# Mẫu bố cục theo loại trang & bề mặt thị giác (UX-028)

Level 3 SUPPORTING · thực thi 03a (UX-001, UX-005…UX-007, §40–§41) + 03c §5c · Hợp nhất từ bộ bổ sung MEUX/VDLS (PO duyệt 29/10/2026).
Định hướng: **Clean SaaS Dashboard** — shell điều hướng ổn định, vùng làm việc tập trung, bề mặt tiết chế, copy ngắn, hành động chính rõ. Đây là định hướng nội bộ, không phải chuẩn quốc tế. Mọi con số dưới đây là **heuristic nội bộ**, dùng để review, không phải lint cứng.

## 1. Shell và page header

- **MUST:** dùng shell chung của `src/app/(app)/layout.tsx` (`DesktopNav` desktop, `BottomNav` di động — 03 §3). Không tạo thanh tiêu đề/điều hướng riêng cho một module nếu không có lý do ghi trong Screen Contract.
- **MUST:** một `<h1>` nêu tên tác vụ hoặc đối tượng. **SHOULD:** tối đa một dòng mô tả, chỉ khi bổ sung điều tiêu đề chưa nói.
- **MUST NOT:** khối giới thiệu lớn trong công cụ nội bộ. Khối hướng dẫn chỉ dùng `FeatureGuidanceCard` theo K1 (03a §0.1).
- Hành động cấp trang: `TabActionHeader` theo K2 (1 primary + ≤ 2 phụ + menu `…`). Shell, `FeatureGuidanceCard` và Tab Action Header là UX khóa bởi PO — tài liệu này không đổi chúng.

## 2. Bề mặt và trang trí

- **MUST:** card chỉ dùng cho đơn vị độc lập (chọn được, có hành động, hoặc cần tách bạch). **MUST NOT:** card trong card theo thói quen (03a §41).
- **SHOULD:** nhóm bằng khoảng cách, tiêu đề, căn chỉnh trước khi thêm viền/nền. Không dùng đồng thời nền khác màu + viền đậm + bóng cho cùng một thành phần.
- **MUST:** màu, cỡ chữ, khoảng cách từ token (`globals.css`, 03a §0.5); không bảng màu riêng cho module (R1–R3).
- **MUST:** không đổi tương phản, focus, kích thước vùng nhấn để trông "gọn" hơn.
- Heuristic review: ≥ 3 tầng container lồng nhau, ≥ 3 câu mô tả liền nhau, hoặc phải cuộn qua phần giải thích mới tới đầu vào chính → đánh dấu VD-02/ID-01 để xem lại.

## 3. Sáu loại trang (archetype)

Screen Contract khai `Archetype: A–F` ở §1. Không ép một bố cục cho mọi trang.

| Mã | Loại | Bắt buộc | Tránh | Ví dụ trong repo |
|---|---|---|---|---|
| A | Dashboard / Tổng quan | Trạng thái & chỉ số cần hành động trước; liên kết tới việc tiếp theo | Gom mọi chỉ số (03a §42) | Trang chủ theo vai |
| B | Danh sách / Tìm kiếm | Tìm/lọc/sắp xếp sát danh sách (UX-P09); hành động hàng loạt chỉ khi có chọn (UX-P10); EmptyState nói cách bắt đầu/đổi bộ lọc | Card cho từng dòng khi cần so sánh | `/don-hang`, `/san-pham`, `/tinh-gia/nguyen-lieu` |
| C | Chi tiết / Hồ sơ | Tên + trạng thái đối tượng ở đầu; nhóm theo chủ đề nghiệp vụ; tách rõ hành động nguy hiểm (UX-P07) | Tab che thông tin cần so sánh đồng thời | `/san-pham/[id]` |
| D | Biểu mẫu / Cấu hình | Nhãn rõ (không thay bằng placeholder); lỗi cạnh trường; chia bước chỉ khi có thứ tự thật (UX-P02) | Wizard cho việc làm xong trong một màn | `/tinh-gia/cong-thuc` |
| E | Tạo nội dung / Builder | Đầu vào chính + xem trước; cấu hình ít dùng trong `Disclosure` (UX-P03); trạng thái đã chọn; nút tạo/xuất bản rõ; chế độ AI/thủ công chỉ hiện cấu hình của chế độ đang chọn, giữ dữ liệu khi đổi (03c §5c) | Mọi tùy chọn mở sẵn | `/landing-page`, `/cong-cu/anh-san-pham` |
| F | Cài đặt / Kết nối | Trạng thái kết nối + việc tiếp theo trước; nhóm cấu hình có tên; hướng dẫn dài đưa vào trợ giúp | Hiện mọi cấu hình nâng cao | `/ket-noi`, `/cai-dat-ai` |

Độ rộng vùng làm việc theo loại: D/F hẹp (`max-w-3xl`…`4xl`), B/E rộng (`max-w-6xl`). Trên di động đổi thứ tự ưu tiên, không chỉ thu nhỏ bản desktop (03a §28).

## 4. Copy

Động từ cụ thể ("Tạo", "Lưu", "Kết nối"); tiêu đề mô tả tác vụ, không khẩu hiệu; mỗi dòng mô tả phải thêm thông tin mới; không cắt thông tin chi phí, quyền, rủi ro, dữ liệu bị ảnh hưởng (UX-017) để màn ngắn hơn. Từ ngữ theo `glossary.md`.

## 5. Xác minh

Review thủ công bằng `visual-review.md` (VD-01…VD-05). Tự động hóa chỉ những gì đã có lint chắc chắn (R1–R16); không thêm lint dựa trên heuristic này khi chưa đo tỉ lệ báo sai.
