# BÁO CÁO KIẾN TRÚC LAYOUT VÀ CHỨC NĂNG: PLATFORM_ADMIN, STORE_ADMIN & CHAIN_ADMIN

> **Mã định danh:** `REP-2026-ROLE-ADMIN-01`  
> **Ngày lập:** 30/09/2026  
> **Hệ thống áp dụng:** FloraOS Core (`floraos-core`)  
> **Tài liệu tham chiếu SSOT:**  
> - Hiến pháp Role UX: [`docs/dac-ta/03b-role-ux.md`](../../dac-ta/03b-role-ux.md)  
> - Hợp đồng thực thi Role UX: [`docs/kien-truc/ALG_ROLE_UX_EXECUTION_CONTRACT.md`](../ALG_ROLE_UX_EXECUTION_CONTRACT.md)  
> - Danh mục vai trong mã nguồn: [`src/modules/organization/domain/role-ux-catalog.ts`](../../../src/modules/organization/domain/role-ux-catalog.ts)  
> - Kế hoạch Console Vận hành: [`docs/kien-truc/KE_HOACH_CONSOLE_VAN_HANH.md`](../KE_HOACH_CONSOLE_VAN_HANH.md)  
> - Kiến trúc mục tiêu FloraOS SaaS V2: [`docs/kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md`](../ALG_SAAS_TARGET_ARCHITECTURE_V2.md)  

---

## 1. TỔNG QUAN KIẾN TRÚC PHÂN CẤP QUẢN TRỊ TRONG ALG

Trong hệ sinh thái FloraOS, quản trị được thiết kế theo 3 nguyên tắc phân tầng chặt chẽ:

1. **Vai trải nghiệm (Role UX) ≠ Vai phân quyền (RBAC Roles) ≠ Mã năng lực (Capabilities):**
   - **Mã năng lực (`capabilities`):** Quyết định người dùng *được phép* thao tác gì (ẩn/hiện nút bấm, kiểm soát tính hợp lệ phía API máy chủ).
   - **Vai phân quyền (`roles`):** Bản ghi CSDL nhóm các mã năng lực được gán cho tài khoản trong tổ chức (ví dụ: `dieu_hanh`, `dieu_phoi`, `sale`...).
   - **Vai trải nghiệm (`role_ux`):** Khuôn giao diện định hình *thứ tự ưu tiên thông tin*, trang chủ mặc định (`homepage`), thứ tự danh mục điều hướng và hành vi trợ lý AI. Vai trải nghiệm **tuyệt đối không bao giờ tự mở thêm quyền**.
2. **Ba cấp độ quản trị tách biệt hoàn toàn về dữ liệu & phạm vi (Scope):**
   - **`platform_admin` (Quản trị nền tảng):** Thuộc nhóm `PLATFORM`. Quản trị xuyên tổ chức (Cross-organization), quản lý vòng đời tenant, kiểm soát hạ tầng AI và giải cứu job nền.
   - **`store_admin` (`store_manager` / `dieu_hanh`):** Thuộc nhóm `ONE_STORE`. Điều hành vận hành và kinh doanh toàn diện một cơ sở cửa hàng độc lập.
   - **`chain_admin` (Nhóm quản trị chuỗi - `ceo` / `manager`):** Thuộc nhóm `CHAIN`. Quản lý tập trung mạng lưới đa chi nhánh (*Central Operations & Multi-Branch Network*).

---

## 2. CHI TIẾT PLATFORM_ADMIN (QUẢN TRỊ NỀN TẢNG)

### 2.1. Bản chất & Triết lý UX
- **Mã định danh vai trải nghiệm:** `platform_admin`.
- **Cơ chế cấp quyền:** Cấp độc lập qua bảng `platform_operators` (không thông qua bảng `memberships` của bất kỳ cửa hàng nào để đảm bảo tính khách quan và an toàn dữ liệu).
- **Tuyến truy cập:** [`/van-hanh`](../../../src/app/%28platform%29/van-hanh) (Console Vận hành Nền tảng).
- **Triết lý UX:** *Governance & Control* (Control Tower).
- **Câu hỏi nghiệp vụ chính:** *"Cấu hình nào đang lệch hoặc cần áp dụng trên toàn hệ thống?"*
- **Thứ bậc thông tin (Information Hierarchy):**
  - **P0 (Thấy ngay):** Trạng thái sức khoẻ hệ thống, xung đột cấu hình, cảnh báo vận hành, các job nền AI bị treo (`stuckJobs`).
  - **P1 (Thấy khi cần):** Đối tượng cấu hình, phân tích tác động thay đổi, quan hệ phụ thuộc module, nhật ký kiểm toán.
  - **P2 (Xem sâu):** Báo cáo mức dùng tài nguyên (credit/quota), hiệu suất tối ưu hóa toàn sàn.

### 2.2. Bố cục Layout ([`src/app/(platform)/layout.tsx`](../../../src/app/%28platform%29/layout.tsx))
- **Khung giao diện (Platform Shell):** Độc lập hoàn toàn với giao diện cửa hàng thông thường, độ rộng tối đa chuẩn `max-w-6xl` căn giữa.
- **Thanh Header trên cùng:**
  - Nhãn hệ thống: `VẬN HÀNH NỀN TẢNG — Xuyên tổ chức (không phải màn của một tổ chức nào)`.
  - Hệ thống Menu 6 phân hệ cốt lõi:
    1. **Tổng quan** ([`/van-hanh`](../../../src/app/%28platform%29/van-hanh/page.tsx)): Bảng điều khiển trung tâm (Dashboard).
    2. **Tổ chức** ([`/van-hanh/to-chuc`](../../../src/app/%28platform%29/van-hanh/to-chuc/page.tsx)): Danh sách mọi tenant, loại hình tổ chức, cấp duyệt nâng hạng gói (`EXPERIENCE` → `SINGLE` / `CHAIN`).
    3. **Trường dữ liệu** ([`/van-hanh/truong-du-lieu`](../../../src/app/%28platform%29/van-hanh/truong-du-lieu)): Quản trị danh mục trường tùy biến toàn hệ thống (N12).
    4. **Mức dùng** ([`/van-hanh/muc-dung`](../../../src/app/%28platform%29/van-hanh/muc-dung)): Giám sát mức tiêu thụ AI Credit xuyên suốt các tổ chức.
    5. **Sức khoẻ hệ thống** ([`/van-hanh/suc-khoe`](../../../src/app/%28platform%29/van-hanh/suc-khoe)): Tình trạng hàng đợi, worker Python và kiểm soát job nghẽn.
    6. **Nhật ký** ([`/van-hanh/nhat-ky`](../../../src/app/%28platform%29/van-hanh/nhat-ky)): Nhật ký kiểm toán bảo mật và các thao tác quản trị nền tảng.

### 2.3. Bố cục Trang Tổng quan ([`/van-hanh/page.tsx`](../../../src/app/%28platform%29/van-hanh/page.tsx))
1. **Header:** Tiêu đề "Tổng quan vận hành" kèm huy hiệu phạm vi `Phạm vi: Toàn hệ thống`.
2. **Khối thẻ chỉ số nhịp đập hệ thống (System Metrics Grid - 3 cột):**
   - *Thẻ 1 (Tổ chức):* Tổng số tổ chức trên toàn nền tảng.
   - *Thẻ 2 (Tăng trưởng):* Số lượng tổ chức mới tạo trong 7 ngày qua.
   - *Thẻ 3 (Cảnh báo sự cố):* Số lượng job nền AI bị treo (`stuckJobs`) cần giải cứu.
3. **Bảng danh sách tổ chức gần nhất:** Tên tổ chức, slug, loại hình (`EXPERIENCE`, `SINGLE`, `CHAIN`), số thành viên và liên kết sâu tới trang chi tiết tổ chức.

---

## 3. CHI TIẾT STORE_ADMIN (QUẢN LÝ / ĐIỀU HÀNH CỬA HÀNG ĐƠN)

### 3.1. Bản chất & Triết lý UX
- **Mã vai trải nghiệm:** `store_manager`.
- **Mã vai phân quyền trong CSDL:** `dieu_hanh` (thuộc bảng `roles`).
- **Phạm vi tác quyền:** Cấp tổ chức một cửa hàng (`ONE_STORE`).
- **Tuyến truy cập:** Tuyến trang chủ [`/`](../../../src/app/%28app%29/page.tsx).
- **Triết lý UX:** *Business & Operations Command Center* (Executive Dashboard).
- **Câu hỏi nghiệp vụ chính:** *"Hôm nay cửa hàng cần tôi can thiệp ở đâu?"*
- **Thứ bậc thông tin (Information Hierarchy):**
  - **P0 - Cần can thiệp (Thấy ngay lập tức):** Job xử lý ảnh/video bị lỗi, kết quả nhận diện/sáng tạo đang chờ duyệt, đơn hàng nháp bị tồn đọng chưa chốt.
  - **P1 - Tình hình vận hành (Thấy khi cuộn/quan sát):** Job nền AI đang chạy, sản phẩm mới cập nhật, hạn mức credit còn lại và mức tiêu thụ.
  - **P2 - Xem sâu & Khám phá:** Lối tắt nghiên cứu thị trường, quản trị catalog hoa, bộ máy phân tích ảnh.

### 3.2. Bố cục Layout ([`src/components/dashboard/store-manager-dashboard.tsx`](../../../src/components/dashboard/store-manager-dashboard.tsx))
Bố cục bất đối xứng 2 cột chuẩn Responsive (`lg:grid lg:grid-cols-3`):

```text
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Tên cửa hàng (Org Name) · Nhãn vai "Điều hành" · UserMenu       │
├────────────────────────────────────────┬───────────────────────────────┤
│ CỘT TRÁI (2/3) — CAN THIỆP & VẬN HÀNH │ CỘT PHẢI (1/3) — DANH MỤC/QUOTA│
│                                        │                               │
│ [P0] KHỐI CẦN CAN THIỆP (Action Items) │ [P1] SẢN PHẨM MỚI             │
│ - Tổng số mục cần can thiệp            │ - 5 sản phẩm gần nhất         │
│ - Job lỗi cần chạy lại                 │ - Trạng thái: Nháp/Đang bán   │
│ - Kết quả AI chờ chốt/duyệt            │ - Nút "Thêm sản phẩm"         │
│ - Danh sách đơn hàng nháp              │                               │
│                                        │ [P1] MỨC DÙNG & HẠN MỨC       │
│ [P1] JOB ĐANG CHẠY & JOB LỖI           │ - Tiến trình Credit           │
│ - Thẻ job lỗi (kèm nút "Chạy lại job") │ - Đã dùng / Còn lại           │
│ - Thẻ job đang chạy & bước hiện tại    │ - Chi tiết theo tính năng     │
│                                        │                               │
│ [P2] LỐI TẮT NHANH (Quick Shortcuts)  │                               │
│ - Nghiên cứu thị trường (Market Intel) │                               │
│ - Bộ máy phân tích ảnh (Vision Engine) │                               │
└────────────────────────────────────────┴───────────────────────────────┘
```

### 3.3. Các chức năng cốt lõi
1. **Khối Can thiệp Trực tiếp (P0 Action Items):**
   - Tự động quét và tổng hợp toàn bộ các điểm nghẽn nghiệp vụ.
   - Thao tác 1-click: Nhấp "Chạy lại job" để retry trực tiếp job AI lỗi mà không phải reload trang.
   - Xem nhanh mã đơn, khách hàng và giá trị các đơn nháp (`DRAFT`) để nhắc nhở nhân viên kinh doanh.
2. **Giám sát & Quản lý Hạ tầng AI Cửa hàng:**
   - Theo dõi tiến độ bóc tách nền, sinh ảnh bối cảnh, render video.
   - Đo lường chi phí credit tiêu hao theo từng phân hệ (M01 Vision, M04 Creative Studio, M07 Content...).
3. **Quản trị Sản phẩm & Danh mục Bán hàng:**
   - Xem nhanh trạng thái sẵn sàng thương mại của từng mẫu hoa.

---

## 4. CHI TIẾT CHAIN_ADMIN (QUẢN TRỊ CHUỖI & MẠNG LƯỚI GIAO HOA)

### 4.1. Bản chất Kiến trúc & Hiện trạng trong FloraOS
Trong mô hình Chuỗi cửa hàng ([`ALG_SAAS_TARGET_ARCHITECTURE_V2.md` §11.3](../ALG_SAAS_TARGET_ARCHITECTURE_V2.md#L395-L403)), cơ cấu tổ chức gồm:
```text
Tổ chức Chuỗi (Chain Organization)
├── Trung tâm Vận hành Điều hành (Central Operations)
└── Chi nhánh A · Chi nhánh B · Chi nhánh C... (Branches)
```
- **Hiện trạng triển khai (SSOT `03b-role-ux.md` & Nợ kỹ thuật #163d, #165):**
  - Đối với các tổ chức được gắn cờ `CHAIN`, vai `dieu_hanh` hiện đang **tạm dùng chung khuôn trải nghiệm với `store_manager`** cho đến khi hệ thống dữ liệu liên chi nhánh hoàn tất.
  - Về mặt kiến trúc Role UX, quyền quản trị chuỗi ("Chain Admin") được phân rã thành **2 vai trải nghiệm chuyên trách**:
    1. **`ceo` (Giám đốc điều hành Chuỗi):** Quản trị chiến lược và tổng thể mạng lưới.
    2. **`manager` (Quản lý vận hành Chuỗi):** Quản trị nguồn lực, phân bổ đơn và điều phối liên chi nhánh.
    3. Hỗ trợ song hành bởi vai **`coordinator` (`dieu_phoi` - đã AVAILABLE)**: Trực ban điều phối đơn rủi ro tại tháp điều khiển [`/dieu-phoi`](../../../src/app/%28app%29/dieu-phoi).

### 4.2. Đặc tả Triết lý & Thứ bậc Thông tin Cấp Chuỗi
#### Vai `ceo` (Giám đốc điều hành Chuỗi):
- **Triết lý UX:** *Strategic Command Center* (Performance Dashboard).
- **Câu hỏi chính:** *"Thay đổi và rủi ro lớn nào trong chuỗi cần tôi ra quyết định?"*
- **Luồng tác nghiệp:** `Tín hiệu (Signals) → Hiểu biết (Insights) → Quyết định (Decisions) → Theo dõi thực thi (Follow-through)`.
- **Thông tin ưu tiên:**
  - **P0:** KPI chiến lược toàn chuỗi (doanh thu gộp, tỷ lệ giao trễ mạng lưới, sự cố nghiêm trọng).
  - **P1:** Xu hướng tăng trưởng, hiệu quả kinh doanh so sánh giữa các chi nhánh (Store vs. Store).
  - **P2:** Dẫn chứng chi tiết (Drill-down evidence).

#### Vai `manager` (Quản lý Vận hành Chuỗi):
- **Triết lý UX:** *Operations Command Center*.
- **Câu hỏi chính:** *"Điểm nghẽn và thiếu hụt nguồn lực của các chi nhánh đang nằm ở đâu?"*
- **Luồng tác nghiệp:** `Lập kế hoạch (Plan) → Phân bổ (Allocate) → Thực thi (Execute) → Giám sát (Monitor) → Điều chỉnh (Correct)`.
- **Thông tin ưu tiên:**
  - **P0:** Trạng thái vận hành trực tiếp, chi nhánh quá tải, thiếu hoa cục bộ, đơn nghẽn xử lý.
  - **P1:** Hiệu suất đội ngũ từng chi nhánh, khoảng trống tài nguyên (nhân sự/kho hoa).
  - **P2:** Xu hướng vận hành và đề xuất tối ưu phân tuyến.

### 4.3. Bố cục Layout Đặc thù của Giao diện Quản trị Chuỗi (Chain Command Center)
Theo thiết kế chuẩn hóa cho tổ chức CHAIN, layout trung tâm gồm 4 khối đặc thù:
1. **Bộ chọn chi nhánh & phạm vi (Multi-Branch Scope Switcher):**
   - Đặt tại góc trên cùng bên trái của Header, cho phép người quản trị xem: `Toàn chuỗi (All Branches)` hoặc lọc riêng từng `Chi nhánh Hà Nội / Chi nhánh TP.HCM...`.
2. **Tháp Giám sát Đa Chi nhánh (Branch Matrix Overview):**
   - Dạng bảng thẻ tóm tắt tình trạng từng điểm bán: Doanh thu ngày, Tỷ lệ đơn đúng hạn, Tải thợ cắm hoa (% năng lực), Cảnh báo tồn kho hoa.
3. **Cơ chế Cân bằng Tải & Chuyển giao Đơn hàng (Inter-Branch Load Balancing):**
   - Nhận diện các chi nhánh đang quá tải hoặc hết nguyên liệu để gợi ý chuyển đơn sang chi nhánh lân cận còn dư năng lực sản xuất.
4. **Báo cáo Hợp nhất Chuỗi (Consolidated Operations):**
   - Tổng hợp mức tiêu thụ nguyên vật liệu hoa, thống kê chi phí hoa hỏng, đối soát thanh toán và hạn mức credit chung của chuỗi.

---

## 5. BẢNG SO SÁNH ĐỐI CHIẾU TOÀN DIỆN

| Tiêu chí | `platform_admin` | `store_admin` (`store_manager`) | `chain_admin` (`ceo` / `manager`) |
| :--- | :--- | :--- | :--- |
| **Phạm vi tác quyền (Scope)** | Toàn bộ nền tảng (Toàn bộ các tổ chức SaaS) | 1 Cửa hàng độc lập (`ONE_STORE`) | Mạng lưới nhiều chi nhánh (`CHAIN`) |
| **Bản ghi cấp quyền** | Bảng `platform_operators` | Bảng `memberships` + role `dieu_hanh` | Bảng `memberships` + role chuỗi (`ceo`/`manager`) |
| **Tuyến màn hình chính** | [`/van-hanh`](../../../src/app/%28platform%29/van-hanh) | Trang chủ [`/`](../../../src/app/%28app%29/page.tsx) | Trang chủ [`/`] kèm bộ lọc chi nhánh |
| **Triết lý giao diện (Philosophy)** | Governance & Control Tower | Business & Operations Command Center | Strategic / Operations Command Center |
| **Câu hỏi trọng tâm** | *"Cấu hình nào đang lệch hoặc cần áp dụng?"* | *"Hôm nay cửa hàng cần tôi can thiệp ở đâu?"* | *"Chi nhánh nào đang nghẽn? Rủi ro toàn chuỗi ở đâu?"* |
| **Thông tin P0 hiển thị ngay** | Job AI bị treo toàn sàn, sức khoẻ worker, tổ chức mới | Job AI lỗi tiệm mình, ảnh chờ duyệt, đơn nháp tồn | KPI chuỗi, chi nhánh quá tải, rủi ro giao hàng |
| **Hành động chủ đạo** | Cấu hình, Kiểm tra, Nâng hạng gói, Giải cứu job | Xem xét, Ưu tiên, Duyệt ảnh/nội dung, Chốt đơn | Điều phối liên chi nhánh, Cân bằng tải, Phân bổ vốn |
| **Trạng thái triển khai** | **Đang dùng được** (Available) | **Đang dùng được** (Available) | **Đang hoàn thiện** (Tạm dùng khuôn Store Manager) |

---

## 6. KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG

1. **Về mặt kỹ thuật và phân lập dữ liệu:**
   - Hệ thống FloraOS đã hoàn tất phân lập chặt chẽ giữa `platform_admin` (console vận hành độc lập) và người dùng cửa hàng.
   - Không có sự chồng lấn hay rò rỉ dữ liệu chéo giữa các tenant (`tenant isolation` 100%).
2. **Lộ trình hoàn thiện Giao diện Chuỗi (`chain_admin`):**
   - Hiện tại, nếu tổ chức được thiết lập là `CHAIN`, hệ thống vẫn hoạt động ổn định nhờ cơ chế fallback sang `store_manager`.
   - Để mở khóa đầy đủ trải nghiệm `chain_admin`, cần ưu tiên đóng nợ kỹ thuật **#163d** và **#165**: Bổ sung bộ chọn chi nhánh (`Scope Switcher`) tại thanh điều hướng và phát triển API thống kê số liệu tổng hợp đa chi nhánh.
