# Screen Contracts — Hồ sơ Hợp đồng Giao diện ALG

Thư mục này chứa các bản hợp đồng giao diện (Screen Contracts) chi tiết cho từng màn hình trong hệ thống ALG, tuân thủ đặc tả tại `docs/dac-ta/03a-ux-constitution.md` (Level 3, CANONICAL) và kế hoạch thực thi `docs/kien-truc/KE_HOACH_NANG_CAP_UIUX.md`.

---

## 1. Quy ước đặt tên tệp theo tuyến (Route Naming Convention)

- **Trang chủ theo vai (`/`)**: `trang-chu-<khuôn>.md` (ví dụ: `trang-chu-store-manager.md`, `trang-chu-sales.md`, `trang-chu-coordinator.md`).
- **Màn hình danh sách nghiệp vụ**: `<tên-tuyến>.md` (ví dụ: `tai-anh.md`, `duyet.md`, `job.md`, `san-pham.md`, `don-hang.md`, `khach-hang.md`, `hoi-thoai.md`).
- **Màn hình chi tiết / động**: `<tên-tuyến>-chi-tiet.md` (ví dụ: `san-pham-chi-tiet.md`, `job-chi-tiet.md`).
- **Hệ thống điều hướng chung**: `_dieu-huong.md`.
- **Console Quản trị nền tảng (`/van-hanh`)**: `van-hanh-<trang>.md` (ví dụ: `van-hanh-tong-quan.md`, `van-hanh-to-chuc.md`, `van-hanh-truong-du-lieu.md`).

---

## 2. Khi nào bắt buộc lập Screen Contract?

- **Bắt buộc**:
  - Mọi màn hình mới được tạo ra.
  - Mọi màn hình hiện hữu khi được can thiệp sửa đổi bố cục (layout), thứ bậc thông tin (L0–L4), luồng hành động (actions/buttons), trạng thái hoặc mật độ theo quy trình T5.SOP.
- **Không bắt buộc**:
  - Các chỉnh sửa chính tả, đổi biến token thuần túy (như chạy codemod T4.4/T4.5 mà không đổi layout).

---

## 3. Quy tắc cập nhật & Quyền sở hữu

- **Ai được sửa**: AI Agent hoặc kỹ sư frontend được sửa khi thực hiện thẻ việc (T5.x, T6.x, T3.9).
- **Mục QA Matrix (03a §34)**: Chỉ ghi các kết quả `PASS` / `WARNING` / `FAIL` đã được đo đạc và kiểm chứng thực tế trên mã nguồn và giao diện thật, không giả định. Màn hình chỉ được coi là hoàn tất khi không còn chỉ số `FAIL`.

---

## 4. Chỉ mục Screen Contracts hiện có

| Tệp | Tuyến | Vai chính | Thẻ thực hiện | Trạng thái QA |
|---|---|---|---|:---:|
| `_TEMPLATE.md` | — | — | T0.3 | Mẫu chuẩn |
| `_journey-home-store.md` | `/` | `store_admin` | J1–J7 | **PASS** |
| `_journey-home-network.md` | `/` | `flower_network_admin` | J1–J7 | **PASS** |
| `_journey-home-platform.md` | `/van-hanh` | `platform_admin` | J1–J7 | **PASS** |
| `asset-usage.md` | Drawer (Kho dữ liệu, /cong-cu) | điều hành / marketing / sale | PR-2 | **PASS** |
| `bao-gia.md` | `/bao-gia`, `/bg/[token]` | điều hành / sale | PR-4 | **PASS** |
| `chien-dich.md` | `/quang-ba/chien-dich` | điều hành / marketing | PR-3 | **PASS** |
| `cong-cu-anh-san-pham.md` | `/cong-cu/anh-san-pham` | chủ tiệm / marketing | PD Giai đoạn 3 (pilot 03c) | Chờ đo pilot |
| `cong-cu-bo-anh-san-pham.md` | `/cong-cu/bo-anh-san-pham` | chủ tiệm / marketing | PD đợt A-1 | axe đạt |
| `cong-cu-poster-banner.md` | `/cong-cu/poster-banner` | chủ tiệm / marketing | PD đợt A-1 | axe đạt |
| `cong-cu.md` | `/cong-cu` | điều hành / marketing / sale | PR-0 | **PASS** |
| `landing-page.md` | `/landing-page` | chủ tiệm / marketing | công cụ #08 Hoàn thiện | axe đạt |
| `trang-chu-tho-cam.md` | `/` | `tho_cam` | Checklist ALG 1.12, 4.13 | Chờ đo |
| `trang-chu-shipper.md` | `/` | `shipper` | Checklist ALG 1.12, 4.5 | Chờ đo |
| `trang-chu-ke-toan.md` | `/` | `ke_toan` | Checklist ALG 1.12 | Chờ đo |
| `in-phieu.md` | `/in-phieu/[id]` | điều hành / điều phối | Checklist ALG 4.9 | Chờ đo |
