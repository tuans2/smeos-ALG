# 01 — Đề xuất chuẩn hoá User Journey & Workflow

Đi kèm `00-bao-cao-audit.md`. Mã ID (U1, O4…) trỏ về phát hiện ở đó. Đây là đề xuất, chưa phải quyết định: mục có dấu **[PO]** đụng schema, tenancy hoặc UX đã khoá → cần PO duyệt trước khi làm (CLAUDE.md "Stop and ask").

## 1. Mười nguyên tắc chung cho mọi workflow

1. **Một thực thể — một máy trạng thái — một nơi ghi.** Mọi chuyển trạng thái đi qua đúng một use-case; các màn khác gọi use-case đó, không tự PATCH trường trạng thái.
2. **Ma trận chuyển là dữ liệu thuần trong `domain/`**, có test bảng đủ cặp (from, to), và **trạng thái kết thúc khoá mọi trường nghiệp vụ** (chỉ còn ghi chú nội bộ).
3. **Bước "đóng cửa" đòi bằng chứng** đọc từ CSDL (đã có ở Điều phối: đối tác, QC, POD, sự cố) — áp cho mọi đường dẫn tới cùng trạng thái.
4. **Thao tác phá huỷ có cổng riêng**: huỷ/từ chối/chấm dứt luôn qua endpoint riêng, gác năng lực trần, bắt buộc lý do, ghi audit, phát thông báo. Endpoint sửa chung **không** nhận trạng thái phá huỷ.
5. **Huỷ = saga bù trừ**: một hàm `onOrderCancelled` duy nhất giải phóng đặt chỗ, trả mã giảm giá, đóng yêu cầu bổ sung, đóng phiên điều phối, đánh dấu cần hoàn tiền, cập nhật lead — mọi đường huỷ gọi nó trong cùng giao dịch.
6. **Mọi trạng thái "chờ" có hạn và có người đẩy**: tác vụ nền theo lịch (cron có khoá) chuyển `EXPIRED/OVERDUE/TIMEOUT`, không dựa vào việc ai đó mở màn hình. GET không ghi.
7. **Chuyển trạng thái là nguyên tử**: cập nhật có điều kiện `WHERE status = :from` (hoặc `version`), ghi sự kiện trong cùng giao dịch; thua đua → 409 "tải lại".
8. **Giao diện chỉ dùng mã do máy chủ công bố**: kiểu trạng thái import từ `domain/`, không khai chuỗi tự do; nhận lỗi thì hiện thông báo, không im lặng.
9. **Thông điệp người dùng là tiếng Việt tự nhiên**: lý do chặn dùng nhãn (`STATUS_LABELS`), không lộ mã enum/đường API.
10. **Mỗi hành trình có điểm kết thúc rõ và lối thoát**: thành công → bước tiếp theo gợi ý; thất bại → làm lại/huỷ/liên hệ; tiến độ nhiều bước được lưu phía máy chủ.

## 2. Workflow chuẩn đề xuất

### 2.1 Đơn hàng hợp nhất (giải O1–O5, O9, O10, U1)

Một trục chính duy nhất do Điều phối sở hữu; 3 trục `orders` trở thành **hình chiếu chỉ đọc** sinh từ `stage` (đã có `mapStageToOrderAxes`).

```
NHẬN ĐƠN (DRAFT)
  ├─ thiếu giá ──▶ CHỜ BÁO GIÁ ──(sale báo giá)──▶ CHỜ THANH TOÁN
  ├─ có giá ─────▶ CHỜ THANH TOÁN ──(tiền về | duyệt giao trước)──▶ TIẾP NHẬN (INTAKE)
  │                     └─(quá hạn giữ đơn, mọi nguồn)──▶ HUỶ [saga] ──▶ lead cứu đơn
TIẾP NHẬN → KIỂM TRA → LÊN KẾ HOẠCH → PHÂN CÔNG → ĐANG LÀM → QC → ĐANG GIAO → ĐÃ GIAO → HOÀN TẤT
                     ↖──── QC không đạt ────┘          │
  mọi bước ──(mở sự cố)──▶ SỰ CỐ ──(đóng hết sự cố)──▶ quay về bước cũ
  mọi bước trước ĐÃ GIAO ──(R6 + lý do)──▶ HUỶ [saga]
  ĐÃ GIAO/HOÀN TẤT ──(R6 + lý do)──▶ TRẢ HÀNG/HOÀN TIỀN (luồng riêng, không dùng HUỶ)
```

Việc cụ thể:
- `PATCH /orders/:id` bỏ `status/productionStatus/deliveryStatus` khỏi schema; tiến độ đi qua `/coordinator/orders/:id/stage` (O1, O4). Đơn chưa vào Điều phối thì nút tiến độ là "Xác nhận thanh toán / Duyệt giao trước".
- Áp `brochureLockReason` trong `loadOrderOrThrow` của Điều phối (O5) — hoặc loại đơn Thẻ chào khỏi `findOrder`.
- Viết lại `order-action-buttons.tsx` theo `stage` + nhãn tiếng Việt; hiện lỗi khi `!res.ok` (U1). Bỏ giá trị bịa trong phiếu in (U2).
- Khoá trường nghiệp vụ khi `COMPLETED/CANCELLED` (O3).
- **[PO]** Bật `order_change_requests` cho "đổi đơn sau khi chốt": `PENDING → APPROVED → APPLIED` (tính lại tiền, xác nhận khách) thay cho huỷ-tạo lại (O9).
- Tự huỷ quá hạn giữ đơn áp cho mọi nguồn, ngưỡng theo cài đặt cửa hàng (O10).

### 2.2 Saga huỷ đơn (giải A1, A2, O2, L1)

```
onOrderCancelled(tx, order, reason, actor):
  1. product_bookings(order_id) → CANCELLED          (A1)
  2. voucher_redemptions(order_id) → trả lượt         (A2)
  3. order_info_requests mở → CANCELLED
  4. order_coordinations.stage → CANCELLED, huỷ nhắc việc M1–M4
  5. đã thu tiền > 0 → tạo mục "Cần hoàn tiền"
  6. lead đang WON vì đơn này → FOLLOW_UP (hoặc LOST theo lý do)   (L1)
  7. order_events + audit_logs + thông báo
```
Mọi đường huỷ hiện có (Sổ đơn, Điều phối, Thẻ chào ×3) gọi hàm này. Test: bảng "đường huỷ × tài nguyên" phải xanh.

### 2.3 Báo giá → Đơn (giải Q1–Q3, L2)

```
NHÁP ─gửi─▶ ĐÃ GỬI ─(khách bấm Đồng ý trên link)─▶ KHÁCH ĐỒNG Ý ─chuyển─▶ ĐÃ TẠO ĐƠN
               │   └─(khách bấm Từ chối + lý do)─▶ KHÁCH TỪ CHỐI ─sửa─▶ NHÁP
               └─(cron: quá validUntil)─▶ HẾT HIỆU LỰC ─gia hạn─▶ NHÁP
```
- `ACCEPTED` không tự hết hạn (sửa `isQuotationExpired`); chuyển đơn từ `SENT` kiểm hạn trước.
- Chuyển đơn mang theo `discountAmount`, `shippingFee`, `terms` (thêm vào `IngestOrderInput`) và **khẳng định tổng đơn = tổng báo giá** (Q1).
- Hết hạn chạy bằng cron, bỏ ghi trong GET (Q2). **[PO]** Nút Đồng ý/Từ chối trên `/bg/[token]` (Q3).
- Lead đồng bộ theo sự kiện báo giá: gửi → `QUOTATION_SENT`, từ chối/hết hạn → `FOLLOW_UP`.

### 2.4 Vòng đời lead (giải L1)

`WON` chỉ khi đơn được **xác nhận thanh toán / vào Điều phối**, không phải khi tạo nháp. Thêm `WON → LOST` khi đơn duy nhất của lead bị huỷ. Gỡ ánh xạ ngầm `IN_PROGRESS` bằng một migration dữ liệu **[PO]**.

### 2.5 Đăng ký → Dùng thử → Trả phí (giải T1–T4, S1)

```
Đăng ký ─▶ CHỜ DUYỆT ─(superadmin)─▶ ĐƯỢC DUYỆT ─▶ DÙNG THỬ (50 lượt | N ngày)
   │            └─▶ TỪ CHỐI (có lý do, gửi khách)
   DÙNG THỬ ─(hết lượt/hết hạn)─▶ HẾT DÙNG THỬ ─▶ màn "Chọn gói"
   chọn gói ─▶ CHỜ THANH TOÁN ─(thu hoá đơn đầu)─▶ ĐANG HOẠT ĐỘNG
```
- **[PO]** Hoặc đổi tên nút "Dùng thử ngay" thành "Đăng ký dùng thử", hoặc bỏ bước duyệt cho dùng thử (T1).
- Ghi `trial_status = EXHAUSTED/EXPIRED` và dẫn sang chọn gói (T2).
- Nâng cấp: một use-case đổi đồng thời `organizations.type`, `workspaces.kind = PRODUCTION`, `trial_* = null`, đổi tên bỏ "- Demo", hỏi giữ/xoá dữ liệu mẫu (T3).
- Gia hạn/nhắc/OVERDUE chạy bằng cron, kèm ân hạn do PO chốt (S1). Xoá trang mồ côi `/dang-ky-thanh-cong` (T4).

### 2.6 Thêm người vào tổ chức (giải M1)

Chọn **một** đường: (a) giữ "tài khoản nhân viên" (chủ tiệm đặt mật khẩu tạm) và tắt `POST /members/invite`; hoặc (b) hoàn thiện lời mời: `INVITED` + token có hạn → link `/nhan-loi-moi/<token>` đặt mật khẩu → `ACTIVE`, hết hạn → huỷ, gửi lại được. **[PO]** chọn (a) hay (b); (b) cần kênh gửi thư.

### 2.7 Liên kết Chuỗi ↔ Cửa hàng (giải C1, C2) **[PO — tenancy]**

```
Chuỗi gửi lời mời (chỉ tổ chức loại CHAIN, năng lực riêng của Chuỗi)
  ─▶ CHỜ CHẤP NHẬN (PENDING, cửa hàng đích nhận thông báo, không lộ SĐT/email)
       ├─ cửa hàng chấp nhận ─▶ ĐANG HỢP TÁC (ACTIVE)
       ├─ cửa hàng từ chối / hết hạn 7 ngày ─▶ đóng
ACTIVE ⇄ TẠM NGƯNG (lý do, audit, báo hai bên; đơn gia công đang giao → chuyển vòng điều phối)
ACTIVE/TẠM NGƯNG ─▶ CHẤM DỨT (hai bên đều bấm được; kết thúc, muốn lại phải mời mới)
```
- Tìm cửa hàng chỉ theo mã mời/slug chính xác, trả cùng một câu cho "không có" và "có"; lỗi trả 404/422 chuẩn thay vì `throw new Error`.

### 2.8 Video & job AI (giải V1, V2, J1)

- Bộ quét job treo đồng bộ `video_jobs.stage = FAILED` khi `generation_jobs` liên quan bị đánh `FAILED` (V1).
- Thêm "Yêu cầu dựng lại" từ `RENDER_COMPLETED` (ghi `REJECTED` + lý do → cho render lại, tính credit theo luật hiện có) (V2).
- Cho yêu cầu huỷ job `PROCESSING` (cờ `cancel_requested`, worker kiểm giữa các bước) (J1).

### 2.9 Đăng bài (giải K1, K2)

`NHÁP → ĐÃ DUYỆT → ĐÃ LÊN LỊCH → ĐÃ ĐĂNG | ĐĂNG LỖI`, cho "Huỷ lịch" về `ĐÃ DUYỆT`, nhận trạng thái ngược từ SocialFlow (webhook hoặc quét). Sửa chỉ số "chờ duyệt" đọc đúng nguồn (K2).

### 2.10 Hành trình trang chủ & điều hướng (giải JE1, N1, N2, D1)

- Lưu tiến độ vào `journey_runs` (đã có bảng) theo `organization_id + user_id`; bước điều hướng sang màn khác mang `?journey=<runId>` và khi xong gọi "hoàn thành bước", trang chủ hiện "Tiếp tục hành trình".
- Thêm test kiến trúc: mọi `href` trong `nav/*`, `toolkit-catalog`, `tool-registry`, `next-actions-registry` phải khớp một `page.tsx` (quét như ở báo cáo) → chặn N1 tái diễn. Ẩn hoặc làm trang cho 3 mục 404; xoá hoặc nối 3 trang mồ côi.
- **[PO]** Chỉ định một SSOT hành trình đa ngành (13 hành trình hiện chỉ cho tiệm hoa), gộp/lưu trữ bản `_BACKUP` và các tài liệu trùng (D1); thêm hành trình "Đơn hàng đa nguồn" và "Huỷ/đổi/hoàn".

### 2.11 Tác vụ nền (giải S2, Q2, S1, O10)

Một cron duy nhất (Render) gọi các endpoint `internal/*` có khoá advisory: hết hạn báo giá, tự huỷ đơn quá hạn giữ, gia hạn gói, OVERDUE yêu cầu bổ sung, đồng bộ trạng thái đăng bài, kiểm sức khoẻ tích hợp. Bỏ `setInterval` trong `instrumentation.ts` hoặc bọc từng bộ quét bằng khoá phân tán. **[PO]** vì đổi `render.yaml`.

## 3. Lộ trình ưu tiên

| Đợt | Việc | ID | Cần PO |
|---|---|---|---|
| P0 (ngay) | Chặn liên kết Chuỗi một chiều: gác loại CHAIN + năng lực Chuỗi, bỏ SĐT/email khỏi phản hồi, tạm tắt `link-existing` tới khi có luồng chấp nhận | C1 | **Có** (tenancy) |
| P0 | Sửa nút tiến độ chi tiết đơn + báo lỗi | U1, U2 | Không |
| P0 | Bỏ `CANCELLED` khỏi `PATCH /orders/:id` | O1 | Không |
| P0 | Chuyển báo giá mang theo ưu đãi + phí ship | Q1 | Không |
| P1 | Saga huỷ đơn dùng chung | A1, A2, O2, L1 | Không (không đổi schema) |
| P1 | Khoá Thẻ chào ở Điều phối; Sổ đơn không ghi trục tiến độ | O4, O5 | Không |
| P1 | Video kẹt RENDERING; dựng lại | V1, V2 | Không |
| P1 | Lời mời thành viên: chọn một đường | M1 | **Có** |
| P1 | Nâng cấp dùng thử → trả phí trọn gói | T2, T3 | **Có** (gói/giá) |
| P1 | Menu 404 + test href ↔ page | N1, N2 | Không |
| P2 | Cron hết hạn báo giá, tự huỷ đơn mọi nguồn, gia hạn gói | Q2, O10, S1, S2 | **Có** (`render.yaml`) |
| P2 | Đổi đơn sau chốt (`order_change_requests`) | O9 | **Có** |
| P2 | Khách đồng ý/từ chối báo giá; theo dõi đơn catalog | Q3, A4 | **Có** (UX mới) |
| P2 | Kiểm tồn/khả dụng ở mọi nguồn đơn | A3 | Không |
| P2 | Lưu tiến độ hành trình; SSOT hành trình đa ngành | JE1, D1 | **Có** |
| P3 | Nhãn tiếng Việt cho lý do chặn; dọn lệch nhỏ | O6, O7, I1, J1, K1, K2, C2, L2, T1, T4 | Một phần |

Mỗi việc ship kèm test (bảng chuyển trạng thái, saga huỷ, tenant test cho C1) theo CLAUDE.md "Definition of done".
