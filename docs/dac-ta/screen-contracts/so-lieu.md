---
id: SCR-STORE-so-lieu
tier: STORE
module: analytics
route: /so-lieu
archetype: A
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Hiển thị đầy đủ số đo lượt sử dụng, credit và học phong cách AI
  - Chuyển tiếp 4 giai đoạn mượt mà: Bảng chỉ số -> Diễn giải -> Học phong cách -> Cập nhật
  - Gác quyền U2 và U3 chính xác
---

# Screen Contract — Báo Cáo Số Liệu & Học Phong Cách (Analytics & Learning)

**Tuyến:** `/so-lieu` · **Tệp chính:** `src/app/(app)/so-lieu/page.tsx` · **Cập nhật:** 07/11/2026 · thẻ Hiệu năng kinh doanh lấy số từ báo cáo theo kỳ phía máy chủ (PO Q4) · nút "Báo cáo theo kỳ" ở đầu trang (chỉ hiện khi có `R20`) mở `/bao-cao` · 11/11/2026: gỡ nút "Hiệu quả quảng cáo" — số liệu là chiến dịch mẫu cứng, trái nguyên tắc "Bẫy số liệu" mục 5 (audit BL-23); 12/11/2026: xoá hẳn màn mẫu `ad-performance-modal.tsx`; dựng lại khi có nguồn số liệu quảng cáo thật · **Thẻ:** T5.D1

## 1. Vai và mục đích
- Vai chính (03b): `store_manager`, `marketing_specialist`, `analyst` · Vai phụ: `lead_marketing`
- Phạm vi: organization
- Việc chính: Theo dõi các chỉ số đo lường hiệu quả tiếp thị thực tế, giám sát mức sử dụng credit và xem xét phê duyệt các đề xuất tối ưu hóa phong cách thương hiệu của AI.
- Câu hỏi chính: Hiệu quả tiếp thị thực tế đạt được ra sao, mức dùng credit thế nào và AI có đề xuất điều chỉnh phong cách nào cần chốt duyệt không?
- Mật độ: MEDIUM (bố cục chuyển đổi qua 4 giai đoạn rõ ràng: Bảng chỉ số → Diễn giải AI → Vòng học phong cách → Đã cập nhật).

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/usage/summary` → Lấy tổng mức sử dụng credit và số lượt theo tính năng
  - `GET /api/v1/reports/orders|revenue|products?from&to` (`R20`) → Thẻ Hiệu năng kinh doanh theo nút Tuần / Tháng / Quý (giờ Việt Nam): **Giá trị đơn** (chỉ số chính, đơn đã chốt — không Nháp, không huỷ — tạo trong kỳ; đơn Nháp hiện riêng "đơn chờ chốt" ở ô Đơn đang xử lý, PO 12/11/2026, audit BL-30), **Đã thu thực tế** (khoản thu đã xác nhận trừ hoàn tiền), tỷ lệ hoàn tất, đơn đang xử lý / quá hẹn, sản phẩm bán chạy theo giá trị dòng hàng. Không có `R20` → trạng thái không quyền. Định nghĩa KPI: `src/modules/reporting/domain/business-summary.ts` (PO 07/11/2026, Q4 — thay cách tính trên 100 đơn ở trình duyệt)
  - `GET /api/v1/ai-requests` → Lấy danh sách yêu cầu AI để diễn giải
  - `GET /api/v1/audit-logs?limit=50` → Lấy nhật ký học phong cách `learning.profile`
  - `PUT /api/v1/ai-policy` → Cập nhật chính sách AI (gác quyền U2 `learning.profile.manage`)
- Khối: 3 khối chính (Hướng dẫn K1 `FeatureGuidanceCard`, Thẻ số đo & Bảng dữ liệu chi tiết cho trình đọc, Khối phê duyệt vòng học phong cách)
- Nút primary: 1 (ở phase metrics: `Diễn giải chỉ số bất thường`; ở phase learning: `Duyệt áp dụng`)
- FeatureGuidanceCard: 1 card duy nhất theo chuẩn K1
- Modal: Không dùng modal popup; toàn bộ chuyển đổi diễn ra in-place theo các giai đoạn logic (phase)
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Số đo lượt sử dụng theo tính năng, mức credit đã dùng và hạn mức còn lại | Khung nhìn đầu (Thẻ chỉ số & Card mức dùng) |
| L1 Hành động | Diễn giải chỉ số bất thường / Duyệt áp dụng chính sách phong cách | Nút góc dưới bên phải mỗi giai đoạn |
| L2 Ngữ cảnh | Khối hướng dẫn K1, bộ lọc mốc thời gian (Tuần / Tháng / Quý) | FeatureGuidanceCard & Tab chọn thời gian |
| L3 Chi tiết | Bảng dữ liệu số đo chi tiết (Accessible Data Table cho trình đọc màn hình), phân tích mô hình AI | Bảng chi tiết & Card AI Diễn giải |
| L4 Nâng cao | Chi tiết tham số cấu hình cũ vs tham số đề xuất mới của AI | Vòng học phong cách |

## 4. Hành động
- Chính (1):
  - Phase `metrics`: `Diễn giải chỉ số bất thường` (`variant: "primary"`, gác quyền `U3`).
  - Phase `explain`: `Xem đề xuất học phong cách` (`variant: "primary"`).
  - Phase `learning`: `Duyệt áp dụng (learning.profile.manage)` (`variant: "primary"`, gác quyền `U2`).
- Phụ (≤ 2):
  - `Quay về Trang chủ` (`variant: "ghost"`).
  - `Quay lại bảng chỉ số` / `Quay lại` (`variant: "ghost"`).
- Menu `…`: Không có.

## 5. Content budget
- Nút nổi: Tối đa 1 nút primary + 1 nút ghost cho mỗi màn hình/giai đoạn.
- Khối chính: 3 khối (Hướng dẫn K1, Thẻ số đo & Bảng chi tiết, Form duyệt chính sách phong cách).
- Nguyên tắc Bẫy số liệu: Mọi số liệu hiển thị là số đo thực tế từ backend; tuyệt đối không tạo số liệu phần trăm tăng trưởng giả định.

## 6. Trạng thái
- Tải: `SkeletonBlock` chuẩn hóa thay thế hoàn toàn các icon spinner đơn độc.
- Rỗng: Thông báo rõ ràng khi chưa có dữ liệu đo lường hoặc chưa có yêu cầu AI nào.
- Lỗi: Khung cảnh báo màu đỏ pastel dịu mắt khi gọi API thất bại.
- Thành công: Màn hình xác nhận thành công với icon tích xanh lớn và nút quay lại bảng chỉ số.

## 7. Responsive
- 390px: Lưới chỉ số 1 cột, bảng số liệu cuộn ngang, nút bấm toàn chiều rộng.
- 768px: Lưới chỉ số 2 cột, bảng số liệu co giãn linh hoạt.
- 1280px+: Lưới chỉ số 3 cột cân đối, tối đa chiều rộng `max-w-4xl` đặt giữa trang.

## 8. Trợ năng
- Bàn phím: Điều hướng Tab qua lại giữa các nút bấm và liên kết.
- Focus: `focus-visible:outline-2 focus-visible:outline-primary`.
- Trình đọc màn hình (Screen Reader): Bảng dữ liệu số đo có `<caption>`, `<th scope="col">`, `<th scope="row">` rõ ràng.

## 9. AI
- Gợi ý: Tự động phát hiện bất thường và đề xuất tinh chỉnh hồ sơ phong cách.
- Tự động: Tổng hợp nhật ký học phong cách từ kết quả các chiến dịch trước.
- Cần duyệt: Phải có hành động bấm duyệt chính sách của người dùng có quyền `U2`.

## 10. Dữ liệu và quyền
- Nguồn sự thật: Bảng `usage_records`, `ai_requests`, `audit_logs`, `ai_policies`.
- Trường dùng: `quantity`, `cost_credit`, `credit_used`, `credit_balance`, `capability_code`, `model_key`, `cost_usd`, `quality_score`.
- Quyền: `U2` (duyệt áp dụng học phong cách), `U3` (diễn giải chỉ số), `R20` (thẻ Hiệu năng kinh doanh).

## 11. Component
- Dùng lại: `Button`, `Card`, `Badge`, `SkeletonBlock`, `FeatureGuidanceCard`.
- Mở rộng: Accessible Data Table cho số liệu đo lường.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Mã M11 hiển thị ở header | Không lộ mã kỹ thuật | Đổi sang "Báo cáo & Phân tích" | Quy ước UX không lộ mã nội bộ | `so-lieu/page.tsx` |
| Bẫy số liệu: tự bịa phần trăm tăng trưởng | Tuân thủ luật số liệu đo lường | Bỏ `metricChange`, chỉ hiển thị số đo thực tế | Chống tạo số liệu giả tạo cho khách hàng | `so-lieu/page.tsx` |
| Thiếu cấu trúc số cho trình đọc màn hình | Chuẩn trợ năng bảng số liệu | Thêm thẻ table accessible với caption và scope | Hỗ trợ người dùng khiếm thị / trình đọc | `so-lieu/page.tsx` |
| KPI doanh thu tính trên 100 đơn đầu ở trình duyệt, lệch trạng thái, "bán chạy" đọc trường không có | Đủ mọi đơn trong kỳ, cùng định nghĩa với `/bao-cao` | Lấy từ báo cáo theo kỳ phía máy chủ; hiện cả Giá trị đơn và Đã thu thực tế | PO 07/11/2026 (Q4), audit BL-12 | `business-performance-card.tsx`, `business-summary.ts` |
| "Giá trị đơn" gồm đơn Nháp (đơn catalog chưa thu, có thể tự huỷ) — phồng giá trị, kéo tỷ lệ thu xuống | Chỉ đơn đã chốt | Nháp tách thành "đơn chờ chốt" (số đơn + giá trị), không vào trung bình / đang xử lý / tỷ lệ thu; CSV có thêm 2 dòng | PO 12/11/2026, audit BL-30 | `order-revenue-report.ts`, `business-summary.ts` |
| Spinner tải thô sơ | Chuẩn hóa Skeleton hệ thống | Dùng `SkeletonBlock` | Đồng bộ UX và trợ năng | `so-lieu/page.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
