# Báo cáo đánh giá & chuẩn hóa nội dung giao diện – FloraOS Production

*Phạm vi: 11 tệp (00–10), khoảng 330 mục copy của 10 màn hình đang chạy Production · Ngày rà soát: 10/10/2026 · Chuẩn đối chiếu: SaaS enterprise-grade (rõ nghĩa, nhất quán, an toàn, truy cập được, sẵn sàng bản địa hóa)*

## 1. Kết luận điều hành

**Đánh giá chung: chưa đạt chuẩn production-ready enterprise.** Bộ copy có nền tảng tốt, nhưng còn nhiều lỗi sự thật, thuật ngữ thiếu nhất quán, jargon và còn thiếu hẳn nhiều nhóm copy bắt buộc (lỗi, xác nhận, trạng thái chờ). Theo đánh giá định tính, khoảng một nửa số mục cần chỉnh, từ sửa nhỏ đến viết lại.

**Điểm mạnh nên giữ**

- CTA mở đầu bằng động từ rõ ràng: “Tạo đơn mới”, “Xuất Excel”, “Khôi phục tài nguyên”.
- Placeholder dùng ví dụ thật của ngành hoa (“Tiệm Hoa Ban Mai”, “0909xxxxxx”, “Giỏ Hoa Nắng Ban Mai”).
- Modal xóa mềm (PROD-DEL-02) nói rõ hệ quả và khả năng khôi phục – đây là mẫu tốt cho cả hệ thống.
- Có ghi chú ngữ cảnh, phân quyền và biến `{{...}}` cho từng mục; đã tự nhận diện lỗi lộ mã nội bộ (R8).
- Tài liệu 00 đã đặt đúng nguyên tắc giọng điệu: tươi sáng, thanh lịch, tránh thuật ngữ lập trình.

**Bốn nhóm vấn đề chính**

1. **Mâu thuẫn và sai sự thật**: thẻ “Sắp ra mắt” cho tính năng đã chạy, con số “95%” không kiểm chứng, tiêu đề sai chính tả.
2. **Thiếu nhất quán thuật ngữ**: một tính năng có 5–6 tên gọi, một trường dữ liệu có 4 nhãn.
3. **Jargon và mã nội bộ**: BOM, Master Index, PII, Vision Engine, Kanban, M09… vi phạm chính quy tắc giọng điệu ở tài liệu 00.
4. **Thiếu độ phủ**: chưa có copy cho toast, lỗi nghiệp vụ, loading, xác nhận hành động nguy hiểm, dialog thêm thành viên, trạng thái AI.

**Khuyến nghị**: chưa nên để Agent áp dụng cột “Mới” vào mã nguồn cho đến khi (a) chốt từ điển thuật ngữ (mục 5), (b) xử lý xong P0/P1 (mục 4), (c) bổ sung các nhóm copy còn thiếu (mục 9). Vì Agent đọc thẳng cột “Mới”, một lỗi trong tài liệu sẽ nhân bản vào code.

## 2. Thang đánh giá

| Mức | Ý nghĩa | Hành động |
| :-- | :-- | :-- |
| **P0** | Sai sự thật, lộ mã nội bộ, lỗi chính tả ở vị trí nổi bật, rủi ro mất niềm tin | Sửa trước khi phát hành |
| **P1** | Gây hiểu nhầm, thiếu nhất quán lớn, rủi ro pháp lý/tài chính, thiếu copy bắt buộc | Sửa trong đợt chuẩn hóa này |
| **P2** | Văn phong, định dạng, độ ngắn gọn, khả năng truy cập | Sửa cùng đợt nếu có thể |
| **P3** | Tinh chỉnh | Làm khi rảnh |

**Tám tiêu chí**: rõ nghĩa · nhất quán thuật ngữ · giọng điệu · không jargon · hướng dẫn hành động/khắc phục lỗi · đầy đủ · truy cập và bản địa hóa · an toàn pháp lý/tài chính.

## 3. Bảng điểm theo màn hình

| # | Màn hình | Số mục (≈) | Mức sẵn sàng | Vấn đề nổi bật |
| :-- | :-- | :-- | :-- | :-- |
| 01 | Trang chủ | 51 | Cần sửa lớn | Thẻ “Sắp ra mắt” mâu thuẫn Production; chữ HOA; mô tả dài, mơ hồ |
| 02 | Đơn hàng | 65 | Cần sửa lớn | Mã M09; Master Index/BOM; trạng thái Kanban và mobile lệch nhau; lỗi chung chung |
| 03 | Thẻ chào | 26 | Cần sửa vừa | Điều hành/Điều phối gần âm; nhiều tên gọi cho một khái niệm; thiếu nội dung cảnh báo hồ sơ |
| 04 | Sản phẩm & Giá | 30 | Cần sửa vừa | Lỗi “của hàng”; khoảng giá trùng biên; thiếu danh mục “Hoa chia buồn” |
| 05 | Tạo mẫu hoa | 45 | Cần sửa vừa | BOM; “Mã sản phẩm \*” vừa bắt buộc vừa tự sinh; lặp từ “Dáng” |
| 06 | Nhập Excel | 26 | Gần đạt | “Nạp”; .xlsx vs .xls; thiếu copy lỗi theo dòng |
| 07 | Quét ảnh hoa | 25 | Cần sửa lớn | Mã M01A; “95%”; “bóc tách”; thiếu copy AI (đang chạy, thất bại, cần kiểm tra) |
| 08 | Kho dữ liệu | 13 | Cần sửa vừa | “3 phân vùng” nhưng có 4 tab; M01a; Sale Pitch; thiếu xác nhận xóa vĩnh viễn |
| 09 | Hồ sơ cửa hàng | 23 | Cần sửa vừa | VietQR thiếu cảnh báo; “pháp lý” không có trường tương ứng; cam kết mặc định |
| 10 | Cài đặt & Thành viên | 28 | Cần sửa lớn | PII, hex, credit, Vision Engine; trùng dữ liệu với Hồ sơ; thiếu copy dialog thêm thành viên |

## 4. Vấn đề ưu tiên cao (P0–P1)

| # | Mức | Vấn đề | Bằng chứng | Hành động |
| :-- | :-- | :-- | :-- | :-- |
| 1 | P0 | Trang chủ ghi **Sắp ra mắt** cho tính năng đã chạy: Đơn hàng và Quét ảnh | `HOME-CRD-10T/D`, `HOME-CRD-03T/D` so với tài liệu 00 (10 mục Production, gồm `/don-hang`, `/tai-anh`) | Đối chiếu trạng thái từng thẻ với route thật; thẻ đã chạy phải dùng “Bắt đầu ngay” |
| 2 | P0 | Mã nội bộ lộ ra giao diện | `ORDER-GDC-01` (M09), `SCN-GDC-01` (M01A), `MED-TAB-02` (M01a) | Xóa mã; viết lại nhãn |
| 3 | P0 | Lỗi chính tả ở nhãn đầu trang: “Kho sản phẩm **của hàng**” | `PROD-HDR-01` | Sửa thành “cửa hàng” |
| 4 | P0 | Cam kết hiệu năng không kiểm chứng: “nhận diện đúng **95%**” | `SCN-GDC-03` | Bỏ con số; dùng “giúp AI nhận diện chính xác hơn” |
| 5 | P1 | Hành động không hoàn tác (xóa vĩnh viễn) chưa có copy xác nhận | `MED-ACT-05` | Thêm modal với tên tài nguyên, cảnh báo không thể khôi phục |
| 6 | P1 | Một tính năng, nhiều tên gọi (Quét ảnh: 5 tên; Thẻ chào: 6 tên; Mã SKU: 4 tên; “Làm mới”: 4 biến thể) | Xem mục 5 | Chốt từ điển, thay đồng loạt |
| 7 | P1 | Jargon vi phạm quy tắc giọng điệu ở tài liệu 00 | BOM, Master Index/Catalog, PII, Vision Engine, Kanban, hex, credit, Key Selling Points, Florist Ticket, Container, Sale Pitch | Thay bằng ngôn ngữ nghiệp vụ hoa |
| 8 | P1 | Mẫu địa chỉ lỗi thời: “phường, quận/huyện” (cấp huyện đã bỏ từ 01/07/2025) | `ORDER-MOD-10`, `PRF-PH-03`, `SET-LBL-03` | Đổi thành “phường/xã, tỉnh/thành phố”; kiểm tra lại cả logic form địa chỉ |
| 9 | P1 | Thông báo lỗi chỉ nêu sự việc, không nêu nguyên nhân hay cách xử lý | `ORDER-ERR-01..03`; thiếu hẳn lỗi cho Quét ảnh, Nhập Excel, tải ảnh | Viết lại theo công thức: chuyện gì xảy ra + vì sao + làm gì tiếp |
| 10 | P1 | Tài khoản nhận tiền VietQR thiếu cảnh báo rủi ro (khách sẽ chuyển cọc vào đây) | `PRF-LBL-04..06` | Thêm helper text; hiển thị bước xác nhận lại |
| 11 | P1 | Cùng một dữ liệu (tên, hotline, địa chỉ) có hai nơi nhập với nhãn khác nhau | `SET-LBL-01..03` so với `PRF-LBL-01..03` | Chọn một nguồn sự thật; nơi còn lại chỉ hiển thị và dẫn link |
| 12 | P1 | Cam kết mặc định (đúng hẹn, đổi trả) tự chèn vào brochure, có hệ quả pháp lý/uy tín | `PRF-POL-04..06` | Cho phép chủ cửa hàng sửa; thêm dòng nhắc kiểm tra trước khi bật |
| 13 | P1 | Tuyên bố “chuẩn hóa 100%” nhưng thiếu nhiều nhóm copy | Mục 9 | Bổ sung trước khi áp dụng |
| 14 | P2 | Emoji, dấu `*`, số thứ tự, dấu `+` và dấu `:` nằm cứng trong chuỗi; Title Case tràn lan | Nhiều nơi | Chuyển sang component; xem mục 6 |

## 5. Từ điển thuật ngữ chuẩn (đề xuất để PO chốt)

Đây là gốc rễ của phần lớn lỗi nhất quán. Nên chốt bảng này **trước** khi điền cột “Mới” ở bất kỳ tệp nào.

| Khái niệm | Đang dùng rải rác | Đề xuất chuẩn | Ghi chú |
| :-- | :-- | :-- | :-- |
| Tính năng gửi khách | Thẻ Chào · Thẻ chào mẫu hoa · Link Chào Khách · Link đặt hoa · Kênh Chào Bán · brochure · catalog | **Thẻ chào mẫu hoa** (tên tính năng) · **Bộ sưu tập** (nội dung) · **Link đặt hoa** (đường dẫn gửi khách) | Bỏ “Kênh chào bán”, “catalog”, “brochure”, “Link Chào Khách” |
| Quét ảnh | Quét ảnh hoa · Phân tích AI · Nhận diện AI · Tải ảnh mới để phân tích · Tạo Thẻ sản phẩm từ ảnh | **Quét ảnh hoa** (tên màn hình) · nút hành động: **Phân tích ảnh** | 5 tên cho 1 tính năng |
| Sản phẩm | Sản phẩm · Mẫu hoa · Master Index · Master Catalog · Thẻ sản phẩm | **Mẫu hoa** (đối tượng) · **Kho mẫu hoa** (tập hợp) | Menu “Sản phẩm & Giá” nên khớp H1 “Mẫu hoa” (vd. “Mẫu hoa & giá”) |
| Mã định danh | Mã sản phẩm · Mã hoa · mã số · Mã | **Mã mẫu hoa** | Trường tự sinh `FL-xxxx` |
| Cập nhật dữ liệu | Làm mới · Tải lại danh sách · Làm mới dữ liệu · Làm mới danh sách | **Làm mới** | Icon + 1 từ; không cần nêu đối tượng |
| Đơn vị kinh doanh | cửa hàng · tiệm · shop · tiệm hoa | **cửa hàng** trong UI hệ thống; “tiệm” chỉ dùng trong lời chào/AI | “Hồ sơ tiệm” và “Hồ Sơ Cửa Hàng” đang lệch nhau |
| Nhân sự | Nhân viên · Thành viên · Nhân sự · Đội ngũ | **Thành viên** | Khớp cột “Thành viên” và route `/thanh-vien` |
| Vai trò | Điều hành · Điều phối · Quản lý · Sale · Bán hàng · Thợ cắm hoa · Nghệ nhân cắm hoa · Florist | **Điều hành**, **Nhân viên bán hàng**, **Điều phối viên**, **Thợ cắm hoa** | “Điều hành” và “Điều phối” gần âm, dễ nhầm: nên đặt tên tab theo chức năng (xem mục 8.3). **PO cần chốt** |
| Công thức hoa | BOM · Công thức thành phần hoa · Công thức cắm hoa | **Thành phần hoa** | Bỏ BOM khỏi mọi chuỗi hiển thị |
| Phiếu cho thợ | Florist Ticket · phiếu cắm hoa · phiếu thợ | **Phiếu cắm hoa** |  |
| Kịch bản tư vấn | Sale Pitch · Kịch bản tư vấn · Kịch bản Zalo | **Kịch bản tư vấn** |  |
| Kho lưu trữ | Kho dữ liệu · Kho sản phẩm · kho tư liệu · Trung tâm lưu trữ | **Kho ảnh & nội dung** (menu `/kho-du-lieu`) | “Dữ liệu” là từ kỹ thuật. **PO cần chốt** |
| Công việc | Tác vụ · Hộp việc | **Công việc** · **Việc cần làm** | “Tác vụ” là ngôn ngữ phần mềm |
| Xóa | Đưa vào thùng rác · Xóa vĩnh viễn · Xóa | Giữ đúng hai cụm: **Chuyển vào thùng rác** (xóa mềm) và **Xóa vĩnh viễn** | Không dùng “Xóa” trơn cho xóa mềm |
| Trợ lý | Trợ lý ảo · Trợ lý AI · FloraOS Chat | **Trợ lý AI** |  |
| Tông màu | Tone màu | **Tông màu** | Xuất hiện ở `ORDER-GDC-04`, `ORDER-MOD-20` |
| Tệp | file · tệp | **file** | Gần với thói quen người dùng Zalo/Excel |
| Tiền tệ | đ · VNĐ | **₫** (vd. `650.000 ₫`; nhãn “(₫)”) |  |
| Nhập dữ liệu | Nhập · Nạp | **Nhập** / “Thêm vào kho” | “Nạp” là dịch máy của *load* |
| Chính tả | khóa · khoá | **khóa** | `ORDER-EMP-02` đang dùng “khoá” |

## 6. Quy chuẩn văn phong & định dạng (đề xuất)

| Quy tắc | Hiện trạng | Chuẩn đề xuất |
| :-- | :-- | :-- |
| Hoa/thường | Title Case khắp nơi (“Đơn Hàng & Kênh Chào Bán”, “Tạo Bộ Sưu Tập”); ALL CAPS ở H1 và huy hiệu | **Sentence case** cho tiêu đề, tab, nút, nhãn. In hoa chỉ do CSS khi thiết kế cần |
| Dấu `&` | Dùng cả trong câu và nút | Dùng “và”. Chỉ giữ `&` ở nhãn điều hướng ngắn (≤ 3 từ) |
| Dấu `+` đầu nút | `+ Thêm nhân viên`, `+ Thêm mục` (trong khi `ORDER-BTN-01` dùng icon) | Dùng icon, không đưa vào chuỗi |
| Số thứ tự trong nhãn | `1. Ảnh Gốc`, `1. Mới tiếp nhận`, `1. Nhận diện thị giác` | Để component đánh số; đổi thứ tự không phải sửa copy |
| Dấu bắt buộc `*`, dấu `:` | Nằm cứng trong \~15 nhãn | Component tự thêm và gắn `aria-required`; copy chỉ giữ chữ |
| Emoji | 📸 💡 ✨ ✂️ 🛵 ⚡ trong mẹo và nhãn | Icon trong bộ thư viện; emoji hiển thị khác nhau theo thiết bị và gây nhiễu trình đọc màn hình |
| Dấu ba chấm | `...` trong placeholder và nhãn tĩnh | `…` chỉ dùng cho placeholder/đang xử lý; bỏ ở nhãn tĩnh |
| Viết tắt | SĐT, VD, TT, STK | Viết đầy đủ: “Số điện thoại”, “Ví dụ:”, “Thanh toán” |
| Chấm câu | “Nhập dữ liệu thành công!”; câu có/không có chấm lẫn lộn | Tiêu đề, nút, nhãn: không chấm. Câu đầy đủ: có chấm. Hạn chế “!” |
| Đơn vị | `10MB`, `500.000 đ - 1.000.000 đ`, `07:30 - 21:30` | `10 MB`, `500.000–1.000.000 ₫`, `07:30–21:30` |
| Xưng hô | “bạn”, “của tiệm”, câu cụt chủ ngữ lẫn lộn | Gọi người dùng là “bạn”; hệ thống không tự xưng |
| Độ dài | Mô tả thẻ dài 100–130 ký tự; tab dài tới 9 từ (“Thẻ Chào & Link Chào Khách (Sale)”) | Tab ≤ 3 từ · nút ≤ 4 từ · tiêu đề thẻ ≤ 6 từ · mô tả thẻ ≤ 90 ký tự |
| Nhãn theo vai trò | “(Sale)”, “(Điều hành)” trong tên tab | Phân quyền bằng cách ẩn/hiện tab, không ghi vai trò vào nhãn |

**Công thức thông báo lỗi**: *\[Điều gì đã xảy ra\]. \[Vì sao, nếu biết\]. \[Bạn có thể làm gì tiếp\].* Ví dụ: “Chưa tạo được đơn hàng. Kết nối bị gián đoạn nên đơn chưa được lưu. Hãy thử lại sau ít phút.”

**Công thức hộp thoại xác nhận**: tiêu đề là câu hỏi nêu đúng đối tượng (“Chuyển ‘Giỏ Hoa Nắng Ban Mai’ vào thùng rác?”) · mô tả nêu hệ quả và cách hoàn tác · nút xác nhận lặp lại động từ (“Chuyển vào thùng rác”) · nút còn lại là “Hủy”.

**Công thức trạng thái rỗng**: tiêu đề + một câu giải thích + một hành động tiếp theo. Tách riêng hai trường hợp: *chưa có dữ liệu* và *không có kết quả khớp bộ lọc*.

## 7. Hệ mã định danh (Copy ID)

- **Ký hiệu loại không khớp thực tế.** Tài liệu 00 định nghĩa 12 loại (HDR, TAB, BTN, LBL, PH, HLP, TH, BDG, GDC, EMP, MOD, MSG), nhưng phần giữa của mã dùng nhiều token ngoài danh sách: `CAT`, `SHP`, `FAC`, `BOM`, `DZ1`, `DZ2`, `ST`, `PRG`, `RES`, `ACT`, `POL`, `NAV`, `CRD`, `FBDG`, `CBTN`, `MOB`, `COL`, `OPT`, `STP`, `UP`, `CPY`, `PTC`, `RDN`, `GD`… Thực tế quy ước đang là `[PHÂN HỆ]-[NHÓM]-[SỐ]`.
- **Cột “Loại” và mã lệch nhau.** `GDC` được coi là loại nhưng trong mã dùng cho huy hiệu, tiêu đề, mô tả. `MOD` trong mã là nhóm hộp thoại nhưng cột “Loại” lại ghi HDR/LBL/PH/BTN.
- **Gán sai loại**: mô tả thẻ (`HOME-CRD-xxD`, `HOME-FDES-01`) ghi `HDR`; nên là `LBL`. Tùy chọn dropdown ghi `PH` (`ORDER-MOD-04`, `CARD-CAT-06`) hoặc `LBL` (`ORDER-OPT-*`, `CRT-CAT-*`); nên có loại riêng `OPT`.
- **`HLP` được định nghĩa nhưng không được dùng**: toàn bộ helper text đang để `LBL` (vd. `CRT-IMG-03`, `IMP-DZ1-03`, `IMP-DZ2-03`).
- **Mã phân hệ không khớp tiền tố**: tài liệu ghi `SETTING`, `PROFILE`, `MEDIA`, `SCAN`, `CREATE`, `IMPORT`, `PRODUCT` nhưng mã dùng `SET`/`MEM`, `PRF`, `MED`, `SCN`, `CRT`, `IMP`, `PROD`; riêng phân hệ `SETTING` có hai tiền tố (`SET`, `MEM`).
- **Hậu tố `T`/`D`** (`HOME-CRD-01T/01D`) nằm ngoài quy ước.
- **Biến `{{...}}`**: tài liệu 00 nêu ví dụ `{{shopName}}` nhưng không chuỗi nào dùng. Cần bảng biến (tên, kiểu, định dạng). `{{count}}` nên định dạng theo vi-VN (1.234).
- **Chưa có mã cho**: toast, thông báo kiểm tra dữ liệu, tooltip, `aria-label`, văn bản thay thế ảnh.

**Khuyến nghị**: *không đổi các key đã có* (Agent đang ánh xạ theo key). Thay vào đó cập nhật tài liệu 00 cho khớp thực tế, thêm loại `OPT`, `ERR`, `OK`, `CFM`, `A11Y`, và thêm cột “Khu vực” để tách nhóm UI khỏi loại thành phần.

## 8. Rà soát chi tiết theo màn hình

Quy ước: mục không được liệt kê được xem là **đạt** hoặc chỉ cần đổi theo từ điển (mục 5) và quy chuẩn (mục 6). Cột “Đề xuất” là bản chuẩn hóa gợi ý để PO điền vào cột “Mới”.

### 8.1. Trang chủ (`/`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `HOME-HDR-01` | HÀNH TRÌNH TÁC VỤ THÔNG MINH | P2 | Chữ in hoa, “tác vụ” là jargon, “thông minh” là từ sáo | Bắt đầu nhanh |
| `HOME-HDR-02` | BẠN MUỐN LÀM GÌ CHO CỬA HÀNG? | P2 | In hoa toàn câu khó đọc | Hôm nay bạn muốn làm gì cho cửa hàng? |
| `HOME-HDR-03` | Chọn một tác vụ để bắt đầu hành trình làm việc có định hướng… | P2 | Dài, lặp ý với H1 | Chọn một công việc bên dưới để bắt đầu. |
| `HOME-BTN-01` | Chế độ chuyên gia | P1 | Gây hiểu nhầm: thực chất là bảng số liệu | Xem bảng số liệu |
| `HOME-BTN-02` | Chuyển sang Chế độ hành trình tác vụ | P2 | Dài, jargon | Về trang chọn công việc |
| `HOME-HDR-04` | Bạn đang ở Chế độ chuyên gia (Bảng điều khiển trực tiếp) | P2 | Hai tên cho một chế độ | Bạn đang xem bảng số liệu trực tiếp. |
| `HOME-TAB-02..04` | Tác vụ đơn · Gói quy trình · Trợ lý ảo | P2 | Jargon; “Trợ lý ảo” lệch “Trợ lý AI” | Việc đơn lẻ · Quy trình trọn gói · Trợ lý AI |
| `HOME-PH-01` | Tìm tác vụ mong muốn... | P3 |  | Tìm công việc… |
| `HOME-EMP-01` | Không tìm thấy tác vụ phù hợp với từ khóa “{{searchQuery}}”. | P2 | Không gợi ý bước tiếp | Không có kết quả cho “{{searchQuery}}”. Hãy thử từ khóa khác. |
| `HOME-FBDG-01` | TÍNH NĂNG TRỌNG TÂM | P3 | Chữ hoa, nặng nề | Nổi bật |
| `HOME-FBDG-02` | Sẵn sàng phục vụ | P3 | “Phục vụ” nghe như khách sạn | Sẵn sàng sử dụng |
| `HOME-FHDR-01` | Thẻ Chào mẫu hoa | P2 | Viết hoa sai (khác mọi nơi) | Thẻ chào mẫu hoa |
| `HOME-FDES-01` | Tạo bộ sưu tập hoa, gửi link cho khách lướt chọn mẫu, theo dõi thanh toán và điều phối cắm hoa giao đến tay người nhận | P2 | Một câu 120 ký tự, “lướt chọn” khẩu ngữ, trùng `CARD-HDR-03` | Gửi bộ sưu tập hoa cho khách chọn mẫu, đặt hàng và thanh toán ngay trên điện thoại. |
| `HOME-FTIP-01..03` | Gửi link chọn mẫu qua Zalo · Khách tự chọn & gửi lời chúc · Tự động nhận đơn & điều phối | P3 | Mục 3 dùng “điều phối” khó hiểu | Gửi link qua Zalo · Khách tự chọn mẫu và gửi lời chúc · Đơn vào hệ thống và giao việc cho thợ |
| `HOME-FBTN-01` | Mở Thẻ Chào & Tạo Link | P2 | Hai hành động trong một nút | Tạo link đặt hoa |
| `HOME-FSUB-01` | Khuyên dùng mỗi ngày cho tiệm | P3 |  | Nên dùng mỗi ngày |
| `HOME-CBTN-03` | {{count}} bước liền mạch | P3 |  | {{count}} bước |

**Thẻ chức năng 01–13.** Hai vấn đề chung: (1) **P0** các thẻ `HOME-CRD-03` (Quét ảnh) và `HOME-CRD-10` (Đơn hàng) mang trạng thái “Sắp ra mắt” trong khi `/tai-anh` và `/don-hang` đã Production; (2) tiêu đề không cùng cấu trúc (đa số bắt đầu bằng động từ, riêng 13 là danh từ), chữ hoa giữa câu (“Thẻ sản phẩm”), mô tả 100–130 ký tự.

| Thẻ | Tiêu đề đề xuất | Mô tả đề xuất (≤ 90 ký tự) | Ghi chú |
| :-- | :-- | :-- | :-- |
| 01 | Xem báo cáo | Xem doanh thu, số đơn hàng và hoạt động trên FloraOS của cửa hàng. | Bỏ “kho tư liệu đã tạo” (mơ hồ) |
| 02 | Xem mẫu hoa được ưa chuộng | Biết khách thích kiểu hoa, màu sắc và mức giá nào để chuẩn bị hàng. |  |
| 03 | Tạo mẫu hoa từ ảnh chụp | Chụp ảnh hoa, AI nhận ra các loại hoa và tạo sẵn mẫu để bán. | **P1**: “ước tính chi phí” không có trên màn hình `/tai-anh`; “Thẻ sản phẩm” không có trong từ điển. Trạng thái phải là mở |
| 04 | Tạo báo giá | Soạn báo giá hoa cho khách mua hoặc cho đối tác của cửa hàng. |  |
| 05 | Viết bài đăng | Soạn bài cho Facebook, Instagram, TikTok đúng giọng văn của cửa hàng, kèm hashtag gợi ý. |  |
| 06 | Tạo giọng đọc cho bài đăng | Chuyển bài viết thành giọng đọc để ghép vào video giới thiệu mẫu hoa. |  |
| 07 | Tạo ảnh quảng cáo từ ảnh gốc | Tách nền và đặt hoa vào không gian studio hoặc sự kiện để có ảnh quảng cáo đẹp hơn. |  |
| 08 | Tạo video từ ảnh hoa | Biến ảnh bó hoa thành video ngắn để đăng Story, Reels, TikTok. |  |
| 09 | Tạo trang giới thiệu và bán hoa | Tạo trang web bộ sưu tập hoa kèm mã QR để in lên thiệp hoặc đặt ở quầy. |  |
| 10 | Xử lý đơn hàng | Theo dõi đơn từ lúc chốt, giao việc cho thợ đến khi hoa tới tay người nhận. | **P0** trạng thái; bỏ “(Dành cho Điện Hoa)” (nhãn nội bộ, khó hiểu) |
| 11 | Quản lý khách hàng | Lưu sở thích, sinh nhật, ngày kỷ niệm và lịch sử đặt hoa của khách quen. |  |
| 12 | Ra mắt mẫu hoa mới | Từ một ảnh chụp: nhận diện hoa, tạo mẫu, viết bài và làm ảnh quảng cáo. | Bỏ mũi tên; số bước phải khớp `{{count}}` |
| 13 | Hỏi trợ lý FloraOS | Trợ lý AI giải đáp thắc mắc và hướng dẫn bạn dùng FloraOS. | “FloraOS Chat” là danh từ kỹ thuật |

### 8.2. Đơn hàng (`/don-hang`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `ORDER-HDR-02` | Đơn Hàng & Kênh Chào Bán | P1 | “Kênh chào bán” là khái niệm marketing mơ hồ; Title Case | Đơn hàng |
| `ORDER-BTN-02` | Tạo từ chat | P2 | “Chat” không rõ kênh | Tạo đơn từ tin nhắn |
| `ORDER-BTN-04` | Trang chủ | P3 | Trùng sidebar | Cân nhắc bỏ |
| `ORDER-TAB-01` | Tất cả đơn hàng (Kanban) | P1 | Jargon trong tên tab | Đơn hàng |
| `ORDER-TAB-02` | Thẻ Chào & Link Chào Khách (Sale) | P1 | 7 từ, 3 tên gọi, vai trò trong nhãn | Link đặt hoa |
| `ORDER-TAB-03` | Duyệt TT Thẻ Chào (Điều hành) | P1 | “TT” là viết tắt mơ hồ, vai trò trong nhãn | Duyệt thanh toán |
| `ORDER-GDC-01` | HƯỚNG DẪN QUẢN LÝ ĐƠN HÀNG M09 | **P0** | Lộ mã nội bộ, chữ hoa | Hướng dẫn quản lý đơn |
| `ORDER-GDC-02` | Quy trình xưởng hoa & Giao vận chính xác | P2 | “Giao vận chính xác” sáo rỗng | Từ phiếu cắm hoa đến giao tận tay |
| `ORDER-GDC-03` | Chuyển hóa đơn hàng thành phiếu cắm hoa chi tiết cho nghệ nhân cắm hoa (Florist Ticket) và phiếu giao hoa… | P1 | Tiếng Anh trong ngoặc, 150 ký tự, hai tên cho thợ | Mỗi đơn hàng có phiếu cắm hoa cho thợ và phiếu giao hoa kèm mã QR để xác nhận giao thành công. |
| `ORDER-GDC-04` | ✂️ Phiếu thợ cắm hoa phân rã rõ ràng… tone màu chuẩn | P2 | Emoji, “phân rã” là jargon, “tone” | Phiếu cắm hoa ghi rõ số cành từng loại, giấy gói và tông màu |
| `ORDER-GDC-05` | 📸 Chụp ảnh nghiệm thu thành phẩm trước khi giao để gửi khách duyệt | P3 | Emoji | Chụp ảnh thành phẩm gửi khách duyệt trước khi giao |
| `ORDER-PH-01` | Tìm theo mã đơn, người nhận, SĐT... | P3 | Viết tắt | Tìm theo mã đơn, người nhận hoặc số điện thoại |
| `ORDER-LBL-01` | Tổng cộng: {{count}} đơn hàng | P3 | Dấu `:` và “Tổng cộng” dư | {{count}} đơn hàng |
| `ORDER-MOB-*` / `ORDER-COL-*` | Mobile: Mới · Đang cắm · **Vận chuyển** · Hoàn tất. Kanban: Mới tiếp nhận · Đang cắm hoa · **Đang giao hàng** · Đã hoàn tất | **P1** | Hai tên cho cùng một trạng thái; số thứ tự cứng | Dùng một bộ: Mới · Đang cắm hoa · Đang giao · Hoàn tất |
| `ORDER-CRD-02` | Nhận tại tiệm | P3 | Lệch “cửa hàng” | Nhận tại cửa hàng |
| `ORDER-CRD-04` | Chi tiết | P3 |  | Xem chi tiết |
| `ORDER-MOD-01` | Tạo Đơn Hàng Hoa Mới | P2 | Title Case | Tạo đơn hàng mới |
| `ORDER-MOD-02` | Đồng bộ Master Index & Công thức cắm hoa | P1 | Jargon nội bộ, không phải mô tả cho người dùng | Chọn mẫu có sẵn để tự điền thành phần và ảnh, hoặc nhập thủ công. |
| `ORDER-MOD-03/04` | ⚡ Chọn mẫu nhanh từ Master Index (Đầy đủ BOM & Ảnh) · -- Bấm để chọn mẫu hoa có sẵn trong Master Catalog -- | P1 | Ba thuật ngữ nội bộ, emoji, dấu `--` | Chọn nhanh từ kho mẫu hoa · Chọn mẫu hoa |
| `ORDER-MOD-07` | Số điện thoại \* | P2 | Không rõ của người nhận hay người đặt | Số điện thoại người nhận |
| `ORDER-MOD-10` | Số nhà, tên đường, phường, quận... | **P1** | Cấp “quận/huyện” đã bỏ từ 01/07/2025 | Số nhà, tên đường, phường/xã, tỉnh/thành phố |
| `ORDER-OPT-06` | Giao gấp hỏa tốc (60 phút) | P3 | “Gấp” và “hỏa tốc” trùng nghĩa | Giao gấp trong 60 phút |
| `ORDER-MOD-13/14` | Danh sách mẫu hoa & phụ kiện \* · + Thêm mục | P2 | “Mục” mơ hồ | Mẫu hoa và phụ kiện · Thêm mẫu hoa |
| `ORDER-MOD-16` | (placeholder) Đơn giá | P2 | Placeholder đóng vai nhãn, mất khi nhập | Thêm nhãn “Đơn giá (₫)” |
| `ORDER-MOD-17/18` | Lời nhắn thiệp mừng · Nội dung in/viết lên thiệp... | **P1** | “Mừng” sai tông với hoa chia buồn | Lời nhắn trên thiệp · Nội dung in hoặc viết trên thiệp |
| `ORDER-MOD-19/20` | Ghi chú thợ cắm hoa (BOM / Phong cách) · Tone màu, giấy gói, hoa chính... | P2 | BOM, “tone” | Ghi chú cho thợ cắm hoa · Tông màu, giấy gói, hoa chính… |
| `ORDER-MOD-21/23` | Tổng tiền tạm tính: · Xác nhận tạo đơn | P3 | Dấu `:`; “Xác nhận” dư | Tạm tính · Tạo đơn |
| `ORDER-EMP-01/02` | Không có đơn hàng nào · Chưa có đơn hàng nào ở trạng thái này hoặc không khớp với từ khoá tìm kiếm. | P2 | Một chuỗi cho hai tình huống; “khoá” | Tách: *Chưa có đơn hàng* + nút “Tạo đơn mới”; *Không tìm thấy đơn phù hợp. Hãy đổi từ khóa hoặc bộ lọc.* |
| `ORDER-ERR-01` | Vui lòng điền đầy đủ tên, số điện thoại và địa chỉ nhận hoa. | P1 | Không chỉ ra trường nào | Chưa đủ thông tin giao hoa. Hãy nhập tên, số điện thoại và địa chỉ người nhận. (kèm lỗi ngay tại từng ô) |
| `ORDER-ERR-02` | Vui lòng kiểm tra lại thông tin hoa và đơn giá của các mục. | P1 | Mơ hồ | Đơn giá mỗi mục phải lớn hơn 0 ₫. Hãy kiểm tra lại tên hoa và đơn giá. |
| `ORDER-ERR-03` | Tạo đơn hàng thất bại. | P1 | Không nguyên nhân, không hướng xử lý | Chưa tạo được đơn hàng. Hãy thử lại sau ít phút; nếu vẫn lỗi, liên hệ hỗ trợ. |

**Lỗ hổng chức năng-copy cần PO xác nhận**: (a) form chỉ có người nhận, không có người đặt/liên hệ; (b) Kanban 4 cột không có trạng thái “Chờ cọc” và “Đã hủy” dù `CARD-TAB-04` nhắc duyệt cọc và hủy đơn.

### 8.3. Thẻ chào mẫu hoa (`/the-chao`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `CARD-HDR-01` | Sổ đơn hàng | P2 | Tên module lệch (“Đơn hàng”) | Đơn hàng |
| `CARD-HDR-03` | Gửi khách một bộ sưu tập để lướt xem, chọn mẫu và tự đặt hoa, thanh toán ngay trên điện thoại. | P3 | “Lướt xem” khẩu ngữ | Gửi khách bộ sưu tập hoa để xem, chọn mẫu, đặt hàng và thanh toán ngay trên điện thoại. |
| `CARD-BTN-01` / `CARD-GD-01` | Hướng dẫn link đặt hoa / Cẩm nang nghiệp vụ Thẻ Chào & Link Đặt Hoa | P2 | Nút và tiêu đề modal gọi khác nhau, “nghiệp vụ” là jargon | Cả hai: Hướng dẫn dùng Thẻ chào mẫu hoa |
| `CARD-BTN-02` | Hộp việc | P2 | Không rõ nghĩa | Việc cần làm |
| `CARD-BTN-03` | Làm mới dữ liệu | P3 | Lệch “Làm mới” | Làm mới |
| `CARD-TAB-02` | Theo dõi tiến độ | P3 |  | Theo dõi đơn |
| `CARD-TAB-04/05` | Điều hành · Điều phối | **P1** | Gần âm, tên theo vai trò thay vì chức năng | Duyệt thanh toán · Giao việc cắm hoa |
| `CARD-RDN-01/02` | Mở Hồ sơ tiệm · Báo Điều hành cập nhật Hồ sơ tiệm | P2 | Lệch “cửa hàng”; thiếu thông điệp cảnh báo (mục có tiêu đề “Cảnh báo” nhưng chỉ có nút) | Mở hồ sơ cửa hàng · Hồ sơ cửa hàng chưa đầy đủ. Hãy báo Điều hành cập nhật để tạo được link đặt hoa. |
| `CARD-CAT-01..03` | Quản lý Bộ sưu tập Thẻ Chào · … · Tạo Bộ Sưu Tập | P3 | Title Case | Quản lý bộ sưu tập · … · Tạo bộ sưu tập |
| `CARD-CAT-04` | Link sao chép dùng cho kênh | P2 | Ngữ pháp khó | Sao chép link cho kênh |
| `CARD-CAT-05` | — link sao chép luôn mang tên bạn; khách mở link được tính cho bạn. | P2 | Bắt đầu bằng dấu gạch, chữ thường, dấu `;` | Link này gắn với tên bạn. Đơn khách đặt từ link sẽ được tính cho bạn. |
| `CARD-CAT-06` | Không ghi kênh | P3 |  | Không chọn kênh |
| `CARD-GD-02..04` | Điều hành & Kế toán · Nhân viên Bán hàng (Sale) · Điều phối & Thợ cắm | P2 | Ghi chú gọi “Thợ & Ship”, tab gọi “Thợ cắm”; “Sale” | Điều hành và kế toán · Bán hàng · Điều phối và thợ cắm |

Ghi chú: nội dung bên trong ba tab cẩm nang **chưa có trong tài liệu**; cần bổ sung vì đây là phần nhiều chữ nhất của màn hình.

### 8.4. Sản phẩm & Giá (`/san-pham`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `PROD-HDR-01` | Kho sản phẩm của hàng | **P0** | Lỗi chính tả “của hàng” | Kho mẫu hoa |
| `PROD-BTN-01` | Tải lại danh sách | P2 | Bốn cách gọi “làm mới” | Làm mới |
| `PROD-BTN-02..04` | Nhập Excel & Ảnh · Phân tích AI · Thêm sản phẩm | P1 | “Phân tích AI” là tên thứ 5 của Quét ảnh; “sản phẩm” lệch “mẫu hoa” | Nhập từ Excel · Quét ảnh hoa · Thêm mẫu hoa |
| `PROD-PH-01` | Tìm kiếm mẫu hoa theo tên, mã sản phẩm... | P3 |  | Tìm theo tên hoặc mã mẫu hoa |
| `PROD-CAT-04` | Kệ khai trương | P2 | `CRT-CAT-04` ghi “Kệ hoa khai trương” | Kệ hoa khai trương (dùng chung một nguồn) |
| `PROD-CAT-*` | 5 danh mục | **P1** | Form tạo có thêm “Hoa chia buồn”, bộ lọc thì không; thứ tự hai nơi khác nhau | Dùng một danh sách danh mục duy nhất cho cả lọc và tạo mới |
| `PROD-OCC-03` | Tình yêu / Valentine | P3 |  | Tình yêu và Valentine |
| `PROD-OCC-*` | 4 dịp | P2 | Thiếu nhãn “Tất cả dịp”; thiếu các dịp bán chạy ở Việt Nam (8/3, 20/10, 20/11, tốt nghiệp, cưới) | **PO xác nhận** danh sách dịp |
| `PROD-PRC-*` | Dưới 500.000 đ · 500.000 đ - 1.000.000 đ · … | P2 | Giá đúng 500.000 hoặc 1.000.000 thuộc hai khoảng; “đ” lệch chuẩn tiền tệ | Dưới 500.000 ₫ · 500.000–1.000.000 ₫ · 1.000.000–2.000.000 ₫ · Trên 2.000.000 ₫. Logic: cận dưới gồm, cận trên không gồm |
| `PROD-ACT-01` | Đưa vào thùng rác | P3 |  | Chuyển vào thùng rác |
| `PROD-BTN-05` | Tải thêm sản phẩm | P3 |  | Xem thêm mẫu hoa |
| `PROD-DEL-01` | Xác nhận chuyển vào thùng rác | P2 | Tiêu đề không nêu đối tượng | Chuyển “{{name}}” vào thùng rác? |
| `PROD-DEL-02` | Mẫu hoa này sẽ bị ẩn khỏi danh sách bán và catalog. Bạn có thể khôi phục sau trong phần Thùng rác. | P1 | “Catalog” là tiếng Anh; không nói thời hạn lưu (tab Thùng rác ghi 30 ngày) | Mẫu hoa sẽ được ẩn khỏi danh sách bán và bộ sưu tập. Bạn có thể khôi phục trong Thùng rác trong 30 ngày. |
| `PROD-DEL-03/04` | Giữ lại · Đồng ý chuyển | P2 | “Đồng ý chuyển” không nêu hành động | Hủy · Chuyển vào thùng rác |

### 8.5. Tạo mẫu hoa mới (`/san-pham/tao-moi`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `CRT-HDR-03` | Khai báo công thức thành phần hoa (BOM), kiểu dáng và bảng giá niêm yết | P1 | “Khai báo” và BOM; chỉ có một ô giá, không có “bảng giá” | Nhập thành phần hoa, kiểu dáng và giá bán của mẫu hoa. |
| `CRT-BTN-02` | Lưu & Xuất bản | P2 | “Xuất bản” lệch “Đang bán” trên thẻ | Lưu và đăng bán |
| `CRT-IMG-01/02` | Ảnh đại diện mẫu hoa \* · … chọn tệp | P2 | Dấu `*`; “tệp” lệch “file” | Ảnh đại diện mẫu hoa · Kéo thả ảnh vào đây hoặc bấm để chọn file |
| `CRT-IMG-03` | Hỗ trợ JPG, PNG, WebP tối đa 10MB | P3 | Thiếu dấu phẩy, thiếu khoảng trắng | Hỗ trợ JPG, PNG, WebP, tối đa 10 MB |
| `CRT-IMG-04` | Thay đổi ảnh | P3 |  | Đổi ảnh |
| `CRT-LBL-01` + `CRT-PH-01` | Mã sản phẩm \* · VD: BH-001, GH-102 | **P1** | Ghi chú nói mã được **tự sinh** (`FL-xxxx`) nhưng nhãn đánh dấu **bắt buộc** | Nhãn “Mã mẫu hoa” (không bắt buộc) + gợi ý “Để trống để hệ thống tự tạo mã” + placeholder “Ví dụ: BH-001” |
| `CRT-LBL-02` | Trạng thái xuất bản | P2 | Lệch từ vựng với huy hiệu | Trạng thái (Đang bán · Bản nháp) |
| `CRT-LBL-04` | Danh mục thiết kế \* | P3 | “Thiết kế” thừa | Danh mục |
| `CRT-SHP-01..05` | Dáng tròn · Dáng tam giác · Dáng tự nhiên / Phong cách Hàn Quốc · Dáng dài / Dáng thẳng · Dáng thác nước | P2 | Lặp chữ “Dáng” dưới nhãn “Dáng cắm”; dùng `/` lẫn lộn | Tròn · Tam giác · Tự nhiên (phong cách Hàn Quốc) · Dài, thẳng · Thác nước |
| `CRT-LBL-06`, `CRT-FAC-*` | Hướng nhìn · Một mặt · Đa hướng (360 độ) | P2 | “Hướng nhìn” không phải cách thợ hoa nói | Mặt nhìn · Một mặt · Nhiều mặt (360°). **PO xác nhận** |
| `CRT-LBL-07/PH-03` | Bình / Hộp / Giấy gói (Container) · VD: Giấy gói xi măng Hàn Quốc, giỏ mây tròn | P1 | “Container” là tiếng Anh kỹ thuật | Vật chứa / bao bì · Ví dụ: giấy gói Hàn Quốc, giỏ mây tròn |
| `CRT-LBL-08/PH-04` | Giá niêm yết (VNĐ) \* · VD: 650000 | P2 | Không dấu phân cách hàng nghìn | Giá niêm yết (₫) · Ví dụ: 650.000 (ô nhập tự định dạng) |
| `CRT-BOM-01/02` | Công thức thành phần hoa (BOM) · Khai báo chi tiết các loại hoa, số lượng và vai trò để chuẩn bị nguyên liệu cắm | P1 | BOM; “Khai báo” | Thành phần hoa · Liệt kê các loại hoa, lá và số lượng để thợ chuẩn bị nguyên liệu. |
| `CRT-BOM-07` | Vai trò | P3 | Giá trị chọn chưa có trong tài liệu | Hoa chủ đạo · Hoa phụ · Điểm nhấn · Lá/cành phụ |
| `CRT-BTN-03` | + Thêm cành hoa | P2 | Dòng gồm cả lá phụ nên “cành hoa” hẹp nghĩa; dấu `+` | Thêm thành phần |
| `CRT-LBL-09` | Câu chuyện & Thông điệp mẫu hoa | P3 |  | Câu chuyện và thông điệp |

Thiếu copy: thông báo lưu thành công (“Đã lưu bản nháp”, “Đã đăng bán”), lỗi mã trùng, lỗi ảnh quá 10 MB hoặc sai định dạng, cảnh báo thoát khi còn thay đổi chưa lưu.

### 8.6. Nhập từ Excel & Ảnh (`/san-pham/nhap-hang-loat`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `IMP-HDR-02/03` | Nhập Mẫu Hoa Hàng Loạt từ Excel & Ảnh · Tải lên bảng tính… để hệ thống tự động khớp nối và nạp vào kho | P2 | “Khớp nối”, “nạp” là dịch máy | Nhập mẫu hoa từ Excel và ảnh · Tải lên file Excel và ảnh mẫu hoa, hệ thống sẽ tự ghép ảnh và thêm vào kho mẫu hoa. |
| `IMP-BTN-01/02` | Tải file mẫu Excel chuẩn · Làm lại từ đầu | P2 | “Làm lại từ đầu” xóa phiên nhập nhưng chưa có xác nhận | Tải file Excel mẫu · Bắt đầu lại (kèm hộp thoại xác nhận) |
| `IMP-DZ1-01..03` | 1. Bảng tính danh mục sản phẩm (.xlsx) · … · Chứa tên hoa, mã sản phẩm, giá bán, danh mục và tên file ảnh | P1 | Nhãn chỉ nói `.xlsx` trong khi ghi chú hỗ trợ `.xls`; số thứ tự cứng | File Excel danh sách mẫu hoa (.xlsx, .xls) · File cần có các cột: mã mẫu hoa, tên, danh mục, giá bán và tên file ảnh. |
| `IMP-DZ2-01..03` | 2. Thư mục ảnh mẫu hoa (Tùy chọn) · … chọn tệp · Tên file ảnh nên trùng với Mã sản phẩm hoặc Cột ảnh trong Excel | P2 | “Thư mục” sai (kéo nhiều ảnh, không phải thư mục); viết hoa tùy tiện | Ảnh mẫu hoa (không bắt buộc) · Kéo thả nhiều ảnh hoặc bấm để chọn file · Đặt tên file ảnh trùng với mã mẫu hoa hoặc tên ghi ở cột ảnh trong file Excel. |
| `IMP-ST-02..04` | {{count}} dòng khớp ảnh · … chưa có ảnh · … lỗi dữ liệu | P3 | “Lỗi dữ liệu” mơ hồ | {{count}} dòng đã ghép ảnh · {{count}} dòng chưa có ảnh · {{count}} dòng có lỗi |
| `IMP-TH-02/06` | Mã hoa · Trạng thái khớp | P2 | Lệch “Mã mẫu hoa” | Mã mẫu hoa · Ghép ảnh |
| `IMP-BTN-03` | Bắt đầu nạp vào kho sản phẩm | P2 | “Nạp”, “kho sản phẩm” | Thêm vào kho mẫu hoa |
| `IMP-PRG-01` | Đang xử lý nạp dữ liệu... | P2 |  | Đang thêm mẫu hoa vào kho… (thêm dòng: Vui lòng không đóng trang này.) |
| `IMP-RES-01/02` | Nhập dữ liệu thành công! · Đã thêm mới {{created}} mẫu hoa và cập nhật {{updated}} sản phẩm. | P2 | “Mẫu hoa” và “sản phẩm” đổi qua đổi lại | Đã nhập xong · Đã thêm {{created}} mẫu hoa mới và cập nhật {{updated}} mẫu hoa hiện có. |
| `IMP-BTN-04` | Xem kho sản phẩm ngay | P3 |  | Xem kho mẫu hoa |

Thiếu copy: lỗi từng dòng (thiếu giá, danh mục không hợp lệ, mã trùng), tải danh sách dòng lỗi, kết quả khi nhập thành công một phần, sai định dạng/quá dung lượng, giải thích “cập nhật” nghĩa là ghi đè mẫu hoa có cùng mã.

### 8.7. Quét ảnh hoa (`/tai-anh`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `SCN-HDR-01/02` | Quét Ảnh Hoa & Nhận Diện AI · Tự động bóc tách thành phần hoa, định dạng thiết kế và sinh bài viết thương mại từ ảnh chụp thực tế | P1 | “Bóc tách”, “sinh”, “bài viết thương mại” là dịch máy; “định dạng thiết kế” không rõ nghĩa | Quét ảnh hoa · Chụp ảnh hoa, AI nhận ra loại hoa và số cành, rồi tạo sẵn bài giới thiệu và kịch bản tư vấn. |
| `SCN-STP-01..03` | 1. Nhận diện thị giác · 2. Bài viết thương mại · 3. Kịch bản tư vấn & Báo giá | P1 | Số thứ tự cứng; “thị giác”, “thương mại” là jargon; bước 3 hứa “Báo giá” nhưng thẻ bước 3 không có copy báo giá | Nhận diện ảnh · Bài giới thiệu · Tư vấn khách (và thêm copy báo giá, hoặc bỏ chữ “Báo giá”) |
| `SCN-GDC-01` | HƯỚNG DẪN NHẬN DIỆN THỊ GIÁC M01A | **P0** | Lộ mã nội bộ | Mẹo chụp ảnh |
| `SCN-GDC-02` | Tiêu chuẩn chụp ảnh hoa để AI bóc tách chính xác | P2 | “Tiêu chuẩn”, “bóc tách” | Chụp thế nào để AI nhận diện chính xác hơn |
| `SCN-GDC-03` | …để hệ thống nhận diện đúng **95%** loài hoa và số lượng cành. | **P0** | Cam kết hiệu năng không có số liệu kiểm chứng; rủi ro khiếu nại khi sai | Chụp chính diện, đủ sáng và phông nền gọn để AI nhận diện đúng loại hoa và số cành. |
| `SCN-GDC-04..06` | 📸 · 💡 · ✨ … | P2 | Emoji | 04: Chụp đủ cả bó hoặc giỏ hoa, không để che phần gốc hay ngọn · 05: Tránh chụp ngược sáng hoặc để bóng đổ gắt lên cánh hoa · 06: Ảnh càng rõ nét, AI càng nhận ra đúng lá phụ và phụ kiện |
| `SCN-UP-01` | Kéo thả ảnh hoa vào đây hoặc chụp trực tiếp | P2 | Trên điện thoại không có kéo thả; thiếu định dạng và dung lượng | Kéo thả ảnh vào đây, bấm để chọn hoặc chụp trực tiếp. Thêm helper: JPG, PNG, WebP, tối đa 10 MB |
| `SCN-BTN-01` | Bắt đầu phân tích AI | P3 |  | Phân tích ảnh |
| `SCN-CPY-01..05` | Gợi ý tên thương mại & Câu chuyện sản phẩm · Tên mẫu hoa đề xuất · Câu chuyện & Thông điệp cảm xúc · Dịp tặng hoa phù hợp · Điểm nổi bật của mẫu hoa (Key Selling Points) | P1 | “Thương mại”, tiếng Anh trong ngoặc | Gợi ý tên và câu chuyện cho mẫu hoa · Gợi ý tên mẫu hoa · Câu chuyện và thông điệp · Dịp tặng phù hợp · Điểm nổi bật khi bán |
| `SCN-BTN-02` | Duyệt & Lưu nội dung | P3 |  | Lưu và tiếp tục |
| `SCN-PTC-01..03` | Kịch bản tư vấn khách hàng (Zalo / Hotline) · Lời chào & Giới thiệu mẫu hoa · Quà tặng kèm & Cam kết từ tiệm | P3 |  | Kịch bản tư vấn khách (Zalo, điện thoại) · Lời chào và giới thiệu mẫu hoa · Quà tặng và cam kết của cửa hàng |
| `SCN-BTN-03/04` | Sao chép kịch bản 1 chạm · Tạo thành sản phẩm chính thức | P2 | “Chính thức” nghe như thủ tục; “sản phẩm” lệch từ điển | Sao chép kịch bản · Lưu thành mẫu hoa |

**Thiếu copy đặc thù cho AI (P1)**: trạng thái đang phân tích (“AI đang đọc ảnh, thường mất vài chục giây”); lỗi theo nguyên nhân (ảnh mờ/tối, không thấy hoa, hết lượt dùng AI, lỗi mạng) mỗi lỗi kèm cách xử lý; nhãn “Nội dung do AI tạo. Hãy kiểm tra trước khi gửi khách.”; cách chỉnh kết quả; thông báo “Đã sao chép kịch bản”.

### 8.8. Kho dữ liệu (`/kho-du-lieu`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `MED-HDR-01` | Kho Dữ Liệu Sản Phẩm | P2 | “Dữ liệu” là từ kỹ thuật; kho này chứa ảnh và kịch bản chứ không chỉ “sản phẩm” | Kho ảnh và nội dung (**PO xác nhận**) |
| `MED-HDR-02` | Kho lưu trữ trung tâm phân loại 3 phân vùng độc lập cho tài khoản của bạn. | **P1** | “Phân vùng” là jargon; nói 3 nhưng có 4 tab; “tài khoản” lệch “cửa hàng” | Lưu ảnh gốc, ảnh đã duyệt và kịch bản tư vấn của cửa hàng. Mục đã xóa được giữ 30 ngày trong Thùng rác. |
| `MED-BTN-01` | + Tải ảnh mới để phân tích | P3 | Dấu `+` | Tải ảnh mới |
| `MED-TAB-01..04` | 1. Ảnh Gốc · 2. Ảnh Đã Duyệt (M01a) · 3. Sale Pitch Hoàn Thành · 4. Thùng Rác (30 ngày) | **P0** | Mã M01a lộ ra; “Sale Pitch” tiếng Anh; Title Case; số thứ tự cứng; thùng rác không phải “phân vùng” thứ 4 | Ảnh gốc · Ảnh đã duyệt · Kịch bản tư vấn · Thùng rác (30 ngày) |
| `MED-PH-01` | Tìm theo tên hoa, mã số, dịp lễ hoặc thành phần... | P3 | “Mã số” lệch từ điển | Tìm theo tên hoa, mã mẫu hoa, dịp tặng hoặc thành phần… |
| `MED-ACT-01..03` | Đưa vào phân tích AI · Tạo bài viết bán hàng · Sao chép kịch bản Zalo | P3 | Lệch tên tính năng | Phân tích ảnh · Tạo bài viết bán hàng · Sao chép kịch bản |
| `MED-ACT-04` | Khôi phục tài nguyên | P2 | “Tài nguyên” là jargon | Khôi phục |
| `MED-ACT-05` | Xóa vĩnh viễn | **P1** | Thiếu hộp thoại xác nhận cho hành động không thể hoàn tác | Hộp thoại: **Xóa vĩnh viễn “{{name}}”?** · Mục này sẽ bị xóa khỏi kho và không thể khôi phục. · Hủy / Xóa vĩnh viễn |

Thiếu copy: trạng thái rỗng của từng tab (đặc biệt Thùng rác: “Thùng rác trống. Mục đã xóa được giữ 30 ngày trước khi xóa hẳn.”), toast “Đã khôi phục” và “Đã sao chép kịch bản”.

### 8.9. Hồ sơ cửa hàng (`/ho-so`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `PRF-HDR-01/02` | Hồ Sơ Cửa Hàng & Thương Hiệu · Cấu hình thông tin pháp lý, tài khoản nhận tiền VietQR, nhận diện thương hiệu và chính sách bán hàng | **P1** | “Cấu hình” là jargon; hứa “thông tin pháp lý” nhưng Tab 1 không có trường pháp lý (mã số thuế, tên doanh nghiệp) | Hồ sơ cửa hàng và thương hiệu · Thiết lập thông tin cửa hàng, tài khoản nhận tiền, nhận diện thương hiệu và chính sách bán hàng. (hoặc bổ sung trường pháp lý) |
| `PRF-BTN-01` | Lưu thay đổi hồ sơ | P3 |  | Lưu thay đổi |
| `PRF-TAB-01..05` | Hồ sơ kinh doanh · Nhận diện thương hiệu · Tài nguyên thương hiệu · Chính sách & Cam kết · Dịp lễ & Giọng văn | P2 | “Tài nguyên” là jargon; “Hồ sơ kinh doanh” lặp tên trang | Thông tin cửa hàng · Nhận diện thương hiệu · Khung ảnh và mẫu in · Chính sách và cam kết · Dịp lễ và giọng văn |
| `PRF-LBL-01/02` | Tên thương hiệu hiển thị \* · Hotline tư vấn / Zalo \* | P2 | Lệch `SET-LBL-01/02`; dấu `/` mơ hồ | Tên cửa hàng hiển thị · Hotline tư vấn |
| `PRF-PH-03` | Số nhà, tên đường, phường, quận/huyện... | **P1** | Cấp huyện đã bỏ từ 01/07/2025 | Số nhà, tên đường, phường/xã, tỉnh/thành phố |
| `PRF-LBL-04..06` | Ngân hàng thụ hưởng (VietQR) \* · Số tài khoản nhận tiền \* · Tên chủ tài khoản (In hoa không dấu) \* | **P1** | “Thụ hưởng” quá pháp lý; hướng dẫn nhập nằm lẫn trong nhãn; **thiếu cảnh báo** rằng đây là nơi khách chuyển tiền cọc | Ngân hàng nhận tiền · Số tài khoản · Tên chủ tài khoản. Thêm helper: *Viết hoa, không dấu, đúng như trên ứng dụng ngân hàng.* Thêm cảnh báo: *Khách sẽ chuyển tiền cọc vào tài khoản này. Hãy kiểm tra kỹ trước khi lưu.* |
| `PRF-POL-01/02` | Chính sách đặt cọc đơn hàng qua Link · Tỷ lệ tiền cọc tối thiểu (%) | P2 | Ghi chú “50% hoặc 100%” cho thấy chỉ có 2 giá trị: nên là ô chọn chứ không phải ô nhập % | Chính sách đặt cọc · Tỷ lệ đặt cọc tối thiểu (chọn 50% hoặc 100%) + helper: *Khách phải đặt cọc ít nhất tỷ lệ này khi đặt qua link.* |
| `PRF-POL-03..06` | Quà tặng & Cam kết mặc định · Quà tặng 1/2/3 | **P1** | Cả ba mục đều gọi là “Quà tặng”, nhưng chỉ mục 1 là quà; mục 2–3 là cam kết dịch vụ (“đổi trả nếu hoa dập nát”). Cam kết tự chèn cho khách, có hệ quả pháp lý/uy tín | Tách thành “Quà tặng kèm” và “Cam kết với khách”; cho sửa từng dòng; thêm dòng cảnh báo: *Các cam kết này hiển thị cho khách trên link đặt hoa. Chỉ bật những điều cửa hàng thực hiện được.* |
| `PRF-POL-04..06` | Tặng kèm thiệp chúc mừng hoặc banner… · Chụp ảnh nghiệm thu thành phẩm trước khi giao hàng · Giao hoa đúng hẹn, hỗ trợ đổi trả nếu hoa dập nát | P2 | “Chúc mừng” (xem `ORDER-MOD-17`), “banner”, “nghiệm thu” | Tặng kèm thiệp hoặc băng rôn in theo yêu cầu · Gửi ảnh thành phẩm để khách duyệt trước khi giao · Giao hoa đúng hẹn, đổi trả nếu hoa dập nát |

**Thiếu nội dung (P1)**: Tab 2, 3, 5 chưa có dòng copy nào (bảng màu, logo, khung ảnh, dịp lễ, giọng văn); thiếu cảnh báo thay đổi chưa lưu vì một nút lưu chung cho năm tab.

### 8.10. Cài đặt & Quản lý thành viên (`/cai-dat`, `/cai-dat/thanh-vien`)

| Mã | Hiện tại | Mức | Vấn đề | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| `SET-GDC-01/02` | TRUNG TÂM CÀI ĐẶT TIỆM · Cấu Hình Hoạt Động & Liên Kết Thiết Lập Chuyên Sâu | **P1** | Tiêu đề thành chuỗi từ khóa vô nghĩa; chữ hoa; “tiệm” | Cài đặt cửa hàng · Quản lý thông tin chung và các thiết lập nâng cao của cửa hàng. |
| `SET-LBL-01..04`, `SET-BTN-01` | Tên cửa hàng hiển thị · Hotline liên hệ chính · Địa chỉ tiệm hoa · Khung giờ mở cửa hoạt động · Lưu cài đặt vận hành | **P1** | Trùng dữ liệu với Hồ sơ cửa hàng nhưng nhãn khác; “khung giờ … hoạt động” thừa | **Một nguồn sự thật**: đặt ở Hồ sơ, Cài đặt chỉ liên kết. Nếu giữ: Tên cửa hàng · Hotline · Địa chỉ cửa hàng · Giờ mở cửa · Lưu thay đổi |
| `SET-NAV-01T/D` | Hồ Sơ & Thương Hiệu · 5 mã màu hex, nhận diện thương hiệu, cam kết & dịp lễ | P1 | “Mã màu hex” | Hồ sơ và thương hiệu · Logo, màu sắc, chính sách đặt cọc, cam kết và dịp lễ. |
| `SET-NAV-02T/D` | Chính Sách AI · Sàn bảo mật PII, trần chi phí credit & ưu tiên nhà cung cấp | **P1** | Ba thuật ngữ kỹ thuật trong một dòng; chủ tiệm hoa không hiểu “PII”, “credit” | Thiết lập AI · Bảo vệ thông tin khách hàng, giới hạn chi phí dùng AI và chọn nhà cung cấp AI. |
| `SET-NAV-03T/D` | Kênh Mạng Xã Hội · Kết nối Facebook, Instagram, TikTok & Zalo OA | P3 | Title Case | Kết nối mạng xã hội · Kết nối Facebook, Instagram, TikTok và Zalo OA. |
| `SET-NAV-04T/D` | Bộ Máy Phân Tích · Động cơ nhận diện thị giác Vision Engine tổ chức | **P1** | “Bộ máy”, “động cơ”, “Vision Engine”, “tổ chức” | Phân tích ảnh hoa · Chọn cách AI nhận diện ảnh hoa cho cả cửa hàng. |
| `SET-NAV-05T/D` | Đội Ngũ & Phân Quyền · Mời nhân viên mới, phân vai trò và gán chi nhánh chuỗi tiệm | P2 | “Gán”, “chuỗi tiệm”; “Chi nhánh” mâu thuẫn với màn hình chỉ có một địa chỉ | Thành viên và phân quyền · Mời thành viên mới, phân vai trò và chi nhánh. |
| `MEM-HDR-02` | Đội Ngũ Nhân Sự & Phân Quyền | P2 | Ba cách gọi người dùng nội bộ | Thành viên và phân quyền |
| `MEM-BTN-01/02` | + Thêm nhân viên · Làm mới danh sách | P3 | Dấu `+`; lệch từ điển | Thêm thành viên · Làm mới |
| `MEM-PH-01` | Tìm nhân viên theo tên, email, vai trò... | P3 |  | Tìm theo tên, email hoặc vai trò |
| `MEM-TH-05` | Trạng thái (Đang hoạt động / Khóa) | P3 | Thì không đồng nhất | Đang hoạt động · Đã khóa |

Các thẻ “Sắp ra mắt” (`SET-NAV-02..04`) cần: huy hiệu cùng một kiểu với trang chủ, không bấm được, và mô tả nói rõ lợi ích chứ không nói tên kỹ thuật.

**Thiếu copy (P1)**: hộp thoại thêm thành viên (họ tên, email, vai trò, chi nhánh, trạng thái lời mời “Đã mời – chờ xác nhận”); **tên và mô tả từng vai trò** (hiện chỉ có mã quyền L1, R1–R11 trong ghi chú, người dùng không thấy được); hộp thoại xác nhận khóa/xóa/đổi vai trò (kể cả chặn tự khóa mình hoặc khóa Điều hành cuối cùng), ví dụ: *Khóa tài khoản của {{name}}? Họ sẽ không đăng nhập được cho đến khi bạn mở khóa.*

## 9. Độ phủ copy còn thiếu

Tài liệu 00 nêu mục tiêu “chuẩn hóa 100% câu chữ”, nhưng các nhóm sau chưa có dòng nào:

| Nhóm | Ví dụ cần có | Ưu tiên |
| :-- | :-- | :-- |
| Thông báo kết quả (toast) | Đã lưu · Đã sao chép · Đã khôi phục · Đã làm mới · Đã đăng bán | P1 |
| Kiểm tra dữ liệu ngay tại ô | Bắt buộc nhập · Số điện thoại chưa đúng · Đơn giá phải lớn hơn 0 ₫ · Mã mẫu hoa đã tồn tại · Số tài khoản chưa đúng | P1 |
| Hộp thoại xác nhận nguy hiểm | Xóa vĩnh viễn · Khóa/xóa thành viên · Bắt đầu lại phiên nhập · Hủy đơn · Rời trang khi chưa lưu | P1 |
| Đang xử lý / đang tải | Đang tải… · Đang phân tích ảnh… · Đang thêm vào kho… | P1 |
| Lỗi hệ thống chung | Mất kết nối · Phiên đăng nhập hết hạn · Không có quyền truy cập · Trang không tồn tại · Lỗi máy chủ | P1 |
| Lỗi riêng cho AI | Ảnh mờ/tối · Không thấy hoa · Hết lượt dùng · Kết quả độ tin cậy thấp · Nhãn “Nội dung do AI tạo” | P1 |
| Nội dung bị bỏ trống trong tài liệu | Chế độ bảng số liệu ở trang chủ · Chi tiết đơn hàng · Cẩm nang 3 tab · Hồ sơ Tab 2/3/5 · Tên vai trò · Danh sách kênh chia sẻ | P1 |
| Trạng thái rỗng | Kho (từng tab) · Thùng rác · Thành viên · Bộ sưu tập · Bảng xem trước nhập Excel | P2 |
| Truy cập (a11y) | `aria-label` cho nút chỉ có icon (làm mới, xóa ảnh, đóng) · văn bản thay thế cho ảnh mẫu hoa · trạng thái Kanban phải có chữ, không chỉ dựa vào màu | P2 |
| Bản địa hóa và định dạng | Chốt chỉ tiếng Việt hay có thêm ngôn ngữ; định dạng số, tiền (₫), ngày, giờ theo vi-VN | P3 |

## 10. Lộ trình đề xuất

1. **Chốt từ điển** (mục 5) và ba quyết định mở: tên “Kho ảnh và nội dung”, tên vai trò/tab (Điều hành · Điều phối), quy ước “cửa hàng” so với “tiệm”.
2. **Sửa 5 lỗi P0**: `HOME-CRD-03` và `HOME-CRD-10` (trạng thái), `ORDER-GDC-01`, `SCN-GDC-01`, `MED-TAB-02` (mã nội bộ), `PROD-HDR-01` (chính tả), `SCN-GDC-03` (95%).
3. **Điền cột “Mới”** cho cả 10 tệp theo mục 8, rồi tìm kiếm toàn văn các từ cấm: BOM, Master, Catalog, PII, Vision, Kanban, hex, credit, Pitch, Container, Florist, “bóc tách”, “thương mại”, “nạp”, “tác vụ”, “tone”, “SĐT”, “VD:”, “khoá”, `M0`.
4. **Bổ sung nhóm copy thiếu** (mục 9) bằng một tệp mới, ví dụ `11-thong-bao-va-trang-thai.md`, với loại Copy ID `ERR`, `OK`, `CFM`, `A11Y`.
5. **Cập nhật tài liệu 00**: bảng loại thành phần, ánh xạ mã phân hệ, bảng biến, quy chuẩn mục 6.
6. **Kiểm thử**: cho 3 nhóm người dùng (chủ cửa hàng, nhân viên bán hàng, thợ cắm hoa) đọc thử; kiểm tra tràn dòng trên mobile vì thông báo lỗi dài hơn; chạy UX Lint R8 và typecheck theo quy trình ở tài liệu 00.

**Tiêu chí hoàn thành (Definition of Done) cho copy**

- Không còn mã nội bộ, tiếng Anh kỹ thuật hoặc viết tắt trong chuỗi hiển thị.
- Mỗi khái niệm có đúng một tên gọi theo từ điển.
- Mọi lỗi có đủ ba phần: chuyện gì xảy ra · vì sao · làm gì tiếp.
- Mọi hành động không hoàn tác có hộp thoại xác nhận nêu đúng đối tượng.
- Mọi trường bắt buộc, số thứ tự, emoji, dấu `+` do component sinh, không nằm trong chuỗi.
- Mọi cam kết hoặc con số công khai với khách đều có người chịu trách nhiệm xác nhận.

**Cần xác minh trước khi áp dụng**: (a) mẫu địa chỉ hai cấp có khớp với dữ liệu chọn tỉnh/phường đang dùng không; (b) thời hạn Thùng rác 30 ngày có đúng cho cả “Chuyển vào thùng rác” ở Sản phẩm không; (c) bằng chứng nào (nếu có) cho con số 95% trước khi quyết định bỏ hẳn hay thay bằng số liệu đo được; (d) tên vai trò thực tế ứng với các mã quyền L1, R1–R5, R11.
