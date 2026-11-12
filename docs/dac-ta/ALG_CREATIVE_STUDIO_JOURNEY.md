# User Journey — Creative Studio (Chặng 01–14)

> **Mục đích:** Mô tả đúng những gì người dùng làm và thấy trong `/creative-studio`, từ lúc tải ảnh bó hoa đến lúc xem hiệu quả bán hàng.
> **Phiên bản:** 3.3 — 24/09/2026 (khuya): phạm vi sản xuất chọn cuối Chặng 04 (nền tảng + loại kết quả), mỗi khung một bộ ảnh + một video, gói nhiều video. Bản 3.2 — 24/09/2026 (tối): Khu vực C bốn tác vụ thật, thư viện nhạc có giấy phép, Voice Clone. Bản 3.1 — 24/09/2026. Kịch bản bối cảnh sinh ở Chặng 05 dùng chung B/C/D/E; E theo kịch bản + giọng đọc + phát video; B tự lưu bài; Chặng 07 xem lại và sửa tại chỗ mọi tài sản. (Bản 3.0 — 23/09/2026: đồng bộ lại theo mã (bản 2.0 mô tả Khu vực F và Chặng 10–14 như đã chạy thật trong khi mã là giao diện dựng sẵn với số liệu gõ cứng).
> **Tài liệu liên quan:** kiến trúc `docs/kien-truc/ALG_CREATIVE_STUDIO_ARCHITECTURE.md` · dữ liệu vào/ra `docs/dac-ta/ALG_CREATIVE_STUDIO_IO_SPEC.md` · hành trình 14 chặng gốc `docs/dac-ta/ALG_PRODUCT_TO_MARKET_USER_JOURNEY.md`.

---

## Người dùng

Chủ tiệm / quản lý / thợ hoa. Bắt đầu bằng một việc: tải ảnh thật của bó/lẵng hoa lên Khu vực A. Không phải lúc nào cũng đi hết 14 chặng — B, C, D, E làm theo thứ tự tuỳ ý; F cần ít nhất ảnh biến thể và bài đăng để QA đạt.

## Bản đồ

```
A  Quét theo ảnh sản phẩm   01 BRING · 02 UNDERSTAND · 03 DISCOVER · 04 IDEATE · 05 CHOOSE
B  Viết contents            06a  4 bài Facebook / Instagram / TikTok / Zalo
C  Tạo audio                06b  lồng tiếng + nhạc nền, nghe lại bản phối
D  Tạo biến thể ảnh         06c  phân cảnh theo kịch bản bối cảnh của chủ đề (5/3 cảnh), số toàn vẹn ĐO thật
E  Tạo video                06d  video nháp theo 6 khuôn, Ken Burns theo cảnh
F  Gói chiến dịch           07 PACKAGE · 08 QA · 09 APPROVE → 10 LAUNCH · 11 SELL · 12 MEASURE · 13 LEARN · 14 NEXT
```

---

## Khu vực A — Chặng 01 → 05

1. **01 BRING** — kéo thả ảnh hoặc chọn ảnh có sẵn. Ảnh được lưu vào kho ngay; lỗi tải lên thì hiện lỗi và dừng.
2. **02 UNDERSTAND** — Vision AI (`gpt-4o-mini`) bóc tách hoa chính/phụ/lá đệm (tên, số lượng, đơn vị, màu, vai trò), giấy gói, ruy băng, thiệp (đọc chữ in trên thiệp). Mọi trường sửa được. Vision lỗi thì hiện lỗi; người dùng vẫn có thể tự nhập.
3. **03 DISCOVER** — điểm Trend / Audience / Content Fit, ma trận đối soát (MATCH/PARTIAL/MISMATCH theo tín hiệu thật trong `trend_signals`, thiếu tín hiệu thì ghi rõ "chưa có dữ liệu thật"), gợi ý GIỮ / CẢI TIẾN / THỬ. Chủ tiệm xác nhận để mở Chặng 04.
4. **04 IDEATE** — 10 chủ đề nội dung (tiêu đề, hook, CTA, định dạng) kèm **video tham khảo** YouTube + TikTok. Khi đó là danh mục tuyển chọn, giao diện ghi "Danh mục tham khảo — lượt xem/tương tác là ước tính" và thẻ TikTok là "Mở kết quả tìm kiếm TikTok". Cuối chặng có ô **Phạm vi sản xuất**: chọn nền tảng sẽ đăng (mặc định TikTok + Reels 9:16, nút "Tất cả") và loại kết quả (Nội dung bài đăng, Âm thanh, Hình ảnh, Video — mặc định cả 4; chọn Video thì Hình ảnh + Âm thanh tự thêm, ghi "cần cho video"). Ô hiện khung sẽ sinh, số video và "credit ảnh/video × số khung" khi có nhiều khung. Hệ thống chỉ sản xuất đúng phần đã chọn.
5. **05 CHOOSE** — chọn 1 chủ đề, Mode `CREATIVE` (mặc định) hoặc `AUTHENTIC`, khu vực sẽ mở, và xem/sửa tiếp **phạm vi sản xuất** đã chọn ở Chặng 04 (nền tảng + loại kết quả). Mỗi khung hình của các nền tảng đã chọn có **một bộ ảnh và một video riêng** (TikTok + YouTube ⇒ bộ 9:16 và bộ 16:9); âm thanh dùng chung. Trong Creative Studio, tab khu vực ngoài phạm vi ghi "ngoài phạm vi"; Khu vực D có tab theo khung và nút "Sinh đủ N khung"; Khu vực E dựng "Video 9:16", "Video 16:9"… riêng; Chặng 07 có tab "Video theo khung" và QA "Đủ phạm vi đã chọn". Bấm **"Lên kịch bản sản xuất · AI (1 credit)"**: AI viết **kịch bản sản xuất tổng** (24/09/2026) — câu chuyện (hook, CTA, tóm tắt), từng cảnh (bối cảnh ảnh, lời thoại, phụ đề, **thời lượng**, chuyển cảnh), âm thanh (giọng, nhạc, nhịp), video (khuôn, phụ đề, màn kết) và **bài đăng cho từng kênh**. Màn **xem trước** cho sửa thời lượng / lời thoại / phụ đề từng cảnh (miễn phí, mỗi lần lưu tăng số phiên bản), "↻ AI viết lại (1 credit)", rồi **"Dùng kịch bản này · vào Creative Studio"**. Chọn lại cùng chủ đề + mode không trừ credit lần hai (đổi nền tảng thì chỉ sửa kịch bản cũ). AI lỗi thì hoàn credit, bấm lại hoặc "Dùng kịch bản cơ bản" (miễn phí). B, C, D, E dùng chung kịch bản này. Nút bị khoá nếu ảnh chưa vào kho.

> Khu vực A không bao giờ bị chặn. B–F hiện màn kiểm tra nếu thiếu dữ liệu thật của Chặng 01–05 (tên sản phẩm, passport, ảnh…); người dùng có thể xem thiếu gì rồi quay lại A hoặc bỏ qua cảnh báo.

---

## Khu vực B — Chặng 06a

- Chọn một hoặc vài chủ đề, Mode, giọng/mood gợi ý → **"Tạo nội dung"** (`POST /creative-production/produce`).
- Kết quả: cung truyện 3–5 nhịp và 4 bài đăng theo kênh, sửa trực tiếp được. Thiếu giá thật thì bài ghi "Liên hệ tiệm để nhận báo giá".
- ⚠ Bài mẫu có vài câu cam kết dịch vụ chung (giao nhanh, tặng thiệp…) — chủ tiệm cần sửa cho đúng dịch vụ của tiệm trước khi đăng.
- **Tự lưu** — 4 bài (kể cả phần đã sửa) tự lưu 1,2 giây sau lần sửa cuối, gắn với ảnh + chủ đề + mode; dòng trạng thái ghi "Đã tự lưu lúc …". Chặng 07 đưa sẵn bài vào gói khi tạo, và đề xuất "Dùng bài của Khu vực B" nếu bài tự lưu khác bài trong gói.
- **"Lưu bài vào gói chiến dịch"** — lưu 4 bài (kể cả phần đã sửa) vào gói của Master Image hiện tại. Cần Master đã duyệt (xem Khu vực F).

## Khu vực C — Chặng 06b

- **Chọn loại tác vụ** (mỗi thẻ ghi rõ ra gì — 24/09/2026):
  - **Voiceover** — chỉ giọng đọc, không nhạc.
  - **Music Select** — chỉ nhạc nền, chọn thời lượng; miễn phí, không đọc lời.
  - **Audio Mix** — giọng + nhạc; nhạc tự hạ khi có giọng và lên lại khi ngừng.
  - **Voice Clone** — đọc bằng giọng nhân bản của chủ tiệm (ElevenLabs), nhạc tuỳ chọn.
- **Giọng đọc** — 6 giọng (3 nữ, 3 nam, có mô tả); nhà cung cấp OpenAI / ElevenLabs / MiniMax / Edge (miễn phí); chất lượng. Nhà cung cấp lỗi thì hệ thống đọc bằng nhà cung cấp khác với **cùng giọng** và ghi rõ trên kết quả.
- **Giọng nhân bản** — "Nhân bản giọng mới": tải tệp 1–3 phút nói rõ (tối thiểu 20 giây), tick câu cam kết quyền dùng giọng → 5 credit → "Đang nhân bản…" tự chuyển "Sẵn sàng" (lỗi thì hiện lý do và hoàn credit). Xoá giọng là gỡ luôn trên ElevenLabs.
- **Nhạc nền** — thư viện lọc theo mood, **nghe thử** từng bài, thấy nguồn và nhãn giấy phép ("Chưa xác minh bản quyền" với bài chưa có hồ sơ). **"Tải nhạc của tiệm"**: tệp + tên + mood + loại giấy phép + nguồn + tick cam kết.
- **Lời thoại** từng cảnh: lấy từ **kịch bản bối cảnh** của chủ đề nếu có (không tốn credit), chưa có thì từ hook/tiêu đề/CTA. Mỗi ô đếm ký tự và ước lượng giây đọc; câu dài hơn thời lượng thì cảnh **tự kéo dài** để đọc trọn câu (không còn tua nhanh / cắt chữ).
- Nút tạo ghi đúng số credit sẽ trừ ("miễn phí" với Music Select / Edge) → chờ worker → **nghe lại ngay trên trang**, tải bản chính và bản chỉ-giọng; thấy độ to (LUFS), cảnh nào được kéo dài. Lỗi thì hiện lý do và **tự hoàn credit**.
- Xong thì mã audio job được mang sang Khu vực F để đưa vào gói.

## Khu vực D — Chặng 06c

- Nguồn ảnh: Master Image đã duyệt. Nếu mới chỉ có ảnh gốc từ A thì hệ thống tự dùng ảnh gốc làm Master (không chỉnh ảnh, cần quyền I2).
- **Kịch bản bối cảnh theo chủ đề** — tự nạp kịch bản đã viết ở Chặng 05. Chỉ khi vào Creative Studio không qua Chặng 05 (hoặc lượt viết lỗi) mới thấy nút **"AI viết kịch bản bối cảnh (1 credit)"**: AI đọc chủ đề đã chọn ở Chặng 05 (dịp, tông màu, cảm xúc, hook, CTA) và thông tin bó hoa, viết từng cảnh — không gian, ánh sáng, bảng màu, mục đích dùng, lời thoại. CREATIVE 5 cảnh (Mở đầu → Phát triển → Cao trào → Kết → Kêu gọi), AUTHENTIC 3 cảnh. Kịch bản được lưu: mở lại C/D không tốn thêm credit; "↻ AI viết lại kịch bản" tốn 1 credit. AI lỗi thì hoàn credit và có thể chọn **"Dùng kịch bản cơ bản (miễn phí)"**.
- Không cần chọn bối cảnh bằng tay. Màn cấu hình cho xem trước các cảnh, chọn nguồn hậu cảnh (CREATIVE): **"Hậu cảnh Stability theo kịch bản"** (2 credit/cảnh — AI vẽ đúng không gian của cảnh, bó hoa thật dán nguyên khối) hoặc **"Phông Studio cục bộ gần nhất"** (1 credit/cảnh); cảnh phông trắng và mode AUTHENTIC luôn cục bộ. Chọn tỉ lệ khung và watermark.
- **"Sinh trọn bộ N phân cảnh"** (tổng credit hiện trên nút) hoặc **"Sinh từng cảnh →"**. Mỗi cảnh là một job thật; thẻ cảnh hiện ảnh thật, nguồn ("Hậu cảnh Stability" / "Studio cục bộ" / "Studio cục bộ (Stability lỗi)"), **% lõi bó hoa trùng khít đo được**, nút tải ảnh và **PNG tách nền** (mỗi cảnh đều có). Cảnh chưa sinh ghi "Chưa sinh — chưa đo".
- Lõi bó hoa lệch dưới 99% → cổng từ chối, không ảnh nào được lưu, hiện lý do.
- **"Duyệt ảnh này"** cho từng cảnh (chỉ chủ tiệm — năng lực I5).

## Khu vực E — Chặng 06d

- Chọn 1 trong 6 khuôn (Reel 15s, TikTok 30s, Story 15s, Slideshow, Trang sản phẩm, Ad Motion); storyboard hiện ngay **theo kịch bản bối cảnh của chủ đề** (đúng số cảnh, phụ đề, lời thoại, chuyển động của kịch bản Chặng 05), ảnh mỗi cảnh là ảnh biến thể **cùng cảnh** ở Khu vực D — cảnh chưa sinh ảnh tạm dùng Master Image và có ghi chú; không còn ảnh mẫu. Thời lượng chia theo khuôn. Mỗi cảnh chỉnh được Ken Burns (zoom in/out, pan lên/phải, tĩnh), phụ đề, watermark.
- **"Tạo video"** tạo **bản nháp**; ngay bên dưới là khung video job 3 bước: **Duyệt kịch bản (P3)** → **Render video** (5 credit, trừ lúc bấm; worker dựng xong thì **phát và tải video ngay trên trang**) → **Duyệt video (P4)**, chỉ chủ tiệm. Thanh phê duyệt Chặng 06d chỉ báo "đã duyệt" khi video đã qua P4; Khu vực F cũng vậy. Mở lại trang thì khung đọc lại job theo `videoJobId` trên URL.

## Khu vực F — Chặng 07 → 09

- Nếu chưa có Master đã duyệt → nút "Skip — Dùng ảnh gốc làm Master".
- **07 PACKAGE** — màn đầu hiện sẵn những gì đã sản xuất: ảnh biến thể mới nhất mỗi cảnh của kịch bản đang mở (kèm "chưa duyệt" nếu chưa duyệt I5), video (job trên URL, không có thì video đã duyệt P4 / đã render mới nhất), âm thanh Khu vực C. **"Tạo gói chiến dịch với các tài sản trên"** đưa sẵn chúng vào gói (tên = sản phẩm + chủ đề); sau đó chỉnh: ảnh biến thể của Master này (thấy % toàn vẹn và trạng thái duyệt từng ảnh), video, âm thanh, bài đăng theo kênh (sửa được). **"Lưu gói"**. Mọi thay đổi đưa gói về Nháp.
- **Sửa tại chỗ (quyết định PO 24/09/2026)** — người dùng ở nguyên Chặng 07, gõ yêu cầu và bấm Sửa; hệ thống gọi đúng backend của khu vực gốc, chạy ngầm, có kết quả thì hiện ngay và **tự thay vào gói + lưu** (gói về Nháp để QA lại):
  - **Ảnh từng cảnh** — ô "Yêu cầu sửa cảnh" → *Sửa cảnh* (1 credit AI viết lại cảnh + 2 credit Stability / 1 credit cục bộ): AI sửa bối cảnh cảnh đó (ghi vào kịch bản dùng chung), rồi sinh ảnh mới qua cổng Subject Integrity.
  - **Bài đăng** — sửa chữ trực tiếp (miễn phí) **hoặc** ô yêu cầu → *AI viết lại (1 credit)*; từ cấm ngành hoa/thương hiệu bị chặn.
  - **Âm thanh** — *Sửa âm thanh*: sửa lời thoại từng cảnh + nhạc nền → *Sửa & phối lại* (credit `audio.generate`).
  - **Video** — *Sửa video*: sửa thời lượng, chuyển động, ảnh, phụ đề, lời thoại từng cảnh + giọng đọc → *Tạo bản sửa* → **Duyệt kịch bản (P3)** (giữ riêng theo PO) → *Render* (5 credit) → video mới phát ngay và tự thay vào gói; P4 duyệt tại chỗ.
- **Xem lại & làm lại (24/09/2026)** — sau khi tạo gói, Chặng 07 hiện đủ mọi tài sản để review:
  - **Ảnh theo cảnh** của kịch bản (tên cảnh, bối cảnh, % lõi bó hoa, trạng thái duyệt): *Duyệt ảnh* (I5) ngay tại đây; *Bỏ khỏi gói* / *Đưa vào gói* / *Chọn ảnh khác từ kho*; *Sinh lại cảnh N* mở Khu vực D đúng cảnh đó.
  - **Video**: phát ngay; *Duyệt video (P4)* tại chỗ; đổi video khác; *Sửa storyboard / render lại* mở Khu vực E đúng job.
  - **Âm thanh**: nghe bản phối; *Phối lại ở Khu vực C*.
  - **Bài đăng**: sửa chữ/hashtag, bật tắt kênh; *Viết lại ở Khu vực B*.
  - Sửa tay (chữ bài đăng, bật/tắt, đổi tài sản) không tốn credit; sửa bằng AI tại chỗ (mục trên) tốn credit như ở khu vực gốc vì gọi cùng backend. Muốn chỉnh sâu hơn thì *làm lại ở khu vực gốc*. Trong lúc làm lại có thanh "← Quay lại gói (Chặng 07)"; về gói thì tài sản mới được đề xuất (*Có ảnh mới hơn cho cảnh này — dùng ảnh mới*, *Có video mới…*, *Có bản phối mới…*). Mọi thay đổi đưa gói về Nháp để QA chạy lại.
- **08 QA** — **"Chạy QA"** chạy trên máy chủ, năm trục: toàn vẹn sản phẩm · đã duyệt từng tài sản · đúng tỷ lệ theo kênh · nội dung (độ dài, biến chưa điền, hashtag Instagram, từ cấm ngành hoa / của thương hiệu) · thương hiệu (logo, ảnh đóng dấu). Kết luận: Đạt / Cần xem lại / Từ chối, kèm lý do cụ thể.
- **09 APPROVE** — chỉ duyệt được khi QA Đạt, hoặc Cần xem lại và đã tick "Tôi đã xem các cảnh báo". QA Từ chối thì phải sửa rồi chạy lại. Duyệt được ghi nhật ký kiểm toán. Gói đã duyệt không sửa được.

## Chặng 10 → 14 (sau khi duyệt)

- **10 LAUNCH** — chọn kênh, giờ đăng dự kiến; đăng/lên lịch ở **Lịch đăng**; dán **mã bài đã đăng** vào gói để đo.
- **11–12 SELL & MEASURE** — hội thoại mới, số đơn và doanh thu của sản phẩm kể từ ngày duyệt, reach/hiển thị/tương tác/click/chuyển đổi của các bài đã gắn. Chưa có số thì ghi "chưa có số liệu", kèm giới hạn của phép đo (chưa quy đơn về từng bài).
- **13 LEARN** — mẫu thắng (góc tiếp cận, bối cảnh Cảnh 2, có video) chỉ hiện khi tiệm có ≥ 3 gói đã duyệt gắn sản phẩm; chưa đủ thì nói rõ đang có bao nhiêu/cần bao nhiêu.
- **14 NEXT BEST ACTION** — việc nên làm tiếp, mỗi việc có lý do từ dữ liệu thật và nút "Làm ngay" dẫn tới đúng khu vực/màn hình.

---

## Quyền duyệt theo khu vực

| Khu vực | Người dùng chọn | Ai được duyệt |
|---|---|---|
| A | ảnh, sửa thông số, chủ đề, Mode | — |
| B | chủ đề, nội dung từng kênh | — |
| C | lời thoại, giọng, nhạc | — |
| D | kịch bản bối cảnh (AI/cơ bản), nguồn hậu cảnh, cảnh cần sinh | Duyệt ảnh: `I5` (chủ tiệm) · Skip ảnh gốc: `I2` (chủ tiệm) |
| E | khuôn, storyboard, Ken Burns | Kịch bản `P3` · Video `P4` (chủ tiệm) |
| F | tài sản, bài đăng | Duyệt gói + kế hoạch đăng: `J5` |

> Không bước nào tự đăng bài hay tự trừ credit ngoài lượt người dùng bấm. Mọi lượt chạy AI trừ credit đúng một lần và có sổ `usage`.
