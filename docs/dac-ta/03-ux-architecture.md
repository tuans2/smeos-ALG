# 03 — Kiến trúc trải nghiệm

> [!NOTE]
> **VAI TRÒ TÀI LIỆU — KIẾN TRÚC TRẢI NGHIỆM CẤP KHUNG (UX FRAMEWORK & PRINCIPLES)**  
> Tệp này quy định các nguyên tắc thiết kế trải nghiệm nền tảng, luồng phân vai (Role-based Navigation) và hành vi hệ thống chung.  
> **Chuẩn chất lượng UX toàn cục, thứ bậc L0–L4, WCAG 2.2 và Screen Contract**: [`docs/dac-ta/03a-ux-constitution.md`](03a-ux-constitution.md) (Level 3, CANONICAL).  
> **Đặc tả trải nghiệm 14 vai (Role UX)**: [`docs/dac-ta/03b-role-ux.md`](03b-role-ux.md) (Level 3, CANONICAL).  
> **Đặc tả chi tiết giao diện 10 màn hình chức năng lõi và tương tác trực quan** được duy trì tại: [`docs/ALG-UIUX-10-chuc-nang.md`](../ALG-UIUX-10-chuc-nang.md).
> **Nguyên tắc bố cục thông tin nền tảng (áp dụng mọi page)** — Macro trước Micro, người dùng tự chọn hướng đi, tiết lộ thông tin theo lớp — đã tích hợp trực tiếp vào **§18** của tài liệu này. *(File gốc đã lưu trữ tại `docs/archive/merged/MACRO_TO_MICRO_STORYTELLING_UX_FRAMEWORK.md`)*

## 1. Bốn quyết định nền

| Quyết định | Nội dung | Hệ quả |
|---|---|---|
| Thiết bị | **Điện thoại trước, máy tính sau** | Thiết kế cho màn hẹp trước; màn rộng là mở rộng, không phải ngược lại |
| Điểm vào | **Trang chủ theo vai trải nghiệm** (đặc tả `03b-role-ux.md`) | Experience vào lưới thẻ chức năng; workspace thật vào trang chủ của khuôn vai: Quản lý cửa hàng → Command Center, Bán hàng → Pipeline Workspace, Điều phối → Control Tower (`/dieu-phoi`). Vai chưa có khuôn → Command Center |
| Tiến trình job | **Checklist theo bước là chính**, nhật ký mở ra khi cần | Người dùng thấy đang tới đâu mà không phải đọc log |
| Duyệt | **Cả tại chỗ lẫn ở hàng đợi** | Duyệt ngay sau khi xem kết quả, hoặc gom lại duyệt hàng loạt. Đường bỏ một kết quả đặt cạnh đường duyệt ở cả hai chỗ |
| Trường dữ liệu | **Nguyên tử hóa để tối ưu chỉnh sửa** | Tách biệt hoàn toàn văn bản với số lượng/đơn vị; không gộp chuỗi tự do để user click sửa trực tiếp từng thông số |
| Nút tác vụ Tab | **Thống nhất góc trên bên phải (Top-Right Action Header)** | Mọi tab đặt nút tác vụ ở cùng vị trí cố định; kết hợp nút chính 1-chạm và menu mở rộng `...` để không phải bấm qua nhiều menu ẩn |

Phạm vi chi nhánh không có bộ chọn ở bản đầu. RBAC vẫn đỡ sẵn phạm vi chi nhánh, nên thêm bộ chọn về sau không phải sửa quyền.

## 2. Điều hành thấy mọi thứ

Điều hành có đầy đủ năng lực của Sale và Điều phối. Giao diện phải phản ánh điều đó mà không biến màn hình thành mớ hỗn độn: Điều hành thấy **cùng những màn hình** mà Sale và Điều phối thấy, cộng thêm bốn khối quản trị trên dashboard.

**Một bộ màn hình và component dùng chung; vai quyết định trang chủ, thứ tự điều hướng và ưu tiên thông tin; mã năng lực quyết định nút nào được hiện và được dùng** (sửa theo quyết định PO 26/09/2026, D-RU2 — chi tiết ở [`03b-role-ux.md`](03b-role-ux.md)). Không dựng hai bản của cùng một màn cho hai vai; khác biệt giữa các vai nằm ở *thứ tự và điểm vào*, không ở *bản sao màn hình*. Danh sách năng lực vẫn đọc từ `GET /auth/me`; khuôn vai chọn theo `membership.role_key` và không bao giờ mở thêm quyền.

## 3. Bản đồ màn hình và Điều hướng (SSOT `nav-model.ts`)

Hệ thống điều hướng toàn cục của ALG được chuẩn hóa tập trung qua mô hình một nguồn (`src/components/layout/nav-model.ts`, Screen Contract `docs/dac-ta/screen-contracts/_dieu-huong.md`).

### Sơ đồ điều hướng máy tính (Desktop Sidebar w-64 — 6 nhóm K5)

1. **Việc chính · `<vai>`** (Tự sinh): `/` (Trang chủ) + danh sách ưu tiên `navPriority` của vai (03b §5). Luôn mở sẵn, không thu gọn.
2. **Bán hàng & Khách** (`ban-hang`): `/khach-hang` (Q1), `/don-hang` (R1), `/hoi-thoai` (T1), `/catalog` (J1).
3. **Sản phẩm** (`san-pham`): `/san-pham` (L1), `/tai-anh` (H1), `/kho-du-lieu` (G1), `/gia` (L6).
4. **Nội dung & Tiếp thị** (`noi-dung`): `/market-intelligence` (V2), `/creative-studio` (I1), `/creative-studio?tab=area-d` (I4), `/video` (I1), `/noi-dung` (I1), `/lich-dang`, `/kho-templates`.
5. **Vận hành** (`van-hanh`): `/dieu-phoi` (C23), `/job` (G4), `/duyet` (H3), `/so-lieu` (U3), `/muc-dung` (`COMING_SOON`), `/audit` (A4, `COMING_SOON`).
6. **Thiết lập** (`thiet-lap`): `/ho-so` (F1), `/tri-thuc`, `/cai-dat-ai` (U1), `/ket-noi`, `/bo-may` (H4), `/cai-dat` (`COMING_SOON`).

- Mọi nhóm chức năng đều hỗ trợ thu gọn/mở rộng `aria-expanded`, ghi nhớ trạng thái qua `localStorage` (`floraos_nav_groups_v1`). Khi mới vào chỉ mở nhóm chứa trang hiện tại (≤ 8 mục mở sẵn).
- Ô tìm kiếm nhanh dưới logo hỗ trợ phím tắt `/`, lọc tức thì không phân biệt dấu tiếng Việt (`stripVietnamese`). Phím tắt `⌘K` ở chân thanh bên kích hoạt Copilot.

### Thanh điều hướng di động (Mobile BottomNav h-16 — 5 vị trí)

1. **Slot 1 (Trái):** `Trang chủ` (`/`).
2. **Slot 2 (Vai):** Đổi động qua `mobileSecondSlot(can, roleUx)` — lấy mục đầu tiên trong `navPriority` của vai chưa trùng các slot khác (vd: `Khách hàng` cho Bán hàng, `Điều phối` cho Điều phối, mặc định `Sản phẩm`).
3. **Slot 3 (Giữa - Nổi bật):** Nút tròn nổi gác `H1`. Người dùng có `H1` (quét ảnh) → `Tải ảnh` (`/tai-anh`). Người dùng không có `H1` → Việc chính đầu tiên của vai (hoặc `Sản phẩm`).
4. **Slot 4:** `Duyệt` (`/duyet` nếu có năng lực duyệt `H3` hoặc `I2`, kèm chấm thông báo) hoặc `Job của tôi` (`/job`).
5. **Slot 5 (Phải):** `Thêm` (`/them`) dẫn tới trang tạo sản phẩm thủ công (L2) kèm toàn bộ danh sách chức năng còn lại xếp theo chuỗi giá trị (hàng cao ≥ 44px).

## 4. Dashboard Điều hành

Bốn khối, xếp dọc trên điện thoại, hai cột trên máy tính. Thứ tự cố định — quan trọng nhất trên cùng.

| Khối | Nội dung | Hành động tại chỗ |
|---|---|---|
| **Hàng chờ duyệt** | Số mục đang chờ, ba mục gần nhất kèm ảnh thu nhỏ | Duyệt · Xem tất cả |
| **Job đang chạy và job lỗi** | Job `PROCESSING` kèm bước hiện tại; job `FAILED` kèm lý do | Chạy lại · Huỷ |
| **Sản phẩm mới và thay đổi gần đây** | Sản phẩm Sale vừa thêm hoặc vừa sửa trong 7 ngày | Mở sản phẩm |
| **Mức dùng và hạn mức** | Credit đã dùng, credit còn lại, số lượt theo chức năng | Xem chi tiết |

Khối rỗng vẫn hiện, kèm một câu nói rõ vì sao rỗng và một nút dẫn tới việc tạo ra dữ liệu cho nó. Ẩn khối rỗng làm dashboard nhảy chỗ mỗi ngày một khác.

Khối **Hàng chờ duyệt** gộp mọi loại đầu ra đang chờ — kết quả phân tích, dữ liệu bán hàng của sản phẩm, Master Image, biến thể marketing, video, nội dung đăng bài — và hiện loại của từng mục, vì trách nhiệm khi duyệt mỗi loại một khác. Khối này không hiện các mục do chính người đang xem tạo ra, nếu công tắc `cho_phep_tu_duyet` của tổ chức đang tắt.

Tổ chức đã bật công tắc tự duyệt nội dung theo thời hạn thấy thêm một dòng trong khối này: số nội dung sẽ tự duyệt trong 24 giờ tới, kèm đường mở ra xem trước. Một công tắc đẩy nội dung ra ngoài mà không có chỗ nào đếm được số lượng là một công tắc không ai kiểm soát.

## 5. Màn hình Trải nghiệm

Lưới thẻ chức năng. Mỗi module một thẻ: tên, một câu mô tả kết quả nhận được, ảnh minh hoạ, và số lượt còn lại trong hạn mức dùng thử.

Người dùng bấm thẻ nào cũng được, không bắt theo thứ tự. Sau khi hoàn thành một chức năng, màn hình kết quả gợi ý chức năng kế tiếp hợp lý — nhưng đó là gợi ý, không phải bước bắt buộc.

**Không tự động chạy hết mọi chức năng tính phí.** Mỗi thẻ phải được bấm riêng. Chạy sẵn cả loạt để "cho thấy sức mạnh" là tiêu hết hạn mức của người dùng trước khi họ hiểu mình vừa tiêu vào việc gì.

Workspace trải nghiệm đã nạp sẵn hồ sơ kinh doanh mẫu, hồ sơ thương hiệu mẫu, sản phẩm mẫu, quy tắc giá mẫu. Người dùng chỉ cung cấp phần động: ảnh và tên sản phẩm. Không màn hình nào bắt khai báo hồ sơ doanh nghiệp đầy đủ trước khi dùng thử.

Hết hạn mức thì thẻ chuyển sang trạng thái khoá, kèm một đường dẫn chuyển workspace trải nghiệm thành tổ chức thật.

## 6. Luồng phân tích ảnh

```
Tải ảnh  →  Xác nhận ảnh  →  Đang chạy (checklist)  →  Kết quả  →  Sửa
                                                                   ↓
                                                    Xác nhận  →  Duyệt / Bỏ
```

**Tải ảnh.** Trên điện thoại, nút mở thẳng camera hoặc thư viện. Nhiều ảnh cùng lúc được, mỗi ảnh một job. Ảnh hiện ngay dưới dạng thu nhỏ trong lúc đang tải lên.

**Xác nhận ảnh.** Trước khi tốn credit, màn hình nói rõ: bao nhiêu ảnh, tốn bao nhiêu credit, còn lại bao nhiêu. Bỏ được từng ảnh khỏi lượt chạy. Đây là chỗ thi hành năng lực `B4` — xem ước phí lượt chạy.

**Đang chạy.** Checklist theo bước, dẫn bởi sự kiện `stage`:

```
✓ Phân tích ảnh
✓ Nhận diện cấu phần
● Đối chiếu từ điển
○ Chốt số lượng
```

Một dòng chữ nhỏ dưới checklist là dòng nhật ký mới nhất. Bấm vào mở toàn bộ nhật ký. Người dùng rời màn hình được — job chạy tiếp, và có thông báo khi xong.

**Kết quả.** Ảnh bên trái, dữ liệu bên phải trên máy tính; xếp dọc trên điện thoại. Dữ liệu chia theo đúng hợp đồng: nhận dạng · hoa · lá · phụ kiện · bao bì. Mỗi cấu phần hiện tên, số lượng, màu, và độ tin cậy.

Cấu phần có độ tin cậy thấp được đánh dấu bằng viền, không bằng màu đỏ — màu đỏ ở đây báo sai, vì máy không sai, máy chỉ không chắc.

**Sửa.** Sửa tại chỗ trên chính màn hình kết quả — sửa được cả **tên cấu phần** lẫn số lượng, không chỉ số lượng. Máy nhận sai loài là lỗi hệ thống chứ không phải dao động: gọi lại cùng một mô hình trên cùng một ảnh vẫn ra cùng cái tên sai, nên tên phải sửa được bằng tay. Đổi tên thì mã danh mục của dòng đó bỏ trống để người soát gắn lại. Bản sửa lưu tách khỏi dự đoán gốc; giao diện luôn xem lại được máy đoán gì ban đầu.

**Xác nhận.** Nút cuối màn kết quả không duyệt thẳng — nó mở một hộp thoại bày trọn thứ sắp ghi vào Product Master: nhận dạng, ba tổng đếm, và mọi cấu phần trong một khung. Màn kết quả phía sau bày từng khối rời và cuộn dài, nên duyệt từ đó là duyệt một thứ chưa nhìn hết. Hộp thoại nói rõ bản này giữ nguyên dự đoán của máy hay đã có chỉnh sửa của người.

**Duyệt hoặc bỏ.** Hai phán quyết đặt cạnh nhau trong hộp thoại, cùng cần `H3`. Bỏ một kết quả sai phải dễ ngang nhận một kết quả đúng — giấu đường từ chối sẽ đẩy người soát về phía duyệt cho xong. Duyệt thì dữ liệu vào Product Master và màn hình gợi ý bước kế; bỏ thì bản ghi đóng lại, không chạm Product Master, và lý do bỏ vào nhật ký kiểm toán.

**Chờ quá lâu.** Job xếp hàng quá hai phút hiện cảnh báo rằng tiến trình phân tích nhiều khả năng chưa được bật, kèm nút huỷ lượt chạy. Màn hình ngừng theo dõi ở mốc mười lăm phút, khớp với quét job treo phía máy chủ, thay vì quay vô hạn — job không mất và mở lại được ở mục Lượt chạy.

### 6.1 Màn chọn bộ máy phân tích

Vào từ Dashboard Điều hành, đường `/bo-may`. Ai có `H1` đều xem được bộ nào đang chạy — người chạy phân tích cần biết để hiểu kết quả mình nhận; chỉ người có `H4` đổi được.

Mỗi bộ hiện ba thông tin, và cả ba đều cần thiết trước khi chọn:

| Thông tin | Vì sao hiện |
|---|---|
| Cách chạy | Nói rõ bộ đó làm gì khác nhau, không chỉ một cái tên |
| Đã đo hay chưa | Nhãn trạng thái không phải nhãn tiếp thị — nó nói bộ đó đã chấm trên bộ ảnh vàng hay chưa |
| Ảnh có rời hạ tầng không | Câu hỏi về quyền riêng tư dữ liệu khách hàng, phải trả lời trước khi chọn chứ không phải sau |

Bày ba lựa chọn trông ngang nhau là nói dối bằng bố cục. Màn này có một dòng cảnh báo cố định: chỉ bộ đã chạy thật mới có căn cứ về độ chính xác, hai bộ còn lại chưa được chấm điểm nên chưa có căn cứ nói bộ nào đếm đúng hơn.

Đổi xong, dòng chữ dưới nút nói rõ lượt phân tích đang chạy dở vẫn dùng bộ cũ.

### 6.2 Màn chính sách AI

Vào từ Dashboard Điều hành, đường `/cai-dat-ai`. Ai có `U1` đều xem được; chỉ người có `U2` đổi được, và đổi phần phân tích ảnh vẫn đòi thêm `H4`.

Một hàng cho mỗi năng lực đang bật, và mỗi hàng nói đủ bốn điều trước khi người dùng đổi bất cứ thứ gì:

| Thông tin | Vì sao hiện |
|---|---|
| Mô hình đang dùng và cách nó chạy | Một cái tên không nói được điều gì; người đổi cần biết nó khác gì cái đang chạy |
| Đã đo hay chưa | Nhãn trạng thái, không phải nhãn tiếp thị — bộ chưa chấm trên bộ ảnh vàng thì nói thẳng là chưa có căn cứ |
| Dữ liệu có rời hạ tầng không | Câu hỏi quyền riêng tư phải trả lời trước khi chọn, không phải sau |
| Chi phí một lượt | Credit, và mức đó khác nhau theo năng lực |

Màn này bày **trần**, không bày một lựa chọn duy nhất: người dùng mở phạm vi mà hệ thống được chọn trong đó. Một dòng cố định nói rõ điều đó, vì "chọn mô hình" và "cho phép dùng mô hình" là hai việc khác nhau và giao diện dễ làm người ta tưởng là một.

Năng lực chạm dữ liệu cá nhân khách hàng hiện mức quyền riêng tư **khoá**, kèm một câu nói rõ vì sao không đổi được. Khoá một lựa chọn và nói lý do là cách duy nhất để người dùng không đi tìm nó ở chỗ khác.

Màn hình cũng là chỗ đọc sổ chi phí: chi phí và độ trễ theo năng lực, theo mô hình, trong kỳ. Ai có `U3` mới thấy khối này.

## 7. Luồng tối ưu ảnh

```
Tải ảnh  →  Chọn kiểu  →  Đang chạy  →  Trước / Sau  →  Tải về  →  Duyệt
```

**Chọn kiểu.** Ba mức: Tự nhiên · Cân bằng · Cao cấp. Kèm ba chế độ nền: Giữ nguyên · Làm sạch · Thay nền. Không dựng trình biên tập thủ công ở bản này.

**Trước / Sau.** Thanh trượt so sánh trên cùng một khung ảnh. Dưới đó là các tỉ lệ đã sinh: 1:1, 4:5, 9:16, 16:9.

**Ba trạng thái phán quyết hiện khác nhau:**

| Phán quyết | Giao diện |
|---|---|
| `SAFE` · `GOOD` | Kết quả bình thường, không cảnh báo |
| `WARNING` | Dải cảnh báo trên ảnh, nêu rõ chỉ số nào thấp. Vẫn duyệt được, nhưng hộp thoại xác nhận nhắc lại cảnh báo |
| `REJECTED` | **Không hiện ảnh đã tăng cường.** Hiện ảnh gốc, nói rõ hệ thống đã từ chối vì có dấu hiệu làm thay đổi sản phẩm, và gợi ý chụp lại |

Ảnh dùng generative fill mang nhãn hiện rõ trên chính ảnh, không giấu trong metadata.

**Tải về không phải là duyệt.** Hai nút riêng, đặt cách nhau, chữ khác nhau. Người dùng tải ảnh về dùng tạm được mà không biến nó thành ảnh chính thức của sản phẩm.

## 8. Luồng soạn ảnh marketing

```
Chọn sản phẩm  →  Chọn Master Image đã duyệt  →  Chọn nền và khuôn
→  Xem lưới biến thể  →  Chọn cái giữ lại  →  Duyệt
```

Màn này **chỉ bày những Master Image đã duyệt**. Sản phẩm chưa có ảnh duyệt hiện một dòng nói rõ phải qua luồng tối ưu ảnh trước, kèm đường dẫn tới đó — không bày ảnh gốc như một lựa chọn, vì bày ra là mời người dùng đi đường tắt quanh cổng duyệt.

Lưới biến thể bày nhiều phương án cùng lúc, mỗi ô ghi rõ nền và tỉ lệ. Không ô nào tự được chọn: người dùng đánh dấu cái giữ lại, và chỉ những cái được đánh dấu mới vào hàng chờ duyệt. Sinh ba mươi ô rồi đưa cả ba mươi vào hàng chờ là chuyển việc chọn sang cho người duyệt.

Nút sửa ánh sáng, màu hay hình dáng bó hoa **không nằm ở màn này**. Chỗ của nó là luồng tối ưu ảnh, và bấm vào nó ở đây sẽ mở đúng luồng đó với một lượt mới có Identity Guard.

## 9. Luồng video

```
Chọn ảnh đã duyệt  →  Chọn khuôn đầu ra  →  Chọn nhạc, giọng đọc, CTA
→  Đang dựng  →  Xem lại  →  Duyệt
```

Sáu khuôn đầu ra bày kèm thời lượng, tỉ lệ và kênh mà nó dành cho: Reel 15s, TikTok 30s, Story, slideshow catalog, video sản phẩm cho landing page, motion quảng cáo.

Trước khi bấm chạy, màn hình nói rõ chi phí của lượt này bằng credit và số credit còn lại — cùng khuôn với màn xác nhận ảnh, nhưng bắt buộc hơn, vì một lượt video tốn hơn một lượt ảnh một bậc.

Màn xem lại có nút phát, thanh thời gian, và một dòng ghi những gì AI đã thêm vào: chuyển cảnh, nhạc, phụ đề, giọng đọc. Người duyệt phải biết mình đang duyệt cái gì được thêm, không chỉ duyệt kết quả trông ổn.

## 10. Luồng nội dung và lịch đăng

```
Chọn sản phẩm  →  Chọn kênh  →  Sinh nội dung  →  Sửa
→  Duyệt  →  Đặt vào lịch  →  Đăng
```

Nội dung luôn bắt đầu từ một sản phẩm, không từ một ô nhập chủ đề trống. Màn chọn kênh bày Facebook, Instagram, TikTok, Zalo OA cùng những kênh đã nối, và mỗi kênh nói rõ nó nhận dạng nội dung nào.

Lịch đăng là màn theo tuần, mỗi mục hiện ảnh thu nhỏ, kênh, giờ và trạng thái. Kéo để đổi giờ. Mục chưa duyệt mang viền khác và không đăng được, kể cả khi đã có giờ.

**Tổ chức bật tự duyệt theo thời hạn thấy đồng hồ đếm ngược trên từng mục**, và một dòng cố định trên đầu màn nói rõ công tắc đang bật cùng người đã bật nó. Ẩn thông tin này là biến một quyết định của tổ chức thành một hành vi âm thầm của hệ thống.

## 11. Catalog, QR và trang chiến dịch

Catalog là một màn danh sách có bộ lọc theo dịp, màu sắc, loại hoa, bộ sưu tập và khoảng giá — đúng những trục khách hỏi khi đứng trong cửa hàng.

Mỗi catalog sinh được một liên kết kèm mã QR, tải về dạng ảnh để in. Màn quản lý liên kết hiện: liên kết nào đang sống, trỏ tới bộ sưu tập nào, mở bao nhiêu lượt, và nút thu hồi. Một mã QR đã dán ngoài cửa hàng thì thu hồi được nhưng không lấy lại được, nên nút thu hồi có hộp thoại xác nhận nói rõ điều đó.

Trang chiến dịch chọn từ danh mục dịp của tổ chức — 20/10, Valentine, 8/3, Ngày của Mẹ, khai trương, hoa cưới — và tổ chức thêm dịp riêng được.

## 12. Khách hàng và đơn hàng

**Khách hàng.** Hồ sơ gồm thông tin liên hệ, lịch sử mua, và ngày đặc biệt. Ngày đặc biệt là phần sinh ra tiền: màn danh sách mặc định sắp theo ngày đặc biệt gần nhất, không sắp theo tên.

Mỗi hồ sơ hiện rõ cơ sở đồng ý: khách đã đồng ý nhận nhắc mua hay chưa, đồng ý lúc nào. Chưa đồng ý thì nút tạo nhắc mua bị khoá, kèm câu nói rõ vì sao — không phải một lỗi khi bấm, mà là một trạng thái thấy trước khi bấm.

**Đơn hàng.** Một bảng theo ngày với ba trục trạng thái tách rời: đơn, sản xuất, giao hàng. Trên màn hẹp, mỗi đơn là một thẻ; thợ cắm mở ứng dụng và thấy đúng việc được phân công cho mình, không thấy bảng điều phối toàn cửa hàng.

Phiếu đơn và phiếu sản xuất in được từ điện thoại. Lời nhắn thiệp là một ô riêng, tách khỏi ghi chú nội bộ — nhầm hai thứ này là in ghi chú nội bộ lên thiệp gửi khách.

## 13. Số liệu và hội thoại

**Số liệu.** Một màn, bốn khối theo đúng thứ tự câu hỏi người bán hoa đặt ra: bài nào hiệu quả, sản phẩm nào bán tốt, chiến dịch nào có lãi, và hệ thống đã học được gì. Mỗi chỉ số ghi rõ nguồn và mốc thời gian; số liệu kế thừa từ trước khi tổ chức được gán hiện tách khỏi số liệu của chính tổ chức.

Khối cuối bày hồ sơ phong cách dưới dạng câu người đọc được — "bài đăng buổi sáng có tương tác cao hơn", "ảnh nền sáng bán tốt hơn cho hoa tone đỏ" — kèm số bài đã dùng để kết luận. Một hồ sơ không nói được căn cứ của mình là một hồ sơ không ai dám để nó đổi cách viết bài.

**Hội thoại.** Danh sách hội thoại, mỗi dòng hiện kênh, khách, tin cuối và ai đang phụ trách. Tin do trợ lý tự trả lời mang nhãn rõ trong chính dòng hội thoại, không chỉ trong nhật ký. Nút nhận hội thoại về cho người thật đặt ngay cạnh ô trả lời, không nằm trong menu phụ.

## 14. Hàng đợi duyệt

Danh sách gộp mọi thứ đang chờ từ mọi module, lọc theo loại và theo người tạo. Mỗi dòng: ảnh thu nhỏ, tên sản phẩm, loại, người tạo, thời điểm, và phán quyết máy nếu có.

Sáu loại đi qua hàng đợi này, mỗi loại cần một năng lực khác nhau: kết quả phân tích (`H3`), dữ liệu bán hàng của sản phẩm (`H6`), Master Image (`I2`), biến thể marketing (`P2`), video (`P4`), nội dung đăng bài (`O3`). Người gọi chỉ thấy loại mình duyệt được; bộ lọc theo loại vì vậy không bao giờ bày một loại rỗng vì thiếu quyền.

Chọn nhiều dòng để duyệt hàng loạt, tối đa 50 mục một lần. Hai loại không nằm trong lựa chọn hàng loạt và phải mở ra xem từng cái: mục có `WARNING`, và mọi video — một video 30 giây không xem hết thì duyệt hàng loạt chỉ là bấm cho xong.

## 15. Trạng thái phải thiết kế, không được bỏ quên

| Trạng thái | Yêu cầu |
|---|---|
| Rỗng | Nói vì sao rỗng và nút dẫn tới việc tạo dữ liệu đầu tiên |
| Đang tải | Khung xám giữ đúng chỗ nội dung sẽ hiện, không con quay giữa màn hình |
| Lỗi mạng | Nêu việc đang làm dở và nút thử lại. Không mất dữ liệu người dùng vừa nhập |
| Hết hạn mức | Nói rõ đã dùng bao nhiêu, hết khi nào được đặt lại, và đường nâng cấp |
| Không đủ quyền | Ẩn nút thay vì hiện rồi báo lỗi khi bấm. Trường hợp phải hiện thì nói rõ ai duyệt được việc này. Riêng lộ trình (vai/mục chưa xây) hiện vô hiệu kèm lý do — 03b §6 |
| Mất kết nối giữa job | Job vẫn chạy. Màn hình nối lại nhật ký từ vị trí cũ khi có mạng lại |
| Dữ liệu một phần | Hiện phần có được, ghi rõ phần nào chưa tải được, nút tải lại phần đó |
| Thành công | Xác nhận ngắn tại chỗ + thông báo cho trình đọc màn hình; không chặn bằng hộp thoại |

## 16. Ngôn ngữ và cách viết

Giao diện tiếng Việt. Thuật ngữ nghiệp vụ dùng từ người bán hoa dùng hằng ngày, không dùng từ kỹ thuật dịch máy.

`REJECTED` hiện là "Không đạt kiểm tra nhận dạng", không phải "REJECTED". `PENDING` là "Đang chờ". Mã trạng thái không bao giờ lộ ra giao diện.

Thông báo lỗi nói việc người dùng làm được tiếp theo, không nói việc hệ thống vừa hỏng thế nào.

## 17. Điện thoại trước nghĩa là gì

- Vùng bấm tối thiểu 44 điểm ảnh mỗi chiều.
- Việc chính nằm trong tầm ngón cái: nút hành động chính ở nửa dưới màn hình.
- Không bảng ngang cuộn hai chiều. Trên màn hẹp, một hàng bảng thành một thẻ.
- Ảnh tải lên nén phía client trước khi gửi, giữ nguyên bản gốc trên máy người dùng.
- Mọi luồng hoàn thành được bằng một tay, không cần xoay ngang.

Màn rộng thêm cột, thêm bảng, thêm thao tác hàng loạt — không thêm chức năng mà điện thoại không có.

---

## 18. Nguyên tắc Bố cục Macro-to-Micro Storytelling (Hợp nhất từ MACRO_TO_MICRO_STORYTELLING_UX_FRAMEWORK.md)

Áp dụng cho mọi page trong webapp `floraos-core`:

### 1. Triết lý Cốt lõi
> **Cho người dùng thấy bản đồ trước $\rightarrow$ để họ tự chọn hướng đi $\rightarrow$ dẫn dắt họ đi sâu từng lớp $\rightarrow$ kết thúc bằng một hành động có ý nghĩa.**

### 2. Quy trình 5 bước Tiến triển (Progressive Storytelling)
```text
SEE (Bản đồ / Bức tranh tổng quan)
  ↓
SELECT (Người dùng chọn 1 chủ đề / vấn đề cụ thể)
  ↓
UNDERSTAND (Dữ liệu phân tích chi tiết & bằng chứng dẫn chứng)
  ↓
DECIDE (Đề xuất giải pháp / Lựa chọn định hướng)
  ↓
ACT (Hành động 1-chạm: Đăng bài / Duyệt / Xuất dữ liệu)
```

### 3. Quy chuẩn Hiển thị
- **Phân lớp L0–L4:** Phân loại thông tin theo 03a §04; khung nhìn đầu tiên chỉ hiển thị L0 (thiết yếu) + L1 (hành động).
- **Không nhồi nhét thông tin (Zero Keyword Dumping):** Cấm đổ từ khóa thô hoặc chuỗi văn bản tự do lên giao diện.
- **Tiết lộ theo lớp (Progressive Disclosure):** Chỉ hiển thị thông số chi tiết khi người dùng nhấp chọn hoặc yêu cầu xem sâu.
- **Khối hướng dẫn chuẩn hóa:** Sử dụng `<FeatureGuidanceCard />` viền đỏ đứt nét, nền hồng dịu `bg-red-50/70` ở đầu mỗi tab tính năng.
