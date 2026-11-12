# ALG CORE — ROLE & CAPABILITY ARCHITECTURE
## Upgrade Specification

**Ngày:** 30/09/2026  
**Mục tiêu:** Chuẩn hóa kiến trúc Role UX, Scope và Capability của FloraOS Core theo mô hình 3 tầng: Platform Admin, Store Admin và Điện hoa Admin.

---

## 1. MỤC TIÊU NÂNG CẤP

FloraOS Core cần chuyển từ mô hình:

- PLATFORM
- ONE_STORE
- CHAIN

sang mô hình:

- PLATFORM
- STORE
- FLOWER_NETWORK

Ba vai trò cấp cao có nhiệm vụ khác nhau:

1. **Platform Admin** — quản trị và kiểm soát toàn bộ nền tảng FloraOS.
2. **Store Admin** — trực tiếp vận hành và phát triển một cửa hàng hoa.
3. **Điện hoa Admin** — trực tiếp vận hành, giám sát, quản lý và điều hành toàn bộ hệ thống điện hoa.

### Nguyên tắc quan trọng

**Điện hoa Admin không phải là Chain Admin đổi tên.**

Điện hoa Admin là một kiến trúc nghiệp vụ mới, được thiết kế cho mô hình kinh doanh điện hoa và mạng lưới vận hành điện hoa.

---

# 2. KIẾN TRÚC ROLE TỔNG THỂ

Mô hình nên được tổ chức theo:

```text
USER
  ↓
SCOPE
  ↓
ROLE
  ↓
CAPABILITIES
  ↓
ACTION
```

Có thể bổ sung thêm một lớp:

```text
FEATURE ENTITLEMENT
```

để tách hai khái niệm:

- **Role / Capability:** người dùng có được phép thực hiện chức năng hay không.
- **Entitlement:** gói dịch vụ của tài khoản có bao gồm chức năng đó hay không.

Không sử dụng tên Role đơn thuần để quyết định quyền truy cập.

---

# 3. BA ROLE CẤP CAO

## 3.1. PLATFORM ADMIN

### Tên hiển thị

**Quản trị nền tảng**

### Role key đề xuất

```text
platform_admin
```

### Scope

```text
PLATFORM
```

### Mục đích

Quản lý và kiểm soát FloraOS với tư cách là một nền tảng SaaS.

### Trách nhiệm chính

- Theo dõi tình trạng vận hành của nền tảng.
- Quản lý tài khoản và tổ chức sử dụng FloraOS.
- Theo dõi mức sử dụng hệ thống.
- Theo dõi AI và tài nguyên hệ thống.
- Quản lý gói dịch vụ và mức sử dụng.
- Quản lý cấu hình nền tảng.
- Quản lý tích hợp hệ thống.
- Quản lý bảo mật và governance.
- Theo dõi lỗi và sự cố hệ thống.
- Xem báo cáo toàn nền tảng.

### Nguyên tắc

Platform Admin **không mặc định có toàn bộ quyền vận hành nghiệp vụ của cửa hàng hoặc hệ thống điện hoa**.

Nếu cần hỗ trợ hoặc truy cập thay người dùng, phải sử dụng cơ chế hỗ trợ/impersonation/break-glass riêng và phải được audit.

### Dashboard

**Platform Control Center**

Câu hỏi trung tâm:

> FloraOS đang vận hành và tăng trưởng như thế nào?

### Nhóm thông tin chính

- Sức khỏe hệ thống.
- Số lượng cửa hàng.
- Người dùng.
- Mức sử dụng.
- AI usage.
- Subscription.
- Doanh thu nền tảng.
- Tăng trưởng.
- Lỗi và cảnh báo.
- Báo cáo.
- Cài đặt nền tảng.

---

# 4. STORE ADMIN

## 4.1. Tên hiển thị

**Quản trị cửa hàng**

Có thể hiển thị theo ngữ cảnh là:

**Chủ cửa hàng**

### Role key đề xuất

```text
store_admin
```

Nếu code hiện tại đang sử dụng:

```text
store_manager
```

thì AI Agent phải kiểm tra toàn bộ codebase trước khi đổi tên.

Không được rename trực tiếp nếu chưa kiểm tra:

- Database.
- Authentication.
- RBAC.
- Middleware.
- Route guard.
- Capability mapping.
- API.
- UI.
- Tests.
- Seed data.
- Documentation.

### Scope

```text
STORE
```

### Mục đích

Store Admin là người có khả năng **trực tiếp sử dụng toàn bộ năng lực FloraOS để vận hành và phát triển một cửa hàng hoa**.

Đây không chỉ là vai trò quản lý vận hành cửa hàng truyền thống.

FloraOS Core tập trung vào:

- Digital presence.
- Product intelligence.
- Content.
- Marketing.
- Sales.
- CRM.
- AI.
- Growth.

---

# 5. STORE ADMIN — NHÓM CAPABILITY

## 5.1. Market Intelligence

Store Admin có thể:

- Nghiên cứu thị trường.
- Nghiên cứu xu hướng hoa.
- Phân tích khách hàng.
- Phân tích đối thủ.
- Phân tích nhu cầu.
- Xác định cơ hội kinh doanh.
- Theo dõi xu hướng nội dung.
- Nhận đề xuất cơ hội tăng trưởng từ AI.

---

## 5.2. Product Intelligence

Store Admin có thể:

- Tạo sản phẩm.
- Phân tích ảnh sản phẩm.
- Nhận diện hoa.
- Nhận diện phụ kiện.
- Đếm thành phần.
- Chuẩn hóa tên sản phẩm.
- Tạo mô tả sản phẩm.
- Tạo thông tin sản phẩm.
- Tính giá.
- Tạo báo giá.
- Quản lý catalog.
- Chuẩn hóa hình ảnh sản phẩm.

---

## 5.3. Digital Platform

Store Admin có thể:

- Tạo landing page.
- Quản lý website.
- Quản lý Facebook.
- Quản lý Instagram.
- Quản lý TikTok.
- Kết nối các kênh.
- Quản lý digital presence.
- Quản lý thông tin thương hiệu.
- Đồng bộ nội dung giữa các kênh.

---

## 5.4. Content & Creative

Store Admin có thể:

- Tạo bài viết.
- Tạo caption.
- Tạo hình ảnh.
- Tạo video.
- Chỉnh sửa nội dung.
- Quản lý thư viện media.
- Lập lịch nội dung.
- Phê duyệt nội dung.
- Xuất bản nội dung.
- Tái sử dụng nội dung.

---

## 5.5. Marketing & Advertising

Store Admin có thể:

- Tạo chiến dịch.
- Quản lý quảng cáo.
- Xác định đối tượng.
- Thiết lập ngân sách.
- Theo dõi hiệu quả.
- Tối ưu chiến dịch.
- Theo dõi chi phí.
- Phân tích kết quả.

---

## 5.6. AI Sales

Store Admin có thể:

- Cấu hình chatbot.
- Quản lý hội thoại.
- Theo dõi AI sales.
- Tạo đề xuất sản phẩm.
- Hỗ trợ báo giá.
- Hỗ trợ tư vấn khách hàng.
- Theo dõi chuyển đổi.
- Tự động hóa follow-up.

---

## 5.7. Sales

Store Admin có thể sử dụng các năng lực của Sales:

- Quản lý lead.
- Quản lý cơ hội.
- Quản lý pipeline.
- Theo dõi báo giá.
- Theo dõi đơn hàng.
- Theo dõi chuyển đổi.
- Theo dõi doanh số.
- Follow-up khách hàng.

---

## 5.8. CRM & Customer Service

Store Admin có thể:

- Quản lý khách hàng.
- Xem lịch sử khách hàng.
- Theo dõi vòng đời khách hàng.
- Quản lý hội thoại.
- Chăm sóc khách hàng.
- Theo dõi khiếu nại.
- Theo dõi follow-up.
- Phân tích hành vi khách hàng.

---

## 5.9. Store Administration

Store Admin có thể:

- Quản lý thông tin cửa hàng.
- Quản lý thương hiệu.
- Quản lý nhân viên.
- Mời người dùng.
- Phân quyền.
- Quản lý gói dịch vụ.
- Theo dõi billing.
- Theo dõi AI credits.
- Quản lý integrations.
- Quản lý thiết lập cửa hàng.

---

# 6. STORE ADMIN DASHBOARD

### Tên đề xuất

**Store Growth Center**

### Câu hỏi trung tâm

> Tôi cần làm gì để cửa hàng phát triển?

Dashboard nên tập trung vào:

- Cơ hội thị trường.
- Sản phẩm.
- Giá và báo giá.
- Digital presence.
- Nội dung.
- Hình ảnh.
- Video.
- Marketing.
- Quảng cáo.
- Chatbot.
- Sales.
- CRM.
- AI.
- Tăng trưởng.

Không nên biến Store Admin Dashboard thành một dashboard POS/ERP truyền thống nếu các chức năng đó chưa thuộc phạm vi FloraOS Core.

---

# 7. ĐIỆN HOA ADMIN

## 7.1. Tên hiển thị

**Điện hoa Admin**

### Role key đề xuất

```text
flower_network_admin
```

Tên code thực tế cần được kiểm tra với naming convention hiện tại của codebase.

### Scope

```text
FLOWER_NETWORK
```

---

# 8. ĐỊNH NGHĨA ĐIỆN HOA ADMIN

Điện hoa Admin là **siêu vai trò vận hành toàn bộ hệ thống điện hoa**.

Điện hoa Admin không chỉ:

- Xem báo cáo.
- Cài đặt.
- Quản lý nhiều cửa hàng.

Điện hoa Admin phải có khả năng:

1. Thực thi.
2. Giám sát.
3. Quản lý.
4. Điều hành.

trên toàn bộ hệ thống điện hoa.

---

# 9. ĐIỆN HOA ADMIN — TOÀN BỘ CAPABILITY NGHIỆP VỤ

Điện hoa Admin phải bao gồm các năng lực của các vai trò chuyên môn liên quan.

## 9.1. Sales

- Lead.
- Pipeline.
- Cơ hội.
- Báo giá.
- Đơn hàng.
- Doanh số.
- Chuyển đổi.
- Follow-up.

## 9.2. CRM

- Khách hàng.
- Phân nhóm khách hàng.
- Vòng đời khách hàng.
- Lịch sử tương tác.
- Chăm sóc.
- Follow-up.
- Phân tích khách hàng.

## 9.3. Customer Service

- Hội thoại.
- Tiếp nhận yêu cầu.
- Xử lý yêu cầu.
- Khiếu nại.
- Chăm sóc.
- Theo dõi SLA.

## 9.4. Coordinator

- Điều phối đơn hàng.
- Điều phối thực hiện.
- Theo dõi trạng thái.
- Xử lý ngoại lệ.
- Điều chuyển.
- Ưu tiên đơn hàng.
- Theo dõi SLA.

## 9.5. Partner Management

- Quản lý đối tác.
- Onboarding.
- Phân loại đối tác.
- Đánh giá chất lượng.
- Theo dõi hiệu suất.
- Quản lý SLA.
- Quản lý chính sách đối tác.

## 9.6. Product Management

- Quản lý sản phẩm.
- Chuẩn hóa sản phẩm.
- Catalog.
- Giá.
- Quy chuẩn sản phẩm.
- Phê duyệt sản phẩm.

## 9.7. Marketing

- Chiến dịch.
- Nội dung.
- Hình ảnh.
- Video.
- Quảng cáo.
- Kênh truyền thông.
- Hiệu quả marketing.

## 9.8. Finance & Accounting

- Doanh thu.
- Chi phí.
- Công nợ.
- Đối soát.
- Thanh toán.
- Hoa hồng.
- Báo cáo tài chính nghiệp vụ.

## 9.9. Quality Control

- Tiêu chuẩn chất lượng.
- Kiểm tra.
- Đánh giá.
- Khiếu nại chất lượng.
- Theo dõi tỷ lệ lỗi.
- Quản lý corrective action.

## 9.10. Florist / Fulfillment

- Theo dõi thực hiện đơn.
- Theo dõi florist.
- Theo dõi tiến độ.
- Theo dõi chất lượng thực hiện.
- Xử lý ngoại lệ.

---

# 10. BỐN LỚP NĂNG LỰC CỦA ĐIỆN HOA ADMIN

## Lớp 1 — Execution

Có thể trực tiếp thực hiện các nghiệp vụ.

Ví dụ:

- Tạo đơn.
- Xử lý lead.
- Điều phối đơn.
- Cập nhật khách hàng.
- Tạo báo giá.
- Xử lý đối tác.
- Tạo chiến dịch.

---

## Lớp 2 — Supervision

Có thể giám sát toàn bộ hoạt động.

Ví dụ:

- Theo dõi sales.
- Theo dõi CRM.
- Theo dõi CSKH.
- Theo dõi điều phối.
- Theo dõi đối tác.
- Theo dõi chất lượng.
- Theo dõi tài chính.
- Theo dõi hiệu suất.

---

## Lớp 3 — Management

Có thể quản lý nguồn lực và hoạt động.

Ví dụ:

- Phân công.
- Điều chuyển.
- Phê duyệt.
- Ưu tiên.
- Thiết lập SLA.
- Quản lý hiệu suất.
- Quản lý đối tác.
- Quản lý chính sách.

---

## Lớp 4 — Command

Có thể điều hành và xử lý các tình huống cấp hệ thống.

Ví dụ:

- Xử lý ngoại lệ.
- Điều chuyển đơn khẩn cấp.
- Thay đổi kế hoạch thực hiện.
- Ưu tiên đơn hàng.
- Phê duyệt quyết định quan trọng.
- Thay đổi chính sách nghiệp vụ.
- Điều hành hoạt động toàn mạng lưới.

---

# 11. ĐIỆN HOA ADMIN — DASHBOARD

### Tên đề xuất

**Flower Network Command Center**

Tên hiển thị tiếng Việt:

**Trung tâm điều hành điện hoa**

### Câu hỏi trung tâm

> Toàn bộ hệ thống điện hoa đang hoạt động thế nào và tôi cần can thiệp ở đâu?

Dashboard cần ưu tiên:

- Đơn hàng.
- Doanh số.
- CRM.
- CSKH.
- Điều phối.
- Đối tác.
- Chất lượng.
- Tài chính.
- Hiệu suất.
- Ngoại lệ.
- Công việc cần can thiệp.
- Báo cáo.
- Quản lý.
- Cài đặt.

---

# 12. CÁC ROLE CHUYÊN MÔN KHÔNG BỊ XÓA

Các role chuyên môn hiện tại vẫn phải được giữ.

Ví dụ:

```text
sales
crm
lead_marketing
coordinator
customer_service
quality_control
partner_manager
marketing
product_manager
finance_accounting
florist
```

Các role này đại diện cho **chuyên môn / workspace / capability chuyên biệt**.

Không coi chúng là các top-level business role cạnh tranh với Store Admin hoặc Điện hoa Admin.

Mô hình nên là:

```text
Platform Admin
    ↓
Platform capabilities

Store Admin
    ↓
Store capabilities
    ├── Sales
    ├── CRM
    ├── Marketing
    ├── Product
    ├── Customer Service
    ├── AI
    └── Digital Growth

Điện hoa Admin
    ↓
Flower Network capabilities
    ├── Sales
    ├── CRM
    ├── Customer Service
    ├── Coordinator
    ├── Partner
    ├── Product
    ├── Marketing
    ├── Finance
    ├── Quality
    └── Florist
```

---

# 13. KIẾN TRÚC SCOPE ĐỀ XUẤT

## Platform

```text
PLATFORM
```

Dành cho:

```text
platform_admin
```

## Store

```text
STORE
```

Dành cho:

```text
store_admin
sales
crm
lead_marketing
florist
```

và các role chuyên môn khác thuộc phạm vi một cửa hàng.

## Flower Network

```text
FLOWER_NETWORK
```

Dành cho:

```text
flower_network_admin
ceo
manager
coordinator
customer_service
partner_manager
marketing
product_manager
finance_accounting
quality_control
florist
```

Danh sách chính xác cần được kiểm tra với business model và data model thực tế trong codebase.

---

# 14. RBAC NGUYÊN TẮC

Không dùng:

```text
if role === "store_admin"
```

làm cơ chế phân quyền duy nhất.

Nên kiểm tra:

```text
role
→ scope
→ capability
→ action
→ resource
```

Ví dụ:

```text
STORE
  → product_management
  → product.update
  → product:123
```

Hoặc:

```text
FLOWER_NETWORK
  → order_management
  → order.reassign
  → order:123
```

Role UX chỉ xác định trải nghiệm và nhóm quyền.

Capability mới là lớp thực thi quyền.

---

# 15. PHÂN BIỆT ROLE VÀ FEATURE ENTITLEMENT

Cần tách:

### Authorization

Người dùng có được phép làm hay không?

### Entitlement

Tài khoản có được sử dụng chức năng đó theo gói dịch vụ hay không?

Ví dụ:

```text
User
  ↓
Role = store_admin
  ↓
Capability = ai_video_create
  ↓
Plan entitlement = TRUE
  ↓
Allow
```

Nếu:

```text
Role = store_admin
Capability = ai_video_create
Plan entitlement = FALSE
```

thì không được thực thi tính năng.

---

# 16. MIGRATION TỪ CHAIN ADMIN

Đây là migration kiến trúc nghiệp vụ, không phải đổi tên.

Không được chỉ thực hiện:

```text
chain_admin
→ flower_network_admin
```

Cần kiểm tra và cập nhật:

- Role definition.
- Scope.
- Capability mapping.
- Navigation.
- Dashboard.
- Homepage.
- Permission checks.
- Data scope.
- Reports.
- Settings.
- Routes.
- Components.
- API.
- Middleware.
- Tests.
- Seed data.
- Documentation.
- UI terminology.

---

# 17. MIGRATION CHECKLIST

## 17.1. Backend

Kiểm tra:

- Role enum.
- Scope enum.
- Capability registry.
- Permission middleware.
- Authorization service.
- API guards.
- Tenant isolation.
- Data access.
- Audit log.
- Seed data.

---

## 17.2. Frontend

Kiểm tra:

- Route guard.
- Sidebar.
- Navigation.
- Dashboard.
- Workspace.
- Breadcrumb.
- Page title.
- Role switcher.
- Empty state.
- Permission state.
- Forbidden state.
- Terminology.

---

## 17.3. Database

Kiểm tra:

- Role records.
- User-role mapping.
- Scope mapping.
- Capability mapping.
- Tenant/store/network mapping.
- Migration scripts.
- Existing users.

---

## 17.4. Functional modules

Kiểm tra việc Điện hoa Admin có thể truy cập đúng:

- Sales.
- CRM.
- CSKH.
- Điều phối.
- Đối tác.
- Product.
- Marketing.
- Finance.
- Quality.
- Florist.
- Orders.

---

# 18. NGUYÊN TẮC DATA SCOPE

Điện hoa Admin có quyền ở cấp:

```text
FLOWER_NETWORK
```

nhưng không có nghĩa là mọi API đều được phép truy cập mọi dữ liệu không giới hạn.

Cần kiểm tra:

```text
User
→ Role
→ Scope
→ Network
→ Store / Partner / Order / Customer
→ Resource
```

Mọi truy cập phải được giới hạn theo network/tenant thực tế.

---

# 19. NAVIGATION ĐỀ XUẤT

## Platform Admin

```text
Tổng quan
Cửa hàng
Người dùng
AI & Sử dụng
Gói dịch vụ
Báo cáo
Hệ thống
Cài đặt
```

---

## Store Admin

```text
Tổng quan
Thị trường
Sản phẩm
Báo giá
Digital
Nội dung
Hình ảnh
Video
Marketing
Quảng cáo
Bán hàng
Khách hàng
Hội thoại
AI
Báo cáo
Cài đặt
```

---

## Điện hoa Admin

```text
Tổng quan
Đơn hàng
Bán hàng
Khách hàng
Hội thoại
Điều phối
Đối tác
Sản phẩm
Marketing
Chất lượng
Florist
Tài chính
Báo cáo
Quản lý
Cài đặt
```

Navigation thực tế cần được điều chỉnh theo các module đã tồn tại trong codebase.

---

# 20. DASHBOARD DESIGN PRINCIPLE

## Platform Admin

### Câu hỏi

> FloraOS đang vận hành và tăng trưởng như thế nào?

### Trọng tâm

- Platform health.
- Tenants.
- Users.
- Usage.
- AI.
- Subscription.
- Revenue.
- System.
- Security.

---

## Store Admin

### Câu hỏi

> Tôi cần làm gì để cửa hàng phát triển?

### Trọng tâm

- Market opportunity.
- Product.
- Pricing.
- Digital presence.
- Content.
- Marketing.
- Sales.
- CRM.
- AI.
- Growth.

---

## Điện hoa Admin

### Câu hỏi

> Toàn bộ hệ thống điện hoa đang hoạt động thế nào và tôi cần can thiệp ở đâu?

### Trọng tâm

- Orders.
- Sales.
- CRM.
- CSKH.
- Dispatch.
- Partners.
- Quality.
- Finance.
- Performance.
- Exceptions.
- Management.

---

# 21. KHÔNG ĐƯỢC LÀM

AI Agent khi triển khai kiến trúc này không được:

1. Xóa các role chuyên môn hiện có chỉ vì xuất hiện Store Admin hoặc Điện hoa Admin.
2. Xóa capability hiện có nếu chưa xác định rõ capability thay thế.
3. Đổi tên `chain_admin` mà không thực hiện migration đầy đủ.
4. Coi Điện hoa Admin chỉ là Chain Admin nhiều chi nhánh.
5. Cho Platform Admin toàn quyền nghiệp vụ tenant mặc định.
6. Dùng role name làm cơ chế authorization duy nhất.
7. Bỏ qua data scope.
8. Bỏ qua tenant isolation.
9. Chỉ sửa UI nhưng không sửa backend authorization.
10. Chỉ sửa backend nhưng không cập nhật UX.
11. Làm mất các route hoặc workspace đang hoạt động.
12. Thay đổi business logic ngoài phạm vi kiến trúc role nếu chưa có yêu cầu.

---

# 22. DEFINITION OF DONE

Kiến trúc mới được coi là hoàn thành khi:

- [ ] Có đúng 3 top-level business roles.
- [ ] Platform Admin hoạt động độc lập ở scope PLATFORM.
- [ ] Store Admin hoạt động ở scope STORE.
- [ ] Điện hoa Admin hoạt động ở scope FLOWER_NETWORK.
- [ ] Điện hoa Admin bao gồm các capability nghiệp vụ cần thiết.
- [ ] Các role chuyên môn vẫn tồn tại.
- [ ] Capability không bị mất.
- [ ] Permission được kiểm tra bằng capability.
- [ ] Data scope được kiểm soát.
- [ ] Tenant isolation vẫn hoạt động.
- [ ] Navigation đúng theo role.
- [ ] Dashboard đúng theo mục tiêu role.
- [ ] Reports đúng theo scope.
- [ ] Settings đúng theo scope.
- [ ] Route guard đúng.
- [ ] API authorization đúng.
- [ ] Database mapping đúng.
- [ ] Migration không làm mất dữ liệu.
- [ ] Test RBAC đạt.
- [ ] Test scope đạt.
- [ ] Test tenant isolation đạt.
- [ ] UI không còn thuật ngữ Chain Admin nếu kiến trúc mới không sử dụng thuật ngữ này.
- [ ] Documentation được cập nhật.

---

# 23. KẾT LUẬN KIẾN TRÚC

FloraOS Core nên được hiểu theo ba tầng:

```text
┌─────────────────────────────────────┐
│          PLATFORM ADMIN             │
│       Quản trị nền tảng            │
│                                     │
│  Quản trị FloraOS SaaS              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│            STORE ADMIN               │
│        Quản trị cửa hàng             │
│                                     │
│  Vận hành + Phát triển 1 cửa hàng   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│        ĐIỆN HOA ADMIN                │
│      Trung tâm điều hành điện hoa    │
│                                     │
│  Thực thi + Giám sát + Quản lý      │
│  + Điều hành toàn hệ thống           │
└─────────────────────────────────────┘
```

Bên dưới ba role cấp cao vẫn duy trì các role chuyên môn.

Mục tiêu là:

```text
Top-level Role
      ↓
Business Scope
      ↓
Functional Capabilities
      ↓
Specialist Workspaces
      ↓
Actions
```

Điều này giúp FloraOS vừa đơn giản đối với người dùng quản trị cấp cao, vừa giữ được cấu trúc chuyên môn đủ sâu cho từng nghiệp vụ.

---

## 24. HƯỚNG TRIỂN KHAI CHO AI AGENT

AI Agent phải thực hiện theo thứ tự:

### Bước 1 — Audit

Quét codebase để xác định:

- Role hiện tại.
- Scope hiện tại.
- Capability hiện tại.
- Route.
- Workspace.
- Dashboard.
- Middleware.
- API guard.
- Database mapping.
- Test.

### Bước 2 — Mapping

Tạo mapping:

```text
CURRENT ROLE
→ NEW TOP-LEVEL ROLE
→ FUNCTIONAL ROLE
→ SCOPE
→ CAPABILITY
```

### Bước 3 — Architecture

Thiết kế:

- Role.
- Scope.
- Capability.
- Navigation.
- Dashboard.
- Data scope.

### Bước 4 — Backend

Cập nhật:

- Enum.
- RBAC.
- Capability.
- Authorization.
- Scope.
- API.
- Database migration.

### Bước 5 — Frontend

Cập nhật:

- Navigation.
- Dashboard.
- Workspace.
- Route guard.
- Terminology.
- Role-specific UX.

### Bước 6 — Test

Kiểm tra:

- Authentication.
- Authorization.
- Scope.
- Tenant isolation.
- Role switching.
- Route access.
- API access.
- Data access.

### Bước 7 — Regression

Đảm bảo:

- Không mất chức năng hiện có.
- Không mất dữ liệu.
- Không phá vỡ các role chuyên môn.
- Không phá vỡ các workspace đang hoạt động.

### Bước 8 — Documentation

Cập nhật:

- Role catalog.
- RBAC.
- Capability matrix.
- Navigation map.
- Dashboard specification.
- Data scope.
- Migration notes.

---

# 25. NGUYÊN TẮC CUỐI CÙNG

**Platform Admin quản trị nền tảng.**

**Store Admin vận hành và phát triển một cửa hàng.**

**Điện hoa Admin vận hành, giám sát, quản lý và điều hành toàn bộ hệ thống điện hoa.**

Các role chuyên môn không bị loại bỏ.

Chúng trở thành các năng lực chuyên môn được tổ chức bên dưới các role cấp cao.

Đây là kiến trúc cần được dùng làm nền tảng cho toàn bộ thiết kế UX, RBAC, Capability, Navigation, Dashboard, API và Data Scope của FloraOS Core.
