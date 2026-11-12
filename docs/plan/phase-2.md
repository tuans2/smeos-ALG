# Giai đoạn 2 — Kế hoạch Nâng cấp Toàn diện Kiến trúc Repositories (38 Modules)

> **Mục tiêu**: Chuyển đổi toàn bộ 38 modules của `ALG` sang kiến trúc **Clean Architecture / Hexagonal Ports & Adapters** một cách an toàn, tuyệt đối không làm gián đoạn các tính năng đang vận hành.
> **Trọng tâm Đợt 1**: Hoàn thiện 100% cho 4 module nghiệp vụ cốt lõi trước, sau đó mở rộng tuần tự theo 4 Wave.

---

## 1. NGUYÊN TẮC BẤT BIẾN CỦA KIẾN TRÚC REPOSITORY (SSOT)

Mỗi module khi hoàn thành chuyển đổi phải tuân thủ nghiêm ngặt 4 nguyên tắc:
1. **Domain Purity (Zero ORM)**: Thư mục `domain/` tuyệt đối không import `@prisma/client` hay bất kỳ thư viện CSDL nào.
2. **Repository Port Interface**: Mọi thao tác đọc/ghi CSDL phải thông qua Interface đặt tại:
   `src/modules/<module-name>/domain/repositories/<entity>-repository.interface.ts`
3. **Infra Adapter**: Hiện thực hóa interface đặt tại:
   `src/modules/<module-name>/infra/repositories/prisma-<entity>-repository.ts`
4. **Boundary Isolation (REQ-ARCH-006)**: Cấm module A gọi trực tiếp Prisma client để đọc/ghi bảng thuộc quyền sở hữu của module B. Mọi giao tiếp liên module phải đi qua Service/Port công khai hoặc Event.

---

## 2. LỘ TRÌNH 4 WAVE CHUYỂN ĐỔI AN TOÀN TOÀN BỘ 38 MODULES

```
[ WAVE 1: 4 MODULE CỐT LÕI ]          [ WAVE 2: BÁN LẺ & TRẢI NGHIỆM ]
orders, coordinator,                 products, greeting-card, crm,
chain-partnership, organization  --> availability, catalog-links,
(Dứt điểm điểm nghẽn chính)          landing-page (6 modules)
              │
              ▼
[ WAVE 3: CREATIVE & MEDIA SUITE ]    [ WAVE 4: HẠ TẦNG & VẬN HÀNH ]
creative-production, studio, media,  internal-chat, content-engine,
assets, storage, copies, banner... -> platform, jobs, usage, templates,
(10 modules - Hóa giải circulars)    market-intel... (18 modules - Đạt 100%)
```

---

## 3. CHI TIẾT WAVE 1 — TRỌNG TÂM 4 MODULE NGHIỆP VỤ CỐT LÕI

Wave 1 tập trung giải quyết dứt điểm **Hotspot 1** và **Hotspot 2** (nguồn gốc của 80% xung đột dữ liệu hiện tại):

### 3.1. Module `orders` (Store OS — Quản lý Đơn hàng Tiệm)
- **Bảng sở hữu**: `orders`, `order_items`, `order_assignments`, `order_events`.
- **Repository cần xây dựng**:
  - `IOrderRepository`: `findById()`, `findByCode()`, `listByOrganization()`, `create()`, `updateStatus()`, `save()`.
  - `IOrderItemRepository`: Thao tác cấu phần đơn hàng.
  - `IOrderEventRepository`: Ghi nhật ký tiến trình đơn (Audit timeline).
- **Trách nhiệm**: Là System of Record duy nhất cho đơn hàng tiệm. Khóa chặn không cho `coordinator` gọi `prisma.orders.update` trực tiếp.

### 3.2. Module `coordinator` (Chain OS — Mạng lưới Điều phối Chuỗi)
- **Bảng sở hữu**: `partners`, `order_coordinations`, `order_payments`, `order_info_requests`, `order_change_requests`, `order_qc_records`, `order_exceptions`.
- **Repository cần xây dựng**:
  - `IOrderCoordinationRepository`: Quản lý trạng thái điều phối, lịch sử claim đơn, snapshot tiến độ.
  - `IPartnerRepository`: Quản lý danh sách đối tác chuỗi và năng lực gia công.
  - `ISubcontractPaymentRepository`: Quản lý thanh toán hoa hồng và cọc gia công.
- **Ranh giới mới**: Khi `coordinator` cần thay đổi tiến độ gia công, module này cập nhật `order_coordinations` và phát sự kiện `coordination.status_changed` thay vì tự ý ghi đè vào bảng `orders`.

### 3.3. Module `chain-partnership` (Chain OS — Đối tác & Tài khoản Chuỗi)
- **Bảng sở hữu**: `chain_partnerships`.
- **Repository cần xây dựng**:
  - `IChainPartnershipRepository`: `findByTenantAndPartner()`, `listPartnerships()`, `createInvitation()`, `updateStatus()`.
- **Ranh giới**: Tách biệt rõ ràng quan hệ liên kết chuỗi và tài khoản đối tác được cấp, không lưu lộn xộn trong JSON của `organizations`.

### 3.4. Module `organization` (Core / Platform — Tổ chức, Chi nhánh, RBAC, Đa ngành)
- **Bảng sở hữu**: `organizations`, `workspaces`, `branches`, `memberships`, `roles`, `role_capabilities`, `capability_overrides`.
- **Repository cần xây dựng**:
  - `IOrganizationRepository`: Quản lý thông tin định danh tenant.
  - `IMembershipRepository`: Quản lý thành viên và quyền hạn.
  - `IBranchRepository`: Quản lý chi nhánh cửa hàng.
- **Ranh giới**: Ngăn chặn 9 module khác ghi tùy tiện vào bảng `organizations`.

---

## 4. KẾ HOẠCH HÀNH ĐỘNG CỤ THỂ CHO WAVE 1 (CHECKLIST NGHIỆM THU)

- [ ] **Bước 1.1**: Rà soát và lập bảng danh mục 100% câu lệnh Prisma query trong 4 module Wave 1.
- [ ] **Bước 1.2**: Định nghĩa Domain Entities và Port Interfaces chuẩn (`*.interface.ts`) tại `domain/repositories/` của từng module.
- [ ] **Bước 1.3**: Hiện thực hóa Prisma Repositories tại `infra/repositories/` của từng module.
- [ ] **Bước 1.4**: Thay thế dần các use-cases của Wave 1 sang inject Repository Interface, giữ nguyên vẹn logic nghiệp vụ và contract API.
- [ ] **Bước 1.5**: Kiểm chứng an toàn:
  - Chạy `npm run typecheck` đạt 0 lỗi compile.
  - Chạy `npm run test:tenant` đảm bảo cách ly dữ liệu xanh 100%.
  - Chạy các unit tests và integration tests liên quan.
- [ ] **Bước 1.6**: Commit & Push lên nhánh `Nangcap_kientrucREPOSITORIES`.

---

## 5. ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE - DOD)

Một Wave chỉ được coi là hoàn thành khi:
1. 100% câu lệnh query CSDL trong các module thuộc Wave đi qua Repository Interface.
2. Thư mục `domain/` của các module không còn bất kỳ import `@prisma/client` nào.
3. Toàn bộ test suite liên quan chạy thành công trên môi trường cục bộ.
4. Có báo cáo đối chiếu trước/sau chuyển đổi.
