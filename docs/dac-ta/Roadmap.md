# Lộ trình

> [!NOTE]
> **NGUỒN SỰ THẬT DUY NHẤT (OSOT) CHO LỘ TRÌNH VÀ CÁC PHA DỰ ÁN**  
> • Bảng đặc tả đầy đủ các pha (P0–P12, Tuyến B P13–P23, Tuyến C AI-1–AI-4) nằm tại **Mục 15** của [`docs/kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md`](../kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md#15-kế-hoạch-thực-thi-tổng-thể).  
> • Tiến độ thực thi chi tiết của từng pha được quản lý tập trung tại: [`docs/dac-ta/Checklist_Thuc_Thi.md`](Checklist_Thuc_Thi.md).  
> Tệp này chỉ đóng vai trò tóm tắt nhanh các mốc điều chỉnh sau rà soát.

Bảng pha đầy đủ nằm ở `../kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md` mục 15 — hai tuyến, P0–P12 là nền tảng và module lõi, P13–P23 là bộ tính năng hoàn chỉnh. Tài liệu này không chép lại bảng đó; nó ghi những gì đã thay đổi kể từ khi bảng ấy được viết.

## Trạng thái

P0–P8 nghiệm thu xong. P9 đợt một xong — Identity Guard và cổng duyệt ảnh; phần tăng cường thật và Smart Reframe chuyển sang P13. P10, P11, P12 chưa bắt đầu.

Trạng thái chi tiết theo pha ở `Checklist_Thuc_Thi.md`; trạng thái theo tính năng ở `../kien-truc/BO_TINH_NANG_HIEN_TRANG.md`.

Hai việc còn mở của P5 không chặn pha nào: bộ ảnh vàng chưa gán nhãn thật, và ma trận chọn công nghệ chưa làm.

## Điều chỉnh sau khi rà soát mã thật

Chi tiết ở `../kien-truc/RA_SOAT_THU_HOACH.md`.

| Pha | Điều chỉnh | Hướng |
|---|---|---|
| P5 | `count_engine.py` (955 dòng), `color_engine.py` (418), `normalize.py` (207) là REUSE chứ không phải EXTEND — chúng không import `openpyxl` | nhẹ hơn |
| P3, P5 | Bốn cổng còn thiếu ở `LocalBudd` là BUILD chứ không phải REUSE; `src/core/ports/` bên đó chỉ có `LLMProvider.ts` | nặng hơn |
| P2 | 18 mã trần cứng thay vì 26 | nhẹ hơn, nhưng cần xác nhận con số đúng |
| P6 | Thêm một hạng mục: chốt cách tính chi phí lá và cành trang trí | thêm việc |

Hai điều chỉnh lớn gần bù nhau. Tổng 5–6 tháng giữ nguyên.

## Chạy song song

| Việc | Chặn ai | Bị ai chặn |
|---|---|---|
| Bộ ảnh vàng 8 ảnh gán nhãn | Nghiệm thu P5 | Không ai. Bắt đầu được ngay |
| Ma trận chọn công nghệ | P5, P9 | Không ai |
| Cơ chế consent dữ liệu huấn luyện | Go-live | Không ai |
| P9 M04a | | Chạy song song được với P7 và P8 |
| P14 M01b | | Chạy song song được với P13 |
| P19 M06 | | Chạy song song được với P16 |
| P21 M09 | | Chạy song song được với P16 và P17 — không chạm engine nào |

Ba việc đầu không cần chờ P1. Chưa bắt đầu chúng là mất thời gian không lấy lại được, vì cả ba đều là điều kiện chặn ở cuối.

## Bộ tính năng hoàn chỉnh

Tuyến B thêm mười một pha. Bảy pha đầu là MVP theo đúng chuỗi giá trị: chụp ảnh bó hoa rồi có catalog, ảnh quảng cáo, video, bài viết, lịch đăng và landing page.

| Pha | Việc | MVP |
|---|---|---|
| P13 | M04a đợt hai — tăng cường thật, Smart Reframe | ✓ |
| P14 | M01b — tên, mô tả, thẻ, dịp, phân khúc giá | ✓ |
| P15 | Ba đường ghi của Integration API | ✓ |
| P16 | M04b — ảnh marketing và biến thể | ✓ |
| P17 | M04c — video | ✓ |
| P18 | M07 — nội dung và đăng bài cho ngành hoa | ✓ |
| P19 | M06 — catalog và QR | ✓ |
| P20 | M11 — phân tích hiệu quả và học | |
| P21 | M09 — khách hàng và nhắc mua lại | |
| P22 | M10 — đơn hàng và vận hành | |
| P23 | M08 — trợ lý hội thoại | |

Điều kiện chặn: P13 đứng trước P16 và P17. Không module nào của Creative Engine hay Marketing Engine sinh nội dung từ một ảnh chưa qua Identity Guard và chưa được duyệt.

## Nền AI

Tuyến C, bốn đợt. Chúng cắt ngang mọi pha chứ không nối tiếp pha nào, nên chúng không đánh số theo dải P.

| Đợt | Việc | Chặn |
|---|---|---|
| AI-1 | Cổng AI, `ai_capabilities`, `ai_models` kèm bốn ô giấy phép, chính sách theo tổ chức, mười cổng nhà cung cấp, bộ định tuyến, sổ `ai_requests` | P16 · P17 · P18 |
| AI-2 | Chấm điểm theo năng lực, thác nghiệm chỉ leo lên, chuỗi dự phòng không vượt sàn quyền riêng tư | Go-live P16 · P17 · P18 |
| AI-3 | `flower_taxonomy` và `knowledge_chunks` trên `pgvector`, truy hồi kèm thứ bậc nguồn sự thật | P23 |
| AI-4 | Sự kiện miền, `content_features`, bốn pha học | — |

AI-1 đứng trước P16 vì P16 là lần đầu ALG gọi một loại nhà cung cấp mới. Làm P16 trước nghĩa là tên nhà cung cấp ảnh đi vào mã của `SocialFlow` trước khi có cổng, và rút nó ra sau đó đắt hơn đặt đúng chỗ ngay từ đầu.

## Quyết định

| # | Chốt |
|---|---|
| D1 | SocialFlow nhận `organization_id` từ core. Mở rộng 09/10 (D1-b): đa tenant thật — `organization_id` trên mọi bảng nó sở hữu, sáu agent lọc theo tổ chức |
| D2 | Nền tảng giữ khoá nhà cung cấp, tính credit theo tổ chức |
| D3 | Job bị Identity Guard từ chối không tính phí khách; credit hoàn lại, `cost_usd` vẫn ghi sổ |
| D4 | `FloraOS` v1 đóng băng tính năng từ 09/09, không ngoại lệ. Áp cho v1, không áp cho core |
| D8 | Bộ tính năng hoàn chỉnh là phạm vi sản phẩm: mười ba đơn vị triển khai, bốn engine |
| D9 | MVP là bảy pha P13–P19 |
| D10 | Video vào MVP; ghi đè hai câu "ngoài phạm vi" trước đó |
| D11 | Tự duyệt theo thời hạn chỉ áp cho nội dung đăng bài, qua công tắc `O7`, tắt theo mặc định |
| D12 | Integration API mở đúng ba đường ghi, cộng một đường thứ tư chỉ mang số đo lời gọi mô hình |
| D15 | Năng lực trước, mô hình sau. Mọi lời gọi AI đi qua cổng AI; mô hình là cấu hình, không phải mã |
| D16 | Cổng AI là một lớp trong `floraos-core`, không phải dịch vụ thứ tư |
| D17 | Bộ định tuyến bị bó năm ràng buộc; D5-c không đổi — máy không tự đổi mặc định bằng lập luận |
| D18 | Không mô hình nào vào production khi thiếu một trong bốn ô giấy phép |
| D19 | Không thêm hạ tầng cho nền AI: `pgvector` trên Postgres đang dùng, hàng đợi vẫn là `generation_jobs` |

Còn mở: **D13** cơ sở đồng ý cho dữ liệu cá nhân của khách hàng cuối — chặn go-live của M09 và M10. **D14** bảng giá credit cho biến thể ảnh, video và nội dung — chặn go-live của P16, P17, P18. **D20** ngưỡng chấp nhận của từng năng lực ngoài Identity Guard — chặn AI-2.
