> **Nguồn:** tài liệu PO cung cấp ngày 01/11/2026 (`ALG_Marketing_Sales_Center_Architecture.docx`), chuyển nguyên văn sang Markdown để agent đọc được. Không sửa nội dung.
> **Đối chiếu với hệ thống:** `01_DANH_GIA_DONG_BO.md` · **Kế hoạch:** `03_KE_HOACH_TRIEN_KHAI.md`.

**SMEOS  
MARKETING & SALES CENTER**

**TÀI LIỆU KIẾN TRÚC NGHIỆP VỤ & TỔ CHỨC ASSETS**

*Mô hình 6 Business Modules • 2 lớp giao diện • Asset lifecycle xuyên suốt*

| **Thông tin**       | **Mô tả**                                                                                                          |
|---------------------|--------------------------------------------------------------------------------------------------------------------|
| Phạm vi             | Kiến trúc nghiệp vụ Marketing & Sales dành cho chủ cửa hàng hoa trên SMEOS.                                        |
| Đối tượng sử dụng   | Chủ cửa hàng, nhân viên marketing, nhân viên tư vấn/bán hàng và người chăm sóc khách hàng.                         |
| Nguyên tắc          | Tổ chức theo mục tiêu kinh doanh; dùng chung nền tảng tạo Asset; khác biệt hóa theo mục đích sử dụng và quy trình. |
| Cơ sở đầu vào       | Yêu cầu người dùng và danh mục 77 Marketing & Sales Assets đã cung cấp.                                            |
| Trạng thái tài liệu | Bản định hướng kiến trúc nghiệp vụ để rà soát, chuẩn hóa UX, dữ liệu và giao việc cho AI Coding Agent.             |

# 1. Tóm tắt định hướng

SMEOS Marketing & Sales Center được tổ chức theo cách chủ cửa hàng hoa hiểu và điều hành hoạt động kinh doanh, thay vì chia giao diện theo từng loại file hoặc từng công cụ thiết kế.

Kiến trúc gồm 6 Business Modules hiển thị ở lớp giao diện thứ nhất. Bên trong mỗi Module là các nhóm chức năng, Tools và Assets ở lớp thứ hai. Cách tổ chức giao diện hai lớp này được xác nhận là kiến trúc SMEOS đang triển khai; tài liệu này chuẩn hóa lại ý nghĩa nghiệp vụ, ranh giới và quy tắc vận hành của nó.

| **\#** | **Business Module**          | **Mục tiêu chính**                                                                         |
|--------|------------------------------|--------------------------------------------------------------------------------------------|
| 01     | Hồ sơ cửa hàng & Thương hiệu | Thu thập dữ liệu cửa hàng; tạo, duyệt và quản trị nền tảng thương hiệu.                    |
| 02     | Tạo nội dung                 | Sản xuất nội dung từ ảnh/sản phẩm/dữ liệu đầu vào và tái sử dụng đa kênh.                  |
| 03     | Quảng bá                     | Phân phối thông điệp đến số đông, tạo nhận biết, thu hút sự quan tâm và Lead.              |
| 04     | Bán hàng                     | Tiếp cận đúng nhóm khách hàng, tư vấn, đề xuất, báo giá và chuyển đổi thành đơn hàng.      |
| 05     | Chăm sóc khách hàng          | Phân nhóm khách hiện hữu, chăm sóc theo kênh, tăng mua lại, upsell/cross-sell và referral. |
| 06     | Ấn phẩm & Vật phẩm cửa hàng  | Chuẩn bị file đúng quy cách để in ấn và sản xuất vật phẩm vật lý.                          |

## 1.1. Nguyên tắc kiến trúc cốt lõi

- Business-first: chủ cửa hàng nhìn thấy mục tiêu/hoạt động kinh doanh trước, không phải danh sách 77 loại Asset.

- One asset, multiple uses: một Asset đã tạo có thể được tái sử dụng ở Quảng bá, Bán hàng, Chăm sóc hoặc In ấn bằng các cấu hình sử dụng phù hợp.

- Purpose defines behavior: cùng một loại Asset (ví dụ Catalog hoặc Landing Page) có thể có CTA, nội dung, dữ liệu thu thập và workflow khác nhau theo mục đích.

- Brand consistency: dữ liệu hồ sơ và bộ nhận diện đã duyệt là nguồn chuẩn để sinh các Asset tiếp theo.

- Lifecycle continuity: dữ liệu Lead, khách hàng, tương tác, báo giá và đơn hàng phải liên kết xuyên suốt.

- Output destination: sau khi tạo Asset, người dùng có lựa chọn nơi/mục đích sử dụng; việc chọn nơi sử dụng không làm phát sinh bản thiết kế trùng lặp không cần thiết.

# 2. Mô hình giao diện 2 lớp

## 2.1. Lớp 1 – Business Modules

Lớp 1 là 6 khu vực nghiệp vụ trên Dashboard. Tên Module và mô tả phải dùng ngôn ngữ gần với hoạt động thực tế của chủ cửa hàng.

## 2.2. Lớp 2 – Tools & Assets

Khi đi vào một Module, người dùng thấy các nhóm chức năng, công cụ thực hiện và loại Asset đầu ra. Tools là năng lực/thao tác; Asset là sản phẩm được tạo ra và có thể lưu trữ, chỉnh sửa, tái sử dụng, xuất bản hoặc in.

| **Đối tượng**         | **Định nghĩa**                                             | **Ví dụ**                            |
|-----------------------|------------------------------------------------------------|--------------------------------------|
| Business Module       | Nhóm công việc kinh doanh cấp cao.                         | Bán hàng.                            |
| Capability / Workflow | Quy trình hoặc năng lực hỗ trợ một mục tiêu.               | Tư vấn → đề xuất → báo giá → chốt.   |
| Tool                  | Chức năng người dùng thao tác để xử lý dữ liệu/tạo đầu ra. | Image Studio, Catalog Builder.       |
| Asset Type            | Mẫu loại đầu ra có cấu trúc và quy cách riêng.             | Catalog, Poster, Landing Page.       |
| Asset Instance        | Một sản phẩm cụ thể đã được tạo từ Asset Type.             | Catalog Tết 2027 của cửa hàng A.     |
| Usage / Deployment    | Một cách sử dụng Asset trong một ngữ cảnh kinh doanh.      | Catalog quảng bá có CTA nhận tư vấn. |

Lưu ý kiến trúc: một Asset Instance có thể có nhiều Usage/Deployment. Không nên nhân bản Asset Type chỉ vì CTA hoặc mục đích sử dụng khác nhau; chỉ tạo biến thể nội dung khi có khác biệt thực sự về thông điệp, đối tượng, giá, sản phẩm hoặc quy trình.

## 2.3. Sơ đồ logic

| **Lớp**    | **Thành phần**                                | **Quan hệ**                                                    |
|------------|-----------------------------------------------|----------------------------------------------------------------|
| Lớp 1      | 6 Business Modules                            | Điểm vào theo mục tiêu kinh doanh.                             |
| Lớp 2      | Capability / Workflow → Tools → Asset Types   | Cung cấp thao tác và đầu ra trong từng Module.                 |
| Xuyên suốt | Asset Library + Brand Profile + Customer Data | Dữ liệu nền dùng chung; Asset được tái sử dụng ở nhiều Module. |
| Kích hoạt  | Usage / Deployment + CTA + Destination        | Xác định Asset được dùng ở đâu và kích hoạt hành động nào.     |

# 3. Module 01 – Hồ sơ cửa hàng & Thương hiệu

Mục tiêu: chủ cửa hàng khai báo thông tin một lần bằng form; SMEOS dùng dữ liệu này để tạo bộ nhận diện, chờ duyệt, rồi tiếp tục sản xuất các Asset chính thức thể hiện thương hiệu cửa hàng.

## 3.1. Quy trình tổng thể

1.  Khởi tạo Store Profile: chủ cửa hàng điền form thông tin cửa hàng, định vị, sản phẩm, khách hàng, phong cách và thông tin liên hệ.

2.  Kiểm tra tính đầy đủ: hệ thống chỉ ra trường còn thiếu, dữ liệu chưa hợp lệ hoặc nội dung cần xác nhận.

3.  Generate Brand Identity Set: tạo các phương án logo, slogan, brand profile, namecard và các thành phần nhận diện liên quan.

4.  Review & Approval: chủ cửa hàng chọn, chỉnh sửa và duyệt phiên bản chính thức. Chỉ tài sản đã duyệt mới được coi là nguồn thương hiệu chuẩn.

5.  Generate Store Brand Assets: dùng Store Profile và Brand Identity đã duyệt để tạo brochure, landing page chính thức/tạm thay website, bộ sưu tập mẫu và tài liệu giới thiệu cửa hàng.

6.  Publish & Reuse: lưu vào Brand/Asset Library và cho phép dùng trong Quảng bá, Bán hàng, Chăm sóc hoặc xuất bản/in ấn.

## 3.2. Cấu trúc Store Profile đề xuất

| **Nhóm dữ liệu**       | **Trường thông tin gợi ý**                                                    | **Ghi chú**                                |
|------------------------|-------------------------------------------------------------------------------|--------------------------------------------|
| Thông tin cơ bản       | Tên cửa hàng, tên pháp lý (nếu có), địa chỉ, hotline, email, giờ mở cửa.      | Thông tin hiển thị công khai.              |
| Mô tả & định vị        | Giới thiệu, câu chuyện, điểm khác biệt, phân khúc, khu vực phục vụ.           | Làm nền cho brand profile và nội dung.     |
| Sản phẩm & dịch vụ     | Nhóm sản phẩm, phong cách hoa, dịch vụ giao hàng, sự kiện, mức giá tham khảo. | Không tự suy diễn thông tin chưa khai báo. |
| Khách hàng mục tiêu    | Nhóm khách chính, nhu cầu, dịp mua, ngân sách phổ biến.                       | Dùng cho nội dung và bán hàng.             |
| Phong cách thương hiệu | Từ khóa phong cách, màu mong muốn, cảm xúc, đối thủ/tham chiếu.               | Có thể cho phép tải ảnh tham khảo.         |
| Kênh liên hệ           | Facebook, Instagram, TikTok, Zalo, website/landing page, bản đồ.              | Là dữ liệu CTA dùng chung.                 |
| Tài nguyên hiện có     | Logo, ảnh cửa hàng, ảnh sản phẩm, ảnh đội ngũ, giấy phép (nếu cần).           | Quản lý quyền sử dụng và phiên bản.        |

## 3.3. Asset đầu ra theo giai đoạn

| **Giai đoạn**                 | **Asset có thể tạo**                                                                                     | **Điều kiện / trạng thái**                              |
|-------------------------------|----------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| A. Bộ nhận diện               | Logo; slogan; Brand Profile; namecard; màu sắc; typography; brand guideline; social profile visuals.     | Cần review/approval; hỗ trợ nhiều phương án và version. |
| B. Hồ sơ thương hiệu ứng dụng | Brochure cửa hàng; official store landing page; trang giới thiệu; bộ sưu tập mẫu đại diện; social cover. | Sinh từ Store Profile + Brand Identity đã duyệt.        |
| C. Tài sản duy trì            | Brand library; ảnh cửa hàng; mẫu giới thiệu; nội dung giới thiệu chuẩn; thông tin liên hệ/CTA.           | Có version, ngày hiệu lực và người duyệt.               |

Quy tắc bắt buộc: trạng thái Draft/Generated không đồng nghĩa Approved. Các Asset dùng làm nền để sinh tài sản chính thức phải tham chiếu đúng phiên bản Brand Identity đã được duyệt.

## 3.4. Các trạng thái đề xuất

Profile: Incomplete → Ready for Generation → Completed. Brand Asset: Generated → In Review → Approved / Rejected → Superseded. Mỗi lần thay đổi thông tin thương hiệu quan trọng cần xác định Asset phụ thuộc nào phải được cập nhật hoặc đánh dấu cần rà soát.

# 4. Module 02 – Tạo nội dung

Mục tiêu: biến ảnh sản phẩm, dữ liệu sản phẩm hoặc bộ ảnh thành nhiều nội dung chất lượng, nhất quán với thương hiệu và có thể tái sử dụng ở nhiều kênh.

## 4.1. Các nhóm nội dung và Asset hiện có

| **Nhóm**            | **Asset hiện có / ví dụ**                                                                                                                                                                                                                                         | **Đầu vào chính**                                         |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| Nhận diện sản phẩm  | Product Cover (1); Product Thumbnail (2); Product Image Gallery (3); Product Information Card (4); Product Showcase (5); Product Comparison Sheet (6).                                                                                                            | Ảnh sản phẩm, tên/SKU, mô tả, giá và đặc tính.            |
| Social Media        | Facebook Post Image (28); Instagram Post (29); Instagram Carousel (30); Instagram Story (31); Facebook Story (32); TikTok Photo Post (33); Pinterest Pin (34); Social Media Carousel (35); Social Media Album (36); Social Media Cover (37).                      | Ảnh sản phẩm, nội dung, nền tảng, tỷ lệ và Brand Profile. |
| Video & Motion      | Product Slideshow (38); Product Reel (39); TikTok Product Video (40); Product Showcase Video (41); Promotional Video (42); Animated Product Poster (43); Product Story Video (44); Video Catalog (45); Before & After Video (46); Seasonal Collection Video (47). | Ảnh/clip, kịch bản, nhạc/voice, thời lượng, tỷ lệ.        |
| Nội dung bộ sưu tập | Product Collection Sheet (7); Gift Collection (26); Event Collection (27); Digital Product Collection (76).                                                                                                                                                       | Danh mục sản phẩm, dịp, chủ đề và bộ lọc.                 |

## 4.2. Quy trình tạo nội dung chuẩn

7.  Chọn nguồn: sản phẩm, ảnh đơn, album ảnh, bộ sưu tập hoặc chiến dịch.

8.  Chọn mục tiêu nội dung: giới thiệu sản phẩm, social post, video, bộ sưu tập hoặc nội dung theo mùa.

9.  Chọn kênh/định dạng: tỷ lệ, kích thước, độ dài, nền tảng.

10. Áp dụng Brand Profile đã duyệt và thông tin sản phẩm có sẵn.

11. Generate → Preview → Edit → Approve.

12. Lưu Asset vào Library; chọn nơi sử dụng ngay hoặc để dùng sau.

Phạm vi của Module này là sản xuất nội dung. Không nên nhúng cứng logic thu Lead, tư vấn hoặc đặt hàng vào công cụ tạo nội dung. Các hành vi đó được cấu hình ở bước Usage/Deployment trong Module đích.

# 5. Module 03 – Quảng bá

Mục tiêu: truyền thông đến số đông (mass reach), tăng nhận biết, tạo sự quan tâm và thu Lead. Quảng bá không mặc định yêu cầu khách đặt hàng ngay.

## 5.1. Định nghĩa vận hành

Một Asset được dùng cho Quảng bá khi thông điệp hướng đến một tập người xem rộng hoặc một nhóm chưa được tư vấn cá nhân hóa; CTA ưu tiên tìm hiểu thêm, liên hệ, đăng ký hoặc nhận tư vấn; kết quả cần đo là reach, engagement, click, inquiry và lead.

## 5.2. Các Asset/định dạng thường dùng

| **Nhóm**                      | **Asset hiện có / ví dụ**                                                                                                                                                                                               | **CTA / kết quả mong muốn**                                             |
|-------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| Advertising materials         | Poster (8); Promotional Poster (9); Sale Banner (10); Website Banner (11); Facebook Banner (12); Social Media Banner (13); Flyer (14); Brochure (15); Standee (16); Digital Billboard (17); Window Display Poster (64). | Tìm hiểu thêm; inbox; gọi điện; quét QR; đăng ký nhận tư vấn.           |
| Catalog / collection quảng bá | Product Catalog (18); Digital Lookbook (20); Product Menu (22); Collection Landing Page (69); Product Landing Page (68).                                                                                                | Xem bộ sưu tập; yêu cầu báo giá; nhận thêm thông tin; để lại thông tin. |
| Lead capture                  | Digital Product Page (70); Online Catalog Link (72); QR Product Page (73); Social Commerce Creative (77); Table Tent (63) khi dùng để thu Lead.                                                                         | Form/lead capture, click-to-contact, request information.               |
| Mass distribution             | Social Media Album (36); Email Product Newsletter (75) khi dùng cho chiến dịch tiếp cận rộng/nhóm đăng ký nhận tin.                                                                                                     | Phân phối theo kênh, theo chiến dịch và theo lịch.                      |

## 5.3. Phân biệt Quảng bá và Bán hàng khi dùng cùng một Asset Type

Đây là quy tắc kiến trúc trọng tâm: tên loại Asset không quyết định Module. Mục đích sử dụng, đối tượng, nội dung, CTA và workflow mới quyết định một phiên bản triển khai thuộc Quảng bá hay Bán hàng.

| **Tiêu chí**        | **Catalog dùng cho Quảng bá**                                   | **Catalog dùng cho Bán hàng**                                           |
|---------------------|-----------------------------------------------------------------|-------------------------------------------------------------------------|
| Đối tượng           | Công chúng hoặc tệp rộng; chưa xác định nhu cầu cụ thể.         | Một phân khúc/tệp khách hàng có đặc điểm hoặc nhu cầu xác định.         |
| Thông điệp          | Giới thiệu thương hiệu, chủ đề, bộ sưu tập, cảm hứng.           | Lựa chọn sản phẩm phù hợp nhu cầu, dịp, ngân sách.                      |
| Thông tin           | Hình ảnh, mô tả khái quát, thông tin cửa hàng.                  | Chi tiết mẫu, mã/SKU, kích thước, giá/giá từ, tùy chọn, điều kiện.      |
| CTA                 | Xem thêm; liên hệ; nhận tư vấn; yêu cầu thông tin; để lại Lead. | Chọn mẫu; yêu cầu báo giá; thêm thông tin giao hàng; đặt hàng.          |
| Hành động sau click | Mở form Lead, inbox, gọi điện hoặc trang giới thiệu.            | Đi vào quy trình tư vấn/giỏ hàng/checkout/đơn hàng.                     |
| Dữ liệu thu         | Nguồn Lead, chiến dịch, thông tin liên hệ, nhu cầu sơ bộ.       | Khách hàng, sản phẩm chọn, số lượng, giá, báo giá, địa chỉ và đơn hàng. |
| KPI                 | Reach, CTR, engagement, CPL, số Lead.                           | Response, consultation-to-quote, quote-to-order, conversion, revenue.   |

## 5.4. Ví dụ cùng một Catalog theo dịp

- Quảng bá: Catalog Valentine hiển thị hình ảnh và câu chuyện bộ sưu tập; nút “Nhận tư vấn / Báo giá”. Người xem để lại tên, số điện thoại, kênh liên hệ và nhu cầu; hệ thống tạo Lead gắn chiến dịch Valentine.

- Bán hàng: Catalog Valentine dành cho tệp khách hàng đã chọn; hiển thị mẫu cụ thể, mã sản phẩm, mức giá, lựa chọn kích thước/phụ kiện, thời gian giao; nút “Đặt hàng”. Khách được đưa vào quy trình đặt hàng và thanh toán.

Không nên tạo hai công cụ Catalog riêng biệt nếu chỉ khác mục đích. Nên dùng một Asset Type có các Usage Profile khác nhau, hoặc tạo hai phiên bản triển khai từ cùng nguồn Asset.

## 5.5. Quy trình chiến dịch Quảng bá

13. Chọn mục tiêu chiến dịch và dịp/sản phẩm.

14. Chọn tệp/kênh phân phối; xác định mass audience hoặc nhóm tiếp cận.

15. Chọn Asset có sẵn hoặc tạo Asset mới từ Module Tạo nội dung.

16. Cấu hình Promotion Usage: thông điệp, CTA, landing/form, kênh, lịch và tracking.

17. Preview và phê duyệt chiến dịch.

18. Phân phối qua kênh được tích hợp hoặc xuất nội dung để đăng/gửi thủ công.

19. Thu Lead, gắn nguồn chiến dịch và chuyển sang Bán hàng khi cần.

20. Đo hiệu quả và tái sử dụng Asset cho chiến dịch tiếp theo.

# 6. Module 04 – Bán hàng

Mục tiêu: tiếp cận đúng khách hàng mục tiêu (target customer), cung cấp nội dung đủ sâu để tư vấn và đề xuất, báo giá, chốt và chuyển thành đơn hàng.

## 6.1. Nguyên tắc Targeting

- Target không chỉ là chọn danh sách số điện thoại. Cần phân nhóm theo nhu cầu, dịp mua, ngân sách, khu vực, lịch sử mua, hành vi và trạng thái Lead.

- Mỗi nhóm khách hàng cần có Sales Play/Message phù hợp; không gửi một nội dung chung cho mọi khách.

- Asset bán hàng cần hỗ trợ cá nhân hóa: lời chào, nhu cầu, dịp, ngân sách, đề xuất sản phẩm và CTA.

- Phải lưu được nguồn khách, người phụ trách, trạng thái xử lý và lịch sử tương tác.

## 6.2. Quy trình bán hàng chuẩn

| **Bước**             | **Mục tiêu**                                           | **Asset / công cụ gợi ý**                                                                   | **Kết quả dữ liệu**                                  |
|----------------------|--------------------------------------------------------|---------------------------------------------------------------------------------------------|------------------------------------------------------|
| 1\. Target           | Chọn đúng tệp khách và ưu tiên cơ hội.                 | Customer Segments; danh sách Lead/Customer; chiến dịch/nguồn.                               | Target list, phân công, lý do chọn.                  |
| 2\. Approach         | Mở cuộc hội thoại đúng ngữ cảnh.                       | Zalo Product Card (74); Sales Message; Product Landing Page/Catalog phiên bản Sales.        | Contact attempt, channel, response.                  |
| 3\. Consultation     | Làm rõ nhu cầu, dịp, ngân sách, người nhận, thời gian. | Mini Catalog (19); Product Selection Sheet (25); Gift/Event Collection (26/27).             | Customer needs, preferences, budget.                 |
| 4\. Recommendation   | Đề xuất một số phương án có lý do.                     | Product Comparison Sheet (6); Product Information Card (4); catalog/collection có chọn lọc. | Recommended items, customer choice.                  |
| 5\. Quotation        | Báo giá minh bạch, có hiệu lực và điều kiện.           | Price List (21); Product Quotation (24); Product Presentation (23).                         | Quote, line items, validity, status.                 |
| 6\. Closing          | Xử lý phản hồi và thúc đẩy quyết định.                 | Voucher/Coupon (53/54); Sales Offer; follow-up message; CTA.                                | Won/Lost/Pending, reason, next action.               |
| 7\. Order conversion | Chuyển lựa chọn đã xác nhận thành đơn hàng.            | Order Link; Order Summary; checkout/order handoff.                                          | Order ID, customer, items, delivery, payment status. |

## 6.3. Chuẩn hóa Sales Asset

Các Asset bán hàng có thể cùng loại với Asset Quảng bá (Landing Page, Catalog, Collection, Poster, Flyer), nhưng cần có Sales Usage Profile. Tùy trường hợp, cấu hình phải hỗ trợ:

- Audience/segment: Asset dành cho ai; nhóm khách hàng nào; cá nhân hay danh sách.

- Sales context: dịp mua, nhu cầu, ngân sách, khu vực, thời điểm giao.

- Product data: tên/mã sản phẩm, biến thể, giá, tình trạng khả dụng và thông tin cần tư vấn.

- Recommendation logic: tiêu chí chọn mẫu, số lượng phương án, lý do đề xuất và sản phẩm thay thế.

- Commercial terms: giá, phí giao, ưu đãi, thời hạn báo giá, điều kiện đặt cọc/thanh toán (nếu có).

- CTA and workflow: liên hệ tư vấn, yêu cầu báo giá, xác nhận lựa chọn, đặt hàng hoặc thanh toán.

- Tracking: người phụ trách, trạng thái, lần liên hệ, phản hồi, bước tiếp theo.

## 6.4. Ranh giới với Order Operations

Module Bán hàng chịu trách nhiệm chuyển đổi nhu cầu thành đơn hàng và bàn giao dữ liệu đơn. Các nghiệp vụ sau khi đơn được tạo như phân công thợ, sản xuất hoa, kiểm soát chất lượng, giao hàng và xử lý hậu cần thuộc phân hệ vận hành đơn hàng/fulfillment của SMEOS, không nên nhồi toàn bộ vào Marketing & Sales Center.

## 6.5. Trạng thái pipeline đề xuất

New Lead → Qualified → Contacted → Consulting → Recommended → Quotation Sent → Negotiation/Follow-up → Won (Order Created) hoặc Lost/Unqualified. Cho phép cấu hình trạng thái phụ theo ngành/cửa hàng, nhưng cần giữ các mốc chuẩn để báo cáo.

# 7. Module 05 – Chăm sóc khách hàng

Mục tiêu: giúp cửa hàng phân nhóm khách hiện hữu, xác định kênh liên hệ phù hợp và tạo Asset đúng ngữ cảnh để chăm sóc, duy trì quan hệ, upsell, cross-sell và khuyến khích giới thiệu.

## 7.1. Phân nhóm khách hàng

| **Chiều phân nhóm**       | **Ví dụ**                                                                          |
|---------------------------|------------------------------------------------------------------------------------|
| Giá trị/độ trung thành    | Khách mới; khách thường xuyên; VIP; khách có giá trị cao; khách lâu chưa quay lại. |
| Hành vi mua               | Mua theo dịp; mua định kỳ; chỉ mua khuyến mãi; mua sản phẩm cao cấp.               |
| Nhu cầu/dịp               | Sinh nhật; kỷ niệm; khai trương; cưới; sự kiện; hoa văn phòng.                     |
| RFM/recency               | Lần mua gần nhất; tần suất; tổng giá trị chi tiêu.                                 |
| Tiềm năng phát triển      | Có khả năng nâng cấp; mua thêm; giới thiệu người quen.                             |
| Trạng thái đồng ý liên hệ | Được phép nhận tin qua kênh nào; từ chối/không đăng ký nhận tin.                   |

## 7.2. Quản lý kênh liên hệ

- Cho phép lưu nhiều kênh trên một hồ sơ khách hàng: điện thoại, Zalo, email, Facebook/Messenger và các kênh khác.

- Lưu trạng thái xác minh, kênh ưu tiên, lần liên hệ gần nhất và lịch sử phản hồi.

- Phân biệt kênh có thể gửi tự động, kênh cần thao tác thủ công và kênh chưa tích hợp.

- Tôn trọng consent/opt-out và quy định nền tảng; không mặc định khách hàng đồng ý nhận mọi loại tin.

## 7.3. Asset chăm sóc, upsell và cross-sell

| **Mục tiêu**         | **Asset hiện có / ví dụ**                                                                                   | **Tình huống**                                                 |
|----------------------|-------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| Chăm sóc sau mua     | Greeting Card (48); Thank You Card (49); Care Instruction Card (55); Delivery Confirmation Card (56).       | Cảm ơn, hướng dẫn chăm hoa, xác nhận giao hàng.                |
| Cá nhân hóa theo dịp | Birthday Card (50); Anniversary Card (51).                                                                  | Chúc mừng sinh nhật, kỷ niệm.                                  |
| Giữ chân / quay lại  | Voucher (53); Discount Coupon (54); Gift Card (52); Review Request Card (57).                               | Kích hoạt lần mua sau, xin đánh giá, tri ân.                   |
| Upsell / Cross-sell  | Bộ sưu tập mới; Product Collection Sheet (7); Gift Collection (26); Event Collection (27); newsletter (75). | Đề xuất phân khúc cao hơn, phụ kiện, sản phẩm cho dịp kế tiếp. |
| Referral             | Referral offer/card hoặc mã giới thiệu (cần chuẩn hóa Asset Type).                                          | Khách giới thiệu bạn bè và theo dõi nguồn giới thiệu.          |

## 7.4. Quy trình chăm sóc

21. Chọn phân khúc khách hàng hoặc tạo segment theo điều kiện.

22. Chọn mục tiêu: chăm sóc sau mua, sinh nhật/kỷ niệm, win-back, upsell, cross-sell, loyalty hoặc referral.

23. Chọn kênh liên hệ phù hợp với consent và thông tin liên hệ.

24. Chọn Asset có sẵn hoặc tạo biến thể nội dung cá nhân hóa.

25. Thiết lập lịch/gửi thủ công hoặc tự động nếu tích hợp hỗ trợ.

26. Ghi nhận gửi thành công, phản hồi, click, đơn hàng phát sinh và doanh thu quy thuộc.

27. Đưa kết quả về hồ sơ khách hàng để cập nhật phân nhóm và hành động tiếp theo.

Điểm cần phân biệt: Customer Care không đồng nghĩa Mass Marketing. Chăm sóc sử dụng dữ liệu khách hàng hiện hữu, phân khúc và ngữ cảnh quan hệ; Quảng bá tập trung vào độ phủ, thu hút sự quan tâm và Lead.

# 8. Module 06 – Ấn phẩm & Vật phẩm cửa hàng

Mục tiêu: khu vực chuyên xử lý Asset cần xuất file đúng quy cách để in hoặc sản xuất thành vật phẩm vật lý. Đây là điểm đến sản xuất/in ấn, không phải nơi quyết định mục tiêu Marketing.

| **Nhóm**                  | **Asset hiện có / ví dụ**                                                        | **Yêu cầu đầu ra**                                               |
|---------------------------|----------------------------------------------------------------------------------|------------------------------------------------------------------|
| Bao bì & nhận diện vật lý | Product Tag (66); Packaging Sticker (67); Gift Card (52).                        | Kích thước, bleed, safe area, màu, vật liệu, số lượng.           |
| POS / tại quầy            | Counter Display (62); Table Tent (63); Product Menu Print (61).                  | Khổ thành phẩm, chân/gấp, mã QR, nội dung cập nhật.              |
| Trưng bày                 | Standee (16); Window Display Poster (64); Wall Poster (65); Poster Print (59).   | Kích thước lớn, độ phân giải, vật liệu, vị trí đặt.              |
| Tài liệu bán hàng in      | Flyer (14); Brochure (15); Product Catalog Print (60); Product Photo Print (58). | Khổ giấy, số mặt/trang, đóng cuốn, profile màu.                  |
| Chuỗi cửa hàng            | Product Menu Print (61); Product Catalog Print (60); Product Poster Print (59).  | Template dùng chung, biến thể theo chi nhánh, kiểm soát version. |

## 8.1. Quy trình Print Production

28. Chọn Asset đã có hoặc tạo Asset mới từ Module nghiệp vụ tương ứng.

29. Chọn mục đích in, loại vật liệu, kích thước và số lượng.

30. Kiểm tra bleed, safe margin, độ phân giải, font, ảnh, QR và vùng cắt/gấp.

31. Preview bản in và xác nhận nội dung/phiên bản.

32. Xuất file in (PDF hoặc định dạng phù hợp) kèm thông số sản xuất.

33. Lưu Print-ready version, thông tin nhà in/đơn đặt in nếu hệ thống hỗ trợ.

Một Asset có thể vừa dùng digital vừa dùng print. Bản in nên là rendition/derivative có thông số kỹ thuật riêng, liên kết về Asset nguồn.

# 9. Asset lifecycle, tái sử dụng và lựa chọn nơi sử dụng

## 9.1. Lifecycle chuẩn

| **Trạng thái**     | **Ý nghĩa**                                |
|--------------------|--------------------------------------------|
| Draft              | Đang cấu hình, chưa tạo xong.              |
| Generated          | Đã được hệ thống tạo.                      |
| In Review          | Chờ người dùng kiểm tra.                   |
| Approved           | Được duyệt để sử dụng.                     |
| Published / Active | Đang được triển khai ở một hoặc nhiều nơi. |
| Paused / Archived  | Tạm dừng hoặc lưu trữ.                     |
| Superseded         | Có phiên bản mới thay thế.                 |

## 9.2. Lựa chọn nơi sử dụng sau khi tạo Asset

Sau khi Asset được tạo và người dùng duyệt, hiển thị hành động “Sử dụng Asset này ở đâu?” hoặc “Use this asset”. Người dùng có thể chọn một hoặc nhiều điểm đến:

- Quảng bá: tạo chiến dịch, đăng/gửi, gắn CTA thu Lead.

- Bán hàng: gửi cho phân khúc khách, gắn CTA tư vấn/báo giá/đặt hàng.

- Chăm sóc khách hàng: gửi cho segment khách hiện hữu theo dịp hoặc mục tiêu.

- In ấn: tạo bản print-ready với quy cách vật lý.

- Lưu thư viện: chưa triển khai ngay, để tái sử dụng sau.

Khi người dùng chọn điểm đến, SMEOS nên tạo một Usage/Deployment cấu hình từ Asset nguồn: chọn audience, channel, CTA, form/checkout, tracking, thời gian và workflow. Không nên tự động sao chép toàn bộ Asset thành một file độc lập nếu không cần thiết.

## 9.3. Phân biệt Asset nguồn và Usage

| **Thành phần**  | **Ví dụ Catalog Valentine**                                                     |
|-----------------|---------------------------------------------------------------------------------|
| Asset nguồn     | Thiết kế catalog, ảnh sản phẩm, mô tả và bố cục đã duyệt.                       |
| Promotion Usage | Hiển thị giới thiệu bộ sưu tập; CTA “Nhận tư vấn”; form tạo Lead; campaign tag. |
| Sales Usage     | Hiển thị mẫu, mã, giá, lựa chọn; CTA “Đặt hàng”; checkout/order workflow.       |
| Care Usage      | Gửi bộ sưu tập phù hợp cho khách cũ; cá nhân hóa theo lịch sử mua; CTA mua lại. |
| Print Rendition | PDF booklet với khổ giấy, bleed, số trang và cấu hình in.                       |

# 10. Customer Lifecycle và luồng dữ liệu

| **Giai đoạn**              | **Module chủ đạo**                | **Đối tượng/dữ liệu đầu ra**                                                |
|----------------------------|-----------------------------------|-----------------------------------------------------------------------------|
| Brand foundation           | 01\. Hồ sơ cửa hàng & Thương hiệu | Store Profile, Brand Identity đã duyệt, Store Assets.                       |
| Content production         | 02\. Tạo nội dung                 | Asset nguồn, phiên bản, metadata và kênh phù hợp.                           |
| Awareness / acquisition    | 03\. Quảng bá                     | Campaign, reach/engagement, inquiry, Lead và nguồn Lead.                    |
| Consideration / conversion | 04\. Bán hàng                     | Segment, consultation, recommendation, quotation, order conversion.         |
| Retention / expansion      | 05\. Chăm sóc khách hàng          | Customer segment, interaction, repeat purchase, upsell/cross-sell/referral. |
| Physical execution         | 06\. Ấn phẩm & Vật phẩm cửa hàng  | Print-ready rendition, thông số và trạng thái sản xuất.                     |

Luồng vòng đời không hoàn toàn tuyến tính. Asset có thể được tái sử dụng; khách hàng có thể đi từ Lead sang Customer, quay lại mua hàng nhiều lần và được đưa vào các segment khác nhau theo thời gian.

# 11. Mô hình dữ liệu nghiệp vụ đề xuất

Các entity dưới đây là đề xuất ở mức domain model để đội kiến trúc đối chiếu với schema hiện tại. Đây không phải khẳng định rằng SMEOS đã có đầy đủ các bảng hoặc cấu trúc này.

| **Entity / Domain**             | **Vai trò và quan hệ chính**                                                              |
|---------------------------------|-------------------------------------------------------------------------------------------|
| StoreProfile                    | Hồ sơ cửa hàng; nguồn dữ liệu chính cho thông tin và nội dung thương hiệu.                |
| BrandProfile / BrandVersion     | Bộ nhận diện, guideline và version được duyệt.                                            |
| AssetType                       | Định nghĩa loại Asset, schema đầu vào, output format và template.                         |
| AssetInstance                   | Một Asset cụ thể được tạo; tham chiếu Store, BrandVersion, source data và creator.        |
| AssetVersion                    | Lịch sử phiên bản, thay đổi, trạng thái duyệt.                                            |
| AssetUsage / Deployment         | Cách Asset được sử dụng trong Promotion, Sales, Care hoặc Print.                          |
| Channel / ChannelAccount        | Kênh phân phối, tài khoản và khả năng tích hợp.                                           |
| Campaign                        | Chiến dịch, mục tiêu, audience, lịch, kênh và kết quả.                                    |
| Lead                            | Khách tiềm năng, nguồn, chiến dịch, nhu cầu, trạng thái và owner.                         |
| Customer / CustomerSegment      | Hồ sơ khách hàng và nhóm phân loại động/tĩnh.                                             |
| Interaction                     | Lịch sử liên hệ, nội dung, kênh, kết quả và consent.                                      |
| SalesOpportunity / Consultation | Nhu cầu, tư vấn, đề xuất, follow-up và trạng thái.                                        |
| Quotation                       | Báo giá, line items, điều kiện, hiệu lực và trạng thái.                                   |
| OrderReference                  | Tham chiếu đơn hàng được tạo khi chuyển đổi; nghiệp vụ fulfillment thuộc domain vận hành. |
| PrintJob / PrintRendition       | Bản xuất in, quy cách, file print-ready và thông tin sản xuất.                            |

## 11.1. Các quan hệ cần bảo đảm

- AssetInstance phải biết được sinh từ StoreProfile và BrandVersion nào.

- AssetUsage phải tham chiếu Asset nguồn, Module đích, mục tiêu, CTA, channel và workflow.

- Lead phải lưu source campaign/asset usage để đo nguồn tạo Lead.

- Sales Opportunity phải liên kết Lead hoặc Customer; Quotation phải liên kết opportunity và sản phẩm.

- OrderReference phải giữ liên kết về cơ hội bán hàng/báo giá để đo conversion.

- Interaction phải lưu customer, channel, thời gian, nội dung/Asset đã gửi và kết quả.

- PrintRendition phải tham chiếu Asset nguồn và các thông số in.

# 12. KPI và đo lường hiệu quả

| **Module**                        | **KPI định hướng**                                                                                             |
|-----------------------------------|----------------------------------------------------------------------------------------------------------------|
| 01\. Hồ sơ cửa hàng & Thương hiệu | Tỷ lệ hoàn thành Store Profile; tỷ lệ Brand Assets được duyệt; số Asset chính thức được tạo từ Brand Profile.  |
| 02\. Tạo nội dung                 | Thời gian tạo Asset; số Asset tạo/tuần; tỷ lệ duyệt; tỷ lệ tái sử dụng; chi phí/thời gian tiết kiệm.           |
| 03\. Quảng bá                     | Reach; impressions; engagement; CTR; số inquiry; số Lead; CPL; conversion từ view/click sang Lead.             |
| 04\. Bán hàng                     | Contact rate; response rate; consultation-to-quotation; quotation-to-order; conversion rate; doanh thu; AOV.   |
| 05\. Chăm sóc khách hàng          | Repeat purchase rate; retention; win-back; CLV; revenue từ upsell/cross-sell; referral rate; opt-out rate.     |
| 06\. Ấn phẩm & Vật phẩm           | Thời gian tạo file in; tỷ lệ file đạt preflight; số lần sửa do lỗi kỹ thuật; chi phí in/đơn vị nếu có dữ liệu. |

KPI cần có định nghĩa, công thức, cửa sổ thời gian, nguồn dữ liệu và quy tắc attribution. Không nên hiển thị KPI nếu chưa có tích hợp hoặc dữ liệu đủ tin cậy.

# 13. Nguyên tắc UX và hành vi hệ thống

- Dashboard ưu tiên 6 Business Modules; tránh đưa 77 Asset thành một danh sách phẳng ở màn hình đầu.

- Mỗi Module mở ra các capability/workflow dễ hiểu, sau đó mới đến Tools và Asset Types.

- Form theo ngữ cảnh: hỏi đúng dữ liệu cần cho tác vụ; tái sử dụng dữ liệu Store Profile, Product Catalog và Customer Profile.

- Progressive disclosure: hiển thị bước cơ bản trước; tùy chọn nâng cao mở khi người dùng cần.

- Preview trước khi publish/send/print; thao tác có tác động bên ngoài cần xác nhận rõ.

- Luôn phân biệt Draft, Approved, Published và Print-ready.

- CTA phải phản ánh đúng mục đích: Lead capture khác checkout; request quote khác place order.

- Cho phép chọn nhiều nơi sử dụng Asset sau khi tạo; cho phép quay lại cấu hình Usage mà không phải generate lại file gốc.

- Hiển thị nguồn dữ liệu, version thương hiệu và thời điểm cập nhật của Asset.

- Trên mobile, ưu tiên luồng thao tác ngắn, nút chạm rõ và form có thể hoàn thành từng bước.

# 14. Rà soát danh mục 77 Assets hiện có

Danh mục ban đầu được xây dựng theo 11 nhóm. Khi chuyển sang 6 Business Modules, cần phân biệt: (a) nơi tạo Asset nguồn; (b) nơi triển khai Asset; (c) nơi xuất bản in. Vì vậy, một số Asset được phép xuất hiện trong nhiều workflow dưới dạng Usage khác nhau.

| **Asset \#** | **Tên Asset theo danh mục hiện có** | **Module chính / nơi sử dụng**      |
|--------------|-------------------------------------|-------------------------------------|
| 1            | Product Cover                       | 02\. Tạo nội dung                   |
| 2            | Product Thumbnail                   | 02\. Tạo nội dung                   |
| 3            | Product Image Gallery               | 02\. Tạo nội dung                   |
| 4            | Product Information Card            | 02\. Tạo nội dung                   |
| 5            | Product Showcase                    | 02\. Tạo nội dung                   |
| 6            | Product Comparison Sheet            | 02\. Tạo nội dung                   |
| 7            | Product Collection Sheet            | 02 Tạo nội dung / 05 Chăm sóc KH    |
| 8            | Poster                              | 03\. Quảng bá\*                     |
| 9            | Promotional Poster                  | 03\. Quảng bá\*                     |
| 10           | Sale Banner                         | 03\. Quảng bá\*                     |
| 11           | Website Banner                      | 03\. Quảng bá\*                     |
| 12           | Facebook Banner                     | 03\. Quảng bá\*                     |
| 13           | Social Media Banner                 | 03\. Quảng bá\*                     |
| 14           | Flyer                               | 03\. Quảng bá\*                     |
| 15           | Brochure                            | 03\. Quảng bá\*                     |
| 16           | Standee                             | 03\. Quảng bá\*                     |
| 17           | Digital Billboard                   | 03\. Quảng bá\*                     |
| 18           | Product Catalog                     | 03 Quảng bá / 04 Bán hàng           |
| 19           | Mini Catalog                        | 04\. Bán hàng                       |
| 20           | Digital Lookbook                    | 03 Quảng bá / 04 Bán hàng           |
| 21           | Price List                          | 04\. Bán hàng                       |
| 22           | Product Menu                        | 03 Quảng bá / 04 Bán hàng           |
| 23           | Product Presentation                | 04\. Bán hàng                       |
| 24           | Product Quotation                   | 04\. Bán hàng                       |
| 25           | Product Selection Sheet             | 04\. Bán hàng                       |
| 26           | Gift Collection                     | 04\. Bán hàng                       |
| 27           | Event Collection                    | 04\. Bán hàng                       |
| 28           | Facebook Post Image                 | 02\. Tạo nội dung                   |
| 29           | Instagram Post                      | 02\. Tạo nội dung                   |
| 30           | Instagram Carousel                  | 02\. Tạo nội dung                   |
| 31           | Instagram Story                     | 02\. Tạo nội dung                   |
| 32           | Facebook Story                      | 02\. Tạo nội dung                   |
| 33           | TikTok Photo Post                   | 02\. Tạo nội dung                   |
| 34           | Pinterest Pin                       | 02\. Tạo nội dung                   |
| 35           | Social Media Carousel               | 02\. Tạo nội dung                   |
| 36           | Social Media Album                  | 02\. Tạo nội dung                   |
| 37           | Social Media Cover                  | Cần rà soát                         |
| 38           | Product Slideshow                   | 02\. Tạo nội dung                   |
| 39           | Product Reel                        | 02\. Tạo nội dung                   |
| 40           | TikTok Product Video                | 02\. Tạo nội dung                   |
| 41           | Product Showcase Video              | 02\. Tạo nội dung                   |
| 42           | Promotional Video                   | 02\. Tạo nội dung                   |
| 43           | Animated Product Poster             | 02\. Tạo nội dung                   |
| 44           | Product Story Video                 | 02\. Tạo nội dung                   |
| 45           | Video Catalog                       | 02\. Tạo nội dung                   |
| 46           | Before & After Video                | 02\. Tạo nội dung                   |
| 47           | Seasonal Collection Video           | 02\. Tạo nội dung                   |
| 48           | Greeting Card                       | 05\. Chăm sóc KH\*                  |
| 49           | Thank You Card                      | 05\. Chăm sóc KH\*                  |
| 50           | Birthday Card                       | 05\. Chăm sóc KH\*                  |
| 51           | Anniversary Card                    | 05\. Chăm sóc KH\*                  |
| 52           | Gift Card                           | 05 Chăm sóc KH / 06 In ấn           |
| 53           | Voucher                             | 04 Bán hàng / 05 Chăm sóc KH        |
| 54           | Discount Coupon                     | 04 Bán hàng / 05 Chăm sóc KH        |
| 55           | Care Instruction Card               | 05\. Chăm sóc KH\*                  |
| 56           | Delivery Confirmation Card          | 05 Chăm sóc KH / 06 In ấn           |
| 57           | Review Request Card                 | 05\. Chăm sóc KH\*                  |
| 58           | Product Photo Print                 | 06\. Ấn phẩm/in\*                   |
| 59           | Product Poster Print                | 06\. Ấn phẩm/in\*                   |
| 60           | Product Catalog Print               | 06\. Ấn phẩm/in\*                   |
| 61           | Product Menu Print                  | 06\. Ấn phẩm/in\*                   |
| 62           | Counter Display                     | 06\. Ấn phẩm/in\*                   |
| 63           | Table Tent                          | 03 Quảng bá / 06 In ấn              |
| 64           | Window Display Poster               | 03 Quảng bá / 06 In ấn              |
| 65           | Wall Poster                         | 06\. Ấn phẩm/in\*                   |
| 66           | Product Tag                         | 01 Thương hiệu / 06 In ấn           |
| 67           | Packaging Sticker                   | 01 Thương hiệu / 06 In ấn           |
| 68           | Product Landing Page                | 03 Quảng bá / 04 Bán hàng           |
| 69           | Collection Landing Page             | 03 Quảng bá / 04 Bán hàng           |
| 70           | Digital Product Page                | 03 Quảng bá / 04 Bán hàng           |
| 71           | Facebook Product Album              | 02 Tạo nội dung / Phân phối         |
| 72           | Online Catalog Link                 | 03 Quảng bá / 04 Bán hàng           |
| 73           | QR Product Page                     | 03 Quảng bá / 04 Bán hàng           |
| 74           | Zalo Product Card                   | 04\. Bán hàng                       |
| 75           | Email Product Newsletter            | 05\. Chăm sóc KH\*                  |
| 76           | Digital Product Collection          | 02 Tạo nội dung / Thư viện sản phẩm |
| 77           | Social Commerce Creative            | 03\. Quảng bá\*                     |

\*Các mục có dấu sao hoặc ghi nhiều Module là trường hợp cần cấu hình Usage/điểm đến; không có nghĩa phải tạo nhiều Asset Type trùng lặp.

Lưu ý kiểm kê: bảng trên phân loại theo tên và mô tả trong danh mục đầu vào. Một số Asset như Product Catalog, Landing Page, Voucher, Gift Card hoặc Table Tent có thể thay đổi Module triển khai tùy CTA và workflow. Cần rà soát lại chi tiết template và trạng thái Ready/Extend/New trong backlog kỹ thuật trước khi chốt sprint.

# 15. Các khoảng trống cần bổ sung hoặc quyết định

| **Chủ đề**           | **Đề xuất / quyết định cần chốt**                                                                                  |
|----------------------|--------------------------------------------------------------------------------------------------------------------|
| Brand workflow       | Chốt form Store Profile; tiêu chí duyệt logo/slogan; ai có quyền Approved; xử lý khi Brand Version thay đổi.       |
| Asset taxonomy       | Chốt Asset Type, Asset Instance, Version, Usage/Deployment và Print Rendition là các khái niệm riêng trong domain. |
| CTA registry         | Chuẩn hóa các CTA: Learn More, Contact, Request Info, Request Quote, Book/Order, Pay, Review, Refer.               |
| Lead capture         | Chốt trường form tối thiểu, consent, chống trùng Lead, phân công và SLA follow-up.                                 |
| Sales process        | Chốt segment rules, pipeline, quote validity, product availability, giá và điều kiện thương mại.                   |
| Customer data        | Chốt quy tắc hợp nhất khách trùng, consent theo kênh, opt-out và quyền truy cập dữ liệu.                           |
| Channel integrations | Phân biệt kênh đã tích hợp gửi tự động với kênh chỉ hỗ trợ xuất nội dung/thao tác thủ công.                        |
| Analytics            | Chốt attribution từ Asset/Usage → Lead → Opportunity → Order → Revenue.                                            |
| Print production     | Chốt preset kích thước, bleed, safe area, profile màu, PDF preflight và định dạng xuất.                            |
| Existing 77 Assets   | Rà soát từng Asset: giữ, chuyển nhóm, tách biến thể Usage, gộp trùng, bổ sung hoặc loại bỏ.                        |

# 16. Lộ trình triển khai khuyến nghị

| **Phase**                     | **Phạm vi**                                                                      | **Deliverables / điều kiện hoàn thành**                                  |
|-------------------------------|----------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| P0 – Architecture alignment   | Chốt taxonomy, 6 Modules, 2-layer UI, Asset lifecycle và Usage model.            | Domain glossary; module map; screen map; CTA taxonomy; data ownership.   |
| P1 – Brand foundation         | Store Profile form, Brand Profile, approval/versioning, Store Assets.            | Có thể tạo và duyệt bộ nhận diện; Asset sau đó dùng đúng brand version.  |
| P2 – Content & Asset Library  | Tạo nội dung theo danh mục hiện có; Asset Library; reuse; chọn nơi sử dụng.      | Một Asset nguồn có thể được lưu, version và mở Usage ở Module đích.      |
| P3 – Promotion & Lead         | Campaign, audience, CTA Lead, landing/form, tracking và lead handoff.            | Một chiến dịch tạo được Lead có nguồn và chuyển sang Sales.              |
| P4 – Sales workflow           | Target segment, consultation, recommendation, quotation, close và order handoff. | Theo dõi pipeline và đo conversion từ Lead đến Order.                    |
| P5 – Customer Care            | Customer segments, channel preference/consent, care/retention/upsell flows.      | Tạo và triển khai Asset theo segment/kênh; ghi nhận phản hồi và mua lại. |
| P6 – Print & production       | Print presets, preflight, PDF export, Print Rendition và print job.              | Xuất được file in đúng thông số và truy ngược Asset nguồn.               |
| P7 – Analytics & optimization | Dashboard KPI, attribution, reuse analytics và cải tiến workflow.                | Đo được hiệu quả xuyên suốt 6 Modules.                                   |

# 17. Tiêu chí nghiệm thu kiến trúc

- Dashboard có đúng 6 Business Modules; mỗi Module có mục tiêu và ranh giới nghiệp vụ được mô tả.

- Kiến trúc UI hai lớp được giữ nhất quán: Business Modules → capability/workflow → Tools & Assets.

- Store Profile và Brand Identity có quy trình tạo, duyệt, version; Asset thương hiệu chính thức tham chiếu đúng version.

- Asset Type không bị nhân bản chỉ vì dùng ở nhiều Module; có mô hình Usage/Deployment riêng.

- Một Asset sau khi tạo có thể được chọn sử dụng ở một hoặc nhiều nơi.

- Quảng bá và Bán hàng phân biệt rõ audience, content depth, CTA, data capture, workflow và KPI.

- Sales flow hỗ trợ target → approach → consultation → recommendation → quotation → closing → order handoff.

- Customer Care hỗ trợ segment, channel preference, consent, care, retention, upsell, cross-sell và referral.

- Print flow có thông số kỹ thuật, preview/preflight và bản Print Rendition tách khỏi Asset nguồn.

- Lead, Customer, Interaction, Opportunity, Quotation và Order Reference có liên kết truy vết.

- Không tuyên bố tự động gửi qua kênh nếu tích hợp chưa được triển khai; UI phải thể hiện rõ khả năng thực tế.

- KPI có định nghĩa và nguồn dữ liệu; không tính trùng kết quả giữa các Usage.

# 18. Kết luận kiến trúc

Định hướng được thống nhất là xây dựng SMEOS Marketing & Sales Center theo tư duy vận hành của chủ cửa hàng hoa với 6 Business Modules. Kiến trúc giao diện hai lớp hiện tại được giữ làm cấu trúc trình bày: lớp Module nghiệp vụ và lớp Tools & Assets.

Điểm nâng cấp cốt lõi không nằm ở việc đổi tên 11 nhóm cũ thành 6 nhóm mới, mà ở việc bổ sung mô hình Asset nguồn – Usage/Deployment – Workflow. Nhờ đó, cùng một Catalog, Landing Page, Collection, Poster hoặc Flyer có thể phục vụ nhiều mục tiêu mà không trộn lẫn Quảng bá với Bán hàng.

Hệ thống cần đưa người dùng từ dữ liệu cửa hàng và thương hiệu đã duyệt, sang sản xuất nội dung, phân phối để thu Lead, chuyển đổi bằng quy trình bán hàng, chăm sóc để tăng giá trị khách hàng và cuối cùng xuất bản in khi cần. Dữ liệu, Asset và hiệu quả phải liên kết xuyên suốt.

Tài liệu này là bản kiến trúc nghiệp vụ đề xuất. Các entity, trạng thái, KPI và lộ trình cần được đối chiếu với System Architecture, Database Schema, API Contract, Screen Contract và phân quyền SMEOS hiện hữu trước khi triển khai.
