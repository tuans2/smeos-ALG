# Thẻ chào mẫu hoa — Kế hoạch thực thi cho ngày 20/10/2026

**Ngày lập:** 08/10/2026 · **Đầu vào:** báo cáo kiểm tra [`KIEM_TRA_THE_CHAO_LE_20_10.md`](KIEM_TRA_THE_CHAO_LE_20_10.md) và câu trả lời của PO ngày 08/10.
**Trạng thái:** PO duyệt 08/10/2026. **Đợt 1 đã làm xong trên nhánh** (xem mục 0) — chờ gộp vào `main` để lên máy chủ thật.
**Mốc thời gian:**
- Mã cuối cùng lên máy chủ thật: **15/10**.
- **Đóng băng 16/10 → 21/10.**
- PO thử thực tế: 11/10 → 16/10.

---

## 0. Tiến độ Đợt 1 (08/10/2026)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| A. Tài khoản nhân viên | Xong: "Thêm nhân viên" + mật khẩu tạm, đặt lại mật khẩu, tạm khoá/mở, tự đổi mật khẩu, chặn dò mật khẩu đăng nhập, nhật ký | tenant `staff-accounts` 7/7 |
| B. Tiệm sạch | Xong: `render.yaml` `SEED_DEV_DATA="false"`; tiệm đăng ký mới hồ sơ trống; chặn gửi link khi hồ sơ còn mẫu Mộc Lan; thẻ nhắc hoàn tất hồ sơ; script `npm run khoa:tai-khoan-mau` | tenant `greeting-card-shop-ready` |
| C. Chỉ Điều hành xác nhận tiền | Xong: `R11` trần cứng | tenant `greeting-card-transfer-confirm` 3/3 |
| D. Ưu đãi tính tiền thật | Xong: 3 ưu đãi theo Q3, miễn phí giao mọi đơn, ẩn mã giảm giá | tenant `greeting-card-promotion-slot`, unit `promotion-and-slot-capacity` |
| E. Trần đơn mỗi khung giờ | Xong: mặc định 100, chỉnh từng khung, khoá chống tranh suất | tenant `greeting-card-promotion-slot` (10 khách tranh 3 suất → đúng 3 đơn) |

Lưu ý hành vi: ~~trang khách chọn sẵn ưu đãi đầu tiên~~ → **PO 08/10 (sau Đợt 2): không chọn sẵn, khách bắt buộc tự chọn 01 trong các ưu đãi đang áp dụng**; Điều hành bật/tắt từng ưu đãi theo từng thời điểm ở Hồ sơ tiệm → Chính sách ("Đang áp dụng"); đơn không chọn khung giờ ("Trong ngày") không tính vào trần khung nào.

## 0b. Tiến độ Đợt 2 (08/10/2026, làm sớm hơn lịch 12–14/10)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| F. Mở lại link ở trình duyệt khác | Xong: link đã có đơn hỏi 4 số cuối SĐT người đặt; đúng → vào lại phiên; 5 lần/15 phút, 10 lần/ngày mỗi link | tenant `greeting-card-unlock` 3/3, E2E bước 8 |
| G. Bảng Điều phối | Xong: đọc mọi đơn đang làm (tối đa 1000) + xong/huỷ 24 giờ qua, xếp theo ngày + giờ giao, lọc Hôm nay/Ngày mai/chọn ngày, tự làm mới 30 giây | unit + tenant `coordinator-board` |
| H. Sale không xoá nhầm mẫu | Xong ở giao diện: Gửi nhanh chỉ đọc khi không có `L3`; xoá mẫu luôn hỏi lại. Máy chủ chưa chặn thêm (Sale vẫn có `R2`) | đi tay trên staging |
| I. Đề xuất huỷ/hoàn | Xong: chặn huỷ đơn đã giao (409), khoá lạc quan hoàn tiền, trả mã giảm giá, báo khách `CANCELLED`, chặn đơn ngoài phạm vi Sale | tenant `greeting-card-cancellation` (+2, đỏ trên mã cũ) |
| J. Tiện thao tác | Xong: tìm theo mã đơn/mã link/SĐT, lọc "Khách báo đã chuyển"; mở Thẻ chào đúng chỗ theo năng lực — Điều hành → **tab Điều hành** (thay Hộp việc: nơi có bộ lọc "Khách báo đã chuyển"), Điều phối → tab Điều phối, Sale → Gửi nhanh | unit `default-view` |
| K. Tin báo khách | Xong phần chính: xác nhận tiền xong hiện tin soạn sẵn + nút "Sao chép tin". **Chưa làm** giờ "đã nhận tiền lúc hh:mm" trên trang khách (trang đã báo "Đã thanh toán thành công!") | — |
| L. E2E | Cập nhật `brochure-swipe.spec.ts`: hồ sơ tiệm, nhận chủ phiên, ưu đãi Giảm 10%, mở lại bằng 4 số cuối | `playwright test tests/e2e/brochure-swipe.spec.ts` |

## 1. Quyết định của PO ngày 08/10 (thay mọi quyết định cũ trái với nó)

| # | Quyết định | Thay thế quyết định cũ |
|---|---|---|
| Q1 | Điều hành tự tạo tài khoản cho Sale và Điều phối ngay trong ứng dụng | — |
| Q2 | "Tiệm Hoa Mộc Lan" chỉ là dữ liệu mẫu. Máy chủ thật phải sạch: tiệm mới không mang dữ liệu mẫu | — |
| Q3 | Ưu đãi 20/10 (khách chọn tối đa 01): **Giảm 10% trên tổng đơn** · **Tặng thiệp** · **Thêm phụ liệu cho bó hoa đẹp hơn**. **Miễn phí giao cho TẤT CẢ đơn** (công tắc của tiệm, không phải ưu đãi). **Ẩn mã giảm giá** (chưa dùng) | 9 ưu đãi mẫu tự hiện |
| Q4 | **Chỉ Điều hành** được xác nhận tiền (vì Điều hành giữ tài khoản ngân hàng). Đây là quyết định duy nhất | **Bỏ** quyết định 06/10 "giữ R9 cho Sale/Điều phối" |
| Q5 | Zalo OA / tin nhắn: chưa dùng. Chỉ chuẩn bị sẵn, làm sau lễ | — |
| Q6 | Giới hạn số đơn cho từng khung giờ, chỉnh trong Cài đặt, **mặc định 100 đơn/khung** | — |
| Q7 | Đóng băng mã nguồn từ **16/10 đến 21/10**, có quy trình sửa khẩn (mục 5) | — |

---

## 2. Trả lời câu 1 — Điều hành đã tạo được tài khoản cho nhân viên chưa?

**Kết luận: đã có phần khung, nhưng chưa dùng được và chưa đạt chuẩn.**

| Hạng mục | Hiện trạng | Đạt? |
|---|---|---|
| Ai được thêm nhân viên | Điều hành (năng lực `F3`), ở Cài đặt → **Đội ngũ & Phân quyền** (`/cai-dat/thanh-vien`) | Có |
| Giới hạn số lượng | **Không giới hạn.** Không có trần số thành viên theo gói. 1 Điều hành + 10 Sale + 3 Điều phối đều được | Có |
| Chọn vai khi thêm | Có danh sách vai hệ thống (Điều hành, Điều phối, Sale…) | Có |
| Nhân viên đăng nhập được | **Không.** Tài khoản tạo ra không có mật khẩu, trạng thái "Chờ kích hoạt" vĩnh viễn, không có bước nhận lời mời, không gửi email (`invite-member.ts:20,46`) | **Không** |
| Điều hành đặt lại mật khẩu cho nhân viên (`A7`) | Mới khai mã quyền, chưa có màn hình và chưa có API | **Không** |
| Nhân viên tự đổi mật khẩu (`A2`) | Chưa có | **Không** |
| Tạm khoá / mở lại tài khoản (`A5`) | Chưa có. Chỉ xoá hẳn khỏi tiệm được (`F4`) | **Không** |
| Đổi vai | Có (`F5`) | Có |
| Ghi nhật ký ai thêm/xoá/đổi vai ai | Chưa ghi | **Không** |
| Chặn dò mật khẩu ở trang đăng nhập | Không giới hạn số lần nhập sai | **Không** |
| Mỗi tài khoản chỉ một phiên đăng nhập | Có: đăng nhập máy khác thì máy cũ bị đẩy ra | Có (lưu ý: mỗi người phải có tài khoản riêng) |

---

## 3. Hạng mục công việc

Ký hiệu:
- **Mã** = tôi sửa trong mã nguồn (có kiểm thử kèm).
- **Hạ tầng** = anh/chị làm trên Render, tôi viết hướng dẫn từng bước.
- **Cấu hình** = anh/chị chỉnh trong ứng dụng.
- **Cần duyệt riêng** = việc mà `CLAUDE.md` bắt phải có PO đồng ý rõ.

Không hạng mục nào sửa cấu trúc cơ sở dữ liệu (`schema.prisma`).

### Đợt 1 — 08/10 → 11/10 (lên máy chủ thật tối 11/10 để PO bắt đầu thử)

**A. Tài khoản nhân viên đúng chuẩn** (Q1) · Mã
1. Nút **"Thêm nhân viên"**: nhập họ tên, email đăng nhập (không cần email thật, ví dụ `sale1@tenquan.vn`), vai.
   - Máy tạo **mật khẩu tạm** 12 ký tự, hiện **một lần** kèm nút "Sao chép".
   - Tài khoản **đang hoạt động ngay**.
   - Giữ luồng "Mời" cũ cho trường hợp người đã có tài khoản ALG.
2. Nút **"Đặt lại mật khẩu"** cho từng nhân viên (`A7`, chỉ Điều hành). Đặt lại xong thì nhân viên bị đăng xuất ở mọi máy.
3. Nút **"Tạm khoá / Mở khoá"** (`A5`): khoá là đăng xuất ngay, dữ liệu và đơn của nhân viên vẫn giữ.
4. Mục **"Đổi mật khẩu"** trong menu tài khoản cho mọi người (`A2`).
5. Trang đăng nhập: nhập sai quá 10 lần trong 15 phút (theo email và theo IP) thì tạm chặn 15 phút.
6. Ghi nhật ký (`audit_logs`) cho mọi thao tác thêm, đặt lại mật khẩu, khoá, xoá, đổi vai.
- *Kiểm thử:* kiểm thử đơn vị cho luật mật khẩu và chặn dò. Kiểm thử cô lập tiệm: Điều hành tiệm A không đặt lại mật khẩu được cho người tiệm B (trả 404); Sale không gọi được các API này (trả 403).

**B. Tiệm sạch, không còn dữ liệu mẫu** (Q2) · Mã + Hạ tầng (cần duyệt riêng: sửa `render.yaml`)
1. Bỏ `SEED_DEV_DATA="true"` trong `render.yaml`. Máy chủ thật **thôi nạp "Tiệm Hoa Mộc Lan"** mỗi lần triển khai. Phần nạp dữ liệu hệ thống (vai, mã quyền) vẫn giữ.
2. Tiệm đăng ký mới **không còn được nạp hồ sơ mẫu Mộc Lan**: hồ sơ chỉ có tên tiệm vừa nhập.
3. **Chặn gửi link Thẻ chào khi Hồ sơ tiệm thiếu tên hoặc số điện thoại**, hoặc vẫn còn số mẫu `0900123456`. Màn Thẻ chào hiện thẻ "Cần hoàn tất hồ sơ tiệm" kèm nút đi tới.
4. Tổ chức "Tiệm Hoa Mộc Lan (Dev)" đang có trên máy chủ thật:
   - Tôi viết script **khoá 2 tài khoản mẫu**: đặt mật khẩu ngẫu nhiên và chuyển sang trạng thái tạm khoá. Anh/chị chạy script.
   - Dữ liệu mẫu nằm riêng một tổ chức, tiệm thật không thấy được, nên **không xoá** (xoá trên máy chủ thật là thao tác phá huỷ).
   - Cần xoá hẳn thì làm sau lễ, kèm sao lưu.
5. **Danh sách khởi tạo tiệm mới** (hướng dẫn từng bước cho PO), xem mục 4.
- *Kiểm thử:* đăng ký tiệm mới trên staging → hồ sơ trống, gửi link bị chặn tới khi điền hồ sơ.

**C. Chỉ Điều hành xác nhận tiền** (Q4) · Mã (cần duyệt riêng: đổi trần quyền)
1. Thêm mã quyền mới **`R11` "Xác nhận tiền khách chuyển khoản và báo giá đơn Thẻ chào"**, **trần cứng = Điều hành**. Không tổ chức nào cấp thêm cho vai khác được, kể cả qua API chỉnh quyền.
2. Các thao tác chuyển từ `R9` sang `R11`: xác nhận tiền, báo giá mẫu chưa có giá, xem và xử lý giao dịch ngân hàng không khớp.
   - Huỷ đơn (`R6`) và hoàn tiền (`R10`) vốn đã chỉ Điều hành làm được.
3. **Tab "Điều hành" chỉ hiện với người có `R11`.** Sale và Điều phối không còn thấy nút "Thu tiền".
4. `R9` giữ nguyên cho **Sổ thu tại quầy** của module Điều phối (khác quy trình, đang khoá trên production), không đụng.
5. Tài liệu:
   - Ghi quyết định Q4 vào nhật ký quyết định ở `TRANG_THAI.md`.
   - Ở `KHAC_PHUC_THE_CHAO.md` và `HIEN_TRANG_THE_CHAO.md`, đánh dấu quyết định 06/10 về `R9` là **"ĐÃ THAY bởi Q4 ngày 08/10"**.
   - Cập nhật Screen Contract `the-chao.md`.
- *Kiểm thử:* kiểm thử cô lập tiệm: Sale và Điều phối gọi xác nhận tiền/báo giá → 403; Điều hành → 200. API chỉnh quyền cố cấp `R11` cho Sale → bị từ chối.

**D. Ưu đãi tính tiền thật** (Q3) · Mã + Cấu hình
1. **Bỏ 9 ưu đãi mẫu tự hiện.** Trang khách chỉ hiện ưu đãi tiệm đã bật.
2. Mỗi ưu đãi có **loại**:
   - `Giảm %` — trừ trên tiền hoa;
   - `Miễn phí ship` — phí giao về 0;
   - `Tặng kèm` — không đổi tiền.
   - Máy chủ tính lại: báo giá, tổng tiền, QR và số tiền Điều hành thu **đều đã trừ ưu đãi**.
3. Cài sẵn 3 ưu đãi theo Q3:
   - **"Giảm 10%"** — Giảm %, 10%;
   - **"Miễn phí ship + tặng thiệp"** — Miễn phí ship, kèm ghi chú tặng thiệp cho xưởng;
   - **"Thêm phụ liệu"** — Tặng kèm, kèm ghi chú cho xưởng.
4. Màn "Xem lại đơn" hiện dòng **"Ưu đãi: −xx.xxx đ"**. Hộp "Thu tiền" (Điều hành) và thẻ đơn (Điều phối) **hiện rõ ưu đãi** khách đã chọn.
5. Mẫu chưa có giá: khi Điều hành báo giá, máy tự trừ ưu đãi khách đã chọn và hiện số đã trừ.
- *Kiểm thử:* kiểm thử đơn vị tính tiền cho cả 3 loại × có/không phí ship × có/không mã giảm giá. Cố gửi ưu đãi giả hay số tiền giả lên máy chủ → bị bỏ qua. Giả lập 200 đơn: tổng tiền khớp từng loại ưu đãi.
- *Cần PO chốt (mục 6, câu 1–2):* khách **chọn 1 trong 3** hay **được cả 3**; có cho cộng thêm mã giảm giá không.

**E. Giới hạn đơn theo khung giờ** (Q6) · Mã + Cấu hình
1. Cài đặt → Giao hàng: thêm **"Số đơn tối đa mỗi khung giờ"**, mặc định **100**. Chỉnh được riêng từng khung (08–10, 10–12, …).
2. Đơn hẹn **"giờ cụ thể"** tính vào khung 2 tiếng chứa giờ đó.
3. Trang khách: khung đã đủ hiện **"Đã kín"** và không chọn được. Máy chủ kiểm lại lúc đặt; hai khách tranh suất cuối cùng lúc thì chỉ một người được.
4. Chỉ tính đơn Thẻ chào chưa huỷ, theo ngày giao.
- *Kiểm thử:* kiểm thử đơn vị đếm khung. Kiểm thử cô lập tiệm: đặt trần 3, gửi 10 đơn đồng thời → đúng 3 đơn, 7 đơn nhận lỗi "Khung giờ đã kín".

### Đợt 2 — 12/10 → 14/10 (lên máy chủ thật tối 14/10)

**F. Khách mở lại link ở trình duyệt hay máy khác** (C1) · Mã
- Phiên **đã có đơn** mà mở từ trình duyệt khác thì hiện ô **"Nhập 4 số cuối số điện thoại người đặt"**. Đúng thì xem được đơn, QR còn phải trả và ảnh. Giới hạn 5 lần sai mỗi 15 phút.
- Phiên **chưa có đơn** giữ nguyên cách chặn hiện tại.

**G. Tab Điều phối đủ đơn và xếp theo giờ giao** (C3) · Mã
- Đếm "Cần tôi làm / Đang làm / Xong" và lọc **ở máy chủ** trên toàn bộ đơn.
- Mặc định **xếp theo ngày + khung giờ giao gần nhất**. Có lọc "Hôm nay" và "Ngày 20/10".

**H. Sale không xoá nhầm mẫu** (C5) · Mã
- Ở "Gửi nhanh", Sale **chỉ chọn** bộ sưu tập, không xoá mẫu hay đổi giao diện được.
- Màn Quản lý: xoá phải xác nhận, và nút xoá luôn hiện rõ trên điện thoại.

**I. Đề xuất huỷ/hoàn an toàn** (T1) · Mã
- Dùng chung luật của sổ thu: chặn huỷ đơn đã giao, trả lại mã giảm giá, khoá chống ghi đè khi hai người hoàn cùng lúc, báo khách qua trang theo dõi.
- Sale "chỉ khách của mình" không đề xuất huỷ được đơn của Sale khác.

**J. Tiện thao tác ngày lễ** (T2, T3) · Mã
- Tab Điều hành: **ô tìm theo mã đơn hoặc số điện thoại**, nhãn **"Khách báo đã chuyển"**, lọc "Khách đã báo chuyển".
- Mở Thẻ chào thì **vào thẳng tab theo vai**: Điều phối → Điều phối, Điều hành → Hộp việc, Sale → Gửi nhanh.

**K. Tin báo khách không cần Zalo OA** (thay tạm Q5) · Mã
- Sau khi Điều hành xác nhận tiền, hiện nút **"Sao chép tin báo khách"**. Tin soạn sẵn: *"Tiệm … đã nhận đủ … đ cho đơn …, theo dõi tại …"*. Sale hoặc Điều hành dán gửi qua Zalo cá nhân.
- Trang khách hiện **"Cửa hàng đã nhận tiền lúc hh:mm"**.

**L. Sửa kiểm thử E2E Thẻ chào** (T4) · Mã
- Cập nhật `brochure-swipe.spec.ts` theo cơ chế chủ phiên, thêm bước ưu đãi và giới hạn khung giờ, để làm **bài kiểm hồi quy** trước mỗi lần lên máy chủ.

### Hạ tầng — anh/chị làm trên Render, tôi gửi hướng dẫn từng bước

| # | Việc | Hạn |
|---|---|---|
| H1 | Kiểm/khai đủ 4 biến `STORAGE_*` (kho ảnh R2 hoặc S3). Không có thì ảnh mất mỗi lần khởi động lại | 10/10 |
| H2 | Gói máy chủ: **PO 08/10 chốt nâng lên gói 2 GB RAM vào ngày 16/10** (ngày chạy chính thức), giữ đến hết 22/10. Không đổi `render.yaml`. ⏰ Nhắc PO sáng 16/10 | **16/10** |
| H3 | Sao lưu cơ sở dữ liệu tay ngày 15/10 và mỗi tối 18, 19, 20/10 | 15/10 |
| H4 | **Tắt Auto-Deploy** trên Render từ 16/10, bật lại 22/10 | 16/10 |
| H5 | Chạy script khoá tài khoản mẫu (B4) | 11/10 |

### Hồi quy và thử thật — 15/10
1. Tôi chạy đủ các bước kiểm tra trong `CLAUDE.md`, giả lập 200 đơn kèm ưu đãi và trần khung giờ, rồi bấm thử cả 3 vai trên điện thoại.
2. Anh/chị thử trên máy chủ thật:
   - tạo 12 tài khoản nhân viên;
   - đặt 3–5 đơn thật qua Zalo, chuyển khoản thật 10.000 đ từ 2–3 ngân hàng;
   - Điều hành xác nhận tiền;
   - Điều phối chụp ảnh và giao.
3. Lỗi phát sinh sửa trong 15/10 → sáng 16/10. Sau đó đóng băng.

### Làm sau lễ (không làm trước 20/10)
- Zalo ZNS / eSMS (mục 7).
- Danh sách phường/xã mới sau sáp nhập.
- Trừ tồn kho khi đặt.
- Ô "tôi không phải người máy".
- Xoá hẳn dữ liệu mẫu Mộc Lan.
- Các lỗi nhỏ N1–N6 trong báo cáo.

---

## 4. Danh sách khởi tạo tiệm thật (PO làm, sau khi Đợt 1 lên máy chủ)

1. Đăng ký tài khoản Điều hành và tổ chức mới bằng tên tiệm thật.
2. **Hồ sơ tiệm:** tên, số điện thoại, Zalo, địa chỉ, logo.
3. **Thẻ chào → Điều hành → Cài đặt:**
   - tài khoản nhận tiền (ngân hàng, số TK, tên chủ TK);
   - khu vực giao và phí ship;
   - giờ chốt đơn trong ngày, thời gian chuẩn bị;
   - khung giờ giao và trần đơn mỗi khung;
   - quyền xem của Sale;
   - giữ đơn chờ chuyển khoản: số phút; **tự huỷ: để TẮT**.
4. **Ưu đãi:** kiểm 3 ưu đãi theo Q3, bật cho bộ sưu tập 20/10.
5. **Sản phẩm:** tạo mẫu hoa kèm ảnh và **giá bán** (mẫu chưa có giá sẽ phải báo giá tay).
6. **Bộ sưu tập "20/10":** thêm mẫu, chọn giao diện khách xem.
7. **Đội ngũ:** tạo tài khoản cho từng Sale và Điều phối, gửi mật khẩu tạm, nhắc mỗi người tự đổi mật khẩu.
8. Đặt thử 1 đơn thật từ đầu tới cuối.

---

## 5. Đóng băng 16/10 → 21/10 và cách xử lý khi có sự cố

**"Đóng băng"** nghĩa là **không đưa mã nguồn mới lên máy chủ thật**, vì mỗi lần đưa lên máy chủ phải build và khởi động lại. **Cài đặt trong ứng dụng vẫn đổi được bình thường**, vì đó là dữ liệu chứ không phải mã: giá, ưu đãi, khung giờ, trần đơn, tài khoản nhân viên, mẫu hoa.

| Tình huống | Cách xử lý | Thời gian |
|---|---|---|
| Lỗi nhỏ, có cách làm tay | Không sửa mã. Ghi lại, sửa sau 21/10. Tôi ghi sẵn cách làm tay (ví dụ: tắt khung giờ, báo giá tay, nhắn khách bằng tin mẫu) | Ngay |
| Lỗi chặn bán hàng hoặc sai tiền | **Sửa khẩn:**<br>1. Sửa tối thiểu trên nhánh `hotfix/…` tách từ bản đã đóng băng (gắn nhãn `release-2026-10-15`).<br>2. Chạy đủ kiểm thử + giả lập 200 đơn trên staging.<br>3. PO duyệt.<br>4. Đưa lên máy chủ vào giờ vắng (sau 21h hoặc trước 7h, trừ khi đang chặn bán hàng).<br>**Cấm** sửa cấu trúc cơ sở dữ liệu trong bản sửa khẩn. | 1–3 giờ |
| Bản vừa đưa lên bị lỗi | Render → floraos-web → Deploys → **Rollback** về bản trước. Vì không đổi cấu trúc dữ liệu nên quay lui an toàn | 2–5 phút |
| Máy chủ hết bộ nhớ hoặc treo | Render tự khởi động lại. Nếu lặp lại thì nâng gói ngay trên Render (không cần sửa mã) | 5 phút |
| Web không truy cập được quá 15 phút | **Phương án giấy:** Sale nhận đơn qua Zalo và ghi vào bảng tính mẫu (tôi soạn sẵn). Điều hành kiểm tiền bằng app ngân hàng. Nhập lại vào hệ thống khi web chạy lại | Ngay |
| Mất hoặc sai dữ liệu | Khôi phục từ bản sao lưu gần nhất (H3) | 30–60 phút |

---

## 6. Câu hỏi còn lại để chốt trước khi làm

1. Ưu đãi: khách **chọn 1 trong 3** (đúng luật hiện tại "tối đa 1 ưu đãi mỗi đơn"), hay **mỗi đơn được cả 3**?
2. Tiệm có phát **mã giảm giá** riêng không? Nếu có, mã có được **cộng thêm** với "Giảm 10%" không? (Đề xuất: không cộng; nếu tiệm không dùng mã thì ẩn ô nhập mã.)
3. "Giảm 10%" tính trên **tiền hoa** (đề xuất), hay trên **cả phí ship**?
4. Đồng ý **sửa `render.yaml`** (bỏ nạp dữ liệu mẫu ở B1; chỉnh bộ nhớ nếu giữ gói 512 MB ở H2) và **thêm mã quyền `R11` trần cứng Điều hành** (C)?

## 7. Zalo OA — vai trò và vì sao để sau (Q5)

- **Zalo OA** là tài khoản Zalo chính thức của tiệm, cần xác thực doanh nghiệp. **ZNS** là dịch vụ của Zalo gửi **tin giao dịch theo mẫu đã duyệt** tới số điện thoại khách (khách có Zalo, không cần quan tâm OA). Ví dụ: "Đã nhận đơn", "Đã nhận tiền", "Đang giao".
- Muốn dùng cần:
  - OA đã xác thực;
  - từng mẫu tin được Zalo duyệt (thường 1–3 ngày làm việc mỗi mẫu);
  - nạp tiền trả theo tin.
- Mã nguồn **đã có sẵn** kết nối ZNS và eSMS, màn cài đặt, hướng dẫn đăng ký mẫu và nút gửi thử. Khi đăng ký xong chỉ cần nhập khoá và mã mẫu. Sau lễ tôi sẽ kiểm lại kết nối với tài liệu hiện hành của Zalo trước khi bật.
- Cho 20/10: dùng **K** (tin soạn sẵn, gửi Zalo tay) và trang theo dõi của khách. Không cần ZNS.
