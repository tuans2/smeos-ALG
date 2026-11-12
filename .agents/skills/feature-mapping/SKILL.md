---
name: feature-mapping
description: >-
  Quy chuẩn và quy trình khảo sát, đối chiếu mã nguồn thực tế và lập bản đồ tính năng
  (Feature Map) hoặc tài liệu đặc tả tính năng 100% chuẩn xác cho ALG. Kích hoạt
  khi agent khảo sát, tạo mới, kiểm tra, hoặc rà soát tính chính xác của tài liệu mô tả
  tính năng (cấu trúc 7 phần chuẩn hóa) đối chiếu với code trong src/app/, src/components/,
  src/modules/, src/lib/feature-lock.ts.
---

# Feature Mapping & Documentation — ALG

> Rà theo mã thật: 10/10/2026. Tuân thủ Hiến pháp tài liệu `docs/00-DOCUMENTATION-CONSTITUTION.md` (Level 4: Codebase as Implementation SSOT).

---

## 1. Tôn Chỉ Cốt Lõi (Core Principles)

1. **Mã nguồn là sự thật tối cao (Code as Ultimate Truth)**:
   - Tuyệt đối KHÔNG suy đoán component, tab, modal, hay quyền truy cập.
   - Trước khi viết hoặc sửa bất kỳ dòng tài liệu nào, bắt buộc phải đọc trực tiếp file `.tsx` / `.ts` trên đĩa.
2. **Tuân thủ chuẩn Feature Lock của Production**:
   - Luôn kiểm tra `src/lib/feature-lock.ts` (`LOCKED_ROUTE_PREFIXES`, `UNLOCKED_STORE_JOURNEY_IDS`).
   - Phân định rạch ròi giữa tính năng **Đang hoạt động trên Production** và tính năng **Sắp ra mắt (Locked)**.
3. **Chuẩn hóa cấu trúc 7 phần**:
   - Mọi tài liệu mô tả mục tính năng bắt buộc phải tuân thủ đúng khung 7 phần bên dưới, không tự ý cắt xén hay gộp khối.

---

## 2. Khung Mẫu Cấu Trúc 7 Phần Chuẩn Hóa (Standard 7-Section Template)

Mỗi mục tính năng được tạo mới hoặc kiểm tra bắt buộc phải có đủ 7 phần:

```markdown
# Mục X: [Tên Mục] ([/duong-dan]) — [Phụ đề nghiệp vụ]

> **Đường dẫn**: `/duong-dan`
> **Nhóm Sidebar**: [Bán hàng & Khách | Sản phẩm | Nội dung & Tiếp thị | Vận hành | Thiết lập]
> **Trạng thái Production**: [✅ Đang hoạt động | 🔒 Sắp ra mắt]
> **Tài liệu SSOT liên quan**: [Liệt kê đường dẫn tệp mã nguồn hoặc đặc tả liên quan]

---

## 1. Cấu trúc trang (Page Structure)
- **Top-Right Action Header**: Tác vụ chính (`primary`), tác vụ phụ (`outline`), menu mở rộng (`...`), breadcrumb.
- **Khối hướng dẫn thao tác**: Thành phần `<FeatureGuidanceCard />` hoặc hướng dẫn chuyên biệt (nếu có).
- **Hệ thống Tab / Phân vùng**: Liệt kê từng Tab (`id`, nhãn tiếng Việt, icon, huy hiệu số lượng SWR).
- **Các trang con (Sub-pages)**: Danh sách URL con (vd: `/[id]`, `/tao-moi`, `/thanh-vien`).

---

## 2. Tính năng chi tiết từng thành phần
- **Bảng/Lưới dữ liệu**: Cột hiển thị, định dạng tiền tệ VNĐ, badge trạng thái, phân trang Cursor Pagination.
- **Thanh tìm kiếm & Bộ lọc**: Debounce search, bộ lọc danh mục, dịp lễ, khoảng giá, sắp xếp.
- **Các Modal & Dialogs**:
  - Modal tạo mới (`Create...Modal`)
  - Modal chi tiết (`...DetailModal`)
  - Modal xác nhận xóa / thùng rác (`TrashConfirmModal`)
- **Trường dữ liệu nguyên tử (Atomic BOM)**: Nếu có nhập liệu hoa/chi phí, kiểm tra việc phân tách trường nguyên tử.

---

## 3. Luồng nghiệp vụ & Tình huống sử dụng thực tế
- **Tình huống 1**: Mô tả kịch bản tác nghiệp điển hình của Nhân viên bán hàng / Thợ cắm hoa.
- **Tình huống 2**: Kịch bản vận hành / kiểm soát của Chủ cửa hàng hoặc Quản lý điều hành.

---

## 4. Lợi ích cho Cửa hàng Hoa
- **Giảm tải nhận thức (Cognitive Load)**: Tối ưu quy trình như thế nào.
- **Hiệu quả kinh doanh & Dòng tiền**: Tránh thất thoát, tăng tỷ lệ chốt sale, phòng ngừa bùng cọc.
- **Chuẩn hóa chất lượng**: Đồng bộ công thức, in ấn, mẫu thiệp.

---

## 5. Quyền truy cập & Phân quyền (RBAC)
- **Mã năng lực (Capabilities)**: Nêu rõ `can("...")` cần thiết cho từng nút/tab (vd: `R1`, `R11`, `L1`, `F4`...).
- **Vai trò UI (`roleKey`)**: `store_admin`, `dieu_hanh`, `sales`, `florist`.
- **Cắt cứng phía Server**: Kiểm tra bảo vệ tại route handler `src/app/api/v1/`.

---

## 6. Mối liên kết với các mục khác trong hệ thống
- 🔗 **Liên kết đến**: Liệt kê các trang khác nhận dữ liệu hoặc chuyển hướng từ trang này.
- 🔗 **Nhận dữ liệu từ**: Dữ liệu từ Hồ sơ tiệm, Kho dữ liệu, Thẻ chào, Catalog...

---

## 7. Trạng thái hoàn thiện & Hạn chế trên Production
- **Trạng thái**: Tỷ lệ hoàn thiện (100% hoặc phần còn nợ).
- **Hạn chế kỹ thuật**: SWR revalidation interval, giới hạn tải ảnh, lưu trữ sessionStorage/localStorage.
```

---

## 3. Quy Trình 5 Bước Thực Hiện (SOP - Standard Operating Procedure)

Khi nhận yêu cầu tạo mới hoặc kiểm tra tài liệu mô tả cho một hoặc nhiều mục tính năng:

### Bước 1: Định Vị Tuyến Đường & Trạng Thái Khóa (Routing Reconnaissance)
1. Đọc `src/components/layout/nav-model.ts` để lấy thông tin mục:
   - `href`, `label`, `group`, `iconKey`, `capability`, `status`.
2. Đọc `src/lib/feature-lock.ts`:
   - Kiểm tra `LOCKED_ROUTE_PREFIXES`: Tuyến có bị khóa trên Production không?
   - Kiểm tra `UNLOCKED_STORE_JOURNEY_IDS`: Thẻ hành trình trang chủ tương ứng có mở không?

### Bước 2: Khảo Sát Mã Nguồn Thực Tế (Codebase Audit)
1. Mở file page chính: `src/app/(app)/<route>/page.tsx`.
2. Kiểm tra các sub-page: `src/app/(app)/<route>/**/page.tsx`.
3. Kiểm tra các component giao diện tại `src/components/<feature>/`:
   - Xác định rõ tên component nào đang được render thật sự.
   - Liệt kê toàn bộ props, state, tabs, modals.
4. Kiểm tra các hằng số hoặc cấu hình:
   - Danh sách categories chuẩn, shapes, facings.
   - Storage keys (`localStorage`, `sessionStorage`).

### Bước 3: Bóc Tách Phân Quyền & Vai Trò (RBAC & Role UX)
1. Tìm kiếm các lời gọi `session.can(...)` và `session.roleKey` trong component:
   - Nút nào bị ẩn nếu thiếu quyền?
   - Tab nào chỉ hiện cho Điều hành (`isExecutive`)?
2. Đối chiếu với `src/modules/organization/domain/role-ux-catalog.ts` nếu là trang chủ hoặc điều hướng theo vai.

### Bước 4: Kiểm Tra Luồng Dữ Liệu & API
1. Xác định các endpoint gọi qua `fetch` hoặc hook SWR:
   - `GET /api/v1/...`
   - `POST /api/v1/...`
2. Kiểm tra cách xử lý lỗi (`readApiError`), xác nhận xóa (`TrashConfirmModal`), và cơ chế bảo vệ (idempotency key, CSRF, server session).

### Bước 5: Soạn Thảo, Đối Chiếu & Nghiệm Thu (Drafting & Verification)
1. Soạn thảo tài liệu theo đúng Khung 7 phần ở Mục 2.
2. Cập nhật bảng tổng quan mục lục (như `00-tong-quan-production.md` hoặc tài liệu chỉ mục tương ứng).
3. Chạy lệnh kiểm tra tính hợp lệ:
   - `npx tsc --noEmit`
   - `npm run lint:ux -- --check`

---

## 4. Bảng Kiểm Tra Nghiệm Thu Trước Khi Bàn Giao (Pre-Handoff Checklist)

Trước khi xác nhận hoàn thành tài liệu tính năng, agent bắt buộc phải tự kiểm tra danh sách này:

- [ ] **100% Thành phần có thật**: Mọi component, tab ID, modal name trong tài liệu đều tồn tại trên đĩa.
- [ ] **Khớp nhãn tiếng Việt**: Tên nút, nhãn tab, placeholder khớp chính xác với chuỗi hiển thị trong code.
- [ ] **Đúng mã quyền RBAC**: Mã capability (`R1`, `L1`, `A3`...) khớp với mã kiểm tra trong file `.tsx`.
- [ ] **Phân định rõ ràng cờ khóa Production**: Ghi rõ tính năng nào mở và tính năng nào bị "Sắp ra mắt".
- [ ] **Đầy đủ 7 phần chuẩn hóa**: Không bỏ sót phần nào trong khung mẫu tài liệu.
- [ ] **Không vi phạm Anti-patterns**: Không hardcode link tuyệt đối `file:///`, không chứa thông tin nhạy cảm.
