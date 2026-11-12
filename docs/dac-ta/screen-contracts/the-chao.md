---
id: SCR-STORE-the-chao
tier: STORE
module: greeting-card
route: /the-chao
archetype: E
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - 5 tab chính: Bộ sưu tập, Theo dõi, Bán hàng, Điều hành, Điều phối
  - Hộp việc tự động làm mới và thông báo việc cần xử lý
  - Đáp ứng chuẩn responsive 390px và desktop 1280px
---

# Screen Contract — Thẻ chào mẫu hoa (5 tab + Hộp việc)

**Tuyến:** `/the-chao` · **Tệp chính:** `src/app/(app)/the-chao/page.tsx` · **Cập nhật:** 08/10/2026 (chuẩn bị 20/10: chỉ Điều hành xác nhận tiền, ưu đãi tính tiền, trần đơn mỗi khung giờ) · 06/10/2026 (đợt commercial-ready) · **Thẻ:** Thẻ chào

## 1. Vai và mục đích
- Vai chính: Điều hành (`dieu_hanh`), Sale (`sale`), Điều phối (`dieu_phoi`) · mỗi vai một tab chính, chung một quy trình 9 bước
- Phạm vi: organization
- Việc chính: gửi khách bộ sưu tập, theo dõi từng đơn tới khi giao, xử lý việc đúng phần mình
- Câu hỏi chính: "Hôm nay có việc gì đang chờ tôi?" — trả lời ở **Hộp việc** (nút 🔔, thấy từ mọi tab)
- Báo việc mới trong app: Hộp việc tự làm mới mỗi 20 giây; có việc mới thì huy hiệu 🔔 nhấp nháy, trình đọc màn hình đọc "Có n việc mới", tiêu đề tab trình duyệt hiện "(n)" — chưa gửi Zalo/Web Push (cần PO duyệt nhà cung cấp)
- Mật độ: MEDIUM (nhân viên cửa hàng, dùng điện thoại là chính)

## 2. Hiện trạng (audit)
- API: `/greeting-card/inbox` (R1) · `/greeting-card/messages` (R1, gửi R2) · `/greeting-card/messages/read` (R1) · `/greeting-card/messages/recipients` (R1) · `/greeting-card/tracking-pipeline` (R1) · `/greeting-card/tracking` (R1) · `/greeting-card/tracking/timeline` (R1) · `/greeting-card/sale-visibility` (F2)
- Tab: Bộ sưu tập · Theo dõi tiến độ · Bán hàng (Sale) · Điều hành · Điều phối — giữ đúng 5 tab (PO 06/10/2026)
- Trạng thái có sẵn: tải ☑ (skeleton) rỗng ☑ lỗi ☑ (kèm Thử lại) không quyền ☑ (tab chỉ hiện khi có năng lực: Bộ sưu tập `L1`, Theo dõi `R1`, Bán hàng `R2`, Điều hành `R11` (chỉ Điều hành — PO 08/10/2026, thay `R9`/`F2`), Điều phối `R3`/`R4`/`R5` — từ 06/10/2026; máy chủ vẫn kiểm ở mọi endpoint, thiếu quyền → 403) một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Số việc + tin chưa đọc (🔔) · bước hiện tại của từng đơn · cảnh báo kẹt "Cần bạn: …" | đầu trang, đầu thẻ đơn |
| L1 Hành động | Xử lý · Nhắn tin · Trả lời · Gọi/Zalo khách | Hộp việc, thẻ đơn |
| L2 Ngữ cảnh | Thanh quy trình 9 bước (ghi rõ phần Sale/Điều hành/Điều phối) · khách · mẫu · giờ giao | thẻ đơn |
| L3 Chi tiết | Trao đổi theo đơn · đối chiếu giá khi thu tiền · chi tiết người nhận | bảng trượt / hộp thoại |
| L4 Nâng cao | Báo cáo phễu theo sale/kênh · cài đặt thời gian chuẩn, quyền xem | mục thu gọn, ngăn Cài đặt |

## 4. Hành động
- Chính (1): **Xử lý** (từ Hộp việc → mở đúng tab, cuộn tới đúng thẻ đơn và nhấn viền)
- Phụ (≤ 2): Nhắn tin (chọn "Gửi cho": Điều hành / Điều phối / Sale phụ trách / một người) · Trả lời (về đúng người đã nhắn)
- Xin giảm giá (ô soạn tin → "Xin giảm giá", chỉ đơn đã đặt): % hoặc số tiền + lý do → Điều hành duyệt ngay trong Hộp việc hoặc trong trao đổi: Duyệt như xin / Duyệt mức khác / Không duyệt (bắt buộc ghi chú); trần do Điều hành đặt trong Cài đặt, mặc định 25%

- **Sao chép link** (mọi nơi có nút Sao chép): link luôn mang tên người bấm — link riêng ghi mốc gửi; link bộ sưu tập tạo `/s/<mã>` riêng. Không hiện đường link gốc để chép tay (xem trước chỉ trong khung xem trước)
- Bán hàng (Sale) có 2 cách xem trên cùng tập khách/đơn của quy trình theo dõi (08/10/2026, như Điều phối): **Kanban** (mặc định — 9 cột, mỗi bước 1→9 một cột riêng, ghi rõ ai phụ trách bước và số thẻ "cần bạn"; trong cột việc kẹt của Sale lên đầu; thẻ: khách, mã đơn/link, mẫu, giá trị, thời gian ở bước, cảnh báo kẹt, Gọi/Zalo/Nhắn tin) · **Danh sách thẻ** (thẻ đầy đủ có thanh 9 bước). Phạm vi "Khách của tôi/Tất cả khách" và lọc nhóm việc dùng chung cho cả hai; mặc định ẩn khách đã xong (cột Bước 9 nhắc bấm lọc "Xong")
- Tab Điều phối (16/10/2026): Kanban 6 cột luôn có cột "Đã giao" (đơn giao trong 24 giờ, thu gọn); Lưới thẻ vẫn ẩn đơn xong trừ khi chọn "Xong". Nhóm "trễ" tính như Kanban Theo dõi tiến độ (đơn kẹt ở bất kỳ bước nào + thời gian chuẩn của bước). Trạng thái việc đọc từ `GET /greeting-card/coordinator-work` (chỉ đơn). Người mở thẳng bảng Điều phối khi vào Theo dõi tiến độ được lọc sẵn "Việc của Điều phối" (bước 5–8), có nút "Xem tất cả đơn và link"; view mẫu cùng tên có trong danh sách view.
- Theo dõi tiến độ có 6 cách xem trên cùng một tập đơn/link (06/10/2026): **Kanban** (9 cột theo bước, mỗi cột có số lượng, thời gian ở bước TB/lâu nhất, số quá hạn/sắp hạn đếm trên cả cột; 20 thẻ gấp nhất mỗi cột, nút "Xem thêm" ở cuối cột mở thêm 20 thẻ/lần — 16/10/2026) · **Danh sách** (sắp xếp theo cột, chọn cột, tải thêm) · **Lịch** (theo ngày giao + khung giờ, tuần trước/sau) · **Timeline** (chọn một đơn → các bước đã qua so với thời gian chuẩn + sự kiện) · **Công việc** (chỉ đơn quá hạn/sắp quá hạn, gấp nhất lên đầu) · **Dashboard** (tổng hợp theo bước, thời gian ở bước, người phụ trách, còn phải thu; kèm link bộ sưu tập đã sao chép; phễu "Hiệu quả chào hàng theo nhân viên" và phễu theo kênh/bộ sưu tập 7/30/90 ngày — checklist ALG 6.4). Bộ lọc (tìm, nhóm bước, sale, thời gian chuẩn, loại, ngày giao) dùng chung và giữ nguyên khi đổi cách xem. View mẫu: Đơn của tôi, Đơn giao hôm nay, Đơn đang kẹt, Đơn quá thời gian chuẩn, Đơn cần xử lý; người dùng lưu thêm view riêng (lưu trên máy). Bấm một đơn ở view bất kỳ → Timeline của đơn đó

## 5. Content budget
nút nổi đầu trang: 3/3 (Hộp việc · Chế độ · Làm mới) · nhóm trong Hộp việc: 3 (Cần làm · Tin nhắn · Cập nhật)

## 6. Trạng thái
tải: khung xám theo dòng · rỗng: "Không có việc nào đang chờ bạn. Mọi đơn đều đúng tiến độ." / "Chưa có tin nhắn nào gửi cho bạn." · lỗi: thông báo + "Thử lại" · thành công: tin vừa gửi hiện ngay cuối trao đổi

## 7. Responsive (mobile-first)
390px: Hộp việc và trao đổi mở **toàn màn hình**, nút ≥ 44px, ô soạn tin cố định dưới cùng (tôn trọng vùng an toàn), nút thao tác thẻ đơn xuống dòng riêng · 768px+: bảng bên phải rộng tối đa 28rem, nền mờ chạm để đóng · 1280px: như 768px

## 8. Trợ năng
bàn phím: Esc đóng, Ctrl/⌘+Enter gửi tin · focus: vào nút Đóng khi mở, trả về nút đã mở khi đóng · nhãn: `role="dialog"` + `aria-labelledby`, nhóm là `tablist`, số chưa đọc có `aria-label` · vùng thông báo: số việc `aria-live="polite"`, trao đổi `aria-live="polite"`

## 9. AI
không dùng

## 10. Dữ liệu và quyền
nguồn sự thật: `greeting_messages`, `greeting_message_reads` (đã đọc lưu máy chủ — đồng bộ điện thoại/máy tính), quy trình theo dõi (`stepStartedAt`, `stuck`) · vai người gửi suy từ năng lực (F2 → Điều hành, R4/R5 → Điều phối, còn lại Sale), không do người dùng chọn · sale "chỉ khách của mình" không mở được trao đổi đơn người khác (404)

## 11. Component
dùng lại: `FlowerImage`, `TrackingStepperView` · tạo mới: `sales/sales-kanban-view.tsx` (Kanban 9 bước của Sale, nhóm bằng `groupSaleKanban` trong domain), `inbox/sheet.tsx` (khung bảng trượt mobile-first dùng chung cho Hộp việc và trao đổi), `inbox/inbox-panel.tsx`, `inbox/message-thread.tsx`, `inbox/message-composer.tsx`, `work/work-status.tsx` — chưa có mẫu bảng trượt toàn màn hình trên điện thoại trong hệ thống

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Thông báo rải rác 6 nơi | Một Hộp việc | Gom về 🔔 Hộp việc, bỏ "Cập nhật mới" ở tab | PO 06/10/2026: tập trung, không phân tâm | tin nhắn PO |
| Ghi chú không người nhận, vai tự chọn | Tin có người nhận, trả lời đúng người | Bảng `greeting_messages` + đã đọc | Thông báo đúng người, chống giả vai | PO duyệt đổi schema 06/10/2026 |
| Nút Hộp việc mất icon; mã bước "(T01)…" và "P1 •" ở bảng điều phối; huy hiệu "Đang đọc bill" xoay mãi | Icon hiện đủ; không mã kỹ thuật; trạng thái trung tính | `Button` giữ icon (`[&_svg]:shrink-0`); bỏ mã; "Có ảnh bill" | Đợt 4, D4-11/D4-13/D4-14 | `inbox-button.tsx`, `coordinator-*`, `payment-proof-badge.tsx` |

## 13. QA Matrix
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Thứ bậc · CTA · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền | PASS | test cách ly `tests/tenant/greeting-card-messages.test.ts` |

## 13b. Trang khách & theo dõi công khai (06/10/2026)
- Trang `/b/<mã>` chỉ đọc; trình duyệt khách gọi `POST …/open` để ghi "đã mở" (máy quét xem trước link không tính).
- Đơn mới cọc: mở lại link vẫn ở bước thanh toán với QR phần còn lại; màn thanh toán báo "Cửa hàng đã nhận tiền cọc" + nút xem QR phần còn lại.
- Theo dõi theo mã đơn: mặc định rút gọn (tên viết tắt, phường + tỉnh); ô "Nhập 4 số cuối số điện thoại" để xem đầy đủ; mở từ chính link của khách thì đầy đủ sẵn.
- Form đặt hoa có ô bẫy ẩn chống máy tự điền (không hiện, không nhận Tab, trình đọc màn hình bỏ qua).
- Form đặt mua (PO 23/10/2026) theo chuẩn Spotlight, 4 khối có số thứ tự: ① Chọn sản phẩm (tùy chọn, giá, ưu đãi) · ② Thông tin người mua (công tắc "Tôi cũng là người nhận", mặc định tắt — bật thì ẩn ô người nhận, đơn gửi tên/SĐT người mua làm người nhận; homestay: công tắc "Tôi là người nhận phòng" cũng nằm ở khối này) · ③ Giao hàng (homestay: Thông tin đặt phòng) · ④ Ghi chú dạng gọn: chỉ mở sẵn ô mặc định theo ngành (hoa, quà, thời trang, F&B, bán lẻ: lời nhắn trên thiệp; dịch vụ: ghi chú gia công; homestay: yêu cầu đặc biệt) + ô đã có nội dung, loại khác thêm qua menu "Thêm ghi chú…", bỏ ô thì xoá nội dung. Khối đang thao tác sáng lên, khối khác chìm nền (chữ không mờ); bấm "Xem lại đơn" bị lỗi → khối chứa trường lỗi tự sáng, cuộn tới và hiện lỗi ngay trong khối (`order-spotlight/`).

## 13c. Chuẩn bị 20/10 (PO 08/10/2026)
- Tab "Điều hành" (thu tiền, báo giá, giao dịch ngân hàng) chỉ hiện với `R11` — trần cứng Điều hành; Sale và Điều phối không thấy nút "Thu tiền" (cả ở Sổ đơn hàng).
- Form đặt hoa: 3 ưu đãi mặc định (Giảm 10% trên tổng đơn · Tặng thiệp · Thêm phụ liệu), khách chọn tối đa 01 và **phải tự chọn** khi có từ 2 ưu đãi (không chọn sẵn, chưa chọn → "Vui lòng chọn 01 ưu đãi cho đơn hoa."); chỉ hiện ưu đãi Điều hành đang bật (Hồ sơ tiệm → Chính sách → "Đang áp dụng"); "Giảm %" hiện dòng "Ưu đãi: −… đ" ở bảng tiền và màn Xem lại; ô mã giảm giá ẩn khi tiệm chưa bật; phí giao "Miễn phí" khi tiệm bật miễn phí giao mọi đơn.
- Chọn khung giờ: khung đủ đơn hiện "(đã kín)" và không chọn được; gửi đơn vào khung vừa kín → lỗi ngay ở ô khung giờ.
- Cài đặt → Khu vực, phí giao & giờ nhận đơn: "Số đơn tối đa mỗi khung giờ" (chung, mặc định 100; riêng từng khung), "Miễn phí giao hoa cho mọi đơn", "Cho khách nhập mã giảm giá".
- Hộp "Thu tiền" và thẻ đơn Điều phối hiện "Ưu đãi khách chọn".
- Chọn chế độ "Gửi nhanh / Quản lý" ở đầu trang là nhóm nút `aria-pressed` (`role="group"`), không phải tablist vì không có tabpanel; nút dùng `Button` của hệ thống. 5 tab chính giữ nguyên (T3-4, quyết định 11/11/2026).
- Đợt 2: mở `/the-chao` vào thẳng chỗ làm theo năng lực — `R11` (Điều hành) → Quản lý · tab Điều hành; `R3`/`R4`/`R5` (Điều phối) → Quản lý · tab Điều phối; `R2` (Sale) → Quản lý · tab Bán hàng (PO 16/10/2026: Sale và Điều hành cùng một giao diện để phối hợp — Sale chỉ thấy 3 tab Bộ sưu tập · Theo dõi đơn · Bán hàng, khác nhau ở nút theo quyền); không `R2` → Gửi nhanh.
- Đầu trang: màn rộng (≥ 1280px) tiêu đề bên trái, các nút bên phải trên một hàng; màn hẹp hơn các nút xuống dưới tiêu đề — mọi vai cùng bố cục, nút thiếu quyền chỉ ẩn đi. Nút "Xuất file Excel" ở đầu trang được tinh gọn thành nút icon vuông (`iconOnly: true`, có tooltip "Xuất Excel" và nhãn trợ năng `aria-label`) để tiết kiệm không gian trên thanh điều hướng. Thẻ bộ sưu tập: nút "Quản lý mẫu hoa" một hàng riêng, các nút biểu tượng ở hàng dưới.
- Tab Điều phối đọc `/greeting-card/coordinator-board`: mọi đơn đang làm + đơn xong/huỷ 24 giờ qua, xếp theo ngày + giờ giao, chip "Mọi ngày · Hôm nay · Ngày mai" + chọn ngày, tự làm mới 30 giây; quá 1000 đơn hiện ghi chú, không có "Tải thêm".
- Tab Điều phối · Lưới thẻ (PO 16/10/2026): thẻ đơn chỉ hiện nút làm được ở bước hiện tại (`domain/coordinator-card-actions.ts`) — chờ cắm/đang cắm: Giao Florist, Chụp thành phẩm; hoa xong: Chụp thành phẩm, Giao Ship (còn chờ thanh toán lần 2 / khách duyệt ảnh thì Giao Ship hiện mờ kèm lý do); đang giao: Ảnh người nhận, Giao không thành công. Không còn nút nào → một dòng nêu lý do. "Đề xuất mẫu khác" chỉ hiện khi còn đổi được; thao tác khác vẫn qua "Xem chi tiết".
- Ảnh / tên mẫu hoa trên mọi màn đơn (Theo dõi, Sale, Hộp việc, Điều phối, Thanh toán) đọc một nguồn: `product` dựng ở server bằng `orderProductView` (`src/modules/greeting-card/domain/order-product-view.ts`) — ảnh chụp lúc khách chọn → metadata dòng đơn → ảnh chính hiện tại trong kho. Giao diện không tự chọn giữa `product_snapshot` và `items[].metadata` (15/10/2026).
- Tab Điều hành: ô "Tìm mã đơn, mã link hoặc số điện thoại" (≥ 3 ký tự, bỏ qua bộ lọc), bộ lọc "Khách báo đã chuyển"; xác nhận thu tiền xong hiện tin báo khách soạn sẵn kèm link theo dõi và nút "Sao chép tin".
- Sửa nội dung bộ sưu tập (thêm/xoá mẫu, đổi tên, giao diện) ở cả Gửi nhanh và Quản lý: người tạo bộ sưu tập, hoặc `L4` (Điều hành) (PO 16/10/2026). Sale và Điều phối tạo được bộ sưu tập riêng và sửa toàn quyền bộ sưu tập của mình; bộ sưu tập người khác tạo thì chỉ xem và gửi link (màn "Quản lý mẫu hoa" hiện ghi chú, ẩn nút Thêm/Xoá). Cài đặt hiển thị dùng chung cả tiệm chỉ `L4` (Điều hành). Xoá mẫu khỏi bộ sưu tập luôn hỏi lại.
- Trang khách `/b/<mã>` mở ở trình duyệt khác khi link đã có đơn: ô "4 số cuối số điện thoại người đặt" để vào lại đơn (thay vì báo link không tồn tại).

## 13d. Nâng cấp Gửi Nhanh & Trải nghiệm Tiêu điểm Khối (PO 18/10/2026)
- **Bỏ Stepper ngang đầu trang**: Thay thế thanh tiến trình tuần tự ngang (`JourneyStepper`) bằng bộ **Số thứ tự trực quan (Numbered Badges: 1, 2, 3)** gắn trực tiếp tại Header của từng khối hành động, cho phép nhân viên bao quát toàn bộ quy trình mà không bị cảm giác gò bó theo từng trang tuần tự:
  - **Khối 1**: Chọn Bộ sưu tập & Danh sách sản phẩm/phòng lưu trú (`StepCatalog`).
  - **Khối 2**: Chọn Giao diện khách xem (`TemplateSection` / `TemplateSelectorSplitPane`).
  - **Khối 3**: Chia sẻ link — gồm 2 nhánh: *Gửi riêng cho khách* (cá nhân hóa tên khách) và *Link dùng chung* (`ShareSummaryPanel`). Khối "Đang chuẩn bị" rườm rà được loại bỏ để tập trung tối đa vào việc sao chép link.
- **Kiến trúc Tiêu Điểm Khối Tương Tác (Active Block Spotlight / Focus-First Block UX)**:
  - Điều phối bởi `JourneyFocusContext` (`activeBlock: 1 | 2 | 3`).
  - Khi nhân viên click hoặc tương tác vào bất kỳ khối nào, khối đó sẽ trở thành **Tiêu điểm chính** (`opacity-100`, viền `ring-2 ring-primary/40`, đổ bóng `shadow-sm`, nền sáng).
  - Các khối còn lại chìm xuống bằng nền trong suốt và viền nhạt (`bg-transparent border-border/60`, rê chuột thì nền sáng lên) — **không làm mờ chữ** (`opacity`) để chữ luôn đạt tương phản 4,5:1 (PO 29/10/2026, thay quy tắc `opacity-60` cũ).
- **Tương thích Đa ngành SSOT (Multi-Industry Display & Preview)**:
  - Bản xem trước giao diện (`TemplateSelectorSplitPane` / `use-catalog-products.ts`) tự động hiển thị dữ liệu mẫu theo đúng ngành nghề của cửa hàng (Homestay: phòng & tiện ích; Thời trang: trang phục & chất liệu; F&B: món ăn; Hoa tươi: mẫu hoa), loại bỏ hiện tượng tràn hoa tươi sang các ngành khác.
  - Cấu hình hiển thị thông tin sản phẩm (`display-fields.ts`, `product-display.ts`, `product-info.tsx`) tự động thích ứng nhãn thuộc tính theo ngành (`ti.rawMaterialItem`, `ti.makerTitle`, `ti.makerAction`...).

## 14. Kết quả
lint:ux sau: không tăng vi phạm · nợ mở: thông báo đẩy/Zalo cho tin nhắn chưa làm

## 15. Progressive disclosure & rủi ro (03c) — 29/10/2026
Catalog bán hàng theo nhu cầu (`/the-chao?quick=true`, đợt A-4). Thay đổi: `ConfirmDialog` cho ẩn bộ sưu tập (R2), xoá mẫu khỏi bộ sưu tập (R3), thu hồi link khách (R3); `<select>` mẫu giao diện có nhãn; khối chưa tới lượt không còn làm mờ chữ (2,49:1 → đạt); cảnh báo hồ sơ dùng `text-warning-text`. axe 390px: 0 lỗi.

## 16. Tên "Bộ sưu tập riêng" và nút Đặt hàng / Liên hệ — 09/11/2026 (PO)
- Tên hiển thị: **Bộ sưu tập riêng** (menu, thư viện công cụ, hành trình, tiêu đề trang); dấu "?" cạnh tiêu đề nói mục đích: link riêng gửi đích danh một khách hoặc cho một nhu cầu cụ thể. Nguồn chữ: `src/modules/toolkit/domain/collection-names.ts`. Đường dẫn `/the-chao` giữ nguyên.
- Trang khách `/b/[sendCode]`, `/g/[id]`, `/bst/...` đọc công tắc Đặt hàng / Liên hệ của nguồn `BROCHURE` (Đơn hàng › Cài đặt › Nút trên trang khách). Mặc định giữ như trước: Đặt hàng bật, Liên hệ tắt. Chi tiết: `public-b-sendcode.md` §6.
- Đợt 2 (09/11/2026): đổi nốt chữ "Thẻ chào" còn sót trên màn và thông báo của chức năng này (Cài đặt, tab Đơn hàng, xuất Excel, quyền, kho dữ liệu, trợ lý AI, thông báo lỗi khách) thành "Bộ sưu tập riêng" / "link riêng". **Giữ nguyên:** "Thẻ chào sản phẩm" (ảnh giới thiệu mẫu A6 ở `/tai-anh`, công cụ khác), "Thẻ chào mừng" (homestay), mã ghi chú `[Thẻ chào …]` trong đơn (máy đọc để lọc phiếu); trợ lý AI vẫn hiểu từ khoá "thẻ chào".
