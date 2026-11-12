# 🌸 TỪ ĐIỂN TỪ NGỮ CẤM & KHUYẾN CÁO AN TOÀN NỘI DUNG NGÀNH HOA
> **ALG Content Guard Lexicon — M07 AI Content Engine**  
> **Phiên bản:** 1.0.0  
> **Cập nhật lần cuối:** 15/09/2026  
> **Mục đích:** Bảng tham chiếu chính thức (Single Source of Truth) dành cho Chuyên gia ngành hoa, Marketer và Reviewer Agent để rà soát, kiểm soát chất lượng và cập nhật các từ ngữ/cụm từ bị hạn chế trong nội dung tiếp thị tự động.

---

## 1. Nguyên Tắc Kiểm Duyệt (Moderation Principles)

1. **Chặn Cứng (HARD_BLOCK)**: Các từ ngữ vi phạm pháp luật, chính sách nền tảng (Facebook, TikTok, Zalo), hoặc cam kết sai sự thật nghiêm trọng làm mất uy tín cửa hàng hoa. Nội dung chứa các từ này sẽ bị Reviewer Agent từ chối ngay lập tức và buộc sửa lại.
2. **Cảnh Báo (WARNING)**: Các cụm từ sáo rỗng AI, văn phong giật gân hoặc từ ngữ dễ gây hiểu lầm. Hệ thống gắn cờ cảnh báo màu vàng trên giao diện để nhân viên cân nhắc thay đổi trước khi duyệt đăng.
3. **Cơ Chế Mở Rộng**: Định kỳ mỗi quý, Hội đồng chuyên gia và Quản lý thương hiệu rà soát tài liệu này để bổ sung các cụm từ mới phát sinh theo xu hướng thị trường.

---

## 2. Bảng Danh Mục Từ Ngữ Phân Loại

### Nhóm 1: Cam Kết Sai Lệch & Ảo Giác Ngành Hoa (Flower False Guarantees)
*Nguy cơ: Khách hàng khiếu nại, đòi hoàn tiền, mất niềm tin vào độ tươi và chất lượng của tiệm.*

| STT | Từ / Cụm từ cấm | Mức độ | Lý do cấm / Rủi ro nghiệp vụ | Cụm từ thay thế gợi ý | Chuyên gia phê duyệt |
|:---:|---|:---:|---|---|:---:|
| 1 | `hoa vĩnh cửu` (cho hoa tươi cắt cành) | **HARD_BLOCK** | Hoa tươi tự nhiên có chu kỳ sinh học 3–7 ngày. Dùng "vĩnh cửu" là lừa dối khách hàng | "hoa giữ độ tươi bền lâu", "tươi lâu 5–7 ngày" | Đã duyệt v1.0 |
| 2 | `không bao giờ tàn / héo` | **HARD_BLOCK** | Phản khoa học với hoa tươi tự nhiên | "được dưỡng tươi bằng quy trình chuẩn" | Đã duyệt v1.0 |
| 3 | `hoa tự nhiên 100%` (với hoa nhuộm màu) | **HARD_BLOCK** | Hoa cúc mẫu đơn, hồng Ecuador nhuộm pastel/xanh/đen không phải màu tự nhiên | "hoa nhập khẩu xử lý màu công nghệ cao" | Đã duyệt v1.0 |
| 4 | `giống hệt 100% hình mẫu` | **WARNING** | Hoa là sản phẩm thủ công, độ nở/màu sắc mỗi đợt có độ lệch nhẹ tự nhiên (±10%) | "đảm bảo chuẩn tone màu và phom dáng ~90-95%" | Đã duyệt v1.0 |
| 5 | `hoa nở mãi mãi` | **HARD_BLOCK** | Gây hiểu nhầm sang hoa sáp hoặc hoa lụa kém chất lượng | "hoa nở rộ căng tràn sức sống" | Đã duyệt v1.0 |
| 6 | `cam kết nở đúng từng phút` | **WARNING** | Độ nở phụ thuộc nhiệt độ phòng và máy lạnh | "hướng dẫn căn chỉnh thời điểm nở đẹp nhất cho tiệc" | Đã duyệt v1.0 |

---

### Nhóm 2: Từ Khóa Sáo Rỗng & "Slop" của AI (AI Clichés & Buzzwords)
*Nguy cơ: Văn phong sượng sùng, máy móc, mất chất thơ và tính cá nhân hóa của một tiệm hoa nghệ thuật (Việt hóa và bổ sung từ `BANNED_PHRASES` của SocialFlow).*

| STT | Từ / Cụm từ cấm | Mức độ | Lý do cấm / Rủi ro nghiệp vụ | Cụm từ thay thế gợi ý | Chuyên gia phê duyệt |
|:---:|---|:---:|---|---|:---:|
| 7 | `Tóm lại / Kết luận là` (In conclusion) | **HARD_BLOCK** | Giọng văn hành chính/nghị luận, hoàn toàn không phù hợp bài viết mạng xã hội | Đi thẳng vào cảm xúc hoặc CTA chốt đơn | Đã duyệt v1.0 |
| 8 | `Chúng tôi vô cùng hào hứng / vui mừng chia sẻ` | **WARNING** | Cụm từ kinh điển của bot AI ("excited/thrilled to share"), thiếu sự ấm áp gần gũi | "Hôm nay tiệm vừa về mẻ hoa mới...", "Gửi bạn chút hương thơm..." | Đã duyệt v1.0 |
| 9 | `Bước ngoặt mang tính cách mạng` (game-changer / revolutionizing) | **HARD_BLOCK** | Lạm dụng từ ngữ khoa trương công nghệ vào một bó hoa | "thiết kế độc bản", "phối màu tinh tế" | Đã duyệt v1.0 |
| 10 | `Là một mô hình AI / Là một trợ lý...` | **HARD_BLOCK** | Lộ bản chất bot viết bài do prompt bị tràn | "Tiệm hoa [Tên_Shop]...", "Florist chúng mình..." | Đã duyệt v1.0 |
| 11 | `Hãy cùng chúng tôi đắm chìm vào...` (Let's dive in) | **WARNING** | Cụm từ dịch máy sáo rỗng | "Cùng ngắm nhìn vẻ đẹp của...", "Bạn có nhận ra..." | Đã duyệt v1.0 |
| 12 | `Tận dụng tối đa / Phát huy tiềm năng` (Leveraging / Fostering) | **WARNING** | Thuật ngữ quản trị doanh nghiệp, không thuộc từ vựng ngành hoa | "được nâng niu", "chăm chút từng cánh hoa" | Đã duyệt v1.0 |
| 13 | `Vô song / Đỉnh chóp vũ trụ` | **HARD_BLOCK** | Ngôn từ cường điệu lố lăng, vi phạm chuẩn mực thẩm mỹ cao cấp | "vẻ đẹp sang trọng", "tinh tế chuẩn gu" | Đã duyệt v1.0 |

---

### Nhóm 3: Từ Ngữ Giật Gân, Chợ Búa & Hạ Thấp Giá Trị (Clickbait & Cheap Phrases)
*Nguy cơ: Làm giảm giá trị định vị thương hiệu hoa nghệ thuật, biến cửa hàng thành sạp hoa xả hàng chợ đầu mối.*

| STT | Từ / Cụm từ cấm | Mức độ | Lý do cấm / Rủi ro nghiệp vụ | Cụm từ thay thế gợi ý | Chuyên gia phê duyệt |
|:---:|---|:---:|---|---|:---:|
| 14 | `Xả kho lỗ vốn / Cứu chủ shop` | **HARD_BLOCK** | Hoa là quà tặng mang tính trân trọng, từ này tạo cảm giác hoa dập héo, mang xui xẻo | "Ưu đãi tri ân đặc biệt trong ngày", "Món quà ngọt ngào dành tặng bạn" | Đã duyệt v1.0 |
| 15 | `Rẻ như cho / Rẻ tụt quần` | **HARD_BLOCK** | Phản cảm, mất tính trang trọng của món quà tặng người thân/đối tác | "Mức giá trải nghiệm cực kỳ hợp lý", "Báo giá ưu đãi" | Đã duyệt v1.0 |
| 16 | `Hoa ế thanh lý` | **HARD_BLOCK** | Đại kỵ trong văn hóa tặng hoa cưới, sinh nhật, khai trương | "Số lượng giới hạn chỉ trong hôm nay" | Đã duyệt v1.0 |
| 17 | `Hàng bãi / Hàng dạt` | **HARD_BLOCK** | Xúc phạm trải nghiệm mua sắm của khách | Không sử dụng | Đã duyệt v1.0 |

---

### Nhóm 4: Từ Vi Phạm Chính Sách Quảng Cáo & Nền Tảng (Platform Ad Policy)
*Nguy cơ: Bị Facebook / TikTok / Zalo bóp tương tác (shadowban), từ chối duyệt bài hoặc khóa tài khoản quảng cáo.*

| STT | Từ / Cụm từ cấm | Mức độ | Lý do cấm / Rủi ro nghiệp vụ | Cụm từ thay thế gợi ý | Chuyên gia phê duyệt |
|:---:|---|:---:|---|---|:---:|
| 18 | `Cam kết 100% khỏi bệnh / Chữa lành tâm linh hoàn toàn` | **HARD_BLOCK** | Vi phạm chính sách tuyên bố y tế / sức khỏe của Meta & TikTok | "mang lại năng lượng tích cực, xoa dịu tinh thần" | Đã duyệt v1.0 |
| 19 | `Click ngay kẻo lỡ / Chia sẻ ngay lập tức` (Viết hoa toàn bộ & ép buộc) | **WARNING** | Meta phạt lỗi Engagement Bait (câu tương tác nhân tạo) | "Nhắn tiệm để giữ mẫu hoa yêu thích nhé", "Xem chi tiết tại..." | Đã duyệt v1.0 |
| 20 | Tên các thương hiệu xa xỉ không bản quyền (`Gucci`, `Chanel`... trong hoa bó tiền/hoa đính kèm) | **HARD_BLOCK** | Vi phạm chính sách sở hữu trí tuệ và thương hiệu | "phong cách thiết kế thanh lịch chuẩn Âu" | Đã duyệt v1.0 |

---

## 3. Quy Trình Cập Nhật Dành Cho Chuyên Gia Ngành Hoa

Khi chủ cửa hàng hoặc chuyên gia cắm hoa muốn bổ sung hoặc nới lỏng từ ngữ:
1. **Đề xuất từ mới**: Điền cụm từ, lý do thực tế phát sinh trong quá trình bán hàng (ví dụ: một loài hoa mới có đặc tính dễ rụng cánh).
2. **Xác định mức độ**: Chọn `HARD_BLOCK` (hệ thống tự chặn) hoặc `WARNING` (gợi ý đổi).
3. **Cung cấp mẫu câu thay thế**: Bắt buộc phải có câu thay thế để AI tự động sửa khi gặp lỗi.
4. **Đồng bộ mã nguồn**: File JSON cấu hình tương ứng tại `src/core/ai/domain/flower-content-banned-lexicon.json` sẽ tự động tải các quy tắc này vào `Reviewer Agent` của SocialFlow.
