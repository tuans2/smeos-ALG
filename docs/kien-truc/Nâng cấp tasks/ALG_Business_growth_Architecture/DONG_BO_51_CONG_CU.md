# Đồng bộ hạng mục Business Growth ↔ 51 công cụ (bản nháp rà soát 30/10/2026)

Đối chiếu từng hạng mục công cụ trong "Nâng cấp Dashboard theo 10 module quy trình" (§3) với danh mục 51 công cụ (`src/modules/toolkit/domain/toolkit-catalog.ts`) và các trang đã có trong app.

**Ký hiệu kết luận**
- **#n** — trùng hoặc nằm trọn trong công cụ số n của danh sách 51 → bỏ khỏi lộ trình, gộp vào công cụ đó.
- **#n (một phần)** — công cụ n làm được một phần → gộp vào n, ghi phần thiếu vào ghi chú trạng thái của n.
- **APP: /đường-dẫn** — đã có trang trong app nhưng **không nằm trong 51 công cụ**. Chỉ xem tiêu đề trang, **chưa xác minh** mức hoàn thiện.
- **MỚI** — chưa có gì tương ứng → giữ trong lộ trình.
- **(trùng Mxx)** — tài liệu lặp hạng mục này ở module khác → chỉ giữ ở module sở hữu.

## M01 Thương hiệu
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Store Profile | #11 |
| 1 | Brand Information | APP: /ho-so (Hồ sơ tiệm) · #11 (một phần) |
| 1 | Logo Management | APP: /ho-so |
| 1 | Slogan Management | APP: /ho-so (cần kiểm có ô khẩu hiệu) · nếu không có → MỚI |
| 1 | Business Card | MỚI |
| 2 | Brand Kit | #45 (một phần — #45 dành cho chuỗi) |
| 2 | Brand Guidelines | #45 (một phần) |
| 2 | Brand Templates | APP: /kho-templates |
| 2 | Marketing Identity Assets | #45 |
| 3 | AI Brand Assistant · AI Brand Content Suggestions · Brand Consistency Checker | MỚI (3) |

## M02 Tạo nội dung
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Product Image Management | APP: /san-pham, /kho-du-lieu |
| 1 | Product Image Editing | #1 |
| 1 | Background Removal | #1 (tách nền nằm trong luồng ảnh studio) |
| 1 | Greeting Card Generator | #7 · #3 |
| 1 | Product Content Management | #4 |
| 2 | AI Image Generator | #1 · #2 |
| 2 | Poster Generator · Banner Generator | #5 |
| 2 | Social Media Post Generator | #4 + #5 |
| 2 | Video Template | #6 |
| 2 | Product Presentation Generator | #3 · #6 (một phần) |
| 3 | AI Content Studio | #0 |
| 3 | AI Video Generator | #6 |
| 3 | AI Copywriting Assistant | #4 |
| 3 | AI Content Planner | #22 (một phần — lịch đăng) |
| 3 | Multi-channel Content Adaptation | #4 (nội dung đa kênh) |

→ M02 **không còn hạng mục mới**: cả 16 hạng mục đã có công cụ.

## M03 Quảng bá sản phẩm
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Digital Catalog · E-Catalog · Product Collection | #9 · #14 |
| 1 | Product Price List | MỚI (sở hữu ở M03; M06 trỏ về) |
| 1 | Voucher Generator | APP: Cài đặt → Ưu đãi (một phần) · phát mã giảm giá → MỚI |
| 2 | Poster · Flyer | #5 |
| 2 | Brochure | #3 · #14 (thẻ chào = brochure trong mã) |
| 2 | Lookbook | #9 (kiểu trình bày "lookbook" của catalog) |
| 2 | Promotional Campaign | #22 |
| 2 | Social Media Publishing | #22 + APP: /ket-noi |
| 2 | Campaign Landing Page | #22 (trang đích trong bộ chiến dịch) |
| 3 | Social Media Scheduler | #22 (/lich-dang) |
| 3 | Marketing Campaign Automation · Automated Content Distribution · Campaign Optimization | MỚI (3) |
| 3 | AI Marketing Planner | #49 (một phần) |

## M04 Thu hút khách hàng
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Store Website · Store Landing Page | #8 |
| 1 | Product Landing Page · Sales Link | #13 |
| 1 | QR Code Generator | #12 |
| 1 | Google Business Profile Integration | MỚI |
| 2 | Facebook · Instagram · TikTok · Zalo OA Integration | APP: /ket-noi (một phần, qua SocialFlow) |
| 2 | Facebook Ads · Google Ads Integration | MỚI (2) |
| 2 | SEO Tools | MỚI |
| 2 | Customer Lead Form | #21 |
| 3 | Marketing Automation | (trùng M03 — giữ ở M03) |
| 3 | Lead Tracking | #21 (một phần — theo dõi nguồn) |
| 3 | Multi-channel Integration | APP: /ket-noi |
| 3 | Conversion Tracking | #12 · #25 (một phần — thống kê lượt quét) |
| 3 | AI Lead Generation · Lead Scoring | MỚI (2) |

## M05 Tư vấn khách hàng
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Customer Inquiry Form | #17 · #24 |
| 1 | Product Catalog Access | #14 |
| 1 | Customer Information · Customer Notes | APP: /khach-hang (CRM & Khách hàng) |
| 1 | Basic Chat/Inbox Management | APP: /tin-nhan |
| 2 | CRM | APP: /khach-hang (sở hữu ở M05; M09 trỏ về) |
| 2 | Customer Segmentation | #27 + APP: /khach-hang (sở hữu ở M10) |
| 2 | Multi-channel Inbox | APP: /tin-nhan (một phần) |
| 2 | Product Recommendation | #30 |
| 2 | Customer Interaction History | APP: /hoi-thoai, /tin-nhan (một phần) |
| 3 | AI Sales Assistant · AI Chatbot | APP: /hoi-thoai (AI Chat & Tư vấn bán hàng) |
| 3 | AI Product Recommendation | #30 |
| 3 | Automated Follow-up | #27 · #28 |
| 3 | AI Customer Intent Recognition | MỚI (đã có bóc tách đơn từ chat — một phần) |

## M06 Báo giá
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Quotation Generator | #15 + APP: /bao-gia |
| 1 | Product Price List | (trùng M03) |
| 1 | Quotation Templates | #46 (một phần — mẫu cho chuỗi) |
| 1 | Basic Price Calculator | #33 · #34 |
| 2 | Custom Quotation · Quotation Sharing | #15 |
| 2 | Product Customizer | MỚI |
| 2 | Event Proposal Generator | #16 |
| 2 | Promotion & Discount Management | APP: Cài đặt → Ưu đãi |
| 3 | Dynamic Pricing | #34 (một phần) |
| 3 | AI Quotation Assistant · AI Product Configuration · Automated Quotation Follow-up · Quotation Analytics | MỚI (4) |

## M07 Đơn hàng
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Online Order Form | #17 |
| 1 | Sales Link | (trùng M04 → #13) |
| 1 | QR Order | #12 · #25 (một phần) |
| 1 | Shopping Cart | MỚI |
| 1 | Order Management | APP: /don-hang + #41 |
| 1 | Order Confirmation | #20 |
| 2 | Product Customization | #17 |
| 2 | Scheduled Delivery | #19 · #40 |
| 2 | Order Tracking · Order Status Notification | #41 |
| 2 | Order Management Workflow | #36–#40 |
| 3 | AI Order Assistant | APP: /don-hang "tạo đơn từ chat" (một phần) |
| 3 | Order Exception Detection | #41 (một phần — cảnh báo trễ) |
| 3 | Intelligent Order Routing | APP: /dieu-phoi (một phần) |
| 3 | Automated Order Processing · Multi-channel Order Integration | MỚI (2) |

## M08 Thanh toán
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | QR Payment · Payment Instructions | #20 (một phần) |
| 1 | Payment Status Management · Payment Records | APP: /don-hang (xác nhận thanh toán, chứng từ chuyển khoản) |
| 2 | Deposit Payment | #20 + APP: Cài đặt → Thanh toán & đặt cọc |
| 2 | Partial Payment · Payment Confirmation | APP: /don-hang (một phần) |
| 2 | Payment Gateway Integration · Refund Management | MỚI (2) |
| 3 | Payment Exception Detection | APP: kiểm chứng từ thanh toán bằng AI (một phần) |
| 3 | Automated Bank Reconciliation · Automated Payment Reminder · Automated Refund Workflow · Payment Analytics | MỚI (4) |

## M09 Chăm sóc khách hàng
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Customer Database | (trùng M05 → APP: /khach-hang) |
| 1 | Thank You Card | #7 · #26 |
| 1 | Customer Feedback Form | #24 |
| 1 | Order Status Notification | (trùng M07 → #41) |
| 1 | Customer Support Information | #11 |
| 2 | CRM | (trùng M05) |
| 2 | Customer Support Inbox | APP: /tin-nhan |
| 2 | Loyalty Program · Membership Management | #29 (sở hữu ở M10) |
| 2 | Customer Satisfaction Survey | #24 |
| 2 | Review Collection | MỚI |
| 3 | Automated Customer Care · Customer Retention Automation | #27 |
| 3 | AI Customer Support | APP: /hoi-thoai |
| 3 | Customer Satisfaction Analytics · Complaint Classification | MỚI (2) |

## M10 Tăng trưởng khách hàng
| GĐ | Hạng mục | Kết luận |
|---|---|---|
| 1 | Customer Purchase History · Customer Notes | APP: /khach-hang (cần kiểm) |
| 1 | Customer Birthday · Customer Anniversary | #28 |
| 1 | Basic Customer Reports | APP: /so-lieu |
| 2 | Referral Program | #23 |
| 2 | Customer Loyalty Program | #29 |
| 2 | Voucher Campaign · Customer Segmentation | #27 |
| 2 | Email · SMS · Zalo Marketing | #27 (một phần — kênh gửi; SMS/Zalo đang là khung chờ) |
| 3 | Automated Re-engagement | #27 |
| 3 | AI Customer Insights | APP: /so-lieu · #50 (một phần) |
| 3 | Predictive Purchase · Personalized Marketing · Customer Lifetime Value Analytics · Churn Prediction | MỚI (4) |

## Tổng hợp
Tổng cộng khoảng 150 hạng mục trong tài liệu:
- **≈ 75** trùng hoặc nằm trong 51 công cụ (một phần hoặc trọn) → bỏ khỏi lộ trình.
- **≈ 25** đã có trang trong app ngoài 51 công cụ (12 trang: Hồ sơ tiệm, Kho mẫu, Sản phẩm, Kết nối kênh, Khách hàng, Tin nhắn, Trợ lý tư vấn AI, Báo giá, Đơn hàng, Điều phối, Ưu đãi và thanh toán/đặt cọc trong Cài đặt, Số liệu).
- **≈ 12** lặp giữa các module trong chính tài liệu.
- **≈ 40** thật sự mới → giữ trong lộ trình.

So với lộ trình đang ở nhánh `feat/toolkit-growth-modules` (≈150 hạng mục "sẽ phát triển"), phần mới chỉ còn khoảng 40.
